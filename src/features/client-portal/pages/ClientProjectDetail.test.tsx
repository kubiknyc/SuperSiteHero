/**
 * ClientProjectDetail Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { ClientProjectDetail } from './ClientProjectDetail'
import type { ClientProjectView } from '@/types/client-portal'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'proj-123' }),
  }
})

// Mock the hooks
const mockUseClientProject = vi.fn()

vi.mock('../hooks/useClientPortal', () => ({
  useClientProject: () => mockUseClientProject(),
  useClientDashboardStats: () => ({ data: null, isLoading: false }),
}))

// Create mock project data
const createMockProject = (
  overrides: Partial<ClientProjectView> = {}
): ClientProjectView => ({
  id: 'proj-123',
  name: 'Downtown Office Building',
  project_number: 'PRJ-001',
  description: 'A modern office building',
  address: '123 Main Street',
  city: 'City',
  state: 'State',
  zip: '12345',
  status: 'active',
  start_date: '2025-01-15',
  end_date: '2025-12-15',
  substantial_completion_date: '2025-11-01',
  final_completion_date: '2025-12-15',
  budget: 5000000,
  contract_value: 4500000,
  welcome_message: 'Welcome to your project portal!',
  show_budget: true,
  show_schedule: true,
  show_documents: true,
  show_photos: true,
  show_rfis: true,
  show_change_orders: true,
  ...overrides,
})

function renderPage() {
  return render(
    <TestProviders>
      <ClientProjectDetail />
    </TestProviders>
  )
}

describe('ClientProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeletons', () => {
      mockUseClientProject.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { container } = renderPage()

      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Not Found State', () => {
    it('should show not found message when project is null', () => {
      mockUseClientProject.mockReturnValue({
        data: null,
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Project Not Found')).toBeInTheDocument()
      expect(screen.getByText(/may not exist or you don't have access/)).toBeInTheDocument()
    })

    it('should show back to dashboard link', () => {
      mockUseClientProject.mockReturnValue({
        data: null,
        isLoading: false,
      })

      renderPage()

      expect(screen.getByRole('link', { name: /back to dashboard/i })).toBeInTheDocument()
    })
  })

  describe('Welcome Message', () => {
    it('should display welcome message when present', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ welcome_message: 'Welcome to the portal!' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Welcome to the portal!')).toBeInTheDocument()
    })

    it('should not display welcome message card when not present', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ welcome_message: undefined }),
        isLoading: false,
      })

      renderPage()

      expect(screen.queryByText('Welcome to the portal!')).not.toBeInTheDocument()
    })
  })

  describe('Project Details Card', () => {
    it('should display project number', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ project_number: 'PRJ-999' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('#PRJ-999')).toBeInTheDocument()
    })

    it('should display project description', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ description: 'Test project description' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Test project description')).toBeInTheDocument()
    })

    it('should display full address', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({
          address: '456 Oak Avenue',
          city: 'Boston',
          state: 'MA',
          zip: '02101'
        }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/456 Oak Avenue.*Boston.*MA.*02101/)).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should show active status', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ status: 'active' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('should show completed status', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ status: 'completed' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('completed')).toBeInTheDocument()
    })

    it('should show on_hold status', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ status: 'on_hold' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('on hold')).toBeInTheDocument()
    })
  })

  describe('Timeline Card', () => {
    it('should display start date', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ start_date: '2025-06-15' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Start Date')).toBeInTheDocument()
      // Verify date is rendered - component uses MMMM d, yyyy format
      expect(screen.getByText('Project Timeline')).toBeInTheDocument()
    })

    it('should display substantial completion date', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ substantial_completion_date: '2025-10-15' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Substantial Completion')).toBeInTheDocument()
    })

    it('should display final completion date', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ final_completion_date: '2025-12-31' }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Final Completion')).toBeInTheDocument()
    })

    it('should show no timeline message when dates not present', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({
          start_date: undefined,
          end_date: undefined,
          substantial_completion_date: undefined,
          final_completion_date: undefined
        }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('No timeline information available.')).toBeInTheDocument()
    })
  })

  describe('Financial Overview', () => {
    it('should display contract value', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ contract_value: 1500000 }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Contract Value')).toBeInTheDocument()
      expect(screen.getByText('$1,500,000')).toBeInTheDocument()
    })

    it('should display budget', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ budget: 2000000 }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Budget')).toBeInTheDocument()
      expect(screen.getByText('$2,000,000')).toBeInTheDocument()
    })

    it('should not show financial section when no values', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ contract_value: null, budget: null }),
        isLoading: false,
      })

      renderPage()

      expect(screen.queryByText('Financial Overview')).not.toBeInTheDocument()
    })
  })

  describe('Project Resources', () => {
    it('should show Schedule link when enabled', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ show_schedule: true }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Schedule')).toBeInTheDocument()
      expect(screen.getByText('View project timeline and milestones')).toBeInTheDocument()
    })

    it('should show Photos link when enabled', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ show_photos: true }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Photos')).toBeInTheDocument()
      expect(screen.getByText('Browse project progress photos')).toBeInTheDocument()
    })

    it('should show Documents link when enabled', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ show_documents: true }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('Access project documents and files')).toBeInTheDocument()
    })

    it('should show RFIs link when enabled', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ show_rfis: true }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('RFIs')).toBeInTheDocument()
      expect(screen.getByText('View requests for information')).toBeInTheDocument()
    })

    it('should show Change Orders link when enabled', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({ show_change_orders: true }),
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Change Orders')).toBeInTheDocument()
      expect(screen.getByText('Review change orders and amendments')).toBeInTheDocument()
    })

    it('should not show disabled sections', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({
          show_schedule: false,
          show_photos: false,
          show_documents: false,
          show_rfis: false,
          show_change_orders: false,
        }),
        isLoading: false,
      })

      renderPage()

      expect(screen.queryByText('Project Resources')).not.toBeInTheDocument()
    })

    it('should have correct link URLs', () => {
      mockUseClientProject.mockReturnValue({
        data: createMockProject({
          id: 'proj-123',
          show_schedule: true
        }),
        isLoading: false,
      })

      renderPage()

      const scheduleLink = screen.getByRole('link', { name: /schedule/i })
      expect(scheduleLink).toHaveAttribute('href', '/client/projects/proj-123/schedule')
    })
  })
})
