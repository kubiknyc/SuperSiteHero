// File: /src/lib/offline/data-prefetcher.ts
// Service for proactively prefetching project data for offline use

import { supabase } from '@/lib/supabase';
import { putInStore, STORES } from './indexeddb';
import { bandwidthDetector } from './bandwidth-detector';
import { logger } from '@/lib/utils/logger';

/**
 * Prefetch progress state
 */
export interface PrefetchProgress {
  projectId: string;
  status: 'idle' | 'prefetching' | 'completed' | 'failed';
  currentEntity: string | null;
  entitiesCompleted: number;
  totalEntities: number;
  bytesDownloaded: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

/**
 * Prefetch configuration by entity type
 */
interface PrefetchConfig {
  table: string;
  label: string;
  priority: number; // Lower = higher priority
  criticalOnly?: boolean; // Only fetch on slow networks
  filter?: (projectId: string) => Record<string, any>;
}

/**
 * Ordered list of entities to prefetch
 */
const PREFETCH_ORDER: PrefetchConfig[] = [
  {
    table: 'projects',
    label: 'Project details',
    priority: 1,
    filter: (projectId) => ({ id: projectId }),
  },
  {
    table: 'daily_reports',
    label: 'Daily reports (7 days)',
    priority: 2,
    filter: (projectId) => ({
      project_id: projectId,
      // Last 7 days
      created_at: `gte.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`,
    }),
  },
  {
    table: 'punch_items',
    label: 'Punch list items',
    priority: 3,
    filter: (projectId) => ({ project_id: projectId, status: 'neq.completed' }),
  },
  {
    table: 'tasks',
    label: 'Open tasks',
    priority: 4,
    filter: (projectId) => ({ project_id: projectId, status: 'neq.completed' }),
  },
  {
    table: 'rfis',
    label: 'Open RFIs',
    priority: 5,
    filter: (projectId) => ({ project_id: projectId, status: 'neq.closed' }),
  },
  {
    table: 'submittals',
    label: 'Open submittals',
    priority: 6,
    criticalOnly: false,
    filter: (projectId) => ({ project_id: projectId, status: 'neq.approved' }),
  },
  {
    table: 'documents',
    label: 'Recent documents',
    priority: 7,
    criticalOnly: true, // Skip on slow networks
    filter: (projectId) => ({
      project_id: projectId,
      // Last 30 days
      updated_at: `gte.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`,
    }),
  },
  {
    table: 'change_orders',
    label: 'Change orders',
    priority: 8,
    criticalOnly: true,
    filter: (projectId) => ({ project_id: projectId }),
  },
];

/**
 * Prefetch status stored per project
 */
const PREFETCH_STATUS_KEY = 'jobsight-prefetch-status';

/**
 * Data Prefetcher Service
 *
 * Proactively caches project data for offline use.
 * Respects bandwidth limits and provides progress updates.
 */
export class DataPrefetcher {
  private static currentProgress: PrefetchProgress | null = null;
  private static abortController: AbortController | null = null;

  /**
   * Get current prefetch progress
   */
  static getProgress(): PrefetchProgress | null {
    return this.currentProgress;
  }

  /**
   * Check if a project has been prefetched
   */
  static async getProjectPrefetchStatus(projectId: string): Promise<{
    isPrefetched: boolean;
    prefetchedAt: number | null;
  }> {
    try {
      const statusJson = localStorage.getItem(PREFETCH_STATUS_KEY);
      const status = statusJson ? JSON.parse(statusJson) : {};
      return {
        isPrefetched: !!status[projectId],
        prefetchedAt: status[projectId] || null,
      };
    } catch {
      return { isPrefetched: false, prefetchedAt: null };
    }
  }

  /**
   * Mark a project as prefetched
   */
  private static markProjectPrefetched(projectId: string): void {
    try {
      const statusJson = localStorage.getItem(PREFETCH_STATUS_KEY);
      const status = statusJson ? JSON.parse(statusJson) : {};
      status[projectId] = Date.now();
      localStorage.setItem(PREFETCH_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      logger.error('[DataPrefetcher] Failed to save prefetch status:', error);
    }
  }

  /**
   * Cancel ongoing prefetch
   */
  static cancelPrefetch(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentProgress) {
      this.currentProgress = {
        ...this.currentProgress,
        status: 'idle',
      };
    }
  }

  /**
   * Prefetch all data for a project
   *
   * @param projectId - The project ID to prefetch
   * @param onProgress - Optional callback for progress updates
   * @returns Promise resolving when prefetch is complete
   */
  static async prefetchProject(
    projectId: string,
    onProgress?: (progress: PrefetchProgress) => void
  ): Promise<void> {
    // Check if already prefetching
    if (this.currentProgress?.status === 'prefetching') {
      logger.warn('[DataPrefetcher] Prefetch already in progress');
      return;
    }

    // Check network
    if (!navigator.onLine) {
      throw new Error('Cannot prefetch while offline');
    }

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    // Determine network speed and filter entities accordingly
    const networkSpeed = bandwidthDetector.getCurrentSpeed();
    const isSlowNetwork = networkSpeed === 'slow' || networkSpeed === 'offline';

    // Filter entities based on network speed
    const entitiesToPrefetch = PREFETCH_ORDER.filter(
      (entity) => !entity.criticalOnly || !isSlowNetwork
    );

    // Initialize progress
    this.currentProgress = {
      projectId,
      status: 'prefetching',
      currentEntity: null,
      entitiesCompleted: 0,
      totalEntities: entitiesToPrefetch.length,
      bytesDownloaded: 0,
      startedAt: Date.now(),
      completedAt: null,
      error: null,
    };

    logger.log(
      `[DataPrefetcher] Starting prefetch for project ${projectId} (${entitiesToPrefetch.length} entities)`
    );

    try {
      for (const entity of entitiesToPrefetch) {
        // Check for abort
        if (this.abortController.signal.aborted) {
          logger.log('[DataPrefetcher] Prefetch cancelled');
          break;
        }

        // Update progress
        this.currentProgress = {
          ...this.currentProgress,
          currentEntity: entity.label,
        };
        onProgress?.(this.currentProgress);

        try {
          // Build query
          const filters = entity.filter?.(projectId) || { project_id: projectId };

          // Fetch data from Supabase
          const { data, error } = await supabase
            .from(entity.table as any)
            .select('*')
            .match(filters)
            .limit(100); // Limit to prevent huge downloads

          if (error) {
            logger.warn(`[DataPrefetcher] Failed to fetch ${entity.table}:`, error);
            continue; // Continue with next entity
          }

          if (data && data.length > 0) {
            // Cache each record
            for (const record of data) {
              const cacheKey = `${entity.table}:${record.id}`;
              const cachedData = {
                key: cacheKey,
                table: entity.table,
                data: record,
                timestamp: Date.now(),
                expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
              };

              await putInStore(STORES.CACHED_DATA, cachedData);

              // Update bytes downloaded (rough estimate)
              this.currentProgress = {
                ...this.currentProgress,
                bytesDownloaded:
                  this.currentProgress.bytesDownloaded + JSON.stringify(record).length,
              };
            }

            logger.log(`[DataPrefetcher] Cached ${data.length} ${entity.table} records`);
          }
        } catch (entityError) {
          logger.error(`[DataPrefetcher] Error prefetching ${entity.table}:`, entityError);
          // Continue with next entity
        }

        // Update completed count
        this.currentProgress = {
          ...this.currentProgress,
          entitiesCompleted: this.currentProgress.entitiesCompleted + 1,
        };
        onProgress?.(this.currentProgress);
      }

      // Mark as completed
      this.currentProgress = {
        ...this.currentProgress,
        status: 'completed',
        currentEntity: null,
        completedAt: Date.now(),
      };

      // Save prefetch status
      this.markProjectPrefetched(projectId);

      logger.log(
        `[DataPrefetcher] Prefetch completed: ${this.currentProgress.bytesDownloaded} bytes downloaded`
      );
    } catch (error) {
      this.currentProgress = {
        ...this.currentProgress,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
      };
      logger.error('[DataPrefetcher] Prefetch failed:', error);
      throw error;
    } finally {
      this.abortController = null;
      onProgress?.(this.currentProgress);
    }
  }

  /**
   * Prefetch critical data for all user's projects
   * Called on app startup when online
   */
  static async prefetchCriticalData(): Promise<void> {
    if (!navigator.onLine) {return;}

    try {
      // Fetch user's active projects
      const { data: projects, error } = await supabase
        .from('projects' as any)
        .select('id, name')
        .eq('status', 'active')
        .limit(5); // Only prefetch first 5 projects

      if (error || !projects) {
        logger.warn('[DataPrefetcher] Could not fetch projects for prefetch:', error);
        return;
      }

      // Cache the projects list
      const cacheKey = 'projects:active:list';
      await putInStore(STORES.CACHED_DATA, {
        key: cacheKey,
        table: 'projects',
        data: projects,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      logger.log(`[DataPrefetcher] Cached ${projects.length} active projects`);
    } catch (error) {
      logger.error('[DataPrefetcher] Critical data prefetch failed:', error);
    }
  }

  /**
   * Clear prefetch status for a project
   */
  static clearProjectPrefetchStatus(projectId: string): void {
    try {
      const statusJson = localStorage.getItem(PREFETCH_STATUS_KEY);
      const status = statusJson ? JSON.parse(statusJson) : {};
      delete status[projectId];
      localStorage.setItem(PREFETCH_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      logger.error('[DataPrefetcher] Failed to clear prefetch status:', error);
    }
  }
}

/**
 * Export helper for simpler access
 */
export const dataPrefetcher = DataPrefetcher;
