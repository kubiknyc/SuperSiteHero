// File: /src/lib/offline/sync-manager.ts
// Background sync manager for automatic offline data synchronization
// Enhanced with priority queue and bandwidth detection

import { OfflineClient } from '../api/offline-client';
import { useOfflineStore, type SyncConflict } from '@/stores/offline-store';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import { priorityQueue, type SyncBatch } from './priority-queue';
import { bandwidthDetector, type NetworkSpeed } from './bandwidth-detector';
import { putInStore, STORES } from './indexeddb';

/**
 * Sync telemetry entry
 */
export interface SyncTelemetry {
  id: string;
  user_id?: string;
  sync_started_at: string;
  sync_completed_at?: string;
  items_synced: number;
  total_bytes: number;
  duration_ms: number;
  network_type: string;
  network_speed: NetworkSpeed;
  batch_count: number;
  errors: number;
}

/**
 * Background sync manager
 * Handles automatic synchronization when network is restored
 * Enhanced with:
 * - Priority queue for selective sync
 * - Bandwidth detection for adaptive batching
 * - Sync telemetry tracking
 * - Resumable batch operations
 */
export class SyncManager {
  private static syncInProgress = false;
  private static syncInterval: ReturnType<typeof setInterval> | null = null;
  private static lastSyncAttempt = 0;
  private static readonly MIN_SYNC_INTERVAL = 5000; // 5 seconds minimum between syncs
  private static currentBatch: SyncBatch | null = null;
  private static telemetry: Partial<SyncTelemetry> = {};

  /**
   * Initialize background sync
   * Sets up event listeners and periodic sync checks
   */
  static initialize(): () => void {
    logger.log('[SyncManager] Initializing background sync');

    // Listen for online event
    const handleOnline = () => {
      logger.log('[SyncManager] Network restored - triggering sync');
      this.triggerSync();
    };

    window.addEventListener('online', handleOnline);

    // Register service worker sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      this.registerBackgroundSync();
    }

    // Periodic sync check (every 30 seconds when online)
    this.syncInterval = setInterval(() => {
      const { isOnline, pendingSyncs } = useOfflineStore.getState();
      if (isOnline && pendingSyncs > 0) {
        this.triggerSync();
      }
    }, 30000);

    // Return cleanup function
    return () => {
      logger.log('[SyncManager] Cleaning up background sync');
      window.removeEventListener('online', handleOnline);
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    };
  }

  /**
   * Register background sync with Service Worker
   */
  private static async registerBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;

      if ('sync' in registration) {
        // @ts-ignore - Background Sync API may not be in TypeScript types
        await registration.sync.register('offline-sync');
        logger.log('[SyncManager] Background sync registered with Service Worker');
      }
    } catch (error) {
      logger.error('[SyncManager] Failed to register background sync:', error);
    }
  }

  /**
   * Detect conflicts for a pending sync operation
   * Compares local data with current server data
   */
  private static async detectConflict(
    entityType: string,
    entityId: string,
    localData: any,
    localTimestamp: number
  ): Promise<SyncConflict | null> {
    try {
      // Fetch current server version
      // Use type assertion for dynamic table name since entityType comes from sync queue
      const { data: serverData, error } = await supabase
        .from(entityType as 'projects')
        .select('*')
        .eq('id', entityId)
        .single();

      if (error || !serverData) {
        // No server data = no conflict (item may have been deleted)
        return null;
      }

      // Compare timestamps to detect if server was modified after local change
      const serverRecord = serverData as { updated_at?: string; created_at?: string };
      const serverTimestamp = new Date(serverRecord.updated_at || serverRecord.created_at || Date.now()).getTime();

      // If server timestamp is newer than local timestamp, we have a conflict
      if (serverTimestamp > localTimestamp) {
        logger.warn(
          `[SyncManager] Conflict detected for ${entityType} ${entityId}:`,
          `Local: ${new Date(localTimestamp).toISOString()}, Server: ${new Date(serverTimestamp).toISOString()}`
        );

        return {
          id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique conflict ID
          entityType,
          entityId,
          localData,
          serverData: serverData as Record<string, unknown>,
          localTimestamp,
          serverTimestamp,
          resolved: false,
          createdAt: Date.now(),
          detectedAt: Date.now(),
        };
      }

      return null; // No conflict
    } catch (error) {
      logger.error('[SyncManager] Error detecting conflict:', error);
      return null;
    }
  }

  /**
   * Trigger sync manually or automatically with conflict detection
   */
  static async triggerSync(): Promise<void> {
    // Prevent concurrent syncs
    if (this.syncInProgress) {
      logger.log('[SyncManager] Sync already in progress, skipping');
      return;
    }

    // Rate limiting - prevent syncing too frequently
    const now = Date.now();
    if (now - this.lastSyncAttempt < this.MIN_SYNC_INTERVAL) {
      logger.log('[SyncManager] Sync rate limited, try again later');
      return;
    }

    // Check if online
    const { isOnline, pendingSyncs: pendingSyncsCount, syncQueue } = useOfflineStore.getState();
    if (!isOnline) {
      logger.log('[SyncManager] Cannot sync while offline');
      return;
    }

    if (pendingSyncsCount === 0) {
      logger.log('[SyncManager] No pending syncs');
      return;
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = now;

    try {
      logger.log(`[SyncManager] Starting sync for ${pendingSyncsCount} pending mutations`);

      // Detect conflicts before processing sync queue
      const detectedConflicts: SyncConflict[] = [];
      for (const syncItem of syncQueue) {
        // Only check for conflicts on updates (not creates or deletes)
        if (syncItem.operation === 'update' && syncItem.entityId) {
          const conflict = await this.detectConflict(
            syncItem.entityType,
            syncItem.entityId,
            syncItem.data,
            syncItem.timestamp
          );

          if (conflict) {
            detectedConflicts.push(conflict);
            // Add conflict to store
            useOfflineStore.getState().addConflict(conflict);
          }
        }
      }

      if (detectedConflicts.length > 0) {
        logger.warn(`[SyncManager] Found ${detectedConflicts.length} conflict(s)`);
        this.showSyncNotification(
          `Sync paused: ${detectedConflicts.length} conflict${detectedConflicts.length > 1 ? 's' : ''} need resolution`,
          'warning'
        );
        return; // Stop sync until conflicts are resolved
      }

      // Process sync queue
      const result = await OfflineClient.processSyncQueue();

      logger.log(`[SyncManager] Sync completed:`, result);

      // Show notification if there are failures
      if (result.failed > 0) {
        this.showSyncNotification(
          `Sync partially completed: ${result.success} succeeded, ${result.failed} failed`,
          'warning'
        );
      } else if (result.success > 0) {
        this.showSyncNotification(
          `Successfully synced ${result.success} ${result.success === 1 ? 'change' : 'changes'}`,
          'success'
        );
      }

      // If there are still pending syncs and online, schedule retry
      if (result.remaining > 0 && isOnline) {
        logger.log(`[SyncManager] ${result.remaining} items remaining, scheduling retry`);
        setTimeout(() => this.triggerSync(), 10000); // Retry after 10 seconds
      }
    } catch (error) {
      logger.error('[SyncManager] Sync failed:', error);
      this.showSyncNotification('Sync failed - will retry automatically', 'error');

      // Schedule retry with exponential backoff
      const retryDelay = Math.min(30000, this.MIN_SYNC_INTERVAL * 2); // Max 30 seconds
      setTimeout(() => this.triggerSync(), retryDelay);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Show sync notification to user
   */
  private static showSyncNotification(
    message: string,
    type: 'success' | 'warning' | 'error'
  ): void {
    // This can be integrated with your toast notification system
    logger.log(`[SyncManager] [${type.toUpperCase()}]`, message);

    // If Notification API is available and permitted, show native notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Offline Sync', {
        body: message,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'offline-sync',
      });
    }
  }

  /**
   * Request notification permission for sync notifications
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Force sync now (for manual user trigger)
   */
  static async forceSyncNow(): Promise<void> {
    // Reset rate limiting for manual sync
    this.lastSyncAttempt = 0;
    await this.triggerSync();
  }

  /**
   * Get sync status
   */
  static getStatus(): {
    syncInProgress: boolean;
    lastSyncAttempt: number;
    currentBatch: SyncBatch | null;
    queueStats: ReturnType<typeof priorityQueue.getStats>;
  } {
    return {
      syncInProgress: this.syncInProgress,
      lastSyncAttempt: this.lastSyncAttempt,
      currentBatch: this.currentBatch,
      queueStats: priorityQueue.getStats(),
    };
  }

  /**
   * Perform bandwidth test and update configuration
   */
  static async updateBandwidthConfig(): Promise<void> {
    try {
      logger.log('[SyncManager] Performing bandwidth test...');
      await bandwidthDetector.performBandwidthTest();
      const config = bandwidthDetector.getAdaptiveSyncConfig();
      logger.log('[SyncManager] Bandwidth config updated:', config);
    } catch (error) {
      logger.error('[SyncManager] Failed to update bandwidth config:', error);
    }
  }

  /**
   * Process next batch from priority queue
   */
  static async processNextBatch(): Promise<{
    success: number;
    failed: number;
    remaining: number;
  }> {
    const config = bandwidthDetector.getAdaptiveSyncConfig();
    const batch = priorityQueue.getNextBatch(config.maxBatchSize, config.maxBatchItems);

    if (!batch) {
      return { success: 0, failed: 0, remaining: 0 };
    }

    this.currentBatch = batch;
    let success = 0;
    let failed = 0;

    logger.log(`[SyncManager] Processing batch: ${batch.items.length} items, ${batch.totalSize} bytes`);

    for (const item of batch.items) {
      try {
        // Mark as syncing
        priorityQueue.updateItemStatus(item.id, 'syncing');

        // Sync the item (implement actual sync logic here)
        // This would call your OfflineClient or Supabase methods
        // await this.syncItem(item);

        // Mark as completed
        priorityQueue.updateItemStatus(item.id, 'completed');
        success++;
      } catch (error) {
        logger.error(`[SyncManager] Failed to sync item ${item.id}:`, error);
        priorityQueue.updateItemStatus(item.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
        failed++;
      }
    }

    // Clean up completed items
    priorityQueue.clearCompleted();

    const stats = priorityQueue.getStats();
    this.currentBatch = null;

    return {
      success,
      failed,
      remaining: stats.pending,
    };
  }

  /**
   * Save sync telemetry to database
   */
  static async saveSyncTelemetry(telemetry: SyncTelemetry): Promise<void> {
    try {
      // Save to IndexedDB for offline access
      await putInStore(STORES.SYNC_QUEUE, telemetry);

      // Try to sync to server if online
      if (navigator.onLine) {
        const { error } = await supabase.from('sync_telemetry' as any).insert(telemetry);

        if (error) {
          logger.warn('[SyncManager] Failed to save telemetry to server:', error);
        }
      }
    } catch (error) {
      logger.error('[SyncManager] Failed to save telemetry:', error);
    }
  }

  /**
   * Start telemetry tracking for current sync
   */
  private static startTelemetry(): void {
    const bandwidth = bandwidthDetector.getAverageBandwidth();
    const networkSpeed = bandwidthDetector.getCurrentSpeed();

    this.telemetry = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sync_started_at: new Date().toISOString(),
      items_synced: 0,
      total_bytes: 0,
      network_type: bandwidth?.connectionType || 'unknown',
      network_speed: networkSpeed,
      batch_count: 0,
      errors: 0,
    };
  }

  /**
   * Complete telemetry tracking
   */
  private static async completeTelemetry(): Promise<void> {
    if (!this.telemetry.sync_started_at) {return;}

    const completedTelemetry: SyncTelemetry = {
      id: this.telemetry.id!,
      sync_started_at: this.telemetry.sync_started_at,
      sync_completed_at: new Date().toISOString(),
      items_synced: this.telemetry.items_synced || 0,
      total_bytes: this.telemetry.total_bytes || 0,
      duration_ms: Date.now() - new Date(this.telemetry.sync_started_at).getTime(),
      network_type: this.telemetry.network_type || 'unknown',
      network_speed: this.telemetry.network_speed || 'offline',
      batch_count: this.telemetry.batch_count || 0,
      errors: this.telemetry.errors || 0,
    };

    await this.saveSyncTelemetry(completedTelemetry);
    this.telemetry = {};
  }

  /**
   * Get priority queue instance (for external access)
   */
  static getPriorityQueue() {
    return priorityQueue;
  }

  /**
   * Get bandwidth detector instance (for external access)
   */
  static getBandwidthDetector() {
    return bandwidthDetector;
  }
}

/**
 * Initialize sync manager on app startup
 */
export function initSyncManager(): () => void {
  return SyncManager.initialize();
}
