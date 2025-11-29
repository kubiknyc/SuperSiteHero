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
import { WifiOff, Wifi, Cloud, CloudOff, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

  // Update pending syncs count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      useOfflineStore.getState().updatePendingSyncs();
      useOfflineStore.getState().updateConflictCount();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle manual sync
  const handleManualSync = async () => {
    if (!isOnline || isSyncing || isSyncingManually) {return;}

    setIsSyncingManually(true);
    try {
      const result = await OfflineClient.processSyncQueue();
      console.log('[OfflineIndicator] Sync completed:', result);
    } catch (error) {
      console.error('[OfflineIndicator] Sync failed:', error);
    } finally {
      setIsSyncingManually(false);
    }
  };

  // Determine status color and icon
  const getStatusDisplay = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Offline',
      };
    }

    if (pendingSyncs > 0 || isSyncing) {
      return {
        icon: CloudOff,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
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
      color: 'text-green-500',
      bgColor: 'bg-green-50',
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

  return (
    <Dialog>
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
          {isSyncing && (
            <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${status.color}`} />
            {status.label}
          </DialogTitle>
          <DialogDescription>
            {isOnline ? 'Connected to server' : 'Working offline'}
          </DialogDescription>
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
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${
                    storageQuota.critical
                      ? 'bg-red-500'
                      : storageQuota.warning
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, storagePercentage)}%` }}
                />
              </div>
              {storageQuota.warning && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
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
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <Info className="h-4 w-4" />
                You're working offline. Changes will be synced when you reconnect.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
