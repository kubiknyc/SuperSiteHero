// File: /src/components/SyncStatusPanel.tsx
// Panel component for displaying sync queue status and pending operations

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useOfflineStore } from '@/stores/offline-store'
import { ConflictResolutionDialog } from '@/components/ConflictResolutionDialog'

/**
 * Panel showing sync queue status, pending operations, and conflicts
 * Displays:
 * - Sync status (syncing, idle, last sync time)
 * - Pending operations count by type
 * - Conflict count and resolution
 * - Manual sync trigger
 */
export function SyncStatusPanel() {
  const {
    isSyncing,
    lastSyncTime,
    syncQueue,
    conflicts,
    clearSyncQueue,
    removePendingSync,
  } = useOfflineStore()

  const [selectedConflict, setSelectedConflict] = useState<string | null>(null)
  const [showConflictDialog, setShowConflictDialog] = useState(false)

  const handleViewConflict = (conflictId: string) => {
    setSelectedConflict(conflictId)
    setShowConflictDialog(true)
  }

  const handleClearQueue = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all pending syncs? This will discard unsaved changes.'
      )
    ) {
      clearSyncQueue()
    }
  }

  const handleRemoveItem = (id: string) => {
    if (window.confirm('Remove this item from the sync queue?')) {
      removePendingSync(id)
    }
  }

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) {return 'Never'}
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) {return 'Just now'}
    if (diffMins < 60) {return `${diffMins}m ago`}
    if (diffMins < 1440) {return `${Math.floor(diffMins / 60)}h ago`}
    return date.toLocaleDateString()
  }

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'create':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'update':
        return <RefreshCw className="h-4 w-4 text-primary" />
      case 'delete':
        return <XCircle className="h-4 w-4 text-error" />
      default:
        return <Clock className="h-4 w-4 text-muted" />
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'create':
        return 'bg-success-light text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'update':
        return 'bg-info-light text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'delete':
        return 'bg-error-light text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-muted text-foreground dark:bg-background/20 dark:text-disabled'
    }
  }

  const pendingByType = syncQueue.reduce(
    (acc: Record<string, number>, sync) => {
      acc[sync.entityType] = (acc[sync.entityType] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sync Status</span>
            {isSyncing && (
              <Badge variant="secondary" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {syncQueue.length === 0 && conflicts.length === 0
              ? 'All changes synced'
              : `${syncQueue.length} pending operation(s), ${conflicts.length} conflict(s)`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Sync info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last sync:</span>
            <span className="font-medium">{formatTimestamp(lastSyncTime)}</span>
          </div>

          {/* Conflicts section */}
          {conflicts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <h4 className="font-medium text-sm heading-card">Conflicts Require Attention</h4>
                </div>
                <ScrollArea className="h-[120px] w-full rounded-md border p-2">
                  <div className="space-y-2">
                    {conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="flex items-center justify-between p-2 bg-warning-light dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">{conflict.entityType}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(conflict.detectedAt)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewConflict(conflict.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Pending operations by type */}
          {Object.keys(pendingByType).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm heading-card">Pending Operations</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pendingByType).map(([type, count]) => (
                    <Badge key={type} variant="secondary">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Pending sync queue */}
          {syncQueue.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm heading-card">Queue Details</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearQueue}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
                <ScrollArea className="h-[200px] w-full rounded-md border">
                  <div className="p-2 space-y-2">
                    {syncQueue.map((sync) => (
                      <div
                        key={sync.id}
                        className="flex items-center gap-3 p-2 rounded border bg-card hover:bg-accent/50 transition-colors"
                      >
                        {getOperationIcon(sync.operation)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium capitalize">{sync.entityType}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getOperationColor(sync.operation)}`}
                            >
                              {sync.operation}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {sync.retryCount > 0 && `${sync.retryCount} retries • `}
                            {formatTimestamp(sync.timestamp)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(sync.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Empty state */}
          {syncQueue.length === 0 && conflicts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-success" />
              <p className="text-sm font-medium">All synced up!</p>
              <p className="text-xs">No pending operations or conflicts</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflict resolution dialog */}
      <ConflictResolutionDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflict={
          selectedConflict !== null
            ? conflicts.find((c) => c.id === selectedConflict) || null
            : null
        }
      />
    </>
  )
}
