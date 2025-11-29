/**
 * Notification Service
 *
 * Unified notification service that handles:
 * - In-app notifications (stored in database)
 * - Email notifications (via email service)
 * - Integration with approval workflows and safety incidents
 */

import { supabase } from '@/lib/supabase'
import { sendEmail, type EmailRecipient } from '@/lib/email/email-service'
import {
  generateApprovalRequestEmail,
  generateApprovalCompletedEmail,
  generateIncidentNotificationEmail,
  generateNoticeResponseReminderEmail,
  generateNoticeOverdueEmail,
  type ApprovalRequestEmailData,
  type ApprovalCompletedEmailData,
  type IncidentNotificationEmailData,
  type NoticeResponseReminderEmailData,
  type NoticeOverdueEmailData,
} from '@/lib/email/templates'

// ============================================================================
// Types
// ============================================================================

export interface NotificationRecipient {
  userId: string
  email: string
  name?: string
}

export interface NotificationOptions {
  sendEmail?: boolean
  sendInApp?: boolean
}

const DEFAULT_OPTIONS: NotificationOptions = {
  sendEmail: true,
  sendInApp: true,
}

// ============================================================================
// Notification Service
// ============================================================================

export const notificationService = {
  /**
   * Send approval request notification
   */
  async notifyApprovalRequest(
    recipients: NotificationRecipient[],
    data: Omit<ApprovalRequestEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'

    for (const recipient of recipients) {
      const emailData: ApprovalRequestEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        approvalUrl: data.approvalUrl || `${appUrl}/approvals`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateApprovalRequestEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `Approval Requested: ${data.entityName}`,
            html,
            text,
            tags: ['approval', 'request', data.entityType],
          })
        } catch (error) {
          console.error('[NotificationService] Email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'approval_request',
            title: 'Approval Request',
            message: `You have a new ${data.entityType.replace('_', ' ')} pending approval: ${data.entityName}`,
            link: data.approvalUrl,
            metadata: {
              entityType: data.entityType,
              entityName: data.entityName,
              projectName: data.projectName,
            },
          })
        } catch (error) {
          console.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send approval completed notification
   */
  async notifyApprovalCompleted(
    recipient: NotificationRecipient,
    data: Omit<ApprovalCompletedEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const emailData: ApprovalCompletedEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
    }

    const statusLabels = {
      approved: 'Approved',
      approved_with_conditions: 'Approved with Conditions',
      rejected: 'Rejected',
    }

    // Send email notification
    if (options.sendEmail) {
      try {
        const { html, text } = generateApprovalCompletedEmail(emailData)
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: `${data.entityType.replace('_', ' ')} ${statusLabels[data.status]}: ${data.entityName}`,
          html,
          text,
          tags: ['approval', 'completed', data.status, data.entityType],
        })
      } catch (error) {
        console.error('[NotificationService] Email failed:', error)
      }
    }

    // Create in-app notification
    if (options.sendInApp) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'approval_completed',
          title: `${data.entityType.replace('_', ' ')} ${statusLabels[data.status]}`,
          message: `Your ${data.entityType.replace('_', ' ')} "${data.entityName}" has been ${data.status.replace('_', ' ')}.`,
          link: data.viewUrl,
          metadata: {
            entityType: data.entityType,
            entityName: data.entityName,
            status: data.status,
            actionBy: data.actionBy,
          },
        })
      } catch (error) {
        console.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send safety incident notification
   */
  async notifyIncident(
    recipients: NotificationRecipient[],
    data: Omit<IncidentNotificationEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const isSeriousIncident = ['medical_treatment', 'lost_time', 'fatality'].includes(data.severity)

    for (const recipient of recipients) {
      const emailData: IncidentNotificationEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
      }

      // Send email notification (always for serious incidents)
      if (options.sendEmail || isSeriousIncident) {
        try {
          const { html, text } = generateIncidentNotificationEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `Safety Alert: ${data.severity.replace('_', ' ').toUpperCase()} Incident - ${data.incidentNumber}`,
            html,
            text,
            tags: ['safety', 'incident', data.severity],
          })
        } catch (error) {
          console.error('[NotificationService] Incident email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'incident_reported',
            title: 'Safety Incident Reported',
            message: `${data.severity.replace('_', ' ')} incident reported at ${data.projectName}: ${data.description.substring(0, 100)}...`,
            link: data.viewUrl,
            priority: isSeriousIncident ? 'high' : 'normal',
            metadata: {
              incidentNumber: data.incidentNumber,
              severity: data.severity,
              projectName: data.projectName,
            },
          })
        } catch (error) {
          console.error('[NotificationService] In-app notification failed:', error)
        }
      }

      // Track notification in safety_incident_notifications table
      // Note: This table may need to be created via migration
      try {
        await (supabase.from as any)('safety_incident_notifications').insert({
          incident_id: data.incidentNumber,
          user_id: recipient.userId,
          notification_type: options.sendEmail ? 'email' : 'in_app',
          subject: `Safety Alert: ${data.severity.replace('_', ' ')} Incident`,
          message: data.description.substring(0, 200),
          delivery_status: 'sent',
        })
      } catch (error) {
        // Non-critical, log and continue - table may not exist
        console.error('[NotificationService] Failed to track notification:', error)
      }
    }
  },

  /**
   * Send notice response due reminder notification
   * Called for 7-day, 3-day, and 1-day reminders
   */
  async notifyNoticeResponseDue(
    recipients: NotificationRecipient[],
    data: Omit<NoticeResponseReminderEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'

    for (const recipient of recipients) {
      const emailData: NoticeResponseReminderEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/notices`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateNoticeResponseReminderEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `Notice Response Due in ${data.daysUntilDue} Day${data.daysUntilDue !== 1 ? 's' : ''}: ${data.noticeReference}`,
            html,
            text,
            tags: ['notice', 'reminder', `${data.daysUntilDue}-day`],
          })
        } catch (error) {
          console.error('[NotificationService] Notice reminder email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'notice_response_due',
            title: 'Notice Response Reminder',
            message: `Response due in ${data.daysUntilDue} day${data.daysUntilDue !== 1 ? 's' : ''} for notice: ${data.noticeReference}`,
            link: data.viewUrl,
            priority: data.daysUntilDue <= 1 ? 'high' : data.daysUntilDue <= 3 ? 'normal' : 'low',
            metadata: {
              noticeReference: data.noticeReference,
              noticeSubject: data.noticeSubject,
              projectName: data.projectName,
              daysUntilDue: data.daysUntilDue,
              isCritical: data.isCritical,
            },
          })
        } catch (error) {
          console.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send notice overdue notification
   * Called daily for notices with overdue responses
   */
  async notifyNoticeOverdue(
    recipients: NotificationRecipient[],
    data: Omit<NoticeOverdueEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'

    for (const recipient of recipients) {
      const emailData: NoticeOverdueEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/notices`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateNoticeOverdueEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `OVERDUE: Notice Response Required - ${data.noticeReference}`,
            html,
            text,
            tags: ['notice', 'overdue', data.isCritical ? 'critical' : 'standard'],
          })
        } catch (error) {
          console.error('[NotificationService] Notice overdue email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'notice_overdue',
            title: 'Notice Response Overdue',
            message: `Response is ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue for notice: ${data.noticeReference}`,
            link: data.viewUrl,
            priority: 'high',
            metadata: {
              noticeReference: data.noticeReference,
              noticeSubject: data.noticeSubject,
              projectName: data.projectName,
              daysOverdue: data.daysOverdue,
              isCritical: data.isCritical,
            },
          })
        } catch (error) {
          console.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Create an in-app notification (stored in database)
   */
  async _createInAppNotification(data: {
    userId: string
    type: string
    title: string
    message: string
    link?: string
    priority?: 'low' | 'normal' | 'high'
    metadata?: Record<string, any>
  }): Promise<void> {
    try {
      // Insert into notifications table
      const { error } = await supabase.from('notifications').insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        related_to_id: data.metadata?.entityId || null,
        related_to_type: data.metadata?.entityType || null,
        is_read: false,
      })

      if (error) {
        console.error('[NotificationService] Failed to insert notification:', error)
        // Fallback to localStorage for backwards compatibility
        this._createLocalNotification(data)
        return
      }

      // Dispatch event for real-time UI updates
      window.dispatchEvent(new CustomEvent('newNotification', { detail: data }))
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error)
      // Fallback to localStorage
      this._createLocalNotification(data)
    }
  },

  /**
   * Fallback: Create notification in localStorage (for offline/error scenarios)
   */
  _createLocalNotification(data: {
    userId: string
    type: string
    title: string
    message: string
    link?: string
    priority?: 'low' | 'normal' | 'high'
    metadata?: Record<string, any>
  }): void {
    try {
      const notifications = JSON.parse(localStorage.getItem('inAppNotifications') || '[]')
      notifications.unshift({
        id: `notif-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        read: false,
      })

      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(50)
      }

      localStorage.setItem('inAppNotifications', JSON.stringify(notifications))
    } catch {
      // Ignore localStorage errors
    }
  },

  /**
   * Get in-app notifications for current user from database
   */
  async getInAppNotifications(userId?: string): Promise<any[]> {
    try {
      // Try database first
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        console.error('[NotificationService] Database query failed:', error)
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem('inAppNotifications') || '[]')
      }

      // Transform database format to expected format
      return (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.related_to_id ? `/${n.related_to_type}s/${n.related_to_id}` : undefined,
        createdAt: n.created_at,
        read: n.is_read,
        readAt: n.read_at,
      }))
    } catch {
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('inAppNotifications') || '[]')
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      if (error) {
        console.error('[NotificationService] Failed to mark as read:', error)
        // Fallback to localStorage
        this._markLocalNotificationAsRead(notificationId)
      }
    } catch {
      this._markLocalNotificationAsRead(notificationId)
    }
  },

  /**
   * Fallback: Mark localStorage notification as read
   */
  _markLocalNotificationAsRead(notificationId: string): void {
    try {
      const notifications = JSON.parse(localStorage.getItem('inAppNotifications') || '[]')
      const updated = notifications.map((n: any) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
      localStorage.setItem('inAppNotifications', JSON.stringify(updated))
    } catch {
      // Ignore errors
    }
  },

  /**
   * Clear all notifications for current user
   */
  async clearAll(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Soft delete in database
        await supabase
          .from('notifications')
          .update({ deleted_at: new Date().toISOString() })
          .eq('user_id', userId)
      }
    } catch (error) {
      console.error('[NotificationService] Failed to clear notifications:', error)
    }

    // Also clear localStorage fallback
    localStorage.removeItem('inAppNotifications')
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId?: string): Promise<number> {
    try {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .is('deleted_at', null)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { count, error } = await query

      if (error) {
        console.error('[NotificationService] Failed to get unread count:', error)
        // Fallback to localStorage
        const notifications = JSON.parse(localStorage.getItem('inAppNotifications') || '[]')
        return notifications.filter((n: any) => !n.read).length
      }

      return count || 0
    } catch {
      const notifications = JSON.parse(localStorage.getItem('inAppNotifications') || '[]')
      return notifications.filter((n: any) => !n.read).length
    }
  },
}

// Export convenience functions
export async function sendApprovalRequestNotification(
  recipients: NotificationRecipient[],
  data: Omit<ApprovalRequestEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyApprovalRequest(recipients, data, options)
}

export async function sendApprovalCompletedNotification(
  recipient: NotificationRecipient,
  data: Omit<ApprovalCompletedEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyApprovalCompleted(recipient, data, options)
}

export async function sendIncidentNotification(
  recipients: NotificationRecipient[],
  data: Omit<IncidentNotificationEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyIncident(recipients, data, options)
}

/**
 * Send a generic notification to a user
 * Convenience function for creating in-app notifications
 */
export async function sendNotification(data: {
  user_id: string
  type: string
  title: string
  message: string
  link?: string
  data?: Record<string, any>
}): Promise<void> {
  return notificationService._createInAppNotification({
    userId: data.user_id,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    metadata: data.data,
  })
}

/**
 * Send notice response due reminder notification
 * Used for 7-day, 3-day, and 1-day reminders
 */
export async function sendNoticeResponseDueNotification(
  recipients: NotificationRecipient[],
  data: Omit<NoticeResponseReminderEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyNoticeResponseDue(recipients, data, options)
}

/**
 * Send notice overdue notification
 * Used for daily overdue reminders
 */
export async function sendNoticeOverdueNotification(
  recipients: NotificationRecipient[],
  data: Omit<NoticeOverdueEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyNoticeOverdue(recipients, data, options)
}
