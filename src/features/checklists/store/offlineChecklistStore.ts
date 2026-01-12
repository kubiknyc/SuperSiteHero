// Offline store for checklists (templates, executions, and responses)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ChecklistStatus,
  ChecklistItemType,
  ScoreValue,
  ResponseData,
  ItemConfig,
  ItemConditions,
  EscalateOnFail,
  EscalationItemConfig,
} from '@/types/checklists'

/**
 * Draft checklist execution for offline creation
 */
export interface DraftChecklistExecution {
  id: string
  project_id: string
  checklist_template_id: string | null
  name: string
  // Optional fields
  description?: string | null
  category?: string | null
  inspector_user_id?: string | null
  inspector_name?: string | null
  inspector_signature_url?: string | null
  location?: string | null
  weather_conditions?: string | null
  temperature?: number | null
  status: ChecklistStatus
  items?: unknown[]
  is_completed: boolean
  completed_at?: string | null
  completed_by?: string | null
  submitted_at?: string | null
  started_at?: string | null
  actual_duration_minutes?: number | null
  pause_count: number
  paused_duration_minutes: number
  // Scoring
  score_pass: number
  score_fail: number
  score_na: number
  score_total: number
  score_percentage?: number | null
  score?: number | null
  grade?: string | null
  passed?: boolean | null
  daily_report_id?: string | null
  pdf_url?: string | null
  // Offline tracking
  synced: boolean
  sync_error?: string
  created_at: string
  // Offline responses
  offline_responses: DraftChecklistResponse[]
  // Offline photos pending upload
  offline_photos: OfflinePhoto[]
  // Track changes
  local_updates: ChecklistUpdate[]
}

/**
 * Draft checklist response for offline entries
 */
export interface DraftChecklistResponse {
  id: string
  checklist_id: string
  checklist_template_item_id: string | null
  item_type: ChecklistItemType
  item_label: string
  sort_order: number
  response_data: ResponseData
  score_value: ScoreValue | null
  notes?: string | null
  photo_urls: string[]
  signature_url?: string | null
  responded_by?: string | null
  created_at: string
  updated_at: string
  synced: boolean
}

/**
 * Offline photo pending upload
 */
export interface OfflinePhoto {
  id: string
  responseId: string
  file?: File | null
  localUrl: string
  fileName: string
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'
  serverUrl?: string
  error?: string
}

/**
 * Track field updates for conflict resolution
 */
export interface ChecklistUpdate {
  field: string
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

/**
 * Cached checklist template from server
 */
export interface CachedChecklistTemplate {
  id: string
  company_id: string | null
  name: string
  description?: string | null
  category?: string | null
  template_level: 'system' | 'company' | 'project'
  is_system_template: boolean
  tags: string[]
  instructions?: string | null
  estimated_duration_minutes?: number | null
  scoring_enabled: boolean
  scoring_type?: 'binary' | 'percentage' | 'points' | 'letter_grade'
  pass_threshold?: number
  items: unknown[]
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
}

/**
 * Cached template item from server
 */
export interface CachedChecklistTemplateItem {
  id: string
  checklist_template_id: string
  item_type: ChecklistItemType
  label: string
  description?: string | null
  sort_order: number
  section?: string | null
  is_required: boolean
  config: ItemConfig
  conditions?: ItemConditions | null
  escalate_on_fail?: EscalateOnFail
  escalation_config?: EscalationItemConfig | null
  scoring_enabled: boolean
  pass_fail_na_scoring: boolean
  requires_photo: boolean
  min_photos: number
  max_photos: number
  created_at?: string | null
  updated_at?: string | null
}

/**
 * Cached checklist execution from server
 */
export interface CachedChecklistExecution {
  id: string
  project_id: string
  checklist_template_id: string | null
  name: string
  description?: string | null
  category?: string | null
  inspector_user_id?: string | null
  inspector_name?: string | null
  inspector_signature_url?: string | null
  location?: string | null
  weather_conditions?: string | null
  temperature?: number | null
  status: ChecklistStatus
  items?: unknown[]
  is_completed: boolean
  completed_at?: string | null
  completed_by?: string | null
  submitted_at?: string | null
  started_at?: string | null
  actual_duration_minutes?: number | null
  pause_count: number
  paused_duration_minutes: number
  score_pass: number
  score_fail: number
  score_na: number
  score_total: number
  score_percentage?: number | null
  score?: number | null
  grade?: string | null
  passed?: boolean | null
  daily_report_id?: string | null
  pdf_url?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
}

/**
 * Sync queue item
 */
export interface ChecklistSyncQueueItem {
  id: string
  entityType: 'execution' | 'response'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'submit' | 'upload_photo'
  timestamp: number
  retries: number
  lastError?: string
  lastKnownUpdatedAt?: string
  // Photo specific
  photoId?: string
  uploadProgress?: number
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface ChecklistConflictInfo {
  executionId: string
  localUpdatedAt: number
  serverUpdatedAt: string
  serverData: Partial<CachedChecklistExecution>
}

interface OfflineChecklistStore {
  // Cached data from server
  cachedTemplates: CachedChecklistTemplate[]
  cachedTemplateItems: CachedChecklistTemplateItem[]
  cachedExecutions: CachedChecklistExecution[]
  // Draft data created offline
  draftExecutions: DraftChecklistExecution[]
  // Sync queue
  syncQueue: ChecklistSyncQueueItem[]
  // Sync status
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncAt: number | null
  // Conflict state
  conflict: ChecklistConflictInfo | null

  // Template cache actions
  cacheTemplates: (templates: CachedChecklistTemplate[]) => void
  cacheTemplateItems: (items: CachedChecklistTemplateItem[]) => void
  getTemplateById: (id: string) => CachedChecklistTemplate | undefined
  getTemplateItems: (templateId: string) => CachedChecklistTemplateItem[]

  // Execution cache actions
  cacheExecutions: (executions: CachedChecklistExecution[]) => void
  updateCachedExecution: (id: string, updates: Partial<CachedChecklistExecution>) => void
  removeCachedExecution: (id: string) => void

  // Draft execution actions
  addDraftExecution: (
    execution: Omit<DraftChecklistExecution, 'id' | 'created_at' | 'synced' | 'local_updates' | 'offline_responses' | 'offline_photos'>
  ) => string
  updateDraftExecution: (id: string, updates: Partial<DraftChecklistExecution>) => void
  removeDraftExecution: (id: string) => void
  markDraftSynced: (localId: string, serverId?: string) => void

  // Response actions
  addResponse: (executionId: string, response: Omit<DraftChecklistResponse, 'id' | 'created_at' | 'updated_at' | 'synced'>) => string
  updateResponse: (executionId: string, responseId: string, updates: Partial<DraftChecklistResponse>) => void
  removeResponse: (executionId: string, responseId: string) => void
  markResponseSynced: (executionId: string, responseId: string) => void

  // Photo actions
  addPhoto: (executionId: string, responseId: string, photo: Omit<OfflinePhoto, 'id' | 'uploadStatus'>) => string
  updatePhotoStatus: (executionId: string, photoId: string, status: OfflinePhoto['uploadStatus'], serverUrl?: string) => void
  removePhoto: (executionId: string, photoId: string) => void

  // Sync queue actions
  addToSyncQueue: (item: Omit<ChecklistSyncQueueItem, 'id' | 'timestamp' | 'retries'>) => void
  removeFromSyncQueue: (id: string) => void
  updateSyncQueueItem: (id: string, updates: Partial<ChecklistSyncQueueItem>) => void

  // Sync status actions
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  setLastSyncAt: (timestamp: number) => void

  // Conflict resolution
  setConflict: (conflict: ChecklistConflictInfo | null) => void
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void

  // Getters
  getExecutionById: (id: string) => CachedChecklistExecution | DraftChecklistExecution | undefined
  getAllExecutions: () => (CachedChecklistExecution | DraftChecklistExecution)[]
  getExecutionsByProject: (projectId: string) => (CachedChecklistExecution | DraftChecklistExecution)[]
  getExecutionsByStatus: (status: ChecklistStatus) => (CachedChecklistExecution | DraftChecklistExecution)[]
  getInProgressExecutions: (projectId?: string) => (CachedChecklistExecution | DraftChecklistExecution)[]
  getPendingCount: () => number
  hasPendingChanges: () => boolean
  clearCache: () => void
}

const generateId = () => crypto.randomUUID()

export const useOfflineChecklistStore = create<OfflineChecklistStore>()(
  persist(
    (set, get) => ({
      cachedTemplates: [],
      cachedTemplateItems: [],
      cachedExecutions: [],
      draftExecutions: [],
      syncQueue: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncAt: null,
      conflict: null,

      // Template cache actions
      cacheTemplates: (templates) => {
        set({ cachedTemplates: templates })
      },

      cacheTemplateItems: (items) => {
        set({ cachedTemplateItems: items })
      },

      getTemplateById: (id) => {
        return get().cachedTemplates.find((t) => t.id === id)
      },

      getTemplateItems: (templateId) => {
        return get().cachedTemplateItems.filter((i) => i.checklist_template_id === templateId)
      },

      // Execution cache actions
      cacheExecutions: (executions) => {
        set({ cachedExecutions: executions, lastSyncAt: Date.now() })
      },

      updateCachedExecution: (id, updates) => {
        set((state) => ({
          cachedExecutions: state.cachedExecutions.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }))
      },

      removeCachedExecution: (id) => {
        set((state) => ({
          cachedExecutions: state.cachedExecutions.filter((e) => e.id !== id),
        }))
      },

      // Draft execution actions
      addDraftExecution: (execution) => {
        const id = generateId()
        const now = new Date().toISOString()
        const newDraft: DraftChecklistExecution = {
          ...execution,
          id,
          status: execution.status || 'draft',
          is_completed: false,
          pause_count: 0,
          paused_duration_minutes: 0,
          score_pass: 0,
          score_fail: 0,
          score_na: 0,
          score_total: 0,
          created_at: now,
          started_at: now,
          synced: false,
          offline_responses: [],
          offline_photos: [],
          local_updates: [],
        }
        set((state) => ({
          draftExecutions: [...state.draftExecutions, newDraft],
        }))
        get().addToSyncQueue({
          entityType: 'execution',
          entityId: id,
          action: 'create',
        })
        return id
      },

      updateDraftExecution: (id, updates) => {
        set((state) => {
          const execution = state.draftExecutions.find((e) => e.id === id)
          if (!execution) {return state}

          const newUpdates: ChecklistUpdate[] = []
          Object.keys(updates).forEach((key) => {
            if (!['synced', 'sync_error', 'local_updates', 'offline_responses', 'offline_photos'].includes(key)) {
              newUpdates.push({
                field: key,
                oldValue: execution[key as keyof DraftChecklistExecution],
                newValue: updates[key as keyof DraftChecklistExecution],
                timestamp: Date.now(),
              })
            }
          })

          return {
            draftExecutions: state.draftExecutions.map((e) =>
              e.id === id
                ? {
                    ...e,
                    ...updates,
                    synced: false,
                    local_updates: [...e.local_updates, ...newUpdates],
                  }
                : e
            ),
          }
        })

        const existingItem = get().syncQueue.find(
          (item) => item.entityId === id && item.entityType === 'execution' && item.action !== 'delete'
        )
        if (!existingItem) {
          get().addToSyncQueue({
            entityType: 'execution',
            entityId: id,
            action: 'update',
          })
        }
      },

      removeDraftExecution: (id) => {
        set((state) => ({
          draftExecutions: state.draftExecutions.filter((e) => e.id !== id),
          syncQueue: state.syncQueue.filter((item) => item.entityId !== id),
        }))
      },

      markDraftSynced: (localId, serverId) => {
        set((state) => {
          const draft = state.draftExecutions.find((e) => e.id === localId)
          if (!draft) {return state}

          const { local_updates, synced, sync_error, offline_responses, offline_photos, ...executionData } = draft
          const cachedExecution: CachedChecklistExecution = {
            ...executionData,
            id: serverId || localId,
          }

          return {
            draftExecutions: state.draftExecutions.filter((e) => e.id !== localId),
            cachedExecutions: [...state.cachedExecutions, cachedExecution],
            syncQueue: state.syncQueue.filter((item) => item.entityId !== localId),
          }
        })
      },

      // Response actions
      addResponse: (executionId, response) => {
        const id = generateId()
        const now = new Date().toISOString()
        const newResponse: DraftChecklistResponse = {
          ...response,
          id,
          checklist_id: executionId,
          created_at: now,
          updated_at: now,
          synced: false,
        }

        set((state) => ({
          draftExecutions: state.draftExecutions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  offline_responses: [...e.offline_responses, newResponse],
                  synced: false,
                }
              : e
          ),
        }))

        get().addToSyncQueue({
          entityType: 'response',
          entityId: id,
          action: 'create',
        })

        return id
      },

      updateResponse: (executionId, responseId, updates) => {
        set((state) => ({
          draftExecutions: state.draftExecutions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  offline_responses: e.offline_responses.map((r) =>
                    r.id === responseId
                      ? { ...r, ...updates, updated_at: new Date().toISOString(), synced: false }
                      : r
                  ),
                  synced: false,
                }
              : e
          ),
        }))

        const existingItem = get().syncQueue.find(
          (item) => item.entityId === responseId && item.entityType === 'response'
        )
        if (!existingItem) {
          get().addToSyncQueue({
            entityType: 'response',
            entityId: responseId,
            action: 'update',
          })
        }
      },

      removeResponse: (executionId, responseId) => {
        set((state) => ({
          draftExecutions: state.draftExecutions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  offline_responses: e.offline_responses.filter((r) => r.id !== responseId),
                }
              : e
          ),
          syncQueue: state.syncQueue.filter((item) => item.entityId !== responseId),
        }))
      },

      markResponseSynced: (executionId, responseId) => {
        set((state) => ({
          draftExecutions: state.draftExecutions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  offline_responses: e.offline_responses.map((r) =>
                    r.id === responseId ? { ...r, synced: true } : r
                  ),
                }
              : e
          ),
          syncQueue: state.syncQueue.filter((item) => item.entityId !== responseId),
        }))
      },

      // Photo actions
      addPhoto: (executionId, responseId, photo) => {
        const id = generateId()
        const newPhoto: OfflinePhoto = {
          ...photo,
          id,
          responseId,
          uploadStatus: 'pending',
        }

        set((state) => ({
          draftExecutions: state.draftExecutions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  offline_photos: [...e.offline_photos, newPhoto],
                  synced: false,
                }
              : e
          ),
        }))

        get().addToSyncQueue({
          entityType: 'response',
          entityId: responseId,
          action: 'upload_photo',
          photoId: id,
        })

        return id
      },

      updatePhotoStatus: (executionId, photoId, status, serverUrl) => {
        set((state) => ({
          draftExecutions: state.draftExecutions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  offline_photos: e.offline_photos.map((p) =>
                    p.id === photoId
                      ? { ...p, uploadStatus: status, serverUrl: serverUrl || p.serverUrl }
                      : p
                  ),
                }
              : e
          ),
        }))
      },

      removePhoto: (executionId, photoId) => {
        set((state) => ({
          draftExecutions: state.draftExecutions.map((e) =>
            e.id === executionId
              ? {
                  ...e,
                  offline_photos: e.offline_photos.filter((p) => p.id !== photoId),
                }
              : e
          ),
          syncQueue: state.syncQueue.filter((item) => item.photoId !== photoId),
        }))
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

          const { executionId, serverData } = state.conflict

          switch (strategy) {
            case 'keep_local':
              return {
                conflict: null,
                syncStatus: 'idle',
              }

            case 'keep_server':
              return {
                draftExecutions: state.draftExecutions.filter((e) => e.id !== executionId),
                cachedExecutions: state.cachedExecutions.map((e) =>
                  e.id === executionId ? { ...e, ...serverData } : e
                ),
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter((item) => item.entityId !== executionId),
              }

            case 'merge': {
              const localExecution =
                state.draftExecutions.find((e) => e.id === executionId) ||
                state.cachedExecutions.find((e) => e.id === executionId)

              if (!localExecution) {
                return { conflict: null, syncStatus: 'idle' }
              }

              const merged = { ...serverData }
              Object.keys(localExecution).forEach((key) => {
                const localValue = localExecution[key as keyof typeof localExecution]
                if (localValue !== null && localValue !== undefined) {
                  (merged as Record<string, unknown>)[key] = localValue
                }
              })

              const isDraft = state.draftExecutions.some((e) => e.id === executionId)
              if (isDraft) {
                return {
                  draftExecutions: state.draftExecutions.map((e) =>
                    e.id === executionId
                      ? { ...e, ...(merged as Partial<DraftChecklistExecution>) }
                      : e
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              } else {
                return {
                  cachedExecutions: state.cachedExecutions.map((e) =>
                    e.id === executionId ? { ...e, ...merged } : e
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
      getExecutionById: (id) => {
        const state = get()
        return (
          state.draftExecutions.find((e) => e.id === id) ||
          state.cachedExecutions.find((e) => e.id === id)
        )
      },

      getAllExecutions: () => {
        const state = get()
        return [...state.draftExecutions, ...state.cachedExecutions]
      },

      getExecutionsByProject: (projectId) => {
        const state = get()
        return [
          ...state.draftExecutions.filter((e) => e.project_id === projectId),
          ...state.cachedExecutions.filter((e) => e.project_id === projectId),
        ]
      },

      getExecutionsByStatus: (status) => {
        const state = get()
        return [
          ...state.draftExecutions.filter((e) => e.status === status),
          ...state.cachedExecutions.filter((e) => e.status === status),
        ]
      },

      getInProgressExecutions: (projectId) => {
        const state = get()
        const inProgressStatuses: ChecklistStatus[] = ['draft', 'in_progress']
        const filter = (e: DraftChecklistExecution | CachedChecklistExecution) =>
          inProgressStatuses.includes(e.status) && (!projectId || e.project_id === projectId)
        return [
          ...state.draftExecutions.filter(filter),
          ...state.cachedExecutions.filter(filter),
        ]
      },

      getPendingCount: () => {
        return get().syncQueue.length
      },

      hasPendingChanges: () => {
        return get().syncQueue.length > 0 || get().draftExecutions.length > 0
      },

      clearCache: () => {
        set({
          cachedTemplates: [],
          cachedTemplateItems: [],
          cachedExecutions: [],
          lastSyncAt: null,
        })
      },
    }),
    {
      name: 'offline-checklist-store',
      version: 1,
      // Don't persist File objects
      partialize: (state) => ({
        ...state,
        draftExecutions: state.draftExecutions.map((e) => ({
          ...e,
          offline_photos: e.offline_photos.map((p) => ({
            ...p,
            file: null,
          })),
        })),
      }),
    }
  )
)
