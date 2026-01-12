// Offline store for tasks with local caching and sync queue
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Draft task for offline creation
 */
export interface DraftTask {
  id: string
  project_id: string
  title: string
  // Optional fields
  description?: string | null
  status?: string | null
  priority?: string | null
  // Dates
  start_date?: string | null
  due_date?: string | null
  completed_date?: string | null
  // Assignment
  assigned_to_type?: string | null
  assigned_to_user_id?: string | null
  assigned_to_subcontractor_id?: string | null
  // Location and relationships
  location?: string | null
  parent_task_id?: string | null
  related_to_type?: string | null
  related_to_id?: string | null
  // Offline tracking
  synced: boolean
  sync_error?: string
  created_at: string
  // Track field changes for conflict resolution
  local_updates: TaskUpdate[]
}

/**
 * Track individual field updates for conflict resolution
 */
export interface TaskUpdate {
  field: string
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

/**
 * Cached task from server
 */
export interface CachedTask {
  id: string
  project_id: string
  title: string
  description?: string | null
  status?: string | null
  priority?: string | null
  start_date?: string | null
  due_date?: string | null
  completed_date?: string | null
  assigned_to_type?: string | null
  assigned_to_user_id?: string | null
  assigned_to_subcontractor_id?: string | null
  location?: string | null
  parent_task_id?: string | null
  related_to_type?: string | null
  related_to_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
}

/**
 * Sync queue item for tracking pending operations
 */
export interface TaskSyncQueueItem {
  id: string
  taskId: string
  action: 'create' | 'update' | 'delete'
  timestamp: number
  retries: number
  lastError?: string
  lastKnownUpdatedAt?: string
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface TaskConflictInfo {
  taskId: string
  localUpdatedAt: number
  serverUpdatedAt: string
  serverData: Partial<CachedTask>
}

interface OfflineTaskStore {
  // Cached tasks from server
  cachedTasks: CachedTask[]
  // Draft tasks created offline
  draftTasks: DraftTask[]
  // Sync queue for pending operations
  syncQueue: TaskSyncQueueItem[]
  // Sync status
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncAt: number | null
  // Conflict state
  conflict: TaskConflictInfo | null

  // Cache actions
  cacheTasks: (tasks: CachedTask[]) => void
  updateCachedTask: (id: string, updates: Partial<CachedTask>) => void
  removeCachedTask: (id: string) => void
  clearCache: () => void

  // Draft actions
  addDraftTask: (
    task: Omit<DraftTask, 'id' | 'created_at' | 'synced' | 'local_updates'>
  ) => string
  updateDraftTask: (id: string, updates: Partial<DraftTask>) => void
  removeDraftTask: (id: string) => void
  markDraftSynced: (localId: string, serverId?: string) => void

  // Sync queue actions
  addToSyncQueue: (item: Omit<TaskSyncQueueItem, 'id' | 'timestamp' | 'retries'>) => void
  removeFromSyncQueue: (id: string) => void
  updateSyncQueueItem: (id: string, updates: Partial<TaskSyncQueueItem>) => void

  // Sync status actions
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  setLastSyncAt: (timestamp: number) => void

  // Conflict resolution
  setConflict: (conflict: TaskConflictInfo | null) => void
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void

  // Getters
  getTaskById: (id: string) => CachedTask | DraftTask | undefined
  getAllTasks: () => (CachedTask | DraftTask)[]
  getTasksByProject: (projectId: string) => (CachedTask | DraftTask)[]
  getTasksByStatus: (status: string) => (CachedTask | DraftTask)[]
  getPendingCount: () => number
  hasPendingChanges: () => boolean
}

const generateId = () => crypto.randomUUID()

export const useOfflineTaskStore = create<OfflineTaskStore>()(
  persist(
    (set, get) => ({
      cachedTasks: [],
      draftTasks: [],
      syncQueue: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncAt: null,
      conflict: null,

      // Cache actions
      cacheTasks: (tasks) => {
        set({ cachedTasks: tasks, lastSyncAt: Date.now() })
      },

      updateCachedTask: (id, updates) => {
        set((state) => ({
          cachedTasks: state.cachedTasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }))
      },

      removeCachedTask: (id) => {
        set((state) => ({
          cachedTasks: state.cachedTasks.filter((t) => t.id !== id),
        }))
      },

      clearCache: () => {
        set({ cachedTasks: [], lastSyncAt: null })
      },

      // Draft actions
      addDraftTask: (task) => {
        const id = generateId()
        const newDraft: DraftTask = {
          ...task,
          id,
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          created_at: new Date().toISOString(),
          synced: false,
          local_updates: [],
        }
        set((state) => ({
          draftTasks: [...state.draftTasks, newDraft],
        }))
        get().addToSyncQueue({
          taskId: id,
          action: 'create',
        })
        return id
      },

      updateDraftTask: (id, updates) => {
        set((state) => {
          const task = state.draftTasks.find((t) => t.id === id)
          if (!task) {return state}

          // Track field updates for conflict resolution
          const newUpdates: TaskUpdate[] = []
          Object.keys(updates).forEach((key) => {
            if (key !== 'synced' && key !== 'sync_error' && key !== 'local_updates') {
              newUpdates.push({
                field: key,
                oldValue: task[key as keyof DraftTask],
                newValue: updates[key as keyof DraftTask],
                timestamp: Date.now(),
              })
            }
          })

          return {
            draftTasks: state.draftTasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    ...updates,
                    synced: false,
                    local_updates: [...t.local_updates, ...newUpdates],
                  }
                : t
            ),
          }
        })

        const existingItem = get().syncQueue.find(
          (item) => item.taskId === id && item.action !== 'delete'
        )
        if (!existingItem) {
          get().addToSyncQueue({
            taskId: id,
            action: 'update',
          })
        }
      },

      removeDraftTask: (id) => {
        set((state) => ({
          draftTasks: state.draftTasks.filter((t) => t.id !== id),
          syncQueue: state.syncQueue.filter((item) => item.taskId !== id),
        }))
      },

      markDraftSynced: (localId, serverId) => {
        set((state) => {
          const draft = state.draftTasks.find((t) => t.id === localId)
          if (!draft) {return state}

          const { local_updates, synced, sync_error, ...taskData } = draft
          const cachedTask: CachedTask = {
            ...taskData,
            id: serverId || localId,
          }

          return {
            draftTasks: state.draftTasks.filter((t) => t.id !== localId),
            cachedTasks: [...state.cachedTasks, cachedTask],
            syncQueue: state.syncQueue.filter((item) => item.taskId !== localId),
          }
        })
      },

      // Sync queue actions
      addToSyncQueue: (item) => {
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...item,
              id: generateId(),
              timestamp: Date.now(),
              retries: 0,
            },
          ],
        }))
      },

      removeFromSyncQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        }))
      },

      updateSyncQueueItem: (id, updates) => {
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }))
      },

      // Sync status actions
      setSyncStatus: (status, error = null) => {
        set({ syncStatus: status, syncError: error })
      },

      setLastSyncAt: (timestamp) => {
        set({ lastSyncAt: timestamp })
      },

      // Conflict resolution
      setConflict: (conflict) => {
        set({ conflict, syncStatus: conflict ? 'conflict' : 'idle' })
      },

      resolveConflict: (strategy) => {
        set((state) => {
          if (!state.conflict) {return state}

          const { taskId, serverData } = state.conflict

          switch (strategy) {
            case 'keep_local':
              return {
                conflict: null,
                syncStatus: 'idle',
              }

            case 'keep_server':
              return {
                draftTasks: state.draftTasks.filter((t) => t.id !== taskId),
                cachedTasks: state.cachedTasks.map((t) =>
                  t.id === taskId ? { ...t, ...serverData } : t
                ),
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter((item) => item.taskId !== taskId),
              }

            case 'merge': {
              const localTask =
                state.draftTasks.find((t) => t.id === taskId) ||
                state.cachedTasks.find((t) => t.id === taskId)

              if (!localTask) {
                return { conflict: null, syncStatus: 'idle' }
              }

              const merged = { ...serverData }
              Object.keys(localTask).forEach((key) => {
                const localValue = localTask[key as keyof typeof localTask]
                if (localValue !== null && localValue !== undefined) {
                  (merged as Record<string, unknown>)[key] = localValue
                }
              })

              const isDraft = state.draftTasks.some((t) => t.id === taskId)
              if (isDraft) {
                return {
                  draftTasks: state.draftTasks.map((t) =>
                    t.id === taskId ? { ...t, ...(merged as Partial<DraftTask>) } : t
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              } else {
                return {
                  cachedTasks: state.cachedTasks.map((t) =>
                    t.id === taskId ? { ...t, ...merged } : t
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              }
            }

            default:
              return state
          }
        })
      },

      // Getters
      getTaskById: (id) => {
        const state = get()
        return (
          state.draftTasks.find((t) => t.id === id) ||
          state.cachedTasks.find((t) => t.id === id)
        )
      },

      getAllTasks: () => {
        const state = get()
        return [...state.draftTasks, ...state.cachedTasks]
      },

      getTasksByProject: (projectId) => {
        const state = get()
        return [
          ...state.draftTasks.filter((t) => t.project_id === projectId),
          ...state.cachedTasks.filter((t) => t.project_id === projectId),
        ]
      },

      getTasksByStatus: (status) => {
        const state = get()
        return [
          ...state.draftTasks.filter((t) => t.status === status),
          ...state.cachedTasks.filter((t) => t.status === status),
        ]
      },

      getPendingCount: () => {
        return get().syncQueue.length
      },

      hasPendingChanges: () => {
        return get().syncQueue.length > 0 || get().draftTasks.length > 0
      },
    }),
    {
      name: 'offline-task-store',
      version: 1,
    }
  )
)
