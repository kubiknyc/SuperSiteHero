/**
 * Near-Miss Trend Analysis Types
 *
 * Types for near-miss incident pattern detection and trend analysis
 * to identify safety risks before they become actual incidents.
 */

import type { RootCauseCategory, IncidentSeverity } from './safety-incidents'

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Potential severity if the near-miss had become an actual incident
 */
export type PotentialSeverity = 'first_aid' | 'medical_treatment' | 'lost_time' | 'fatality'

/**
 * Types of zones for location-based analysis
 */
export type ZoneType = 'floor' | 'area' | 'equipment' | 'entrance' | 'staging' | 'other'

/**
 * Risk levels for zones
 */
export type ZoneRiskLevel = 'low' | 'medium' | 'high' | 'critical'

/**
 * Types of detected patterns
 */
export type PatternType =
  | 'recurring_location'
  | 'time_based'
  | 'root_cause_cluster'
  | 'category_trend'
  | 'seasonal'
  | 'crew_correlation'
  | 'weather_correlation'
  | 'equipment_related'

/**
 * Status of a detected pattern
 */
export type PatternStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed'

/**
 * Types of alert thresholds
 */
export type ThresholdType =
  | 'frequency_daily'
  | 'frequency_weekly'
  | 'frequency_monthly'
  | 'category_spike'
  | 'location_concentration'
  | 'root_cause_recurring'
  | 'time_pattern'

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical'

/**
 * Trend direction
 */
export type TrendDirection = 'increasing' | 'decreasing' | 'stable'

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Near-miss category for classification
 */
export interface NearMissCategory {
  id: string
  company_id: string
  name: string
  description: string | null
  parent_category_id: string | null
  color: string
  icon: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Zone for location-based analysis
 */
export interface NearMissZone {
  id: string
  project_id: string
  name: string
  description: string | null
  zone_type: ZoneType
  floor_number: number | null
  coordinates: {
    x?: number
    y?: number
    width?: number
    height?: number
    polygon?: Array<{ x: number; y: number }>
  } | null
  risk_level: ZoneRiskLevel
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Industry benchmark data
 */
export interface SafetyBenchmark {
  id: string
  industry_type: string
  metric_name: string
  metric_value: number
  measurement_period: 'monthly' | 'quarterly' | 'yearly'
  source: string | null
  year: number
  notes: string | null
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  id: string
  company_id: string
  project_id: string | null
  threshold_type: ThresholdType
  threshold_value: number
  severity: AlertSeverity
  is_active: boolean
  notification_emails: string[]
  created_at: string
  updated_at: string
}

/**
 * Detected pattern in near-miss data
 */
export interface NearMissPattern {
  id: string
  company_id: string
  project_id: string | null
  pattern_type: PatternType
  pattern_data: PatternData
  confidence_score: number
  detection_date: string
  status: PatternStatus
  assigned_to: string | null
  notes: string | null
  action_items: ActionItem[]
  created_at: string
  updated_at: string
}

/**
 * Pattern data structure based on pattern type
 */
export interface PatternData {
  // Common fields
  description: string
  affected_locations?: string[]
  affected_categories?: string[]
  time_range?: {
    start: string
    end: string
  }

  // For recurring_location
  location?: string
  zone_id?: string
  incident_count?: number

  // For time_based
  hour_of_day?: number
  day_of_week?: number
  peak_times?: Array<{ hour: number; count: number }>

  // For root_cause_cluster
  root_causes?: RootCauseCategory[]
  correlation_strength?: number

  // For category_trend
  category?: string
  trend_direction?: TrendDirection
  change_percentage?: number

  // For weather_correlation
  weather_condition?: string
  correlation_factor?: number
}

/**
 * Action item for pattern resolution
 */
export interface ActionItem {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  assigned_to?: string
  due_date?: string
  completed_at?: string
}

/**
 * Generated alert
 */
export interface NearMissAlert {
  id: string
  company_id: string
  project_id: string | null
  pattern_id: string | null
  threshold_id: string | null
  alert_type: string
  severity: AlertSeverity
  title: string
  description: string | null
  data: Record<string, unknown>
  is_read: boolean
  is_dismissed: boolean
  dismissed_by: string | null
  dismissed_at: string | null
  created_at: string
}

/**
 * Monthly report snapshot
 */
export interface MonthlyReport {
  id: string
  company_id: string
  project_id: string | null
  report_month: string
  total_near_misses: number
  by_category: Record<string, number>
  by_location: Record<string, number>
  by_root_cause: Record<RootCauseCategory, number>
  by_severity_potential: Record<PotentialSeverity, number>
  by_time_of_day: Record<number, number>
  by_day_of_week: Record<number, number>
  leading_indicators: LeadingIndicators
  trends: TrendSummary
  recommendations: Recommendation[]
  generated_at: string
  generated_by: string | null
}

/**
 * Leading indicators for predictive analysis
 */
export interface LeadingIndicators {
  near_miss_frequency_trend: TrendDirection
  high_severity_potential_ratio: number
  top_risk_locations: string[]
  top_root_causes: RootCauseCategory[]
  recurring_patterns_count: number
}

/**
 * Trend summary for reports
 */
export interface TrendSummary {
  vs_previous_month: {
    change_percentage: number
    direction: TrendDirection
  }
  vs_same_month_last_year?: {
    change_percentage: number
    direction: TrendDirection
  }
  rolling_average_30_days: number
  projected_next_month?: number
}

/**
 * Recommendation from analysis
 */
export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  suggested_actions: string[]
  related_patterns?: string[]
}

// ============================================================================
// Analytics Data Types
// ============================================================================

/**
 * Daily trend data point
 */
export interface DailyTrendPoint {
  date: string
  total_count: number
  fatality_potential_count: number
  lost_time_potential_count: number
  medical_treatment_potential_count: number
  first_aid_potential_count: number
  by_root_cause: Record<RootCauseCategory, number>
}

/**
 * Heat map data for location analysis
 */
export interface LocationHeatMapData {
  location: string
  zone_id: string | null
  zone_name: string | null
  zone_type: ZoneType | null
  floor_number: number | null
  incident_count: number
  high_severity_count: number
  last_incident_date: string
  root_causes: RootCauseCategory[]
  risk_score?: number
}

/**
 * Time pattern data
 */
export interface TimePatternData {
  hour_of_day: number
  day_of_week: number
  incident_count: number
  high_severity_count: number
  common_root_causes: RootCauseCategory[]
}

/**
 * Root cause Pareto data
 */
export interface RootCauseParetoData {
  root_cause_category: RootCauseCategory | 'unknown'
  count: number
  percentage: number
  cumulative_percentage: number
}

/**
 * Frequency spike detection result
 */
export interface FrequencySpike {
  spike_date: string
  count: number
  average: number
  std_dev: number
  deviation_score: number
}

/**
 * Location hotspot detection result
 */
export interface LocationHotspot {
  location: string
  zone_id: string | null
  incident_count: number
  high_severity_count: number
  root_causes: RootCauseCategory[]
  risk_score: number
}

/**
 * Trend calculation result
 */
export interface TrendCalculation {
  current_period_count: number
  previous_period_count: number
  change_percentage: number
  trend_direction: TrendDirection
  by_category: Record<string, number>
  by_root_cause: Record<RootCauseCategory, number>
}

// ============================================================================
// Dashboard Summary Types
// ============================================================================

/**
 * Overall analytics summary for dashboard
 */
export interface NearMissAnalyticsSummary {
  // Counts
  total_near_misses_30_days: number
  total_near_misses_90_days: number
  total_near_misses_ytd: number

  // Trends
  trend_vs_previous_30_days: {
    change_percentage: number
    direction: TrendDirection
  }

  // Severity distribution
  by_potential_severity: Record<PotentialSeverity, number>

  // Top items
  top_locations: Array<{ location: string; count: number }>
  top_root_causes: Array<{ category: RootCauseCategory; count: number }>
  top_categories: Array<{ category: string; count: number }>

  // Alerts
  active_alerts_count: number
  unresolved_patterns_count: number

  // Benchmarks
  reporting_rate: number
  industry_benchmark_rate: number
  is_above_benchmark: boolean
}

/**
 * Chart data for trend visualization
 */
export interface TrendChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    color: string
  }>
}

/**
 * Time of day / day of week matrix for heatmap
 */
export interface TimeMatrix {
  // Matrix[hour][dayOfWeek] = count
  matrix: number[][]
  maxValue: number
  totalIncidents: number
}

// ============================================================================
// Input / Filter Types
// ============================================================================

/**
 * Filters for near-miss analytics queries
 */
export interface NearMissAnalyticsFilters {
  company_id?: string
  project_id?: string
  date_from?: string
  date_to?: string
  potential_severity?: PotentialSeverity | PotentialSeverity[]
  root_cause_category?: RootCauseCategory | RootCauseCategory[]
  location?: string
  zone_id?: string
  category_id?: string
}

/**
 * Input for creating a zone
 */
export interface CreateZoneDTO {
  project_id: string
  name: string
  description?: string
  zone_type: ZoneType
  floor_number?: number
  coordinates?: NearMissZone['coordinates']
  risk_level?: ZoneRiskLevel
}

/**
 * Input for creating a category
 */
export interface CreateCategoryDTO {
  company_id: string
  name: string
  description?: string
  parent_category_id?: string
  color?: string
  icon?: string
}

/**
 * Input for creating an alert threshold
 */
export interface CreateThresholdDTO {
  company_id: string
  project_id?: string
  threshold_type: ThresholdType
  threshold_value: number
  severity?: AlertSeverity
  notification_emails?: string[]
}

/**
 * Input for updating a pattern
 */
export interface UpdatePatternDTO {
  status?: PatternStatus
  assigned_to?: string
  notes?: string
  action_items?: ActionItem[]
}

// ============================================================================
// Helper Constants
// ============================================================================

/**
 * Day of week labels (0 = Sunday)
 */
export const DAY_OF_WEEK_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/**
 * Short day labels
 */
export const DAY_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Hour labels for 24-hour format
 */
export const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12
  const period = i < 12 ? 'AM' : 'PM'
  return `${hour}${period}`
})

/**
 * Potential severity display configuration
 */
export const POTENTIAL_SEVERITY_CONFIG: Record<
  PotentialSeverity,
  { label: string; color: string; bgColor: string }
> = {
  first_aid: {
    label: 'First Aid',
    color: '#22c55e',
    bgColor: 'bg-green-100',
  },
  medical_treatment: {
    label: 'Medical Treatment',
    color: '#f97316',
    bgColor: 'bg-orange-100',
  },
  lost_time: {
    label: 'Lost Time',
    color: '#ef4444',
    bgColor: 'bg-red-100',
  },
  fatality: {
    label: 'Fatality',
    color: '#7c3aed',
    bgColor: 'bg-purple-100',
  },
}

/**
 * Pattern type display configuration
 */
export const PATTERN_TYPE_CONFIG: Record<PatternType, { label: string; icon: string }> = {
  recurring_location: { label: 'Recurring Location', icon: 'MapPin' },
  time_based: { label: 'Time-Based Pattern', icon: 'Clock' },
  root_cause_cluster: { label: 'Root Cause Cluster', icon: 'GitBranch' },
  category_trend: { label: 'Category Trend', icon: 'TrendingUp' },
  seasonal: { label: 'Seasonal Pattern', icon: 'Calendar' },
  crew_correlation: { label: 'Crew Correlation', icon: 'Users' },
  weather_correlation: { label: 'Weather Correlation', icon: 'Cloud' },
  equipment_related: { label: 'Equipment Related', icon: 'Wrench' },
}

/**
 * Alert severity display configuration
 */
export const ALERT_SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; color: string; bgColor: string }
> = {
  info: {
    label: 'Info',
    color: '#3b82f6',
    bgColor: 'bg-blue-100',
  },
  warning: {
    label: 'Warning',
    color: '#f59e0b',
    bgColor: 'bg-amber-100',
  },
  critical: {
    label: 'Critical',
    color: '#ef4444',
    bgColor: 'bg-red-100',
  },
}
