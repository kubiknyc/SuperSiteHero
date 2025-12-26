// File: /src/components/OfflineIndicator.tsx
// Offline status indicator component

import { useEffect, useState } from 'react';
import {
  useIsOnline,
  usePendingSyncs,
  useIsSyncing,
  useLastSyncTime,
  useConflictCount,
  useStorageQuota,
  useOfflineStore,
} from '@/stores/offline-store';
import { OfflineClient } from '@/lib/api/offline-client';
import { usePhotoQueue } from '@/hooks/usePhotoQueue';
import { WifiOff, Wifi, Cloud, CloudOff, AlertTriangle, RefreshCw, Info, ExternalLink, X, Image, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { SyncStatusPanel } from '@/components/SyncStatusPanel';
import { logger } from '../lib/utils/logger';


/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 Bytes';}
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) {return 'Never';}

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {return 'Just now';}
  if (minutes < 60) {return `${minutes}m ago`;}
  if (hours < 24) {return `${hours}h ago`;}
  return `${days}d ago`;
}

/**
 * Offline status indicator component
 */
export function OfflineIndicator() {
  const isOnline = useIsOnline();
  const pendingSyncs = usePendingSyncs();
  const isSyncing = useIsSyncing();
  const lastSyncTime = useLastSyncTime();
  const conflictCount = useConflictCount();
  const storageQuota = useStorageQuota();
  const [isSyncingManually, setIsSyncingManually] = useState(false);
  const { stats: photoStats, hasPending: hasPhotoPending, hasFailed: hasPhotoFailed, formattedSize: photoSize, retryFailed: retryPhotos } = usePhotoQueue();

  // Update pending syncs count periodically (only when online)
  useEffect(() => {
    // Initial update
    if (isOnline) {
      useOfflineStore.getState().updatePendingSyncs();
      useOfflineStore.getState().updateConflictCount();
    }

    const interval = setInterval(() => {
      // Only poll when online to reduce noise
      if (isOnline) {
        useOfflineStore.getState().updatePendingSyncs();
        useOfflineStore.getState().updateConflictCount();
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isOnline]);

  // Handle manual sync
  const handleManualSync = async () => {
    if (!isOnline || isSyncing || isSyncingManually) {return;}

    setIsSyncingManually(true);
    try {
      const result = await OfflineClient.processSyncQueue();
      logger.log('[OfflineIndicator] Sync completed:', result);
    } catch (error) {
      logger.error('[OfflineIndicator] Sync failed:', error);
    } finally {
      setIsSyncingManually(false);
    }
  };

  // Determine status color and icon
  const getStatusDisplay = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-error',
        bgColor: 'bg-error-light',
        borderColor: 'border-red-200',
        label: 'Offline',
      };
    }

    if (pendingSyncs > 0 || isSyncing) {
      return {
        icon: CloudOff,
        color: 'text-warning',
        bgColor: 'bg-warning-light',
        borderColor: 'border-amber-200',
        label: 'Syncing',
      };
    }

    if (conflictCount > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Conflicts',
      };
    }

    return {
      icon: Cloud,
      color: 'text-success',
      bgColor: 'bg-success-light',
      borderColor: 'border-green-200',
      label: 'Online',
    };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  // Calculate storage usage percentage
  const storagePercentage = storageQuota
    ? (storageQuota.used / storageQuota.total) * 100
    : 0;

  const [showFullPanel, setShowFullPanel] = useState(false);

  return (
    <>
      <Dialog open={showFullPanel} onOpenChange={setShowFullPanel}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 px-2 gap-2"
            title={`${status.label} - Click for details`}
          >
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            {pendingSyncs > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {pendingSyncs}
              </Badge>
            )}
            {conflictCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {conflictCount}
              </Badge>
            )}
            {hasPhotoPending && (
              <Badge variant="outline" className="h-5 px-1.5 text-xs gap-1">
                <Image className="h-3 w-3" />
                {photoStats.pending + photoStats.uploading}
              </Badge>
            )}
            {isSyncing && (
              <RefreshCw className="h-3 w-3 animate-spin text-warning" />
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${status.color}`} />
              {status.label}
            </DialogTitle>
            <DialogDescription>
              {isOnline ? 'Connected to server' : 'Working offline'}
            </DialogDescription>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-6 w-6"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sync Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending syncs</span>
                <span className="font-medium">{pendingSyncs}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last sync</span>
                <span className="font-medium">{formatRelativeTime(lastSyncTime)}</span>
              </div>

              {conflictCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conflicts</span>
                  <Badge variant="destructive">{conflictCount}</Badge>
                </div>
              )}

              {/* Photo Queue Status */}
              {(hasPhotoPending || hasPhotoFailed) && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Photo Uploads
                    </span>
                    {hasPhotoFailed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={retryPhotos}
                        className="h-6 px-2 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {photoStats.pending > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pending</span>
                        <span>{photoStats.pending}</span>
                      </div>
                    )}
                    {photoStats.uploading > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Uploading</span>
                        <span className="flex items-center gap-1">
                          {photoStats.uploading}
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        </span>
                      </div>
                    )}
                    {photoStats.failed > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-error">Failed</span>
                        <span className="text-error">{photoStats.failed}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-muted-foreground">Total size</span>
                      <span>{photoSize}</span>
                    </div>
                  </div>
                </div>
              )}

              {isSyncing && (
                <div className="flex items-center gap-2 text-sm text-warning">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Syncing changes...</span>
                </div>
              )}
            </div>

            {/* Manual Sync Button */}
            {isOnline && pendingSyncs > 0 && (
              <Button
                onClick={handleManualSync}
                disabled={isSyncing || isSyncingManually}
                size="sm"
                className="w-full"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    isSyncing || isSyncingManually ? 'animate-spin' : ''
                  }`}
                />
                {isSyncing || isSyncingManually ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}

            {/* Storage Quota */}
            {storageQuota && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage used</span>
                  <span className="font-medium">
                    {formatBytes(storageQuota.used)} / {formatBytes(storageQuota.total)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      storageQuota.critical
                        ? 'bg-red-500'
                        : storageQuota.warning
                        ? 'bg-warning'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, storagePercentage)}%` }}
                  />
                </div>
                {storageQuota.warning && (
                  <p className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {storageQuota.critical
                      ? 'Storage critically low (<5%)'
                      : 'Storage running low (<10%)'}
                  </p>
                )}
              </div>
            )}

            {/* Offline Mode Info */}
            {!isOnline && (
              <div className="rounded-md bg-warning-light border border-amber-200 p-3">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  You're working offline. Changes will be synced when you reconnect.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Sync Status Panel Dialog */}
      {(pendingSyncs > 0 || conflictCount > 0) && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed bottom-4 right-4 shadow-lg"
              title="View detailed sync status"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Sync Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Sync Queue Details</DialogTitle>
              <DialogDescription>
                View and manage pending syncs and conflicts
              </DialogDescription>
            </DialogHeader>
            <SyncStatusPanel />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
