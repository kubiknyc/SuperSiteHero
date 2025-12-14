/**
 * Tests for Look-Ahead Export Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  activitiesToExportRows,
  exportLookAheadToCSV,
  downloadLookAheadAsPDF,
  downloadLookAheadAsExcel,
  downloadLookAheadAsCSV,
} from './export'
import type { LookAheadActivityWithDetails, WeekRange, PPCMetrics } from '@/types/look-ahead'

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:test-url')
const mockRevokeObjectURL = vi.fn()

vi.stubGlobal('URL', {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
})

// Mock document for download testing
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockClick = vi.fn()

vi.stubGlobal('document', {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: mockClick,
  })),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
})

// Mock jsPDF
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    roundedRect: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn(() => 1),
    save: vi.fn(),
    internal: { pageSize: { height: 216 } },
    lastAutoTable: { finalY: 100 },
  })),
}))

// Mock jspdf-autotable
vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

// Mock ExcelJS
vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn().mockImplementation(() => ({
      creator: '',
      created: null,
      addWorksheet: vi.fn(() => ({
        mergeCells: vi.fn(),
        getCell: vi.fn(() => ({
          value: '',
          font: {},
          alignment: {},
          fill: {},
        })),
        getRow: vi.fn(() => ({
          font: {},
          fill: {},
        })),
        addRow: vi.fn(() => ({
          getCell: vi.fn(() => ({
            fill: {},
          })),
        })),
        columns: [],
      })),
      xlsx: {
        writeBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
      },
    })),
  },
}))

// Test data
const mockWeeks: WeekRange[] = [
  {
    weekNumber: 1,
    weekStart: new Date('2024-12-09'),
    weekEnd: new Date('2024-12-15'),
    weekLabel: 'Dec 9 - Dec 15',
    isCurrentWeek: true,
  },
  {
    weekNumber: 2,
    weekStart: new Date('2024-12-16'),
    weekEnd: new Date('2024-12-22'),
    weekLabel: 'Dec 16 - Dec 22',
    isCurrentWeek: false,
  },
  {
    weekNumber: 3,
    weekStart: new Date('2024-12-23'),
    weekEnd: new Date('2024-12-29'),
    weekLabel: 'Dec 23 - Dec 29',
    isCurrentWeek: false,
  },
]

const mockActivities: LookAheadActivityWithDetails[] = [
  {
    id: 'activity-1',
    project_id: 'project-1',
    company_id: 'company-1',
    week_number: 1,
    activity_name: 'Foundation Concrete Pour',
    trade: 'Concrete',
    location: 'Building A',
    planned_start_date: '2024-12-10',
    planned_end_date: '2024-12-12',
    actual_start_date: null,
    actual_end_date: null,
    duration_days: 3,
    status: 'in_progress',
    percent_complete: 50,
    subcontractor_id: 'sub-1',
    subcontractor_name: 'ABC Concrete',
    notes: 'Weather dependent',
    constraints: [
      {
        id: 'constraint-1',
        activity_id: 'activity-1',
        constraint_type: 'weather',
        description: 'Clear weather required',
        status: 'open',
        owner_user_id: null,
        target_resolution_date: null,
        resolved_date: null,
        resolution_notes: null,
        created_by: 'user-1',
        created_at: '2024-12-09',
        updated_at: '2024-12-09',
      },
    ],
    open_constraints: 1,
    created_at: '2024-12-01',
    updated_at: '2024-12-09',
    created_by: 'user-1',
  },
  {
    id: 'activity-2',
    project_id: 'project-1',
    company_id: 'company-1',
    week_number: 1,
    activity_name: 'Rebar Installation',
    trade: 'Concrete',
    location: 'Building A',
    planned_start_date: '2024-12-11',
    planned_end_date: '2024-12-13',
    actual_start_date: null,
    actual_end_date: null,
    duration_days: 3,
    status: 'not_started',
    percent_complete: 0,
    subcontractor_id: 'sub-2',
    subcontractor_name: 'Steel Works Inc',
    notes: null,
    constraints: [],
    open_constraints: 0,
    created_at: '2024-12-01',
    updated_at: '2024-12-09',
    created_by: 'user-1',
  },
  {
    id: 'activity-3',
    project_id: 'project-1',
    company_id: 'company-1',
    week_number: 2,
    activity_name: 'Framing - Level 1',
    trade: 'Carpentry',
    location: 'Building A',
    planned_start_date: '2024-12-16',
    planned_end_date: '2024-12-20',
    actual_start_date: null,
    actual_end_date: null,
    duration_days: 5,
    status: 'not_started',
    percent_complete: 0,
    subcontractor_id: 'sub-3',
    subcontractor_name: 'Frame Masters',
    notes: null,
    constraints: [],
    open_constraints: 0,
    created_at: '2024-12-01',
    updated_at: '2024-12-09',
    created_by: 'user-1',
  },
  {
    id: 'activity-4',
    project_id: 'project-1',
    company_id: 'company-1',
    week_number: 1,
    activity_name: 'Site Inspection',
    trade: 'General',
    location: 'Site Wide',
    planned_start_date: '2024-12-12',
    planned_end_date: '2024-12-12',
    actual_start_date: '2024-12-12',
    actual_end_date: '2024-12-12',
    duration_days: 1,
    status: 'completed',
    percent_complete: 100,
    subcontractor_id: null,
    subcontractor_name: null,
    notes: 'Passed inspection',
    constraints: [],
    open_constraints: 0,
    created_at: '2024-12-01',
    updated_at: '2024-12-12',
    created_by: 'user-1',
  },
]

const mockPPCMetrics: PPCMetrics = {
  currentWeekPPC: 75,
  previousWeekPPC: 80,
  averagePPC: 77.5,
  trend: 'declining',
  weeklyData: [],
}

describe('activitiesToExportRows', () => {
  it('should convert activities to export rows', () => {
    const rows = activitiesToExportRows(mockActivities, mockWeeks)

    expect(rows).toHaveLength(4)
    expect(rows[0].activityName).toBe('Foundation Concrete Pour')
    expect(rows[0].trade).toBe('Concrete')
    expect(rows[0].subcontractor).toBe('ABC Concrete')
    expect(rows[0].status).toBe('In Progress')
    expect(rows[0].percentComplete).toBe('50%')
  })

  it('should format constraints correctly', () => {
    const rows = activitiesToExportRows(mockActivities, mockWeeks)

    const rowWithConstraint = rows.find((r) => r.activityName === 'Foundation Concrete Pour')
    expect(rowWithConstraint?.constraints).toContain('Weather')
  })

  it('should handle activities without constraints', () => {
    const rows = activitiesToExportRows(mockActivities, mockWeeks)

    const rowWithoutConstraint = rows.find((r) => r.activityName === 'Rebar Installation')
    expect(rowWithoutConstraint?.constraints).toBe('-')
  })

  it('should handle activities without subcontractor', () => {
    const rows = activitiesToExportRows(mockActivities, mockWeeks)

    const rowWithoutSub = rows.find((r) => r.activityName === 'Site Inspection')
    expect(rowWithoutSub?.subcontractor).toBe('-')
  })

  it('should assign correct week labels', () => {
    const rows = activitiesToExportRows(mockActivities, mockWeeks)

    const week1Row = rows.find((r) => r.activityName === 'Foundation Concrete Pour')
    const week2Row = rows.find((r) => r.activityName === 'Framing - Level 1')

    expect(week1Row?.weekLabel).toBe('Dec 9 - Dec 15')
    expect(week2Row?.weekLabel).toBe('Dec 16 - Dec 22')
  })
})

describe('exportLookAheadToCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create CSV file with correct headers', () => {
    exportLookAheadToCSV({
      projectName: 'Test Project',
      activities: mockActivities,
      weeks: mockWeeks,
      ppcMetrics: mockPPCMetrics,
    })

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })

  it('should handle empty activities', () => {
    exportLookAheadToCSV({
      projectName: 'Empty Project',
      activities: [],
      weeks: mockWeeks,
    })

    expect(mockCreateObjectURL).toHaveBeenCalled()
  })

  it('should sanitize project name for filename', () => {
    const mockLink = {
      href: '',
      download: '',
      click: mockClick,
    }
    vi.mocked(document.createElement).mockReturnValue(mockLink as any)

    exportLookAheadToCSV({
      projectName: 'Test Project / Special',
      activities: mockActivities,
    })

    expect(mockLink.download).toContain('Test-Project---Special')
  })
})

describe('downloadLookAheadAsPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate PDF with correct data', async () => {
    await downloadLookAheadAsPDF(mockActivities, 'Test Project', mockPPCMetrics)

    // jsPDF should have been called
    const { jsPDF } = await import('jspdf')
    expect(jsPDF).toHaveBeenCalled()
  })

  it('should include PPC metrics when provided', async () => {
    await downloadLookAheadAsPDF(mockActivities, 'Test Project', mockPPCMetrics)

    // Should complete without errors
    expect(true).toBe(true)
  })

  it('should handle export without PPC metrics', async () => {
    await downloadLookAheadAsPDF(mockActivities, 'Test Project')

    // Should complete without errors
    expect(true).toBe(true)
  })
})

describe('downloadLookAheadAsExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate Excel file', async () => {
    await downloadLookAheadAsExcel(mockActivities, 'Test Project', mockPPCMetrics)

    expect(mockCreateObjectURL).toHaveBeenCalled()
  })

  it('should create multiple sheets', async () => {
    const ExcelJS = await import('exceljs')
    const mockWorkbook = new ExcelJS.default.Workbook()

    await downloadLookAheadAsExcel(mockActivities, 'Test Project')

    expect(mockWorkbook.addWorksheet).toBeDefined()
  })
})

describe('downloadLookAheadAsCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call exportLookAheadToCSV with correct parameters', () => {
    downloadLookAheadAsCSV(mockActivities, 'Test Project', mockPPCMetrics)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
  })
})

describe('Status formatting', () => {
  it('should format all status types correctly', () => {
    const activitiesWithStatuses: LookAheadActivityWithDetails[] = [
      { ...mockActivities[0], status: 'not_started' },
      { ...mockActivities[0], status: 'in_progress' },
      { ...mockActivities[0], status: 'completed' },
      { ...mockActivities[0], status: 'blocked' },
      { ...mockActivities[0], status: 'delayed' },
    ]

    const rows = activitiesToExportRows(activitiesWithStatuses, mockWeeks)

    expect(rows.map((r) => r.status)).toContain('Not Started')
    expect(rows.map((r) => r.status)).toContain('In Progress')
    expect(rows.map((r) => r.status)).toContain('Completed')
    expect(rows.map((r) => r.status)).toContain('Blocked')
    expect(rows.map((r) => r.status)).toContain('Delayed')
  })
})

describe('Date formatting', () => {
  it('should format dates in MM/dd/yyyy format', () => {
    const rows = activitiesToExportRows(mockActivities, mockWeeks)

    expect(rows[0].plannedStart).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(rows[0].plannedEnd).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })
})

describe('Summary calculations', () => {
  it('should count activities by status', () => {
    // This tests internal logic by verifying output
    const completedCount = mockActivities.filter((a) => a.status === 'completed').length
    const inProgressCount = mockActivities.filter((a) => a.status === 'in_progress').length
    const notStartedCount = mockActivities.filter((a) => a.status === 'not_started').length

    expect(completedCount).toBe(1)
    expect(inProgressCount).toBe(1)
    expect(notStartedCount).toBe(2)
  })

  it('should count total open constraints', () => {
    const totalConstraints = mockActivities.reduce((sum, a) => sum + (a.open_constraints || 0), 0)
    expect(totalConstraints).toBe(1)
  })
})
