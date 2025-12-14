/**
 * Action Item Email Templates
 *
 * Email templates for meeting action item notifications:
 * - Assigned: When someone is assigned an action item
 * - Due Reminder: When action item is approaching due date
 * - Overdue: When action item passes due date
 * - Escalated: When action item is escalated to management
 * - Carryover: When action item is carried to next meeting
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

// ============================================================================
// TYPES
// ============================================================================

export interface ActionItemAssignedEmailData {
  recipientName: string
  actionItemTitle: string
  meetingTitle: string
  meetingDate: string
  projectName: string
  assignedBy: string
  dueDate: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category?: string
  description?: string
  viewUrl: string
}

export interface ActionItemDueReminderEmailData {
  recipientName: string
  actionItemTitle: string
  meetingTitle: string
  projectName: string
  dueDate: string
  daysUntilDue: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignedDate: string
  description?: string
  viewUrl: string
}

export interface ActionItemOverdueEmailData {
  recipientName: string
  actionItemTitle: string
  meetingTitle: string
  projectName: string
  dueDate: string
  daysOverdue: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignedBy: string
  escalationLevel: number
  viewUrl: string
}

export interface ActionItemEscalatedEmailData {
  recipientName: string
  actionItemTitle: string
  meetingTitle: string
  projectName: string
  dueDate: string
  daysOverdue: number
  originalAssignee: string
  escalatedBy: string
  escalationLevel: number
  escalationReason?: string
  viewUrl: string
}

export interface ActionItemCarryoverEmailData {
  recipientName: string
  actionItemTitle: string
  originalMeetingTitle: string
  newMeetingTitle: string
  projectName: string
  carryoverCount: number
  newDueDate?: string
  notes?: string
  viewUrl: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

const URGENCY_COLORS = {
  reminder: '#f59e0b', // Yellow/Orange
  overdue: '#ef4444',  // Red
  escalated: '#9333ea', // Purple
}

// ============================================================================
// ACTION ITEM ASSIGNED
// ============================================================================

export function generateActionItemAssignedEmail(
  data: ActionItemAssignedEmailData
): { html: string; text: string } {
  const priorityColor = PRIORITY_COLORS[data.priority] || PRIORITY_COLORS.normal

  const content = `
    <h1>New Action Item Assigned</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      You have been assigned an action item from the
      <strong>${data.meetingTitle}</strong> meeting on ${data.meetingDate}.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Action Item:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.actionItemTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Assigned By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.assignedBy}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.dueDate}</td>
        </tr>
        ${data.category ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Category:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.category}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Priority:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${priorityColor}; color: white; font-size: 12px; text-transform: uppercase;">
              ${data.priority}
            </span>
          </td>
        </tr>
      </table>
    </div>

    ${data.description ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 8px 0;"><strong>Description:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Action Item
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `New action item: ${data.actionItemTitle} - Due ${data.dueDate}`,
    content,
  })

  return { html, text: generatePlainText(content) }
}

// ============================================================================
// ACTION ITEM DUE REMINDER
// ============================================================================

export function generateActionItemDueReminderEmail(
  data: ActionItemDueReminderEmailData
): { html: string; text: string } {
  const priorityColor = PRIORITY_COLORS[data.priority] || PRIORITY_COLORS.normal
  const urgencyText = data.daysUntilDue === 0
    ? 'Due Today!'
    : data.daysUntilDue === 1
    ? 'Due Tomorrow!'
    : `Due in ${data.daysUntilDue} Days`

  const content = `
    <h1 style="color: ${URGENCY_COLORS.reminder};">Action Item Reminder: ${urgencyText}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      This is a reminder that an action item assigned to you is
      <strong style="color: ${URGENCY_COLORS.reminder};">${urgencyText.toLowerCase()}</strong>.
    </p>

    <div class="info-box" style="border-left: 4px solid ${URGENCY_COLORS.reminder};">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Action Item:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.actionItemTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Meeting:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold; color: ${URGENCY_COLORS.reminder};">${data.dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Assigned:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.assignedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Priority:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${priorityColor}; color: white; font-size: 12px; text-transform: uppercase;">
              ${data.priority}
            </span>
          </td>
        </tr>
      </table>
    </div>

    ${data.description ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
      <p style="margin: 0 0 8px 0;"><strong>Description:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${URGENCY_COLORS.reminder};">
        Complete Action Item
      </a>
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Reminder: ${data.actionItemTitle} - ${urgencyText}`,
    content,
  })

  return { html, text: generatePlainText(content) }
}

// ============================================================================
// ACTION ITEM OVERDUE
// ============================================================================

export function generateActionItemOverdueEmail(
  data: ActionItemOverdueEmailData
): { html: string; text: string } {
  const overdueText = data.daysOverdue === 1
    ? '1 day overdue'
    : `${data.daysOverdue} days overdue`

  const escalationWarning = data.escalationLevel > 0
    ? `<p style="color: ${URGENCY_COLORS.escalated}; font-weight: bold;">
        This action item has been escalated (Level ${data.escalationLevel}).
       </p>`
    : data.daysOverdue >= 3
    ? `<p style="color: ${URGENCY_COLORS.overdue};">
        ⚠️ This item will be escalated if not completed soon.
       </p>`
    : ''

  const content = `
    <h1 style="color: ${URGENCY_COLORS.overdue};">⚠️ Action Item Overdue</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      An action item assigned to you is now
      <strong style="color: ${URGENCY_COLORS.overdue};">${overdueText}</strong>.
      Please complete this item as soon as possible.
    </p>

    ${escalationWarning}

    <div class="info-box" style="border-left: 4px solid ${URGENCY_COLORS.overdue}; background-color: #fef2f2;">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Action Item:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.actionItemTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Meeting:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Was Due:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${URGENCY_COLORS.overdue}; font-weight: bold;">${data.dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Overdue:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${URGENCY_COLORS.overdue}; font-weight: bold;">${overdueText}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Assigned By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.assignedBy}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${URGENCY_COLORS.overdue};">
        Complete Now
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      If you cannot complete this item, please update the status or request a deadline extension.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `OVERDUE: ${data.actionItemTitle} - ${overdueText}`,
    content,
  })

  return { html, text: generatePlainText(content) }
}

// ============================================================================
// ACTION ITEM ESCALATED
// ============================================================================

export function generateActionItemEscalatedEmail(
  data: ActionItemEscalatedEmailData
): { html: string; text: string } {
  const content = `
    <h1 style="color: ${URGENCY_COLORS.escalated};">🚨 Action Item Escalated (Level ${data.escalationLevel})</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      An action item has been escalated to your attention. This item is
      <strong style="color: ${URGENCY_COLORS.overdue};">${data.daysOverdue} days overdue</strong>
      and requires immediate action.
    </p>

    <div class="info-box" style="border-left: 4px solid ${URGENCY_COLORS.escalated}; background-color: #faf5ff;">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Action Item:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.actionItemTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Meeting:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Original Assignee:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.originalAssignee}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Was Due:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${URGENCY_COLORS.overdue};">${data.dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days Overdue:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${URGENCY_COLORS.overdue}; font-weight: bold;">${data.daysOverdue}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Escalated By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.escalatedBy}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Escalation Level:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${URGENCY_COLORS.escalated}; color: white; font-size: 12px;">
              Level ${data.escalationLevel}
            </span>
          </td>
        </tr>
      </table>
    </div>

    ${data.escalationReason ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #faf5ff; border-radius: 8px; border-left: 4px solid ${URGENCY_COLORS.escalated};">
      <p style="margin: 0 0 8px 0;"><strong>Escalation Reason:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.escalationReason}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${URGENCY_COLORS.escalated};">
        Review & Resolve
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Please review this item, reassign if necessary, or work with the team to ensure completion.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `ESCALATED: ${data.actionItemTitle} - Level ${data.escalationLevel}`,
    content,
  })

  return { html, text: generatePlainText(content) }
}

// ============================================================================
// ACTION ITEM CARRYOVER
// ============================================================================

export function generateActionItemCarryoverEmail(
  data: ActionItemCarryoverEmailData
): { html: string; text: string } {
  const carryoverWarning = data.carryoverCount >= 3
    ? `<p style="color: ${URGENCY_COLORS.overdue}; font-weight: bold;">
        ⚠️ This item has been carried over ${data.carryoverCount} times. Please prioritize completion.
       </p>`
    : data.carryoverCount >= 2
    ? `<p style="color: ${URGENCY_COLORS.reminder};">
        Note: This item has been carried over ${data.carryoverCount} times.
       </p>`
    : ''

  const content = `
    <h1>Action Item Carried Forward</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      An action item assigned to you has been carried forward from
      <strong>${data.originalMeetingTitle}</strong> to the next meeting.
    </p>

    ${carryoverWarning}

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Action Item:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.actionItemTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Original Meeting:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.originalMeetingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>New Meeting:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.newMeetingTitle}</td>
        </tr>
        ${data.newDueDate ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>New Due Date:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.newDueDate}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Times Carried:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${data.carryoverCount >= 3 ? URGENCY_COLORS.overdue : data.carryoverCount >= 2 ? URGENCY_COLORS.reminder : '#22c55e'}; color: white; font-size: 12px;">
              ${data.carryoverCount}
            </span>
          </td>
        </tr>
      </table>
    </div>

    ${data.notes ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
      <p style="margin: 0 0 8px 0;"><strong>Notes:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.notes}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Action Item
      </a>
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Action item carried forward: ${data.actionItemTitle}`,
    content,
  })

  return { html, text: generatePlainText(content) }
}
