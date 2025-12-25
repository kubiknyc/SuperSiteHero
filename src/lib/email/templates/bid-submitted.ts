/**
 * Bid Submitted Email Template
 *
 * Sent to the GC/Project Manager when a subcontractor submits a bid.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface BidSubmittedEmailData {
  recipientName: string
  subcontractorName: string
  projectName: string
  changeOrderNumber: string
  changeOrderTitle: string
  bidAmount: string
  durationDays?: number
  submittedAt: string
  viewUrl: string
}

export function generateBidSubmittedEmail(data: BidSubmittedEmailData): { html: string; text: string } {
  const content = `
    <h1 className="heading-page">Bid Submitted</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      <strong>${data.subcontractorName}</strong> has submitted a bid for a change order
      on the <strong>${data.projectName}</strong> project.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 150px; padding: 8px 0; border: none;"><strong>Change Order:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.changeOrderNumber} - ${data.changeOrderTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Subcontractor:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.subcontractorName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Bid Amount:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="font-weight: bold; color: #059669;">${data.bidAmount}</span>
          </td>
        </tr>
        ${data.durationDays ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Duration:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.durationDays} days</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedAt}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        Review Bid
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${data.subcontractorName} submitted a bid of ${data.bidAmount} for ${data.changeOrderNumber}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
