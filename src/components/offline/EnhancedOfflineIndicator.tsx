/**
 * Enhanced Offline Indicator Component
 * Shows network status, sync progress, and pending operations
 */

import { useState, useEffect, useMemo } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Badge, Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CheckCircle2,
  Clock,
  ChevronDown,
} from 'lucide-react'

export interface SyncStatus {
  isSyncing: boolean
  pendingCount: number
  lastSyncAt: number | null
  failedCount?: number
  syncProgress?: {
    current: number
    total: number
  }
}

export interface EnhancedOfflineIndicatorProps {
  syncStatus?: SyncStatus
  position?: 'top-right' | 'bottom' | 'top-left'
  className?: string
  onSyncClick?: () => void
  showDetails?: boolean
}

/**
 * Enhanced offline indicator with sync status
 * Shows as badge on desktop (top-right) and toast on mobile (bottom)
 */
export function EnhancedOfflineIndicator({
  syncStatus,
  position = 'top-right',
  className,
  onSyncClick,
  showDetails = true,
}: EnhancedOfflineIndicatorProps) {
  const { isOnline, networkQuality, lastOfflineAt } = useOnlineStatus()
  const [isOpen, setIsOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  // Update current time every minute to refresh relative timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const status = useMemo(() => {
    if (!isOnline) {
      return {
        type: 'offline' as const,
        label: 'Offline',
        icon: WifiOff,
        variant: 'destructive' as const,
      }
    }

    if (syncStatus?.isSyncing) {
      return {
        type: 'syncing' as const,
        label: 'Syncing...',
        icon: RefreshCw,
        variant: 'secondary' as const,
      }
    }

    if (syncStatus && syncStatus.pendingCount > 0) {
      return {
        type: 'pending' as const,
        label: `${syncStatus.pendingCount} pending`,
        icon: Clock,
        variant: 'secondary' as const,
      }
    }

    if (networkQuality.type === 'slow') {
      return {
        type: 'slow' as const,
        label: 'Slow Connection',
        icon: Wifi,
        variant: 'secondary' as const,
      }
    }

    return {
      type: 'online' as const,
      label: 'Online',
      icon: CheckCircle2,
      variant: 'success' as const,
    }
  }, [isOnline, networkQuality, syncStatus])

  const lastSyncFormatted = useMemo(() => {
    if (!syncStatus?.lastSyncAt) {return 'Never'}

    const diff = currentTime - syncStatus.lastSyncAt
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {return `${hours}h ago`}
    if (minutes > 0) {return `${minutes}m ago`}
    return 'Just now'
  }, [syncStatus, currentTime])

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'bottom': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
  }

  const Icon = status.icon

  // Auto-hide when online and no pending syncs
  const shouldShow = !isOnline || (syncStatus && (syncStatus.isSyncing || syncStatus.pendingCount > 0))

  if (!shouldShow && status.type === 'online') {
    return null
  }

  const indicator = (
    <div className={cn(positionClasses[position], className)}>
      {showDetails ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'gap-2 shadow-lg',
                status.type === 'offline' && 'bg-destructive text-destructive-foreground',
                status.type === 'syncing' && 'bg-secondary'
              )}
            >
              <Icon
                className={cn('h-4 w-4', status.type === 'syncing' && 'animate-spin')}
              />
              <span className="text-sm font-medium">{status.label}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-1 heading-card">Connection Status</h4>
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      status.type === 'offline' && 'text-destructive',
                      status.type === 'online' && 'text-success',
                      status.type === 'syncing' && 'animate-spin'
                    )}
                  />
                  <span className="text-sm">{status.label}</span>
                </div>
                {networkQuality.effectiveType && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Network: {networkQuality.effectiveType.toUpperCase()}
                    {networkQuality.downlink && ` (${networkQuality.downlink.toFixed(1)} Mbps)`}
                  </p>
                )}
              </div>

              {syncStatus && (
                <>
                  <div className="border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2 heading-card">Sync Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending Items</span>
                        <span className="font-medium">{syncStatus.pendingCount}</span>
                      </div>
                      {syncStatus.failedCount !== undefined && syncStatus.failedCount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Failed</span>
                          <span className="font-medium text-destructive">
                            {syncStatus.failedCount}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span className="font-medium">{lastSyncFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {syncStatus.syncProgress && syncStatus.syncProgress.total > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="font-semibold text-sm mb-2 heading-card">Sync Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {syncStatus.syncProgress.current} / {syncStatus.syncProgress.total}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{
                              width: `${(syncStatus.syncProgress.current / syncStatus.syncProgress.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {onSyncClick && isOnline && syncStatus.pendingCount > 0 && (
                    <Button
                      onClick={() => {
                        onSyncClick()
                        setIsOpen(false)
                      }}
                      className="w-full"
                      size="sm"
                      disabled={syncStatus.isSyncing}
                    >
                      <RefreshCw
                        className={cn('h-4 w-4 mr-2', syncStatus.isSyncing && 'animate-spin')}
                      />
                      {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  )}
                </>
              )}

              {!isOnline && lastOfflineAt && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    Offline since{' '}
                    {new Date(lastOfflineAt).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Changes will sync when back online
                  </p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Badge
          variant={status.variant}
          className={cn('gap-1.5 shadow-lg', status.type === 'syncing' && 'animate-pulse')}
        >
          <Icon className={cn('h-3 w-3', status.type === 'syncing' && 'animate-spin')} />
          {status.label}
        </Badge>
      )}
    </div>
  )

  return indicator
}

/**
 * Simple offline badge (compact version)
 */
export function OfflineBadge({ className }: { className?: string }) {
  const { isOnline } = useOnlineStatus()

  if (isOnline) {return null}

  return (
    <Badge variant="destructive" className={cn('gap-1', className)}>
      <WifiOff className="h-3 w-3" />
      Offline
    </Badge>
  )
}

/**
 * Sync status badge only (no network status)
 */
export function SyncStatusBadge({
  syncStatus,
  className,
}: {
  syncStatus?: SyncStatus
  className?: string
}) {
  if (!syncStatus || (!syncStatus.isSyncing && syncStatus.pendingCount === 0)) {
    return null
  }

  return (
    <Badge variant="secondary" className={cn('gap-1', className)}>
      {syncStatus.isSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          {syncStatus.pendingCount} pending
        </>
      )}
    </Badge>
  )
}
