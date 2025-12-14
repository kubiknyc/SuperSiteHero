// File: /src/features/punch-lists/store/offlinePunchStore.ts
// Offline store for punch items with local caching and sync queue

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Priority, PunchItemStatus } from '@/types/database'

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
  // Sync metadata
  created_at: string
  synced: boolean
  sync_error?: string
}

/**
 * Offline punch item sync queue entry
 */
export interface PunchItemSyncEntry {
  id: string
  operation: 'create' | 'update' | 'delete'
  punchItem: DraftPunchItem
  attempts: number
  lastAttempt?: string
  error?: string
}

interface OfflinePunchStore {
  // Drafts stored locally
  drafts: DraftPunchItem[]
  // Sync queue
  syncQueue: PunchItemSyncEntry[]
  // Actions
  addDraft: (draft: Omit<DraftPunchItem, 'id' | 'created_at' | 'synced'>) => string
  updateDraft: (id: string, updates: Partial<DraftPunchItem>) => void
  removeDraft: (id: string, queueServerDelete?: boolean) => void
  markSynced: (id: string, serverId?: string) => void
  markSyncError: (id: string, error: string) => void
  // Sync queue actions
  addToSyncQueue: (entry: Omit<PunchItemSyncEntry, 'id' | 'attempts'>) => void
  removeFromSyncQueue: (id: string) => void
  incrementAttempt: (id: string, error?: string) => void
  clearSyncQueue: () => void
  // Getters
  getPendingCount: () => number
  getDraftById: (id: string) => DraftPunchItem | undefined
}

export const useOfflinePunchStore = create<OfflinePunchStore>()(
  persist(
    (set, get) => ({
      drafts: [],
      syncQueue: [],

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
        if (!draft) return

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

      getPendingCount: () => {
        return get().syncQueue.length
      },

      getDraftById: (id) => {
        return get().drafts.find((d) => d.id === id)
      },
    }),
    {
      name: 'offline-punch-store',
      version: 1,
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
