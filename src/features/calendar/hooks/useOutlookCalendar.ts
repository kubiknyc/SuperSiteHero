/**
 * Outlook Calendar Integration React Query Hooks
 *
 * Hooks for Microsoft Graph calendar integration with bidirectional sync support.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { outlookCalendarApi } from '@/lib/api/services/outlook-calendar'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  OutlookCalendarConnection,
  OutlookEventMapping,
  OutlookSyncLog,
  OutlookConnectionStatus,
  OutlookSyncStats,
  OutlookSyncDashboard,
  OutlookCalendar,
  CompleteOutlookOAuthDTO,
  UpdateOutlookConnectionDTO,
  SyncOutlookEventDTO,
  BulkOutlookSyncDTO,
  OutlookEntityType,
  OutlookSyncStatus,
} from '@/types/outlook-calendar'
import { logger } from '../../../lib/utils/logger';


// Query Keys
export const outlookCalendarKeys = {
  all: ['outlookCalendar'] as const,
  connection: () => [...outlookCalendarKeys.all, 'connection'] as const,
  connectionStatus: (userId: string) => [...outlookCalendarKeys.connection(), userId] as const,
  eventMappings: () => [...outlookCalendarKeys.all, 'eventMappings'] as const,
  eventMapping: (userId: string, entityType: string, entityId: string) =>
    [...outlookCalendarKeys.eventMappings(), userId, entityType, entityId] as const,
  eventMappingsList: (userId: string, options?: { entityType?: string; status?: string; projectId?: string }) =>
    [...outlookCalendarKeys.eventMappings(), userId, options] as const,
  syncLogs: () => [...outlookCalendarKeys.all, 'syncLogs'] as const,
  syncLogsList: (userId: string, options?: { entityType?: string; status?: string }) =>
    [...outlookCalendarKeys.syncLogs(), userId, options] as const,
  stats: (userId: string) => [...outlookCalendarKeys.all, 'stats', userId] as const,
  dashboard: (userId: string) => [...outlookCalendarKeys.all, 'dashboard', userId] as const,
}

// =============================================
// CONNECTION HOOKS
// =============================================

/**
 * Get Outlook Calendar connection status
 */
export function useOutlookConnectionStatus() {
  const { user, userProfile } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: outlookCalendarKeys.connectionStatus(userId!),
    queryFn: () => outlookCalendarApi.getConnectionStatus(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes to check token status
  })
}

/**
 * Get raw connection record
 */
export function useOutlookConnection() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: [...outlookCalendarKeys.connection(), 'raw', userId],
    queryFn: () => outlookCalendarApi.getConnection(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Initiate OAuth connection - get auth URL
 */
export function useInitiateOutlookConnection() {
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return outlookCalendarApi.getAuthUrl(userProfile.company_id)
    },
  })
}

/**
 * Complete OAuth flow
 */
export function useCompleteOutlookConnection() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (dto: CompleteOutlookOAuthDTO) => outlookCalendarApi.completeConnection(dto),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.connection() })
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.dashboard(user.id) })
      }
    },
  })
}

/**
 * Refresh token
 */
export function useRefreshOutlookToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) => outlookCalendarApi.refreshToken(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.connection() })
    },
  })
}

/**
 * Update connection settings
 */
export function useUpdateOutlookConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      connectionId,
      updates,
    }: {
      connectionId: string
      updates: UpdateOutlookConnectionDTO
    }) => outlookCalendarApi.updateConnection(connectionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.connection() })
    },
  })
}

/**
 * Disconnect from Outlook
 */
export function useDisconnectOutlook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) => outlookCalendarApi.disconnect(connectionId),
    onSuccess: () => {
      // Clear all Outlook-related queries
      queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.all })
    },
  })
}

// =============================================
// EVENT MAPPING HOOKS
// =============================================

/**
 * Get event mapping for a specific local entity
 */
export function useOutlookEventMapping(localEntityType: OutlookEntityType, localEntityId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: outlookCalendarKeys.eventMapping(userId!, localEntityType, localEntityId!),
    queryFn: () => outlookCalendarApi.getEventMapping(userId!, localEntityType, localEntityId!),
    enabled: !!userId && !!localEntityId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Get event mappings list
 */
export function useOutlookEventMappings(options?: {
  entityType?: OutlookEntityType
  status?: OutlookSyncStatus
  projectId?: string
  limit?: number
}) {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: outlookCalendarKeys.eventMappingsList(userId!, {
      entityType: options?.entityType,
      status: options?.status,
      projectId: options?.projectId,
    }),
    queryFn: () => outlookCalendarApi.getEventMappings(userId!, options),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

// =============================================
// SYNC OPERATION HOOKS
// =============================================

/**
 * Sync a single event
 */
export function useSyncOutlookEvent() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ connectionId, dto }: { connectionId: string; dto: SyncOutlookEventDTO }) =>
      outlookCalendarApi.syncEvent(connectionId, dto),
    onSuccess: (_, variables) => {
      if (user?.id) {
        // Invalidate event mapping
        queryClient.invalidateQueries({
          queryKey: outlookCalendarKeys.eventMapping(
            user.id,
            variables.dto.entityType,
            variables.dto.entityId
          ),
        })
        // Invalidate sync logs
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.syncLogs() })
        // Invalidate stats
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.stats(user.id) })
      }
    },
  })
}

/**
 * Bulk sync events
 */
export function useBulkOutlookSync() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ connectionId, dto }: { connectionId: string; dto: BulkOutlookSyncDTO }) =>
      outlookCalendarApi.bulkSync(connectionId, dto),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.eventMappings() })
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.syncLogs() })
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.stats(user.id) })
      }
    },
  })
}

/**
 * Delete event mapping
 */
export function useDeleteOutlookEventMapping() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      connectionId,
      entityType,
      entityId,
      deleteOutlookEvent = true,
    }: {
      connectionId: string
      entityType: OutlookEntityType
      entityId: string
      deleteOutlookEvent?: boolean
    }) => outlookCalendarApi.deleteEventMapping(connectionId, entityType, entityId, deleteOutlookEvent),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.eventMappings() })
        queryClient.invalidateQueries({ queryKey: outlookCalendarKeys.stats(user.id) })
      }
    },
  })
}

// =============================================
// SYNC LOGS HOOKS
// =============================================

/**
 * Get sync logs
 */
export function useOutlookSyncLogs(options?: {
  connectionId?: string
  entityType?: OutlookEntityType
  status?: OutlookSyncStatus
  limit?: number
}) {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: outlookCalendarKeys.syncLogsList(userId!, {
      entityType: options?.entityType,
      status: options?.status,
    }),
    queryFn: () => outlookCalendarApi.getSyncLogs(userId!, options),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// =============================================
// DASHBOARD & STATS HOOKS
// =============================================

/**
 * Get sync statistics
 */
export function useOutlookSyncStats() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: outlookCalendarKeys.stats(userId!),
    queryFn: () => outlookCalendarApi.getSyncStats(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Get full dashboard data
 */
export function useOutlookDashboard() {
  const { user, userProfile } = useAuth()
  const userId = user?.id
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: outlookCalendarKeys.dashboard(userId!),
    queryFn: () => outlookCalendarApi.getDashboard(userId!, companyId!),
    enabled: !!userId && !!companyId,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  })
}

// =============================================
// HELPER HOOKS
// =============================================

/**
 * Check if entity is synced to Outlook
 */
export function useIsEntitySyncedToOutlook(entityType: OutlookEntityType, entityId: string | undefined) {
  const { data: mapping, isLoading } = useOutlookEventMapping(entityType, entityId)

  return {
    isSynced: mapping?.sync_status === 'synced',
    syncStatus: mapping?.sync_status || null,
    outlookEventId: mapping?.outlook_event_id || null,
    lastSyncedAt: mapping?.last_synced_at || null,
    lastError: mapping?.last_sync_error || null,
    isLoading,
  }
}

/**
 * Quick sync button helper - determines if sync is available and provides action
 */
export function useQuickOutlookSync(entityType: OutlookEntityType, entityId: string | undefined) {
  const { data: connectionStatus } = useOutlookConnectionStatus()
  const { data: mapping, isLoading: isMappingLoading } = useOutlookEventMapping(entityType, entityId)
  const syncEventMutation = useSyncOutlookEvent()

  const canSync =
    connectionStatus?.isConnected &&
    !connectionStatus?.needsReauth &&
    !connectionStatus?.isTokenExpired &&
    !!entityId

  // Check if this entity type is enabled for sync
  const isEntityTypeEnabled =
    (entityType === 'meeting' && connectionStatus?.syncSettings.meetings) ||
    (entityType === 'inspection' && connectionStatus?.syncSettings.inspections) ||
    (entityType === 'task' && connectionStatus?.syncSettings.tasks) ||
    (entityType === 'milestone' && connectionStatus?.syncSettings.milestones) ||
    entityType === 'schedule_activity'

  const sync = async () => {
    if (!canSync || !connectionStatus?.connectionId) {return}

    return syncEventMutation.mutateAsync({
      connectionId: connectionStatus.connectionId,
      dto: {
        entityType,
        entityId: entityId!,
        direction: connectionStatus.syncDirection,
      },
    })
  }

  const unsync = async () => {
    if (!connectionStatus?.connectionId || !mapping) {return}

    return syncEventMutation.mutateAsync({
      connectionId: connectionStatus.connectionId,
      dto: {
        entityType,
        entityId: entityId!,
        action: 'delete',
      },
    })
  }

  return {
    canSync: canSync && isEntityTypeEnabled,
    isConnected: connectionStatus?.isConnected || false,
    isSynced: mapping?.sync_status === 'synced',
    syncStatus: mapping?.sync_status || null,
    isLoading: isMappingLoading || syncEventMutation.isPending,
    sync,
    unsync,
    error: syncEventMutation.error,
  }
}

/**
 * Hook to automatically sync entity when it changes
 */
export function useAutoOutlookSync(
  entityType: OutlookEntityType,
  entityId: string | undefined,
  enabled: boolean = true
) {
  const { data: connectionStatus } = useOutlookConnectionStatus()
  const { data: mapping } = useOutlookEventMapping(entityType, entityId)
  const syncEventMutation = useSyncOutlookEvent()

  const shouldAutoSync =
    enabled &&
    connectionStatus?.isConnected &&
    connectionStatus?.autoSyncEnabled &&
    mapping?.outlook_event_id && // Only auto-sync if already linked
    !connectionStatus?.isTokenExpired

  const triggerSync = async () => {
    if (!shouldAutoSync || !connectionStatus?.connectionId || !entityId) {return}

    try {
      await syncEventMutation.mutateAsync({
        connectionId: connectionStatus.connectionId,
        dto: {
          entityType,
          entityId,
          direction: connectionStatus.syncDirection,
          action: 'update',
        },
      })
    } catch (_error) {
      logger.error('Auto-sync failed:', _error)
    }
  }

  return {
    shouldAutoSync,
    triggerSync,
    isLoading: syncEventMutation.isPending,
  }
}
