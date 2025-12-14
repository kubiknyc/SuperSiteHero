/**
 * Lien Waiver Reminder Email Templates
 *
 * Email templates for lien waiver due reminders and overdue escalations.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface LienWaiverReminderEmailData {
  recipientName: string
  waiverNumber: string
  waiverType: string
  vendorName: string
  projectName: string
  paymentAmount: number
  throughDate: string
  dueDate: string
  daysUntilDue: number
  escalationLevel: 'first' | 'second' | 'third' | 'overdue'
  viewUrl: string
  projectManager?: string
  notes?: string
}

export interface LienWaiverOverdueEmailData {
  recipientName: string
  waiverNumber: string
  waiverType: string
  vendorName: string
  projectName: string
  paymentAmount: number
  dueDate: string
  daysOverdue: number
  viewUrl: string
  projectManager?: string
  blocksPayment?: boolean
}

const URGENCY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  first: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },    // Yellow - 7 days
  second: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },   // Orange - 3 days
  third: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },    // Red - 1 day
  overdue: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },  // Dark Red - overdue
}

const URGENCY_LABELS: Record<string, string> = {
  first: 'Reminder',
  second: 'Second Notice',
  third: 'Final Notice',
  overdue: 'OVERDUE',
}

/**
 * Generate lien waiver reminder email (before due date)
 */
export function generateLienWaiverReminderEmail(data: LienWaiverReminderEmailData): { html: string; text: string } {
  const colors = URGENCY_COLORS[data.escalationLevel]
  const urgencyLabel = URGENCY_LABELS[data.escalationLevel]
  const formattedAmount = data.paymentAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  const urgencyMessage = data.escalationLevel === 'first'
    ? `This waiver is due in <strong>${data.daysUntilDue} days</strong>.`
    : data.escalationLevel === 'second'
    ? `This waiver is due in <strong>${data.daysUntilDue} days</strong>. Please submit promptly.`
    : `This waiver is due <strong>tomorrow</strong>! Immediate action required.`

  const content = `
    <h1 style="color: ${colors.border};">Lien Waiver ${urgencyLabel}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A lien waiver is needed for the <strong>${data.projectName}</strong> project.
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        <strong>${urgencyMessage}</strong>
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Waiver #:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.waiverNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.waiverType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Vendor/Sub:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.vendorName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Amount:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold; color: #059669;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Through Date:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.throughDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.dueDate}</td>
        </tr>
        ${data.projectManager ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project Manager:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectManager}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.notes ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6b7280;">
      <p style="margin: 0 0 8px 0;"><strong>Notes:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.notes}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        View Waiver Request
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p class="muted text-small">
      Please ensure the signed waiver is submitted before the due date to avoid payment delays.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${urgencyLabel}: Lien waiver ${data.waiverNumber} due ${data.dueDate}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate lien waiver overdue email (after due date)
 */
export function generateLienWaiverOverdueEmail(data: LienWaiverOverdueEmailData): { html: string; text: string } {
  const colors = URGENCY_COLORS.overdue
  const formattedAmount = data.paymentAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  const content = `
    <h1 style="color: ${colors.border};">OVERDUE: Lien Waiver Required</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A lien waiver for the <strong>${data.projectName}</strong> project is <strong>overdue</strong>.
    </p>

    <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 16px; color: ${colors.text}; font-weight: bold;">
        This waiver is ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue!
      </p>
      ${data.blocksPayment ? `
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${colors.text};">
        <strong>Payment is on hold</strong> until this waiver is received.
      </p>
      ` : ''}
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Waiver #:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.waiverNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.waiverType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Vendor/Sub:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.vendorName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Amount:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold; color: #059669;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold; text-decoration: line-through;">${data.dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days Overdue:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.daysOverdue}</td>
        </tr>
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
        Submit Waiver Now
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p style="background-color: #fef2f2; padding: 12px; border-radius: 8px; font-size: 14px; color: #7f1d1d;">
      <strong>Important:</strong> Outstanding lien waivers may delay payment processing and can create
      financial and legal complications for the project. Please submit the signed waiver immediately.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `OVERDUE: Lien waiver ${data.waiverNumber} is ${data.daysOverdue} days past due`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
