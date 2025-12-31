/**
 * Unit Tests for PresenceAvatars Component
 *
 * Tests the avatar display for users currently viewing a resource:
 * - Showing user avatars
 * - Limiting visible avatars with "+N more" indicator
 * - Filtering current user
 * - Size variants
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PresenceAvatars } from '../PresenceAvatars'
import type { PresenceUser } from '@/lib/realtime'

// Mock the tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

const createMockUser = (overrides: Partial<PresenceUser> = {}): PresenceUser => ({
  id: `user-${Math.random().toString(36).slice(2)}`,
  name: 'Test User',
  color: '#3B82F6',
  ...overrides,
})

describe('PresenceAvatars', () => {
  describe('rendering', () => {
    it('should return null when users array is empty', () => {
      const { container } = render(<PresenceAvatars users={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render avatars for each user', () => {
      const users = [
        createMockUser({ id: '1', name: 'Alice' }),
        createMockUser({ id: '2', name: 'Bob' }),
      ]

      render(<PresenceAvatars users={users} />)

      // Check for user initials (single-word names get first 2 chars, uppercased)
      expect(screen.getByText('AL')).toBeInTheDocument()
      expect(screen.getByText('BO')).toBeInTheDocument()
    })

    it('should show user image when avatarUrl is provided', () => {
      const users = [
        createMockUser({
          id: '1',
          name: 'Alice',
          avatarUrl: 'https://example.com/alice.jpg',
        }),
      ]

      render(<PresenceAvatars users={users} />)

      const img = screen.getByAltText('Alice')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg')
    })

    it('should show initials when no avatarUrl is provided', () => {
      const users = [createMockUser({ id: '1', name: 'Alice Bob' })]

      render(<PresenceAvatars users={users} />)

      expect(screen.getByText('AB')).toBeInTheDocument()
    })

    it('should handle single-word names for initials', () => {
      const users = [createMockUser({ id: '1', name: 'Alice' })]

      render(<PresenceAvatars users={users} />)

      // Single-word names get first 2 chars, uppercased
      expect(screen.getByText('AL')).toBeInTheDocument()
    })
  })

  describe('maxVisible limit', () => {
    it('should limit visible avatars to maxVisible (default 3)', () => {
      const users = [
        createMockUser({ id: '1', name: 'Alice' }),
        createMockUser({ id: '2', name: 'Bob' }),
        createMockUser({ id: '3', name: 'Charlie' }),
        createMockUser({ id: '4', name: 'David' }),
        createMockUser({ id: '5', name: 'Eve' }),
      ]

      render(<PresenceAvatars users={users} />)

      // Should show 3 avatars + "+2 more" indicator
      expect(screen.getByText('AL')).toBeInTheDocument()
      expect(screen.getByText('BO')).toBeInTheDocument()
      expect(screen.getByText('CH')).toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()

      // Should NOT show the 4th and 5th users directly (initials)
      expect(screen.queryByText('DA')).not.toBeInTheDocument()
      expect(screen.queryByText('EV')).not.toBeInTheDocument()
    })

    it('should respect custom maxVisible value', () => {
      const users = [
        createMockUser({ id: '1', name: 'Alice' }),
        createMockUser({ id: '2', name: 'Bob' }),
        createMockUser({ id: '3', name: 'Charlie' }),
        createMockUser({ id: '4', name: 'David' }),
      ]

      render(<PresenceAvatars users={users} maxVisible={2} />)

      expect(screen.getByText('AL')).toBeInTheDocument()
      expect(screen.getByText('BO')).toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('should not show "+N more" when users count equals maxVisible', () => {
      const users = [
        createMockUser({ id: '1', name: 'Alice' }),
        createMockUser({ id: '2', name: 'Bob' }),
        createMockUser({ id: '3', name: 'Charlie' }),
      ]

      render(<PresenceAvatars users={users} maxVisible={3} />)

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument()
    })

    it('should not show "+N more" when users count is less than maxVisible', () => {
      const users = [
        createMockUser({ id: '1', name: 'Alice' }),
        createMockUser({ id: '2', name: 'Bob' }),
      ]

      render(<PresenceAvatars users={users} maxVisible={3} />)

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument()
    })
  })

  describe('current user filtering', () => {
    it('should filter out current user when showCurrentUser is false', () => {
      const users = [
        createMockUser({ id: 'current-user', name: 'Me' }),
        createMockUser({ id: 'other-user', name: 'Other' }),
      ]

      render(
        <PresenceAvatars
          users={users}
          currentUserId="current-user"
          showCurrentUser={false}
        />
      )

      // "Me" user should be filtered out - check both initials and tooltip
      expect(screen.queryByText('ME')).not.toBeInTheDocument()
      // "Other" user should show with initials OT
      expect(screen.getByText('OT')).toBeInTheDocument()
    })

    it('should show current user when showCurrentUser is true', () => {
      const users = [
        createMockUser({ id: 'current-user', name: 'Me' }),
        createMockUser({ id: 'other-user', name: 'Other' }),
      ]

      render(
        <PresenceAvatars
          users={users}
          currentUserId="current-user"
          showCurrentUser={true}
        />
      )

      // Both users should show with initials
      expect(screen.getByText('ME')).toBeInTheDocument()
      expect(screen.getByText('OT')).toBeInTheDocument()
    })

    it('should show all users when currentUserId is not provided', () => {
      const users = [
        createMockUser({ id: 'user-1', name: 'Alice' }),
        createMockUser({ id: 'user-2', name: 'Bob' }),
      ]

      render(<PresenceAvatars users={users} showCurrentUser={false} />)

      expect(screen.getByText('AL')).toBeInTheDocument()
      expect(screen.getByText('BO')).toBeInTheDocument()
    })

    it('should return null when only current user is present and filtered', () => {
      const users = [createMockUser({ id: 'current-user', name: 'Me' })]

      const { container } = render(
        <PresenceAvatars
          users={users}
          currentUserId="current-user"
          showCurrentUser={false}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('size variants', () => {
    it('should apply small size classes', () => {
      const users = [createMockUser({ id: '1', name: 'Alice' })]

      const { container } = render(<PresenceAvatars users={users} size="sm" />)

      // Check that the avatar container has the sm size class
      const avatar = container.querySelector('.h-6.w-6')
      expect(avatar).toBeInTheDocument()
    })

    it('should apply medium size classes (default)', () => {
      const users = [createMockUser({ id: '1', name: 'Alice' })]

      const { container } = render(<PresenceAvatars users={users} />)

      const avatar = container.querySelector('.h-8.w-8')
      expect(avatar).toBeInTheDocument()
    })

    it('should apply large size classes', () => {
      const users = [createMockUser({ id: '1', name: 'Alice' })]

      const { container } = render(<PresenceAvatars users={users} size="lg" />)

      const avatar = container.querySelector('.h-10.w-10')
      expect(avatar).toBeInTheDocument()
    })
  })

  describe('tooltip content', () => {
    it('should show user name in tooltip', () => {
      const users = [createMockUser({ id: '1', name: 'Alice Smith' })]

      render(<PresenceAvatars users={users} />)

      // The mocked tooltip renders content directly
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    it('should show current page in tooltip when provided', () => {
      const users = [
        createMockUser({
          id: '1',
          name: 'Alice',
          currentPage: 'Daily Reports',
        }),
      ]

      render(<PresenceAvatars users={users} />)

      expect(screen.getByText('Viewing: Daily Reports')).toBeInTheDocument()
    })

    it('should not show current page when not provided', () => {
      const users = [createMockUser({ id: '1', name: 'Alice' })]

      render(<PresenceAvatars users={users} />)

      expect(screen.queryByText(/Viewing:/)).not.toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className to container', () => {
      const users = [createMockUser({ id: '1', name: 'Alice' })]

      const { container } = render(
        <PresenceAvatars users={users} className="my-custom-class" />
      )

      expect(container.firstChild).toHaveClass('my-custom-class')
    })
  })

  describe('online indicator', () => {
    it('should show online indicator dot for each avatar', () => {
      const users = [createMockUser({ id: '1', name: 'Alice' })]

      const { container } = render(<PresenceAvatars users={users} />)

      const onlineIndicator = container.querySelector('.bg-green-500')
      expect(onlineIndicator).toBeInTheDocument()
    })
  })
})
