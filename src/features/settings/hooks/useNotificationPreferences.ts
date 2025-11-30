/**
 * React Query hooks for notification preferences
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationPreferencesApi } from '@/lib/api/services/notification-preferences'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { NotificationPreferences } from '@/types/notification-preferences'

// ============================================================================
// Query Keys
// ============================================================================

export const preferencesKeys = {
  all: ['notification-preferences'] as const,
  user: (userId: string) => [...preferencesKeys.all, userId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch notification preferences for the current user
 */
export function useNotificationPreferences() {
  const { user } = useAuth()

  return useQuery({
    queryKey: preferencesKeys.user(user?.id || ''),
    queryFn: () => notificationPreferencesApi.getPreferences(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) => {
      if (!user?.id) {throw new Error('User not authenticated')}
      return notificationPreferencesApi.updatePreferences(user.id, preferences)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(preferencesKeys.user(user?.id || ''), data)
      toast.success('Notification preferences saved')
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error)
      toast.error('Failed to save preferences')
    },
  })
}

/**
 * Reset preferences to defaults
 */
export function useResetNotificationPreferences() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!user?.id) {throw new Error('User not authenticated')}
      return notificationPreferencesApi.resetToDefaults(user.id)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(preferencesKeys.user(user?.id || ''), data)
      toast.success('Preferences reset to defaults')
    },
    onError: (error) => {
      console.error('Failed to reset preferences:', error)
      toast.error('Failed to reset preferences')
    },
  })
}

/**
 * Enable all email notifications
 */
export function useEnableAllEmailNotifications() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!user?.id) {throw new Error('User not authenticated')}
      return notificationPreferencesApi.enableAllEmail(user.id)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(preferencesKeys.user(user?.id || ''), data)
      toast.success('All email notifications enabled')
    },
    onError: (error) => {
      console.error('Failed to enable all notifications:', error)
      toast.error('Failed to enable notifications')
    },
  })
}

/**
 * Disable all email notifications
 */
export function useDisableAllEmailNotifications() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!user?.id) {throw new Error('User not authenticated')}
      return notificationPreferencesApi.disableAllEmail(user.id)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(preferencesKeys.user(user?.id || ''), data)
      toast.success('All email notifications disabled')
    },
    onError: (error) => {
      console.error('Failed to disable all notifications:', error)
      toast.error('Failed to disable notifications')
    },
  })
}

/**
 * Update quiet hours settings
 */
export function useUpdateQuietHours() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (quietHours: NotificationPreferences['quietHours']) => {
      if (!user?.id) {throw new Error('User not authenticated')}
      return notificationPreferencesApi.updateQuietHours(user.id, quietHours)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(preferencesKeys.user(user?.id || ''), data)
      toast.success('Quiet hours updated')
    },
    onError: (error) => {
      console.error('Failed to update quiet hours:', error)
      toast.error('Failed to update quiet hours')
    },
  })
}
