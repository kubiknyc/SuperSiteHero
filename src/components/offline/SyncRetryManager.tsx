// File: /src/components/offline/SyncRetryManager.tsx
// Sync retry manager with exponential backoff and individual item retry

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertCircle,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface SyncItem {
  id: string
  type: string
  name: string
  status: 'pending' | 'syncing' | 'failed' | 'success'
  error?: string
  retryCount: number
  maxRetries: number
  lastAttempt?: number
  nextRetry?: number
  data?: any
}

export interface SyncRetryManagerProps {
  /** Items being synced */
  items: SyncItem[]
  /** Callback to retry a single item */
  onRetryItem: (id: string) => Promise<void>
  /** Callback to retry all failed items */
  onRetryAll: () => Promise<void>
  /** Callback to discard an item */
  onDiscardItem: (id: string) => void
  /** Callback to discard all failed items */
  onDiscardAll: () => void
  /** Whether currently syncing */
  isSyncing: boolean
  /** Whether online */
  isOnline: boolean
  /** Custom class name */
  className?: string
  /** Position for mobile sticky footer */
  showMobileFooter?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {return `${hours}h ago`}
  if (minutes > 0) {return `${minutes}m ago`}
  if (seconds > 10) {return `${seconds}s ago`}
  return 'Just now'
}

function formatCountdown(timestamp: number): string {
  const diff = timestamp - Date.now()
  if (diff <= 0) {return 'Now'}

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) {return `in ${minutes}m ${seconds % 60}s`}
  return `in ${seconds}s`
}

// ============================================================================
// Sub-components
// ============================================================================

interface SyncItemRowProps {
  item: SyncItem
  onRetry: () => void
  onDiscard: () => void
  disabled: boolean
}

function SyncItemRow({ item, onRetry, onDiscard, disabled }: SyncItemRowProps) {
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-warning" />,
    syncing: <RefreshCw className="h-4 w-4 text-info animate-spin" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
    success: <CheckCircle2 className="h-4 w-4 text-success" />,
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
      <div className="flex-shrink-0 mt-0.5">
        {statusIcon[item.status]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{item.name}</span>
          <Badge variant="outline" className="text-xs">
            {item.type}
          </Badge>
        </div>

        {item.status === 'failed' && item.error && (
          <p className="text-xs text-destructive mt-1 line-clamp-2">
            {item.error}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {item.lastAttempt && (
            <span>Last attempt: {formatRelativeTime(item.lastAttempt)}</span>
          )}
          {item.status === 'failed' && item.retryCount < item.maxRetries && item.nextRetry && (
            <span className="text-warning dark:text-warning">
              Retry {formatCountdown(item.nextRetry)}
            </span>
          )}
          {item.status === 'failed' && item.retryCount >= item.maxRetries && (
            <span className="text-destructive">Max retries reached</span>
          )}
          <span>({item.retryCount}/{item.maxRetries} retries)</span>
        </div>
      </div>

      {item.status === 'failed' && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetry}
            disabled={disabled || isRetrying || !item.nextRetry || Date.now() < item.nextRetry}
            className="h-8 w-8"
            title="Retry"
          >
            <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDiscard}
            disabled={disabled}
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            title="Discard"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SyncRetryManager({
  items,
  onRetryItem,
  onRetryAll,
  onDiscardItem,
  onDiscardAll,
  isSyncing,
  isOnline,
  className,
  showMobileFooter = true,
}: SyncRetryManagerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isRetryingAll, setIsRetryingAll] = React.useState(false)

  // Calculate stats
  const stats = React.useMemo(() => {
    const pending = items.filter((i) => i.status === 'pending').length
    const syncing = items.filter((i) => i.status === 'syncing').length
    const failed = items.filter((i) => i.status === 'failed').length
    const success = items.filter((i) => i.status === 'success').length

    return { pending, syncing, failed, success, total: items.length }
  }, [items])

  const failedItems = items.filter((i) => i.status === 'failed')
  const canRetryAll = failedItems.some((i) =>
    i.retryCount < i.maxRetries && (!i.nextRetry || Date.now() >= i.nextRetry)
  )

  const handleRetryAll = async () => {
    setIsRetryingAll(true)
    try {
      await onRetryAll()
    } finally {
      setIsRetryingAll(false)
    }
  }

  // Don't show if nothing to display
  if (stats.total === 0 || (stats.failed === 0 && stats.pending === 0 && stats.syncing === 0)) {
    return null
  }

  return (
    <>
      {/* Trigger button / indicator */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant={stats.failed > 0 ? 'destructive' : 'outline'}
            size="sm"
            className={cn('gap-2', className)}
          >
            {!isOnline ? (
              <WifiOff className="h-4 w-4" />
            ) : stats.syncing > 0 || isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : stats.failed > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            <span>
              {stats.failed > 0
                ? `${stats.failed} failed`
                : stats.syncing > 0 || isSyncing
                ? 'Syncing...'
                : `${stats.pending} pending`}
            </span>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span>Sync Queue</span>
              {!isOnline && (
                <Badge variant="destructive" className="text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Stats summary */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted">
                <p className="text-lg font-semibold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted">
                <p className="text-lg font-semibold">{stats.syncing}</p>
                <p className="text-xs text-muted-foreground">Syncing</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-destructive/10">
                <p className="text-lg font-semibold text-destructive">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-success/10 dark:bg-success/20">
                <p className="text-lg font-semibold text-success dark:text-success">{stats.success}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
            </div>

            {/* Failed items section */}
            {failedItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Failed Items</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryAll}
                      disabled={!isOnline || !canRetryAll || isRetryingAll}
                    >
                      <RefreshCw className={cn('h-3 w-3 mr-1', isRetryingAll && 'animate-spin')} />
                      Retry All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDiscardAll}
                      disabled={isSyncing}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Discard All
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {failedItems.map((item) => (
                    <SyncItemRow
                      key={item.id}
                      item={item}
                      onRetry={() => onRetryItem(item.id)}
                      onDiscard={() => onDiscardItem(item.id)}
                      disabled={!isOnline || isSyncing}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending items section */}
            {stats.pending > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Pending Items ({stats.pending})</h4>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {items
                    .filter((i) => i.status === 'pending')
                    .slice(0, 5)
                    .map((item) => (
                      <SyncItemRow
                        key={item.id}
                        item={item}
                        onRetry={() => onRetryItem(item.id)}
                        onDiscard={() => onDiscardItem(item.id)}
                        disabled={!isOnline || isSyncing}
                      />
                    ))}
                  {stats.pending > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      + {stats.pending - 5} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Offline message */}
            {!isOnline && (
              <div className="p-4 rounded-lg bg-warning-light dark:bg-warning/20 border border-warning/30 dark:border-warning/40">
                <div className="flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-warning dark:text-warning flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-warning-dark dark:text-warning">
                      You're offline
                    </p>
                    <p className="text-xs text-warning-dark/80 dark:text-warning/80 mt-1">
                      Items will sync automatically when your connection is restored.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile sticky footer for critical sync failures */}
      {showMobileFooter && stats.failed > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
          <div className="bg-destructive/95 text-destructive-foreground p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {stats.failed} item{stats.failed !== 1 ? 's' : ''} failed to sync
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsOpen(true)}
            >
              View
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Hook for managing sync retry logic
// ============================================================================

export interface UseSyncRetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
}

export function useSyncRetry({
  maxRetries = 5,
  baseDelay = 1000,
  maxDelay = 30000,
}: UseSyncRetryOptions = {}) {
  const calculateNextRetry = React.useCallback(
    (retryCount: number): number => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at maxDelay
      const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
      // Add jitter (±20%)
      const jitter = delay * (0.8 + Math.random() * 0.4)
      return Date.now() + jitter
    },
    [baseDelay, maxDelay]
  )

  const shouldRetry = React.useCallback(
    (item: SyncItem): boolean => {
      return (
        item.status === 'failed' &&
        item.retryCount < maxRetries &&
        (!item.nextRetry || Date.now() >= item.nextRetry)
      )
    },
    [maxRetries]
  )

  return {
    maxRetries,
    calculateNextRetry,
    shouldRetry,
  }
}

export default SyncRetryManager
