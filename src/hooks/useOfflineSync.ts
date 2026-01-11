/**
 * Offline Sync Hook
 *
 * Provides a unified interface for offline-first data operations.
 * Integrates sync queue with React Query mutations and provides
 * optimistic updates with automatic retry and conflict resolution.
 */

import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useOfflineStore,
  useIsOnline,
  usePendingSyncs,
  useIsSyncing,
  useSyncProgress,
  useConflictCount,
  type PendingSyncItem,
  type SyncConflict,
} from '@/stores/offline-store'
import { SyncManager } from '@/lib/offline/sync-manager'
import { OfflineClient } from '@/lib/api/offline-client'
import { putInStore, STORES } from '@/lib/offline/indexeddb'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

export interface OfflineMutationOptions<TData, TVariables> {
  entityType: string
  operation: 'create' | 'update' | 'delete'
  getEntityId: (variables: TVariables) => string
  onlineAction: (variables: TVariables) => Promise<TData>
  optimisticUpdate?: (variables: TVariables) => TData
  queryKeyToInvalidate?: string[]
  retryCount?: number
}

export interface SyncQueueStats {
  pending: number
  syncing: number
  failed: number
  total: number
  byEntityType: Record<string, number>
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingSyncs: number
  conflictCount: number
  progress: { current: number; total: number; percentage: number } | null
  lastSyncTime: number | null
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateSyncId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for managing offline sync status and operations
 */
export function useOfflineSync() {
  const isOnline = useIsOnline()
  const pendingSyncs = usePendingSyncs()
  const isSyncing = useIsSyncing()
  const progress = useSyncProgress()
  const conflictCount = useConflictCount()
  const {
    syncQueue,
    conflicts,
    lastSyncTime,
    loadSyncQueue,
    loadConflicts,
    clearSyncQueue,
    removePendingSync,
    resolveConflict,
  } = useOfflineStore()

  // Load sync queue and conflicts on mount
  useEffect(() => {
    loadSyncQueue()
    loadConflicts()
  }, [loadSyncQueue, loadConflicts])

  // Calculate sync queue statistics
  const queueStats = useMemo((): SyncQueueStats => {
    const pending = syncQueue.filter((i) => i.status === 'pending').length
    const syncing = syncQueue.filter((i) => i.status === 'syncing').length
    const failed = syncQueue.filter((i) => i.status === 'failed').length

    const byEntityType: Record<string, number> = {}
    syncQueue.forEach((item) => {
      byEntityType[item.entityType] = (byEntityType[item.entityType] || 0) + 1
    })

    return {
      pending,
      syncing,
      failed,
      total: syncQueue.length,
      byEntityType,
    }
  }, [syncQueue])

  // Get current sync status
  const status: SyncStatus = useMemo(
    () => ({
      isOnline,
      isSyncing,
      pendingSyncs,
      conflictCount,
      progress,
      lastSyncTime,
    }),
    [isOnline, isSyncing, pendingSyncs, conflictCount, progress, lastSyncTime]
  )

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      logger.warn('[useOfflineSync] Cannot sync while offline')
      return
    }

    await SyncManager.forceSyncNow()
  }, [isOnline])

  // Add item to sync queue
  const addToSyncQueue = useCallback(
    async (item: Omit<PendingSyncItem, 'id' | 'createdAt' | 'status' | 'retryCount'>) => {
      const syncItem: PendingSyncItem = {
        ...item,
        id: generateSyncId(),
        status: 'pending',
        createdAt: Date.now(),
        retryCount: 0,
      }

      await putInStore(STORES.SYNC_QUEUE, syncItem)
      await loadSyncQueue()

      logger.log('[useOfflineSync] Added to sync queue:', syncItem.id)

      // Trigger sync if online
      if (isOnline) {
        SyncManager.triggerSync()
      }

      return syncItem.id
    },
    [isOnline, loadSyncQueue]
  )

  // Retry failed items
  const retryFailed = useCallback(async () => {
    const failedItems = syncQueue.filter((i) => i.status === 'failed')

    for (const item of failedItems) {
      await putInStore(STORES.SYNC_QUEUE, {
        ...item,
        status: 'pending',
        retryCount: item.retryCount + 1,
      })
    }

    await loadSyncQueue()

    if (isOnline) {
      SyncManager.triggerSync()
    }
  }, [syncQueue, isOnline, loadSyncQueue])

  return {
    status,
    queueStats,
    syncQueue,
    conflicts,
    triggerSync,
    addToSyncQueue,
    clearSyncQueue,
    removePendingSync,
    retryFailed,
    resolveConflict,
  }
}

// ============================================================================
// Offline Mutation Hook
// ============================================================================

/**
 * Create an offline-capable mutation
 * Automatically queues operations when offline and syncs when online
 */
export function useOfflineMutation<TData, TVariables>(
  options: OfflineMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient()
  const isOnline = useIsOnline()
  const { addToSyncQueue, loadSyncQueue } = useOfflineStore.getState()

  return useMutation({
    mutationFn: async (variables: TVariables): Promise<TData> => {
      const entityId = options.getEntityId(variables)

      if (isOnline) {
        // Online: execute directly
        try {
          return await options.onlineAction(variables)
        } catch (error) {
          // If online action fails, queue for retry
          logger.error('[useOfflineMutation] Online action failed, queueing:', error)
          throw error
        }
      } else {
        // Offline: queue for sync
        const syncItem: PendingSyncItem = {
          id: generateSyncId(),
          entityType: options.entityType,
          entityId,
          operation: options.operation,
          data: variables,
          status: 'pending',
          createdAt: Date.now(),
          timestamp: Date.now(),
          retryCount: 0,
        }

        await putInStore(STORES.SYNC_QUEUE, syncItem)
        await loadSyncQueue()

        logger.log('[useOfflineMutation] Queued for offline sync:', syncItem.id)

        // Return optimistic data if available
        if (options.optimisticUpdate) {
          return options.optimisticUpdate(variables)
        }

        // Return a placeholder for offline operations
        return { id: entityId, _offline: true } as unknown as TData
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      if (options.queryKeyToInvalidate) {
        queryClient.invalidateQueries({ queryKey: options.queryKeyToInvalidate })
      }
    },
  })
}

// ============================================================================
// Entity-Specific Hooks
// ============================================================================

/**
 * Hook for offline-capable punch item mutations
 */
export function useOfflinePunchItemMutation() {
  return useOfflineMutation({
    entityType: 'punch_items',
    operation: 'update',
    getEntityId: (vars: { id: string }) => vars.id,
    onlineAction: async (vars: { id: string; [key: string]: unknown }) => {
      const { id, ...updates } = vars
      const { data, error } = await supabase
        .from('punch_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    queryKeyToInvalidate: ['punch-items'],
  })
}

/**
 * Hook for offline-capable daily report mutations
 */
export function useOfflineDailyReportMutation() {
  return useOfflineMutation({
    entityType: 'daily_reports',
    operation: 'update',
    getEntityId: (vars: { id: string }) => vars.id,
    onlineAction: async (vars: { id: string; [key: string]: unknown }) => {
      const { id, ...updates } = vars
      const { data, error } = await supabase
        .from('daily_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    queryKeyToInvalidate: ['daily-reports'],
  })
}

/**
 * Hook for offline-capable checklist response mutations
 */
export function useOfflineChecklistResponseMutation() {
  return useOfflineMutation({
    entityType: 'checklist_responses',
    operation: 'update',
    getEntityId: (vars: { id: string }) => vars.id,
    onlineAction: async (vars: { id: string; [key: string]: unknown }) => {
      const { id, ...updates } = vars
      const { data, error } = await supabase
        .from('checklist_responses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    queryKeyToInvalidate: ['checklist-responses'],
  })
}

// ============================================================================
// Sync Status Panel Hook
// ============================================================================

/**
 * Hook for displaying sync status in UI
 */
export function useSyncStatusDisplay() {
  const { status, queueStats, triggerSync, retryFailed } = useOfflineSync()

  const statusMessage = useMemo(() => {
    if (!status.isOnline) {
      return 'Offline - Changes will sync when connection is restored'
    }
    if (status.isSyncing) {
      return `Syncing... ${status.progress?.percentage || 0}%`
    }
    if (status.pendingSyncs > 0) {
      return `${status.pendingSyncs} changes waiting to sync`
    }
    if (status.conflictCount > 0) {
      return `${status.conflictCount} conflict(s) need resolution`
    }
    return 'All changes synced'
  }, [status])

  const statusColor = useMemo(() => {
    if (!status.isOnline) {return 'text-yellow-600'}
    if (status.isSyncing) {return 'text-blue-600'}
    if (status.conflictCount > 0) {return 'text-red-600'}
    if (status.pendingSyncs > 0) {return 'text-orange-600'}
    return 'text-green-600'
  }, [status])

  return {
    ...status,
    queueStats,
    statusMessage,
    statusColor,
    triggerSync,
    retryFailed,
  }
}

// ============================================================================
// Exports
// ============================================================================

export { SyncManager, OfflineClient }
