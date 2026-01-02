/**
 * Daily Report Alert Email Templates
 *
 * Email templates for missing daily report notifications.
 * Essential for construction project documentation compliance.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface DailyReportMissingEmailData {
  recipientName: string
  projectName: string
  missingDate: string
  daysMissing: number
  lastReportDate?: string
  lastReportBy?: string
  viewUrl: string
  createUrl: string
}

export interface DailyReportSummaryEmailData {
  recipientName: string
  projectName: string
  projectId: string
  periodStart: string
  periodEnd: string
  totalDays: number
  reportedDays: number
  missingDays: number
  missingDates: string[]
  viewAllUrl: string
  compliancePercentage: number
}

export interface MultiProjectReportSummaryEmailData {
  recipientName: string
  projects: Array<{
    name: string
    projectId: string
    reportedDays: number
    missingDays: number
    compliancePercentage: number
    viewUrl: string
  }>
  periodStart: string
  periodEnd: string
  overallCompliance: number
}

const ALERT_COLORS = {
  warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  critical: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
  success: { bg: '#f0fdf4', border: '#16a34a', text: '#166534' },
}

/**
 * Generate daily report missing alert email
 */
export function generateDailyReportMissingEmail(data: DailyReportMissingEmailData): { html: string; text: string } {
  const isCritical = data.daysMissing >= 3
  const colors = isCritical ? ALERT_COLORS.critical : ALERT_COLORS.warning

  const urgencyMessage = isCritical
    ? `Daily reports for <strong>${data.daysMissing} days</strong> are missing. Immediate action required.`
    : data.daysMissing === 1
    ? `Yesterday's daily report is missing. Please submit it today.`
    : `Daily reports for <strong>${data.daysMissing} days</strong> are missing. Please complete them promptly.`

  const content = `
    <h1 style="color: ${colors.border};">Daily Report Missing</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A daily report is missing for the <strong>${data.projectName}</strong> project.
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        ${urgencyMessage}
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Missing Date:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.missingDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days Missing:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.daysMissing}</td>
        </tr>
        ${data.lastReportDate ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Last Report:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.lastReportDate} ${data.lastReportBy ? `by ${data.lastReportBy}` : ''}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.createUrl}" class="button" style="background-color: ${colors.border};">
        Create Daily Report
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or <a href="${data.viewUrl}">view all daily reports</a>
    </p>

    <p style="background-color: #f0f9ff; padding: 12px; border-radius: 8px; font-size: 14px; color: #1e40af;">
      <strong>Why Daily Reports Matter:</strong> Daily reports document weather conditions, manpower,
      equipment, and work performed. They're essential for project documentation, delay claims,
      and compliance with contract requirements.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Daily Report Missing: ${data.projectName} - ${data.missingDate}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate daily report compliance summary email
 */
export function generateDailyReportSummaryEmail(data: DailyReportSummaryEmailData): { html: string; text: string } {
  const isCompliant = data.compliancePercentage >= 90
  const isWarning = data.compliancePercentage >= 70 && data.compliancePercentage < 90
  const colors = isCompliant ? ALERT_COLORS.success : isWarning ? ALERT_COLORS.warning : ALERT_COLORS.critical

  const content = `
    <h1 style="color: ${colors.border};">Daily Report Summary - ${data.projectName}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Here's your daily report compliance summary for <strong>${data.projectName}</strong>
      from ${data.periodStart} to ${data.periodEnd}.
    </p>

    <div style="display: flex; gap: 16px; margin: 24px 0;">
      <div style="flex: 1; background-color: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #16a34a;">
          ${data.reportedDays}
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Days Reported</p>
      </div>
      <div style="flex: 1; background-color: ${data.missingDays > 0 ? '#fef2f2' : '#f0fdf4'}; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: ${data.missingDays > 0 ? '#dc2626' : '#16a34a'};">
          ${data.missingDays}
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Days Missing</p>
      </div>
      <div style="flex: 1; background-color: ${colors.bg}; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: ${colors.text};">
          ${data.compliancePercentage}%
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Compliance</p>
      </div>
    </div>

    ${data.missingDates.length > 0 ? `
    <h2 style="color: #dc2626; font-size: 18px; margin-top: 32px;">Missing Dates</h2>
    <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px;">
      <p style="margin: 0; color: #7f1d1d;">
        ${data.missingDates.join(', ')}
      </p>
    </div>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewAllUrl}" class="button">
        View All Daily Reports
      </a>
    </p>

    <p class="muted text-small">
      This is an automated summary. Daily reports should be completed every work day for proper project documentation.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Daily Report Summary: ${data.compliancePercentage}% compliance - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate multi-project daily report summary email (for PMs managing multiple projects)
 */
export function generateMultiProjectReportSummaryEmail(data: MultiProjectReportSummaryEmailData): { html: string; text: string } {
  const isCompliant = data.overallCompliance >= 90
  const isWarning = data.overallCompliance >= 70 && data.overallCompliance < 90
  const headerColor = isCompliant ? '#16a34a' : isWarning ? '#f59e0b' : '#dc2626'

  const content = `
    <h1 style="color: ${headerColor};">Daily Report Compliance Summary</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Here's your daily report compliance summary across all projects
      from ${data.periodStart} to ${data.periodEnd}.
    </p>

    <div style="background-color: ${isCompliant ? '#f0fdf4' : isWarning ? '#fef3c7' : '#fef2f2'}; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Overall Compliance</p>
      <p style="margin: 8px 0 0; font-size: 48px; font-weight: bold; color: ${headerColor};">
        ${data.overallCompliance}%
      </p>
    </div>

    <h2 style="font-size: 18px; margin-top: 32px;">Project Breakdown</h2>
    <table class="data-table" style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align: left;">Project</th>
          <th style="text-align: center;">Reported</th>
          <th style="text-align: center;">Missing</th>
          <th style="text-align: center;">Compliance</th>
          <th style="text-align: center;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${data.projects.map(project => {
          const pIsCompliant = project.compliancePercentage >= 90
          const pIsWarning = project.compliancePercentage >= 70 && project.compliancePercentage < 90
          const pColor = pIsCompliant ? '#16a34a' : pIsWarning ? '#f59e0b' : '#dc2626'
          return `
          <tr>
            <td style="font-weight: bold;">${project.name}</td>
            <td style="text-align: center;">${project.reportedDays}</td>
            <td style="text-align: center; color: ${project.missingDays > 0 ? '#dc2626' : 'inherit'};">${project.missingDays}</td>
            <td style="text-align: center; color: ${pColor}; font-weight: bold;">${project.compliancePercentage}%</td>
            <td style="text-align: center;">
              <a href="${project.viewUrl}" style="color: #2563eb; text-decoration: underline;">View</a>
            </td>
          </tr>
          `
        }).join('')}
      </tbody>
    </table>

    <p class="muted text-small" style="margin-top: 24px;">
      This is an automated summary. You can adjust your notification preferences in your account settings.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Daily Report Summary: ${data.overallCompliance}% overall compliance across ${data.projects.length} projects`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
