/**
 * Submittal Reminder Email Templates
 *
 * Email templates for submittal deadline reminders and lead time alerts.
 * Follows construction industry standard lead time patterns (45/30/14 days).
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface SubmittalReminderEmailData {
  recipientName: string
  submittalNumber: string
  submittalTitle: string
  specSection?: string
  projectName: string
  submitByDate: string
  requiredOnSiteDate?: string
  daysUntilDeadline: number
  leadTimeWeeks?: number
  reminderLevel: 'upcoming' | 'urgent' | 'critical' | 'overdue'
  viewUrl: string
  assignedBy?: string
}

export interface SubmittalReviewReminderEmailData {
  recipientName: string
  submittalNumber: string
  submittalTitle: string
  specSection?: string
  projectName: string
  submittedDate: string
  daysInReview: number
  reviewDeadline: string // AIA standard 14-day turnaround
  reviewerName?: string
  submitterName: string
  viewUrl: string
  isOverdue: boolean
}

export interface SubmittalAgingSummaryEmailData {
  recipientName: string
  projectName: string
  projectId: string
  overdueCount: number
  criticalCount: number
  inReviewCount: number
  awaitingSubmissionCount: number
  items: Array<{
    number: string
    title: string
    status: string
    daysUntilDue: number
    viewUrl: string
  }>
  viewAllUrl: string
}

const REMINDER_COLORS = {
  upcoming: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },    // Blue - 14+ days
  urgent: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },      // Yellow - 7-14 days
  critical: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },    // Orange - 1-7 days
  overdue: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },     // Red - past due
}

const REMINDER_LABELS = {
  upcoming: 'Submittal Due Soon',
  urgent: 'Submittal Deadline Approaching',
  critical: 'Critical: Submittal Due',
  overdue: 'OVERDUE: Submittal Required',
}

/**
 * Generate submittal deadline reminder email
 */
export function generateSubmittalReminderEmail(data: SubmittalReminderEmailData): { html: string; text: string } {
  const colors = REMINDER_COLORS[data.reminderLevel]
  const label = REMINDER_LABELS[data.reminderLevel]

  const urgencyMessage = data.reminderLevel === 'overdue'
    ? `This submittal is <strong>${Math.abs(data.daysUntilDeadline)} day${Math.abs(data.daysUntilDeadline) !== 1 ? 's' : ''} overdue</strong>! Submit immediately to avoid project delays.`
    : data.reminderLevel === 'critical'
    ? `This submittal is due in <strong>${data.daysUntilDeadline} day${data.daysUntilDeadline !== 1 ? 's' : ''}</strong>! Immediate action required.`
    : data.reminderLevel === 'urgent'
    ? `This submittal is due in <strong>${data.daysUntilDeadline} days</strong>. Please prepare for submission.`
    : `This submittal is due in <strong>${data.daysUntilDeadline} days</strong>. Ensure all documentation is ready.`

  const content = `
    <h1 style="color: ${colors.border};">${label}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A submittal on the <strong>${data.projectName}</strong> project requires your attention.
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        ${urgencyMessage}
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Submittal #:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.submittalNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Title:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittalTitle}</td>
        </tr>
        ${data.specSection ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Spec Section:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.specSection}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submit By:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.submitByDate}</td>
        </tr>
        ${data.requiredOnSiteDate ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Required On Site:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.requiredOnSiteDate}</td>
        </tr>
        ` : ''}
        ${data.leadTimeWeeks ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Lead Time:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.leadTimeWeeks} weeks</td>
        </tr>
        ` : ''}
        ${data.assignedBy ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Assigned By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.assignedBy}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        View Submittal
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p class="muted text-small">
      Timely submittal submissions help maintain the project schedule and ensure materials arrive on time.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${label}: ${data.submittalNumber} - ${data.submittalTitle} due ${data.submitByDate}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate submittal review turnaround reminder email
 * Per AIA standards, architect has 14 calendar days to review
 */
export function generateSubmittalReviewReminderEmail(data: SubmittalReviewReminderEmailData): { html: string; text: string } {
  const isLate = data.isOverdue
  const colors = isLate ? REMINDER_COLORS.overdue : REMINDER_COLORS.urgent

  const title = isLate
    ? 'Submittal Review Overdue'
    : 'Submittal Awaiting Your Review'

  const message = isLate
    ? `This submittal has been in review for <strong>${data.daysInReview} days</strong>, exceeding the standard 14-day turnaround.`
    : `This submittal has been awaiting review for <strong>${data.daysInReview} days</strong>. Review is due by ${data.reviewDeadline}.`

  const content = `
    <h1 style="color: ${colors.border};">${title}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A submittal on the <strong>${data.projectName}</strong> project is awaiting your review.
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        ${message}
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Submittal #:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.submittalNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Title:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittalTitle}</td>
        </tr>
        ${data.specSection ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Spec Section:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.specSection}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days in Review:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.daysInReview}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Review Due By:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${isLate ? colors.text : 'inherit'}; font-weight: ${isLate ? 'bold' : 'normal'};">${data.reviewDeadline}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submitterName}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        Review Submittal
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p style="background-color: #f0f9ff; padding: 12px; border-radius: 8px; font-size: 14px; color: #1e40af;">
      <strong>Note:</strong> Per AIA Document A201, the Architect should review and approve submittals with reasonable promptness.
      Industry standard is 14 calendar days. Delayed reviews can impact project schedules.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${title}: ${data.submittalNumber} - ${data.daysInReview} days in review`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate submittal aging summary email (daily/weekly digest)
 */
export function generateSubmittalAgingSummaryEmail(data: SubmittalAgingSummaryEmailData): { html: string; text: string } {
  const hasOverdue = data.overdueCount > 0
  const headerColor = hasOverdue ? '#dc2626' : '#f59e0b'

  const content = `
    <h1 style="color: ${headerColor};">Submittal Status Summary - ${data.projectName}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Here's your submittal status summary for the <strong>${data.projectName}</strong> project.
    </p>

    <div style="display: flex; gap: 12px; margin: 24px 0; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background-color: ${hasOverdue ? '#fef2f2' : '#f0fdf4'}; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${hasOverdue ? '#dc2626' : '#16a34a'};">
          ${data.overdueCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Overdue</p>
      </div>
      <div style="flex: 1; min-width: 120px; background-color: #ffedd5; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #f97316;">
          ${data.criticalCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Critical (≤7 days)</p>
      </div>
      <div style="flex: 1; min-width: 120px; background-color: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #3b82f6;">
          ${data.inReviewCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">In Review</p>
      </div>
      <div style="flex: 1; min-width: 120px; background-color: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a;">
          ${data.awaitingSubmissionCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Awaiting Submission</p>
      </div>
    </div>

    ${data.items.length > 0 ? `
    <h2 style="font-size: 18px; margin-top: 32px;">Items Requiring Attention</h2>
    <table class="data-table" style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align: left;">Submittal #</th>
          <th style="text-align: left;">Title</th>
          <th style="text-align: center;">Status</th>
          <th style="text-align: center;">Days Until Due</th>
          <th style="text-align: center;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.slice(0, 10).map(item => {
          const isOverdue = item.daysUntilDue < 0
          const isCritical = item.daysUntilDue <= 7 && item.daysUntilDue >= 0
          const color = isOverdue ? '#dc2626' : isCritical ? '#f97316' : '#6b7280'
          return `
          <tr>
            <td style="font-weight: bold;">${item.number}</td>
            <td>${item.title}</td>
            <td style="text-align: center;">${item.status}</td>
            <td style="text-align: center; color: ${color}; font-weight: ${isOverdue || isCritical ? 'bold' : 'normal'};">
              ${isOverdue ? Math.abs(item.daysUntilDue) + ' overdue' : item.daysUntilDue}
            </td>
            <td style="text-align: center;">
              <a href="${item.viewUrl}" style="color: #2563eb; text-decoration: underline;">View</a>
            </td>
          </tr>
          `
        }).join('')}
      </tbody>
    </table>
    ${data.items.length > 10 ? `
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      ...and ${data.items.length - 10} more items
    </p>
    ` : ''}
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewAllUrl}" class="button">
        View All Submittals
      </a>
    </p>

    <p class="muted text-small">
      This is an automated summary. You can adjust your notification preferences in your account settings.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Submittal Summary: ${data.overdueCount} overdue, ${data.criticalCount} critical - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
