/**
 * OfflineMarkupSync Component
 *
 * Enhanced offline support for markup annotations.
 * Handles queuing, syncing, and conflict resolution.
 *
 * Features:
 * - Queue markups when offline
 * - Sync when connection restored
 * - Visual indicator for pending sync
 * - Conflict resolution UI
 * - Local storage for markup drafts
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  RotateCcw,
  CheckCircle,
  XCircle,
  GitMerge,
  ArrowRight,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type {
  OfflineMarkup,
  MarkupSyncConflict,
  OfflineMarkupQueue,
  EnhancedShape,
} from '../types/markup'

// =============================================
// Types
// =============================================

interface OfflineMarkupSyncProps {
  /** Document ID */
  documentId: string
  /** Current offline queue */
  queue: OfflineMarkupQueue
  /** Called when sync is initiated */
  onSync?: () => Promise<void>
  /** Called when a conflict is resolved */
  onResolveConflict?: (
    conflictId: string,
    resolution: 'local' | 'server' | 'merged',
    mergedData?: EnhancedShape
  ) => void
  /** Called when a pending markup is discarded */
  onDiscardMarkup?: (localId: string) => void
  /** Called when retry is requested for failed syncs */
  onRetry?: (localIds: string[]) => void
  /** Compact mode for toolbar */
  compact?: boolean
  /** Optional class name */
  className?: string
}

interface SyncStats {
  pending: number
  syncing: number
  synced: number
  failed: number
  conflicts: number
}

// =============================================
// Helper Functions
// =============================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) {return 'Just now'}
  if (diffMins < 60) {return `${diffMins}m ago`}
  if (diffHours < 24) {return `${diffHours}h ago`}
  return `${diffDays}d ago`
}

function getStatusColor(status: OfflineMarkup['syncStatus']): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-500'
    case 'syncing':
      return 'text-blue-500'
    case 'synced':
      return 'text-green-500'
    case 'failed':
      return 'text-red-500'
    case 'conflict':
      return 'text-orange-500'
    default:
      return 'text-gray-500'
  }
}

function getStatusIcon(status: OfflineMarkup['syncStatus']) {
  switch (status) {
    case 'pending':
      return Clock
    case 'syncing':
      return Loader2
    case 'synced':
      return CheckCircle
    case 'failed':
      return XCircle
    case 'conflict':
      return AlertTriangle
    default:
      return Cloud
  }
}

// =============================================
// Sync Status Badge Component
// =============================================

interface SyncStatusBadgeProps {
  status: OfflineMarkup['syncStatus']
  className?: string
}

function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  const Icon = getStatusIcon(status)

  const variants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    syncing: 'bg-blue-100 text-blue-800 border-blue-200',
    synced: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    conflict: 'bg-orange-100 text-orange-800 border-orange-200',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs capitalize',
        variants[status] || 'bg-gray-100 text-gray-800',
        className
      )}
    >
      <Icon
        className={cn(
          'w-3 h-3 mr-1',
          status === 'syncing' && 'animate-spin'
        )}
      />
      {status}
    </Badge>
  )
}

// =============================================
// Conflict Resolution Dialog
// =============================================

interface ConflictResolutionDialogProps {
  conflict: MarkupSyncConflict
  isOpen: boolean
  onClose: () => void
  onResolve: (resolution: 'local' | 'server' | 'merged') => void
}

function ConflictResolutionDialog({
  conflict,
  isOpen,
  onClose,
  onResolve,
}: ConflictResolutionDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<
    'local' | 'server' | null
  >(null)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <GitMerge className="w-5 h-5" />
            Resolve Sync Conflict
          </DialogTitle>
          <DialogDescription>
            This markup was modified both locally and on the server. Choose which
            version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Conflict type indicator */}
          <Alert variant="default" className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">
              {conflict.conflictType === 'modified'
                ? 'Both versions modified'
                : conflict.conflictType === 'deleted'
                ? 'Server version was deleted'
                : 'Concurrent modification detected'}
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              Detected {formatTimeAgo(conflict.detectedAt)}
            </AlertDescription>
          </Alert>

          {/* Version comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Local version */}
            <div
              onClick={() => setSelectedResolution('local')}
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer transition-all',
                selectedResolution === 'local'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Your Version</span>
                <Badge variant="outline">Local</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Modified: {formatTimeAgo(conflict.localMarkup.updatedAt)}</p>
                <p>Type: {conflict.localMarkup.data.type}</p>
                <p className="truncate">
                  Color: {conflict.localMarkup.data.stroke}
                </p>
              </div>
              {selectedResolution === 'local' && (
                <div className="mt-2 flex items-center text-primary text-sm">
                  <Check className="w-4 h-4 mr-1" />
                  Selected
                </div>
              )}
            </div>

            {/* Server version */}
            <div
              onClick={() => setSelectedResolution('server')}
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer transition-all',
                selectedResolution === 'server'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Server Version</span>
                <Badge variant="outline">Server</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Modified:{' '}
                  {conflict.serverMarkup.updatedAt
                    ? formatTimeAgo(conflict.serverMarkup.updatedAt)
                    : 'Unknown'}
                </p>
                <p>Type: {conflict.serverMarkup.type}</p>
                <p className="truncate">
                  Color: {conflict.serverMarkup.stroke}
                </p>
              </div>
              {selectedResolution === 'server' && (
                <div className="mt-2 flex items-center text-primary text-sm">
                  <Check className="w-4 h-4 mr-1" />
                  Selected
                </div>
              )}
            </div>
          </div>

          {/* Resolution explanation */}
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Keep Local:</strong> Overwrite the server version with your
              changes.
            </p>
            <p>
              <strong>Keep Server:</strong> Discard your local changes and use the
              server version.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedResolution && onResolve(selectedResolution)}
            disabled={!selectedResolution}
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Pending Markups List
// =============================================

interface PendingMarkupsListProps {
  markups: OfflineMarkup[]
  onDiscard?: (localId: string) => void
  onRetry?: (localIds: string[]) => void
}

function PendingMarkupsList({
  markups,
  onDiscard,
  onRetry,
}: PendingMarkupsListProps) {
  const [isOpen, setIsOpen] = useState(true)

  const failedMarkups = markups.filter((m) => m.syncStatus === 'failed')

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            Pending Changes ({markups.length})
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pt-2">
        {failedMarkups.length > 0 && onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onRetry(failedMarkups.map((m) => m.localId))}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry Failed ({failedMarkups.length})
          </Button>
        )}

        <div className="max-h-48 overflow-y-auto space-y-1">
          {markups.map((markup) => (
            <div
              key={markup.localId}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <SyncStatusBadge status={markup.syncStatus} />
                <span className="text-xs text-muted-foreground truncate">
                  {markup.data.type} on page {markup.page}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {markup.syncStatus === 'failed' && markup.syncError && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{markup.syncError}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onDiscard && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDiscard(markup.localId)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// =============================================
// Main Component
// =============================================

export function OfflineMarkupSync({
  documentId,
  queue,
  onSync,
  onResolveConflict,
  onDiscardMarkup,
  onRetry,
  compact = false,
  className,
}: OfflineMarkupSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedConflict, setSelectedConflict] =
    useState<MarkupSyncConflict | null>(null)

  // Calculate stats
  const stats = useMemo<SyncStats>(() => {
    return {
      pending: queue.markups.filter((m) => m.syncStatus === 'pending').length,
      syncing: queue.markups.filter((m) => m.syncStatus === 'syncing').length,
      synced: queue.markups.filter((m) => m.syncStatus === 'synced').length,
      failed: queue.markups.filter((m) => m.syncStatus === 'failed').length,
      conflicts: queue.conflicts.filter((c) => c.resolution === 'pending').length,
    }
  }, [queue])

  const unsyncedCount = stats.pending + stats.syncing + stats.failed
  const hasIssues = stats.failed > 0 || stats.conflicts > 0

  // Handle sync
  const handleSync = useCallback(async () => {
    if (!onSync || isSyncing) {return}

    setIsSyncing(true)
    try {
      await onSync()
    } finally {
      setIsSyncing(false)
    }
  }, [onSync, isSyncing])

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    (resolution: 'local' | 'server' | 'merged') => {
      if (!selectedConflict || !onResolveConflict) {return}

      onResolveConflict(selectedConflict.id, resolution)
      setSelectedConflict(null)
    },
    [selectedConflict, onResolveConflict]
  )

  // Auto-sync when coming online
  useEffect(() => {
    if (queue.isOnline && unsyncedCount > 0 && !queue.isSyncing && onSync) {
      handleSync()
    }
  }, [queue.isOnline])

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSync}
              disabled={!queue.isOnline || isSyncing || unsyncedCount === 0}
              className={cn(
                'relative p-2 rounded-lg transition-colors',
                queue.isOnline
                  ? 'hover:bg-muted'
                  : 'bg-yellow-50 dark:bg-yellow-950',
                hasIssues && 'text-orange-500',
                className
              )}
            >
              {isSyncing || queue.isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : queue.isOnline ? (
                <Cloud className="w-4 h-4" />
              ) : (
                <CloudOff className="w-4 h-4 text-yellow-500" />
              )}

              {unsyncedCount > 0 && (
                <span
                  className={cn(
                    'absolute -top-1 -right-1 min-w-[16px] h-4 px-1',
                    'text-xs font-medium rounded-full flex items-center justify-center',
                    hasIssues
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-500 text-white'
                  )}
                >
                  {unsyncedCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              {!queue.isOnline ? (
                <p>Offline - Changes will sync when connected</p>
              ) : isSyncing ? (
                <p>Syncing...</p>
              ) : unsyncedCount > 0 ? (
                <p>{unsyncedCount} changes pending sync</p>
              ) : (
                <p>All changes synced</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {queue.isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-sm font-medium">
            {queue.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {onSync && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={!queue.isOnline || isSyncing || unsyncedCount === 0}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Sync
          </Button>
        )}
      </div>

      {/* Offline notice */}
      {!queue.isOnline && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CloudOff className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            Working Offline
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            Your changes are saved locally and will sync when you're back
            online.
          </AlertDescription>
        </Alert>
      )}

      {/* Sync progress */}
      {queue.isSyncing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Syncing markups...</span>
            <span className="text-muted-foreground">
              {stats.synced}/{queue.markups.length}
            </span>
          </div>
          <Progress
            value={(stats.synced / queue.markups.length) * 100}
            className="h-2"
          />
        </div>
      )}

      {/* Stats summary */}
      <div className="flex flex-wrap gap-2">
        {stats.pending > 0 && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            {stats.pending} pending
          </Badge>
        )}
        {stats.syncing > 0 && (
          <Badge variant="outline" className="bg-blue-50 text-blue-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {stats.syncing} syncing
          </Badge>
        )}
        {stats.synced > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            {stats.synced} synced
          </Badge>
        )}
        {stats.failed > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            {stats.failed} failed
          </Badge>
        )}
        {stats.conflicts > 0 && (
          <Badge variant="outline" className="bg-orange-50 text-orange-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {stats.conflicts} conflicts
          </Badge>
        )}
      </div>

      {/* Conflicts */}
      {queue.conflicts.filter((c) => c.resolution === 'pending').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-orange-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Conflicts Need Resolution
          </h4>
          {queue.conflicts
            .filter((c) => c.resolution === 'pending')
            .map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200"
              >
                <div className="text-sm">
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {conflict.conflictType === 'modified'
                      ? 'Modified on both sides'
                      : conflict.conflictType === 'deleted'
                      ? 'Deleted on server'
                      : 'Concurrent edit'}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {formatTimeAgo(conflict.detectedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedConflict(conflict)}
                >
                  Resolve
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Pending markups list */}
      {queue.markups.filter((m) => m.syncStatus !== 'synced').length > 0 && (
        <PendingMarkupsList
          markups={queue.markups.filter((m) => m.syncStatus !== 'synced')}
          onDiscard={onDiscardMarkup}
          onRetry={onRetry}
        />
      )}

      {/* Last sync time */}
      {queue.lastSyncTime && (
        <p className="text-xs text-muted-foreground text-center">
          Last synced: {formatTimeAgo(queue.lastSyncTime)}
        </p>
      )}

      {/* All synced message */}
      {unsyncedCount === 0 && stats.conflicts === 0 && queue.isOnline && (
        <div className="text-center py-4 text-muted-foreground">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
          <p className="text-sm">All changes synced</p>
        </div>
      )}

      {/* Conflict resolution dialog */}
      {selectedConflict && (
        <ConflictResolutionDialog
          conflict={selectedConflict}
          isOpen={!!selectedConflict}
          onClose={() => setSelectedConflict(null)}
          onResolve={handleResolveConflict}
        />
      )}
    </div>
  )
}

// =============================================
// Sync Status Indicator (for toolbar)
// =============================================

interface SyncStatusIndicatorProps {
  queue: OfflineMarkupQueue
  onSync?: () => void
  className?: string
}

export function SyncStatusIndicator({
  queue,
  onSync,
  className,
}: SyncStatusIndicatorProps) {
  const unsyncedCount = queue.markups.filter(
    (m) => m.syncStatus !== 'synced'
  ).length
  const hasConflicts = queue.conflicts.some((c) => c.resolution === 'pending')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex items-center gap-1 px-2 py-1 rounded-lg',
            'hover:bg-muted transition-colors',
            !queue.isOnline && 'bg-yellow-50 dark:bg-yellow-950',
            className
          )}
        >
          {queue.isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : queue.isOnline ? (
            <Cloud
              className={cn(
                'w-4 h-4',
                hasConflicts
                  ? 'text-orange-500'
                  : unsyncedCount > 0
                  ? 'text-blue-500'
                  : 'text-green-500'
              )}
            />
          ) : (
            <CloudOff className="w-4 h-4 text-yellow-500" />
          )}

          {(unsyncedCount > 0 || hasConflicts) && (
            <span
              className={cn(
                'text-xs font-medium',
                hasConflicts ? 'text-orange-500' : 'text-blue-500'
              )}
            >
              {unsyncedCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="end">
        <OfflineMarkupSync
          documentId=""
          queue={queue}
          onSync={onSync}
        />
      </PopoverContent>
    </Popover>
  )
}

export default OfflineMarkupSync
