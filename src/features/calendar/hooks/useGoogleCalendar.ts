/**
 * Google Calendar Integration React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleCalendarApi } from '@/lib/api/services/google-calendar';
import { useAuth } from '@/lib/auth/AuthContext';
import type {
  GoogleCalendarConnection,
  GoogleCalendarConnectionStatus,
  GoogleCalendar,
  CalendarEventMapping,
  CalendarSyncLog,
  CalendarSyncStats,
  CompleteGCalConnectionDTO,
  UpdateGCalConnectionDTO,
  SyncEventDTO,
} from '@/types/google-calendar';

// Query Keys
export const googleCalendarKeys = {
  all: ['googleCalendar'] as const,
  connection: () => [...googleCalendarKeys.all, 'connection'] as const,
  connectionStatus: (userId: string) => [...googleCalendarKeys.connection(), userId] as const,
  mappings: () => [...googleCalendarKeys.all, 'mappings'] as const,
  mappingsList: (connectionId: string, options?: object) =>
    [...googleCalendarKeys.mappings(), connectionId, options] as const,
  meetingMapping: (meetingId: string) =>
    [...googleCalendarKeys.mappings(), 'meeting', meetingId] as const,
  pendingSyncs: () => [...googleCalendarKeys.all, 'pendingSyncs'] as const,
  pendingSyncsList: (connectionId: string, options?: object) =>
    [...googleCalendarKeys.pendingSyncs(), connectionId, options] as const,
  syncLogs: () => [...googleCalendarKeys.all, 'syncLogs'] as const,
  syncLogsList: (connectionId: string, options?: object) =>
    [...googleCalendarKeys.syncLogs(), connectionId, options] as const,
  stats: (connectionId: string) => [...googleCalendarKeys.all, 'stats', connectionId] as const,
};

// =============================================
// CONNECTION HOOKS
// =============================================

/**
 * Get Google Calendar connection status for current user
 */
export function useGCalConnectionStatus() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: googleCalendarKeys.connectionStatus(userId!),
    queryFn: () => googleCalendarApi.getConnectionStatus(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes to check token status
  });
}

/**
 * Get raw connection record
 */
export function useGCalConnection() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [...googleCalendarKeys.connection(), 'raw', userId],
    queryFn: () => googleCalendarApi.getConnection(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Initiate OAuth connection - get auth URL
 */
export function useInitiateGCalConnection() {
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available');
      }
      return googleCalendarApi.getAuthUrl(userProfile.company_id);
    },
  });
}

/**
 * Complete OAuth flow
 */
export function useCompleteGCalConnection() {
  const queryClient = useQueryClient();
  const { userProfile, user } = useAuth();

  return useMutation({
    mutationFn: (dto: CompleteGCalConnectionDTO) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available');
      }
      return googleCalendarApi.completeConnection(userProfile.company_id, dto);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: googleCalendarKeys.connection() });
      }
    },
  });
}

/**
 * Refresh token
 */
export function useRefreshGCalToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => googleCalendarApi.refreshToken(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.connection() });
    },
  });
}

/**
 * Update connection settings
 */
export function useUpdateGCalConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      connectionId,
      updates,
    }: {
      connectionId: string;
      updates: UpdateGCalConnectionDTO;
    }) => googleCalendarApi.updateConnection(connectionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.connection() });
    },
  });
}

/**
 * Disconnect from Google Calendar
 */
export function useDisconnectGCal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => googleCalendarApi.disconnect(connectionId),
    onSuccess: () => {
      // Clear all GCal-related queries
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.all });
    },
  });
}

// =============================================
// EVENT SYNC HOOKS
// =============================================

/**
 * Sync a meeting to Google Calendar
 */
export function useSyncMeetingToGCal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      connectionId,
      dto,
    }: {
      connectionId: string;
      dto: SyncEventDTO;
    }) => googleCalendarApi.syncMeeting(connectionId, dto),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.mappings() });
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.syncLogs() });
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.stats(variables.connectionId) });

      // Invalidate the specific meeting mapping if we have the ID
      if (variables.dto.meetingId) {
        queryClient.invalidateQueries({
          queryKey: googleCalendarKeys.meetingMapping(variables.dto.meetingId),
        });
      }
    },
  });
}

/**
 * Create Google Calendar event for a meeting
 */
export function useCreateGCalEvent() {
  const queryClient = useQueryClient();
  const { data: connectionStatus } = useGCalConnectionStatus();

  return useMutation({
    mutationFn: async ({
      meetingId,
      meetingData,
      sendNotifications = true,
    }: {
      meetingId: string;
      meetingData: SyncEventDTO['meetingData'];
      sendNotifications?: boolean;
    }) => {
      if (!connectionStatus?.connectionId) {
        throw new Error('Google Calendar not connected');
      }
      return googleCalendarApi.createEventForMeeting(
        connectionStatus.connectionId,
        meetingId,
        meetingData,
        sendNotifications
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.mappings() });
    },
  });
}

/**
 * Update Google Calendar event for a meeting
 */
export function useUpdateGCalEvent() {
  const queryClient = useQueryClient();
  const { data: connectionStatus } = useGCalConnectionStatus();

  return useMutation({
    mutationFn: async ({
      meetingId,
      googleEventId,
      meetingData,
      sendNotifications = true,
    }: {
      meetingId: string;
      googleEventId: string;
      meetingData: SyncEventDTO['meetingData'];
      sendNotifications?: boolean;
    }) => {
      if (!connectionStatus?.connectionId) {
        throw new Error('Google Calendar not connected');
      }
      return googleCalendarApi.updateEventForMeeting(
        connectionStatus.connectionId,
        meetingId,
        googleEventId,
        meetingData,
        sendNotifications
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.mappings() });
    },
  });
}

/**
 * Delete Google Calendar event for a meeting
 */
export function useDeleteGCalEvent() {
  const queryClient = useQueryClient();
  const { data: connectionStatus } = useGCalConnectionStatus();

  return useMutation({
    mutationFn: async ({
      meetingId,
      googleEventId,
      sendNotifications = true,
    }: {
      meetingId: string;
      googleEventId: string;
      sendNotifications?: boolean;
    }) => {
      if (!connectionStatus?.connectionId) {
        throw new Error('Google Calendar not connected');
      }
      return googleCalendarApi.deleteEventForMeeting(
        connectionStatus.connectionId,
        meetingId,
        googleEventId,
        sendNotifications
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', variables.meetingId] });
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.mappings() });
    },
  });
}

// =============================================
// EVENT MAPPING HOOKS
// =============================================

/**
 * Get event mapping for a specific meeting
 */
export function useMeetingGCalMapping(meetingId: string | undefined) {
  return useQuery({
    queryKey: googleCalendarKeys.meetingMapping(meetingId!),
    queryFn: () => googleCalendarApi.getMeetingMapping(meetingId!),
    enabled: !!meetingId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get all event mappings for a connection
 */
export function useGCalEventMappings(
  connectionId: string | null | undefined,
  options?: {
    entityType?: string;
    status?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: googleCalendarKeys.mappingsList(connectionId!, options),
    queryFn: () => googleCalendarApi.getEventMappings(connectionId!, options),
    enabled: !!connectionId,
    staleTime: 1000 * 60,
  });
}

// =============================================
// SYNC QUEUE HOOKS
// =============================================

/**
 * Get pending sync items
 */
export function useGCalPendingSyncs(
  connectionId: string | null | undefined,
  options?: {
    status?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: googleCalendarKeys.pendingSyncsList(connectionId!, options),
    queryFn: () => googleCalendarApi.getPendingSyncs(connectionId!, options),
    enabled: !!connectionId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

/**
 * Cancel a pending sync
 */
export function useCancelGCalSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (syncId: string) => googleCalendarApi.cancelPendingSync(syncId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.pendingSyncs() });
    },
  });
}

// =============================================
// SYNC LOGS HOOKS
// =============================================

/**
 * Get sync logs
 */
export function useGCalSyncLogs(
  connectionId: string | null | undefined,
  options?: {
    status?: string;
    entityType?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: googleCalendarKeys.syncLogsList(connectionId!, options),
    queryFn: () => googleCalendarApi.getSyncLogs(connectionId!, options),
    enabled: !!connectionId,
    staleTime: 1000 * 60,
  });
}

// =============================================
// STATISTICS HOOKS
// =============================================

/**
 * Get sync statistics
 */
export function useGCalSyncStats(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: googleCalendarKeys.stats(connectionId!),
    queryFn: () => googleCalendarApi.getSyncStats(connectionId!),
    enabled: !!connectionId,
    staleTime: 1000 * 60,
  });
}

// =============================================
// HELPER HOOKS
// =============================================

/**
 * Check if a meeting is synced to Google Calendar
 */
export function useIsMeetingSynced(meetingId: string | undefined) {
  const { data: mapping, isLoading } = useMeetingGCalMapping(meetingId);

  return {
    isSynced: mapping?.sync_status === 'synced',
    syncStatus: mapping?.sync_status || null,
    googleEventId: mapping?.google_event_id || null,
    lastSyncedAt: mapping?.last_synced_at || null,
    lastError: mapping?.last_sync_error || null,
    isLoading,
  };
}

/**
 * Quick sync button helper - determines if sync is available and provides action
 */
export function useQuickGCalSync(meetingId: string | undefined) {
  const { data: connectionStatus } = useGCalConnectionStatus();
  const { data: mapping, isLoading: isMappingLoading } = useMeetingGCalMapping(meetingId);
  const syncMutation = useSyncMeetingToGCal();

  const canSync =
    connectionStatus?.isConnected &&
    connectionStatus?.syncEnabled &&
    !connectionStatus?.needsReconnect &&
    !connectionStatus?.isTokenExpired &&
    !!meetingId;

  const sync = async (meetingData: SyncEventDTO['meetingData']) => {
    if (!canSync || !connectionStatus?.connectionId) return false;

    try {
      await syncMutation.mutateAsync({
        connectionId: connectionStatus.connectionId,
        dto: {
          operation: mapping?.google_event_id ? 'update' : 'create',
          meetingId,
          googleEventId: mapping?.google_event_id || undefined,
          meetingData,
        },
      });
      return true;
    } catch (error) {
      console.error('Google Calendar sync failed:', error);
      return false;
    }
  };

  return {
    canSync,
    isSynced: mapping?.sync_status === 'synced',
    syncStatus: mapping?.sync_status || null,
    googleEventId: mapping?.google_event_id || null,
    isLoading: isMappingLoading || syncMutation.isPending,
    sync,
    error: syncMutation.error,
  };
}
