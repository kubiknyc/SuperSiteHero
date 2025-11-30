/**
 * SubcontractorCompliancePage Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { SubcontractorCompliancePage } from './SubcontractorCompliancePage'
import type { ComplianceDocumentWithRelations } from '@/types/subcontractor-portal'

// Mock current date
const mockDate = new Date('2025-01-15T12:00:00Z')

// Mock the hooks
const mockUseComplianceDocuments = vi.fn()
const mockUseExpiringDocuments = vi.fn()

vi.mock('@/features/subcontractor-portal/hooks', () => ({
  useComplianceDocuments: () => mockUseComplianceDocuments(),
  useExpiringDocuments: () => mockUseExpiringDocuments(),
  getDocumentTypeLabel: (type: string) => {
    const labels: Record<string, string> = {
      insurance_certificate: 'Insurance Certificate',
      license: 'License',
      w9: 'W-9 Form',
      bond: 'Bond',
      safety_cert: 'Safety Certification',
      other: 'Other Document',
    }
    return labels[type] || type
  },
  isExpired: (date: string | null) => {
    if (!date) return false
    return new Date(date) < mockDate
  },
  isExpiringSoon: (date: string | null) => {
    if (!date) return false
    const expDate = new Date(date)
    const daysUntil = Math.ceil((expDate.getTime() - mockDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil > 0 && daysUntil <= 30
  },
}))

// Mock auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      email: 'sub@example.com',
      role: 'subcontractor',
    },
  }),
}))

// Mock compliance components
vi.mock('@/features/subcontractor-portal/components', () => ({
  ComplianceDocumentCard: ({ document }: { document: ComplianceDocumentWithRelations }) => (
    <div data-testid="compliance-card">{document.document_name}</div>
  ),
  ComplianceUploadDialog: () => <button>Upload Document</button>,
  ExpirationBadge: () => <span>Expiration Badge</span>,
}))

// Create mock document data
const createMockDocument = (
  overrides: Partial<ComplianceDocumentWithRelations> = {}
): ComplianceDocumentWithRelations => ({
  id: 'doc-123',
  subcontractor_id: 'sub-123',
  project_id: null,
  document_type: 'insurance_certificate',
  document_name: 'General Liability Insurance',
  description: null,
  file_url: 'https://example.com/doc.pdf',
  file_size: null,
  mime_type: null,
  issue_date: '2025-01-01',
  expiration_date: '2026-01-01',
  is_expired: false,
  expiration_warning_sent: false,
  coverage_amount: null,
  policy_number: null,
  provider_name: null,
  status: 'approved',
  reviewed_by: null,
  reviewed_at: null,
  rejection_notes: null,
  uploaded_by: null,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
  deleted_at: null,
  ...overrides,
})

function renderPage() {
  return render(
    <TestProviders>
      <SubcontractorCompliancePage />
    </TestProviders>
  )
}

describe('SubcontractorCompliancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    // Default mocks
    mockUseExpiringDocuments.mockReturnValue({
      data: [],
      isLoading: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Loading State', () => {
    it('should show loading skeletons while data is loading', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      })

      const { container } = renderPage()

      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('should show error message when fetch fails', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      })

      renderPage()

      expect(screen.getByText('Failed to load compliance documents')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no documents', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('No Documents Yet')).toBeInTheDocument()
      expect(
        screen.getByText(/upload your compliance documents/i)
      ).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display page title', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Compliance Documents')).toBeInTheDocument()
    })

    it('should display page description', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(
        screen.getByText('Manage your compliance documents, certificates, and licenses.')
      ).toBeInTheDocument()
    })

    it('should display upload button', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument()
    })
  })

  describe('Expiring Documents Alert', () => {
    it('should show alert when there are expiring documents', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
        isError: false,
      })
      mockUseExpiringDocuments.mockReturnValue({
        data: [createMockDocument({ expiration_date: '2025-02-01' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Documents Requiring Attention')).toBeInTheDocument()
      expect(
        screen.getByText(/1 document\(s\) that are expired or expiring soon/i)
      ).toBeInTheDocument()
    })

    it('should not show alert when no expiring documents', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
        isError: false,
      })
      mockUseExpiringDocuments.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.queryByText('Documents Requiring Attention')).not.toBeInTheDocument()
    })
  })

  describe('Stats Cards', () => {
    it('should display total count', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1' }),
          createMockDocument({ id: '2' }),
          createMockDocument({ id: '3' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Total')).toBeInTheDocument()
      // The tab shows the count in parentheses
      expect(screen.getByRole('tab', { name: /all \(3\)/i })).toBeInTheDocument()
    })

    it('should display pending count', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', status: 'pending' }),
          createMockDocument({ id: '2', status: 'pending' }),
          createMockDocument({ id: '3', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Pending')).toBeInTheDocument()
      // The tab shows the count in parentheses
      expect(screen.getByRole('tab', { name: /pending \(2\)/i })).toBeInTheDocument()
    })

    it('should display approved count', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', status: 'approved' }),
          createMockDocument({ id: '2', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Approved')).toBeInTheDocument()
    })

    it('should display rejected count', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', status: 'rejected' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should display all tabs', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [createMockDocument()],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /expiring/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /approved/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /rejected/i })).toBeInTheDocument()
    })

    it('should show All tab as default', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', status: 'pending' }),
          createMockDocument({ id: '2', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      // By default, All tab should be selected and all documents should be shown
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
      // All documents are displayed
      expect(screen.getAllByTestId('compliance-card')).toHaveLength(2)
    })

    it('should switch tabs when clicked', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', document_name: 'Pending Doc', status: 'pending' }),
          createMockDocument({ id: '2', document_name: 'Approved Doc', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      // Initially should show all documents (2)
      expect(screen.getAllByTestId('compliance-card')).toHaveLength(2)

      // Click pending tab
      const pendingTab = screen.getByRole('tab', { name: /pending/i })
      await user.click(pendingTab)

      // After clicking pending tab, should only show 1 document
      await waitFor(() => {
        expect(screen.getAllByTestId('compliance-card')).toHaveLength(1)
      })
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
    })
  })

  describe('Document Display', () => {
    it('should display documents', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', document_name: 'Insurance Doc' }),
          createMockDocument({ id: '2', document_name: 'License Doc' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      const cards = screen.getAllByTestId('compliance-card')
      expect(cards).toHaveLength(2)
    })

    it('should group documents by type', () => {
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', document_type: 'insurance_certificate' }),
          createMockDocument({ id: '2', document_type: 'license' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Insurance Certificate')).toBeInTheDocument()
      expect(screen.getByText('License')).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('should filter to show only pending documents', async () => {
      // Use real timers for this test since we're not testing date behavior
      vi.useRealTimers()
      const user = userEvent.setup()
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', document_name: 'Pending Doc', status: 'pending' }),
          createMockDocument({ id: '2', document_name: 'Approved Doc', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      const pendingTab = screen.getByRole('tab', { name: /pending/i })
      await user.click(pendingTab)

      // Wait for re-render
      await waitFor(() => {
        const cards = screen.getAllByTestId('compliance-card')
        expect(cards).toHaveLength(1)
        expect(cards[0]).toHaveTextContent('Pending Doc')
      })
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
    })

    it('should filter to show only approved documents', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', document_name: 'Pending Doc', status: 'pending' }),
          createMockDocument({ id: '2', document_name: 'Approved Doc', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      const approvedTab = screen.getByRole('tab', { name: /approved/i })
      await user.click(approvedTab)

      await waitFor(() => {
        const cards = screen.getAllByTestId('compliance-card')
        expect(cards).toHaveLength(1)
        expect(cards[0]).toHaveTextContent('Approved Doc')
      })
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
    })

    it('should show empty state for filtered view with no matches', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      const rejectedTab = screen.getByRole('tab', { name: /rejected/i })
      await user.click(rejectedTab)

      await waitFor(() => {
        expect(screen.getByText('No Rejected Documents')).toBeInTheDocument()
      })
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
    })
  })

  describe('Stats Card Click', () => {
    it('should switch to corresponding tab when stats card is clicked', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      mockUseComplianceDocuments.mockReturnValue({
        data: [
          createMockDocument({ id: '1', document_name: 'Pending Doc', status: 'pending' }),
          createMockDocument({ id: '2', document_name: 'Approved Doc', status: 'approved' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      // Initially should show all documents (2)
      expect(screen.getAllByTestId('compliance-card')).toHaveLength(2)

      // Click on the Pending stats card
      const pendingCard = screen.getByText('Pending').closest('[class*="cursor-pointer"]')
      if (pendingCard) {
        await user.click(pendingCard)
      }

      // After clicking the pending card, should only show 1 document
      await waitFor(() => {
        expect(screen.getAllByTestId('compliance-card')).toHaveLength(1)
      })
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
    })
  })
})
