/**
 * Notifications API Service Tests
 *
 * Tests notification management operations including CRUD, read/unread tracking,
 * filtering, pagination, and batch operations.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { notificationsApi } from './notifications'
import type { Notification, CreateNotificationDTO } from './notifications'

// Mock Supabase
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockIs = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockRange = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('notificationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default chainable mock behavior
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    })

    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      in: mockIn,
      order: mockOrder,
      single: mockSingle,
      limit: mockLimit,
      range: mockRange,
    })

    mockIs.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
      limit: mockLimit,
      range: mockRange,
    })

    mockOrder.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      in: mockIn,
      limit: mockLimit,
      range: mockRange,
    })

    mockIn.mockReturnValue({
      limit: mockLimit,
      range: mockRange,
    })

    mockLimit.mockReturnValue({
      range: mockRange,
    })

    mockInsert.mockReturnValue({
      select: mockSelect,
    })

    mockUpdate.mockReturnValue({
      eq: mockEq,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getNotifications', () => {
    const mockNotifications: Notification[] = [
      {
        id: 'notif-1',
        user_id: 'user-123',
        type: 'comment',
        title: 'New Comment',
        message: 'Someone commented on your post',
        is_read: false,
        read_at: null,
        related_to_id: 'post-1',
        related_to_type: 'post',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        deleted_at: null,
      },
      {
        id: 'notif-2',
        user_id: 'user-123',
        type: 'mention',
        title: 'You were mentioned',
        message: 'Someone mentioned you',
        is_read: true,
        read_at: '2024-01-02T12:00:00Z',
        related_to_id: null,
        related_to_type: null,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-02T12:00:00Z',
        deleted_at: null,
      },
    ]

    it('should fetch all notifications with default ordering', async () => {
      mockOrder.mockResolvedValue({ data: mockNotifications, error: null })

      const result = await notificationsApi.getNotifications()

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockNotifications)
    })

    it('should filter by user_id', async () => {
      mockEq.mockReturnValue(mockEq)
      mockEq.mockResolvedValue({ data: [mockNotifications[0]], error: null })

      const result = await notificationsApi.getNotifications({ user_id: 'user-123' })

      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(result).toHaveLength(1)
    })

    it('should filter by is_read = true', async () => {
      mockEq.mockReturnValue(mockEq)
      mockEq.mockResolvedValue({ data: [mockNotifications[1]], error: null })

      const result = await notificationsApi.getNotifications({ is_read: true })

      expect(mockEq).toHaveBeenCalledWith('is_read', true)
      expect(result).toHaveLength(1)
    })

    it('should filter by is_read = false', async () => {
      mockEq.mockReturnValue(mockEq)
      mockEq.mockResolvedValue({ data: [mockNotifications[0]], error: null })

      const result = await notificationsApi.getNotifications({ is_read: false })

      expect(mockEq).toHaveBeenCalledWith('is_read', false)
      expect(result).toHaveLength(1)
    })

    it('should filter by single type', async () => {
      mockEq.mockReturnValue(mockEq)
      mockEq.mockResolvedValue({ data: [mockNotifications[0]], error: null })

      await notificationsApi.getNotifications({ type: 'comment' })

      expect(mockEq).toHaveBeenCalledWith('type', 'comment')
    })

    it('should filter by multiple types using IN', async () => {
      mockIn.mockResolvedValue({ data: mockNotifications, error: null })

      await notificationsApi.getNotifications({ type: ['comment', 'mention'] })

      expect(mockIn).toHaveBeenCalledWith('type', ['comment', 'mention'])
    })

    it('should apply limit', async () => {
      mockLimit.mockResolvedValue({ data: [mockNotifications[0]], error: null })

      await notificationsApi.getNotifications({ limit: 10 })

      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it('should apply offset with default limit', async () => {
      mockRange.mockResolvedValue({ data: mockNotifications, error: null })

      await notificationsApi.getNotifications({ offset: 20 })

      expect(mockRange).toHaveBeenCalledWith(20, 69) // offset 20, default limit 50
    })

    it('should apply offset with custom limit', async () => {
      mockRange.mockResolvedValue({ data: mockNotifications, error: null })

      await notificationsApi.getNotifications({ offset: 10, limit: 5 })

      expect(mockRange).toHaveBeenCalledWith(10, 14) // offset 10, limit 5
    })

    it('should combine multiple filters', async () => {
      mockEq.mockReturnValue(mockEq)
      mockLimit.mockResolvedValue({ data: [mockNotifications[0]], error: null })

      await notificationsApi.getNotifications({
        user_id: 'user-123',
        is_read: false,
        type: 'comment',
        limit: 5,
      })

      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockEq).toHaveBeenCalledWith('is_read', false)
      expect(mockEq).toHaveBeenCalledWith('type', 'comment')
      expect(mockLimit).toHaveBeenCalledWith(5)
    })

    it('should return empty array if no data', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null })

      const result = await notificationsApi.getNotifications()

      expect(result).toEqual([])
    })

    it('should throw error on failure', async () => {
      const dbError = new Error('Database error')
      mockOrder.mockResolvedValue({ data: null, error: dbError })

      await expect(notificationsApi.getNotifications()).rejects.toThrow('Database error')
    })
  })

  describe('getNotification', () => {
    const mockNotification: Notification = {
      id: 'notif-1',
      user_id: 'user-123',
      type: 'comment',
      title: 'New Comment',
      message: 'Test message',
      is_read: false,
      read_at: null,
      related_to_id: null,
      related_to_type: null,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      deleted_at: null,
    }

    it('should fetch a single notification by ID', async () => {
      mockSingle.mockResolvedValue({ data: mockNotification, error: null })

      const result = await notificationsApi.getNotification('notif-1')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-1')
      expect(mockSingle).toHaveBeenCalled()
      expect(result).toEqual(mockNotification)
    })

    it('should return null if notification not found', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Not found' }
      mockSingle.mockResolvedValue({ data: null, error: notFoundError })

      const result = await notificationsApi.getNotification('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      const dbError = { code: 'SOME_ERROR', message: 'Database error' }
      mockSingle.mockResolvedValue({ data: null, error: dbError })

      await expect(notificationsApi.getNotification('notif-1')).rejects.toEqual(dbError)
    })
  })

  describe('createNotification', () => {
    const validData: CreateNotificationDTO = {
      user_id: 'user-123',
      type: 'comment',
      title: 'New Comment',
      message: 'Someone commented',
    }

    const createdNotification: Notification = {
      id: 'notif-new',
      ...validData,
      is_read: false,
      read_at: null,
      related_to_id: null,
      related_to_type: null,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      deleted_at: null,
    }

    it('should create a notification with is_read set to false', async () => {
      mockSingle.mockResolvedValue({ data: createdNotification, error: null })

      const result = await notificationsApi.createNotification(validData)

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockInsert).toHaveBeenCalledWith({
        ...validData,
        is_read: false,
      })
      expect(mockSelect).toHaveBeenCalled()
      expect(mockSingle).toHaveBeenCalled()
      expect(result).toEqual(createdNotification)
    })

    it('should create a notification with optional related fields', async () => {
      const dataWithRelated: CreateNotificationDTO = {
        ...validData,
        related_to_id: 'post-1',
        related_to_type: 'post',
      }
      const createdWithRelated = {
        ...createdNotification,
        related_to_id: 'post-1',
        related_to_type: 'post',
      }
      mockSingle.mockResolvedValue({ data: createdWithRelated, error: null })

      const result = await notificationsApi.createNotification(dataWithRelated)

      expect(mockInsert).toHaveBeenCalledWith({
        ...dataWithRelated,
        is_read: false,
      })
      expect(result.related_to_id).toBe('post-1')
      expect(result.related_to_type).toBe('post')
    })

    it('should throw error on creation failure', async () => {
      const dbError = new Error('Creation failed')
      mockSingle.mockResolvedValue({ data: null, error: dbError })

      await expect(notificationsApi.createNotification(validData)).rejects.toThrow(
        'Creation failed'
      )
    })
  })

  describe('markAsRead', () => {
    it('should mark a notification as read with timestamp', async () => {
      const now = new Date()
      vi.useFakeTimers()
      vi.setSystemTime(now)

      mockEq.mockResolvedValue({ error: null })

      await notificationsApi.markAsRead('notif-1')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalledWith({
        is_read: true,
        read_at: now.toISOString(),
      })
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-1')

      vi.useRealTimers()
    })

    it('should throw error on failure', async () => {
      const dbError = new Error('Update failed')
      mockEq.mockResolvedValue({ error: dbError })

      await expect(notificationsApi.markAsRead('notif-1')).rejects.toThrow('Update failed')
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      const now = new Date()
      vi.useFakeTimers()
      vi.setSystemTime(now)

      mockEq.mockReturnValue(mockEq)
      mockEq.mockResolvedValue({ error: null })

      await notificationsApi.markAllAsRead('user-123')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalledWith({
        is_read: true,
        read_at: now.toISOString(),
      })
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockEq).toHaveBeenCalledWith('is_read', false)

      vi.useRealTimers()
    })

    it('should throw error on failure', async () => {
      const dbError = new Error('Batch update failed')
      mockEq.mockReturnValue(mockEq)
      mockEq.mockResolvedValue({ error: dbError })

      await expect(notificationsApi.markAllAsRead('user-123')).rejects.toThrow(
        'Batch update failed'
      )
    })
  })

  describe('deleteNotification', () => {
    it('should soft delete a notification with timestamp', async () => {
      const now = new Date()
      vi.useFakeTimers()
      vi.setSystemTime(now)

      mockEq.mockResolvedValue({ error: null })

      await notificationsApi.deleteNotification('notif-1')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: now.toISOString() })
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-1')

      vi.useRealTimers()
    })

    it('should throw error on failure', async () => {
      const dbError = new Error('Delete failed')
      mockEq.mockResolvedValue({ error: dbError })

      await expect(notificationsApi.deleteNotification('notif-1')).rejects.toThrow(
        'Delete failed'
      )
    })
  })

  describe('deleteAllNotifications', () => {
    it('should soft delete all non-deleted notifications for a user', async () => {
      const now = new Date()
      vi.useFakeTimers()
      vi.setSystemTime(now)

      mockEq.mockReturnValue(mockEq)
      mockIs.mockResolvedValue({ error: null })

      await notificationsApi.deleteAllNotifications('user-123')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: now.toISOString() })
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)

      vi.useRealTimers()
    })

    it('should throw error on failure', async () => {
      const dbError = new Error('Batch delete failed')
      mockEq.mockReturnValue(mockEq)
      mockIs.mockResolvedValue({ error: dbError })

      await expect(notificationsApi.deleteAllNotifications('user-123')).rejects.toThrow(
        'Batch delete failed'
      )
    })
  })

  describe('getUnreadCount', () => {
    it('should return count of unread notifications for a user', async () => {
      mockIs.mockResolvedValue({ count: 5, error: null })

      const result = await notificationsApi.getUnreadCount('user-123')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockEq).toHaveBeenCalledWith('is_read', false)
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(result).toBe(5)
    })

    it('should return 0 if count is null', async () => {
      mockIs.mockResolvedValue({ count: null, error: null })

      const result = await notificationsApi.getUnreadCount('user-123')

      expect(result).toBe(0)
    })

    it('should return 0 for users with no unread notifications', async () => {
      mockIs.mockResolvedValue({ count: 0, error: null })

      const result = await notificationsApi.getUnreadCount('user-123')

      expect(result).toBe(0)
    })

    it('should throw error on failure', async () => {
      const dbError = new Error('Count failed')
      mockIs.mockResolvedValue({ count: null, error: dbError })

      await expect(notificationsApi.getUnreadCount('user-123')).rejects.toThrow('Count failed')
    })
  })

  describe('edge cases', () => {
    it('should handle notifications with null fields', async () => {
      const notificationWithNulls: Notification = {
        id: 'notif-1',
        user_id: 'user-123',
        type: null,
        title: 'Test',
        message: null,
        is_read: null,
        read_at: null,
        related_to_id: null,
        related_to_type: null,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      }
      mockOrder.mockResolvedValue({ data: [notificationWithNulls], error: null })

      const result = await notificationsApi.getNotifications()

      expect(result).toHaveLength(1)
      expect(result[0].type).toBeNull()
      expect(result[0].message).toBeNull()
    })

    it('should handle large result sets', async () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({
        id: `notif-${i}`,
        user_id: 'user-123',
        type: 'comment',
        title: `Notification ${i}`,
        message: 'Test',
        is_read: false,
        read_at: null,
        related_to_id: null,
        related_to_type: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        deleted_at: null,
      })) as Notification[]
      mockOrder.mockResolvedValue({ data: largeList, error: null })

      const result = await notificationsApi.getNotifications()

      expect(result).toHaveLength(1000)
    })

    it('should handle pagination beyond available records', async () => {
      mockRange.mockResolvedValue({ data: [], error: null })

      const result = await notificationsApi.getNotifications({ offset: 1000, limit: 10 })

      expect(result).toEqual([])
    })

    it('should not call eq for is_read when undefined', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      await notificationsApi.getNotifications({ is_read: undefined })

      // Should not have been called with is_read
      const eqCalls = mockEq.mock.calls
      expect(eqCalls.every((call) => call[0] !== 'is_read')).toBe(true)
    })

    it('should handle special characters in notification content', async () => {
      const specialCharsNotif: Notification = {
        id: 'notif-1',
        user_id: 'user-123',
        type: 'mention',
        title: 'Special <>&" chars',
        message: "O'Reilly mentioned you in: \"Project Update\"",
        is_read: false,
        read_at: null,
        related_to_id: null,
        related_to_type: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        deleted_at: null,
      }
      mockSingle.mockResolvedValue({ data: specialCharsNotif, error: null })

      const result = await notificationsApi.createNotification({
        user_id: 'user-123',
        type: 'mention',
        title: 'Special <>&" chars',
        message: "O'Reilly mentioned you in: \"Project Update\"",
      })

      expect(result.title).toContain('<>&"')
      expect(result.message).toContain("O'Reilly")
    })
  })
})
