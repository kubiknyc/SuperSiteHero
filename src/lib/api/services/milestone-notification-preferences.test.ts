/**
 * Milestone Notification Preferences API Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { milestoneNotificationPreferencesApi } from './milestone-notification-preferences'
import { supabase } from '@/lib/supabase'
import {
  MilestoneNotificationPreference,
  MilestoneEventType,
  DEFAULT_MILESTONE_PREFERENCES,
} from '@/types/milestone-notification-preferences'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('MilestoneNotificationPreferencesApi', () => {
  const mockUserId = 'user-123'
  const mockProjectId = 'project-456'
  const mockEventType: MilestoneEventType = 'project.milestone_completed'

  const mockPreference: MilestoneNotificationPreference = {
    id: 'pref-1',
    user_id: mockUserId,
    project_id: null,
    event_type: mockEventType,
    email_enabled: true,
    in_app_enabled: true,
    sms_enabled: false,
    push_enabled: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPreferences', () => {
    it('should fetch all preferences for a user', async () => {
      const mockData = [mockPreference]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.getPreferences(mockUserId)

      expect(supabase.from).toHaveBeenCalledWith('milestone_notification_preferences')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(result).toEqual(mockData)
    })

    it('should filter by project_id when provided', async () => {
      const mockData = [{ ...mockPreference, project_id: mockProjectId }]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await milestoneNotificationPreferencesApi.getPreferences(mockUserId, mockProjectId)

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId)
    })

    it('should filter for null project_id when null is provided', async () => {
      const mockData = [mockPreference]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await milestoneNotificationPreferencesApi.getPreferences(mockUserId, null)

      expect(mockQuery.is).toHaveBeenCalledWith('project_id', null)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Database error')

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(
        milestoneNotificationPreferencesApi.getPreferences(mockUserId)
      ).rejects.toThrow('Database error')
    })
  })

  describe('getPreference', () => {
    it('should fetch a specific preference', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockPreference, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.getPreference(
        mockUserId,
        mockEventType
      )

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockQuery.eq).toHaveBeenCalledWith('event_type', mockEventType)
      expect(result).toEqual(mockPreference)
    })

    it('should return null when preference does not exist', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.getPreference(
        mockUserId,
        mockEventType
      )

      expect(result).toBeNull()
    })
  })

  describe('createPreference', () => {
    it('should create a new preference with provided values', async () => {
      const createDto = {
        user_id: mockUserId,
        event_type: mockEventType,
        email_enabled: true,
        in_app_enabled: false,
        sms_enabled: false,
        push_enabled: false,
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPreference, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.createPreference(createDto)

      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        project_id: null,
        event_type: mockEventType,
        email_enabled: true,
        in_app_enabled: false,
        sms_enabled: false,
        push_enabled: false,
      })
      expect(result).toEqual(mockPreference)
    })

    it('should use default values when not provided', async () => {
      const createDto = {
        user_id: mockUserId,
        event_type: mockEventType,
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPreference, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await milestoneNotificationPreferencesApi.createPreference(createDto)

      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        project_id: null,
        event_type: mockEventType,
        email_enabled: true,
        in_app_enabled: true,
        sms_enabled: false,
        push_enabled: false,
      })
    })
  })

  describe('updatePreference', () => {
    it('should update an existing preference', async () => {
      const updates = {
        email_enabled: false,
        in_app_enabled: true,
      }

      const updatedPreference = { ...mockPreference, ...updates }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedPreference, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.updatePreference(
        mockPreference.id,
        updates
      )

      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockPreference.id)
      expect(result).toEqual(updatedPreference)
    })
  })

  describe('upsertPreference', () => {
    it('should update existing preference', async () => {
      const updates = { email_enabled: false }

      // Mock getPreference to return existing
      const mockGetQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockPreference, error: null }),
      }

      // Mock updatePreference
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockPreference, ...updates },
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await milestoneNotificationPreferencesApi.upsertPreference(
        mockUserId,
        mockEventType,
        updates
      )

      expect(result.email_enabled).toBe(false)
    })

    it('should create new preference if it does not exist', async () => {
      const updates = { email_enabled: false }

      // Mock getPreference to return null
      const mockGetQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      // Mock createPreference
      const mockCreateQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockPreference, ...updates },
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockCreateQuery as any)

      const result = await milestoneNotificationPreferencesApi.upsertPreference(
        mockUserId,
        mockEventType,
        updates
      )

      expect(result.email_enabled).toBe(false)
    })
  })

  describe('shouldNotify', () => {
    it('should return true when channel is enabled in preference', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockPreference, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.shouldNotify(
        mockUserId,
        mockEventType,
        'email'
      )

      expect(result).toBe(true)
    })

    it('should return false when channel is disabled in preference', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockPreference, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.shouldNotify(
        mockUserId,
        mockEventType,
        'sms'
      )

      expect(result).toBe(false)
    })

    it('should use default when preference does not exist', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.shouldNotify(
        mockUserId,
        mockEventType,
        'email'
      )

      // Should use default value
      const defaultValue = DEFAULT_MILESTONE_PREFERENCES[mockEventType].email_enabled
      expect(result).toBe(defaultValue)
    })

    it('should return false on error', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Database error')),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await milestoneNotificationPreferencesApi.shouldNotify(
        mockUserId,
        mockEventType,
        'email'
      )

      expect(result).toBe(false)
    })
  })

  describe('resetToDefaults', () => {
    it('should delete existing preferences and create defaults', async () => {
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockDeleteQuery as any)
        .mockReturnValueOnce(mockInsertQuery as any)

      await milestoneNotificationPreferencesApi.resetToDefaults(mockUserId)

      expect(mockDeleteQuery.delete).toHaveBeenCalled()
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockInsertQuery.insert).toHaveBeenCalled()
    })
  })

  describe('initializeDefaults', () => {
    it('should create defaults for new user', async () => {
      // Mock getPreferences to return empty array
      const mockGetQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      // Mock insert
      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockGetQuery as any)
        .mockReturnValueOnce(mockInsertQuery as any)

      await milestoneNotificationPreferencesApi.initializeDefaults(mockUserId)

      expect(mockInsertQuery.insert).toHaveBeenCalled()
    })

    it('should not create defaults if preferences already exist', async () => {
      // Mock getPreferences to return existing preferences
      const mockGetQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockPreference], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockGetQuery as any)

      await milestoneNotificationPreferencesApi.initializeDefaults(mockUserId)

      // Should only call getPreferences, not insert
      expect(supabase.from).toHaveBeenCalledTimes(1)
    })
  })
})
