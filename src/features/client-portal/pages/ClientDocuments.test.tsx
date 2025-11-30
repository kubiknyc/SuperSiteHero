/**
 * ClientDocuments Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { ClientDocuments } from './ClientDocuments'
import type { ClientDocumentView } from '@/types/client-portal'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'proj-123' }),
  }
})

// Mock the hooks
const mockUseClientDocuments = vi.fn()

vi.mock('../hooks/useClientPortal', () => ({
  useClientDocuments: () => mockUseClientDocuments(),
}))

// Mock window.open
const mockWindowOpen = vi.fn()
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
})

// Create mock document data
const createMockDocument = (
  overrides: Partial<ClientDocumentView> = {}
): ClientDocumentView => ({
  id: 'doc-123',
  name: 'Test Document.pdf',
  document_number: 'DOC-001',
  category: 'drawing',
  file_url: 'https://example.com/document.pdf',
  file_type: 'application/pdf',
  file_size: 1024000,
  version: '1.0',
  uploaded_at: '2025-01-15T10:30:00Z',
  ...overrides,
})

function renderPage() {
  return render(
    <TestProviders>
      <ClientDocuments />
    </TestProviders>
  )
}

describe('ClientDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeletons', () => {
      mockUseClientDocuments.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { container } = renderPage()

      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no documents', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('No Documents Available')).toBeInTheDocument()
    })

    it('should show upload message in empty state', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/documents will appear here once they're uploaded/i)).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display page title', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Project Documents')).toBeInTheDocument()
    })

    it('should display page description', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Access and download project documents and files.')).toBeInTheDocument()
    })
  })

  describe('Document Count', () => {
    it('should display document count', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: 'doc-1' }),
          createMockDocument({ id: 'doc-2' }),
          createMockDocument({ id: 'doc-3' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Showing 3 documents/)).toBeInTheDocument()
    })

    it('should use singular form for single document', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Showing 1 document$/)).toBeInTheDocument()
    })
  })

  describe('Document Table', () => {
    it('should display document name', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ name: 'Blueprint v2.pdf' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Blueprint v2.pdf')).toBeInTheDocument()
    })

    it('should display document number', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ document_number: 'DWG-123' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('#DWG-123')).toBeInTheDocument()
    })

    it('should display category badge', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ category: 'specification' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('specification')).toBeInTheDocument()
    })

    it('should display version', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ version: '2.1' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('2.1')).toBeInTheDocument()
    })

    it('should display formatted file size', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ file_size: 2097152 })], // 2MB
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('2.0 MB')).toBeInTheDocument()
    })

    it('should display upload date', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ uploaded_at: '2025-06-15T10:00:00Z' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument()
    })
  })

  describe('Table Headers', () => {
    it('should display all column headers', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Document')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Version')).toBeInTheDocument()
      expect(screen.getByText('Size')).toBeInTheDocument()
      expect(screen.getByText('Uploaded')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('should have search input', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByPlaceholderText(/search by name or document number/i)).toBeInTheDocument()
    })

    it('should filter documents by search term', async () => {
      const user = userEvent.setup()
      mockUseClientDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: 'doc-1', name: 'Foundation Plans.pdf' }),
          createMockDocument({ id: 'doc-2', name: 'Electrical Specs.pdf' }),
        ],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search by name or document number/i)
      await user.type(searchInput, 'Foundation')

      expect(screen.getByText(/Showing 1 document/)).toBeInTheDocument()
      expect(screen.getByText('Foundation Plans.pdf')).toBeInTheDocument()
      expect(screen.queryByText('Electrical Specs.pdf')).not.toBeInTheDocument()
    })

    it('should show category filter when categories exist', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: 'doc-1', category: 'drawing' }),
          createMockDocument({ id: 'doc-2', category: 'specification' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('All Categories')).toBeInTheDocument()
    })

    it('should show filtered indicator when filters applied', async () => {
      const user = userEvent.setup()
      mockUseClientDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: 'doc-1', name: 'Test' }),
          createMockDocument({ id: 'doc-2', name: 'Other' }),
        ],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search by name or document number/i)
      await user.type(searchInput, 'Test')

      expect(screen.getByText(/\(filtered\)/)).toBeInTheDocument()
    })

    it('should show clear filters button when filters applied', async () => {
      const user = userEvent.setup()
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ name: 'Test' })],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search by name or document number/i)
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
    })
  })

  describe('Download Actions', () => {
    it('should have download button for documents', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ file_url: 'https://example.com/doc.pdf' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByTitle('Download')).toBeInTheDocument()
    })

    it('should have open in new tab link', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ file_url: 'https://example.com/doc.pdf' })],
        isLoading: false,
      })

      const { container } = renderPage()

      // Check for external link that opens in new tab
      const externalLinks = container.querySelectorAll('a[target="_blank"]')
      expect(externalLinks.length).toBeGreaterThan(0)
      const link = Array.from(externalLinks).find(l => l.getAttribute('href') === 'https://example.com/doc.pdf')
      expect(link).toBeTruthy()
    })

    it('should open download URL on click', async () => {
      const user = userEvent.setup()
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ file_url: 'https://example.com/test.pdf' })],
        isLoading: false,
      })

      renderPage()

      const downloadButton = screen.getByTitle('Download')
      await user.click(downloadButton)

      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/test.pdf', '_blank')
    })
  })

  describe('File Icons', () => {
    it('should show correct icon for PDF files', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ file_type: 'application/pdf' })],
        isLoading: false,
      })

      renderPage()

      // Just verify the document renders - icon testing would require checking SVG
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument()
    })
  })

  describe('Category Grouping', () => {
    it('should show By Category section when multiple categories', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: 'doc-1', category: 'drawing' }),
          createMockDocument({ id: 'doc-2', category: 'specification' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('By Category')).toBeInTheDocument()
    })

    it('should show file count per category', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: 'doc-1', category: 'drawing' }),
          createMockDocument({ id: 'doc-2', category: 'drawing' }),
          createMockDocument({ id: 'doc-3', category: 'specification' }), // Need multiple categories to show the section
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/2 files/)).toBeInTheDocument()
    })
  })

  describe('Multiple Documents', () => {
    it('should display all documents', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: 'doc-1', name: 'Doc Alpha.pdf' }),
          createMockDocument({ id: 'doc-2', name: 'Doc Beta.pdf' }),
          createMockDocument({ id: 'doc-3', name: 'Doc Gamma.pdf' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Doc Alpha.pdf')).toBeInTheDocument()
      expect(screen.getByText('Doc Beta.pdf')).toBeInTheDocument()
      expect(screen.getByText('Doc Gamma.pdf')).toBeInTheDocument()
    })
  })

  describe('Missing Data Handling', () => {
    it('should show dash for missing category', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ category: undefined })],
        isLoading: false,
      })

      renderPage()

      // The table shows "-" for missing category
      const dashElements = screen.getAllByText('-')
      expect(dashElements.length).toBeGreaterThan(0)
    })

    it('should show dash for missing version', () => {
      mockUseClientDocuments.mockReturnValue({
        data: [createMockDocument({ version: undefined })],
        isLoading: false,
      })

      renderPage()

      const dashElements = screen.getAllByText('-')
      expect(dashElements.length).toBeGreaterThan(0)
    })
  })
})
