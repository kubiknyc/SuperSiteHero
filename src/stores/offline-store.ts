// File: /src/stores/offline-store.ts
// Zustand store for offline state management

import { create } from 'zustand';
import type { OfflineStore, StorageQuota } from '@/types/offline';
import { StorageManager } from '@/lib/offline/storage-manager';
import { countByIndex, STORES, getAllFromStore, deleteFromStore } from '@/lib/offline/indexeddb';
import { logger } from '@/lib/utils/logger';

/**
 * Sync conflict type for conflict resolution
 */
export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localTimestamp: number;
  serverTimestamp: number;
  resolved: boolean;
  createdAt: number;
  detectedAt: number;
}

/**
 * Pending sync item type
 */
export interface PendingSyncItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  status: 'pending' | 'syncing' | 'failed';
  createdAt: number;
  timestamp: number;
  retryCount: number;
}

/**
 * Sync progress state
 */
export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
}

/**
 * Network quality metrics
 */
export interface NetworkQuality {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  latency: number; // ms
  connectionType: string;
  lastMeasured: number;
}

/**
 * User sync preferences
 */
export interface SyncPreferences {
  autoSync: boolean;
  syncOnCellular: boolean;
  syncPhotosOnCellular: boolean;
  maxBatchSize: number; // bytes
  notifyOnSync: boolean;
}

/**
 * Offline state store
 */
export const useOfflineStore = create<OfflineStore & {
  conflicts: SyncConflict[];
  syncQueue: PendingSyncItem[];
  syncProgress: SyncProgress | null;
  networkQuality: NetworkQuality | null;
  syncPreferences: SyncPreferences;
  addConflict: (conflict: SyncConflict) => void;
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: unknown) => Promise<void>;
  clearSyncQueue: () => Promise<void>;
  removePendingSync: (syncId: string) => Promise<void>;
  loadConflicts: () => Promise<void>;
  loadSyncQueue: () => Promise<void>;
  setSyncProgress: (progress: SyncProgress | null) => void;
  setNetworkQuality: (quality: NetworkQuality | null) => void;
  updateSyncPreferences: (preferences: Partial<SyncPreferences>) => void;
}>((set, get) => ({
  // State
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSyncs: 0,
  isSyncing: false,
  lastSyncTime: null,
  conflictCount: 0,
  storageQuota: null,
  conflicts: [],
  syncQueue: [],
  syncProgress: null,
  networkQuality: null,
  syncPreferences: {
    autoSync: true,
    syncOnCellular: true,
    syncPhotosOnCellular: false,
    maxBatchSize: 5 * 1024 * 1024, // 5MB default
    notifyOnSync: true,
  },

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
      // Check if IndexedDB is available
      if (typeof indexedDB === 'undefined') {
        logger.warn('IndexedDB not available, skipping pending syncs update');
        set({ pendingSyncs: 0 });
        return;
      }

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
      // Check if IndexedDB is available
      if (typeof indexedDB === 'undefined') {
        logger.warn('IndexedDB not available, skipping conflict count update');
        set({ conflictCount: 0 });
        return;
      }

      // Try to count unresolved conflicts
      // Note: Using 0 instead of false since boolean values can cause IDBKeyRange issues
      try {
        const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', false);
        set({ conflictCount });
      } catch (_indexError) {
        // If the boolean index fails, try getting all and filtering manually
        // This is expected behavior - boolean indexes can be problematic in IndexedDB
        const allConflicts = await getAllFromStore<SyncConflict>(STORES.CONFLICTS);
        const unresolvedCount = allConflicts.filter((c) => !c.resolved).length;
        set({ conflictCount: unresolvedCount });
      }
    } catch (error) {
      // Only log as warning, not error, since this is non-critical
      logger.warn('Failed to update conflict count, setting to 0:', error);
      // Fallback: If the query fails, just set to 0 rather than crashing
      set({ conflictCount: 0 });
    }
  },

  // Load conflicts from IndexedDB
  loadConflicts: async () => {
    try {
      if (typeof indexedDB === 'undefined') {
        set({ conflicts: [] });
        return;
      }
      const allConflicts = await getAllFromStore<SyncConflict>(STORES.CONFLICTS);
      const unresolvedConflicts = allConflicts.filter((c) => !c.resolved);
      set({ conflicts: unresolvedConflicts, conflictCount: unresolvedConflicts.length });
    } catch (error) {
      logger.warn('Failed to load conflicts:', error);
      set({ conflicts: [], conflictCount: 0 });
    }
  },

  // Load sync queue from IndexedDB
  loadSyncQueue: async () => {
    try {
      if (typeof indexedDB === 'undefined') {
        set({ syncQueue: [], pendingSyncs: 0 });
        return;
      }
      const allItems = await getAllFromStore<PendingSyncItem>(STORES.SYNC_QUEUE);
      const pendingItems = allItems.filter((item) => item.status === 'pending');
      set({ syncQueue: allItems, pendingSyncs: pendingItems.length });
    } catch (error) {
      logger.warn('Failed to load sync queue:', error);
      set({ syncQueue: [], pendingSyncs: 0 });
    }
  },

  // Add a conflict to the store
  addConflict: (conflict: SyncConflict) => {
    const { conflicts } = get();
    // Check if conflict already exists
    if (!conflicts.find(c => c.id === conflict.id)) {
      set({
        conflicts: [...conflicts, conflict],
        conflictCount: conflicts.length + 1
      });
    }
  },

  // Resolve a conflict
  resolveConflict: async (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: unknown) => {
    try {
      // Mark conflict as resolved in IndexedDB
      const { getFromStore, putInStore } = await import('@/lib/offline/indexeddb');
      const conflict = await getFromStore<SyncConflict>(STORES.CONFLICTS, conflictId);
      if (conflict) {
        await putInStore(STORES.CONFLICTS, { ...conflict, resolved: true });
      }

      // Remove from local state
      const { conflicts } = get();
      const updatedConflicts = conflicts.filter((c) => c.id !== conflictId);
      set({ conflicts: updatedConflicts, conflictCount: updatedConflicts.length });

      logger.log(`Conflict ${conflictId} resolved with: ${resolution}`);
    } catch (error) {
      logger.error('Failed to resolve conflict:', error);
      throw error;
    }
  },

  // Clear all items from sync queue
  clearSyncQueue: async () => {
    try {
      const { clearStore } = await import('@/lib/offline/indexeddb');
      await clearStore(STORES.SYNC_QUEUE);
      set({ syncQueue: [], pendingSyncs: 0 });
      logger.log('Sync queue cleared');
    } catch (error) {
      logger.error('Failed to clear sync queue:', error);
      throw error;
    }
  },

  // Remove a single item from sync queue
  removePendingSync: async (syncId: string) => {
    try {
      await deleteFromStore(STORES.SYNC_QUEUE, syncId);
      const { syncQueue } = get();
      const updatedQueue = syncQueue.filter((item) => item.id !== syncId);
      const pendingCount = updatedQueue.filter((item) => item.status === 'pending').length;
      set({ syncQueue: updatedQueue, pendingSyncs: pendingCount });
      logger.log(`Removed sync item: ${syncId}`);
    } catch (error) {
      logger.error('Failed to remove pending sync:', error);
      throw error;
    }
  },

  // Sync progress actions
  setSyncProgress: (progress) => {
    set({ syncProgress: progress });
  },

  // Network quality actions
  setNetworkQuality: (quality) => {
    set({ networkQuality: quality });
  },

  // Sync preferences actions
  updateSyncPreferences: (preferences) => {
    set((state) => ({
      syncPreferences: { ...state.syncPreferences, ...preferences },
    }));
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

/**
 * Hook to get sync progress
 */
export function useSyncProgress(): SyncProgress | null {
  return useOfflineStore((state) => state.syncProgress);
}

/**
 * Hook to get network quality
 */
export function useNetworkQuality(): NetworkQuality | null {
  return useOfflineStore((state) => state.networkQuality);
}

/**
 * Hook to get sync preferences
 */
export function useSyncPreferences(): SyncPreferences {
  return useOfflineStore((state) => state.syncPreferences);
}
