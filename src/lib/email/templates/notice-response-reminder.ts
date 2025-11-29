/**
 * Notice Response Reminder Email Template
 *
 * Sent at 7 days, 3 days, and 1 day before response is due.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface NoticeResponseReminderEmailData {
  recipientName: string
  noticeReference: string
  noticeSubject: string
  noticeType: string
  projectName: string
  fromParty: string
  dueDate: string
  daysUntilDue: number
  isCritical: boolean
  viewUrl: string
}

const URGENCY_CONFIG = {
  7: { color: '#3b82f6', bg: '#eff6ff', border: '#3b82f6', label: 'Due in 7 days' },
  3: { color: '#f59e0b', bg: '#fef3c7', border: '#f59e0b', label: 'Due in 3 days' },
  1: { color: '#ef4444', bg: '#fef2f2', border: '#ef4444', label: 'Due tomorrow!' },
} as const

export function generateNoticeResponseReminderEmail(
  data: NoticeResponseReminderEmailData
): { html: string; text: string } {
  const config = URGENCY_CONFIG[data.daysUntilDue as keyof typeof URGENCY_CONFIG] || URGENCY_CONFIG[7]

  const content = `
    <h1 style="color: ${config.color};">Notice Response Reminder</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      This is a reminder that a response is required for a notice on the
      <strong>${data.projectName}</strong> project.
    </p>

    <div style="background-color: ${config.bg}; border: 1px solid ${config.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${config.color};">
        <strong>${config.label}</strong>
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
          <td style="padding: 8px 0; border: none;"><strong>Response Due:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold; color: ${config.color};">${data.dueDate}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${config.color};">
        View Notice & Respond
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Response due ${data.dueDate} for notice: ${data.noticeReference}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
