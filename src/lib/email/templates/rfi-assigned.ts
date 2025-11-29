/**
 * RFI Assigned Email Template
 *
 * Sent when a user is assigned to an RFI.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface RfiAssignedEmailData {
  recipientName: string
  rfiNumber: string
  subject: string
  projectName: string
  assignedBy: string
  dueDate?: string
  priority?: string
  question: string
  viewUrl: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

export function generateRfiAssignedEmail(data: RfiAssignedEmailData): { html: string; text: string } {
  const priorityColor = data.priority ? PRIORITY_COLORS[data.priority.toLowerCase()] || '#3b82f6' : '#3b82f6'

  const content = `
    <h1>RFI Assignment</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      You have been assigned to respond to an RFI on the
      <strong>${data.projectName}</strong> project.
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
          <td style="padding: 8px 0; border: none;"><strong>Assigned By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.assignedBy}</td>
        </tr>
        ${data.dueDate ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.dueDate}</td>
        </tr>
        ` : ''}
        ${data.priority ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Priority:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${priorityColor}; color: white; font-size: 12px; text-transform: uppercase;">
              ${data.priority}
            </span>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 8px 0;"><strong>Question:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.question}</p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View RFI & Respond
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `You've been assigned to RFI ${data.rfiNumber}: ${data.subject}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
