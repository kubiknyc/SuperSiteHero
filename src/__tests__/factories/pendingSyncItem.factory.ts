/**
 * Pending Sync Item Factory
 * Creates mock pending sync items for testing offline sync queue
 */

import { faker } from '@faker-js/faker';
import type { PendingSyncItem } from '@/stores/offline-store';

export interface PendingSyncItemFactoryOptions {
  id?: string;
  entityType?: string;
  entityId?: string;
  operation?: 'create' | 'update' | 'delete';
  data?: unknown;
  status?: 'pending' | 'syncing' | 'failed';
  createdAt?: number;
  timestamp?: number;
  retryCount?: number;
}

/**
 * Create a mock pending sync item
 */
export function createMockPendingSyncItem(
  options: PendingSyncItemFactoryOptions = {}
): PendingSyncItem {
  const timestamp = options.timestamp || Date.now();
  const entityType = options.entityType || faker.helpers.arrayElement(['projects', 'daily_reports', 'action_items', 'documents', 'checklists']);
  const entityId = options.entityId || faker.string.uuid();
  const operation = options.operation || faker.helpers.arrayElement(['create', 'update', 'delete']);

  let data: unknown;
  if (options.data !== undefined) {
    data = options.data;
  } else if (operation === 'delete') {
    data = null;
  } else {
    data = {
      id: entityId,
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      status: faker.helpers.arrayElement(['active', 'pending', 'completed']),
      created_at: faker.date.past().toISOString(),
      updated_at: new Date(timestamp).toISOString(),
      company_id: faker.string.uuid(),
    };
  }

  return {
    id: options.id || `sync-${faker.string.uuid()}`,
    entityType,
    entityId,
    operation,
    data,
    status: options.status || 'pending',
    createdAt: options.createdAt || timestamp - 1000,
    timestamp,
    retryCount: options.retryCount ?? 0,
  };
}

/**
 * Create a pending sync item for creation
 */
export function createMockCreateSyncItem(
  options: PendingSyncItemFactoryOptions = {}
): PendingSyncItem {
  return createMockPendingSyncItem({
    ...options,
    operation: 'create',
  });
}

/**
 * Create a pending sync item for update
 */
export function createMockUpdateSyncItem(
  options: PendingSyncItemFactoryOptions = {}
): PendingSyncItem {
  return createMockPendingSyncItem({
    ...options,
    operation: 'update',
  });
}

/**
 * Create a pending sync item for deletion
 */
export function createMockDeleteSyncItem(
  options: PendingSyncItemFactoryOptions = {}
): PendingSyncItem {
  return createMockPendingSyncItem({
    ...options,
    operation: 'delete',
    data: null,
  });
}

/**
 * Create a syncing item
 */
export function createMockSyncingItem(
  options: PendingSyncItemFactoryOptions = {}
): PendingSyncItem {
  return createMockPendingSyncItem({
    ...options,
    status: 'syncing',
  });
}

/**
 * Create a failed sync item
 */
export function createMockFailedSyncItem(
  options: PendingSyncItemFactoryOptions = {}
): PendingSyncItem {
  return createMockPendingSyncItem({
    ...options,
    status: 'failed',
    retryCount: options.retryCount ?? faker.number.int({ min: 1, max: 5 }),
  });
}

/**
 * Create a sync item with high retry count
 */
export function createMockMaxRetriesSyncItem(
  options: PendingSyncItemFactoryOptions = {}
): PendingSyncItem {
  return createMockPendingSyncItem({
    ...options,
    status: 'failed',
    retryCount: 10,
  });
}

/**
 * Create multiple pending sync items
 */
export function createMockPendingSyncItems(count: number = 5): PendingSyncItem[] {
  return Array.from({ length: count }, (_, index) =>
    createMockPendingSyncItem({
      timestamp: Date.now() - (count - index) * 1000, // Chronological order
    })
  );
}

/**
 * Create a batch of sync items with mixed operations
 */
export function createMockMixedSyncBatch(): PendingSyncItem[] {
  return [
    createMockCreateSyncItem({ entityType: 'projects' }),
    createMockUpdateSyncItem({ entityType: 'daily_reports' }),
    createMockDeleteSyncItem({ entityType: 'action_items' }),
    createMockUpdateSyncItem({ entityType: 'documents' }),
    createMockCreateSyncItem({ entityType: 'checklists' }),
  ];
}

/**
 * Create a large sync queue (stress testing)
 */
export function createMockLargeSyncQueue(count: number = 100): PendingSyncItem[] {
  return Array.from({ length: count }, (_, index) =>
    createMockPendingSyncItem({
      timestamp: Date.now() - (count - index) * 100,
    })
  );
}

/**
 * Pre-defined test sync items
 */
export const TEST_SYNC_ITEMS = {
  CREATE: createMockCreateSyncItem(),
  UPDATE: createMockUpdateSyncItem(),
  DELETE: createMockDeleteSyncItem(),
  SYNCING: createMockSyncingItem(),
  FAILED: createMockFailedSyncItem(),
  MAX_RETRIES: createMockMaxRetriesSyncItem(),
  MIXED_BATCH: createMockMixedSyncBatch(),
} as const;

export type MockPendingSyncItem = PendingSyncItem;
