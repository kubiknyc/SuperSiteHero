/**
 * Approval Request Email Template
 *
 * Sent when a user has a new item pending their approval.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface ApprovalRequestEmailData {
  recipientName: string
  entityType: 'document' | 'submittal' | 'rfi' | 'change_order'
  entityName: string
  entityNumber?: string
  projectName: string
  initiatedBy: string
  submittedAt?: string
  stepName?: string
  description?: string
  approvalUrl: string
}

const ENTITY_LABELS: Record<string, string> = {
  document: 'Document',
  submittal: 'Submittal',
  rfi: 'RFI',
  change_order: 'Change Order',
}

export function generateApprovalRequestEmail(data: ApprovalRequestEmailData): { html: string; text: string } {
  const entityLabel = ENTITY_LABELS[data.entityType] || 'Item'

  const content = `
    <h1>Approval Request</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      You have a new ${entityLabel.toLowerCase()} pending your approval on the
      <strong>${data.projectName}</strong> project.
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 120px; padding: 8px 0; border: none;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; border: none;">${entityLabel}</td>
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
          <td style="padding: 8px 0; border: none;"><strong>Initiated By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.initiatedBy}</td>
        </tr>
        ${data.submittedAt ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedAt}</td>
        </tr>
        ` : ''}
        ${data.stepName ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Step:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.stepName}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.description ? `
    <p style="margin-top: 16px;">
      <strong>Description:</strong><br>
      ${data.description}
    </p>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.approvalUrl}" class="button">
        Review & Approve
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.approvalUrl}
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `New ${entityLabel} awaiting your approval: ${data.entityName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
