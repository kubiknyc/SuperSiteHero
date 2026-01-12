// Hook for managing offline sync of tasks
import { useEffect, useCallback, useRef } from 'react'
import {
  useOfflineTaskStore,
  type TaskConflictInfo,
  type DraftTask,
  type CachedTask,
} from '../store/offlineTaskStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

/**
 * Check if server data has been modified since we last fetched
 */
async function checkForConflict(
  taskId: string,
  lastKnownUpdatedAt?: string
): Promise<{
  hasConflict: boolean
  serverData?: Record<string, unknown>
  serverUpdatedAt?: string
}> {
  if (!lastKnownUpdatedAt) {
    return { hasConflict: false }
  }

  const { data: serverTask, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error || !serverTask) {
    return { hasConflict: false }
  }

  const taskData = serverTask as Record<string, unknown>
  const serverUpdatedAt = taskData.updated_at as string | undefined

  if (serverUpdatedAt && serverUpdatedAt !== lastKnownUpdatedAt) {
    return {
      hasConflict: true,
      serverData: taskData,
      serverUpdatedAt,
    }
  }

  return { hasConflict: false }
}

/**
 * Hook for syncing tasks between local storage and server
 */
export function useTaskSync() {
  const store = useOfflineTaskStore()
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
          const task = store.getTaskById(item.taskId)

          if (!task && item.action !== 'delete') {
            logger.warn(`Task ${item.taskId} not found for sync`)
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
            const draftTask = task as DraftTask

            const taskData = {
              project_id: draftTask.project_id,
              title: draftTask.title,
              description: draftTask.description,
              status: draftTask.status || 'pending',
              priority: draftTask.priority || 'medium',
              start_date: draftTask.start_date,
              due_date: draftTask.due_date,
              completed_date: draftTask.completed_date,
              assigned_to_type: draftTask.assigned_to_type,
              assigned_to_user_id: draftTask.assigned_to_user_id,
              assigned_to_subcontractor_id: draftTask.assigned_to_subcontractor_id,
              location: draftTask.location,
              parent_task_id: draftTask.parent_task_id,
              related_to_type: draftTask.related_to_type,
              related_to_id: draftTask.related_to_id,
              created_by: user.id,
            }

            const { data: createdTask, error } = await supabase
              .from('tasks')
              .insert(taskData)
              .select()
              .single()

            if (error) {throw error}

            store.markDraftSynced(item.taskId, (createdTask as { id: string }).id)
            logger.info(`Task ${item.taskId} synced successfully`)
          } else if (item.action === 'update') {
            const conflictResult = await checkForConflict(item.taskId, item.lastKnownUpdatedAt)

            if (
              conflictResult.hasConflict &&
              conflictResult.serverData &&
              conflictResult.serverUpdatedAt
            ) {
              const conflictInfo: TaskConflictInfo = {
                taskId: item.taskId,
                localUpdatedAt: item.timestamp,
                serverUpdatedAt: conflictResult.serverUpdatedAt,
                serverData: conflictResult.serverData,
              }
              store.setConflict(conflictInfo)
              isProcessingRef.current = false
              return
            }

            const updateData: Record<string, unknown> = {}
            if (task) {
              const fields = [
                'title',
                'description',
                'status',
                'priority',
                'start_date',
                'due_date',
                'completed_date',
                'assigned_to_type',
                'assigned_to_user_id',
                'assigned_to_subcontractor_id',
                'location',
                'parent_task_id',
                'related_to_type',
                'related_to_id',
              ]

              fields.forEach((field) => {
                const value = task[field as keyof typeof task]
                if (value !== undefined) {
                  updateData[field] = value
                }
              })
            }

            const { error } = await supabase
              .from('tasks')
              .update(updateData)
              .eq('id', item.taskId)

            if (error) {throw error}

            store.removeFromSyncQueue(item.id)
            logger.info(`Task ${item.taskId} updated successfully`)
          } else if (item.action === 'delete') {
            const { error } = await supabase
              .from('tasks')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', item.taskId)

            if (error) {throw error}

            store.removeCachedTask(item.taskId)
            store.removeFromSyncQueue(item.id)
            logger.info(`Task ${item.taskId} deleted successfully`)
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
              `Sync failed for task ${item.taskId}, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
            )
            setTimeout(() => processSyncQueue(), delay)
          } else {
            logger.error(`Sync failed for task ${item.taskId} after ${MAX_RETRIES} retries`)
          }
        }
      }

      store.setSyncStatus('success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      store.setSyncStatus('error', errorMessage)
      logger.error('Task sync error:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [store])

  // Fetch and cache tasks from server
  const fetchAndCacheTasks = useCallback(
    async (projectId?: string) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached tasks')
        return projectId ? store.getTasksByProject(projectId) : store.getAllTasks()
      }

      try {
        let query = supabase
          .from('tasks')
          .select('*')
          .is('deleted_at', null)
          .order('due_date', { ascending: true, nullsFirst: false })

        if (projectId) {
          query = query.eq('project_id', projectId)
        }

        const { data, error } = await query

        if (error) {throw error}

        store.cacheTasks((data as CachedTask[]) || [])
        return projectId ? store.getTasksByProject(projectId) : store.getAllTasks()
      } catch (error) {
        logger.error('Failed to fetch tasks:', error)
        return projectId ? store.getTasksByProject(projectId) : store.getAllTasks()
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

  // Queue a task for deletion
  const queueTaskDeletion = useCallback(
    (taskId: string) => {
      store.addToSyncQueue({
        taskId,
        action: 'delete',
      })

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  // Update task status (common operation)
  const updateTaskStatus = useCallback(
    (taskId: string, status: string) => {
      const task = store.getTaskById(taskId)
      if (!task) {return}

      const isDraft = 'synced' in task
      if (isDraft) {
        store.updateDraftTask(taskId, {
          status,
          completed_date: status === 'completed' ? new Date().toISOString() : null,
        })
      } else {
        store.updateCachedTask(taskId, { status })
        store.addToSyncQueue({
          taskId,
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
    cachedTasks: store.cachedTasks,
    draftTasks: store.draftTasks,
    allTasks: store.getAllTasks(),

    // Actions
    manualSync: processSyncQueue,
    fetchAndCache: fetchAndCacheTasks,
    resolveConflict: handleResolveConflict,
    queueDeletion: queueTaskDeletion,
    updateStatus: updateTaskStatus,

    // Direct store access
    addDraftTask: store.addDraftTask,
    updateDraftTask: store.updateDraftTask,
    getTaskById: store.getTaskById,
    getTasksByProject: store.getTasksByProject,
    getTasksByStatus: store.getTasksByStatus,
  }
}
