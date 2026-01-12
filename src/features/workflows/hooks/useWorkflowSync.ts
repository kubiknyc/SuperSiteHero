// Hook for managing offline sync of workflow items (RFIs, Submittals, Change Orders)
import { useEffect, useCallback, useRef } from 'react'
import {
  useOfflineWorkflowStore,
  type WorkflowConflictInfo,
  type DraftWorkflowItem,
  type CachedWorkflowItem,
} from '../store/offlineWorkflowStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

/**
 * Check if server data has been modified since we last fetched
 */
async function checkForConflict(
  itemId: string,
  lastKnownUpdatedAt?: string
): Promise<{
  hasConflict: boolean
  serverData?: Record<string, unknown>
  serverUpdatedAt?: string
}> {
  if (!lastKnownUpdatedAt) {
    return { hasConflict: false }
  }

  const { data: serverItem, error } = await supabase
    .from('workflow_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (error || !serverItem) {
    return { hasConflict: false }
  }

  const itemData = serverItem as Record<string, unknown>
  const serverUpdatedAt = itemData.updated_at as string | undefined

  if (serverUpdatedAt && serverUpdatedAt !== lastKnownUpdatedAt) {
    return {
      hasConflict: true,
      serverData: itemData,
      serverUpdatedAt,
    }
  }

  return { hasConflict: false }
}

/**
 * Upload workflow attachments to Supabase storage
 */
async function uploadAttachments(
  itemId: string,
  attachments: DraftWorkflowItem['offline_attachments'],
  onAttachmentUploaded: (attachmentId: string, serverUrl: string) => void
): Promise<string[]> {
  const uploadedUrls: string[] = []

  for (const attachment of attachments) {
    if (attachment.uploadStatus === 'uploaded' && attachment.serverUrl) {
      uploadedUrls.push(attachment.serverUrl)
      continue
    }

    if (!attachment.file) {
      logger.warn(`No file for attachment ${attachment.id}, skipping upload`)
      continue
    }

    try {
      const fileExt = attachment.fileName.split('.').pop() || 'bin'
      const fileName = `${itemId}/${attachment.id}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('workflow-attachments')
        .upload(fileName, attachment.file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) {throw error}

      const {
        data: { publicUrl },
      } = supabase.storage.from('workflow-attachments').getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)
      onAttachmentUploaded(attachment.id, publicUrl)
    } catch (error) {
      logger.error(`Failed to upload attachment ${attachment.id}:`, error)
    }
  }

  return uploadedUrls
}

/**
 * Hook for syncing workflow items between local storage and server
 */
export function useWorkflowSync() {
  const store = useOfflineWorkflowStore()
  const isProcessingRef = useRef(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      processSyncQueue()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Process sync queue
  const processSyncQueue = useCallback(async () => {
    if (!navigator.onLine || store.syncQueue.length === 0 || isProcessingRef.current) {
      return
    }

    isProcessingRef.current = true
    store.setSyncStatus('syncing')

    try {
      const sortedQueue = [...store.syncQueue].sort((a, b) => a.timestamp - b.timestamp)

      for (const item of sortedQueue) {
        if (item.retries >= MAX_RETRIES) {
          store.updateSyncQueueItem(item.id, {
            lastError: 'Max retries exceeded',
          })
          continue
        }

        try {
          const workflowItem = store.getItemById(item.workflowItemId)

          if (!workflowItem && item.action !== 'delete') {
            logger.warn(`Workflow item ${item.workflowItemId} not found for sync`)
            store.removeFromSyncQueue(item.id)
            continue
          }

          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('User not authenticated')
          }

          if (item.action === 'create') {
            const draftItem = workflowItem as DraftWorkflowItem

            // Upload attachments first
            if (draftItem.offline_attachments.length > 0) {
              await uploadAttachments(
                draftItem.id,
                draftItem.offline_attachments,
                (attachmentId, serverUrl) => {
                  store.updateAttachmentStatus(draftItem.id, attachmentId, 'uploaded', serverUrl)
                }
              )
            }

            const itemData = {
              project_id: draftItem.project_id,
              workflow_type_id: draftItem.workflow_type_id,
              title: draftItem.title,
              description: draftItem.description,
              status: draftItem.status || 'open',
              priority: draftItem.priority,
              discipline: draftItem.discipline,
              assignees: draftItem.assignees,
              raised_by: draftItem.raised_by || user.id,
              opened_date: draftItem.opened_date || new Date().toISOString(),
              due_date: draftItem.due_date,
              cost_impact: draftItem.cost_impact,
              schedule_impact: draftItem.schedule_impact,
              reference_number: draftItem.reference_number,
              more_information: draftItem.more_information,
              created_by: user.id,
            }

            const { data: createdItem, error } = await supabase
              .from('workflow_items')
              .insert(itemData)
              .select()
              .single()

            if (error) {throw error}

            store.markDraftSynced(item.workflowItemId, (createdItem as { id: string }).id)
            logger.info(`Workflow item ${item.workflowItemId} synced successfully`)
          } else if (item.action === 'update') {
            const conflictResult = await checkForConflict(
              item.workflowItemId,
              item.lastKnownUpdatedAt
            )

            if (
              conflictResult.hasConflict &&
              conflictResult.serverData &&
              conflictResult.serverUpdatedAt
            ) {
              const conflictInfo: WorkflowConflictInfo = {
                workflowItemId: item.workflowItemId,
                localUpdatedAt: item.timestamp,
                serverUpdatedAt: conflictResult.serverUpdatedAt,
                serverData: conflictResult.serverData,
              }
              store.setConflict(conflictInfo)
              isProcessingRef.current = false
              return
            }

            const updateData: Record<string, unknown> = {}
            if (workflowItem) {
              const fields = [
                'title',
                'description',
                'status',
                'priority',
                'discipline',
                'assignees',
                'due_date',
                'closed_date',
                'cost_impact',
                'schedule_impact',
                'resolution',
                'more_information',
              ]

              fields.forEach((field) => {
                const value = workflowItem[field as keyof typeof workflowItem]
                if (value !== undefined) {
                  updateData[field] = value
                }
              })
            }

            const { error } = await supabase
              .from('workflow_items')
              .update(updateData)
              .eq('id', item.workflowItemId)

            if (error) {throw error}

            store.removeFromSyncQueue(item.id)
            logger.info(`Workflow item ${item.workflowItemId} updated successfully`)
          } else if (item.action === 'delete') {
            const { error } = await supabase
              .from('workflow_items')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', item.workflowItemId)

            if (error) {throw error}

            store.removeCachedItem(item.workflowItemId)
            store.removeFromSyncQueue(item.id)
            logger.info(`Workflow item ${item.workflowItemId} deleted successfully`)
          } else if (item.action === 'add_response' && item.responseId) {
            // Handle response sync - implementation depends on your response table structure
            const draftItem = workflowItem as DraftWorkflowItem
            const response = draftItem?.offline_responses?.find((r) => r.id === item.responseId)

            if (response) {
              // Assuming there's a workflow_item_responses table
              const responseData = {
                workflow_item_id: item.workflowItemId,
                content: response.content,
                responded_by: response.respondedBy,
                responded_at: response.respondedAt,
              }

              const { error } = await supabase
                .from('workflow_item_responses')
                .insert(responseData)

              if (error) {
                logger.warn('Response table may not exist:', error)
              } else {
                store.markResponseSynced(item.workflowItemId, item.responseId)
              }
            }

            store.removeFromSyncQueue(item.id)
          }
        } catch (error) {
          const retries = item.retries + 1
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          store.updateSyncQueueItem(item.id, {
            retries,
            lastError: errorMessage,
          })

          if (retries < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retries - 1)
            logger.warn(
              `Sync failed for workflow item ${item.workflowItemId}, retrying in ${delay}ms`
            )
            setTimeout(() => processSyncQueue(), delay)
          } else {
            logger.error(
              `Sync failed for workflow item ${item.workflowItemId} after ${MAX_RETRIES} retries`
            )
          }
        }
      }

      store.setSyncStatus('success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      store.setSyncStatus('error', errorMessage)
      logger.error('Workflow sync error:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [store])

  // Fetch and cache items from server
  const fetchAndCacheItems = useCallback(
    async (projectId?: string, workflowTypeId?: string) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached workflow items')
        if (projectId) {return store.getItemsByProject(projectId)}
        if (workflowTypeId) {return store.getItemsByType(workflowTypeId)}
        return store.getAllItems()
      }

      try {
        let query = supabase
          .from('workflow_items')
          .select('*')
          .is('deleted_at', null)
          .order('opened_date', { ascending: false })

        if (projectId) {
          query = query.eq('project_id', projectId)
        }
        if (workflowTypeId) {
          query = query.eq('workflow_type_id', workflowTypeId)
        }

        const { data, error } = await query

        if (error) {throw error}

        store.cacheItems((data as CachedWorkflowItem[]) || [])

        if (projectId) {return store.getItemsByProject(projectId)}
        if (workflowTypeId) {return store.getItemsByType(workflowTypeId)}
        return store.getAllItems()
      } catch (error) {
        logger.error('Failed to fetch workflow items:', error)
        if (projectId) {return store.getItemsByProject(projectId)}
        if (workflowTypeId) {return store.getItemsByType(workflowTypeId)}
        return store.getAllItems()
      }
    },
    [store]
  )

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    (strategy: 'keep_local' | 'keep_server' | 'merge') => {
      store.resolveConflict(strategy)
      processSyncQueue()
    },
    [store, processSyncQueue]
  )

  // Queue item for deletion
  const queueItemDeletion = useCallback(
    (itemId: string) => {
      store.addToSyncQueue({
        workflowItemId: itemId,
        action: 'delete',
      })

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  // Update item status (common operation)
  const updateItemStatus = useCallback(
    (itemId: string, status: string, resolution?: string) => {
      const item = store.getItemById(itemId)
      if (!item) {return}

      const updates: Partial<DraftWorkflowItem> = {
        status,
        ...(status === 'closed' ? { closed_date: new Date().toISOString() } : {}),
        ...(resolution ? { resolution } : {}),
      }

      const isDraft = 'synced' in item
      if (isDraft) {
        store.updateDraftItem(itemId, updates)
      } else {
        store.updateCachedItem(itemId, updates)
        store.addToSyncQueue({
          workflowItemId: itemId,
          action: 'update',
        })
      }

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  return {
    // State
    syncStatus: store.syncStatus,
    syncError: store.syncError,
    pendingCount: store.getPendingCount(),
    hasPendingChanges: store.hasPendingChanges(),
    lastSyncAt: store.lastSyncAt,
    conflict: store.conflict,
    isOnline: navigator.onLine,

    // Cached data
    cachedItems: store.cachedItems,
    draftItems: store.draftItems,
    allItems: store.getAllItems(),

    // Filtered getters
    rfis: store.getRFIs(),
    submittals: store.getSubmittals(),
    changeOrders: store.getChangeOrders(),

    // Actions
    manualSync: processSyncQueue,
    fetchAndCache: fetchAndCacheItems,
    resolveConflict: handleResolveConflict,
    queueDeletion: queueItemDeletion,
    updateStatus: updateItemStatus,

    // Direct store access
    addDraftItem: store.addDraftItem,
    updateDraftItem: store.updateDraftItem,
    getItemById: store.getItemById,
    getItemsByProject: store.getItemsByProject,
    getItemsByType: store.getItemsByType,
    getItemsByStatus: store.getItemsByStatus,

    // Attachment management
    addAttachment: store.addAttachment,
    removeAttachment: store.removeAttachment,

    // Response management
    addResponse: store.addResponse,
  }
}
