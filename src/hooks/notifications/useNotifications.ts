/**
 * useNotifications Hook
 *
 * Comprehensive hook for managing notifications with support for:
 * - Real-time updates via Supabase subscription
 * - Batching and grouping
 * - Mark as read / mark all as read
 * - Dismiss / snooze notifications
 * - Filter and search
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'
import { useNotificationBatching, type BatchedNotification } from './useNotificationBatching'
import { useNotificationGroups, type GroupByType, type NotificationGroup } from './useNotificationGroups'

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
  snoozed_until: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  related_to_id: string | null
  related_to_type: string | null
  project_id: string | null
  project_name: string | null
  sender_id: string | null
  sender_name: string | null
  sender_avatar_url: string | null
  link: string | null
  metadata: Record<string, unknown> | null
}

export interface NotificationFilters {
  isRead?: boolean
  type?: string
  priority?: string
  projectId?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  byPriority: Record<string, number>
}

// ============================================================================
// Hook
// ============================================================================

export function useNotifications(options?: {
  filters?: NotificationFilters
  groupBy?: GroupByType
  limit?: number
  enableRealtime?: boolean
  enableBatching?: boolean
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const limit = options?.limit || 50
  const enableRealtime = options?.enableRealtime ?? true
  const enableBatching = options?.enableBatching ?? false

  // Batching hook
  const batching = useNotificationBatching({
    onBatchReady: (batch) => {
      // Handle batched notifications (e.g., show toast)
      logger.info('[useNotifications] Batch ready:', batch.id, batch.count)
    },
  })

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', user?.id, options?.filters, limit],
    queryFn: async () => {
      if (!user?.id) {return []}

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .or(`snoozed_until.is.null,snoozed_until.lt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Apply filters
      if (options?.filters?.isRead !== undefined) {
        query = query.eq('is_read', options.filters.isRead)
      }
      if (options?.filters?.type) {
        query = query.eq('type', options.filters.type)
      }
      if (options?.filters?.priority) {
        query = query.eq('priority', options.filters.priority)
      }
      if (options?.filters?.projectId) {
        query = query.eq('project_id', options.filters.projectId)
      }
      if (options?.filters?.dateFrom) {
        query = query.gte('created_at', options.filters.dateFrom.toISOString())
      }
      if (options?.filters?.dateTo) {
        query = query.lte('created_at', options.filters.dateTo.toISOString())
      }
      if (options?.filters?.search) {
        query = query.or(`title.ilike.%${options.filters.search}%,message.ilike.%${options.filters.search}%`)
      }

      const { data, error } = await query

      if (error) {
        logger.error('[useNotifications] Failed to fetch:', error)
        throw error
      }

      return (data as Notification[]) || []
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  // Transform notifications for grouping
  const groupableNotifications = useMemo(() =>
    notifications.map(n => ({
      id: n.id,
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      created_at: n.created_at,
      priority: n.priority,
      project_id: n.project_id,
      project_name: n.project_name,
      category: n.type?.split('_')[0],
    })),
    [notifications]
  )

  // Group notifications
  const { groups } = useNotificationGroups(groupableNotifications, options?.groupBy || 'time')

  // Calculate stats
  const stats = useMemo<NotificationStats>(() => {
    const byType: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    let unread = 0

    notifications.forEach(n => {
      // By type
      const type = n.type || 'unknown'
      byType[type] = (byType[type] || 0) + 1

      // By priority
      const priority = n.priority || 'normal'
      byPriority[priority] = (byPriority[priority] || 0) + 1

      // Unread
      if (!n.is_read) {unread++}
    })

    return {
      total: notifications.length,
      unread,
      byType,
      byPriority,
    }
  }, [notifications])

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      logger.error('[useNotifications] Failed to mark as read:', error)
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      let query = supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id)
        .eq('is_read', false)

      if (notificationIds?.length) {
        query = query.in('id', notificationIds)
      }

      const { error } = await query

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      logger.error('[useNotifications] Failed to mark all as read:', error)
    },
  })

  // Snooze notification mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ notificationId, minutes }: { notificationId: string; minutes: number }) => {
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('notifications')
        .update({ snoozed_until: snoozeUntil })
        .eq('id', notificationId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      logger.error('[useNotifications] Failed to snooze:', error)
    },
  })

  // Dismiss (soft delete) mutation
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({
          deleted_at: new Date().toISOString(),
          is_read: true,
        })
        .eq('id', notificationId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      logger.error('[useNotifications] Failed to dismiss:', error)
    },
  })

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user?.id)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      logger.error('[useNotifications] Failed to clear all:', error)
    },
  })

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || !enableRealtime) {return}

    const channel = supabase
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
          logger.info('[useNotifications] New notification:', payload.new)

          const notification = payload.new as Notification

          // Add to batch if batching is enabled
          if (enableBatching) {
            batching.addToBatch({
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              is_read: notification.is_read,
              created_at: notification.created_at,
              priority: notification.priority,
              project_id: notification.project_id,
              project_name: notification.project_name,
              sender_id: notification.sender_id,
              sender_name: notification.sender_name,
            })
          }

          // Invalidate query to refresh list
          queryClient.invalidateQueries({ queryKey: ['notifications'] })

          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, enableRealtime, enableBatching, batching, queryClient])

  // Callback handlers
  const markAsRead = useCallback((id: string) => {
    markAsReadMutation.mutate(id)
  }, [markAsReadMutation])

  const markAllAsRead = useCallback((ids?: string[]) => {
    markAllAsReadMutation.mutate(ids)
  }, [markAllAsReadMutation])

  const snooze = useCallback((id: string, minutes: number) => {
    snoozeMutation.mutate({ notificationId: id, minutes })
  }, [snoozeMutation])

  const dismiss = useCallback((id: string) => {
    dismissMutation.mutate(id)
  }, [dismissMutation])

  const clearAll = useCallback(() => {
    clearAllMutation.mutate()
  }, [clearAllMutation])

  return useMemo(() => ({
    // Data
    notifications,
    groups,
    stats,
    batching,

    // State
    isLoading,
    error,
    isMarkingRead: markAsReadMutation.isPending,
    isSnoozing: snoozeMutation.isPending,
    isDismissing: dismissMutation.isPending,

    // Actions
    markAsRead,
    markAllAsRead,
    snooze,
    dismiss,
    clearAll,
    refetch,

    // Helpers
    getNotification: (id: string) => notifications.find(n => n.id === id),
    hasUnread: stats.unread > 0,
    unreadCount: stats.unread,
  }), [
    notifications,
    groups,
    stats,
    batching,
    isLoading,
    error,
    markAsReadMutation.isPending,
    snoozeMutation.isPending,
    dismissMutation.isPending,
    markAsRead,
    markAllAsRead,
    snooze,
    dismiss,
    clearAll,
    refetch,
  ])
}

export default useNotifications
