// File: /src/features/punch-lists/store/offlinePunchStore.ts
// Offline store for punch items with local caching and sync queue
// Enhanced with subcontractor update support for Milestone 1.1

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Priority, PunchItemStatus } from '@/types/database'

/**
 * Status change request submitted by subcontractor
 */
export interface StatusChangeRequest {
  requested_status: PunchItemStatus
  reason: string
  requested_by: string
  requested_at: string
}

/**
 * Photo metadata for offline storage
 */
export interface OfflinePhoto {
  id: string
  localUrl: string // Blob URL or data URL
  file?: File // Original file for upload
  isProofOfCompletion: boolean
  caption?: string
  createdAt: string
}

/**
 * Draft punch item stored locally when offline
 */
export interface DraftPunchItem {
  id: string  // Local UUID, will be replaced on sync
  project_id: string
  title: string
  description?: string
  trade: string
  priority: Priority
  status: PunchItemStatus
  building?: string
  floor?: string
  room?: string
  area?: string
  location_notes?: string
  due_date?: string
  assigned_to?: string
  subcontractor_id?: string
  // Floor plan location
  floor_plan_location?: {
    x: number
    y: number
    documentId?: string
    sheetName?: string
  }
  // Photo URLs (local blob URLs that need to be uploaded)
  pending_photos?: string[]
  // Enhanced photo storage with metadata
  offline_photos?: OfflinePhoto[]
  // Subcontractor fields (Milestone 1.1)
  subcontractor_notes?: string
  subcontractor_updated_at?: string
  status_change_request?: StatusChangeRequest
  // Sync metadata
  created_at: string
  synced: boolean
  sync_error?: string
}

/**
 * Subcontractor update entry for offline queue
 */
export interface SubcontractorUpdate {
  id: string
  punchItemId: string
  serverId?: string // Server ID if known
  updateType: 'notes' | 'status_request' | 'proof_photo'
  data: {
    notes?: string
    statusRequest?: StatusChangeRequest
    proofPhoto?: OfflinePhoto
  }
  createdAt: string
  synced: boolean
  attempts: number
  lastAttempt?: string
  error?: string
}

/**
 * Offline punch item sync queue entry
 */
export interface PunchItemSyncEntry {
  id: string
  operation: 'create' | 'update' | 'delete' | 'subcontractor_update'
  punchItem: DraftPunchItem
  subcontractorUpdate?: SubcontractorUpdate
  attempts: number
  lastAttempt?: string
  error?: string
}

interface OfflinePunchStore {
  // Drafts stored locally
  drafts: DraftPunchItem[]
  // Sync queue
  syncQueue: PunchItemSyncEntry[]
  // Subcontractor updates queue
  subcontractorUpdates: SubcontractorUpdate[]
  // Actions
  addDraft: (draft: Omit<DraftPunchItem, 'id' | 'created_at' | 'synced'>) => string
  updateDraft: (id: string, updates: Partial<DraftPunchItem>) => void
  removeDraft: (id: string, queueServerDelete?: boolean) => void
  markSynced: (id: string, serverId?: string) => void
  markSyncError: (id: string, error: string) => void
  // Photo actions
  addPhotoToDraft: (draftId: string, photo: OfflinePhoto) => void
  removePhotoFromDraft: (draftId: string, photoId: string) => void
  updatePhotoInDraft: (draftId: string, photoId: string, updates: Partial<OfflinePhoto>) => void
  // Sync queue actions
  addToSyncQueue: (entry: Omit<PunchItemSyncEntry, 'id' | 'attempts'>) => void
  removeFromSyncQueue: (id: string) => void
  incrementAttempt: (id: string, error?: string) => void
  clearSyncQueue: () => void
  // Subcontractor actions (Milestone 1.1)
  addSubcontractorNotes: (punchItemId: string, serverId: string | undefined, notes: string) => void
  requestStatusChange: (punchItemId: string, serverId: string | undefined, request: StatusChangeRequest) => void
  addProofOfCompletionPhoto: (punchItemId: string, serverId: string | undefined, photo: OfflinePhoto) => void
  markSubcontractorUpdateSynced: (updateId: string) => void
  markSubcontractorUpdateError: (updateId: string, error: string) => void
  incrementSubcontractorAttempt: (updateId: string, error?: string) => void
  // Getters
  getPendingCount: () => number
  getDraftById: (id: string) => DraftPunchItem | undefined
  getSubcontractorUpdatesByPunchItem: (punchItemId: string) => SubcontractorUpdate[]
  getPendingSubcontractorUpdates: () => SubcontractorUpdate[]
}

export const useOfflinePunchStore = create<OfflinePunchStore>()(
  persist(
    (set, get) => ({
      drafts: [],
      syncQueue: [],
      subcontractorUpdates: [],

      addDraft: (draft) => {
        const id = uuidv4()
        const newDraft: DraftPunchItem = {
          ...draft,
          id,
          created_at: new Date().toISOString(),
          synced: false,
        }
        set((state) => ({
          drafts: [...state.drafts, newDraft],
          syncQueue: [
            ...state.syncQueue,
            {
              id: uuidv4(),
              operation: 'create',
              punchItem: newDraft,
              attempts: 0,
            },
          ],
        }))
        return id
      },

      updateDraft: (id, updates) => {
        const state = get()
        const draft = state.drafts.find((d) => d.id === id)
        if (!draft) {return}

        const updatedDraft = { ...draft, ...updates, synced: false }

        // Check if there's already a pending sync for this item
        const existingEntry = state.syncQueue.find((s) => s.punchItem.id === id)

        set({
          drafts: state.drafts.map((d) =>
            d.id === id ? updatedDraft : d
          ),
          // If item was already synced to server (has serverId), queue update operation
          // If there's already a create pending, just update the punchItem in queue
          syncQueue: existingEntry
            ? state.syncQueue.map((s) =>
                s.punchItem.id === id
                  ? { ...s, punchItem: updatedDraft }
                  : s
              )
            : draft.synced
              ? state.syncQueue // Already synced and no queue entry = no change needed
              : [...state.syncQueue, {
                  id: uuidv4(),
                  operation: 'update' as const,
                  punchItem: updatedDraft,
                  attempts: 0,
                }],
        })
      },

      removeDraft: (id, queueServerDelete = false) => {
        const state = get()
        const draft = state.drafts.find((d) => d.id === id)

        // If item was synced and we need to delete from server, queue the delete
        if (queueServerDelete && draft && draft.synced) {
          set({
            drafts: state.drafts.filter((d) => d.id !== id),
            syncQueue: [
              ...state.syncQueue.filter((s) => s.punchItem.id !== id),
              {
                id: uuidv4(),
                operation: 'delete' as const,
                punchItem: draft,
                attempts: 0,
              },
            ],
          })
        } else {
          // Just remove from local state (unsynced draft or local-only removal)
          set({
            drafts: state.drafts.filter((d) => d.id !== id),
            syncQueue: state.syncQueue.filter((s) => s.punchItem.id !== id),
          })
        }
      },

      markSynced: (id, serverId) => {
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === id ? { ...d, id: serverId || d.id, synced: true, sync_error: undefined } : d
          ),
          syncQueue: state.syncQueue.filter((s) => s.punchItem.id !== id),
        }))
      },

      markSyncError: (id, error) => {
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === id ? { ...d, sync_error: error } : d
          ),
        }))
      },

      // Photo actions
      addPhotoToDraft: (draftId, photo) => {
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  offline_photos: [...(d.offline_photos || []), photo],
                  synced: false,
                }
              : d
          ),
        }))
      },

      removePhotoFromDraft: (draftId, photoId) => {
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  offline_photos: (d.offline_photos || []).filter((p) => p.id !== photoId),
                  synced: false,
                }
              : d
          ),
        }))
      },

      updatePhotoInDraft: (draftId, photoId, updates) => {
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  offline_photos: (d.offline_photos || []).map((p) =>
                    p.id === photoId ? { ...p, ...updates } : p
                  ),
                  synced: false,
                }
              : d
          ),
        }))
      },

      addToSyncQueue: (entry) => {
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            { ...entry, id: uuidv4(), attempts: 0 },
          ],
        }))
      },

      removeFromSyncQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((s) => s.id !== id),
        }))
      },

      incrementAttempt: (id, error) => {
        set((state) => ({
          syncQueue: state.syncQueue.map((s) =>
            s.id === id
              ? {
                  ...s,
                  attempts: s.attempts + 1,
                  lastAttempt: new Date().toISOString(),
                  error,
                }
              : s
          ),
        }))
      },

      clearSyncQueue: () => {
        set({ syncQueue: [] })
      },

      // Subcontractor actions (Milestone 1.1)
      addSubcontractorNotes: (punchItemId, serverId, notes) => {
        const update: SubcontractorUpdate = {
          id: uuidv4(),
          punchItemId,
          serverId,
          updateType: 'notes',
          data: { notes },
          createdAt: new Date().toISOString(),
          synced: false,
          attempts: 0,
        }

        set((state) => ({
          subcontractorUpdates: [...state.subcontractorUpdates, update],
          // Also update local draft if exists
          drafts: state.drafts.map((d) =>
            d.id === punchItemId
              ? {
                  ...d,
                  subcontractor_notes: notes,
                  subcontractor_updated_at: new Date().toISOString(),
                }
              : d
          ),
        }))
      },

      requestStatusChange: (punchItemId, serverId, request) => {
        const update: SubcontractorUpdate = {
          id: uuidv4(),
          punchItemId,
          serverId,
          updateType: 'status_request',
          data: { statusRequest: request },
          createdAt: new Date().toISOString(),
          synced: false,
          attempts: 0,
        }

        set((state) => ({
          subcontractorUpdates: [...state.subcontractorUpdates, update],
          // Also update local draft if exists
          drafts: state.drafts.map((d) =>
            d.id === punchItemId
              ? {
                  ...d,
                  status_change_request: request,
                  subcontractor_updated_at: new Date().toISOString(),
                }
              : d
          ),
        }))
      },

      addProofOfCompletionPhoto: (punchItemId, serverId, photo) => {
        const update: SubcontractorUpdate = {
          id: uuidv4(),
          punchItemId,
          serverId,
          updateType: 'proof_photo',
          data: { proofPhoto: photo },
          createdAt: new Date().toISOString(),
          synced: false,
          attempts: 0,
        }

        set((state) => ({
          subcontractorUpdates: [...state.subcontractorUpdates, update],
          // Also add photo to local draft if exists
          drafts: state.drafts.map((d) =>
            d.id === punchItemId
              ? {
                  ...d,
                  offline_photos: [...(d.offline_photos || []), photo],
                  subcontractor_updated_at: new Date().toISOString(),
                }
              : d
          ),
        }))
      },

      markSubcontractorUpdateSynced: (updateId) => {
        set((state) => ({
          subcontractorUpdates: state.subcontractorUpdates.filter((u) => u.id !== updateId),
        }))
      },

      markSubcontractorUpdateError: (updateId, error) => {
        set((state) => ({
          subcontractorUpdates: state.subcontractorUpdates.map((u) =>
            u.id === updateId ? { ...u, error } : u
          ),
        }))
      },

      incrementSubcontractorAttempt: (updateId, error) => {
        set((state) => ({
          subcontractorUpdates: state.subcontractorUpdates.map((u) =>
            u.id === updateId
              ? {
                  ...u,
                  attempts: u.attempts + 1,
                  lastAttempt: new Date().toISOString(),
                  error,
                }
              : u
          ),
        }))
      },

      getPendingCount: () => {
        const state = get()
        return state.syncQueue.length + state.subcontractorUpdates.filter(u => !u.synced).length
      },

      getDraftById: (id) => {
        return get().drafts.find((d) => d.id === id)
      },

      getSubcontractorUpdatesByPunchItem: (punchItemId) => {
        return get().subcontractorUpdates.filter((u) => u.punchItemId === punchItemId)
      },

      getPendingSubcontractorUpdates: () => {
        return get().subcontractorUpdates.filter((u) => !u.synced)
      },
    }),
    {
      name: 'offline-punch-store',
      version: 2, // Increment version for migration
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as OfflinePunchStore
        if (version < 2) {
          // Add subcontractorUpdates array if not present
          return {
            ...state,
            subcontractorUpdates: [],
          }
        }
        return state
      },
    }
  )
)

/**
 * Hook to get pending punch items count
 */
export function usePendingPunchCount(): number {
  return useOfflinePunchStore((state) => state.syncQueue.length)
}

/**
 * Hook to get all drafts
 */
export function usePunchDrafts(): DraftPunchItem[] {
  return useOfflinePunchStore((state) => state.drafts)
}

/**
 * Hook to get unsynced drafts
 */
export function useUnsyncedPunchItems(): DraftPunchItem[] {
  return useOfflinePunchStore((state) => state.drafts.filter((d) => !d.synced))
}

/**
 * Hook to get pending subcontractor updates count
 */
export function usePendingSubcontractorUpdates(): number {
  return useOfflinePunchStore((state) => state.subcontractorUpdates.filter(u => !u.synced).length)
}
