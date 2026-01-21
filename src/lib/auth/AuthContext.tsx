// File: /src/lib/auth/AuthContext.tsx
// Simplified authentication context and provider
// Handles email/password auth with Supabase

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { UserProfile } from '@/types/database'
import { logger } from '@/lib/utils/logger'
import { setSentryUser, clearSentryUser } from '../sentry'
import { withAuthRetry, isTransientError, isOnline, waitForOnline } from './auth-retry'
import { sessionManager } from './session-manager'
import { logAuthEvent } from '@/lib/audit/audit-logger'

interface AuthContextType {
  session: Session | null
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isPending: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from database with retry logic for transient failures
  const fetchUserProfile = useCallback(async (userId: string): Promise<boolean> => {
    // If offline, wait briefly for connectivity before attempting
    if (!isOnline()) {
      logger.log('[Auth] Offline detected, waiting for connectivity...')
      const online = await waitForOnline(3000) // Wait up to 3 seconds
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
      { maxRetries: 2, baseDelayMs: 500 },
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
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        // Fetch user profile if session exists
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        logger.error('Error getting session:', error)
        setSession(null)
        setUser(null)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Fetch/clear user profile
      if (session?.user) {
        fetchUserProfile(session.user.id)

        // Log successful login
        if (event === 'SIGNED_IN') {
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
        // Log logout
        if (event === 'SIGNED_OUT') {
          logAuthEvent('logout')
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      sessionManager.destroy()
    }
  }, [fetchUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    // Use retry logic for sign-in to handle transient network failures
    const result = await withAuthRetry(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          throw error
        }
        return data
      },
      { maxRetries: 1, baseDelayMs: 500 },
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
  }, [fetchUserProfile])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {throw error}

    // Clear Sentry user context
    clearSentryUser()

    // Clear sensitive data from localStorage on logout
    try {
      localStorage.removeItem('checklist-signature-templates')
      localStorage.removeItem('inAppNotifications')
      localStorage.removeItem('documentSearchHistory')
      localStorage.removeItem('performance-metrics')
    } catch {
      // Ignore errors if localStorage is not available
    }
  }, [])

  const isPending = userProfile?.approval_status === 'pending'

  // Refresh user profile from database (used after profile updates)
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }, [user, fetchUserProfile])

  const value = useMemo(() => ({
    session,
    user,
    userProfile,
    loading,
    isPending,
    signIn,
    signOut,
    refreshUserProfile,
  }), [session, user, userProfile, loading, isPending, signIn, signOut, refreshUserProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
