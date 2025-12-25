import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { notificationsApi } from '../notifications'

vi.mock('@/lib/supabase')
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('notificationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should fetch notifications with default filters', async () => {
      const mockData = [
        { id: '1', title: 'Test 1', user_id: 'user-1' },
        { id: '2', title: 'Test 2', user_id: 'user-1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationsApi.getNotifications()

      expect(result).toEqual(mockData)
      expect(mockQuery.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should apply user_id filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.getNotifications({ user_id: 'user-1' })

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('should apply is_read filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.getNotifications({ is_read: false })

      expect(mockQuery.eq).toHaveBeenCalledWith('is_read', false)
    })

    it('should apply type filter as array', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.getNotifications({ type: ['type1', 'type2'] })

      expect(mockQuery.in).toHaveBeenCalledWith('type', ['type1', 'type2'])
    })

    it('should apply limit and offset', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.getNotifications({ limit: 10, offset: 5 })

      expect(mockQuery.range).toHaveBeenCalledWith(5, 14)
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Fetch failed')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(notificationsApi.getNotifications()).rejects.toThrow('Fetch failed')
    })
  })

  describe('getNotification', () => {
    it('should fetch a single notification', async () => {
      const mockData = { id: '1', title: 'Test' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationsApi.getNotification('1')

      expect(result).toEqual(mockData)
    })

    it('should return null for not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationsApi.getNotification('1')

      expect(result).toBeNull()
    })

    it('should throw on other errors', async () => {
      const mockError = new Error('DB error')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(notificationsApi.getNotification('1')).rejects.toThrow('DB error')
    })
  })

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const mockInput = {
        user_id: 'user-1',
        type: 'info',
        title: 'Test',
        message: 'Test message',
      }
      const mockData = { ...mockInput, id: '1', is_read: false }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationsApi.createNotification(mockInput)

      expect(result).toEqual(mockData)
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_read: false })
      )
    })

    it('should handle creation errors', async () => {
      const mockError = new Error('Create failed')
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(
        notificationsApi.createNotification({
          user_id: 'user-1',
          type: 'info',
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('Create failed')
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.markAsRead('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_read: true,
          read_at: expect.any(String),
        })
      )
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.markAllAsRead('user-1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_read: true })
      )
    })
  })

  describe('deleteNotification', () => {
    it('should soft delete a notification', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.deleteNotification('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('deleteAllNotifications', () => {
    it('should delete all user notifications', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await notificationsApi.deleteAllNotifications('user-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationsApi.getUnreadCount('user-1')

      expect(result).toBe(5)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_read', false)
    })

    it('should return 0 if count is null', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ count: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationsApi.getUnreadCount('user-1')

      expect(result).toBe(0)
    })

    it('should handle count errors', async () => {
      const mockError = new Error('Count failed')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ count: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(notificationsApi.getUnreadCount('user-1')).rejects.toThrow('Count failed')
    })
  })
})
