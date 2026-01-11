/**
 * Gantt Chart Types
 *
 * Enhanced types for Gantt chart with predecessor relationships,
 * constraint types, and schedule analysis.
 */

// ============================================================================
// Dependency Types
// ============================================================================

/**
 * Dependency relationship types
 * FS - Finish to Start (default)
 * SS - Start to Start
 * FF - Finish to Finish
 * SF - Start to Finish
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

/**
 * Lag type for dependencies
 */
export type LagUnit = 'days' | 'hours' | 'percent'

/**
 * Schedule constraint types
 */
export type ConstraintType =
  | 'as_soon_as_possible'     // ASAP - Default
  | 'as_late_as_possible'     // ALAP
  | 'must_start_on'           // MSO
  | 'must_finish_on'          // MFO
  | 'start_no_earlier_than'   // SNET
  | 'start_no_later_than'     // SNLT
  | 'finish_no_earlier_than'  // FNET
  | 'finish_no_later_than'    // FNLT

/**
 * Constraint type labels for display
 */
export const CONSTRAINT_TYPE_LABELS: Record<ConstraintType, string> = {
  as_soon_as_possible: 'As Soon As Possible (ASAP)',
  as_late_as_possible: 'As Late As Possible (ALAP)',
  must_start_on: 'Must Start On (MSO)',
  must_finish_on: 'Must Finish On (MFO)',
  start_no_earlier_than: 'Start No Earlier Than (SNET)',
  start_no_later_than: 'Start No Later Than (SNLT)',
  finish_no_earlier_than: 'Finish No Earlier Than (FNET)',
  finish_no_later_than: 'Finish No Later Than (FNLT)',
}

/**
 * Constraint type short labels
 */
export const CONSTRAINT_TYPE_SHORT_LABELS: Record<ConstraintType, string> = {
  as_soon_as_possible: 'ASAP',
  as_late_as_possible: 'ALAP',
  must_start_on: 'MSO',
  must_finish_on: 'MFO',
  start_no_earlier_than: 'SNET',
  start_no_later_than: 'SNLT',
  finish_no_earlier_than: 'FNET',
  finish_no_later_than: 'FNLT',
}

/**
 * Dependency type labels for display
 */
export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  FS: 'Finish to Start',
  SS: 'Start to Start',
  FF: 'Finish to Finish',
  SF: 'Start to Finish',
}

// ============================================================================
// Dependency Interface
// ============================================================================

/**
 * Task dependency with relationship type and lag
 */
export interface TaskDependency {
  predecessorId: string
  type: DependencyType
  lag: number           // Can be negative for lead time
  lagUnit: LagUnit
  isDriving?: boolean   // Is this the driving dependency?
}

// ============================================================================
// Enhanced Gantt Task
// ============================================================================

/**
 * Enhanced Gantt Task with predecessor relationships and constraints
 */
export interface EnhancedGanttTask {
  id: string
  title: string
  startDate: Date | string
  endDate: Date | string
  progress?: number // 0-100
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'on_hold'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  assignee?: string

  // Enhanced dependencies with relationship types
  dependencies?: TaskDependency[]

  // Legacy simple dependencies (task IDs only, assumed FS with 0 lag)
  simpleDependencies?: string[]

  // Constraint
  constraintType?: ConstraintType
  constraintDate?: Date | string | null

  // Scheduling results
  earlyStart?: Date | string | null
  earlyFinish?: Date | string | null
  lateStart?: Date | string | null
  lateFinish?: Date | string | null
  totalFloat?: number | null  // Total slack in days
  freeFloat?: number | null   // Free slack in days

  // Display options
  color?: string
  isMilestone?: boolean
  isCritical?: boolean        // On critical path
  isOnCriticalPath?: boolean  // Alternative naming

  // Baseline schedule tracking
  baselineStartDate?: Date | string | null
  baselineEndDate?: Date | string | null

  // WBS Information
  wbsCode?: string
  wbsLevel?: number
  parentId?: string | null
  isExpanded?: boolean
  hasChildren?: boolean

  // Resource information
  resourceIds?: string[]
  resourceNames?: string[]

  // Additional metadata
  notes?: string
  activityCode?: string
  calendarId?: string
}

// ============================================================================
// Schedule Analysis Types
// ============================================================================

/**
 * Float analysis for a task
 */
export interface FloatAnalysis {
  taskId: string
  totalFloat: number
  freeFloat: number
  isCritical: boolean
  isDriving: boolean
  drivingPredecessor?: string
}

/**
 * Critical path result
 */
export interface CriticalPathResult {
  criticalTasks: string[]
  projectDuration: number
  projectStart: Date
  projectFinish: Date
  totalFloat: number
}

/**
 * Schedule calculation options
 */
export interface ScheduleCalculationOptions {
  dataDate?: Date
  calculateFloat?: boolean
  respectConstraints?: boolean
  calendar?: {
    workDays: number[]        // 0 = Sunday, 6 = Saturday
    hoursPerDay: number
    holidays: Date[]
  }
}

// ============================================================================
// Baseline Types
// ============================================================================

/**
 * Baseline variance for a task
 */
export interface BaselineVariance {
  taskId: string
  startVarianceDays: number   // Positive = behind schedule
  endVarianceDays: number     // Positive = behind schedule
  durationVarianceDays: number // Positive = taking longer
  isAheadOfSchedule: boolean
  isBehindSchedule: boolean
  isOnSchedule: boolean
}

/**
 * Baseline schedule summary
 */
export interface BaselineSummary {
  baselineDate: Date
  baselineName: string
  totalTasks: number
  onSchedule: number
  aheadOfSchedule: number
  behindSchedule: number
  averageVarianceDays: number
}

// ============================================================================
// Gantt Display Options
// ============================================================================

/**
 * Zoom level for Gantt chart
 */
export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter' | 'year'

/**
 * Gantt view options
 */
export interface GanttViewOptions {
  zoomLevel: ZoomLevel
  showCriticalPath: boolean
  showBaseline: boolean
  showDependencies: boolean
  showFloatBars: boolean
  showProgress: boolean
  showMilestones: boolean
  showWeekends: boolean
  showHolidays: boolean
  showToday: boolean
  showDataDate: boolean
  groupByWBS: boolean
  showResourceNames: boolean
  compactMode: boolean
}

/**
 * Default Gantt view options
 */
export const DEFAULT_GANTT_OPTIONS: GanttViewOptions = {
  zoomLevel: 'week',
  showCriticalPath: true,
  showBaseline: true,
  showDependencies: true,
  showFloatBars: false,
  showProgress: true,
  showMilestones: true,
  showWeekends: true,
  showHolidays: true,
  showToday: true,
  showDataDate: false,
  groupByWBS: false,
  showResourceNames: false,
  compactMode: false,
}

// ============================================================================
// Dependency Line Rendering
// ============================================================================

/**
 * Dependency line path information
 */
export interface DependencyLine {
  fromTaskId: string
  toTaskId: string
  type: DependencyType
  lag: number
  isCritical: boolean
  isDriving: boolean

  // Calculated path points
  startX: number
  startY: number
  endX: number
  endY: number

  // Control points for curves
  controlPoints?: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get dependency connection points based on type
 */
export function getDependencyConnectionPoints(
  type: DependencyType,
  predecessorRect: { left: number; right: number; top: number; bottom: number; centerY: number },
  successorRect: { left: number; right: number; top: number; bottom: number; centerY: number }
): { startX: number; startY: number; endX: number; endY: number } {
  switch (type) {
    case 'FS': // Finish to Start
      return {
        startX: predecessorRect.right,
        startY: predecessorRect.centerY,
        endX: successorRect.left,
        endY: successorRect.centerY,
      }
    case 'SS': // Start to Start
      return {
        startX: predecessorRect.left,
        startY: predecessorRect.centerY,
        endX: successorRect.left,
        endY: successorRect.centerY,
      }
    case 'FF': // Finish to Finish
      return {
        startX: predecessorRect.right,
        startY: predecessorRect.centerY,
        endX: successorRect.right,
        endY: successorRect.centerY,
      }
    case 'SF': // Start to Finish
      return {
        startX: predecessorRect.left,
        startY: predecessorRect.centerY,
        endX: successorRect.right,
        endY: successorRect.centerY,
      }
    default:
      return {
        startX: predecessorRect.right,
        startY: predecessorRect.centerY,
        endX: successorRect.left,
        endY: successorRect.centerY,
      }
  }
}

/**
 * Generate SVG path for dependency line
 */
export function generateDependencyPath(line: DependencyLine): string {
  const { startX, startY, endX, endY, type } = line

  // Calculate horizontal and vertical distances
  const dx = endX - startX
  const dy = endY - startY

  // Minimum offset for routing around bars
  const minOffset = 15

  // Different routing based on relationship type
  if (type === 'FS') {
    if (dx > minOffset * 2) {
      // Simple curve when there's enough space
      const midX = startX + dx / 2
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
    } else {
      // Route around when tasks overlap
      const routeY = Math.max(startY, endY) + 20
      return `M ${startX} ${startY} L ${startX + minOffset} ${startY} L ${startX + minOffset} ${routeY} L ${endX - minOffset} ${routeY} L ${endX - minOffset} ${endY} L ${endX} ${endY}`
    }
  } else if (type === 'SS') {
    // Route from left side to left side
    const routeX = Math.min(startX, endX) - minOffset
    return `M ${startX} ${startY} L ${routeX} ${startY} L ${routeX} ${endY} L ${endX} ${endY}`
  } else if (type === 'FF') {
    // Route from right side to right side
    const routeX = Math.max(startX, endX) + minOffset
    return `M ${startX} ${startY} L ${routeX} ${startY} L ${routeX} ${endY} L ${endX} ${endY}`
  } else if (type === 'SF') {
    // Route from left to right (unusual)
    if (dx < -minOffset * 2) {
      const midY = (startY + endY) / 2
      return `M ${startX} ${startY} L ${startX - minOffset} ${startY} L ${startX - minOffset} ${midY} L ${endX + minOffset} ${midY} L ${endX + minOffset} ${endY} L ${endX} ${endY}`
    } else {
      return `M ${startX} ${startY} L ${startX - minOffset} ${startY} L ${startX - minOffset} ${startY + 30} L ${endX + minOffset} ${endY - 30} L ${endX + minOffset} ${endY} L ${endX} ${endY}`
    }
  }

  // Default straight line
  return `M ${startX} ${startY} L ${endX} ${endY}`
}

/**
 * Get dependency line color based on state
 */
export function getDependencyLineColor(line: DependencyLine, showCriticalPath: boolean): string {
  if (showCriticalPath && line.isCritical) {
    return '#DC2626' // Red for critical
  }
  if (line.isDriving) {
    return '#F59E0B' // Amber for driving
  }
  return '#94A3B8' // Gray for normal
}

/**
 * Calculate constraint indicator position
 */
export function getConstraintIndicatorPosition(
  constraintType: ConstraintType,
  barRect: { left: number; right: number; top: number; centerY: number }
): { x: number; y: number; side: 'left' | 'right' } {
  switch (constraintType) {
    case 'must_start_on':
    case 'start_no_earlier_than':
    case 'start_no_later_than':
      return { x: barRect.left, y: barRect.top - 4, side: 'left' }
    case 'must_finish_on':
    case 'finish_no_earlier_than':
    case 'finish_no_later_than':
      return { x: barRect.right, y: barRect.top - 4, side: 'right' }
    default:
      return { x: barRect.left, y: barRect.top - 4, side: 'left' }
  }
}

/**
 * Format lag display
 */
export function formatLag(lag: number, unit: LagUnit = 'days'): string {
  if (lag === 0) {return ''}
  const sign = lag > 0 ? '+' : ''
  switch (unit) {
    case 'days':
      return `${sign}${lag}d`
    case 'hours':
      return `${sign}${lag}h`
    case 'percent':
      return `${sign}${lag}%`
    default:
      return `${sign}${lag}`
  }
}

/**
 * Convert legacy simple dependencies to enhanced format
 */
export function convertToEnhancedDependencies(
  simpleDependencies: string[] | undefined
): TaskDependency[] {
  if (!simpleDependencies || simpleDependencies.length === 0) {
    return []
  }

  return simpleDependencies.map(predecessorId => ({
    predecessorId,
    type: 'FS' as DependencyType,
    lag: 0,
    lagUnit: 'days' as LagUnit,
  }))
}
