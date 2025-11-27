// File: /src/lib/api/offline-client.ts
// Offline-first API client wrapper

import { supabase } from '../supabase';
import { StorageManager } from '../offline/storage-manager';
import { useOfflineStore } from '@/stores/offline-store';
import {
  addToStore,
  putInStore,
  getByIndex,
  STORES,
} from '../offline/indexeddb';
import type { QueuedMutation } from '@/types/offline';
import { v4 as uuidv4 } from 'uuid';

/**
 * Offline-first API client
 * Wraps Supabase calls with offline caching and sync queue
 */
export class OfflineClient {
  /**
   * Fetch data with offline support
   * Returns cached data if offline, otherwise fetches from server
   */
  static async fetch<T>(
    table: string,
    filters?: Record<string, any>,
    options?: {
      forceRefresh?: boolean;
      ttl?: number;
    }
  ): Promise<T[]> {
    const isOnline = useOfflineStore.getState().isOnline;
    const cacheKey = StorageManager.generateCacheKey(table, filters);

    // If offline, return cached data
    if (!isOnline) {
      const cached = await StorageManager.getCachedData<T[]>(cacheKey);
      if (cached) {
        console.log(`[OfflineClient] Returning cached data for ${table}`);
        return cached;
      }
      throw new Error('No cached data available offline');
    }

    // If online, check cache first unless force refresh
    if (!options?.forceRefresh) {
      const cached = await StorageManager.getCachedData<T[]>(cacheKey);
      if (cached) {
        console.log(`[OfflineClient] Returning cached data for ${table}`);
        return cached;
      }
    }

    // Fetch from server
    console.log(`[OfflineClient] Fetching from server: ${table}`);
    let query = supabase.from(table as any).select('*');

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Cache the results
    await StorageManager.cacheData(cacheKey, table, data);

    return (data || []) as T[];
  }

  /**
   * Fetch single record with offline support
   */
  static async fetchOne<T>(
    table: string,
    id: string,
    options?: {
      forceRefresh?: boolean;
    }
  ): Promise<T | null> {
    const isOnline = useOfflineStore.getState().isOnline;
    const cacheKey = StorageManager.generateRecordKey(table, id);

    // If offline, return cached data
    if (!isOnline) {
      const cached = await StorageManager.getCachedData<T>(cacheKey);
      if (cached) {
        console.log(`[OfflineClient] Returning cached record for ${table}:${id}`);
        return cached;
      }
      throw new Error('No cached data available offline');
    }

    // If online, check cache first unless force refresh
    if (!options?.forceRefresh) {
      const cached = await StorageManager.getCachedData<T>(cacheKey);
      if (cached) {
        console.log(`[OfflineClient] Returning cached record for ${table}:${id}`);
        return cached;
      }
    }

    // Fetch from server
    console.log(`[OfflineClient] Fetching record from server: ${table}:${id}`);
    const { data, error } = await supabase
      .from(table as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    // Cache the result
    await StorageManager.cacheData(cacheKey, table, data);

    return data as T;
  }

  /**
   * Create record with offline queue support
   */
  static async create<T>(
    table: string,
    data: Partial<T>,
    options?: {
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<T> {
    const isOnline = useOfflineStore.getState().isOnline;

    // If offline, queue the mutation
    if (!isOnline) {
      console.log(`[OfflineClient] Queuing create for ${table}`);
      const mutation: QueuedMutation = {
        id: uuidv4(),
        type: 'create',
        table,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        priority: options?.priority || 'normal',
      };

      await addToStore(STORES.SYNC_QUEUE, mutation);
      useOfflineStore.getState().updatePendingSyncs();

      // Return optimistic data with temporary ID
      return {
        id: mutation.id,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as T;
    }

    // If online, create immediately
    console.log(`[OfflineClient] Creating record: ${table}`);
    const { data: result, error } = await supabase
      .from(table as any)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache for this table
    await StorageManager.invalidateTable(table);

    // Cache the new record
    const typedResult = result as any as T & { id: string };
    const cacheKey = StorageManager.generateRecordKey(table, typedResult.id);
    await StorageManager.cacheData(cacheKey, table, typedResult);

    return typedResult;
  }

  /**
   * Update record with offline queue support
   */
  static async update<T>(
    table: string,
    id: string,
    data: Partial<T>,
    options?: {
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<T> {
    const isOnline = useOfflineStore.getState().isOnline;

    // If offline, queue the mutation
    if (!isOnline) {
      console.log(`[OfflineClient] Queuing update for ${table}:${id}`);
      const mutation: QueuedMutation = {
        id: uuidv4(),
        type: 'update',
        table,
        recordId: id,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        priority: options?.priority || 'normal',
      };

      await addToStore(STORES.SYNC_QUEUE, mutation);
      useOfflineStore.getState().updatePendingSyncs();

      // Get cached version and merge with updates
      const cacheKey = StorageManager.generateRecordKey(table, id);
      const cached = await StorageManager.getCachedData<T>(cacheKey);

      return {
        ...cached,
        ...data,
        id,
        updated_at: new Date().toISOString(),
      } as T;
    }

    // If online, update immediately
    console.log(`[OfflineClient] Updating record: ${table}:${id}`);
    const { data: result, error } = await supabase
      .from(table as any)
      .update(data as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache for this table
    await StorageManager.invalidateTable(table);

    // Update cached record
    const cacheKey = StorageManager.generateRecordKey(table, id);
    await StorageManager.cacheData(cacheKey, table, result);

    return result as T;
  }

  /**
   * Delete record with offline queue support
   */
  static async delete(
    table: string,
    id: string,
    options?: {
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<void> {
    const isOnline = useOfflineStore.getState().isOnline;

    // If offline, queue the mutation
    if (!isOnline) {
      console.log(`[OfflineClient] Queuing delete for ${table}:${id}`);
      const mutation: QueuedMutation = {
        id: uuidv4(),
        type: 'delete',
        table,
        recordId: id,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        priority: options?.priority || 'normal',
      };

      await addToStore(STORES.SYNC_QUEUE, mutation);
      useOfflineStore.getState().updatePendingSyncs();

      // Optimistically remove from cache
      const cacheKey = StorageManager.generateRecordKey(table, id);
      await StorageManager.invalidateKey(cacheKey);

      return;
    }

    // If online, delete immediately
    console.log(`[OfflineClient] Deleting record: ${table}:${id}`);
    const { error } = await supabase.from(table as any).delete().eq('id', id);

    if (error) {
      throw error;
    }

    // Invalidate cache
    await StorageManager.invalidateTable(table);
    const cacheKey = StorageManager.generateRecordKey(table, id);
    await StorageManager.invalidateKey(cacheKey);
  }

  /**
   * Process sync queue
   * Attempts to sync all pending mutations
   */
  static async processSyncQueue(): Promise<{
    success: number;
    failed: number;
    remaining: number;
  }> {
    console.log('[OfflineClient] Processing sync queue');

    const { setIsSyncing, updatePendingSyncs } = useOfflineStore.getState();
    setIsSyncing(true);

    try {
      // Get all pending mutations sorted by priority and timestamp
      const pendingMutations = await getByIndex<QueuedMutation>(
        STORES.SYNC_QUEUE,
        'status',
        'pending'
      );

      // Sort by priority (high > normal > low) then timestamp (oldest first)
      const sortedMutations = pendingMutations.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      let successCount = 0;
      let failedCount = 0;

      for (const mutation of sortedMutations) {
        try {
          // Mark as processing
          mutation.status = 'processing';
          await putInStore(STORES.SYNC_QUEUE, mutation);

          // Execute mutation
          switch (mutation.type) {
            case 'create':
              await supabase.from(mutation.table as any).insert(mutation.data as any);
              break;
            case 'update':
              if (!mutation.recordId) {
                throw new Error('Record ID is required for update mutation');
              }
              await supabase
                .from(mutation.table as any)
                .update(mutation.data as any)
                .eq('id', mutation.recordId);
              break;
            case 'delete':
              if (!mutation.recordId) {
                throw new Error('Record ID is required for delete mutation');
              }
              await supabase.from(mutation.table as any).delete().eq('id', mutation.recordId);
              break;
          }

          // Mark as completed
          mutation.status = 'completed';
          await putInStore(STORES.SYNC_QUEUE, mutation);
          successCount++;

          console.log(`[OfflineClient] Synced ${mutation.type} for ${mutation.table}`);
        } catch (error) {
          // Mark as failed and increment retry count
          mutation.status = 'failed';
          mutation.retryCount++;
          mutation.error = error instanceof Error ? error.message : 'Unknown error';
          await putInStore(STORES.SYNC_QUEUE, mutation);
          failedCount++;

          console.error(
            `[OfflineClient] Failed to sync ${mutation.type} for ${mutation.table}:`,
            error
          );
        }
      }

      // Get remaining pending count
      await updatePendingSyncs();
      const remaining = useOfflineStore.getState().pendingSyncs;

      // Update last sync time
      useOfflineStore.getState().setLastSyncTime(Date.now());

      return { success: successCount, failed: failedCount, remaining };
    } finally {
      setIsSyncing(false);
    }
  }

  /**
   * Force refresh cache from server
   */
  static async refreshCache(table: string): Promise<void> {
    console.log(`[OfflineClient] Refreshing cache for ${table}`);
    await StorageManager.invalidateTable(table);
  }

  /**
   * Clear all offline data
   */
  static async clearAll(): Promise<void> {
    console.log('[OfflineClient] Clearing all offline data');
    await StorageManager.invalidateTable('');
  }
}
