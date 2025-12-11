/**
 * Checklist Failed Items Email Template
 *
 * Sent when a checklist is submitted with failed items, triggering an escalation.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface ChecklistFailedItemsEmailData {
  recipientName: string
  checklistName: string
  projectName: string
  location?: string
  inspectorName: string
  submittedAt: string
  failedCount: number
  totalCount: number
  failurePercentage: number
  failedItems: Array<{
    label: string
    section?: string
    notes?: string
  }>
  viewUrl: string
  severityLevel: 'low' | 'medium' | 'high' | 'critical'
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low Priority', color: '#f59e0b', bgColor: '#fef3c7' },
  medium: { label: 'Medium Priority', color: '#f97316', bgColor: '#ffedd5' },
  high: { label: 'High Priority', color: '#dc2626', bgColor: '#fef2f2' },
  critical: { label: 'Critical', color: '#7c2d12', bgColor: '#fee2e2' },
}

export function generateChecklistFailedItemsEmail(data: ChecklistFailedItemsEmailData): { html: string; text: string } {
  const severityConfig = SEVERITY_CONFIG[data.severityLevel] || SEVERITY_CONFIG.medium
  const isCritical = data.severityLevel === 'high' || data.severityLevel === 'critical'

  // Build failed items list HTML
  const failedItemsHtml = data.failedItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.label}</strong>
          ${item.section ? `<br><span style="color: #6b7280; font-size: 12px;">${item.section}</span>` : ''}
          ${item.notes ? `<br><em style="color: #6b7280; font-size: 12px;">Notes: ${item.notes}</em>` : ''}
        </td>
      </tr>
    `
    )
    .join('')

  const content = `
    <h1 style="color: ${severityConfig.color};">
      Checklist Inspection Failed
    </h1>

    <p>Hi ${data.recipientName},</p>

    ${isCritical ? `
    <div class="danger-box">
      <p style="margin: 0; font-weight: bold;">
        A checklist inspection on <strong>${data.projectName}</strong> has failed with
        <strong>${data.failedCount} item${data.failedCount > 1 ? 's' : ''}</strong> requiring attention.
        Immediate review may be needed.
      </p>
    </div>
    ` : `
    <div class="warning-box">
      <p style="margin: 0;">
        A checklist inspection on <strong>${data.projectName}</strong> has been submitted with
        failed items that require your attention.
      </p>
    </div>
    `}

    <table class="data-table">
      <tr>
        <td style="width: 140px;"><strong>Checklist:</strong></td>
        <td>${data.checklistName}</td>
      </tr>
      <tr>
        <td><strong>Project:</strong></td>
        <td>${data.projectName}</td>
      </tr>
      ${data.location ? `
      <tr>
        <td><strong>Location:</strong></td>
        <td>${data.location}</td>
      </tr>
      ` : ''}
      <tr>
        <td><strong>Inspector:</strong></td>
        <td>${data.inspectorName}</td>
      </tr>
      <tr>
        <td><strong>Submitted:</strong></td>
        <td>${data.submittedAt}</td>
      </tr>
      <tr>
        <td><strong>Score:</strong></td>
        <td>
          <span style="color: ${severityConfig.color}; font-weight: bold;">
            ${data.failedCount} Failed
          </span>
          / ${data.totalCount} Total
          (${Math.round(100 - data.failurePercentage)}% Pass Rate)
        </td>
      </tr>
      <tr>
        <td><strong>Priority:</strong></td>
        <td>
          <span style="
            display: inline-block;
            background-color: ${severityConfig.bgColor};
            color: ${severityConfig.color};
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          ">
            ${severityConfig.label.toUpperCase()}
          </span>
        </td>
      </tr>
    </table>

    <h2 style="margin-top: 24px; font-size: 18px; color: #374151;">
      Failed Items (${data.failedCount})
    </h2>

    <table style="width: 100%; border-collapse: collapse; background-color: #fef2f2; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background-color: ${severityConfig.bgColor};">
          <th style="padding: 12px; text-align: left; color: ${severityConfig.color}; border-bottom: 2px solid ${severityConfig.color};">
            Item Description
          </th>
        </tr>
      </thead>
      <tbody>
        ${failedItemsHtml}
      </tbody>
    </table>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button button-primary">
        View Full Checklist Report
      </a>
    </p>

    <p class="muted text-small" style="margin-top: 24px;">
      This is an automated escalation notification because the checklist inspection
      contains failed items that may require corrective action.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Checklist Failed: ${data.failedCount} items need attention - ${data.checklistName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
