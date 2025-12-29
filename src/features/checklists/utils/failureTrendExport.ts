/**
 * Failure Trend Report Export Utilities
 *
 * Export checklist failure trend analysis to PDF and CSV formats.
 * Includes summary metrics, frequency tables, temporal patterns, and clusters.
 */

import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  ChecklistFailureAnalytics,
  TrendDirection,
  DateRangePreset,
} from '@/types/checklist-failure-analytics'

// ============================================================================
// Types
// ============================================================================

export interface FailureTrendExportData {
  projectName: string
  templateName?: string
  analytics: ChecklistFailureAnalytics
  dateRange: DateRangePreset
  exportDate?: Date
  preparedBy?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format trend direction for display
 */
function formatTrend(trend: TrendDirection): string {
  switch (trend) {
    case 'improving':
      return '↓ Improving'
    case 'declining':
      return '↑ Declining'
    case 'stable':
      return '→ Stable'
    default:
      return trend
  }
}

/**
 * Get date range label for display
 */
function getDateRangeLabel(preset: DateRangePreset): string {
  switch (preset) {
    case 'last_7_days':
      return 'Last 7 Days'
    case 'last_30_days':
      return 'Last 30 Days'
    case 'last_90_days':
      return 'Last 90 Days'
    case 'last_6_months':
      return 'Last 6 Months'
    case 'last_year':
      return 'Last Year'
    default:
      return preset
  }
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Download file helper
 */
function downloadFile(content: string | Blob, filename: string): void {
  const blob =
    typeof content === 'string' ? new Blob([content], { type: 'text/csv' }) : content

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Export failure trend analytics to CSV
 */
export function exportFailureTrendToCSV(data: FailureTrendExportData): void {
  const { analytics, projectName, templateName, dateRange, exportDate = new Date() } = data

  const lines: string[] = []

  // Header info
  lines.push('CHECKLIST FAILURE TREND ANALYSIS')
  lines.push(`Project: ${escapeCSV(projectName)}`)
  if (templateName) {
    lines.push(`Template: ${escapeCSV(templateName)}`)
  }
  lines.push(`Date Range: ${getDateRangeLabel(dateRange)}`)
  lines.push(`Export Date: ${format(exportDate, 'MMMM d, yyyy')}`)
  lines.push('')

  // Summary Metrics
  lines.push('SUMMARY METRICS')
  lines.push(`Total Failures,${analytics.summary.totalFailures}`)
  lines.push(`Failure Rate,${analytics.summary.failureRate}%`)
  lines.push(`Unique Failed Items,${analytics.summary.uniqueFailedItems}`)
  lines.push(`Total Inspections,${analytics.summary.totalExecutions}`)
  lines.push(`Overall Trend,${formatTrend(analytics.summary.trend)}`)
  lines.push('')

  // Most Frequently Failed Items
  lines.push('MOST FREQUENTLY FAILED ITEMS')
  lines.push('Item,Section,Failures,Total Executions,Failure Rate,Trend')
  analytics.frequency.slice(0, 20).forEach((item) => {
    lines.push([
      escapeCSV(item.itemLabel),
      escapeCSV(item.section),
      item.failureCount,
      item.totalExecutions,
      `${item.failureRate.toFixed(1)}%`,
      formatTrend(item.trend),
    ].join(','))
  })
  lines.push('')

  // Failure Trends Over Time
  lines.push('FAILURE TRENDS OVER TIME')
  lines.push('Date,Failures,Failure Rate,Moving Average')
  analytics.trends.data.forEach((point, index) => {
    lines.push([
      point.date,
      point.count,
      `${point.rate.toFixed(1)}%`,
      analytics.trends.movingAverage[index]?.toFixed(1) || '',
    ].join(','))
  })
  lines.push('')

  // Temporal Patterns - Hour of Day
  lines.push('FAILURES BY HOUR OF DAY')
  lines.push('Hour,Failure Count')
  analytics.temporal.byHour.forEach((item) => {
    lines.push(`${item.period},${item.count}`)
  })
  lines.push('')

  // Temporal Patterns - Day of Week
  lines.push('FAILURES BY DAY OF WEEK')
  lines.push('Day,Failure Count')
  analytics.temporal.byDayOfWeek.forEach((item) => {
    lines.push(`${escapeCSV(String(item.period))},${item.count}`)
  })
  lines.push('')

  // Failure Clusters
  if (analytics.clusters.length > 0) {
    lines.push('FAILURE CLUSTERS (Items That Frequently Fail Together)')
    lines.push('Cluster #,Items,Co-occurrence Count,Co-occurrence Rate')
    analytics.clusters.forEach((cluster, index) => {
      lines.push([
        index + 1,
        escapeCSV(cluster.items.join(' | ')),
        cluster.coOccurrenceCount,
        `${cluster.coOccurrenceRate.toFixed(1)}%`,
      ].join(','))
    })
  }

  const csv = lines.join('\n')
  const filename = `Failure-Trend-Analysis-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${format(
    exportDate,
    'yyyy-MM-dd'
  )}.csv`

  downloadFile(csv, filename)
}

// ============================================================================
// PDF Export
// ============================================================================

/**
 * Export failure trend analytics to PDF
 */
export async function exportFailureTrendToPDF(data: FailureTrendExportData): Promise<void> {
  const { analytics, projectName, templateName, dateRange, exportDate = new Date(), preparedBy } = data

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  let yPosition = 20

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Checklist Failure Trend Analysis', 105, yPosition, { align: 'center' })
  yPosition += 12

  // Subtitle with project info
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Project: ${projectName}`, 20, yPosition)
  yPosition += 6

  if (templateName) {
    doc.text(`Template: ${templateName}`, 20, yPosition)
    yPosition += 6
  }

  doc.text(`Date Range: ${getDateRangeLabel(dateRange)}`, 20, yPosition)
  yPosition += 6

  doc.text(`Export Date: ${format(exportDate, 'MMMM d, yyyy')}`, 20, yPosition)
  yPosition += 6

  if (preparedBy) {
    doc.text(`Prepared By: ${preparedBy}`, 20, yPosition)
    yPosition += 6
  }

  yPosition += 6

  // Summary Metrics Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(41, 128, 185)
  doc.setTextColor(255, 255, 255)
  doc.rect(20, yPosition - 5, 170, 8, 'F')
  doc.text('Summary Metrics', 25, yPosition)
  doc.setTextColor(0, 0, 0)
  yPosition += 8

  // Summary table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total Failures', analytics.summary.totalFailures.toString()],
      ['Failure Rate', `${analytics.summary.failureRate}%`],
      ['Unique Failed Items', analytics.summary.uniqueFailedItems.toString()],
      ['Total Inspections', analytics.summary.totalExecutions.toString()],
      ['Overall Trend', formatTrend(analytics.summary.trend)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 40 },
    },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 10 },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 12

  // Most Frequently Failed Items Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(41, 128, 185)
  doc.setTextColor(255, 255, 255)
  doc.rect(20, yPosition - 5, 170, 8, 'F')
  doc.text('Most Frequently Failed Items (Top 15)', 25, yPosition)
  doc.setTextColor(0, 0, 0)
  yPosition += 8

  const frequencyData = analytics.frequency.slice(0, 15).map((item) => [
    item.itemLabel.length > 30 ? item.itemLabel.substring(0, 27) + '...' : item.itemLabel,
    item.section.length > 15 ? item.section.substring(0, 12) + '...' : item.section,
    item.failureCount.toString(),
    `${item.failureRate.toFixed(1)}%`,
    formatTrend(item.trend).replace('↓ ', '').replace('↑ ', '').replace('→ ', ''),
  ])

  autoTable(doc, {
    startY: yPosition,
    head: [['Item', 'Section', 'Failures', 'Rate', 'Trend']],
    body: frequencyData,
    theme: 'striped',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
    },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9 },
    didDrawCell: (data) => {
      // Color code trend column
      if (data.section === 'body' && data.column.index === 4) {
        const value = data.cell.text[0]
        if (value === 'Improving') {
          doc.setFillColor(212, 237, 218) // Green
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
          doc.setTextColor(0, 0, 0)
          doc.text(value, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1)
        } else if (value === 'Declining') {
          doc.setFillColor(248, 215, 218) // Red
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
          doc.setTextColor(0, 0, 0)
          doc.text(value, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1)
        }
      }
    },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 12

  // Check if we need a new page
  if (yPosition > 220) {
    doc.addPage()
    yPosition = 20
  }

  // Temporal Patterns Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(41, 128, 185)
  doc.setTextColor(255, 255, 255)
  doc.rect(20, yPosition - 5, 170, 8, 'F')
  doc.text('Temporal Patterns', 25, yPosition)
  doc.setTextColor(0, 0, 0)
  yPosition += 8

  // Two column layout for temporal data
  const hourData = analytics.temporal.byHour.map((item) => [
    `${item.period}:00`,
    item.count.toString(),
  ])

  const dayData = analytics.temporal.byDayOfWeek.map((item) => [
    String(item.period),
    item.count.toString(),
  ])

  // Hour of Day table
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('By Hour of Day', 25, yPosition + 4)

  autoTable(doc, {
    startY: yPosition + 6,
    head: [['Hour', 'Failures']],
    body: hourData.slice(0, 12), // First 12 hours
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    margin: { left: 20, right: 120 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
    },
  })

  // Day of Week table (positioned to the right)
  doc.setFont('helvetica', 'bold')
  doc.text('By Day of Week', 115, yPosition + 4)

  autoTable(doc, {
    startY: yPosition + 6,
    head: [['Day', 'Failures']],
    body: dayData,
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
    margin: { left: 110, right: 20 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
    },
  })

  yPosition = Math.max(
    (doc as any).previousAutoTable?.finalY || yPosition + 50,
    (doc as any).lastAutoTable?.finalY || yPosition + 50
  ) + 12

  // Check if we need a new page for clusters
  if (yPosition > 200 && analytics.clusters.length > 0) {
    doc.addPage()
    yPosition = 20
  }

  // Failure Clusters Section
  if (analytics.clusters.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(41, 128, 185)
    doc.setTextColor(255, 255, 255)
    doc.rect(20, yPosition - 5, 170, 8, 'F')
    doc.text('Failure Clusters (Items That Fail Together)', 25, yPosition)
    doc.setTextColor(0, 0, 0)
    yPosition += 8

    const clusterData = analytics.clusters.slice(0, 10).map((cluster, index) => [
      `#${index + 1}`,
      cluster.items.join(', ').length > 60
        ? cluster.items.join(', ').substring(0, 57) + '...'
        : cluster.items.join(', '),
      cluster.coOccurrenceCount.toString(),
      `${cluster.coOccurrenceRate.toFixed(1)}%`,
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Cluster', 'Items', 'Occurrences', 'Rate']],
      body: clusterData,
      theme: 'striped',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 95 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
      },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9 },
    })
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount} | Generated by JobSight`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Save the PDF
  const filename = `Failure-Trend-Analysis-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${format(
    exportDate,
    'yyyy-MM-dd'
  )}.pdf`
  doc.save(filename)
}

// ============================================================================
// Quick Export Functions
// ============================================================================

/**
 * Quick export to CSV
 */
export function downloadFailureTrendAsCSV(
  analytics: ChecklistFailureAnalytics,
  projectName: string,
  dateRange: DateRangePreset,
  templateName?: string
): void {
  exportFailureTrendToCSV({
    analytics,
    projectName,
    templateName,
    dateRange,
  })
}

/**
 * Quick export to PDF
 */
export async function downloadFailureTrendAsPDF(
  analytics: ChecklistFailureAnalytics,
  projectName: string,
  dateRange: DateRangePreset,
  templateName?: string
): Promise<void> {
  await exportFailureTrendToPDF({
    analytics,
    projectName,
    templateName,
    dateRange,
  })
}
