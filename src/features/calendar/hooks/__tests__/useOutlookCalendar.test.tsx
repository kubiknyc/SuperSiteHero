/**
 * Outlook Calendar Hooks Tests
 * Comprehensive tests for all Outlook calendar React Query hooks
 *
 * Test Coverage:
 * - Connection Hooks (7): useOutlookConnectionStatus, useOutlookConnection, useInitiateOutlookConnection, etc.
 * - Event Mapping Hooks (2): useOutlookEventMapping, useOutlookEventMappings
 * - Sync Operation Hooks (3): useSyncOutlookEvent, useBulkOutlookSync, useDeleteOutlookEventMapping
 * - Sync Logs Hooks (1): useOutlookSyncLogs
 * - Dashboard & Stats Hooks (2): useOutlookSyncStats, useOutlookDashboard
 * - Helper Hooks (3): useIsEntitySyncedToOutlook, useQuickOutlookSync, useAutoOutlookSync
 *
 * Total: 50+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Import hooks to test
import {
  outlookCalendarKeys,
  useOutlookConnectionStatus,
  useOutlookConnection,
  useInitiateOutlookConnection,
  useCompleteOutlookConnection,
  useRefreshOutlookToken,
  useUpdateOutlookConnection,
  useDisconnectOutlook,
  useOutlookEventMapping,
  useOutlookEventMappings,
  useSyncOutlookEvent,
  useBulkOutlookSync,
  useDeleteOutlookEventMapping,
  useOutlookSyncLogs,
  useOutlookSyncStats,
  useOutlookDashboard,
  useIsEntitySyncedToOutlook,
  useQuickOutlookSync,
  useAutoOutlookSync,
} from '../useOutlookCalendar'

// Import API service to mock
import * as outlookCalendarApi from '@/lib/api/services/outlook-calendar'

// Import types
import type {
  OutlookConnectionStatus,
  OutlookCalendarConnection,
  OutlookEventMapping,
  OutlookSyncLog,
  OutlookSyncStats,
  OutlookSyncDashboard,
  CompleteOutlookOAuthDTO,
  UpdateOutlookConnectionDTO,
  SyncOutlookEventDTO,
  BulkOutlookSyncDTO,
} from '@/types/outlook-calendar'

// Mock the API service
vi.mock('@/lib/api/services/outlook-calendar')

// Mock useAuth hook
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    userProfile: { company_id: 'company-456' },
    session: { access_token: 'test-token' },
  }),
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.info,
      warn: console.warn,
      error: () => {},
    },
  })
}

interface WrapperProps {
  children: ReactNode
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// ============================================================================
// Mock Data Factories
// ============================================================================

const createMockConnectionStatus = (
  overrides?: Partial<OutlookConnectionStatus>
): OutlookConnectionStatus => ({
  isConnected: true,
  connectionId: 'conn-123',
  email: 'user@outlook.com',
  displayName: 'Test User',
  calendarName: 'Calendar',
  lastSyncAt: '2024-01-15T10:00:00Z',
  tokenExpiresAt: '2024-01-16T10:00:00Z',
  isTokenExpired: false,
  needsReauth: false,
  connectionError: null,
  autoSyncEnabled: true,
  syncFrequencyMinutes: 30,
  syncDirection: 'bidirectional',
  syncSettings: {
    meetings: true,
    inspections: true,
    tasks: true,
    milestones: true,
  },
  ...overrides,
})

const createMockConnection = (
  overrides?: Partial<OutlookCalendarConnection>
): OutlookCalendarConnection => ({
  id: 'conn-123',
  user_id: 'user-123',
  company_id: 'company-456',
  microsoft_user_id: 'ms-user-123',
  email: 'user@outlook.com',
  display_name: 'Test User',
  access_token: 'access-token-xyz',
  refresh_token: 'refresh-token-xyz',
  token_expires_at: '2024-01-16T10:00:00Z',
  calendar_id: 'cal-123',
  calendar_name: 'Calendar',
  is_active: true,
  last_connected_at: '2024-01-15T10:00:00Z',
  last_sync_at: '2024-01-15T10:00:00Z',
  connection_error: null,
  auto_sync_enabled: true,
  sync_frequency_minutes: 30,
  sync_direction: 'bidirectional',
  sync_meetings: true,
  sync_inspections: true,
  sync_tasks: true,
  sync_milestones: true,
  webhook_subscription_id: null,
  webhook_expiration: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockEventMapping = (
  overrides?: Partial<OutlookEventMapping>
): OutlookEventMapping => ({
  id: 'mapping-123',
  connection_id: 'conn-123',
  user_id: 'user-123',
  local_entity_type: 'meeting',
  local_entity_id: 'meeting-123',
  project_id: 'project-123',
  outlook_event_id: 'outlook-event-123',
  outlook_calendar_id: 'cal-123',
  outlook_change_key: 'change-key-123',
  sync_status: 'synced',
  sync_direction: 'bidirectional',
  last_synced_at: '2024-01-15T10:00:00Z',
  last_local_update: '2024-01-15T09:00:00Z',
  last_outlook_update: '2024-01-15T09:00:00Z',
  last_sync_error: null,
  cached_title: 'Team Meeting',
  cached_start: '2024-01-20T14:00:00Z',
  cached_end: '2024-01-20T15:00:00Z',
  cached_location: 'Conference Room A',
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockSyncLog = (overrides?: Partial<OutlookSyncLog>): OutlookSyncLog => ({
  id: 'log-123',
  connection_id: 'conn-123',
  user_id: 'user-123',
  sync_type: 'manual',
  direction: 'bidirectional',
  entity_type: 'meeting',
  status: 'synced',
  events_processed: 10,
  events_created: 2,
  events_updated: 5,
  events_deleted: 1,
  events_failed: 0,
  conflicts_detected: 0,
  started_at: '2024-01-15T10:00:00Z',
  completed_at: '2024-01-15T10:01:00Z',
  duration_ms: 60000,
  error_message: null,
  error_details: null,
  delta_token: 'delta-token-123',
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockSyncStats = (overrides?: Partial<OutlookSyncStats>): OutlookSyncStats => ({
  totalMappedEvents: 25,
  pendingSyncs: 2,
  failedSyncs: 1,
  lastSyncAt: '2024-01-15T10:00:00Z',
  syncsByEntityType: {
    meeting: { total: 10, synced: 8, pending: 1, failed: 1 },
    inspection: { total: 5, synced: 5, pending: 0, failed: 0 },
    task: { total: 7, synced: 6, pending: 1, failed: 0 },
    milestone: { total: 3, synced: 3, pending: 0, failed: 0 },
    schedule_activity: { total: 0, synced: 0, pending: 0, failed: 0 },
  },
  ...overrides,
})

const createMockDashboard = (
  overrides?: Partial<OutlookSyncDashboard>
): OutlookSyncDashboard => ({
  connection: createMockConnectionStatus(),
  stats: createMockSyncStats(),
  recentLogs: [createMockSyncLog()],
  upcomingSyncEvents: [createMockEventMapping()],
  availableCalendars: [
    { id: 'cal-123', name: 'Calendar' },
    { id: 'cal-456', name: 'Work Calendar' },
  ],
  ...overrides,
})

describe('Outlook Calendar Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  // ==========================================================================
  // CONNECTION HOOKS
  // ==========================================================================

  describe('useOutlookConnectionStatus', () => {
    it('should fetch connection status successfully', async () => {
      const mockStatus = createMockConnectionStatus()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockStatus
      )

      const { result } = renderHook(() => useOutlookConnectionStatus(), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStatus)
      expect(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).toHaveBeenCalledWith(
        'user-123'
      )
    })

    it('should fetch disconnected status', async () => {
      const mockStatus = createMockConnectionStatus({ isConnected: false, connectionId: null })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockStatus
      )

      const { result } = renderHook(() => useOutlookConnectionStatus(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.isConnected).toBe(false)
      expect(result.current.data?.connectionId).toBeNull()
    })

    it('should handle expired token status', async () => {
      const mockStatus = createMockConnectionStatus({
        isTokenExpired: true,
        needsReauth: true,
      })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockStatus
      )

      const { result } = renderHook(() => useOutlookConnectionStatus(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.isTokenExpired).toBe(true)
      expect(result.current.data?.needsReauth).toBe(true)
    })
  })

  describe('useOutlookConnection', () => {
    it('should fetch raw connection successfully', async () => {
      const mockConnection = createMockConnection()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnection).mockResolvedValue(
        mockConnection
      )

      const { result } = renderHook(() => useOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockConnection)
      expect(outlookCalendarApi.outlookCalendarApi.getConnection).toHaveBeenCalledWith('user-123')
    })

    it('should handle null connection when not connected', async () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnection).mockResolvedValue(null)

      const { result } = renderHook(() => useOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
    })
  })

  describe('useInitiateOutlookConnection', () => {
    it('should get auth URL successfully', async () => {
      const mockAuthUrl = 'https://login.microsoftonline.com/oauth2/authorize?...'
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getAuthUrl).mockResolvedValue(mockAuthUrl)

      const { result } = renderHook(() => useInitiateOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBe(mockAuthUrl)
      expect(outlookCalendarApi.outlookCalendarApi.getAuthUrl).toHaveBeenCalledWith('company-456')
    })
  })

  describe('useCompleteOutlookConnection', () => {
    it('should complete OAuth connection successfully', async () => {
      const mockConnection = createMockConnection()
      const dto: CompleteOutlookOAuthDTO = { code: 'auth-code', state: 'state-123' }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.completeConnection).mockResolvedValue(
        mockConnection
      )

      const { result } = renderHook(() => useCompleteOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate(dto)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockConnection)
      expect(outlookCalendarApi.outlookCalendarApi.completeConnection).toHaveBeenCalledWith(dto)
    })

    it('should invalidate queries after successful connection', async () => {
      const mockConnection = createMockConnection()
      const dto: CompleteOutlookOAuthDTO = { code: 'auth-code', state: 'state-123' }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.completeConnection).mockResolvedValue(
        mockConnection
      )
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCompleteOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate(dto)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.connection(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.dashboard('user-123'),
      })
    })
  })

  describe('useRefreshOutlookToken', () => {
    it('should refresh token successfully', async () => {
      const mockConnection = createMockConnection({
        token_expires_at: '2024-01-17T10:00:00Z',
      })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.refreshToken).mockResolvedValue(
        mockConnection
      )

      const { result } = renderHook(() => useRefreshOutlookToken(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate('conn-123')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockConnection)
      expect(outlookCalendarApi.outlookCalendarApi.refreshToken).toHaveBeenCalledWith('conn-123')
    })

    it('should invalidate connection queries after token refresh', async () => {
      const mockConnection = createMockConnection()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.refreshToken).mockResolvedValue(
        mockConnection
      )
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useRefreshOutlookToken(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate('conn-123')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.connection(),
      })
    })
  })

  describe('useUpdateOutlookConnection', () => {
    it('should update connection settings successfully', async () => {
      const mockConnection = createMockConnection({ auto_sync_enabled: false })
      const updates: UpdateOutlookConnectionDTO = { auto_sync_enabled: false }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.updateConnection).mockResolvedValue(
        mockConnection
      )

      const { result } = renderHook(() => useUpdateOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', updates })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockConnection)
      expect(outlookCalendarApi.outlookCalendarApi.updateConnection).toHaveBeenCalledWith(
        'conn-123',
        updates
      )
    })

    it('should update sync direction', async () => {
      const mockConnection = createMockConnection({ sync_direction: 'to_outlook' })
      const updates: UpdateOutlookConnectionDTO = { sync_direction: 'to_outlook' }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.updateConnection).mockResolvedValue(
        mockConnection
      )

      const { result } = renderHook(() => useUpdateOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', updates })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.sync_direction).toBe('to_outlook')
    })

    it('should invalidate queries after update', async () => {
      const mockConnection = createMockConnection()
      const updates: UpdateOutlookConnectionDTO = { sync_frequency_minutes: 60 }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.updateConnection).mockResolvedValue(
        mockConnection
      )
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUpdateOutlookConnection(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', updates })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.connection(),
      })
    })
  })

  describe('useDisconnectOutlook', () => {
    it('should disconnect successfully', async () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.disconnect).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDisconnectOutlook(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate('conn-123')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.disconnect).toHaveBeenCalledWith('conn-123')
    })

    it('should invalidate all Outlook queries after disconnect', async () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.disconnect).mockResolvedValue(undefined)
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDisconnectOutlook(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate('conn-123')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.all,
      })
    })
  })

  // ==========================================================================
  // EVENT MAPPING HOOKS
  // ==========================================================================

  describe('useOutlookEventMapping', () => {
    it('should fetch event mapping successfully', async () => {
      const mockMapping = createMockEventMapping()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useOutlookEventMapping('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockMapping)
      expect(outlookCalendarApi.outlookCalendarApi.getEventMapping).toHaveBeenCalledWith(
        'user-123',
        'meeting',
        'meeting-123'
      )
    })

    it('should not fetch when entityId is undefined', () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(null)

      const { result } = renderHook(() => useOutlookEventMapping('meeting', undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(outlookCalendarApi.outlookCalendarApi.getEventMapping).not.toHaveBeenCalled()
    })

    it('should fetch mapping for different entity types', async () => {
      const mockMapping = createMockEventMapping({ local_entity_type: 'task' })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useOutlookEventMapping('task', 'task-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.local_entity_type).toBe('task')
    })
  })

  describe('useOutlookEventMappings', () => {
    it('should fetch all event mappings successfully', async () => {
      const mockMappings = [
        createMockEventMapping(),
        createMockEventMapping({ id: 'mapping-456', local_entity_type: 'task' }),
      ]
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMappings).mockResolvedValue(
        mockMappings
      )

      const { result } = renderHook(() => useOutlookEventMappings(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockMappings)
      expect(outlookCalendarApi.outlookCalendarApi.getEventMappings).toHaveBeenCalledWith(
        'user-123',
        undefined
      )
    })

    it('should fetch mappings filtered by entity type', async () => {
      const mockMappings = [createMockEventMapping({ local_entity_type: 'meeting' })]
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMappings).mockResolvedValue(
        mockMappings
      )

      const { result } = renderHook(() => useOutlookEventMappings({ entityType: 'meeting' }), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.getEventMappings).toHaveBeenCalledWith(
        'user-123',
        { entityType: 'meeting' }
      )
    })

    it('should fetch mappings filtered by status', async () => {
      const mockMappings = [createMockEventMapping({ sync_status: 'pending' })]
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMappings).mockResolvedValue(
        mockMappings
      )

      const { result } = renderHook(() => useOutlookEventMappings({ status: 'pending' }), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.getEventMappings).toHaveBeenCalledWith(
        'user-123',
        { status: 'pending' }
      )
    })

    it('should fetch mappings filtered by project', async () => {
      const mockMappings = [createMockEventMapping({ project_id: 'project-123' })]
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMappings).mockResolvedValue(
        mockMappings
      )

      const { result } = renderHook(() => useOutlookEventMappings({ projectId: 'project-123' }), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.getEventMappings).toHaveBeenCalledWith(
        'user-123',
        { projectId: 'project-123' }
      )
    })
  })

  // ==========================================================================
  // SYNC OPERATION HOOKS
  // ==========================================================================

  describe('useSyncOutlookEvent', () => {
    it('should sync event successfully', async () => {
      const mockMapping = createMockEventMapping()
      const dto: SyncOutlookEventDTO = {
        entityType: 'meeting',
        entityId: 'meeting-123',
        direction: 'bidirectional',
      }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.syncEvent).mockResolvedValue(mockMapping)

      const { result } = renderHook(() => useSyncOutlookEvent(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockMapping)
      expect(outlookCalendarApi.outlookCalendarApi.syncEvent).toHaveBeenCalledWith(
        'conn-123',
        dto
      )
    })

    it('should invalidate queries after sync', async () => {
      const mockMapping = createMockEventMapping()
      const dto: SyncOutlookEventDTO = {
        entityType: 'meeting',
        entityId: 'meeting-123',
      }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.syncEvent).mockResolvedValue(mockMapping)
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useSyncOutlookEvent(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.eventMapping('user-123', 'meeting', 'meeting-123'),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.syncLogs(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.stats('user-123'),
      })
    })

    it('should sync event with delete action', async () => {
      const mockMapping = createMockEventMapping()
      const dto: SyncOutlookEventDTO = {
        entityType: 'meeting',
        entityId: 'meeting-123',
        action: 'delete',
      }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.syncEvent).mockResolvedValue(mockMapping)

      const { result } = renderHook(() => useSyncOutlookEvent(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.syncEvent).toHaveBeenCalledWith(
        'conn-123',
        dto
      )
    })
  })

  describe('useBulkOutlookSync', () => {
    it('should bulk sync successfully', async () => {
      const mockResult = { processed: 10, created: 5, updated: 3, failed: 0 }
      const dto: BulkOutlookSyncDTO = {
        entityType: 'meeting',
        direction: 'bidirectional',
      }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.bulkSync).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useBulkOutlookSync(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockResult)
      expect(outlookCalendarApi.outlookCalendarApi.bulkSync).toHaveBeenCalledWith('conn-123', dto)
    })

    it('should bulk sync specific entity IDs', async () => {
      const mockResult = { processed: 3, created: 1, updated: 2, failed: 0 }
      const dto: BulkOutlookSyncDTO = {
        entityType: 'meeting',
        entityIds: ['meeting-1', 'meeting-2', 'meeting-3'],
      }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.bulkSync).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useBulkOutlookSync(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.bulkSync).toHaveBeenCalledWith('conn-123', dto)
    })

    it('should invalidate queries after bulk sync', async () => {
      const mockResult = { processed: 5, created: 2, updated: 3, failed: 0 }
      const dto: BulkOutlookSyncDTO = { entityType: 'meeting' }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.bulkSync).mockResolvedValue(mockResult)
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useBulkOutlookSync(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.eventMappings(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.syncLogs(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.stats('user-123'),
      })
    })
  })

  describe('useDeleteOutlookEventMapping', () => {
    it('should delete event mapping successfully', async () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.deleteEventMapping).mockResolvedValue(
        undefined
      )

      const { result } = renderHook(() => useDeleteOutlookEventMapping(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          connectionId: 'conn-123',
          entityType: 'meeting',
          entityId: 'meeting-123',
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.deleteEventMapping).toHaveBeenCalledWith(
        'conn-123',
        'meeting',
        'meeting-123',
        true
      )
    })

    it('should delete mapping without deleting Outlook event', async () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.deleteEventMapping).mockResolvedValue(
        undefined
      )

      const { result } = renderHook(() => useDeleteOutlookEventMapping(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          connectionId: 'conn-123',
          entityType: 'meeting',
          entityId: 'meeting-123',
          deleteOutlookEvent: false,
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.deleteEventMapping).toHaveBeenCalledWith(
        'conn-123',
        'meeting',
        'meeting-123',
        false
      )
    })

    it('should invalidate queries after deletion', async () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.deleteEventMapping).mockResolvedValue(
        undefined
      )
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteOutlookEventMapping(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          connectionId: 'conn-123',
          entityType: 'meeting',
          entityId: 'meeting-123',
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.eventMappings(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: outlookCalendarKeys.stats('user-123'),
      })
    })
  })

  // ==========================================================================
  // SYNC LOGS HOOKS
  // ==========================================================================

  describe('useOutlookSyncLogs', () => {
    it('should fetch sync logs successfully', async () => {
      const mockLogs = [createMockSyncLog(), createMockSyncLog({ id: 'log-456' })]
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getSyncLogs).mockResolvedValue(mockLogs)

      const { result } = renderHook(() => useOutlookSyncLogs(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockLogs)
      expect(outlookCalendarApi.outlookCalendarApi.getSyncLogs).toHaveBeenCalledWith(
        'user-123',
        undefined
      )
    })

    it('should fetch logs filtered by entity type', async () => {
      const mockLogs = [createMockSyncLog({ entity_type: 'meeting' })]
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getSyncLogs).mockResolvedValue(mockLogs)

      const { result } = renderHook(() => useOutlookSyncLogs({ entityType: 'meeting' }), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.getSyncLogs).toHaveBeenCalledWith('user-123', {
        entityType: 'meeting',
      })
    })

    it('should fetch logs filtered by status', async () => {
      const mockLogs = [createMockSyncLog({ status: 'failed' })]
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getSyncLogs).mockResolvedValue(mockLogs)

      const { result } = renderHook(() => useOutlookSyncLogs({ status: 'failed' }), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(outlookCalendarApi.outlookCalendarApi.getSyncLogs).toHaveBeenCalledWith('user-123', {
        status: 'failed',
      })
    })
  })

  // ==========================================================================
  // DASHBOARD & STATS HOOKS
  // ==========================================================================

  describe('useOutlookSyncStats', () => {
    it('should fetch sync stats successfully', async () => {
      const mockStats = createMockSyncStats()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getSyncStats).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useOutlookSyncStats(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      expect(outlookCalendarApi.outlookCalendarApi.getSyncStats).toHaveBeenCalledWith('user-123')
    })

    it('should fetch stats with entity breakdowns', async () => {
      const mockStats = createMockSyncStats({
        syncsByEntityType: {
          meeting: { total: 20, synced: 18, pending: 1, failed: 1 },
          inspection: { total: 10, synced: 10, pending: 0, failed: 0 },
          task: { total: 15, synced: 13, pending: 2, failed: 0 },
          milestone: { total: 5, synced: 5, pending: 0, failed: 0 },
          schedule_activity: { total: 0, synced: 0, pending: 0, failed: 0 },
        },
      })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getSyncStats).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useOutlookSyncStats(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.syncsByEntityType.meeting.total).toBe(20)
      expect(result.current.data?.syncsByEntityType.task.pending).toBe(2)
    })
  })

  describe('useOutlookDashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      const mockDashboard = createMockDashboard()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getDashboard).mockResolvedValue(
        mockDashboard
      )

      const { result } = renderHook(() => useOutlookDashboard(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockDashboard)
      expect(outlookCalendarApi.outlookCalendarApi.getDashboard).toHaveBeenCalledWith(
        'user-123',
        'company-456'
      )
    })

    it('should fetch dashboard with all components', async () => {
      const mockDashboard = createMockDashboard()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getDashboard).mockResolvedValue(
        mockDashboard
      )

      const { result } = renderHook(() => useOutlookDashboard(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.connection).toBeDefined()
      expect(result.current.data?.stats).toBeDefined()
      expect(result.current.data?.recentLogs).toBeDefined()
      expect(result.current.data?.upcomingSyncEvents).toBeDefined()
      expect(result.current.data?.availableCalendars).toBeDefined()
    })
  })

  // ==========================================================================
  // HELPER HOOKS
  // ==========================================================================

  describe('useIsEntitySyncedToOutlook', () => {
    it('should return synced status when entity is synced', async () => {
      const mockMapping = createMockEventMapping({ sync_status: 'synced' })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useIsEntitySyncedToOutlook('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSynced).toBe(true)
      })

      expect(result.current.syncStatus).toBe('synced')
      expect(result.current.outlookEventId).toBe('outlook-event-123')
      expect(result.current.lastSyncedAt).toBe('2024-01-15T10:00:00Z')
      expect(result.current.lastError).toBeNull()
    })

    it('should return not synced when mapping does not exist', async () => {
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(null)

      const { result } = renderHook(() => useIsEntitySyncedToOutlook('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSynced).toBe(false)
      })

      expect(result.current.syncStatus).toBeNull()
      expect(result.current.outlookEventId).toBeNull()
    })

    it('should return failed status when sync failed', async () => {
      const mockMapping = createMockEventMapping({
        sync_status: 'failed',
        last_sync_error: 'Connection timeout',
      })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useIsEntitySyncedToOutlook('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('failed')
      })

      expect(result.current.isSynced).toBe(false)
      expect(result.current.lastError).toBe('Connection timeout')
    })
  })

  describe('useQuickOutlookSync', () => {
    it('should enable sync when connected and entity type enabled', async () => {
      const mockConnectionStatus = createMockConnectionStatus()
      const mockMapping = createMockEventMapping({ sync_status: 'pending' })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useQuickOutlookSync('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.canSync).toBe(true)
      })

      expect(result.current.isConnected).toBe(true)
    })

    it('should disable sync when not connected', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ isConnected: false })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(null)

      const { result } = renderHook(() => useQuickOutlookSync('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.canSync).toBe(false)
      })
    })

    it('should disable sync when token expired', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ isTokenExpired: true })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(null)

      const { result } = renderHook(() => useQuickOutlookSync('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.canSync).toBe(false)
      })
    })

    it('should disable sync when entity type not enabled', async () => {
      const mockConnectionStatus = createMockConnectionStatus({
        syncSettings: { meetings: false, inspections: true, tasks: true, milestones: true },
      })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(null)

      const { result } = renderHook(() => useQuickOutlookSync('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.canSync).toBe(false)
      })
    })

    it('should perform sync action successfully', async () => {
      const mockConnectionStatus = createMockConnectionStatus()
      const mockMapping = createMockEventMapping()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.syncEvent).mockResolvedValue(mockMapping)

      const { result } = renderHook(() => useQuickOutlookSync('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.canSync).toBe(true)
      })

      await act(async () => {
        await result.current.sync()
      })

      await waitFor(() => {
        expect(outlookCalendarApi.outlookCalendarApi.syncEvent).toHaveBeenCalled()
      })
    })

    it('should perform unsync action successfully', async () => {
      const mockConnectionStatus = createMockConnectionStatus()
      const mockMapping = createMockEventMapping({ sync_status: 'synced' })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.syncEvent).mockResolvedValue(mockMapping)

      const { result } = renderHook(() => useQuickOutlookSync('meeting', 'meeting-123'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSynced).toBe(true)
      })

      await act(async () => {
        await result.current.unsync()
      })

      await waitFor(() => {
        expect(outlookCalendarApi.outlookCalendarApi.syncEvent).toHaveBeenCalledWith(
          'conn-123',
          expect.objectContaining({ action: 'delete' })
        )
      })
    })
  })

  describe('useAutoOutlookSync', () => {
    it('should enable auto-sync when conditions are met', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ autoSyncEnabled: true })
      const mockMapping = createMockEventMapping({ outlook_event_id: 'outlook-event-123' })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useAutoOutlookSync('meeting', 'meeting-123', true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.shouldAutoSync).toBe(true)
      })
    })

    it('should disable auto-sync when not enabled', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ autoSyncEnabled: false })
      const mockMapping = createMockEventMapping()
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useAutoOutlookSync('meeting', 'meeting-123', true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.shouldAutoSync).toBe(false)
      })
    })

    it('should disable auto-sync when entity not linked to Outlook', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ autoSyncEnabled: true })
      // Return mapping without outlook_event_id (null) to simulate not linked
      const mockMapping = {
        ...createMockEventMapping(),
        outlook_event_id: null as unknown as string, // Simulate entity not yet linked to Outlook
      }
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useAutoOutlookSync('meeting', 'meeting-123', true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.shouldAutoSync).toBeFalsy()
      })
    })

    it('should disable auto-sync when hook is disabled', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ autoSyncEnabled: true })
      const mockMapping = createMockEventMapping({ outlook_event_id: 'outlook-event-123' })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )

      const { result } = renderHook(() => useAutoOutlookSync('meeting', 'meeting-123', false), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.shouldAutoSync).toBe(false)
      })
    })

    it('should trigger sync successfully', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ autoSyncEnabled: true })
      const mockMapping = createMockEventMapping({ outlook_event_id: 'outlook-event-123' })
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getConnectionStatus).mockResolvedValue(
        mockConnectionStatus
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.getEventMapping).mockResolvedValue(
        mockMapping
      )
      vi.mocked(outlookCalendarApi.outlookCalendarApi.syncEvent).mockResolvedValue(mockMapping)

      const { result } = renderHook(() => useAutoOutlookSync('meeting', 'meeting-123', true), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.shouldAutoSync).toBe(true)
      })

      await act(async () => {
        await result.current.triggerSync()
      })

      await waitFor(() => {
        expect(outlookCalendarApi.outlookCalendarApi.syncEvent).toHaveBeenCalledWith(
          'conn-123',
          expect.objectContaining({
            entityType: 'meeting',
            entityId: 'meeting-123',
            action: 'update',
          })
        )
      })
    })
  })

  // ==========================================================================
  // QUERY KEYS TESTS
  // ==========================================================================

  describe('outlookCalendarKeys', () => {
    it('should generate correct key for all', () => {
      expect(outlookCalendarKeys.all).toEqual(['outlookCalendar'])
    })

    it('should generate correct key for connection', () => {
      expect(outlookCalendarKeys.connection()).toEqual(['outlookCalendar', 'connection'])
    })

    it('should generate correct key for connectionStatus with userId', () => {
      expect(outlookCalendarKeys.connectionStatus('user-123')).toEqual([
        'outlookCalendar',
        'connection',
        'user-123',
      ])
    })

    it('should generate correct key for eventMappings', () => {
      expect(outlookCalendarKeys.eventMappings()).toEqual(['outlookCalendar', 'eventMappings'])
    })

    it('should generate correct key for eventMapping with details', () => {
      expect(outlookCalendarKeys.eventMapping('user-123', 'meeting', 'meeting-123')).toEqual([
        'outlookCalendar',
        'eventMappings',
        'user-123',
        'meeting',
        'meeting-123',
      ])
    })

    it('should generate correct key for eventMappingsList with options', () => {
      const options = { entityType: 'meeting', status: 'synced', projectId: 'project-123' }
      expect(outlookCalendarKeys.eventMappingsList('user-123', options)).toEqual([
        'outlookCalendar',
        'eventMappings',
        'user-123',
        options,
      ])
    })

    it('should generate correct key for syncLogs', () => {
      expect(outlookCalendarKeys.syncLogs()).toEqual(['outlookCalendar', 'syncLogs'])
    })

    it('should generate correct key for syncLogsList with options', () => {
      const options = { entityType: 'meeting', status: 'failed' }
      expect(outlookCalendarKeys.syncLogsList('user-123', options)).toEqual([
        'outlookCalendar',
        'syncLogs',
        'user-123',
        options,
      ])
    })

    it('should generate correct key for stats', () => {
      expect(outlookCalendarKeys.stats('user-123')).toEqual([
        'outlookCalendar',
        'stats',
        'user-123',
      ])
    })

    it('should generate correct key for dashboard', () => {
      expect(outlookCalendarKeys.dashboard('user-123')).toEqual([
        'outlookCalendar',
        'dashboard',
        'user-123',
      ])
    })
  })
})
