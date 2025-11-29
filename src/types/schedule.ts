// File: src/types/schedule.ts
// TypeScript types for Gantt Charts & Scheduling feature

/**
 * Dependency types for task relationships
 * FS = Finish-to-Start (most common)
 * SS = Start-to-Start
 * FF = Finish-to-Finish
 * SF = Start-to-Finish
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

/**
 * Schedule item status
 */
export type ScheduleItemStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'on_hold'

/**
 * Zoom level for Gantt chart view
 */
export type GanttZoomLevel = 'day' | 'week' | 'month' | 'quarter'

/**
 * Schedule item from database (schedule_items table)
 */
export interface ScheduleItem {
  id: string
  project_id: string
  task_id: string | null // For MS Project import mapping
  task_name: string
  wbs: string | null // Work Breakdown Structure code
  start_date: string // ISO date
  finish_date: string // ISO date
  baseline_start_date: string | null
  baseline_finish_date: string | null
  baseline_duration_days: number | null
  baseline_saved_at: string | null
  baseline_saved_by: string | null
  duration_days: number
  percent_complete: number // 0-100
  predecessors: string | null // Comma-separated predecessor IDs (legacy)
  successors: string | null // Comma-separated successor IDs (legacy)
  is_critical: boolean
  is_milestone: boolean
  assigned_to: string | null
  notes: string | null
  color: string | null // Custom color for task bar
  imported_at: string | null
  last_updated_at: string | null
  created_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Schedule item with variance calculations (from view)
 */
export interface ScheduleItemWithVariance extends ScheduleItem {
  start_variance_days: number | null
  finish_variance_days: number | null
  duration_variance_days: number | null
  schedule_status: 'ahead' | 'behind' | 'on_track' | null
}

/**
 * Schedule baseline record
 */
export interface ScheduleBaseline {
  id: string
  project_id: string
  name: string
  description: string | null
  saved_at: string
  saved_by: string
  is_active: boolean
  created_at: string
}

/**
 * Baseline item snapshot
 */
export interface ScheduleBaselineItem {
  id: string
  baseline_id: string
  schedule_item_id: string
  start_date: string
  finish_date: string
  duration_days: number
  percent_complete: number
  created_at: string
}

/**
 * Task dependency relationship
 */
export interface TaskDependency {
  id: string
  project_id: string
  predecessor_id: string
  successor_id: string
  dependency_type: DependencyType
  lag_days: number // Positive = delay, Negative = lead
  created_at: string
  created_by: string | null
}

/**
 * Critical path calculation result for a single task
 */
export interface CriticalPathItem {
  id: string
  project_id: string
  schedule_item_id: string
  earliest_start: string // ISO date
  earliest_finish: string // ISO date
  latest_start: string // ISO date
  latest_finish: string // ISO date
  total_slack_days: number
  free_slack_days: number
  is_critical: boolean
  calculated_at: string
}

/**
 * Schedule item with computed properties for Gantt display
 */
export interface GanttTask extends ScheduleItem {
  // Computed display properties
  x: number // X position on canvas
  y: number // Y position on canvas
  width: number // Bar width in pixels
  height: number // Bar height in pixels
  progress_width: number // Progress bar width

  // Hierarchy
  level: number // Indentation level (0 = root)
  parent_id: string | null
  children: GanttTask[]
  is_expanded: boolean

  // Dependencies
  dependencies: TaskDependency[]

  // Status derived from dates
  computed_status: ScheduleItemStatus
  days_remaining: number
  is_overdue: boolean
}

/**
 * Gantt chart configuration
 */
export interface GanttConfig {
  // Display settings
  row_height: number
  bar_height: number
  header_height: number
  sidebar_width: number
  min_column_width: number

  // Date range
  start_date: Date
  end_date: Date
  zoom_level: GanttZoomLevel

  // Features
  show_dependencies: boolean
  show_critical_path: boolean
  show_baseline: boolean
  show_progress: boolean
  show_milestones: boolean
  show_today_line: boolean

  // Interaction
  allow_drag: boolean
  allow_resize: boolean
  allow_dependency_creation: boolean
}

/**
 * Default Gantt configuration
 */
export const DEFAULT_GANTT_CONFIG: GanttConfig = {
  row_height: 40,
  bar_height: 24,
  header_height: 60,
  sidebar_width: 300,
  min_column_width: 40,

  start_date: new Date(),
  end_date: new Date(),
  zoom_level: 'week',

  show_dependencies: true,
  show_critical_path: true,
  show_baseline: false,
  show_progress: true,
  show_milestones: true,
  show_today_line: true,

  allow_drag: true, // Phase 2: drag-and-drop enabled
  allow_resize: true, // Phase 2: resize enabled
  allow_dependency_creation: false, // Future: dependency creation
}

/**
 * Create schedule item DTO
 */
export interface CreateScheduleItemDTO {
  project_id: string
  task_name: string
  start_date: string
  finish_date: string
  duration_days?: number
  percent_complete?: number
  is_milestone?: boolean
  assigned_to?: string
  notes?: string
  color?: string
  wbs?: string
  parent_id?: string
}

/**
 * Update schedule item DTO
 */
export interface UpdateScheduleItemDTO {
  task_name?: string
  start_date?: string
  finish_date?: string
  duration_days?: number
  percent_complete?: number
  is_milestone?: boolean
  is_critical?: boolean
  assigned_to?: string
  notes?: string
  color?: string
  wbs?: string
}

/**
 * Create dependency DTO
 */
export interface CreateDependencyDTO {
  project_id: string
  predecessor_id: string
  successor_id: string
  dependency_type?: DependencyType
  lag_days?: number
}

/**
 * Schedule filters
 */
export interface ScheduleFilters {
  project_id: string
  show_completed?: boolean
  show_milestones_only?: boolean
  assigned_to?: string
  date_from?: string
  date_to?: string
  search?: string
  critical_only?: boolean
}

/**
 * Timeline column (for header rendering)
 */
export interface TimelineColumn {
  date: Date
  label: string
  sub_label?: string
  width: number
  is_weekend: boolean
  is_today: boolean
}

/**
 * Gantt viewport state
 */
export interface GanttViewport {
  scroll_x: number
  scroll_y: number
  visible_start_date: Date
  visible_end_date: Date
  visible_row_start: number
  visible_row_end: number
}

/**
 * Task bar colors by status
 */
export const TASK_BAR_COLORS: Record<ScheduleItemStatus, string> = {
  not_started: '#94a3b8', // slate-400
  in_progress: '#3b82f6', // blue-500
  completed: '#22c55e', // green-500
  delayed: '#ef4444', // red-500
  on_hold: '#f59e0b', // amber-500
}

/**
 * Critical path color
 */
export const CRITICAL_PATH_COLOR = '#dc2626' // red-600

/**
 * Milestone color
 */
export const MILESTONE_COLOR = '#8b5cf6' // violet-500

/**
 * Today line color
 */
export const TODAY_LINE_COLOR = '#f97316' // orange-500

/**
 * Baseline bar color
 */
export const BASELINE_COLOR = '#6b7280' // gray-500
