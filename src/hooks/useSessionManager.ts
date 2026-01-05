// File: /src/hooks/useSessionManager.ts
// React hook for session management with expiry warnings

import { useState, useEffect, useCallback } from 'react'
import {
  sessionManager,
  SessionEvent,
  SessionEventType,
  SessionExpiryInfo,
} from '@/lib/auth/session-manager'
import { logger } from '@/lib/utils/logger'

interface UseSessionManagerOptions {
  /** Show warning when session is expiring soon */
  showExpiryWarning?: boolean
  /** Callback when session is about to expire */
  onExpiringSoon?: (timeRemaining: number) => void
  /** Callback when session expires */
  onExpired?: () => void
  /** Callback when session is refreshed */
  onRefreshed?: () => void
  /** Callback when signed out */
  onSignedOut?: () => void
  /** Callback when network status changes */
  onNetworkChange?: (isOnline: boolean) => void
}

interface UseSessionManagerResult {
  /** Session expiry information */
  expiryInfo: SessionExpiryInfo
  /** Whether the session is valid */
  isValid: boolean
  /** Whether session is currently refreshing */
  isRefreshing: boolean
  /** Whether device is online */
  isOnline: boolean
  /** Manually trigger session refresh */
  refresh: () => Promise<boolean>
  /** Extend session (refresh and reset warnings) */
  extendSession: () => Promise<boolean>
}

/**
 * Hook to manage session state and expiry
 */
export function useSessionManager(options: UseSessionManagerOptions = {}): UseSessionManagerResult {
  const {
    onExpiringSoon,
    onExpired,
    onRefreshed,
    onSignedOut,
    onNetworkChange,
  } = options

  const [expiryInfo, setExpiryInfo] = useState<SessionExpiryInfo>(() =>
    sessionManager.getExpiryInfo()
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Handle session events
  useEffect(() => {
    const handleEvent = (event: SessionEvent) => {
      logger.debug('[useSessionManager] Event:', event.type)

      switch (event.type) {
        case 'SESSION_EXPIRING_SOON':
          setExpiryInfo(sessionManager.getExpiryInfo())
          if (onExpiringSoon && event.payload) {
            onExpiringSoon((event.payload as { timeRemaining: number }).timeRemaining)
          }
          break

        case 'SESSION_EXPIRED':
          setExpiryInfo(sessionManager.getExpiryInfo())
          onExpired?.()
          break

        case 'SESSION_REFRESHED':
          setExpiryInfo(sessionManager.getExpiryInfo())
          setIsRefreshing(false)
          onRefreshed?.()
          break

        case 'SESSION_REFRESH_FAILED':
          setIsRefreshing(false)
          break

        case 'SESSION_SIGNED_OUT':
          setExpiryInfo(sessionManager.getExpiryInfo())
          onSignedOut?.()
          break

        case 'NETWORK_ONLINE':
          setIsOnline(true)
          onNetworkChange?.(true)
          break

        case 'NETWORK_OFFLINE':
          setIsOnline(false)
          onNetworkChange?.(false)
          break

        case 'SESSION_SYNCED':
          setExpiryInfo(sessionManager.getExpiryInfo())
          break
      }
    }

    const unsubscribe = sessionManager.subscribe(handleEvent)

    // Update expiry info periodically
    const interval = setInterval(() => {
      setExpiryInfo(sessionManager.getExpiryInfo())
    }, 10000) // Every 10 seconds

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [onExpiringSoon, onExpired, onRefreshed, onSignedOut, onNetworkChange])

  // Refresh session
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    const success = await sessionManager.refreshSession()
    if (!success) {
      setIsRefreshing(false)
    }
    return success
  }, [])

  // Extend session (same as refresh but with intent to extend)
  const extendSession = useCallback(async () => {
    logger.log('[useSessionManager] Extending session...')
    return refresh()
  }, [refresh])

  return {
    expiryInfo,
    isValid: sessionManager.isSessionValid(),
    isRefreshing,
    isOnline,
    refresh,
    extendSession,
  }
}

/**
 * Hook to listen for specific session events
 */
export function useSessionEvent(
  eventType: SessionEventType,
  callback: (event: SessionEvent) => void
): void {
  useEffect(() => {
    const handleEvent = (event: SessionEvent) => {
      if (event.type === eventType) {
        callback(event)
      }
    }

    return sessionManager.subscribe(handleEvent)
  }, [eventType, callback])
}

/**
 * Hook to get countdown to session expiry
 */
export function useSessionCountdown(): {
  timeRemaining: number | null
  formattedTime: string | null
  isExpiringSoon: boolean
  isExpired: boolean
} {
  const [state, setState] = useState(() => {
    const info = sessionManager.getExpiryInfo()
    return {
      timeRemaining: info.expiresIn,
      formattedTime: info.formattedTimeRemaining,
      isExpiringSoon: info.isExpiringSoon,
      isExpired: info.isExpired,
    }
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const info = sessionManager.getExpiryInfo()
      setState({
        timeRemaining: info.expiresIn,
        formattedTime: info.formattedTimeRemaining,
        isExpiringSoon: info.isExpiringSoon,
        isExpired: info.isExpired,
      })
    }, 1000) // Update every second for accurate countdown

    return () => clearInterval(interval)
  }, [])

  return state
}
