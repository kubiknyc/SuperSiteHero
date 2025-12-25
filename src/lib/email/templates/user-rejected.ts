/**
 * User Rejected Email Template
 *
 * Sent to users when their access request is rejected by a company admin
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface UserRejectedData {
  userName: string
  companyName: string
  rejectedDate: string
  supportEmail?: string
}

export function generateUserRejectedEmail(data: UserRejectedData): {
  html: string
  text: string
  subject: string
} {
  const supportEmail = data.supportEmail || 'support@jobsightapp.com'

  const content = `
    <h1>Access Request Update</h1>

    <p>Hello ${data.userName},</p>

    <p>
      We're writing to let you know that your request to join <strong>${data.companyName}</strong> on JobSight
      was not approved at this time.
    </p>

    <div class="warning-box">
      <p style="margin: 0; color: #92400e; font-weight: 600;">
        Your access request was declined on ${data.rejectedDate}.
      </p>
    </div>

    <p><strong>What happens next?</strong></p>
    <ul style="color: #475569; line-height: 24px; margin: 16px 0 16px 24px;">
      <li>If you believe this was a mistake, please contact ${data.companyName} directly</li>
      <li>You can request access to a different company by registering again</li>
      <li>If you need assistance, our support team is here to help</li>
    </ul>

    <p>
      If you have questions about this decision or need to reach your company administrator,
      please contact <a href="mailto:${supportEmail}" style="color: #F97316;">${supportEmail}</a>.
    </p>

    <p class="muted text-small">
      Thank you for your interest in JobSight. We hope to work with you in the future.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Update on your ${data.companyName} access request`,
    content,
  })

  const text = generatePlainText(html)

  return {
    html,
    text,
    subject: `Access Request Update - ${data.companyName}`,
  }
}
