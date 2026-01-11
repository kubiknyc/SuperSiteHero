// File: /src/components/auth/SecurityWarningDialog.tsx
// Security warning dialog for session hijacking detection

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SecurityCheckResult } from '@/lib/auth/session-security'

interface SecurityWarningDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Security check result */
  securityResult: SecurityCheckResult | null
  /** Called when user dismisses the warning */
  onDismiss: () => void
  /** Called when user chooses to sign out */
  onSignOut: () => void
}

/**
 * Security warning dialog shown when potential session hijacking is detected
 */
export function SecurityWarningDialog({
  open,
  securityResult,
  onDismiss,
  onSignOut,
}: SecurityWarningDialogProps) {
  if (!securityResult) {
    return null
  }

  const isHighRisk = securityResult.riskLevel === 'high'
  const isMediumRisk = securityResult.riskLevel === 'medium'

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className={isHighRisk ? 'border-destructive' : isMediumRisk ? 'border-warning' : ''}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isHighRisk ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Shield className="h-5 w-5 text-warning" />
            )}
            {isHighRisk ? 'Security Alert' : 'Security Notice'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {isHighRisk
                ? 'We detected unusual activity on your account that may indicate unauthorized access.'
                : 'We noticed some changes in your browsing environment.'}
            </p>

            {securityResult.reason && (
              <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                {securityResult.reason}
              </p>
            )}

            <p>
              {isHighRisk
                ? 'For your security, we recommend signing out and changing your password.'
                : 'This could be normal if you recently updated your browser or changed devices.'}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!isHighRisk && (
            <Button variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
          <Button
            variant={isHighRisk ? 'destructive' : 'default'}
            onClick={onSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Wrapper component that uses AuthContext
 */
export function SecurityWarning() {
  const { securityWarning, dismissSecurityWarning, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // Error handled in signOut
    }
  }

  return (
    <SecurityWarningDialog
      open={!!securityWarning && !securityWarning.passed}
      securityResult={securityWarning}
      onDismiss={dismissSecurityWarning}
      onSignOut={handleSignOut}
    />
  )
}

export default SecurityWarning
