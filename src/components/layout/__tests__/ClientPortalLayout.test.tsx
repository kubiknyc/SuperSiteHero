import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClientPortalLayout } from '../ClientPortalLayout'

// Mock hooks
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    signOut: vi.fn(),
    userProfile: {
      id: 'user-1',
      email: 'client@example.com',
      first_name: 'John',
      last_name: 'Client',
      role: 'client',
    },
  })),
}))

vi.mock('@/features/client-portal/hooks/useClientPortal', () => ({
  useClientProjects: vi.fn(() => ({
    data: [
      {
        id: 'proj-1',
        name: 'Construction Project A',
        project_number: 'P-2024-001',
        status: 'active',
        address: '123 Main St',
        show_schedule: true,
        show_photos: true,
        show_documents: true,
        show_rfis: true,
        show_change_orders: true,
      },
      {
        id: 'proj-2',
        name: 'Construction Project B',
        project_number: 'P-2024-002',
        status: 'completed',
      },
    ],
    isLoading: false,
  })),
  useClientProject: vi.fn((projectId) => ({
    data: projectId === 'proj-1' ? {
      id: 'proj-1',
      name: 'Construction Project A',
      project_number: 'P-2024-001',
      status: 'active',
      address: '123 Main St',
      show_schedule: true,
      show_photos: true,
      show_documents: true,
      show_rfis: true,
      show_change_orders: true,
    } : null,
    isLoading: false,
  })),
}))

const renderWithRouter = (initialRoute = '/client/projects/proj-1') => {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/client/projects/:projectId/*" element={<ClientPortalLayout />}>
          <Route index element={<div data-testid="project-content">Project Content</div>} />
        </Route>
        <Route path="/client" element={<div>Client Dashboard</div>} />
      </Routes>
    </BrowserRouter>,
    { wrapper: ({ children }) => <div>{children}</div> }
  )
}

describe('ClientPortalLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header', () => {
    it('renders the client portal logo and title', () => {
      renderWithRouter()

      expect(screen.getByText('Client Portal')).toBeInTheDocument()
      const logo = screen.getByRole('link', { name: /client portal/i })
      expect(logo).toHaveAttribute('href', '/client')
    })

    it('displays user information', () => {
      renderWithRouter()

      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('client@example.com')).toBeInTheDocument()
    })

    it('displays user email as fallback when first name is not available', () => {
      const { useAuth } = require('@/lib/auth/AuthContext')
      useAuth.mockReturnValue({
        signOut: vi.fn(),
        userProfile: {
          id: 'user-1',
          email: 'test@example.com',
          first_name: null,
          last_name: null,
          role: 'client',
        },
      })

      renderWithRouter()

      expect(screen.getByText('test')).toBeInTheDocument()
    })

    it('shows sign out button in user menu', async () => {
      const user = userEvent.setup()
      const mockSignOut = vi.fn()

      const { useAuth } = require('@/lib/auth/AuthContext')
      useAuth.mockReturnValue({
        signOut: mockSignOut,
        userProfile: {
          id: 'user-1',
          email: 'client@example.com',
          first_name: 'John',
          role: 'client',
        },
      })

      renderWithRouter()

      // Open user menu
      const userButton = screen.getByRole('button', { name: /john/i })
      await user.click(userButton)

      const signOutButton = screen.getByText('Sign Out')
      expect(signOutButton).toBeInTheDocument()

      await user.click(signOutButton)
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('Project Selector', () => {
    it('displays current project name', () => {
      renderWithRouter()

      expect(screen.getByText('Construction Project A')).toBeInTheDocument()
    })

    it('shows project selector dropdown when multiple projects exist', async () => {
      const user = userEvent.setup()

      renderWithRouter()

      const projectButton = screen.getByRole('button', { name: /construction project a/i })
      await user.click(projectButton)

      expect(screen.getByText('Your Projects')).toBeInTheDocument()
      expect(screen.getByText('Construction Project B')).toBeInTheDocument()
    })

    it('displays project numbers in project selector', async () => {
      const user = userEvent.setup()

      renderWithRouter()

      const projectButton = screen.getByRole('button', { name: /construction project a/i })
      await user.click(projectButton)

      expect(screen.getByText('#P-2024-001')).toBeInTheDocument()
      expect(screen.getByText('#P-2024-002')).toBeInTheDocument()
    })

    it('navigates to selected project when clicked', async () => {
      const user = userEvent.setup()

      renderWithRouter()

      const projectButton = screen.getByRole('button', { name: /construction project a/i })
      await user.click(projectButton)

      const projectLink = screen.getByRole('link', { name: /construction project b/i })
      expect(projectLink).toHaveAttribute('href', '/client/projects/proj-2')
    })

    it('shows "Select Project" when no project is selected', () => {
      const { useClientProject } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProject.mockReturnValue({
        data: null,
        isLoading: false,
      })

      renderWithRouter('/client/projects/unknown')

      expect(screen.getByText('Select Project')).toBeInTheDocument()
    })
  })

  describe('Navigation Sidebar', () => {
    it('renders all navigation items when project settings allow', () => {
      renderWithRouter()

      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Schedule')).toBeInTheDocument()
      expect(screen.getByText('Photos')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('RFIs')).toBeInTheDocument()
      expect(screen.getByText('Change Orders')).toBeInTheDocument()
    })

    it('highlights active navigation item', () => {
      renderWithRouter('/client/projects/proj-1')

      const overviewLink = screen.getByRole('link', { name: /overview/i })
      expect(overviewLink).toHaveClass('bg-blue-50', 'text-primary-hover')
    })

    it('hides navigation items when project settings disable them', () => {
      const { useClientProject } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProject.mockReturnValue({
        data: {
          id: 'proj-1',
          name: 'Construction Project A',
          show_schedule: false,
          show_photos: false,
          show_documents: true,
          show_rfis: false,
          show_change_orders: false,
        },
        isLoading: false,
      })

      renderWithRouter()

      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.queryByText('Schedule')).not.toBeInTheDocument()
      expect(screen.queryByText('Photos')).not.toBeInTheDocument()
      expect(screen.queryByText('RFIs')).not.toBeInTheDocument()
      expect(screen.queryByText('Change Orders')).not.toBeInTheDocument()
    })

    it('does not render sidebar when no project is selected', () => {
      renderWithRouter('/client')

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })
  })

  describe('Project Info Card', () => {
    it('displays project information in sidebar', () => {
      renderWithRouter()

      const sidebar = screen.getByRole('complementary')
      expect(within(sidebar).getByText('Construction Project A')).toBeInTheDocument()
      expect(within(sidebar).getByText('123 Main St')).toBeInTheDocument()
    })

    it('shows active status badge', () => {
      renderWithRouter()

      const sidebar = screen.getByRole('complementary')
      const statusBadge = within(sidebar).getByText('active')
      expect(statusBadge).toHaveClass('bg-success-light')
    })

    it('shows completed status badge', () => {
      const { useClientProject } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProject.mockReturnValue({
        data: {
          id: 'proj-2',
          name: 'Construction Project B',
          status: 'completed',
          address: '456 Oak Ave',
          show_schedule: true,
        },
        isLoading: false,
      })

      renderWithRouter('/client/projects/proj-2')

      const sidebar = screen.getByRole('complementary')
      const statusBadge = within(sidebar).getByText('completed')
      expect(statusBadge).toHaveClass('bg-info-light')
    })

    it('truncates long project names and addresses', () => {
      const { useClientProject } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProject.mockReturnValue({
        data: {
          id: 'proj-1',
          name: 'Very Long Construction Project Name That Should Be Truncated',
          address: 'Very Long Address That Should Also Be Truncated For Display',
          status: 'active',
          show_schedule: true,
        },
        isLoading: false,
      })

      const { container } = renderWithRouter()

      const projectNameElement = container.querySelector('.truncate')
      expect(projectNameElement).toHaveClass('truncate')
    })
  })

  describe('Main Content Area', () => {
    it('renders children content', () => {
      renderWithRouter()

      expect(screen.getByTestId('project-content')).toBeInTheDocument()
      expect(screen.getByText('Project Content')).toBeInTheDocument()
    })

    it('applies correct margin when sidebar is visible', () => {
      const { container } = renderWithRouter()

      const main = container.querySelector('main')
      expect(main).toHaveClass('ml-56')
    })

    it('removes margin when sidebar is hidden', () => {
      const { container } = renderWithRouter('/client')

      const main = container.querySelector('main')
      expect(main).not.toHaveClass('ml-56')
    })
  })

  describe('Responsive Layout', () => {
    it('has fixed header at top', () => {
      renderWithRouter()

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('fixed', 'top-0')
    })

    it('has fixed sidebar with correct positioning', () => {
      renderWithRouter()

      const sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('fixed', 'left-0', 'top-16')
    })

    it('applies padding to main content for header', () => {
      const { container } = renderWithRouter()

      const contentWrapper = container.querySelector('.pt-16')
      expect(contentWrapper).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('all navigation links have correct href attributes', () => {
      renderWithRouter()

      expect(screen.getByRole('link', { name: /overview/i }))
        .toHaveAttribute('href', '/client/projects/proj-1')
      expect(screen.getByRole('link', { name: /schedule/i }))
        .toHaveAttribute('href', '/client/projects/proj-1/schedule')
      expect(screen.getByRole('link', { name: /photos/i }))
        .toHaveAttribute('href', '/client/projects/proj-1/photos')
      expect(screen.getByRole('link', { name: /documents/i }))
        .toHaveAttribute('href', '/client/projects/proj-1/documents')
      expect(screen.getByRole('link', { name: /rfis/i }))
        .toHaveAttribute('href', '/client/projects/proj-1/rfis')
      expect(screen.getByRole('link', { name: /change orders/i }))
        .toHaveAttribute('href', '/client/projects/proj-1/change-orders')
    })

    it('applies hover styles to navigation links', () => {
      renderWithRouter()

      const scheduleLink = screen.getByRole('link', { name: /schedule/i })
      expect(scheduleLink).toHaveClass('hover:bg-muted', 'hover:text-foreground')
    })
  })

  describe('Edge Cases', () => {
    it('handles projects without addresses', () => {
      const { useClientProject } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProject.mockReturnValue({
        data: {
          id: 'proj-1',
          name: 'Construction Project A',
          status: 'active',
          address: null,
          show_schedule: true,
        },
        isLoading: false,
      })

      renderWithRouter()

      const sidebar = screen.getByRole('complementary')
      expect(within(sidebar).queryByText('123 Main St')).not.toBeInTheDocument()
    })

    it('handles projects without status', () => {
      const { useClientProject } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProject.mockReturnValue({
        data: {
          id: 'proj-1',
          name: 'Construction Project A',
          status: null,
          show_schedule: true,
        },
        isLoading: false,
      })

      renderWithRouter()

      const sidebar = screen.getByRole('complementary')
      expect(within(sidebar).getByText('Active')).toBeInTheDocument()
    })

    it('handles empty project list', () => {
      const { useClientProjects } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProjects.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderWithRouter()

      expect(screen.queryByRole('button', { name: /select project/i })).not.toBeInTheDocument()
    })

    it('handles projects without project numbers', () => {
      const { useClientProjects } = require('@/features/client-portal/hooks/useClientPortal')
      useClientProjects.mockReturnValue({
        data: [
          {
            id: 'proj-1',
            name: 'Project Without Number',
            project_number: null,
          },
        ],
        isLoading: false,
      })

      renderWithRouter()

      const projectButton = screen.getByRole('button', { name: /project without number/i })
      expect(projectButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA landmarks', () => {
      renderWithRouter()

      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('complementary')).toBeInTheDocument() // aside
      expect(screen.getByRole('main')).toBeInTheDocument() // main
      expect(screen.getByRole('navigation')).toBeInTheDocument() // nav
    })

    it('navigation links have proper structure', () => {
      renderWithRouter()

      const nav = screen.getByRole('navigation')
      const links = within(nav).getAllByRole('link')

      expect(links.length).toBeGreaterThan(0)
      links.forEach(link => {
        expect(link).toHaveAccessibleName()
      })
    })

    it('dropdown menus have proper accessibility', () => {
      renderWithRouter()

      const projectButton = screen.getByRole('button', { name: /construction project a/i })
      expect(projectButton).toBeInTheDocument()
    })

    it('logo link has accessible name', () => {
      renderWithRouter()

      const logoLink = screen.getByRole('link', { name: /client portal/i })
      expect(logoLink).toHaveAccessibleName()
    })
  })
})
