/**
 * Submittal Status Email Template
 *
 * Sent when a submittal review status changes (approved, approved as noted, revise/resubmit, rejected)
 * Uses construction industry standard A/B/C/D approval codes.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface SubmittalStatusEmailData {
  recipientName: string
  submittalNumber: string
  specSection: string
  specSectionTitle?: string
  projectName: string
  previousStatus?: string
  newStatus: string
  approvalCode?: 'A' | 'B' | 'C' | 'D'
  reviewedBy: string
  comments?: string
  revisionNumber?: number
  submittedDate?: string
  returnedDate?: string
  viewUrl: string
}

// Industry standard approval code colors and labels
const APPROVAL_CODE_CONFIG: Record<string, { color: string; bg: string; label: string; description: string }> = {
  A: {
    color: '#ffffff',
    bg: '#22c55e',
    label: 'Approved',
    description: 'No exceptions taken. Proceed with work.',
  },
  B: {
    color: '#ffffff',
    bg: '#84cc16',
    label: 'Approved as Noted',
    description: 'Approved with minor corrections noted. Proceed with work incorporating changes.',
  },
  C: {
    color: '#ffffff',
    bg: '#f97316',
    label: 'Revise and Resubmit',
    description: 'Make corrections and resubmit for approval before proceeding.',
  },
  D: {
    color: '#ffffff',
    bg: '#ef4444',
    label: 'Rejected',
    description: 'Not approved. Submit a new submittal for approval.',
  },
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  approved: { color: '#ffffff', bg: '#22c55e' },
  approved_as_noted: { color: '#ffffff', bg: '#84cc16' },
  revise_resubmit: { color: '#ffffff', bg: '#f97316' },
  rejected: { color: '#ffffff', bg: '#ef4444' },
  submitted: { color: '#ffffff', bg: '#3b82f6' },
  under_review: { color: '#1e3a8a', bg: '#93c5fd' },
  not_submitted: { color: '#374151', bg: '#d1d5db' },
  void: { color: '#374151', bg: '#6b7280' },
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  approved_as_noted: 'Approved as Noted',
  revise_resubmit: 'Revise and Resubmit',
  rejected: 'Rejected',
  submitted: 'Submitted',
  under_review: 'Under Review',
  not_submitted: 'Not Submitted',
  void: 'Void',
}

export function generateSubmittalStatusEmail(data: SubmittalStatusEmailData): { html: string; text: string } {
  const statusColors = STATUS_COLORS[data.newStatus] || STATUS_COLORS.submitted
  const statusLabel = STATUS_LABELS[data.newStatus] || data.newStatus.replace(/_/g, ' ')
  const previousStatusLabel = data.previousStatus
    ? STATUS_LABELS[data.previousStatus] || data.previousStatus.replace(/_/g, ' ')
    : undefined

  const approvalConfig = data.approvalCode ? APPROVAL_CODE_CONFIG[data.approvalCode] : null

  const isApproved = ['approved', 'approved_as_noted'].includes(data.newStatus)
  const isRejected = data.newStatus === 'rejected'
  const needsRevision = data.newStatus === 'revise_resubmit'

  // Determine the message tone and action items
  let actionMessage = ''
  if (isApproved) {
    actionMessage = data.newStatus === 'approved'
      ? 'You may proceed with fabrication/installation as submitted.'
      : 'You may proceed with fabrication/installation incorporating the noted changes.'
  } else if (needsRevision) {
    actionMessage = 'Please address the reviewer\'s comments and resubmit for approval before proceeding with work.'
  } else if (isRejected) {
    actionMessage = 'Please review the comments carefully and prepare a new submittal addressing the concerns.'
  }

  const content = `
    <h1 style="color: ${statusColors.bg};">Submittal ${statusLabel}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A submittal on the <strong>${data.projectName}</strong> project has been reviewed.
    </p>

    ${approvalConfig ? `
    <div style="background-color: ${approvalConfig.bg}; color: ${approvalConfig.color}; padding: 16px 24px; border-radius: 8px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; font-size: 24px; font-weight: bold;">
        Code ${data.approvalCode}: ${approvalConfig.label}
      </p>
      <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">
        ${approvalConfig.description}
      </p>
    </div>
    ` : `
    <div style="background-color: ${statusColors.bg}; color: ${statusColors.color}; padding: 16px 24px; border-radius: 8px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; font-size: 20px; font-weight: bold;">
        ${statusLabel}
      </p>
    </div>
    `}

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 160px; padding: 8px 0; border: none;"><strong>Submittal Number:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.submittalNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Spec Section:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.specSection}${data.specSectionTitle ? ` - ${data.specSectionTitle}` : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        ${data.revisionNumber !== undefined && data.revisionNumber > 0 ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Revision:</strong></td>
          <td style="padding: 8px 0; border: none;">Rev. ${data.revisionNumber}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Reviewed By:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.reviewedBy}</td>
        </tr>
        ${data.submittedDate ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedDate}</td>
        </tr>
        ` : ''}
        ${data.returnedDate ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Returned:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.returnedDate}</td>
        </tr>
        ` : ''}
        ${previousStatusLabel ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Previous Status:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="text-decoration: line-through; color: #6b7280;">
              ${previousStatusLabel}
            </span>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.comments ? `
    <div style="margin-top: 16px; padding: 16px; background-color: ${isRejected || needsRevision ? '#fef2f2' : '#f0fdf4'}; border-radius: 8px; border-left: 4px solid ${isRejected || needsRevision ? '#ef4444' : '#22c55e'};">
      <p style="margin: 0 0 8px 0;"><strong>Reviewer Comments:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${data.comments}</p>
    </div>
    ` : ''}

    ${actionMessage ? `
    <div style="margin-top: 16px; padding: 16px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0;"><strong>Next Steps:</strong> ${actionMessage}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${statusColors.bg};">
        View Submittal
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p class="muted text-small">
      <strong>Approval Code Reference:</strong><br>
      <span style="color: #22c55e;">A - Approved:</span> No exceptions taken<br>
      <span style="color: #84cc16;">B - Approved as Noted:</span> Proceed with noted changes<br>
      <span style="color: #f97316;">C - Revise and Resubmit:</span> Corrections required before proceeding<br>
      <span style="color: #ef4444;">D - Rejected:</span> Not approved, resubmit required
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Submittal ${data.submittalNumber} ${statusLabel}${data.approvalCode ? ` (Code ${data.approvalCode})` : ''} - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
