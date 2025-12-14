/**
 * Look-Ahead Sync Hooks
 * React Query hooks for syncing progress from Daily Reports to Look-Ahead
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  lookAheadSyncApi,
  type ActivityProgressSummary,
  type SyncResult,
  type BatchSyncResult,
} from '@/lib/api/services/look-ahead-sync'

// Query keys
export const lookAheadSyncKeys = {
  all: ['look-ahead-sync'] as const,
  progressSummaries: (projectId: string, dateFrom?: string, dateTo?: string) =>
    [...lookAheadSyncKeys.all, 'summaries', projectId, dateFrom, dateTo] as const,
  syncStatus: (projectId: string) =>
    [...lookAheadSyncKeys.all, 'status', projectId] as const,
  linkedEntries: (projectId: string, dateFrom?: string, dateTo?: string) =>
    [...lookAheadSyncKeys.all, 'linked', projectId, dateFrom, dateTo] as const,
}

/**
 * Hook to get progress summaries for activities
 */
export function useProgressSummaries(
  projectId: string | undefined,
  dateFrom?: string,
  dateTo?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: lookAheadSyncKeys.progressSummaries(projectId || '', dateFrom, dateTo),
    queryFn: () => lookAheadSyncApi.calculateProgressSummaries(projectId!, dateFrom, dateTo),
    enabled: !!projectId && enabled,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to get sync status for a project
 */
export function useSyncStatus(projectId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: lookAheadSyncKeys.syncStatus(projectId || ''),
    queryFn: () => lookAheadSyncApi.getSyncStatus(projectId!),
    enabled: !!projectId && enabled,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to sync a single activity from progress
 */
export function useSyncActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      summary,
      userId,
    }: {
      activityId: string
      summary: ActivityProgressSummary
      userId?: string
    }) => lookAheadSyncApi.syncActivityFromProgress(activityId, summary, userId),
    onSuccess: (result: SyncResult) => {
      if (result.success) {
        const updateCount = Object.keys(result.updates_applied).length
        if (updateCount > 0) {
          toast.success(`Updated "${result.activity_name}" - ${updateCount} field(s) synced`)
        }
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: lookAheadSyncKeys.all })
        queryClient.invalidateQueries({ queryKey: ['look-ahead'] })
      } else {
        toast.error(`Failed to sync "${result.activity_name}": ${result.error}`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`)
    },
  })
}

/**
 * Hook to batch sync all activities from progress
 */
export function useBatchSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      dateFrom,
      dateTo,
      userId,
      onlyNeedsSync,
    }: {
      projectId: string
      dateFrom?: string
      dateTo?: string
      userId?: string
      onlyNeedsSync?: boolean
    }) =>
      lookAheadSyncApi.syncAllActivitiesFromProgress(
        projectId,
        dateFrom,
        dateTo,
        userId,
        onlyNeedsSync
      ),
    onSuccess: (result: BatchSyncResult) => {
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} activities from daily reports`)
      } else if (result.skipped > 0) {
        toast.info('All activities are already up to date')
      }
      if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} activities`)
      }
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: lookAheadSyncKeys.all })
      queryClient.invalidateQueries({ queryKey: ['look-ahead'] })
    },
    onError: (error: Error) => {
      toast.error(`Batch sync failed: ${error.message}`)
    },
  })
}

/**
 * Hook to link a progress entry to an activity
 */
export function useLinkProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      progressEntryId,
      activityId,
    }: {
      progressEntryId: string
      activityId: string
    }) => lookAheadSyncApi.linkProgressToActivity(progressEntryId, activityId),
    onSuccess: () => {
      toast.success('Progress entry linked to activity')
      queryClient.invalidateQueries({ queryKey: lookAheadSyncKeys.all })
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to link: ${error.message}`)
    },
  })
}

/**
 * Hook to unlink a progress entry from an activity
 */
export function useUnlinkProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (progressEntryId: string) =>
      lookAheadSyncApi.unlinkProgressFromActivity(progressEntryId),
    onSuccess: () => {
      toast.success('Progress entry unlinked from activity')
      queryClient.invalidateQueries({ queryKey: lookAheadSyncKeys.all })
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink: ${error.message}`)
    },
  })
}

/**
 * Hook to auto-link unlinked progress entries
 */
export function useAutoLinkProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      dateFrom,
      dateTo,
    }: {
      projectId: string
      dateFrom?: string
      dateTo?: string
    }) => lookAheadSyncApi.autoLinkProgressEntries(projectId, dateFrom, dateTo),
    onSuccess: (result) => {
      if (result.linked > 0) {
        toast.success(`Auto-linked ${result.linked} progress entries to activities`)
      } else {
        toast.info('No matching activities found for unlinked entries')
      }
      if (result.unmatched > 0) {
        toast.info(`${result.unmatched} entries could not be matched automatically`)
      }
      queryClient.invalidateQueries({ queryKey: lookAheadSyncKeys.all })
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] })
    },
    onError: (error: Error) => {
      toast.error(`Auto-link failed: ${error.message}`)
    },
  })
}
