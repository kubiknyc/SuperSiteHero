// File: /src/lib/auth/AuthContext.tsx
// Authentication context and provider with enhanced session management

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { UserProfile } from '@/types/database'
import { logger } from '@/lib/utils/logger'
import { setSentryUser, clearSentryUser } from '../sentry'
import { withAuthRetry, isTransientError, isOnline, waitForOnline } from './auth-retry'
import { sessionManager } from './session-manager'
import {
  initializeSessionSecurity,
  clearSessionSecurityData,
  startActivityMonitoring,
  SecurityCheckResult,
} from './session-security'
import { logAuthEvent, logSecurityEvent } from '@/lib/audit/audit-logger'

interface AuthContextType {
  session: Session | null
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isPending: boolean
  /** Security warning if session appears hijacked */
  securityWarning: SecurityCheckResult | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  /** Dismiss the security warning */
  dismissSecurityWarning: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [securityWarning, setSecurityWarning] = useState<SecurityCheckResult | null>(null)

  // Fetch user profile from database with retry logic for transient failures
  const fetchUserProfile = useCallback(async (userId: string): Promise<boolean> => {
    // If offline, wait briefly for connectivity before attempting
    if (!isOnline()) {
      logger.log('[Auth] Offline detected, waiting for connectivity...')
      const online = await waitForOnline(5000) // Wait up to 5 seconds
      if (!online) {
        logger.warn('[Auth] Still offline, cannot fetch user profile')
        setUserProfile(null)
        return false
      }
    }

    const result = await withAuthRetry(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          // Check if this is a transient error that should be retried
          if (isTransientError(error)) {
            throw error // Let retry logic handle it
          }
          // Non-transient error - log and return null
          logger.error('[Auth] Error fetching user profile:', error)
          return null
        }

        return data
      },
      { maxRetries: 3, baseDelayMs: 1000 },
      'fetch user profile'
    )

    if (!result.success) {
      // Retry logic exhausted
      logger.error('[Auth] Failed to fetch user profile after retries:', result.error)
      logger.warn('[Auth] Continuing without profile - user may have limited functionality')
      setUserProfile(null)
      return false
    }

    const data = result.data

    if (!data) {
      // User authenticated but profile doesn't exist in database
      // This could happen if:
      // 1. User was deleted from users table but still has valid JWT
      // 2. Auto-creation of user profile failed during signup
      logger.warn('[Auth] User profile not found in database for user:', userId)
      logger.warn('[Auth] User may need to be re-added to the system')
      setUserProfile(null)

      // Only auto-logout in production, not in test/development
      // to avoid breaking E2E tests
      if (import.meta.env.PROD) {
        logger.warn('[Auth] Auto-logout triggered in production due to missing profile')
        await supabase.auth.signOut()
      }

      return false
    }

    setUserProfile(data)

    // Set Sentry user context for error tracking
    setSentryUser(userId, data.company_id || undefined)

    return true
  }, [])

  useEffect(() => {
    // Initialize session manager
    sessionManager.initialize().catch((error) => {
      logger.error('[Auth] Failed to initialize session manager:', error)
    })

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)

        // Fetch user profile from database
        if (session?.user) {
          fetchUserProfile(session.user.id)
          // Initialize session security on existing session
          initializeSessionSecurity()
        }

        setLoading(false)
      })
      .catch((error) => {
        logger.error('Error getting session:', error)
        setSession(null)
        setUser(null)
        setUserProfile(null)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Fetch/clear user profile
      if (session?.user) {
        fetchUserProfile(session.user.id)

        // Initialize security on new sign in
        if (event === 'SIGNED_IN') {
          initializeSessionSecurity()
          // Log successful login
          logAuthEvent('login', {
            user_id: session.user.id,
            email: session.user.email,
            provider: session.user.app_metadata?.provider || 'email',
          })
        }

        // Log token refresh
        if (event === 'TOKEN_REFRESHED') {
          logAuthEvent('session_refresh', {
            user_id: session.user.id,
          })
        }
      } else {
        setUserProfile(null)
        // Clear security data on sign out
        if (event === 'SIGNED_OUT') {
          clearSessionSecurityData()
          // Log logout
          logAuthEvent('logout')
        }
      }
    })

    // Start activity monitoring for session security
    const stopActivityMonitoring = startActivityMonitoring((result) => {
      if (!result.passed) {
        logger.warn('[Auth] Security issue detected:', result.reason)
        setSecurityWarning(result)

        // Log security event
        logSecurityEvent(
          result.riskLevel === 'high' ? 'suspicious_activity' : 'security_warning',
          {
            reason: result.reason,
            riskLevel: result.riskLevel,
            action: result.action,
          }
        )

        // Auto-logout on high risk
        if (result.action === 'logout') {
          logger.warn('[Auth] Auto-logout triggered due to security concern')
          supabase.auth.signOut()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      stopActivityMonitoring()
      sessionManager.destroy()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    // Use retry logic for sign-in to handle transient network failures
    const result = await withAuthRetry(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          throw error
        }
        return data
      },
      { maxRetries: 2, baseDelayMs: 1000 },
      'sign in'
    )

    if (!result.success) {
      throw result.error
    }

    const data = result.data!

    // Wait for user profile to be fetched before resolving
    // This prevents race condition where navigation happens before profile is loaded
    if (data.user) {
      const profileFetched = await fetchUserProfile(data.user.id)
      if (!profileFetched) {
        throw new Error('Failed to load user profile. Please contact support.')
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {throw error}

    // Clear Sentry user context
    clearSentryUser()

    // Clear session security data
    clearSessionSecurityData()

    // Clear sensitive data from localStorage on logout
    try {
      localStorage.removeItem('checklist-signature-templates')
      localStorage.removeItem('inAppNotifications')
      localStorage.removeItem('documentSearchHistory')
      localStorage.removeItem('performance-metrics')
    } catch {
      // Ignore errors if localStorage is not available
    }
  }

  // Dismiss security warning
  const dismissSecurityWarning = useCallback(() => {
    setSecurityWarning(null)
  }, [])

  const isPending = userProfile?.approval_status === 'pending'

  // Refresh user profile from database (used after profile updates)
  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const value = {
    session,
    user,
    userProfile,
    loading,
    isPending,
    securityWarning,
    signIn,
    signOut,
    refreshUserProfile,
    dismissSecurityWarning,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
