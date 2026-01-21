// File: /src/pages/auth/AuthCallbackPage.tsx
// Handles Supabase auth callbacks (email verification, password reset, OAuth)

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { HardHat, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

type CallbackStatus = 'loading' | 'success' | 'error'
type CallbackType = 'signup' | 'recovery' | 'magiclink' | 'unknown'

export function AuthCallbackPage() {
  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [message, setMessage] = useState('Verifying your email...')
  const [callbackType, setCallbackType] = useState<CallbackType>('unknown')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL (Supabase puts tokens there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type') || searchParams.get('type')
        const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')

        logger.log('[AuthCallback] Processing callback', { type, hasAccessToken: !!accessToken })

        // Handle errors from Supabase
        if (errorCode || errorDescription) {
          throw new Error(errorDescription || `Authentication error: ${errorCode}`)
        }

        // Determine callback type
        if (type === 'signup' || type === 'email_confirmation') {
          setCallbackType('signup')
          setMessage('Verifying your email...')
        } else if (type === 'recovery') {
          setCallbackType('recovery')
          setMessage('Processing password reset...')
        } else if (type === 'magiclink') {
          setCallbackType('magiclink')
          setMessage('Signing you in...')
        }

        // If we have tokens in the hash, let Supabase handle the session
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            throw error
          }
        }

        // Get current session to verify
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        // Handle based on callback type
        if (type === 'recovery') {
          // Password reset - redirect to reset password page
          setStatus('success')
          setMessage('Redirecting to password reset...')
          setTimeout(() => {
            navigate('/reset-password', { replace: true })
          }, 1500)
          return
        }

        if (session) {
          // User is authenticated
          setStatus('success')
          setMessage('Email verified successfully! Redirecting...')

          // Wait a moment then redirect to dashboard or appropriate page
          setTimeout(() => {
            navigate('/', { replace: true })
          }, 2000)
        } else {
          // No session but no error - likely email confirmation without auto-login
          setStatus('success')
          setMessage('Email verified! Please sign in.')

          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 2000)
        }
      } catch (error) {
        logger.error('[AuthCallback] Error processing callback:', error)
        setStatus('error')
        setMessage(
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.'
        )

        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 3000)
      }
    }

    handleCallback()
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Blueprint Grid Background */}
      <div className="absolute inset-0 bg-slate-900">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(30, 64, 175, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 64, 175, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-transparent to-primary-950/50" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary/25">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Job<span className="text-primary-400">Sight</span>
          </span>
        </div>

        {/* Status Card */}
        <div className={cn(
          "w-full max-w-md p-8 rounded-2xl",
          "bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm",
          "text-center"
        )}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {status === 'loading' && (
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-error" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className={cn(
            "text-xl font-semibold mb-2",
            status === 'loading' && "text-white",
            status === 'success' && "text-success",
            status === 'error' && "text-error"
          )}>
            {status === 'loading' && 'Processing...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Oops!'}
          </h1>

          {/* Message */}
          <p className="text-slate-400">
            {message}
          </p>

          {/* Additional info for pending approval */}
          {status === 'success' && callbackType === 'signup' && (
            <p className="mt-4 text-sm text-slate-500">
              If you're joining an existing company, an admin will need to approve your account.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthCallbackPage
