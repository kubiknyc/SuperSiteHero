/**
 * Notification Batching Service
 *
 * Handles batching similar notifications and creating digest summaries
 */

import { supabase } from '@/lib/supabase'
import type {
  EnhancedNotification,
  NotificationBatch,
  NotificationPreferences,
  NotificationType,
} from './types'

interface BatchGroup {
  key: string
  type: NotificationType
  projectId?: string
  notifications: EnhancedNotification[]
  count: number
}

interface DigestSummary {
  userId: string
  period: 'daily' | 'weekly'
  groups: BatchGroup[]
  totalCount: number
  unreadCount: number
  startDate: string
  endDate: string
}

export const batchingService = {
  /**
   * Group notifications by type and project for batching
   */
  groupNotifications(notifications: EnhancedNotification[]): BatchGroup[] {
    const groupMap = new Map<string, BatchGroup>()

    for (const notification of notifications) {
      const projectId = notification.metadata?.projectId
      const key = `${notification.type}:${projectId || 'no-project'}`

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          type: notification.type,
          projectId: projectId as string | undefined,
          notifications: [],
          count: 0,
        })
      }

      const group = groupMap.get(key)!
      group.notifications.push(notification)
      group.count++
    }

    return Array.from(groupMap.values())
  },

  /**
   * Create a batched notification from multiple similar notifications
   */
  createBatchedNotification(group: BatchGroup): EnhancedNotification {
    const firstNotification = group.notifications[0]
    const projectName = firstNotification.metadata?.projectName

    // Create a summary message
    let title: string
    let message: string

    if (group.count === 1) {
      return firstNotification
    }

    switch (group.type) {
      case 'rfi':
        title = `${group.count} new RFIs`
        message = projectName
          ? `You have ${group.count} new RFIs on ${projectName}`
          : `You have ${group.count} new RFIs across projects`
        break
      case 'submittal':
        title = `${group.count} new Submittals`
        message = projectName
          ? `${group.count} submittals require your attention on ${projectName}`
          : `${group.count} submittals require your attention`
        break
      case 'task':
        title = `${group.count} task updates`
        message = projectName
          ? `${group.count} tasks updated on ${projectName}`
          : `${group.count} tasks updated across projects`
        break
      case 'approval_request':
        title = `${group.count} items awaiting approval`
        message = `You have ${group.count} items waiting for your approval`
        break
      case 'mention':
        title = `${group.count} new mentions`
        message = `You were mentioned in ${group.count} conversations`
        break
      case 'comment':
        title = `${group.count} new comments`
        message = projectName
          ? `${group.count} new comments on ${projectName}`
          : `${group.count} new comments on your items`
        break
      default:
        title = `${group.count} notifications`
        message = `You have ${group.count} new notifications`
    }

    return {
      id: `batch-${group.key}-${Date.now()}`,
      type: group.type,
      priority: this.getHighestPriority(group.notifications),
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      recipientId: firstNotification.recipientId,
      channels: ['in_app'],
      metadata: {
        projectId: group.projectId,
        projectName: projectName as string | undefined,
        batchedIds: group.notifications.map(n => n.id),
        batchCount: group.count,
      },
      groupKey: group.key,
    }
  },

  /**
   * Get the highest priority from a group of notifications
   */
  getHighestPriority(
    notifications: EnhancedNotification[]
  ): EnhancedNotification['priority'] {
    const priorityOrder = ['urgent', 'high', 'normal', 'low'] as const
    for (const priority of priorityOrder) {
      if (notifications.some(n => n.priority === priority)) {
        return priority
      }
    }
    return 'normal'
  },

  /**
   * Create a digest summary for a user
   */
  async createDigestSummary(
    userId: string,
    period: 'daily' | 'weekly'
  ): Promise<DigestSummary | null> {
    const now = new Date()
    const startDate = new Date()

    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 1)
    } else {
      startDate.setDate(startDate.getDate() - 7)
    }

    // Fetch notifications for the period
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false })

    if (error || !notifications || notifications.length === 0) {
      return null
    }

    const enhancedNotifications: EnhancedNotification[] = notifications.map(n => ({
      id: n.id,
      type: n.type as NotificationType,
      priority: n.priority || 'normal',
      title: n.title,
      message: n.message || '',
      read: n.read,
      createdAt: n.created_at,
      recipientId: n.recipient_id,
      senderId: n.sender_id,
      channels: ['in_app'],
      metadata: n.metadata,
    }))

    const groups = this.groupNotifications(enhancedNotifications)
    const unreadCount = enhancedNotifications.filter(n => !n.read).length

    return {
      userId,
      period,
      groups,
      totalCount: notifications.length,
      unreadCount,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    }
  },

  /**
   * Generate digest email content
   */
  generateDigestEmailContent(summary: DigestSummary): {
    subject: string
    html: string
    text: string
  } {
    const periodLabel = summary.period === 'daily' ? 'Daily' : 'Weekly'

    const subject = `${periodLabel} Digest: ${summary.totalCount} notifications (${summary.unreadCount} unread)`

    // Generate HTML content
    const groupsHtml = summary.groups
      .map(group => {
        const batched = this.createBatchedNotification(group)
        return `
          <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">${batched.title}</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">${batched.message}</p>
          </div>
        `
      })
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Your ${periodLabel} Digest</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">
            ${summary.totalCount} notifications from the past ${summary.period === 'daily' ? '24 hours' : 'week'}
            ${summary.unreadCount > 0 ? ` (${summary.unreadCount} unread)` : ''}
          </p>
          ${groupsHtml}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <a href="${process.env.VITE_APP_URL || ''}/notifications"
               style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              View All Notifications
            </a>
          </div>
        </body>
      </html>
    `

    // Generate plain text content
    const groupsText = summary.groups
      .map(group => {
        const batched = this.createBatchedNotification(group)
        return `${batched.title}\n${batched.message}\n`
      })
      .join('\n')

    const text = `Your ${periodLabel} Digest

${summary.totalCount} notifications from the past ${summary.period === 'daily' ? '24 hours' : 'week'}${summary.unreadCount > 0 ? ` (${summary.unreadCount} unread)` : ''}

${groupsText}

View all notifications: ${process.env.VITE_APP_URL || ''}/notifications
`

    return { subject, html, text }
  },

  /**
   * Save a batch record
   */
  async saveBatch(batch: Omit<NotificationBatch, 'id'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('notification_batches')
      .insert({
        user_id: batch.userId,
        type: batch.type,
        notifications: batch.notifications,
        created_at: batch.createdAt,
        sent_at: batch.sentAt,
        status: batch.status,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to save notification batch:', error)
      return null
    }

    return data?.id
  },

  /**
   * Update batch status
   */
  async updateBatchStatus(
    batchId: string,
    status: NotificationBatch['status'],
    sentAt?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('notification_batches')
      .update({
        status,
        sent_at: sentAt || (status === 'sent' ? new Date().toISOString() : null),
      })
      .eq('id', batchId)

    if (error) {
      console.error('Failed to update batch status:', error)
      return false
    }

    return true
  },

  /**
   * Check if user should receive digest based on preferences
   */
  shouldSendDigest(
    preferences: NotificationPreferences,
    currentTime: Date = new Date()
  ): boolean {
    if (!preferences.enabled || preferences.digestMode === 'none' || preferences.digestMode === 'immediate') {
      return false
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled && preferences.quietHoursStart && preferences.quietHoursEnd) {
      const currentHour = currentTime.getHours()
      const currentMinute = currentTime.getMinutes()
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

      if (currentTimeStr >= preferences.quietHoursStart || currentTimeStr < preferences.quietHoursEnd) {
        return false
      }
    }

    // Check digest time
    if (preferences.digestTime) {
      const [digestHour, digestMinute] = preferences.digestTime.split(':').map(Number)
      const currentHour = currentTime.getHours()
      const currentMinute = currentTime.getMinutes()

      // Allow 5-minute window for digest sending
      if (currentHour !== digestHour || Math.abs(currentMinute - digestMinute) > 5) {
        return false
      }
    }

    // Check day for weekly digest
    if (preferences.digestMode === 'weekly' && preferences.digestDay !== undefined) {
      if (currentTime.getDay() !== preferences.digestDay) {
        return false
      }
    }

    return true
  },
}

export default batchingService
