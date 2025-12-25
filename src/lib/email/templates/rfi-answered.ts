/**
 * RFI Answered Email Template
 *
 * Sent when an RFI you created has been answered.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface RfiAnsweredEmailData {
  recipientName: string
  rfiNumber: string
  subject: string
  projectName: string
  answeredBy: string
  answeredAt: string
  question: string
  answer: string
  viewUrl: string
}

export function generateRfiAnsweredEmail(data: RfiAnsweredEmailData): { html: string; text: string } {
  const content = `
    <h1 className="heading-page">RFI Answered</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Your RFI on the <strong>${data.projectName}</strong> project has been answered.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>RFI Number:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.rfiNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Subject:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Answered By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.answeredBy}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Answered On:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.answeredAt}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6b7280;">
      <p style="margin: 0 0 8px 0;"><strong>Your Question:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.question}</p>
    </div>

    <div style="margin-top: 16px; padding: 16px; background-color: #ecfdf5; border-radius: 8px; border-left: 4px solid #22c55e;">
      <p style="margin: 0 0 8px 0;"><strong>Answer:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.answer}</p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Full RFI
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `RFI ${data.rfiNumber} has been answered: ${data.subject}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
