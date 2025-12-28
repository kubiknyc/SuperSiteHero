/**
 * React Query hooks for notifications
 * Milestone 4.3: Real-time Notifications
 *
 * Provides hooks for:
 * - Fetching user notifications
 * - Getting unread count
 * - Marking as read
 * - Managing notification preferences
 * - Real-time subscription for new notifications
 */

import { useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type Notification, type NotificationFilters, type CreateNotificationDTO } from '@/lib/api/services/notifications'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { pushService } from '@/lib/notifications/pushService'

// ============================================================================
// Query Keys
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch notifications for the current user
 */
export function useNotifications(filters: Omit<NotificationFilters, 'user_id'> = {}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: notificationKeys.list({ ...filters, user_id: user?.id }),
    queryFn: () => notificationsApi.getNotifications({ ...filters, user_id: user?.id }),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  })
}

/**
 * Fetch unread notifications only
 */
export function useUnreadNotifications() {
  return useNotifications({ is_read: false, limit: 20 })
}

/**
 * Fetch unread notification count
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: notificationKeys.unreadCount(user?.id || ''),
    queryFn: () => notificationsApi.getUnreadCount(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  })
}

/**
 * Fetch a single notification
 */
export function useNotification(id: string) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationsApi.getNotification(id),
    enabled: !!id,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Mark a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (error) => {
      logger.error('Failed to mark notification as read:', error)
    },
  })
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!user?.id) {throw new Error('User not authenticated')}
      return notificationsApi.markAllAsRead(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      toast.success('All notifications marked as read')
    },
    onError: (error) => {
      logger.error('Failed to mark all notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    },
  })
}

/**
 * Delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (error) => {
      logger.error('Failed to delete notification:', error)
      toast.error('Failed to delete notification')
    },
  })
}

/**
 * Delete all notifications
 */
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => {
      if (!user?.id) {throw new Error('User not authenticated')}
      return notificationsApi.deleteAllNotifications(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      toast.success('All notifications cleared')
    },
    onError: (error) => {
      logger.error('Failed to delete all notifications:', error)
      toast.error('Failed to clear notifications')
    },
  })
}

/**
 * Create a notification (for testing or admin use)
 */
export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notification: CreateNotificationDTO) => notificationsApi.createNotification(notification),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (error) => {
      logger.error('Failed to create notification:', error)
    },
  })
}

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  id: string
  user_id: string
  // Notification types
  punch_item_assigned: boolean
  punch_item_status_changed: boolean
  rfi_response: boolean
  rfi_assigned: boolean
  document_approved: boolean
  document_rejected: boolean
  payment_updated: boolean
  task_assigned: boolean
  task_due_reminder: boolean
  bid_invited: boolean
  bid_status_changed: boolean
  compliance_expiring: boolean
  daily_report_submitted: boolean
  // Delivery settings
  push_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  // Push tokens
  fcm_token: string | null
  apns_token: string | null
  // Preferences
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  digest_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
}

type NotificationPreferencesUpdate = Partial<
  Omit<NotificationPreferences, 'id' | 'user_id'>
>

/**
 * Fetch notification preferences for current user
 */
export function useNotificationPreferences() {
  const { user } = useAuth()

  return useQuery<NotificationPreferences | null>({
    queryKey: [...notificationKeys.all, 'preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // If no preferences exist, return null (use defaults)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as NotificationPreferences
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (updates: NotificationPreferencesUpdate) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Upsert preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Handle push notification subscription
      if (updates.push_enabled === true) {
        try {
          await pushService.subscribe(user.id)
        } catch (pushError) {
          logger.warn('Failed to enable push notifications:', pushError)
          toast.warning('Push notifications could not be enabled')
        }
      } else if (updates.push_enabled === false) {
        try {
          await pushService.unsubscribe(user.id)
        } catch (pushError) {
          logger.warn('Failed to disable push notifications:', pushError)
        }
      }

      return data as NotificationPreferences
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...notificationKeys.all, 'preferences'] })
      toast.success('Notification preferences updated')
    },
    onError: (error) => {
      logger.error('Failed to update notification preferences:', error)
      toast.error('Failed to update preferences')
    },
  })
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to real-time notification updates
 */
export function useNotificationSubscription(
  onNewNotification?: (notification: Notification) => void
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!user?.id) {
      return
    }

    // Create real-time subscription
    const newChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification

          // Call callback if provided
          onNewNotification?.(notification)

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: notificationKeys.all })

          // Dispatch custom event for NotificationCenter
          window.dispatchEvent(new CustomEvent('newNotification', {
            detail: notification,
          }))

          // Show in-app toast for high priority
          if (notification.priority === 'high') {
            toast.info(notification.title, {
              description: notification.message,
            })
          }

          // Show browser notification if hidden
          if (Notification.permission === 'granted' && document.hidden) {
            try {
              const browserNotif = new window.Notification(notification.title, {
                body: notification.message,
                icon: '/icons/icon-192x192.png',
                tag: notification.id,
                data: { link: notification.link },
              })

              browserNotif.onclick = () => {
                window.focus()
                if (notification.link) {
                  window.location.href = notification.link
                }
              }
            } catch (_err) {
              // Browser notifications not supported or blocked
            }
          }
        }
      )
      .subscribe()

    setTimeout(() => {
      setTimeout(() => {
        setChannel(newChannel)
      }, 0)
    }, 0)

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel)
      }
    }
  }, [user?.id, queryClient, onNewNotification])

  return channel
}

/**
 * Request browser notification permission
 */
export function useRequestNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (error) {
      logger.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }, [])

  return {
    permission,
    requestPermission,
    isSupported: typeof Notification !== 'undefined',
  }
}

// ============================================================================
// Combined Manager Hook
// ============================================================================

/**
 * Combined hook for managing all notification functionality
 */
export function useNotificationsManager(filters: Omit<NotificationFilters, 'user_id'> = {}) {
  const notificationsQuery = useNotifications(filters)
  const unreadCountQuery = useUnreadNotificationCount()
  const preferencesQuery = useNotificationPreferences()
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()
  const deleteNotificationMutation = useDeleteNotification()
  const deleteAllMutation = useDeleteAllNotifications()
  const updatePreferencesMutation = useUpdateNotificationPreferences()

  // Set up real-time subscription
  const handleNewNotification = useCallback((notification: Notification) => {
    logger.info('[NotificationsManager] New notification:', notification.title)
  }, [])

  useNotificationSubscription(handleNewNotification)

  return {
    // Data
    notifications: notificationsQuery.data || [],
    unreadCount: unreadCountQuery.data || 0,
    preferences: preferencesQuery.data,

    // Loading states
    isLoading: notificationsQuery.isLoading,
    isLoadingPreferences: preferencesQuery.isLoading,

    // Error states
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,

    // Refetch
    refetch: notificationsQuery.refetch,

    // Actions
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    deleteNotification: deleteNotificationMutation.mutateAsync,
    deleteAll: deleteAllMutation.mutateAsync,
    updatePreferences: updatePreferencesMutation.mutateAsync,

    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isDeletingAll: deleteAllMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
  }
}
