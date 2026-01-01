// File: /src/lib/auth/AuthContextWithMFA.tsx
// Enhanced Authentication context with MFA support

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { UserProfile } from '@/types/database'
import {
  checkMFAStatus,
  getMFAChallenge,
  isRoleMFARequired,
  getUserMFAPreferences,
  type MFAFactor
} from './mfa'
import { MFASession } from './mfaMiddleware'
import { logger } from '../utils/logger'
import { withAuthRetry, isTransientError, isOnline, waitForOnline } from './auth-retry'


interface MFAState {
  enrolled: boolean
  required: boolean
  factors: MFAFactor[]
  verified: boolean
  verifiedAt?: number
  challenge?: {
    factorId: string
    challengeId?: string
  }
}

interface AuthContextType {
  session: Session | null
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  mfa: MFAState
  signIn: (email: string, password: string) => Promise<{ requiresMFA: boolean; factorId?: string }>
  signOut: () => Promise<void>
  checkMFARequired: () => Promise<boolean>
  refreshMFAStatus: () => Promise<void>
  markMFAVerified: () => void
  clearMFAVerification: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProviderWithMFA({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfa, setMFA] = useState<MFAState>({
    enrolled: false,
    required: false,
    factors: [],
    verified: false
  })

  // Fetch user profile from database with retry logic for transient failures
  const fetchUserProfile = useCallback(async (userId: string) => {
    // If offline, wait briefly for connectivity before attempting
    if (!isOnline()) {
      logger.log('[Auth] Offline detected, waiting for connectivity...')
      const online = await waitForOnline(5000)
      if (!online) {
        logger.warn('[Auth] Still offline, cannot fetch user profile')
        return null
      }
    }

    const result = await withAuthRetry(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          if (isTransientError(error)) {
            throw error // Let retry logic handle it
          }
          logger.error('[Auth] Error fetching user profile:', error)
          return null
        }

        return data
      },
      { maxRetries: 3, baseDelayMs: 1000 },
      'fetch user profile (MFA)'
    )

    if (!result.success) {
      logger.error('[Auth] Failed to fetch user profile after retries:', result.error)
      return null
    }

    const data = result.data
    if (data) {
      setUserProfile(data)
    }
    return data
  }, [])

  // Check and update MFA status
  const refreshMFAStatus = async () => {
    if (!user || !userProfile) {return}

    try {
      // Check enrollment status
      const { enrolled, factors } = await checkMFAStatus()

      // Check if role requires MFA
      const roleRequired = await isRoleMFARequired(userProfile.role)

      // Check user preferences
      const preferences = await getUserMFAPreferences(userProfile.id)

      // Check if session is MFA verified
      const verified = MFASession.isVerified(userProfile.id)

      // Get any pending MFA challenge
      const challenge = await getMFAChallenge()

      setMFA({
        enrolled,
        required: roleRequired || preferences.mfaEnabled,
        factors,
        verified,
        verifiedAt: verified ? Date.now() : undefined,
        challenge: challenge || undefined
      })
    } catch (error) {
      logger.error('Error refreshing MFA status:', error)
    }
  }

  // Check if MFA is required for current user
  const checkMFARequired = async (): Promise<boolean> => {
    if (!userProfile) {return false}

    const roleRequired = await isRoleMFARequired(userProfile.role)
    const preferences = await getUserMFAPreferences(userProfile.id)

    return roleRequired || preferences.mfaEnabled
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setTimeout(() => {
          setSession(session)
          setUser(session?.user ?? null)
        }, 0)

        // Fetch user profile and MFA status
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          if (profile) {
            await refreshMFAStatus()
          }
        }

        setTimeout(() => {
          setLoading(false)
        }, 0)
      })
      .catch((error) => {
        logger.error('Error getting session:', error)
        setTimeout(() => {
          setSession(null)
          setUser(null)
          setUserProfile(null)
          setLoading(false)
        }, 0)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setTimeout(() => {
        setSession(session)
        setUser(session?.user ?? null)
      }, 0)

      // Fetch/clear user profile and MFA status
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        if (profile) {
          await refreshMFAStatus()
        }
      } else {
        setTimeout(() => {
          setUserProfile(null)
          setMFA({
            enrolled: false,
            required: false,
            factors: [],
            verified: false
          })
        }, 0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Refresh MFA status when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setTimeout(() => {
        refreshMFAStatus()
      }, 0)
    }
  }, [userProfile])

  const signIn = async (email: string, password: string): Promise<{ requiresMFA: boolean; factorId?: string }> => {
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
      'sign in (MFA)'
    )

    if (!result.success) {
      throw result.error
    }

    const data = result.data!

    // Check if MFA is required
    if (data.session && data.user) {
      const profile = await fetchUserProfile(data.user.id)
      if (profile) {
        const { enrolled } = await checkMFAStatus()
        const required = await isRoleMFARequired(profile.role)

        if (enrolled && required) {
          // Get MFA challenge
          const challenge = await getMFAChallenge()
          if (challenge) {
            return { requiresMFA: true, factorId: challenge.factorId }
          }
        }
      }
    }

    return { requiresMFA: false }
  }

  const signOut = async () => {
    // Clear MFA verification
    if (userProfile) {
      MFASession.clearVerification(userProfile.id)
    }

    const { error } = await supabase.auth.signOut()
    if (error) {throw error}

    // Clear MFA state
    setMFA({
      enrolled: false,
      required: false,
      factors: [],
      verified: false
    })
  }

  const markMFAVerified = () => {
    if (userProfile) {
      MFASession.markVerified(userProfile.id)
      setMFA(prev => ({
        ...prev,
        verified: true,
        verifiedAt: Date.now()
      }))
    }
  }

  const clearMFAVerification = () => {
    if (userProfile) {
      MFASession.clearVerification(userProfile.id)
      setMFA(prev => ({
        ...prev,
        verified: false,
        verifiedAt: undefined
      }))
    }
  }

  const value = {
    session,
    user,
    userProfile,
    loading,
    mfa,
    signIn,
    signOut,
    checkMFARequired,
    refreshMFAStatus,
    markMFAVerified,
    clearMFAVerification
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthWithMFA() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthWithMFA must be used within an AuthProviderWithMFA')
  }
  return context
}