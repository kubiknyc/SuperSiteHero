/**
 * RFI Aging Alert Email Templates
 *
 * Email templates for RFI response deadline reminders and overdue alerts.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface RFIAgingAlertEmailData {
  recipientName: string
  rfiNumber: string
  rfiTitle: string
  projectName: string
  discipline?: string
  priority: 'low' | 'normal' | 'high'
  dueDate: string
  daysUntilDue: number
  agingLevel: 'warning' | 'urgent' | 'critical' | 'overdue'
  viewUrl: string
  submittedBy?: string
  submittedDate?: string
  assignees?: string[]
}

export interface RFIOverdueAlertEmailData {
  recipientName: string
  rfiNumber: string
  rfiTitle: string
  projectName: string
  discipline?: string
  priority: 'low' | 'normal' | 'high'
  dueDate: string
  daysOverdue: number
  viewUrl: string
  submittedBy?: string
  submittedDate?: string
  projectManager?: string
  impactDescription?: string
}

export interface RFIAgingSummaryEmailData {
  recipientName: string
  projectName: string
  projectId: string
  overdueCount: number
  dueTodayCount: number
  dueThisWeekCount: number
  overdueRFIs: Array<{
    number: string
    title: string
    daysOverdue: number
    viewUrl: string
  }>
  viewAllUrl: string
}

const AGING_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },    // Yellow - 7 days
  urgent: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },     // Orange - 14 days
  critical: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },   // Red - 30 days
  overdue: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },    // Dark Red - overdue
}

const AGING_LABELS: Record<string, string> = {
  warning: 'Response Due Soon',
  urgent: 'Urgent Response Needed',
  critical: 'Critical - Response Required',
  overdue: 'OVERDUE',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#ef4444',
}

/**
 * Generate RFI aging alert email (before due date)
 */
export function generateRFIAgingAlertEmail(data: RFIAgingAlertEmailData): { html: string; text: string } {
  const colors = AGING_COLORS[data.agingLevel]
  const agingLabel = AGING_LABELS[data.agingLevel]
  const priorityColor = PRIORITY_COLORS[data.priority]

  const urgencyMessage = data.agingLevel === 'warning'
    ? `This RFI requires a response within <strong>${data.daysUntilDue} days</strong>.`
    : data.agingLevel === 'urgent'
    ? `This RFI requires a response within <strong>${data.daysUntilDue} days</strong>. Please prioritize.`
    : `This RFI is due in <strong>${data.daysUntilDue} days</strong>! Immediate response required.`

  const content = `
    <h1 style="color: ${colors.border};">RFI ${agingLabel}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      An RFI on the <strong>${data.projectName}</strong> project requires your attention.
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        <strong>${urgencyMessage}</strong>
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>RFI #:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.rfiNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Subject:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.rfiTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        ${data.discipline ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Discipline:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.discipline}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Priority:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${priorityColor}20; color: ${priorityColor}; font-weight: 600; text-transform: capitalize;">
              ${data.priority}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.dueDate}</td>
        </tr>
        ${data.submittedBy ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedBy}</td>
        </tr>
        ` : ''}
        ${data.submittedDate ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedDate}</td>
        </tr>
        ` : ''}
        ${data.assignees && data.assignees.length > 0 ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Assigned To:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.assignees.join(', ')}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        View & Respond to RFI
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p class="muted text-small">
      Timely RFI responses help keep the project on schedule. Please provide your response as soon as possible.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${agingLabel}: ${data.rfiNumber} - ${data.rfiTitle} due ${data.dueDate}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate RFI overdue email (after due date)
 */
export function generateRFIOverdueEmail(data: RFIOverdueAlertEmailData): { html: string; text: string } {
  const colors = AGING_COLORS.overdue
  const priorityColor = PRIORITY_COLORS[data.priority]

  const content = `
    <h1 style="color: ${colors.border};">OVERDUE: RFI Response Required</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      An RFI on the <strong>${data.projectName}</strong> project is <strong>overdue</strong> and requires immediate attention.
    </p>

    <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 16px; color: ${colors.text}; font-weight: bold;">
        This RFI is ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue!
      </p>
      ${data.impactDescription ? `
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${colors.text};">
        <strong>Impact:</strong> ${data.impactDescription}
      </p>
      ` : ''}
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>RFI #:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.rfiNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Subject:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.rfiTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        ${data.discipline ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Discipline:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.discipline}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Priority:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${priorityColor}20; color: ${priorityColor}; font-weight: 600; text-transform: capitalize;">
              ${data.priority}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Was Due:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold; text-decoration: line-through;">${data.dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days Overdue:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.daysOverdue}</td>
        </tr>
        ${data.submittedBy ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedBy}</td>
        </tr>
        ` : ''}
        ${data.projectManager ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project Manager:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectManager}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        Respond Now
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p style="background-color: #fef2f2; padding: 12px; border-radius: 8px; font-size: 14px; color: #7f1d1d;">
      <strong>Important:</strong> Overdue RFIs can cause schedule delays and cost impacts.
      Please provide a response immediately or contact the project team if you need more information.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `OVERDUE: RFI ${data.rfiNumber} is ${data.daysOverdue} days past due`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate RFI aging summary email (daily/weekly digest)
 */
export function generateRFIAgingSummaryEmail(data: RFIAgingSummaryEmailData): { html: string; text: string } {
  const hasOverdue = data.overdueCount > 0
  const headerColor = hasOverdue ? '#dc2626' : '#f59e0b'

  const content = `
    <h1 style="color: ${headerColor};">RFI Aging Summary - ${data.projectName}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Here's your RFI aging summary for the <strong>${data.projectName}</strong> project.
    </p>

    <div style="display: flex; gap: 16px; margin: 24px 0;">
      <div style="flex: 1; background-color: ${hasOverdue ? '#fef2f2' : '#f0fdf4'}; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: ${hasOverdue ? '#dc2626' : '#16a34a'};">
          ${data.overdueCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Overdue</p>
      </div>
      <div style="flex: 1; background-color: #fef3c7; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #f59e0b;">
          ${data.dueTodayCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Due Today</p>
      </div>
      <div style="flex: 1; background-color: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #3b82f6;">
          ${data.dueThisWeekCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Due This Week</p>
      </div>
    </div>

    ${data.overdueRFIs.length > 0 ? `
    <h2 style="color: #dc2626; font-size: 18px; margin-top: 32px;">Overdue RFIs Requiring Immediate Attention</h2>
    <table class="data-table" style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align: left;">RFI #</th>
          <th style="text-align: left;">Title</th>
          <th style="text-align: center;">Days Overdue</th>
          <th style="text-align: center;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${data.overdueRFIs.map(rfi => `
        <tr>
          <td style="font-weight: bold;">${rfi.number}</td>
          <td>${rfi.title}</td>
          <td style="text-align: center; color: #dc2626; font-weight: bold;">${rfi.daysOverdue}</td>
          <td style="text-align: center;">
            <a href="${rfi.viewUrl}" style="color: #2563eb; text-decoration: underline;">View</a>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewAllUrl}" class="button">
        View All RFIs
      </a>
    </p>

    <p class="muted text-small">
      This is an automated summary. You can adjust your notification preferences in your account settings.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `RFI Summary: ${data.overdueCount} overdue, ${data.dueTodayCount} due today - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
