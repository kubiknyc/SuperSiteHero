/**
 * Certificate Renewal Email Templates
 *
 * Email templates for insurance/license certificate expiration reminders.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface CertificateRenewalEmailData {
  recipientName: string
  certificateType: 'insurance' | 'license' | 'certification'
  certificateName: string
  vendorName: string
  projectName?: string
  expirationDate: string
  daysUntilExpiration: number
  escalationLevel: 'first' | 'second' | 'third' | 'expired'
  viewUrl: string
  uploadUrl?: string
  projectManager?: string
  companyName?: string
  policyNumber?: string
  coverageAmount?: number
}

export interface CertificateExpiredEmailData {
  recipientName: string
  certificateType: 'insurance' | 'license' | 'certification'
  certificateName: string
  vendorName: string
  projectName?: string
  expirationDate: string
  daysExpired: number
  viewUrl: string
  uploadUrl?: string
  projectManager?: string
  companyName?: string
  blocksWork?: boolean
}

const URGENCY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  first: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },    // Yellow - 90 days
  second: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },   // Orange - 60 days
  third: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },    // Red - 30 days
  expired: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },  // Dark Red - expired
}

const URGENCY_LABELS: Record<string, string> = {
  first: 'Advance Notice',
  second: 'Reminder',
  third: 'Final Notice',
  expired: 'EXPIRED',
}

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  insurance: 'Insurance Certificate',
  license: 'License',
  certification: 'Certification',
}

/**
 * Generate certificate renewal reminder email (before expiration)
 */
export function generateCertificateRenewalEmail(data: CertificateRenewalEmailData): { html: string; text: string } {
  const colors = URGENCY_COLORS[data.escalationLevel]
  const urgencyLabel = URGENCY_LABELS[data.escalationLevel]
  const typeLabel = CERTIFICATE_TYPE_LABELS[data.certificateType]

  const urgencyMessage = data.escalationLevel === 'first'
    ? `This ${typeLabel.toLowerCase()} expires in <strong>${data.daysUntilExpiration} days</strong>.`
    : data.escalationLevel === 'second'
    ? `This ${typeLabel.toLowerCase()} expires in <strong>${data.daysUntilExpiration} days</strong>. Please renew soon.`
    : `This ${typeLabel.toLowerCase()} expires in <strong>${data.daysUntilExpiration} days</strong>! Immediate action required.`

  const content = `
    <h1 style="color: ${colors.border};">${typeLabel} Renewal ${urgencyLabel}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A ${typeLabel.toLowerCase()} for <strong>${data.vendorName}</strong> is approaching its expiration date.
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        <strong>${urgencyMessage}</strong>
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 150px; padding: 8px 0; border: none;"><strong>Certificate Type:</strong></td>
          <td style="padding: 8px 0; border: none;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.certificateName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Vendor/Subcontractor:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.vendorName}</td>
        </tr>
        ${data.policyNumber ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Policy Number:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.policyNumber}</td>
        </tr>
        ` : ''}
        ${data.coverageAmount ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Coverage Amount:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.coverageAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
        </tr>
        ` : ''}
        ${data.projectName ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Expiration Date:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.expirationDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days Until Expiration:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.daysUntilExpiration} days</td>
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
      ${data.uploadUrl ? `
      <a href="${data.uploadUrl}" class="button" style="background-color: ${colors.border}; margin-right: 8px;">
        Upload Renewed Certificate
      </a>
      ` : ''}
      <a href="${data.viewUrl}" class="button button-secondary">
        View Certificate
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p class="muted text-small">
      Please ensure the renewed certificate is uploaded before the expiration date to maintain compliance and avoid work stoppages.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${urgencyLabel}: ${typeLabel} for ${data.vendorName} expires ${data.expirationDate}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate certificate expired email (after expiration)
 */
export function generateCertificateExpiredEmail(data: CertificateExpiredEmailData): { html: string; text: string } {
  const colors = URGENCY_COLORS.expired
  const typeLabel = CERTIFICATE_TYPE_LABELS[data.certificateType]

  const content = `
    <h1 style="color: ${colors.border};">EXPIRED: ${typeLabel} Requires Immediate Attention</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A ${typeLabel.toLowerCase()} for <strong>${data.vendorName}</strong> has <strong>expired</strong>.
    </p>

    <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 16px; color: ${colors.text}; font-weight: bold;">
        This ${typeLabel.toLowerCase()} expired ${data.daysExpired} day${data.daysExpired !== 1 ? 's' : ''} ago!
      </p>
      ${data.blocksWork ? `
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${colors.text};">
        <strong>Work may be suspended</strong> until a valid certificate is provided.
      </p>
      ` : ''}
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 150px; padding: 8px 0; border: none;"><strong>Certificate Type:</strong></td>
          <td style="padding: 8px 0; border: none;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.certificateName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Vendor/Subcontractor:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.vendorName}</td>
        </tr>
        ${data.projectName ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Expiration Date:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold; text-decoration: line-through;">${data.expirationDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days Expired:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.daysExpired}</td>
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
      ${data.uploadUrl ? `
      <a href="${data.uploadUrl}" class="button" style="background-color: ${colors.border};">
        Upload Renewed Certificate Now
      </a>
      ` : `
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        View Certificate Details
      </a>
      `}
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p style="background-color: #fef2f2; padding: 12px; border-radius: 8px; font-size: 14px; color: #7f1d1d;">
      <strong>Important:</strong> Operating without valid insurance or certifications may expose your company
      to significant liability and can result in work stoppage or contract termination.
      Please upload the renewed certificate immediately.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `EXPIRED: ${typeLabel} for ${data.vendorName} expired ${data.daysExpired} days ago`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
