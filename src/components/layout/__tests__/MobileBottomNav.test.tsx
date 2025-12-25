import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { MobileBottomNav } from '../MobileBottomNav'

// Mock MobileNavDrawer
vi.mock('../MobileNavDrawer', () => ({
  MobileNavDrawer: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="mobile-nav-drawer">
        <button onClick={onClose} data-testid="close-drawer">Close</button>
      </div>
    ) : null
  ),
}))

// Mock navigation config
vi.mock('@/config/navigation', () => ({
  mobileBottomNavItems: [
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
    {
      path: '/daily-reports',
      label: 'Daily Reports',
      icon: () => <span data-testid="icon-reports">📝</span>,
    },
    {
      path: '/tasks',
      label: 'Tasks',
      icon: () => <span data-testid="icon-tasks">✓</span>,
      badge: () => <span data-testid="badge-tasks">3</span>,
    },
  ],
}))

const renderWithRouter = (initialRoute = '/dashboard') => {
  window.history.pushState({}, '', initialRoute)
  return render(
    <BrowserRouter>
      <MobileBottomNav />
    </BrowserRouter>
  )
}

describe('MobileBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders navigation bar', () => {
      renderWithRouter()

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('renders all navigation items from config', () => {
      renderWithRouter()

      expect(screen.getByText('Home')).toBeInTheDocument() // Dashboard -> Home
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument() // Daily Reports -> Reports
      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })

    it('renders icons for each navigation item', () => {
      renderWithRouter()

      expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('icon-projects')).toBeInTheDocument()
      expect(screen.getByTestId('icon-reports')).toBeInTheDocument()
      expect(screen.getByTestId('icon-tasks')).toBeInTheDocument()
    })

    it('renders More button', () => {
      renderWithRouter()

      const moreButton = screen.getByText('More')
      expect(moreButton).toBeInTheDocument()
    })

    it('is hidden on desktop (md breakpoint)', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('md:hidden')
    })

    it('is fixed at bottom', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('fixed', 'bottom-0')
    })
  })

  describe('Label Shortening', () => {
    it('shortens "Dashboard" to "Home"', () => {
      renderWithRouter()

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('shortens "Daily Reports" to "Reports"', () => {
      renderWithRouter()

      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.queryByText('Daily Reports')).not.toBeInTheDocument()
    })

    it('keeps other labels unchanged', () => {
      renderWithRouter()

      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('highlights active navigation item', () => {
      renderWithRouter('/dashboard')

      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).toHaveClass('text-primary')
    })

    it('highlights active item based on path prefix', () => {
      renderWithRouter('/projects/123/details')

      const projectsLink = screen.getByText('Projects').closest('a')
      expect(projectsLink).toHaveClass('text-primary')
    })

    it('does not highlight root path for non-root routes', () => {
      renderWithRouter('/projects')

      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).not.toHaveClass('text-primary')
    })

    it('applies bolder icon stroke for active items', () => {
      renderWithRouter('/dashboard')

      const homeLink = screen.getByText('Home').closest('a')
      const icon = homeLink?.querySelector('[class*="stroke"]')
      expect(icon).toHaveClass('stroke-[2.5px]')
    })

    it('applies semibold font to active item label', () => {
      renderWithRouter('/dashboard')

      const homeLabel = screen.getByText('Home')
      expect(homeLabel).toHaveClass('font-semibold')
    })

    it('applies medium font to inactive item labels', () => {
      renderWithRouter('/dashboard')

      const projectsLabel = screen.getByText('Projects')
      expect(projectsLabel).toHaveClass('font-medium')
      expect(projectsLabel).not.toHaveClass('font-semibold')
    })
  })

  describe('Navigation Links', () => {
    it('all links have correct href attributes', () => {
      renderWithRouter()

      expect(screen.getByText('Home').closest('a'))
        .toHaveAttribute('href', '/dashboard')
      expect(screen.getByText('Projects').closest('a'))
        .toHaveAttribute('href', '/projects')
      expect(screen.getByText('Reports').closest('a'))
        .toHaveAttribute('href', '/daily-reports')
      expect(screen.getByText('Tasks').closest('a'))
        .toHaveAttribute('href', '/tasks')
    })

    it('navigation links have proper structure', () => {
      renderWithRouter()

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass('flex', 'flex-col', 'items-center')
      })
    })
  })

  describe('Badges', () => {
    it('renders badge when provided in config', () => {
      renderWithRouter()

      expect(screen.getByTestId('badge-tasks')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('positions badge absolutely on icon', () => {
      const { container } = renderWithRouter()

      const badge = screen.getByTestId('badge-tasks')
      const badgeContainer = badge.parentElement
      expect(badgeContainer).toHaveClass('absolute', '-top-1', '-right-1')
    })

    it('does not render badge when not provided', () => {
      renderWithRouter()

      const homeLink = screen.getByText('Home').closest('a')
      const badge = homeLink?.querySelector('[data-testid^="badge"]')
      expect(badge).not.toBeInTheDocument()
    })
  })

  describe('More Menu Drawer', () => {
    it('opens drawer when More button is clicked', async () => {
      const user = userEvent.setup()

      renderWithRouter()

      const moreButton = screen.getByText('More')
      await user.click(moreButton)

      expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument()
    })

    it('drawer is initially closed', () => {
      renderWithRouter()

      expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument()
    })

    it('closes drawer when close is triggered', async () => {
      const user = userEvent.setup()

      renderWithRouter()

      // Open drawer
      const moreButton = screen.getByText('More')
      await user.click(moreButton)

      expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument()

      // Close drawer
      const closeButton = screen.getByTestId('close-drawer')
      await user.click(closeButton)

      expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument()
    })
  })

  describe('Touch Interactions', () => {
    it('has touch-friendly target sizes', () => {
      renderWithRouter()

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass('touch-target')
        expect(link).toHaveClass('min-w-[64px]')
      })

      const moreButton = screen.getByText('More').closest('button')
      expect(moreButton).toHaveClass('touch-target')
      expect(moreButton).toHaveClass('min-w-[64px]')
    })

    it('has active state styling for touch feedback', () => {
      renderWithRouter()

      const projectsLink = screen.getByText('Projects').closest('a')
      expect(projectsLink).toHaveClass('active:text-secondary')
    })

    it('has transition effects', () => {
      renderWithRouter()

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass('transition-colors')
      })

      const moreButton = screen.getByText('More').closest('button')
      expect(moreButton).toHaveClass('transition-colors')
    })
  })

  describe('Layout and Styling', () => {
    it('has safe area inset for devices with notches', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('safe-area-bottom')
    })

    it('has proper z-index for layering', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('z-50')
    })

    it('has border at top', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('border-t')
    })

    it('uses flex layout for items', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      const flexContainer = nav?.querySelector('.flex')
      expect(flexContainer).toHaveClass('items-center', 'justify-around')
    })

    it('has fixed height', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      const flexContainer = nav?.querySelector('.flex')
      expect(flexContainer).toHaveClass('h-16')
    })
  })

  describe('Dark Mode Support', () => {
    it('has dark mode background classes', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('dark:bg-background')
    })

    it('has dark mode text colors for inactive items', () => {
      renderWithRouter('/dashboard')

      const projectsLink = screen.getByText('Projects').closest('a')
      expect(projectsLink).toHaveClass('dark:text-disabled')
    })

    it('has dark mode text colors for active items', () => {
      renderWithRouter('/dashboard')

      const homeLink = screen.getByText('Home').closest('a')
      expect(homeLink).toHaveClass('dark:text-blue-400')
    })

    it('has dark mode border colors', () => {
      const { container } = renderWithRouter()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('dark:border-gray-700')
    })
  })

  describe('Accessibility', () => {
    it('uses semantic nav element', () => {
      renderWithRouter()

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('all navigation links are accessible', () => {
      renderWithRouter()

      const links = screen.getAllByRole('link')
      expect(links.length).toBe(4) // 4 items from config
    })

    it('More button is accessible', () => {
      renderWithRouter()

      const moreButton = screen.getByRole('button', { name: /more/i })
      expect(moreButton).toBeInTheDocument()
    })

    it('links have descriptive text', () => {
      renderWithRouter()

      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles navigation to root path', () => {
      renderWithRouter('/')

      const homeLink = screen.getByText('Home').closest('a')
      // Root path should not be considered active unless exactly matched
      expect(homeLink).not.toHaveClass('text-primary')
    })

    it('handles deeply nested routes', () => {
      renderWithRouter('/projects/123/tasks/456/edit')

      const projectsLink = screen.getByText('Projects').closest('a')
      expect(projectsLink).toHaveClass('text-primary')
    })

    it('handles routes with query parameters', () => {
      renderWithRouter('/projects?filter=active')

      const projectsLink = screen.getByText('Projects').closest('a')
      expect(projectsLink).toHaveClass('text-primary')
    })

    it('handles routes with hash fragments', () => {
      renderWithRouter('/projects#section-1')

      const projectsLink = screen.getByText('Projects').closest('a')
      expect(projectsLink).toHaveClass('text-primary')
    })
  })
})
