// File: /src/types/checklist-scoring.ts
// TypeScript types for Checklist Scoring System
// Supports quality audits and inspections with grading capabilities

/**
 * Scoring types supported by the system
 */
export type ScoringType = 'binary' | 'percentage' | 'points' | 'letter_grade'

/**
 * Letter grade values
 */
export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'

/**
 * Pass/Fail result
 */
export type PassFailResult = 'pass' | 'fail'

/**
 * Scoring configuration for a checklist template
 */
export interface ScoringConfiguration {
  // Enable/disable scoring for this template
  enabled: boolean

  // Type of scoring to use
  scoring_type: ScoringType

  // Pass threshold (percentage 0-100)
  pass_threshold: number

  // Point values for each template item (item_id => points)
  // Only used when scoring_type is 'points'
  point_values?: Record<string, number>

  // Custom grade thresholds (percentage => grade)
  // Defaults to standard A-F scale if not provided
  grade_thresholds?: GradeThreshold[]

  // Whether to include N/A items in scoring calculations
  include_na_in_total: boolean

  // Auto-fail if any critical items fail
  fail_on_critical: boolean

  // Critical item IDs
  critical_item_ids?: string[]
}

/**
 * Grade threshold configuration
 */
export interface GradeThreshold {
  // Minimum percentage for this grade (inclusive)
  min_percentage: number
  // Grade label
  grade: LetterGrade | string
  // Color for display (hex or tailwind class)
  color?: string
}

/**
 * Calculated score for a checklist execution
 */
export interface ChecklistScore {
  // The execution ID this score belongs to
  execution_id: string

  // Scoring configuration used
  scoring_type: ScoringType

  // Raw score (0-100 percentage)
  score: number

  // Calculated grade (if using letter grades)
  grade?: LetterGrade | string

  // Pass/fail result
  passed: boolean

  // Detailed breakdown
  breakdown: ScoreBreakdown

  // Timestamp of calculation
  calculated_at: string
}

/**
 * Detailed score breakdown
 */
export interface ScoreBreakdown {
  // Total number of items
  total_items: number

  // Number of completed items
  completed_items: number

  // Number of scorable items (excludes N/A if configured)
  scorable_items: number

  // Pass/fail/N/A counts (for checkbox items)
  pass_count: number
  fail_count: number
  na_count: number

  // Point-based scoring
  total_points?: number
  earned_points?: number

  // Item-level scores
  item_scores: ItemScore[]

  // Critical item failures
  critical_failures?: string[]
}

/**
 * Score for an individual item
 */
export interface ItemScore {
  // Template item ID
  item_id: string

  // Item label
  item_label: string

  // Whether this item is required
  is_required: boolean

  // Whether this item is critical
  is_critical: boolean

  // Score value (for checkbox items)
  score_value?: 'pass' | 'fail' | 'na'

  // Point value (for point-based scoring)
  points?: number

  // Points earned
  earned_points?: number

  // Whether item was completed
  completed: boolean
}

/**
 * Default grade thresholds (standard A-F scale)
 */
export const DEFAULT_GRADE_THRESHOLDS: GradeThreshold[] = [
  { min_percentage: 97, grade: 'A+', color: '#16a34a' },
  { min_percentage: 93, grade: 'A', color: '#16a34a' },
  { min_percentage: 90, grade: 'A-', color: '#16a34a' },
  { min_percentage: 87, grade: 'B+', color: '#22c55e' },
  { min_percentage: 83, grade: 'B', color: '#22c55e' },
  { min_percentage: 80, grade: 'B-', color: '#22c55e' },
  { min_percentage: 77, grade: 'C+', color: '#eab308' },
  { min_percentage: 73, grade: 'C', color: '#eab308' },
  { min_percentage: 70, grade: 'C-', color: '#eab308' },
  { min_percentage: 67, grade: 'D+', color: '#f59e0b' },
  { min_percentage: 63, grade: 'D', color: '#f59e0b' },
  { min_percentage: 60, grade: 'D-', color: '#f59e0b' },
  { min_percentage: 0, grade: 'F', color: '#ef4444' },
]

/**
 * Scoring report filters
 */
export interface ScoringReportFilters {
  // Filter by project
  project_id?: string

  // Filter by template
  template_id?: string

  // Filter by pass/fail
  passed?: boolean

  // Filter by grade
  grade?: LetterGrade | string

  // Filter by date range
  date_from?: string
  date_to?: string

  // Filter by inspector
  inspector_id?: string

  // Minimum score
  min_score?: number

  // Maximum score
  max_score?: number
}

/**
 * Scoring report summary statistics
 */
export interface ScoringReportSummary {
  // Total number of executions
  total_executions: number

  // Number passed
  passed_count: number

  // Number failed
  failed_count: number

  // Average score
  average_score: number

  // Median score
  median_score: number

  // Score distribution by grade
  grade_distribution: Record<string, number>

  // Pass rate percentage
  pass_rate: number

  // Trend data (scores over time)
  trend_data?: TrendDataPoint[]
}

/**
 * Trend data point for charts
 */
export interface TrendDataPoint {
  date: string
  score: number
  passed: boolean
}

/**
 * Update scoring configuration DTO
 */
export interface UpdateScoringConfigDTO {
  enabled: boolean
  scoring_type?: ScoringType
  pass_threshold?: number
  point_values?: Record<string, number>
  grade_thresholds?: GradeThreshold[]
  include_na_in_total?: boolean
  fail_on_critical?: boolean
  critical_item_ids?: string[]
}

/**
 * Calculate score request
 */
export interface CalculateScoreRequest {
  execution_id: string
  scoring_config: ScoringConfiguration
}

/**
 * Export scoring report DTO
 */
export interface ExportScoringReportDTO {
  filters: ScoringReportFilters
  format: 'pdf' | 'excel' | 'csv'
  include_charts?: boolean
  include_details?: boolean
}
