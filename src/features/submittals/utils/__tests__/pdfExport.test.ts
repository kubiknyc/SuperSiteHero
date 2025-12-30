/**
 * Submittal PDF Export Tests
 * Tests for professional submittal PDF generation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { jsPDF } from 'jspdf'

// Use vi.hoisted() for all mocks to ensure they're available during vi.mock() execution
const {
  mockAddPage,
  mockSetFillColor,
  mockRect,
  mockSetFontSize,
  mockSetFont,
  mockSetTextColor,
  mockText,
  mockSetDrawColor,
  mockSetLineWidth,
  mockLine,
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
  mockFormatSubmittalNumber,
  mockGetSubmittalTypeLabel,
  mockGetApprovalCodeLabel,
} = vi.hoisted(() => {
  const addPage = vi.fn()
  const setFillColor = vi.fn()
  const rect = vi.fn()
  const setFontSize = vi.fn()
  const setFont = vi.fn()
  const setTextColor = vi.fn()
  const text = vi.fn()
  const setDrawColor = vi.fn()
  const setLineWidth = vi.fn()
  const line = vi.fn()
  const splitTextToSize = vi.fn((t: string) => [t])
  const output = vi.fn(() => new Blob(['mock-pdf'], { type: 'application/pdf' }))
  const getNumberOfPages = vi.fn(() => 1)
  const setPage = vi.fn()

  const jsPDFInstance = {
    addPage,
    setFillColor,
    rect,
    setFontSize,
    setFont,
    setTextColor,
    text,
    setDrawColor,
    setLineWidth,
    line,
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
    mockSetFontSize: setFontSize,
    mockSetFont: setFont,
    mockSetTextColor: setTextColor,
    mockText: text,
    mockSetDrawColor: setDrawColor,
    mockSetLineWidth: setLineWidth,
    mockLine: line,
    mockSplitTextToSize: splitTextToSize,
    mockOutput: output,
    mockGetNumberOfPages: getNumberOfPages,
    mockSetPage: setPage,
    mockJsPDF: jsPDFInstance,
    mockAutoTable: vi.fn(),
    mockFormat: vi.fn((date: Date, formatStr: string) => {
      if (formatStr === 'MMMM d, yyyy') {return 'January 15, 2024'}
      if (formatStr === 'MMM d, yyyy') {return 'Jan 15, 2024'}
      if (formatStr === 'yyyy-MM-dd') {return '2024-01-15'}
      if (formatStr === 'MMM d, yyyy h:mm a') {return 'Jan 15, 2024 2:30 PM'}
      return '2024-01-15'
    }),
    mockGetCompanyInfo: vi.fn(),
    mockAddDocumentHeader: vi.fn(async () => 40),
    mockAddFootersToAllPages: vi.fn(),
    mockFormatSubmittalNumber: vi.fn((num: number, rev?: number) =>
      rev ? `SUB-${String(num).padStart(3, '0')}-R${rev}` : `SUB-${String(num).padStart(3, '0')}`
    ),
    mockGetSubmittalTypeLabel: vi.fn((type: string) => {
      const labels: Record<string, string> = {
        product_data: 'Product Data',
        shop_drawings: 'Shop Drawings',
        samples: 'Samples',
        certificates: 'Certificates',
      }
      return labels[type] || type
    }),
    mockGetApprovalCodeLabel: vi.fn((code: string) => {
      const labels: Record<string, string> = {
        A: 'Approved',
        B: 'Approved as Noted',
        C: 'Revise and Resubmit',
        D: 'Rejected',
      }
      return labels[code] || code
    }),
  }
})

// Mock modules using hoisted mocks
// IMPORTANT: Use regular function (not arrow) so it can be used with 'new' keyword
vi.mock('jspdf', () => ({
  default: vi.fn(function() { return mockJsPDF }),
}))

vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable,
}))

vi.mock('date-fns', () => ({
  format: mockFormat,
}))

vi.mock('@/lib/utils/pdfBranding', () => ({
  getCompanyInfo: mockGetCompanyInfo,
  addDocumentHeader: mockAddDocumentHeader,
  addFootersToAllPages: mockAddFootersToAllPages,
}))

vi.mock('@/types/submittal', () => ({
  formatSubmittalNumber: mockFormatSubmittalNumber,
  getSubmittalTypeLabel: mockGetSubmittalTypeLabel,
  getApprovalCodeLabel: mockGetApprovalCodeLabel,
}))

// Import functions after mocking
import {
  generateSubmittalPDF,
  downloadSubmittalPDF,
  generateSubmittalLogPDF,
  downloadSubmittalLogPDF,
  type SubmittalPDFData,
} from '../pdfExport'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { getCompanyInfo, addDocumentHeader, addFootersToAllPages } from '@/lib/utils/pdfBranding'
import { formatSubmittalNumber, getSubmittalTypeLabel, type SubmittalWithDetails } from '@/types/submittal'

describe('Submittal PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock return values
    mockSplitTextToSize.mockImplementation((text: string) => [text])
    mockOutput.mockReturnValue(new Blob(['mock-pdf'], { type: 'application/pdf' }))
    mockGetNumberOfPages.mockReturnValue(1)

    // Mock company info
    mockGetCompanyInfo.mockResolvedValue({
      name: 'Test Construction Co',
      address: '123 Main St, TestCity, TS, 12345',
    })
  })

  describe('generateSubmittalPDF', () => {
    const mockSubmittalData: SubmittalPDFData = {
      submittal: {
        id: 'sub-1',
        submittal_number: 42,
        revision_number: 0,
        title: 'HVAC Equipment Submittal',
        description: 'Rooftop units and controls',
        spec_section: '23 00 00',
        spec_section_title: 'Mechanical',
        submittal_type: 'product_data',
        review_status: 'submitted',
        date_submitted: '2024-01-10',
        date_required: '2024-01-20',
        date_received: null,
        date_returned: null,
        is_overdue: false,
        discipline: 'HVAC',
        review_comments: 'Looks good overall',
        approval_code: 'A',
        project: {
          id: 'proj-1',
          name: 'Test Project',
          number: 'P-2024-001',
        },
        subcontractor: {
          id: 'sub-1',
          company_name: 'HVAC Specialists Inc',
        },
        items: [],
        reviews: [],
        attachments: [],
        created_at: '2024-01-08',
      } as unknown as SubmittalWithDetails,
      projectId: 'proj-1',
      projectInfo: {
        name: 'Test Project',
        number: 'P-2024-001',
      },
    }

    it('should generate basic submittal PDF', async () => {
      const blob = await generateSubmittalPDF(mockSubmittalData)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
      expect(mockOutput).toHaveBeenCalledWith('blob')
    })

    it('should fetch company info when not provided', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(getCompanyInfo).toHaveBeenCalledWith('proj-1')
    })

    it('should use provided company info', async () => {
      const gcCompany = {
        name: 'Custom GC',
        address: '456 Other St',
      }

      await generateSubmittalPDF({
        ...mockSubmittalData,
        gcCompany,
      })

      expect(getCompanyInfo).not.toHaveBeenCalled()
    })

    it('should add document header with submittal number and date', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(addDocumentHeader).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          documentTitle: 'Submittal #42 - January 15, 2024',
          documentType: 'SUBMITTAL',
        })
      )
    })

    it('should render project information section', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      // Check for section header
      expect(mockText).toHaveBeenCalledWith('PROJECT INFORMATION', expect.any(Number), expect.any(Number))

      // Check for project name with number
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Test Project'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should render status in project info', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(mockText).toHaveBeenCalledWith('Status:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Submitted', expect.any(Number), expect.any(Number))
    })

    it('should render spec section with title', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(mockText).toHaveBeenCalledWith('Spec Section:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('23 00 00 - Mechanical', expect.any(Number), expect.any(Number))
    })

    it('should render submittal type', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(mockText).toHaveBeenCalledWith('Type:', expect.any(Number), expect.any(Number))
      expect(getSubmittalTypeLabel).toHaveBeenCalledWith('product_data')
    })

    it('should render subcontractor and discipline', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(mockText).toHaveBeenCalledWith('Subcontractor:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('HVAC Specialists Inc', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Discipline:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('HVAC', expect.any(Number), expect.any(Number))
    })

    it('should render dates section', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(mockText).toHaveBeenCalledWith('DATES', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Submitted:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Required:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Received:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Returned:', expect.any(Number), expect.any(Number))
    })

    it('should highlight overdue dates in red', async () => {
      const overdueData = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          is_overdue: true,
        },
      }

      await generateSubmittalPDF(overdueData)

      // Should set text color to red for overdue
      expect(mockSetTextColor).toHaveBeenCalledWith(220, 38, 38)
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('OVERDUE'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should render submittal details with title and description', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(mockText).toHaveBeenCalledWith('SUBMITTAL DETAILS', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Title:', expect.any(Number), expect.any(Number))
      expect(mockSplitTextToSize).toHaveBeenCalledWith('HVAC Equipment Submittal', expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Description:', expect.any(Number), expect.any(Number))
      expect(mockSplitTextToSize).toHaveBeenCalledWith('Rooftop units and controls', expect.any(Number))
    })

    it('should render items table when includeItems is true', async () => {
      const dataWithItems = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          items: [
            {
              id: 'item-1',
              description: 'Rooftop Unit Model XYZ',
              manufacturer: 'ACME HVAC',
              model_number: 'RTU-1000',
              quantity: 3,
              unit: 'ea',
            },
            {
              id: 'item-2',
              description: 'Thermostat Controls',
              manufacturer: 'Controls Corp',
              model_number: 'TC-500',
              quantity: 10,
              unit: 'ea',
            },
          ],
        },
        includeItems: true,
      }

      await generateSubmittalPDF(dataWithItems)

      expect(mockText).toHaveBeenCalledWith('ITEMS (2)', expect.any(Number), expect.any(Number))
      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: [['#', 'Description', 'Manufacturer', 'Model #', 'Qty', 'Unit']],
          body: [
            ['1', 'Rooftop Unit Model XYZ', 'ACME HVAC', 'RTU-1000', '3', 'ea'],
            ['2', 'Thermostat Controls', 'Controls Corp', 'TC-500', '10', 'ea'],
          ],
        })
      )
    })

    it('should not render items table when includeItems is false', async () => {
      const dataWithItems = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          items: [{ id: 'item-1', description: 'Test Item' }],
        },
        includeItems: false,
      }

      await generateSubmittalPDF(dataWithItems)

      expect(mockText).not.toHaveBeenCalledWith('ITEMS (1)', expect.any(Number), expect.any(Number))
    })

    it('should render review comments with approved highlighting', async () => {
      const approvedData = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          review_status: 'approved',
          review_comments: 'Approved for construction',
        },
      }

      await generateSubmittalPDF(approvedData)

      expect(mockText).toHaveBeenCalledWith('REVIEW COMMENTS', expect.any(Number), expect.any(Number))
      // Should set fill color to green for approved
      expect(mockSetFillColor).toHaveBeenCalledWith(22, 163, 74)
      expect(mockSplitTextToSize).toHaveBeenCalledWith('Approved for construction', expect.any(Number))
    })

    it('should render review history when includeReviews is true', async () => {
      const dataWithReviews = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          reviews: [
            {
              id: 'rev-1',
              reviewed_at: '2024-01-12',
              review_status: 'approved',
              approval_code: 'A',
              comments: 'All requirements met',
              reviewed_by_user: {
                id: 'user-1',
                full_name: 'John Reviewer',
              },
            },
          ],
        },
        includeReviews: true,
      }

      await generateSubmittalPDF(dataWithReviews)

      expect(mockText).toHaveBeenCalledWith('REVIEW HISTORY (1)', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('John Reviewer', expect.any(Number), expect.any(Number))
      expect(format).toHaveBeenCalled()
      expect(mockSplitTextToSize).toHaveBeenCalledWith('All requirements met', expect.any(Number))
    })

    it('should not render review history when includeReviews is false', async () => {
      const dataWithReviews = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          reviews: [{ id: 'rev-1', reviewed_at: '2024-01-12' }],
        },
        includeReviews: false,
      }

      await generateSubmittalPDF(dataWithReviews)

      expect(mockText).not.toHaveBeenCalledWith('REVIEW HISTORY (1)', expect.any(Number), expect.any(Number))
    })

    it('should render attachments table when includeAttachments is true', async () => {
      const dataWithAttachments = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          attachments: [
            {
              id: 'att-1',
              file_name: 'specifications.pdf',
              file_type: 'application/pdf',
              created_at: '2024-01-09',
            },
            {
              id: 'att-2',
              file_name: 'drawings.dwg',
              file_type: 'application/dwg',
              created_at: '2024-01-10',
            },
          ],
        },
        includeAttachments: true,
      }

      await generateSubmittalPDF(dataWithAttachments)

      expect(mockText).toHaveBeenCalledWith('ATTACHMENTS (2)', expect.any(Number), expect.any(Number))
      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: [['#', 'File Name', 'Type', 'Date']],
          body: expect.arrayContaining([
            expect.arrayContaining(['specifications.pdf']),
            expect.arrayContaining(['drawings.dwg']),
          ]),
        })
      )
    })

    it('should not render attachments when includeAttachments is false', async () => {
      const dataWithAttachments = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          attachments: [{ id: 'att-1', file_name: 'test.pdf' }],
        },
        includeAttachments: false,
      }

      await generateSubmittalPDF(dataWithAttachments)

      expect(mockText).not.toHaveBeenCalledWith('ATTACHMENTS (1)', expect.any(Number), expect.any(Number))
    })

    it('should add footers to all pages', async () => {
      await generateSubmittalPDF(mockSubmittalData)

      expect(addFootersToAllPages).toHaveBeenCalledWith(mockJsPDF)
    })

    it('should handle null dates gracefully', async () => {
      const dataWithNullDates = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          date_received: null,
          date_returned: null,
        },
      }

      await generateSubmittalPDF(dataWithNullDates)

      // Should render 'N/A' for null dates
      expect(mockText).toHaveBeenCalledWith('N/A', expect.any(Number), expect.any(Number))
    })

    it('should handle missing subcontractor gracefully', async () => {
      const dataWithoutSub = {
        ...mockSubmittalData,
        submittal: {
          ...mockSubmittalData.submittal,
          subcontractor: null,
        },
      }

      const blob = await generateSubmittalPDF(dataWithoutSub)

      expect(blob).toBeInstanceOf(Blob)
      // Should not crash when subcontractor is null
    })
  })

  describe('downloadSubmittalPDF', () => {
    beforeEach(() => {
      // Mock DOM APIs
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as HTMLElement)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as HTMLElement)
    })

    it('should trigger download with correct filename', async () => {
      const mockData: SubmittalPDFData = {
        submittal: {
          id: 'sub-1',
          submittal_number: '42',
          title: 'Test Submittal',
          project: {
            name: 'Test Project',
          },
        } as unknown as SubmittalWithDetails,
        projectId: 'proj-1',
      }

      await downloadSubmittalPDF(mockData)

      const mockLink = document.createElement('a') as any
      expect(mockLink.download).toBe('Submittal_42_Test_Project_2024-01-15.pdf')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should sanitize project name in filename', async () => {
      const mockData: SubmittalPDFData = {
        submittal: {
          id: 'sub-1',
          submittal_number: '100',
          title: 'Test',
          project: {
            name: 'Project @#$% with Special! Characters',
          },
        } as unknown as SubmittalWithDetails,
        projectId: 'proj-1',
      }

      await downloadSubmittalPDF(mockData)

      const mockLink = document.createElement('a') as any
      // Project name sanitized and truncated to 20 chars: 'Project______with_Sp'
      expect(mockLink.download).toContain('Project______with_Sp')
    })

    it('should cleanup blob URL after download', async () => {
      const mockData: SubmittalPDFData = {
        submittal: {
          id: 'sub-1',
          submittal_number: '1',
          title: 'Test',
        } as unknown as SubmittalWithDetails,
        projectId: 'proj-1',
      }

      await downloadSubmittalPDF(mockData)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('generateSubmittalLogPDF', () => {
    const mockSubmittals: SubmittalWithDetails[] = [
      {
        id: 'sub-1',
        submittal_number: 1,
        revision_number: 0,
        title: 'HVAC Equipment',
        spec_section: '23 00 00',
        submittal_type: 'product_data',
        review_status: 'approved',
        approval_code: 'A',
        date_submitted: '2024-01-05',
        date_required: '2024-01-15',
        is_overdue: false,
        subcontractor: {
          id: 'sub-1',
          company_name: 'HVAC Specialists',
        },
      },
      {
        id: 'sub-2',
        submittal_number: 2,
        revision_number: 0,
        title: 'Electrical Panels',
        spec_section: '26 00 00',
        submittal_type: 'shop_drawings',
        review_status: 'submitted',
        approval_code: null,
        date_submitted: '2024-01-10',
        date_required: '2024-01-20',
        is_overdue: false,
        subcontractor: {
          id: 'sub-2',
          company_name: 'Electrical Contractors',
        },
      },
    ] as unknown as SubmittalWithDetails[]

    it('should generate submittal log PDF with landscape orientation', async () => {
      const blob = await generateSubmittalLogPDF(mockSubmittals, 'Test Project')

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
    })

    it('should render summary statistics', async () => {
      await generateSubmittalLogPDF(mockSubmittals, 'Test Project')

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Total: 2'),
        expect.any(Number),
        expect.any(Number)
      )
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Approved: 1'),
        expect.any(Number),
        expect.any(Number)
      )
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Pending: 1'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should render submittal table with all columns', async () => {
      await generateSubmittalLogPDF(mockSubmittals, 'Test Project')

      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: [['Submittal #', 'Title', 'Spec', 'Type', 'Status', 'Code', 'Subcontractor', 'Submitted', 'Required']],
          body: expect.arrayContaining([
            expect.arrayContaining(['HVAC Equipment', '23 00 00']),
            expect.arrayContaining(['Electrical Panels', '26 00 00']),
          ]),
        })
      )
    })

    it('should truncate long titles to 40 characters', async () => {
      const longTitleSubmittals: SubmittalWithDetails[] = [
        {
          id: 'sub-1',
          submittal_number: 1,
          title: 'This is a very long submittal title that exceeds the maximum character limit',
          spec_section: '01 00 00',
          submittal_type: 'product_data',
          review_status: 'submitted',
        } as unknown as SubmittalWithDetails,
      ]

      await generateSubmittalLogPDF(longTitleSubmittals, 'Test Project')

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

    it('should add footers to all pages in log', async () => {
      mockGetNumberOfPages.mockReturnValue(3)

      await generateSubmittalLogPDF(mockSubmittals, 'Test Project')

      expect(mockSetPage).toHaveBeenCalledTimes(3)
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Page 1 of 3'),
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'right' })
      )
    })
  })

  describe('downloadSubmittalLogPDF', () => {
    beforeEach(() => {
      // Mock DOM APIs
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as HTMLElement)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as HTMLElement)
    })

    it('should trigger download with correct filename', async () => {
      const mockSubmittals: SubmittalWithDetails[] = []

      await downloadSubmittalLogPDF(mockSubmittals, 'My Test Project')

      const mockLink = document.createElement('a') as any
      expect(mockLink.download).toBe('Submittal_Log_My_Test_Project_2024-01-15.pdf')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should sanitize project name and truncate to 30 characters', async () => {
      const mockSubmittals: SubmittalWithDetails[] = []

      await downloadSubmittalLogPDF(mockSubmittals, 'Very Long Project Name with Special Characters @#$% that exceeds limit')

      const mockLink = document.createElement('a') as any
      expect(mockLink.download).toMatch(/^Submittal_Log_.{30}_\d{4}-\d{2}-\d{2}\.pdf$/)
    })
  })
})
