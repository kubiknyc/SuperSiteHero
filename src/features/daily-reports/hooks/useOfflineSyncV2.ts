/**
 * useOfflineSyncV2 - Offline sync hook for Daily Reports V2
 * Provides background sync, conflict resolution, and offline persistence
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDailyReportStoreV2, type ConflictInfo } from '../store/dailyReportStoreV2';
import { saveReportWithAllData } from '@/lib/api/services/daily-reports-v2';
import { supabase } from '@/lib/supabase';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const AUTO_SAVE_DEBOUNCE_MS = 5000; // Auto-save after 5 seconds of inactivity

interface UseOfflineSyncV2Options {
  enableAutoSave?: boolean;
  onSyncSuccess?: () => void;
  onSyncError?: (error: string) => void;
  onConflict?: (conflict: ConflictInfo) => void;
}

export function useOfflineSyncV2(options: UseOfflineSyncV2Options = {}) {
  const {
    enableAutoSave = true,
    onSyncSuccess,
    onSyncError,
    onConflict,
  } = options;

  // Store state
  const draftReport = useDailyReportStoreV2((state) => state.draftReport);
  const workforce = useDailyReportStoreV2((state) => state.workforce);
  const equipment = useDailyReportStoreV2((state) => state.equipment);
  const delays = useDailyReportStoreV2((state) => state.delays);
  const safetyIncidents = useDailyReportStoreV2((state) => state.safetyIncidents);
  const inspections = useDailyReportStoreV2((state) => state.inspections);
  const tmWork = useDailyReportStoreV2((state) => state.tmWork);
  const progress = useDailyReportStoreV2((state) => state.progress);
  const deliveries = useDailyReportStoreV2((state) => state.deliveries);
  const visitors = useDailyReportStoreV2((state) => state.visitors);
  const photos = useDailyReportStoreV2((state) => state.photos);
  const syncStatus = useDailyReportStoreV2((state) => state.syncStatus);
  const syncError = useDailyReportStoreV2((state) => state.syncError);
  const isOnline = useDailyReportStoreV2((state) => state.isOnline);
  const syncQueue = useDailyReportStoreV2((state) => state.syncQueue);
  const conflict = useDailyReportStoreV2((state) => state.conflict);

  // Store actions
  const setSyncStatus = useDailyReportStoreV2((state) => state.setSyncStatus);
  const setOnlineStatus = useDailyReportStoreV2((state) => state.setOnlineStatus);
  const addToSyncQueue = useDailyReportStoreV2((state) => state.addToSyncQueue);
  const removeFromSyncQueue = useDailyReportStoreV2((state) => state.removeFromSyncQueue);
  const setConflict = useDailyReportStoreV2((state) => state.setConflict);
  const resolveConflict = useDailyReportStoreV2((state) => state.resolveConflict);

  // Refs for debouncing
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      // Trigger sync when coming back online
      processSyncQueue();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    // Set initial status
    setOnlineStatus(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // Check for conflicts with server data
  const checkForConflict = useCallback(async (reportId: string, lastKnownUpdatedAt?: number): Promise<{
    hasConflict: boolean;
    serverData?: Partial<typeof draftReport>;
    serverUpdatedAt?: string;
  }> => {
    if (!lastKnownUpdatedAt) {
      return { hasConflict: false };
    }

    try {
      const { data: serverReport, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error || !serverReport) {
        return { hasConflict: false };
      }

      const serverUpdatedAt = (serverReport as any).updated_at;
      if (serverUpdatedAt && new Date(serverUpdatedAt).getTime() > lastKnownUpdatedAt) {
        return {
          hasConflict: true,
          serverData: serverReport as any,
          serverUpdatedAt,
        };
      }

      return { hasConflict: false };
    } catch (_error) {
      return { hasConflict: false };
    }
  }, []);

  // Process sync queue
  const processSyncQueue = useCallback(async () => {
    if (!isOnline || syncQueue.length === 0 || isSyncingRef.current || conflict) {
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    for (const item of syncQueue) {
      if (item.retries >= MAX_RETRIES) {
        removeFromSyncQueue(item.id);
        onSyncError?.(`Failed to sync after ${MAX_RETRIES} attempts`);
        continue;
      }

      try {
        if (!draftReport) {
          throw new Error('No draft report found');
        }

        // Check for conflicts before syncing
        const conflictResult = await checkForConflict(item.reportId, item.timestamp);

        if (conflictResult.hasConflict && conflictResult.serverData && conflictResult.serverUpdatedAt) {
          const conflictInfo: ConflictInfo = {
            reportId: item.reportId,
            localUpdatedAt: item.timestamp,
            serverUpdatedAt: conflictResult.serverUpdatedAt,
            serverData: conflictResult.serverData,
          };
          setConflict(conflictInfo);
          onConflict?.(conflictInfo);
          isSyncingRef.current = false;
          return;
        }

        // Perform the sync
        await saveReportWithAllData(item.reportId, {
          report: draftReport as any,
          workforce,
          equipment,
          delays,
          safety_incidents: safetyIncidents,
          inspections,
          tm_work: tmWork,
          progress,
          deliveries,
          visitors,
          photos,
        });

        // Success - remove from queue
        removeFromSyncQueue(item.id);
        setSyncStatus('success');
        onSyncSuccess?.();

        // Reset to idle after a short delay
        setTimeout(() => {
          setSyncStatus('idle');
        }, 2000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Calculate backoff delay
        const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, item.retries);

        setSyncStatus('error', errorMessage);
        onSyncError?.(errorMessage);

        // Schedule retry
        if (item.retries < MAX_RETRIES - 1) {
          setTimeout(() => {
            processSyncQueue();
          }, delay);
        }

        break;
      }
    }

    isSyncingRef.current = false;
  }, [
    isOnline,
    syncQueue,
    conflict,
    draftReport,
    workforce,
    equipment,
    delays,
    safetyIncidents,
    inspections,
    tmWork,
    progress,
    deliveries,
    visitors,
    photos,
    setSyncStatus,
    removeFromSyncQueue,
    setConflict,
    checkForConflict,
    onSyncSuccess,
    onSyncError,
    onConflict,
  ]);

  // Auto-save when draft is dirty
  useEffect(() => {
    if (!enableAutoSave || !draftReport?._isDirty || !isOnline) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for debounced save
    autoSaveTimerRef.current = setTimeout(() => {
      if (draftReport?.id && draftReport._isDirty) {
        addToSyncQueue({
          id: crypto.randomUUID(),
          reportId: draftReport.id,
          action: 'update',
        });
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [draftReport?._isDirty, draftReport?.id, enableAutoSave, isOnline, addToSyncQueue]);

  // Auto-process queue when items are added
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !conflict && !isSyncingRef.current) {
      const timer = setTimeout(() => {
        processSyncQueue();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [syncQueue.length, isOnline, conflict, processSyncQueue]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (!draftReport?.id) {return;}

    addToSyncQueue({
      id: crypto.randomUUID(),
      reportId: draftReport.id,
      action: draftReport._lastSavedAt ? 'update' : 'create',
    });
  }, [draftReport?.id, draftReport?._lastSavedAt, addToSyncQueue]);

  // Handle conflict resolution
  const handleResolveConflict = useCallback((strategy: 'keep_local' | 'keep_server' | 'merge') => {
    resolveConflict(strategy);

    // If keeping local or merging, trigger sync
    if (strategy !== 'keep_server') {
      setTimeout(() => {
        processSyncQueue();
      }, 100);
    }
  }, [resolveConflict, processSyncQueue]);

  return {
    // Status
    syncStatus,
    syncError,
    isOnline,
    isSyncing: syncStatus === 'syncing',

    // Pending sync info
    hasPendingSync: syncQueue.length > 0,
    pendingSyncCount: syncQueue.length,

    // Manual controls
    triggerSync,
    manualSync: processSyncQueue,

    // Conflict resolution
    hasConflict: !!conflict,
    conflict,
    resolveConflict: handleResolveConflict,
  };
}

export default useOfflineSyncV2;
