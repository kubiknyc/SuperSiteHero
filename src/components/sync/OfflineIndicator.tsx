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
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

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
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 border border-green-200">
        <Wifi className="h-4 w-4 text-green-600" />
        <span className="text-xs font-medium text-green-700">Online</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 animate-pulse">
      <WifiOff className="h-4 w-4 text-red-600" />
      <span className="text-xs font-medium text-red-700">Offline</span>
    </div>
  )
}
