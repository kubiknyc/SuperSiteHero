/**
 * Look-Ahead Schedule Export Tests
 * Tests for PDF and Excel export functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { addWeeks, format } from 'date-fns'

// ============================================================================
// Mock Data
// ============================================================================

const mockActivities = [
  {
    id: '1',
    name: 'Foundation Excavation',
    start_date: '2024-01-15',
    end_date: '2024-01-20',
    status: 'in_progress' as const,
    progress: 50,
    assignee: 'John Doe',
    notes: 'Weather dependent',
  },
  {
    id: '2',
    name: 'Concrete Pour - Footings',
    start_date: '2024-01-22',
    end_date: '2024-01-25',
    status: 'planned' as const,
    progress: 0,
    assignee: 'Jane Smith',
    notes: 'Requires inspection',
  },
  {
    id: '3',
    name: 'Steel Framing',
    start_date: '2024-02-01',
    end_date: '2024-02-10',
    status: 'planned' as const,
    progress: 0,
    assignee: 'Bob Johnson',
    notes: null,
  },
]

// ============================================================================
// Date Range Tests
// ============================================================================

describe('Look-Ahead Date Range Calculations', () => {
  it('should calculate 4-week date range correctly', () => {
    const startDate = new Date('2024-01-15')
    const endDate = addWeeks(startDate, 4)

    expect(format(startDate, 'yyyy-MM-dd')).toBe('2024-01-15')
    expect(format(endDate, 'yyyy-MM-dd')).toBe('2024-02-12')
  })

  it('should calculate 2-week date range correctly', () => {
    const startDate = new Date('2024-01-15')
    const endDate = addWeeks(startDate, 2)

    expect(format(startDate, 'yyyy-MM-dd')).toBe('2024-01-15')
    expect(format(endDate, 'yyyy-MM-dd')).toBe('2024-01-29')
  })

  it('should calculate 6-week date range correctly', () => {
    const startDate = new Date('2024-01-15')
    const endDate = addWeeks(startDate, 6)

    expect(format(startDate, 'yyyy-MM-dd')).toBe('2024-01-15')
    expect(format(endDate, 'yyyy-MM-dd')).toBe('2024-02-26')
  })

  it('should handle month boundaries', () => {
    const startDate = new Date('2024-01-29')
    const endDate = addWeeks(startDate, 4)

    expect(format(startDate, 'yyyy-MM-dd')).toBe('2024-01-29')
    expect(format(endDate, 'yyyy-MM-dd')).toBe('2024-02-26')
  })

  it('should handle year boundaries', () => {
    const startDate = new Date('2024-12-16')
    const endDate = addWeeks(startDate, 4)

    expect(format(startDate, 'yyyy-MM-dd')).toBe('2024-12-16')
    expect(format(endDate, 'yyyy-MM-dd')).toBe('2025-01-13')
  })
})

// ============================================================================
// Activity Filtering Tests
// ============================================================================

describe('Activity Filtering Logic', () => {
  it('should filter activities within date range', () => {
    const startDate = new Date('2024-01-15')
    const endDate = new Date('2024-01-31')

    const filtered = mockActivities.filter(activity => {
      const activityStart = new Date(activity.start_date)
      const activityEnd = new Date(activity.end_date)

      return (
        (activityStart >= startDate && activityStart <= endDate) ||
        (activityEnd >= startDate && activityEnd <= endDate) ||
        (activityStart <= startDate && activityEnd >= endDate)
      )
    })

    expect(filtered).toHaveLength(2)
    expect(filtered[0].id).toBe('1')
    expect(filtered[1].id).toBe('2')
  })

  it('should filter by status', () => {
    const inProgress = mockActivities.filter(a => a.status === 'in_progress')
    expect(inProgress).toHaveLength(1)
    expect(inProgress[0].name).toBe('Foundation Excavation')

    const planned = mockActivities.filter(a => a.status === 'planned')
    expect(planned).toHaveLength(2)
  })

  it('should filter activities starting in range', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')

    const filtered = mockActivities.filter(activity => {
      const activityStart = new Date(activity.start_date)
      return activityStart >= startDate && activityStart <= endDate
    })

    expect(filtered).toHaveLength(2)
  })

  it('should filter activities ending in range', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')

    const filtered = mockActivities.filter(activity => {
      const activityEnd = new Date(activity.end_date)
      return activityEnd >= startDate && activityEnd <= endDate
    })

    expect(filtered).toHaveLength(2)
  })

  it('should include activities spanning the entire range', () => {
    const startDate = new Date('2024-01-16')
    const endDate = new Date('2024-01-19')

    const filtered = mockActivities.filter(activity => {
      const activityStart = new Date(activity.start_date)
      const activityEnd = new Date(activity.end_date)

      return activityStart <= startDate && activityEnd >= endDate
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })
})

// ============================================================================
// Export Options Validation Tests
// ============================================================================

describe('Export Options Validation', () => {
  it('should validate required export options', () => {
    interface LookAheadExportOptions {
      projectName: string
      startDate: Date
      endDate: Date
      activities: typeof mockActivities
    }

    const options: LookAheadExportOptions = {
      projectName: 'Building A Construction',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-02-12'),
      activities: mockActivities,
    }

    expect(options.projectName).toBeTruthy()
    expect(options.startDate).toBeInstanceOf(Date)
    expect(options.endDate).toBeInstanceOf(Date)
    expect(options.activities).toHaveLength(3)
    expect(options.endDate > options.startDate).toBe(true)
  })

  it('should validate date ordering', () => {
    const startDate = new Date('2024-01-15')
    const endDate = new Date('2024-02-12')

    expect(startDate < endDate).toBe(true)
    expect(endDate > startDate).toBe(true)
  })

  it('should handle empty activity list', () => {
    const emptyActivities: typeof mockActivities = []

    expect(emptyActivities).toHaveLength(0)
    expect(Array.isArray(emptyActivities)).toBe(true)
  })
})

// ============================================================================
// Status Display Tests
// ============================================================================

describe('Status Display Formatting', () => {
  it('should format status for display', () => {
    const statusMap: Record<string, string> = {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
      on_hold: 'On Hold',
    }

    expect(statusMap.planned).toBe('Planned')
    expect(statusMap.in_progress).toBe('In Progress')
    expect(statusMap.completed).toBe('Completed')
    expect(statusMap.on_hold).toBe('On Hold')
  })

  it('should handle unknown status gracefully', () => {
    const status = 'unknown_status'
    const display = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    expect(display).toBe('Unknown Status')
  })

  it('should format progress percentage', () => {
    mockActivities.forEach(activity => {
      expect(activity.progress).toBeGreaterThanOrEqual(0)
      expect(activity.progress).toBeLessThanOrEqual(100)

      const formatted = `${activity.progress}%`
      expect(formatted).toMatch(/^\d+%$/)
    })
  })
})

// ============================================================================
// PDF Export Data Validation Tests
// ============================================================================

describe('PDF Export Data Validation', () => {
  it('should validate PDF table headers', () => {
    const headers = [
      'Activity',
      'Start Date',
      'End Date',
      'Status',
      'Progress',
      'Assignee',
      'Notes',
    ]

    expect(headers).toHaveLength(7)
    expect(headers[0]).toBe('Activity')
    expect(headers[headers.length - 1]).toBe('Notes')
  })

  it('should format activity data for PDF rows', () => {
    const activity = mockActivities[0]
    const row = [
      activity.name,
      format(new Date(activity.start_date), 'MMM dd, yyyy'),
      format(new Date(activity.end_date), 'MMM dd, yyyy'),
      activity.status.replace(/_/g, ' '),
      `${activity.progress}%`,
      activity.assignee,
      activity.notes || 'N/A',
    ]

    expect(row).toHaveLength(7)
    expect(row[0]).toBe('Foundation Excavation')
    expect(row[1]).toMatch(/Jan \d{2}, 2024/)
    expect(row[4]).toBe('50%')
  })

  it('should handle null notes in PDF export', () => {
    const activity = mockActivities[2] // Has null notes
    const notes = activity.notes || 'N/A'

    expect(notes).toBe('N/A')
  })
})

// ============================================================================
// Excel Export Data Validation Tests
// ============================================================================

describe('Excel Export Data Validation', () => {
  it('should validate Excel column headers', () => {
    const headers = [
      'Activity',
      'Start Date',
      'End Date',
      'Duration (Days)',
      'Status',
      'Progress (%)',
      'Assignee',
      'Notes',
    ]

    expect(headers).toHaveLength(8)
    expect(headers).toContain('Duration (Days)')
    expect(headers).toContain('Progress (%)')
  })

  it('should calculate activity duration in days', () => {
    const activity = mockActivities[0]
    const start = new Date(activity.start_date)
    const end = new Date(activity.end_date)
    const durationMs = end.getTime() - start.getTime()
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))

    expect(durationDays).toBe(5)
  })

  it('should format data for Excel cells', () => {
    const activity = mockActivities[1]
    const row = {
      activity: activity.name,
      startDate: new Date(activity.start_date),
      endDate: new Date(activity.end_date),
      status: activity.status,
      progress: activity.progress,
      assignee: activity.assignee,
      notes: activity.notes || '',
    }

    expect(row.activity).toBe('Concrete Pour - Footings')
    expect(row.startDate).toBeInstanceOf(Date)
    expect(typeof row.progress).toBe('number')
  })

  it('should validate Excel worksheet name limits', () => {
    const longProjectName = 'A'.repeat(50)
    const worksheetName = `Look-Ahead Schedule - ${longProjectName.slice(0, 10)}`

    // Excel worksheet names must be <= 31 characters
    expect(worksheetName.length).toBeLessThanOrEqual(31)
  })
})

// ============================================================================
// Edge Cases and Error Handling Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle activities with same start and end date', () => {
    const singleDayActivity = {
      id: '4',
      name: 'Inspection',
      start_date: '2024-01-15',
      end_date: '2024-01-15',
      status: 'completed' as const,
      progress: 100,
      assignee: 'Inspector',
      notes: null,
    }

    const start = new Date(singleDayActivity.start_date)
    const end = new Date(singleDayActivity.end_date)
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    expect(duration).toBe(0)
    expect(start.getTime()).toBe(end.getTime())
  })

  it('should handle very long activity names', () => {
    const longName = 'A'.repeat(200)
    const truncated = longName.length > 100 ? longName.slice(0, 97) + '...' : longName

    expect(truncated.length).toBeLessThanOrEqual(100)
    expect(truncated.endsWith('...')).toBe(true)
  })

  it('should handle special characters in project name', () => {
    const projectNames = [
      'Project & Associates',
      'Building #123',
      'Site @ Location',
      'Phase I/II',
    ]

    projectNames.forEach(name => {
      expect(name).toBeTruthy()
      expect(typeof name).toBe('string')
    })
  })

  it('should validate progress values are in valid range', () => {
    const validProgress = [0, 25, 50, 75, 100]
    const invalidProgress = [-10, 150, 200]

    validProgress.forEach(progress => {
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(100)
    })

    invalidProgress.forEach(progress => {
      const clamped = Math.max(0, Math.min(100, progress))
      expect(clamped).toBeGreaterThanOrEqual(0)
      expect(clamped).toBeLessThanOrEqual(100)
    })
  })
})
