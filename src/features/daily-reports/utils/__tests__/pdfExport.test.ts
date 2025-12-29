/**
 * Daily Reports PDF Export Tests
 * Comprehensive tests for daily report PDF generation with JobSight branding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { jsPDF } from 'jspdf'

// Use vi.hoisted() for all mocks to ensure proper hoisting
const {
  mockAddPage,
  mockSetFillColor,
  mockRect,
  mockSetTextColor,
  mockSetFontSize,
  mockSetFont,
  mockText,
  mockSetDrawColor,
  mockSetLineWidth,
  mockLine,
  mockRoundedRect,
  mockGetTextWidth,
  mockSplitTextToSize,
  mockOutput,
  mockJsPDF,
  mockAutoTable,
  mockFormat,
  mockGetCompanyInfo,
  mockAddDocumentHeader,
  mockAddFootersToAllPages,
} = vi.hoisted(() => {
  const addPage = vi.fn()
  const setFillColor = vi.fn()
  const rect = vi.fn()
  const setTextColor = vi.fn()
  const setFontSize = vi.fn()
  const setFont = vi.fn()
  const text = vi.fn()
  const setDrawColor = vi.fn()
  const setLineWidth = vi.fn()
  const line = vi.fn()
  const roundedRect = vi.fn()
  const getTextWidth = vi.fn(() => 20)
  const splitTextToSize = vi.fn((t: string) => [t])
  const output = vi.fn(() => new Blob())

  const jsPDFInstance = {
    addPage,
    setFillColor,
    rect,
    setTextColor,
    setFontSize,
    setFont,
    text,
    setDrawColor,
    setLineWidth,
    line,
    roundedRect,
    getTextWidth,
    splitTextToSize,
    output,
    lastAutoTable: { finalY: 100 },
  }

  return {
    mockAddPage: addPage,
    mockSetFillColor: setFillColor,
    mockRect: rect,
    mockSetTextColor: setTextColor,
    mockSetFontSize: setFontSize,
    mockSetFont: setFont,
    mockText: text,
    mockSetDrawColor: setDrawColor,
    mockSetLineWidth: setLineWidth,
    mockLine: line,
    mockRoundedRect: roundedRect,
    mockGetTextWidth: getTextWidth,
    mockSplitTextToSize: splitTextToSize,
    mockOutput: output,
    mockJsPDF: jsPDFInstance,
    mockAutoTable: vi.fn(),
    mockFormat: vi.fn((date: Date, formatStr: string) => {
      if (formatStr === 'MMMM d, yyyy') {return 'January 15, 2025'}
      if (formatStr === 'yyyy-MM-dd') {return '2025-01-15'}
      return '2025-01-15'
    }),
    mockGetCompanyInfo: vi.fn(),
    mockAddDocumentHeader: vi.fn(async () => 40),
    mockAddFootersToAllPages: vi.fn(),
  }
})

// Mock jsPDF constructor
// IMPORTANT: Use regular function (not arrow) so it can be used with 'new' keyword
vi.mock('jspdf', () => ({
  default: vi.fn(function() { return mockJsPDF }),
}))

// Mock autoTable with hoisted mock
vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable,
}))

// Mock date-fns with hoisted mock
vi.mock('date-fns', () => ({
  format: mockFormat,
}))

// Mock pdfBranding utilities with hoisted mocks
vi.mock('@/lib/utils/pdfBranding', () => ({
  getCompanyInfo: mockGetCompanyInfo,
  addDocumentHeader: mockAddDocumentHeader,
  addFootersToAllPages: mockAddFootersToAllPages,
}))

// Import functions after mocking
import {
  generateDailyReportPDF,
  downloadDailyReportPDF,
  type GeneratePDFOptions,
} from '../pdfExport'
import type { DailyReport } from '@/types/database'
import autoTable from 'jspdf-autotable'
import {
  getCompanyInfo,
  addDocumentHeader,
  addFootersToAllPages,
} from '@/lib/utils/pdfBranding'

describe('Daily Reports PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock returns
    vi.mocked(getCompanyInfo).mockResolvedValue({
      name: 'Test Construction Co',
      address: '123 Main St, TestCity, TS, 12345',
    })

    // Mock document.createElement for download tests
    global.document = {
      createElement: vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    } as any

    // Mock URL.createObjectURL
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as any
  })

  describe('generateDailyReportPDF', () => {
    const mockReport: DailyReport = {
      id: 'report-123',
      company_id: 'company-123',
      project_id: 'project-123',
      report_date: '2025-01-15',
      report_number: 1,
      status: 'approved',
      weather_condition: 'Sunny',
      temperature_high: 75,
      temperature_low: 55,
      precipitation: 0,
      wind_speed: 5,
      weather_delays: false,
      weather_delay_notes: null,
      work_completed: 'Completed foundation work and started framing',
      issues: 'Minor delay due to material delivery',
      observations: 'Site conditions good',
      comments: 'Overall progress on schedule',
      created_by: 'user-123',
      created_at: '2025-01-15T08:00:00Z',
      updated_at: '2025-01-15T08:00:00Z',
    } as DailyReport

    const mockOptions: GeneratePDFOptions = {
      report: mockReport,
      workforce: [],
      equipment: [],
      deliveries: [],
      visitors: [],
      photos: [],
      projectName: 'Test Project',
      projectId: 'project-123',
    }

    it('should generate PDF with basic report info', async () => {
      const blob = await generateDailyReportPDF(mockOptions)

      expect(blob).toBeInstanceOf(Blob)
      expect(addDocumentHeader).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          documentTitle: 'Daily Report - January 15, 2025',
          documentType: 'DAILY REPORT',
        })
      )
      expect(addFootersToAllPages).toHaveBeenCalled()
    })

    it('should fetch company info when not provided', async () => {
      await generateDailyReportPDF(mockOptions)

      expect(getCompanyInfo).toHaveBeenCalledWith('project-123')
    })

    it('should use provided company info', async () => {
      const gcCompany = {
        name: 'Custom Company',
        address: '456 Oak St',
      }

      await generateDailyReportPDF({
        ...mockOptions,
        gcCompany,
      })

      expect(getCompanyInfo).not.toHaveBeenCalled()
      expect(addDocumentHeader).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          gcCompany,
        })
      )
    })

    it('should render weather section when weather data exists', async () => {
      await generateDailyReportPDF(mockOptions)

      // Should render weather condition section header
      expect(mockSetFillColor).toHaveBeenCalled()
      expect(mockText).toHaveBeenCalled()
    })

    it('should render weather delays in red when present', async () => {
      const reportWithDelays = {
        ...mockReport,
        weather_delays: true,
        weather_delay_notes: 'Rain delayed concrete pour',
      }

      await generateDailyReportPDF({
        ...mockOptions,
        report: reportWithDelays,
      })

      // Should set text color for delays
      expect(mockSetTextColor).toHaveBeenCalled()
    })

    it('should render workforce table when workers present', async () => {
      const workforce = [
        {
          id: 'w1',
          daily_report_id: 'report-123',
          trade: 'Carpenter',
          worker_count: 5,
          hours_worked: 8,
          activity: 'Framing walls',
        },
        {
          id: 'w2',
          daily_report_id: 'report-123',
          trade: 'Electrician',
          worker_count: 2,
          hours_worked: 6,
          activity: 'Rough-in wiring',
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        workforce,
      })

      // Should call autoTable for workforce
      expect(autoTable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          head: [['Trade/Team', 'Workers', 'Hours', 'Activity']],
          body: [
            ['Carpenter', '5', '8', 'Framing walls'],
            ['Electrician', '2', '6', 'Rough-in wiring'],
          ],
        })
      )
    })

    it('should skip workforce section when empty', async () => {
      await generateDailyReportPDF({
        ...mockOptions,
        workforce: [],
      })

      // Should not create workforce table
      const autoTableCalls = (autoTable as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: any) => call[1]?.head?.[0]?.[0] === 'Trade/Team'
      )
      expect(autoTableCalls.length).toBe(0)
    })

    it('should render equipment table when equipment present', async () => {
      const equipment = [
        {
          id: 'e1',
          daily_report_id: 'report-123',
          equipment_type: 'Excavator',
          quantity: 1,
          owner: 'ABC Rental',
          hours_used: 8,
          notes: 'Good condition',
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        equipment,
      })

      expect(autoTable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          head: [['Equipment Type', 'Qty', 'Owner', 'Hours', 'Notes']],
          body: [['Excavator', '1', 'ABC Rental', '8', 'Good condition']],
        })
      )
    })

    it('should render deliveries table with formatted time', async () => {
      const deliveries = [
        {
          id: 'd1',
          daily_report_id: 'report-123',
          material_description: 'Concrete',
          quantity: '10 yards',
          vendor: 'XYZ Concrete',
          delivery_ticket_number: 'TK-12345',
          delivery_time: '14:30:00',
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        deliveries,
      })

      expect(autoTable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          head: [['Material', 'Quantity', 'Vendor', 'Ticket #', 'Time']],
          body: [['Concrete', '10 yards', 'XYZ Concrete', 'TK-12345', '2:30 PM']],
        })
      )
    })

    it('should format time correctly (AM/PM)', async () => {
      const deliveries = [
        {
          id: 'd1',
          daily_report_id: 'report-123',
          material_description: 'Steel',
          quantity: '2 tons',
          vendor: 'Steel Co',
          delivery_ticket_number: 'ST-001',
          delivery_time: '08:15:00', // Morning
        },
        {
          id: 'd2',
          daily_report_id: 'report-123',
          material_description: 'Lumber',
          quantity: '500 boards',
          vendor: 'Lumber Co',
          delivery_ticket_number: 'LB-002',
          delivery_time: '16:45:00', // Afternoon
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        deliveries,
      })

      const deliveryCall = (autoTable as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: any) => call[1]?.head?.[0]?.[0] === 'Material'
      )

      expect(deliveryCall[1].body).toEqual([
        ['Steel', '2 tons', 'Steel Co', 'ST-001', '8:15 AM'],
        ['Lumber', '500 boards', 'Lumber Co', 'LB-002', '4:45 PM'],
      ])
    })

    it('should render visitors table', async () => {
      const visitors = [
        {
          id: 'v1',
          daily_report_id: 'report-123',
          visitor_name: 'John Inspector',
          company: 'City Building Dept',
          purpose: 'Electrical inspection',
          arrival_time: '10:00:00',
          departure_time: '11:30:00',
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        visitors,
      })

      expect(autoTable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          head: [['Visitor Name', 'Company', 'Purpose', 'Arrival', 'Departure']],
          body: [['John Inspector', 'City Building Dept', 'Electrical inspection', '10:00 AM', '11:30 AM']],
        })
      )
    })

    it('should render work performed section', async () => {
      await generateDailyReportPDF(mockOptions)

      // Should render text block with work completed
      expect(mockText).toHaveBeenCalled()
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        mockReport.work_completed,
        expect.any(Number)
      )
    })

    it('should skip work performed when empty', async () => {
      const reportWithoutWork = {
        ...mockReport,
        work_completed: null,
      }

      await generateDailyReportPDF({
        ...mockOptions,
        report: reportWithoutWork,
      })

      // Should still complete without errors
      expect(mockOutput).toHaveBeenCalled()
    })

    it('should render issues and observations', async () => {
      await generateDailyReportPDF(mockOptions)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        mockReport.issues,
        expect.any(Number)
      )
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        mockReport.observations,
        expect.any(Number)
      )
    })

    it('should render comments section', async () => {
      await generateDailyReportPDF(mockOptions)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        mockReport.comments,
        expect.any(Number)
      )
    })

    it('should handle report with all sections', async () => {
      const completeOptions: GeneratePDFOptions = {
        report: mockReport,
        workforce: [
          {
            id: 'w1',
            daily_report_id: 'report-123',
            trade: 'Carpenter',
            worker_count: 5,
            hours_worked: 8,
            activity: 'Framing',
          },
        ],
        equipment: [
          {
            id: 'e1',
            daily_report_id: 'report-123',
            equipment_type: 'Crane',
            quantity: 1,
            owner: 'Rental Co',
            hours_used: 6,
            notes: 'Good',
          },
        ],
        deliveries: [
          {
            id: 'd1',
            daily_report_id: 'report-123',
            material_description: 'Concrete',
            quantity: '10 yards',
            vendor: 'Concrete Co',
            delivery_ticket_number: 'TK-001',
            delivery_time: '14:00:00',
          },
        ],
        visitors: [
          {
            id: 'v1',
            daily_report_id: 'report-123',
            visitor_name: 'Inspector',
            company: 'City',
            purpose: 'Inspection',
            arrival_time: '10:00:00',
            departure_time: '11:00:00',
          },
        ],
        photos: [],
        projectName: 'Complete Project',
        projectId: 'project-123',
      }

      const blob = await generateDailyReportPDF(completeOptions)

      expect(blob).toBeInstanceOf(Blob)

      // Should have called autoTable 4 times (workforce, equipment, deliveries, visitors)
      expect(autoTable).toHaveBeenCalledTimes(4)

      // Should add footers
      expect(addFootersToAllPages).toHaveBeenCalled()
    })

    it('should render status badge with correct color', async () => {
      const approvedReport = { ...mockReport, status: 'approved' }
      await generateDailyReportPDF({ ...mockOptions, report: approvedReport })

      expect(mockRoundedRect).toHaveBeenCalled()
    })

    it('should handle different status values', async () => {
      const statuses = ['draft', 'submitted', 'in_review', 'approved', 'rejected']

      for (const status of statuses) {
        vi.clearAllMocks()
        const reportWithStatus = { ...mockReport, status }
        await generateDailyReportPDF({ ...mockOptions, report: reportWithStatus })

        expect(mockRoundedRect).toHaveBeenCalled()
      }
    })
  })

  describe('downloadDailyReportPDF', () => {
    const mockReport: DailyReport = {
      id: 'report-123',
      company_id: 'company-123',
      project_id: 'project-123',
      report_date: '2025-01-15',
      report_number: 42,
      status: 'approved',
      weather_condition: 'Sunny',
      temperature_high: 75,
      temperature_low: 55,
      precipitation: 0,
      wind_speed: 5,
      weather_delays: false,
      weather_delay_notes: null,
      work_completed: 'Work done',
      issues: null,
      observations: null,
      comments: null,
      created_by: 'user-123',
      created_at: '2025-01-15T08:00:00Z',
      updated_at: '2025-01-15T08:00:00Z',
    } as DailyReport

    const mockOptions: GeneratePDFOptions = {
      report: mockReport,
      workforce: [],
      equipment: [],
      deliveries: [],
      visitors: [],
      photos: [],
      projectName: 'Test Project',
      projectId: 'project-123',
    }

    it('should generate and download PDF', async () => {
      await downloadDailyReportPDF(mockOptions)

      expect(mockOutput).toHaveBeenCalledWith('blob')
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.document.createElement).toHaveBeenCalledWith('a')
    })

    it('should create download link with correct filename', async () => {
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.mocked(global.document.createElement).mockReturnValue(mockLink as any)

      await downloadDailyReportPDF(mockOptions)

      expect(mockLink.download).toBe('Daily_Report_2025-01-15_42.pdf')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should handle report without number in filename', async () => {
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.mocked(global.document.createElement).mockReturnValue(mockLink as any)

      const reportWithoutNumber = { ...mockReport, report_number: null }

      await downloadDailyReportPDF({
        ...mockOptions,
        report: reportWithoutNumber,
      })

      expect(mockLink.download).toBe('Daily_Report_2025-01-15.pdf')
    })

    it('should cleanup blob URL after download', async () => {
      await downloadDailyReportPDF(mockOptions)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should append and remove link from DOM', async () => {
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.mocked(global.document.createElement).mockReturnValue(mockLink as any)

      await downloadDailyReportPDF(mockOptions)

      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockLink)
      expect(global.document.body.removeChild).toHaveBeenCalledWith(mockLink)
    })
  })

  describe('Edge Cases', () => {
    const mockReport: DailyReport = {
      id: 'report-123',
      company_id: 'company-123',
      project_id: 'project-123',
      report_date: '2025-01-15',
      report_number: 1,
      status: 'draft',
      weather_condition: null,
      temperature_high: null,
      temperature_low: null,
      precipitation: null,
      wind_speed: null,
      weather_delays: false,
      weather_delay_notes: null,
      work_completed: null,
      issues: null,
      observations: null,
      comments: null,
      created_by: 'user-123',
      created_at: '2025-01-15T08:00:00Z',
      updated_at: '2025-01-15T08:00:00Z',
    } as DailyReport

    const mockOptions: GeneratePDFOptions = {
      report: mockReport,
      workforce: [],
      equipment: [],
      deliveries: [],
      visitors: [],
      photos: [],
      projectName: 'Test Project',
      projectId: 'project-123',
    }

    it('should handle report with all null values', async () => {
      const blob = await generateDailyReportPDF(mockOptions)

      expect(blob).toBeInstanceOf(Blob)
      expect(mockOutput).toHaveBeenCalledWith('blob')
    })

    it('should handle missing delivery time', async () => {
      const deliveryWithoutTime = [
        {
          id: 'd1',
          daily_report_id: 'report-123',
          material_description: 'Material',
          quantity: '10',
          vendor: 'Vendor',
          delivery_ticket_number: 'TK-001',
          delivery_time: null,
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        deliveries: deliveryWithoutTime,
      })

      const deliveryCall = (autoTable as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: any) => call[1]?.head?.[0]?.[0] === 'Material'
      )

      expect(deliveryCall[1].body[0][4]).toBe('-')
    })

    it('should handle workforce with null hours', async () => {
      const workforceWithNullHours = [
        {
          id: 'w1',
          daily_report_id: 'report-123',
          trade: 'General',
          worker_count: 3,
          hours_worked: null,
          activity: null,
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        workforce: workforceWithNullHours,
      })

      const workforceCall = (autoTable as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: any) => call[1]?.head?.[0]?.[0] === 'Trade/Team'
      )

      expect(workforceCall[1].body[0]).toEqual(['General', '3', '-', '-'])
    })

    it('should handle equipment with null values', async () => {
      const equipmentWithNulls = [
        {
          id: 'e1',
          daily_report_id: 'report-123',
          equipment_type: 'Forklift',
          quantity: null,
          owner: null,
          hours_used: null,
          notes: null,
        },
      ]

      await generateDailyReportPDF({
        ...mockOptions,
        equipment: equipmentWithNulls,
      })

      const equipmentCall = (autoTable as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: any) => call[1]?.head?.[0]?.[0] === 'Equipment Type'
      )

      expect(equipmentCall[1].body[0]).toEqual(['Forklift', '1', '-', '-', '-'])
    })
  })
})
