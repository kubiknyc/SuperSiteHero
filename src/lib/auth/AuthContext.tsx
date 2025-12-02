// File: /src/lib/auth/AuthContext.tsx
// Authentication context and provider

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { UserProfile } from '@/types/database'
import { logger } from '@/lib/utils/logger'

interface AuthContextType {
  session: Session | null
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        logger.error('Error fetching user profile:', error)
        return
      }

      setUserProfile(data)
    } catch (error) {
      logger.error('Unexpected error fetching user profile:', error)
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {throw error}
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {throw error}

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

  const value = {
    session,
    user,
    userProfile,
    loading,
    signIn,
    signOut,
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
