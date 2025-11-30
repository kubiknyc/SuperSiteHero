/**
 * SubcontractorProjectsPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { SubcontractorProjectsPage } from './SubcontractorProjectsPage'
import type { SubcontractorProject } from '@/types/subcontractor-portal'

// Mock the hooks
const mockUseSubcontractorProjects = vi.fn()

vi.mock('@/features/subcontractor-portal/hooks', () => ({
  useSubcontractorProjects: () => mockUseSubcontractorProjects(),
}))

// Create mock project data
const createMockProject = (
  overrides: Partial<SubcontractorProject> = {}
): SubcontractorProject => ({
  id: 'proj-123',
  name: 'Downtown Office Building',
  address: '123 Main Street, City, State',
  status: 'active',
  trade: 'Electrical',
  scope_of_work: 'Complete electrical installation for floors 1-5',
  contract_amount: 150000,
  contract_start_date: '2025-01-15',
  contract_end_date: '2025-06-15',
  punch_item_count: 5,
  task_count: 12,
  pending_bid_count: 2,
  permissions: {
    can_view_scope: true,
    can_view_documents: true,
    can_submit_bids: true,
    can_view_schedule: true,
    can_update_punch_items: true,
    can_update_tasks: true,
    can_upload_documents: true,
  },
  ...overrides,
})

function renderPage() {
  return render(
    <TestProviders>
      <SubcontractorProjectsPage />
    </TestProviders>
  )
}

describe('SubcontractorProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeletons while data is loading', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      })

      const { container } = renderPage()

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('should show error message when fetch fails', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      })

      renderPage()

      expect(screen.getByText('Failed to load projects')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('No Projects Yet')).toBeInTheDocument()
      expect(
        screen.getByText(/haven't been invited to any projects yet/i)
      ).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display page title', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('My Projects')).toBeInTheDocument()
    })

    it('should display page description', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(
        screen.getByText('Projects you have access to as a subcontractor.')
      ).toBeInTheDocument()
    })
  })

  describe('Project Cards', () => {
    it('should display project name', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ name: 'Test Project' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('should display project address', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ address: '456 Oak Avenue' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('456 Oak Avenue')).toBeInTheDocument()
    })

    it('should display trade', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ trade: 'Plumbing' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Plumbing')).toBeInTheDocument()
    })

    it('should display scope of work', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ scope_of_work: 'Install new HVAC system' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Install new HVAC system')).toBeInTheDocument()
    })

    it('should display contract amount', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ contract_amount: 75000 })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('$75,000')).toBeInTheDocument()
    })
  })

  describe('Project Status Badges', () => {
    it('should show Active badge for active projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ status: 'active' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should show Planning badge for planning projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ status: 'planning' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Planning')).toBeInTheDocument()
    })

    it('should show On Hold badge for on_hold projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ status: 'on_hold' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('On Hold')).toBeInTheDocument()
    })

    it('should show Completed badge for completed projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ status: 'completed' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  describe('Item Counts', () => {
    it('should display punch item count when greater than 0', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ punch_item_count: 8 })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('8 punch items')).toBeInTheDocument()
    })

    it('should display task count when greater than 0', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ task_count: 15 })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('15 tasks')).toBeInTheDocument()
    })

    it('should display pending bid count when greater than 0', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ pending_bid_count: 3 })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('3 pending bids')).toBeInTheDocument()
    })

    it('should not display counts when all are 0', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [
          createMockProject({
            punch_item_count: 0,
            task_count: 0,
            pending_bid_count: 0,
          }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.queryByText(/punch items/)).not.toBeInTheDocument()
      expect(screen.queryByText(/tasks/)).not.toBeInTheDocument()
      expect(screen.queryByText(/pending bids/)).not.toBeInTheDocument()
    })
  })

  describe('Permissions Display', () => {
    it('should display permission badges', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [
          createMockProject({
            permissions: {
              can_view_scope: true,
              can_view_documents: true,
              can_submit_bids: true,
              can_view_schedule: false,
              can_update_punch_items: false,
              can_update_tasks: false,
              can_upload_documents: false,
            },
          }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      // Use getAllByText since "View Scope" appears both as permission badge and button
      expect(screen.getAllByText('View Scope').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('View Docs')).toBeInTheDocument()
      expect(screen.getByText('Submit Bids')).toBeInTheDocument()
    })

    it('should show View only when no permissions', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [
          createMockProject({
            permissions: {
              can_view_scope: false,
              can_view_documents: false,
              can_submit_bids: false,
              can_view_schedule: false,
              can_update_punch_items: false,
              can_update_tasks: false,
              can_upload_documents: false,
            },
          }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('View only')).toBeInTheDocument()
    })

    it('should show +N more when more than 3 permissions', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [
          createMockProject({
            permissions: {
              can_view_scope: true,
              can_view_documents: true,
              can_submit_bids: true,
              can_view_schedule: true,
              can_update_punch_items: true,
              can_update_tasks: true,
              can_upload_documents: false,
            },
          }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      // Should show 3 permission badges + "more" badge
      expect(screen.getByText(/\+\d+ more/)).toBeInTheDocument()
    })
  })

  describe('Project Sections', () => {
    it('should separate active and other projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [
          createMockProject({ id: 'proj-1', name: 'Active Project', status: 'active' }),
          createMockProject({ id: 'proj-2', name: 'Completed Project', status: 'completed' }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Active Projects')).toBeInTheDocument()
      expect(screen.getByText('Other Projects')).toBeInTheDocument()
    })

    it('should only show Active section when no other projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ status: 'active' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByText('Active Projects')).toBeInTheDocument()
      expect(screen.queryByText('Other Projects')).not.toBeInTheDocument()
    })

    it('should only show Other section when no active projects', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ status: 'completed' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.queryByText('Active Projects')).not.toBeInTheDocument()
      expect(screen.getByText('Other Projects')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should show View Scope button when can_view_scope is true', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [
          createMockProject({
            permissions: { ...createMockProject().permissions, can_view_scope: true },
          }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByRole('link', { name: /view scope/i })).toBeInTheDocument()
    })

    it('should not show View Scope button when can_view_scope is false', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [
          createMockProject({
            permissions: { ...createMockProject().permissions, can_view_scope: false },
          }),
        ],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.queryByRole('link', { name: /view scope/i })).not.toBeInTheDocument()
    })

    it('should always show View Items button', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject()],
        isLoading: false,
        isError: false,
      })

      renderPage()

      expect(screen.getByRole('link', { name: /view items/i })).toBeInTheDocument()
    })

    it('should have correct link to punch items', () => {
      mockUseSubcontractorProjects.mockReturnValue({
        data: [createMockProject({ id: 'proj-123' })],
        isLoading: false,
        isError: false,
      })

      renderPage()

      const link = screen.getByRole('link', { name: /view items/i })
      expect(link).toHaveAttribute('href', '/portal/punch-items?project=proj-123')
    })
  })
})
