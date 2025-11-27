// File: /src/lib/offline/sync-manager.ts
// Background sync manager for automatic offline data synchronization

import { OfflineClient } from '../api/offline-client';
import { useOfflineStore } from '@/stores/offline-store';

/**
 * Background sync manager
 * Handles automatic synchronization when network is restored
 */
export class SyncManager {
  private static syncInProgress = false;
  private static syncInterval: ReturnType<typeof setInterval> | null = null;
  private static lastSyncAttempt = 0;
  private static readonly MIN_SYNC_INTERVAL = 5000; // 5 seconds minimum between syncs

  /**
   * Initialize background sync
   * Sets up event listeners and periodic sync checks
   */
  static initialize(): () => void {
    console.log('[SyncManager] Initializing background sync');

    // Listen for online event
    const handleOnline = () => {
      console.log('[SyncManager] Network restored - triggering sync');
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
      console.log('[SyncManager] Cleaning up background sync');
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
        console.log('[SyncManager] Background sync registered with Service Worker');
      }
    } catch (error) {
      console.error('[SyncManager] Failed to register background sync:', error);
    }
  }

  /**
   * Trigger sync manually or automatically
   */
  static async triggerSync(): Promise<void> {
    // Prevent concurrent syncs
    if (this.syncInProgress) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return;
    }

    // Rate limiting - prevent syncing too frequently
    const now = Date.now();
    if (now - this.lastSyncAttempt < this.MIN_SYNC_INTERVAL) {
      console.log('[SyncManager] Sync rate limited, try again later');
      return;
    }

    // Check if online
    const { isOnline, pendingSyncs } = useOfflineStore.getState();
    if (!isOnline) {
      console.log('[SyncManager] Cannot sync while offline');
      return;
    }

    if (pendingSyncs === 0) {
      console.log('[SyncManager] No pending syncs');
      return;
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = now;

    try {
      console.log(`[SyncManager] Starting sync for ${pendingSyncs} pending mutations`);
      const result = await OfflineClient.processSyncQueue();

      console.log(`[SyncManager] Sync completed:`, result);

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
        console.log(`[SyncManager] ${result.remaining} items remaining, scheduling retry`);
        setTimeout(() => this.triggerSync(), 10000); // Retry after 10 seconds
      }
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
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
    console.log(`[SyncManager] [${type.toUpperCase()}]`, message);

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
  } {
    return {
      syncInProgress: this.syncInProgress,
      lastSyncAttempt: this.lastSyncAttempt,
    };
  }
}

/**
 * Initialize sync manager on app startup
 */
export function initSyncManager(): () => void {
  return SyncManager.initialize();
}
