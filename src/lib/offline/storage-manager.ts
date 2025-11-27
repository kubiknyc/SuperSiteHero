// File: /src/lib/offline/storage-manager.ts
// Storage management and cache utilities

import type { CachedData, CacheStrategy, StorageQuota } from '@/types/offline';
import {
  getDatabase,
  STORES,
  getByIndex,
  putInStore,
  getFromStore,
  deleteFromStore,
  cleanupExpiredCache,
  getStorageEstimate,
} from './indexeddb';

/**
 * Cache strategies for different table types
 */
const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  projects: {
    table: 'projects',
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    priority: 'high',
  },
  daily_reports: {
    table: 'daily_reports',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    priority: 'high',
  },
  documents: {
    table: 'documents',
    ttl: Infinity, // Never expire
    priority: 'normal',
  },
  rfis: {
    table: 'rfis',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    priority: 'normal',
  },
  submittals: {
    table: 'submittals',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    priority: 'normal',
  },
  change_orders: {
    table: 'change_orders',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    priority: 'normal',
  },
  tasks: {
    table: 'tasks',
    ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
    priority: 'normal',
  },
  punch_lists: {
    table: 'punch_lists',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    priority: 'normal',
  },
  workflows: {
    table: 'workflows',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    priority: 'normal',
  },
  // Default for unknown tables
  default: {
    table: 'default',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    priority: 'low',
  },
};

/**
 * Storage Manager class
 */
export class StorageManager {
  /**
   * Get cache strategy for a table
   */
  static getStrategy(table: string): CacheStrategy {
    return CACHE_STRATEGIES[table] || CACHE_STRATEGIES.default;
  }

  /**
   * Generate cache key
   */
  static generateCacheKey(table: string, filters?: any): string {
    if (!filters || Object.keys(filters).length === 0) {
      return `${table}:list`;
    }

    // Create stable hash from filters
    const filtersJson = JSON.stringify(filters);
    const hash = this.hashString(filtersJson);
    return `${table}:list:${hash}`;
  }

  /**
   * Generate cache key for single record
   */
  static generateRecordKey(table: string, id: string): string {
    return `${table}:${id}`;
  }

  /**
   * Simple string hash function
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache data
   */
  static async cacheData(
    key: string,
    table: string,
    data: any
  ): Promise<void> {
    const strategy = this.getStrategy(table);
    const now = Date.now();

    const cachedData: CachedData = {
      key,
      table,
      data,
      timestamp: now,
      expiresAt: strategy.ttl === Infinity ? Infinity : now + strategy.ttl,
      version: 1,
      syncedAt: now,
    };

    await putInStore(STORES.CACHED_DATA, cachedData);
  }

  /**
   * Get cached data
   */
  static async getCachedData<T>(key: string): Promise<T | null> {
    const cached = await getFromStore<CachedData>(STORES.CACHED_DATA, key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt !== Infinity && cached.expiresAt < Date.now()) {
      await deleteFromStore(STORES.CACHED_DATA, key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Invalidate cache for a table
   */
  static async invalidateTable(table: string): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction(STORES.CACHED_DATA, 'readwrite');
    const index = tx.store.index('table');

    for await (const cursor of index.iterate(table)) {
      await cursor.delete();
    }

    await tx.done;
  }

  /**
   * Invalidate specific cache entry
   */
  static async invalidateKey(key: string): Promise<void> {
    await deleteFromStore(STORES.CACHED_DATA, key);
  }

  /**
   * Clean up expired entries
   */
  static async cleanupExpired(): Promise<number> {
    return await cleanupExpiredCache();
  }

  /**
   * Get storage quota information
   */
  static async getQuota(): Promise<StorageQuota> {
    const estimate = await getStorageEstimate();

    const quota: StorageQuota = {
      total: estimate.quota,
      used: estimate.usage,
      available: estimate.quota - estimate.usage,
      warning: estimate.percentage > 90,
      critical: estimate.percentage > 95,
    };

    return quota;
  }

  /**
   * Check if storage has enough space
   */
  static async hasEnoughSpace(requiredBytes: number): Promise<boolean> {
    const quota = await this.getQuota();
    return quota.available >= requiredBytes;
  }

  /**
   * Cleanup old data to free space
   */
  static async freeSpace(targetBytes: number): Promise<number> {
    let freedBytes = 0;

    // Step 1: Clean up expired entries
    await this.cleanupExpired();

    const quota = await this.getQuota();
    if (quota.available >= targetBytes) {
      return freedBytes;
    }

    // Step 2: Remove completed tasks older than 14 days
    await this.cleanupOldRecords('tasks', 14 * 24 * 60 * 60 * 1000);

    // Step 3: Remove closed punch lists older than 30 days
    await this.cleanupOldRecords('punch_lists', 30 * 24 * 60 * 60 * 1000);

    // Step 4: Remove answered RFIs older than 30 days
    await this.cleanupOldRecords('rfis', 30 * 24 * 60 * 60 * 1000);

    // Step 5: Remove daily reports older than 60 days
    await this.cleanupOldRecords('daily_reports', 60 * 24 * 60 * 60 * 1000);

    const newQuota = await this.getQuota();
    freedBytes = quota.used - newQuota.used;

    return freedBytes;
  }

  /**
   * Clean up old records for a specific table
   */
  private static async cleanupOldRecords(
    table: string,
    maxAge: number
  ): Promise<number> {
    const db = await getDatabase();
    const tx = db.transaction(STORES.CACHED_DATA, 'readwrite');
    const index = tx.store.index('table');

    let deletedCount = 0;
    const cutoffTime = Date.now() - maxAge;

    for await (const cursor of index.iterate(table)) {
      if (cursor.value.timestamp < cutoffTime) {
        await cursor.delete();
        deletedCount++;
      }
    }

    await tx.done;
    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalEntries: number;
    byTable: Record<string, number>;
    oldestEntry: number;
    newestEntry: number;
  }> {
    const allCached = await getByIndex<CachedData>(
      STORES.CACHED_DATA,
      'timestamp',
      undefined
    );

    const byTable: Record<string, number> = {};
    let oldest = Date.now();
    let newest = 0;

    for (const entry of allCached) {
      byTable[entry.table] = (byTable[entry.table] || 0) + 1;
      oldest = Math.min(oldest, entry.timestamp);
      newest = Math.max(newest, entry.timestamp);
    }

    return {
      totalEntries: allCached.length,
      byTable,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  /**
   * Get cache health status
   */
  static async getCacheHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    quota: StorageQuota;
    stats: Awaited<ReturnType<typeof StorageManager.getCacheStats>>;
  }> {
    const quota = await this.getQuota();
    const stats = await this.getCacheStats();

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'Cache is healthy';

    if (quota.critical) {
      status = 'critical';
      message = 'Storage is critically low (<5% remaining)';
    } else if (quota.warning) {
      status = 'warning';
      message = 'Storage is running low (<10% remaining)';
    }

    return {
      status,
      message,
      quota,
      stats,
    };
  }
}
