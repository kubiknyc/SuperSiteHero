/**
 * Cost Estimate PDF Export Tests
 * Tests for professional cost estimate PDF generation functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { jsPDF } from 'jspdf'

// Mock jsPDF
const mockSetFillColor = vi.fn()
const mockRect = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockSetTextColor = vi.fn()
const mockText = vi.fn()
const mockSetDrawColor = vi.fn()
const mockSetLineWidth = vi.fn()
const mockLine = vi.fn()
const mockSplitTextToSize = vi.fn((text: string) => [text])
const mockAddPage = vi.fn()
const mockOutput = vi.fn(() => new Blob(['mock-pdf'], { type: 'application/pdf' }))

const mockJsPDF = {
  setFillColor: mockSetFillColor,
  rect: mockRect,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  setTextColor: mockSetTextColor,
  text: mockText,
  setDrawColor: mockSetDrawColor,
  setLineWidth: mockSetLineWidth,
  line: mockLine,
  splitTextToSize: mockSplitTextToSize,
  addPage: mockAddPage,
  output: mockOutput,
  lastAutoTable: { finalY: 100 },
} as unknown as jsPDF

vi.mock('jspdf', () => ({
  default: vi.fn(() => mockJsPDF),
}))

// Mock autoTable - use vi.fn() directly in factory
vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

// Mock date-fns - use vi.fn() directly in factory
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'MMMM d, yyyy') {return 'January 15, 2024'}
    if (formatStr === 'yyyy-MM-dd') {return '2024-01-15'}
    return '2024-01-15'
  }),
}))

// Mock pdfBranding utilities - use vi.fn() directly in factory
vi.mock('@/lib/utils/pdfBranding', () => ({
  getCompanyInfo: vi.fn(),
  addDocumentHeader: vi.fn(async () => 40),
  addFootersToAllPages: vi.fn(),
}))

// Import functions after mocking
import {
  generateCostEstimatePDF,
  downloadCostEstimatePDF,
  type CostEstimatePDFData,
} from '../pdfExport'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { getCompanyInfo, addDocumentHeader, addFootersToAllPages } from '@/lib/utils/pdfBranding'
import type { CostEstimate, CostEstimateItem } from '@/types/database-extensions'

describe('Cost Estimate PDF Export', () => {
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

  describe('generateCostEstimatePDF', () => {
    const mockEstimateData: CostEstimatePDFData = {
      estimate: {
        id: 'est-1',
        name: 'Renovation Project',
        description: 'Complete kitchen and bathroom renovation',
        status: 'draft',
        subtotal: 25000,
        markup_percentage: 15,
        markup_amount: 3750,
        total_cost: 28750,
        labor_rate: 85,
        created_at: '2024-01-15',
        items: [],
      } as unknown as CostEstimate & { items?: CostEstimateItem[] },
      projectId: 'proj-1',
      projectInfo: {
        name: 'Test Project',
        number: 'P-2024-001',
        client: 'Test Client LLC',
        address: '456 Project St, City, ST 12345',
      },
    }

    it('should generate basic cost estimate PDF', async () => {
      const blob = await generateCostEstimatePDF(mockEstimateData)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
      expect(mockOutput).toHaveBeenCalledWith('blob')
    })

    it('should fetch company info when not provided', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(getCompanyInfo).toHaveBeenCalledWith('proj-1')
    })

    it('should use provided company info', async () => {
      const gcCompany = {
        name: 'Custom GC',
        address: '456 Other St',
      }

      await generateCostEstimatePDF({
        ...mockEstimateData,
        gcCompany,
      })

      expect(getCompanyInfo).not.toHaveBeenCalled()
    })

    it('should add document header with estimate name and date', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(addDocumentHeader).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          documentTitle: 'Renovation Project - January 15, 2024',
          documentType: 'COST ESTIMATE',
        })
      )
    })

    it('should render project information section', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith('PROJECT INFORMATION', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Project:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Client:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Location:', expect.any(Number), expect.any(Number))
    })

    it('should include project number in project info', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Test Project (#P-2024-001)'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should render estimate description', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith('Description:', expect.any(Number), expect.any(Number))
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        'Complete kitchen and bathroom renovation',
        expect.any(Number)
      )
    })

    it('should render line items table when items exist', async () => {
      const dataWithItems = {
        ...mockEstimateData,
        estimate: {
          ...mockEstimateData.estimate,
          items: [
            {
              id: 'item-1',
              name: 'Cabinet Installation',
              measurement_type: 'ea',
              quantity: 12,
              unit_cost: 500,
              material_cost: 4000,
              labor_cost: 2000,
              total_cost: 6000,
            },
            {
              id: 'item-2',
              name: 'Tile Flooring',
              measurement_type: 'sqft',
              quantity: 150.5,
              unit_cost: 8,
              material_cost: 800,
              labor_cost: 404,
              total_cost: 1204,
            },
          ] as unknown as CostEstimateItem[],
        },
      }

      await generateCostEstimatePDF(dataWithItems)

      expect(mockText).toHaveBeenCalledWith('LINE ITEMS', expect.any(Number), expect.any(Number))
      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          head: [['#', 'Description', 'Unit', 'Qty', 'Unit Cost', 'Material', 'Labor', 'Total']],
          body: expect.arrayContaining([
            ['1', 'Cabinet Installation', 'ea', '12.00', '$500.00', '$4,000.00', '$2,000.00', '$6,000.00'],
            ['2', 'Tile Flooring', 'sqft', '150.50', '$8.00', '$800.00', '$404.00', '$1,204.00'],
            ['', 'SUBTOTAL', '', '', '', '$4,800.00', '$2,404.00', '$7,204.00'],
          ]),
        })
      )
    })

    it('should not render items table when no items exist', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      const lineItemsCalls = vi.mocked(mockText).mock.calls.filter(call =>
        call[0]?.toString().includes('LINE ITEMS')
      )
      expect(lineItemsCalls.length).toBe(0)
    })

    it('should truncate long item names to 50 characters', async () => {
      const dataWithLongName = {
        ...mockEstimateData,
        estimate: {
          ...mockEstimateData.estimate,
          items: [
            {
              id: 'item-1',
              name: 'This is a very long item name that exceeds fifty characters and should be truncated',
              measurement_type: 'ea',
              quantity: 1,
              unit_cost: 100,
              material_cost: 100,
              labor_cost: 0,
              total_cost: 100,
            },
          ] as unknown as CostEstimateItem[],
        },
      }

      await generateCostEstimatePDF(dataWithLongName)

      expect(autoTable).toHaveBeenCalledWith(
        mockJsPDF,
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.arrayContaining([
              expect.stringMatching(/^.{50}$/),
            ]),
          ]),
        })
      )
    })

    it('should render cost summary section', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith('COST SUMMARY', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Subtotal:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('TOTAL:', expect.any(Number), expect.any(Number))
    })

    it('should render markup with percentage', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith('Markup (15%)', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('$3,750.00'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      )
    })

    it('should render labor rate', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith('Labor Rate:', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('$85.00/hr'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      )
    })

    it('should render terms and conditions section', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith('TERMS & CONDITIONS', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('This estimate is valid for 30 days'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should render signature section', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(mockText).toHaveBeenCalledWith('PREPARED BY', expect.any(Number), expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('ACCEPTED BY', expect.any(Number), expect.any(Number))
      expect(mockLine).toHaveBeenCalled() // Signature lines
    })

    it('should add footers to all pages', async () => {
      await generateCostEstimatePDF(mockEstimateData)

      expect(addFootersToAllPages).toHaveBeenCalledWith(mockJsPDF)
    })

    it('should handle null currency values gracefully', async () => {
      const dataWithNulls = {
        ...mockEstimateData,
        estimate: {
          ...mockEstimateData.estimate,
          subtotal: null,
          markup_amount: null,
          total_cost: null,
          labor_rate: null,
        },
      }

      const blob = await generateCostEstimatePDF(dataWithNulls)

      expect(blob).toBeInstanceOf(Blob)
      // Should render $0.00 for null values
    })
  })

  describe('downloadCostEstimatePDF', () => {
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
      const mockData: CostEstimatePDFData = {
        estimate: {
          id: 'est-1',
          name: 'Kitchen Renovation',
        } as unknown as CostEstimate,
        projectId: 'proj-1',
      }

      await downloadCostEstimatePDF(mockData)

      const mockLink = document.createElement('a') as any
      expect(mockLink.download).toBe('Cost_Estimate_Kitchen_Renovation_2024-01-15.pdf')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should sanitize estimate name and truncate to 30 characters', async () => {
      const mockData: CostEstimatePDFData = {
        estimate: {
          id: 'est-1',
          name: 'Very Long Estimate Name with Special @#$% Characters that exceeds the maximum limit',
        } as unknown as CostEstimate,
        projectId: 'proj-1',
      }

      await downloadCostEstimatePDF(mockData)

      const mockLink = document.createElement('a') as any
      expect(mockLink.download).toMatch(/^Cost_Estimate_.{30}_\d{4}-\d{2}-\d{2}\.pdf$/)
    })

    it('should cleanup blob URL after download', async () => {
      const mockData: CostEstimatePDFData = {
        estimate: {
          id: 'est-1',
          name: 'Test Estimate',
        } as unknown as CostEstimate,
        projectId: 'proj-1',
      }

      await downloadCostEstimatePDF(mockData)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
