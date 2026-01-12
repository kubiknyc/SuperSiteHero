// Offline store for workflow items (RFIs, Submittals, Change Orders)
// Handles offline creation, updates, and sync with conflict resolution
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Workflow type identifiers
 */
export type WorkflowTypeCode = 'rfi' | 'submittal' | 'change_order' | 'other'

/**
 * Attachment for workflow items (photos, documents)
 */
export interface OfflineWorkflowAttachment {
  id: string
  localUrl: string
  file?: File
  fileName: string
  fileType: string
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'
  serverUrl?: string
}

/**
 * Response/comment on a workflow item
 */
export interface OfflineWorkflowResponse {
  id: string
  content: string
  respondedBy: string
  respondedAt: string
  attachments: OfflineWorkflowAttachment[]
  synced: boolean
}

/**
 * Draft workflow item for offline creation
 */
export interface DraftWorkflowItem {
  id: string
  project_id: string
  workflow_type_id: string
  workflow_type_code?: WorkflowTypeCode
  title: string
  // Core fields
  description?: string | null
  status: string
  priority?: string | null
  discipline?: string | null
  // Assignment and tracking
  assignees?: string[] | null
  raised_by?: string | null
  // Dates
  opened_date?: string | null
  due_date?: string | null
  closed_date?: string | null
  // Impact assessment
  cost_impact?: number | null
  schedule_impact?: number | null
  // Reference and resolution
  number?: number | null
  reference_number?: string | null
  resolution?: string | null
  more_information?: string | null
  // Offline-specific
  offline_attachments: OfflineWorkflowAttachment[]
  offline_responses: OfflineWorkflowResponse[]
  synced: boolean
  sync_error?: string
  created_at: string
}

/**
 * Cached workflow item from server
 */
export interface CachedWorkflowItem {
  id: string
  project_id: string
  workflow_type_id: string
  title: string
  description?: string | null
  status: string
  priority?: string | null
  discipline?: string | null
  assignees?: string[] | null
  raised_by?: string | null
  opened_date?: string | null
  due_date?: string | null
  closed_date?: string | null
  cost_impact?: number | null
  schedule_impact?: number | null
  number?: number | null
  reference_number?: string | null
  resolution?: string | null
  more_information?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
}

/**
 * Sync queue item
 */
export interface WorkflowSyncQueueItem {
  id: string
  workflowItemId: string
  action: 'create' | 'update' | 'delete' | 'add_response'
  timestamp: number
  retries: number
  lastError?: string
  lastKnownUpdatedAt?: string
  // For response actions
  responseId?: string
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface WorkflowConflictInfo {
  workflowItemId: string
  localUpdatedAt: number
  serverUpdatedAt: string
  serverData: Partial<CachedWorkflowItem>
}

interface OfflineWorkflowStore {
  // Cached items from server
  cachedItems: CachedWorkflowItem[]
  // Draft items created offline
  draftItems: DraftWorkflowItem[]
  // Sync queue
  syncQueue: WorkflowSyncQueueItem[]
  // Status
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncAt: number | null
  // Conflict
  conflict: WorkflowConflictInfo | null

  // Cache actions
  cacheItems: (items: CachedWorkflowItem[]) => void
  updateCachedItem: (id: string, updates: Partial<CachedWorkflowItem>) => void
  removeCachedItem: (id: string) => void
  clearCache: () => void

  // Draft actions
  addDraftItem: (
    item: Omit<DraftWorkflowItem, 'id' | 'created_at' | 'synced' | 'offline_attachments' | 'offline_responses'>
  ) => string
  updateDraftItem: (id: string, updates: Partial<DraftWorkflowItem>) => void
  removeDraftItem: (id: string) => void
  markDraftSynced: (localId: string, serverId?: string) => void

  // Attachment actions
  addAttachment: (itemId: string, attachment: Omit<OfflineWorkflowAttachment, 'uploadStatus'>) => void
  updateAttachmentStatus: (
    itemId: string,
    attachmentId: string,
    status: OfflineWorkflowAttachment['uploadStatus'],
    serverUrl?: string
  ) => void
  removeAttachment: (itemId: string, attachmentId: string) => void

  // Response actions (for RFI responses, submittal reviews, etc.)
  addResponse: (itemId: string, response: Omit<OfflineWorkflowResponse, 'synced'>) => void
  markResponseSynced: (itemId: string, responseId: string) => void

  // Sync queue actions
  addToSyncQueue: (item: Omit<WorkflowSyncQueueItem, 'id' | 'timestamp' | 'retries'>) => void
  removeFromSyncQueue: (id: string) => void
  updateSyncQueueItem: (id: string, updates: Partial<WorkflowSyncQueueItem>) => void

  // Status actions
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  setLastSyncAt: (timestamp: number) => void

  // Conflict resolution
  setConflict: (conflict: WorkflowConflictInfo | null) => void
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void

  // Getters
  getItemById: (id: string) => CachedWorkflowItem | DraftWorkflowItem | undefined
  getAllItems: () => (CachedWorkflowItem | DraftWorkflowItem)[]
  getItemsByProject: (projectId: string) => (CachedWorkflowItem | DraftWorkflowItem)[]
  getItemsByType: (workflowTypeId: string) => (CachedWorkflowItem | DraftWorkflowItem)[]
  getItemsByStatus: (status: string) => (CachedWorkflowItem | DraftWorkflowItem)[]
  getRFIs: () => (CachedWorkflowItem | DraftWorkflowItem)[]
  getSubmittals: () => (CachedWorkflowItem | DraftWorkflowItem)[]
  getChangeOrders: () => (CachedWorkflowItem | DraftWorkflowItem)[]
  getPendingCount: () => number
  hasPendingChanges: () => boolean
}

const generateId = () => crypto.randomUUID()

// Common workflow type IDs (these should match your database)
const WORKFLOW_TYPE_PATTERNS = {
  rfi: ['rfi', 'request for information'],
  submittal: ['submittal', 'shop drawing'],
  change_order: ['change order', 'co', 'change_order'],
}

function detectWorkflowTypeCode(typeId: string, title?: string): WorkflowTypeCode {
  const lowerTypeId = typeId.toLowerCase()
  const lowerTitle = (title || '').toLowerCase()

  for (const [code, patterns] of Object.entries(WORKFLOW_TYPE_PATTERNS)) {
    if (patterns.some((p) => lowerTypeId.includes(p) || lowerTitle.includes(p))) {
      return code as WorkflowTypeCode
    }
  }
  return 'other'
}

export const useOfflineWorkflowStore = create<OfflineWorkflowStore>()(
  persist(
    (set, get) => ({
      cachedItems: [],
      draftItems: [],
      syncQueue: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncAt: null,
      conflict: null,

      // Cache actions
      cacheItems: (items) => {
        set({ cachedItems: items, lastSyncAt: Date.now() })
      },

      updateCachedItem: (id, updates) => {
        set((state) => ({
          cachedItems: state.cachedItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }))
      },

      removeCachedItem: (id) => {
        set((state) => ({
          cachedItems: state.cachedItems.filter((item) => item.id !== id),
        }))
      },

      clearCache: () => {
        set({ cachedItems: [], lastSyncAt: null })
      },

      // Draft actions
      addDraftItem: (item) => {
        const id = generateId()
        const typeCode = detectWorkflowTypeCode(item.workflow_type_id, item.title)
        const newDraft: DraftWorkflowItem = {
          ...item,
          id,
          workflow_type_code: typeCode,
          status: item.status || 'open',
          opened_date: item.opened_date || new Date().toISOString(),
          created_at: new Date().toISOString(),
          synced: false,
          offline_attachments: [],
          offline_responses: [],
        }
        set((state) => ({
          draftItems: [...state.draftItems, newDraft],
        }))
        get().addToSyncQueue({
          workflowItemId: id,
          action: 'create',
        })
        return id
      },

      updateDraftItem: (id, updates) => {
        set((state) => ({
          draftItems: state.draftItems.map((item) =>
            item.id === id ? { ...item, ...updates, synced: false } : item
          ),
        }))

        const existingItem = get().syncQueue.find(
          (item) => item.workflowItemId === id && item.action !== 'delete'
        )
        if (!existingItem) {
          get().addToSyncQueue({
            workflowItemId: id,
            action: 'update',
          })
        }
      },

      removeDraftItem: (id) => {
        set((state) => ({
          draftItems: state.draftItems.filter((item) => item.id !== id),
          syncQueue: state.syncQueue.filter((item) => item.workflowItemId !== id),
        }))
      },

      markDraftSynced: (localId, serverId) => {
        set((state) => {
          const draft = state.draftItems.find((item) => item.id === localId)
          if (!draft) {return state}

          const {
            offline_attachments,
            offline_responses,
            synced,
            sync_error,
            workflow_type_code,
            ...itemData
          } = draft
          const cachedItem: CachedWorkflowItem = {
            ...itemData,
            id: serverId || localId,
          }

          return {
            draftItems: state.draftItems.filter((item) => item.id !== localId),
            cachedItems: [...state.cachedItems, cachedItem],
            syncQueue: state.syncQueue.filter((item) => item.workflowItemId !== localId),
          }
        })
      },

      // Attachment actions
      addAttachment: (itemId, attachment) => {
        set((state) => ({
          draftItems: state.draftItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  offline_attachments: [
                    ...item.offline_attachments,
                    { ...attachment, uploadStatus: 'pending' as const },
                  ],
                }
              : item
          ),
        }))
      },

      updateAttachmentStatus: (itemId, attachmentId, status, serverUrl) => {
        set((state) => ({
          draftItems: state.draftItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  offline_attachments: item.offline_attachments.map((a) =>
                    a.id === attachmentId
                      ? { ...a, uploadStatus: status, serverUrl: serverUrl || a.serverUrl }
                      : a
                  ),
                }
              : item
          ),
        }))
      },

      removeAttachment: (itemId, attachmentId) => {
        set((state) => ({
          draftItems: state.draftItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  offline_attachments: item.offline_attachments.filter(
                    (a) => a.id !== attachmentId
                  ),
                }
              : item
          ),
        }))
      },

      // Response actions
      addResponse: (itemId, response) => {
        set((state) => ({
          draftItems: state.draftItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  offline_responses: [...item.offline_responses, { ...response, synced: false }],
                }
              : item
          ),
        }))

        get().addToSyncQueue({
          workflowItemId: itemId,
          action: 'add_response',
          responseId: response.id,
        })
      },

      markResponseSynced: (itemId, responseId) => {
        set((state) => ({
          draftItems: state.draftItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  offline_responses: item.offline_responses.map((r) =>
                    r.id === responseId ? { ...r, synced: true } : r
                  ),
                }
              : item
          ),
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

      // Status actions
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

          const { workflowItemId, serverData } = state.conflict

          switch (strategy) {
            case 'keep_local':
              return {
                conflict: null,
                syncStatus: 'idle',
              }

            case 'keep_server':
              return {
                draftItems: state.draftItems.filter((item) => item.id !== workflowItemId),
                cachedItems: state.cachedItems.map((item) =>
                  item.id === workflowItemId ? { ...item, ...serverData } : item
                ),
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter(
                  (item) => item.workflowItemId !== workflowItemId
                ),
              }

            case 'merge': {
              const localItem =
                state.draftItems.find((item) => item.id === workflowItemId) ||
                state.cachedItems.find((item) => item.id === workflowItemId)

              if (!localItem) {
                return { conflict: null, syncStatus: 'idle' }
              }

              const merged = { ...serverData }
              Object.keys(localItem).forEach((key) => {
                const localValue = localItem[key as keyof typeof localItem]
                if (localValue !== null && localValue !== undefined) {
                  (merged as Record<string, unknown>)[key] = localValue
                }
              })

              const isDraft = state.draftItems.some((item) => item.id === workflowItemId)
              if (isDraft) {
                return {
                  draftItems: state.draftItems.map((item) =>
                    item.id === workflowItemId
                      ? { ...item, ...(merged as Partial<DraftWorkflowItem>) }
                      : item
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              } else {
                return {
                  cachedItems: state.cachedItems.map((item) =>
                    item.id === workflowItemId ? { ...item, ...merged } : item
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
      getItemById: (id) => {
        const state = get()
        return (
          state.draftItems.find((item) => item.id === id) ||
          state.cachedItems.find((item) => item.id === id)
        )
      },

      getAllItems: () => {
        const state = get()
        return [...state.draftItems, ...state.cachedItems]
      },

      getItemsByProject: (projectId) => {
        const state = get()
        return [
          ...state.draftItems.filter((item) => item.project_id === projectId),
          ...state.cachedItems.filter((item) => item.project_id === projectId),
        ]
      },

      getItemsByType: (workflowTypeId) => {
        const state = get()
        return [
          ...state.draftItems.filter((item) => item.workflow_type_id === workflowTypeId),
          ...state.cachedItems.filter((item) => item.workflow_type_id === workflowTypeId),
        ]
      },

      getItemsByStatus: (status) => {
        const state = get()
        return [
          ...state.draftItems.filter((item) => item.status === status),
          ...state.cachedItems.filter((item) => item.status === status),
        ]
      },

      getRFIs: () => {
        const state = get()
        return [
          ...state.draftItems.filter((item) => item.workflow_type_code === 'rfi'),
          ...state.cachedItems.filter((item) =>
            detectWorkflowTypeCode(item.workflow_type_id) === 'rfi'
          ),
        ]
      },

      getSubmittals: () => {
        const state = get()
        return [
          ...state.draftItems.filter((item) => item.workflow_type_code === 'submittal'),
          ...state.cachedItems.filter((item) =>
            detectWorkflowTypeCode(item.workflow_type_id) === 'submittal'
          ),
        ]
      },

      getChangeOrders: () => {
        const state = get()
        return [
          ...state.draftItems.filter((item) => item.workflow_type_code === 'change_order'),
          ...state.cachedItems.filter((item) =>
            detectWorkflowTypeCode(item.workflow_type_id) === 'change_order'
          ),
        ]
      },

      getPendingCount: () => {
        return get().syncQueue.length
      },

      hasPendingChanges: () => {
        return get().syncQueue.length > 0 || get().draftItems.length > 0
      },
    }),
    {
      name: 'offline-workflow-store',
      version: 1,
    }
  )
)
