/**
 * QuickBooks Integration React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quickbooksApi } from '@/lib/api/services/quickbooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  QBConnection,
  QBAccountMapping,
  QBEntityMapping,
  QBSyncLog,
  QBPendingSync,
  QBConnectionStatus,
  QBSyncStats,
  QBSyncDashboard,
  QBAccount,
  CompleteQBConnectionDTO,
  UpdateQBConnectionDTO,
  CreateQBAccountMappingDTO,
  SyncEntityDTO,
  BulkSyncDTO,
  QBEntityType,
  QBSyncStatus,
} from '@/types/quickbooks'

// Query Keys
export const quickbooksKeys = {
  all: ['quickbooks'] as const,
  connection: () => [...quickbooksKeys.all, 'connection'] as const,
  connectionStatus: (companyId: string) => [...quickbooksKeys.connection(), companyId] as const,
  accountMappings: () => [...quickbooksKeys.all, 'accountMappings'] as const,
  accountMappingsList: (companyId: string, connectionId?: string) =>
    [...quickbooksKeys.accountMappings(), companyId, connectionId] as const,
  entityMappings: () => [...quickbooksKeys.all, 'entityMappings'] as const,
  entityMapping: (companyId: string, entityType: string, entityId: string) =>
    [...quickbooksKeys.entityMappings(), companyId, entityType, entityId] as const,
  entityMappingsList: (companyId: string, options?: { entityType?: string; status?: string }) =>
    [...quickbooksKeys.entityMappings(), companyId, options] as const,
  qbAccounts: (connectionId: string) => [...quickbooksKeys.all, 'qbAccounts', connectionId] as const,
  syncLogs: () => [...quickbooksKeys.all, 'syncLogs'] as const,
  syncLogsList: (companyId: string, options?: { entityType?: string; status?: string }) =>
    [...quickbooksKeys.syncLogs(), companyId, options] as const,
  syncLog: (logId: string) => [...quickbooksKeys.syncLogs(), logId] as const,
  pendingSyncs: () => [...quickbooksKeys.all, 'pendingSyncs'] as const,
  pendingSyncsList: (companyId: string, options?: { status?: string; entityType?: string }) =>
    [...quickbooksKeys.pendingSyncs(), companyId, options] as const,
  stats: (companyId: string) => [...quickbooksKeys.all, 'stats', companyId] as const,
  dashboard: (companyId: string) => [...quickbooksKeys.all, 'dashboard', companyId] as const,
}

// =============================================
// CONNECTION HOOKS
// =============================================

/**
 * Get QuickBooks connection status
 */
export function useQBConnectionStatus() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.connectionStatus(companyId!),
    queryFn: () => quickbooksApi.getConnectionStatus(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes to check token status
  })
}

/**
 * Get raw connection record
 */
export function useQBConnection() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: [...quickbooksKeys.connection(), 'raw', companyId],
    queryFn: () => quickbooksApi.getConnection(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Initiate OAuth connection - get auth URL
 */
export function useInitiateQBConnection() {
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (isSandbox: boolean = false) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return quickbooksApi.getAuthUrl(userProfile.company_id, isSandbox)
    },
  })
}

/**
 * Complete OAuth flow
 */
export function useCompleteQBConnection() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (dto: CompleteQBConnectionDTO) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return quickbooksApi.completeConnection(userProfile.company_id, dto)
    },
    onSuccess: () => {
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.connection() })
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.dashboard(userProfile.company_id) })
      }
    },
  })
}

/**
 * Refresh token
 */
export function useRefreshQBToken() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (connectionId: string) => quickbooksApi.refreshToken(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.connection() })
    },
  })
}

/**
 * Update connection settings
 */
export function useUpdateQBConnection() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      connectionId,
      updates,
    }: {
      connectionId: string
      updates: UpdateQBConnectionDTO
    }) => quickbooksApi.updateConnection(connectionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.connection() })
    },
  })
}

/**
 * Disconnect from QuickBooks
 */
export function useDisconnectQB() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (connectionId: string) => quickbooksApi.disconnect(connectionId),
    onSuccess: () => {
      if (userProfile?.company_id) {
        // Clear all QB-related queries
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.all })
      }
    },
  })
}

// =============================================
// ACCOUNT MAPPING HOOKS
// =============================================

/**
 * Get account mappings
 */
export function useQBAccountMappings(connectionId?: string) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.accountMappingsList(companyId!, connectionId),
    queryFn: () => quickbooksApi.getAccountMappings(companyId!, connectionId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Create account mapping
 */
export function useCreateQBAccountMapping() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      connectionId,
      mapping,
    }: {
      connectionId: string
      mapping: CreateQBAccountMappingDTO
    }) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return quickbooksApi.createAccountMapping(userProfile.company_id, connectionId, mapping)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.accountMappings() })
    },
  })
}

/**
 * Update account mapping
 */
export function useUpdateQBAccountMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      mappingId,
      updates,
    }: {
      mappingId: string
      updates: Partial<CreateQBAccountMappingDTO>
    }) => quickbooksApi.updateAccountMapping(mappingId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.accountMappings() })
    },
  })
}

/**
 * Delete account mapping
 */
export function useDeleteQBAccountMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mappingId: string) => quickbooksApi.deleteAccountMapping(mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.accountMappings() })
    },
  })
}

/**
 * Set default mapping
 */
export function useSetDefaultQBMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mappingId, connectionId }: { mappingId: string; connectionId: string }) =>
      quickbooksApi.setDefaultMapping(mappingId, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.accountMappings() })
    },
  })
}

// =============================================
// ENTITY MAPPING HOOKS
// =============================================

/**
 * Get entity mapping for a specific local entity
 */
export function useQBEntityMapping(localEntityType: string, localEntityId: string | undefined) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.entityMapping(companyId!, localEntityType, localEntityId!),
    queryFn: () => quickbooksApi.getEntityMapping(companyId!, localEntityType, localEntityId!),
    enabled: !!companyId && !!localEntityId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Get entity mappings list
 */
export function useQBEntityMappings(options?: {
  entityType?: string
  status?: QBSyncStatus
  limit?: number
}) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.entityMappingsList(companyId!, {
      entityType: options?.entityType,
      status: options?.status,
    }),
    queryFn: () => quickbooksApi.getEntityMappings(companyId!, options),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
  })
}

// =============================================
// QB ACCOUNTS HOOKS
// =============================================

/**
 * Fetch QuickBooks accounts (Chart of Accounts)
 */
export function useQBAccounts(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: quickbooksKeys.qbAccounts(connectionId!),
    queryFn: () => quickbooksApi.getQBAccounts(connectionId!),
    enabled: !!connectionId,
    staleTime: 1000 * 60 * 10, // 10 minutes - accounts don't change often
  })
}

// =============================================
// SYNC OPERATION HOOKS
// =============================================

/**
 * Sync a single entity
 */
export function useSyncEntity() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({ connectionId, dto }: { connectionId: string; dto: SyncEntityDTO }) =>
      quickbooksApi.syncEntity(connectionId, dto),
    onSuccess: (_, variables) => {
      if (userProfile?.company_id) {
        // Invalidate entity mapping
        queryClient.invalidateQueries({
          queryKey: quickbooksKeys.entityMapping(
            userProfile.company_id,
            variables.dto.entity_type,
            variables.dto.entity_id
          ),
        })
        // Invalidate sync logs
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.syncLogs() })
        // Invalidate stats
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.stats(userProfile.company_id) })
      }
    },
  })
}

/**
 * Bulk sync entities
 */
export function useBulkSync() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({ connectionId, dto }: { connectionId: string; dto: BulkSyncDTO }) =>
      quickbooksApi.bulkSync(connectionId, dto),
    onSuccess: () => {
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.entityMappings() })
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.syncLogs() })
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.pendingSyncs() })
        queryClient.invalidateQueries({ queryKey: quickbooksKeys.stats(userProfile.company_id) })
      }
    },
  })
}

/**
 * Queue entity for sync
 */
export function useQueueForSync() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      connectionId,
      entityType,
      entityId,
      priority,
    }: {
      connectionId: string
      entityType: string
      entityId: string
      priority?: number
    }) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return quickbooksApi.queueForSync(
        userProfile.company_id,
        connectionId,
        entityType,
        entityId,
        priority
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.pendingSyncs() })
    },
  })
}

/**
 * Retry a failed sync
 */
export function useRetrySync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pendingSyncId: string) => quickbooksApi.retrySync(pendingSyncId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.pendingSyncs() })
    },
  })
}

/**
 * Cancel a pending sync
 */
export function useCancelPendingSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pendingSyncId: string) => quickbooksApi.cancelPendingSync(pendingSyncId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickbooksKeys.pendingSyncs() })
    },
  })
}

// =============================================
// SYNC LOGS HOOKS
// =============================================

/**
 * Get sync logs
 */
export function useQBSyncLogs(options?: {
  connectionId?: string
  entityType?: QBEntityType
  status?: QBSyncStatus
  limit?: number
}) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.syncLogsList(companyId!, {
      entityType: options?.entityType,
      status: options?.status,
    }),
    queryFn: () => quickbooksApi.getSyncLogs(companyId!, options),
    enabled: !!companyId,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Get single sync log with details
 */
export function useQBSyncLog(logId: string | undefined) {
  return useQuery({
    queryKey: quickbooksKeys.syncLog(logId!),
    queryFn: () => quickbooksApi.getSyncLog(logId!),
    enabled: !!logId,
    staleTime: 1000 * 60 * 5,
  })
}

// =============================================
// PENDING SYNCS HOOKS
// =============================================

/**
 * Get pending syncs
 */
export function useQBPendingSyncs(options?: {
  status?: QBSyncStatus
  entityType?: string
  limit?: number
}) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.pendingSyncsList(companyId!, {
      status: options?.status,
      entityType: options?.entityType,
    }),
    queryFn: () => quickbooksApi.getPendingSyncs(companyId!, options),
    enabled: !!companyId,
    staleTime: 1000 * 30, // 30 seconds - pending syncs change frequently
    refetchInterval: 1000 * 60, // Refresh every minute
  })
}

// =============================================
// DASHBOARD & STATS HOOKS
// =============================================

/**
 * Get sync statistics
 */
export function useQBSyncStats() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.stats(companyId!),
    queryFn: () => quickbooksApi.getSyncStats(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Get full dashboard data
 */
export function useQBDashboard() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: quickbooksKeys.dashboard(companyId!),
    queryFn: () => quickbooksApi.getDashboard(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  })
}

// =============================================
// HELPER HOOKS
// =============================================

/**
 * Check if entity is synced to QuickBooks
 */
export function useIsEntitySynced(entityType: string, entityId: string | undefined) {
  const { data: mapping, isLoading } = useQBEntityMapping(entityType, entityId)

  return {
    isSynced: mapping?.sync_status === 'synced',
    syncStatus: mapping?.sync_status || null,
    qbEntityId: mapping?.qb_entity_id || null,
    lastSyncedAt: mapping?.last_synced_at || null,
    lastError: mapping?.last_sync_error || null,
    isLoading,
  }
}

/**
 * Quick sync button helper - determines if sync is available and provides action
 */
export function useQuickSync(entityType: string, entityId: string | undefined) {
  const { data: connectionStatus } = useQBConnectionStatus()
  const { data: mapping, isLoading: isMappingLoading } = useQBEntityMapping(entityType, entityId)
  const syncEntityMutation = useSyncEntity()

  const canSync =
    connectionStatus?.isConnected &&
    !connectionStatus?.needsReauth &&
    !connectionStatus?.isTokenExpired &&
    !!entityId

  const sync = async () => {
    if (!canSync || !connectionStatus?.connectionId) return

    return syncEntityMutation.mutateAsync({
      connectionId: connectionStatus.connectionId,
      dto: {
        entity_type: entityType,
        entity_id: entityId!,
        direction: 'to_quickbooks',
      },
    })
  }

  return {
    canSync,
    isSynced: mapping?.sync_status === 'synced',
    syncStatus: mapping?.sync_status || null,
    isLoading: isMappingLoading || syncEntityMutation.isPending,
    sync,
    error: syncEntityMutation.error,
  }
}
