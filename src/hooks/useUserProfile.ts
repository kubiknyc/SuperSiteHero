/**
 * useUserProfile Hook
 *
 * Fetches user profile data by user ID with caching.
 * Used for displaying user names instead of raw UUIDs.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

/**
 * Fetch a single user profile by ID
 */
export function useUserProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) {return null}

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, avatar_url')
        .eq('id', userId)
        .single()

      if (error) {
        // Don't throw for not found - just return null
        if (error.code === 'PGRST116') {return null}
        throw error
      }

      return data as UserProfile
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  })
}

/**
 * Batch fetch multiple user profiles by IDs
 */
export function useUserProfiles(userIds: (string | null | undefined)[]) {
  const validIds = userIds.filter((id): id is string => !!id)

  return useQuery({
    queryKey: ['user-profiles', validIds.sort().join(',')],
    queryFn: async (): Promise<Map<string, UserProfile>> => {
      if (validIds.length === 0) {return new Map()}

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, avatar_url')
        .in('id', validIds)

      if (error) {throw error}

      const profileMap = new Map<string, UserProfile>()
      for (const profile of data || []) {
        profileMap.set(profile.id, profile as UserProfile)
      }

      return profileMap
    },
    enabled: validIds.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

/**
 * Get display name from a user profile
 */
export function getDisplayName(profile: UserProfile | null | undefined, fallback = 'Unknown User'): string {
  if (!profile) {return fallback}

  if (profile.full_name) {return profile.full_name}
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`
  }
  if (profile.first_name) {return profile.first_name}
  if (profile.email) {return profile.email.split('@')[0]}

  return fallback
}
