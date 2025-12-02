/**
 * Notifications API Service
 *
 * CRUD operations for in-app notifications stored in the database.
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string
  user_id: string
  type: string | null  // Allow null to match database schema
  title: string
  message: string | null  // Allow null to match database schema
  is_read: boolean | null  // Allow null to match database schema
  read_at: string | null
  related_to_id: string | null
  related_to_type: string | null
  created_at: string | null  // Allow null to match database schema
  updated_at: string | null  // Allow null to match database schema
  deleted_at: string | null
}

export interface CreateNotificationDTO {
  user_id: string
  type: string
  title: string
  message: string
  related_to_id?: string
  related_to_type?: string
}

export interface NotificationFilters {
  user_id?: string
  is_read?: boolean
  type?: string | string[]
  limit?: number
  offset?: number
}

// ============================================================================
// API Functions
// ============================================================================

export const notificationsApi = {
  /**
   * Get notifications with optional filters
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read)
    }

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.in('type', filters.type)
      } else {
        query = query.eq('type', filters.type)
      }
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[NotificationsApi] Failed to fetch notifications:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get a single notification by ID
   */
  async getNotification(id: string): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw error
    }

    return data
  },

  /**
   * Create a new notification
   */
  async createNotification(notification: CreateNotificationDTO): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      logger.error('[NotificationsApi] Failed to create notification:', error)
      throw error
    }

    return data
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      logger.error('[NotificationsApi] Failed to mark as read:', error)
      throw error
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      logger.error('[NotificationsApi] Failed to mark all as read:', error)
      throw error
    }
  },

  /**
   * Delete (soft delete) a notification
   */
  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('[NotificationsApi] Failed to delete notification:', error)
      throw error
    }
  },

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('deleted_at', null)

    if (error) {
      logger.error('[NotificationsApi] Failed to delete all notifications:', error)
      throw error
    }
  },

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .is('deleted_at', null)

    if (error) {
      logger.error('[NotificationsApi] Failed to get unread count:', error)
      throw error
    }

    return count || 0
  },
}

export default notificationsApi
