/**
 * Schedule PDF Export Tests
 * Tests for master schedule PDF generation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { jsPDF } from 'jspdf'

// Mock jsPDF
const mockSetFillColor = vi.fn()
const mockRect = vi.fn()
const mockRoundedRect = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockSetTextColor = vi.fn()
const mockText = vi.fn()
const mockAddPage = vi.fn()
const mockSave = vi.fn()
const mockGetWidth = vi.fn(() => 279.4) // Landscape letter width
const mockGetHeight = vi.fn(() => 215.9) // Landscape letter height

const mockJsPDF = {
  setFillColor: mockSetFillColor,
  rect: mockRect,
  roundedRect: mockRoundedRect,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  setTextColor: mockSetTextColor,
  text: mockText,
  addPage: mockAddPage,
  save: mockSave,
  internal: {
    pageSize: {
      getWidth: mockGetWidth,
      getHeight: mockGetHeight,
    },
  },
  lastAutoTable: { finalY: 100 },
} as unknown as jsPDF

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => mockJsPDF),
}))

// Mock autoTable - use vi.fn() directly in factory
vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

// Mock date-fns - use vi.fn() directly in factory
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15'
    return '2024-01-15'
  }),
  parseISO: vi.fn((dateStr: string) => new Date(dateStr)),
}))

// Mock pdfBranding utilities - use vi.fn() directly in factory
vi.mock('@/lib/utils/pdfBranding', () => ({
  getCompanyInfo: vi.fn(),
  addDocumentHeader: vi.fn(async () => 40),
  addFootersToAllPages: vi.fn(),
}))

// Import functions after mocking
import { generateSchedulePdf, exportScheduleToPdf } from '../schedulePdfExport'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { getCompanyInfo, addDocumentHeader, addFootersToAllPages } from '@/lib/utils/pdfBranding'
import type { ScheduleActivity, ScheduleStats } from '@/types/schedule-activities'

describe('Schedule PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock company info
    vi.mocked(getCompanyInfo).mockResolvedValue({
      name: 'Test Construction Co',
      address: '123 Main St, TestCity, TS, 12345',
    })
  })

  describe('generateSchedulePdf', () => {
    const mockActivities: ScheduleActivity[] = [
      {
        id: 'act-1',
        activity_id: 'A1000',
        name: 'Site Mobilization',
        status: 'completed',
        planned_start: '2024-01-01',
        planned_finish: '2024-01-05',
        planned_duration: 5,
        percent_complete: 100,
        is_milestone: true,
        is_critical: false,
        baseline_start: '2024-01-01',
        baseline_finish: '2024-01-05',
      },
      {
        id: 'act-2',
        activity_id: 'A2000',
        name: 'Foundation Work',
        status: 'in_progress',
        planned_start: '2024-01-06',
        planned_finish: '2024-01-20',
        planned_duration: 15,
        percent_complete: 60,
        is_milestone: false,
        is_critical: true,
        baseline_start: '2024-01-06',
        baseline_finish: '2024-01-18',
      },
    ] as unknown as ScheduleActivity[]

    const mockStats: ScheduleStats = {
      total_activities: 25,
      completed_activities: 10,
      in_progress_activities: 8,
      not_started_activities: 7,
      critical_activities: 5,
      overall_progress: 45,
      on_time_percentage: 80,
      days_ahead_behind: -2,
    }

    it('should generate basic schedule PDF', async () => {
      const doc = await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Office Building',
        activities: mockActivities,
      })

      expect(doc).toBeDefined()
      expect(doc).toBe(mockJsPDF)
    })

    it('should fetch company info when not provided', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
      })

      expect(getCompanyInfo).toHaveBeenCalledWith('proj-1')
    })

    it('should use provided company info', async () => {
      const gcCompany = {
        name: 'Custom GC',
        address: '456 Other St',
      }

      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        gcCompany,
      })

      expect(getCompanyInfo).not.toHaveBeenCalled()
    })

    it('should add document header with project name', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Office Building',
        activities: mockActivities,
      })

      expect(addDocumentHeader).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          documentTitle: 'Office Building',
          documentType: 'MASTER SCHEDULE',
        })
      )
    })

    it('should include project number in document title when provided', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Office Building',
        projectNumber: 'P-2024-001',
        activities: mockActivities,
      })

      expect(addDocumentHeader).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          documentTitle: 'Office Building (P-2024-001)',
        })
      )
    })

    it('should render summary statistics when provided', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        stats: mockStats,
      })

      expect(mockRoundedRect).toHaveBeenCalled()
      expect(mockText).toHaveBeenCalledWith('25', expect.any(Number), expect.any(Number), expect.any(Object))
      expect(mockText).toHaveBeenCalledWith('Total', expect.any(Number), expect.any(Number), expect.any(Object))
      expect(mockText).toHaveBeenCalledWith('45%', expect.any(Number), expect.any(Number), expect.any(Object))
    })

    it('should not render statistics when not provided', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
      })

      const roundedRectCalls = vi.mocked(mockRoundedRect).mock.calls
      expect(roundedRectCalls.length).toBe(0)
    })

    it('should render milestones table when includeMilestones is true', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeMilestones: true,
      })

      expect(mockText).toHaveBeenCalledWith('Key Milestones', expect.any(Number), expect.any(Number))
      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: expect.arrayContaining([
            expect.arrayContaining(['ID', 'Milestone']),
          ]),
          body: expect.arrayContaining([
            expect.arrayContaining(['A1000']),
          ]),
        })
      )
    })

    it('should not render milestones table when includeMilestones is false', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeMilestones: false,
      })

      const milestoneCalls = vi.mocked(mockText).mock.calls.filter(call =>
        call[0]?.toString().includes('Key Milestones')
      )
      expect(milestoneCalls.length).toBe(0)
    })

    it('should include baseline columns when includeBaseline is true', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeMilestones: true,
        includeBaseline: true,
      })

      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: expect.arrayContaining([
            expect.arrayContaining(['Baseline', 'Variance']),
          ]),
        })
      )
    })

    it('should exclude baseline columns when includeBaseline is false', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeMilestones: true,
        includeBaseline: false,
      })

      const autoTableCalls = vi.mocked(autoTable).mock.calls
      const milestoneTableCall = autoTableCalls.find(call => {
        const config = call[1] as any
        return config.head?.[0]?.includes('Milestone')
      })

      expect(milestoneTableCall).toBeDefined()
      const headers = (milestoneTableCall![1] as any).head[0]
      expect(headers).not.toContain('Baseline')
      expect(headers).not.toContain('Variance')
    })

    it('should truncate long milestone names to 40 characters', async () => {
      const activitiesWithLongName: ScheduleActivity[] = [
        {
          id: 'act-1',
          activity_id: 'M1',
          name: 'This is a very long milestone name that exceeds forty characters and should be truncated',
          status: 'not_started',
          is_milestone: true,
          planned_finish: '2024-01-15',
          percent_complete: 0,
        } as unknown as ScheduleActivity,
      ]

      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: activitiesWithLongName,
        includeMilestones: true,
      })

      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.arrayContaining([
              expect.stringMatching(/^.{40}\.\.\./),
            ]),
          ]),
        })
      )
    })

    it('should render all activities table when includeAllActivities is true', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeAllActivities: true,
      })

      expect(mockText).toHaveBeenCalledWith('Schedule Activities', expect.any(Number), expect.any(Number))
      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: [['ID', 'Activity Name', 'Start', 'Finish', 'Dur.', 'Status', '%', 'Crit.']],
          body: expect.arrayContaining([
            expect.arrayContaining(['A1000', expect.any(String)]),
            expect.arrayContaining(['A2000', expect.any(String)]),
          ]),
        })
      )
    })

    it('should not render activities table when includeAllActivities is false', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeAllActivities: false,
      })

      const activitiesCalls = vi.mocked(mockText).mock.calls.filter(call =>
        call[0]?.toString().includes('Schedule Activities')
      )
      expect(activitiesCalls.length).toBe(0)
    })

    it('should mark critical activities with "Yes" indicator', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeAllActivities: true,
      })

      const autoTableCalls = vi.mocked(autoTable).mock.calls
      const activitiesTableCall = autoTableCalls.find(call => {
        const config = call[1] as any
        return config.head?.[0]?.includes('Crit.')
      })

      expect(activitiesTableCall).toBeDefined()
      const tableBody = (activitiesTableCall![1] as any).body
      expect(tableBody).toContainEqual(expect.arrayContaining(['Yes']))
    })

    it('should format dates correctly in tables', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        includeAllActivities: true,
      })

      expect(parseISO).toHaveBeenCalled()
      expect(format).toHaveBeenCalled()
    })

    it('should add footers to all pages', async () => {
      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
      })

      expect(addFootersToAllPages).toHaveBeenCalledWith(mockJsPDF)
    })

    it('should use landscape orientation by default', async () => {
      const jsPDFConstructor = vi.mocked((await import('jspdf')).jsPDF)

      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
      })

      expect(jsPDFConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          orientation: 'landscape',
        })
      )
    })

    it('should use portrait orientation when specified', async () => {
      const jsPDFConstructor = vi.mocked((await import('jspdf')).jsPDF)

      await generateSchedulePdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
        orientation: 'portrait',
      })

      expect(jsPDFConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          orientation: 'portrait',
        })
      )
    })
  })

  describe('exportScheduleToPdf', () => {
    const mockActivities: ScheduleActivity[] = [
      {
        id: 'act-1',
        activity_id: 'A1',
        name: 'Test Activity',
        status: 'completed',
      } as unknown as ScheduleActivity,
    ]

    it('should call save with sanitized filename', async () => {
      await exportScheduleToPdf({
        projectId: 'proj-1',
        projectName: 'Office Building',
        activities: mockActivities,
      })

      expect(mockSave).toHaveBeenCalledWith('Office_Building_Schedule_2024-01-15.pdf')
    })

    it('should sanitize special characters in project name', async () => {
      await exportScheduleToPdf({
        projectId: 'proj-1',
        projectName: 'Project @#$% with Special! Characters',
        activities: mockActivities,
      })

      // Special characters replaced with underscores
      expect(mockSave).toHaveBeenCalledWith(
        'Project______with_Special__Characters_Schedule_2024-01-15.pdf'
      )
    })

    it('should include current date in filename', async () => {
      await exportScheduleToPdf({
        projectId: 'proj-1',
        projectName: 'Test Project',
        activities: mockActivities,
      })

      expect(mockSave).toHaveBeenCalledWith('Test_Project_Schedule_2024-01-15.pdf')
      expect(format).toHaveBeenCalledWith(expect.any(Date), 'yyyy-MM-dd')
    })
  })
})
