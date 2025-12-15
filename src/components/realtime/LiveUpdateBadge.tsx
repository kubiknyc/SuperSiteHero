// File: src/components/realtime/LiveUpdateBadge.tsx
// Banner/badge to show when new updates are available

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

interface LiveUpdateBadgeProps {
  count: number
  onRefresh: () => void
  onDismiss?: () => void
  className?: string
  /** Position variant */
  variant?: 'banner' | 'floating' | 'inline'
}

/**
 * Badge/banner to notify users of new realtime updates
 *
 * @example
 * ```tsx
 * const { pendingUpdates, applyUpdates, dismissUpdates } = useRealtimeUpdates({
 *   table: 'daily_reports',
 *   queryKey: ['daily-reports'],
 *   showUpdateBanner: true,
 * })
 *
 * <LiveUpdateBadge
 *   count={pendingUpdates}
 *   onRefresh={applyUpdates}
 *   onDismiss={dismissUpdates}
 * />
 * ```
 */
export function LiveUpdateBadge({
  count,
  onRefresh,
  onDismiss,
  className,
  variant = 'banner',
}: LiveUpdateBadgeProps) {
  if (count === 0) {return null}

  const message =
    count === 1
      ? '1 new update available'
      : `${count} new updates available`

  if (variant === 'floating') {
    return (
      <div
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-3 rounded-full bg-blue-600 px-4 py-2 text-white shadow-lg',
          'animate-in slide-in-from-bottom-4',
          className
        )}
      >
        <span className="text-sm font-medium">{message}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-white hover:bg-blue-500"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-blue-200 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={onRefresh}
        className={cn(
          'flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700',
          'dark:text-blue-400 dark:hover:text-blue-300',
          className
        )}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>{message}</span>
      </button>
    )
  }

  // Banner variant (default)
  return (
    <div
      className={cn(
        'flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-blue-100 dark:border-blue-800',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default LiveUpdateBadge
