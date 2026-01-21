// File: /src/components/mobile/MobileOfflineIndicator.tsx
// Prominent offline indicator for mobile devices

import { useEffect, useState } from 'react'
import { WifiOff, Wifi, RefreshCw, CloudOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileOfflineIndicatorProps {
  className?: string
  showWhenOnline?: boolean
}

export function MobileOfflineIndicator({
  className,
  showWhenOnline = false,
}: MobileOfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [showSyncMessage, setShowSyncMessage] = useState(false)

  useEffect(() => {

    const handleOnline = () => {
      setIsOnline(true)
      setIsReconnecting(false)
      setShowSyncMessage(true)
      // Hide sync message after 3 seconds
      setTimeout(() => setShowSyncMessage(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsReconnecting(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show reconnecting state
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        if (navigator.onLine) {
          setIsReconnecting(true)
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [isOnline])

  // Don't render if online and not showing sync message (unless showWhenOnline is true)
  if (isOnline && !showSyncMessage && !showWhenOnline) {
    return null
  }

  // Show success message when back online
  if (isOnline && showSyncMessage) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-success-light dark:bg-success/20 border-b border-success/30 dark:border-success/40',
          className
        )}
      >
        <Wifi className="h-5 w-5 text-success flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-success-dark dark:text-success">Back Online</p>
          <p className="text-xs text-success dark:text-success/80">Syncing your changes...</p>
        </div>
        <RefreshCw className="h-4 w-4 text-success animate-spin" />
      </div>
    )
  }

  // Show online indicator if requested
  if (isOnline && showWhenOnline) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-success-light dark:bg-success/20 border-b border-success/30 dark:border-success/40',
          className
        )}
      >
        <Wifi className="h-5 w-5 text-success flex-shrink-0" />
        <p className="text-sm font-medium text-success-dark dark:text-success">Connected</p>
      </div>
    )
  }

  // Offline state
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 bg-warning-light dark:bg-warning/20 border-b border-warning/30 dark:border-warning/40',
        className
      )}
    >
      {isReconnecting ? (
        <>
          <RefreshCw className="h-5 w-5 text-warning flex-shrink-0 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning-dark dark:text-warning">Reconnecting...</p>
            <p className="text-xs text-warning dark:text-warning/80">Trying to restore connection</p>
          </div>
        </>
      ) : (
        <>
          <WifiOff className="h-5 w-5 text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning-dark dark:text-warning">You're Offline</p>
            <p className="text-xs text-warning dark:text-warning/80">Changes will sync when connected</p>
          </div>
          <CloudOff className="h-4 w-4 text-warning" />
        </>
      )}
    </div>
  )
}

// Floating offline banner for use at top of pages
export function MobileOfflineBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {

    const handleOnline = () => {
      setIsOnline(true)
      setDismissed(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline || dismissed) {
    return null
  }

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 safe-area-top">
      <div className="bg-warning text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline Mode</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs underline touch-target"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
