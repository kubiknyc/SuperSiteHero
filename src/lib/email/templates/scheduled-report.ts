/**
 * Scheduled Report Email Template
 *
 * Sent when a scheduled report is generated and delivered.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface ScheduledReportEmailData {
    recipientName: string
    reportName: string
    templateName: string
    frequency: string
    projectName?: string
    dateRange?: {
        from: string
        to: string
    }
    recordCount: number
    format: string
    viewUrl?: string
    downloadUrl?: string
}

const FORMAT_LABELS: Record<string, string> = {
    pdf: 'PDF Document',
    excel: 'Excel Spreadsheet',
    csv: 'CSV File',
}

const FREQUENCY_LABELS: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    bi_weekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
}

export function generateScheduledReportEmail(data: ScheduledReportEmailData): { html: string; text: string } {
    const formatLabel = FORMAT_LABELS[data.format] || data.format.toUpperCase()
    const frequencyLabel = FREQUENCY_LABELS[data.frequency] || data.frequency

    const content = `
    <h1>Scheduled Report Delivery</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Your scheduled report <strong>${data.reportName}</strong> is ready.
      ${data.projectName ? `This report is for the <strong>${data.projectName}</strong> project.` : ''}
    </p>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>Report Name:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.reportName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Template:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.templateName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Schedule:</strong></td>
          <td style="padding: 8px 0; border: none;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #3b82f6; color: white; font-size: 12px;">
              ${frequencyLabel}
            </span>
          </td>
        </tr>
        ${data.dateRange ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Date Range:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.dateRange.from} - ${data.dateRange.to}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Records:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.recordCount.toLocaleString()} record${data.recordCount !== 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Format:</strong></td>
          <td style="padding: 8px 0; border: none;">${formatLabel}</td>
        </tr>
      </table>
    </div>

    <div class="success-box">
      <p style="margin: 0;">
        <strong>📎 Attachment:</strong> Your report is attached to this email as a ${formatLabel}.
      </p>
    </div>

    ${data.viewUrl ? `
    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button">
        View in JobSight
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>
    ` : ''}

    <p class="muted text-small" style="margin-top: 24px;">
      This is an automated report delivery. To manage your scheduled reports,
      visit the Reports section in JobSight.
    </p>
  `

    const html = wrapInBaseTemplate({
        preheader: `Your scheduled report "${data.reportName}" is ready with ${data.recordCount} records`,
        content,
    })

    const text = generatePlainText(content)

    return { html, text }
}
