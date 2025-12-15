// File: /src/types/checklist-failure-analytics.ts
// Type definitions for Checklist Failure Trend Analysis

export interface ChecklistFailureFilters {
  projectId: string
  templateId?: string
  dateFrom?: string
  dateTo?: string
  location?: string
  inspectorId?: string
}

export interface FailureRecord {
  checklistId: string
  executionDate: string
  inspector?: string
  location?: string
  notes?: string
}

export interface FailureFrequency {
  itemLabel: string
  templateItemId: string
  section: string
  failureCount: number
  totalExecutions: number
  failureRate: number
  trend: TrendDirection
  recentFailures: FailureRecord[]
  commonNotes: string[]
}

export interface TemporalDataPoint {
  period: string | number
  count: number
}

export interface FailureTemporalAnalysis {
  byHour: TemporalDataPoint[]
  byDayOfWeek: TemporalDataPoint[]
  byMonth: TemporalDataPoint[]
}

export interface FailureCluster {
  items: string[]
  coOccurrenceCount: number
  coOccurrenceRate: number
  affectedExecutions: string[]
}

export interface TrendDataPoint {
  date: string
  count: number
  rate: number
}

export interface FailureTrends {
  data: TrendDataPoint[]
  movingAverage: number[]
  overallTrend: TrendDirection
  changePercentage: number
}

export interface ChecklistFailureAnalytics {
  summary: {
    totalFailures: number
    failureRate: number
    uniqueFailedItems: number
    totalExecutions: number
    trend: TrendDirection
  }
  frequency: FailureFrequency[]
  temporal: FailureTemporalAnalysis
  clusters: FailureCluster[]
  trends: FailureTrends
}

export type TrendDirection = 'improving' | 'declining' | 'stable'

// Date range presets for filtering
export type DateRangePreset =
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_6_months'
  | 'last_year'
  | 'custom'

export interface DateRange {
  from: string
  to: string
}
