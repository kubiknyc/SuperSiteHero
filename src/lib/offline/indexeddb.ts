// File: /src/lib/offline/indexeddb.ts
// IndexedDB setup and management for offline functionality

import { openDB, type IDBPDatabase } from 'idb';
import type {
  CachedData,
  QueuedMutation,
  UserDownload,
  Conflict,
  QueuedPhoto,
} from '@/types/offline';
import { logger } from '@/lib/utils/logger';

// Database name and version
const DB_NAME = 'JobSight-offline';
const DB_VERSION = 2; // Incremented for photo queue store

// Store names
export const STORES = {
  CACHED_DATA: 'cachedData',
  SYNC_QUEUE: 'syncQueue',
  DOWNLOADS: 'downloads',
  CONFLICTS: 'conflicts',
  PHOTO_QUEUE: 'photoQueue',
} as const;

/**
 * Valid store names for type-safe store access
 */
export type StoreName = typeof STORES[keyof typeof STORES];

/**
 * IndexedDB database instance
 */
export type OfflineDB = IDBPDatabase<{
  cachedData: {
    key: string;
    value: CachedData;
    indexes: {
      table: string;
      timestamp: number;
      expiresAt: number;
    };
  };
  syncQueue: {
    key: string;
    value: QueuedMutation;
    indexes: {
      status: QueuedMutation['status'];
      timestamp: number;
      priority: QueuedMutation['priority'];
    };
  };
  downloads: {
    key: string;
    value: UserDownload;
    indexes: {
      status: UserDownload['status'];
      resourceId: string;
    };
  };
  conflicts: {
    key: string;
    value: Conflict;
    indexes: {
      table: string;
      resolved: boolean;
    };
  };
  photoQueue: {
    key: string;
    value: QueuedPhoto;
    indexes: {
      status: QueuedPhoto['status'];
      timestamp: number;
      checklistId: string;
      responseId: string;
    };
  };
}>;

let dbInstance: OfflineDB | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initDatabase(): Promise<OfflineDB> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // Use type assertion to work with the properly typed OfflineDB
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, _transaction) {
        logger.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

        // Create cachedData store
        if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
          const cachedDataStore = db.createObjectStore(STORES.CACHED_DATA, {
            keyPath: 'key',
          });
          cachedDataStore.createIndex('table', 'table', { unique: false });
          cachedDataStore.createIndex('timestamp', 'timestamp', { unique: false });
          cachedDataStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          logger.log('Created cachedData store with indexes');
        }

        // Create syncQueue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: 'id',
          });
          syncQueueStore.createIndex('status', 'status', { unique: false });
          syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncQueueStore.createIndex('priority', 'priority', { unique: false });
          logger.log('Created syncQueue store with indexes');
        }

        // Create downloads store
        if (!db.objectStoreNames.contains(STORES.DOWNLOADS)) {
          const downloadsStore = db.createObjectStore(STORES.DOWNLOADS, {
            keyPath: 'id',
          });
          downloadsStore.createIndex('status', 'status', { unique: false });
          downloadsStore.createIndex('resourceId', 'resourceId', { unique: false });
          logger.log('Created downloads store with indexes');
        }

        // Create conflicts store
        if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
          const conflictsStore = db.createObjectStore(STORES.CONFLICTS, {
            keyPath: 'id',
          });
          conflictsStore.createIndex('table', 'table', { unique: false });
          conflictsStore.createIndex('resolved', 'resolved', { unique: false });
          logger.log('Created conflicts store with indexes');
        }

        // Create photoQueue store
        if (!db.objectStoreNames.contains(STORES.PHOTO_QUEUE)) {
          const photoQueueStore = db.createObjectStore(STORES.PHOTO_QUEUE, {
            keyPath: 'id',
          });
          photoQueueStore.createIndex('status', 'status', { unique: false });
          photoQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
          photoQueueStore.createIndex('checklistId', 'checklistId', { unique: false });
          photoQueueStore.createIndex('responseId', 'responseId', { unique: false });
          logger.log('Created photoQueue store with indexes');
        }
      },
      blocked() {
        logger.warn(
          'IndexedDB upgrade blocked. Please close other tabs with this site open.'
        );
      },
      blocking() {
        logger.warn('This connection is blocking a newer version of the database.');
      },
      terminated() {
        logger.error('IndexedDB connection was unexpectedly terminated.');
        dbInstance = null;
      },
    });

    logger.log('IndexedDB initialized successfully');
    return dbInstance;
  } catch (error) {
    logger.error('Failed to initialize IndexedDB:', error);
    throw new Error('Failed to initialize offline database');
  }
}

/**
 * Get the database instance (initialize if needed)
 */
export async function getDatabase(): Promise<OfflineDB> {
  if (!dbInstance) {
    return await initDatabase();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.log('IndexedDB connection closed');
  }
}

/**
 * Delete the entire database (use with caution!)
 */
export async function deleteDatabase(): Promise<void> {
  closeDatabase();
  try {
    await indexedDB.deleteDatabase(DB_NAME);
    logger.log('IndexedDB database deleted');
  } catch (error) {
    logger.error('Failed to delete database:', error);
    throw error;
  }
}

/**
 * Get all records from a store
 * @param storeName - Must be a valid store name from STORES constant
 */
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDatabase();
  // Cast needed because idb library types don't support dynamic store names
  return await db.getAll(storeName as keyof typeof db.objectStoreNames);
}

/**
 * Get a single record by key
 */
export async function getFromStore<T>(
  storeName: StoreName,
  key: string
): Promise<T | undefined> {
  const db = await getDatabase();
  // Cast needed because idb library types don't support dynamic store names
  return await db.get(storeName as keyof typeof db.objectStoreNames, key);
}

/**
 * Add a record to a store
 */
export async function addToStore<T>(storeName: StoreName, value: T): Promise<string> {
  const db = await getDatabase();
  // Casts needed because idb library types don't support dynamic store names
  const key = await db.add(storeName as keyof typeof db.objectStoreNames, value as never);
  return String(key);
}

/**
 * Update/put a record in a store
 */
export async function putInStore<T>(storeName: StoreName, value: T): Promise<string> {
  const db = await getDatabase();
  // Casts needed because idb library types don't support dynamic store names
  const key = await db.put(storeName as keyof typeof db.objectStoreNames, value as never);
  return String(key);
}

/**
 * Delete a record from a store
 */
export async function deleteFromStore(storeName: StoreName, key: string): Promise<void> {
  const db = await getDatabase();
  // Cast needed because idb library types don't support dynamic store names
  await db.delete(storeName as keyof typeof db.objectStoreNames, key);
}

/**
 * Clear all records from a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDatabase();
  // Cast needed because idb library types don't support dynamic store names
  await db.clear(storeName as keyof typeof db.objectStoreNames);
}

/**
 * Get records from a store by index
 */
export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: unknown
): Promise<T[]> {
  const db = await getDatabase();
  // Cast needed because idb library types don't support dynamic store names
  const tx = db.transaction(storeName as keyof typeof db.objectStoreNames, 'readonly');
  const index = tx.store.index(indexName);
  return await index.getAll(value);
}

/**
 * Count records in a store
 */
export async function countRecords(storeName: StoreName): Promise<number> {
  const db = await getDatabase();
  // Cast needed because idb library types don't support dynamic store names
  return await db.count(storeName as keyof typeof db.objectStoreNames);
}

/**
 * Count records by index value
 */
export async function countByIndex(
  storeName: StoreName,
  indexName: string,
  value: unknown
): Promise<number> {
  const db = await getDatabase();
  // Cast needed because idb library types don't support dynamic store names
  const tx = db.transaction(storeName as keyof typeof db.objectStoreNames, 'readonly');
  const index = tx.store.index(indexName);
  return await index.count(value);
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const db = await getDatabase();
  const tx = db.transaction(STORES.CACHED_DATA, 'readwrite');
  const index = tx.store.index('expiresAt');

  let deletedCount = 0;
  const now = Date.now();

  // Iterate through all records with expiresAt <= now
  for await (const cursor of index.iterate(IDBKeyRange.upperBound(now))) {
    await cursor.delete();
    deletedCount++;
  }

  await tx.done;
  logger.log(`Cleaned up ${deletedCount} expired cache entries`);
  return deletedCount;
}

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      percentage,
    };
  }

  return {
    usage: 0,
    quota: 0,
    percentage: 0,
  };
}

/**
 * Check if storage is persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    return await navigator.storage.persisted();
  }
  return false;
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return await navigator.storage.persist();
  }
  return false;
}