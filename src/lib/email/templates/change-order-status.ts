/**
 * Change Order Status Email Template
 *
 * Sent when a change order status changes (submitted, approved, rejected, etc.)
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface ChangeOrderStatusEmailData {
  recipientName: string
  changeOrderNumber: string
  title: string
  projectName: string
  previousStatus: string
  newStatus: string
  updatedBy: string
  amount?: string
  description?: string
  comments?: string
  viewUrl: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  pending_estimate: '#f59e0b',
  estimate_complete: '#3b82f6',
  pending_internal_approval: '#8b5cf6',
  internally_approved: '#10b981',
  pending_owner_review: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
  void: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_estimate: 'Pending Estimate',
  estimate_complete: 'Estimate Complete',
  pending_internal_approval: 'Pending Internal Approval',
  internally_approved: 'Internally Approved',
  pending_owner_review: 'Pending Owner Review',
  approved: 'Approved',
  rejected: 'Rejected',
  void: 'Void',
}

export function generateChangeOrderStatusEmail(data: ChangeOrderStatusEmailData): { html: string; text: string } {
  const statusColor = STATUS_COLORS[data.newStatus] || '#3b82f6'
  const statusLabel = STATUS_LABELS[data.newStatus] || data.newStatus.replace(/_/g, ' ')
  const previousStatusLabel = STATUS_LABELS[data.previousStatus] || data.previousStatus.replace(/_/g, ' ')

  const isPositiveChange = ['approved', 'internally_approved', 'estimate_complete'].includes(data.newStatus)
  const isNegativeChange = ['rejected', 'void'].includes(data.newStatus)

  const content = `
    <h1>Change Order Status Update</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A change order on the <strong>${data.projectName}</strong> project has been updated.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>CO Number:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.changeOrderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Title:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.title}</td>
        </tr>
        ${data.amount ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Amount:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.amount}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Updated By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.updatedBy}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Previous Status:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="text-decoration: line-through; color: #6b7280;">
              ${previousStatusLabel}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>New Status:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background-color: ${statusColor}; color: white; font-size: 12px; font-weight: bold; text-transform: uppercase;">
              ${statusLabel}
            </span>
          </td>
        </tr>
      </table>
    </div>

    ${data.description ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0 0 8px 0;"><strong>Description:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
    </div>
    ` : ''}

    ${data.comments ? `
    <div style="margin-top: 16px; padding: 16px; background-color: ${isNegativeChange ? '#fef2f2' : '#f0fdf4'}; border-radius: 8px; border-left: 4px solid ${isNegativeChange ? '#ef4444' : '#22c55e'};">
      <p style="margin: 0 0 8px 0;"><strong>Comments:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.comments}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Change Order
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Change Order ${data.changeOrderNumber} is now ${statusLabel}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
