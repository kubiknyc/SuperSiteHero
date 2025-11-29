/**
 * Drag and Drop Utilities for Gantt Chart
 *
 * Handles:
 * - Horizontal drag (reschedule task)
 * - Edge drag (resize duration)
 * - Snap to grid (day boundaries)
 * - Constraint validation
 */

import { addDays, differenceInDays, parseISO, format } from 'date-fns'
import type { ScheduleItem, GanttTask, GanttConfig } from '@/types/schedule'

export type DragMode = 'move' | 'resize-start' | 'resize-end' | null

export interface DragState {
  mode: DragMode
  taskId: string | null
  startX: number
  startY: number
  currentX: number
  currentY: number
  originalStartDate: string
  originalFinishDate: string
  originalDuration: number
}

export interface DragResult {
  newStartDate: string
  newFinishDate: string
  newDuration: number
  daysChanged: number
}

export const DRAG_THRESHOLD = 5 // pixels before drag starts

/**
 * Initialize drag state
 */
export function initDragState(): DragState {
  return {
    mode: null,
    taskId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    originalStartDate: '',
    originalFinishDate: '',
    originalDuration: 0
  }
}

/**
 * Start a drag operation
 */
export function startDrag(
  task: ScheduleItem,
  mode: DragMode,
  clientX: number,
  clientY: number
): DragState {
  return {
    mode,
    taskId: task.id,
    startX: clientX,
    startY: clientY,
    currentX: clientX,
    currentY: clientY,
    originalStartDate: task.start_date,
    originalFinishDate: task.finish_date,
    originalDuration: task.duration_days
  }
}

/**
 * Calculate days moved based on pixel delta and column width
 */
export function calculateDaysDelta(
  pixelDelta: number,
  columnWidth: number
): number {
  return Math.round(pixelDelta / columnWidth)
}

/**
 * Calculate new dates based on drag
 */
export function calculateDragResult(
  dragState: DragState,
  currentX: number,
  columnWidth: number,
  minDuration: number = 1
): DragResult {
  const pixelDelta = currentX - dragState.startX
  const daysDelta = calculateDaysDelta(pixelDelta, columnWidth)

  const originalStart = parseISO(dragState.originalStartDate)
  const originalFinish = parseISO(dragState.originalFinishDate)

  let newStartDate: Date
  let newFinishDate: Date
  let newDuration: number

  switch (dragState.mode) {
    case 'move':
      // Move both start and end by same amount
      newStartDate = addDays(originalStart, daysDelta)
      newFinishDate = addDays(originalFinish, daysDelta)
      newDuration = dragState.originalDuration
      break

    case 'resize-start':
      // Change start date, keep end date fixed
      newStartDate = addDays(originalStart, daysDelta)
      newFinishDate = originalFinish
      newDuration = differenceInDays(newFinishDate, newStartDate)
      // Enforce minimum duration
      if (newDuration < minDuration) {
        newStartDate = addDays(newFinishDate, -minDuration)
        newDuration = minDuration
      }
      break

    case 'resize-end':
      // Keep start date, change end date
      newStartDate = originalStart
      newFinishDate = addDays(originalFinish, daysDelta)
      newDuration = differenceInDays(newFinishDate, newStartDate)
      // Enforce minimum duration
      if (newDuration < minDuration) {
        newFinishDate = addDays(newStartDate, minDuration)
        newDuration = minDuration
      }
      break

    default:
      newStartDate = originalStart
      newFinishDate = originalFinish
      newDuration = dragState.originalDuration
  }

  return {
    newStartDate: format(newStartDate, 'yyyy-MM-dd'),
    newFinishDate: format(newFinishDate, 'yyyy-MM-dd'),
    newDuration,
    daysChanged: daysDelta
  }
}

/**
 * Determine drag mode based on mouse position on task bar
 */
export function getDragMode(
  mouseX: number,
  taskBarLeft: number,
  taskBarWidth: number,
  edgeThreshold: number = 8
): DragMode {
  const relativeX = mouseX - taskBarLeft

  if (relativeX <= edgeThreshold) {
    return 'resize-start'
  }

  if (relativeX >= taskBarWidth - edgeThreshold) {
    return 'resize-end'
  }

  return 'move'
}

/**
 * Get cursor style based on drag mode
 */
export function getDragCursor(mode: DragMode): string {
  switch (mode) {
    case 'move':
      return 'grab'
    case 'resize-start':
    case 'resize-end':
      return 'ew-resize'
    default:
      return 'default'
  }
}

/**
 * Get cursor style during active drag
 */
export function getActiveDragCursor(mode: DragMode): string {
  switch (mode) {
    case 'move':
      return 'grabbing'
    case 'resize-start':
    case 'resize-end':
      return 'ew-resize'
    default:
      return 'default'
  }
}

/**
 * Check if drag has exceeded threshold
 */
export function hasDragStarted(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  threshold: number = DRAG_THRESHOLD
): boolean {
  const deltaX = Math.abs(currentX - startX)
  const deltaY = Math.abs(currentY - startY)
  return deltaX > threshold || deltaY > threshold
}

/**
 * Snap date to nearest day boundary
 */
export function snapToDay(date: Date): Date {
  const snapped = new Date(date)
  snapped.setHours(0, 0, 0, 0)
  return snapped
}

/**
 * Validate drag result against constraints
 */
export function validateDragResult(
  result: DragResult,
  task: GanttTask,
  config: GanttConfig
): { valid: boolean; error?: string } {
  // Check minimum duration
  if (result.newDuration < 1) {
    return { valid: false, error: 'Duration must be at least 1 day' }
  }

  // Check date range constraints if configured
  const newStart = parseISO(result.newStartDate)
  const newFinish = parseISO(result.newFinishDate)

  // Milestones should have 0 duration
  if (task.is_milestone && result.newDuration !== 0) {
    return { valid: false, error: 'Milestones must have zero duration' }
  }

  return { valid: true }
}

/**
 * Calculate ghost bar position during drag
 */
export function calculateGhostBarPosition(
  dragState: DragState,
  currentX: number,
  columnWidth: number,
  dateRange: { start: Date; end: Date },
  getDatePosition: (date: Date, start: Date, end: Date, width: number) => number,
  chartWidth: number
): { left: number; width: number } {
  const result = calculateDragResult(dragState, currentX, columnWidth)
  const newStart = parseISO(result.newStartDate)
  const newFinish = parseISO(result.newFinishDate)

  const left = getDatePosition(newStart, dateRange.start, dateRange.end, chartWidth)
  const right = getDatePosition(newFinish, dateRange.start, dateRange.end, chartWidth)

  return {
    left,
    width: Math.max(right - left, columnWidth) // Minimum width of one column
  }
}

/**
 * Format drag feedback message
 */
export function formatDragFeedback(
  result: DragResult,
  mode: DragMode
): string {
  const startDate = parseISO(result.newStartDate)
  const finishDate = parseISO(result.newFinishDate)

  switch (mode) {
    case 'move':
      if (result.daysChanged > 0) {
        return `Moving ${result.daysChanged} day${result.daysChanged !== 1 ? 's' : ''} later`
      } else if (result.daysChanged < 0) {
        return `Moving ${Math.abs(result.daysChanged)} day${Math.abs(result.daysChanged) !== 1 ? 's' : ''} earlier`
      }
      return 'No change'

    case 'resize-start':
      return `Start: ${format(startDate, 'MMM d')} (${result.newDuration} days)`

    case 'resize-end':
      return `End: ${format(finishDate, 'MMM d')} (${result.newDuration} days)`

    default:
      return ''
  }
}
