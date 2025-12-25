/**
 * Task Assigned Email Template
 *
 * Sent when a user is assigned to a task.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface TaskAssignedEmailData {
  recipientName: string
  taskTitle: string
  projectName: string
  assignedBy: string
  dueDate?: string
  priority?: string
  description?: string
  category?: string
  viewUrl: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

export function generateTaskAssignedEmail(data: TaskAssignedEmailData): { html: string; text: string } {
  const priorityColor = data.priority ? PRIORITY_COLORS[data.priority.toLowerCase()] || '#3b82f6' : '#3b82f6'

  const content = `
    <h1 className="heading-page">New Task Assignment</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      You have been assigned a new task on the
      <strong>${data.projectName}</strong> project.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Task:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.taskTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Assigned By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.assignedBy}</td>
        </tr>
        ${data.category ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Category:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.category}</td>
        </tr>
        ` : ''}
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

    ${data.description ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 8px 0;"><strong>Description:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Task
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `New task assigned: ${data.taskTitle}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
