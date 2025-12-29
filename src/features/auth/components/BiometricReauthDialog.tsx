/**
 * Biometric Re-authentication Dialog
 *
 * Dialog for quick biometric re-authentication when performing sensitive operations.
 * Shows when the re-authentication interval has expired.
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Fingerprint, Loader2, ShieldCheck, KeyRound } from 'lucide-react'
import { useBiometricAuth } from '../hooks/useBiometricAuth'
import { useToast } from '@/lib/notifications/ToastContext'

interface BiometricReauthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onCancel?: () => void
  onFallbackToPassword?: () => void
  title?: string
  description?: string
  showPasswordFallback?: boolean
}

export function BiometricReauthDialog({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  onFallbackToPassword,
  title = 'Verify Your Identity',
  description = 'This action requires biometric verification for security.',
  showPasswordFallback = true,
}: BiometricReauthDialogProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const { authenticate, isAvailable, error } = useBiometricAuth()
  const { success, error: showError } = useToast()

  const handleAuthenticate = useCallback(async () => {
    setIsAuthenticating(true)

    try {
      const authenticated = await authenticate()

      if (authenticated) {
        success('Verified', 'Identity verified successfully')
        onOpenChange(false)
        onSuccess()
      } else {
        showError('Verification Failed', error || 'Biometric authentication failed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      showError('Error', message)
    } finally {
      setIsAuthenticating(false)
    }
  }, [authenticate, error, onOpenChange, onSuccess, showError, success])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
    onCancel?.()
  }, [onCancel, onOpenChange])

  const handlePasswordFallback = useCallback(() => {
    onOpenChange(false)
    onFallbackToPassword?.()
  }, [onFallbackToPassword, onOpenChange])

  if (!isAvailable) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-info-light rounded-full">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-6">
          <Button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="w-full h-16 text-lg"
            size="lg"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Fingerprint className="h-6 w-6 mr-3" />
                Verify with Biometrics
              </>
            )}
          </Button>

          {showPasswordFallback && onFallbackToPassword && (
            <Button
              variant="ghost"
              onClick={handlePasswordFallback}
              disabled={isAuthenticating}
              className="w-full mt-3"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Use Password Instead
            </Button>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isAuthenticating}>
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Hook to trigger biometric re-authentication before sensitive operations
 */
export function useBiometricReauth() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const { needsReauth, isEnabled, isAvailable } = useBiometricAuth()

  const requireReauth = useCallback(
    (action: () => void): boolean => {
      // If biometric is not enabled or not available, allow action
      if (!isEnabled || !isAvailable) {
        action()
        return false
      }

      // If re-auth is not needed, allow action
      if (!needsReauth()) {
        action()
        return false
      }

      // Store action and open dialog
      setPendingAction(() => action)
      setIsOpen(true)
      return true
    },
    [isEnabled, isAvailable, needsReauth]
  )

  const handleSuccess = useCallback(() => {
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }, [pendingAction])

  const handleCancel = useCallback(() => {
    setPendingAction(null)
  }, [])

  return {
    isOpen,
    setIsOpen,
    requireReauth,
    handleSuccess,
    handleCancel,
  }
}
