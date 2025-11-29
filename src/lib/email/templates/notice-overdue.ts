/**
 * Notice Overdue Email Template
 *
 * Sent daily for notices with overdue responses.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface NoticeOverdueEmailData {
  recipientName: string
  noticeReference: string
  noticeSubject: string
  noticeType: string
  projectName: string
  fromParty: string
  dueDate: string
  daysOverdue: number
  isCritical: boolean
  viewUrl: string
}

export function generateNoticeOverdueEmail(
  data: NoticeOverdueEmailData
): { html: string; text: string } {
  const content = `
    <h1 style="color: #ef4444;">Notice Response Overdue</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A response to the following notice is <strong style="color: #ef4444;">overdue</strong> on the
      <strong>${data.projectName}</strong> project.
    </p>

    <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #dc2626;">
        <strong>${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue!</strong>
        Please respond as soon as possible.
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Reference:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.noticeReference}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Subject:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.noticeSubject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; border: none;">
            ${data.noticeType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            ${data.isCritical ? '<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 4px; background-color: #ef4444; color: white; font-size: 12px;">CRITICAL</span>' : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>From:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.fromParty}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Was Due:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold; color: #ef4444;">${data.dueDate}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: #ef4444;">
        Respond Now
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p class="muted text-small" style="margin-top: 16px; text-align: center;">
      You will continue to receive daily reminders until a response is recorded.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `OVERDUE: Response required for notice ${data.noticeReference}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
