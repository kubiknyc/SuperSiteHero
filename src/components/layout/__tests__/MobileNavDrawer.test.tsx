import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { MobileNavDrawer } from '../MobileNavDrawer'

// Mock hooks
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    signOut: vi.fn(),
    userProfile: {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'admin',
    },
  })),
}))

// Mock MobileOfflineIndicator
vi.mock('@/components/mobile/MobileOfflineIndicator', () => ({
  MobileOfflineIndicator: () => <div data-testid="mobile-offline-indicator">Offline Indicator</div>,
}))

// Mock navigation config
vi.mock('@/config/navigation', () => ({
  getMobileDrawerSections: vi.fn(() => [
    {
      title: 'Main',
      items: [
        {
          path: '/dashboard',
          label: 'Dashboard',
          icon: () => <span data-testid="icon-dashboard">📊</span>,
        },
        {
          path: '/projects',
          label: 'Projects',
          icon: () => <span data-testid="icon-projects">📁</span>,
        },
      ],
    },
    {
      title: 'Documents',
      items: [
        {
          path: '/documents',
          label: 'Documents',
          icon: () => <span data-testid="icon-documents">📄</span>,
          badge: () => <span data-testid="badge-documents">3</span>,
        },
        {
          path: '/rfis',
          label: 'RFIs',
          icon: () => <span data-testid="icon-rfis">❓</span>,
        },
      ],
    },
  ]),
}))

const renderWithRouter = (props: { isOpen: boolean; onClose: () => void }, initialRoute = '/dashboard') => {
  window.history.pushState({}, '', initialRoute)
  return render(
    <BrowserRouter>
      <MobileNavDrawer {...props} />
    </BrowserRouter>
  )
}

describe('MobileNavDrawer', () => {
  let mockOnClose: ReturnType<typeof vi.fn>
  let originalOverflow: string

  beforeEach(() => {
    mockOnClose = vi.fn()
    originalOverflow = document.body.style.overflow
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.style.overflow = originalOverflow
  })

  describe('Visibility Control', () => {
    it('renders when isOpen is true', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText('Menu')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      const { container } = renderWithRouter({ isOpen: false, onClose: mockOnClose })

      expect(container.firstChild).toBeNull()
    })

    it('toggles visibility based on isOpen prop', () => {
      const { rerender, container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText('Menu')).toBeInTheDocument()

      rerender(
        <BrowserRouter>
          <MobileNavDrawer isOpen={false} onClose={mockOnClose} />
        </BrowserRouter>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Header', () => {
    it('renders drawer header with title', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const heading = screen.getByText('Menu')
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveClass('font-semibold')
    })

    it('renders close button', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const closeButton = screen.getByRole('button', { name: '' })
      expect(closeButton).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons[0] // First button in header

      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('header has border bottom', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const header = container.querySelector('.border-b')
      expect(header).toBeInTheDocument()
    })
  })

  describe('Backdrop', () => {
    it('renders backdrop overlay', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const backdrop = container.querySelector('.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()
    })

    it('backdrop has blur effect', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const backdrop = container.querySelector('.backdrop-blur-sm')
      expect(backdrop).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const backdrop = container.querySelector('.bg-black\\/50') as HTMLElement
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Offline Indicator', () => {
    it('renders mobile offline indicator', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByTestId('mobile-offline-indicator')).toBeInTheDocument()
    })
  })

  describe('Navigation Sections', () => {
    it('renders all navigation sections', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText('Main')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
    })

    it('section titles have proper styling', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const mainSection = screen.getByText('Main')
      expect(mainSection).toHaveClass('uppercase', 'tracking-wider')
    })

    it('renders all navigation items', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('RFIs')).toBeInTheDocument()
    })

    it('navigation items have icons', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('icon-projects')).toBeInTheDocument()
      expect(screen.getByTestId('icon-documents')).toBeInTheDocument()
      expect(screen.getByTestId('icon-rfis')).toBeInTheDocument()
    })

    it('navigation items are links', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')

      const projectsLink = screen.getByRole('link', { name: /projects/i })
      expect(projectsLink).toHaveAttribute('href', '/projects')
    })
  })

  describe('Active State', () => {
    it('highlights active navigation item', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose }, '/dashboard')

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('bg-blue-50', 'text-primary-hover')
    })

    it('does not highlight inactive items', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose }, '/dashboard')

      const projectsLink = screen.getByRole('link', { name: /projects/i })
      expect(projectsLink).not.toHaveClass('bg-blue-50')
      expect(projectsLink).toHaveClass('text-secondary')
    })

    it('highlights based on path prefix', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose }, '/projects/123')

      const projectsLink = screen.getByRole('link', { name: /projects/i })
      expect(projectsLink).toHaveClass('bg-blue-50', 'text-primary-hover')
    })

    it('does not match root path for all routes', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose }, '/projects')

      // Dashboard is at '/' so it should not be active when at /projects
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).not.toHaveClass('bg-blue-50')
    })
  })

  describe('Badges', () => {
    it('renders badge when provided', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByTestId('badge-documents')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('does not render badge when not provided', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      const badge = dashboardLink.querySelector('[data-testid^="badge"]')
      expect(badge).not.toBeInTheDocument()
    })
  })

  describe('User Profile', () => {
    it('displays user name', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('displays user email', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('does not render user info when no profile', () => {
      const { useAuth } = require('@/lib/auth/AuthContext')
      useAuth.mockReturnValue({
        signOut: vi.fn(),
        userProfile: null,
      })

      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('Settings Link', () => {
    it('renders settings link', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      expect(settingsLink).toBeInTheDocument()
    })

    it('settings link has correct href', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      expect(settingsLink).toHaveAttribute('href', '/settings')
    })

    it('settings link has icon', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      const icon = settingsLink.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Sign Out', () => {
    it('renders sign out button', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
    })

    it('sign out button has error styling', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toHaveClass('text-error')
    })

    it('calls signOut when clicked', async () => {
      const user = userEvent.setup()
      const mockSignOut = vi.fn()
      const { useAuth } = require('@/lib/auth/AuthContext')
      useAuth.mockReturnValue({
        signOut: mockSignOut,
        userProfile: {
          id: 'user-1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
      })

      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      await user.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('Layout and Styling', () => {
    it('is hidden on desktop (md breakpoint)', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const drawer = container.querySelector('.md\\:hidden')
      expect(drawer).toBeInTheDocument()
    })

    it('is positioned fixed with full screen overlay', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('fixed', 'inset-0')
    })

    it('has high z-index for layering', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('z-50')
    })

    it('drawer slides in from right', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const drawer = container.querySelector('.animate-slide-in-right')
      expect(drawer).toBeInTheDocument()
    })

    it('drawer has max width constraint', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const drawer = container.querySelector('.max-w-sm')
      expect(drawer).toBeInTheDocument()
    })

    it('has scrollable navigation area', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('overflow-y-auto', 'overscroll-contain')
    })

    it('footer has safe area padding', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const footer = container.querySelector('.safe-area-bottom')
      expect(footer).toBeInTheDocument()
    })
  })

  describe('Body Scroll Prevention', () => {
    it('prevents body scroll when drawer is open', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when drawer is closed', () => {
      const { rerender } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(document.body.style.overflow).toBe('hidden')

      rerender(
        <BrowserRouter>
          <MobileNavDrawer isOpen={false} onClose={mockOnClose} />
        </BrowserRouter>
      )

      expect(document.body.style.overflow).toBe('')
    })

    it('cleans up body scroll on unmount', () => {
      const { unmount } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Touch Interactions', () => {
    it('navigation items have touch-friendly target sizes', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('touch-target')
    })

    it('close button has touch-friendly target', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons[0]
      expect(closeButton).toHaveClass('touch-target')
    })

    it('settings link has touch-friendly target', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      expect(settingsLink).toHaveClass('touch-target')
    })

    it('sign out button has touch-friendly target', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toHaveClass('touch-target')
    })

    it('navigation items have active state styling', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('transition-colors')
    })
  })

  describe('Dark Mode Support', () => {
    it('has dark mode background', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const drawer = container.querySelector('.dark\\:bg-background')
      expect(drawer).toBeInTheDocument()
    })

    it('has dark mode border colors', () => {
      const { container } = renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const borders = container.querySelectorAll('.dark\\:border-gray-700')
      expect(borders.length).toBeGreaterThan(0)
    })

    it('has dark mode text colors for active items', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose }, '/dashboard')

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('dark:text-blue-400')
    })

    it('has dark mode text colors for inactive items', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose }, '/dashboard')

      const projectsLink = screen.getByRole('link', { name: /projects/i })
      expect(projectsLink).toHaveClass('dark:text-gray-300')
    })
  })

  describe('Accessibility', () => {
    it('uses semantic nav element', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('all navigation links are accessible', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)

      links.forEach((link) => {
        expect(link).toHaveAccessibleName()
      })
    })

    it('close button is accessible', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const closeButtons = screen.getAllByRole('button')
      expect(closeButtons.length).toBeGreaterThan(0)
    })

    it('sign out button is accessible', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toHaveAccessibleName()
    })
  })

  describe('Edge Cases', () => {
    it('handles user with only first name', () => {
      const { useAuth } = require('@/lib/auth/AuthContext')
      useAuth.mockReturnValue({
        signOut: vi.fn(),
        userProfile: {
          id: 'user-1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: null,
        },
      })

      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText(/John/)).toBeInTheDocument()
    })

    it('handles empty navigation sections', () => {
      const { getMobileDrawerSections } = require('@/config/navigation')
      getMobileDrawerSections.mockReturnValue([])

      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      expect(screen.getByText('Menu')).toBeInTheDocument()
    })

    it('handles navigation items without badges', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose })

      const projectsLink = screen.getByRole('link', { name: /projects/i })
      expect(projectsLink).toBeInTheDocument()
    })

    it('handles deeply nested routes for active state', () => {
      renderWithRouter({ isOpen: true, onClose: mockOnClose }, '/projects/123/details/456')

      const projectsLink = screen.getByRole('link', { name: /projects/i })
      expect(projectsLink).toHaveClass('bg-blue-50')
    })
  })
})
