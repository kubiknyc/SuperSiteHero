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
 * Sync a single draft punch item to the server (CREATE)
 */
async function syncCreateToServer(draft: DraftPunchItem): Promise<{ success: boolean; serverId?: string; error?: string }> {
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
 * Sync an updated punch item to the server (UPDATE)
 */
async function syncUpdateToServer(draft: DraftPunchItem): Promise<{ success: boolean; error?: string }> {
  try {
    // Upload any new pending photos first
    const uploadedPhotoUrls: string[] = []

    if (draft.pending_photos && draft.pending_photos.length > 0) {
      for (const blobUrl of draft.pending_photos) {
        if (!blobUrl.startsWith('blob:')) {
          uploadedPhotoUrls.push(blobUrl)
          continue
        }

        try {
          const response = await fetch(blobUrl)
          const blob = await response.blob()
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })
          const result = await uploadPunchItemPhoto(draft.project_id, draft.id, file)
          uploadedPhotoUrls.push(result.url)
        } catch (photoError) {
          logger.warn('[PunchSync] Failed to upload photo during update:', photoError)
        }
      }
    }

    // Update the punch item on the server
    const { error } = await supabase
      .from('punch_items')
      .update({
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
        floor_plan_location: draft.floor_plan_location ? JSON.stringify(draft.floor_plan_location) : null,
      })
      .eq('id', draft.id)

    if (error) {
      logger.error('[PunchSync] Failed to update punch item:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    logger.error('[PunchSync] Unexpected update error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete a punch item from the server (DELETE)
 */
async function syncDeleteToServer(draft: DraftPunchItem): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('punch_items')
      .delete()
      .eq('id', draft.id)

    if (error) {
      // If already deleted (not found), treat as success
      if (error.code === 'PGRST116') {
        logger.log('[PunchSync] Item already deleted, marking as synced')
        return { success: true }
      }
      logger.error('[PunchSync] Failed to delete punch item:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    logger.error('[PunchSync] Unexpected delete error:', error)
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
    if (!isOnline || syncQueue.length === 0) {return}

    logger.log(`[PunchSync] Starting sync for ${syncQueue.length} pending items`)

    let successCount = 0
    let failCount = 0

    for (const entry of syncQueue) {
      // Skip if too many retries
      if (entry.attempts >= MAX_SYNC_RETRIES) {
        logger.warn(`[PunchSync] Skipping ${entry.punchItem.id} - max retries exceeded`)
        continue
      }

      let result: { success: boolean; serverId?: string; error?: string }

      switch (entry.operation) {
        case 'create':
          result = await syncCreateToServer(entry.punchItem)
          if (result.success) {
            markSynced(entry.punchItem.id, result.serverId)
            successCount++
          } else {
            incrementAttempt(entry.id, result.error)
            failCount++
          }
          break

        case 'update':
          result = await syncUpdateToServer(entry.punchItem)
          if (result.success) {
            markSynced(entry.punchItem.id)
            successCount++
          } else {
            incrementAttempt(entry.id, result.error)
            failCount++
          }
          break

        case 'delete':
          result = await syncDeleteToServer(entry.punchItem)
          if (result.success) {
            removeFromSyncQueue(entry.id)
            successCount++
          } else {
            incrementAttempt(entry.id, result.error)
            failCount++
          }
          break

        default:
          logger.warn(`[PunchSync] Unknown operation: ${entry.operation}`)
      }
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
  }, [isOnline, syncQueue, markSynced, incrementAttempt, removeFromSyncQueue, queryClient])

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
