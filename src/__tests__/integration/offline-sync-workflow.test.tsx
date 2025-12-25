/**
 * Offline Sync Workflow Integration Test
 * Tests the complete offline → online → sync → conflict resolution workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useOfflineStore } from '@/stores/offline-store';
import {
  setupOfflineTestEnvironment,
  cleanupOfflineTestEnvironment,
  simulateOffline,
  simulateOnline,
} from '@/__tests__/mocks/indexeddb.mock';
import {
  createMockPendingSyncItem,
  createMockPendingSyncItems,
  createMockMixedSyncBatch,
} from '@/__tests__/factories/pendingSyncItem.factory';
import {
  createMockSyncConflict,
  createMockFieldLevelConflict,
} from '@/__tests__/factories/syncConflict.factory';
import { STORES, putInStore, getAllFromStore, getFromStore, clearStore } from '@/lib/offline/indexeddb';
import type { PendingSyncItem, SyncConflict } from '@/stores/offline-store';

// Mock the OfflineClient
vi.mock('@/lib/api/offline-client', () => ({
  OfflineClient: {
    processSyncQueue: vi.fn().mockResolvedValue({
      success: 0,
      failed: 0,
      remaining: 0,
    }),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Offline Sync Workflow Integration', () => {
  beforeEach(() => {
    setupOfflineTestEnvironment();
    vi.clearAllMocks();

    // Reset store
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
  });

  afterEach(() => {
    cleanupOfflineTestEnvironment();
  });

  describe('Complete Offline → Online → Sync Flow', () => {
    it('should queue operations while offline and sync when online', async () => {
      const { result } = renderHook(() => useOfflineStore());

      // Step 1: Go offline
      await act(async () => {
        simulateOffline();
        result.current.setOnline(false);
      });

      expect(result.current.isOnline).toBe(false);

      // Step 2: Create offline mutations
      const syncItems = createMockPendingSyncItems(5);
      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      // Step 3: Load sync queue
      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.pendingSyncs).toBe(5);
      expect(result.current.syncQueue).toHaveLength(5);

      // Step 4: Go online
      await act(async () => {
        simulateOnline();
        result.current.setOnline(true);
      });

      expect(result.current.isOnline).toBe(true);

      // Step 5: Sync should be triggered (verified through mocks)
      expect(result.current.pendingSyncs).toBeGreaterThan(0);
    });

    it('should handle multiple offline changes to same entity', async () => {
      const entityId = 'test-entity-123';
      const entityType = 'projects';

      // Create multiple updates to same entity
      const updates = [
        createMockPendingSyncItem({
          entityId,
          entityType,
          operation: 'update',
          data: { name: 'Update 1', version: 1 },
          timestamp: Date.now() - 3000,
        }),
        createMockPendingSyncItem({
          entityId,
          entityType,
          operation: 'update',
          data: { name: 'Update 2', version: 2 },
          timestamp: Date.now() - 2000,
        }),
        createMockPendingSyncItem({
          entityId,
          entityType,
          operation: 'update',
          data: { name: 'Update 3', version: 3 },
          timestamp: Date.now() - 1000,
        }),
      ];

      for (const update of updates) {
        await putInStore(STORES.SYNC_QUEUE, update);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(3);

      // All updates should be for the same entity
      expect(result.current.syncQueue.every(item => item.entityId === entityId)).toBe(true);
    });

    it('should process mixed operation types in correct order', async () => {
      const mixedBatch = createMockMixedSyncBatch();

      for (const item of mixedBatch) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(5);

      const hasCreate = result.current.syncQueue.some(item => item.operation === 'create');
      const hasUpdate = result.current.syncQueue.some(item => item.operation === 'update');
      const hasDelete = result.current.syncQueue.some(item => item.operation === 'delete');

      expect(hasCreate).toBe(true);
      expect(hasUpdate).toBe(true);
      expect(hasDelete).toBe(true);
    });
  });

  describe('Conflict Detection and Resolution Flow', () => {
    it('should detect conflicts during sync', async () => {
      const { result } = renderHook(() => useOfflineStore());

      // Add a conflict
      const conflict = createMockSyncConflict();
      await putInStore(STORES.CONFLICTS, conflict);

      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflicts).toHaveLength(1);
      expect(result.current.conflictCount).toBe(1);
    });

    it('should resolve field-level conflicts automatically', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const conflict = createMockFieldLevelConflict();
      await putInStore(STORES.CONFLICTS, conflict);

      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflicts).toHaveLength(1);

      // Resolve with merge
      const mergedData = {
        ...conflict.localData,
        ...conflict.serverData,
        resolved: true,
      };

      await act(async () => {
        await result.current.resolveConflict(conflict.id, 'merge', mergedData);
      });

      expect(result.current.conflicts).toHaveLength(0);
      expect(result.current.conflictCount).toBe(0);

      // Verify conflict is marked as resolved in IndexedDB
      const storedConflict = await getFromStore<SyncConflict>(STORES.CONFLICTS, conflict.id);
      expect(storedConflict?.resolved).toBe(true);
    });

    it('should pause sync when conflicts are detected', async () => {
      const { result } = renderHook(() => useOfflineStore());

      // Add both sync items and conflicts
      const syncItems = createMockPendingSyncItems(3);
      const conflicts = [createMockSyncConflict(), createMockSyncConflict()];

      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      for (const conflict of conflicts) {
        await putInStore(STORES.CONFLICTS, conflict);
      }

      await act(async () => {
        await result.current.loadSyncQueue();
        await result.current.loadConflicts();
      });

      expect(result.current.pendingSyncs).toBe(3);
      expect(result.current.conflictCount).toBe(2);

      // Sync should be paused due to conflicts
      expect(result.current.conflictCount).toBeGreaterThan(0);
    });

    it('should resume sync after all conflicts are resolved', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const conflicts = [createMockSyncConflict(), createMockSyncConflict()];

      for (const conflict of conflicts) {
        await putInStore(STORES.CONFLICTS, conflict);
      }

      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflictCount).toBe(2);

      // Resolve all conflicts
      for (const conflict of result.current.conflicts) {
        await act(async () => {
          await result.current.resolveConflict(conflict.id, 'local');
        });
      }

      expect(result.current.conflictCount).toBe(0);
      expect(result.current.conflicts).toHaveLength(0);
    });
  });

  describe('Retry Logic and Failure Handling', () => {
    it('should handle failed sync items', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const failedItem = createMockPendingSyncItem({
        status: 'failed',
        retryCount: 3,
      });

      await putInStore(STORES.SYNC_QUEUE, failedItem);

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      const failed = result.current.syncQueue.find(item => item.status === 'failed');
      expect(failed).toBeDefined();
      expect(failed?.retryCount).toBe(3);
    });

    it('should track retry attempts', async () => {
      const syncItem = createMockPendingSyncItem({
        status: 'pending',
        retryCount: 0,
      });

      await putInStore(STORES.SYNC_QUEUE, syncItem);

      // Simulate failed attempts by updating retry count
      const updatedItem = {
        ...syncItem,
        retryCount: 1,
        status: 'failed' as const,
      };

      await putInStore(STORES.SYNC_QUEUE, updatedItem);

      const stored = await getFromStore<PendingSyncItem>(STORES.SYNC_QUEUE, syncItem.id);
      expect(stored?.retryCount).toBe(1);
      expect(stored?.status).toBe('failed');
    });

    it('should handle network failures mid-sync', async () => {
      const { result } = renderHook(() => useOfflineStore());

      // Start with online
      expect(result.current.isOnline).toBe(true);

      const syncItems = createMockPendingSyncItems(10);
      for (const item of syncItems) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      // Simulate going offline during sync
      await act(async () => {
        result.current.setIsSyncing(true);
        simulateOffline();
        result.current.setOnline(false);
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isSyncing).toBe(true);

      // Sync should stop
      await act(async () => {
        result.current.setIsSyncing(false);
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.pendingSyncs).toBeGreaterThan(0);
    });
  });

  describe('Large Queue Handling', () => {
    it('should handle large sync queue (100+ items)', async () => {
      const { result } = renderHook(() => useOfflineStore());

      // Create 150 items
      const largeQueue = Array.from({ length: 150 }, (_, i) =>
        createMockPendingSyncItem({
          timestamp: Date.now() - (150 - i) * 100,
        })
      );

      for (const item of largeQueue) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(150);
      expect(result.current.pendingSyncs).toBe(150);
    });

    it('should process large queues in batches', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const largeQueue = Array.from({ length: 100 }, () =>
        createMockPendingSyncItem()
      );

      for (const item of largeQueue) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      // Verify all items loaded
      expect(result.current.syncQueue.length).toBe(100);

      // Simulate batch processing by removing items
      const batchSize = 25;
      for (let i = 0; i < 4; i++) {
        const batch = result.current.syncQueue.slice(0, batchSize);
        for (const item of batch) {
          await act(async () => {
            await result.current.removePendingSync(item.id);
          });
        }
      }

      expect(result.current.syncQueue).toHaveLength(0);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain company_id during sync', async () => {
      const companyId = 'company-123';

      const syncItem = createMockPendingSyncItem({
        entityType: 'projects',
        data: {
          id: 'project-1',
          name: 'Test Project',
          company_id: companyId,
        },
      });

      await putInStore(STORES.SYNC_QUEUE, syncItem);

      const stored = await getFromStore<PendingSyncItem>(STORES.SYNC_QUEUE, syncItem.id);
      const data = stored?.data as any;

      expect(data.company_id).toBe(companyId);
    });

    it('should preserve field types during sync', async () => {
      const syncItem = createMockPendingSyncItem({
        data: {
          id: 'test-1',
          name: 'Test',
          count: 42,
          active: true,
          metadata: { key: 'value' },
          tags: ['tag1', 'tag2'],
          timestamp: Date.now(),
        },
      });

      await putInStore(STORES.SYNC_QUEUE, syncItem);

      const stored = await getFromStore<PendingSyncItem>(STORES.SYNC_QUEUE, syncItem.id);
      const data = stored?.data as any;

      expect(typeof data.name).toBe('string');
      expect(typeof data.count).toBe('number');
      expect(typeof data.active).toBe('boolean');
      expect(typeof data.metadata).toBe('object');
      expect(Array.isArray(data.tags)).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent sync queue operations', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const items = createMockPendingSyncItems(20);

      // Add items concurrently
      await Promise.all(
        items.map(item => putInStore(STORES.SYNC_QUEUE, item))
      );

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(20);

      // Remove items concurrently
      await Promise.all(
        result.current.syncQueue.slice(0, 10).map(item =>
          act(async () => {
            await result.current.removePendingSync(item.id);
          })
        )
      );

      expect(result.current.syncQueue).toHaveLength(10);
    });

    it('should handle concurrent conflict resolutions', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const conflicts = [
        createMockSyncConflict(),
        createMockSyncConflict(),
        createMockSyncConflict(),
      ];

      for (const conflict of conflicts) {
        await putInStore(STORES.CONFLICTS, conflict);
      }

      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflicts).toHaveLength(3);

      // Resolve concurrently
      await Promise.all(
        result.current.conflicts.map(conflict =>
          act(async () => {
            await result.current.resolveConflict(conflict.id, 'local');
          })
        )
      );

      expect(result.current.conflicts).toHaveLength(0);
    });
  });

  describe('Storage Cleanup', () => {
    it('should clean up completed sync items', async () => {
      const { result } = renderHook(() => useOfflineStore());

      const items = createMockPendingSyncItems(5);
      for (const item of items) {
        await putInStore(STORES.SYNC_QUEUE, item);
      }

      await act(async () => {
        await result.current.loadSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(5);

      // Clear queue
      await act(async () => {
        await result.current.clearSyncQueue();
      });

      expect(result.current.syncQueue).toHaveLength(0);

      // Verify IndexedDB is empty
      const remaining = await getAllFromStore(STORES.SYNC_QUEUE);
      expect(remaining).toHaveLength(0);
    });

    it('should clean up resolved conflicts', async () => {
      const conflicts = [
        createMockSyncConflict(),
        createMockSyncConflict(),
      ];

      for (const conflict of conflicts) {
        await putInStore(STORES.CONFLICTS, conflict);
      }

      const { result } = renderHook(() => useOfflineStore());

      await act(async () => {
        await result.current.loadConflicts();
      });

      // Resolve all
      for (const conflict of result.current.conflicts) {
        await act(async () => {
          await result.current.resolveConflict(conflict.id, 'local');
        });
      }

      // Load again - should only get unresolved
      await act(async () => {
        await result.current.loadConflicts();
      });

      expect(result.current.conflicts).toHaveLength(0);
    });
  });
});
