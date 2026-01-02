/**
 * Global Sync Status Panel
 *
 * Comprehensive sync status panel accessible from header that shows:
 * - Overall sync status (synced, syncing, pending, error)
 * - Pending items count by type
 * - Last sync timestamp
 * - Manual sync trigger button
 * - Individual item retry controls
 * - Sync progress bar during active sync
 */

import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
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
  Upload,
  AlertCircle,
  CheckCircle2,
  Settings,
  FileText,
  Image,
  ClipboardCheck,
  Wrench,
  MessageSquare,
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
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import type { PendingSyncItem, SyncConflict, SyncPreferences } from '@/stores/offline-store'
import { useOfflineStore } from '@/stores/offline-store'

// ============================================================================
// Types
// ============================================================================

interface GlobalSyncStatusPanelProps {
  className?: string
  trigger?: React.ReactNode
}

interface EntityTypeStats {
  type: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  label: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getEntityTypeIcon(type: string): React.ComponentType<{ className?: string }> {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    daily_reports: FileText,
    punch_items: ClipboardCheck,
    photos: Image,
    rfis: MessageSquare,
    tasks: ClipboardCheck,
    documents: FileText,
    change_orders: Wrench,
    submittals: FileText,
  }
  return iconMap[type] || FileText
}

function getEntityTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    daily_reports: 'Daily Reports',
    punch_items: 'Punch Items',
    photos: 'Photos',
    rfis: 'RFIs',
    tasks: 'Tasks',
    documents: 'Documents',
    change_orders: 'Change Orders',
    submittals: 'Submittals',
  }
  return labelMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
  if (!progress) return null

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

function PendingSyncItemCard({
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

  const EntityIcon = getEntityTypeIcon(item.entityType)

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        item.status === 'failed' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <div className="p-1.5 rounded bg-muted flex items-center justify-center">
            <EntityIcon className="h-3 w-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{getEntityTypeLabel(item.entityType)}</span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="p-0.5 rounded bg-background/50">
                {getOperationIcon()}
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {item.operation}
              </p>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              ID: {item.entityId.slice(0, 8)}...
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(item.createdAt, { addSuffix: true })}
            </p>
            {item.retryCount > 0 && (
              <p className="text-xs text-warning">
                Retry attempt {item.retryCount}
              </p>
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
              title="Retry sync"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            title="Remove from queue"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ConflictItemCard({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict
  onResolve: (id: string, resolution: 'local' | 'server' | 'merge') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const EntityIcon = getEntityTypeIcon(conflict.entityType)

  return (
    <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <EntityIcon className="h-3 w-3 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Conflict Detected</p>
            <p className="text-xs text-muted-foreground">
              {getEntityTypeLabel(conflict.entityType)}
            </p>
            <p className="text-xs text-muted-foreground">
              ID: {conflict.entityId.slice(0, 8)}...
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
          </div>
        </div>
      )}
    </div>
  )
}

function EntityTypeBreakdown({ stats }: { stats: EntityTypeStats[] }) {
  if (stats.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">By Type</h4>
      <div className="space-y-1">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.type} className="flex items-center justify-between p-2 rounded bg-muted/20">
              <div className="flex items-center gap-2">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{stat.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stat.count}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SyncSettings({
  preferences,
  onUpdate,
}: {
  preferences: SyncPreferences
  onUpdate: (prefs: Partial<SyncPreferences>) => void
}) {
  return (
    <div className="space-y-4 p-3 rounded-lg border bg-muted/20">
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-sync" className="flex flex-col gap-1">
          <span>Auto-sync</span>
          <span className="text-xs text-muted-foreground font-normal">
            Automatically sync when online
          </span>
        </Label>
        <Switch
          id="auto-sync"
          checked={preferences.autoSync}
          onCheckedChange={(checked) => onUpdate({ autoSync: checked })}
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
          checked={preferences.syncOnCellular}
          onCheckedChange={(checked) => onUpdate({ syncOnCellular: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="photo-cellular" className="flex flex-col gap-1">
          <span>Photos on cellular</span>
          <span className="text-xs text-muted-foreground font-normal">
            Upload photos on mobile data
          </span>
        </Label>
        <Switch
          id="photo-cellular"
          checked={preferences.syncPhotosOnCellular}
          onCheckedChange={(checked) => onUpdate({ syncPhotosOnCellular: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="sync-notifications" className="flex flex-col gap-1">
          <span>Sync notifications</span>
          <span className="text-xs text-muted-foreground font-normal">
            Show notifications after sync
          </span>
        </Label>
        <Switch
          id="sync-notifications"
          checked={preferences.notifyOnSync}
          onCheckedChange={(checked) => onUpdate({ notifyOnSync: checked })}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function GlobalSyncStatusPanel({ className, trigger }: GlobalSyncStatusPanelProps) {
  const { toast } = useToast()
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

  const { syncPreferences, updateSyncPreferences } = useOfflineStore()

  const [showPending, setShowPending] = useState(true)
  const [showConflicts, setShowConflicts] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // Calculate entity type statistics
  const entityTypeStats = useMemo((): EntityTypeStats[] => {
    const statsByType = queueStats.byEntityType
    return Object.entries(statsByType)
      .map(([type, count]) => ({
        type,
        count,
        icon: getEntityTypeIcon(type),
        label: getEntityTypeLabel(type),
      }))
      .sort((a, b) => b.count - a.count)
  }, [queueStats.byEntityType])

  const handleRetry = async (id: string) => {
    try {
      await retryFailed()
      toast({
        title: 'Retry initiated',
        description: 'Failed items will be synced shortly.',
      })
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Could not retry sync. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removePendingSync(id)
      toast({
        title: 'Item removed',
        description: 'Pending change has been discarded.',
      })
    } catch (error) {
      toast({
        title: 'Remove failed',
        description: 'Could not remove item. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleResolveConflict = async (
    id: string,
    resolution: 'local' | 'server' | 'merge'
  ) => {
    try {
      await resolveConflict(id, resolution)
      toast({
        title: 'Conflict resolved',
        description: `Used ${resolution} version to resolve the conflict.`,
      })
    } catch (error) {
      toast({
        title: 'Resolution failed',
        description: 'Could not resolve conflict. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleClearQueue = async () => {
    try {
      await clearSyncQueue()
      toast({
        title: 'Queue cleared',
        description: 'All pending changes have been discarded.',
      })
    } catch (error) {
      toast({
        title: 'Clear failed',
        description: 'Could not clear sync queue. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleManualSync = async () => {
    try {
      await triggerSync()
      toast({
        title: 'Sync started',
        description: 'Syncing all pending changes...',
      })
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Could not start sync. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleUpdatePreferences = (prefs: Partial<SyncPreferences>) => {
    updateSyncPreferences(prefs)
    toast({
      title: 'Settings updated',
      description: 'Sync preferences have been saved.',
    })
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
      <SheetTrigger asChild>
        {trigger || getHeaderButton()}
      </SheetTrigger>

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

            {/* Entity Type Breakdown */}
            {entityTypeStats.length > 0 && <EntityTypeBreakdown stats={entityTypeStats} />}

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
                    <ConflictItemCard
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
                    <PendingSyncItemCard
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
              <CollapsibleContent className="mt-3">
                <SyncSettings
                  preferences={syncPreferences}
                  onUpdate={handleUpdatePreferences}
                />
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

export default GlobalSyncStatusPanel
