/**
 * Offline Mode Indicator
 *
 * Clear offline/online indicator for header/navbar:
 * - Shows in header with visual indicator
 * - Yellow/orange when offline
 * - Toast notification on connection change
 * - "Working offline" badge
 */

import { useEffect, useState } from 'react'
import { WifiOff, Wifi, CloudOff, Cloud, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useIsOnline, usePendingSyncs } from '@/stores/offline-store'
import { toast } from 'sonner'

interface OfflineIndicatorProps {
  className?: string
  variant?: 'badge' | 'full' | 'compact'
  showPendingCount?: boolean
}

export function OfflineIndicator({
  className,
  variant = 'compact',
  showPendingCount = true,
}: OfflineIndicatorProps) {
  const isOnline = useIsOnline()
  const pendingSyncs = usePendingSyncs()
  const [previousOnlineState, setPreviousOnlineState] = useState<boolean | null>(null)

  // Show toast notification on connection change
  useEffect(() => {
    if (previousOnlineState === null) {
      // First render, just set the state
      setPreviousOnlineState(isOnline)
      return
    }

    if (previousOnlineState !== isOnline) {
      if (isOnline) {
        // Coming back online
        toast.success('Back online', {
          description: pendingSyncs > 0
            ? `Syncing ${pendingSyncs} pending change${pendingSyncs !== 1 ? 's' : ''}...`
            : 'Connection restored',
          duration: 3000,
        })
      } else {
        // Going offline
        toast.info('You are offline', {
          description: 'Changes will be saved locally and synced when you reconnect',
          duration: 4000,
        })
      }
      setPreviousOnlineState(isOnline)
    }
  }, [isOnline, previousOnlineState, pendingSyncs])

  // Badge variant - minimal indicator
  if (variant === 'badge') {
    if (isOnline) return null

    return (
      <Badge
        variant="secondary"
        className={cn(
          'gap-1 bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
          className
        )}
      >
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    )
  }

  // Compact variant - icon only with tooltip
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
          isOnline
            ? 'text-success bg-success/10'
            : 'text-warning bg-warning/10',
          className
        )}
        title={isOnline ? 'Connected' : 'Working offline'}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        {!isOnline && showPendingCount && pendingSyncs > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {pendingSyncs}
          </Badge>
        )}
      </div>
    )
  }

  // Full variant - detailed status
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
        isOnline
          ? 'bg-success/10 border-success/20 text-success'
          : 'bg-warning/10 border-warning/20 text-warning',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Cloud className="h-4 w-4" />
            <span className="text-sm font-medium">Online</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            <span className="text-sm font-medium">Working Offline</span>
          </>
        )}
      </div>
      {!isOnline && showPendingCount && pendingSyncs > 0 && (
        <>
          <div className="w-px h-4 bg-warning/30" />
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>{pendingSyncs} pending</span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Mobile Offline Banner
 * Full-width banner that appears at top of screen on mobile when offline
 */
export function MobileOfflineBanner() {
  const isOnline = useIsOnline()
  const pendingSyncs = usePendingSyncs()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning text-warning-foreground px-4 py-2 md:hidden">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>Working Offline</span>
        {pendingSyncs > 0 && (
          <>
            <span className="opacity-60">•</span>
            <span>{pendingSyncs} pending change{pendingSyncs !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Offline Status Dot
 * Small colored dot indicator for minimal UI
 */
export function OfflineStatusDot({ className }: { className?: string }) {
  const isOnline = useIsOnline()

  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full',
        isOnline ? 'bg-success' : 'bg-warning',
        className
      )}
      title={isOnline ? 'Online' : 'Offline'}
    />
  )
}

export default OfflineIndicator
