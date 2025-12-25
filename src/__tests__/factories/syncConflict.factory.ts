/**
 * Sync Conflict Factory
 * Creates mock sync conflicts for testing offline conflict resolution
 */

import { faker } from '@faker-js/faker';
import type { SyncConflict } from '@/stores/offline-store';

export interface SyncConflictFactoryOptions {
  id?: string;
  entityType?: string;
  entityId?: string;
  localData?: Record<string, unknown>;
  serverData?: Record<string, unknown>;
  localTimestamp?: number;
  serverTimestamp?: number;
  resolved?: boolean;
  createdAt?: number;
  detectedAt?: number;
}

/**
 * Create a mock sync conflict
 */
export function createMockSyncConflict(
  options: SyncConflictFactoryOptions = {}
): SyncConflict {
  const baseTimestamp = options.createdAt || Date.now();
  const localTimestamp = options.localTimestamp || baseTimestamp - 10000;
  const serverTimestamp = options.serverTimestamp || baseTimestamp - 5000;

  const entityId = options.entityId || faker.string.uuid();
  const entityType = options.entityType || faker.helpers.arrayElement(['projects', 'daily_reports', 'action_items', 'documents']);

  const baseData = {
    id: entityId,
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['active', 'pending', 'completed']),
    created_at: faker.date.past().toISOString(),
    updated_at: new Date(localTimestamp).toISOString(),
  };

  return {
    id: options.id || `conflict-${faker.string.uuid()}`,
    entityType,
    entityId,
    localData: options.localData || {
      ...baseData,
      // Local changes
      name: `${baseData.name} (Local)`,
      updated_at: new Date(localTimestamp).toISOString(),
      local_change: true,
    },
    serverData: options.serverData || {
      ...baseData,
      // Server changes
      name: `${baseData.name} (Server)`,
      updated_at: new Date(serverTimestamp).toISOString(),
      server_change: true,
    },
    localTimestamp,
    serverTimestamp,
    resolved: options.resolved ?? false,
    createdAt: options.createdAt || baseTimestamp,
    detectedAt: options.detectedAt || baseTimestamp,
  };
}

/**
 * Create a conflict where local is newer
 */
export function createMockLocalNewerConflict(
  options: SyncConflictFactoryOptions = {}
): SyncConflict {
  const now = Date.now();
  return createMockSyncConflict({
    ...options,
    localTimestamp: now,
    serverTimestamp: now - 60000, // Server is 1 minute older
  });
}

/**
 * Create a conflict where server is newer
 */
export function createMockServerNewerConflict(
  options: SyncConflictFactoryOptions = {}
): SyncConflict {
  const now = Date.now();
  return createMockSyncConflict({
    ...options,
    localTimestamp: now - 60000, // Local is 1 minute older
    serverTimestamp: now,
  });
}

/**
 * Create a conflict with field-level differences
 */
export function createMockFieldLevelConflict(
  options: SyncConflictFactoryOptions = {}
): SyncConflict {
  const entityId = faker.string.uuid();
  const baseData = {
    id: entityId,
    name: 'Project Name',
    description: 'Base description',
    status: 'active',
    budget: 100000,
    location: 'New York',
    company_id: faker.string.uuid(),
  };

  return createMockSyncConflict({
    ...options,
    entityId,
    localData: {
      ...baseData,
      // Local changed only description and budget
      description: 'Updated description from field',
      budget: 120000,
    },
    serverData: {
      ...baseData,
      // Server changed only status and location
      status: 'on_hold',
      location: 'Los Angeles',
    },
  });
}

/**
 * Create multiple conflicts
 */
export function createMockSyncConflicts(count: number = 3): SyncConflict[] {
  return Array.from({ length: count }, () => createMockSyncConflict());
}

/**
 * Create a resolved conflict
 */
export function createMockResolvedConflict(
  options: SyncConflictFactoryOptions = {}
): SyncConflict {
  return createMockSyncConflict({
    ...options,
    resolved: true,
  });
}

/**
 * Pre-defined test conflicts
 */
export const TEST_CONFLICTS = {
  LOCAL_NEWER: createMockLocalNewerConflict(),
  SERVER_NEWER: createMockServerNewerConflict(),
  FIELD_LEVEL: createMockFieldLevelConflict(),
  RESOLVED: createMockResolvedConflict(),
} as const;

export type MockSyncConflict = SyncConflict;
