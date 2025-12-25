/**
 * Schedule Activities Types
 * Types for the comprehensive schedule_activities schema (Migration 092)
 * Supports WBS hierarchy, resources, calendars, dependencies, and import tracking
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Activity type in the schedule
 */
export type ActivityType =
  | 'task'
  | 'milestone'
  | 'summary'
  | 'hammock'
  | 'level_of_effort'
  | 'wbs_summary'

/**
 * Duration calculation type
 */
export type DurationType = 'fixed_duration' | 'fixed_units' | 'fixed_work'

/**
 * Dependency relationship types
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

/**
 * Lag type for dependencies
 */
export type LagType = 'days' | 'percent' | 'hours'

/**
 * Schedule constraint types
 */
export type ConstraintType =
  | 'as_soon_as_possible'
  | 'as_late_as_possible'
  | 'must_start_on'
  | 'must_finish_on'
  | 'start_no_earlier_than'
  | 'start_no_later_than'
  | 'finish_no_earlier_than'
  | 'finish_no_later_than'

/**
 * Activity status
 */
export type ActivityStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

/**
 * Resource types
 */
export type ResourceType = 'labor' | 'equipment' | 'material' | 'cost'

/**
 * Schedule update status
 */
export type ScheduleUpdateStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

/**
 * Import log status
 */
export type ImportLogStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * External source systems
 */
export type ExternalSource = 'ms_project' | 'primavera_p6' | 'procore' | 'manual'

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Schedule Activity (main entity)
 */
export interface ScheduleActivity {
  id: string
  project_id: string
  company_id: string

  // Activity identification
  activity_id: string // WBS code like "1.1.3" or P6/MSP ID
  activity_code: string | null
  name: string
  description: string | null

  // WBS (Work Breakdown Structure)
  wbs_code: string | null
  wbs_level: number
  parent_activity_id: string | null
  sort_order: number

  // Dates
  planned_start: string | null // ISO date
  planned_finish: string | null
  actual_start: string | null
  actual_finish: string | null
  baseline_start: string | null
  baseline_finish: string | null

  // Duration
  planned_duration: number | null // Days
  actual_duration: number | null
  remaining_duration: number | null
  duration_type: DurationType

  // Progress
  percent_complete: number
  physical_percent_complete: number | null

  // Activity type
  activity_type: ActivityType
  is_milestone: boolean
  is_critical: boolean

  // Float/Slack
  total_float: number | null // Days
  free_float: number | null
  is_on_critical_path: boolean

  // Calendar
  calendar_id: string | null

  // Constraints
  constraint_type: ConstraintType | null
  constraint_date: string | null

  // Assignment
  responsible_party: string | null
  responsible_user_id: string | null
  subcontractor_id: string | null

  // Cost tracking
  budgeted_cost: number | null
  actual_cost: number | null
  earned_value: number | null

  // Resource hours
  budgeted_labor_hours: number | null
  actual_labor_hours: number | null

  // Status
  status: ActivityStatus

  // Notes
  notes: string | null

  // External references (for import/sync)
  external_id: string | null
  external_source: ExternalSource | null

  // Colors for Gantt display
  bar_color: string | null
  milestone_color: string | null

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Schedule Activity with computed fields from view
 */
export interface ScheduleActivityWithDetails extends ScheduleActivity {
  project_name?: string
  project_number?: string
  parent_activity_name?: string | null
  responsible_user_name?: string | null
  subcontractor_name?: string | null
  calculated_duration?: number
  derived_status?: 'completed' | 'in_progress' | 'should_have_started' | 'future'
  is_overdue?: boolean
  children?: ScheduleActivityWithDetails[]
}

/**
 * Schedule Dependency
 */
export interface ScheduleDependency {
  id: string
  project_id: string
  predecessor_id: string
  successor_id: string
  dependency_type: DependencyType
  lag_days: number
  lag_type: LagType
  lag_value: number
  is_driving: boolean
  created_at: string
  created_by: string | null
}

/**
 * Schedule Baseline
 */
export interface ScheduleBaseline {
  id: string
  project_id: string
  name: string
  description: string | null
  baseline_number: number
  baseline_date: string
  is_active: boolean
  total_activities: number | null
  total_duration_days: number | null
  planned_start: string | null
  planned_finish: string | null
  total_budget: number | null
  created_at: string
  created_by: string | null
}

/**
 * Baseline Activity Snapshot
 */
export interface BaselineActivity {
  id: string
  baseline_id: string
  activity_id: string
  planned_start: string | null
  planned_finish: string | null
  planned_duration: number | null
  budgeted_cost: number | null
  budgeted_labor_hours: number | null
}

/**
 * Schedule Calendar
 */
export interface ScheduleCalendar {
  id: string
  project_id: string | null // NULL = company-wide
  company_id: string
  name: string
  description: string | null
  is_default: boolean

  // Standard work week (hours per day)
  sunday_hours: number
  monday_hours: number
  tuesday_hours: number
  wednesday_hours: number
  thursday_hours: number
  friday_hours: number
  saturday_hours: number

  // Standard work times
  work_start_time: string | null
  work_end_time: string | null
  lunch_start: string | null
  lunch_duration_minutes: number | null

  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Calendar Exception (holidays, special days)
 */
export interface CalendarException {
  id: string
  calendar_id: string
  exception_date: string
  name: string | null
  is_working_day: boolean
  work_hours: number
}

/**
 * Schedule Resource
 */
export interface ScheduleResource {
  id: string
  project_id: string | null
  company_id: string
  name: string
  resource_type: ResourceType
  user_id: string | null
  max_units: number
  standard_rate: number | null
  overtime_rate: number | null
  cost_per_use: number | null
  calendar_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Resource Assignment
 */
export interface ResourceAssignment {
  id: string
  activity_id: string
  resource_id: string
  units: number
  planned_work_hours: number | null
  actual_work_hours: number | null
  remaining_work_hours: number | null
  start_date: string | null
  finish_date: string | null
  planned_cost: number | null
  actual_cost: number | null
}

/**
 * Schedule Update (status report)
 */
export interface ScheduleUpdate {
  id: string
  project_id: string
  update_date: string
  data_date: string
  description: string | null
  update_number: number | null

  // Summary stats
  activities_complete: number | null
  activities_in_progress: number | null
  activities_not_started: number | null
  overall_percent_complete: number | null

  // Schedule variance
  schedule_variance_days: number | null
  critical_path_changed: boolean
  new_completion_date: string | null

  // Submission
  submitted_by: string | null
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  status: ScheduleUpdateStatus
}

/**
 * Schedule Import Log
 */
export interface ScheduleImportLog {
  id: string
  project_id: string
  file_name: string | null
  file_type: string | null // 'mpp', 'xml', 'xer', 'csv'
  source_system: ExternalSource | null
  import_date: string

  // Results
  activities_imported: number
  dependencies_imported: number
  resources_imported: number
  warnings: string[] | null
  errors: string[] | null
  status: ImportLogStatus

  // File storage
  file_url: string | null

  imported_by: string | null
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Create Schedule Activity DTO
 */
export interface CreateScheduleActivityDTO {
  project_id: string
  company_id: string
  activity_id: string
  name: string
  description?: string
  wbs_code?: string
  wbs_level?: number
  parent_activity_id?: string
  sort_order?: number
  planned_start?: string
  planned_finish?: string
  planned_duration?: number
  duration_type?: DurationType
  activity_type?: ActivityType
  is_milestone?: boolean
  constraint_type?: ConstraintType
  constraint_date?: string
  responsible_party?: string
  responsible_user_id?: string
  subcontractor_id?: string
  budgeted_cost?: number
  budgeted_labor_hours?: number
  notes?: string
  bar_color?: string
  calendar_id?: string
}

/**
 * Update Schedule Activity DTO
 */
export interface UpdateScheduleActivityDTO {
  activity_id?: string
  activity_code?: string
  name?: string
  description?: string
  wbs_code?: string
  wbs_level?: number
  parent_activity_id?: string | null
  sort_order?: number
  planned_start?: string | null
  planned_finish?: string | null
  actual_start?: string | null
  actual_finish?: string | null
  planned_duration?: number
  actual_duration?: number
  remaining_duration?: number
  duration_type?: DurationType
  percent_complete?: number
  physical_percent_complete?: number
  activity_type?: ActivityType
  is_milestone?: boolean
  is_critical?: boolean
  total_float?: number
  free_float?: number
  constraint_type?: ConstraintType | null
  constraint_date?: string | null
  responsible_party?: string | null
  responsible_user_id?: string | null
  subcontractor_id?: string | null
  budgeted_cost?: number
  actual_cost?: number
  budgeted_labor_hours?: number
  actual_labor_hours?: number
  status?: ActivityStatus
  notes?: string
  bar_color?: string | null
  calendar_id?: string | null
}

/**
 * Create Dependency DTO
 */
export interface CreateScheduleDependencyDTO {
  project_id: string
  predecessor_id: string
  successor_id: string
  dependency_type?: DependencyType
  lag_days?: number
  lag_type?: LagType
}

/**
 * Create Baseline DTO
 */
export interface CreateScheduleBaselineDTO {
  project_id: string
  name: string
  description?: string
}

/**
 * Create Calendar DTO
 */
export interface CreateScheduleCalendarDTO {
  company_id: string
  project_id?: string
  name: string
  description?: string
  is_default?: boolean
  sunday_hours?: number
  monday_hours?: number
  tuesday_hours?: number
  wednesday_hours?: number
  thursday_hours?: number
  friday_hours?: number
  saturday_hours?: number
  work_start_time?: string
  work_end_time?: string
}

/**
 * Create Resource DTO
 */
export interface CreateScheduleResourceDTO {
  company_id: string
  project_id?: string
  name: string
  resource_type?: ResourceType
  user_id?: string
  max_units?: number
  standard_rate?: number
  overtime_rate?: number
  cost_per_use?: number
  calendar_id?: string
}

/**
 * Create Resource Assignment DTO
 */
export interface CreateResourceAssignmentDTO {
  activity_id: string
  resource_id: string
  units?: number
  planned_work_hours?: number
  start_date?: string
  finish_date?: string
}

// ============================================================================
// FILTERS & QUERY PARAMS
// ============================================================================

/**
 * Schedule Activity Filters
 */
export interface ScheduleActivityFilters {
  project_id: string
  status?: ActivityStatus[]
  activity_type?: ActivityType[]
  is_critical?: boolean
  is_milestone?: boolean
  responsible_user_id?: string
  subcontractor_id?: string
  wbs_code?: string
  date_from?: string
  date_to?: string
  search?: string
  show_deleted?: boolean
  parent_activity_id?: string | null // null = root level only
}

// ============================================================================
// COMPUTED RESULTS
// ============================================================================

/**
 * Schedule Variance Result (from DB function)
 */
export interface ScheduleVarianceResult {
  total_activities: number
  completed: number
  in_progress: number
  not_started: number
  behind_schedule: number
  on_track: number
  ahead_of_schedule: number
  overall_percent_complete: number
  projected_finish: string | null
  baseline_finish: string | null
  variance_days: number | null
}

/**
 * Critical Path Activity (from DB function)
 */
export interface CriticalPathActivity {
  activity_id: string
  activity_name: string
  planned_start: string | null
  planned_finish: string | null
  total_float: number | null
}

/**
 * Schedule Stats for dashboard
 */
export interface ScheduleStats {
  total_activities: number
  completed_activities: number
  in_progress_activities: number
  not_started_activities: number
  overdue_activities: number
  milestones: number
  critical_activities: number
  overall_progress: number
  project_start: string | null
  project_finish: string | null
  baseline_finish: string | null
  variance_days: number | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Activity type display configuration
 */
export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; color: string }
> = {
  task: { label: 'Task', icon: 'CheckSquare', color: 'blue' },
  milestone: { label: 'Milestone', icon: 'Diamond', color: 'violet' },
  summary: { label: 'Summary', icon: 'FolderOpen', color: 'gray' },
  hammock: { label: 'Hammock', icon: 'Minus', color: 'orange' },
  level_of_effort: { label: 'Level of Effort', icon: 'Activity', color: 'teal' },
  wbs_summary: { label: 'WBS Summary', icon: 'Folder', color: 'slate' },
}

/**
 * Activity status display configuration
 */
export const ACTIVITY_STATUS_CONFIG: Record<
  ActivityStatus,
  { label: string; color: string; bgColor: string }
> = {
  not_started: { label: 'Not Started', color: 'text-secondary', bgColor: 'bg-muted' },
  in_progress: { label: 'In Progress', color: 'text-primary', bgColor: 'bg-info-light' },
  completed: { label: 'Completed', color: 'text-success', bgColor: 'bg-success-light' },
  on_hold: { label: 'On Hold', color: 'text-warning', bgColor: 'bg-amber-100' },
  cancelled: { label: 'Cancelled', color: 'text-error', bgColor: 'bg-error-light' },
}

/**
 * Dependency type labels
 */
export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  FS: 'Finish-to-Start',
  SS: 'Start-to-Start',
  FF: 'Finish-to-Finish',
  SF: 'Start-to-Finish',
}

/**
 * Resource type display configuration
 */
export const RESOURCE_TYPE_CONFIG: Record<
  ResourceType,
  { label: string; icon: string; color: string }
> = {
  labor: { label: 'Labor', icon: 'Users', color: 'blue' },
  equipment: { label: 'Equipment', icon: 'Truck', color: 'orange' },
  material: { label: 'Material', icon: 'Package', color: 'green' },
  cost: { label: 'Cost', icon: 'DollarSign', color: 'violet' },
}

/**
 * Default work calendar configuration
 */
export const DEFAULT_CALENDAR_CONFIG = {
  sunday_hours: 0,
  monday_hours: 8,
  tuesday_hours: 8,
  wednesday_hours: 8,
  thursday_hours: 8,
  friday_hours: 8,
  saturday_hours: 0,
  work_start_time: '07:00',
  work_end_time: '17:00',
  lunch_start: '12:00',
  lunch_duration_minutes: 60,
}
