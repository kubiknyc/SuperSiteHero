import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { googleCalendarApi } from '../google-calendar'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
  supabase: {
    from: vi.fn(),
  },
}))

describe('Google Calendar API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConnectionStatus', () => {
    it('should return connected status', async () => {
      const mockConnection = {
        id: 'conn1',
        google_account_email: 'test@gmail.com',
        calendar_id: 'primary',
        sync_enabled: true,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await googleCalendarApi.getConnectionStatus('user123')

      expect(result.isConnected).toBe(true)
      expect(result.googleAccountEmail).toBe('test@gmail.com')
    })

    it('should return not connected status', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await googleCalendarApi.getConnectionStatus('user123')

      expect(result.isConnected).toBe(false)
      expect(result.connectionId).toBeNull()
    })

    it('should detect expired token', async () => {
      const mockConnection = {
        id: 'conn1',
        token_expires_at: new Date(Date.now() - 1000).toISOString(),
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await googleCalendarApi.getConnectionStatus('user123')

      expect(result.isTokenExpired).toBe(true)
    })
  })

  describe('getAuthUrl', () => {
    it('should generate authorization URL', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { authUrl: 'https://accounts.google.com/oauth...' },
        error: null,
      })

      const result = await googleCalendarApi.getAuthUrl('comp1')

      expect(result).toContain('https://accounts.google.com')
      expect(supabase.functions.invoke).toHaveBeenCalledWith('gcal-get-auth-url', {
        body: { companyId: 'comp1' },
      })
    })
  })

  describe('completeConnection', () => {
    it('should complete OAuth and return connection', async () => {
      const mockResult = {
        connection: { id: 'conn1', google_account_email: 'test@gmail.com' },
        calendars: [
          { id: 'primary', summary: 'Test Calendar' },
        ],
      }

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResult,
        error: null,
      })

      const result = await googleCalendarApi.completeConnection('comp1', {
        code: 'auth-code',
        userId: 'user123',
      })

      expect(result.connection.id).toBe('conn1')
      expect(result.calendars).toHaveLength(1)
    })
  })

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { requiresReconnect: false },
        error: null,
      })

      await googleCalendarApi.refreshToken('conn1')

      expect(supabase.functions.invoke).toHaveBeenCalledWith('gcal-refresh-token', {
        body: { connectionId: 'conn1' },
      })
    })

    it('should throw error when reconnect required', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { requiresReconnect: true, error: 'Refresh token expired' },
        error: null,
      })

      await expect(
        googleCalendarApi.refreshToken('conn1')
      ).rejects.toThrow('Please reconnect to Google Calendar')
    })
  })

  describe('updateConnection', () => {
    it('should update connection settings', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'conn1', sync_enabled: false },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await googleCalendarApi.updateConnection('conn1', {
        sync_enabled: false,
      })

      expect(result.sync_enabled).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should disconnect Google Calendar', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await googleCalendarApi.disconnect('conn1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false, sync_enabled: false })
      )
    })
  })

  describe('syncMeeting', () => {
    it('should create Google Calendar event', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, googleEventId: 'gcal_event_123' },
        error: null,
      })

      const result = await googleCalendarApi.syncMeeting('conn1', {
        operation: 'create',
        meetingId: 'meet1',
        meetingData: {
          title: 'Project Meeting',
          startDateTime: '2024-12-19T10:00:00Z',
          endDateTime: '2024-12-19T11:00:00Z',
          attendees: ['user1@example.com'],
        },
      })

      expect(result.success).toBe(true)
      expect(result.googleEventId).toBe('gcal_event_123')
    })

    it('should handle sync errors gracefully', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(
        new Error('Calendar API error')
      )

      const result = await googleCalendarApi.syncMeeting('conn1', {
        operation: 'create',
        meetingId: 'meet1',
        meetingData: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('getMeetingMapping', () => {
    it('should get event mapping for meeting', async () => {
      const mockMapping = {
        id: 'map1',
        local_entity_id: 'meet1',
        google_event_id: 'gcal_123',
        sync_status: 'synced',
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockMapping, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await googleCalendarApi.getMeetingMapping('meet1')

      expect(result?.google_event_id).toBe('gcal_123')
    })
  })

  describe('getSyncStats', () => {
    it('should get sync statistics', async () => {
      const mockCounts = {
        syncedCount: 10,
        pendingCount: 2,
        failedCount: 1,
      }

      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      }

      const mockLogQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { created_at: '2024-12-19T10:00:00Z' },
          error: null
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockCountQuery as any)
        .mockReturnValueOnce(mockCountQuery as any)
        .mockReturnValueOnce(mockCountQuery as any)
        .mockReturnValueOnce(mockLogQuery as any)
        .mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) } as any)

      const result = await googleCalendarApi.getSyncStats('conn1')

      expect(result).toBeDefined()
    })
  })
})
