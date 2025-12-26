// File: /src/lib/api/services/checklist-scoring.ts
// API service for checklist scoring and grading functionality

import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
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
import { logger } from '../../utils/logger'


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
  exportFormat: 'pdf' | 'excel' | 'csv'
): Promise<Blob> {
  const { executions, summary } = await getScoringReport(filters)

  switch (exportFormat) {
    case 'csv':
      return generateCSVBlob(executions, summary)
    case 'pdf':
      return generatePDFBlob(executions, summary, filters)
    case 'excel':
      return generateExcelBlob(executions, summary, filters)
    default:
      throw new Error(`Export format ${exportFormat} not supported`)
  }
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {return ''}
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generate CSV blob from executions
 */
function generateCSVBlob(
  executions: ChecklistExecution[],
  summary: ScoringReportSummary
): Blob {
  const lines: string[] = []

  // Header section
  lines.push('CHECKLIST SCORING REPORT')
  lines.push(`Export Date: ${format(new Date(), 'MMMM d, yyyy')}`)
  lines.push('')

  // Summary section
  lines.push('SUMMARY')
  lines.push(`Total Inspections,${summary.total_executions}`)
  lines.push(`Passed,${summary.passed_count}`)
  lines.push(`Failed,${summary.failed_count}`)
  lines.push(`Pass Rate,${summary.pass_rate}%`)
  lines.push(`Average Score,${summary.average_score}%`)
  lines.push(`Median Score,${summary.median_score}%`)
  lines.push('')

  // Grade distribution
  lines.push('GRADE DISTRIBUTION')
  lines.push('Grade,Count')
  Object.entries(summary.grade_distribution).forEach(([grade, count]) => {
    lines.push(`${escapeCSV(grade)},${count}`)
  })
  lines.push('')

  // Execution data
  lines.push('EXECUTION DETAILS')
  lines.push('ID,Name,Category,Location,Inspector,Score,Grade,Result,Completed At')

  executions.forEach((e) => {
    const passed = (e.score_percentage || 0) >= 70
    const grade = calculateGrade(e.score_percentage || 0, DEFAULT_GRADE_THRESHOLDS)
    lines.push([
      escapeCSV(e.id),
      escapeCSV(e.name),
      escapeCSV(e.category),
      escapeCSV(e.location),
      escapeCSV(e.inspector_name),
      e.score_percentage ?? 0,
      escapeCSV(grade),
      passed ? 'Pass' : 'Fail',
      e.completed_at ? format(new Date(e.completed_at), 'yyyy-MM-dd HH:mm') : '',
    ].join(','))
  })

  return new Blob([lines.join('\n')], { type: 'text/csv' })
}

/**
 * Generate PDF blob from executions
 */
async function generatePDFBlob(
  executions: ChecklistExecution[],
  summary: ScoringReportSummary,
  filters: ScoringReportFilters
): Promise<Blob> {
  // Lazy load jsPDF
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  let yPosition = 20

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Checklist Scoring Report', 105, yPosition, { align: 'center' })
  yPosition += 12

  // Export info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Export Date: ${format(new Date(), 'MMMM d, yyyy')}`, 20, yPosition)
  yPosition += 6

  if (filters.date_from || filters.date_to) {
    const dateRange = [
      filters.date_from ? format(new Date(filters.date_from), 'MMM d, yyyy') : 'Start',
      filters.date_to ? format(new Date(filters.date_to), 'MMM d, yyyy') : 'Present',
    ].join(' - ')
    doc.text(`Date Range: ${dateRange}`, 20, yPosition)
    yPosition += 10
  } else {
    yPosition += 4
  }

  // Summary Section Header
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(41, 128, 185)
  doc.setTextColor(255, 255, 255)
  doc.rect(20, yPosition - 5, 170, 8, 'F')
  doc.text('Summary Statistics', 25, yPosition)
  doc.setTextColor(0, 0, 0)
  yPosition += 8

  // Summary table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total Inspections', summary.total_executions.toString()],
      ['Passed', `${summary.passed_count} (${summary.pass_rate}%)`],
      ['Failed', summary.failed_count.toString()],
      ['Average Score', `${summary.average_score}%`],
      ['Median Score', `${summary.median_score}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 40 },
    },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 10 },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 12

  // Grade Distribution
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(41, 128, 185)
  doc.setTextColor(255, 255, 255)
  doc.rect(20, yPosition - 5, 170, 8, 'F')
  doc.text('Grade Distribution', 25, yPosition)
  doc.setTextColor(0, 0, 0)
  yPosition += 8

  const gradeData = Object.entries(summary.grade_distribution)
    .filter(([, count]) => count > 0)
    .map(([grade, count]) => [grade, count.toString()])

  if (gradeData.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Grade', 'Count']],
      body: gradeData,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
      },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    })
    yPosition = (doc as any).lastAutoTable.finalY + 12
  }

  // Execution Details
  if (yPosition > 200) {
    doc.addPage()
    yPosition = 20
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(41, 128, 185)
  doc.setTextColor(255, 255, 255)
  doc.rect(20, yPosition - 5, 170, 8, 'F')
  doc.text('Execution Details', 25, yPosition)
  doc.setTextColor(0, 0, 0)
  yPosition += 8

  const executionData = executions.slice(0, 50).map((e) => {
    const passed = (e.score_percentage || 0) >= 70
    const grade = calculateGrade(e.score_percentage || 0, DEFAULT_GRADE_THRESHOLDS)
    return [
      e.name.length > 25 ? e.name.substring(0, 22) + '...' : e.name,
      e.inspector_name || '-',
      `${e.score_percentage ?? 0}%`,
      grade,
      passed ? 'Pass' : 'Fail',
      e.completed_at ? format(new Date(e.completed_at), 'MM/dd/yy') : '-',
    ]
  })

  autoTable(doc, {
    startY: yPosition,
    head: [['Checklist', 'Inspector', 'Score', 'Grade', 'Result', 'Date']],
    body: executionData,
    theme: 'striped',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
    },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9 },
    didDrawCell: (data) => {
      // Color code result column
      if (data.section === 'body' && data.column.index === 4) {
        const value = data.cell.text[0]
        if (value === 'Pass') {
          doc.setFillColor(212, 237, 218)
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
          doc.setTextColor(0, 0, 0)
          doc.text(value, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1)
        } else if (value === 'Fail') {
          doc.setFillColor(248, 215, 218)
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
          doc.setTextColor(0, 0, 0)
          doc.text(value, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1)
        }
      }
    },
  })

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount} | Generated by JobSight`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Return as blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Generate Excel blob from executions
 */
async function generateExcelBlob(
  executions: ChecklistExecution[],
  summary: ScoringReportSummary,
  filters: ScoringReportFilters
): Promise<Blob> {
  // Lazy load ExcelJS
  const ExcelJS = await import('exceljs')

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JobSight'
  workbook.created = new Date()

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary')

  // Title
  summarySheet.mergeCells('A1:D1')
  const titleCell = summarySheet.getCell('A1')
  titleCell.value = 'Checklist Scoring Report'
  titleCell.font = { size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center' }

  summarySheet.getCell('A2').value = 'Export Date:'
  summarySheet.getCell('B2').value = format(new Date(), 'MMMM d, yyyy')
  summarySheet.getCell('B2').font = { bold: true }

  if (filters.date_from || filters.date_to) {
    summarySheet.getCell('A3').value = 'Date Range:'
    summarySheet.getCell('B3').value = [
      filters.date_from ? format(new Date(filters.date_from), 'MMM d, yyyy') : 'Start',
      filters.date_to ? format(new Date(filters.date_to), 'MMM d, yyyy') : 'Present',
    ].join(' - ')
  }

  // Summary Stats
  summarySheet.getCell('A5').value = 'Summary Statistics'
  summarySheet.getCell('A5').font = { size: 12, bold: true }

  summarySheet.getCell('A6').value = 'Metric'
  summarySheet.getCell('B6').value = 'Value'
  summarySheet.getRow(6).font = { bold: true }
  summarySheet.getRow(6).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  const summaryData = [
    ['Total Inspections', summary.total_executions],
    ['Passed', summary.passed_count],
    ['Failed', summary.failed_count],
    ['Pass Rate', `${summary.pass_rate}%`],
    ['Average Score', `${summary.average_score}%`],
    ['Median Score', `${summary.median_score}%`],
  ]

  summaryData.forEach((row, index) => {
    summarySheet.getCell(`A${index + 7}`).value = row[0]
    summarySheet.getCell(`B${index + 7}`).value = row[1]
  })

  // Grade Distribution
  const gradeStartRow = summaryData.length + 9
  summarySheet.getCell(`A${gradeStartRow}`).value = 'Grade Distribution'
  summarySheet.getCell(`A${gradeStartRow}`).font = { size: 12, bold: true }

  summarySheet.getCell(`A${gradeStartRow + 1}`).value = 'Grade'
  summarySheet.getCell(`B${gradeStartRow + 1}`).value = 'Count'
  summarySheet.getRow(gradeStartRow + 1).font = { bold: true }

  let gradeRow = gradeStartRow + 2
  Object.entries(summary.grade_distribution).forEach(([grade, count]) => {
    if (count > 0) {
      summarySheet.getCell(`A${gradeRow}`).value = grade
      summarySheet.getCell(`B${gradeRow}`).value = count
      gradeRow++
    }
  })

  summarySheet.columns = [
    { width: 25 },
    { width: 20 },
    { width: 15 },
    { width: 15 },
  ]

  // Executions Sheet
  const executionsSheet = workbook.addWorksheet('Executions')

  executionsSheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Name', key: 'name', width: 35 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Inspector', key: 'inspector', width: 20 },
    { header: 'Score', key: 'score', width: 12 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Result', key: 'result', width: 10 },
    { header: 'Completed At', key: 'completed', width: 18 },
  ]

  // Style header row
  const headerRow = executionsSheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Add data rows
  executions.forEach((e) => {
    const passed = (e.score_percentage || 0) >= 70
    const grade = calculateGrade(e.score_percentage || 0, DEFAULT_GRADE_THRESHOLDS)

    const dataRow = executionsSheet.addRow({
      id: e.id,
      name: e.name,
      category: e.category || '',
      location: e.location || '',
      inspector: e.inspector_name || '',
      score: `${e.score_percentage ?? 0}%`,
      grade: grade,
      result: passed ? 'Pass' : 'Fail',
      completed: e.completed_at ? format(new Date(e.completed_at), 'yyyy-MM-dd HH:mm') : '',
    })

    // Color code result cell
    const resultCell = dataRow.getCell('result')
    if (passed) {
      resultCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4EDDA' },
      }
    } else {
      resultCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8D7DA' },
      }
    }
  })

  // Generate blob
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// Export API
export const checklistScoringApi = {
  calculateExecutionScore,
  getExecutionScore,
  getScoringReport,
  exportScoringReport,
}
