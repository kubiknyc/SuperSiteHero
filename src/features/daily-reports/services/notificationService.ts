/**
 * Notification Service - Handles daily report notifications
 * Supports email, push, and in-app notifications
 */

import { supabase } from '@/lib/supabase';
import type { DailyReportV2, ReportStatus } from '@/types/daily-reports-v2';
import { workflowEngine, type NotificationType, type NotificationConfig } from './workflowEngine';

interface NotificationRecipient {
  id: string;
  name: string;
  email: string;
  role: 'author' | 'reviewer' | 'approver' | 'project_manager';
}

interface NotificationPayload {
  type: NotificationType;
  reportId: string;
  reportDate: string;
  projectId: string;
  projectName?: string;
  fromStatus?: ReportStatus;
  toStatus?: ReportStatus;
  message?: string;
  actionUrl: string;
  metadata?: Record<string, unknown>;
}

interface NotificationResult {
  success: boolean;
  sentTo: string[];
  errors: string[];
}

/**
 * Create in-app notification
 */
async function createInAppNotification(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type: payload.type,
      title: getNotificationTitle(payload.type),
      message: getNotificationMessage(payload),
      action_url: payload.actionUrl,
      metadata: {
        report_id: payload.reportId,
        project_id: payload.projectId,
        ...payload.metadata,
      },
      read: false,
    });

    if (error) {
      console.error('Failed to create in-app notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating in-app notification:', error);
    return false;
  }
}

/**
 * Get notification title based on type
 */
function getNotificationTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    report_submitted: 'Daily Report Submitted',
    report_approved: 'Daily Report Approved',
    changes_requested: 'Changes Requested',
    report_locked: 'Daily Report Locked',
    pending_review_reminder: 'Pending Review Reminder',
    overdue_draft_reminder: 'Overdue Draft Reminder',
  };

  return titles[type] || 'Daily Report Update';
}

/**
 * Get notification message based on payload
 */
function getNotificationMessage(payload: NotificationPayload): string {
  const projectInfo = payload.projectName ? ` for ${payload.projectName}` : '';
  const dateInfo = ` (${payload.reportDate})`;

  const messages: Record<NotificationType, string> = {
    report_submitted: `A daily report${projectInfo}${dateInfo} has been submitted for your review.`,
    report_approved: `Your daily report${projectInfo}${dateInfo} has been approved.`,
    changes_requested: `Changes have been requested on your daily report${projectInfo}${dateInfo}. ${payload.message || ''}`,
    report_locked: `The daily report${projectInfo}${dateInfo} has been locked and is now finalized.`,
    pending_review_reminder: `A daily report${projectInfo}${dateInfo} is awaiting your review.`,
    overdue_draft_reminder: `You have an incomplete daily report${projectInfo}${dateInfo}. Please complete and submit it.`,
  };

  return messages[payload.type] || 'A daily report has been updated.';
}

/**
 * Send notification via Supabase Edge Function (email/push)
 */
async function sendExternalNotification(
  recipients: NotificationRecipient[],
  payload: NotificationPayload,
  channels: { email: boolean; push: boolean }
): Promise<{ emailSent: string[]; pushSent: string[]; errors: string[] }> {
  const result = {
    emailSent: [] as string[],
    pushSent: [] as string[],
    errors: [] as string[],
  };

  // Call Supabase Edge Function for email/push
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        recipients: recipients.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
        })),
        notification: {
          type: payload.type,
          title: getNotificationTitle(payload.type),
          message: getNotificationMessage(payload),
          actionUrl: payload.actionUrl,
        },
        channels,
      },
    });

    if (error) {
      result.errors.push(`Edge function error: ${error.message}`);
    } else if (data) {
      result.emailSent = data.emailSent || [];
      result.pushSent = data.pushSent || [];
    }
  } catch (error: any) {
    result.errors.push(`Failed to send external notification: ${error.message}`);
  }

  return result;
}

/**
 * Get recipients for a notification type
 */
async function getRecipients(
  projectId: string,
  authorId: string,
  recipientTypes: ('author' | 'reviewer' | 'approver' | 'project_manager')[]
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = [];

  try {
    // Get project team members with their roles
    const { data: teamMembers, error } = await supabase
      .from('project_team_members')
      .select(`
        user_id,
        role,
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('project_id', projectId);

    if (error) {
      console.error('Failed to fetch team members:', error);
      return recipients;
    }

    // Map team member roles to notification roles
    const roleMapping: Record<string, 'author' | 'reviewer' | 'approver' | 'project_manager'> = {
      owner: 'approver',
      admin: 'approver',
      project_manager: 'project_manager',
      superintendent: 'reviewer',
      foreman: 'reviewer',
      member: 'reviewer',
    };

    for (const member of teamMembers || []) {
      const profile = member.profiles as any;
      if (!profile) continue;

      const notificationRole = roleMapping[member.role] || 'reviewer';

      // Add author
      if (recipientTypes.includes('author') && member.user_id === authorId) {
        recipients.push({
          id: profile.id,
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
          role: 'author',
        });
        continue;
      }

      // Add other roles
      if (recipientTypes.includes(notificationRole) && member.user_id !== authorId) {
        recipients.push({
          id: profile.id,
          name: profile.full_name || 'Unknown',
          email: profile.email || '',
          role: notificationRole,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching recipients:', error);
  }

  return recipients;
}

/**
 * Main notification dispatcher
 */
export async function sendStatusChangeNotification(
  report: DailyReportV2,
  fromStatus: ReportStatus,
  toStatus: ReportStatus,
  projectName?: string,
  changeMessage?: string
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    sentTo: [],
    errors: [],
  };

  // Get notification config for this transition
  const config = workflowEngine.getNotificationConfig(fromStatus, toStatus);
  if (!config) {
    result.success = true; // No notification needed for this transition
    return result;
  }

  // Build payload
  const payload: NotificationPayload = {
    type: config.type,
    reportId: report.id,
    reportDate: report.report_date,
    projectId: report.project_id,
    projectName,
    fromStatus,
    toStatus,
    message: changeMessage,
    actionUrl: `/daily-reports/${report.id}`,
  };

  // Get recipients
  const recipients = await getRecipients(
    report.project_id,
    report.created_by || '',
    config.recipients
  );

  if (recipients.length === 0) {
    result.success = true;
    return result;
  }

  // Send in-app notifications
  if (config.inAppEnabled) {
    for (const recipient of recipients) {
      const success = await createInAppNotification(recipient.id, payload);
      if (success) {
        result.sentTo.push(`${recipient.name} (in-app)`);
      }
    }
  }

  // Send email/push notifications
  if (config.emailEnabled || config.pushEnabled) {
    const externalResult = await sendExternalNotification(recipients, payload, {
      email: config.emailEnabled,
      push: config.pushEnabled,
    });

    result.sentTo.push(
      ...externalResult.emailSent.map((e) => `${e} (email)`),
      ...externalResult.pushSent.map((p) => `${p} (push)`)
    );
    result.errors.push(...externalResult.errors);
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Send reminder notification for pending reviews
 */
export async function sendPendingReviewReminder(
  report: DailyReportV2,
  projectName?: string
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    sentTo: [],
    errors: [],
  };

  const payload: NotificationPayload = {
    type: 'pending_review_reminder',
    reportId: report.id,
    reportDate: report.report_date,
    projectId: report.project_id,
    projectName,
    actionUrl: `/daily-reports/${report.id}`,
  };

  const recipients = await getRecipients(
    report.project_id,
    report.created_by || '',
    ['reviewer', 'approver']
  );

  for (const recipient of recipients) {
    const success = await createInAppNotification(recipient.id, payload);
    if (success) {
      result.sentTo.push(recipient.name);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Send reminder for overdue drafts
 */
export async function sendOverdueDraftReminder(
  report: DailyReportV2,
  projectName?: string
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    sentTo: [],
    errors: [],
  };

  const payload: NotificationPayload = {
    type: 'overdue_draft_reminder',
    reportId: report.id,
    reportDate: report.report_date,
    projectId: report.project_id,
    projectName,
    actionUrl: `/daily-reports/${report.id}/edit`,
  };

  const recipients = await getRecipients(report.project_id, report.created_by || '', ['author']);

  for (const recipient of recipients) {
    const success = await createInAppNotification(recipient.id, payload);
    if (success) {
      result.sentTo.push(recipient.name);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

export type { NotificationPayload, NotificationRecipient, NotificationResult };
