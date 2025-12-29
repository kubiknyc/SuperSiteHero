// File: src/features/gantt/utils/dateUtils.ts
// Date utility functions for Gantt chart positioning and calculations

import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  endOfWeek,
  endOfMonth,
  format,
  isWeekend,
  isSameDay,
  isWithinInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns'
import type { GanttZoomLevel, TimelineColumn } from '@/types/schedule'

/**
 * Get the number of units between two dates based on zoom level
 */
export function getUnitsBetweenDates(
  startDate: Date,
  endDate: Date,
  zoomLevel: GanttZoomLevel
): number {
  switch (zoomLevel) {
    case 'day':
      return differenceInDays(endDate, startDate) + 1
    case 'week':
      return differenceInWeeks(endDate, startDate) + 1
    case 'month':
      return differenceInMonths(endDate, startDate) + 1
    case 'quarter':
      return Math.ceil((differenceInMonths(endDate, startDate) + 1) / 3)
    default:
      return differenceInDays(endDate, startDate) + 1
  }
}

/**
 * Get the column width in pixels for a zoom level
 */
export function getColumnWidth(zoomLevel: GanttZoomLevel): number {
  switch (zoomLevel) {
    case 'day':
      return 40
    case 'week':
      return 100
    case 'month':
      return 150
    case 'quarter':
      return 200
    default:
      return 40
  }
}

/**
 * Calculate the X position for a date on the timeline
 */
export function getDatePosition(
  date: Date,
  timelineStartDate: Date,
  zoomLevel: GanttZoomLevel,
  columnWidth: number
): number {
  const daysDiff = differenceInDays(startOfDay(date), startOfDay(timelineStartDate))

  switch (zoomLevel) {
    case 'day':
      return daysDiff * columnWidth
    case 'week':
      return (daysDiff / 7) * columnWidth
    case 'month':
      return (daysDiff / 30) * columnWidth
    case 'quarter':
      return (daysDiff / 90) * columnWidth
    default:
      return daysDiff * columnWidth
  }
}

/**
 * Calculate the width of a task bar based on duration
 */
export function getTaskBarWidth(
  startDate: Date,
  endDate: Date,
  zoomLevel: GanttZoomLevel,
  columnWidth: number
): number {
  const days = differenceInDays(endDate, startDate) + 1

  switch (zoomLevel) {
    case 'day':
      return Math.max(columnWidth, days * columnWidth)
    case 'week':
      return Math.max(columnWidth / 7, (days / 7) * columnWidth)
    case 'month':
      return Math.max(columnWidth / 30, (days / 30) * columnWidth)
    case 'quarter':
      return Math.max(columnWidth / 90, (days / 90) * columnWidth)
    default:
      return Math.max(columnWidth, days * columnWidth)
  }
}

/**
 * Generate timeline columns for the header
 */
export function generateTimelineColumns(
  startDate: Date,
  endDate: Date,
  zoomLevel: GanttZoomLevel
): TimelineColumn[] {
  const columns: TimelineColumn[] = []
  const columnWidth = getColumnWidth(zoomLevel)
  const today = startOfDay(new Date())

  switch (zoomLevel) {
    case 'day': {
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      days.forEach((date) => {
        columns.push({
          date,
          label: format(date, 'd'),
          sub_label: format(date, 'EEE'),
          width: columnWidth,
          is_weekend: isWeekend(date),
          is_today: isSameDay(date, today),
        })
      })
      break
    }

    case 'week': {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate })
      weeks.forEach((date) => {
        const weekEnd = endOfWeek(date)
        columns.push({
          date,
          label: `${format(date, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
          sub_label: `Week ${format(date, 'w')}`,
          width: columnWidth,
          is_weekend: false,
          is_today: isWithinInterval(today, { start: date, end: weekEnd }),
        })
      })
      break
    }

    case 'month': {
      const months = eachMonthOfInterval({ start: startDate, end: endDate })
      months.forEach((date) => {
        columns.push({
          date,
          label: format(date, 'MMMM'),
          sub_label: format(date, 'yyyy'),
          width: columnWidth,
          is_weekend: false,
          is_today: isSameDay(startOfMonth(today), date),
        })
      })
      break
    }

    case 'quarter': {
      const months = eachMonthOfInterval({ start: startDate, end: endDate })
      const quarterStarts = months.filter((date) => date.getMonth() % 3 === 0)
      quarterStarts.forEach((date) => {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        columns.push({
          date,
          label: `Q${quarter}`,
          sub_label: format(date, 'yyyy'),
          width: columnWidth * 3,
          is_weekend: false,
          is_today: false,
        })
      })
      break
    }
  }

  return columns
}

/**
 * Calculate optimal date range for the timeline based on tasks
 */
export function calculateOptimalDateRange(
  earliestStart: string | null,
  latestFinish: string | null,
  paddingDays: number = 7
): { startDate: Date; endDate: Date } {
  const today = new Date()

  if (!earliestStart || !latestFinish) {
    // Default to 3 months view centered on today
    return {
      startDate: addDays(startOfMonth(today), -paddingDays),
      endDate: addMonths(endOfMonth(today), 2),
    }
  }

  const start = new Date(earliestStart)
  const end = new Date(latestFinish)

  return {
    startDate: addDays(startOfDay(start), -paddingDays),
    endDate: addDays(endOfDay(end), paddingDays),
  }
}

/**
 * Get appropriate zoom level based on date range
 */
export function getOptimalZoomLevel(startDate: Date, endDate: Date): GanttZoomLevel {
  const days = differenceInDays(endDate, startDate)

  if (days <= 14) {return 'day'}
  if (days <= 90) {return 'week'}
  if (days <= 365) {return 'month'}
  return 'quarter'
}

/**
 * Format date for display based on zoom level
 */
export function formatDateForZoom(date: Date, zoomLevel: GanttZoomLevel): string {
  switch (zoomLevel) {
    case 'day':
      return format(date, 'MMM d, yyyy')
    case 'week':
      return format(date, 'MMM d, yyyy')
    case 'month':
      return format(date, 'MMMM yyyy')
    case 'quarter': {
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `Q${quarter} ${format(date, 'yyyy')}`
    }
    default:
      return format(date, 'MMM d, yyyy')
  }
}

/**
 * Snap a date to the nearest unit based on zoom level
 */
export function snapDateToUnit(date: Date, zoomLevel: GanttZoomLevel): Date {
  switch (zoomLevel) {
    case 'day':
      return startOfDay(date)
    case 'week':
      return startOfWeek(date)
    case 'month':
      return startOfMonth(date)
    case 'quarter': {
      const month = date.getMonth()
      const quarterStartMonth = Math.floor(month / 3) * 3
      return new Date(date.getFullYear(), quarterStartMonth, 1)
    }
    default:
      return startOfDay(date)
  }
}

/**
 * Calculate the total width of the timeline
 */
export function calculateTimelineWidth(
  startDate: Date,
  endDate: Date,
  zoomLevel: GanttZoomLevel
): number {
  const columnWidth = getColumnWidth(zoomLevel)
  const units = getUnitsBetweenDates(startDate, endDate, zoomLevel)
  return units * columnWidth
}

/**
 * Get visible date range based on scroll position
 */
export function getVisibleDateRange(
  scrollX: number,
  viewportWidth: number,
  timelineStartDate: Date,
  zoomLevel: GanttZoomLevel
): { visibleStart: Date; visibleEnd: Date } {
  const columnWidth = getColumnWidth(zoomLevel)

  // Calculate days offset based on scroll
  let daysOffsetStart: number
  let daysOffsetEnd: number

  switch (zoomLevel) {
    case 'day':
      daysOffsetStart = Math.floor(scrollX / columnWidth)
      daysOffsetEnd = Math.ceil((scrollX + viewportWidth) / columnWidth)
      break
    case 'week':
      daysOffsetStart = Math.floor((scrollX / columnWidth) * 7)
      daysOffsetEnd = Math.ceil(((scrollX + viewportWidth) / columnWidth) * 7)
      break
    case 'month':
      daysOffsetStart = Math.floor((scrollX / columnWidth) * 30)
      daysOffsetEnd = Math.ceil(((scrollX + viewportWidth) / columnWidth) * 30)
      break
    case 'quarter':
      daysOffsetStart = Math.floor((scrollX / columnWidth) * 90)
      daysOffsetEnd = Math.ceil(((scrollX + viewportWidth) / columnWidth) * 90)
      break
    default:
      daysOffsetStart = Math.floor(scrollX / columnWidth)
      daysOffsetEnd = Math.ceil((scrollX + viewportWidth) / columnWidth)
  }

  return {
    visibleStart: addDays(timelineStartDate, daysOffsetStart),
    visibleEnd: addDays(timelineStartDate, daysOffsetEnd),
  }
}

/**
 * Check if a task is visible in the current viewport
 */
export function isTaskVisible(
  taskStart: Date,
  taskEnd: Date,
  visibleStart: Date,
  visibleEnd: Date
): boolean {
  return (
    isWithinInterval(taskStart, { start: visibleStart, end: visibleEnd }) ||
    isWithinInterval(taskEnd, { start: visibleStart, end: visibleEnd }) ||
    (taskStart <= visibleStart && taskEnd >= visibleEnd)
  )
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
export function getWorkingDays(startDate: Date, endDate: Date): number {
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  return days.filter((day) => !isWeekend(day)).length
}

/**
 * Add working days to a date (excluding weekends)
 */
export function addWorkingDays(date: Date, days: number): Date {
  let result = date
  let remaining = days

  while (remaining > 0) {
    result = addDays(result, 1)
    if (!isWeekend(result)) {
      remaining--
    }
  }

  return result
}
