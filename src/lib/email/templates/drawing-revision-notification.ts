/**
 * Drawing Revision Notification Email Templates
 *
 * Email templates for drawing revision uploads and updates.
 * Critical for construction where outdated drawings cause costly mistakes.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

// ============================================================================
// Types
// ============================================================================

export interface DrawingRevisionEmailData {
  recipientName: string
  projectName: string
  drawingNumber: string
  drawingTitle: string
  discipline?: string // Architectural, Structural, MEP, etc.
  previousRevision?: string
  newRevision: string
  revisionDate: string
  revisionDescription?: string
  uploadedBy: string
  uploadedByCompany?: string
  changedAreas?: string[] // Brief list of what changed
  cloudedAreaCount?: number // Number of revision clouds
  affectedSheets?: string[] // Related sheets that reference this drawing
  viewUrl: string
  downloadUrl?: string
  compareUrl?: string // URL to side-by-side comparison
  acknowledgeRequired?: boolean
  acknowledgeDeadline?: string
}

export interface DrawingSetRevisionEmailData {
  recipientName: string
  projectName: string
  setName: string
  setDescription?: string
  totalDrawings: number
  revisedDrawings: number
  newDrawings: number
  supersededDrawings: number
  revisionDate: string
  issuedBy: string
  issuedByCompany?: string
  issueReason: string // ASI, CO, Addendum, etc.
  referenceNumber?: string // ASI-001, CO-003, etc.
  revisions: Array<{
    drawingNumber: string
    drawingTitle: string
    previousRevision?: string
    newRevision: string
    action: 'revised' | 'new' | 'superseded' | 'no_change'
  }>
  viewUrl: string
  downloadAllUrl?: string
}

export interface DrawingSupersededEmailData {
  recipientName: string
  projectName: string
  supersededDrawings: Array<{
    drawingNumber: string
    drawingTitle: string
    lastRevision: string
    supersededDate: string
    replacedBy?: string // New drawing number if replaced
  }>
  supersededBy: string
  supersededByCompany?: string
  reason?: string
  viewUrl: string
}

// ============================================================================
// Color Schemes
// ============================================================================

const ALERT_COLORS = {
  revision: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  newDrawing: { bg: '#f0fdf4', border: '#16a34a', text: '#166534' },
  superseded: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
  info: { bg: '#f0f9ff', border: '#3b82f6', text: '#1e40af' },
}

// ============================================================================
// Templates
// ============================================================================

/**
 * Generate drawing revision notification email
 * Sent when a drawing is revised/updated
 */
export function generateDrawingRevisionEmail(data: DrawingRevisionEmailData): { html: string; text: string } {
  const isNewDrawing = !data.previousRevision
  const colors = isNewDrawing ? ALERT_COLORS.newDrawing : ALERT_COLORS.revision
  const headerIcon = isNewDrawing ? '+' : '&#x21BB;' // Plus or rotation arrow

  const content = `
    <h1 style="color: ${colors.border};">
      ${isNewDrawing ? 'New Drawing Issued' : 'Drawing Revision Notice'}
    </h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      ${isNewDrawing
        ? `A new drawing has been issued for the <strong>${data.projectName}</strong> project.`
        : `Drawing <strong>${data.drawingNumber}</strong> has been revised for the <strong>${data.projectName}</strong> project.`}
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span style="font-size: 28px; color: ${colors.border};">${headerIcon}</span>
        <div>
          <p style="margin: 0; font-weight: bold; font-size: 18px; color: ${colors.text};">
            ${data.drawingNumber}
          </p>
          <p style="margin: 0; color: #6b7280;">
            ${data.drawingTitle}
          </p>
        </div>
      </div>

      <table style="width: 100%; margin: 0;">
        ${data.discipline ? `
        <tr>
          <td style="width: 130px; padding: 6px 0; border: none; color: #6b7280;"><strong>Discipline:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.discipline}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 6px 0; border: none; color: #6b7280;"><strong>Revision:</strong></td>
          <td style="padding: 6px 0; border: none;">
            ${data.previousRevision
              ? `<span style="text-decoration: line-through; color: #9ca3af; margin-right: 8px;">Rev ${data.previousRevision}</span>
                 <span style="font-weight: bold; color: ${colors.text};">&#8594; Rev ${data.newRevision}</span>`
              : `<span style="font-weight: bold; color: ${colors.text};">Rev ${data.newRevision}</span>`}
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none; color: #6b7280;"><strong>Date:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.revisionDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border: none; color: #6b7280;"><strong>Uploaded by:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.uploadedBy}${data.uploadedByCompany ? ` (${data.uploadedByCompany})` : ''}</td>
        </tr>
        ${data.cloudedAreaCount ? `
        <tr>
          <td style="padding: 6px 0; border: none; color: #6b7280;"><strong>Revision Clouds:</strong></td>
          <td style="padding: 6px 0; border: none;">${data.cloudedAreaCount} area${data.cloudedAreaCount !== 1 ? 's' : ''} marked</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${data.revisionDescription ? `
    <h2 style="font-size: 16px; margin-top: 24px;">Revision Description</h2>
    <p style="background-color: #f9fafb; padding: 12px; border-radius: 8px; margin: 8px 0;">
      ${data.revisionDescription}
    </p>
    ` : ''}

    ${data.changedAreas && data.changedAreas.length > 0 ? `
    <h2 style="font-size: 16px; margin-top: 24px;">Changed Areas</h2>
    <ul style="margin: 8px 0; padding-left: 24px;">
      ${data.changedAreas.map(area => `<li>${area}</li>`).join('')}
    </ul>
    ` : ''}

    ${data.affectedSheets && data.affectedSheets.length > 0 ? `
    <div style="background-color: ${ALERT_COLORS.info.bg}; padding: 12px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-weight: bold; color: ${ALERT_COLORS.info.text};">Affected Sheets</p>
      <p style="margin: 8px 0 0; color: ${ALERT_COLORS.info.text};">
        The following sheets reference this drawing and may be impacted:
      </p>
      <p style="margin: 8px 0 0; color: ${ALERT_COLORS.info.text};">
        ${data.affectedSheets.join(', ')}
      </p>
    </div>
    ` : ''}

    ${data.acknowledgeRequired ? `
    <div style="background-color: ${ALERT_COLORS.revision.bg}; border: 2px solid ${ALERT_COLORS.revision.border}; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-weight: bold; color: ${ALERT_COLORS.revision.text};">Acknowledgment Required</p>
      <p style="margin: 8px 0 0; color: ${ALERT_COLORS.revision.text};">
        Please review and acknowledge receipt of this revised drawing.
        ${data.acknowledgeDeadline ? `<br><strong>Deadline:</strong> ${data.acknowledgeDeadline}` : ''}
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Drawing
      </a>
      ${data.downloadUrl ? `
      <a href="${data.downloadUrl}" class="button button-secondary" style="margin-left: 8px;">
        Download
      </a>
      ` : ''}
    </div>

    ${data.compareUrl ? `
    <p style="text-align: center; margin-top: 16px;">
      <a href="${data.compareUrl}" style="color: #3b82f6; text-decoration: underline;">
        Compare with previous revision
      </a>
    </p>
    ` : ''}

    <p style="background-color: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 24px; font-size: 14px; color: #92400e;">
      <strong>Important:</strong> Please ensure you are using the latest revision of this drawing.
      Using outdated drawings can lead to construction errors and costly rework.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: isNewDrawing
      ? `New Drawing: ${data.drawingNumber} - ${data.projectName}`
      : `Drawing Revised: ${data.drawingNumber} now Rev ${data.newRevision} - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate drawing set revision notification email
 * Sent when multiple drawings are issued together (ASI, Addendum, etc.)
 */
export function generateDrawingSetRevisionEmail(data: DrawingSetRevisionEmailData): { html: string; text: string } {
  const content = `
    <h1 style="color: #2563eb;">Drawing Set Issued</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A drawing set has been issued for the <strong>${data.projectName}</strong> project.
    </p>

    <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Set Name:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.setName}</td>
        </tr>
        ${data.referenceNumber ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Reference:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.referenceNumber}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Issue Reason:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #dbeafe; color: #1e40af; font-size: 12px;">
              ${data.issueReason}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Issue Date:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.revisionDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Issued by:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.issuedBy}${data.issuedByCompany ? ` (${data.issuedByCompany})` : ''}</td>
        </tr>
      </table>
    </div>

    ${data.setDescription ? `
    <p style="background-color: #f9fafb; padding: 12px; border-radius: 8px;">
      ${data.setDescription}
    </p>
    ` : ''}

    <h2 style="font-size: 16px; margin-top: 24px;">Summary</h2>
    <div style="display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 100px; background-color: #f0f9ff; padding: 12px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #2563eb;">${data.totalDrawings}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Total</p>
      </div>
      ${data.revisedDrawings > 0 ? `
      <div style="flex: 1; min-width: 100px; background-color: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">${data.revisedDrawings}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Revised</p>
      </div>
      ` : ''}
      ${data.newDrawings > 0 ? `
      <div style="flex: 1; min-width: 100px; background-color: #f0fdf4; padding: 12px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #16a34a;">${data.newDrawings}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">New</p>
      </div>
      ` : ''}
      ${data.supersededDrawings > 0 ? `
      <div style="flex: 1; min-width: 100px; background-color: #fef2f2; padding: 12px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #dc2626;">${data.supersededDrawings}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Superseded</p>
      </div>
      ` : ''}
    </div>

    <h2 style="font-size: 16px; margin-top: 24px;">Drawings</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Drawing</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Title</th>
          <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e5e7eb;">Revision</th>
          <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e5e7eb;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${data.revisions.slice(0, 15).map(rev => {
          const actionColors: Record<string, { bg: string; text: string }> = {
            revised: { bg: '#fef3c7', text: '#92400e' },
            new: { bg: '#f0fdf4', text: '#166534' },
            superseded: { bg: '#fef2f2', text: '#7f1d1d' },
            no_change: { bg: '#f3f4f6', text: '#6b7280' },
          }
          const colors = actionColors[rev.action] || actionColors.no_change
          const actionLabel = rev.action.replace('_', ' ')
          return `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${rev.drawingNumber}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${rev.drawingTitle}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              ${rev.previousRevision ? `<span style="text-decoration: line-through; color: #9ca3af;">${rev.previousRevision}</span> → ` : ''}
              <strong>${rev.newRevision}</strong>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${colors.bg}; color: ${colors.text}; font-size: 12px; text-transform: capitalize;">
                ${actionLabel}
              </span>
            </td>
          </tr>
          `
        }).join('')}
        ${data.revisions.length > 15 ? `
        <tr>
          <td colspan="4" style="padding: 12px; text-align: center; color: #6b7280; font-style: italic;">
            ...and ${data.revisions.length - 15} more drawings
          </td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Drawing Set
      </a>
      ${data.downloadAllUrl ? `
      <a href="${data.downloadAllUrl}" class="button button-secondary" style="margin-left: 8px;">
        Download All
      </a>
      ` : ''}
    </div>

    <p style="background-color: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 24px; font-size: 14px; color: #92400e;">
      <strong>Action Required:</strong> Review the revised drawings and update your records.
      Remove or mark outdated prints to prevent using superseded information.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Drawing Set Issued: ${data.setName} - ${data.revisedDrawings} revised, ${data.newDrawings} new - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate superseded drawings alert email
 * Sent when drawings are marked as superseded/voided
 */
export function generateSupersededDrawingsEmail(data: DrawingSupersededEmailData): { html: string; text: string } {
  const colors = ALERT_COLORS.superseded

  const content = `
    <h1 style="color: ${colors.border};">Drawings Superseded</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      The following drawings have been <strong style="color: ${colors.border};">superseded</strong>
      for the <strong>${data.projectName}</strong> project and should no longer be used.
    </p>

    <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: ${colors.text};">
        DO NOT USE - SUPERSEDED
      </p>
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        The drawings listed below have been superseded.
        Remove them from active use immediately to prevent construction errors.
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background-color: #fef2f2;">
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Drawing</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Title</th>
          <th style="text-align: center; padding: 8px; border-bottom: 2px solid #e5e7eb;">Last Rev</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Replaced By</th>
        </tr>
      </thead>
      <tbody>
        ${data.supersededDrawings.map(drawing => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${colors.text}; text-decoration: line-through;">
            ${drawing.drawingNumber}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
            ${drawing.drawingTitle}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${drawing.lastRevision}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            ${drawing.replacedBy
              ? `<span style="color: #16a34a;">${drawing.replacedBy}</span>`
              : '<span style="color: #6b7280;">-</span>'}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="background-color: #f9fafb; padding: 12px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px;">
        <strong>Superseded by:</strong> ${data.supersededBy}${data.supersededByCompany ? ` (${data.supersededByCompany})` : ''}
      </p>
      ${data.reason ? `
      <p style="margin: 8px 0 0; font-size: 14px;">
        <strong>Reason:</strong> ${data.reason}
      </p>
      ` : ''}
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View Current Drawings
      </a>
    </div>

    <p style="background-color: #fef2f2; padding: 12px; border-radius: 8px; margin-top: 24px; font-size: 14px; color: ${colors.text};">
      <strong>Action Required:</strong> Mark or destroy all physical and digital copies of the superseded drawings.
      Using outdated drawings can result in costly construction errors and rework.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `SUPERSEDED: ${data.supersededDrawings.length} drawing${data.supersededDrawings.length !== 1 ? 's' : ''} no longer valid - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
