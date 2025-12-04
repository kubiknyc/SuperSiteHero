// File: /src/stores/offline-store.ts
// Zustand store for offline state management

import { create } from 'zustand';
import type { OfflineStore, StorageQuota } from '@/types/offline';
import { StorageManager } from '@/lib/offline/storage-manager';
import { countByIndex, STORES } from '@/lib/offline/indexeddb';
import { logger } from '@/lib/utils/logger';

/**
 * Offline state store
 */
export const useOfflineStore = create<OfflineStore>((set, get) => ({
  // State
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSyncs: 0,
  isSyncing: false,
  lastSyncTime: null,
  conflictCount: 0,
  storageQuota: null,

  // Actions
  setOnline: (online: boolean) => {
    set({ isOnline: online });

    // Log status change
    logger.log(`Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);

    // If coming online, update pending syncs count
    if (online) {
      get().updatePendingSyncs();
    }
  },

  setPendingSyncs: (count: number) => {
    set({ pendingSyncs: count });
  },

  setIsSyncing: (syncing: boolean) => {
    set({ isSyncing: syncing });
  },

  setLastSyncTime: (time: number) => {
    set({ lastSyncTime: time });
  },

  setConflictCount: (count: number) => {
    set({ conflictCount: count });
  },

  updateStorageQuota: async () => {
    try {
      const quota = await StorageManager.getQuota();
      set({ storageQuota: quota });
    } catch (error) {
      logger.error('Failed to update storage quota:', error);
    }
  },

  // Helper method to update pending syncs count
  updatePendingSyncs: async () => {
    try {
      const pendingCount = await countByIndex(STORES.SYNC_QUEUE, 'status', 'pending');
      set({ pendingSyncs: pendingCount });
    } catch (error) {
      logger.error('Failed to update pending syncs count:', error);
      // Fallback: If the index query fails, just set to 0 rather than crashing
      set({ pendingSyncs: 0 });
    }
  },

  // Helper method to update conflict count
  updateConflictCount: async () => {
    try {
      // Use IDBKeyRange to query for false values, as raw boolean may cause issues
      const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', IDBKeyRange.only(false));
      set({ conflictCount });
    } catch (error) {
      logger.error('Failed to update conflict count:', error);
      // Fallback: If the index query fails, just set to 0 rather than crashing
      set({ conflictCount: 0 });
    }
  },
}));

/**
 * Initialize offline event listeners
 */
export function initOfflineListeners(): () => void {
  const { setOnline, updateStorageQuota } = useOfflineStore.getState();

  // Online/offline event listeners
  const handleOnline = () => setOnline(true);
  const handleOffline = () => setOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Update storage quota periodically (every 30 seconds)
  const storageInterval = setInterval(() => {
    updateStorageQuota();
  }, 30000);

  // Initial storage quota check
  updateStorageQuota();

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(storageInterval);
  };
}

/**
 * Hook to check if currently online
 */
export function useIsOnline(): boolean {
  return useOfflineStore((state) => state.isOnline);
}

/**
 * Hook to get pending syncs count
 */
export function usePendingSyncs(): number {
  return useOfflineStore((state) => state.pendingSyncs);
}

/**
 * Hook to check if syncing
 */
export function useIsSyncing(): boolean {
  return useOfflineStore((state) => state.isSyncing);
}

/**
 * Hook to get last sync time
 */
export function useLastSyncTime(): number | null {
  return useOfflineStore((state) => state.lastSyncTime);
}

/**
 * Hook to get conflict count
 */
export function useConflictCount(): number {
  return useOfflineStore((state) => state.conflictCount);
}

/**
 * Hook to get storage quota
 */
export function useStorageQuota(): StorageQuota | null {
  return useOfflineStore((state) => state.storageQuota);
}
