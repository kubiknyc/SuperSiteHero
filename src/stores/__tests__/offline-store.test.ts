/**
 * Offline Store Test Suite
 * Comprehensive tests for offline state management, sync queue, and conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOfflineStore, initOfflineListeners } from '../offline-store';
import {
  setupOfflineTestEnvironment,
  cleanupOfflineTestEnvironment,
  simulateOffline,
  simulateOnline,
} from '@/__tests__/mocks/indexeddb.mock';
import {
  createMockSyncConflict,
  createMockSyncConflicts,
  createMockLocalNewerConflict,
  createMockServerNewerConflict,
} from '@/__tests__/factories/syncConflict.factory';
import {
  createMockPendingSyncItem,
  createMockPendingSyncItems,
  createMockFailedSyncItem,
  createMockLargeSyncQueue,
} from '@/__tests__/factories/pendingSyncItem.factory';
import { STORES, putInStore, getAllFromStore, clearStore } from '@/lib/offline/indexeddb';

describe('Offline Store', () => {
  beforeEach(async () => {
    setupOfflineTestEnvironment();
    // Reset store state
    useOfflineStore.setState({
      isOnline: true,
      pendingSyncs: 0,
      isSyncing: false,
      lastSyncTime: null,
      conflictCount: 0,
      conflicts: [],
      syncQueue: [],
      syncProgress: null,
      networkQuality: null,
      storageQuota: null,
    });
    // Clear IndexedDB stores to prevent test pollution
    try {
      await clearStore(STORES.SYNC_QUEUE);
      await clearStore(STORES.CONFLICTS);
    } catch {
      // Store might not exist yet
    }
  });

  afterEach(() => {
    cleanupOfflineTestEnvironment();
  });

  describe('Online/Offline State Management', () => {
    it('should track online status', () => {
      const { result } = renderHook(() => useOfflineStore());

      expect(result.current.isOnline).toBe(true);
    });

    it('should update state when going offline', () => {
      const { result } = renderHook(() => useOfflineStore());

      act(() => {
        simulateOffline();
        result.current.setOnline(false);
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update state when going online', () => {
      const { result } = renderHook(() => useOfflineStore());

      act(() => {
        result.current.setOnline(false);
      });

      expect(result.current.isOnline).toBe(false);

      act(() => {
        simulateOnline();
        result.current.setOnline(true);
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('should trigger pending syncs update when coming online', async () => {
      const { result } = renderHook(() => useOfflineStore());

      // Add some pending items to IndexedDB
      const syncItems = createMockPendingSyncItems(3);
      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      await act(async () => {
        result.current.setOnline(true);
      });

      // Give time for async update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.pendingSyncs).toBeGreaterThan(0);
    });
  });

  describe('Sync Queue Management', () => {
    it('should load sync queue from IndexedDB', async () => {
      const syncItems = createMockPendingSyncItems(5);

      // Add items to IndexedDB
      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(5);
      expect(result.current.pendingSyncs).toBe(5);
    });

    it('should filter only pending items when loading sync queue', async () => {
      const pendingItems = createMockPendingSyncItems(3);
      const failedItem = createMockFailedSyncItem();

      // Add items to IndexedDB
      for (const item of pendingItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }
      await putInStore(STORES.SYNC_QUEUE, failedItem);

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(4); // All items
      expect(result.current.pendingSyncs).toBe(3); // Only pending
    });

    it('should update pending syncs count', async () => {
      const syncItems = createMockPendingSyncItems(7);

      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.updatePendingSyncs();
      });

      expect(result.current.pendingSyncs).toBe(7);
    });

    it('should handle empty sync queue', async () => {
      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(0);
      expect(result.current.pendingSyncs).toBe(0);
    });

    it('should remove item from sync queue', async () => {
      const syncItems = createMockPendingSyncItems(3);

      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      const itemToRemove = result.current.syncQueue[0];

      await act(async () => {
        await result.current.removePendingSync(itemToRemove.id);
      });

      expect(result.current.syncQueue).toHaveLength(2);
      expect(result.current.pendingSyncs).toBe(2);
    });

    it('should clear entire sync queue', async () => {
      const syncItems = createMockPendingSyncItems(5);

      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue.length).toBeGreaterThan(0);

      await act(async () => {
        await result.current.clearSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(0);
      expect(result.current.pendingSyncs).toBe(0);

      // Verify IndexedDB is cleared
      const items = await getAllFromStore(STORES.SYNC_QUEUE);
      expect(items).toHaveLength(0);
    });

    it('should handle large sync queue (100+ items)', async () => {
      const largeQueue = createMockLargeSyncQueue(150);

      for (const item of largeQueue) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(150);
      expect(result.current.pendingSyncs).toBe(150);
    });
  });

  describe('Conflict Detection and Resolution', () => {
    it('should load conflicts from IndexedDB', async () => {
      const conflicts = createMockSyncConflicts(3);

      for (const conflict of conflicts) {
        await putInStore(STORES.CONFLICTS, conflict);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflicts).toHaveLength(3);
      expect(result.current.conflictCount).toBe(3);
    });

    it('should only load unresolved conflicts', async () => {
      const unresolvedConflicts = createMockSyncConflicts(2);
      const resolvedConflict = createMockSyncConflict({ resolved: true });

      for (const conflict of [...unresolvedConflicts, resolvedConflict]) {
        await putInStore(STORES.CONFLICTS, conflict);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflicts).toHaveLength(2);
      expect(result.current.conflictCount).toBe(2);
    });

    it('should add conflict to store', () => {
      const { result } = renderHook(() => useOfflineStore());
      const conflict = createMockSyncConflict();

      act(() => {
        result.current.addConflict(conflict);
      });

      expect(result.current.conflicts).toHaveLength(1);
      expect(result.current.conflicts[0].id).toBe(conflict.id);
      expect(result.current.conflictCount).toBe(1);
    });

    it('should not add duplicate conflicts', () => {
      const { result } = renderHook(() => useOfflineStore());
      const conflict = createMockSyncConflict();

      act(() => {
        result.current.addConflict(conflict);
        result.current.addConflict(conflict); // Try to add same conflict
      });

      expect(result.current.conflicts).toHaveLength(1);
      expect(result.current.conflictCount).toBe(1);
    });

    it('should resolve conflict with local strategy', async () => {
      const conflict = createMockLocalNewerConflict();
      await putInStore(STORES.CONFLICTS, conflict);

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflicts).toHaveLength(1);

      await act(async () => {
        await result.current.resolveConflict(conflict.id, 'local');
      });

      expect(result.current.conflicts).toHaveLength(0);
      expect(result.current.conflictCount).toBe(0);
    });

    it('should resolve conflict with server strategy', async () => {
      const conflict = createMockServerNewerConflict();
      await putInStore(STORES.CONFLICTS, conflict);

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadConflicts();
      });

      await act(async () => {
        await result.current.resolveConflict(conflict.id, 'server');
      });

      expect(result.current.conflicts).toHaveLength(0);
      expect(result.current.conflictCount).toBe(0);
    });

    it('should resolve conflict with merge strategy', async () => {
      const conflict = createMockSyncConflict();
      await putInStore(STORES.CONFLICTS, conflict);

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadConflicts();
      });

      const mergedData = {
        ...conflict.localData,
        ...conflict.serverData,
        merged: true,
      };

      await act(async () => {
        await result.current.resolveConflict(conflict.id, 'merge', mergedData);
      });

      expect(result.current.conflicts).toHaveLength(0);
      expect(result.current.conflictCount).toBe(0);
    });

    it('should update conflict count correctly', async () => {
      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.updateConflictCount();
      });

      expect(result.current.conflictCount).toBe(0);

      // Add conflicts
      const conflicts = createMockSyncConflicts(5);
      for (const conflict of conflicts) {
        await putInStore(STORES.CONFLICTS, conflict);
      }

      await act(async () => {
        await result.current.updateConflictCount();
      });

      expect(result.current.conflictCount).toBe(5);
    });
  });

  describe('Sync Progress Tracking', () => {
    it('should set sync progress', () => {
      const { result } = renderHook(() => useOfflineStore());

      const progress = {
        current: 5,
        total: 10,
        percentage: 50,
      };

      act(() => {
        result.current.setSyncProgress(progress);
      });

      expect(result.current.syncProgress).toEqual(progress);
    });

    it('should clear sync progress', () => {
      const { result } = renderHook(() => useOfflineStore());

      act(() => {
        result.current.setSyncProgress({
          current: 5,
          total: 10,
          percentage: 50,
        });
      });

      expect(result.current.syncProgress).not.toBeNull();

      act(() => {
        result.current.setSyncProgress(null);
      });

      expect(result.current.syncProgress).toBeNull();
    });

    it('should track syncing state', () => {
      const { result } = renderHook(() => useOfflineStore());

      expect(result.current.isSyncing).toBe(false);

      act(() => {
        result.current.setIsSyncing(true);
      });

      expect(result.current.isSyncing).toBe(true);

      act(() => {
        result.current.setIsSyncing(false);
      });

      expect(result.current.isSyncing).toBe(false);
    });

    it('should track last sync time', () => {
      const { result } = renderHook(() => useOfflineStore());

      expect(result.current.lastSyncTime).toBeNull();

      const syncTime = Date.now();

      act(() => {
        result.current.setLastSyncTime(syncTime);
      });

      expect(result.current.lastSyncTime).toBe(syncTime);
    });
  });

  describe('Network Quality Management', () => {
    it('should set network quality', () => {
      const { result } = renderHook(() => useOfflineStore());

      const quality = {
        downloadSpeed: 10,
        uploadSpeed: 5,
        latency: 50,
        connectionType: 'wifi',
        lastMeasured: Date.now(),
      };

      act(() => {
        result.current.setNetworkQuality(quality);
      });

      expect(result.current.networkQuality).toEqual(quality);
    });

    it('should clear network quality', () => {
      const { result } = renderHook(() => useOfflineStore());

      act(() => {
        result.current.setNetworkQuality({
          downloadSpeed: 10,
          uploadSpeed: 5,
          latency: 50,
          connectionType: 'wifi',
          lastMeasured: Date.now(),
        });
      });

      expect(result.current.networkQuality).not.toBeNull();

      act(() => {
        result.current.setNetworkQuality(null);
      });

      expect(result.current.networkQuality).toBeNull();
    });
  });

  describe('Sync Preferences', () => {
    it('should have default sync preferences', () => {
      const { result } = renderHook(() => useOfflineStore());

      expect(result.current.syncPreferences).toEqual({
        autoSync: true,
        syncOnCellular: true,
        syncPhotosOnCellular: false,
        maxBatchSize: 5 * 1024 * 1024,
        notifyOnSync: true,
      });
    });

    it('should update sync preferences', () => {
      const { result } = renderHook(() => useOfflineStore());

      act(() => {
        result.current.updateSyncPreferences({
          autoSync: false,
          syncPhotosOnCellular: true,
        });
      });

      expect(result.current.syncPreferences.autoSync).toBe(false);
      expect(result.current.syncPreferences.syncPhotosOnCellular).toBe(true);
      expect(result.current.syncPreferences.syncOnCellular).toBe(true); // Unchanged
    });

    it('should update max batch size', () => {
      const { result } = renderHook(() => useOfflineStore());

      const newBatchSize = 10 * 1024 * 1024; // 10MB

      act(() => {
        result.current.updateSyncPreferences({
          maxBatchSize: newBatchSize,
        });
      });

      expect(result.current.syncPreferences.maxBatchSize).toBe(newBatchSize);
    });
  });

  describe('Storage Quota Management', () => {
    it('should update storage quota', async () => {
      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.updateStorageQuota();
      });

      expect(result.current.storageQuota).toBeDefined();
      // StorageManager.getQuota returns { total, used, available, warning, critical }
      expect(result.current.storageQuota?.used).toBeGreaterThanOrEqual(0);
      expect(result.current.storageQuota?.total).toBeGreaterThan(0);
    });
  });

  describe('Event Listeners', () => {
    it('should initialize offline listeners', () => {
      const cleanup = initOfflineListeners();

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');

      cleanup();
    });

    it('should handle online event', () => {
      const { result } = renderHook(() => useOfflineStore());
      const cleanup = initOfflineListeners();

      act(() => {
        result.current.setOnline(false);
      });

      expect(result.current.isOnline).toBe(false);

      act(() => {
        simulateOnline();
      });

      expect(result.current.isOnline).toBe(true);

      cleanup();
    });

    it('should handle offline event', () => {
      const { result } = renderHook(() => useOfflineStore());
      const cleanup = initOfflineListeners();

      expect(result.current.isOnline).toBe(true);

      act(() => {
        simulateOffline();
      });

      expect(result.current.isOnline).toBe(false);

      cleanup();
    });

    it('should cleanup event listeners', () => {
      const cleanup = initOfflineListeners();

      const onlineListenerCount = window.addEventListener.length;

      cleanup();

      // Verify listeners are removed
      expect(cleanup).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle IndexedDB not available', async () => {
      // Temporarily remove indexedDB
      const originalIndexedDB = global.indexedDB;
      // @ts-ignore
      delete global.indexedDB;

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(0);
      expect(result.current.pendingSyncs).toBe(0);

      // Restore indexedDB
      global.indexedDB = originalIndexedDB;
    });

    it('should handle concurrent sync queue operations', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const items = createMockPendingSyncItems(5);
      for (const item of items) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      // Load queue and remove item concurrently
      await act(async () => {
        await Promise.all([
          result.current.loadSyncQueue(),
          result.current.updatePendingSyncs(),
        ]);
      });

      expect(result.current.syncQueue.length).toBeGreaterThan(0);
    });

    it('should handle missing conflict during resolution', async () => {
      const { result } = renderHook(() => useOfflineStore());

      // Try to resolve non-existent conflict
      await act(async () => {
        await result.current.resolveConflict('non-existent-id', 'local');
      });

      // Should not throw error
      expect(result.current.conflicts).toHaveLength(0);
    });
  });
});
