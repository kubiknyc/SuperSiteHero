// File: /src/pages/auth/ResetPasswordPage.tsx
// Password reset page - handles the reset token from Supabase email

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/lib/notifications/ToastContext'
import { HardHat, Eye, EyeOff, CheckCircle, Loader2, ArrowLeft, AlertCircle, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p) => /[0-9]/.test(p) },
]

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [resetComplete, setResetComplete] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  // Check for valid recovery session on mount
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isSubscribed = true

    const checkRecoverySession = async () => {
      setIsCheckingSession(true)
      setSessionError(null)

      try {
        // Check URL hash for recovery token FIRST (before Supabase processes it)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')
        const hasRecoveryToken = type === 'recovery' && accessToken

        // Set up auth state listener BEFORE checking session
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!isSubscribed) return

          // Clear timeout since we got an event
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }

          if (event === 'PASSWORD_RECOVERY') {
            // User clicked the recovery link in email
            setIsValidSession(true)
            setIsCheckingSession(false)
          } else if (event === 'SIGNED_IN' && session) {
            // Session restored from recovery link
            setIsValidSession(true)
            setIsCheckingSession(false)
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Token was refreshed, we have a valid session
            setIsValidSession(true)
            setIsCheckingSession(false)
          }
        })
        subscription = data.subscription

        // If we detected a recovery token in the URL, wait for Supabase to process it
        if (hasRecoveryToken) {
          // Give Supabase time to process the token and emit the event
          timeoutId = setTimeout(() => {
            if (!isSubscribed) return
            // If we still haven't gotten a valid session after 5 seconds, show error
            setSessionError('This password reset link has expired or is invalid. Please request a new one.')
            setIsCheckingSession(false)
          }, 5000)
          return
        }

        // No recovery token in URL, check for existing session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isSubscribed) return

        if (error) {
          throw error
        }

        if (session) {
          // There's an existing session - user might be in recovery flow
          setIsValidSession(true)
          setIsCheckingSession(false)
        } else {
          // No valid session or recovery token
          setSessionError('This password reset link has expired or is invalid. Please request a new one.')
          setIsCheckingSession(false)
        }
      } catch (err) {
        if (!isSubscribed) return
        console.error('Error checking recovery session:', err)
        setSessionError('An error occurred while verifying the reset link. Please try again.')
        setIsCheckingSession(false)
      }
    }

    checkRecoverySession()

    // Cleanup
    return () => {
      isSubscribed = false
      if (subscription) {
        subscription.unsubscribe()
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // Check if all password requirements are met
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) => req.test(password))
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!allRequirementsMet) {
      showError('Error', 'Please ensure your password meets all requirements')
      return
    }

    if (!passwordsMatch) {
      showError('Error', 'Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }

      // Sign out after password reset to force re-login with new password
      await supabase.auth.signOut()

      setResetComplete(true)
      success('Success', 'Your password has been reset successfully')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-secondary dark:text-disabled">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid/expired token state
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-950 p-3">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Link Expired</CardTitle>
            <CardDescription className="text-center">
              {sessionError}
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col space-y-4">
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request New Reset Link</Link>
            </Button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 body-small text-secondary hover:text-foreground dark:text-disabled dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Success state
  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-950 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Password Reset Complete</CardTitle>
            <CardDescription className="text-center">
              Your password has been successfully reset. You will be redirected to the login page in a few seconds.
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-col space-y-4">
            <Button asChild className="w-full">
              <Link to="/login">Sign In Now</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary-100 dark:bg-primary-950 p-3">
              <HardHat className="h-8 w-8 text-primary dark:text-primary-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below. Make sure it meets all the requirements.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2 p-3 bg-surface-secondary dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-secondary dark:text-disabled uppercase tracking-wide">
                Password Requirements
              </p>
              <ul className="space-y-1.5">
                {PASSWORD_REQUIREMENTS.map((req, index) => {
                  const isMet = req.test(password)
                  return (
                    <li
                      key={index}
                      className={cn(
                        'flex items-center gap-2 text-sm transition-colors',
                        isMet
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-secondary dark:text-disabled'
                      )}
                    >
                      {isMet ? (
                        <Check className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span>{req.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={cn(
                    'pr-10',
                    confirmPassword.length > 0 && !passwordsMatch && 'border-red-500 focus-visible:ring-red-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 body-small text-secondary hover:text-foreground dark:text-disabled dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
