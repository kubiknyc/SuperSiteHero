/**
 * Meeting Minutes Email Templates
 *
 * Email templates for distributing meeting minutes to attendees:
 * - Minutes Distribution: Full minutes with action items
 * - Minutes Reminder: Reminder to review minutes
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

// ============================================================================
// TYPES
// ============================================================================

export interface MeetingMinutesEmailData {
  recipientName: string
  meetingTitle: string
  meetingType: string
  meetingDate: string
  meetingTime?: string
  projectName: string
  location?: string
  attendees: AttendeeInfo[]
  absentees?: AttendeeInfo[]
  minutesText: string
  actionItems: ActionItemInfo[]
  notes?: NoteInfo[]
  distributedBy: string
  viewUrl: string
  pdfUrl?: string
}

export interface AttendeeInfo {
  name: string
  company?: string
  role?: string
  attended: boolean
}

export interface ActionItemInfo {
  description: string
  assignee: string
  dueDate?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: string
}

export interface NoteInfo {
  sectionTitle?: string
  content: string
}

export interface MinutesReminderEmailData {
  recipientName: string
  meetingTitle: string
  meetingDate: string
  projectName: string
  distributedDate: string
  actionItemCount: number
  yourActionItems: ActionItemInfo[]
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

const MEETING_TYPE_LABELS: Record<string, string> = {
  project_kickoff: 'Project Kickoff',
  progress: 'Progress Meeting',
  oac: 'OAC Meeting',
  safety: 'Safety Meeting',
  coordination: 'Coordination Meeting',
  preconstruction: 'Preconstruction',
  closeout: 'Closeout Meeting',
  other: 'Meeting',
}

// ============================================================================
// MEETING MINUTES DISTRIBUTION
// ============================================================================

export function generateMeetingMinutesEmail(
  data: MeetingMinutesEmailData
): { html: string; text: string } {
  const meetingTypeLabel = MEETING_TYPE_LABELS[data.meetingType] || data.meetingType

  // Generate attendee list HTML
  const attendeesHtml = data.attendees
    .filter(a => a.attended)
    .map(a => `
      <tr>
        <td style="padding: 6px 12px; border: none; font-size: 14px;">${a.name}</td>
        <td style="padding: 6px 12px; border: none; font-size: 14px; color: #64748b;">${a.company || '-'}</td>
        <td style="padding: 6px 12px; border: none; font-size: 14px; color: #64748b;">${a.role || '-'}</td>
      </tr>
    `)
    .join('')

  // Generate absentees if any
  const absenteesSection = data.absentees && data.absentees.length > 0
    ? `
      <div style="margin-top: 16px;">
        <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 14px;"><strong>Absent:</strong></p>
        <p style="margin: 0; color: #94a3b8; font-size: 14px;">
          ${data.absentees.map(a => a.name).join(', ')}
        </p>
      </div>
    `
    : ''

  // Generate action items HTML
  const actionItemsHtml = data.actionItems.length > 0
    ? `
      <h2 style="margin-top: 24px; border-top: 2px solid #e2e8f0; padding-top: 16px;">Action Items</h2>
      <table class="data-table" style="width: 100%; font-size: 14px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 10px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">Description</th>
            <th style="text-align: left; padding: 10px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; width: 120px;">Assignee</th>
            <th style="text-align: left; padding: 10px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; width: 100px;">Due Date</th>
            <th style="text-align: center; padding: 10px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; width: 80px;">Priority</th>
          </tr>
        </thead>
        <tbody>
          ${data.actionItems.map(item => `
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${item.assignee}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${item.dueDate || 'TBD'}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${PRIORITY_COLORS[item.priority]}; color: white; font-size: 11px; text-transform: uppercase;">
                  ${item.priority}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<p style="color: #94a3b8; font-style: italic;">No action items from this meeting.</p>'

  // Generate notes sections if provided
  const notesHtml = data.notes && data.notes.length > 0
    ? `
      <h2 style="margin-top: 24px; border-top: 2px solid #e2e8f0; padding-top: 16px;">Meeting Notes</h2>
      ${data.notes.map(note => `
        ${note.sectionTitle ? `<h3 style="color: #475569; font-size: 16px; margin: 16px 0 8px 0;">${note.sectionTitle}</h3>` : ''}
        <div style="padding: 12px 16px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 12px;">
          <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${note.content}</p>
        </div>
      `).join('')}
    `
    : ''

  const content = `
    <h1 style="margin-bottom: 8px;">Meeting Minutes</h1>
    <p style="color: #64748b; margin-bottom: 24px;">
      ${meetingTypeLabel} - ${data.meetingDate}
    </p>

    <div class="info-box">
      <table style="margin: 0; width: 100%;">
        <tr>
          <td style="width: 120px; padding: 6px 0; border: none; vertical-align: top;"><strong>Meeting:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none; vertical-align: top;"><strong>Project:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none; vertical-align: top;"><strong>Date:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.meetingDate}${data.meetingTime ? ` at ${data.meetingTime}` : ''}</td>
        </tr>
        ${data.location ? `
        <tr>
          <td style="padding: 6px 0; border: none; vertical-align: top;"><strong>Location:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.location}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p>Hi ${data.recipientName},</p>

    <p>
      The minutes from <strong>${data.meetingTitle}</strong> have been distributed.
      Please review the minutes and take note of any action items assigned to you.
    </p>

    <!-- Attendees Section -->
    <h2 style="margin-top: 24px; border-top: 2px solid #e2e8f0; padding-top: 16px;">Attendees</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 8px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase;">Name</th>
          <th style="text-align: left; padding: 8px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase;">Company</th>
          <th style="text-align: left; padding: 8px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase;">Role</th>
        </tr>
      </thead>
      <tbody>
        ${attendeesHtml}
      </tbody>
    </table>
    ${absenteesSection}

    <!-- Minutes Text -->
    <h2 style="margin-top: 24px; border-top: 2px solid #e2e8f0; padding-top: 16px;">Minutes Summary</h2>
    <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.7;">${data.minutesText}</div>
    </div>

    ${notesHtml}

    ${actionItemsHtml}

    <p style="text-align: center; margin-top: 32px;">
      <a href="${data.viewUrl}" class="button">
        View Full Minutes
      </a>
      ${data.pdfUrl ? `
      <a href="${data.pdfUrl}" class="button button-secondary" style="margin-left: 8px;">
        Download PDF
      </a>
      ` : ''}
    </p>

    <p class="muted text-small" style="text-align: center; margin-top: 24px;">
      Minutes distributed by ${data.distributedBy}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Meeting Minutes: ${data.meetingTitle} - ${data.meetingDate}`,
    content,
  })

  return { html, text: generatePlainText(content) }
}

// ============================================================================
// MINUTES REMINDER
// ============================================================================

export function generateMinutesReminderEmail(
  data: MinutesReminderEmailData
): { html: string; text: string } {
  const yourActionItemsHtml = data.yourActionItems.length > 0
    ? `
      <h2>Your Action Items</h2>
      <table class="data-table" style="width: 100%;">
        <thead>
          <tr>
            <th style="text-align: left;">Description</th>
            <th style="text-align: left; width: 100px;">Due Date</th>
            <th style="text-align: center; width: 80px;">Priority</th>
          </tr>
        </thead>
        <tbody>
          ${data.yourActionItems.map(item => `
            <tr>
              <td style="padding: 10px 12px;">${item.description}</td>
              <td style="padding: 10px 12px;">${item.dueDate || 'TBD'}</td>
              <td style="padding: 10px 12px; text-align: center;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${PRIORITY_COLORS[item.priority]}; color: white; font-size: 11px; text-transform: uppercase;">
                  ${item.priority}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : ''

  const content = `
    <h1>Meeting Minutes Reminder</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      This is a reminder to review the minutes from <strong>${data.meetingTitle}</strong>
      held on ${data.meetingDate}.
    </p>

    <div class="info-box">
      <table style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 6px 0; border: none;"><strong>Meeting:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none;"><strong>Meeting Date:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.meetingDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none;"><strong>Distributed:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.distributedDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none;"><strong>Total Action Items:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.actionItemCount}</td>
        </tr>
      </table>
    </div>

    ${yourActionItemsHtml}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        Review Minutes
      </a>
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Reminder: Review minutes from ${data.meetingTitle}`,
    content,
  })

  return { html, text: generatePlainText(content) }
}
