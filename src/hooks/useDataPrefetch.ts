// File: /src/hooks/useDataPrefetch.ts
// Hook for prefetching project data for offline use

import { useState, useCallback, useEffect } from 'react';
import { DataPrefetcher, type PrefetchProgress } from '@/lib/offline/data-prefetcher';
import { useIsOnline } from '@/stores/offline-store';
import { logger } from '@/lib/utils/logger';

interface UseDataPrefetchResult {
  /** Whether prefetch is in progress */
  isPrefetching: boolean;
  /** Current progress (if prefetching) */
  progress: PrefetchProgress | null;
  /** Whether the project has been prefetched */
  isPrefetched: boolean;
  /** When the project was last prefetched */
  prefetchedAt: number | null;
  /** Start prefetching the project */
  startPrefetch: () => Promise<void>;
  /** Cancel ongoing prefetch */
  cancelPrefetch: () => void;
  /** Clear prefetch status */
  clearPrefetchStatus: () => void;
  /** Error message if prefetch failed */
  error: string | null;
}

/**
 * Hook to prefetch project data for offline use
 *
 * @param projectId - The project ID to prefetch
 * @returns Prefetch state and controls
 *
 * @example
 * ```tsx
 * const { isPrefetching, progress, startPrefetch, isPrefetched } = useDataPrefetch(projectId);
 *
 * return (
 *   <Button onClick={startPrefetch} disabled={isPrefetching || isPrefetched}>
 *     {isPrefetched ? 'Available Offline' : 'Make Available Offline'}
 *   </Button>
 * );
 * ```
 */
export function useDataPrefetch(projectId: string): UseDataPrefetchResult {
  const isOnline = useIsOnline();
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);
  const [isPrefetched, setIsPrefetched] = useState(false);
  const [prefetchedAt, setPrefetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check initial prefetch status
  useEffect(() => {
    const checkStatus = async () => {
      const status = await DataPrefetcher.getProjectPrefetchStatus(projectId);
      setIsPrefetched(status.isPrefetched);
      setPrefetchedAt(status.prefetchedAt);
    };
    checkStatus();
  }, [projectId]);

  // Start prefetching
  const startPrefetch = useCallback(async () => {
    if (!isOnline) {
      setError('Cannot prefetch while offline');
      return;
    }

    if (isPrefetching) {
      return;
    }

    setIsPrefetching(true);
    setError(null);

    try {
      await DataPrefetcher.prefetchProject(projectId, (newProgress) => {
        setProgress(newProgress);

        if (newProgress.status === 'completed') {
          setIsPrefetched(true);
          setPrefetchedAt(newProgress.completedAt);
        } else if (newProgress.status === 'failed') {
          setError(newProgress.error);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Prefetch failed';
      setError(errorMessage);
      logger.error('[useDataPrefetch] Prefetch failed:', err);
    } finally {
      setIsPrefetching(false);
    }
  }, [projectId, isOnline, isPrefetching]);

  // Cancel prefetch
  const cancelPrefetch = useCallback(() => {
    DataPrefetcher.cancelPrefetch();
    setIsPrefetching(false);
    setProgress(null);
  }, []);

  // Clear prefetch status
  const clearPrefetchStatus = useCallback(() => {
    DataPrefetcher.clearProjectPrefetchStatus(projectId);
    setIsPrefetched(false);
    setPrefetchedAt(null);
  }, [projectId]);

  return {
    isPrefetching,
    progress,
    isPrefetched,
    prefetchedAt,
    startPrefetch,
    cancelPrefetch,
    clearPrefetchStatus,
    error,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) {return 'Never';}

  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {return 'Just now';}
  if (minutes < 60) {return `${minutes}m ago`;}
  if (hours < 24) {return `${hours}h ago`;}
  if (days < 7) {return `${days}d ago`;}
  return new Date(timestamp).toLocaleDateString();
}
