/**
 * Look-Ahead Export Utilities
 *
 * Export 3-week look-ahead schedules to PDF and Excel formats.
 * Includes activity details, constraints, and PPC metrics.
 */

import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  LookAheadActivityWithDetails,
  LookAheadConstraint,
  PPCMetrics,
  WeekRange,
  LookAheadActivityStatus,
} from '@/types/look-ahead'
import {
  ACTIVITY_STATUS_CONFIG,
  CONSTRAINT_TYPE_CONFIG,
  calculateWeekRanges,
  formatWeekLabel,
} from '@/types/look-ahead'

// ============================================================================
// Types
// ============================================================================

export interface LookAheadExportData {
  projectName: string
  projectNumber?: string
  activities: LookAheadActivityWithDetails[]
  ppcMetrics?: PPCMetrics
  weeks?: WeekRange[]
  exportDate?: Date
  preparedBy?: string
}

export interface LookAheadExportRow {
  weekNumber: number
  weekLabel: string
  activityName: string
  trade: string
  location: string
  subcontractor: string
  plannedStart: string
  plannedEnd: string
  duration: string
  status: string
  percentComplete: string
  constraints: string
  notes: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status label and color
 */
function getStatusLabel(status: LookAheadActivityStatus): string {
  return ACTIVITY_STATUS_CONFIG[status]?.label || status
}

/**
 * Format constraint for display
 */
function formatConstraints(constraints?: LookAheadConstraint[]): string {
  if (!constraints || constraints.length === 0) {return '-'}

  return constraints
    .filter((c) => c.status === 'open' || c.status === 'escalated')
    .map((c) => {
      const typeConfig = CONSTRAINT_TYPE_CONFIG[c.constraint_type]
      return typeConfig ? typeConfig.label : c.constraint_type
    })
    .join(', ') || '-'
}

/**
 * Convert activities to export rows
 */
export function activitiesToExportRows(
  activities: LookAheadActivityWithDetails[],
  weeks: WeekRange[]
): LookAheadExportRow[] {
  return activities.map((activity) => {
    // Find which week this activity belongs to
    const activityStart = new Date(activity.planned_start_date)
    const week = weeks.find(
      (w) => activityStart >= w.weekStart && activityStart <= w.weekEnd
    )

    return {
      weekNumber: week?.weekNumber || activity.week_number || 1,
      weekLabel: week?.weekLabel || `Week ${activity.week_number || 1}`,
      activityName: activity.activity_name,
      trade: activity.trade || '-',
      location: activity.location || '-',
      subcontractor: activity.subcontractor_name || '-',
      plannedStart: format(new Date(activity.planned_start_date), 'MM/dd/yyyy'),
      plannedEnd: format(new Date(activity.planned_end_date), 'MM/dd/yyyy'),
      duration: `${activity.duration_days} days`,
      status: getStatusLabel(activity.status),
      percentComplete: `${activity.percent_complete}%`,
      constraints: formatConstraints(activity.constraints),
      notes: activity.notes || '-',
    }
  })
}

/**
 * Group activities by week
 */
function groupActivitiesByWeek(
  activities: LookAheadActivityWithDetails[],
  weeks: WeekRange[]
): Map<number, LookAheadActivityWithDetails[]> {
  const grouped = new Map<number, LookAheadActivityWithDetails[]>()

  // Initialize weeks
  weeks.forEach((week) => {
    grouped.set(week.weekNumber, [])
  })

  // Group activities
  activities.forEach((activity) => {
    const activityStart = new Date(activity.planned_start_date)
    const week = weeks.find(
      (w) => activityStart >= w.weekStart && activityStart <= w.weekEnd
    )

    if (week) {
      const weekActivities = grouped.get(week.weekNumber) || []
      weekActivities.push(activity)
      grouped.set(week.weekNumber, weekActivities)
    }
  })

  return grouped
}

// ============================================================================
// PDF Export
// ============================================================================

/**
 * Export look-ahead schedule to PDF
 */
export async function exportLookAheadToPDF(data: LookAheadExportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  const weeks = data.weeks || calculateWeekRanges()
  const exportDate = data.exportDate || new Date()

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('3-Week Look-Ahead Schedule', 14, 15)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Project: ${data.projectName}${data.projectNumber ? ` (${data.projectNumber})` : ''}`, 14, 22)
  doc.text(`Export Date: ${format(exportDate, 'MMMM d, yyyy')}`, 14, 27)
  if (data.preparedBy) {
    doc.text(`Prepared By: ${data.preparedBy}`, 14, 32)
  }

  // Week range info
  doc.text(
    `Schedule Period: ${format(weeks[0].weekStart, 'MMM d')} - ${format(weeks[2].weekEnd, 'MMM d, yyyy')}`,
    200,
    22,
    { align: 'right' }
  )

  // PPC Metrics summary (if available)
  if (data.ppcMetrics) {
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(200, 26, 65, 12, 2, 2, 'F')
    doc.setFontSize(9)
    doc.text(`Current PPC: ${data.ppcMetrics.currentWeekPPC}%`, 205, 32)
    doc.text(`Avg PPC: ${data.ppcMetrics.averagePPC}%`, 240, 32)
  }

  let startY = data.preparedBy ? 40 : 35

  // Group activities by week
  const groupedActivities = groupActivitiesByWeek(data.activities, weeks)

  // Generate table for each week
  weeks.forEach((week, weekIndex) => {
    const weekActivities = groupedActivities.get(week.weekNumber) || []

    // Week header
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    if (week.isCurrentWeek) {
      doc.setFillColor(66, 139, 202)
    } else {
      doc.setFillColor(100, 100, 100)
    }
    doc.setTextColor(255, 255, 255)
    doc.roundedRect(14, startY, 252, 8, 1, 1, 'F')
    doc.text(
      `Week ${week.weekNumber}: ${week.weekLabel}${week.isCurrentWeek ? ' (Current Week)' : ''}`,
      16,
      startY + 5.5
    )
    doc.setTextColor(0, 0, 0)

    startY += 10

    if (weekActivities.length === 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text('No activities scheduled for this week', 20, startY + 5)
      startY += 12
    } else {
      // Activities table
      const tableData = weekActivities.map((activity) => [
        activity.activity_name,
        activity.trade || '-',
        activity.location || '-',
        activity.subcontractor_name || '-',
        format(new Date(activity.planned_start_date), 'MM/dd'),
        format(new Date(activity.planned_end_date), 'MM/dd'),
        `${activity.duration_days}d`,
        getStatusLabel(activity.status),
        `${activity.percent_complete}%`,
        formatConstraints(activity.constraints),
      ])

      autoTable(doc, {
        startY: startY,
        head: [
          [
            'Activity',
            'Trade',
            'Location',
            'Subcontractor',
            'Start',
            'End',
            'Dur',
            'Status',
            '%',
            'Constraints',
          ],
        ],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 55 }, // Activity
          1: { cellWidth: 25 }, // Trade
          2: { cellWidth: 25 }, // Location
          3: { cellWidth: 30 }, // Subcontractor
          4: { cellWidth: 15 }, // Start
          5: { cellWidth: 15 }, // End
          6: { cellWidth: 12 }, // Duration
          7: { cellWidth: 20 }, // Status
          8: { cellWidth: 10 }, // %
          9: { cellWidth: 45 }, // Constraints
        },
        didDrawPage: (data) => {
          // Footer on each page
          doc.setFontSize(8)
          doc.setTextColor(128, 128, 128)
          doc.text(
            `Page ${doc.getNumberOfPages()} | Generated by JobSight`,
            14,
            doc.internal.pageSize.height - 10
          )
        },
      })

      // Get the ending Y position
      const finalY = (doc as any).lastAutoTable?.finalY || startY + 30
      startY = finalY + 8
    }

    // Check if we need a new page before next week
    if (weekIndex < weeks.length - 1 && startY > 160) {
      doc.addPage()
      startY = 15
    }
  })

  // Summary section
  if (startY > 140) {
    doc.addPage()
    startY = 15
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, startY)
  startY += 7

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const totalActivities = data.activities.length
  const completedActivities = data.activities.filter((a) => a.status === 'completed').length
  const inProgressActivities = data.activities.filter((a) => a.status === 'in_progress').length
  const blockedActivities = data.activities.filter((a) => a.status === 'blocked').length
  const delayedActivities = data.activities.filter((a) => a.status === 'delayed').length
  const totalConstraints = data.activities.reduce(
    (sum, a) => sum + (a.open_constraints || 0),
    0
  )

  const summaryData = [
    ['Total Activities:', totalActivities.toString()],
    ['Completed:', completedActivities.toString()],
    ['In Progress:', inProgressActivities.toString()],
    ['Blocked:', blockedActivities.toString()],
    ['Delayed:', delayedActivities.toString()],
    ['Open Constraints:', totalConstraints.toString()],
  ]

  if (data.ppcMetrics) {
    summaryData.push(['Current Week PPC:', `${data.ppcMetrics.currentWeekPPC}%`])
    summaryData.push(['Average PPC:', `${data.ppcMetrics.averagePPC}%`])
  }

  autoTable(doc, {
    startY: startY,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 30 },
    },
  })

  // Save the PDF
  const filename = `Look-Ahead-${data.projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${format(
    exportDate,
    'yyyy-MM-dd'
  )}.pdf`
  doc.save(filename)
}

// ============================================================================
// Excel Export
// ============================================================================

/**
 * Export look-ahead schedule to Excel
 */
export async function exportLookAheadToExcel(data: LookAheadExportData): Promise<void> {
  // Lazy load ExcelJS
  const ExcelJS = await import('exceljs')

  const weeks = data.weeks || calculateWeekRanges()
  const exportDate = data.exportDate || new Date()

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JobSight'
  workbook.created = exportDate

  // 3-Week Overview Sheet
  const overviewSheet = workbook.addWorksheet('3-Week Look-Ahead')

  // Header rows
  overviewSheet.mergeCells('A1:L1')
  const titleCell = overviewSheet.getCell('A1')
  titleCell.value = '3-Week Look-Ahead Schedule'
  titleCell.font = { size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center' }

  overviewSheet.getCell('A2').value = 'Project:'
  overviewSheet.getCell('B2').value = data.projectName
  overviewSheet.getCell('B2').font = { bold: true }

  overviewSheet.getCell('A3').value = 'Export Date:'
  overviewSheet.getCell('B3').value = format(exportDate, 'MMMM d, yyyy')

  overviewSheet.getCell('A4').value = 'Schedule Period:'
  overviewSheet.getCell('B4').value = `${format(weeks[0].weekStart, 'MMM d')} - ${format(
    weeks[2].weekEnd,
    'MMM d, yyyy'
  )}`

  if (data.preparedBy) {
    overviewSheet.getCell('A5').value = 'Prepared By:'
    overviewSheet.getCell('B5').value = data.preparedBy
  }

  // Column headers
  const headerRow = 7
  overviewSheet.columns = [
    { header: 'Week', key: 'weekLabel', width: 15 },
    { header: 'Activity', key: 'activityName', width: 35 },
    { header: 'Trade', key: 'trade', width: 15 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Subcontractor', key: 'subcontractor', width: 20 },
    { header: 'Start Date', key: 'plannedStart', width: 12 },
    { header: 'End Date', key: 'plannedEnd', width: 12 },
    { header: 'Duration', key: 'duration', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: '% Complete', key: 'percentComplete', width: 12 },
    { header: 'Constraints', key: 'constraints', width: 30 },
    { header: 'Notes', key: 'notes', width: 35 },
  ]

  // Style header row
  const headerRowObj = overviewSheet.getRow(headerRow)
  headerRowObj.font = { bold: true }
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Add data rows
  const rows = activitiesToExportRows(data.activities, weeks)
  rows.forEach((row, index) => {
    const dataRow = overviewSheet.addRow(row)

    // Color code by status
    const statusCell = dataRow.getCell('status')
    switch (row.status) {
      case 'Completed':
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4EDDA' },
        }
        break
      case 'In Progress':
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' },
        }
        break
      case 'Blocked':
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8D7DA' },
        }
        break
      case 'Delayed':
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEEBA' },
        }
        break
    }
  })

  // Week-specific sheets
  weeks.forEach((week) => {
    const weekSheet = workbook.addWorksheet(`Week ${week.weekNumber}`)

    // Header
    weekSheet.mergeCells('A1:H1')
    const weekTitle = weekSheet.getCell('A1')
    weekTitle.value = `Week ${week.weekNumber}: ${week.weekLabel}${
      week.isCurrentWeek ? ' (Current Week)' : ''
    }`
    weekTitle.font = { size: 14, bold: true }
    weekTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: week.isCurrentWeek ? 'FF428BCA' : 'FF6C757D' },
    }
    weekTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } }

    weekSheet.columns = [
      { header: 'Activity', key: 'activity', width: 40 },
      { header: 'Trade', key: 'trade', width: 15 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Subcontractor', key: 'subcontractor', width: 20 },
      { header: 'Start', key: 'start', width: 12 },
      { header: 'End', key: 'end', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: '% Complete', key: 'percent', width: 12 },
    ]

    // Header row
    const weekHeaderRow = weekSheet.getRow(3)
    weekHeaderRow.font = { bold: true }
    weekHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    // Filter activities for this week
    const weekActivities = data.activities.filter((activity) => {
      const activityStart = new Date(activity.planned_start_date)
      return activityStart >= week.weekStart && activityStart <= week.weekEnd
    })

    weekActivities.forEach((activity) => {
      weekSheet.addRow({
        activity: activity.activity_name,
        trade: activity.trade || '-',
        location: activity.location || '-',
        subcontractor: activity.subcontractor_name || '-',
        start: format(new Date(activity.planned_start_date), 'MM/dd/yyyy'),
        end: format(new Date(activity.planned_end_date), 'MM/dd/yyyy'),
        status: getStatusLabel(activity.status),
        percent: `${activity.percent_complete}%`,
      })
    })
  })

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary')

  summarySheet.getCell('A1').value = 'Look-Ahead Summary'
  summarySheet.getCell('A1').font = { size: 14, bold: true }

  summarySheet.getCell('A3').value = 'Metric'
  summarySheet.getCell('B3').value = 'Value'
  summarySheet.getRow(3).font = { bold: true }

  const totalActivities = data.activities.length
  const completedActivities = data.activities.filter((a) => a.status === 'completed').length
  const inProgressActivities = data.activities.filter((a) => a.status === 'in_progress').length
  const blockedActivities = data.activities.filter((a) => a.status === 'blocked').length
  const delayedActivities = data.activities.filter((a) => a.status === 'delayed').length
  const totalConstraints = data.activities.reduce(
    (sum, a) => sum + (a.open_constraints || 0),
    0
  )

  const summaryData = [
    ['Total Activities', totalActivities],
    ['Completed', completedActivities],
    ['In Progress', inProgressActivities],
    ['Blocked', blockedActivities],
    ['Delayed', delayedActivities],
    ['Open Constraints', totalConstraints],
  ]

  if (data.ppcMetrics) {
    summaryData.push(['Current Week PPC', `${data.ppcMetrics.currentWeekPPC}%`])
    summaryData.push(['Previous Week PPC', `${data.ppcMetrics.previousWeekPPC}%`])
    summaryData.push(['Average PPC', `${data.ppcMetrics.averagePPC}%`])
  }

  summaryData.forEach((row, index) => {
    summarySheet.getCell(`A${index + 4}`).value = row[0]
    summarySheet.getCell(`B${index + 4}`).value = row[1]
  })

  summarySheet.columns = [
    { width: 25 },
    { width: 15 },
  ]

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  // Download file
  const filename = `Look-Ahead-${data.projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${format(
    exportDate,
    'yyyy-MM-dd'
  )}.xlsx`
  downloadFile(blob, filename)
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Export look-ahead schedule to CSV
 */
export function exportLookAheadToCSV(data: LookAheadExportData): void {
  const weeks = data.weeks || calculateWeekRanges()
  const exportDate = data.exportDate || new Date()
  const rows = activitiesToExportRows(data.activities, weeks)

  // CSV header
  const headers = [
    'Week',
    'Activity',
    'Trade',
    'Location',
    'Subcontractor',
    'Start Date',
    'End Date',
    'Duration',
    'Status',
    '% Complete',
    'Constraints',
    'Notes',
  ]

  const headerRow = headers.join(',')

  // CSV rows
  const csvRows = rows.map((row) => {
    return [
      escapeCSV(row.weekLabel),
      escapeCSV(row.activityName),
      escapeCSV(row.trade),
      escapeCSV(row.location),
      escapeCSV(row.subcontractor),
      row.plannedStart,
      row.plannedEnd,
      row.duration,
      escapeCSV(row.status),
      row.percentComplete,
      escapeCSV(row.constraints),
      escapeCSV(row.notes),
    ].join(',')
  })

  // Summary section
  const totalActivities = data.activities.length
  const completedActivities = data.activities.filter((a) => a.status === 'completed').length

  const summaryRows = [
    '',
    'LOOK-AHEAD SUMMARY',
    `Project: ${data.projectName}`,
    `Export Date: ${format(exportDate, 'MM/dd/yyyy')}`,
    `Schedule Period: ${format(weeks[0].weekStart, 'MMM d')} - ${format(weeks[2].weekEnd, 'MMM d, yyyy')}`,
    `Total Activities: ${totalActivities}`,
    `Completed: ${completedActivities}`,
  ]

  if (data.ppcMetrics) {
    summaryRows.push(`Current Week PPC: ${data.ppcMetrics.currentWeekPPC}%`)
  }

  const csv = [headerRow, ...csvRows, ...summaryRows].join('\n')

  const filename = `Look-Ahead-${data.projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${format(
    exportDate,
    'yyyy-MM-dd'
  )}.csv`

  downloadFile(csv, filename)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (!value || value === '-') {return ''}
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download file helper
 */
export function downloadFile(content: string | Blob, filename: string): void {
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

/**
 * Quick export functions for common use cases
 */
export async function downloadLookAheadAsPDF(
  activities: LookAheadActivityWithDetails[],
  projectName: string,
  ppcMetrics?: PPCMetrics
): Promise<void> {
  await exportLookAheadToPDF({
    projectName,
    activities,
    ppcMetrics,
  })
}

export async function downloadLookAheadAsExcel(
  activities: LookAheadActivityWithDetails[],
  projectName: string,
  ppcMetrics?: PPCMetrics
): Promise<void> {
  await exportLookAheadToExcel({
    projectName,
    activities,
    ppcMetrics,
  })
}

export function downloadLookAheadAsCSV(
  activities: LookAheadActivityWithDetails[],
  projectName: string,
  ppcMetrics?: PPCMetrics
): void {
  exportLookAheadToCSV({
    projectName,
    activities,
    ppcMetrics,
  })
}
