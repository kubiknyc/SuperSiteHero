/**
 * React Query hooks for notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type Notification, type NotificationFilters, type CreateNotificationDTO } from '@/lib/api/services/notifications'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

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
      console.error('Failed to mark notification as read:', error)
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
      if (!user?.id) throw new Error('User not authenticated')
      return notificationsApi.markAllAsRead(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      toast.success('All notifications marked as read')
    },
    onError: (error) => {
      console.error('Failed to mark all notifications as read:', error)
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
      console.error('Failed to delete notification:', error)
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
      if (!user?.id) throw new Error('User not authenticated')
      return notificationsApi.deleteAllNotifications(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      toast.success('All notifications cleared')
    },
    onError: (error) => {
      console.error('Failed to delete all notifications:', error)
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
      console.error('Failed to create notification:', error)
    },
  })
}
