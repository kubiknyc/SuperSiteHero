// Offline store for documents with local caching and sync queue
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Draft document for offline creation
 */
export interface DraftDocument {
  id: string
  project_id: string
  name: string
  file_name: string
  file_url: string
  document_type: string
  // Optional fields
  description?: string | null
  folder_id?: string | null
  version?: string | null
  revision?: string | null
  status?: string | null
  discipline?: string | null
  document_number?: string | null
  drawing_number?: string | null
  specification_section?: string | null
  issue_date?: string | null
  received_date?: string | null
  is_pinned?: boolean | null
  visible_to_subcontractors?: boolean | null
  requires_approval?: boolean | null
  file_size?: number | null
  file_type?: string | null
  supersedes_document_id?: string | null
  // Offline tracking
  synced: boolean
  sync_error?: string
  created_at: string
  // Track field changes for conflict resolution
  local_updates: DocumentUpdate[]
  // Offline file storage
  offline_file?: File | null
  offline_thumbnail_url?: string | null
}

/**
 * Track individual field updates for conflict resolution
 */
export interface DocumentUpdate {
  field: string
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

/**
 * Cached document from server
 */
export interface CachedDocument {
  id: string
  project_id: string
  name: string
  file_name: string
  file_url: string
  document_type: string
  description?: string | null
  folder_id?: string | null
  version?: string | null
  revision?: string | null
  status?: string | null
  discipline?: string | null
  document_number?: string | null
  drawing_number?: string | null
  specification_section?: string | null
  issue_date?: string | null
  received_date?: string | null
  is_pinned?: boolean | null
  is_latest_version?: boolean | null
  visible_to_subcontractors?: boolean | null
  requires_approval?: boolean | null
  file_size?: number | null
  file_type?: string | null
  supersedes_document_id?: string | null
  ai_processed?: boolean | null
  ai_processed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
}

/**
 * Sync queue item for tracking pending operations
 */
export interface DocumentSyncQueueItem {
  id: string
  documentId: string
  action: 'create' | 'update' | 'delete' | 'upload_file'
  timestamp: number
  retries: number
  lastError?: string
  lastKnownUpdatedAt?: string
  // File upload specific
  uploadProgress?: number
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface DocumentConflictInfo {
  documentId: string
  localUpdatedAt: number
  serverUpdatedAt: string
  serverData: Partial<CachedDocument>
}

interface OfflineDocumentStore {
  // Cached documents from server
  cachedDocuments: CachedDocument[]
  // Draft documents created offline
  draftDocuments: DraftDocument[]
  // Sync queue for pending operations
  syncQueue: DocumentSyncQueueItem[]
  // Sync status
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncAt: number | null
  // Conflict state
  conflict: DocumentConflictInfo | null

  // Cache actions
  cacheDocuments: (documents: CachedDocument[]) => void
  updateCachedDocument: (id: string, updates: Partial<CachedDocument>) => void
  removeCachedDocument: (id: string) => void
  clearCache: () => void

  // Draft actions
  addDraftDocument: (
    document: Omit<DraftDocument, 'id' | 'created_at' | 'synced' | 'local_updates'>
  ) => string
  updateDraftDocument: (id: string, updates: Partial<DraftDocument>) => void
  removeDraftDocument: (id: string) => void
  markDraftSynced: (localId: string, serverId?: string) => void

  // Sync queue actions
  addToSyncQueue: (item: Omit<DocumentSyncQueueItem, 'id' | 'timestamp' | 'retries'>) => void
  removeFromSyncQueue: (id: string) => void
  updateSyncQueueItem: (id: string, updates: Partial<DocumentSyncQueueItem>) => void

  // Sync status actions
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  setLastSyncAt: (timestamp: number) => void

  // Conflict resolution
  setConflict: (conflict: DocumentConflictInfo | null) => void
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void

  // Getters
  getDocumentById: (id: string) => CachedDocument | DraftDocument | undefined
  getAllDocuments: () => (CachedDocument | DraftDocument)[]
  getDocumentsByProject: (projectId: string) => (CachedDocument | DraftDocument)[]
  getDocumentsByFolder: (folderId: string | null) => (CachedDocument | DraftDocument)[]
  getDocumentsByType: (documentType: string) => (CachedDocument | DraftDocument)[]
  getPinnedDocuments: (projectId: string) => (CachedDocument | DraftDocument)[]
  getPendingCount: () => number
  hasPendingChanges: () => boolean
}

const generateId = () => crypto.randomUUID()

export const useOfflineDocumentStore = create<OfflineDocumentStore>()(
  persist(
    (set, get) => ({
      cachedDocuments: [],
      draftDocuments: [],
      syncQueue: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncAt: null,
      conflict: null,

      // Cache actions
      cacheDocuments: (documents) => {
        set({ cachedDocuments: documents, lastSyncAt: Date.now() })
      },

      updateCachedDocument: (id, updates) => {
        set((state) => ({
          cachedDocuments: state.cachedDocuments.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        }))
      },

      removeCachedDocument: (id) => {
        set((state) => ({
          cachedDocuments: state.cachedDocuments.filter((d) => d.id !== id),
        }))
      },

      clearCache: () => {
        set({ cachedDocuments: [], lastSyncAt: null })
      },

      // Draft actions
      addDraftDocument: (document) => {
        const id = generateId()
        const newDraft: DraftDocument = {
          ...document,
          id,
          status: document.status || 'active',
          created_at: new Date().toISOString(),
          synced: false,
          local_updates: [],
        }
        set((state) => ({
          draftDocuments: [...state.draftDocuments, newDraft],
        }))
        get().addToSyncQueue({
          documentId: id,
          action: 'create',
        })
        return id
      },

      updateDraftDocument: (id, updates) => {
        set((state) => {
          const document = state.draftDocuments.find((d) => d.id === id)
          if (!document) {return state}

          // Track field updates for conflict resolution
          const newUpdates: DocumentUpdate[] = []
          Object.keys(updates).forEach((key) => {
            if (key !== 'synced' && key !== 'sync_error' && key !== 'local_updates') {
              newUpdates.push({
                field: key,
                oldValue: document[key as keyof DraftDocument],
                newValue: updates[key as keyof DraftDocument],
                timestamp: Date.now(),
              })
            }
          })

          return {
            draftDocuments: state.draftDocuments.map((d) =>
              d.id === id
                ? {
                    ...d,
                    ...updates,
                    synced: false,
                    local_updates: [...d.local_updates, ...newUpdates],
                  }
                : d
            ),
          }
        })

        const existingItem = get().syncQueue.find(
          (item) => item.documentId === id && item.action !== 'delete'
        )
        if (!existingItem) {
          get().addToSyncQueue({
            documentId: id,
            action: 'update',
          })
        }
      },

      removeDraftDocument: (id) => {
        set((state) => ({
          draftDocuments: state.draftDocuments.filter((d) => d.id !== id),
          syncQueue: state.syncQueue.filter((item) => item.documentId !== id),
        }))
      },

      markDraftSynced: (localId, serverId) => {
        set((state) => {
          const draft = state.draftDocuments.find((d) => d.id === localId)
          if (!draft) {return state}

          const { local_updates, synced, sync_error, offline_file, offline_thumbnail_url, ...documentData } = draft
          const cachedDocument: CachedDocument = {
            ...documentData,
            id: serverId || localId,
          }

          return {
            draftDocuments: state.draftDocuments.filter((d) => d.id !== localId),
            cachedDocuments: [...state.cachedDocuments, cachedDocument],
            syncQueue: state.syncQueue.filter((item) => item.documentId !== localId),
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

          const { documentId, serverData } = state.conflict

          switch (strategy) {
            case 'keep_local':
              return {
                conflict: null,
                syncStatus: 'idle',
              }

            case 'keep_server':
              return {
                draftDocuments: state.draftDocuments.filter((d) => d.id !== documentId),
                cachedDocuments: state.cachedDocuments.map((d) =>
                  d.id === documentId ? { ...d, ...serverData } : d
                ),
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter((item) => item.documentId !== documentId),
              }

            case 'merge': {
              const localDocument =
                state.draftDocuments.find((d) => d.id === documentId) ||
                state.cachedDocuments.find((d) => d.id === documentId)

              if (!localDocument) {
                return { conflict: null, syncStatus: 'idle' }
              }

              // Server data as base, local non-null values override
              const merged = { ...serverData }
              Object.keys(localDocument).forEach((key) => {
                const localValue = localDocument[key as keyof typeof localDocument]
                if (localValue !== null && localValue !== undefined) {
                  (merged as Record<string, unknown>)[key] = localValue
                }
              })

              const isDraft = state.draftDocuments.some((d) => d.id === documentId)
              if (isDraft) {
                return {
                  draftDocuments: state.draftDocuments.map((d) =>
                    d.id === documentId ? { ...d, ...(merged as Partial<DraftDocument>) } : d
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              } else {
                return {
                  cachedDocuments: state.cachedDocuments.map((d) =>
                    d.id === documentId ? { ...d, ...merged } : d
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
      getDocumentById: (id) => {
        const state = get()
        return (
          state.draftDocuments.find((d) => d.id === id) ||
          state.cachedDocuments.find((d) => d.id === id)
        )
      },

      getAllDocuments: () => {
        const state = get()
        return [...state.draftDocuments, ...state.cachedDocuments]
      },

      getDocumentsByProject: (projectId) => {
        const state = get()
        return [
          ...state.draftDocuments.filter((d) => d.project_id === projectId),
          ...state.cachedDocuments.filter((d) => d.project_id === projectId),
        ]
      },

      getDocumentsByFolder: (folderId) => {
        const state = get()
        return [
          ...state.draftDocuments.filter((d) => d.folder_id === folderId),
          ...state.cachedDocuments.filter((d) => d.folder_id === folderId),
        ]
      },

      getDocumentsByType: (documentType) => {
        const state = get()
        return [
          ...state.draftDocuments.filter((d) => d.document_type === documentType),
          ...state.cachedDocuments.filter((d) => d.document_type === documentType),
        ]
      },

      getPinnedDocuments: (projectId) => {
        const state = get()
        return [
          ...state.draftDocuments.filter((d) => d.project_id === projectId && d.is_pinned),
          ...state.cachedDocuments.filter((d) => d.project_id === projectId && d.is_pinned),
        ]
      },

      getPendingCount: () => {
        return get().syncQueue.length
      },

      hasPendingChanges: () => {
        return get().syncQueue.length > 0 || get().draftDocuments.length > 0
      },
    }),
    {
      name: 'offline-document-store',
      version: 1,
      // Don't persist File objects - they can't be serialized
      partialize: (state) => ({
        ...state,
        draftDocuments: state.draftDocuments.map((d) => ({
          ...d,
          offline_file: null, // Can't persist File objects
        })),
      }),
    }
  )
)
