/**
 * Safety Metrics Types
 *
 * OSHA-compliant safety rate calculations including:
 * - TRIR (Total Recordable Incident Rate)
 * - DART (Days Away, Restricted, or Transferred)
 * - LTIR (Lost Time Injury Rate)
 * - EMR (Experience Modification Rate)
 * - Severity Rate
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Period type for metrics snapshots
 */
export type MetricsPeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'ytd'

/**
 * Source of hours worked data
 */
export type HoursSource = 'manual' | 'payroll' | 'timesheet' | 'estimate'

/**
 * Employee hours worked record
 */
export interface EmployeeHoursWorked {
  id: string
  project_id: string
  company_id: string
  period_type: MetricsPeriodType
  period_start: string // DATE
  period_end: string // DATE
  total_hours: number
  regular_hours: number | null
  overtime_hours: number | null
  average_employees: number | null
  full_time_equivalent: number | null
  source: HoursSource
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Input for creating/updating hours worked
 */
export interface EmployeeHoursWorkedInput {
  project_id: string
  company_id: string
  period_type: MetricsPeriodType
  period_start: string
  period_end: string
  total_hours: number
  regular_hours?: number | null
  overtime_hours?: number | null
  average_employees?: number | null
  full_time_equivalent?: number | null
  source?: HoursSource
  notes?: string | null
}

/**
 * Safety metrics snapshot
 */
export interface SafetyMetricsSnapshot {
  id: string
  project_id: string | null
  company_id: string
  snapshot_date: string
  period_type: MetricsPeriodType
  year: number
  month: number | null
  quarter: number | null

  // Hours
  total_hours_worked: number
  average_employees: number

  // Incident counts
  total_recordable_cases: number
  deaths: number
  days_away_cases: number
  restricted_duty_cases: number
  job_transfer_cases: number
  other_recordable_cases: number
  lost_time_cases: number

  // Days counts
  total_days_away: number
  total_days_restricted: number
  total_days_transferred: number

  // Calculated rates
  trir: number | null
  dart: number | null
  ltir: number | null
  severity_rate: number | null
  emr: number | null
  emr_effective_date: string | null

  // Industry comparison
  industry_avg_trir: number | null
  industry_avg_dart: number | null
  industry_code: string | null

  // Audit
  calculated_at: string
  created_by: string | null
  notes: string | null
}

/**
 * Current safety metrics with calculated rates
 */
export interface SafetyMetrics {
  // Counts
  total_recordable_cases: number
  deaths: number
  days_away_cases: number
  restricted_duty_cases: number
  job_transfer_cases: number
  other_recordable_cases: number
  lost_time_cases: number
  total_days_away: number
  total_days_restricted: number

  // Hours
  total_hours_worked: number
  average_employees: number

  // Calculated rates (per 200,000 hours)
  trir: number | null
  dart: number | null
  ltir: number | null
  severity_rate: number | null

  // EMR
  emr: number | null

  // Period
  period_start?: string
  period_end?: string
  year?: number
}

/**
 * Industry safety benchmark
 */
export interface IndustrySafetyBenchmark {
  id: string
  naics_code: string
  industry_name: string
  industry_sector: string | null
  year: number
  avg_trir: number | null
  avg_dart: number | null
  avg_ltir: number | null
  avg_severity_rate: number | null
  median_trir: number | null
  percentile_25_trir: number | null
  percentile_75_trir: number | null
  source: string
  source_url: string | null
  created_at: string
  updated_at: string
}

/**
 * EMR (Experience Modification Rate) record
 */
export interface EMRRecord {
  id: string
  company_id: string
  emr_value: number
  effective_date: string
  expiration_date: string | null
  policy_number: string | null
  insurance_carrier: string | null
  state_code: string | null
  is_current: boolean
  document_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Input for creating EMR record
 */
export interface EMRRecordInput {
  company_id: string
  emr_value: number
  effective_date: string
  expiration_date?: string | null
  policy_number?: string | null
  insurance_carrier?: string | null
  state_code?: string | null
  is_current?: boolean
  document_url?: string | null
  notes?: string | null
}

// ============================================================================
// Trend and Analysis Types
// ============================================================================

/**
 * Safety metrics trend data point
 */
export interface SafetyMetricsTrendPoint {
  period_label: string
  period_date: string
  trir: number | null
  dart: number | null
  ltir: number | null
  severity_rate: number | null
  total_recordable_cases: number
  hours_worked: number
  industry_avg_trir: number | null
}

/**
 * Safety metrics comparison
 */
export interface SafetyMetricsComparison {
  current: SafetyMetrics
  previous: SafetyMetrics
  industry_benchmark: IndustrySafetyBenchmark | null
  changes: {
    trir_change: number | null
    dart_change: number | null
    ltir_change: number | null
    trir_vs_industry: number | null
    dart_vs_industry: number | null
  }
}

/**
 * Safety performance scorecard
 */
export interface SafetyScorecard {
  company_id: string
  project_id?: string
  year: number

  // Current rates
  current_trir: number | null
  current_dart: number | null
  current_ltir: number | null
  current_emr: number | null

  // Goals/Targets
  target_trir: number | null
  target_dart: number | null

  // Industry comparison
  industry_trir: number | null
  industry_dart: number | null

  // Performance indicators
  trir_performance: 'above' | 'at' | 'below' | 'unknown'
  dart_performance: 'above' | 'at' | 'below' | 'unknown'

  // Stats
  total_incidents: number
  recordable_incidents: number
  days_without_incident: number
  total_hours_worked: number

  // Trends
  trir_trend: 'improving' | 'stable' | 'declining' | 'unknown'
  dart_trend: 'improving' | 'stable' | 'declining' | 'unknown'
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for querying hours worked
 */
export interface HoursWorkedFilters {
  project_id?: string
  company_id?: string
  period_type?: MetricsPeriodType
  start_date?: string
  end_date?: string
}

/**
 * Filters for querying metrics snapshots
 */
export interface MetricsSnapshotFilters {
  project_id?: string
  company_id?: string
  period_type?: MetricsPeriodType
  year?: number
  month?: number
  quarter?: number
  start_date?: string
  end_date?: string
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Safety metrics dashboard data
 */
export interface SafetyMetricsDashboard {
  // Current metrics
  current_metrics: SafetyMetrics

  // Previous period for comparison
  previous_metrics: SafetyMetrics | null

  // YTD metrics
  ytd_metrics: SafetyMetrics

  // Industry benchmark
  benchmark: IndustrySafetyBenchmark | null

  // Trend data
  trend: SafetyMetricsTrendPoint[]

  // Scorecard
  scorecard: SafetyScorecard

  // Period info
  period: {
    type: MetricsPeriodType
    year: number
    month?: number
    quarter?: number
    start_date: string
    end_date: string
  }
}

/**
 * Rate status indicator
 */
export type RateStatus = 'good' | 'warning' | 'danger' | 'unknown'

/**
 * Rate display config
 */
export interface RateDisplayConfig {
  label: string
  shortLabel: string
  description: string
  format: (value: number | null) => string
  getStatus: (value: number | null, benchmark: number | null) => RateStatus
}

// ============================================================================
// Constants
// ============================================================================

/**
 * OSHA standard multiplier (200,000 = 100 FTE working 40 hrs/week for 50 weeks)
 */
export const OSHA_MULTIPLIER = 200000

/**
 * Common NAICS codes for construction
 */
export const CONSTRUCTION_NAICS_CODES = {
  CONSTRUCTION: '23',
  BUILDING_CONSTRUCTION: '236',
  RESIDENTIAL: '2361',
  NONRESIDENTIAL: '2362',
  HEAVY_CIVIL: '237',
  SPECIALTY_TRADE: '238',
  FOUNDATION_STRUCTURE: '2381',
  BUILDING_EQUIPMENT: '2382',
  BUILDING_FINISHING: '2383',
  OTHER_SPECIALTY: '2389',
} as const

/**
 * Default industry benchmarks (2023 BLS data)
 */
export const DEFAULT_BENCHMARKS: Record<string, { trir: number; dart: number; ltir: number }> = {
  '23': { trir: 2.8, dart: 1.7, ltir: 0.9 },
  '236': { trir: 2.3, dart: 1.4, ltir: 0.7 },
  '237': { trir: 2.1, dart: 1.3, ltir: 0.7 },
  '238': { trir: 3.1, dart: 1.9, ltir: 1.0 },
}

/**
 * Rate configuration for display
 */
export const RATE_CONFIG: Record<'trir' | 'dart' | 'ltir' | 'severity' | 'emr', RateDisplayConfig> = {
  trir: {
    label: 'Total Recordable Incident Rate',
    shortLabel: 'TRIR',
    description: 'Number of OSHA-recordable injuries/illnesses per 200,000 hours worked',
    format: (v) => v !== null ? v.toFixed(2) : 'N/A',
    getStatus: (v, b) => {
      if (v === null) {return 'unknown'}
      if (b === null) {return v < 3 ? 'good' : v < 5 ? 'warning' : 'danger'}
      return v <= b * 0.8 ? 'good' : v <= b * 1.2 ? 'warning' : 'danger'
    },
  },
  dart: {
    label: 'Days Away, Restricted, or Transferred Rate',
    shortLabel: 'DART',
    description: 'Number of cases involving days away, restricted duty, or job transfer per 200,000 hours',
    format: (v) => v !== null ? v.toFixed(2) : 'N/A',
    getStatus: (v, b) => {
      if (v === null) {return 'unknown'}
      if (b === null) {return v < 2 ? 'good' : v < 3 ? 'warning' : 'danger'}
      return v <= b * 0.8 ? 'good' : v <= b * 1.2 ? 'warning' : 'danger'
    },
  },
  ltir: {
    label: 'Lost Time Injury Rate',
    shortLabel: 'LTIR',
    description: 'Number of lost-time injuries per 200,000 hours worked',
    format: (v) => v !== null ? v.toFixed(2) : 'N/A',
    getStatus: (v, b) => {
      if (v === null) {return 'unknown'}
      if (b === null) {return v < 1 ? 'good' : v < 2 ? 'warning' : 'danger'}
      return v <= b * 0.8 ? 'good' : v <= b * 1.2 ? 'warning' : 'danger'
    },
  },
  severity: {
    label: 'Severity Rate',
    shortLabel: 'SR',
    description: 'Total days away + restricted per 200,000 hours worked',
    format: (v) => v !== null ? v.toFixed(1) : 'N/A',
    getStatus: (v) => {
      if (v === null) {return 'unknown'}
      return v < 20 ? 'good' : v < 50 ? 'warning' : 'danger'
    },
  },
  emr: {
    label: 'Experience Modification Rate',
    shortLabel: 'EMR',
    description: 'Insurance modifier based on company safety history (1.0 = industry average)',
    format: (v) => v !== null ? v.toFixed(3) : 'N/A',
    getStatus: (v) => {
      if (v === null) {return 'unknown'}
      return v <= 0.85 ? 'good' : v <= 1.0 ? 'warning' : 'danger'
    },
  },
}

/**
 * Status color mapping
 */
export const STATUS_COLORS: Record<RateStatus, { bg: string; text: string; border: string }> = {
  good: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  danger: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  unknown: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
}
