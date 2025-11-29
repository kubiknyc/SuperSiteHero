/**
 * Approval Completed Email Template
 *
 * Sent when an approval request has been approved or rejected.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface ApprovalCompletedEmailData {
  recipientName: string
  entityType: 'document' | 'submittal' | 'rfi' | 'change_order'
  entityName: string
  entityNumber?: string
  projectName: string
  status: 'approved' | 'approved_with_conditions' | 'rejected'
  actionBy: string
  actionAt?: string
  comment?: string
  conditions?: string
  viewUrl: string
}

const ENTITY_LABELS: Record<string, string> = {
  document: 'Document',
  submittal: 'Submittal',
  rfi: 'RFI',
  change_order: 'Change Order',
}

const STATUS_CONFIG: Record<string, { label: string; boxClass: string }> = {
  approved: { label: 'Approved', boxClass: 'success-box' },
  approved_with_conditions: { label: 'Approved with Conditions', boxClass: 'warning-box' },
  rejected: { label: 'Rejected', boxClass: 'danger-box' },
}

export function generateApprovalCompletedEmail(data: ApprovalCompletedEmailData): { html: string; text: string } {
  const entityLabel = ENTITY_LABELS[data.entityType] || 'Item'
  const statusConfig = STATUS_CONFIG[data.status] || STATUS_CONFIG.approved

  const content = `
    <h1>${entityLabel} ${statusConfig.label}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Your ${entityLabel.toLowerCase()} on the <strong>${data.projectName}</strong> project
      has been <strong>${statusConfig.label.toLowerCase()}</strong>.
    </p>

    <div class="${statusConfig.boxClass}">
      <table style="margin: 0; width: 100%;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Status:</strong></td>
          <td style="padding: 8px 0; border: none;"><strong>${statusConfig.label}</strong></td>
        </tr>
        ${data.entityNumber ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Number:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.entityNumber}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.entityName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Reviewed By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.actionBy}</td>
        </tr>
        ${data.actionAt ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Reviewed:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.actionAt}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.conditions ? `
    <div class="warning-box">
      <p style="margin: 0;"><strong>Conditions:</strong></p>
      <p style="margin: 8px 0 0 0;">${data.conditions}</p>
    </div>
    ` : ''}

    ${data.comment ? `
    <div class="info-box">
      <p style="margin: 0;"><strong>Comment:</strong></p>
      <p style="margin: 8px 0 0 0;">${data.comment}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button ${data.status === 'rejected' ? 'button-secondary' : ''}">
        View ${entityLabel}
      </a>
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Your ${entityLabel.toLowerCase()} has been ${statusConfig.label.toLowerCase()}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
