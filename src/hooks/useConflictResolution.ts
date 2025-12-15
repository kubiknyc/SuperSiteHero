// File: /src/hooks/useConflictResolution.ts
// Hook for conflict detection and resolution

import { useState, useEffect, useCallback } from 'react';
import { useOfflineStore, type SyncConflict } from '@/stores/offline-store';
import {
  ConflictResolver,
  type ResolutionStrategy,
  type FieldSelection,
  type ConflictHistoryEntry,
} from '@/lib/offline/conflict-resolver';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflict: SyncConflict | null;
}

/**
 * Hook for detecting conflicts before sync
 */
export function useDetectConflicts() {
  const { addConflict } = useOfflineStore();

  const detectConflict = useCallback(
    async (
      entityType: string,
      entityId: string,
      localData: Record<string, unknown>,
      localTimestamp: number
    ): Promise<ConflictDetectionResult> => {
      try {
        // Fetch current server version
        const { data: serverData, error } = await supabase
          .from(entityType as 'projects')
          .select('*')
          .eq('id', entityId)
          .single();

        if (error || !serverData) {
          // No server data = no conflict (item may have been deleted or doesn't exist yet)
          return { hasConflict: false, conflict: null };
        }

        // Compare timestamps
        const serverRecord = serverData as { updated_at?: string; created_at?: string };
        const serverTimestamp = new Date(
          serverRecord.updated_at || serverRecord.created_at || Date.now()
        ).getTime();

        // If server timestamp is newer than local timestamp, we have a conflict
        if (serverTimestamp > localTimestamp) {
          const conflict: SyncConflict = {
            id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

          // Add to store
          addConflict(conflict);

          logger.warn('[useDetectConflicts] Conflict detected:', {
            entityType,
            entityId,
            localTime: new Date(localTimestamp).toISOString(),
            serverTime: new Date(serverTimestamp).toISOString(),
          });

          return { hasConflict: true, conflict };
        }

        return { hasConflict: false, conflict: null };
      } catch (error) {
        logger.error('[useDetectConflicts] Error detecting conflict:', error);
        return { hasConflict: false, conflict: null };
      }
    },
    [addConflict]
  );

  return { detectConflict };
}

/**
 * Hook for resolving conflicts
 */
export function useResolveConflict() {
  const { resolveConflict: resolveConflictInStore } = useOfflineStore();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveConflict = useCallback(
    async (
      conflict: SyncConflict,
      strategy: ResolutionStrategy,
      fieldSelections?: FieldSelection[]
    ): Promise<void> => {
      setResolving(true);
      setError(null);

      try {
        let resolvedData: Record<string, unknown>;

        // Generate merged data based on strategy
        if (strategy === 'manual' && fieldSelections) {
          resolvedData = ConflictResolver.applyManualSelections(
            conflict.localData,
            conflict.serverData,
            fieldSelections
          );
        } else {
          const preview = ConflictResolver.generateMergePreview(
            conflict.localData,
            conflict.serverData,
            strategy,
            {
              entityType: conflict.entityType,
              entityId: conflict.entityId,
              localTimestamp: conflict.localTimestamp,
              serverTimestamp: conflict.serverTimestamp,
              detectedAt: conflict.detectedAt,
            }
          );
          resolvedData = preview.mergedData;
        }

        // Record resolution in history
        ConflictResolver.recordResolution(
          conflict.entityType,
          conflict.entityId,
          strategy,
          fieldSelections
        );

        // Resolve in store
        await resolveConflictInStore(conflict.id, strategy, resolvedData);

        logger.log('[useResolveConflict] Conflict resolved:', {
          conflictId: conflict.id,
          strategy,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to resolve conflict';
        setError(errorMessage);
        logger.error('[useResolveConflict] Error resolving conflict:', err);
        throw err;
      } finally {
        setResolving(false);
      }
    },
    [resolveConflictInStore]
  );

  return {
    resolveConflict,
    resolving,
    error,
  };
}

/**
 * Hook for viewing conflict history
 */
export function useConflictHistory(entityType?: string, entityId?: string) {
  const [history, setHistory] = useState<ConflictHistoryEntry[]>([]);

  useEffect(() => {
    const entries = ConflictResolver.getHistory(entityType, entityId);
    setHistory(entries);
  }, [entityType, entityId]);

  const clearHistory = useCallback(() => {
    ConflictResolver.clearHistory();
    setHistory([]);
  }, []);

  return {
    history,
    clearHistory,
  };
}

/**
 * Hook for proactive conflict detection on entity changes
 */
export function useProactiveConflictDetection(
  entityType: string,
  entityId: string | null,
  localData: Record<string, unknown> | null,
  enabled = true
) {
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [checking, setChecking] = useState(false);
  const { detectConflict } = useDetectConflicts();

  useEffect(() => {
    if (!enabled || !entityId || !localData) {
      setConflict(null);
      return;
    }

    const checkForConflict = async () => {
      setChecking(true);
      try {
        const localTimestamp = Date.now();
        const result = await detectConflict(entityType, entityId, localData, localTimestamp);
        setConflict(result.conflict);
      } catch (error) {
        logger.error('[useProactiveConflictDetection] Error checking for conflicts:', error);
      } finally {
        setChecking(false);
      }
    };

    // Debounce conflict checks (check 2 seconds after last change)
    const timeoutId = setTimeout(checkForConflict, 2000);

    return () => clearTimeout(timeoutId);
  }, [entityType, entityId, localData, enabled, detectConflict]);

  return {
    conflict,
    checking,
  };
}

/**
 * Hook for auto-resolution with user override
 */
export function useAutoResolveConflicts(autoResolveEnabled = false) {
  const { conflicts } = useOfflineStore();
  const { resolveConflict } = useResolveConflict();
  const [autoResolved, setAutoResolved] = useState<string[]>([]);

  useEffect(() => {
    if (!autoResolveEnabled || conflicts.length === 0) {
      return;
    }

    const autoResolve = async () => {
      for (const conflict of conflicts) {
        // Skip if already auto-resolved
        if (autoResolved.includes(conflict.id)) {
          continue;
        }

        // Get recommended strategy
        const strategy = ConflictResolver.getRecommendedStrategy(
          conflict.localData,
          conflict.serverData,
          {
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            localTimestamp: conflict.localTimestamp,
            serverTimestamp: conflict.serverTimestamp,
            detectedAt: conflict.detectedAt,
          }
        );

        // Only auto-resolve if strategy is field-level-merge or last-write-wins
        if (strategy === 'field-level-merge' || strategy === 'last-write-wins') {
          try {
            await resolveConflict(conflict, strategy);
            setAutoResolved((prev) => [...prev, conflict.id]);
            logger.log('[useAutoResolveConflicts] Auto-resolved conflict:', {
              conflictId: conflict.id,
              strategy,
            });
          } catch (error) {
            logger.error('[useAutoResolveConflicts] Failed to auto-resolve:', error);
          }
        }
      }
    };

    autoResolve();
  }, [conflicts, autoResolveEnabled, autoResolved, resolveConflict]);

  return {
    autoResolved: autoResolved.length,
    totalConflicts: conflicts.length,
  };
}
