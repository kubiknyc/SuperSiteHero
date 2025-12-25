/**
 * User Pending Approval Email Template
 *
 * Sent to company admins when a new user requests to join their company
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface UserPendingApprovalData {
  adminName: string
  companyName: string
  userName: string
  userEmail: string
  requestDate: string
  approvalUrl: string
}

export function generateUserPendingApprovalEmail(data: UserPendingApprovalData): {
  html: string
  text: string
  subject: string
} {
  const content = `
    <h1>New User Pending Approval</h1>

    <p>Hello ${data.adminName},</p>

    <p>A new user has requested to join <strong>${data.companyName}</strong> on JobSight:</p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tbody>
          <tr>
            <td style="border: none;"><strong>Name:</strong></td>
            <td style="border: none;">${data.userName}</td>
          </tr>
          <tr>
            <td style="border: none;"><strong>Email:</strong></td>
            <td style="border: none;">${data.userEmail}</td>
          </tr>
          <tr>
            <td style="border: none;"><strong>Requested:</strong></td>
            <td style="border: none;">${data.requestDate}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p>As a company administrator, you can approve or reject this request.</p>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${data.approvalUrl}" class="button">
        Review Pending Users
      </a>
    </p>

    <p class="muted text-small">
      This user currently has limited access and can only view a "Pending Approval" screen until you take action.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${data.userName} has requested to join ${data.companyName}`,
    content,
  })

  const text = generatePlainText(html)

  return {
    html,
    text,
    subject: `New User Request for ${data.companyName}`,
  }
}
