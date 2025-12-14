/**
 * Tests for Notifications Hooks
 * Tests for notification management hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// =============================================
// Mock Setup
// =============================================

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Create mock API functions
const mockGetNotifications = vi.fn()
const mockGetUnreadCount = vi.fn()
const mockGetNotification = vi.fn()
const mockMarkAsRead = vi.fn()
const mockMarkAllAsRead = vi.fn()
const mockDeleteNotification = vi.fn()
const mockDeleteAllNotifications = vi.fn()
const mockCreateNotification = vi.fn()

// Mock notifications API
vi.mock('@/lib/api/services/notifications', () => ({
  notificationsApi: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
    getNotification: (...args: unknown[]) => mockGetNotification(...args),
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
    markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
    deleteNotification: (...args: unknown[]) => mockDeleteNotification(...args),
    deleteAllNotifications: (...args: unknown[]) => mockDeleteAllNotifications(...args),
    createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  },
}))

// Import hooks after mocks
import {
  notificationKeys,
  useNotifications,
  useUnreadNotifications,
  useUnreadNotificationCount,
  useNotification,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  useCreateNotification,
} from './useNotifications'

// =============================================
// Test Data
// =============================================

const mockNotification = {
  id: 'notif-1',
  user_id: 'user-123',
  type: 'rfi_response',
  title: 'RFI Response Received',
  message: 'Your RFI has been answered',
  is_read: false,
  created_at: '2024-01-15T10:00:00Z',
  data: { rfi_id: 'rfi-123' },
}

const mockNotifications = [
  mockNotification,
  {
    id: 'notif-2',
    user_id: 'user-123',
    type: 'submittal_approved',
    title: 'Submittal Approved',
    message: 'Your submittal has been approved',
    is_read: true,
    created_at: '2024-01-14T10:00:00Z',
    data: { submittal_id: 'sub-123' },
  },
]

// =============================================
// Test Setup
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockGetNotifications.mockResolvedValue(mockNotifications)
  mockGetUnreadCount.mockResolvedValue(5)
  mockGetNotification.mockResolvedValue(mockNotification)
  mockMarkAsRead.mockResolvedValue({ ...mockNotification, is_read: true })
  mockMarkAllAsRead.mockResolvedValue(undefined)
  mockDeleteNotification.mockResolvedValue(undefined)
  mockDeleteAllNotifications.mockResolvedValue(undefined)
  mockCreateNotification.mockResolvedValue(mockNotification)
})

// =============================================
// Query Key Tests
// =============================================

describe('notificationKeys', () => {
  it('should generate correct base key', () => {
    expect(notificationKeys.all).toEqual(['notifications'])
  })

  it('should generate correct lists key', () => {
    expect(notificationKeys.lists()).toEqual(['notifications', 'list'])
  })

  it('should generate correct list key with filters', () => {
    const filters = { user_id: 'user-123', is_read: false }
    expect(notificationKeys.list(filters)).toEqual([
      'notifications',
      'list',
      filters,
    ])
  })

  it('should generate correct details key', () => {
    expect(notificationKeys.details()).toEqual(['notifications', 'detail'])
  })

  it('should generate correct detail key', () => {
    expect(notificationKeys.detail('notif-1')).toEqual([
      'notifications',
      'detail',
      'notif-1',
    ])
  })

  it('should generate correct unreadCount key', () => {
    expect(notificationKeys.unreadCount('user-123')).toEqual([
      'notifications',
      'unread',
      'user-123',
    ])
  })
})

// =============================================
// Query Hook Tests
// =============================================

describe('useNotifications', () => {
  it('should fetch notifications for current user', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockNotifications)
    expect(mockGetNotifications).toHaveBeenCalledWith({ user_id: 'user-123' })
  })

  it('should apply filters', async () => {
    const { result } = renderHook(
      () => useNotifications({ is_read: false, limit: 10 }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetNotifications).toHaveBeenCalledWith({
      is_read: false,
      limit: 10,
      user_id: 'user-123',
    })
  })
})

describe('useUnreadNotifications', () => {
  it('should fetch unread notifications with limit', async () => {
    const { result } = renderHook(() => useUnreadNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetNotifications).toHaveBeenCalledWith({
      is_read: false,
      limit: 20,
      user_id: 'user-123',
    })
  })
})

describe('useUnreadNotificationCount', () => {
  it('should fetch unread count', async () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(5)
    expect(mockGetUnreadCount).toHaveBeenCalledWith('user-123')
  })
})

describe('useNotification', () => {
  it('should fetch single notification', async () => {
    const { result } = renderHook(() => useNotification('notif-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockNotification)
    expect(mockGetNotification).toHaveBeenCalledWith('notif-1')
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useNotification(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

// =============================================
// Mutation Hook Tests
// =============================================

describe('useMarkNotificationAsRead', () => {
  it('should mark notification as read', async () => {
    const { result } = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('notif-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1')
  })

  it('should handle errors', async () => {
    mockMarkAsRead.mockRejectedValueOnce(new Error('Failed'))

    const { result } = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('notif-1')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useMarkAllNotificationsAsRead', () => {
  it('should mark all notifications as read', async () => {
    const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockMarkAllAsRead).toHaveBeenCalledWith('user-123')
  })
})

describe('useDeleteNotification', () => {
  it('should delete notification', async () => {
    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('notif-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDeleteNotification).toHaveBeenCalledWith('notif-1')
  })
})

describe('useDeleteAllNotifications', () => {
  it('should delete all notifications', async () => {
    const { result } = renderHook(() => useDeleteAllNotifications(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDeleteAllNotifications).toHaveBeenCalledWith('user-123')
  })
})

describe('useCreateNotification', () => {
  it('should create notification', async () => {
    const newNotification = {
      user_id: 'user-456',
      type: 'custom',
      title: 'Custom Notification',
      message: 'This is a test',
    }

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(newNotification)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockCreateNotification).toHaveBeenCalledWith(newNotification)
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  it('should handle fetch error gracefully', async () => {
    mockGetNotifications.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('should handle mutation error gracefully', async () => {
    mockDeleteNotification.mockRejectedValueOnce(new Error('Delete failed'))

    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('notif-1')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// =============================================
// Integration Tests
// =============================================

describe('Notification Workflow', () => {
  it('should fetch and then mark as read', async () => {
    // First fetch notifications
    const notificationsHook = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(notificationsHook.result.current.isSuccess).toBe(true))

    // Then mark one as read
    const markReadHook = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: createWrapper(),
    })

    markReadHook.result.current.mutate('notif-1')

    await waitFor(() => expect(markReadHook.result.current.isSuccess).toBe(true))

    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1')
  })
})
