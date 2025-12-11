// File: /src/features/punch-lists/hooks/usePunchItemSync.ts
// Hook for syncing offline punch items when back online

import { useEffect, useCallback } from 'react'
import { useIsOnline } from '@/stores/offline-store'
import { useOfflinePunchStore, type DraftPunchItem } from '../store/offlinePunchStore'
import { supabase } from '@/lib/supabase'
import { uploadPunchItemPhoto } from '@/lib/storage/punch-item-uploads'
import { toast } from '@/lib/notifications/ToastContext'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/utils/logger'

const MAX_SYNC_RETRIES = 3

/**
 * Sync a single draft punch item to the server
 */
async function syncDraftToServer(draft: DraftPunchItem): Promise<{ success: boolean; serverId?: string; error?: string }> {
  try {
    // Upload any pending photos first (convert blob URLs to server URLs)
    const uploadedPhotoUrls: string[] = []

    if (draft.pending_photos && draft.pending_photos.length > 0) {
      for (const blobUrl of draft.pending_photos) {
        // Skip if it's already a server URL (not a blob URL)
        if (!blobUrl.startsWith('blob:')) {
          uploadedPhotoUrls.push(blobUrl)
          continue
        }

        try {
          // Fetch the blob data
          const response = await fetch(blobUrl)
          const blob = await response.blob()
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })

          // Upload to server
          const result = await uploadPunchItemPhoto(draft.project_id, draft.id, file)
          uploadedPhotoUrls.push(result.url)
        } catch (photoError) {
          logger.warn('[PunchSync] Failed to upload photo:', photoError)
          // Continue with other photos
        }
      }
    }

    // Create the punch item on the server
    const { data, error } = await supabase
      .from('punch_items')
      .insert({
        project_id: draft.project_id,
        title: draft.title,
        description: draft.description,
        trade: draft.trade,
        priority: draft.priority,
        status: draft.status,
        building: draft.building || null,
        floor: draft.floor || null,
        room: draft.room || null,
        area: draft.area || null,
        location_notes: draft.location_notes || null,
        due_date: draft.due_date || null,
        assigned_to: draft.assigned_to || null,
        subcontractor_id: draft.subcontractor_id || null,
        // Floor plan location stored as JSON
        floor_plan_location: draft.floor_plan_location ? JSON.stringify(draft.floor_plan_location) : null,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('[PunchSync] Failed to create punch item:', error)
      return { success: false, error: error.message }
    }

    // Note: Photos are stored via uploadPunchItemPhoto which handles storage
    // The photo URLs are already uploaded to Supabase Storage, we just need to
    // update the punch item with the photo URLs if we have a photos field
    // For now, photos are handled separately through the storage system

    return { success: true, serverId: data?.id }
  } catch (error) {
    logger.error('[PunchSync] Unexpected sync error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Hook to automatically sync offline punch items when back online
 */
export function usePunchItemSync() {
  const isOnline = useIsOnline()
  const queryClient = useQueryClient()
  const {
    syncQueue,
    markSynced,
    markSyncError,
    incrementAttempt,
    removeFromSyncQueue,
  } = useOfflinePunchStore()

  const syncPendingItems = useCallback(async () => {
    if (!isOnline || syncQueue.length === 0) return

    logger.log(`[PunchSync] Starting sync for ${syncQueue.length} pending items`)

    let successCount = 0
    let failCount = 0

    for (const entry of syncQueue) {
      // Skip if too many retries
      if (entry.attempts >= MAX_SYNC_RETRIES) {
        logger.warn(`[PunchSync] Skipping ${entry.punchItem.id} - max retries exceeded`)
        continue
      }

      if (entry.operation === 'create') {
        const result = await syncDraftToServer(entry.punchItem)

        if (result.success) {
          markSynced(entry.punchItem.id, result.serverId)
          successCount++
        } else {
          incrementAttempt(entry.id, result.error)
          failCount++
        }
      }
      // TODO: Handle 'update' and 'delete' operations
    }

    // Invalidate punch items queries to refresh the list
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-lists'] })
      toast.success(`Synced ${successCount} punch item${successCount > 1 ? 's' : ''}!`)
    }

    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} item${failCount > 1 ? 's' : ''}`)
    }

    logger.log(`[PunchSync] Sync complete: ${successCount} success, ${failCount} failed`)
  }, [isOnline, syncQueue, markSynced, incrementAttempt, queryClient])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      // Small delay to ensure network is stable
      const timeoutId = setTimeout(syncPendingItems, 2000)
      return () => clearTimeout(timeoutId)
    }
  }, [isOnline, syncQueue.length, syncPendingItems])

  return {
    pendingCount: syncQueue.length,
    syncNow: syncPendingItems,
    isOnline,
  }
}

/**
 * Hook to get pending punch item count (for badge display)
 */
export function usePendingPunchItemCount(): number {
  return useOfflinePunchStore((state) => state.syncQueue.length)
}
