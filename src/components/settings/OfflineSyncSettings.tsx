// File: /src/components/settings/OfflineSyncSettings.tsx
// Offline sync settings component for the Settings page

import { useState } from 'react';
import {
  useOfflineStore,
  useSyncPreferences,
  useStorageQuota,
  useIsOnline,
} from '@/stores/offline-store';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Cloud, Trash2, WifiOff, Smartphone, Image, Bell, HardDrive } from 'lucide-react';
import { clearStore, STORES } from '@/lib/offline/indexeddb';
import { logger } from '@/lib/utils/logger';

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Offline Sync Settings Component
 *
 * Provides UI to configure:
 * - Auto-sync toggle
 * - Sync on cellular data
 * - Sync photos on cellular
 * - Max batch size
 * - Notification preferences
 * - Clear offline cache
 */
export function OfflineSyncSettings() {
  const isOnline = useIsOnline();
  const preferences = useSyncPreferences();
  const storageQuota = useStorageQuota();
  const updatePreferences = useOfflineStore((state) => state.updateSyncPreferences);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Handle preference updates
  const handleAutoSyncToggle = (checked: boolean) => {
    updatePreferences({ autoSync: checked });
    logger.log('[OfflineSyncSettings] Auto-sync:', checked);
  };

  const handleSyncOnCellularToggle = (checked: boolean) => {
    updatePreferences({ syncOnCellular: checked });
    logger.log('[OfflineSyncSettings] Sync on cellular:', checked);
  };

  const handleSyncPhotosOnCellularToggle = (checked: boolean) => {
    updatePreferences({ syncPhotosOnCellular: checked });
    logger.log('[OfflineSyncSettings] Sync photos on cellular:', checked);
  };

  const handleNotifyOnSyncToggle = (checked: boolean) => {
    updatePreferences({ notifyOnSync: checked });
    logger.log('[OfflineSyncSettings] Notify on sync:', checked);
  };

  const handleMaxBatchSizeChange = (value: number[]) => {
    const sizeInBytes = value[0] * 1024 * 1024; // Convert MB to bytes
    updatePreferences({ maxBatchSize: sizeInBytes });
    logger.log('[OfflineSyncSettings] Max batch size:', formatBytes(sizeInBytes));
  };

  // Clear offline cache
  const handleClearCache = async () => {
    setIsClearing(true);
    setClearSuccess(false);

    try {
      // Clear all offline stores
      await clearStore(STORES.CACHED_DATA);
      await clearStore(STORES.DOWNLOADS);

      // Update storage quota
      await useOfflineStore.getState().updateStorageQuota();

      setClearSuccess(true);
      logger.log('[OfflineSyncSettings] Offline cache cleared');

      // Reset success message after 3 seconds
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (_error) {
      logger.error('[OfflineSyncSettings] Failed to clear cache:', _error);
    } finally {
      setIsClearing(false);
    }
  };

  // Calculate storage percentage
  const storagePercentage = storageQuota
    ? Math.round((storageQuota.used / storageQuota.total) * 100)
    : 0;

  // Max batch size in MB for the slider
  const maxBatchSizeMB = Math.round(preferences.maxBatchSize / (1024 * 1024));

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
            <Cloud className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <CardTitle className="text-lg mb-1">Offline & Sync</CardTitle>
              <CardDescription>
                Configure how JobSight syncs data for offline use
              </CardDescription>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              {isOnline ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-success">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-warning" />
                  <span className="text-warning">Offline</span>
                </>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-6">
              {/* Auto-sync */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync" className="text-base font-medium">
                    Auto-sync
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync changes when online
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={preferences.autoSync}
                  onCheckedChange={handleAutoSyncToggle}
                />
              </div>

              {/* Sync on Cellular */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-cellular" className="text-base font-medium">
                      Sync on cellular
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Sync data changes over mobile data
                    </p>
                  </div>
                </div>
                <Switch
                  id="sync-cellular"
                  checked={preferences.syncOnCellular}
                  onCheckedChange={handleSyncOnCellularToggle}
                />
              </div>

              {/* Sync Photos on Cellular */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Image className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-photos-cellular" className="text-base font-medium">
                      Sync photos on cellular
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Upload photos over mobile data (uses more data)
                    </p>
                  </div>
                </div>
                <Switch
                  id="sync-photos-cellular"
                  checked={preferences.syncPhotosOnCellular}
                  onCheckedChange={handleSyncPhotosOnCellularToggle}
                />
              </div>

              {/* Notify on Sync */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-sync" className="text-base font-medium">
                      Sync notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications when sync completes
                    </p>
                  </div>
                </div>
                <Switch
                  id="notify-sync"
                  checked={preferences.notifyOnSync}
                  onCheckedChange={handleNotifyOnSyncToggle}
                />
              </div>

              {/* Max Batch Size */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <Label className="text-base font-medium">
                      Max sync batch size: {maxBatchSizeMB} MB
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Maximum data to sync in one batch
                    </p>
                  </div>
                </div>
                <Slider
                  value={[maxBatchSizeMB]}
                  onValueChange={handleMaxBatchSizeChange}
                  min={1}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Storage Usage */}
              {storageQuota && (
                <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Storage used</span>
                    <span>
                      {formatBytes(storageQuota.used)} / {formatBytes(storageQuota.total)}
                    </span>
                  </div>
                  <Progress
                    value={storagePercentage}
                    className={`h-2 ${
                      storageQuota.critical
                        ? '[&>div]:bg-red-500'
                        : storageQuota.warning
                        ? '[&>div]:bg-warning'
                        : '[&>div]:bg-success'
                    }`}
                  />
                  {storageQuota.warning && (
                    <p className="text-xs text-warning">
                      {storageQuota.critical
                        ? 'Storage critically low. Clear cache to free space.'
                        : 'Storage running low. Consider clearing cache.'}
                    </p>
                  )}
                </div>
              )}

              {/* Clear Cache */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={isClearing}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isClearing
                      ? 'Clearing...'
                      : clearSuccess
                      ? 'Cache Cleared!'
                      : 'Clear Offline Cache'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Offline Cache?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all cached data and downloaded files. Your pending
                      changes will still be synced when online. You may need to re-download
                      project data for offline use.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCache}>
                      Clear Cache
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
