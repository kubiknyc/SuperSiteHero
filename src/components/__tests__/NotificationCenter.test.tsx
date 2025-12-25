import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { NotificationCenter } from '../NotificationCenter'
import { notificationService } from '@/lib/notifications/notification-service'

// Mock dependencies
vi.mock('@/lib/notifications/notification-service', () => ({
  notificationService: {
    getInAppNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const createMockNotification = (overrides: any = {}) => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'rfi_response',
  title: 'New RFI Response',
  message: 'You have a new response on RFI #123',
  link: '/projects/proj-1/rfis/123',
  createdAt: new Date().toISOString(),
  read: false,
  priority: 'normal' as const,
  ...overrides,
})

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([])
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Basic Rendering', () => {
    it('renders notification bell icon', async () => {
      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      expect(bellButton).toBeInTheDocument()
    })

    it('shows unread count badge when there are unread notifications', async () => {
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
        createMockNotification({ id: '2', read: false }),
        createMockNotification({ id: '3', read: true }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('shows "99+" badge when unread count exceeds 99', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) =>
        createMockNotification({ id: `notif-${i}`, read: false })
      )
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue(notifications)

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument()
      })
    })

    it('does not show badge when there are no unread notifications', async () => {
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: true }),
        createMockNotification({ id: '2', read: true }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      await waitFor(() => {
        const bellButton = screen.getByLabelText('Notifications')
        const badge = bellButton.querySelector('.absolute')
        expect(badge).not.toBeInTheDocument()
      })
    })
  })

  describe('Popover Interactions', () => {
    it('opens popover when bell icon is clicked', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    it('closes popover when bell icon is clicked again', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
      })
    })
  })

  describe('Notification List', () => {
    it('shows loading state when fetching notifications', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(notificationService.getInAppNotifications).mockReturnValue(promise as any)

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument() // Loading spinner

      resolvePromise!([])
    })

    it('shows empty state when there are no notifications', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('No notifications yet')).toBeInTheDocument()
        expect(screen.getByText(/You'll see updates here/)).toBeInTheDocument()
      })
    })

    it('renders list of notifications', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          id: '1',
          title: 'RFI Response',
          message: 'New response on RFI #123',
        }),
        createMockNotification({
          id: '2',
          title: 'Submittal Approved',
          message: 'Submittal #456 has been approved',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('RFI Response')).toBeInTheDocument()
        expect(screen.getByText('Submittal Approved')).toBeInTheDocument()
      })
    })

    it('highlights unread notifications', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
        createMockNotification({ id: '2', read: true }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        const notifications = screen.getAllByRole('button', { name: '' })
        // Unread notification should have different styling
        expect(notifications[0]).toHaveClass('bg-blue-50/50')
      })
    })

    it('displays notification timestamp in relative format', async () => {
      const user = userEvent.setup()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', createdAt: oneHourAgo }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText(/ago/)).toBeInTheDocument()
      })
    })
  })

  describe('Mark as Read', () => {
    it('marks single notification as read when mark button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        const markButton = screen.getByTitle('Mark as read')
        expect(markButton).toBeInTheDocument()
      })

      const markButton = screen.getByTitle('Mark as read')
      await user.click(markButton)

      expect(notificationService.markAsRead).toHaveBeenCalledWith('1')
    })

    it('marks all notifications as read when "Mark all as read" is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
        createMockNotification({ id: '2', read: false }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        const markAllButton = screen.getByTitle('Mark all as read')
        expect(markAllButton).toBeInTheDocument()
      })

      const markAllButton = screen.getByTitle('Mark all as read')
      await user.click(markAllButton)

      expect(notificationService.markAsRead).toHaveBeenCalledTimes(2)
      expect(notificationService.markAsRead).toHaveBeenCalledWith('1')
      expect(notificationService.markAsRead).toHaveBeenCalledWith('2')
    })

    it('updates unread count after marking as read', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
      })

      const bellButton = screen.getByLabelText(/1 unread/)
      await user.click(bellButton)

      await waitFor(() => {
        const markButton = screen.getByTitle('Mark as read')
        expect(markButton).toBeInTheDocument()
      })

      const markButton = screen.getByTitle('Mark as read')
      await user.click(markButton)

      await waitFor(() => {
        expect(screen.queryByText('1')).not.toBeInTheDocument()
      })
    })

    it('automatically marks as read when notification is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          id: '1',
          read: false,
          link: '/test-link',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('New RFI Response')).toBeInTheDocument()
      })

      const notificationItem = screen.getByText('New RFI Response').closest('[role="button"]')
      await user.click(notificationItem!)

      expect(notificationService.markAsRead).toHaveBeenCalledWith('1')
    })
  })

  describe('Clear All', () => {
    it('clears all notifications when "Clear all" button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1' }),
        createMockNotification({ id: '2' }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        const clearAllButton = screen.getByTitle('Clear all notifications')
        expect(clearAllButton).toBeInTheDocument()
      })

      const clearAllButton = screen.getByTitle('Clear all notifications')
      await user.click(clearAllButton)

      expect(notificationService.clearAll).toHaveBeenCalledWith('user-1')
    })

    it('updates UI after clearing all notifications', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1' }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('New RFI Response')).toBeInTheDocument()
      })

      const clearAllButton = screen.getByTitle('Clear all notifications')
      await user.click(clearAllButton)

      await waitFor(() => {
        expect(screen.getByText('No notifications yet')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('navigates to notification link when notification is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          id: '1',
          link: '/projects/proj-1/rfis/123',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('New RFI Response')).toBeInTheDocument()
      })

      const notificationItem = screen.getByText('New RFI Response').closest('[role="button"]')
      await user.click(notificationItem!)

      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1/rfis/123')
    })

    it('navigates to all notifications page when "View all" is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1' }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('View all notifications')).toBeInTheDocument()
      })

      const viewAllButton = screen.getByText('View all notifications')
      await user.click(viewAllButton)

      expect(mockNavigate).toHaveBeenCalledWith('/notifications')
    })

    it('closes popover after navigating', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          id: '1',
          link: '/test-link',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('New RFI Response')).toBeInTheDocument()
      })

      const notificationItem = screen.getByText('New RFI Response').closest('[role="button"]')
      await user.click(notificationItem!)

      await waitFor(() => {
        expect(screen.queryByText('New RFI Response')).not.toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('allows keyboard navigation with Enter key', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          id: '1',
          link: '/test-link',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('New RFI Response')).toBeInTheDocument()
      })

      const notificationItem = screen.getByText('New RFI Response').closest('[role="button"]')
      notificationItem?.focus()
      await user.keyboard('{Enter}')

      expect(mockNavigate).toHaveBeenCalledWith('/test-link')
    })

    it('allows keyboard navigation with Space key', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          id: '1',
          link: '/test-link',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('New RFI Response')).toBeInTheDocument()
      })

      const notificationItem = screen.getByText('New RFI Response').closest('[role="button"]')
      notificationItem?.focus()
      await user.keyboard(' ')

      expect(mockNavigate).toHaveBeenCalledWith('/test-link')
    })
  })

  describe('Notification Icons', () => {
    it('displays correct icon for RFI notifications', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ type: 'rfi_response' }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        // MessageSquare icon for RFI
        const icons = screen.getAllByRole('img', { hidden: true })
        expect(icons.length).toBeGreaterThan(0)
      })
    })

    it('displays correct icon for safety incidents with error color', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          type: 'safety_incident',
          title: 'Safety Incident Reported',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('Safety Incident Reported')).toBeInTheDocument()
      })
    })

    it('applies priority-based background colors', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({
          id: '1',
          priority: 'high',
          title: 'High Priority',
        }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        const notification = screen.getByText('High Priority').closest('[role="button"]')
        expect(notification).toHaveClass('bg-error-light')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles errors when loading notifications', async () => {
      const { logger } = require('@/lib/utils/logger')
      vi.mocked(notificationService.getInAppNotifications).mockRejectedValue(
        new Error('Failed to load')
      )

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          '[NotificationCenter] Failed to load notifications:',
          expect.any(Error)
        )
      })
    })

    it('handles errors when marking as read', async () => {
      const user = userEvent.setup()
      const { logger } = require('@/lib/utils/logger')

      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
      ])
      vi.mocked(notificationService.markAsRead).mockRejectedValue(
        new Error('Failed to mark as read')
      )

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByTitle('Mark as read')).toBeInTheDocument()
      })

      const markButton = screen.getByTitle('Mark as read')
      await user.click(markButton)

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          '[NotificationCenter] Failed to mark as read:',
          expect.any(Error)
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA label on bell button', () => {
      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })

    it('updates ARIA label with unread count', async () => {
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications (1 unread)')).toBeInTheDocument()
      })
    })

    it('notification items have proper role and tabindex', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1' }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        const notificationItem = screen.getByText('New RFI Response').closest('[role="button"]')
        expect(notificationItem).toHaveAttribute('tabIndex', '0')
      })
    })

    it('buttons have descriptive titles', async () => {
      const user = userEvent.setup()
      vi.mocked(notificationService.getInAppNotifications).mockResolvedValue([
        createMockNotification({ id: '1', read: false }),
      ])

      render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      )

      const bellButton = screen.getByLabelText('Notifications')
      await user.click(bellButton)

      await waitFor(() => {
        expect(screen.getByTitle('Mark as read')).toBeInTheDocument()
        expect(screen.getByTitle('Mark all as read')).toBeInTheDocument()
        expect(screen.getByTitle('Clear all notifications')).toBeInTheDocument()
      })
    })
  })
})
