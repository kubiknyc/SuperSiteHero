// Offline store for projects with local caching and sync queue
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from '@/types/database-extensions'

/**
 * Draft project for offline creation
 */
export interface DraftProject extends Partial<Project> {
  id: string
  name: string
  company_id: string
  // Required fields
  status?: string
  // Location fields
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  latitude?: number | null
  longitude?: number | null
  // Date fields
  start_date?: string | null
  end_date?: string | null
  substantial_completion_date?: string | null
  final_completion_date?: string | null
  // Financial fields
  budget?: number | null
  contract_value?: number | null
  // Other fields
  description?: string | null
  project_number?: string | null
  weather_units?: string | null
  features_enabled?: Record<string, unknown> | null
  // Offline tracking
  synced: boolean
  sync_error?: string
  created_at: string
}

/**
 * Sync queue item for tracking pending operations
 */
export interface ProjectSyncQueueItem {
  id: string
  projectId: string
  action: 'create' | 'update' | 'delete'
  timestamp: number
  retries: number
  lastError?: string
  lastKnownUpdatedAt?: string
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface ProjectConflictInfo {
  projectId: string
  localUpdatedAt: number
  serverUpdatedAt: string
  serverData: Partial<Project>
}

interface OfflineProjectStore {
  // Cached projects from server (for offline access)
  cachedProjects: Project[]
  // Draft projects created offline
  draftProjects: DraftProject[]
  // Sync queue for pending operations
  syncQueue: ProjectSyncQueueItem[]
  // Sync status
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncAt: number | null
  // Conflict state
  conflict: ProjectConflictInfo | null

  // Cache actions
  cacheProjects: (projects: Project[]) => void
  updateCachedProject: (id: string, updates: Partial<Project>) => void
  removeCachedProject: (id: string) => void
  clearCache: () => void

  // Draft actions
  addDraftProject: (project: Omit<DraftProject, 'id' | 'created_at' | 'synced'>) => string
  updateDraftProject: (id: string, updates: Partial<DraftProject>) => void
  removeDraftProject: (id: string) => void
  markDraftSynced: (localId: string, serverId?: string) => void

  // Sync queue actions
  addToSyncQueue: (item: Omit<ProjectSyncQueueItem, 'id' | 'timestamp' | 'retries'>) => void
  removeFromSyncQueue: (id: string) => void
  updateSyncQueueItem: (id: string, updates: Partial<ProjectSyncQueueItem>) => void

  // Sync status actions
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  setLastSyncAt: (timestamp: number) => void

  // Conflict resolution
  setConflict: (conflict: ProjectConflictInfo | null) => void
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void

  // Getters
  getProjectById: (id: string) => Project | DraftProject | undefined
  getAllProjects: () => (Project | DraftProject)[]
  getPendingCount: () => number
  hasPendingChanges: () => boolean
}

const generateId = () => crypto.randomUUID()

export const useOfflineProjectStore = create<OfflineProjectStore>()(
  persist(
    (set, get) => ({
      cachedProjects: [],
      draftProjects: [],
      syncQueue: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncAt: null,
      conflict: null,

      // Cache actions
      cacheProjects: (projects) => {
        set({ cachedProjects: projects, lastSyncAt: Date.now() })
      },

      updateCachedProject: (id, updates) => {
        set((state) => ({
          cachedProjects: state.cachedProjects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }))
      },

      removeCachedProject: (id) => {
        set((state) => ({
          cachedProjects: state.cachedProjects.filter((p) => p.id !== id),
        }))
      },

      clearCache: () => {
        set({ cachedProjects: [], lastSyncAt: null })
      },

      // Draft actions
      addDraftProject: (project) => {
        const id = generateId()
        const newDraft: DraftProject = {
          ...project,
          id,
          status: project.status || 'active',
          created_at: new Date().toISOString(),
          synced: false,
        }
        set((state) => ({
          draftProjects: [...state.draftProjects, newDraft],
        }))
        // Add to sync queue
        get().addToSyncQueue({
          projectId: id,
          action: 'create',
        })
        return id
      },

      updateDraftProject: (id, updates) => {
        set((state) => ({
          draftProjects: state.draftProjects.map((p) =>
            p.id === id ? { ...p, ...updates, synced: false } : p
          ),
        }))
        // Check if already in sync queue, if not add update action
        const existingItem = get().syncQueue.find(
          (item) => item.projectId === id && item.action !== 'delete'
        )
        if (!existingItem) {
          get().addToSyncQueue({
            projectId: id,
            action: 'update',
          })
        }
      },

      removeDraftProject: (id) => {
        set((state) => ({
          draftProjects: state.draftProjects.filter((p) => p.id !== id),
          syncQueue: state.syncQueue.filter((item) => item.projectId !== id),
        }))
      },

      markDraftSynced: (localId, serverId) => {
        set((state) => {
          const draft = state.draftProjects.find((p) => p.id === localId)
          if (!draft) {return state}

          // Convert draft to cached project
          const cachedProject: Project = {
            ...(draft as unknown as Project),
            id: serverId || localId,
          }

          return {
            draftProjects: state.draftProjects.filter((p) => p.id !== localId),
            cachedProjects: [...state.cachedProjects, cachedProject],
            syncQueue: state.syncQueue.filter((item) => item.projectId !== localId),
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

          const { projectId, serverData } = state.conflict

          switch (strategy) {
            case 'keep_local':
              // Keep local changes, will force push on next sync
              return {
                conflict: null,
                syncStatus: 'idle',
              }

            case 'keep_server':
              // Discard local changes, use server data
              return {
                draftProjects: state.draftProjects.filter((p) => p.id !== projectId),
                cachedProjects: state.cachedProjects.map((p) =>
                  p.id === projectId ? { ...p, ...serverData } : p
                ),
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter((item) => item.projectId !== projectId),
              }

            case 'merge': {
              // Merge: local values take precedence for non-null fields
              const localProject =
                state.draftProjects.find((p) => p.id === projectId) ||
                state.cachedProjects.find((p) => p.id === projectId)

              if (!localProject) {
                return {
                  conflict: null,
                  syncStatus: 'idle',
                }
              }

              const merged = { ...serverData }
              Object.keys(localProject).forEach((key) => {
                const localValue = localProject[key as keyof typeof localProject]
                if (localValue !== null && localValue !== undefined) {
                  (merged as Record<string, unknown>)[key] = localValue
                }
              })

              // Update the project with merged data
              const isDraft = state.draftProjects.some((p) => p.id === projectId)
              if (isDraft) {
                return {
                  draftProjects: state.draftProjects.map((p) =>
                    p.id === projectId ? { ...p, ...(merged as Partial<DraftProject>) } : p
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              } else {
                return {
                  cachedProjects: state.cachedProjects.map((p) =>
                    p.id === projectId ? { ...p, ...merged } : p
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
      getProjectById: (id) => {
        const state = get()
        return (
          state.draftProjects.find((p) => p.id === id) ||
          state.cachedProjects.find((p) => p.id === id)
        )
      },

      getAllProjects: () => {
        const state = get()
        // Combine cached and draft projects, drafts first
        return [...state.draftProjects, ...state.cachedProjects]
      },

      getPendingCount: () => {
        return get().syncQueue.length
      },

      hasPendingChanges: () => {
        return get().syncQueue.length > 0 || get().draftProjects.length > 0
      },
    }),
    {
      name: 'offline-project-store',
      version: 1,
    }
  )
)
