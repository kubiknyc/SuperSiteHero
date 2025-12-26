// File: /src/hooks/usePhotoQueue.ts
// Hook for tracking photo upload queue state

import { useState, useEffect, useCallback } from 'react';
import { getQueueStats, retryFailedPhotos, clearUploadedPhotos } from '@/lib/offline/photo-queue';
import { useIsOnline } from '@/stores/offline-store';
import { logger } from '@/lib/utils/logger';

export interface PhotoQueueStats {
  total: number;
  pending: number;
  uploading: number;
  failed: number;
  uploaded: number;
  totalSize: number;
}

const defaultStats: PhotoQueueStats = {
  total: 0,
  pending: 0,
  uploading: 0,
  failed: 0,
  uploaded: 0,
  totalSize: 0,
};

/**
 * Hook to track photo upload queue state
 * Polls for updates and provides actions for queue management
 */
export function usePhotoQueue() {
  const [stats, setStats] = useState<PhotoQueueStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const isOnline = useIsOnline();

  // Fetch current queue stats
  const refreshStats = useCallback(async () => {
    try {
      const queueStats = await getQueueStats();
      setStats(queueStats);
    } catch (error) {
      logger.error('[usePhotoQueue] Failed to get queue stats:', error);
      // Keep existing stats on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Retry failed uploads
  const retryFailed = useCallback(async () => {
    try {
      await retryFailedPhotos();
      await refreshStats();
      logger.log('[usePhotoQueue] Retried failed photos');
    } catch (error) {
      logger.error('[usePhotoQueue] Failed to retry photos:', error);
    }
  }, [refreshStats]);

  // Clear completed uploads
  const clearCompleted = useCallback(async () => {
    try {
      const count = await clearUploadedPhotos();
      await refreshStats();
      logger.log(`[usePhotoQueue] Cleared ${count} completed uploads`);
      return count;
    } catch (error) {
      logger.error('[usePhotoQueue] Failed to clear completed:', error);
      return 0;
    }
  }, [refreshStats]);

  // Poll for updates
  useEffect(() => {
    // Initial load
    refreshStats();

    // Poll every 5 seconds when there are pending/uploading items
    // or every 30 seconds otherwise
    const pollInterval = setInterval(() => {
      refreshStats();
    }, stats.pending > 0 || stats.uploading > 0 ? 5000 : 30000);

    return () => clearInterval(pollInterval);
  }, [refreshStats, stats.pending, stats.uploading]);

  // Refresh when coming online
  useEffect(() => {
    if (isOnline) {
      refreshStats();
    }
  }, [isOnline, refreshStats]);

  // Derived values
  const hasPending = stats.pending > 0 || stats.uploading > 0;
  const hasFailed = stats.failed > 0;
  const isUploading = stats.uploading > 0;

  // Format total size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) {return '0 B';}
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return {
    stats,
    isLoading,
    hasPending,
    hasFailed,
    isUploading,
    pendingCount: stats.pending + stats.uploading,
    formattedSize: formatSize(stats.totalSize),
    refreshStats,
    retryFailed,
    clearCompleted,
  };
}
