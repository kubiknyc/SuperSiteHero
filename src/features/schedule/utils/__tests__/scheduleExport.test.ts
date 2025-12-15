/**
 * Schedule Export Tests
 *
 * Comprehensive test suite for MS Project XML, Primavera P6 XER, and CSV export.
 * Tests include XML generation, dependency conversion, date formatting,
 * special character escaping, and round-trip import/export validation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  escapeXml,
  sanitizeForXml,
  convertDependencyTypeToMSP,
  convertMSPToDependencyType,
  formatDurationForMSP,
  parseMSPDuration,
  formatDateForMSP,
  parseMSPDate,
  filterActivitiesForExport,
  generateMSProjectXML,
  generatePrimaveraXER,
  generateCSVExport,
  exportSchedule,
  validateExportOptions,
  estimateExportSize,
  MAX_EXPORT_ACTIVITIES,
  type ExportOptions,
} from '../scheduleExport'
import type {
  ScheduleActivity,
  ScheduleDependency,
} from '@/types/schedule-activities'

// =============================================
// Test Data Fixtures
// =============================================

const createMockActivity = (overrides: Partial<ScheduleActivity> = {}): ScheduleActivity => ({
  id: 'activity-1',
  project_id: 'project-1',
  company_id: 'company-1',
  activity_id: 'ACT-001',
  activity_code: null,
  name: 'Test Activity',
  description: 'Test description',
  wbs_code: '1.1',
  wbs_level: 1,
  parent_activity_id: null,
  sort_order: 1,
  planned_start: '2025-01-15',
  planned_finish: '2025-01-25',
  actual_start: null,
  actual_finish: null,
  baseline_start: null,
  baseline_finish: null,
  planned_duration: 10,
  actual_duration: null,
  remaining_duration: null,
  duration_type: 'fixed_duration',
  percent_complete: 25,
  physical_percent_complete: null,
  activity_type: 'task',
  is_milestone: false,
  is_critical: false,
  total_float: 5,
  free_float: 2,
  is_on_critical_path: false,
  calendar_id: null,
  constraint_type: null,
  constraint_date: null,
  responsible_party: 'John Doe',
  responsible_user_id: null,
  subcontractor_id: null,
  budgeted_cost: null,
  actual_cost: null,
  earned_value: null,
  budgeted_labor_hours: null,
  actual_labor_hours: null,
  status: 'in_progress',
  notes: 'Activity notes',
  external_id: 'EXT-001',
  external_source: 'ms_project',
  bar_color: null,
  milestone_color: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
  created_by: null,
  deleted_at: null,
  ...overrides,
})

const createMockDependency = (
  predecessorId: string,
  successorId: string,
  overrides: Partial<ScheduleDependency> = {}
): ScheduleDependency => ({
  id: `dep-${predecessorId}-${successorId}`,
  project_id: 'project-1',
  predecessor_id: predecessorId,
  successor_id: successorId,
  dependency_type: 'FS',
  lag_days: 0,
  lag_type: 'days',
  lag_value: 0,
  is_driving: false,
  created_at: '2025-01-01T00:00:00Z',
  created_by: null,
  ...overrides,
})

const createSampleActivities = (count: number = 5): ScheduleActivity[] => {
  return Array.from({ length: count }, (_, i) => createMockActivity({
    id: `activity-${i + 1}`,
    activity_id: `ACT-${String(i + 1).padStart(3, '0')}`,
    name: `Activity ${i + 1}`,
    wbs_code: `1.${i + 1}`,
    sort_order: i + 1,
    planned_start: `2025-01-${String(15 + i * 5).padStart(2, '0')}`,
    planned_finish: `2025-01-${String(20 + i * 5).padStart(2, '0')}`,
    is_milestone: i === count - 1, // Last one is milestone
    is_critical: i === 0, // First one is critical
    percent_complete: (i + 1) * 20,
  }))
}

const createSampleDependencies = (activities: ScheduleActivity[]): ScheduleDependency[] => {
  const deps: ScheduleDependency[] = []
  for (let i = 1; i < activities.length; i++) {
    deps.push(createMockDependency(activities[i - 1].id, activities[i].id, {
      dependency_type: i % 2 === 0 ? 'SS' : 'FS',
      lag_days: i,
    }))
  }
  return deps
}

// =============================================
// XML Escaping Tests
// =============================================

describe('XML Escaping', () => {
  describe('escapeXml', () => {
    it('should escape ampersand', () => {
      expect(escapeXml('Rock & Roll')).toBe('Rock &amp; Roll')
    })

    it('should escape less than', () => {
      expect(escapeXml('a < b')).toBe('a &lt; b')
    })

    it('should escape greater than', () => {
      expect(escapeXml('a > b')).toBe('a &gt; b')
    })

    it('should escape double quotes', () => {
      expect(escapeXml('Say "hello"')).toBe('Say &quot;hello&quot;')
    })

    it('should escape single quotes', () => {
      expect(escapeXml("It's fine")).toBe('It&apos;s fine')
    })

    it('should escape multiple special characters', () => {
      expect(escapeXml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      )
    })

    it('should handle null input', () => {
      expect(escapeXml(null)).toBe('')
    })

    it('should handle undefined input', () => {
      expect(escapeXml(undefined)).toBe('')
    })

    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('')
    })

    it('should handle numbers converted to string', () => {
      expect(escapeXml(123 as unknown as string)).toBe('123')
    })
  })

  describe('sanitizeForXml', () => {
    it('should remove control characters', () => {
      expect(sanitizeForXml('Hello\x00World')).toBe('HelloWorld')
      expect(sanitizeForXml('Test\x08String')).toBe('TestString')
    })

    it('should preserve tabs, newlines, carriage returns', () => {
      expect(sanitizeForXml('Line1\nLine2')).toBe('Line1\nLine2')
      expect(sanitizeForXml('Tab\there')).toBe('Tab\there')
      expect(sanitizeForXml('Carriage\rReturn')).toBe('Carriage\rReturn')
    })

    it('should handle null input', () => {
      expect(sanitizeForXml(null)).toBe('')
    })
  })
})

// =============================================
// Dependency Type Conversion Tests
// =============================================

describe('Dependency Type Conversion', () => {
  describe('convertDependencyTypeToMSP', () => {
    it('should convert FS to 1', () => {
      expect(convertDependencyTypeToMSP('FS')).toBe(1)
    })

    it('should convert SS to 3', () => {
      expect(convertDependencyTypeToMSP('SS')).toBe(3)
    })

    it('should convert FF to 0', () => {
      expect(convertDependencyTypeToMSP('FF')).toBe(0)
    })

    it('should convert SF to 2', () => {
      expect(convertDependencyTypeToMSP('SF')).toBe(2)
    })

    it('should default to FS (1) for unknown types', () => {
      expect(convertDependencyTypeToMSP('XX' as any)).toBe(1)
    })
  })

  describe('convertMSPToDependencyType', () => {
    it('should convert 1 to FS', () => {
      expect(convertMSPToDependencyType(1)).toBe('FS')
    })

    it('should convert 3 to SS', () => {
      expect(convertMSPToDependencyType(3)).toBe('SS')
    })

    it('should convert 0 to FF', () => {
      expect(convertMSPToDependencyType(0)).toBe('FF')
    })

    it('should convert 2 to SF', () => {
      expect(convertMSPToDependencyType(2)).toBe('SF')
    })

    it('should default to FS for unknown codes', () => {
      expect(convertMSPToDependencyType(99)).toBe('FS')
    })
  })

  it('should be reversible', () => {
    const types = ['FS', 'SS', 'FF', 'SF'] as const
    types.forEach((type) => {
      const mspCode = convertDependencyTypeToMSP(type)
      const backToType = convertMSPToDependencyType(mspCode)
      expect(backToType).toBe(type)
    })
  })
})

// =============================================
// Duration Formatting Tests
// =============================================

describe('Duration Formatting', () => {
  describe('formatDurationForMSP', () => {
    it('should convert 1 day to PT8H0M0S (8 hours)', () => {
      expect(formatDurationForMSP(1)).toBe('PT8H0M0S')
    })

    it('should convert 5 days to PT40H0M0S', () => {
      expect(formatDurationForMSP(5)).toBe('PT40H0M0S')
    })

    it('should convert 10 days to PT80H0M0S', () => {
      expect(formatDurationForMSP(10)).toBe('PT80H0M0S')
    })

    it('should handle zero duration', () => {
      expect(formatDurationForMSP(0)).toBe('PT0H0M0S')
    })

    it('should handle null duration', () => {
      expect(formatDurationForMSP(null)).toBe('PT0H0M0S')
    })

    it('should handle undefined duration', () => {
      expect(formatDurationForMSP(undefined)).toBe('PT0H0M0S')
    })

    it('should handle fractional days by rounding', () => {
      expect(formatDurationForMSP(1.5)).toBe('PT12H0M0S')
    })
  })

  describe('parseMSPDuration', () => {
    it('should parse PT8H0M0S to 1 day', () => {
      expect(parseMSPDuration('PT8H0M0S')).toBe(1)
    })

    it('should parse PT40H0M0S to 5 days', () => {
      expect(parseMSPDuration('PT40H0M0S')).toBe(5)
    })

    it('should parse P5D format', () => {
      expect(parseMSPDuration('P5D')).toBe(5)
    })

    it('should handle empty string', () => {
      expect(parseMSPDuration('')).toBe(0)
    })

    it('should round up partial days', () => {
      expect(parseMSPDuration('PT12H0M0S')).toBe(2) // 12 hours = 1.5 days, ceil = 2
    })
  })

  it('should be approximately reversible', () => {
    const durations = [1, 5, 10, 20]
    durations.forEach((days) => {
      const formatted = formatDurationForMSP(days)
      const parsed = parseMSPDuration(formatted)
      expect(parsed).toBe(days)
    })
  })
})

// =============================================
// Date Formatting Tests
// =============================================

describe('Date Formatting', () => {
  describe('formatDateForMSP', () => {
    it('should format ISO date to MSP format', () => {
      const result = formatDateForMSP('2025-01-15')
      expect(result).toMatch(/^2025-01-15T/)
    })

    it('should handle date with time', () => {
      const result = formatDateForMSP('2025-01-15T08:00:00')
      expect(result).toBe('2025-01-15T08:00:00')
    })

    it('should handle null date', () => {
      expect(formatDateForMSP(null)).toBeNull()
    })

    it('should handle undefined date', () => {
      expect(formatDateForMSP(undefined)).toBeNull()
    })
  })

  describe('parseMSPDate', () => {
    it('should parse MSP date to ISO date', () => {
      const result = parseMSPDate('2025-01-15T08:00:00')
      expect(result).toBe('2025-01-15')
    })

    it('should handle null', () => {
      expect(parseMSPDate(null)).toBeNull()
    })

    it('should handle empty string as null', () => {
      expect(parseMSPDate('')).toBeNull()
    })
  })
})

// =============================================
// Activity Filtering Tests
// =============================================

describe('Activity Filtering', () => {
  const activities = createSampleActivities(10)

  describe('filterType', () => {
    it('should return all activities for "all" filter', () => {
      const filtered = filterActivitiesForExport(activities, {
        format: 'ms_project_xml',
        filterType: 'all',
      })
      expect(filtered.length).toBe(10)
    })

    it('should filter milestones only', () => {
      const filtered = filterActivitiesForExport(activities, {
        format: 'ms_project_xml',
        filterType: 'milestones',
      })
      expect(filtered.every((a) => a.is_milestone)).toBe(true)
    })

    it('should filter critical path only', () => {
      const activitiesWithCritical = activities.map((a, i) => ({
        ...a,
        is_critical: i < 3,
        is_on_critical_path: i === 3,
      }))
      const filtered = filterActivitiesForExport(activitiesWithCritical, {
        format: 'ms_project_xml',
        filterType: 'critical_path',
      })
      expect(filtered.length).toBe(4)
    })
  })

  describe('date filtering', () => {
    it('should filter by start date', () => {
      const filtered = filterActivitiesForExport(activities, {
        format: 'ms_project_xml',
        filterType: 'all',
        dateFrom: '2025-01-25',
      })
      expect(filtered.length).toBeLessThan(activities.length)
    })

    it('should filter by end date', () => {
      const filtered = filterActivitiesForExport(activities, {
        format: 'ms_project_xml',
        filterType: 'all',
        dateTo: '2025-01-20',
      })
      expect(filtered.length).toBeLessThan(activities.length)
    })

    it('should filter by date range', () => {
      const filtered = filterActivitiesForExport(activities, {
        format: 'ms_project_xml',
        filterType: 'all',
        dateFrom: '2025-01-20',
        dateTo: '2025-01-30',
      })
      expect(filtered.length).toBeLessThan(activities.length)
    })
  })

  describe('includeCompleted', () => {
    it('should exclude completed activities when false', () => {
      const activitiesWithCompleted = activities.map((a, i) => ({
        ...a,
        status: i < 3 ? 'completed' as const : 'in_progress' as const,
      }))
      const filtered = filterActivitiesForExport(activitiesWithCompleted, {
        format: 'ms_project_xml',
        filterType: 'all',
        includeCompleted: false,
      })
      expect(filtered.length).toBe(7)
    })

    it('should include completed activities when true', () => {
      const activitiesWithCompleted = activities.map((a, i) => ({
        ...a,
        status: i < 3 ? 'completed' as const : 'in_progress' as const,
      }))
      const filtered = filterActivitiesForExport(activitiesWithCompleted, {
        format: 'ms_project_xml',
        filterType: 'all',
        includeCompleted: true,
      })
      expect(filtered.length).toBe(10)
    })
  })
})

// =============================================
// MS Project XML Generation Tests
// =============================================

describe('MS Project XML Generation', () => {
  const activities = createSampleActivities(5)
  const dependencies = createSampleDependencies(activities)

  it('should generate valid XML with proper header', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
      projectName: 'Test Project',
    })

    expect(result.content).toContain('<?xml version="1.0"')
    expect(result.content).toContain('<Project xmlns="http://schemas.microsoft.com/project">')
    expect(result.content).toContain('</Project>')
  })

  it('should include project metadata', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
      projectName: 'My Test Project',
      projectNumber: 'PROJ-001',
    })

    expect(result.content).toContain('<Name>My Test Project</Name>')
    expect(result.content).toContain('PROJ-001')
  })

  it('should include calendar section', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(result.content).toContain('<Calendars>')
    expect(result.content).toContain('<Calendar>')
    expect(result.content).toContain('<Name>Standard</Name>')
    expect(result.content).toContain('</Calendars>')
  })

  it('should include tasks section', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(result.content).toContain('<Tasks>')
    expect(result.content).toContain('</Tasks>')
  })

  it('should include project summary task (UID 0)', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(result.content).toContain('<UID>0</UID>')
    expect(result.content).toContain('<ID>0</ID>')
    expect(result.content).toContain('<Summary>1</Summary>')
  })

  it('should include all activities as tasks', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    activities.forEach((activity, i) => {
      expect(result.content).toContain(`<UID>${i + 1}</UID>`)
      expect(result.content).toContain(`<Name>${activity.name}</Name>`)
    })
  })

  it('should include predecessor links', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
      includeDependencies: true,
    })

    expect(result.content).toContain('<PredecessorLink>')
    expect(result.content).toContain('<PredecessorUID>')
    expect(result.content).toContain('</PredecessorLink>')
  })

  it('should escape special characters in task names', () => {
    const activitiesWithSpecialChars = [
      createMockActivity({
        id: 'special-1',
        name: 'Task with <brackets> & "quotes"',
      }),
    ]

    const result = generateMSProjectXML('project-1', activitiesWithSpecialChars, [], {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(result.content).toContain('&lt;brackets&gt;')
    expect(result.content).toContain('&amp;')
    expect(result.content).toContain('&quot;quotes&quot;')
  })

  it('should include WBS code', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    activities.forEach((activity) => {
      if (activity.wbs_code) {
        expect(result.content).toContain(`<WBS>${activity.wbs_code}</WBS>`)
      }
    })
  })

  it('should format duration correctly', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    // 10 days = 80 hours
    expect(result.content).toContain('PT80H0M0S')
  })

  it('should mark milestones', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    // Last activity is a milestone
    expect(result.content).toContain('<Milestone>1</Milestone>')
  })

  it('should return correct filename', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
      projectName: 'My Project',
    })

    expect(result.filename).toMatch(/^My_Project_\d{4}-\d{2}-\d{2}\.xml$/)
  })

  it('should return correct activity count', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(result.activityCount).toBe(5)
  })

  it('should return correct dependency count', () => {
    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
      includeDependencies: true,
    })

    expect(result.dependencyCount).toBe(dependencies.length)
  })

  it('should throw error for too many activities', () => {
    const manyActivities = createSampleActivities(MAX_EXPORT_ACTIVITIES + 1)

    expect(() => {
      generateMSProjectXML('project-1', manyActivities, [], {
        format: 'ms_project_xml',
        filterType: 'all',
      })
    }).toThrow(/Export limit exceeded/)
  })
})

// =============================================
// Primavera P6 XER Generation Tests
// =============================================

describe('Primavera P6 XER Generation', () => {
  const activities = createSampleActivities(5)
  const dependencies = createSampleDependencies(activities)

  it('should generate XER format with header', () => {
    const result = generatePrimaveraXER('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
      projectName: 'Test Project',
    })

    expect(result.content).toContain('ERMHDR')
  })

  it('should include PROJECT table', () => {
    const result = generatePrimaveraXER('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
      projectName: 'Test Project',
    })

    expect(result.content).toContain('%T\tPROJECT')
    expect(result.content).toContain('%F\tproj_id')
  })

  it('should include TASK table', () => {
    const result = generatePrimaveraXER('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
    })

    expect(result.content).toContain('%T\tTASK')
    expect(result.content).toContain('%F\ttask_id')
  })

  it('should include TASKPRED table for dependencies', () => {
    const result = generatePrimaveraXER('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
      includeDependencies: true,
    })

    expect(result.content).toContain('%T\tTASKPRED')
    expect(result.content).toContain('%F\ttask_pred_id')
  })

  it('should have correct file extension', () => {
    const result = generatePrimaveraXER('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
    })

    expect(result.filename).toMatch(/\.xer$/)
  })

  it('should return correct mime type', () => {
    const result = generatePrimaveraXER('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
    })

    expect(result.mimeType).toBe('application/octet-stream')
  })

  it('should end with %E marker', () => {
    const result = generatePrimaveraXER('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
    })

    expect(result.content).toContain('%E')
  })
})

// =============================================
// CSV Export Tests
// =============================================

describe('CSV Export', () => {
  const activities = createSampleActivities(5)
  const dependencies = createSampleDependencies(activities)

  it('should include header row', () => {
    const result = generateCSVExport('project-1', activities, dependencies, {
      format: 'csv',
      filterType: 'all',
    })

    expect(result.content).toContain('ID,Activity ID,Name,WBS Code')
  })

  it('should include all activities', () => {
    const result = generateCSVExport('project-1', activities, dependencies, {
      format: 'csv',
      filterType: 'all',
    })

    activities.forEach((activity) => {
      expect(result.content).toContain(activity.activity_id)
      expect(result.content).toContain(activity.name)
    })
  })

  it('should escape commas in values', () => {
    const activitiesWithCommas = [
      createMockActivity({
        name: 'Task, with comma',
        notes: 'Notes, with, commas',
      }),
    ]

    const result = generateCSVExport('project-1', activitiesWithCommas, [], {
      format: 'csv',
      filterType: 'all',
    })

    expect(result.content).toContain('"Task, with comma"')
  })

  it('should escape quotes in values', () => {
    const activitiesWithQuotes = [
      createMockActivity({
        name: 'Task with "quotes"',
      }),
    ]

    const result = generateCSVExport('project-1', activitiesWithQuotes, [], {
      format: 'csv',
      filterType: 'all',
    })

    expect(result.content).toContain('"Task with ""quotes"""')
  })

  it('should have correct file extension', () => {
    const result = generateCSVExport('project-1', activities, dependencies, {
      format: 'csv',
      filterType: 'all',
    })

    expect(result.filename).toMatch(/\.csv$/)
  })

  it('should return correct mime type', () => {
    const result = generateCSVExport('project-1', activities, dependencies, {
      format: 'csv',
      filterType: 'all',
    })

    expect(result.mimeType).toBe('text/csv')
  })

  it('should include predecessor information', () => {
    const result = generateCSVExport('project-1', activities, dependencies, {
      format: 'csv',
      filterType: 'all',
      includeDependencies: true,
    })

    expect(result.content).toContain('Predecessors')
  })
})

// =============================================
// Export Function Tests
// =============================================

describe('exportSchedule', () => {
  const activities = createSampleActivities(5)
  const dependencies = createSampleDependencies(activities)

  it('should route to MS Project export', () => {
    const result = exportSchedule('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(result.filename).toMatch(/\.xml$/)
    expect(result.content).toContain('<Project')
  })

  it('should route to Primavera export', () => {
    const result = exportSchedule('project-1', activities, dependencies, {
      format: 'primavera_xer',
      filterType: 'all',
    })

    expect(result.filename).toMatch(/\.xer$/)
    expect(result.content).toContain('ERMHDR')
  })

  it('should route to CSV export', () => {
    const result = exportSchedule('project-1', activities, dependencies, {
      format: 'csv',
      filterType: 'all',
    })

    expect(result.filename).toMatch(/\.csv$/)
    expect(result.content).toContain('ID,Activity ID')
  })

  it('should throw for unsupported format', () => {
    expect(() => {
      exportSchedule('project-1', activities, dependencies, {
        format: 'unknown' as any,
        filterType: 'all',
      })
    }).toThrow(/Unsupported export format/)
  })
})

// =============================================
// Validation Tests
// =============================================

describe('validateExportOptions', () => {
  it('should return null for valid options', () => {
    const error = validateExportOptions({
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(error).toBeNull()
  })

  it('should return error for invalid date range', () => {
    const error = validateExportOptions({
      format: 'ms_project_xml',
      filterType: 'all',
      dateFrom: '2025-02-01',
      dateTo: '2025-01-01',
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('Invalid date range')
  })

  it('should allow valid date range', () => {
    const error = validateExportOptions({
      format: 'ms_project_xml',
      filterType: 'all',
      dateFrom: '2025-01-01',
      dateTo: '2025-02-01',
    })

    expect(error).toBeNull()
  })
})

// =============================================
// Size Estimation Tests
// =============================================

describe('estimateExportSize', () => {
  it('should estimate MS Project XML size', () => {
    const estimate = estimateExportSize(100, 'ms_project_xml')
    expect(estimate.bytes).toBeGreaterThan(0)
    expect(estimate.formatted).toMatch(/KB|MB|B/)
  })

  it('should estimate Primavera XER size', () => {
    const estimate = estimateExportSize(100, 'primavera_xer')
    expect(estimate.bytes).toBeLessThan(estimateExportSize(100, 'ms_project_xml').bytes)
  })

  it('should estimate CSV size', () => {
    const estimate = estimateExportSize(100, 'csv')
    expect(estimate.bytes).toBeLessThan(estimateExportSize(100, 'primavera_xer').bytes)
  })

  it('should format bytes correctly', () => {
    const small = estimateExportSize(1, 'csv')
    expect(small.formatted).toMatch(/B$/)

    const medium = estimateExportSize(1000, 'ms_project_xml')
    expect(medium.formatted).toMatch(/KB|MB/)
  })
})

// =============================================
// Round-Trip Tests (Export -> Import -> Verify)
// =============================================

describe('Round-trip validation', () => {
  it('should export and have parseable XML', () => {
    const activities = createSampleActivities(5)
    const dependencies = createSampleDependencies(activities)

    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    // Parse the XML to verify it's valid
    const parser = new DOMParser()
    const doc = parser.parseFromString(result.content, 'text/xml')

    // Check for parse errors
    const parseError = doc.querySelector('parsererror')
    expect(parseError).toBeNull()

    // Verify structure
    const project = doc.querySelector('Project')
    expect(project).not.toBeNull()

    const tasks = doc.querySelectorAll('Task')
    expect(tasks.length).toBe(activities.length + 1) // +1 for project summary
  })

  it('should preserve activity data in round-trip', () => {
    const original = createMockActivity({
      id: 'test-1',
      name: 'Test Task',
      planned_start: '2025-01-15',
      planned_finish: '2025-01-25',
      planned_duration: 10,
      percent_complete: 50,
      is_milestone: false,
      wbs_code: '1.1.1',
    })

    const result = generateMSProjectXML('project-1', [original], [], {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    // Parse and verify
    const parser = new DOMParser()
    const doc = parser.parseFromString(result.content, 'text/xml')

    const task = doc.querySelectorAll('Task')[1] // Skip project summary
    expect(task.querySelector('Name')?.textContent).toBe(original.name)
    expect(task.querySelector('PercentComplete')?.textContent).toBe('50')
    expect(task.querySelector('WBS')?.textContent).toBe(original.wbs_code)
  })
})

// =============================================
// Large Dataset Tests
// =============================================

describe('Large dataset handling', () => {
  it('should handle 1000 activities', () => {
    const activities = createSampleActivities(1000)

    const result = generateMSProjectXML('project-1', activities, [], {
      format: 'ms_project_xml',
      filterType: 'all',
    })

    expect(result.activityCount).toBe(1000)
    expect(result.content.length).toBeGreaterThan(0)
  })

  it('should handle activities with many dependencies', () => {
    const activities = createSampleActivities(100)
    const dependencies: ScheduleDependency[] = []

    // Create a web of dependencies (each activity depends on 3 others)
    for (let i = 3; i < activities.length; i++) {
      dependencies.push(
        createMockDependency(activities[i - 1].id, activities[i].id),
        createMockDependency(activities[i - 2].id, activities[i].id),
        createMockDependency(activities[i - 3].id, activities[i].id)
      )
    }

    const result = generateMSProjectXML('project-1', activities, dependencies, {
      format: 'ms_project_xml',
      filterType: 'all',
      includeDependencies: true,
    })

    expect(result.activityCount).toBe(100)
    expect(result.content).toContain('<PredecessorLink>')
  })
})
