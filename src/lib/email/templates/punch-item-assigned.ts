/**
 * Punch Item Assigned Email Template
 *
 * Sent when a user is assigned to a punch list item.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface PunchItemAssignedEmailData {
  recipientName: string
  itemNumber: string
  description: string
  projectName: string
  location: string
  assignedBy: string
  dueDate?: string
  priority?: string
  punchListName: string
  viewUrl: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
}

export function generatePunchItemAssignedEmail(data: PunchItemAssignedEmailData): { html: string; text: string } {
  const priorityColor = data.priority ? PRIORITY_COLORS[data.priority.toLowerCase()] || '#3b82f6' : '#3b82f6'

  const content = `
    <h1 className="heading-page">Punch Item Assignment</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      You have been assigned a punch list item on the
      <strong>${data.projectName}</strong> project.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Punch List:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.punchListName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Item #:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.itemNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Location:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.location}</td>
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

    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #ef4444;">
      <p style="margin: 0 0 8px 0;"><strong>Issue Description:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: #ef4444;">
        View Punch Item
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Punch item assigned: ${data.description.substring(0, 50)}...`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
