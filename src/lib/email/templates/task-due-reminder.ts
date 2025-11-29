/**
 * Task Due Reminder Email Template
 *
 * Sent 24 hours before a task is due.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface TaskDueReminderEmailData {
  recipientName: string
  taskTitle: string
  projectName: string
  dueDate: string
  dueTime?: string
  priority?: string
  description?: string
  percentComplete?: number
  viewUrl: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

export function generateTaskDueReminderEmail(data: TaskDueReminderEmailData): { html: string; text: string } {
  const priorityColor = data.priority ? PRIORITY_COLORS[data.priority.toLowerCase()] || '#f59e0b' : '#f59e0b'

  const content = `
    <h1 style="color: #f59e0b;">Task Due Reminder</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      This is a reminder that you have a task due soon on the
      <strong>${data.projectName}</strong> project.
    </p>

    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Due in less than 24 hours!</strong>
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Task:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.taskTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.dueDate}${data.dueTime ? ` at ${data.dueTime}` : ''}</td>
        </tr>
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
        ${data.percentComplete !== undefined ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Progress:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <div style="display: inline-block; width: 150px; height: 8px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden;">
              <div style="width: ${data.percentComplete}%; height: 100%; background-color: #3b82f6;"></div>
            </div>
            <span style="margin-left: 8px;">${data.percentComplete}%</span>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.description ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6b7280;">
      <p style="margin: 0 0 8px 0;"><strong>Description:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: #f59e0b;">
        View Task
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Reminder: "${data.taskTitle}" is due ${data.dueDate}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
