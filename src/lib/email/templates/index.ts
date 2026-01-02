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

// Lien Waiver Templates
export { generateLienWaiverReminderEmail, generateLienWaiverOverdueEmail } from './lien-waiver-reminder'
export type { LienWaiverReminderEmailData, LienWaiverOverdueEmailData } from './lien-waiver-reminder'

// Action Item Templates
export {
  generateActionItemAssignedEmail,
  generateActionItemDueReminderEmail,
  generateActionItemOverdueEmail,
  generateActionItemEscalatedEmail,
  generateActionItemCarryoverEmail,
} from './action-item-notification'
export type {
  ActionItemAssignedEmailData,
  ActionItemDueReminderEmailData,
  ActionItemOverdueEmailData,
  ActionItemEscalatedEmailData,
  ActionItemCarryoverEmailData,
} from './action-item-notification'

// Certificate Renewal Templates
export { generateCertificateRenewalEmail, generateCertificateExpiredEmail } from './certificate-renewal'
export type { CertificateRenewalEmailData, CertificateExpiredEmailData } from './certificate-renewal'

// RFI Aging Alert Templates
export {
  generateRFIAgingAlertEmail,
  generateRFIOverdueEmail,
  generateRFIAgingSummaryEmail,
} from './rfi-aging-alert'
export type {
  RFIAgingAlertEmailData,
  RFIOverdueAlertEmailData,
  RFIAgingSummaryEmailData,
} from './rfi-aging-alert'

// Drawing Package Templates
export {
  generateDrawingPackageNotificationEmail,
  generateAcknowledgmentReminderEmail,
  generateDownloadNotificationEmail,
  generateAcknowledgmentNotificationEmail,
} from './drawing-package-notification'
export type {
  DrawingPackageEmailData,
  AcknowledgmentReminderEmailData,
  DownloadNotificationEmailData,
  AcknowledgmentNotificationEmailData,
} from './drawing-package-notification'

// Safety Observation Templates
export {
  generateCriticalObservationEmail,
  generateCorrectiveActionAssignedEmail,
  generatePositiveRecognitionEmail,
  generateObservationResolvedEmail,
  generateWeeklySafetySummaryEmail,
} from './safety-observation-notification'
export type {
  CriticalObservationEmailData,
  CorrectiveActionAssignedEmailData,
  PositiveRecognitionEmailData,
  ObservationResolvedEmailData,
  WeeklySafetySummaryEmailData,
} from './safety-observation-notification'

// User Registration Templates
export { generateUserPendingApprovalEmail } from './user-pending-approval'
export type { UserPendingApprovalData } from './user-pending-approval'

export { generateUserApprovedEmail } from './user-approved'
export type { UserApprovedData } from './user-approved'

export { generateUserRejectedEmail } from './user-rejected'
export type { UserRejectedData } from './user-rejected'

// Meeting Minutes Templates
export { generateMeetingMinutesEmail, generateMinutesReminderEmail } from './meeting-minutes'
export type {
  MeetingMinutesEmailData,
  MinutesReminderEmailData,
  AttendeeInfo,
  ActionItemInfo,
  NoteInfo,
} from './meeting-minutes'

// Scheduled Report Templates
export { generateScheduledReportEmail } from './scheduled-report'
export type { ScheduledReportEmailData } from './scheduled-report'

// Submittal Reminder Templates
export {
  generateSubmittalReminderEmail,
  generateSubmittalReviewReminderEmail,
  generateSubmittalAgingSummaryEmail,
} from './submittal-reminder'
export type {
  SubmittalReminderEmailData,
  SubmittalReviewReminderEmailData,
  SubmittalAgingSummaryEmailData,
} from './submittal-reminder'

// Daily Report Alert Templates
export {
  generateDailyReportMissingEmail,
  generateDailyReportSummaryEmail,
  generateMultiProjectReportSummaryEmail,
} from './daily-report-alert'
export type {
  DailyReportMissingEmailData,
  DailyReportSummaryEmailData,
  MultiProjectReportSummaryEmailData,
} from './daily-report-alert'

// Change Order Aging Alert Templates
export {
  generateChangeOrderAgingAlertEmail,
  generateChangeOrderBudgetAlertEmail,
  generateChangeOrderAgingSummaryEmail,
} from './change-order-aging'
export type {
  ChangeOrderAgingAlertEmailData,
  ChangeOrderBudgetAlertEmailData,
  ChangeOrderAgingSummaryEmailData,
} from './change-order-aging'

// Drawing Revision Notification Templates
export {
  generateDrawingRevisionEmail,
  generateDrawingSetRevisionEmail,
  generateSupersededDrawingsEmail,
} from './drawing-revision-notification'
export type {
  DrawingRevisionEmailData,
  DrawingSetRevisionEmailData,
  DrawingSupersededEmailData,
} from './drawing-revision-notification'
