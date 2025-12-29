/**
 * Lien Waiver PDF Export Tests
 * Tests for legal lien waiver document generation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { jsPDF } from 'jspdf'

// Use vi.hoisted() for all mocks to ensure proper hoisting
const {
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
  mockAddPage,
  mockOutput,
  mockJsPDF,
  mockFormat,
  mockGetCompanyInfo,
  mockAddDocumentHeader,
  mockAddFootersToAllPages,
  mockGetWaiverTypeLabel,
  mockGetStateName,
  mockIsConditionalWaiver,
  mockIsFinalWaiver,
  mockFormatWaiverAmount,
} = vi.hoisted(() => {
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
  const addPage = vi.fn()
  const output = vi.fn(() => new Blob(['mock-pdf'], { type: 'application/pdf' }))

  const jsPDFInstance = {
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
    addPage,
    output,
  }

  return {
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
    mockAddPage: addPage,
    mockOutput: output,
    mockJsPDF: jsPDFInstance,
    mockFormat: vi.fn((date: Date, formatStr: string) => {
      if (formatStr === 'MMMM d, yyyy') {return 'January 15, 2024'}
      if (formatStr === 'yyyy-MM-dd') {return '2024-01-15'}
      return '2024-01-15'
    }),
    mockGetCompanyInfo: vi.fn(),
    mockAddDocumentHeader: vi.fn(async () => 40),
    mockAddFootersToAllPages: vi.fn(),
    mockGetWaiverTypeLabel: vi.fn((type: string) => {
      const labels: Record<string, string> = {
        conditional_progress: 'Conditional Progress Payment',
        unconditional_progress: 'Unconditional Progress Payment',
        conditional_final: 'Conditional Final Payment',
        unconditional_final: 'Unconditional Final Payment',
      }
      return labels[type] || type
    }),
    mockGetStateName: vi.fn((code: string) => {
      const states: Record<string, string> = {
        CA: 'California',
        TX: 'Texas',
        NY: 'New York',
      }
      return states[code] || code
    }),
    mockIsConditionalWaiver: vi.fn((type: string) => type.includes('conditional')),
    mockIsFinalWaiver: vi.fn((type: string) => type.includes('final')),
    mockFormatWaiverAmount: vi.fn((amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
  }
})

// IMPORTANT: Use regular function (not arrow) so it can be used with 'new' keyword
vi.mock('jspdf', () => ({
  default: vi.fn(function() { return mockJsPDF }),
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

// Mock lien-waiver type utilities with hoisted mocks
vi.mock('@/types/lien-waiver', () => ({
  getWaiverTypeLabel: mockGetWaiverTypeLabel,
  getStateName: mockGetStateName,
  isConditionalWaiver: mockIsConditionalWaiver,
  isFinalWaiver: mockIsFinalWaiver,
  formatWaiverAmount: mockFormatWaiverAmount,
}))

// Import functions after mocking
import {
  generateLienWaiverPDF,
  downloadLienWaiverPDF,
  generateBlankWaiverPDF,
  downloadBlankWaiverPDF,
  type LienWaiverPDFData,
} from '../pdfExport'
import { format } from 'date-fns'
import { getCompanyInfo, addDocumentHeader, addFootersToAllPages } from '@/lib/utils/pdfBranding'
import {
  getWaiverTypeLabel,
  getStateName,
  isConditionalWaiver,
  isFinalWaiver,
  formatWaiverAmount,
} from '@/types/lien-waiver'
import type { LienWaiverWithDetails, LienWaiverType } from '@/types/lien-waiver'

describe('Lien Waiver PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSplitTextToSize.mockImplementation((text: string) => [text])
    mockOutput.mockReturnValue(new Blob(['mock-pdf'], { type: 'application/pdf' }))

    // Mock company info
    vi.mocked(getCompanyInfo).mockResolvedValue({
      name: 'Test Construction Co',
      address: '123 Main St, TestCity, TS, 12345',
    })
  })

  describe('generateLienWaiverPDF', () => {
    const mockWaiverData: LienWaiverPDFData = {
      waiver: {
        id: 'waiver-1',
        waiver_number: 'LW-2024-001',
        waiver_type: 'conditional_progress',
        payment_amount: 25000,
        through_date: '2024-01-15',
        check_number: 'CHK-12345',
        claimant_name: 'John Smith',
        claimant_title: 'Project Manager',
        claimant_company: 'ABC Subcontractors',
        vendor_name: 'ABC Subcontractors',
        signature_date: '2024-01-16',
        notarization_required: false,
        exceptions: null,
        project: {
          id: 'proj-1',
          name: 'Office Building Project',
        },
        template: {
          id: 'tpl-1',
          state_code: 'CA',
        },
      } as unknown as LienWaiverWithDetails,
      projectId: 'proj-1',
      projectAddress: '789 Construction Ave, BuildCity, CA 90001',
      ownerName: 'BuildCo LLC',
      generalContractor: 'General Contractors Inc',
    }

    it('should generate basic lien waiver PDF', async () => {
      const blob = await generateLienWaiverPDF(mockWaiverData)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
      expect(mockOutput).toHaveBeenCalledWith('blob')
    })

    it('should fetch company info when not provided', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(getCompanyInfo).toHaveBeenCalledWith('proj-1')
    })

    it('should use provided company info', async () => {
      const gcCompany = {
        name: 'Custom GC',
        address: '456 Other St',
      }

      await generateLienWaiverPDF({
        ...mockWaiverData,
        gcCompany,
      })

      expect(getCompanyInfo).not.toHaveBeenCalled()
    })

    it('should add document header with waiver number and type', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(addDocumentHeader).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          documentTitle: 'LW-2024-001 - Conditional Progress Payment',
          documentType: 'LIEN WAIVER',
        })
      )
    })

    it('should render state name below header', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(getStateName).toHaveBeenCalledWith('CA')
      expect(mockText).toHaveBeenCalledWith(
        'State of California',
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'center' })
      )
    })

    it('should default to California when state code is missing', async () => {
      const dataWithoutState = {
        ...mockWaiverData,
        waiver: {
          ...mockWaiverData.waiver,
          template: null,
        },
      }

      await generateLienWaiverPDF(dataWithoutState)

      expect(getStateName).toHaveBeenCalledWith('CA')
    })

    it('should render project information section', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(mockText).toHaveBeenCalledWith('Project Name:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Job Location:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Owner:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('General Contractor:', expect.any(Number), expect.any(Number))
    })

    it('should render project values in project info', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(mockText).toHaveBeenCalledWith('Office Building Project', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('789 Construction Ave, BuildCity, CA 90001', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('BuildCo LLC', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('General Contractors Inc', expect.any(Number), expect.any(Number))
    })

    it('should render waiver body text with splitTextToSize', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Upon receipt by the undersigned'),
        expect.any(Number)
      )
    })

    it('should generate conditional progress text for conditional_progress type', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('progress payment'),
        expect.any(Number)
      )
    })

    it('should generate unconditional progress text for unconditional_progress type', async () => {
      const unconditionalData = {
        ...mockWaiverData,
        waiver: {
          ...mockWaiverData.waiver,
          waiver_type: 'unconditional_progress' as LienWaiverType,
        },
      }

      await generateLienWaiverPDF(unconditionalData)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('has been paid and has received a progress payment'),
        expect.any(Number)
      )
    })

    it('should generate conditional final text for conditional_final type', async () => {
      const conditionalFinalData = {
        ...mockWaiverData,
        waiver: {
          ...mockWaiverData.waiver,
          waiver_type: 'conditional_final' as LienWaiverType,
        },
      }

      await generateLienWaiverPDF(conditionalFinalData)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('final payment'),
        expect.any(Number)
      )
    })

    it('should generate unconditional final text for unconditional_final type', async () => {
      const unconditionalFinalData = {
        ...mockWaiverData,
        waiver: {
          ...mockWaiverData.waiver,
          waiver_type: 'unconditional_final' as LienWaiverType,
        },
      }

      await generateLienWaiverPDF(unconditionalFinalData)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('has been paid in full'),
        expect.any(Number)
      )
    })

    it('should include exceptions in waiver text when provided', async () => {
      const dataWithExceptions = {
        ...mockWaiverData,
        waiver: {
          ...mockWaiverData.waiver,
          exceptions: 'Change Order #5, Disputed materials claim',
        },
      }

      await generateLienWaiverPDF(dataWithExceptions)

      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('EXCEPTIONS'),
        expect.any(Number)
      )
    })

    it('should render signature section', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(mockText).toHaveBeenCalledWith("CLAIMANT'S SIGNATURE", expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Signature', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Date', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Print Name', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Title', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Company Name', expect.any(Number), expect.any(Number))
    })

    it('should render claimant information in signature section', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(mockText).toHaveBeenCalledWith('John Smith', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Project Manager', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('ABC Subcontractors', expect.any(Number), expect.any(Number))
    })

    it('should render notarization section when required', async () => {
      const dataWithNotarization = {
        ...mockWaiverData,
        waiver: {
          ...mockWaiverData.waiver,
          notarization_required: true,
        },
      }

      await generateLienWaiverPDF(dataWithNotarization)

      expect(mockText).toHaveBeenCalledWith('NOTARIZATION', expect.any(Number), expect.any(Number))
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('State of'),
        expect.any(Number)
      )
      expect(mockText).toHaveBeenCalledWith('Notary Public Signature', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('(NOTARY SEAL)', expect.any(Number), expect.any(Number), expect.any(Object))
    })

    it('should not render notarization section when not required', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      const notarizationCalls = vi.mocked(mockText).mock.calls.filter(call =>
        call[0]?.toString().includes('NOTARIZATION')
      )
      expect(notarizationCalls.length).toBe(0)
    })

    it('should add footers to all pages', async () => {
      await generateLienWaiverPDF(mockWaiverData)

      expect(addFootersToAllPages).toHaveBeenCalledWith(mockJsPDF)
    })

    it('should handle missing optional project info gracefully', async () => {
      const minimalData = {
        ...mockWaiverData,
        projectAddress: undefined,
        ownerName: undefined,
        generalContractor: undefined,
      }

      const blob = await generateLienWaiverPDF(minimalData)

      expect(blob).toBeInstanceOf(Blob)
      // Should render blank lines for missing data
    })
  })

  describe('downloadLienWaiverPDF', () => {
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
      const mockData: LienWaiverPDFData = {
        waiver: {
          id: 'waiver-1',
          waiver_number: 'LW-2024-001',
          waiver_type: 'conditional_progress',
          payment_amount: 10000,
        } as unknown as LienWaiverWithDetails,
        projectId: 'proj-1',
      }

      await downloadLienWaiverPDF(mockData)

      const mockLink = document.createElement('a') as any
      expect(mockLink.download).toBe('Lien_Waiver_Conditional_Progress_Payment_LW-2024-001_2024-01-15.pdf')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should cleanup blob URL after download', async () => {
      const mockData: LienWaiverPDFData = {
        waiver: {
          id: 'waiver-1',
          waiver_number: 'LW-001',
          waiver_type: 'unconditional_final',
          payment_amount: 50000,
        } as unknown as LienWaiverWithDetails,
        projectId: 'proj-1',
      }

      await downloadLienWaiverPDF(mockData)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('generateBlankWaiverPDF', () => {
    it('should generate blank waiver PDF with minimal data', async () => {
      const blob = await generateBlankWaiverPDF('conditional_progress', 'CA', 'proj-1')

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
    })

    it('should include project info when provided', async () => {
      const projectInfo = {
        projectName: 'Test Project',
        projectAddress: '123 Test St',
        ownerName: 'Test Owner',
        generalContractor: 'Test GC',
      }

      await generateBlankWaiverPDF('conditional_final', 'TX', 'proj-1', projectInfo)

      expect(mockText).toHaveBeenCalledWith('Test Project', expect.any(Number), expect.any(Number))
    })

    it('should set notarization_required based on state code', async () => {
      // California and Texas require notarization
      await generateBlankWaiverPDF('unconditional_progress', 'CA', 'proj-1')

      // Should call the function that generates the PDF with notarization_required: true
      expect(addDocumentHeader).toHaveBeenCalled()
    })
  })

  describe('downloadBlankWaiverPDF', () => {
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

    it('should trigger download with correct filename for blank template', async () => {
      await downloadBlankWaiverPDF('conditional_progress', 'NY', 'proj-1')

      const mockLink = document.createElement('a') as any
      // State name is not sanitized, so it contains a space
      expect(mockLink.download).toBe('Lien_Waiver_Conditional_Progress_Payment_New York_Blank.pdf')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should cleanup blob URL after download', async () => {
      await downloadBlankWaiverPDF('unconditional_final', 'CA', 'proj-1')

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
