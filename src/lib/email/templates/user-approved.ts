/**
 * User Approved Email Template
 *
 * Sent to users when their access request is approved by a company admin
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface UserApprovedData {
  userName: string
  companyName: string
  adminName: string
  approvedDate: string
  loginUrl: string
}

export function generateUserApprovedEmail(data: UserApprovedData): {
  html: string
  text: string
  subject: string
} {
  const content = `
    <h1>Welcome to ${data.companyName}!</h1>

    <p>Hello ${data.userName},</p>

    <div class="success-box">
      <p style="margin: 0; color: #15803d; font-weight: 600;">
        ✓ Your access request has been approved!
      </p>
    </div>

    <p>
      Great news! ${data.adminName} has approved your request to join <strong>${data.companyName}</strong> on JobSight.
      You now have full access to the platform.
    </p>

    <p><strong>What you can do now:</strong></p>
    <ul style="color: #475569; line-height: 24px; margin: 16px 0 16px 24px;">
      <li>Access all projects and job sites</li>
      <li>Create and manage daily reports</li>
      <li>Track RFIs, submittals, and change orders</li>
      <li>Collaborate with your team</li>
      <li>Monitor safety incidents and compliance</li>
    </ul>

    <p style="text-align: center; margin: 32px 0;">
      <a href="${data.loginUrl}" class="button button-success">
        Log In to JobSight
      </a>
    </p>

    <p class="muted text-small">
      If you have any questions about using JobSight, please contact your administrator or our support team.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `You've been approved to join ${data.companyName}`,
    content,
  })

  const text = generatePlainText(html)

  return {
    html,
    text,
    subject: `Access Approved - Welcome to ${data.companyName}`,
  }
}
