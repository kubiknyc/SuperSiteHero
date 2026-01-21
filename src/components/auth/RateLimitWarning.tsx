// File: /src/components/auth/RateLimitWarning.tsx
// Rate limit warning component for auth pages

import { AlertCircle, Clock, ShieldAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { RateLimitState, formatLockoutTime } from '@/lib/auth/rate-limiter'

interface RateLimitWarningProps {
  /** Current rate limit state */
  state: RateLimitState
  /** Action being rate limited (for messaging) */
  action: 'login' | 'signup' | 'password_reset'
}

const ACTION_LABELS = {
  login: 'sign in',
  signup: 'sign up',
  password_reset: 'reset password',
}

/**
 * Warning component shown when user is approaching or at rate limit
 */
export function RateLimitWarning({ state, action }: RateLimitWarningProps) {
  const actionLabel = ACTION_LABELS[action]

  // Show lockout message
  if (state.isLocked) {
    return (
      <Alert variant="destructive" className="mb-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Too Many Attempts</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            You've made too many {actionLabel} attempts. Please wait before trying again.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>Try again in: {formatLockoutTime(state.lockoutRemaining)}</span>
          </div>
          <Progress
            value={(state.lockoutRemaining / (15 * 60 * 1000)) * 100}
            className="h-2"
          />
        </AlertDescription>
      </Alert>
    )
  }

  // Show warning when approaching limit
  if (state.remainingAttempts <= 2 && state.attempts > 0) {
    return (
      <Alert variant="default" className="mb-4 border-warning bg-warning/10">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Warning</AlertTitle>
        <AlertDescription>
          You have {state.remainingAttempts} attempt{state.remainingAttempts !== 1 ? 's' : ''} remaining
          before your account is temporarily locked.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

/**
 * Simple inline warning for compact layouts
 */
export function RateLimitInlineWarning({ state }: { state: RateLimitState }) {
  if (state.isLocked) {
    return (
      <p className="text-sm text-destructive flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span>Locked. Try again in {formatLockoutTime(state.lockoutRemaining)}</span>
      </p>
    )
  }

  if (state.remainingAttempts <= 2 && state.attempts > 0) {
    return (
      <p className="text-sm text-warning">
        {state.remainingAttempts} attempt{state.remainingAttempts !== 1 ? 's' : ''} remaining
      </p>
    )
  }

  return null
}

export default RateLimitWarning
