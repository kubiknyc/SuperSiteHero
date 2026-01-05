/**
 * Notification Service
 *
 * Unified notification service that handles:
 * - In-app notifications (stored in database)
 * - Email notifications (via email service)
 * - Integration with approval workflows and safety incidents
 */

import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import { showPushNotification, isPushSupported, type PushNotificationPayload } from './pushService'
import {
  generateApprovalRequestEmail,
  generateApprovalCompletedEmail,
  generateIncidentNotificationEmail,
  generateNoticeResponseReminderEmail,
  generateNoticeOverdueEmail,
  generateTaskAssignedEmail,
  generateRfiAssignedEmail,
  generateChangeOrderStatusEmail,
  generateBidSubmittedEmail,
  generatePortalInvitationEmail,
  generateChecklistFailedItemsEmail,
  generatePunchItemAssignedEmail,
  generateRFIAgingAlertEmail,
  generateRFIOverdueEmail,
  generateRFIAgingSummaryEmail,
  type ApprovalRequestEmailData,
  type ApprovalCompletedEmailData,
  type IncidentNotificationEmailData,
  type NoticeResponseReminderEmailData,
  type NoticeOverdueEmailData,
  type TaskAssignedEmailData,
  type RfiAssignedEmailData,
  type ChangeOrderStatusEmailData,
  type BidSubmittedEmailData,
  type PortalInvitationEmailData,
  type ChecklistFailedItemsEmailData,
  type PunchItemAssignedEmailData,
  type RFIAgingAlertEmailData,
  type RFIOverdueAlertEmailData,
  type RFIAgingSummaryEmailData,
  generateSubmittalReminderEmail,
  generateSubmittalReviewReminderEmail,
  generateSubmittalAgingSummaryEmail,
  generateSubmittalStatusEmail,
  generateCommentMentionEmail,
  generateDailyReportMissingEmail,
  generateDailyReportSummaryEmail,
  generateChangeOrderAgingAlertEmail,
  generateChangeOrderBudgetAlertEmail,
  generateChangeOrderAgingSummaryEmail,
  generateDrawingRevisionEmail,
  generateDrawingSetRevisionEmail,
  generateSupersededDrawingsEmail,
  type SubmittalReminderEmailData,
  type SubmittalReviewReminderEmailData,
  type SubmittalAgingSummaryEmailData,
  type SubmittalStatusEmailData,
  type CommentMentionEmailData,
  type DailyReportMissingEmailData,
  type DailyReportSummaryEmailData,
  type ChangeOrderAgingAlertEmailData,
  type ChangeOrderBudgetAlertEmailData,
  type ChangeOrderAgingSummaryEmailData,
  type DrawingRevisionEmailData,
  type DrawingSetRevisionEmailData,
  type DrawingSupersededEmailData,
} from '@/lib/email/templates'
import {
  type NotificationPreferences,
  shouldSendEmail,
  mergeWithDefaults,
} from '@/types/notification-preferences'
import { logger } from '@/lib/utils/logger'

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
  sendPush?: boolean
}

const DEFAULT_OPTIONS: NotificationOptions = {
  sendEmail: true,
  sendInApp: true,
  sendPush: true, // Enable push by default
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
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

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
          logger.error('[NotificationService] Email failed:', error)
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
          logger.error('[NotificationService] In-app notification failed:', error)
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
        logger.error('[NotificationService] Email failed:', error)
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
        logger.error('[NotificationService] In-app notification failed:', error)
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
          logger.error('[NotificationService] Incident email failed:', error)
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
          logger.error('[NotificationService] In-app notification failed:', error)
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
        logger.error('[NotificationService] Failed to track notification:', error)
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
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

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
          logger.error('[NotificationService] Notice reminder email failed:', error)
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
          logger.error('[NotificationService] In-app notification failed:', error)
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
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

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
          logger.error('[NotificationService] Notice overdue email failed:', error)
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
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Get user's notification preferences
   */
  async _getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', userId)
        .single()

      if (error || !data) {
        return mergeWithDefaults(null)
      }

      return mergeWithDefaults(data.notification_preferences as Partial<NotificationPreferences>)
    } catch {
      return mergeWithDefaults(null)
    }
  },

  /**
   * Send task assigned notification
   */
  async notifyTaskAssigned(
    recipient: NotificationRecipient,
    data: Omit<TaskAssignedEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    // Check user preferences
    const preferences = await this._getUserPreferences(recipient.userId)
    const shouldEmail = options.sendEmail && shouldSendEmail(preferences, 'taskAssigned')

    const emailData: TaskAssignedEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewUrl: data.viewUrl || `${appUrl}/tasks`,
    }

    // Send email notification
    if (shouldEmail) {
      try {
        const { html, text } = generateTaskAssignedEmail(emailData)
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: `Task Assigned: ${data.taskTitle}`,
          html,
          text,
          tags: ['task', 'assigned'],
        })
      } catch (error) {
        logger.error('[NotificationService] Task email failed:', error)
      }
    }

    // Create in-app notification
    if (options.sendInApp) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'task_assigned',
          title: 'New Task Assignment',
          message: `You have been assigned to task: ${data.taskTitle}`,
          link: data.viewUrl,
          metadata: {
            taskTitle: data.taskTitle,
            projectName: data.projectName,
            assignedBy: data.assignedBy,
            dueDate: data.dueDate,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send RFI assigned notification
   */
  async notifyRfiAssigned(
    recipient: NotificationRecipient,
    data: Omit<RfiAssignedEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    // Check user preferences
    const preferences = await this._getUserPreferences(recipient.userId)
    const shouldEmail = options.sendEmail && shouldSendEmail(preferences, 'rfiAssigned')

    const emailData: RfiAssignedEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewUrl: data.viewUrl || `${appUrl}/rfis`,
    }

    // Send email notification
    if (shouldEmail) {
      try {
        const { html, text } = generateRfiAssignedEmail(emailData)
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: `RFI Assigned: ${data.rfiNumber} - ${data.subject}`,
          html,
          text,
          tags: ['rfi', 'assigned'],
        })
      } catch (error) {
        logger.error('[NotificationService] RFI email failed:', error)
      }
    }

    // Create in-app notification
    if (options.sendInApp) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'rfi_assigned',
          title: 'RFI Assignment',
          message: `You have been assigned to RFI ${data.rfiNumber}: ${data.subject}`,
          link: data.viewUrl,
          metadata: {
            rfiNumber: data.rfiNumber,
            subject: data.subject,
            projectName: data.projectName,
            assignedBy: data.assignedBy,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send change order status notification
   */
  async notifyChangeOrderStatus(
    recipients: NotificationRecipient[],
    data: Omit<ChangeOrderStatusEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      // Check user preferences (we don't have a specific CO preference, so we'll always send for now)
      const emailData: ChangeOrderStatusEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/change-orders`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateChangeOrderStatusEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `Change Order ${data.changeOrderNumber} - ${data.newStatus.replace(/_/g, ' ').toUpperCase()}`,
            html,
            text,
            tags: ['change-order', 'status', data.newStatus],
          })
        } catch (error) {
          logger.error('[NotificationService] Change order email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'change_order_status',
            title: 'Change Order Updated',
            message: `Change Order ${data.changeOrderNumber} status changed to ${data.newStatus.replace(/_/g, ' ')}`,
            link: data.viewUrl,
            metadata: {
              changeOrderNumber: data.changeOrderNumber,
              title: data.title,
              projectName: data.projectName,
              previousStatus: data.previousStatus,
              newStatus: data.newStatus,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send bid submitted notification to GC/PM
   */
  async notifyBidSubmitted(
    recipients: NotificationRecipient[],
    data: Omit<BidSubmittedEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      const emailData: BidSubmittedEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/change-orders`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateBidSubmittedEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `Bid Submitted: ${data.changeOrderNumber} - ${data.subcontractorName}`,
            html,
            text,
            tags: ['bid', 'submitted', 'change-order'],
          })
        } catch (error) {
          logger.error('[NotificationService] Bid submitted email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'bid_submitted',
            title: 'Bid Submitted',
            message: `${data.subcontractorName} submitted a bid of ${data.bidAmount} for ${data.changeOrderNumber}`,
            link: data.viewUrl,
            metadata: {
              changeOrderNumber: data.changeOrderNumber,
              subcontractorName: data.subcontractorName,
              bidAmount: data.bidAmount,
              projectName: data.projectName,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send portal invitation email to subcontractor
   */
  async notifyPortalInvitation(
    recipientEmail: string,
    data: Omit<PortalInvitationEmailData, 'recipientName' | 'recipientEmail'>,
    _options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const emailData: PortalInvitationEmailData = {
      ...data,
      recipientName: data.companyName, // Use company name as recipient name
      recipientEmail,
    }

    // Send email notification (always send for invitations)
    try {
      const { html, text } = generatePortalInvitationEmail(emailData)
      await sendEmail({
        to: { email: recipientEmail, name: data.companyName },
        subject: `You're invited to ${data.projectName} on JobSight`,
        html,
        text,
        tags: ['invitation', 'portal', 'subcontractor'],
      })
      logger.info(`[NotificationService] Portal invitation sent to ${recipientEmail}`)
    } catch (error) {
      logger.error('[NotificationService] Portal invitation email failed:', error)
      throw error // Re-throw so caller knows invitation failed
    }
  },

  /**
   * Send checklist failed items escalation notification
   * Triggered automatically when a checklist is submitted with failed items
   */
  async notifyChecklistFailedItems(
    recipients: NotificationRecipient[],
    data: Omit<ChecklistFailedItemsEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
    const isCritical = data.severityLevel === 'high' || data.severityLevel === 'critical'

    for (const recipient of recipients) {
      const emailData: ChecklistFailedItemsEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/checklists/executions`,
      }

      // Send email notification (always for critical, check preferences for others)
      if (options.sendEmail || isCritical) {
        try {
          const { html, text } = generateChecklistFailedItemsEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `Checklist Failed: ${data.failedCount} item${data.failedCount > 1 ? 's' : ''} need attention - ${data.checklistName}`,
            html,
            text,
            tags: ['checklist', 'failed', 'escalation', data.severityLevel],
          })
          logger.info(`[NotificationService] Checklist escalation sent to ${recipient.email}`)
        } catch (error) {
          logger.error('[NotificationService] Checklist escalation email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'checklist_failed_items',
            title: 'Checklist Inspection Failed',
            message: `${data.checklistName} has ${data.failedCount} failed item${data.failedCount > 1 ? 's' : ''} requiring attention on ${data.projectName}`,
            link: data.viewUrl,
            priority: isCritical ? 'high' : 'normal',
            metadata: {
              checklistName: data.checklistName,
              projectName: data.projectName,
              failedCount: data.failedCount,
              totalCount: data.totalCount,
              severityLevel: data.severityLevel,
              inspectorName: data.inspectorName,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send punch item assigned notification
   */
  async notifyPunchItemAssigned(
    recipient: NotificationRecipient,
    data: Omit<PunchItemAssignedEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    // Check user preferences
    const preferences = await this._getUserPreferences(recipient.userId)
    const shouldEmail = options.sendEmail && shouldSendEmail(preferences, 'punchItemAssigned')

    const emailData: PunchItemAssignedEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewUrl: data.viewUrl || `${appUrl}/punch-list`,
    }

    // Send email notification
    if (shouldEmail) {
      try {
        const { html, text } = generatePunchItemAssignedEmail(emailData)
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: `Punch Item Assigned: ${data.itemNumber} - ${data.description.substring(0, 50)}`,
          html,
          text,
          tags: ['punch-item', 'assigned', data.priority || 'normal'],
        })
      } catch (error) {
        logger.error('[NotificationService] Punch item email failed:', error)
      }
    }

    // Create in-app notification
    if (options.sendInApp) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'punch_item_assigned',
          title: 'Punch Item Assignment',
          message: `You have been assigned to punch item ${data.itemNumber}: ${data.description.substring(0, 100)}`,
          link: data.viewUrl,
          priority: data.priority === 'critical' || data.priority === 'high' ? 'high' : 'normal',
          metadata: {
            itemNumber: data.itemNumber,
            description: data.description,
            projectName: data.projectName,
            location: data.location,
            assignedBy: data.assignedBy,
            priority: data.priority,
            dueDate: data.dueDate,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send RFI aging alert notification (before due date)
   * Called for 7-day, 3-day, and 1-day reminders
   */
  async notifyRFIAgingAlert(
    recipients: NotificationRecipient[],
    data: Omit<RFIAgingAlertEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      // Check user preferences
      const preferences = await this._getUserPreferences(recipient.userId)
      const shouldEmail = options.sendEmail && shouldSendEmail(preferences, 'rfiAssigned')

      const emailData: RFIAgingAlertEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/rfis`,
      }

      // Send email notification
      if (shouldEmail) {
        try {
          const { html, text } = generateRFIAgingAlertEmail(emailData)
          const urgencyPrefix = data.agingLevel === 'critical' ? 'URGENT: ' : data.agingLevel === 'urgent' ? 'Action Required: ' : ''
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `${urgencyPrefix}RFI ${data.rfiNumber} Due in ${data.daysUntilDue} Day${data.daysUntilDue !== 1 ? 's' : ''}`,
            html,
            text,
            tags: ['rfi', 'reminder', data.agingLevel, `${data.daysUntilDue}-days`],
          })
        } catch (error) {
          logger.error('[NotificationService] RFI aging alert email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'rfi_due_reminder',
            title: `RFI Due in ${data.daysUntilDue} Day${data.daysUntilDue !== 1 ? 's' : ''}`,
            message: `RFI ${data.rfiNumber} "${data.rfiTitle}" requires a response by ${data.dueDate}`,
            link: data.viewUrl,
            priority: data.agingLevel === 'critical' ? 'high' : data.agingLevel === 'urgent' ? 'normal' : 'low',
            metadata: {
              rfiNumber: data.rfiNumber,
              rfiTitle: data.rfiTitle,
              projectName: data.projectName,
              daysUntilDue: data.daysUntilDue,
              dueDate: data.dueDate,
              priority: data.priority,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send RFI overdue notification (after due date)
   * Called daily for RFIs past their due date
   */
  async notifyRFIOverdue(
    recipients: NotificationRecipient[],
    data: Omit<RFIOverdueAlertEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      // Check user preferences - always send for overdue items
      const emailData: RFIOverdueAlertEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/rfis`,
      }

      // Send email notification (always for overdue)
      if (options.sendEmail) {
        try {
          const { html, text } = generateRFIOverdueEmail(emailData)
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `OVERDUE: RFI ${data.rfiNumber} - ${data.daysOverdue} Day${data.daysOverdue !== 1 ? 's' : ''} Past Due`,
            html,
            text,
            tags: ['rfi', 'overdue', `${data.daysOverdue}-days-overdue`],
          })
        } catch (error) {
          logger.error('[NotificationService] RFI overdue email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'rfi_overdue',
            title: 'RFI Overdue',
            message: `RFI ${data.rfiNumber} "${data.rfiTitle}" is ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue!`,
            link: data.viewUrl,
            priority: 'high',
            metadata: {
              rfiNumber: data.rfiNumber,
              rfiTitle: data.rfiTitle,
              projectName: data.projectName,
              daysOverdue: data.daysOverdue,
              dueDate: data.dueDate,
              priority: data.priority,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send RFI aging summary notification (daily/weekly digest)
   * Sent to project managers and stakeholders
   */
  async notifyRFIAgingSummary(
    recipient: NotificationRecipient,
    data: Omit<RFIAgingSummaryEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    const emailData: RFIAgingSummaryEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewAllUrl: data.viewAllUrl || `${appUrl}/projects/${data.projectId}/rfis`,
    }

    // Send email notification
    if (options.sendEmail) {
      try {
        const { html, text } = generateRFIAgingSummaryEmail(emailData)
        const hasOverdue = data.overdueCount > 0
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: hasOverdue
            ? `⚠️ RFI Alert: ${data.overdueCount} Overdue - ${data.projectName}`
            : `RFI Summary: ${data.dueThisWeekCount} Due This Week - ${data.projectName}`,
          html,
          text,
          tags: ['rfi', 'summary', 'digest'],
        })
      } catch (error) {
        logger.error('[NotificationService] RFI summary email failed:', error)
      }
    }

    // Create in-app notification
    if (options.sendInApp && data.overdueCount > 0) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'rfi_aging_summary',
          title: 'RFI Aging Summary',
          message: `${data.projectName}: ${data.overdueCount} overdue, ${data.dueTodayCount} due today, ${data.dueThisWeekCount} due this week`,
          link: data.viewAllUrl,
          priority: data.overdueCount > 0 ? 'high' : 'normal',
          metadata: {
            projectName: data.projectName,
            projectId: data.projectId,
            overdueCount: data.overdueCount,
            dueTodayCount: data.dueTodayCount,
            dueThisWeekCount: data.dueThisWeekCount,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send submittal deadline reminder notification
   * Called for 14-day, 7-day, and 3-day reminders
   */
  async notifySubmittalReminder(
    recipients: NotificationRecipient[],
    data: Omit<SubmittalReminderEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      // Check user preferences
      const preferences = await this._getUserPreferences(recipient.userId)
      const shouldEmail = options.sendEmail && shouldSendEmail(preferences, 'taskAssigned') // Use taskAssigned as submittal proxy

      const emailData: SubmittalReminderEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/submittals`,
      }

      // Send email notification
      if (shouldEmail) {
        try {
          const { html, text } = generateSubmittalReminderEmail(emailData)
          const isOverdue = data.reminderLevel === 'overdue'
          const isCritical = data.reminderLevel === 'critical'
          const prefix = isOverdue ? 'OVERDUE: ' : isCritical ? 'URGENT: ' : ''
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `${prefix}Submittal ${data.submittalNumber} - ${Math.abs(data.daysUntilDeadline)} day${Math.abs(data.daysUntilDeadline) !== 1 ? 's' : ''} ${isOverdue ? 'overdue' : 'until due'}`,
            html,
            text,
            tags: ['submittal', 'reminder', data.reminderLevel],
          })
        } catch (error) {
          logger.error('[NotificationService] Submittal reminder email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'submittal_reminder',
            title: data.reminderLevel === 'overdue' ? 'Submittal Overdue' : 'Submittal Due Soon',
            message: `Submittal ${data.submittalNumber} "${data.submittalTitle}" ${data.reminderLevel === 'overdue' ? `is ${Math.abs(data.daysUntilDeadline)} days overdue` : `is due in ${data.daysUntilDeadline} days`}`,
            link: data.viewUrl,
            priority: data.reminderLevel === 'overdue' || data.reminderLevel === 'critical' ? 'high' : 'normal',
            metadata: {
              submittalNumber: data.submittalNumber,
              submittalTitle: data.submittalTitle,
              projectName: data.projectName,
              daysUntilDeadline: data.daysUntilDeadline,
              reminderLevel: data.reminderLevel,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send submittal review turnaround reminder notification
   * Per AIA standards, architect has 14 calendar days to review
   */
  async notifySubmittalReviewReminder(
    recipient: NotificationRecipient,
    data: Omit<SubmittalReviewReminderEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    const emailData: SubmittalReviewReminderEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewUrl: data.viewUrl || `${appUrl}/submittals`,
    }

    // Send email notification
    if (options.sendEmail) {
      try {
        const { html, text } = generateSubmittalReviewReminderEmail(emailData)
        const subject = data.isOverdue
          ? `Review Overdue: Submittal ${data.submittalNumber} - ${data.daysInReview} days in review`
          : `Review Needed: Submittal ${data.submittalNumber} - ${data.daysInReview} days in review`
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject,
          html,
          text,
          tags: ['submittal', 'review', data.isOverdue ? 'overdue' : 'pending'],
        })
      } catch (error) {
        logger.error('[NotificationService] Submittal review reminder email failed:', error)
      }
    }

    // Create in-app notification
    if (options.sendInApp) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'submittal_review_reminder',
          title: data.isOverdue ? 'Review Overdue' : 'Submittal Awaiting Review',
          message: `Submittal ${data.submittalNumber} has been in review for ${data.daysInReview} days`,
          link: data.viewUrl,
          priority: data.isOverdue ? 'high' : 'normal',
          metadata: {
            submittalNumber: data.submittalNumber,
            submittalTitle: data.submittalTitle,
            projectName: data.projectName,
            daysInReview: data.daysInReview,
            isOverdue: data.isOverdue,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send submittal aging summary notification (daily/weekly digest)
   */
  async notifySubmittalAgingSummary(
    recipient: NotificationRecipient,
    data: Omit<SubmittalAgingSummaryEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    const emailData: SubmittalAgingSummaryEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewAllUrl: data.viewAllUrl || `${appUrl}/projects/${data.projectId}/submittals`,
    }

    // Send email notification
    if (options.sendEmail) {
      try {
        const { html, text } = generateSubmittalAgingSummaryEmail(emailData)
        const hasOverdue = data.overdueCount > 0
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: hasOverdue
            ? `⚠️ Submittal Alert: ${data.overdueCount} Overdue - ${data.projectName}`
            : `Submittal Summary: ${data.criticalCount} Critical - ${data.projectName}`,
          html,
          text,
          tags: ['submittal', 'summary', 'digest'],
        })
      } catch (error) {
        logger.error('[NotificationService] Submittal summary email failed:', error)
      }
    }

    // Create in-app notification only if there are issues
    if (options.sendInApp && (data.overdueCount > 0 || data.criticalCount > 0)) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'submittal_aging_summary',
          title: 'Submittal Status Summary',
          message: `${data.projectName}: ${data.overdueCount} overdue, ${data.criticalCount} critical, ${data.inReviewCount} in review`,
          link: data.viewAllUrl,
          priority: data.overdueCount > 0 ? 'high' : 'normal',
          metadata: {
            projectName: data.projectName,
            projectId: data.projectId,
            overdueCount: data.overdueCount,
            criticalCount: data.criticalCount,
            inReviewCount: data.inReviewCount,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send submittal status change notification
   * Called when a submittal review status changes (approved, rejected, etc.)
   */
  async notifySubmittalStatusChange(
    recipients: NotificationRecipient[],
    data: Omit<SubmittalStatusEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    // Determine notification urgency
    const _isApproved = ['approved', 'approved_as_noted'].includes(data.newStatus)
    const isRejected = data.newStatus === 'rejected'
    const needsRevision = data.newStatus === 'revise_resubmit'

    for (const recipient of recipients) {
      const emailData: SubmittalStatusEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/submittals`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateSubmittalStatusEmail(emailData)
          const approvalCodeText = data.approvalCode ? ` (Code ${data.approvalCode})` : ''
          const statusLabel = data.newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: isRejected || needsRevision
              ? `⚠️ Submittal ${data.submittalNumber} ${statusLabel}${approvalCodeText} - ${data.projectName}`
              : `✅ Submittal ${data.submittalNumber} ${statusLabel}${approvalCodeText} - ${data.projectName}`,
            html,
            text,
            tags: ['submittal', 'status-change', data.newStatus],
          })
        } catch (error) {
          logger.error('[NotificationService] Submittal status email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          const statusLabel = data.newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'submittal_status_change',
            title: `Submittal ${statusLabel}`,
            message: `Submittal ${data.submittalNumber}${data.specSectionTitle ? ` - ${data.specSectionTitle}` : ''} has been ${statusLabel.toLowerCase()} by ${data.reviewedBy}`,
            link: data.viewUrl,
            priority: isRejected || needsRevision ? 'high' : 'normal',
            metadata: {
              submittalNumber: data.submittalNumber,
              specSection: data.specSection,
              specSectionTitle: data.specSectionTitle,
              projectName: data.projectName,
              newStatus: data.newStatus,
              approvalCode: data.approvalCode,
              reviewedBy: data.reviewedBy,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }

      // Send push notification
      if (options.sendPush && isPushSupported()) {
        try {
          const statusLabel = data.newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          const approvalCodeText = data.approvalCode ? ` (${data.approvalCode})` : ''
          await showPushNotification({
            title: `Submittal ${statusLabel}${approvalCodeText}`,
            body: `${data.submittalNumber} on ${data.projectName} has been ${statusLabel.toLowerCase()}`,
            tag: `submittal-status-${data.submittalNumber}`,
            data: { url: data.viewUrl },
          })
        } catch (error) {
          logger.error('[NotificationService] Push notification failed:', error)
        }
      }
    }
  },

  /**
   * Send comment mention notification
   * Called when a user is @mentioned in a comment on any entity type
   */
  async notifyCommentMention(
    recipients: NotificationRecipient[],
    data: Omit<CommentMentionEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    // Entity type labels for notifications
    const entityLabels: Record<string, string> = {
      rfi: 'RFI',
      submittal: 'Submittal',
      change_order: 'Change Order',
      document: 'Document',
      task: 'Task',
      daily_report: 'Daily Report',
      punch_item: 'Punch Item',
      message: 'Message',
      general: 'Comment',
    }

    const entityLabel = entityLabels[data.entityType] || 'Comment'

    for (const recipient of recipients) {
      const emailData: CommentMentionEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateCommentMentionEmail(emailData)
          const entityDisplay = data.entityNumber
            ? `${entityLabel} ${data.entityNumber}`
            : entityLabel

          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `@Mention: ${data.mentionedBy} mentioned you in ${entityDisplay} - ${data.projectName}`,
            html,
            text,
            tags: ['mention', 'comment', data.entityType],
          })
        } catch (error) {
          logger.error('[NotificationService] Comment mention email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          const commentPreview = data.commentText.length > 100
            ? data.commentText.substring(0, 100) + '...'
            : data.commentText

          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'comment_mention',
            title: `${data.mentionedBy} mentioned you`,
            message: `In ${entityLabel}${data.entityNumber ? ` ${data.entityNumber}` : ''}: "${commentPreview}"`,
            link: data.viewUrl,
            priority: 'high', // Mentions are important
            metadata: {
              entityType: data.entityType,
              entityName: data.entityName,
              entityNumber: data.entityNumber,
              projectName: data.projectName,
              mentionedBy: data.mentionedBy,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }

      // Send push notification
      if (options.sendPush && isPushSupported()) {
        try {
          const commentPreview = data.commentText.length > 50
            ? data.commentText.substring(0, 50) + '...'
            : data.commentText

          await showPushNotification({
            title: `${data.mentionedBy} mentioned you`,
            body: `${entityLabel}${data.entityNumber ? ` ${data.entityNumber}` : ''}: ${commentPreview}`,
            tag: `mention-${data.entityType}-${data.entityNumber || Date.now()}`,
            data: { url: data.viewUrl },
          })
        } catch (error) {
          logger.error('[NotificationService] Push notification failed:', error)
        }
      }
    }
  },

  /**
   * Send daily report missing notification
   * Called when a daily report is missing for a project
   */
  async notifyDailyReportMissing(
    recipients: NotificationRecipient[],
    data: Omit<DailyReportMissingEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      const emailData: DailyReportMissingEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/daily-reports`,
        createUrl: data.createUrl || `${appUrl}/daily-reports/new`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateDailyReportMissingEmail(emailData)
          const isCritical = data.daysMissing >= 3
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: isCritical
              ? `URGENT: ${data.daysMissing} Days of Daily Reports Missing - ${data.projectName}`
              : `Daily Report Missing: ${data.projectName} - ${data.missingDate}`,
            html,
            text,
            tags: ['daily-report', 'missing', isCritical ? 'critical' : 'reminder'],
          })
        } catch (error) {
          logger.error('[NotificationService] Daily report missing email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'daily_report_missing',
            title: 'Daily Report Missing',
            message: `Daily report for ${data.missingDate} is missing on ${data.projectName}`,
            link: data.createUrl,
            priority: data.daysMissing >= 3 ? 'high' : 'normal',
            metadata: {
              projectName: data.projectName,
              missingDate: data.missingDate,
              daysMissing: data.daysMissing,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send daily report compliance summary notification
   */
  async notifyDailyReportSummary(
    recipient: NotificationRecipient,
    data: Omit<DailyReportSummaryEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    const emailData: DailyReportSummaryEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewAllUrl: data.viewAllUrl || `${appUrl}/projects/${data.projectId}/daily-reports`,
    }

    // Send email notification
    if (options.sendEmail) {
      try {
        const { html, text } = generateDailyReportSummaryEmail(emailData)
        const isCompliant = data.compliancePercentage >= 90
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: isCompliant
            ? `Daily Report Summary: ${data.compliancePercentage}% Compliance - ${data.projectName}`
            : `⚠️ Daily Report Alert: ${data.missingDays} Missing - ${data.projectName}`,
          html,
          text,
          tags: ['daily-report', 'summary', isCompliant ? 'compliant' : 'non-compliant'],
        })
      } catch (error) {
        logger.error('[NotificationService] Daily report summary email failed:', error)
      }
    }

    // Create in-app notification only if there are missing reports
    if (options.sendInApp && data.missingDays > 0) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'daily_report_summary',
          title: 'Daily Report Summary',
          message: `${data.projectName}: ${data.compliancePercentage}% compliance, ${data.missingDays} days missing`,
          link: data.viewAllUrl,
          priority: data.compliancePercentage < 70 ? 'high' : 'normal',
          metadata: {
            projectName: data.projectName,
            projectId: data.projectId,
            compliancePercentage: data.compliancePercentage,
            missingDays: data.missingDays,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send change order aging alert notification
   * For COs pending > 14 days (urgent) or > 30 days (critical)
   */
  async notifyChangeOrderAging(
    recipients: NotificationRecipient[],
    data: Omit<ChangeOrderAgingAlertEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      const emailData: ChangeOrderAgingAlertEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/change-orders`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateChangeOrderAgingAlertEmail(emailData)
          const prefix = data.isCritical ? 'CRITICAL: ' : data.isUrgent ? 'URGENT: ' : ''
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `${prefix}CO ${data.changeOrderNumber} pending ${data.daysInStatus} days - ${data.amount}`,
            html,
            text,
            tags: ['change-order', 'aging', data.isCritical ? 'critical' : data.isUrgent ? 'urgent' : 'reminder'],
          })
        } catch (error) {
          logger.error('[NotificationService] CO aging email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'change_order_aging',
            title: data.isCritical ? 'CO Critical: Action Required' : data.isUrgent ? 'CO Pending Review' : 'CO Status Update',
            message: `CO ${data.changeOrderNumber} has been pending for ${data.daysInStatus} days (${data.amount})`,
            link: data.viewUrl,
            priority: data.isCritical ? 'high' : data.isUrgent ? 'normal' : 'low',
            metadata: {
              changeOrderNumber: data.changeOrderNumber,
              title: data.title,
              projectName: data.projectName,
              daysInStatus: data.daysInStatus,
              amount: data.amount,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send change order budget threshold alert
   * For contingency usage warnings (50%, 75%, 100%+)
   */
  async notifyChangeOrderBudgetAlert(
    recipients: NotificationRecipient[],
    data: Omit<ChangeOrderBudgetAlertEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      const emailData: ChangeOrderBudgetAlertEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/projects/${data.projectId}/change-orders`,
      }

      // Send email notification
      if (options.sendEmail) {
        try {
          const { html, text } = generateChangeOrderBudgetAlertEmail(emailData)
          const thresholdLabel = data.thresholdBreached === 'exceeded' ? 'EXCEEDED' : data.thresholdBreached === 'critical' ? 'CRITICAL' : 'WARNING'
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject: `Contingency ${thresholdLabel}: ${data.contingencyPercentUsed}% used - ${data.projectName}`,
            html,
            text,
            tags: ['change-order', 'budget', data.thresholdBreached],
          })
        } catch (error) {
          logger.error('[NotificationService] CO budget alert email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'change_order_budget_alert',
            title: `Contingency ${data.thresholdBreached === 'exceeded' ? 'Exceeded' : 'Alert'}`,
            message: `${data.projectName}: ${data.contingencyPercentUsed}% of contingency used. Remaining: ${data.remainingContingency}`,
            link: data.viewUrl,
            priority: data.thresholdBreached === 'exceeded' || data.thresholdBreached === 'critical' ? 'high' : 'normal',
            metadata: {
              projectName: data.projectName,
              projectId: data.projectId,
              contingencyPercentUsed: data.contingencyPercentUsed,
              remainingContingency: data.remainingContingency,
              thresholdBreached: data.thresholdBreached,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send change order aging summary notification (weekly digest)
   */
  async notifyChangeOrderAgingSummary(
    recipient: NotificationRecipient,
    data: Omit<ChangeOrderAgingSummaryEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    const emailData: ChangeOrderAgingSummaryEmailData = {
      ...data,
      recipientName: recipient.name || recipient.email.split('@')[0],
      viewAllUrl: data.viewAllUrl || `${appUrl}/projects/${data.projectId}/change-orders`,
    }

    // Send email notification
    if (options.sendEmail) {
      try {
        const { html, text } = generateChangeOrderAgingSummaryEmail(emailData)
        await sendEmail({
          to: { email: recipient.email, name: recipient.name },
          subject: `CO Summary: ${data.pendingCount} pending (${data.totalPendingAmount}) - ${data.projectName}`,
          html,
          text,
          tags: ['change-order', 'summary', 'digest'],
        })
      } catch (error) {
        logger.error('[NotificationService] CO summary email failed:', error)
      }
    }

    // Create in-app notification only if there are overdue items
    if (options.sendInApp && data.overdueCount > 0) {
      try {
        await this._createInAppNotification({
          userId: recipient.userId,
          type: 'change_order_aging_summary',
          title: 'Change Order Summary',
          message: `${data.projectName}: ${data.pendingCount} pending (${data.totalPendingAmount}), ${data.overdueCount} overdue`,
          link: data.viewAllUrl,
          priority: data.overdueCount > 0 ? 'high' : 'normal',
          metadata: {
            projectName: data.projectName,
            projectId: data.projectId,
            pendingCount: data.pendingCount,
            totalPendingAmount: data.totalPendingAmount,
            overdueCount: data.overdueCount,
          },
        })
      } catch (error) {
        logger.error('[NotificationService] In-app notification failed:', error)
      }
    }
  },

  /**
   * Send drawing revision notification
   * Sent when a drawing is uploaded or revised
   */
  async notifyDrawingRevision(
    recipients: NotificationRecipient[],
    data: Omit<DrawingRevisionEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
    const isNewDrawing = !data.previousRevision

    for (const recipient of recipients) {
      // Check user preferences
      const preferences = await this._getUserPreferences(recipient.userId)
      const shouldEmail = options.sendEmail && shouldSendEmail(preferences, 'documentUploaded')

      const emailData: DrawingRevisionEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/drawings`,
      }

      // Send email notification
      if (shouldEmail) {
        try {
          const { html, text } = generateDrawingRevisionEmail(emailData)
          const subject = isNewDrawing
            ? `New Drawing: ${data.drawingNumber} - ${data.projectName}`
            : `Drawing Revised: ${data.drawingNumber} Rev ${data.newRevision} - ${data.projectName}`
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject,
            html,
            text,
            tags: ['drawing', 'revision', isNewDrawing ? 'new' : 'revised'],
          })
        } catch (error) {
          logger.error('[NotificationService] Drawing revision email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: isNewDrawing ? 'drawing_new' : 'drawing_revised',
            title: isNewDrawing ? 'New Drawing Issued' : 'Drawing Revised',
            message: isNewDrawing
              ? `New drawing ${data.drawingNumber} "${data.drawingTitle}" issued for ${data.projectName}`
              : `Drawing ${data.drawingNumber} revised to Rev ${data.newRevision} for ${data.projectName}`,
            link: data.viewUrl,
            priority: 'high', // Drawing revisions are always important
            metadata: {
              drawingNumber: data.drawingNumber,
              drawingTitle: data.drawingTitle,
              projectName: data.projectName,
              previousRevision: data.previousRevision,
              newRevision: data.newRevision,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send drawing set revision notification
   * Sent when multiple drawings are issued together (ASI, Addendum, etc.)
   */
  async notifyDrawingSetRevision(
    recipients: NotificationRecipient[],
    data: Omit<DrawingSetRevisionEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      // Check user preferences
      const preferences = await this._getUserPreferences(recipient.userId)
      const shouldEmail = options.sendEmail && shouldSendEmail(preferences, 'documentUploaded')

      const emailData: DrawingSetRevisionEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/drawings`,
      }

      // Send email notification
      if (shouldEmail) {
        try {
          const { html, text } = generateDrawingSetRevisionEmail(emailData)
          const subject = `Drawing Set Issued: ${data.setName} (${data.revisedDrawings} revised, ${data.newDrawings} new) - ${data.projectName}`
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject,
            html,
            text,
            tags: ['drawing', 'set', 'revision', data.issueReason.toLowerCase()],
          })
        } catch (error) {
          logger.error('[NotificationService] Drawing set email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'drawing_set_issued',
            title: 'Drawing Set Issued',
            message: `${data.setName}: ${data.revisedDrawings} revised, ${data.newDrawings} new drawings for ${data.projectName}`,
            link: data.viewUrl,
            priority: 'high',
            metadata: {
              setName: data.setName,
              projectName: data.projectName,
              issueReason: data.issueReason,
              revisedCount: data.revisedDrawings,
              newCount: data.newDrawings,
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
        }
      }
    }
  },

  /**
   * Send superseded drawings alert notification
   * Sent when drawings are marked as superseded/voided - critical notification
   */
  async notifySupersededDrawings(
    recipients: NotificationRecipient[],
    data: Omit<DrawingSupersededEmailData, 'recipientName'>,
    options: NotificationOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

    for (const recipient of recipients) {
      // Always send superseded drawing alerts - these are critical
      const emailData: DrawingSupersededEmailData = {
        ...data,
        recipientName: recipient.name || recipient.email.split('@')[0],
        viewUrl: data.viewUrl || `${appUrl}/drawings`,
      }

      // Send email notification - always for superseded drawings
      if (options.sendEmail) {
        try {
          const { html, text } = generateSupersededDrawingsEmail(emailData)
          const subject = `SUPERSEDED: ${data.supersededDrawings.length} drawing${data.supersededDrawings.length !== 1 ? 's' : ''} - ${data.projectName}`
          await sendEmail({
            to: { email: recipient.email, name: recipient.name },
            subject,
            html,
            text,
            tags: ['drawing', 'superseded', 'urgent'],
          })
        } catch (error) {
          logger.error('[NotificationService] Superseded drawings email failed:', error)
        }
      }

      // Create in-app notification
      if (options.sendInApp) {
        try {
          const drawingNumbers = data.supersededDrawings.map(d => d.drawingNumber).slice(0, 5)
          const more = data.supersededDrawings.length > 5 ? ` +${data.supersededDrawings.length - 5} more` : ''
          await this._createInAppNotification({
            userId: recipient.userId,
            type: 'drawings_superseded',
            title: 'Drawings Superseded',
            message: `${drawingNumbers.join(', ')}${more} superseded for ${data.projectName}`,
            link: data.viewUrl,
            priority: 'high', // Always high priority
            metadata: {
              projectName: data.projectName,
              supersededCount: data.supersededDrawings.length,
              drawingNumbers: data.supersededDrawings.map(d => d.drawingNumber),
            },
          })
        } catch (error) {
          logger.error('[NotificationService] In-app notification failed:', error)
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
        logger.error('[NotificationService] Failed to insert notification:', error)
        // Fallback to localStorage for backwards compatibility
        this._createLocalNotification(data)
        return
      }

      // Dispatch event for real-time UI updates
      window.dispatchEvent(new CustomEvent('newNotification', { detail: data }))
    } catch (error) {
      logger.error('[NotificationService] Error creating notification:', error)
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
        logger.error('[NotificationService] Database query failed:', error)
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
        logger.error('[NotificationService] Failed to mark as read:', error)
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
      logger.error('[NotificationService] Failed to clear notifications:', error)
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
        logger.error('[NotificationService] Failed to get unread count:', error)
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

  /**
   * Send a push notification to the current user's device
   * This is for local push notifications (when the app is in foreground)
   * For server-sent push, use the send-push-notification edge function
   */
  async sendLocalPushNotification(data: {
    type: string
    title: string
    body: string
    url?: string
    icon?: string
    badge?: string
    image?: string
    requireInteraction?: boolean
  }): Promise<boolean> {
    try {
      if (!isPushSupported()) {
        logger.warn('[NotificationService] Push notifications not supported')
        return false
      }

      const payload: PushNotificationPayload = {
        title: data.title,
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        image: data.image,
        tag: `jobsight-${data.type}-${Date.now()}`,
        data: {
          type: data.type,
          url: data.url,
        },
        requireInteraction: data.requireInteraction,
      }

      return await showPushNotification(payload)
    } catch (error) {
      logger.error('[NotificationService] Failed to send local push:', error)
      return false
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

/**
 * Send task assigned notification
 */
export async function sendTaskAssignedNotification(
  recipient: NotificationRecipient,
  data: Omit<TaskAssignedEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyTaskAssigned(recipient, data, options)
}

/**
 * Send RFI assigned notification
 */
export async function sendRfiAssignedNotification(
  recipient: NotificationRecipient,
  data: Omit<RfiAssignedEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyRfiAssigned(recipient, data, options)
}

/**
 * Send change order status notification
 */
export async function sendChangeOrderStatusNotification(
  recipients: NotificationRecipient[],
  data: Omit<ChangeOrderStatusEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyChangeOrderStatus(recipients, data, options)
}

/**
 * Send bid submitted notification
 */
export async function sendBidSubmittedNotification(
  recipients: NotificationRecipient[],
  data: Omit<BidSubmittedEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyBidSubmitted(recipients, data, options)
}

/**
 * Send portal invitation notification
 */
export async function sendPortalInvitationNotification(
  recipientEmail: string,
  data: Omit<PortalInvitationEmailData, 'recipientName' | 'recipientEmail'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyPortalInvitation(recipientEmail, data, options)
}

/**
 * Send punch item assigned notification
 */
export async function sendPunchItemAssignedNotification(
  recipient: NotificationRecipient,
  data: Omit<PunchItemAssignedEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyPunchItemAssigned(recipient, data, options)
}

/**
 * Send RFI aging alert notification (before due date)
 * Use for 7-day, 3-day, and 1-day reminders
 */
export async function sendRFIAgingAlertNotification(
  recipients: NotificationRecipient[],
  data: Omit<RFIAgingAlertEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyRFIAgingAlert(recipients, data, options)
}

/**
 * Send RFI overdue notification (after due date)
 */
export async function sendRFIOverdueNotification(
  recipients: NotificationRecipient[],
  data: Omit<RFIOverdueAlertEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyRFIOverdue(recipients, data, options)
}

/**
 * Send RFI aging summary notification (daily/weekly digest)
 */
export async function sendRFIAgingSummaryNotification(
  recipient: NotificationRecipient,
  data: Omit<RFIAgingSummaryEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyRFIAgingSummary(recipient, data, options)
}

/**
 * Send submittal deadline reminder notification
 * Use for 14-day, 7-day, and 3-day reminders
 */
export async function sendSubmittalReminderNotification(
  recipients: NotificationRecipient[],
  data: Omit<SubmittalReminderEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifySubmittalReminder(recipients, data, options)
}

/**
 * Send submittal review turnaround reminder notification
 * Per AIA standards, architect has 14 calendar days to review
 */
export async function sendSubmittalReviewReminderNotification(
  recipient: NotificationRecipient,
  data: Omit<SubmittalReviewReminderEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifySubmittalReviewReminder(recipient, data, options)
}

/**
 * Send submittal aging summary notification (daily/weekly digest)
 */
export async function sendSubmittalAgingSummaryNotification(
  recipient: NotificationRecipient,
  data: Omit<SubmittalAgingSummaryEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifySubmittalAgingSummary(recipient, data, options)
}

/**
 * Send daily report missing notification
 */
export async function sendDailyReportMissingNotification(
  recipients: NotificationRecipient[],
  data: Omit<DailyReportMissingEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyDailyReportMissing(recipients, data, options)
}

/**
 * Send daily report compliance summary notification
 */
export async function sendDailyReportSummaryNotification(
  recipient: NotificationRecipient,
  data: Omit<DailyReportSummaryEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyDailyReportSummary(recipient, data, options)
}

/**
 * Send change order aging alert notification
 * Use for COs pending > 14 days (urgent) or > 30 days (critical)
 */
export async function sendChangeOrderAgingAlertNotification(
  recipients: NotificationRecipient[],
  data: Omit<ChangeOrderAgingAlertEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyChangeOrderAging(recipients, data, options)
}

/**
 * Send change order budget/contingency threshold alert notification
 * Use when contingency usage hits 50%, 75%, or 100%
 */
export async function sendChangeOrderBudgetAlertNotification(
  recipients: NotificationRecipient[],
  data: Omit<ChangeOrderBudgetAlertEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyChangeOrderBudgetAlert(recipients, data, options)
}

/**
 * Send change order aging summary notification (weekly digest)
 */
export async function sendChangeOrderAgingSummaryNotification(
  recipient: NotificationRecipient,
  data: Omit<ChangeOrderAgingSummaryEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyChangeOrderAgingSummary(recipient, data, options)
}

/**
 * Send drawing revision notification
 * Use when a single drawing is uploaded or revised
 */
export async function sendDrawingRevisionNotification(
  recipients: NotificationRecipient[],
  data: Omit<DrawingRevisionEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyDrawingRevision(recipients, data, options)
}

/**
 * Send drawing set revision notification
 * Use when multiple drawings are issued together (ASI, Addendum, etc.)
 */
export async function sendDrawingSetRevisionNotification(
  recipients: NotificationRecipient[],
  data: Omit<DrawingSetRevisionEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifyDrawingSetRevision(recipients, data, options)
}

/**
 * Send superseded drawings alert notification
 * Use when drawings are marked as superseded/voided - critical notification
 */
export async function sendSupersededDrawingsNotification(
  recipients: NotificationRecipient[],
  data: Omit<DrawingSupersededEmailData, 'recipientName'>,
  options?: NotificationOptions
): Promise<void> {
  return notificationService.notifySupersededDrawings(recipients, data, options)
}
