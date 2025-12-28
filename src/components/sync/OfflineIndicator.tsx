// File: /src/components/sync/OfflineIndicator.tsx
// Displays online/offline status indicator

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * OfflineIndicator Component
 * Shows whether the app is currently online or offline
 * Monitors window online/offline events
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {

    // Handle online event
    const handleOnline = () => {
      setIsOnline(true)
    }

    // Handle offline event
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-success-light border border-green-200">
        <Wifi className="h-4 w-4 text-success" />
        <span className="text-xs font-medium text-success-dark">Online</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-error-light border border-red-200 animate-pulse">
      <WifiOff className="h-4 w-4 text-error" />
      <span className="text-xs font-medium text-error-dark">Offline</span>
    </div>
  )
}
