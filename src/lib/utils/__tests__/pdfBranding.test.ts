/**
 * PDF Branding Utility Tests
 * Critical tests for JobSight PDF branding functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { jsPDF } from 'jspdf'

// Mock jsPDF
const mockAddImage = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetTextColor = vi.fn()
const mockText = vi.fn()
const mockSetFont = vi.fn()
const mockGetNumberOfPages = vi.fn(() => 3)
const mockSetFillColor = vi.fn()
const mockRect = vi.fn()
const mockSetDrawColor = vi.fn()
const mockSetLineWidth = vi.fn()
const mockLine = vi.fn()
const mockSetPage = vi.fn()

const mockJsPDF = {
  addImage: mockAddImage,
  setFontSize: mockSetFontSize,
  setTextColor: mockSetTextColor,
  text: mockText,
  setFont: mockSetFont,
  getNumberOfPages: mockGetNumberOfPages,
  setFillColor: mockSetFillColor,
  rect: mockRect,
  setDrawColor: mockSetDrawColor,
  setLineWidth: mockSetLineWidth,
  line: mockLine,
  setPage: mockSetPage,
  internal: {
    pageSize: {
      getWidth: () => 210, // A4 width in mm
      getHeight: () => 297, // A4 height in mm
    },
  },
} as unknown as jsPDF

// Mock Supabase - use vi.fn() directly in the mock factory
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Import functions after mocking
import {
  addDocumentHeader,
  addDocumentFooter,
  addFootersToAllPages,
  getCompanyInfo,
  loadCompanyLogo,
} from '../pdfBranding'

// Import the mocked supabase to configure it
import { supabase } from '@/lib/supabase'

describe('pdfBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default Supabase mock chain using vi.mocked()
    const mockFrom = vi.mocked(supabase.from)
    const mockSelect = vi.fn()
    const mockSingle = vi.fn()

    mockFrom.mockReturnValue({ select: mockSelect } as any)
    mockSelect.mockReturnValue({ single: mockSingle } as any)
  })

  describe('getCompanyInfo', () => {
    it('should fetch company info from database with two queries', async () => {
      // First query: projects table to get company_id
      const mockProjectSingle = vi.fn().mockResolvedValueOnce({
        data: { company_id: 'company-123' },
        error: null,
      })
      const mockProjectEq = vi.fn().mockReturnValue({ single: mockProjectSingle })
      const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq })

      // Second query: companies table to get company details
      const mockCompanySingle = vi.fn().mockResolvedValueOnce({
        data: {
          name: 'Test Construction Co',
          logo_url: null, // No logo to avoid async image loading
          address: '123 Main St',
          city: 'TestCity',
          state: 'TS',
          zip: '12345',
          phone: '555-1234',
          email: 'info@test.com',
        },
        error: null,
      })
      const mockCompanyEq = vi.fn().mockReturnValue({ single: mockCompanySingle })
      const mockCompanySelect = vi.fn().mockReturnValue({ eq: mockCompanyEq })

      // Mock supabase.from to return different mocks for each table
      const mockFrom = vi.mocked(supabase.from)
      mockFrom
        .mockReturnValueOnce({ select: mockProjectSelect } as any) // First call: projects
        .mockReturnValueOnce({ select: mockCompanySelect } as any) // Second call: companies

      const result = await getCompanyInfo('project-123')

      expect(supabase.from).toHaveBeenCalledWith('projects')
      expect(mockProjectSelect).toHaveBeenCalledWith('company_id')
      expect(supabase.from).toHaveBeenCalledWith('companies')
      expect(result.name).toBe('Test Construction Co')
      expect(result.address).toBe('123 Main St, TestCity, TS, 12345')
    })

    it('should return default company info when project not found', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Project not found' },
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

      const result = await getCompanyInfo('invalid-project')

      // Default fallback uses JobSight branding with logo
      expect(result.name).toBe('JobSight')
      expect(result.logoBase64).toContain('data:image/svg+xml;base64,')
    })

    it('should return default company info when company data is missing', async () => {
      // First query succeeds
      const mockProjectSingle = vi.fn().mockResolvedValueOnce({
        data: { company_id: 'company-123' },
        error: null,
      })
      const mockProjectEq = vi.fn().mockReturnValue({ single: mockProjectSingle })
      const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq })

      // Second query fails
      const mockCompanySingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Company not found' },
      })
      const mockCompanyEq = vi.fn().mockReturnValue({ single: mockCompanySingle })
      const mockCompanySelect = vi.fn().mockReturnValue({ eq: mockCompanyEq })

      const mockFrom = vi.mocked(supabase.from)
      mockFrom
        .mockReturnValueOnce({ select: mockProjectSelect } as any)
        .mockReturnValueOnce({ select: mockCompanySelect } as any)

      const result = await getCompanyInfo('project-123')

      // Default fallback uses JobSight branding with logo
      expect(result.name).toBe('JobSight')
      expect(result.logoBase64).toContain('data:image/svg+xml;base64,')
    })
  })

  describe('loadCompanyLogo', () => {
    it('should load and convert image to base64', async () => {
      const mockLogoUrl = 'https://example.com/logo.png'
      const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      // Mock Image object
      global.Image = class Image {
        onload: (() => void) | null = null
        onerror: ((error: Error) => void) | null = null
        src = ''

        constructor() {
          // Simulate successful load
          setTimeout(() => {
            if (this.onload) {this.onload()}
          }, 0)
        }
      } as any

      // Mock canvas
      const mockToDataURL = vi.fn(() => mockBase64)
      const mockGetContext = vi.fn(() => ({
        drawImage: vi.fn(),
      }))

      global.document = {
        createElement: vi.fn(() => ({
          getContext: mockGetContext,
          toDataURL: mockToDataURL,
          width: 0,
          height: 0,
        })),
      } as any

      const result = await loadCompanyLogo(mockLogoUrl)

      expect(result).toBe(mockBase64)
    })

    it('should reject when image fails to load', async () => {
      const mockLogoUrl = 'https://example.com/invalid.png'

      global.Image = class Image {
        onload: (() => void) | null = null
        onerror: ((error: Error) => void) | null = null
        src = ''

        constructor() {
          // Simulate load error
          setTimeout(() => {
            if (this.onerror) {this.onerror(new Error('Failed to load'))}
          }, 0)
        }
      } as any

      await expect(loadCompanyLogo(mockLogoUrl)).rejects.toThrow()
    })
  })

  describe('addDocumentHeader', () => {
    it('should add header with company logo', async () => {
      const mockCompany = {
        name: 'Test Construction Co',
        logoBase64: 'data:image/png;base64,abc123',
      }

      const startY = await addDocumentHeader(mockJsPDF, {
        gcCompany: mockCompany,
        documentTitle: 'Test RFI',
        documentType: 'RFI',
      })

      expect(mockAddImage).toHaveBeenCalledWith(
        mockCompany.logoBase64,
        'PNG',              // format
        expect.any(Number), // x
        expect.any(Number), // y
        expect.any(Number), // width
        expect.any(Number)  // height
      )
      expect(mockSetFont).toHaveBeenCalled()
      expect(mockText).toHaveBeenCalled()
      expect(typeof startY).toBe('number')
    })

    it('should add header without logo when not provided', async () => {
      const mockCompany = {
        name: 'Test Construction Co',
      }

      const startY = await addDocumentHeader(mockJsPDF, {
        gcCompany: mockCompany,
        documentTitle: 'Test RFI',
        documentType: 'RFI',
      })

      expect(mockAddImage).not.toHaveBeenCalled()
      expect(mockText).toHaveBeenCalled() // Still adds company name
      expect(typeof startY).toBe('number')
    })

    it('should include document title in header when different from type', async () => {
      const mockCompany = {
        name: 'Test Construction Co',
      }

      vi.clearAllMocks()

      await addDocumentHeader(mockJsPDF, {
        gcCompany: mockCompany,
        documentTitle: 'My Test Document',
        documentType: 'RFI',
      })

      // Check that both document type (in banner) and title are added
      expect(mockText).toHaveBeenCalled()
      expect(mockRect).toHaveBeenCalled() // Document type banner
    })
  })

  describe('addDocumentFooter', () => {
    it('should add footer with page number', () => {
      addDocumentFooter(mockJsPDF, 1, 3)

      expect(mockSetFontSize).toHaveBeenCalled()
      expect(mockText).toHaveBeenCalled()
      expect(mockSetDrawColor).toHaveBeenCalled()
      expect(mockLine).toHaveBeenCalled()

      // Verify page number format
      expect(mockText).toHaveBeenCalledWith(
        'Page 1 of 3',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should include JobSight branding in footer', () => {
      vi.clearAllMocks()

      addDocumentFooter(mockJsPDF, 2, 5)

      // Check that JobSight branding is included
      expect(mockText).toHaveBeenCalledWith(
        'Powered by JobSightApp.com',
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'right' })
      )
    })

    it('should add generated date to footer', () => {
      vi.clearAllMocks()

      addDocumentFooter(mockJsPDF, 1, 1)

      // Check that generated date is included (center)
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Generated:'),
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'center' })
      )
    })
  })

  describe('addFootersToAllPages', () => {
    it('should add footers to all pages in document', () => {
      vi.clearAllMocks()
      mockGetNumberOfPages.mockReturnValue(5)

      addFootersToAllPages(mockJsPDF, 5)

      // Should call setPage for each page
      expect(mockSetPage).toHaveBeenCalledTimes(5)
      expect(mockSetPage).toHaveBeenCalledWith(1)
      expect(mockSetPage).toHaveBeenCalledWith(5)

      // Should add footer elements
      expect(mockText).toHaveBeenCalled()
      expect(mockLine).toHaveBeenCalled()
    })

    it('should handle single-page documents', () => {
      vi.clearAllMocks()
      mockGetNumberOfPages.mockReturnValue(1)

      addFootersToAllPages(mockJsPDF)

      expect(mockSetPage).toHaveBeenCalledTimes(1)
      expect(mockSetPage).toHaveBeenCalledWith(1)
      expect(mockText).toHaveBeenCalled()
    })

    it('should use getNumberOfPages when totalPages not provided', () => {
      vi.clearAllMocks()
      mockGetNumberOfPages.mockReturnValue(3)

      addFootersToAllPages(mockJsPDF)

      expect(mockGetNumberOfPages).toHaveBeenCalled()
      expect(mockSetPage).toHaveBeenCalledTimes(3)
    })
  })

  describe('Integration: Full branding workflow', () => {
    it('should apply complete branding to PDF document', async () => {
      // Setup mock company data
      const mockCompanyData = {
        name: 'JobSight Construction',
        logo_url: null, // Avoid async image loading in test
        address: '123 Main St',
        city: 'TestCity',
        state: 'TS',
        zip: '12345',
        phone: '555-1234',
        email: 'info@jobsight.com',
      }

      // First query: projects table to get company_id
      const mockProjectSingle = vi.fn().mockResolvedValueOnce({
        data: { company_id: 'company-123' },
        error: null,
      })
      const mockProjectEq = vi.fn().mockReturnValue({ single: mockProjectSingle })
      const mockProjectSelect = vi.fn().mockReturnValue({ eq: mockProjectEq })

      // Second query: companies table to get company details
      const mockCompanySingle = vi.fn().mockResolvedValueOnce({
        data: mockCompanyData,
        error: null,
      })
      const mockCompanyEq = vi.fn().mockReturnValue({ single: mockCompanySingle })
      const mockCompanySelect = vi.fn().mockReturnValue({ eq: mockCompanyEq })

      // Mock returns different chains for each call
      const mockFrom = vi.mocked(supabase.from)
      mockFrom
        .mockReturnValueOnce({ select: mockProjectSelect } as any)
        .mockReturnValueOnce({ select: mockCompanySelect } as any)

      // Get company info
      const company = await getCompanyInfo('project-123')
      expect(company.name).toBe('JobSight Construction')
      expect(company.address).toBe('123 Main St, TestCity, TS, 12345')

      // Add header with branding (async)
      const startY = await addDocumentHeader(mockJsPDF, {
        gcCompany: company,
        documentTitle: 'Test Document',
        documentType: 'RFI',
      })

      // Add footers to all pages
      mockGetNumberOfPages.mockReturnValue(2)
      addFootersToAllPages(mockJsPDF, 2)

      // Verify branding was applied
      expect(mockSetFont).toHaveBeenCalled()
      expect(mockText).toHaveBeenCalled()
      expect(mockSetFontSize).toHaveBeenCalled()
      expect(typeof startY).toBe('number')
      expect(mockSetPage).toHaveBeenCalledTimes(2)
    })
  })
})
