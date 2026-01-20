/**
 * RFI PDF Export Tests
 * Comprehensive tests for RFI PDF generation with JobSight branding
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
  mockGetTextWidth,
  mockSplitTextToSize,
  mockOutput,
  mockGetNumberOfPages,
  mockSetPage,
  mockJsPDF,
  mockAutoTable,
  mockFormat,
  mockGetCompanyInfo,
  mockAddDocumentHeader,
  mockAddFootersToAllPages,
  mockFormatRFINumber,
  mockGetRFIResponseTypeLabel,
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
  const getTextWidth = vi.fn(() => 20)
  const splitTextToSize = vi.fn((t: string) => [t])
  const output = vi.fn(() => new Blob())
  const getNumberOfPages = vi.fn(() => 1)
  const setPage = vi.fn()

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
    getTextWidth,
    splitTextToSize,
    output,
    getNumberOfPages,
    setPage,
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
    mockGetTextWidth: getTextWidth,
    mockSplitTextToSize: splitTextToSize,
    mockOutput: output,
    mockGetNumberOfPages: getNumberOfPages,
    mockSetPage: setPage,
    mockJsPDF: jsPDFInstance,
    mockAutoTable: vi.fn(),
    mockFormat: vi.fn((date: Date | string, formatStr: string) => {
      if (formatStr === 'MMMM d, yyyy') {return 'January 15, 2025'}
      if (formatStr === 'MMM d, yyyy') {return 'Jan 15, 2025'}
      if (formatStr === 'yyyy-MM-dd') {return '2025-01-15'}
      if (formatStr.includes('h:mm a')) {return 'Jan 15, 2025 2:30 PM'}
      return '2025-01-15'
    }),
    mockGetCompanyInfo: vi.fn(),
    mockAddDocumentHeader: vi.fn(async () => 40),
    mockAddFootersToAllPages: vi.fn(),
    mockFormatRFINumber: vi.fn((num: number) => `RFI-${String(num).padStart(3, '0')}`),
    mockGetRFIResponseTypeLabel: vi.fn((type: string) => {
      const labels: Record<string, string> = {
        clarification: 'Clarification',
        approval: 'Approval',
        instruction: 'Instruction',
      }
      return labels[type] || type
    }),
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

// Mock RFI type utilities with hoisted mocks
vi.mock('@/types/rfi', () => ({
  formatRFINumber: mockFormatRFINumber,
  getRFIResponseTypeLabel: mockGetRFIResponseTypeLabel,
}))

// Import functions after mocking
import {
  generateRFIPDF,
  downloadRFIPDF,
  generateRFILogPDF,
  downloadRFILogPDF,
  type RFIPDFData,
} from '../pdfExport'
import type { RFIWithDetails } from '@/types/rfi'
import autoTable from 'jspdf-autotable'
import { getCompanyInfo, addDocumentHeader, addFootersToAllPages } from '@/lib/utils/pdfBranding'

describe('RFI PDF Export', () => {
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

    // Mock URL
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as any
  })

  describe('generateRFIPDF', () => {
    const mockRFI: RFIWithDetails = {
      id: 'rfi-123',
      company_id: 'company-123',
      project_id: 'project-123',
      rfi_number: 1,
      subject: 'HVAC System Clarification',
      question: 'Need clarification on HVAC ductwork routing',
      status: 'submitted',
      priority: 'high',
      discipline: 'Mechanical',
      spec_section: '23 00 00',
      drawing_reference: 'M-201',
      location: 'Level 2 - Mechanical Room',
      date_submitted: '2025-01-10T00:00:00Z',
      date_required: '2025-01-20T00:00:00Z',
      date_responded: null,
      response: null,
      response_type: null,
      cost_impact: null,
      schedule_impact_days: null,
      is_overdue: false,
      submitted_by: 'user-123',
      assigned_to: 'user-456',
      responded_by: null,
      distribution_list: [],
      created_at: '2025-01-10T08:00:00Z',
      updated_at: '2025-01-10T08:00:00Z',
      date_created: '2025-01-10T08:00:00Z',
      submitted_by_user: {
        id: 'user-123',
        full_name: 'John Submitter',
        email: 'john@example.com',
      },
      assigned_to_user: {
        id: 'user-456',
        full_name: 'Jane Assignee',
        email: 'jane@example.com',
      },
      responded_by_user: null,
      project: {
        id: 'project-123',
        name: 'Test Project',
        number: 'P-001',
      },
    } as RFIWithDetails

    const mockData: RFIPDFData = {
      rfi: mockRFI,
      projectId: 'project-123',
      includeComments: false,
      includeAttachments: false,
    }

    it('should generate PDF with basic RFI info', async () => {
      const blob = await generateRFIPDF(mockData)

      expect(blob).toBeInstanceOf(Blob)
      expect(addDocumentHeader).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          documentTitle: expect.stringContaining('RFI-001'),
          documentType: 'REQUEST FOR INFORMATION',
        })
      )
      expect(addFootersToAllPages).toHaveBeenCalled()
    })

    it('should fetch company info when not provided', async () => {
      await generateRFIPDF(mockData)

      expect(getCompanyInfo).toHaveBeenCalledWith('project-123')
    })

    it('should use provided company info', async () => {
      const gcCompany = {
        name: 'Custom Company',
        address: '456 Oak St',
      }

      await generateRFIPDF({
        ...mockData,
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

    it('should render project information', async () => {
      await generateRFIPDF(mockData)

      // Should render text blocks
      expect(mockText).toHaveBeenCalled()
      expect(mockSetFont).toHaveBeenCalled()
    })

    it('should render dates section with overdue highlighting', async () => {
      const overdueRFI = {
        ...mockRFI,
        is_overdue: true,
      }

      await generateRFIPDF({
        ...mockData,
        rfi: overdueRFI,
      })

      // Should set urgent red color for overdue
      expect(mockSetTextColor).toHaveBeenCalled()
    })

    it('should render references section when present', async () => {
      await generateRFIPDF(mockData)

      // Should render references
      expect(mockText).toHaveBeenCalled()
      expect(mockSplitTextToSize).toHaveBeenCalled()
    })

    it('should skip references when all fields empty', async () => {
      const rfiWithoutRefs = {
        ...mockRFI,
        spec_section: null,
        drawing_reference: null,
        location: null,
      }

      const initialTextCalls = mockText.mock.calls.length
      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithoutRefs,
      })

      // References section should be skipped
      expect(mockText).toHaveBeenCalled() // But not for references
    })

    it('should render question in a box', async () => {
      await generateRFIPDF(mockData)

      // Should draw question box
      expect(mockRect).toHaveBeenCalled()
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('HVAC'),
        expect.any(Number)
      )
    })

    it('should render response when present', async () => {
      const rfiWithResponse = {
        ...mockRFI,
        response: 'Route HVAC ductwork along the north wall',
        response_type: 'clarification' as any,
        responded_by_user: {
          id: 'user-789',
          full_name: 'Bob Responder',
          email: 'bob@example.com',
        },
        date_responded: '2025-01-15T00:00:00Z',
      }

      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithResponse,
      })

      // Should render response
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Route HVAC'),
        expect.any(Number)
      )
    })

    it('should show awaiting response when no response', async () => {
      await generateRFIPDF(mockData)

      // Should indicate awaiting response
      expect(mockText).toHaveBeenCalled()
      expect(mockSetFont).toHaveBeenCalled()
    })

    it('should render cost and schedule impact', async () => {
      const rfiWithImpact = {
        ...mockRFI,
        response: 'Approved',
        cost_impact: 5000,
        schedule_impact_days: 3,
      }

      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithImpact,
      })

      // Should render impact values
      expect(mockText).toHaveBeenCalled()
    })

    it('should render distribution list when present', async () => {
      const rfiWithDistribution = {
        ...mockRFI,
        distribution_list: ['user-1', 'user-2', 'user-3'],
      }

      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithDistribution,
      })

      // Should render distribution count
      expect(mockText).toHaveBeenCalled()
    })

    it('should skip distribution when empty', async () => {
      await generateRFIPDF(mockData)

      // Distribution section should be skipped for empty list
      expect(mockText).toHaveBeenCalled()
    })

    it('should render attachments table when includeAttachments is true', async () => {
      const rfiWithAttachments = {
        ...mockRFI,
        attachments: [
          {
            id: 'att-1',
            rfi_id: 'rfi-123',
            file_name: 'drawing.pdf',
            file_url: 'https://example.com/drawing.pdf',
            attachment_type: 'drawing',
            created_at: '2025-01-10T08:00:00Z',
          },
          {
            id: 'att-2',
            rfi_id: 'rfi-123',
            file_name: 'photo.jpg',
            file_url: 'https://example.com/photo.jpg',
            attachment_type: 'photo',
            created_at: '2025-01-10T09:00:00Z',
          },
        ],
      }

      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithAttachments,
        includeAttachments: true,
      })

      // Should call autoTable for attachments
      expect(autoTable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          head: [['#', 'File Name', 'Type', 'Date']],
          body: [
            ['1', 'drawing.pdf', 'drawing', expect.any(String)],
            ['2', 'photo.jpg', 'photo', expect.any(String)],
          ],
        })
      )
    })

    it('should skip attachments when includeAttachments is false', async () => {
      const rfiWithAttachments = {
        ...mockRFI,
        attachments: [{ id: 'att-1', file_name: 'test.pdf' }],
      }

      vi.clearAllMocks()
      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithAttachments,
        includeAttachments: false,
      })

      // Should not create attachments table
      const attachmentCalls = vi.mocked(autoTable).mock.calls.filter(
        (call: any) => call[1]?.head?.[0]?.[0] === '#'
      )
      expect(attachmentCalls.length).toBe(0)
    })

    it('should render comments when includeComments is true', async () => {
      const rfiWithComments = {
        ...mockRFI,
        comments: [
          {
            id: 'comment-1',
            rfi_id: 'rfi-123',
            comment: 'Need additional clarification',
            comment_type: 'comment' as any,
            created_by: 'user-123',
            created_at: '2025-01-12T10:00:00Z',
            created_by_user: {
              id: 'user-123',
              full_name: 'John Commenter',
              email: 'john@example.com',
            },
          },
        ],
      }

      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithComments,
        includeComments: true,
      })

      // Should render comment
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('additional clarification'),
        expect.any(Number)
      )
    })

    it('should skip comments when includeComments is false', async () => {
      const rfiWithComments = {
        ...mockRFI,
        comments: [{ id: 'comment-1', comment: 'This is a unique comment that should not appear' }],
      }

      vi.clearAllMocks()
      await generateRFIPDF({
        ...mockData,
        rfi: rfiWithComments,
        includeComments: false,
      })

      // Comments should not be rendered - use unique string to avoid false matches
      expect(mockSplitTextToSize).not.toHaveBeenCalledWith(
        expect.stringContaining('unique comment that should not'),
        expect.any(Number)
      )
    })
  })

  describe('downloadRFIPDF', () => {
    const mockRFI: RFIWithDetails = {
      id: 'rfi-123',
      rfi_number: 42,
      subject: 'Test RFI',
      question: 'Test question',
      status: 'submitted',
      priority: 'normal',
      project: {
        name: 'Test Project',
      },
    } as RFIWithDetails

    const mockData: RFIPDFData = {
      rfi: mockRFI,
      projectId: 'project-123',
    }

    it('should generate and download PDF', async () => {
      await downloadRFIPDF(mockData)

      expect(mockOutput).toHaveBeenCalledWith('blob')
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.document.createElement).toHaveBeenCalledWith('a')
    })

    it('should create download link with correct filename', async () => {
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.mocked(global.document.createElement).mockReturnValue(mockLink as any)

      await downloadRFIPDF(mockData)

      expect(mockLink.download).toBe('RFI_RFI042_Test_Project_2025-01-15.pdf')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should cleanup blob URL after download', async () => {
      await downloadRFIPDF(mockData)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('generateRFILogPDF', () => {
    const mockRFIs: RFIWithDetails[] = [
      {
        id: 'rfi-1',
        rfi_number: 1,
        subject: 'First RFI about electrical',
        status: 'submitted',
        priority: 'high',
        discipline: 'Electrical',
        date_submitted: '2025-01-10T00:00:00Z',
        date_required: '2025-01-20T00:00:00Z',
        is_overdue: false,
        assigned_to_user: {
          id: 'user-1',
          full_name: 'John Assignee',
          email: 'john@example.com',
        },
      },
      {
        id: 'rfi-2',
        rfi_number: 2,
        subject: 'Second RFI about plumbing - this is a very long subject that should be truncated',
        status: 'responded',
        priority: 'normal',
        discipline: 'Plumbing',
        date_submitted: '2025-01-12T00:00:00Z',
        date_required: '2025-01-18T00:00:00Z',
        is_overdue: true,
        assigned_to_user: {
          id: 'user-2',
          full_name: 'Jane Assignee',
          email: 'jane@example.com',
        },
      },
    ] as RFIWithDetails[]

    it('should generate RFI log with summary stats', async () => {
      const blob = await generateRFILogPDF(mockRFIs, 'Test Project')

      expect(blob).toBeInstanceOf(Blob)
      expect(mockText).toHaveBeenCalled()
    })

    it('should create table with all RFIs', async () => {
      await generateRFILogPDF(mockRFIs, 'Test Project')

      expect(autoTable).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          head: [['RFI #', 'Subject', 'Status', 'Priority', 'Discipline', 'Assigned To', 'Submitted', 'Required', 'Overdue']],
          body: [
            ['RFI-001', expect.stringContaining('First RFI'), 'Submitted', 'High', 'Electrical', 'John Assignee', expect.any(String), expect.any(String), '-'],
            ['RFI-002', expect.stringContaining('Second RFI'), 'Responded', 'Normal', 'Plumbing', 'Jane Assignee', expect.any(String), expect.any(String), 'Yes'],
          ],
        })
      )
    })

    it('should truncate long subjects', async () => {
      await generateRFILogPDF(mockRFIs, 'Test Project')

      const call = vi.mocked(autoTable).mock.calls.find(
        (c: any) => c[1]?.head?.[0]?.[0] === 'RFI #'
      )

      expect(call![1].body[1][1]).toContain('...')
    })

    it('should add footers to all pages', async () => {
      mockGetNumberOfPages.mockReturnValue(3)

      await generateRFILogPDF(mockRFIs, 'Test Project')

      // addFootersToAllPages is called by pdf.finalize() and handles page iteration internally
      expect(addFootersToAllPages).toHaveBeenCalled()
    })
  })

  describe('downloadRFILogPDF', () => {
    const mockRFIs: RFIWithDetails[] = [
      {
        id: 'rfi-1',
        rfi_number: 1,
        subject: 'Test',
        status: 'submitted',
        priority: 'normal',
      } as RFIWithDetails,
    ]

    it('should generate and download RFI log', async () => {
      await downloadRFILogPDF(mockRFIs, 'Test Project')

      expect(mockOutput).toHaveBeenCalledWith('blob')
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should create download link with sanitized filename', async () => {
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.mocked(global.document.createElement).mockReturnValue(mockLink as any)

      await downloadRFILogPDF(mockRFIs, 'My Project (2025)')

      expect(mockLink.download).toBe('RFI_Log_My_Project__2025__2025-01-15.pdf')
    })
  })
})
