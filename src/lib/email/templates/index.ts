/**
 * Email Templates Index
 *
 * Export all email template generators.
 */

export { wrapInBaseTemplate, generatePlainText } from './base-template'
export type { BaseTemplateData } from './base-template'

export { generateApprovalRequestEmail } from './approval-request'
export type { ApprovalRequestEmailData } from './approval-request'

export { generateApprovalCompletedEmail } from './approval-completed'
export type { ApprovalCompletedEmailData } from './approval-completed'

export { generateIncidentNotificationEmail } from './incident-notification'
export type { IncidentNotificationEmailData } from './incident-notification'

// RFI Templates
export { generateRfiAssignedEmail } from './rfi-assigned'
export type { RfiAssignedEmailData } from './rfi-assigned'

export { generateRfiAnsweredEmail } from './rfi-answered'
export type { RfiAnsweredEmailData } from './rfi-answered'

// Task Templates
export { generateTaskAssignedEmail } from './task-assigned'
export type { TaskAssignedEmailData } from './task-assigned'

export { generateTaskDueReminderEmail } from './task-due-reminder'
export type { TaskDueReminderEmailData } from './task-due-reminder'

// Punch List Templates
export { generatePunchItemAssignedEmail } from './punch-item-assigned'
export type { PunchItemAssignedEmailData } from './punch-item-assigned'

// Document Templates
export { generateDocumentCommentEmail } from './document-comment'
export type { DocumentCommentEmailData } from './document-comment'

// Notice Templates
export { generateNoticeResponseReminderEmail } from './notice-response-reminder'
export type { NoticeResponseReminderEmailData } from './notice-response-reminder'

export { generateNoticeOverdueEmail } from './notice-overdue'
export type { NoticeOverdueEmailData } from './notice-overdue'

// Change Order Templates
export { generateChangeOrderStatusEmail } from './change-order-status'
export type { ChangeOrderStatusEmailData } from './change-order-status'

// Subcontractor Portal Templates
export { generateBidSubmittedEmail } from './bid-submitted'
export type { BidSubmittedEmailData } from './bid-submitted'

export { generatePortalInvitationEmail } from './portal-invitation'
export type { PortalInvitationEmailData } from './portal-invitation'

// Checklist Templates
export { generateChecklistFailedItemsEmail } from './checklist-failed-items'
export type { ChecklistFailedItemsEmailData } from './checklist-failed-items'
