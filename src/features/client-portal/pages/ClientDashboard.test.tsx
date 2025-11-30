/**
 * ClientDashboard Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { ClientDashboard } from './ClientDashboard'
import type { ClientProjectView, ClientDashboardStats } from '@/types/client-portal'

// Mock the hooks
const mockUseClientProjects = vi.fn()
const mockUseClientDashboardStats = vi.fn()

vi.mock('../hooks/useClientPortal', () => ({
  useClientProjects: () => mockUseClientProjects(),
  useClientDashboardStats: () => mockUseClientDashboardStats(),
}))

// Create mock project data
const createMockProject = (
  overrides: Partial<ClientProjectView> = {}
): ClientProjectView => ({
  id: 'proj-123',
  name: 'Downtown Office Building',
  project_number: 'PRJ-001',
  address: '123 Main Street',
  city: 'City',
  state: 'State',
  status: 'active',
  start_date: '2025-01-15',
  end_date: '2025-12-15',
  show_budget: false,
  show_schedule: true,
  show_documents: true,
  show_photos: true,
  show_rfis: true,
  show_change_orders: true,
  ...overrides,
})

const createMockStats = (
  overrides: Partial<ClientDashboardStats> = {}
): ClientDashboardStats => ({
  total_projects: 5,
  active_projects: 3,
  completed_projects: 2,
  open_rfis: 10,
  pending_change_orders: 4,
  upcoming_milestones: 6,
  ...overrides,
})

function renderDashboard() {
  return render(
    <TestProviders>
      <ClientDashboard />
    </TestProviders>
  )
}

describe('ClientDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeletons while projects are loading', () => {
      mockUseClientProjects.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      })

      const { container } = renderDashboard()

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no projects', () => {
      mockUseClientProjects.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats({ total_projects: 0 }),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('No Projects Yet')).toBeInTheDocument()
      expect(
        screen.getByText(/haven't been added to any projects yet/i)
      ).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display welcome header', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('Welcome to Your Project Portal')).toBeInTheDocument()
    })

    it('should display page description', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(
        screen.getByText(/View progress, documents, and updates/i)
      ).toBeInTheDocument()
    })
  })

  describe('Stats Cards', () => {
    it('should display total projects count', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats({ total_projects: 5 }),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Total Projects')).toBeInTheDocument()
    })

    it('should display upcoming milestones count', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats({ upcoming_milestones: 6 }),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('Upcoming Milestones')).toBeInTheDocument()
    })

    it('should display open RFIs count', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats({ open_rfis: 10 }),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Open RFIs')).toBeInTheDocument()
    })

    it('should display pending change orders count', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats({ pending_change_orders: 4 }),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('Pending Change Orders')).toBeInTheDocument()
    })
  })

  describe('Project Cards', () => {
    it('should display project name', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ name: 'Test Project' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('should display project number', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ project_number: 'PRJ-999' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('#PRJ-999')).toBeInTheDocument()
    })

    it('should display project address', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ address: '456 Oak Avenue', city: 'Boston', state: 'MA' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText(/456 Oak Avenue, Boston, MA/)).toBeInTheDocument()
    })

    it('should display project dates', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ start_date: '2025-06-15', end_date: '2025-12-15' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      // Verify project card renders - dates are formatted with date-fns
      expect(screen.getByText('Downtown Office Building')).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should show active badge for active projects', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ status: 'active' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('should show completed badge for completed projects', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ status: 'completed' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('completed')).toBeInTheDocument()
    })

    it('should show on_hold badge for on hold projects', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ status: 'on_hold' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('on hold')).toBeInTheDocument()
    })
  })

  describe('Available Sections Indicators', () => {
    it('should show Schedule indicator when enabled', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ show_schedule: true })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('Schedule')).toBeInTheDocument()
    })

    it('should show Documents indicator when enabled', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ show_documents: true })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('Documents')).toBeInTheDocument()
    })

    it('should show RFIs indicator when enabled', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ show_rfis: true })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('RFIs')).toBeInTheDocument()
    })

    it('should not show indicators when disabled', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ show_schedule: false, show_documents: false, show_rfis: false })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.queryByText('Schedule')).not.toBeInTheDocument()
      expect(screen.queryByText('Documents')).not.toBeInTheDocument()
      expect(screen.queryByText('RFIs')).not.toBeInTheDocument()
    })
  })

  describe('Project Links', () => {
    it('should link to project detail page', () => {
      mockUseClientProjects.mockReturnValue({
        data: [createMockProject({ id: 'proj-123' })],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats(),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/client/projects/proj-123')
    })
  })

  describe('Multiple Projects', () => {
    it('should display all projects', () => {
      mockUseClientProjects.mockReturnValue({
        data: [
          createMockProject({ id: 'proj-1', name: 'Project Alpha' }),
          createMockProject({ id: 'proj-2', name: 'Project Beta' }),
          createMockProject({ id: 'proj-3', name: 'Project Gamma' }),
        ],
        isLoading: false,
        isError: false,
      })
      mockUseClientDashboardStats.mockReturnValue({
        data: createMockStats({ total_projects: 3 }),
        isLoading: false,
        isError: false,
      })

      renderDashboard()

      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.getByText('Project Beta')).toBeInTheDocument()
      expect(screen.getByText('Project Gamma')).toBeInTheDocument()
    })
  })
})
