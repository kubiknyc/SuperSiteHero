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
          'flex items-center gap-3 rounded-full bg-primary px-4 py-2 text-white shadow-lg dark:bg-primary',
          'animate-in slide-in-from-bottom-4',
          className
        )}
      >
        <span className="text-sm font-medium">{message}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-white hover:bg-primary/90 dark:hover:bg-primary/80"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-primary-200 hover:text-white dark:text-primary-300 dark:hover:text-white"
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
          'flex items-center gap-2 text-sm text-primary hover:text-primary-700',
          'dark:text-primary-400 dark:hover:text-primary-300',
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
        'flex items-center justify-between bg-primary-50 dark:bg-primary-950/20 px-4 py-2 border-b border-primary-100 dark:border-primary-800',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300">
        <div className="h-2 w-2 rounded-full bg-primary dark:bg-primary-400 animate-pulse" />
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-950/40"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-primary-400 hover:text-primary-600 dark:hover:text-primary-200"
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
