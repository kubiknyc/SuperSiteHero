// File: /src/lib/auth/AuthContext.tsx
// Authentication context and provider

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { UserProfile } from '@/types/database'
import { logger } from '@/lib/utils/logger'
import { setSentryUser, clearSentryUser } from '../sentry'

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

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        // Don't auto-logout on query errors (could be RLS, network, etc.)
        // Just log the error and continue with null profile
        logger.error('Error fetching user profile:', error)
        logger.warn('Continuing without profile - user may have limited functionality')
        // Set profile to null but don't sign out - let the user retry
        setUserProfile(null)
        return false
      }

      if (!data) {
        // User authenticated but profile doesn't exist in database
        // This could happen if:
        // 1. User was deleted from users table but still has valid JWT
        // 2. Auto-creation of user profile failed during signup
        logger.warn('User profile not found in database for user:', userId)
        logger.warn('User may need to be re-added to the system')
        setUserProfile(null)

        // Only auto-logout in production, not in test/development
        // to avoid breaking E2E tests
        if (import.meta.env.PROD) {
          logger.warn('Auto-logout triggered in production due to missing profile')
          await supabase.auth.signOut()
        }

        return false
      }

      setUserProfile(data)

      // Set Sentry user context for error tracking
      setSentryUser(userId, data.company_id || undefined)

      return true
    } catch (error) {
      logger.error('Unexpected error fetching user profile:', error)
      // Don't sign out on unexpected errors - could be transient
      return false
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)

        // Fetch user profile from database
        if (session?.user) {
          fetchUserProfile(session.user.id)
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Fetch/clear user profile
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {throw error}

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
    signIn,
    signOut,
    refreshUserProfile,
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
