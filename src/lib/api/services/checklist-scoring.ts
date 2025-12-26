// File: /src/lib/api/services/checklist-scoring.ts
// API service for checklist scoring and grading functionality

import { supabase } from '@/lib/supabase'
import type {
  ChecklistScore,
  ScoreBreakdown,
  ItemScore,
  ScoringConfiguration,
  CalculateScoreRequest,
  ScoringReportFilters,
  ScoringReportSummary,
  GradeThreshold,
  DEFAULT_GRADE_THRESHOLDS,
  LetterGrade,
} from '@/types/checklist-scoring'
import type { ChecklistExecution, ChecklistResponse, ChecklistTemplateItem } from '@/types/checklists'
import { checklistsApi } from './checklists'
import { logger } from '../../utils/logger';


/**
 * Calculate score for a checklist execution
 */
export async function calculateExecutionScore(
  executionId: string,
  scoringConfig: ScoringConfiguration
): Promise<ChecklistScore> {
  // Fetch execution with responses
  const execution = await checklistsApi.getExecutionWithResponses(executionId)

  // Fetch template items to get point values and critical items
  const templateItems = await checklistsApi.getTemplateItems(
    execution.checklist_template_id || ''
  )

  // Calculate breakdown
  const breakdown = calculateScoreBreakdown(
    execution.responses,
    templateItems,
    scoringConfig
  )

  // Calculate final score based on scoring type
  let score = 0

  switch (scoringConfig.scoring_type) {
    case 'binary':
      // Binary: either 100% pass or 0% fail
      score = breakdown.fail_count === 0 ? 100 : 0
      break

    case 'percentage':
      // Percentage: (pass / scorable) * 100
      if (breakdown.scorable_items > 0) {
        score = (breakdown.pass_count / breakdown.scorable_items) * 100
      }
      break

    case 'points':
      // Points: (earned / total) * 100
      if (breakdown.total_points && breakdown.total_points > 0) {
        score = ((breakdown.earned_points || 0) / breakdown.total_points) * 100
      }
      break

    case 'letter_grade':
      // Same as percentage, but will be converted to letter grade
      if (breakdown.scorable_items > 0) {
        score = (breakdown.pass_count / breakdown.scorable_items) * 100
      }
      break
  }

  // Round to 2 decimal places
  score = Math.round(score * 100) / 100

  // Check if passed
  let passed = score >= scoringConfig.pass_threshold

  // Auto-fail on critical failures
  if (scoringConfig.fail_on_critical && breakdown.critical_failures && breakdown.critical_failures.length > 0) {
    passed = false
  }

  // Calculate grade if using letter grades
  let grade: LetterGrade | string | undefined
  if (scoringConfig.scoring_type === 'letter_grade') {
    grade = calculateGrade(score, scoringConfig.grade_thresholds || DEFAULT_GRADE_THRESHOLDS)
  }

  const checklistScore: ChecklistScore = {
    execution_id: executionId,
    scoring_type: scoringConfig.scoring_type,
    score,
    grade,
    passed,
    breakdown,
    calculated_at: new Date().toISOString(),
  }

  // Update execution with score
  await updateExecutionScore(executionId, checklistScore)

  return checklistScore
}

/**
 * Calculate detailed score breakdown
 */
function calculateScoreBreakdown(
  responses: ChecklistResponse[],
  templateItems: ChecklistTemplateItem[],
  scoringConfig: ScoringConfiguration
): ScoreBreakdown {
  const total_items = templateItems.length
  const completed_items = responses.length

  let pass_count = 0
  let fail_count = 0
  let na_count = 0
  let total_points = 0
  let earned_points = 0
  const critical_failures: string[] = []

  const item_scores: ItemScore[] = templateItems.map((item) => {
    const response = responses.find((r) => r.checklist_template_item_id === item.id)
    const is_critical = scoringConfig.critical_item_ids?.includes(item.id) || false

    const itemScore: ItemScore = {
      item_id: item.id,
      item_label: item.label,
      is_required: item.is_required,
      is_critical,
      completed: !!response,
    }

    // Handle scoring based on item type
    if (response?.score_value) {
      itemScore.score_value = response.score_value

      if (response.score_value === 'pass') {
        pass_count++
      } else if (response.score_value === 'fail') {
        fail_count++
        if (is_critical) {
          critical_failures.push(item.id)
        }
      } else if (response.score_value === 'na') {
        na_count++
      }
    }

    // Handle point-based scoring
    if (scoringConfig.scoring_type === 'points' && scoringConfig.point_values) {
      const points = scoringConfig.point_values[item.id] || 0
      itemScore.points = points
      total_points += points

      // Award points based on response
      if (response?.score_value === 'pass') {
        itemScore.earned_points = points
        earned_points += points
      } else if (response?.score_value === 'fail') {
        itemScore.earned_points = 0
      } else if (response?.score_value === 'na') {
        // N/A items may or may not count based on config
        if (!scoringConfig.include_na_in_total) {
          // Remove from total points if N/A doesn't count
          total_points -= points
        }
      }
    }

    return itemScore
  })

  // Calculate scorable items
  let scorable_items = total_items
  if (!scoringConfig.include_na_in_total) {
    scorable_items = pass_count + fail_count
  } else {
    scorable_items = total_items
  }

  return {
    total_items,
    completed_items,
    scorable_items,
    pass_count,
    fail_count,
    na_count,
    total_points: scoringConfig.scoring_type === 'points' ? total_points : undefined,
    earned_points: scoringConfig.scoring_type === 'points' ? earned_points : undefined,
    item_scores,
    critical_failures: critical_failures.length > 0 ? critical_failures : undefined,
  }
}

/**
 * Calculate letter grade from score percentage
 */
function calculateGrade(score: number, thresholds: GradeThreshold[]): string {
  // Sort thresholds by min_percentage descending
  const sortedThresholds = [...thresholds].sort((a, b) => b.min_percentage - a.min_percentage)

  // Find the first threshold that the score meets or exceeds
  for (const threshold of sortedThresholds) {
    if (score >= threshold.min_percentage) {
      return threshold.grade
    }
  }

  // Default to F if no threshold matches
  return 'F'
}

/**
 * Update execution with calculated score
 */
async function updateExecutionScore(
  executionId: string,
  score: ChecklistScore
): Promise<void> {
  const updates: any = {
    score_percentage: score.score,
    // Store JSON data in a metadata field if available
  }

  // If the execution table has score/grade fields, update them
  try {
    await supabase
      .from('checklists')
      .update(updates)
      .eq('id', executionId)
  } catch (error) {
    logger.error('Failed to update execution score:', error)
    // Don't throw - score calculation succeeded even if update failed
  }
}

/**
 * Get execution score
 */
export async function getExecutionScore(executionId: string): Promise<ChecklistScore | null> {
  // First try to get from execution record
  const { data: execution, error } = await supabase
    .from('checklists')
    .select('*')
    .eq('id', executionId)
    .single()

  if (error || !execution) {
    return null
  }

  // Check if execution has scoring data
  if (execution.score_percentage === null) {
    return null
  }

  // Get template to check if scoring is enabled
  const { data: template } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', execution.checklist_template_id)
    .single()

  if (!template || !template.scoring_enabled) {
    return null
  }

  // Reconstruct score from execution data
  const scoreSummary = await checklistsApi.getExecutionScore(executionId)

  return {
    execution_id: executionId,
    scoring_type: 'percentage', // Default for now
    score: scoreSummary.pass_percentage,
    passed: scoreSummary.pass_percentage >= 70, // Default threshold
    breakdown: {
      total_items: scoreSummary.total_count,
      completed_items: scoreSummary.total_count,
      scorable_items: scoreSummary.pass_count + scoreSummary.fail_count,
      pass_count: scoreSummary.pass_count,
      fail_count: scoreSummary.fail_count,
      na_count: scoreSummary.na_count,
      item_scores: [],
    },
    calculated_at: execution.updated_at,
  }
}

/**
 * Get scoring report with filters
 */
export async function getScoringReport(
  filters: ScoringReportFilters
): Promise<{ executions: ChecklistExecution[]; summary: ScoringReportSummary }> {
  // Build query
  let query = supabase
    .from('checklists')
    .select('*')
    .is('deleted_at', null)
    .eq('is_completed', true)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.template_id) {
    query = query.eq('checklist_template_id', filters.template_id)
  }

  if (filters.inspector_id) {
    query = query.eq('inspector_user_id', filters.inspector_id)
  }

  if (filters.date_from) {
    query = query.gte('completed_at', filters.date_from)
  }

  if (filters.date_to) {
    query = query.lte('completed_at', filters.date_to)
  }

  if (filters.min_score !== undefined) {
    query = query.gte('score_percentage', filters.min_score)
  }

  if (filters.max_score !== undefined) {
    query = query.lte('score_percentage', filters.max_score)
  }

  const { data: executions, error } = await query

  if (error) {
    throw new Error(`Failed to fetch scoring report: ${error.message}`)
  }

  // Calculate summary statistics
  const summary = calculateReportSummary(executions as ChecklistExecution[], filters)

  return {
    executions: executions as ChecklistExecution[],
    summary,
  }
}

/**
 * Calculate report summary statistics
 */
function calculateReportSummary(
  executions: ChecklistExecution[],
  filters: ScoringReportFilters
): ScoringReportSummary {
  const total_executions = executions.length

  if (total_executions === 0) {
    return {
      total_executions: 0,
      passed_count: 0,
      failed_count: 0,
      average_score: 0,
      median_score: 0,
      grade_distribution: {},
      pass_rate: 0,
    }
  }

  // Filter by passed if specified
  let filteredExecutions = executions
  if (filters.passed !== undefined) {
    const passThreshold = 70 // Default
    filteredExecutions = executions.filter((e) =>
      filters.passed
        ? (e.score_percentage || 0) >= passThreshold
        : (e.score_percentage || 0) < passThreshold
    )
  }

  const passed_count = executions.filter((e) => (e.score_percentage || 0) >= 70).length
  const failed_count = total_executions - passed_count

  // Calculate average score
  const scores = executions.map((e) => e.score_percentage || 0)
  const average_score = scores.reduce((sum, score) => sum + score, 0) / total_executions

  // Calculate median score
  const sortedScores = [...scores].sort((a, b) => a - b)
  const median_score =
    total_executions % 2 === 0
      ? (sortedScores[total_executions / 2 - 1] + sortedScores[total_executions / 2]) / 2
      : sortedScores[Math.floor(total_executions / 2)]

  // Calculate grade distribution
  const grade_distribution: Record<string, number> = {}
  executions.forEach((execution) => {
    const score = execution.score_percentage || 0
    const grade = calculateGrade(score, DEFAULT_GRADE_THRESHOLDS)
    grade_distribution[grade] = (grade_distribution[grade] || 0) + 1
  })

  // Calculate pass rate
  const pass_rate = (passed_count / total_executions) * 100

  // Generate trend data
  const trend_data = executions
    .filter((e) => e.completed_at)
    .map((e) => ({
      date: e.completed_at!,
      score: e.score_percentage || 0,
      passed: (e.score_percentage || 0) >= 70,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    total_executions,
    passed_count,
    failed_count,
    average_score: Math.round(average_score * 100) / 100,
    median_score: Math.round(median_score * 100) / 100,
    grade_distribution,
    pass_rate: Math.round(pass_rate * 100) / 100,
    trend_data,
  }
}

/**
 * Export scoring report
 */
export async function exportScoringReport(
  filters: ScoringReportFilters,
  format: 'pdf' | 'excel' | 'csv'
): Promise<Blob> {
  const { executions, summary } = await getScoringReport(filters)

  // TODO: Implement actual export logic
  // For now, return a simple CSV
  if (format === 'csv') {
    const csv = generateCSV(executions)
    return new Blob([csv], { type: 'text/csv' })
  }

  throw new Error(`Export format ${format} not yet implemented`)
}

/**
 * Generate CSV from executions
 */
function generateCSV(executions: ChecklistExecution[]): string {
  const headers = [
    'ID',
    'Name',
    'Category',
    'Inspector',
    'Score',
    'Passed',
    'Completed At',
  ]

  const rows = executions.map((e) => [
    e.id,
    e.name,
    e.category || '',
    e.inspector_name || '',
    e.score_percentage || 0,
    (e.score_percentage || 0) >= 70 ? 'Yes' : 'No',
    e.completed_at || '',
  ])

  return [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')
}

// Export API
export const checklistScoringApi = {
  calculateExecutionScore,
  getExecutionScore,
  getScoringReport,
  exportScoringReport,
}
