/**
 * Change Order Aging Alert Email Templates
 *
 * Email templates for change order aging alerts and budget threshold notifications.
 * Construction industry typically expects CO decisions within 7-14 days.
 */

import { wrapInBaseTemplate, generatePlainText } from './base-template'

export interface ChangeOrderAgingAlertEmailData {
  recipientName: string
  changeOrderNumber: string
  title: string
  projectName: string
  status: string
  daysInStatus: number
  amount: string
  submittedDate: string
  ballInCourt?: string
  viewUrl: string
  isUrgent: boolean // > 14 days
  isCritical: boolean // > 30 days
}

export interface ChangeOrderBudgetAlertEmailData {
  recipientName: string
  projectName: string
  projectId: string
  originalContractAmount: string
  approvedChanges: string
  pendingChanges: string
  currentContractAmount: string
  remainingContingency: string
  contingencyPercentUsed: number
  thresholdBreached: 'warning' | 'critical' | 'exceeded'
  viewUrl: string
}

export interface ChangeOrderAgingSummaryEmailData {
  recipientName: string
  projectName: string
  projectId: string
  pendingCount: number
  totalPendingAmount: string
  avgDaysInProcess: number
  overdueCount: number
  criticalItems: Array<{
    number: string
    title: string
    amount: string
    daysInStatus: number
    status: string
    viewUrl: string
  }>
  viewAllUrl: string
}

const AGING_COLORS = {
  normal: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  urgent: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  critical: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
}

const BUDGET_COLORS = {
  warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },    // 50-75%
  critical: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },   // 75-100%
  exceeded: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },   // > 100%
}

/**
 * Generate change order aging alert email
 */
export function generateChangeOrderAgingAlertEmail(data: ChangeOrderAgingAlertEmailData): { html: string; text: string } {
  const colors = data.isCritical ? AGING_COLORS.critical : data.isUrgent ? AGING_COLORS.urgent : AGING_COLORS.normal

  const urgencyMessage = data.isCritical
    ? `This change order has been pending for <strong>${data.daysInStatus} days</strong>! This significantly impacts cash flow and project progress.`
    : data.isUrgent
    ? `This change order has been pending for <strong>${data.daysInStatus} days</strong>. Timely decisions help maintain project momentum.`
    : `This change order has been pending for <strong>${data.daysInStatus} days</strong>.`

  const statusLabel = data.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  const content = `
    <h1 style="color: ${colors.border};">${data.isCritical ? 'CRITICAL: ' : data.isUrgent ? 'URGENT: ' : ''}Change Order Pending</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      A change order on the <strong>${data.projectName}</strong> project requires attention.
    </p>

    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        ${urgencyMessage}
      </p>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 140px; padding: 8px 0; border: none;"><strong>CO Number:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.changeOrderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Title:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.title}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Amount:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Status:</strong></td>
          <td style="padding: 8px 0; border: none;">${statusLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Days Pending:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.daysInStatus}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.submittedDate}</td>
        </tr>
        ${data.ballInCourt ? `
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Ball in Court:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.ballInCourt}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        Review Change Order
      </a>
    </p>

    <p class="muted text-small" style="text-align: center;">
      Or copy this link: ${data.viewUrl}
    </p>

    <p style="background-color: #f0f9ff; padding: 12px; border-radius: 8px; font-size: 14px; color: #1e40af;">
      <strong>Industry Standard:</strong> Most construction contracts require change order decisions within 7-14 days.
      Delayed decisions can impact project cash flow, subcontractor relationships, and schedule.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `${data.isCritical ? 'CRITICAL: ' : data.isUrgent ? 'URGENT: ' : ''}CO ${data.changeOrderNumber} pending ${data.daysInStatus} days - ${data.amount}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate change order budget threshold alert email
 */
export function generateChangeOrderBudgetAlertEmail(data: ChangeOrderBudgetAlertEmailData): { html: string; text: string } {
  const colors = BUDGET_COLORS[data.thresholdBreached]

  const thresholdMessage = data.thresholdBreached === 'exceeded'
    ? `Change orders have <strong>exceeded</strong> the project contingency! Budget overrun requires immediate attention.`
    : data.thresholdBreached === 'critical'
    ? `Change orders have used <strong>${data.contingencyPercentUsed}%</strong> of contingency. Critical threshold reached.`
    : `Change orders have used <strong>${data.contingencyPercentUsed}%</strong> of contingency. Approaching limit.`

  const thresholdLabel = data.thresholdBreached === 'exceeded' ? 'EXCEEDED' : data.thresholdBreached === 'critical' ? 'CRITICAL' : 'WARNING'

  const content = `
    <h1 style="color: ${colors.border};">Contingency ${thresholdLabel}: ${data.projectName}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      The change order budget for <strong>${data.projectName}</strong> has reached a significant threshold.
    </p>

    <div style="background-color: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: ${colors.text};">
        ${thresholdMessage}
      </p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; padding: 20px 40px; background-color: ${colors.bg}; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Contingency Used</p>
        <p style="margin: 8px 0 0; font-size: 48px; font-weight: bold; color: ${colors.border};">
          ${data.contingencyPercentUsed}%
        </p>
      </div>
    </div>

    <div class="info-box">
      <table class="data-table" style="margin: 0;">
        <tr>
          <td style="width: 180px; padding: 8px 0; border: none;"><strong>Original Contract:</strong></td>
          <td style="padding: 8px 0; border: none;">${data.originalContractAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Approved Changes:</strong></td>
          <td style="padding: 8px 0; border: none; color: #dc2626;">${data.approvedChanges}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Pending Changes:</strong></td>
          <td style="padding: 8px 0; border: none; color: #f59e0b;">${data.pendingChanges}</td>
        </tr>
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 8px 0; border: none;"><strong>Current Contract:</strong></td>
          <td style="padding: 8px 0; border: none; font-weight: bold;">${data.currentContractAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border: none;"><strong>Remaining Contingency:</strong></td>
          <td style="padding: 8px 0; border: none; color: ${colors.text}; font-weight: bold;">${data.remainingContingency}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewUrl}" class="button" style="background-color: ${colors.border};">
        Review Change Orders
      </a>
    </p>

    <p class="muted text-small">
      Monitor contingency usage closely. Early warning enables proactive client communication and budget management.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `Contingency ${thresholdLabel}: ${data.contingencyPercentUsed}% used - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}

/**
 * Generate change order aging summary email (weekly digest)
 */
export function generateChangeOrderAgingSummaryEmail(data: ChangeOrderAgingSummaryEmailData): { html: string; text: string } {
  const hasOverdue = data.overdueCount > 0
  const headerColor = hasOverdue ? '#dc2626' : '#3b82f6'

  const content = `
    <h1 style="color: ${headerColor};">Change Order Summary - ${data.projectName}</h1>

    <p>Hi ${data.recipientName},</p>

    <p>
      Here's your change order status summary for <strong>${data.projectName}</strong>.
    </p>

    <div style="display: flex; gap: 16px; margin: 24px 0; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background-color: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #3b82f6;">
          ${data.pendingCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Pending</p>
      </div>
      <div style="flex: 1; min-width: 120px; background-color: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a;">
          ${data.totalPendingAmount}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Total Pending</p>
      </div>
      <div style="flex: 1; min-width: 120px; background-color: ${hasOverdue ? '#fef2f2' : '#fef3c7'}; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${hasOverdue ? '#dc2626' : '#f59e0b'};">
          ${data.avgDaysInProcess}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Avg Days</p>
      </div>
      <div style="flex: 1; min-width: 120px; background-color: ${data.overdueCount > 0 ? '#fef2f2' : '#f0fdf4'}; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${data.overdueCount > 0 ? '#dc2626' : '#16a34a'};">
          ${data.overdueCount}
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Overdue (>14 days)</p>
      </div>
    </div>

    ${data.criticalItems.length > 0 ? `
    <h2 style="color: #dc2626; font-size: 18px; margin-top: 32px;">Items Requiring Attention</h2>
    <table class="data-table" style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align: left;">CO #</th>
          <th style="text-align: left;">Title</th>
          <th style="text-align: right;">Amount</th>
          <th style="text-align: center;">Days</th>
          <th style="text-align: center;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${data.criticalItems.map(item => {
          const isOverdue = item.daysInStatus > 14
          const isCritical = item.daysInStatus > 30
          const color = isCritical ? '#dc2626' : isOverdue ? '#f59e0b' : '#6b7280'
          return `
          <tr>
            <td style="font-weight: bold;">${item.number}</td>
            <td>${item.title}</td>
            <td style="text-align: right;">${item.amount}</td>
            <td style="text-align: center; color: ${color}; font-weight: bold;">${item.daysInStatus}</td>
            <td style="text-align: center;">
              <a href="${item.viewUrl}" style="color: #2563eb; text-decoration: underline;">View</a>
            </td>
          </tr>
          `
        }).join('')}
      </tbody>
    </table>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${data.viewAllUrl}" class="button">
        View All Change Orders
      </a>
    </p>

    <p class="muted text-small">
      This is an automated summary. You can adjust your notification preferences in your account settings.
    </p>
  `

  const html = wrapInBaseTemplate({
    preheader: `CO Summary: ${data.pendingCount} pending (${data.totalPendingAmount}) - ${data.projectName}`,
    content,
  })

  const text = generatePlainText(content)

  return { html, text }
}
