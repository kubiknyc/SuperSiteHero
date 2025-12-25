import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { notificationPreferencesApi } from '../notification-preferences'

vi.mock('@/lib/supabase')
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn() },
}))
vi.mock('@/types/notification-preferences', () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: {
    email: { approvalRequests: true, taskAssigned: true },
    inApp: { approvalRequests: true, taskAssigned: true },
    quietHours: undefined,
  },
  mergeWithDefaults: vi.fn((prefs) => ({
    ...{
      email: { approvalRequests: true, taskAssigned: true },
      inApp: { approvalRequests: true, taskAssigned: true },
      quietHours: undefined,
    },
    ...prefs,
  })),
}))

describe('notificationPreferencesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPreferences', () => {
    it('should fetch user preferences', async () => {
      const mockData = {
        notification_preferences: {
          email: { approvalRequests: true },
          inApp: { approvalRequests: false },
        },
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationPreferencesApi.getPreferences('user-1')

      expect(result).toBeDefined()
      expect(supabase.from).toHaveBeenCalledWith('users')
    })

    it('should return defaults on error', async () => {
      const mockError = new Error('Fetch failed')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationPreferencesApi.getPreferences('user-1')

      expect(result).toBeDefined()
    })
  })

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            notification_preferences: {
              email: { approvalRequests: true },
              inApp: { approvalRequests: true },
              quietHours: undefined,
            },
          },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await notificationPreferencesApi.updatePreferences('user-1', {
        email: { approvalRequests: false },
      })

      expect(mockUpdateQuery.update).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should handle update errors', async () => {
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: {} },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      await expect(
        notificationPreferencesApi.updatePreferences('user-1', {})
      ).rejects.toThrow('Update failed')
    })
  })

  describe('resetToDefaults', () => {
    it('should reset preferences to defaults', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await notificationPreferencesApi.resetToDefaults('user-1')

      expect(mockQuery.update).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('enableAllEmail', () => {
    it('should enable all email notifications', async () => {
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            notification_preferences: {
              email: {},
              inApp: {},
            },
          },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await notificationPreferencesApi.enableAllEmail('user-1')

      expect(result.email).toBeDefined()
      expect(Object.values(result.email).every((v) => v === true)).toBe(true)
    })
  })

  describe('disableAllEmail', () => {
    it('should disable all email notifications', async () => {
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            notification_preferences: {
              email: {},
              inApp: {},
            },
          },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await notificationPreferencesApi.disableAllEmail('user-1')

      expect(result.email).toBeDefined()
      expect(Object.values(result.email).every((v) => v === false)).toBe(true)
    })
  })

  describe('updateQuietHours', () => {
    it('should update quiet hours', async () => {
      const quietHours = {
        enabled: true,
        startHour: 22,
        endHour: 8,
        timezone: 'America/New_York',
      }

      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: { email: {}, inApp: {} } },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await notificationPreferencesApi.updateQuietHours('user-1', quietHours)

      expect(result).toBeDefined()
    })
  })

  describe('disableQuietHours', () => {
    it('should disable quiet hours', async () => {
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { notification_preferences: { email: {}, inApp: {} } },
          error: null,
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await notificationPreferencesApi.disableQuietHours('user-1')

      expect(result).toBeDefined()
    })
  })
})
