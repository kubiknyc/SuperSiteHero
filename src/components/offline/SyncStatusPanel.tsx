/**
 * Sync Status Panel Component
 *
 * A comprehensive UI for displaying and managing offline sync status.
 * Shows pending syncs, conflicts, storage usage, and provides controls
 * for manual sync operations.
 */

import { useState, useMemo } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
  Clock,
  HardDrive,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Loader2,
  X,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Settings,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useOfflineSync, useSyncStatusDisplay } from '@/hooks/useOfflineSync'
import type { PendingSyncItem, SyncConflict } from '@/stores/offline-store'

// ============================================================================
// Types
// ============================================================================

interface SyncStatusPanelProps {
  className?: string
}

interface StorageInfo {
  used: number
  quota: number
  percentage: number
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatusIndicator({ isOnline, isSyncing }: { isOnline: boolean; isSyncing: boolean }) {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-warning">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">Offline</span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Syncing...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-success">
      <Wifi className="h-4 w-4" />
      <span className="text-sm font-medium">Online</span>
    </div>
  )
}

function SyncProgress({
  progress,
}: {
  progress: { current: number; total: number; percentage: number } | null
}) {
  if (!progress) {return null}

  return (
    <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Syncing changes...</span>
        <span className="font-medium">
          {progress.current} / {progress.total}
        </span>
      </div>
      <Progress value={progress.percentage} className="h-2" />
      <p className="text-xs text-muted-foreground">{progress.percentage}% complete</p>
    </div>
  )
}

function PendingSyncItem({
  item,
  onRetry,
  onRemove,
}: {
  item: PendingSyncItem
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}) {
  const getOperationIcon = () => {
    switch (item.operation) {
      case 'create':
        return <Upload className="h-3 w-3" />
      case 'update':
        return <RefreshCw className="h-3 w-3" />
      case 'delete':
        return <Trash2 className="h-3 w-3" />
      default:
        return <Cloud className="h-3 w-3" />
    }
  }

  const getStatusBadge = () => {
    switch (item.status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'syncing':
        return (
          <Badge variant="default" className="text-xs bg-primary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        item.status === 'failed' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <div className="p-1.5 rounded bg-muted">{getOperationIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium capitalize">{item.entityType}</span>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              ID: {item.entityId.slice(0, 8)}...
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(item.createdAt, { addSuffix: true })}
            </p>
            {item.error && (
              <p className="text-xs text-destructive mt-1">{item.error}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {item.status === 'failed' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRetry(item.id)}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ConflictItem({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict
  onResolve: (id: string, resolution: 'local' | 'server' | 'merge') => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Conflict Detected</p>
            <p className="text-xs text-muted-foreground capitalize">
              {conflict.entityType} - {conflict.entityId.slice(0, 8)}...
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded bg-muted/50">
              <p className="text-xs font-medium mb-1">Local Version</p>
              <pre className="text-xs text-muted-foreground overflow-auto max-h-20">
                {JSON.stringify(conflict.localData, null, 2)}
              </pre>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="text-xs font-medium mb-1">Server Version</p>
              <pre className="text-xs text-muted-foreground overflow-auto max-h-20">
                {JSON.stringify(conflict.serverData, null, 2)}
              </pre>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onResolve(conflict.id, 'local')}
            >
              Keep Local
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onResolve(conflict.id, 'server')}
            >
              Keep Server
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onResolve(conflict.id, 'merge')}
            >
              Merge
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StorageUsage({ storage }: { storage: StorageInfo | null }) {
  if (!storage) {return null}

  const formatBytes = (bytes: number) => {
    if (bytes === 0) {return '0 B'}
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-3 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Storage Usage</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {formatBytes(storage.used)} of {formatBytes(storage.quota)} used
          </span>
          <span className="font-medium">{storage.percentage}%</span>
        </div>
        <Progress
          value={storage.percentage}
          className={cn('h-2', storage.percentage > 80 && 'bg-destructive/20')}
        />
        {storage.percentage > 80 && (
          <p className="text-xs text-warning flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Storage is running low
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SyncStatusPanel({ className }: SyncStatusPanelProps) {
  const {
    status,
    queueStats,
    syncQueue,
    conflicts,
    triggerSync,
    clearSyncQueue,
    removePendingSync,
    retryFailed,
    resolveConflict,
  } = useOfflineSync()

  const [showPending, setShowPending] = useState(true)
  const [showConflicts, setShowConflicts] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [autoSync, setAutoSync] = useState(true)
  const [syncOnCellular, setSyncOnCellular] = useState(false)

  // Estimate storage usage (would need actual IndexedDB quota API in production)
  const storageInfo = useMemo((): StorageInfo | null => {
    // This is a simplified estimation
    const estimatedUsage = syncQueue.length * 1024 * 10 // Rough estimate
    const quota = 50 * 1024 * 1024 // 50MB default
    return {
      used: estimatedUsage,
      quota,
      percentage: Math.min(100, Math.round((estimatedUsage / quota) * 100)),
    }
  }, [syncQueue])

  const handleRetry = async (_id: string) => {
    try {
      await retryFailed()
      toast.success('Retry initiated', {
        description: 'Failed items will be synced shortly.',
      })
    } catch {
      toast.error('Retry failed', {
        description: 'Could not retry sync. Please try again.',
      })
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removePendingSync(id)
      toast.success('Item removed', {
        description: 'Pending change has been discarded.',
      })
    } catch {
      toast.error('Remove failed', {
        description: 'Could not remove item. Please try again.',
      })
    }
  }

  const handleResolveConflict = async (
    id: string,
    resolution: 'local' | 'server' | 'merge'
  ) => {
    try {
      await resolveConflict(id, resolution)
      toast.success('Conflict resolved', {
        description: `Used ${resolution} version to resolve the conflict.`,
      })
    } catch {
      toast.error('Resolution failed', {
        description: 'Could not resolve conflict. Please try again.',
      })
    }
  }

  const handleClearQueue = async () => {
    try {
      await clearSyncQueue()
      toast.success('Queue cleared', {
        description: 'All pending changes have been discarded.',
      })
    } catch {
      toast.error('Clear failed', {
        description: 'Could not clear sync queue. Please try again.',
      })
    }
  }

  const handleManualSync = async () => {
    try {
      await triggerSync()
      toast.info('Sync started', {
        description: 'Syncing all pending changes...',
      })
    } catch {
      toast.error('Sync failed', {
        description: 'Could not start sync. Please try again.',
      })
    }
  }

  // Determine header button appearance
  const getHeaderButton = () => {
    if (!status.isOnline) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 text-warning">
          <CloudOff className="h-4 w-4" />
          <span className="hidden sm:inline">Offline</span>
          {queueStats.total > 0 && (
            <Badge variant="secondary" className="ml-1">
              {queueStats.total}
            </Badge>
          )}
        </Button>
      )
    }

    if (status.isSyncing) {
      return (
        <Button variant="ghost" size="sm" className="gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </Button>
      )
    }

    if (status.conflictCount > 0) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <Badge variant="destructive">{status.conflictCount}</Badge>
        </Button>
      )
    }

    if (queueStats.total > 0) {
      return (
        <Button variant="ghost" size="sm" className="gap-2 text-warning">
          <Cloud className="h-4 w-4" />
          <Badge variant="secondary">{queueStats.total}</Badge>
        </Button>
      )
    }

    return (
      <Button variant="ghost" size="sm" className="gap-2 text-success">
        <CheckCircle2 className="h-4 w-4" />
        <span className="hidden sm:inline">Synced</span>
      </Button>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{getHeaderButton()}</SheetTrigger>

      <SheetContent className={cn('w-[400px] sm:w-[540px]', className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Sync Status
          </SheetTitle>
          <SheetDescription>
            Manage offline changes and sync settings
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-4 pr-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <StatusIndicator isOnline={status.isOnline} isSyncing={status.isSyncing} />
              {status.lastSyncTime && (
                <span className="text-xs text-muted-foreground">
                  Last sync: {formatDistanceToNow(status.lastSyncTime, { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Sync Progress */}
            {status.isSyncing && <SyncProgress progress={status.progress} />}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border text-center">
                <p className="text-2xl font-bold">{queueStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border text-center">
                <p className="text-2xl font-bold text-destructive">{queueStats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border text-center">
                <p className="text-2xl font-bold text-warning">{status.conflictCount}</p>
                <p className="text-xs text-muted-foreground">Conflicts</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={handleManualSync}
                disabled={!status.isOnline || status.isSyncing || queueStats.total === 0}
              >
                <RefreshCw className={cn('h-4 w-4', status.isSyncing && 'animate-spin')} />
                Sync Now
              </Button>
              {queueStats.failed > 0 && (
                <Button variant="outline" className="gap-2" onClick={() => retryFailed()}>
                  <RefreshCw className="h-4 w-4" />
                  Retry Failed
                </Button>
              )}
            </div>

            <Separator />

            {/* Conflicts Section */}
            {conflicts.length > 0 && (
              <Collapsible open={showConflicts} onOpenChange={setShowConflicts}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span>Conflicts ({conflicts.length})</span>
                    </div>
                    {showConflicts ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {conflicts.map((conflict) => (
                    <ConflictItem
                      key={conflict.id}
                      conflict={conflict}
                      onResolve={handleResolveConflict}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Pending Items Section */}
            {syncQueue.length > 0 && (
              <Collapsible open={showPending} onOpenChange={setShowPending}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Pending Changes ({syncQueue.length})</span>
                    </div>
                    {showPending ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {syncQueue.slice(0, 10).map((item) => (
                    <PendingSyncItem
                      key={item.id}
                      item={item}
                      onRetry={handleRetry}
                      onRemove={handleRemove}
                    />
                  ))}
                  {syncQueue.length > 10 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      And {syncQueue.length - 10} more items...
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* All Synced Message */}
            {syncQueue.length === 0 && conflicts.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                <p className="font-medium">All Changes Synced</p>
                <p className="text-sm text-muted-foreground">
                  Your data is up to date with the server.
                </p>
              </div>
            )}

            <Separator />

            {/* Storage Usage */}
            <StorageUsage storage={storageInfo} />

            {/* Settings Section */}
            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Sync Settings</span>
                  </div>
                  {showSettings ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-3 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-sync" className="flex flex-col gap-1">
                    <span>Auto-sync</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Automatically sync when online
                    </span>
                  </Label>
                  <Switch
                    id="auto-sync"
                    checked={autoSync}
                    onCheckedChange={setAutoSync}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cellular-sync" className="flex flex-col gap-1">
                    <span>Sync on cellular</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Allow sync on mobile data
                    </span>
                  </Label>
                  <Switch
                    id="cellular-sync"
                    checked={syncOnCellular}
                    onCheckedChange={setSyncOnCellular}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Danger Zone */}
            {queueStats.total > 0 && (
              <>
                <Separator />
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <h4 className="text-sm font-medium text-destructive mb-2">Danger Zone</h4>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full gap-2">
                        <Trash2 className="h-4 w-4" />
                        Clear All Pending Changes
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear sync queue?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently discard {queueStats.total} pending changes.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleClearQueue}
                        >
                          Clear All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default SyncStatusPanel
