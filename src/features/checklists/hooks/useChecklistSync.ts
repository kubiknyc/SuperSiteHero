// Hook for managing offline sync of checklists (executions and responses)
import { useEffect, useCallback, useRef } from 'react'
import {
  useOfflineChecklistStore,
  type ChecklistConflictInfo,
  type DraftChecklistExecution,
  type CachedChecklistExecution,
  type CachedChecklistTemplate,
  type CachedChecklistTemplateItem,
} from '../store/offlineChecklistStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type { ChecklistStatus, ChecklistFilters } from '@/types/checklists'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

/**
 * Check if server data has been modified since we last fetched
 */
async function checkForConflict(
  executionId: string,
  lastKnownUpdatedAt?: string
): Promise<{
  hasConflict: boolean
  serverData?: Record<string, unknown>
  serverUpdatedAt?: string
}> {
  if (!lastKnownUpdatedAt) {
    return { hasConflict: false }
  }

  const { data: serverExecution, error } = await supabase
    .from('checklist_executions')
    .select('*')
    .eq('id', executionId)
    .single()

  if (error || !serverExecution) {
    return { hasConflict: false }
  }

  const executionData = serverExecution as Record<string, unknown>
  const serverUpdatedAt = executionData.updated_at as string | undefined

  if (serverUpdatedAt && serverUpdatedAt !== lastKnownUpdatedAt) {
    return {
      hasConflict: true,
      serverData: executionData,
      serverUpdatedAt,
    }
  }

  return { hasConflict: false }
}

/**
 * Upload checklist photo to Supabase storage
 */
async function uploadPhoto(
  executionId: string,
  photoId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `checklists/${executionId}/${photoId}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('checklist-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {throw error}

    const {
      data: { publicUrl },
    } = supabase.storage.from('checklist-photos').getPublicUrl(data.path)

    onProgress?.(100)
    return publicUrl
  } catch (error) {
    logger.error('Failed to upload checklist photo:', error)
    return null
  }
}

/**
 * Hook for syncing checklists between local storage and server
 */
export function useChecklistSync() {
  const store = useOfflineChecklistStore()
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
      // Sort by timestamp for FIFO processing
      const sortedQueue = [...store.syncQueue].sort((a, b) => a.timestamp - b.timestamp)

      for (const item of sortedQueue) {
        if (item.retries >= MAX_RETRIES) {
          store.updateSyncQueueItem(item.id, {
            lastError: 'Max retries exceeded',
          })
          continue
        }

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('User not authenticated')
          }

          if (item.entityType === 'execution') {
            const execution = store.getExecutionById(item.entityId)

            if (!execution && item.action !== 'delete') {
              logger.warn(`Checklist execution ${item.entityId} not found for sync`)
              store.removeFromSyncQueue(item.id)
              continue
            }

            if (item.action === 'create') {
              const draftExecution = execution as DraftChecklistExecution

              // Upload any pending photos first
              for (const photo of draftExecution.offline_photos) {
                if (photo.uploadStatus === 'pending' && photo.file) {
                  store.updatePhotoStatus(item.entityId, photo.id, 'uploading')
                  const serverUrl = await uploadPhoto(
                    item.entityId,
                    photo.id,
                    photo.file,
                    (progress) => {
                      store.updateSyncQueueItem(item.id, { uploadProgress: progress })
                    }
                  )
                  if (serverUrl) {
                    store.updatePhotoStatus(item.entityId, photo.id, 'uploaded', serverUrl)
                  } else {
                    store.updatePhotoStatus(item.entityId, photo.id, 'failed')
                  }
                }
              }

              const executionData = {
                project_id: draftExecution.project_id,
                checklist_template_id: draftExecution.checklist_template_id,
                name: draftExecution.name,
                description: draftExecution.description,
                category: draftExecution.category,
                inspector_user_id: draftExecution.inspector_user_id || user.id,
                inspector_name: draftExecution.inspector_name,
                inspector_signature_url: draftExecution.inspector_signature_url,
                location: draftExecution.location,
                weather_conditions: draftExecution.weather_conditions,
                temperature: draftExecution.temperature,
                status: draftExecution.status,
                is_completed: draftExecution.is_completed,
                completed_at: draftExecution.completed_at,
                submitted_at: draftExecution.submitted_at,
                started_at: draftExecution.started_at,
                actual_duration_minutes: draftExecution.actual_duration_minutes,
                pause_count: draftExecution.pause_count,
                paused_duration_minutes: draftExecution.paused_duration_minutes,
                score_pass: draftExecution.score_pass,
                score_fail: draftExecution.score_fail,
                score_na: draftExecution.score_na,
                score_total: draftExecution.score_total,
                score_percentage: draftExecution.score_percentage,
                daily_report_id: draftExecution.daily_report_id,
                created_by: user.id,
              }

              const { data: createdExecution, error } = await supabase
                .from('checklist_executions')
                .insert(executionData)
                .select()
                .single()

              if (error) {throw error}

              // Sync responses
              const serverId = (createdExecution as { id: string }).id
              for (const response of draftExecution.offline_responses) {
                // Get photo URLs that have been uploaded
                const photoUrls = draftExecution.offline_photos
                  .filter((p) => p.responseId === response.id && p.serverUrl)
                  .map((p) => p.serverUrl!)

                const responseData = {
                  checklist_id: serverId,
                  checklist_template_item_id: response.checklist_template_item_id,
                  item_type: response.item_type,
                  item_label: response.item_label,
                  sort_order: response.sort_order,
                  response_data: response.response_data,
                  score_value: response.score_value,
                  notes: response.notes,
                  photo_urls: [...response.photo_urls, ...photoUrls],
                  signature_url: response.signature_url,
                  responded_by: response.responded_by || user.id,
                }

                await supabase.from('checklist_responses').insert(responseData)
              }

              store.markDraftSynced(item.entityId, serverId)
              logger.info(`Checklist execution ${item.entityId} synced successfully`)
            } else if (item.action === 'update') {
              const conflictResult = await checkForConflict(
                item.entityId,
                item.lastKnownUpdatedAt
              )

              if (
                conflictResult.hasConflict &&
                conflictResult.serverData &&
                conflictResult.serverUpdatedAt
              ) {
                const conflictInfo: ChecklistConflictInfo = {
                  executionId: item.entityId,
                  localUpdatedAt: item.timestamp,
                  serverUpdatedAt: conflictResult.serverUpdatedAt,
                  serverData: conflictResult.serverData,
                }
                store.setConflict(conflictInfo)
                isProcessingRef.current = false
                return
              }

              const updateData: Record<string, unknown> = {}
              if (execution) {
                const fields = [
                  'name',
                  'description',
                  'category',
                  'inspector_name',
                  'inspector_signature_url',
                  'location',
                  'weather_conditions',
                  'temperature',
                  'status',
                  'is_completed',
                  'completed_at',
                  'submitted_at',
                  'actual_duration_minutes',
                  'pause_count',
                  'paused_duration_minutes',
                  'score_pass',
                  'score_fail',
                  'score_na',
                  'score_total',
                  'score_percentage',
                ]

                fields.forEach((field) => {
                  const value = execution[field as keyof typeof execution]
                  if (value !== undefined) {
                    updateData[field] = value
                  }
                })
              }

              const { error } = await supabase
                .from('checklist_executions')
                .update(updateData)
                .eq('id', item.entityId)

              if (error) {throw error}

              store.removeFromSyncQueue(item.id)
              logger.info(`Checklist execution ${item.entityId} updated successfully`)
            } else if (item.action === 'delete') {
              const { error } = await supabase
                .from('checklist_executions')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', item.entityId)

              if (error) {throw error}

              store.removeCachedExecution(item.entityId)
              store.removeFromSyncQueue(item.id)
              logger.info(`Checklist execution ${item.entityId} deleted successfully`)
            } else if (item.action === 'submit') {
              const { error } = await supabase
                .from('checklist_executions')
                .update({
                  status: 'submitted' as ChecklistStatus,
                  submitted_at: new Date().toISOString(),
                  is_completed: true,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', item.entityId)

              if (error) {throw error}

              store.removeFromSyncQueue(item.id)
              logger.info(`Checklist execution ${item.entityId} submitted successfully`)
            }
          } else if (item.entityType === 'response') {
            if (item.action === 'upload_photo' && item.photoId) {
              // Find the photo in draft executions
              for (const draft of store.draftExecutions) {
                const photo = draft.offline_photos.find((p) => p.id === item.photoId)
                if (photo && photo.file && photo.uploadStatus === 'pending') {
                  store.updatePhotoStatus(draft.id, photo.id, 'uploading')
                  const serverUrl = await uploadPhoto(draft.id, photo.id, photo.file)
                  if (serverUrl) {
                    store.updatePhotoStatus(draft.id, photo.id, 'uploaded', serverUrl)
                  } else {
                    store.updatePhotoStatus(draft.id, photo.id, 'failed')
                  }
                  break
                }
              }
              store.removeFromSyncQueue(item.id)
            }
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
              `Sync failed for ${item.entityType} ${item.entityId}, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
            )
            setTimeout(() => processSyncQueue(), delay)
          } else {
            logger.error(
              `Sync failed for ${item.entityType} ${item.entityId} after ${MAX_RETRIES} retries`
            )
          }
        }
      }

      store.setSyncStatus('success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      store.setSyncStatus('error', errorMessage)
      logger.error('Checklist sync error:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [store])

  // Fetch and cache templates from server
  const fetchAndCacheTemplates = useCallback(
    async (companyId?: string) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached templates')
        return store.cachedTemplates
      }

      try {
        let query = supabase
          .from('checklist_templates')
          .select('*')
          .is('deleted_at', null)
          .order('name', { ascending: true })

        if (companyId) {
          query = query.or(`company_id.eq.${companyId},is_system_template.eq.true`)
        }

        const { data, error } = await query

        if (error) {throw error}

        store.cacheTemplates((data as CachedChecklistTemplate[]) || [])
        return store.cachedTemplates
      } catch (error) {
        logger.error('Failed to fetch checklist templates:', error)
        return store.cachedTemplates
      }
    },
    [store]
  )

  // Fetch and cache template items
  const fetchAndCacheTemplateItems = useCallback(
    async (templateId: string) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached template items')
        return store.getTemplateItems(templateId)
      }

      try {
        const { data, error } = await supabase
          .from('checklist_template_items')
          .select('*')
          .eq('checklist_template_id', templateId)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true })

        if (error) {throw error}

        // Add to existing items (replace if same template)
        const existingItems = store.cachedTemplateItems.filter(
          (i) => i.checklist_template_id !== templateId
        )
        store.cacheTemplateItems([...existingItems, ...((data as CachedChecklistTemplateItem[]) || [])])

        return store.getTemplateItems(templateId)
      } catch (error) {
        logger.error('Failed to fetch template items:', error)
        return store.getTemplateItems(templateId)
      }
    },
    [store]
  )

  // Fetch and cache executions from server
  const fetchAndCacheExecutions = useCallback(
    async (filters?: ChecklistFilters) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached executions')
        if (filters?.project_id) {return store.getExecutionsByProject(filters.project_id)}
        if (filters?.status) {return store.getExecutionsByStatus(filters.status)}
        return store.getAllExecutions()
      }

      try {
        let query = supabase
          .from('checklist_executions')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (filters?.project_id) {
          query = query.eq('project_id', filters.project_id)
        }
        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.inspector_user_id) {
          query = query.eq('inspector_user_id', filters.inspector_user_id)
        }
        if (filters?.is_completed !== undefined) {
          query = query.eq('is_completed', filters.is_completed)
        }

        const { data, error } = await query

        if (error) {throw error}

        store.cacheExecutions((data as CachedChecklistExecution[]) || [])
        if (filters?.project_id) {return store.getExecutionsByProject(filters.project_id)}
        if (filters?.status) {return store.getExecutionsByStatus(filters.status)}
        return store.getAllExecutions()
      } catch (error) {
        logger.error('Failed to fetch checklist executions:', error)
        if (filters?.project_id) {return store.getExecutionsByProject(filters.project_id)}
        if (filters?.status) {return store.getExecutionsByStatus(filters.status)}
        return store.getAllExecutions()
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

  // Queue execution for deletion
  const queueExecutionDeletion = useCallback(
    (executionId: string) => {
      store.addToSyncQueue({
        entityType: 'execution',
        entityId: executionId,
        action: 'delete',
      })

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  // Submit checklist execution
  const submitExecution = useCallback(
    (executionId: string) => {
      const execution = store.getExecutionById(executionId)
      if (!execution) {return}

      const isDraft = 'synced' in execution
      const now = new Date().toISOString()

      if (isDraft) {
        store.updateDraftExecution(executionId, {
          status: 'submitted',
          submitted_at: now,
          is_completed: true,
          completed_at: now,
        })
      } else {
        store.updateCachedExecution(executionId, {
          status: 'submitted',
          submitted_at: now,
          is_completed: true,
          completed_at: now,
        })
        store.addToSyncQueue({
          entityType: 'execution',
          entityId: executionId,
          action: 'submit',
        })
      }

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  // Update execution status
  const updateExecutionStatus = useCallback(
    (executionId: string, status: ChecklistStatus) => {
      const execution = store.getExecutionById(executionId)
      if (!execution) {return}

      const isDraft = 'synced' in execution

      if (isDraft) {
        store.updateDraftExecution(executionId, { status })
      } else {
        store.updateCachedExecution(executionId, { status })
        store.addToSyncQueue({
          entityType: 'execution',
          entityId: executionId,
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
    cachedTemplates: store.cachedTemplates,
    cachedExecutions: store.cachedExecutions,
    draftExecutions: store.draftExecutions,
    allExecutions: store.getAllExecutions(),

    // Actions
    manualSync: processSyncQueue,
    fetchAndCacheTemplates,
    fetchAndCacheTemplateItems,
    fetchAndCacheExecutions,
    resolveConflict: handleResolveConflict,
    queueDeletion: queueExecutionDeletion,
    submitExecution,
    updateStatus: updateExecutionStatus,

    // Direct store access
    addDraftExecution: store.addDraftExecution,
    updateDraftExecution: store.updateDraftExecution,
    getExecutionById: store.getExecutionById,
    getExecutionsByProject: store.getExecutionsByProject,
    getExecutionsByStatus: store.getExecutionsByStatus,
    getInProgressExecutions: store.getInProgressExecutions,
    getTemplateById: store.getTemplateById,
    getTemplateItems: store.getTemplateItems,

    // Response management
    addResponse: store.addResponse,
    updateResponse: store.updateResponse,
    removeResponse: store.removeResponse,

    // Photo management
    addPhoto: store.addPhoto,
    updatePhotoStatus: store.updatePhotoStatus,
    removePhoto: store.removePhoto,
  }
}
