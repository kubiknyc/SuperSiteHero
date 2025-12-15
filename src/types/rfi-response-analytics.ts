/**
 * RFI Response Time Analytics Types
 *
 * Types for tracking and analyzing RFI response time patterns.
 * Supports comprehensive metrics including averages, distributions,
 * trends, and assignee performance comparisons.
 */

import type { RFIPriority, RFIResponseType, BallInCourtRole } from './rfi'

// =============================================
// Time Unit Constants
// =============================================

/** Milliseconds in common time units */
export const TIME_CONSTANTS = {
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

/** Business days per week (excluding weekends) */
export const BUSINESS_DAYS_PER_WEEK = 5

// =============================================
// Date Range Types
// =============================================

export interface DateRange {
  startDate: string
  endDate: string
}

export type DateRangePreset =
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_6_months'
  | 'last_year'
  | 'all_time'
  | 'custom'

// =============================================
// Response Time Core Types
// =============================================

/**
 * Basic response time metrics for a single RFI
 */
export interface RFIResponseTime {
  rfiId: string
  rfiNumber: number
  submittedDate: string
  respondedDate: string | null
  requiredResponseDays: number
  actualResponseDays: number | null
  responseTimeDays: number | null // Alias for actualResponseDays
  isOnTime: boolean | null
  daysOverdue: number // Negative if early, positive if late
  priority: RFIPriority
  responseType: RFIResponseType | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeRole: BallInCourtRole | null
}

/**
 * Aggregated response time statistics
 */
export interface ResponseTimeStatistics {
  count: number
  sum: number
  mean: number
  median: number
  min: number
  max: number
  standardDeviation: number
  variance: number
}

// =============================================
// Average Response Time Metrics
// =============================================

/**
 * Overall average response time metrics for a project
 */
export interface RFIAverageResponseMetrics {
  projectId: string
  dateRange: DateRange
  totalRFIs: number
  respondedRFIs: number
  pendingRFIs: number

  // Overall averages
  overallAverageResponseDays: number
  overallMedianResponseDays: number

  // On-time performance
  onTimeCount: number
  lateCount: number
  onTimePercentage: number

  // Statistical measures
  statistics: ResponseTimeStatistics
}

/**
 * Response time metrics grouped by priority
 */
export interface ResponseTimeByPriority {
  priority: RFIPriority
  count: number
  respondedCount: number
  averageResponseDays: number
  medianResponseDays: number
  onTimePercentage: number
  targetResponseDays: number
}

/**
 * Response time metrics grouped by assignee
 */
export interface ResponseTimeByAssignee {
  assigneeId: string
  assigneeName: string
  assigneeRole: BallInCourtRole | null
  totalAssigned: number
  respondedCount: number
  averageResponseDays: number
  medianResponseDays: number
  onTimePercentage: number
  fastestResponseDays: number
  slowestResponseDays: number
  // Performance rating: 'excellent' | 'good' | 'average' | 'needs_improvement'
  performanceRating: AssigneePerformanceRating
}

export type AssigneePerformanceRating =
  | 'excellent'
  | 'good'
  | 'average'
  | 'needs_improvement'

/**
 * Response time metrics grouped by response type
 */
export interface ResponseTimeByResponseType {
  responseType: RFIResponseType
  count: number
  averageResponseDays: number
  medianResponseDays: number
  percentage: number // Percentage of total responses
}

// =============================================
// Response Time Distribution
// =============================================

/**
 * Distribution bucket for response times
 */
export interface ResponseTimeDistributionBucket {
  label: string // e.g., "0-1 days", "2-3 days"
  minDays: number
  maxDays: number
  count: number
  percentage: number
}

/**
 * Percentile data for response times
 */
export interface ResponseTimePercentiles {
  p50: number // Median
  p75: number
  p90: number
  p95: number
  p99: number
}

/**
 * Complete distribution analysis
 */
export interface ResponseTimeDistribution {
  projectId: string
  dateRange: DateRange
  totalResponded: number

  // On-time vs late breakdown
  onTimeResponses: number
  lateResponses: number
  onTimePercentage: number

  // Percentile data
  percentiles: ResponseTimePercentiles

  // Distribution buckets
  buckets: ResponseTimeDistributionBucket[]
}

// =============================================
// Response Time Trends
// =============================================

/**
 * Response time data point for trend analysis
 */
export interface ResponseTimeTrendPoint {
  period: string // Date string or period label (e.g., "2024-01", "Week 1")
  periodStart: string
  periodEnd: string
  totalRFIs: number
  respondedRFIs: number
  averageResponseDays: number
  medianResponseDays: number
  onTimePercentage: number
}

/**
 * Trend direction indicator
 */
export type TrendDirection = 'improving' | 'stable' | 'declining'

/**
 * Complete trend analysis
 */
export interface ResponseTimeTrends {
  projectId: string
  dateRange: DateRange
  granularity: 'day' | 'week' | 'month'
  dataPoints: ResponseTimeTrendPoint[]

  // Trend analysis
  overallTrend: TrendDirection
  trendPercentageChange: number // Positive = improving (shorter times)
  movingAverages: {
    period: string
    movingAverage7Day: number | null
    movingAverage30Day: number | null
  }[]
}

// =============================================
// Dashboard Analytics Data
// =============================================

/**
 * Response time by day of week
 */
export interface ResponseTimeByDayOfWeek {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  dayName: string
  count: number
  averageResponseDays: number
  medianResponseDays: number
}

/**
 * Response time by month
 */
export interface ResponseTimeByMonth {
  year: number
  month: number
  monthName: string
  count: number
  averageResponseDays: number
  medianResponseDays: number
  onTimePercentage: number
}

/**
 * Fastest/slowest response records
 */
export interface ResponseTimeRecord {
  rfiId: string
  rfiNumber: number
  subject: string
  responseTimeDays: number
  submittedDate: string
  respondedDate: string
  assigneeName: string | null
  priority: RFIPriority
}

/**
 * Complete dashboard analytics data
 */
export interface RFIResponseTimeAnalytics {
  projectId: string
  dateRange: DateRange
  generatedAt: string

  // Summary metrics
  summary: RFIAverageResponseMetrics

  // Breakdowns
  byPriority: ResponseTimeByPriority[]
  byAssignee: ResponseTimeByAssignee[]
  byResponseType: ResponseTimeByResponseType[]

  // Distribution
  distribution: ResponseTimeDistribution

  // Trends
  trends: ResponseTimeTrends

  // Time-based analysis
  byDayOfWeek: ResponseTimeByDayOfWeek[]
  byMonth: ResponseTimeByMonth[]

  // Records
  fastestResponses: ResponseTimeRecord[]
  slowestResponses: ResponseTimeRecord[]
}

// =============================================
// Filter Types
// =============================================

/**
 * Filters for response time analytics queries
 */
export interface RFIResponseAnalyticsFilters {
  projectId: string
  dateRange?: DateRange
  priority?: RFIPriority | RFIPriority[]
  assigneeId?: string | string[]
  responseType?: RFIResponseType | RFIResponseType[]
  includeOpenRFIs?: boolean // Include RFIs without responses
  excludeInternalRFIs?: boolean
}

// =============================================
// Performance Thresholds
// =============================================

/**
 * Configurable thresholds for performance ratings
 */
export interface ResponseTimeThresholds {
  // On-time threshold by priority (in days)
  targetDaysByPriority: Record<RFIPriority, number>

  // Assignee performance rating thresholds (on-time percentage)
  performanceRatingThresholds: {
    excellent: number // e.g., 95% on-time
    good: number // e.g., 85% on-time
    average: number // e.g., 70% on-time
    // Below average = needs_improvement
  }

  // Trend analysis thresholds
  trendChangeThreshold: number // Percentage change to consider significant
}

/**
 * Default response time thresholds
 */
export const DEFAULT_RESPONSE_TIME_THRESHOLDS: ResponseTimeThresholds = {
  targetDaysByPriority: {
    critical: 1,
    high: 3,
    normal: 7,
    low: 14,
  },
  performanceRatingThresholds: {
    excellent: 95,
    good: 85,
    average: 70,
  },
  trendChangeThreshold: 10,
}

// =============================================
// Utility Type Guards
// =============================================

/**
 * Check if a value is a valid RFI priority
 */
export function isValidPriority(value: unknown): value is RFIPriority {
  return ['critical', 'high', 'normal', 'low'].includes(value as string)
}

/**
 * Check if a value is a valid response type
 */
export function isValidResponseType(value: unknown): value is RFIResponseType {
  return [
    'answered',
    'see_drawings',
    'see_specs',
    'deferred',
    'partial_response',
    'request_clarification',
    'no_change_required',
  ].includes(value as string)
}

/**
 * Check if a value is a valid ball-in-court role
 */
export function isValidBallInCourtRole(value: unknown): value is BallInCourtRole {
  return ['gc', 'architect', 'engineer', 'subcontractor', 'owner', 'consultant'].includes(
    value as string
  )
}
