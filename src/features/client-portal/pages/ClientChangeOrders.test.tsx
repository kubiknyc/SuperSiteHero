/**
 * ClientChangeOrders Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { ClientChangeOrders } from './ClientChangeOrders'
import type { ClientChangeOrderView } from '@/types/client-portal'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'proj-123' }),
  }
})

// Mock the hooks
const mockUseClientChangeOrders = vi.fn()

vi.mock('../hooks/useClientPortal', () => ({
  useClientChangeOrders: () => mockUseClientChangeOrders(),
}))

// Create mock change order data
const createMockCO = (
  overrides: Partial<ClientChangeOrderView> = {}
): ClientChangeOrderView => ({
  id: 'co-123',
  number: 1,
  title: 'Additional Electrical Outlets',
  description: 'Add 10 additional outlets to conference rooms.',
  status: 'pending',
  cost_impact: 5000,
  schedule_impact_days: 3,
  created_at: '2025-01-15T10:30:00Z',
  approved_at: null,
  ...overrides,
})

function renderPage() {
  return render(
    <TestProviders>
      <ClientChangeOrders />
    </TestProviders>
  )
}

describe('ClientChangeOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeletons', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { container } = renderPage()

      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no change orders', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('No Change Orders Found')).toBeInTheDocument()
    })

    it('should show message in empty state', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Change orders for this project will appear here/i)).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display page title', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Change Orders')).toBeInTheDocument()
    })

    it('should display page description', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Review and track change orders for your project.')).toBeInTheDocument()
    })
  })

  describe('Summary Cards', () => {
    it('should display approved total', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [
          createMockCO({ id: 'co-1', status: 'approved', cost_impact: 10000 }),
          createMockCO({ id: 'co-2', status: 'approved', cost_impact: 5000 }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Approved Total')).toBeInTheDocument()
      expect(screen.getByText('$15,000')).toBeInTheDocument()
    })

    it('should display pending total', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [
          createMockCO({ id: 'co-1', status: 'pending', cost_impact: 8000 }),
          createMockCO({ id: 'co-2', status: 'submitted', cost_impact: 2000 }),
        ],
        isLoading: false,
      })

      renderPage()

      // "Pending Approval" appears in summary card and possibly in status badges
      const pendingElements = screen.getAllByText('Pending Approval')
      expect(pendingElements.length).toBeGreaterThan(0)
      expect(screen.getByText('$10,000')).toBeInTheDocument()
    })

    it('should display total change order count', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [
          createMockCO({ id: 'co-1' }),
          createMockCO({ id: 'co-2' }),
          createMockCO({ id: 'co-3' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Total Change Orders')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Change Order Table', () => {
    it('should display CO number', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ number: 42 })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('#42')).toBeInTheDocument()
    })

    it('should display CO title', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ title: 'HVAC Upgrade' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('HVAC Upgrade')).toBeInTheDocument()
    })

    it('should display CO description', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ description: 'Upgrade to high-efficiency units' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Upgrade to high-efficiency units')).toBeInTheDocument()
    })

    it('should display created date', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ created_at: '2025-06-15T10:00:00Z' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument()
    })
  })

  describe('Table Headers', () => {
    it('should display all column headers', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('CO #')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Cost Impact')).toBeInTheDocument()
      expect(screen.getByText('Schedule Impact')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should show Draft status badge', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ status: 'draft' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('should show Pending Approval status badge', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ status: 'pending' })],
        isLoading: false,
      })

      renderPage()

      // "Pending Approval" appears in summary card and status badge
      const pendingElements = screen.getAllByText('Pending Approval')
      expect(pendingElements.length).toBeGreaterThan(0)
    })

    it('should show Approved status badge', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ status: 'approved' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Approved')).toBeInTheDocument()
    })

    it('should show Rejected status badge', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ status: 'rejected' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })
  })

  describe('Cost Impact Display', () => {
    it('should display positive cost impact', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ id: 'co-cost', status: 'approved', cost_impact: 15000 })],
        isLoading: false,
      })

      renderPage()

      // $15,000 may appear in summary card and table
      const costElements = screen.getAllByText('$15,000')
      expect(costElements.length).toBeGreaterThan(0)
    })

    it('should display negative cost impact (credit)', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ cost_impact: -5000 })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('$5,000')).toBeInTheDocument()
    })

    it('should display dash for null cost impact', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ cost_impact: null })],
        isLoading: false,
      })

      renderPage()

      const dashElements = screen.getAllByText('-')
      expect(dashElements.length).toBeGreaterThan(0)
    })
  })

  describe('Schedule Impact Display', () => {
    it('should display positive schedule impact', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ schedule_impact_days: 5 })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('+5 days')).toBeInTheDocument()
    })

    it('should display negative schedule impact (reduction)', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ schedule_impact_days: -3 })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('-3 days')).toBeInTheDocument()
    })

    it('should display dash for null schedule impact', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ schedule_impact_days: null })],
        isLoading: false,
      })

      renderPage()

      const dashElements = screen.getAllByText('-')
      expect(dashElements.length).toBeGreaterThan(0)
    })
  })

  describe('CO Count', () => {
    it('should display CO count', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [
          createMockCO({ id: 'co-1' }),
          createMockCO({ id: 'co-2' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Showing 2 change orders/)).toBeInTheDocument()
    })

    it('should use singular form for single CO', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Showing 1 change order$/)).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('should have search input', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByPlaceholderText(/search by title, description, or CO number/i)).toBeInTheDocument()
    })

    it('should filter COs by search term', async () => {
      const user = userEvent.setup()
      mockUseClientChangeOrders.mockReturnValue({
        data: [
          createMockCO({ id: 'co-1', title: 'Electrical Upgrade' }),
          createMockCO({ id: 'co-2', title: 'HVAC Modification' }),
        ],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search by title, description, or CO number/i)
      await user.type(searchInput, 'Electrical')

      expect(screen.getByText(/Showing 1 change order/)).toBeInTheDocument()
      expect(screen.getByText('Electrical Upgrade')).toBeInTheDocument()
      expect(screen.queryByText('HVAC Modification')).not.toBeInTheDocument()
    })

    it('should show status filter', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('All Statuses')).toBeInTheDocument()
    })

    it('should show filtered indicator when filters applied', async () => {
      const user = userEvent.setup()
      mockUseClientChangeOrders.mockReturnValue({
        data: [
          createMockCO({ id: 'co-1', title: 'Test' }),
          createMockCO({ id: 'co-2', title: 'Other' }),
        ],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search by title, description, or CO number/i)
      await user.type(searchInput, 'Test')

      expect(screen.getByText(/\(filtered\)/)).toBeInTheDocument()
    })

    it('should show clear filters button when filters applied', async () => {
      const user = userEvent.setup()
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ title: 'Test' })],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search by title, description, or CO number/i)
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
    })
  })

  describe('Detail Dialog', () => {
    it('should open dialog on row click', async () => {
      const user = userEvent.setup()
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ number: 1, title: 'Test CO' })],
        isLoading: false,
      })

      renderPage()

      const row = screen.getByText('Test CO').closest('tr')
      await user.click(row!)

      // After clicking, the dialog should show the CO title
      // The dialog might not have role="dialog" depending on the implementation
      expect(screen.getByText('Change Order #1')).toBeInTheDocument()
    })

    it('should display cost impact in dialog', async () => {
      const user = userEvent.setup()
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ cost_impact: 25000 })],
        isLoading: false,
      })

      renderPage()

      const row = screen.getByText('Additional Electrical Outlets').closest('tr')
      await user.click(row!)

      expect(screen.getByText('+$25,000')).toBeInTheDocument()
    })

    it('should display schedule impact in dialog', async () => {
      const user = userEvent.setup()
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({ schedule_impact_days: 7 })],
        isLoading: false,
      })

      renderPage()

      const row = screen.getByText('Additional Electrical Outlets').closest('tr')
      await user.click(row!)

      // "+7 days" appears in both table and dialog
      const impactElements = screen.getAllByText('+7 days')
      expect(impactElements.length).toBeGreaterThan(0)
    })

    it('should show approval date for approved COs', async () => {
      const user = userEvent.setup()
      mockUseClientChangeOrders.mockReturnValue({
        data: [createMockCO({
          status: 'approved',
          approved_at: '2025-02-01T14:00:00Z'
        })],
        isLoading: false,
      })

      renderPage()

      const row = screen.getByText('Additional Electrical Outlets').closest('tr')
      await user.click(row!)

      // "Approved" appears multiple times (stats, table badge, dialog)
      const approvedElements = screen.getAllByText('Approved')
      expect(approvedElements.length).toBeGreaterThan(0)
      // Check for date - use flexible regex for timezone variations
      expect(screen.getByText(/February.*2025/)).toBeInTheDocument()
    })
  })

  describe('Multiple Change Orders', () => {
    it('should display all change orders', () => {
      mockUseClientChangeOrders.mockReturnValue({
        data: [
          createMockCO({ id: 'co-1', title: 'CO Alpha', number: 1 }),
          createMockCO({ id: 'co-2', title: 'CO Beta', number: 2 }),
          createMockCO({ id: 'co-3', title: 'CO Gamma', number: 3 }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('CO Alpha')).toBeInTheDocument()
      expect(screen.getByText('CO Beta')).toBeInTheDocument()
      expect(screen.getByText('CO Gamma')).toBeInTheDocument()
    })
  })
})
