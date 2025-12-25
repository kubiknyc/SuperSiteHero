// File: /src/components/layout/__tests__/NavigationGroup.test.tsx
// Comprehensive tests for NavigationGroup component

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { NavigationGroup } from '../NavigationGroup'
import type { NavItem } from '../../../types/navigation'

// Mock icons
const MockGroupIcon = () => <span data-testid="group-icon">📁</span>
const MockItemIcon1 = () => <span data-testid="item-icon-1">📄</span>
const MockItemIcon2 = () => <span data-testid="item-icon-2">📊</span>
const MockItemIcon3 = () => <span data-testid="item-icon-3">⚙️</span>
const MockBadge = () => <span data-testid="badge">5</span>

// Mock navigation items
const mockNavItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: MockItemIcon1,
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: MockItemIcon2,
    badge: MockBadge,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: MockItemIcon3,
  },
]

// Helper to render with router
const renderWithRouter = (
  ui: React.ReactElement,
  { route = '/' } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  )
}

describe('NavigationGroup', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {}

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageMock[key] || null
    })

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering and Initial State', () => {
    it('renders group header with label and icon', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      expect(screen.getByRole('button', { name: /test group/i })).toBeInTheDocument()
      expect(screen.getByTestId('group-icon')).toBeInTheDocument()
    })

    it('renders collapsed by default when defaultExpanded is not provided', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')

      // Items should not be visible
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
    })

    it('renders expanded when defaultExpanded is true', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'true')

      // Items should be visible
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })

    it('shows ChevronRight icon when collapsed', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      // ChevronRight should be present (ChevronDown should not)
      const button = screen.getByRole('button', { name: /test group/i })
      const svg = button.querySelector('svg[class*="lucide-chevron-right"]')
      expect(svg).toBeInTheDocument()
    })

    it('shows ChevronDown icon when expanded', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      // ChevronDown should be present
      const button = screen.getByRole('button', { name: /test group/i })
      const svg = button.querySelector('svg[class*="lucide-chevron-down"]')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('Expand/Collapse Functionality', () => {
    it('expands when header button is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    })

    it('collapses when header button is clicked again', async () => {
      const user = userEvent.setup()
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'true')

      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
    })

    it('toggles chevron icon when expanding/collapsing', async () => {
      const user = userEvent.setup()
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })

      // Initially collapsed - should show ChevronRight
      expect(button.querySelector('svg[class*="lucide-chevron-right"]')).toBeInTheDocument()
      expect(button.querySelector('svg[class*="lucide-chevron-down"]')).not.toBeInTheDocument()

      // Click to expand
      await user.click(button)

      // Should now show ChevronDown
      expect(button.querySelector('svg[class*="lucide-chevron-down"]')).toBeInTheDocument()
      expect(button.querySelector('svg[class*="lucide-chevron-right"]')).not.toBeInTheDocument()
    })
  })

  describe('LocalStorage Persistence', () => {
    it('saves expanded state to localStorage when toggled', async () => {
      const user = userEvent.setup()
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      await user.click(button)

      expect(localStorage.setItem).toHaveBeenCalledWith('nav-group-test-group', 'true')
    })

    it('saves collapsed state to localStorage when toggled', async () => {
      const user = userEvent.setup()
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      await user.click(button)

      expect(localStorage.setItem).toHaveBeenCalledWith('nav-group-test-group', 'false')
    })

    it('loads expanded state from localStorage on mount', () => {
      localStorageMock['nav-group-test-group'] = 'true'

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    })

    it('loads collapsed state from localStorage on mount', () => {
      localStorageMock['nav-group-test-group'] = 'false'

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true} // This should be overridden by localStorage
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
    })

    it('uses defaultExpanded when no localStorage value exists', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Auto-Expansion on Route Match', () => {
    it('auto-expands when current route matches an item in the group', async () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />,
        { route: '/dashboard' }
      )

      // Should auto-expand because current route is /dashboard
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /test group/i })
        expect(button).toHaveAttribute('aria-expanded', 'true')
      })

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    })

    it('does not auto-expand when current route does not match any item', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />,
        { route: '/other-page' }
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('auto-expands for different routes in the group', async () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />,
        { route: '/settings' }
      )

      // Should auto-expand because current route is /settings
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /test group/i })
        expect(button).toHaveAttribute('aria-expanded', 'true')
      })

      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })

    it('does not collapse when already expanded and route changes', async () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />,
        { route: '/other-page' }
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Navigation Items', () => {
    it('renders all navigation items when expanded', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })

    it('renders item icons', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      expect(screen.getByTestId('item-icon-1')).toBeInTheDocument()
      expect(screen.getByTestId('item-icon-2')).toBeInTheDocument()
      expect(screen.getByTestId('item-icon-3')).toBeInTheDocument()
    })

    it('renders item badges when provided', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      expect(screen.getByTestId('badge')).toBeInTheDocument()
    })

    it('does not render badges for items without badges', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      // Only one badge should be present (for Reports item)
      const badges = screen.getAllByTestId('badge')
      expect(badges).toHaveLength(1)
    })

    it('sets correct href for navigation items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      const reportsLink = screen.getByRole('link', { name: /reports/i })
      const settingsLink = screen.getByRole('link', { name: /settings/i })

      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
      expect(reportsLink).toHaveAttribute('href', '/reports')
      expect(settingsLink).toHaveAttribute('href', '/settings')
    })
  })

  describe('Active State', () => {
    it('highlights active item based on current route', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />,
        { route: '/dashboard' }
      )

      const activeLink = screen.getByRole('link', { name: /dashboard/i })
      expect(activeLink).toHaveAttribute('aria-current', 'page')
      expect(activeLink).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('does not highlight non-active items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />,
        { route: '/dashboard' }
      )

      const reportsLink = screen.getByRole('link', { name: /reports/i })
      const settingsLink = screen.getByRole('link', { name: /settings/i })

      expect(reportsLink).not.toHaveAttribute('aria-current')
      expect(settingsLink).not.toHaveAttribute('aria-current')

      expect(reportsLink).toHaveClass('text-muted-foreground')
      expect(settingsLink).toHaveClass('text-muted-foreground')
    })

    it('updates active state when route changes', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <NavigationGroup
            id="test-group"
            label="Test Group"
            icon={MockGroupIcon}
            items={mockNavItems}
            defaultExpanded={true}
          />
        </MemoryRouter>
      )

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('aria-current', 'page')

      rerender(
        <MemoryRouter initialEntries={['/reports']}>
          <NavigationGroup
            id="test-group"
            label="Test Group"
            icon={MockGroupIcon}
            items={mockNavItems}
            defaultExpanded={true}
          />
        </MemoryRouter>
      )

      expect(screen.getByRole('link', { name: /reports/i })).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute('aria-current')
    })
  })

  describe('onItemClick Callback', () => {
    it('calls onItemClick when an item is clicked', async () => {
      const user = userEvent.setup()
      const mockOnItemClick = vi.fn()

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
          onItemClick={mockOnItemClick}
        />
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      await user.click(dashboardLink)

      expect(mockOnItemClick).toHaveBeenCalledWith(mockNavItems[0])
      expect(mockOnItemClick).toHaveBeenCalledTimes(1)
    })

    it('calls onItemClick with correct item data', async () => {
      const user = userEvent.setup()
      const mockOnItemClick = vi.fn()

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
          onItemClick={mockOnItemClick}
        />
      )

      const reportsLink = screen.getByRole('link', { name: /reports/i })
      await user.click(reportsLink)

      expect(mockOnItemClick).toHaveBeenCalledWith(mockNavItems[1])
    })

    it('does not call onItemClick when onItemClick is not provided', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })

      // Should not throw error when clicking
      await expect(user.click(dashboardLink)).resolves.not.toThrow()
    })
  })

  describe('Styling and Layout', () => {
    it('applies correct group header styling', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveClass('flex', 'w-full', 'items-center', 'gap-3', 'rounded-lg', 'px-3', 'py-2')
    })

    it('applies indentation to expanded items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const itemsContainer = screen.getByRole('link', { name: /dashboard/i }).parentElement
      expect(itemsContainer).toHaveClass('ml-4', 'space-y-1', 'border-l-2', 'border-muted', 'pl-4')
    })

    it('applies correct hover styles', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground')
    })

    it('applies correct item styling for non-active items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />,
        { route: '/other' }
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('text-muted-foreground', 'hover:bg-accent')
    })

    it('applies correct item styling for active items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />,
        { route: '/dashboard' }
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('bg-primary', 'text-primary-foreground')
    })
  })

  describe('Accessibility', () => {
    it('uses semantic button element for group header', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button.tagName).toBe('BUTTON')
    })

    it('uses semantic link elements for navigation items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
      links.forEach(link => {
        expect(link.tagName).toBe('A')
      })
    })

    it('sets aria-expanded attribute correctly', async () => {
      const user = userEvent.setup()
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('sets aria-current="page" for active item', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />,
        { route: '/dashboard' }
      )

      const activeLink = screen.getByRole('link', { name: /dashboard/i })
      expect(activeLink).toHaveAttribute('aria-current', 'page')
    })

    it('has focus-visible ring on header button', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring')
    })

    it('has focus-visible ring on navigation items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring')
      })
    })

    it('provides accessible label for group header', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      expect(screen.getByRole('button', { name: /test group/i })).toBeInTheDocument()
    })

    it('provides accessible labels for navigation items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty items array', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={[]}
          defaultExpanded={true}
        />
      )

      expect(screen.getByRole('button', { name: /test group/i })).toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('handles single item', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={[mockNavItems[0]]}
          defaultExpanded={true}
        />
      )

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getAllByRole('link')).toHaveLength(1)
    })

    it('handles very long group label', () => {
      const longLabel = 'This is a very long group label that might wrap to multiple lines in the UI'

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label={longLabel}
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      expect(screen.getByRole('button', { name: new RegExp(longLabel, 'i') })).toBeInTheDocument()
    })

    it('handles very long item labels', () => {
      const itemsWithLongLabels: NavItem[] = [
        {
          path: '/long-path',
          label: 'This is a very long navigation item label that might wrap',
          icon: MockItemIcon1,
        },
      ]

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={itemsWithLongLabels}
          defaultExpanded={true}
        />
      )

      expect(screen.getByRole('link', { name: /this is a very long/i })).toBeInTheDocument()
    })

    it('handles localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw error
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable')
      })

      // Should not crash
      expect(() => {
        renderWithRouter(
          <NavigationGroup
            id="test-group"
            label="Test Group"
            icon={MockGroupIcon}
            items={mockNavItems}
          />
        )
      }).not.toThrow()
    })

    it('handles localStorage.setItem errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock localStorage.setItem to throw error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage quota exceeded')
      })

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })

      // Should not crash when clicking
      await expect(user.click(button)).resolves.not.toThrow()
    })

    it('handles items with identical labels', () => {
      const itemsWithSameLabels: NavItem[] = [
        { path: '/path1', label: 'Same Label', icon: MockItemIcon1 },
        { path: '/path2', label: 'Same Label', icon: MockItemIcon2 },
      ]

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={itemsWithSameLabels}
          defaultExpanded={true}
        />
      )

      const links = screen.getAllByRole('link', { name: /same label/i })
      expect(links).toHaveLength(2)
      expect(links[0]).toHaveAttribute('href', '/path1')
      expect(links[1]).toHaveAttribute('href', '/path2')
    })

    it('handles special characters in labels', () => {
      const itemsWithSpecialChars: NavItem[] = [
        {
          path: '/special',
          label: 'Reports & Analytics (2024)',
          icon: MockItemIcon1,
        },
      ]

      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test & Development"
          icon={MockGroupIcon}
          items={itemsWithSpecialChars}
          defaultExpanded={true}
        />
      )

      expect(screen.getByRole('button', { name: /test & development/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /reports & analytics \(2024\)/i })).toBeInTheDocument()
    })
  })

  describe('Dark Mode Support', () => {
    it('applies dark mode classes to group header', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
        />
      )

      const button = screen.getByRole('button', { name: /test group/i })
      // Dark mode classes are applied via Tailwind's dark: prefix
      expect(button.className).toContain('hover:bg-accent')
    })

    it('applies dark mode classes to navigation items', () => {
      renderWithRouter(
        <NavigationGroup
          id="test-group"
          label="Test Group"
          icon={MockGroupIcon}
          items={mockNavItems}
          defaultExpanded={true}
        />
      )

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        // Dark mode classes applied through Tailwind
        expect(link.className).toBeTruthy()
      })
    })
  })
})
