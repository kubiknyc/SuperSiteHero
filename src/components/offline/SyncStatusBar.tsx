// File: /src/components/offline/SyncStatusBar.tsx
// Persistent sync status bar component with network and sync information

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useOfflineStore, useIsOnline, usePendingSyncs, useIsSyncing, useLastSyncTime } from '@/stores/offline-store';
import { SyncManager } from '@/lib/offline/sync-manager';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatusBarProps {
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Persistent sync status bar
 * Shows:
 * - Network status (online/offline/syncing)
 * - Pending items count
 * - Last sync time
 * - Expandable details on click
 */
export function SyncStatusBar({ position = 'top', className }: SyncStatusBarProps) {
  const isOnline = useIsOnline();
  const pendingSyncs = usePendingSyncs();
  const isSyncing = useIsSyncing();
  const lastSyncTime = useLastSyncTime();
  const [expanded, setExpanded] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  // Update sync progress
  useEffect(() => {
    if (isSyncing) {
      const stats = SyncManager.getStatus();
      if (stats.currentBatch) {
        const completed = stats.currentBatch.items.filter(i => i.status === 'completed').length;
        setSyncProgress({
          current: completed,
          total: stats.currentBatch.items.length,
        });
      }
    } else {
      setSyncProgress(null);
    }
  }, [isSyncing]);

  const getNetworkBadge = () => {
    if (isSyncing) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300 animate-pulse">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing
        </Badge>
      );
    }

    if (isOnline) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
          <Wifi className="h-3 w-3 mr-1" />
          Online
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-300">
        <WifiOff className="h-3 w-3 mr-1" />
        Offline
      </Badge>
    );
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';

    try {
      return formatDistanceToNow(lastSyncTime, { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    await SyncManager.forceSyncNow();
  };

  const getStatusColor = () => {
    if (isSyncing) return 'bg-blue-500';
    if (isOnline && pendingSyncs === 0) return 'bg-green-500';
    if (isOnline && pendingSyncs > 0) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusMessage = () => {
    if (isSyncing) {
      if (syncProgress) {
        return `Syncing ${syncProgress.current} of ${syncProgress.total} items...`;
      }
      return 'Syncing...';
    }

    if (!isOnline) return 'Working offline';
    if (pendingSyncs === 0) return 'All synced';
    return `${pendingSyncs} pending`;
  };

  return (
    <Popover open={expanded} onOpenChange={setExpanded}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
            position === 'bottom' && 'border-t border-b-0',
            className
          )}
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full', getStatusColor())} />
                <span className="text-sm font-medium">{getStatusMessage()}</span>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2">
                {getNetworkBadge()}

                {pendingSyncs > 0 && !isSyncing && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    <Clock className="h-3 w-3 mr-1" />
                    {pendingSyncs} pending
                  </Badge>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    setExpanded(!expanded);
                  }}
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      expanded && 'rotate-180'
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            {isSyncing && syncProgress && (
              <div className="mt-2 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{
                    width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <h4 className="font-medium text-sm">Sync Status</h4>
            <p className="text-xs text-muted-foreground">
              Network and synchronization information
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              {getNetworkBadge()}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending items:</span>
              <span className="font-medium">
                {pendingSyncs > 0 ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    {pendingSyncs}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    0
                  </Badge>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last sync:</span>
              <span className="font-medium text-xs">{formatLastSync()}</span>
            </div>

            {isSyncing && syncProgress && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium">
                  {syncProgress.current} / {syncProgress.total}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing || pendingSyncs === 0}
            >
              <RefreshCw className={cn('h-3 w-3 mr-2', isSyncing && 'animate-spin')} />
              Sync Now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(false)}
            >
              Close
            </Button>
          </div>

          {/* Info message */}
          {!isOnline && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 dark:text-amber-400">
                You're working offline. Changes will sync automatically when connection is restored.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
