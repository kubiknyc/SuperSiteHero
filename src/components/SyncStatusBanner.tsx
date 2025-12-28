/**
 * SyncStatusBanner - Global offline mode and sync status banner
 * Shows connection status, pending syncs, and sync progress
 */

import { useEffect, useState } from 'react';
import { WifiOff, CloudOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export interface SyncStatusBannerProps {
  pendingSyncs?: number;
  isSyncing?: boolean;
  syncError?: string | null;
  onRetrySync?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function SyncStatusBanner({
  pendingSyncs = 0,
  isSyncing = false,
  syncError = null,
  onRetrySync,
  onDismiss,
  className,
}: SyncStatusBannerProps) {
  const { isOnline, networkQuality } = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Use state to track current time to avoid calling Date.now() during render
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track when sync completes
  useEffect(() => {
    if (!isSyncing && pendingSyncs === 0 && isOnline) {
      setTimeout(() => {
        setLastSyncTime(new Date());
      }, 0);
    }
  }, [isSyncing, pendingSyncs, isOnline]);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (lastSyncTime && !isSyncing && pendingSyncs === 0 && isOnline) {
      const timer = setTimeout(() => {
        setDismissed(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastSyncTime, isSyncing, pendingSyncs, isOnline]);

  // Reset dismissed state when going offline or having pending syncs
  useEffect(() => {
    if (!isOnline || pendingSyncs > 0) {
      setTimeout(() => {
        setDismissed(false);
      }, 0);
    }
  }, [isOnline, pendingSyncs]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Don't show if dismissed and everything is ok
  if (dismissed && isOnline && pendingSyncs === 0 && !syncError) {
    return null;
  }

  // Offline mode
  if (!isOnline) {
    return (
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-warning-light border-b border-yellow-200 shadow-sm',
        className
      )}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  You're offline
                </p>
                <p className="text-xs text-warning mt-0.5">
                  Changes will sync automatically when you're back online
                  {pendingSyncs > 0 && (
                    <span className="ml-1 font-medium">
                      ({pendingSyncs} pending)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-warning hover:text-yellow-800 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Slow connection warning
  if (networkQuality.type === 'slow') {
    return (
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-orange-50 border-b border-orange-200 shadow-sm',
        className
      )}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  Slow connection detected
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Syncing may take longer than usual
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-orange-600 hover:text-orange-800 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Syncing in progress
  if (isSyncing && pendingSyncs > 0) {
    return (
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-blue-50 border-b border-blue-200 shadow-sm',
        className
      )}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Syncing {pendingSyncs} {pendingSyncs === 1 ? 'change' : 'changes'}...
              </p>
              <p className="text-xs text-primary mt-0.5">
                Please don't close the app
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sync error
  if (syncError) {
    return (
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-error-light border-b border-red-200 shadow-sm',
        className
      )}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CloudOff className="w-5 h-5 text-error flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  Sync failed
                </p>
                <p className="text-xs text-error mt-0.5">
                  {syncError}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRetrySync && (
                <button
                  onClick={onRetrySync}
                  className="text-xs px-3 py-1 bg-error text-white rounded hover:bg-red-700"
                >
                  Retry
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-error hover:text-red-800 text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sync success (recent)
  if (lastSyncTime && !dismissed) {
    const timeAgo = Math.floor((currentTime - lastSyncTime.getTime()) / 1000);
    if (timeAgo < 60) {
      return (
        <div className={cn(
          'fixed top-0 left-0 right-0 z-50 bg-success-light border-b border-green-200 shadow-sm',
          className
        )}>
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    All changes synced
                  </p>
                  <p className="text-xs text-success mt-0.5">
                    Last synced {timeAgo < 5 ? 'just now' : `${timeAgo} seconds ago`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-success hover:text-green-800 text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}

export default SyncStatusBanner;
