// File: /src/features/site-instructions/store/offlineAcknowledgmentStore.ts
// Offline store for site instruction acknowledgments with local caching and sync queue

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { OfflineAcknowledgment, DeviceInfo } from '@/types/site-instruction-acknowledgment'

/**
 * Queue entry for offline acknowledgment sync
 */
export interface AcknowledgmentSyncEntry {
  id: string
  acknowledgment: OfflineAcknowledgment
  attempts: number
  lastAttempt?: string
  error?: string
}

/**
 * Capture device information for acknowledgment tracking
 */
export function captureDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isOnline: navigator.onLine,
  }
}

interface OfflineAcknowledgmentStore {
  // Acknowledgments stored offline
  acknowledgments: OfflineAcknowledgment[]

  // Actions
  addAcknowledgment: (acknowledgment: Omit<OfflineAcknowledgment, 'id' | 'created_at' | 'synced' | 'sync_attempts'>) => string
  removeAcknowledgment: (id: string) => void
  markSynced: (id: string, serverId: string) => void
  markSyncError: (id: string, error: string) => void
  incrementSyncAttempt: (id: string) => void
  updateAcknowledgment: (id: string, updates: Partial<OfflineAcknowledgment>) => void

  // Getters
  getUnsyncedAcknowledgments: () => OfflineAcknowledgment[]
  getPendingCount: () => number
  getAcknowledgmentById: (id: string) => OfflineAcknowledgment | undefined
}

export const useOfflineAcknowledgmentStore = create<OfflineAcknowledgmentStore>()(
  persist(
    (set, get) => ({
      acknowledgments: [],

      addAcknowledgment: (acknowledgment) => {
        const id = uuidv4()
        const newAcknowledgment: OfflineAcknowledgment = {
          ...acknowledgment,
          id,
          created_at: new Date().toISOString(),
          synced: false,
          sync_attempts: 0,
        }

        set((state) => ({
          acknowledgments: [...state.acknowledgments, newAcknowledgment],
        }))

        return id
      },

      removeAcknowledgment: (id) => {
        set((state) => ({
          acknowledgments: state.acknowledgments.filter((ack) => ack.id !== id),
        }))
      },

      markSynced: (id, serverId) => {
        set((state) => ({
          acknowledgments: state.acknowledgments.map((ack) =>
            ack.id === id
              ? {
                  ...ack,
                  synced: true,
                  server_id: serverId,
                  sync_error: undefined,
                }
              : ack
          ),
        }))
      },

      markSyncError: (id, error) => {
        set((state) => ({
          acknowledgments: state.acknowledgments.map((ack) =>
            ack.id === id
              ? {
                  ...ack,
                  sync_error: error,
                  last_sync_attempt: new Date().toISOString(),
                }
              : ack
          ),
        }))
      },

      incrementSyncAttempt: (id) => {
        set((state) => ({
          acknowledgments: state.acknowledgments.map((ack) =>
            ack.id === id
              ? {
                  ...ack,
                  sync_attempts: ack.sync_attempts + 1,
                  last_sync_attempt: new Date().toISOString(),
                }
              : ack
          ),
        }))
      },

      updateAcknowledgment: (id, updates) => {
        set((state) => ({
          acknowledgments: state.acknowledgments.map((ack) =>
            ack.id === id ? { ...ack, ...updates } : ack
          ),
        }))
      },

      getUnsyncedAcknowledgments: () => {
        return get().acknowledgments.filter((ack) => !ack.synced)
      },

      getPendingCount: () => {
        return get().acknowledgments.filter((ack) => !ack.synced).length
      },

      getAcknowledgmentById: (id) => {
        return get().acknowledgments.find((ack) => ack.id === id)
      },
    }),
    {
      name: 'offline-acknowledgment-store',
      version: 1,
    }
  )
)

/**
 * Hook to get pending acknowledgments count
 */
export function usePendingAcknowledgmentCount(): number {
  return useOfflineAcknowledgmentStore((state) =>
    state.acknowledgments.filter((ack) => !ack.synced).length
  )
}

/**
 * Hook to get all unsynced acknowledgments
 */
export function useUnsyncedAcknowledgments(): OfflineAcknowledgment[] {
  return useOfflineAcknowledgmentStore((state) =>
    state.acknowledgments.filter((ack) => !ack.synced)
  )
}
