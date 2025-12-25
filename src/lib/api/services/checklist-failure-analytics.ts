// File: /src/lib/api/services/checklist-failure-analytics.ts
// Analytics service for checklist failure trend analysis

import { supabase } from '@/lib/supabase'
import type {
  ChecklistFailureFilters,
  ChecklistFailureAnalytics,
  FailureFrequency,
  FailureTemporalAnalysis,
  FailureCluster,
  FailureTrends,
  TrendDirection,
  FailureRecord,
  DateRange,
  DateRangePreset,
} from '@/types/checklist-failure-analytics'

/**
 * Helper function to get date range from preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange | undefined {
  const now = new Date()
  const from = new Date()

  switch (preset) {
    case 'last_7_days':
      from.setDate(now.getDate() - 7)
      break
    case 'last_30_days':
      from.setDate(now.getDate() - 30)
      break
    case 'last_90_days':
      from.setDate(now.getDate() - 90)
      break
    case 'last_6_months':
      from.setMonth(now.getMonth() - 6)
      break
    case 'last_year':
      from.setFullYear(now.getFullYear() - 1)
      break
    case 'custom':
      return undefined
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  }
}

/**
 * Fetch all failed checklist items with filters
 */
async function fetchFailedItems(filters: ChecklistFailureFilters) {
  let query = supabase
    .from('checklist_responses')
    .select(`
      *,
      checklist:checklists!inner (
        id,
        project_id,
        completed_at,
        checklist_template_id,
        location,
        created_by
      ),
      template_item:checklist_template_items (
        id,
        label,
        section
      )
    `)
    .eq('score_value', 'fail')
    .eq('checklist.project_id', filters.projectId)
    .eq('checklist.is_completed', true)

  if (filters.templateId) {
    query = query.eq('checklist.checklist_template_id', filters.templateId)
  }

  if (filters.dateFrom) {
    query = query.gte('checklist.completed_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('checklist.completed_at', filters.dateTo)
  }

  if (filters.location) {
    query = query.eq('checklist.location', filters.location)
  }

  if (filters.inspectorId) {
    query = query.eq('checklist.created_by', filters.inspectorId)
  }

  const { data, error } = await query

  if (error) {throw error}
  return data || []
}

/**
 * Calculate failure frequency for each checklist item
 */
export async function getFailureFrequency(
  filters: ChecklistFailureFilters
): Promise<FailureFrequency[]> {
  const failedItems = await fetchFailedItems(filters)

  // Group by template item
  const itemMap = new Map<string, {
    label: string
    section: string
    failures: FailureRecord[]
  }>()

  failedItems.forEach((item: any) => {
    const itemId = item.checklist_template_item_id
    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        label: item.template_item?.label || 'Unknown',
        section: item.template_item?.section || 'General',
        failures: [],
      })
    }

    itemMap.get(itemId)!.failures.push({
      checklistId: item.checklist_id,
      executionDate: item.checklist?.completed_at,
      inspector: item.checklist?.created_by,
      location: item.checklist?.location,
      notes: item.notes,
    })
  })

  // Get total executions for each template
  const { data: executionsData } = await supabase
    .from('checklists')
    .select('id, checklist_template_id')
    .eq('project_id', filters.projectId)
    .eq('is_completed', true)

  const totalExecutions = executionsData?.length || 1

  // Calculate frequency and trends
  const results: FailureFrequency[] = []

  for (const [itemId, data] of itemMap.entries()) {
    const failureCount = data.failures.length
    const failureRate = (failureCount / totalExecutions) * 100

    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(data.failures.length / 2)
    const firstHalf = data.failures.slice(0, midPoint)
    const secondHalf = data.failures.slice(midPoint)

    let trend: TrendDirection = 'stable'
    if (data.failures.length >= 4) {
      const firstHalfRate = firstHalf.length / (totalExecutions / 2)
      const secondHalfRate = secondHalf.length / (totalExecutions / 2)
      const change = ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100

      if (change > 10) {trend = 'declining'} // More failures = declining
      else if (change < -10) {trend = 'improving'} // Fewer failures = improving
    }

    // Extract common notes
    const notes = data.failures
      .map(f => f.notes)
      .filter(Boolean) as string[]
    const commonNotes = [...new Set(notes)].slice(0, 5)

    results.push({
      itemLabel: data.label,
      templateItemId: itemId,
      section: data.section,
      failureCount,
      totalExecutions,
      failureRate: parseFloat(failureRate.toFixed(2)),
      trend,
      recentFailures: data.failures.slice(-5),
      commonNotes,
    })
  }

  // Sort by failure count descending
  return results.sort((a, b) => b.failureCount - a.failureCount)
}

/**
 * Analyze temporal patterns of failures
 */
export async function getTemporalAnalysis(
  filters: ChecklistFailureFilters
): Promise<FailureTemporalAnalysis> {
  const failedItems = await fetchFailedItems(filters)

  // Group by hour of day
  const byHour = new Array(24).fill(0).map((_, i) => ({ period: i, count: 0 }))
  const byDayOfWeek = new Array(7).fill(0).map((_, i) => ({
    period: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
    count: 0
  }))
  const monthMap = new Map<string, number>()

  failedItems.forEach((item: any) => {
    if (!item.checklist?.completed_at) {return}

    const date = new Date(item.checklist.completed_at)
    const hour = date.getHours()
    const dayOfWeek = date.getDay()
    const month = date.toISOString().slice(0, 7) // YYYY-MM

    byHour[hour].count++
    byDayOfWeek[dayOfWeek].count++
    monthMap.set(month, (monthMap.get(month) || 0) + 1)
  })

  const byMonth = Array.from(monthMap.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period))

  return {
    byHour,
    byDayOfWeek,
    byMonth,
  }
}

/**
 * Find clusters of items that frequently fail together
 */
export async function getFailureClusters(
  filters: ChecklistFailureFilters
): Promise<FailureCluster[]> {
  const failedItems = await fetchFailedItems(filters)

  // Group failures by checklist execution
  const executionMap = new Map<string, Set<string>>()

  failedItems.forEach((item: any) => {
    const checklistId = item.checklist_id
    const itemLabel = item.template_item?.label || 'Unknown'

    if (!executionMap.has(checklistId)) {
      executionMap.set(checklistId, new Set())
    }

    executionMap.get(checklistId)!.add(itemLabel)
  })

  // Find co-occurrences (executions with 2+ failures)
  const clusterMap = new Map<string, { count: number; executions: string[] }>()

  for (const [checklistId, items] of executionMap.entries()) {
    if (items.size < 2) {continue}

    const itemsArray = Array.from(items).sort()
    const clusterKey = itemsArray.join(' | ')

    if (!clusterMap.has(clusterKey)) {
      clusterMap.set(clusterKey, { count: 0, executions: [] })
    }

    const cluster = clusterMap.get(clusterKey)!
    cluster.count++
    cluster.executions.push(checklistId)
  }

  // Convert to results (only clusters that occur 3+ times)
  const results: FailureCluster[] = []
  const totalExecutions = executionMap.size || 1

  for (const [clusterKey, data] of clusterMap.entries()) {
    if (data.count >= 3) {
      results.push({
        items: clusterKey.split(' | '),
        coOccurrenceCount: data.count,
        coOccurrenceRate: (data.count / totalExecutions) * 100,
        affectedExecutions: data.executions,
      })
    }
  }

  // Sort by occurrence count descending
  return results.sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount)
}

/**
 * Calculate failure trends over time with moving averages
 */
export async function getFailureTrends(
  filters: ChecklistFailureFilters,
  granularity: 'day' | 'week' | 'month' = 'week'
): Promise<FailureTrends> {
  const failedItems = await fetchFailedItems(filters)

  // Get total executions by period for rate calculation
  let executionsQuery = supabase
    .from('checklists')
    .select('id, completed_at')
    .eq('project_id', filters.projectId)
    .eq('is_completed', true)

  if (filters.dateFrom) {
    executionsQuery = executionsQuery.gte('completed_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    executionsQuery = executionsQuery.lte('completed_at', filters.dateTo)
  }

  const { data: executionsData } = await executionsQuery

  // Group by time period
  const failureMap = new Map<string, number>()
  const executionMap = new Map<string, number>()

  const formatDate = (date: Date): string => {
    if (granularity === 'day') {
      return date.toISOString().slice(0, 10)
    } else if (granularity === 'week') {
      // ISO week format: YYYY-Www
      const year = date.getFullYear()
      const week = getWeekNumber(date)
      return `${year}-W${week.toString().padStart(2, '0')}`
    } else {
      return date.toISOString().slice(0, 7)
    }
  }

  failedItems.forEach((item: any) => {
    if (!item.checklist?.completed_at) {return}
    const period = formatDate(new Date(item.checklist.completed_at))
    failureMap.set(period, (failureMap.get(period) || 0) + 1)
  })

  executionsData?.forEach((execution) => {
    if (!execution.completed_at) {return}
    const period = formatDate(new Date(execution.completed_at))
    executionMap.set(period, (executionMap.get(period) || 0) + 1)
  })

  // Create trend data points
  const allPeriods = new Set([...failureMap.keys(), ...executionMap.keys()])
  const data = Array.from(allPeriods)
    .sort()
    .map(period => {
      const count = failureMap.get(period) || 0
      const executions = executionMap.get(period) || 1
      const rate = (count / executions) * 100

      return {
        date: period,
        count,
        rate: parseFloat(rate.toFixed(2)),
      }
    })

  // Calculate 3-period moving average
  const movingAverage = data.map((_, index) => {
    if (index < 2) {return data[index].count}
    const sum = data[index - 2].count + data[index - 1].count + data[index].count
    return parseFloat((sum / 3).toFixed(2))
  })

  // Calculate overall trend
  const trend = calculateTrendDirection(data.map(d => d.count))

  // Calculate change percentage (first quarter vs last quarter)
  const changePercentage = calculateChangePercentage(data.map(d => d.count))

  return {
    data,
    movingAverage,
    overallTrend: trend,
    changePercentage,
  }
}

/**
 * Get complete checklist failure analytics
 */
export async function getChecklistFailureAnalytics(
  filters: ChecklistFailureFilters
): Promise<ChecklistFailureAnalytics> {
  const [frequency, temporal, clusters, trends] = await Promise.all([
    getFailureFrequency(filters),
    getTemporalAnalysis(filters),
    getFailureClusters(filters),
    getFailureTrends(filters),
  ])

  const totalFailures = frequency.reduce((sum, item) => sum + item.failureCount, 0)
  const uniqueFailedItems = frequency.length
  const totalExecutions = frequency[0]?.totalExecutions || 0
  const failureRate = totalExecutions > 0 ? (totalFailures / totalExecutions) * 100 : 0

  return {
    summary: {
      totalFailures,
      failureRate: parseFloat(failureRate.toFixed(2)),
      uniqueFailedItems,
      totalExecutions,
      trend: trends.overallTrend,
    },
    frequency,
    temporal,
    clusters,
    trends,
  }
}

// Helper functions

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function calculateTrendDirection(data: number[]): TrendDirection {
  if (data.length < 4) {return 'stable'}

  const quarterSize = Math.floor(data.length / 4)
  const firstQuarter = data.slice(0, quarterSize)
  const lastQuarter = data.slice(-quarterSize)

  const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length
  const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length

  const change = ((lastAvg - firstAvg) / (firstAvg || 1)) * 100

  if (change > 10) {return 'declining'} // More failures = declining
  if (change < -10) {return 'improving'} // Fewer failures = improving
  return 'stable'
}

function calculateChangePercentage(data: number[]): number {
  if (data.length < 4) {return 0}

  const quarterSize = Math.floor(data.length / 4)
  const firstQuarter = data.slice(0, quarterSize)
  const lastQuarter = data.slice(-quarterSize)

  const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length
  const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length

  return parseFloat((((lastAvg - firstAvg) / (firstAvg || 1)) * 100).toFixed(2))
}

// Export API object for consistency with other services
export const checklistFailureAnalyticsApi = {
  getFailureFrequency,
  getTemporalAnalysis,
  getFailureClusters,
  getFailureTrends,
  getChecklistFailureAnalytics,
  getDateRangeFromPreset,
}
