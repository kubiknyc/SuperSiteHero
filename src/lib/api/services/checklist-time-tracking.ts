// File: /src/lib/api/services/checklist-time-tracking.ts
// Service for checklist completion time tracking and analytics
// Generated: 2025-12-15

import { supabase } from '@/lib/supabase'
import type {
  ChecklistExecution,
  ChecklistExecutionPause,
  ChecklistTimeAnalytics,
  TemplateCompletionTimeStats,
  UserCompletionTimeStats,
  CompletionTimeTrend,
  TimeVarianceSummary,
  TimeAnalyticsFilters,
} from '@/types/checklists'

// ==============================================
// EXECUTION TIME TRACKING
// ==============================================

/**
 * Start a checklist execution timer
 * Sets started_at timestamp
 */
export async function startChecklistExecution(executionId: string): Promise<ChecklistExecution> {
  const { data, error } = await supabase
    .from('checklists')
    .update({
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .eq('id', executionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to start checklist execution: ${error.message}`)
  }

  return data as ChecklistExecution
}

/**
 * Pause a checklist execution
 * Creates a pause record
 */
export async function pauseChecklistExecution(
  executionId: string,
  reason?: string
): Promise<ChecklistExecutionPause> {
  const { data: execution, error: execError } = await supabase
    .from('checklists')
    .select('pause_count')
    .eq('id', executionId)
    .single()

  if (execError) {
    throw new Error(`Failed to fetch execution: ${execError.message}`)
  }

  // Create pause record
  const { data: pause, error: pauseError } = await supabase
    .from('checklist_execution_pauses')
    .insert({
      checklist_id: executionId,
      paused_at: new Date().toISOString(),
      pause_reason: reason,
    })
    .select()
    .single()

  if (pauseError) {
    throw new Error(`Failed to pause execution: ${pauseError.message}`)
  }

  // Update pause count
  const { error: updateError } = await supabase
    .from('checklists')
    .update({
      pause_count: (execution.pause_count || 0) + 1,
    })
    .eq('id', executionId)

  if (updateError) {
    throw new Error(`Failed to update pause count: ${updateError.message}`)
  }

  return pause as ChecklistExecutionPause
}

/**
 * Resume a paused checklist execution
 * Updates the latest pause record with resume time
 */
export async function resumeChecklistExecution(
  executionId: string
): Promise<ChecklistExecutionPause> {
  // Find the most recent pause without a resume time
  const { data: pause, error: findError } = await supabase
    .from('checklist_execution_pauses')
    .select('*')
    .eq('checklist_id', executionId)
    .is('resumed_at', null)
    .order('paused_at', { ascending: false })
    .limit(1)
    .single()

  if (findError) {
    throw new Error(`Failed to find active pause: ${findError.message}`)
  }

  const resumedAt = new Date()
  const pausedAt = new Date(pause.paused_at)
  const pauseDurationMinutes = Math.round((resumedAt.getTime() - pausedAt.getTime()) / 60000)

  // Update pause record
  const { data: updatedPause, error: updateError } = await supabase
    .from('checklist_execution_pauses')
    .update({
      resumed_at: resumedAt.toISOString(),
      pause_duration_minutes: pauseDurationMinutes,
    })
    .eq('id', pause.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to resume execution: ${updateError.message}`)
  }

  // Update total paused duration on execution
  const { data: execution, error: execError } = await supabase
    .from('checklists')
    .select('paused_duration_minutes')
    .eq('id', executionId)
    .single()

  if (!execError) {
    await supabase
      .from('checklists')
      .update({
        paused_duration_minutes: (execution.paused_duration_minutes || 0) + pauseDurationMinutes,
      })
      .eq('id', executionId)
  }

  return updatedPause as ChecklistExecutionPause
}

/**
 * Complete a checklist execution
 * Sets completed_at and triggers automatic duration calculation
 */
export async function completeChecklistExecution(
  executionId: string,
  completedBy: string
): Promise<ChecklistExecution> {
  // Check if there's an active pause and auto-resume it
  const { data: activePause } = await supabase
    .from('checklist_execution_pauses')
    .select('id')
    .eq('checklist_id', executionId)
    .is('resumed_at', null)
    .single()

  if (activePause) {
    await resumeChecklistExecution(executionId)
  }

  // Complete the execution
  const { data, error } = await supabase
    .from('checklists')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
      status: 'submitted',
    })
    .eq('id', executionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to complete execution: ${error.message}`)
  }

  // Note: actual_duration_minutes is calculated automatically by database trigger

  return data as ChecklistExecution
}

/**
 * Get pause history for an execution
 */
export async function getExecutionPauses(
  executionId: string
): Promise<ChecklistExecutionPause[]> {
  const { data, error } = await supabase
    .from('checklist_execution_pauses')
    .select('*')
    .eq('checklist_id', executionId)
    .order('paused_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch pauses: ${error.message}`)
  }

  return data as ChecklistExecutionPause[]
}

// ==============================================
// TIME ANALYTICS
// ==============================================

/**
 * Get time analytics for a single execution
 */
export async function getExecutionTimeAnalytics(
  executionId: string
): Promise<ChecklistTimeAnalytics | null> {
  const { data, error } = await supabase
    .from('checklist_time_analytics')
    .select('*')
    .eq('id', executionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch time analytics: ${error.message}`)
  }

  return data as ChecklistTimeAnalytics
}

/**
 * Get time analytics for multiple executions with filters
 */
export async function getCompletionTimeAnalytics(
  filters: TimeAnalyticsFilters
): Promise<ChecklistTimeAnalytics[]> {
  let query = supabase
    .from('checklist_time_analytics')
    .select('*')
    .gte('completed_at', filters.start_date)
    .lte('completed_at', filters.end_date)
    .not('actual_duration_minutes', 'is', null)
    .order('completed_at', { ascending: false })

  if (filters.template_id) {
    query = query.eq('checklist_template_id', filters.template_id)
  }

  if (filters.inspector_user_id) {
    query = query.eq('inspector_user_id', filters.inspector_user_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.accuracy_rating) {
    query = query.eq('accuracy_rating', filters.accuracy_rating)
  }

  if (filters.completed_on_time !== undefined) {
    query = query.eq('completed_on_time', filters.completed_on_time)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch time analytics: ${error.message}`)
  }

  return data as ChecklistTimeAnalytics[]
}

/**
 * Get average completion time for a template
 * Uses PostgreSQL function for optimized calculation
 */
export async function getAverageCompletionTime(
  templateId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<TemplateCompletionTimeStats> {
  const { data, error } = await supabase.rpc('get_template_average_completion_time', {
    p_template_id: templateId,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
  })

  if (error) {
    throw new Error(`Failed to get average completion time: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return {
      avg_duration_minutes: 0,
      median_duration_minutes: 0,
      min_duration_minutes: 0,
      max_duration_minutes: 0,
      std_dev_minutes: 0,
      total_executions: 0,
      on_time_count: 0,
      on_time_percentage: 0,
    }
  }

  return data[0] as TemplateCompletionTimeStats
}

/**
 * Get estimated vs actual time comparison for a template
 */
export async function getEstimatedVsActual(
  templateId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  estimated: number
  actual: number
  variance: number
  variance_percentage: number
}> {
  // Get template estimated duration
  const { data: template, error: templateError } = await supabase
    .from('checklist_templates')
    .select('estimated_duration_minutes')
    .eq('id', templateId)
    .single()

  if (templateError) {
    throw new Error(`Failed to fetch template: ${templateError.message}`)
  }

  // Get average actual duration
  const stats = await getAverageCompletionTime(templateId, dateFrom, dateTo)

  const estimated = template.estimated_duration_minutes || 0
  const actual = stats.avg_duration_minutes || 0
  const variance = actual - estimated
  const variance_percentage = estimated > 0 ? (variance / estimated) * 100 : 0

  return {
    estimated,
    actual,
    variance,
    variance_percentage,
  }
}

/**
 * Get completion time statistics by user
 */
export async function getCompletionTimeByUser(
  userId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<UserCompletionTimeStats> {
  const { data, error } = await supabase.rpc('get_user_completion_time_stats', {
    p_user_id: userId,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
  })

  if (error) {
    throw new Error(`Failed to get user completion time stats: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return {
      avg_duration_minutes: 0,
      total_executions: 0,
      on_time_count: 0,
      on_time_percentage: 0,
      avg_variance_percentage: 0,
    }
  }

  return data[0] as UserCompletionTimeStats
}

/**
 * Get completion time trends over a period
 * Groups by day, week, or month depending on date range
 */
export async function getCompletionTimeTrends(
  templateId: string,
  dateFrom: string,
  dateTo: string,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<CompletionTimeTrend[]> {
  let truncFormat: string
  switch (period) {
    case 'week':
      truncFormat = 'week'
      break
    case 'month':
      truncFormat = 'month'
      break
    default:
      truncFormat = 'day'
  }

  const { data, error } = await supabase.rpc('get_completion_time_trends', {
    p_template_id: templateId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_period: truncFormat,
  })

  // If the RPC function doesn't exist yet, use a manual query
  if (error && error.code === '42883') {
    const { data: analytics, error: analyticsError } = await supabase
      .from('checklist_time_analytics')
      .select('*')
      .eq('checklist_template_id', templateId)
      .gte('completed_at', dateFrom)
      .lte('completed_at', dateTo)
      .not('actual_duration_minutes', 'is', null)
      .order('completed_at', { ascending: true })

    if (analyticsError) {
      throw new Error(`Failed to fetch time trends: ${analyticsError.message}`)
    }

    // Group manually by date
    const trends = new Map<string, { total: number; count: number; onTime: number }>()

    analytics.forEach((item) => {
      const date = new Date(item.completed_at!)
      let key: string

      switch (period) {
        case 'week':
          // Start of week
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      const existing = trends.get(key) || { total: 0, count: 0, onTime: 0 }
      existing.total += item.actual_duration_minutes || 0
      existing.count += 1
      if (item.completed_on_time) {
        existing.onTime += 1
      }
      trends.set(key, existing)
    })

    return Array.from(trends.entries()).map(([date, stats]) => ({
      date,
      avg_duration_minutes: stats.count > 0 ? stats.total / stats.count : 0,
      execution_count: stats.count,
      on_time_percentage: stats.count > 0 ? (stats.onTime / stats.count) * 100 : 0,
    }))
  }

  if (error) {
    throw new Error(`Failed to get completion time trends: ${error.message}`)
  }

  return (data || []) as CompletionTimeTrend[]
}

/**
 * Get time variance summary (faster/on-time/slower breakdown)
 */
export async function getTimeVarianceSummary(
  templateId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<TimeVarianceSummary> {
  let query = supabase
    .from('checklist_time_analytics')
    .select('variance_percentage, completed_on_time')
    .eq('checklist_template_id', templateId)
    .not('actual_duration_minutes', 'is', null)

  if (dateFrom) {
    query = query.gte('completed_at', dateFrom)
  }

  if (dateTo) {
    query = query.lte('completed_at', dateTo)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get variance summary: ${error.message}`)
  }

  const summary: TimeVarianceSummary = {
    faster_count: 0,
    on_time_count: 0,
    slower_count: 0,
    avg_variance_percentage: 0,
    total_executions: data.length,
  }

  let totalVariance = 0

  data.forEach((item) => {
    const variance = item.variance_percentage || 0
    totalVariance += variance

    if (variance < -5) {
      summary.faster_count++
    } else if (variance <= 5) {
      summary.on_time_count++
    } else {
      summary.slower_count++
    }
  })

  summary.avg_variance_percentage = data.length > 0 ? totalVariance / data.length : 0

  return summary
}

/**
 * Get fastest and slowest executions for a template
 */
export async function getFastestAndSlowest(
  templateId: string,
  limit = 5
): Promise<{
  fastest: ChecklistTimeAnalytics[]
  slowest: ChecklistTimeAnalytics[]
}> {
  const { data: fastest, error: fastestError } = await supabase
    .from('checklist_time_analytics')
    .select('*')
    .eq('checklist_template_id', templateId)
    .not('actual_duration_minutes', 'is', null)
    .order('actual_duration_minutes', { ascending: true })
    .limit(limit)

  if (fastestError) {
    throw new Error(`Failed to fetch fastest executions: ${fastestError.message}`)
  }

  const { data: slowest, error: slowestError } = await supabase
    .from('checklist_time_analytics')
    .select('*')
    .eq('checklist_template_id', templateId)
    .not('actual_duration_minutes', 'is', null)
    .order('actual_duration_minutes', { ascending: false })
    .limit(limit)

  if (slowestError) {
    throw new Error(`Failed to fetch slowest executions: ${slowestError.message}`)
  }

  return {
    fastest: fastest as ChecklistTimeAnalytics[],
    slowest: slowest as ChecklistTimeAnalytics[],
  }
}

/**
 * Update estimated duration for a template based on historical data
 * Helps improve template accuracy over time
 */
export async function updateEstimatedDuration(templateId: string): Promise<void> {
  const stats = await getAverageCompletionTime(templateId)

  if (stats.total_executions < 5) {
    throw new Error('Need at least 5 completed executions to update estimated duration')
  }

  // Use median duration as it's less affected by outliers
  const newEstimate = Math.round(stats.median_duration_minutes)

  const { error } = await supabase
    .from('checklist_templates')
    .update({
      estimated_duration_minutes: newEstimate,
    })
    .eq('id', templateId)

  if (error) {
    throw new Error(`Failed to update estimated duration: ${error.message}`)
  }
}

// Export all functions
export const checklistTimeTrackingService = {
  // Execution tracking
  startChecklistExecution,
  pauseChecklistExecution,
  resumeChecklistExecution,
  completeChecklistExecution,
  getExecutionPauses,

  // Analytics
  getExecutionTimeAnalytics,
  getCompletionTimeAnalytics,
  getAverageCompletionTime,
  getEstimatedVsActual,
  getCompletionTimeByUser,
  getCompletionTimeTrends,
  getTimeVarianceSummary,
  getFastestAndSlowest,
  updateEstimatedDuration,
}
