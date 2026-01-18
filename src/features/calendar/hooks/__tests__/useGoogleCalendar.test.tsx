/**
 * Google Calendar Integration Hooks Tests
 * Comprehensive tests for all Google Calendar React Query hooks
 *
 * Test Coverage:
 * - Query Keys
 * - Connection Hooks (7): useGCalConnectionStatus, useGCalConnection, etc.
 * - Event Sync Hooks (4): useSyncMeetingToGCal, useCreateGCalEvent, etc.
 * - Event Mapping Hooks (2): useMeetingGCalMapping, useGCalEventMappings
 * - Sync Queue Hooks (2): useGCalPendingSyncs, useCancelGCalSync
 * - Sync Logs Hook (1): useGCalSyncLogs
 * - Stats Hook (1): useGCalSyncStats
 * - Helper Hooks (2): useIsMeetingSynced, useQuickGCalSync
 *
 * Total: 45+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Import hooks to test
import {
  googleCalendarKeys,
  useGCalConnectionStatus,
  useGCalConnection,
  useInitiateGCalConnection,
  useCompleteGCalConnection,
  useRefreshGCalToken,
  useUpdateGCalConnection,
  useDisconnectGCal,
  useSyncMeetingToGCal,
  useCreateGCalEvent,
  useUpdateGCalEvent,
  useDeleteGCalEvent,
  useMeetingGCalMapping,
  useGCalEventMappings,
  useGCalPendingSyncs,
  useCancelGCalSync,
  useGCalSyncLogs,
  useGCalSyncStats,
  useIsMeetingSynced,
  useQuickGCalSync,
} from '../useGoogleCalendar';

// Import API service to mock
import { googleCalendarApi } from '@/lib/api/services/google-calendar';

// Mock the API service
vi.mock('@/lib/api/services/google-calendar');

// Mock useAuth hook
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    userProfile: { company_id: 'company-123', role: 'superintendent' },
  }),
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

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
  });
};

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

// Mock data factories
const createMockConnectionStatus = (overrides = {}) => ({
  isConnected: true,
  connectionId: 'conn-123',
  googleAccountEmail: 'test@gmail.com',
  googleAccountName: 'Test User',
  calendarId: 'primary',
  calendarName: 'Primary Calendar',
  syncEnabled: true,
  syncDirection: 'bidirectional' as const,
  lastSyncAt: '2024-01-15T10:00:00Z',
  isTokenExpired: false,
  needsReconnect: false,
  connectionError: null,
  ...overrides,
});

const createMockConnection = (overrides = {}) => ({
  id: 'conn-123',
  company_id: 'company-123',
  user_id: 'user-123',
  google_account_email: 'test@gmail.com',
  google_account_name: 'Test User',
  calendar_id: 'primary',
  calendar_name: 'Primary Calendar',
  sync_enabled: true,
  sync_direction: 'bidirectional' as const,
  is_active: true,
  token_expires_at: new Date(Date.now() + 3600000).toISOString(),
  last_sync_at: '2024-01-15T10:00:00Z',
  connection_error: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const createMockEventMapping = (overrides = {}) => ({
  id: 'mapping-123',
  connection_id: 'conn-123',
  local_entity_type: 'meeting',
  local_entity_id: 'meeting-123',
  google_event_id: 'event-123',
  sync_status: 'synced' as const,
  last_synced_at: '2024-01-15T10:00:00Z',
  last_sync_error: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const createMockSyncQueueItem = (overrides = {}) => ({
  id: 'queue-123',
  connection_id: 'conn-123',
  entity_type: 'meeting',
  entity_id: 'meeting-123',
  operation: 'create' as const,
  status: 'pending' as const,
  priority: 5,
  scheduled_for: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T09:00:00Z',
  ...overrides,
});

const createMockSyncLog = (overrides = {}) => ({
  id: 'log-123',
  connection_id: 'conn-123',
  entity_type: 'meeting',
  entity_id: 'meeting-123',
  operation: 'create' as const,
  direction: 'to_google' as const,
  status: 'success' as const,
  error_message: null,
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const createMockSyncStats = (overrides = {}) => ({
  totalSyncedMeetings: 10,
  pendingSyncs: 2,
  failedSyncs: 1,
  lastSyncAt: '2024-01-15T10:00:00Z',
  syncsByDirection: {
    to_google: 8,
    from_google: 2,
  },
  ...overrides,
});

describe('Google Calendar Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // Query Keys Tests
  // ==========================================================================

  describe('googleCalendarKeys', () => {
    it('should generate correct key for all', () => {
      expect(googleCalendarKeys.all).toEqual(['googleCalendar']);
    });

    it('should generate correct key for connection', () => {
      expect(googleCalendarKeys.connection()).toEqual(['googleCalendar', 'connection']);
    });

    it('should generate correct key for connectionStatus', () => {
      expect(googleCalendarKeys.connectionStatus('user-123')).toEqual([
        'googleCalendar',
        'connection',
        'user-123',
      ]);
    });

    it('should generate correct key for mappings', () => {
      expect(googleCalendarKeys.mappings()).toEqual(['googleCalendar', 'mappings']);
    });

    it('should generate correct key for mappingsList', () => {
      const options = { entityType: 'meeting', status: 'synced' };
      expect(googleCalendarKeys.mappingsList('conn-123', options)).toEqual([
        'googleCalendar',
        'mappings',
        'conn-123',
        options,
      ]);
    });

    it('should generate correct key for meetingMapping', () => {
      expect(googleCalendarKeys.meetingMapping('meeting-123')).toEqual([
        'googleCalendar',
        'mappings',
        'meeting',
        'meeting-123',
      ]);
    });

    it('should generate correct key for pendingSyncs', () => {
      expect(googleCalendarKeys.pendingSyncs()).toEqual(['googleCalendar', 'pendingSyncs']);
    });

    it('should generate correct key for pendingSyncsList', () => {
      const options = { status: 'pending', limit: 10 };
      expect(googleCalendarKeys.pendingSyncsList('conn-123', options)).toEqual([
        'googleCalendar',
        'pendingSyncs',
        'conn-123',
        options,
      ]);
    });

    it('should generate correct key for syncLogs', () => {
      expect(googleCalendarKeys.syncLogs()).toEqual(['googleCalendar', 'syncLogs']);
    });

    it('should generate correct key for syncLogsList', () => {
      const options = { status: 'success', limit: 20 };
      expect(googleCalendarKeys.syncLogsList('conn-123', options)).toEqual([
        'googleCalendar',
        'syncLogs',
        'conn-123',
        options,
      ]);
    });

    it('should generate correct key for stats', () => {
      expect(googleCalendarKeys.stats('conn-123')).toEqual([
        'googleCalendar',
        'stats',
        'conn-123',
      ]);
    });
  });

  // ==========================================================================
  // Connection Hooks Tests
  // ==========================================================================

  describe('useGCalConnectionStatus', () => {
    it('should fetch connection status successfully', async () => {
      const mockStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useGCalConnectionStatus(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStatus);
      expect(googleCalendarApi.getConnectionStatus).toHaveBeenCalledWith('user-123');
    });

    it('should return disconnected status when not connected', async () => {
      const mockStatus = createMockConnectionStatus({
        isConnected: false,
        connectionId: null,
        googleAccountEmail: null,
        syncEnabled: false,
      });
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useGCalConnectionStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.isConnected).toBe(false);
      expect(result.current.data?.connectionId).toBeNull();
    });

    it('should indicate when token is expired', async () => {
      const mockStatus = createMockConnectionStatus({
        isTokenExpired: true,
        needsReconnect: true,
      });
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useGCalConnectionStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.isTokenExpired).toBe(true);
      expect(result.current.data?.needsReconnect).toBe(true);
    });
  });

  describe('useGCalConnection', () => {
    it('should fetch raw connection successfully', async () => {
      const mockConnection = createMockConnection();
      vi.mocked(googleCalendarApi.getConnection).mockResolvedValue(mockConnection);

      const { result } = renderHook(() => useGCalConnection(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockConnection);
      expect(googleCalendarApi.getConnection).toHaveBeenCalledWith('user-123');
    });

    it('should return null when no connection exists', async () => {
      vi.mocked(googleCalendarApi.getConnection).mockResolvedValue(null);

      const { result } = renderHook(() => useGCalConnection(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useInitiateGCalConnection', () => {
    it('should get auth URL successfully', async () => {
      const authUrl = 'https://accounts.google.com/oauth/authorize?...';
      vi.mocked(googleCalendarApi.getAuthUrl).mockResolvedValue(authUrl);

      const { result } = renderHook(() => useInitiateGCalConnection(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(authUrl);
      expect(googleCalendarApi.getAuthUrl).toHaveBeenCalledWith('company-123');
    });
  });

  describe('useCompleteGCalConnection', () => {
    it('should complete OAuth connection successfully', async () => {
      const mockConnection = createMockConnection();
      const mockCalendars = [
        { id: 'primary', name: 'Primary Calendar', isPrimary: true },
        { id: 'work', name: 'Work Calendar', isPrimary: false },
      ];
      const mockResponse = { connection: mockConnection, calendars: mockCalendars };
      vi.mocked(googleCalendarApi.completeConnection).mockResolvedValue(mockResponse);

      const dto = {
        code: 'auth-code-123',
        state: 'state-456',
        calendarId: 'primary',
      };

      const { result } = renderHook(() => useCompleteGCalConnection(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(dto);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(googleCalendarApi.completeConnection).toHaveBeenCalledWith('company-123', dto);
    });

    it('should invalidate connection queries after success', async () => {
      const mockConnection = createMockConnection();
      vi.mocked(googleCalendarApi.completeConnection).mockResolvedValue({
        connection: mockConnection,
        calendars: [],
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCompleteGCalConnection(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          code: 'auth-code-123',
          state: 'state-456',
          calendarId: 'primary',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.connection() });
    });
  });

  describe('useRefreshGCalToken', () => {
    it('should refresh token successfully', async () => {
      vi.mocked(googleCalendarApi.refreshToken).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRefreshGCalToken(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('conn-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(googleCalendarApi.refreshToken).toHaveBeenCalledWith('conn-123');
    });

    it('should invalidate connection queries after refresh', async () => {
      vi.mocked(googleCalendarApi.refreshToken).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRefreshGCalToken(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('conn-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.connection() });
    });
  });

  describe('useUpdateGCalConnection', () => {
    it('should update connection settings successfully', async () => {
      const updatedConnection = createMockConnection({ sync_enabled: false });
      vi.mocked(googleCalendarApi.updateConnection).mockResolvedValue(updatedConnection);

      const updates = { sync_enabled: false };

      const { result } = renderHook(() => useUpdateGCalConnection(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', updates });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedConnection);
      expect(googleCalendarApi.updateConnection).toHaveBeenCalledWith('conn-123', updates);
    });

    it('should invalidate connection queries after update', async () => {
      const updatedConnection = createMockConnection();
      vi.mocked(googleCalendarApi.updateConnection).mockResolvedValue(updatedConnection);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateGCalConnection(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', updates: { sync_enabled: false } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.connection() });
    });
  });

  describe('useDisconnectGCal', () => {
    it('should disconnect from Google Calendar successfully', async () => {
      vi.mocked(googleCalendarApi.disconnect).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDisconnectGCal(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('conn-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(googleCalendarApi.disconnect).toHaveBeenCalledWith('conn-123');
    });

    it('should invalidate all Google Calendar queries after disconnect', async () => {
      vi.mocked(googleCalendarApi.disconnect).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDisconnectGCal(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('conn-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.all });
    });
  });

  // ==========================================================================
  // Event Sync Hooks Tests
  // ==========================================================================

  describe('useSyncMeetingToGCal', () => {
    it('should sync meeting successfully', async () => {
      const mockResult = { success: true, googleEventId: 'event-123' };
      vi.mocked(googleCalendarApi.syncMeeting).mockResolvedValue(mockResult);

      const dto = {
        operation: 'create' as const,
        meetingId: 'meeting-123',
        meetingData: {
          title: 'Team Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        },
      };

      const { result } = renderHook(() => useSyncMeetingToGCal(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResult);
      expect(googleCalendarApi.syncMeeting).toHaveBeenCalledWith('conn-123', dto);
    });

    it('should invalidate relevant queries after sync', async () => {
      const mockResult = { success: true, googleEventId: 'event-123' };
      vi.mocked(googleCalendarApi.syncMeeting).mockResolvedValue(mockResult);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const dto = {
        operation: 'create' as const,
        meetingId: 'meeting-123',
        meetingData: {
          title: 'Team Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        },
      };

      const { result } = renderHook(() => useSyncMeetingToGCal(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ connectionId: 'conn-123', dto });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.mappings() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.syncLogs() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.stats('conn-123') });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: googleCalendarKeys.meetingMapping('meeting-123'),
      });
    });
  });

  describe('useCreateGCalEvent', () => {
    it('should create Google Calendar event successfully', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.createEventForMeeting).mockResolvedValue('event-123');

      // Pre-populate the connection status query cache
      await queryClient.prefetchQuery({
        queryKey: googleCalendarKeys.connectionStatus('user-123'),
        queryFn: () => googleCalendarApi.getConnectionStatus('user-123'),
      });

      const { result } = renderHook(() => useCreateGCalEvent(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meetingId: 'meeting-123',
          meetingData: {
            title: 'Team Meeting',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe('event-123');
    });

    it('should invalidate meeting queries after creation', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.createEventForMeeting).mockResolvedValue('event-123');

      // Pre-populate the connection status query cache
      await queryClient.prefetchQuery({
        queryKey: googleCalendarKeys.connectionStatus('user-123'),
        queryFn: () => googleCalendarApi.getConnectionStatus('user-123'),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateGCalEvent(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meetingId: 'meeting-123',
          meetingData: {
            title: 'Team Meeting',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meetings', 'detail', 'meeting-123'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.mappings() });
    });
  });

  describe('useUpdateGCalEvent', () => {
    it('should update Google Calendar event successfully', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.updateEventForMeeting).mockResolvedValue(true);

      // Pre-populate the connection status query cache
      await queryClient.prefetchQuery({
        queryKey: googleCalendarKeys.connectionStatus('user-123'),
        queryFn: () => googleCalendarApi.getConnectionStatus('user-123'),
      });

      const { result } = renderHook(() => useUpdateGCalEvent(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meetingId: 'meeting-123',
          googleEventId: 'event-123',
          meetingData: {
            title: 'Updated Team Meeting',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
    });

    it('should invalidate meeting queries after update', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.updateEventForMeeting).mockResolvedValue(true);

      // Pre-populate the connection status query cache
      await queryClient.prefetchQuery({
        queryKey: googleCalendarKeys.connectionStatus('user-123'),
        queryFn: () => googleCalendarApi.getConnectionStatus('user-123'),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateGCalEvent(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meetingId: 'meeting-123',
          googleEventId: 'event-123',
          meetingData: {
            title: 'Updated Meeting',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meetings', 'detail', 'meeting-123'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.mappings() });
    });
  });

  describe('useDeleteGCalEvent', () => {
    it('should delete Google Calendar event successfully', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.deleteEventForMeeting).mockResolvedValue(true);

      // Pre-populate the connection status query cache
      await queryClient.prefetchQuery({
        queryKey: googleCalendarKeys.connectionStatus('user-123'),
        queryFn: () => googleCalendarApi.getConnectionStatus('user-123'),
      });

      const { result } = renderHook(() => useDeleteGCalEvent(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meetingId: 'meeting-123',
          googleEventId: 'event-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
    });

    it('should invalidate meeting queries after deletion', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.deleteEventForMeeting).mockResolvedValue(true);

      // Pre-populate the connection status query cache
      await queryClient.prefetchQuery({
        queryKey: googleCalendarKeys.connectionStatus('user-123'),
        queryFn: () => googleCalendarApi.getConnectionStatus('user-123'),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteGCalEvent(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meetingId: 'meeting-123',
          googleEventId: 'event-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meetings', 'detail', 'meeting-123'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.mappings() });
    });
  });

  // ==========================================================================
  // Event Mapping Hooks Tests
  // ==========================================================================

  describe('useMeetingGCalMapping', () => {
    it('should fetch meeting mapping successfully', async () => {
      const mockMapping = createMockEventMapping();
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(mockMapping);

      const { result } = renderHook(() => useMeetingGCalMapping('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMapping);
      expect(googleCalendarApi.getMeetingMapping).toHaveBeenCalledWith('meeting-123');
    });

    it('should not fetch when meetingId is undefined', () => {
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);

      const { result } = renderHook(() => useMeetingGCalMapping(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(googleCalendarApi.getMeetingMapping).not.toHaveBeenCalled();
    });

    it('should return null when no mapping exists', async () => {
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);

      const { result } = renderHook(() => useMeetingGCalMapping('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useGCalEventMappings', () => {
    it('should fetch event mappings successfully', async () => {
      const mockMappings = [createMockEventMapping(), createMockEventMapping({ id: 'mapping-456' })];
      vi.mocked(googleCalendarApi.getEventMappings).mockResolvedValue(mockMappings);

      const { result } = renderHook(() => useGCalEventMappings('conn-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMappings);
      expect(googleCalendarApi.getEventMappings).toHaveBeenCalledWith('conn-123', undefined);
    });

    it('should fetch with filter options', async () => {
      const mockMappings = [createMockEventMapping()];
      const options = { entityType: 'meeting', status: 'synced' };
      vi.mocked(googleCalendarApi.getEventMappings).mockResolvedValue(mockMappings);

      const { result } = renderHook(() => useGCalEventMappings('conn-123', options), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(googleCalendarApi.getEventMappings).toHaveBeenCalledWith('conn-123', options);
    });

    it('should not fetch when connectionId is undefined', () => {
      vi.mocked(googleCalendarApi.getEventMappings).mockResolvedValue([]);

      const { result } = renderHook(() => useGCalEventMappings(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(googleCalendarApi.getEventMappings).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Sync Queue Hooks Tests
  // ==========================================================================

  describe('useGCalPendingSyncs', () => {
    it('should fetch pending syncs successfully', async () => {
      const mockSyncs = [createMockSyncQueueItem(), createMockSyncQueueItem({ id: 'queue-456' })];
      vi.mocked(googleCalendarApi.getPendingSyncs).mockResolvedValue(mockSyncs);

      const { result } = renderHook(() => useGCalPendingSyncs('conn-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSyncs);
      expect(googleCalendarApi.getPendingSyncs).toHaveBeenCalledWith('conn-123', undefined);
    });

    it('should fetch with filter options', async () => {
      const mockSyncs = [createMockSyncQueueItem()];
      const options = { status: 'pending', limit: 10 };
      vi.mocked(googleCalendarApi.getPendingSyncs).mockResolvedValue(mockSyncs);

      const { result } = renderHook(() => useGCalPendingSyncs('conn-123', options), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(googleCalendarApi.getPendingSyncs).toHaveBeenCalledWith('conn-123', options);
    });

    it('should not fetch when connectionId is undefined', () => {
      vi.mocked(googleCalendarApi.getPendingSyncs).mockResolvedValue([]);

      const { result } = renderHook(() => useGCalPendingSyncs(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(googleCalendarApi.getPendingSyncs).not.toHaveBeenCalled();
    });
  });

  describe('useCancelGCalSync', () => {
    it('should cancel pending sync successfully', async () => {
      vi.mocked(googleCalendarApi.cancelPendingSync).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCancelGCalSync(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('queue-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(googleCalendarApi.cancelPendingSync).toHaveBeenCalledWith('queue-123');
    });

    it('should invalidate pending syncs queries after cancellation', async () => {
      vi.mocked(googleCalendarApi.cancelPendingSync).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCancelGCalSync(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('queue-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: googleCalendarKeys.pendingSyncs() });
    });
  });

  // ==========================================================================
  // Sync Logs Hook Tests
  // ==========================================================================

  describe('useGCalSyncLogs', () => {
    it('should fetch sync logs successfully', async () => {
      const mockLogs = [createMockSyncLog(), createMockSyncLog({ id: 'log-456' })];
      vi.mocked(googleCalendarApi.getSyncLogs).mockResolvedValue(mockLogs);

      const { result } = renderHook(() => useGCalSyncLogs('conn-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLogs);
      expect(googleCalendarApi.getSyncLogs).toHaveBeenCalledWith('conn-123', undefined);
    });

    it('should fetch with filter options', async () => {
      const mockLogs = [createMockSyncLog()];
      const options = { status: 'success', entityType: 'meeting', limit: 20 };
      vi.mocked(googleCalendarApi.getSyncLogs).mockResolvedValue(mockLogs);

      const { result } = renderHook(() => useGCalSyncLogs('conn-123', options), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(googleCalendarApi.getSyncLogs).toHaveBeenCalledWith('conn-123', options);
    });

    it('should not fetch when connectionId is undefined', () => {
      vi.mocked(googleCalendarApi.getSyncLogs).mockResolvedValue([]);

      const { result } = renderHook(() => useGCalSyncLogs(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(googleCalendarApi.getSyncLogs).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Stats Hook Tests
  // ==========================================================================

  describe('useGCalSyncStats', () => {
    it('should fetch sync stats successfully', async () => {
      const mockStats = createMockSyncStats();
      vi.mocked(googleCalendarApi.getSyncStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useGCalSyncStats('conn-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(googleCalendarApi.getSyncStats).toHaveBeenCalledWith('conn-123');
    });

    it('should not fetch when connectionId is undefined', () => {
      vi.mocked(googleCalendarApi.getSyncStats).mockResolvedValue(createMockSyncStats());

      const { result } = renderHook(() => useGCalSyncStats(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(googleCalendarApi.getSyncStats).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Helper Hooks Tests
  // ==========================================================================

  describe('useIsMeetingSynced', () => {
    it('should return synced status for synced meeting', async () => {
      const mockMapping = createMockEventMapping({ sync_status: 'synced' });
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(mockMapping);

      const { result } = renderHook(() => useIsMeetingSynced('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSynced).toBe(true);
      expect(result.current.syncStatus).toBe('synced');
      expect(result.current.googleEventId).toBe('event-123');
      expect(result.current.lastSyncedAt).toBe('2024-01-15T10:00:00Z');
      expect(result.current.lastError).toBeNull();
    });

    it('should return not synced for meeting without mapping', async () => {
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);

      const { result } = renderHook(() => useIsMeetingSynced('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSynced).toBe(false);
      expect(result.current.syncStatus).toBeNull();
      expect(result.current.googleEventId).toBeNull();
    });

    it('should return failed sync status', async () => {
      const mockMapping = createMockEventMapping({
        sync_status: 'failed',
        last_sync_error: 'Calendar not found',
      });
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(mockMapping);

      const { result } = renderHook(() => useIsMeetingSynced('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSynced).toBe(false);
      expect(result.current.syncStatus).toBe('failed');
      expect(result.current.lastError).toBe('Calendar not found');
    });
  });

  describe('useQuickGCalSync', () => {
    it('should determine sync availability when connected', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);

      const { result } = renderHook(() => useQuickGCalSync('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canSync).toBe(true);
      expect(result.current.isSynced).toBe(false);
    });

    it('should indicate when sync is not available due to disconnected state', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ isConnected: false });
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);

      const { result } = renderHook(() => useQuickGCalSync('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canSync).toBe(false);
    });

    it('should indicate when sync is not available due to expired token', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ isTokenExpired: true });
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);

      const { result } = renderHook(() => useQuickGCalSync('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canSync).toBe(false);
    });

    it('should perform create operation for unsynced meeting', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);
      vi.mocked(googleCalendarApi.syncMeeting).mockResolvedValue({ success: true, googleEventId: 'event-123' });

      const { result } = renderHook(() => useQuickGCalSync('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.canSync).toBe(true);
      });

      let syncResult: boolean | undefined;
      await act(async () => {
        syncResult = await result.current.sync({
          title: 'Team Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      expect(syncResult).toBe(true);
      expect(googleCalendarApi.syncMeeting).toHaveBeenCalledWith('conn-123', {
        operation: 'create',
        meetingId: 'meeting-123',
        googleEventId: undefined,
        meetingData: {
          title: 'Team Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        },
      });
    });

    it('should perform update operation for synced meeting', async () => {
      const mockConnectionStatus = createMockConnectionStatus();
      const mockMapping = createMockEventMapping({ google_event_id: 'event-123' });
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(mockMapping);
      vi.mocked(googleCalendarApi.syncMeeting).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useQuickGCalSync('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.canSync).toBe(true);
      });

      let syncResult: boolean | undefined;
      await act(async () => {
        syncResult = await result.current.sync({
          title: 'Updated Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      expect(syncResult).toBe(true);
      expect(googleCalendarApi.syncMeeting).toHaveBeenCalledWith('conn-123', {
        operation: 'update',
        meetingId: 'meeting-123',
        googleEventId: 'event-123',
        meetingData: {
          title: 'Updated Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        },
      });
    });

    it('should return false when sync is not available', async () => {
      const mockConnectionStatus = createMockConnectionStatus({ isConnected: false });
      vi.mocked(googleCalendarApi.getConnectionStatus).mockResolvedValue(mockConnectionStatus);
      vi.mocked(googleCalendarApi.getMeetingMapping).mockResolvedValue(null);

      const { result } = renderHook(() => useQuickGCalSync('meeting-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.canSync).toBe(false);
      });

      let syncResult: boolean | undefined;
      await act(async () => {
        syncResult = await result.current.sync({
          title: 'Meeting',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      expect(syncResult).toBe(false);
      expect(googleCalendarApi.syncMeeting).not.toHaveBeenCalled();
    });
  });
});
