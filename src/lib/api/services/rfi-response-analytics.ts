/**
 * RFI Response Time Analytics Service
 *
 * Comprehensive service for tracking and analyzing RFI response time patterns.
 * Provides metrics for average response times, distributions, trends, and
 * assignee performance comparisons.
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type { RFIPriority, RFIResponseType, BallInCourtRole } from '@/types/rfi'

// Extended RFI type with response analytics fields
// These fields exist in the database (migration 078) but may not be in generated types yet
interface RFIWithResponseFields {
  id: string
  date_submitted: string | null
  date_responded: string | null
  required_response_days: number | null
  response_type: RFIResponseType | null
  priority: string | null
  status: string
  assigned_to?: string | null
  ball_in_court_role?: string | null
  rfi_number?: number
  subject?: string
  assigned_to_user?: { id: string; full_name: string } | null
}
import {
  DEFAULT_RESPONSE_TIME_THRESHOLDS,
  TIME_CONSTANTS,
  type DateRange,
  type ResponseTimeStatistics,
  type RFIAverageResponseMetrics,
  type ResponseTimeByPriority,
  type ResponseTimeByAssignee,
  type ResponseTimeByResponseType,
  type ResponseTimeDistribution,
  type ResponseTimeDistributionBucket,
  type ResponseTimePercentiles,
  type ResponseTimeTrends,
  type ResponseTimeTrendPoint,
  type TrendDirection,
  type ResponseTimeByDayOfWeek,
  type ResponseTimeByMonth,
  type ResponseTimeRecord,
  type RFIResponseTimeAnalytics,
  type RFIResponseAnalyticsFilters,
  type ResponseTimeThresholds,
  type AssigneePerformanceRating,
} from '@/types/rfi-response-analytics'

// =============================================
// Core Calculation Functions
// =============================================

/**
 * Calculate response time in days between two dates
 * Returns null if either date is missing
 */
export function calculateResponseTime(
  submittedDate: string | Date | null,
  respondedDate: string | Date | null
): number | null {
  if (!submittedDate || !respondedDate) {
    return null
  }

  const submitted = new Date(submittedDate)
  const responded = new Date(respondedDate)

  // Reset times to start of day for accurate day calculation
  submitted.setHours(0, 0, 0, 0)
  responded.setHours(0, 0, 0, 0)

  const diffMs = responded.getTime() - submitted.getTime()
  const diffDays = diffMs / TIME_CONSTANTS.MS_PER_DAY

  // Return rounded to 2 decimal places
  return Math.round(diffDays * 100) / 100
}

/**
 * Calculate business days between two dates (excluding weekends)
 */
export function calculateBusinessDays(
  startDate: string | Date,
  endDate: string | Date
): number {
  const start = new Date(startDate)
  const end = new Date(endDate)

  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  let businessDays = 0
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      businessDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return businessDays
}

/**
 * Check if an RFI response was on time
 */
export function isResponseOnTime(
  submittedDate: string | null,
  respondedDate: string | null,
  requiredResponseDays: number,
  thresholds?: ResponseTimeThresholds,
  priority?: RFIPriority
): boolean | null {
  if (!submittedDate || !respondedDate) {
    return null
  }

  const responseTime = calculateResponseTime(submittedDate, respondedDate)
  if (responseTime === null) {
    return null
  }

  // Use priority-specific target if available
  let targetDays = requiredResponseDays
  if (priority && thresholds?.targetDaysByPriority) {
    targetDays = thresholds.targetDaysByPriority[priority]
  }

  return responseTime <= targetDays
}

/**
 * Calculate days overdue (negative if early, positive if late)
 */
export function calculateDaysOverdue(
  submittedDate: string | null,
  respondedDate: string | null,
  requiredResponseDays: number
): number {
  if (!submittedDate) {
    return 0
  }

  const submitted = new Date(submittedDate)
  submitted.setHours(0, 0, 0, 0)

  const dueDate = new Date(submitted)
  dueDate.setDate(dueDate.getDate() + requiredResponseDays)

  const compareDate = respondedDate ? new Date(respondedDate) : new Date()
  compareDate.setHours(0, 0, 0, 0)

  const diffMs = compareDate.getTime() - dueDate.getTime()
  return Math.round(diffMs / TIME_CONSTANTS.MS_PER_DAY)
}

// =============================================
// Statistical Functions
// =============================================

/**
 * Calculate mean (average) of an array of numbers
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) {return 0}
  const sum = values.reduce((acc, val) => acc + val, 0)
  return sum / values.length
}

/**
 * Calculate median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) {return 0}

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Calculate percentile value from an array
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {return 0}
  if (percentile < 0 || percentile > 100) {
    throw new Error('Percentile must be between 0 and 100')
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  if (lower === upper) {
    return sorted[lower]
  }

  // Linear interpolation
  const fraction = index - lower
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower])
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) {return 0}

  const mean = calculateMean(values)
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
  const avgSquaredDiff = calculateMean(squaredDiffs)

  return Math.sqrt(avgSquaredDiff)
}

/**
 * Calculate complete statistics for response times
 */
export function calculateStatistics(values: number[]): ResponseTimeStatistics {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      variance: 0,
    }
  }

  const sum = values.reduce((acc, val) => acc + val, 0)
  const mean = calculateMean(values)
  const variance = calculateMean(values.map((val) => Math.pow(val - mean, 2)))

  return {
    count: values.length,
    sum: Math.round(sum * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(calculateMedian(values) * 100) / 100,
    min: Math.round(Math.min(...values) * 100) / 100,
    max: Math.round(Math.max(...values) * 100) / 100,
    standardDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
    variance: Math.round(variance * 100) / 100,
  }
}

/**
 * Calculate response time percentiles
 */
export function calculatePercentiles(values: number[]): ResponseTimePercentiles {
  return {
    p50: Math.round(calculatePercentile(values, 50) * 100) / 100,
    p75: Math.round(calculatePercentile(values, 75) * 100) / 100,
    p90: Math.round(calculatePercentile(values, 90) * 100) / 100,
    p95: Math.round(calculatePercentile(values, 95) * 100) / 100,
    p99: Math.round(calculatePercentile(values, 99) * 100) / 100,
  }
}

// =============================================
// Assignee Performance Rating
// =============================================

/**
 * Get performance rating based on on-time percentage
 */
export function getPerformanceRating(
  onTimePercentage: number,
  thresholds: ResponseTimeThresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS
): AssigneePerformanceRating {
  const { excellent, good, average } = thresholds.performanceRatingThresholds

  if (onTimePercentage >= excellent) {return 'excellent'}
  if (onTimePercentage >= good) {return 'good'}
  if (onTimePercentage >= average) {return 'average'}
  return 'needs_improvement'
}

// =============================================
// Trend Analysis Functions
// =============================================

/**
 * Determine trend direction based on percentage change
 */
export function determineTrendDirection(
  percentageChange: number,
  threshold: number = DEFAULT_RESPONSE_TIME_THRESHOLDS.trendChangeThreshold
): TrendDirection {
  // Negative change = response times decreasing = improving
  if (percentageChange <= -threshold) {return 'improving'}
  if (percentageChange >= threshold) {return 'declining'}
  return 'stable'
}

/**
 * Calculate moving average for a series of values
 */
export function calculateMovingAverage(
  values: number[],
  windowSize: number
): (number | null)[] {
  if (values.length < windowSize) {
    return values.map(() => null)
  }

  const result: (number | null)[] = []

  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      result.push(null)
    } else {
      const window = values.slice(i - windowSize + 1, i + 1)
      result.push(Math.round(calculateMean(window) * 100) / 100)
    }
  }

  return result
}

// =============================================
// Distribution Bucket Functions
// =============================================

/**
 * Create distribution buckets for response times
 */
export function createDistributionBuckets(
  responseTimes: number[],
  customBuckets?: { label: string; minDays: number; maxDays: number }[]
): ResponseTimeDistributionBucket[] {
  const defaultBuckets = [
    { label: 'Same day', minDays: 0, maxDays: 0 },
    { label: '1 day', minDays: 1, maxDays: 1 },
    { label: '2-3 days', minDays: 2, maxDays: 3 },
    { label: '4-7 days', minDays: 4, maxDays: 7 },
    { label: '8-14 days', minDays: 8, maxDays: 14 },
    { label: '15-30 days', minDays: 15, maxDays: 30 },
    { label: '30+ days', minDays: 31, maxDays: Infinity },
  ]

  const buckets = customBuckets || defaultBuckets
  const total = responseTimes.length

  return buckets.map((bucket) => {
    const count = responseTimes.filter((time) => {
      const roundedTime = Math.floor(time)
      return roundedTime >= bucket.minDays && roundedTime <= bucket.maxDays
    }).length

    return {
      label: bucket.label,
      minDays: bucket.minDays,
      maxDays: bucket.maxDays === Infinity ? 999 : bucket.maxDays,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }
  })
}

// =============================================
// Date Helper Functions
// =============================================

/**
 * Get day of week name
 */
export function getDayOfWeekName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayNumber] || 'Unknown'
}

/**
 * Get month name
 */
export function getMonthName(monthNumber: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[monthNumber] || 'Unknown'
}

/**
 * Get date range from preset
 */
export function getDateRangeFromPreset(preset: string): DateRange {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  let startDate: string

  switch (preset) {
    case 'last_7_days':
      startDate = new Date(now.getTime() - 7 * TIME_CONSTANTS.MS_PER_DAY)
        .toISOString()
        .split('T')[0]
      break
    case 'last_30_days':
      startDate = new Date(now.getTime() - 30 * TIME_CONSTANTS.MS_PER_DAY)
        .toISOString()
        .split('T')[0]
      break
    case 'last_90_days':
      startDate = new Date(now.getTime() - 90 * TIME_CONSTANTS.MS_PER_DAY)
        .toISOString()
        .split('T')[0]
      break
    case 'last_6_months':
      startDate = new Date(now.getTime() - 180 * TIME_CONSTANTS.MS_PER_DAY)
        .toISOString()
        .split('T')[0]
      break
    case 'last_year':
      startDate = new Date(now.getTime() - 365 * TIME_CONSTANTS.MS_PER_DAY)
        .toISOString()
        .split('T')[0]
      break
    case 'all_time':
    default:
      startDate = '2000-01-01' // Effectively all time
      break
  }

  return { startDate, endDate }
}

// =============================================
// RFI Response Analytics Service
// =============================================

export const rfiResponseAnalyticsService = {
  /**
   * Get average response time metrics for a project
   */
  async getAverageResponseTime(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<RFIAverageResponseMetrics> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')
    const thresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS

    let query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded, required_response_days, priority, status')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    // Apply date range filter
    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    // Apply priority filter
    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      query = query.in('priority', priorities)
    }

    // Exclude internal RFIs if specified
    if (filters?.excludeInternalRFIs) {
      query = query.eq('is_internal', false)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs:', error)
      throw error
    }

    // Cast to extended type with response fields
    const rfis = data as unknown as RFIWithResponseFields[]

    const responseTimes: number[] = []
    let onTimeCount = 0
    let lateCount = 0
    let respondedCount = 0
    let pendingCount = 0

    rfis?.forEach((rfi) => {
      if (rfi.date_responded) {
        respondedCount++
        const responseTime = calculateResponseTime(rfi.date_submitted, rfi.date_responded)
        if (responseTime !== null) {
          responseTimes.push(responseTime)

          const isOnTime = isResponseOnTime(
            rfi.date_submitted,
            rfi.date_responded,
            rfi.required_response_days || thresholds.targetDaysByPriority[rfi.priority as RFIPriority] || 7,
            thresholds,
            rfi.priority as RFIPriority
          )

          if (isOnTime === true) {
            onTimeCount++
          } else if (isOnTime === false) {
            lateCount++
          }
        }
      } else if (!['closed', 'void'].includes(rfi.status)) {
        pendingCount++
      }
    })

    const statistics = calculateStatistics(responseTimes)

    return {
      projectId,
      dateRange,
      totalRFIs: rfis?.length || 0,
      respondedRFIs: respondedCount,
      pendingRFIs: pendingCount,
      overallAverageResponseDays: statistics.mean,
      overallMedianResponseDays: statistics.median,
      onTimeCount,
      lateCount,
      onTimePercentage:
        respondedCount > 0 ? Math.round((onTimeCount / respondedCount) * 10000) / 100 : 0,
      statistics,
    }
  },

  /**
   * Get response time metrics grouped by priority
   */
  async getResponseTimeByPriority(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<ResponseTimeByPriority[]> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')
    const thresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS

    let query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded, required_response_days, priority')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_submitted', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs by priority:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    const priorities: RFIPriority[] = ['critical', 'high', 'normal', 'low']
    const results: ResponseTimeByPriority[] = []

    for (const priority of priorities) {
      const priorityRFIs = rfis?.filter((rfi) => rfi.priority === priority) || []
      const respondedRFIs = priorityRFIs.filter((rfi) => rfi.date_responded)
      const responseTimes = respondedRFIs
        .map((rfi) => calculateResponseTime(rfi.date_submitted, rfi.date_responded))
        .filter((time): time is number => time !== null)

      let onTimeCount = 0
      respondedRFIs.forEach((rfi) => {
        const isOnTime = isResponseOnTime(
          rfi.date_submitted,
          rfi.date_responded,
          rfi.required_response_days || thresholds.targetDaysByPriority[priority],
          thresholds,
          priority
        )
        if (isOnTime) {onTimeCount++}
      })

      results.push({
        priority,
        count: priorityRFIs.length,
        respondedCount: respondedRFIs.length,
        averageResponseDays: calculateMean(responseTimes),
        medianResponseDays: calculateMedian(responseTimes),
        onTimePercentage:
          respondedRFIs.length > 0
            ? Math.round((onTimeCount / respondedRFIs.length) * 10000) / 100
            : 0,
        targetResponseDays: thresholds.targetDaysByPriority[priority],
      })
    }

    return results
  },

  /**
   * Get response time metrics grouped by assignee
   */
  async getResponseTimeByAssignee(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<ResponseTimeByAssignee[]> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')
    const thresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS

    let query = supabase
      .from('rfis')
      .select(`
        id, date_submitted, date_responded, required_response_days, priority,
        assigned_to, ball_in_court_role,
        assigned_to_user:profiles!rfis_assigned_to_fkey(id, full_name)
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('assigned_to', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    if (filters?.assigneeId) {
      const assignees = Array.isArray(filters.assigneeId)
        ? filters.assigneeId
        : [filters.assigneeId]
      query = query.in('assigned_to', assignees)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs by assignee:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    // Group RFIs by assignee
    const assigneeMap = new Map<
      string,
      {
        assigneeId: string
        assigneeName: string
        assigneeRole: BallInCourtRole | null
        rfis: RFIWithResponseFields[]
      }
    >()

    rfis?.forEach((rfi) => {
      if (!rfi.assigned_to) {return}

      if (!assigneeMap.has(rfi.assigned_to)) {
        assigneeMap.set(rfi.assigned_to, {
          assigneeId: rfi.assigned_to,
          assigneeName: (rfi.assigned_to_user as any)?.full_name || 'Unknown',
          assigneeRole: rfi.ball_in_court_role as BallInCourtRole | null,
          rfis: [],
        })
      }
      assigneeMap.get(rfi.assigned_to)!.rfis.push(rfi)
    })

    const results: ResponseTimeByAssignee[] = []

    for (const [assigneeId, data] of assigneeMap) {
      const respondedRFIs = data.rfis.filter((rfi) => rfi.date_responded)
      const responseTimes = respondedRFIs
        .map((rfi) => calculateResponseTime(rfi.date_submitted, rfi.date_responded))
        .filter((time): time is number => time !== null)

      let onTimeCount = 0
      respondedRFIs.forEach((rfi) => {
        const isOnTime = isResponseOnTime(
          rfi.date_submitted,
          rfi.date_responded,
          rfi.required_response_days || 7,
          thresholds,
          rfi.priority as RFIPriority
        )
        if (isOnTime) {onTimeCount++}
      })

      const onTimePercentage =
        respondedRFIs.length > 0
          ? Math.round((onTimeCount / respondedRFIs.length) * 10000) / 100
          : 0

      results.push({
        assigneeId,
        assigneeName: data.assigneeName,
        assigneeRole: data.assigneeRole,
        totalAssigned: data.rfis.length,
        respondedCount: respondedRFIs.length,
        averageResponseDays: Math.round(calculateMean(responseTimes) * 100) / 100,
        medianResponseDays: Math.round(calculateMedian(responseTimes) * 100) / 100,
        onTimePercentage,
        fastestResponseDays: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        slowestResponseDays: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        performanceRating: getPerformanceRating(onTimePercentage, thresholds),
      })
    }

    // Sort by on-time percentage descending
    return results.sort((a, b) => b.onTimePercentage - a.onTimePercentage)
  },

  /**
   * Get response time metrics grouped by response type
   */
  async getResponseTimeByResponseType(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<ResponseTimeByResponseType[]> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')

    let query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded, response_type')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_responded', 'is', null)
      .not('response_type', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    if (filters?.responseType) {
      const types = Array.isArray(filters.responseType)
        ? filters.responseType
        : [filters.responseType]
      query = query.in('response_type', types)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs by response type:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    // Group by response type
    const typeMap = new Map<RFIResponseType, number[]>()
    const totalResponded = rfis?.length || 0

    rfis?.forEach((rfi) => {
      if (!rfi.response_type) {return}

      if (!typeMap.has(rfi.response_type as RFIResponseType)) {
        typeMap.set(rfi.response_type as RFIResponseType, [])
      }

      const responseTime = calculateResponseTime(rfi.date_submitted, rfi.date_responded)
      if (responseTime !== null) {
        typeMap.get(rfi.response_type as RFIResponseType)!.push(responseTime)
      }
    })

    const results: ResponseTimeByResponseType[] = []

    for (const [responseType, times] of typeMap) {
      results.push({
        responseType,
        count: times.length,
        averageResponseDays: Math.round(calculateMean(times) * 100) / 100,
        medianResponseDays: Math.round(calculateMedian(times) * 100) / 100,
        percentage: totalResponded > 0 ? Math.round((times.length / totalResponded) * 10000) / 100 : 0,
      })
    }

    // Sort by count descending
    return results.sort((a, b) => b.count - a.count)
  },

  /**
   * Get response time distribution analysis
   */
  async getResponseTimeDistribution(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<ResponseTimeDistribution> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')
    const thresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS

    let query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded, required_response_days, priority')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_responded', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs for distribution:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    const responseTimes: number[] = []
    let onTimeCount = 0
    let lateCount = 0

    rfis?.forEach((rfi) => {
      const responseTime = calculateResponseTime(rfi.date_submitted, rfi.date_responded)
      if (responseTime !== null) {
        responseTimes.push(responseTime)

        const isOnTime = isResponseOnTime(
          rfi.date_submitted,
          rfi.date_responded,
          rfi.required_response_days || thresholds.targetDaysByPriority[rfi.priority as RFIPriority] || 7,
          thresholds,
          rfi.priority as RFIPriority
        )

        if (isOnTime === true) {
          onTimeCount++
        } else if (isOnTime === false) {
          lateCount++
        }
      }
    })

    return {
      projectId,
      dateRange,
      totalResponded: responseTimes.length,
      onTimeResponses: onTimeCount,
      lateResponses: lateCount,
      onTimePercentage:
        responseTimes.length > 0
          ? Math.round((onTimeCount / responseTimes.length) * 10000) / 100
          : 0,
      percentiles: calculatePercentiles(responseTimes),
      buckets: createDistributionBuckets(responseTimes),
    }
  },

  /**
   * Get response time trends over time
   */
  async getResponseTimeTrends(
    projectId: string,
    dateRange: DateRange,
    granularity: 'day' | 'week' | 'month' = 'week'
  ): Promise<ResponseTimeTrends> {
    const thresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS

    const query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded, required_response_days, priority')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_submitted', 'is', null)
      .gte('date_submitted', dateRange.startDate)
      .lte('date_submitted', dateRange.endDate)
      .order('date_submitted', { ascending: true })

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs for trends:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    // Group RFIs by period
    const periodMap = new Map<string, RFIWithResponseFields[]>()

    rfis?.forEach((rfi) => {
      const dateSubmitted = rfi.date_submitted
      if (!dateSubmitted) {return}
      const date = new Date(dateSubmitted)
      let periodKey: string

      switch (granularity) {
        case 'day':
          periodKey = date.toISOString().split('T')[0]
          break
        case 'week':
          // Get start of week (Sunday)
          const startOfWeek = new Date(date)
          startOfWeek.setDate(date.getDate() - date.getDay())
          periodKey = startOfWeek.toISOString().split('T')[0]
          break
        case 'month':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, [])
      }
      periodMap.get(periodKey)!.push(rfi)
    })

    // Calculate metrics for each period
    const dataPoints: ResponseTimeTrendPoint[] = []
    const allResponseTimes: number[] = []

    const sortedPeriods = Array.from(periodMap.keys()).sort()

    for (const period of sortedPeriods) {
      const periodRFIs = periodMap.get(period)!
      const respondedRFIs = periodRFIs.filter((rfi) => rfi.date_responded)
      const responseTimes = respondedRFIs
        .map((rfi) => calculateResponseTime(rfi.date_submitted, rfi.date_responded))
        .filter((time): time is number => time !== null)

      allResponseTimes.push(...responseTimes)

      let onTimeCount = 0
      respondedRFIs.forEach((rfi) => {
        const isOnTime = isResponseOnTime(
          rfi.date_submitted,
          rfi.date_responded,
          rfi.required_response_days || 7,
          thresholds,
          rfi.priority as RFIPriority
        )
        if (isOnTime) {onTimeCount++}
      })

      // Calculate period boundaries
      const periodStart = new Date(period)
      const periodEnd = new Date(periodStart)

      switch (granularity) {
        case 'day':
          periodEnd.setDate(periodEnd.getDate() + 1)
          break
        case 'week':
          periodEnd.setDate(periodEnd.getDate() + 7)
          break
        case 'month':
          periodEnd.setMonth(periodEnd.getMonth() + 1)
          break
      }

      dataPoints.push({
        period,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        totalRFIs: periodRFIs.length,
        respondedRFIs: respondedRFIs.length,
        averageResponseDays: Math.round(calculateMean(responseTimes) * 100) / 100,
        medianResponseDays: Math.round(calculateMedian(responseTimes) * 100) / 100,
        onTimePercentage:
          respondedRFIs.length > 0
            ? Math.round((onTimeCount / respondedRFIs.length) * 10000) / 100
            : 0,
      })
    }

    // Calculate trend
    const avgResponseTimes = dataPoints.map((dp) => dp.averageResponseDays)
    let trendPercentageChange = 0
    let overallTrend: TrendDirection = 'stable'

    if (dataPoints.length >= 2) {
      const firstHalf = avgResponseTimes.slice(0, Math.floor(avgResponseTimes.length / 2))
      const secondHalf = avgResponseTimes.slice(Math.floor(avgResponseTimes.length / 2))

      const firstAvg = calculateMean(firstHalf.filter((v) => v > 0))
      const secondAvg = calculateMean(secondHalf.filter((v) => v > 0))

      if (firstAvg > 0) {
        trendPercentageChange = Math.round(((secondAvg - firstAvg) / firstAvg) * 10000) / 100
        overallTrend = determineTrendDirection(trendPercentageChange)
      }
    }

    // Calculate moving averages
    const movingAverages = dataPoints.map((dp, index) => {
      const movingAvg7Day =
        index >= 6
          ? calculateMean(avgResponseTimes.slice(index - 6, index + 1).filter((v) => v > 0))
          : null
      const movingAvg30Day =
        index >= 29
          ? calculateMean(avgResponseTimes.slice(index - 29, index + 1).filter((v) => v > 0))
          : null

      return {
        period: dp.period,
        movingAverage7Day: movingAvg7Day !== null ? Math.round(movingAvg7Day * 100) / 100 : null,
        movingAverage30Day: movingAvg30Day !== null ? Math.round(movingAvg30Day * 100) / 100 : null,
      }
    })

    return {
      projectId,
      dateRange,
      granularity,
      dataPoints,
      overallTrend,
      trendPercentageChange,
      movingAverages,
    }
  },

  /**
   * Get on-time performance metrics
   */
  async getOnTimePerformance(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<{
    totalResponded: number
    onTime: number
    late: number
    onTimePercentage: number
    latePercentage: number
    averageDaysLate: number
    averageDaysEarly: number
  }> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')
    const thresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS

    let query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded, required_response_days, priority')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_responded', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch on-time performance:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    let onTime = 0
    let late = 0
    const daysLateValues: number[] = []
    const daysEarlyValues: number[] = []

    rfis?.forEach((rfi) => {
      const isOnTimeResult = isResponseOnTime(
        rfi.date_submitted,
        rfi.date_responded,
        rfi.required_response_days || thresholds.targetDaysByPriority[rfi.priority as RFIPriority] || 7,
        thresholds,
        rfi.priority as RFIPriority
      )

      const daysOverdue = calculateDaysOverdue(
        rfi.date_submitted,
        rfi.date_responded,
        rfi.required_response_days || thresholds.targetDaysByPriority[rfi.priority as RFIPriority] || 7
      )

      if (isOnTimeResult === true) {
        onTime++
        if (daysOverdue < 0) {
          daysEarlyValues.push(Math.abs(daysOverdue))
        }
      } else if (isOnTimeResult === false) {
        late++
        if (daysOverdue > 0) {
          daysLateValues.push(daysOverdue)
        }
      }
    })

    const totalResponded = rfis?.length || 0

    return {
      totalResponded,
      onTime,
      late,
      onTimePercentage: totalResponded > 0 ? Math.round((onTime / totalResponded) * 10000) / 100 : 0,
      latePercentage: totalResponded > 0 ? Math.round((late / totalResponded) * 10000) / 100 : 0,
      averageDaysLate: Math.round(calculateMean(daysLateValues) * 100) / 100,
      averageDaysEarly: Math.round(calculateMean(daysEarlyValues) * 100) / 100,
    }
  },

  /**
   * Get response time by day of week
   */
  async getResponseTimeByDayOfWeek(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<ResponseTimeByDayOfWeek[]> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')

    let query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_responded', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs by day of week:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    // Group by day of week (of response date)
    const dayMap = new Map<number, number[]>()

    for (let i = 0; i < 7; i++) {
      dayMap.set(i, [])
    }

    rfis?.forEach((rfi) => {
      if (!rfi.date_responded) {return}

      const responseTime = calculateResponseTime(rfi.date_submitted, rfi.date_responded)
      if (responseTime !== null) {
        const dayOfWeek = new Date(rfi.date_responded).getDay()
        dayMap.get(dayOfWeek)!.push(responseTime)
      }
    })

    const results: ResponseTimeByDayOfWeek[] = []

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const times = dayMap.get(dayOfWeek) || []
      results.push({
        dayOfWeek,
        dayName: getDayOfWeekName(dayOfWeek),
        count: times.length,
        averageResponseDays: Math.round(calculateMean(times) * 100) / 100,
        medianResponseDays: Math.round(calculateMedian(times) * 100) / 100,
      })
    }

    return results
  },

  /**
   * Get response time by month
   */
  async getResponseTimeByMonth(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<ResponseTimeByMonth[]> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('last_year')
    const thresholds = DEFAULT_RESPONSE_TIME_THRESHOLDS

    let query = supabase
      .from('rfis')
      .select('id, date_submitted, date_responded, required_response_days, priority')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_responded', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    const { data, error } = await query.order('date_responded', { ascending: true })

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch RFIs by month:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    // Group by year-month
    const monthMap = new Map<
      string,
      { times: number[]; onTimeCount: number; totalCount: number; year: number; month: number }
    >()

    rfis?.forEach((rfi) => {
      if (!rfi.date_responded) {return}

      const responseTime = calculateResponseTime(rfi.date_submitted, rfi.date_responded)
      if (responseTime === null) {return}

      const date = new Date(rfi.date_responded)
      const year = date.getFullYear()
      const month = date.getMonth()
      const key = `${year}-${String(month + 1).padStart(2, '0')}`

      if (!monthMap.has(key)) {
        monthMap.set(key, { times: [], onTimeCount: 0, totalCount: 0, year, month })
      }

      const monthData = monthMap.get(key)!
      monthData.times.push(responseTime)
      monthData.totalCount++

      const isOnTime = isResponseOnTime(
        rfi.date_submitted,
        rfi.date_responded,
        rfi.required_response_days || 7,
        thresholds,
        rfi.priority as RFIPriority
      )
      if (isOnTime) {monthData.onTimeCount++}
    })

    const results: ResponseTimeByMonth[] = []

    const sortedKeys = Array.from(monthMap.keys()).sort()

    for (const key of sortedKeys) {
      const data = monthMap.get(key)!
      results.push({
        year: data.year,
        month: data.month,
        monthName: getMonthName(data.month),
        count: data.times.length,
        averageResponseDays: Math.round(calculateMean(data.times) * 100) / 100,
        medianResponseDays: Math.round(calculateMedian(data.times) * 100) / 100,
        onTimePercentage:
          data.totalCount > 0
            ? Math.round((data.onTimeCount / data.totalCount) * 10000) / 100
            : 0,
      })
    }

    return results
  },

  /**
   * Get fastest and slowest responses
   */
  async getResponseTimeRecords(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>,
    limit: number = 5
  ): Promise<{
    fastest: ResponseTimeRecord[]
    slowest: ResponseTimeRecord[]
  }> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('all_time')

    let query = supabase
      .from('rfis')
      .select(`
        id, rfi_number, subject, date_submitted, date_responded, priority,
        assigned_to_user:profiles!rfis_assigned_to_fkey(full_name)
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('date_responded', 'is', null)

    if (dateRange.startDate) {
      query = query.gte('date_submitted', dateRange.startDate)
    }
    if (dateRange.endDate) {
      query = query.lte('date_submitted', dateRange.endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[RFIResponseAnalytics] Failed to fetch response time records:', error)
      throw error
    }

    const rfis = data as unknown as RFIWithResponseFields[]

    const records: ResponseTimeRecord[] = []

    rfis?.forEach((rfi) => {
      const responseTime = calculateResponseTime(rfi.date_submitted, rfi.date_responded)
      if (responseTime !== null && rfi.rfi_number !== undefined && rfi.subject && rfi.date_submitted && rfi.date_responded) {
        // Extract values to properly narrowed types
        const rfiNumber: number = rfi.rfi_number
        const subject: string = rfi.subject
        const submittedDate: string = rfi.date_submitted
        const respondedDate: string = rfi.date_responded

        records.push({
          rfiId: rfi.id,
          rfiNumber,
          subject,
          responseTimeDays: responseTime,
          submittedDate,
          respondedDate,
          assigneeName: (rfi.assigned_to_user as any)?.full_name || null,
          priority: rfi.priority as RFIPriority,
        })
      }
    })

    // Sort and get fastest/slowest
    const sorted = [...records].sort((a, b) => a.responseTimeDays - b.responseTimeDays)

    return {
      fastest: sorted.slice(0, limit),
      slowest: sorted.slice(-limit).reverse(),
    }
  },

  /**
   * Get complete RFI response time analytics
   */
  async getCompleteAnalytics(
    projectId: string,
    filters?: Partial<RFIResponseAnalyticsFilters>
  ): Promise<RFIResponseTimeAnalytics> {
    const dateRange = filters?.dateRange || getDateRangeFromPreset('last_90_days')

    const [
      summary,
      byPriority,
      byAssignee,
      byResponseType,
      distribution,
      trends,
      byDayOfWeek,
      byMonth,
      records,
    ] = await Promise.all([
      this.getAverageResponseTime(projectId, { ...filters, dateRange }),
      this.getResponseTimeByPriority(projectId, { ...filters, dateRange }),
      this.getResponseTimeByAssignee(projectId, { ...filters, dateRange }),
      this.getResponseTimeByResponseType(projectId, { ...filters, dateRange }),
      this.getResponseTimeDistribution(projectId, { ...filters, dateRange }),
      this.getResponseTimeTrends(projectId, dateRange, 'week'),
      this.getResponseTimeByDayOfWeek(projectId, { ...filters, dateRange }),
      this.getResponseTimeByMonth(projectId, { ...filters, dateRange }),
      this.getResponseTimeRecords(projectId, { ...filters, dateRange }, 5),
    ])

    return {
      projectId,
      dateRange,
      generatedAt: new Date().toISOString(),
      summary,
      byPriority,
      byAssignee,
      byResponseType,
      distribution,
      trends,
      byDayOfWeek,
      byMonth,
      fastestResponses: records.fastest,
      slowestResponses: records.slowest,
    }
  },
}

export default rfiResponseAnalyticsService
