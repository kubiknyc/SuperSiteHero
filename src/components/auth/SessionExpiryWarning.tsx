// File: /src/components/auth/SessionExpiryWarning.tsx
// Session expiry warning toast/dialog component

import { useState, useEffect, useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useSessionManager, useSessionCountdown } from '@/hooks/useSessionManager'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface SessionExpiryWarningProps {
  /** Called when user is signed out due to expiry */
  onExpired?: () => void
}

/**
 * Session expiry warning component
 * Shows toast warnings and dialog when session is about to expire
 */
export function SessionExpiryWarning({ onExpired }: SessionExpiryWarningProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [hasShownWarning, setHasShownWarning] = useState(false)

  const { extendSession, isRefreshing, isOnline } = useSessionManager({
    onExpiringSoon: useCallback((timeRemaining: number) => {
      if (!hasShownWarning) {
        const minutes = Math.ceil(timeRemaining / 60000)
        logger.log('[SessionExpiryWarning] Session expiring in', minutes, 'minutes')

        // Show toast for first warning
        toast.warning(`Session expiring in ${minutes} minutes`, {
          description: 'Click to extend your session',
          action: {
            label: 'Extend',
            onClick: () => {
              extendSession()
            },
          },
          duration: 10000,
        })

        setHasShownWarning(true)

        // Show dialog if less than 2 minutes remaining
        if (timeRemaining < 2 * 60 * 1000) {
          setShowDialog(true)
        }
      }
    }, [hasShownWarning, extendSession]),

    onExpired: useCallback(() => {
      logger.warn('[SessionExpiryWarning] Session expired')
      setShowDialog(false)
      toast.error('Your session has expired', {
        description: 'Please sign in again to continue',
      })
      onExpired?.()
    }, [onExpired]),

    onRefreshed: useCallback(() => {
      logger.log('[SessionExpiryWarning] Session extended')
      setShowDialog(false)
      setHasShownWarning(false)
      toast.success('Session extended', {
        description: 'Your session has been refreshed',
      })
    }, []),

    onNetworkChange: useCallback((online: boolean) => {
      if (!online) {
        toast.warning('You are offline', {
          description: 'Session will refresh when connection is restored',
          icon: <WifiOff className="h-4 w-4" />,
        })
      } else {
        toast.success('Back online', {
          icon: <Wifi className="h-4 w-4" />,
        })
      }
    }, []),
  })

  const { formattedTime, isExpiringSoon } = useSessionCountdown()

  // Show dialog when time is critically low
  useEffect(() => {
    if (isExpiringSoon && !showDialog && hasShownWarning) {
      setShowDialog(true)
    }
  }, [isExpiringSoon, showDialog, hasShownWarning])

  const handleExtend = async () => {
    const success = await extendSession()
    if (!success) {
      toast.error('Failed to extend session', {
        description: 'Please try signing in again',
      })
    }
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session will expire in{' '}
              <span className="font-semibold text-foreground">
                {formattedTime || 'a few moments'}
              </span>
              .
            </p>
            <p>
              Would you like to extend your session to continue working?
            </p>
            {!isOnline && (
              <p className="text-warning flex items-center gap-1">
                <WifiOff className="h-4 w-4" />
                You are currently offline. Extension will occur when connection is restored.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDialog(false)}
          >
            Sign Out
          </Button>
          <AlertDialogAction asChild>
            <Button onClick={handleExtend} disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Extending...
                </>
              ) : (
                'Extend Session'
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Session status indicator for header/navbar
 */
export function SessionStatusIndicator() {
  const { isOnline } = useSessionManager()
  const { isExpiringSoon, formattedTime } = useSessionCountdown()

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1 text-warning text-xs">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    )
  }

  if (isExpiringSoon && formattedTime) {
    return (
      <div className="flex items-center gap-1 text-warning text-xs">
        <Clock className="h-3 w-3" />
        <span>{formattedTime}</span>
      </div>
    )
  }

  return null
}

export default SessionExpiryWarning
