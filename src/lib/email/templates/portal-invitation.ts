/**
 * Portal Invitation Email Template
 *
 * Sent to subcontractors when they are invited to access the portal.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface PortalInvitationEmailData {
  recipientName: string
  recipientEmail: string
  companyName: string
  projectName: string
  invitedBy: string
  accessLevel: string
  expiresAt: string
  invitationUrl: string
}

export function generatePortalInvitationEmail(data: PortalInvitationEmailData): { html: string; text: string } {
  const content = `
    <h1>You're Invited to SuperSiteHero</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      <strong>${data.invitedBy}</strong> has invited you to access the
      <strong>${data.projectName}</strong> project on SuperSiteHero.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 130px; padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Your Company:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.companyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Access Level:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #3b82f6; color: white; font-size: 12px;">
              ${data.accessLevel}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Expires:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.expiresAt}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #166534;">What you'll be able to do:</p>
      <ul style="margin: 0; padding-left: 20px; color: #166534;">
        <li>View project documents and drawings</li>
        <li>Submit and track RFIs</li>
        <li>Manage submittals</li>
        <li>Submit bids for change orders</li>
        <li>Access daily reports and schedules</li>
      </ul>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.invitationUrl}" class="button">
        Accept Invitation
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.invitationUrl}
    </p>

    <p class="muted text-small" style="margin-top: 24px;">
      This invitation will expire on ${data.expiresAt}. If you did not expect this invitation,
      you can safely ignore this email.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `You've been invited to access ${data.projectName} on SuperSiteHero`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
