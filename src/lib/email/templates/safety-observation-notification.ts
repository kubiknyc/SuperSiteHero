/**
 * Safety Observation Notification Email Template
 *
 * Sent when:
 * - Critical/high severity observations are reported
 * - Corrective actions are assigned
 * - Positive recognition is given
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

// ============================================================================
// Critical Observation Alert
// ============================================================================

export interface CriticalObservationEmailData {
  recipientName: string
  observationNumber: string
  observationType: string
  severity: string
  title: string
  description: string
  location: string
  observedAt: string
  observerName: string
  projectName: string
  category: string
  viewUrl: string
}

export function generateCriticalObservationEmail(
  data: CriticalObservationEmailData
): { html: string; text: string } {
  const severityColors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#6b7280',
  }

  const severityColor = severityColors[data.severity.toLowerCase()] || '#6b7280'

  const content = `
    <h1>Safety Observation Alert</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A <strong style="color: ${severityColor};">${data.severity.toUpperCase()}</strong> severity
      ${data.observationType.replace('_', ' ')} observation has been reported on
      <strong>${data.projectName}</strong>.
    </p>

    <div class="danger-box">
      <h2 style="margin-top: 0; color: ${severityColor};">${data.title}</h2>
      <p style="margin-bottom: 0;">${data.description}</p>
    </div>

    <table class="data-table">
      <tr>
        <td style="width: 140px;"><strong>Observation #:</strong></td>
        <td>${data.observationNumber}</td>
      </tr>
      <tr>
        <td><strong>Type:</strong></td>
        <td>${data.observationType.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</td>
      </tr>
      <tr>
        <td><strong>Category:</strong></td>
        <td>${data.category.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</td>
      </tr>
      <tr>
        <td><strong>Location:</strong></td>
        <td>${data.location || 'Not specified'}</td>
      </tr>
      <tr>
        <td><strong>Observed:</strong></td>
        <td>${data.observedAt}</td>
      </tr>
      <tr>
        <td><strong>Reported By:</strong></td>
        <td>${data.observerName}</td>
      </tr>
    </table>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button button-danger">
        View Observation Details
      </a>
    </p>

    <p class="muted text-small" style="margin-top: 24px;">
      This alert was sent because a ${data.severity} severity safety observation was reported.
      Please review and take appropriate action as needed.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${data.severity.toUpperCase()} Safety Observation: ${data.title}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

// ============================================================================
// Corrective Action Assigned
// ============================================================================

export interface CorrectiveActionAssignedEmailData {
  recipientName: string
  observationNumber: string
  title: string
  description: string
  correctiveAction: string
  dueDate: string
  projectName: string
  assignedBy: string
  viewUrl: string
}

export function generateCorrectiveActionAssignedEmail(
  data: CorrectiveActionAssignedEmailData
): { html: string; text: string } {
  const content = `
    <h1>Corrective Action Assigned</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      You have been assigned a corrective action for a safety observation on
      <strong>${data.projectName}</strong>.
    </p>

    <div class="warning-box">
      <h2 style="margin-top: 0;">Observation: ${data.title}</h2>
      <p>${data.description}</p>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #1e40af;">Required Action</h3>
      <p style="margin-bottom: 0;">${data.correctiveAction}</p>
    </div>

    <table class="data-table">
      <tr>
        <td style="width: 140px;"><strong>Observation #:</strong></td>
        <td>${data.observationNumber}</td>
      </tr>
      <tr>
        <td><strong>Due Date:</strong></td>
        <td style="color: #ea580c; font-weight: bold;">${data.dueDate || 'Not specified'}</td>
      </tr>
      <tr>
        <td><strong>Assigned By:</strong></td>
        <td>${data.assignedBy}</td>
      </tr>
    </table>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View & Take Action
      </a>
    </p>

    <p class="muted text-small" style="margin-top: 24px;">
      Please complete this corrective action by the due date. Once complete,
      update the observation with your resolution notes.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Action Required: ${data.title}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

// ============================================================================
// Positive Recognition Notification
// ============================================================================

export interface PositiveRecognitionEmailData {
  recipientName: string
  observationNumber: string
  recognizedPerson: string
  recognizedCompany: string
  observationType: string
  title: string
  description: string
  recognitionMessage: string
  observerName: string
  projectName: string
  viewUrl: string
}

export function generatePositiveRecognitionEmail(
  data: PositiveRecognitionEmailData
): { html: string; text: string } {
  const content = `
    <h1 style="color: #16a34a;">Safety Recognition</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Great news! <strong>${data.recognizedPerson}</strong>
      ${data.recognizedCompany ? `from <strong>${data.recognizedCompany}</strong>` : ''}
      has been recognized for demonstrating excellent safety practices on
      <strong>${data.projectName}</strong>.
    </p>

    <div class="success-box">
      <h2 style="margin-top: 0; color: #166534;">${data.title}</h2>
      <p>${data.description}</p>
      ${data.recognitionMessage ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #bbf7d0;">
          <p style="margin: 0; font-style: italic;">"${data.recognitionMessage}"</p>
          <p style="margin: 8px 0 0 0; font-size: 12px;">- ${data.observerName}</p>
        </div>
      ` : ''}
    </div>

    <table class="data-table">
      <tr>
        <td style="width: 140px;"><strong>Observation #:</strong></td>
        <td>${data.observationNumber}</td>
      </tr>
      <tr>
        <td><strong>Type:</strong></td>
        <td>${data.observationType.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</td>
      </tr>
      <tr>
        <td><strong>Recognized By:</strong></td>
        <td>${data.observerName}</td>
      </tr>
    </table>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button button-success">
        View Recognition
      </a>
    </p>

    <p class="muted text-small" style="margin-top: 24px; text-align: center;">
      Thank you for contributing to a safe work environment!
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Safety Recognition: ${data.recognizedPerson} recognized for ${data.title}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

// ============================================================================
// Observation Resolved Notification
// ============================================================================

export interface ObservationResolvedEmailData {
  recipientName: string
  observationNumber: string
  title: string
  resolutionNotes: string
  resolvedBy: string
  resolvedAt: string
  projectName: string
  viewUrl: string
}

export function generateObservationResolvedEmail(
  data: ObservationResolvedEmailData
): { html: string; text: string } {
  const content = `
    <h1>Observation Resolved</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A safety observation you reported or are following on <strong>${data.projectName}</strong>
      has been resolved.
    </p>

    <div class="success-box">
      <h2 style="margin-top: 0; color: #166534;">${data.title}</h2>
      <p><strong>Resolution Notes:</strong></p>
      <p style="margin-bottom: 0;">${data.resolutionNotes}</p>
    </div>

    <table class="data-table">
      <tr>
        <td style="width: 140px;"><strong>Observation #:</strong></td>
        <td>${data.observationNumber}</td>
      </tr>
      <tr>
        <td><strong>Resolved By:</strong></td>
        <td>${data.resolvedBy}</td>
      </tr>
      <tr>
        <td><strong>Resolved On:</strong></td>
        <td>${data.resolvedAt}</td>
      </tr>
    </table>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button button-success">
        View Resolution Details
      </a>
    </p>

    <p class="muted text-small" style="margin-top: 24px;">
      Thank you for helping to maintain a safe work environment.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Resolved: ${data.title}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

// ============================================================================
// Weekly Safety Summary (for supervisors)
// ============================================================================

export interface WeeklySafetySummaryEmailData {
  recipientName: string
  projectName: string
  weekStart: string
  weekEnd: string
  totalObservations: number
  safeBehaviors: number
  unsafeConditions: number
  nearMisses: number
  bestPractices: number
  pendingActions: number
  resolvedActions: number
  topObservers: { name: string; points: number }[]
  criticalItems: { title: string; severity: string; status: string }[]
  dashboardUrl: string
}

export function generateWeeklySafetySummaryEmail(
  data: WeeklySafetySummaryEmailData
): { html: string; text: string } {
  const topObserversHtml = data.topObservers
    .slice(0, 5)
    .map(
      (observer, index) => `
      <tr>
        <td style="padding: 8px 12px;">#${index + 1}</td>
        <td style="padding: 8px 12px;">${observer.name}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: bold;">${observer.points} pts</td>
      </tr>
    `
    )
    .join('')

  const criticalItemsHtml =
    data.criticalItems.length > 0
      ? data.criticalItems
          .map(
            (item) => `
        <tr>
          <td style="padding: 8px 12px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${
              item.severity === 'critical' ? '#fecaca' : '#fed7aa'
            }; color: ${item.severity === 'critical' ? '#991b1b' : '#c2410c'}; font-size: 12px;">
              ${item.severity.toUpperCase()}
            </span>
          </td>
          <td style="padding: 8px 12px;">${item.title}</td>
          <td style="padding: 8px 12px;">${item.status}</td>
        </tr>
      `
          )
          .join('')
      : '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #16a34a;">No critical items this week!</td></tr>'

  const content = `
    <h1>Weekly Safety Summary</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Here's your safety observation summary for <strong>${data.projectName}</strong>
      from ${data.weekStart} to ${data.weekEnd}.
    </p>

    <!-- Stats Grid -->
    <table style="width: 100%; margin: 24px 0;">
      <tr>
        <td style="width: 25%; text-align: center; padding: 16px; background-color: #f1f5f9; border-radius: 8px;">
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1e293b;">${data.totalObservations}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Total Observations</p>
        </td>
        <td style="width: 5%;"></td>
        <td style="width: 25%; text-align: center; padding: 16px; background-color: #dcfce7; border-radius: 8px;">
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: #166534;">${data.safeBehaviors}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #166534;">Safe Behaviors</p>
        </td>
        <td style="width: 5%;"></td>
        <td style="width: 25%; text-align: center; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: #92400e;">${data.unsafeConditions}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #92400e;">Unsafe Conditions</p>
        </td>
      </tr>
    </table>

    <table style="width: 100%; margin: 24px 0;">
      <tr>
        <td style="width: 30%; text-align: center; padding: 16px; background-color: #fef9c3; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #854d0e;">${data.nearMisses}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #854d0e;">Near Misses</p>
        </td>
        <td style="width: 5%;"></td>
        <td style="width: 30%; text-align: center; padding: 16px; background-color: #dbeafe; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1e40af;">${data.bestPractices}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #1e40af;">Best Practices</p>
        </td>
        <td style="width: 5%;"></td>
        <td style="width: 30%; text-align: center; padding: 16px; background-color: #fee2e2; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #991b1b;">${data.pendingActions}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #991b1b;">Pending Actions</p>
        </td>
      </tr>
    </table>

    <!-- Critical Items -->
    <h2 style="margin-top: 32px;">Critical & High Severity Items</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Severity</th>
          <th>Title</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${criticalItemsHtml}
      </tbody>
    </table>

    <!-- Top Observers -->
    <h2 style="margin-top: 32px;">Top Observers This Week</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th style="text-align: right;">Points</th>
        </tr>
      </thead>
      <tbody>
        ${topObserversHtml}
      </tbody>
    </table>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.dashboardUrl}" class="button">
        View Full Dashboard
      </a>
    </p>

    <p class="muted text-small" style="margin-top: 24px;">
      This summary is sent weekly to help you track safety performance.
      You can adjust your notification preferences in settings.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Weekly Safety Summary: ${data.totalObservations} observations on ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
