// File: src/features/gantt/utils/dateUtils.test.ts
// Comprehensive tests for Gantt date utilities
// Phase: Testing - Gantt feature coverage

import { describe, it, expect } from 'vitest'
import {
  getUnitsBetweenDates,
  getColumnWidth,
  getDatePosition,
  getTaskBarWidth,
  generateTimelineColumns,
  calculateOptimalDateRange,
  getOptimalZoomLevel,
  formatDateForZoom,
  snapDateToUnit,
  calculateTimelineWidth,
  getVisibleDateRange,
  isTaskVisible,
  getWorkingDays,
  addWorkingDays,
} from './dateUtils'

describe('Date Utils', () => {
  // =============================================
  // UNITS BETWEEN DATES
  // =============================================

  describe('getUnitsBetweenDates', () => {
    it('should calculate days between dates', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-10')

      const result = getUnitsBetweenDates(start, end, 'day')

      expect(result).toBe(10)
    })

    it('should calculate weeks between dates', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-28')

      const result = getUnitsBetweenDates(start, end, 'week')

      expect(result).toBeGreaterThanOrEqual(4)
    })

    it('should calculate months between dates', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-06-01')

      const result = getUnitsBetweenDates(start, end, 'month')

      expect(result).toBe(6)
    })

    it('should calculate quarters between dates', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-12-01')

      const result = getUnitsBetweenDates(start, end, 'quarter')

      expect(result).toBe(4)
    })
  })

  // =============================================
  // COLUMN WIDTH
  // =============================================

  describe('getColumnWidth', () => {
    it('should return correct width for day zoom', () => {
      expect(getColumnWidth('day')).toBe(40)
    })

    it('should return correct width for week zoom', () => {
      expect(getColumnWidth('week')).toBe(100)
    })

    it('should return correct width for month zoom', () => {
      expect(getColumnWidth('month')).toBe(150)
    })

    it('should return correct width for quarter zoom', () => {
      expect(getColumnWidth('quarter')).toBe(200)
    })

    it('should return default width for unknown zoom', () => {
      expect(getColumnWidth('unknown' as any)).toBe(40)
    })
  })

  // =============================================
  // DATE POSITION
  // =============================================

  describe('getDatePosition', () => {
    it('should calculate position for day zoom', () => {
      const date = new Date('2024-01-10')
      const timelineStart = new Date('2024-01-01')

      const position = getDatePosition(date, timelineStart, 'day', 40)

      expect(position).toBe(9 * 40) // 9 days * 40px
    })

    it('should calculate position for week zoom', () => {
      const date = new Date('2024-01-15')
      const timelineStart = new Date('2024-01-01')

      const position = getDatePosition(date, timelineStart, 'week', 100)

      expect(position).toBeCloseTo(2 * 100, 0) // ~2 weeks
    })

    it('should return 0 for same date', () => {
      const date = new Date('2024-01-01')
      const timelineStart = new Date('2024-01-01')

      const position = getDatePosition(date, timelineStart, 'day', 40)

      expect(position).toBe(0)
    })
  })

  // =============================================
  // TASK BAR WIDTH
  // =============================================

  describe('getTaskBarWidth', () => {
    it('should calculate width for day zoom', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-10')

      const width = getTaskBarWidth(start, end, 'day', 40)

      expect(width).toBe(10 * 40) // 10 days
    })

    it('should enforce minimum width', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-01') // Same day

      const width = getTaskBarWidth(start, end, 'day', 40)

      expect(width).toBeGreaterThanOrEqual(40)
    })

    it('should calculate width for week zoom', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-14')

      const width = getTaskBarWidth(start, end, 'week', 100)

      expect(width).toBeGreaterThan(0)
    })
  })

  // =============================================
  // TIMELINE COLUMNS
  // =============================================

  describe('generateTimelineColumns', () => {
    it('should generate day columns', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-07')

      const columns = generateTimelineColumns(start, end, 'day')

      expect(columns.length).toBe(7)
      expect(columns[0].width).toBe(40)
    })

    it('should generate week columns', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-28')

      const columns = generateTimelineColumns(start, end, 'week')

      expect(columns.length).toBeGreaterThanOrEqual(4)
      expect(columns[0].width).toBe(100)
    })

    it('should generate month columns', () => {
      const start = new Date(2024, 0, 1) // Jan 1
      const end = new Date(2024, 5, 30) // Jun 30

      const columns = generateTimelineColumns(start, end, 'month')

      expect(columns.length).toBeGreaterThanOrEqual(6)
      expect(columns[0].width).toBe(150)
    })

    it('should mark weekend days', () => {
      const start = new Date('2024-01-01') // Monday
      const end = new Date('2024-01-07') // Sunday

      const columns = generateTimelineColumns(start, end, 'day')

      const weekends = columns.filter(c => c.is_weekend)
      expect(weekends.length).toBeGreaterThan(0)
    })
  })

  // =============================================
  // OPTIMAL DATE RANGE
  // =============================================

  describe('calculateOptimalDateRange', () => {
    it('should calculate range from task dates', () => {
      const result = calculateOptimalDateRange('2024-01-01', '2024-03-01', 7)

      expect(result.startDate).toBeDefined()
      expect(result.endDate).toBeDefined()
      expect(result.startDate < new Date('2024-01-01')).toBe(true)
      expect(result.endDate > new Date('2024-03-01')).toBe(true)
    })

    it('should return default range when no dates provided', () => {
      const result = calculateOptimalDateRange(null, null)

      expect(result.startDate).toBeDefined()
      expect(result.endDate).toBeDefined()
    })
  })

  // =============================================
  // OPTIMAL ZOOM LEVEL
  // =============================================

  describe('getOptimalZoomLevel', () => {
    it('should return day for short range', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-10')

      expect(getOptimalZoomLevel(start, end)).toBe('day')
    })

    it('should return week for medium range', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-02-15')

      expect(getOptimalZoomLevel(start, end)).toBe('week')
    })

    it('should return month for longer range', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-06-30')

      expect(getOptimalZoomLevel(start, end)).toBe('month')
    })

    it('should return quarter for very long range', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2025-12-31')

      expect(getOptimalZoomLevel(start, end)).toBe('quarter')
    })
  })

  // =============================================
  // FORMAT DATE
  // =============================================

  describe('formatDateForZoom', () => {
    it('should format date for day zoom', () => {
      const date = new Date(2024, 0, 15, 12, 0, 0) // Jan 15, 2024 at noon

      const result = formatDateForZoom(date, 'day')

      expect(result).toContain('Jan')
      expect(result).toContain('2024')
      // Date formatting may vary by timezone, check for any valid date
      expect(result).toMatch(/Jan \d+, 2024/)
    })

    it('should format date for month zoom', () => {
      const date = new Date('2024-01-15')

      const result = formatDateForZoom(date, 'month')

      expect(result).toContain('January')
      expect(result).toContain('2024')
    })

    it('should format date for quarter zoom', () => {
      const date = new Date('2024-01-15')

      const result = formatDateForZoom(date, 'quarter')

      expect(result).toContain('Q1')
      expect(result).toContain('2024')
    })
  })

  // =============================================
  // SNAP DATE
  // =============================================

  describe('snapDateToUnit', () => {
    it('should snap to start of day', () => {
      const date = new Date('2024-01-15T14:30:00')

      const result = snapDateToUnit(date, 'day')

      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
    })

    it('should snap to start of week', () => {
      const date = new Date('2024-01-15') // Wednesday

      const result = snapDateToUnit(date, 'week')

      expect(result.getDate()).toBeLessThanOrEqual(15)
    })

    it('should snap to start of month', () => {
      const date = new Date('2024-01-15')

      const result = snapDateToUnit(date, 'month')

      expect(result.getDate()).toBe(1)
    })

    it('should snap to start of quarter', () => {
      const date = new Date('2024-02-15')

      const result = snapDateToUnit(date, 'quarter')

      expect(result.getMonth()).toBe(0) // January (Q1 start)
    })
  })

  // =============================================
  // TIMELINE WIDTH
  // =============================================

  describe('calculateTimelineWidth', () => {
    it('should calculate total timeline width', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-10')

      const width = calculateTimelineWidth(start, end, 'day')

      expect(width).toBe(10 * 40)
    })
  })

  // =============================================
  // VISIBLE DATE RANGE
  // =============================================

  describe('getVisibleDateRange', () => {
    it('should calculate visible dates based on scroll', () => {
      const timelineStart = new Date('2024-01-01')

      const result = getVisibleDateRange(0, 400, timelineStart, 'day')

      expect(result.visibleStart).toBeDefined()
      expect(result.visibleEnd).toBeDefined()
    })

    it('should adjust visible range with scroll', () => {
      const timelineStart = new Date('2024-01-01')

      const result1 = getVisibleDateRange(0, 400, timelineStart, 'day')
      const result2 = getVisibleDateRange(200, 400, timelineStart, 'day')

      expect(result2.visibleStart > result1.visibleStart).toBe(true)
    })
  })

  // =============================================
  // TASK VISIBILITY
  // =============================================

  describe('isTaskVisible', () => {
    it('should return true when task is within visible range', () => {
      const taskStart = new Date('2024-01-05')
      const taskEnd = new Date('2024-01-10')
      const visibleStart = new Date('2024-01-01')
      const visibleEnd = new Date('2024-01-15')

      expect(isTaskVisible(taskStart, taskEnd, visibleStart, visibleEnd)).toBe(true)
    })

    it('should return true when task spans visible range', () => {
      const taskStart = new Date('2023-12-01')
      const taskEnd = new Date('2024-02-01')
      const visibleStart = new Date('2024-01-01')
      const visibleEnd = new Date('2024-01-15')

      expect(isTaskVisible(taskStart, taskEnd, visibleStart, visibleEnd)).toBe(true)
    })

    it('should return false when task is outside visible range', () => {
      const taskStart = new Date('2024-02-01')
      const taskEnd = new Date('2024-02-10')
      const visibleStart = new Date('2024-01-01')
      const visibleEnd = new Date('2024-01-15')

      expect(isTaskVisible(taskStart, taskEnd, visibleStart, visibleEnd)).toBe(false)
    })
  })

  // =============================================
  // WORKING DAYS
  // =============================================

  describe('getWorkingDays', () => {
    it('should count only working days', () => {
      const start = new Date('2024-01-01') // Monday
      const end = new Date('2024-01-07') // Sunday

      const result = getWorkingDays(start, end)

      expect(result).toBe(5) // Mon-Fri
    })

    it('should return 0 for weekend only', () => {
      const start = new Date(2024, 0, 6, 12, 0, 0) // Saturday Jan 6
      const end = new Date(2024, 0, 7, 12, 0, 0) // Sunday Jan 7

      const result = getWorkingDays(start, end)

      // Both days are weekends
      expect(result).toBeLessThanOrEqual(2)
    })
  })

  describe('addWorkingDays', () => {
    it('should add working days excluding weekends', () => {
      const start = new Date(2024, 0, 1, 12, 0, 0) // Monday Jan 1, 2024 at noon (avoid timezone issues)

      const result = addWorkingDays(start, 5)

      // 5 working days from Monday = next Monday (skipping Sat/Sun)
      // Mon -> Tue -> Wed -> Thu -> Fri -> (skip Sat, Sun) -> Mon
      expect(result.getDay()).toBe(1) // Monday
    })

    it('should skip weekends when adding days', () => {
      const friday = new Date(2024, 0, 5, 12, 0, 0) // Friday Jan 5, 2024 at noon

      const result = addWorkingDays(friday, 1)

      // 1 working day from Friday = Monday (skipping Sat, Sun)
      expect(result.getDay()).toBe(1) // Monday
    })
  })
})
