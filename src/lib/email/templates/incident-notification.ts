/**
 * Safety Incident Notification Email Template
 *
 * Sent when a serious safety incident is reported.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface IncidentNotificationEmailData {
  recipientName: string
  incidentNumber: string
  severity: 'near_miss' | 'first_aid' | 'medical_treatment' | 'lost_time' | 'fatality'
  incidentType: string
  projectName: string
  location: string
  incidentDate: string
  incidentTime?: string
  description: string
  reportedBy: string
  viewUrl: string
}

const SEVERITY_CONFIG: Record<string, { label: string; boxClass: string; color: string }> = {
  near_miss: { label: 'Near Miss', boxClass: 'success-box', color: '#16a34a' },
  first_aid: { label: 'First Aid', boxClass: 'warning-box', color: '#f59e0b' },
  medical_treatment: { label: 'Medical Treatment', boxClass: 'warning-box', color: '#f97316' },
  lost_time: { label: 'Lost Time', boxClass: 'danger-box', color: '#dc2626' },
  fatality: { label: 'Fatality', boxClass: 'danger-box', color: '#7c2d12' },
}

export function generateIncidentNotificationEmail(data: IncidentNotificationEmailData): { html: string; text: string } {
  const severityConfig = SEVERITY_CONFIG[data.severity] || SEVERITY_CONFIG.near_miss
  const isSeriousIncident = ['medical_treatment', 'lost_time', 'fatality'].includes(data.severity)

  const content = `
    <h1 style="color: ${severityConfig.color};">
      ⚠️ Safety Incident Reported
    </h1>

    <p>Hi ${data.recipientName},</p>

    ${isSeriousIncident ? `
    <div class="danger-box">
      <p style="margin: 0; font-weight: bold;">
        A <strong>${severityConfig.label}</strong> incident has been reported on
        the ${data.projectName} project. Immediate attention may be required.
      </p>
    </div>
    ` : `
    <p>
      A safety incident has been reported on the <strong>${data.projectName}</strong> project.
    </p>
    `}

    <table class="data-table">
      <tr>
        <td style="width: 140px;"><strong>Incident #:</strong></td>
        <td>${data.incidentNumber}</td>
      </tr>
      <tr>
        <td><strong>Severity:</strong></td>
        <td>
          <span style="
            display: inline-block;
            background-color: ${severityConfig.color};
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          ">
            ${severityConfig.label.toUpperCase()}
          </span>
        </td>
      </tr>
      <tr>
        <td><strong>Type:</strong></td>
        <td>${data.incidentType}</td>
      </tr>
      <tr>
        <td><strong>Project:</strong></td>
        <td>${data.projectName}</td>
      </tr>
      <tr>
        <td><strong>Location:</strong></td>
        <td>${data.location}</td>
      </tr>
      <tr>
        <td><strong>Date/Time:</strong></td>
        <td>${data.incidentDate}${data.incidentTime ? ` at ${data.incidentTime}` : ''}</td>
      </tr>
      <tr>
        <td><strong>Reported By:</strong></td>
        <td>${data.reportedBy}</td>
      </tr>
    </table>

    <div class="info-box">
      <p style="margin: 0;"><strong>Description:</strong></p>
      <p style="margin: 8px 0 0 0;">${data.description}</p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button button-danger">
        View Full Incident Report
      </a>
    </p>

    ${isSeriousIncident ? `
    <p class="muted text-small" style="text-align: center; margin-top: 24px;">
      This notification was automatically sent because the incident severity
      (${severityConfig.label}) requires immediate attention.
    </p>
    ` : ''}
  `

  const html = wrapInBaseTemplate({
    preheader: `Safety Alert: ${severityConfig.label} incident reported - ${data.incidentNumber}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
