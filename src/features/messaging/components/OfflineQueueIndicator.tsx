/**
 * OfflineQueueIndicator Component
 *
 * Shows the status of offline message queue:
 * - Number of pending messages
 * - Processing status
 * - Failed messages with retry option
 */

import { Cloud, CloudOff, AlertCircle, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useQueueStats, useOnlineStatus, useQueueProcessor, useFailedMessages } from '../hooks/useOfflineMessaging'

interface OfflineQueueIndicatorProps {
  /** Show as compact badge (no text) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

export function OfflineQueueIndicator({
  compact = false,
  className,
}: OfflineQueueIndicatorProps) {
  const isOnline = useOnlineStatus()
  const { data: stats } = useQueueStats()
  const { processQueue, isProcessing } = useQueueProcessor()
  const { failedMessages, clearFailed, retryFailed, isClearingFailed, isRetryingFailed } =
    useFailedMessages()

  const pendingCount = stats?.pending ?? 0
  const failedCount = stats?.failed ?? 0
  const hasQueuedMessages = pendingCount > 0 || failedCount > 0

  // Don't show anything if online and no queued messages
  if (isOnline && !hasQueuedMessages && !isProcessing) {
    return null
  }

  // Compact view
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1',
                !isOnline && 'text-warning dark:text-warning',
                failedCount > 0 && 'text-error dark:text-error',
                isOnline && pendingCount > 0 && 'text-primary dark:text-primary',
                className
              )}
            >
              {!isOnline ? (
                <CloudOff className="h-4 w-4" />
              ) : isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : failedCount > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              {hasQueuedMessages && (
                <span className="text-xs font-medium">
                  {pendingCount + failedCount}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {!isOnline
              ? `Offline - ${pendingCount} message(s) queued`
              : isProcessing
              ? 'Syncing messages...'
              : failedCount > 0
              ? `${failedCount} message(s) failed to send`
              : `${pendingCount} message(s) pending`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full view with popover for management
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'flex items-center gap-1.5 h-8',
            !isOnline && 'text-warning hover:text-yellow-700',
            failedCount > 0 && 'text-error hover:text-error-dark',
            isOnline && pendingCount > 0 && 'text-primary hover:text-primary-hover',
            className
          )}
        >
          {!isOnline ? (
            <CloudOff className="h-4 w-4" />
          ) : isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : failedCount > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Cloud className="h-4 w-4" />
          )}
          <span className="text-xs">
            {!isOnline
              ? 'Offline'
              : isProcessing
              ? 'Syncing...'
              : failedCount > 0
              ? `${failedCount} failed`
              : `${pendingCount} pending`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium" className="heading-card">Message Queue</h4>
            {isOnline ? (
              <span className="flex items-center gap-1 text-xs text-success">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-warning">
                <span className="h-2 w-2 rounded-full bg-warning" />
                Offline
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="text-muted-foreground">Failed</span>
              <span className={cn('font-medium', failedCount > 0 && 'text-error')}>
                {failedCount}
              </span>
            </div>
          </div>

          {/* Actions */}
          {hasQueuedMessages && (
            <div className="flex gap-2">
              {isOnline && pendingCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => processQueue()}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sync Now
                </Button>
              )}
              {failedCount > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => retryFailed()}
                    disabled={isRetryingFailed}
                  >
                    {isRetryingFailed ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearFailed()}
                    disabled={isClearingFailed}
                  >
                    {isClearingFailed ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Failed messages list */}
          {failedMessages.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Failed messages:</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {failedMessages.slice(0, 5).map((msg) => (
                  <div
                    key={msg.id}
                    className="text-xs p-1.5 bg-error-light dark:bg-red-950/30 rounded text-error-dark dark:text-red-300"
                  >
                    <p className="truncate">{msg.content}</p>
                    {msg.error && (
                      <p className="text-[10px] text-error mt-0.5">
                        {msg.error}
                      </p>
                    )}
                  </div>
                ))}
                {failedMessages.length > 5 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{failedMessages.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info text */}
          {!isOnline && (
            <p className="text-xs text-muted-foreground">
              Messages will be sent automatically when you're back online.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
