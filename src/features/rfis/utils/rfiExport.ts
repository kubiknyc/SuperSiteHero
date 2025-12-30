// File: /src/features/rfis/utils/rfiExport.ts
// Export utilities for RFI Log (CSV and Excel)

import { format } from 'date-fns'
import { formatRFINumber, getBallInCourtLabel, RFI_STATUSES, RFI_PRIORITIES, type RFIWithDetails } from '../hooks/useDedicatedRFIs'

export interface RFIExportRow {
  rfiNumber: string
  subject: string
  status: string
  priority: string
  responseType: string
  ballInCourt: string
  drawingReference: string
  specSection: string
  dateSubmitted: string
  dateRequired: string
  dateResponded: string
  dateClosed: string
  daysOpen: number
  isOverdue: boolean
  costImpact: string
  scheduleImpact: string
  question: string
  response: string
  submittedBy: string
  assignedTo: string
}

// Response type labels for display
const RESPONSE_TYPE_LABELS: Record<string, string> = {
  answered: 'Answered',
  see_drawings: 'See Drawings',
  see_specs: 'See Specs',
  deferred: 'Deferred',
  partial_response: 'Partial Response',
  request_clarification: 'Request Clarification',
  no_change_required: 'No Change Required',
}

// Priority colors for Excel conditional formatting
const PRIORITY_COLORS: Record<string, string> = {
  critical: 'FFFF0000', // Red
  high: 'FFFF6B00',     // Orange
  normal: 'FF4A90D9',   // Blue
  low: 'FF808080',      // Gray
}

// Status colors for Excel conditional formatting
const STATUS_COLORS: Record<string, string> = {
  draft: 'FFE0E0E0',           // Light gray
  open: 'FFFFD700',            // Gold
  pending_response: 'FFFFA500', // Orange
  responded: 'FF90EE90',       // Light green
  closed: 'FF228B22',          // Green
  void: 'FFDC143C',            // Crimson
}

/**
 * Convert RFIs to export rows
 */
export function rfisToExportRows(rfis: RFIWithDetails[]): RFIExportRow[] {
  return rfis.map((rfi) => {
    // Calculate days open
    const startDate = rfi.date_submitted || rfi.created_at
    const endDate = rfi.date_closed || new Date().toISOString()
    const daysOpen = startDate
      ? Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Check if overdue
    const isOverdue = !!(
      rfi.date_required &&
      new Date(rfi.date_required) < new Date() &&
      !['responded', 'closed'].includes(rfi.status)
    )

    return {
      rfiNumber: formatRFINumber(rfi.rfi_number),
      subject: rfi.subject || '',
      status: RFI_STATUSES.find((s) => s.value === rfi.status)?.label || rfi.status,
      priority: RFI_PRIORITIES.find((p) => p.value === rfi.priority)?.label || rfi.priority || 'Normal',
      responseType: rfi.response_type ? (RESPONSE_TYPE_LABELS[rfi.response_type] || rfi.response_type) : '',
      ballInCourt: rfi.ball_in_court_role ? getBallInCourtLabel(rfi.ball_in_court_role as any) : '',
      drawingReference: rfi.drawing_reference || '',
      specSection: rfi.spec_section || '',
      dateSubmitted: rfi.date_submitted ? format(new Date(rfi.date_submitted), 'MM/dd/yyyy') : '',
      dateRequired: rfi.date_required ? format(new Date(rfi.date_required), 'MM/dd/yyyy') : '',
      dateResponded: rfi.date_responded ? format(new Date(rfi.date_responded), 'MM/dd/yyyy') : '',
      dateClosed: rfi.date_closed ? format(new Date(rfi.date_closed), 'MM/dd/yyyy') : '',
      daysOpen,
      isOverdue,
      costImpact: rfi.cost_impact ? `$${Number(rfi.cost_impact).toLocaleString()}` : '',
      scheduleImpact: rfi.schedule_impact_days ? `${rfi.schedule_impact_days} days` : '',
      question: rfi.question || '',
      response: rfi.response || '',
      submittedBy: rfi.submitted_by_user?.full_name || '',
      assignedTo: rfi.assigned_to_user?.full_name || '',
    }
  })
}

/**
 * Export RFIs to CSV
 */
export function exportRFIsToCSV(rfis: RFIWithDetails[], projectName?: string): string {
  const rows = rfisToExportRows(rfis)

  // CSV header
  const headers = [
    'RFI #',
    'Subject',
    'Status',
    'Priority',
    'Response Type',
    'Ball-in-Court',
    'Drawing Ref',
    'Spec Section',
    'Date Submitted',
    'Date Required',
    'Date Responded',
    'Date Closed',
    'Days Open',
    'Overdue',
    'Cost Impact',
    'Schedule Impact',
    'Question',
    'Response',
    'Submitted By',
    'Assigned To',
  ]

  const headerRow = headers.join(',')

  // CSV rows
  const csvRows = rows.map((row) => {
    return [
      escapeCSV(row.rfiNumber),
      escapeCSV(row.subject),
      escapeCSV(row.status),
      escapeCSV(row.priority),
      escapeCSV(row.responseType),
      escapeCSV(row.ballInCourt),
      escapeCSV(row.drawingReference),
      escapeCSV(row.specSection),
      row.dateSubmitted,
      row.dateRequired,
      row.dateResponded,
      row.dateClosed,
      row.daysOpen.toString(),
      row.isOverdue ? 'Yes' : 'No',
      escapeCSV(row.costImpact),
      escapeCSV(row.scheduleImpact),
      escapeCSV(row.question),
      escapeCSV(row.response),
      escapeCSV(row.submittedBy),
      escapeCSV(row.assignedTo),
    ].join(',')
  })

  // Count overdue RFIs
  const overdueCount = rows.filter(r => r.isOverdue).length

  // Summary
  const summaryRows = [
    '',
    'RFI LOG SUMMARY',
    `Project: ${projectName || 'All Projects'}`,
    `Export Date: ${format(new Date(), 'MM/dd/yyyy')}`,
    `Total RFIs: ${rfis.length}`,
    `Open: ${rfis.filter((r) => ['draft', 'open', 'pending_response'].includes(r.status)).length}`,
    `Responded: ${rfis.filter((r) => r.status === 'responded').length}`,
    `Closed: ${rfis.filter((r) => r.status === 'closed').length}`,
    `Overdue: ${overdueCount}`,
  ]

  return [headerRow, ...csvRows, ...summaryRows].join('\n')
}

/**
 * Export RFIs to Excel using ExcelJS (secure alternative to xlsx)
 * Enhanced with response type, overdue status, and conditional formatting
 */
export async function exportRFIsToExcel(
  rfis: RFIWithDetails[],
  projectName?: string
): Promise<Blob> {
  // Lazy load exceljs library
  const ExcelJS = await import('exceljs')

  const rows = rfisToExportRows(rfis)

  // Create workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JobSight'
  workbook.created = new Date()

  // RFI Log sheet
  const worksheet = workbook.addWorksheet('RFI Log')

  // Define columns with headers and widths (enhanced with Response Type and Overdue)
  worksheet.columns = [
    { header: 'RFI #', key: 'rfiNumber', width: 10 },
    { header: 'Subject', key: 'subject', width: 40 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Response Type', key: 'responseType', width: 18 },
    { header: 'Ball-in-Court', key: 'ballInCourt', width: 15 },
    { header: 'Drawing Ref', key: 'drawingReference', width: 12 },
    { header: 'Spec Section', key: 'specSection', width: 12 },
    { header: 'Date Submitted', key: 'dateSubmitted', width: 12 },
    { header: 'Date Required', key: 'dateRequired', width: 12 },
    { header: 'Date Responded', key: 'dateResponded', width: 12 },
    { header: 'Date Closed', key: 'dateClosed', width: 12 },
    { header: 'Days Open', key: 'daysOpen', width: 10 },
    { header: 'Overdue', key: 'overdue', width: 8 },
    { header: 'Cost Impact', key: 'costImpact', width: 12 },
    { header: 'Schedule Impact', key: 'scheduleImpact', width: 14 },
    { header: 'Question', key: 'question', width: 50 },
    { header: 'Response', key: 'response', width: 50 },
    { header: 'Submitted By', key: 'submittedBy', width: 20 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
  ]

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D5A8A' }, // Dark blue header
  }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

  // Add data rows with conditional formatting
  rows.forEach((row, index) => {
    const excelRow = worksheet.addRow({
      ...row,
      overdue: row.isOverdue ? 'Yes' : 'No',
    })

    // Find original RFI for status/priority values
    const originalRfi = rfis[index]

    // Apply priority-based color to priority column (column 4)
    const priorityCell = excelRow.getCell(4)
    const priorityColor = PRIORITY_COLORS[originalRfi.priority || 'normal']
    if (priorityColor) {
      priorityCell.font = { color: { argb: priorityColor }, bold: true }
    }

    // Apply status-based background color to status column (column 3)
    const statusCell = excelRow.getCell(3)
    const statusColor = STATUS_COLORS[originalRfi.status]
    if (statusColor) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusColor },
      }
    }

    // Highlight overdue rows in red
    if (row.isOverdue) {
      const overdueCell = excelRow.getCell(14) // Overdue column
      overdueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCCCB' }, // Light red background
      }
      overdueCell.font = { color: { argb: 'FFCC0000' }, bold: true }

      // Also highlight the date required cell
      const dateRequiredCell = excelRow.getCell(10)
      dateRequiredCell.font = { color: { argb: 'FFCC0000' }, bold: true }
    }

    // Style response type with color based on type
    if (row.responseType) {
      const responseTypeCell = excelRow.getCell(5)
      if (row.responseType === 'See Drawings' || row.responseType === 'See Specs') {
        responseTypeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE3F2FD' }, // Light blue
        }
      } else if (row.responseType === 'Deferred' || row.responseType === 'Request Clarification') {
        responseTypeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3E0' }, // Light orange
        }
      }
    }
  })

  // Add auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `T${rows.length + 1}`,
  }

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary')

  const openRFIs = rfis.filter((r) => ['draft', 'open', 'pending_response'].includes(r.status))
  const respondedRFIs = rfis.filter((r) => r.status === 'responded')
  const closedRFIs = rfis.filter((r) => r.status === 'closed')
  const overdueRFIs = rows.filter(r => r.isOverdue)

  // Count by ball-in-court
  const byBallInCourt: Record<string, number> = {}
  rfis.forEach((rfi) => {
    if (rfi.ball_in_court_role) {
      const label = getBallInCourtLabel(rfi.ball_in_court_role as any)
      byBallInCourt[label] = (byBallInCourt[label] || 0) + 1
    }
  })

  // Count by priority
  const byPriority: Record<string, number> = {}
  rfis.forEach((rfi) => {
    const label = RFI_PRIORITIES.find((p) => p.value === rfi.priority)?.label || 'Normal'
    byPriority[label] = (byPriority[label] || 0) + 1
  })

  // Count by response type
  const byResponseType: Record<string, number> = {}
  rfis.forEach((rfi) => {
    if (rfi.response_type) {
      const label = RESPONSE_TYPE_LABELS[rfi.response_type] || rfi.response_type
      byResponseType[label] = (byResponseType[label] || 0) + 1
    }
  })

  // Add summary data
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 25 },
    { header: 'Value', key: 'value', width: 15 },
  ]

  // Title row
  const titleRow = summarySheet.addRow({ field: 'RFI LOG SUMMARY', value: '' })
  titleRow.font = { bold: true, size: 16 }
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D5A8A' },
  }
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }

  summarySheet.addRow({ field: '', value: '' })
  summarySheet.addRow({ field: 'Project:', value: projectName || 'All Projects' })
  summarySheet.addRow({ field: 'Export Date:', value: format(new Date(), 'MMMM d, yyyy h:mm a') })
  summarySheet.addRow({ field: '', value: '' })

  // Status summary with color coding
  const statusHeaderRow = summarySheet.addRow({ field: 'Status Summary:', value: '' })
  statusHeaderRow.font = { bold: true }
  summarySheet.addRow({ field: 'Total RFIs:', value: rfis.length })
  summarySheet.addRow({ field: 'Open:', value: openRFIs.length })
  summarySheet.addRow({ field: 'Responded:', value: respondedRFIs.length })
  summarySheet.addRow({ field: 'Closed:', value: closedRFIs.length })

  // Overdue with red highlighting
  const overdueRow = summarySheet.addRow({ field: 'Overdue:', value: overdueRFIs.length })
  if (overdueRFIs.length > 0) {
    overdueRow.getCell(2).font = { color: { argb: 'FFCC0000' }, bold: true }
  }

  summarySheet.addRow({ field: '', value: '' })
  const bicHeaderRow = summarySheet.addRow({ field: 'By Ball-in-Court:', value: '' })
  bicHeaderRow.font = { bold: true }
  Object.entries(byBallInCourt).forEach(([role, count]) => {
    summarySheet.addRow({ field: role, value: count })
  })

  summarySheet.addRow({ field: '', value: '' })
  const priorityHeaderRow = summarySheet.addRow({ field: 'By Priority:', value: '' })
  priorityHeaderRow.font = { bold: true }
  Object.entries(byPriority).forEach(([priority, count]) => {
    const row = summarySheet.addRow({ field: priority, value: count })
    // Color-code priority counts
    if (priority === 'Critical') {
      row.getCell(1).font = { color: { argb: 'FFFF0000' } }
    } else if (priority === 'High') {
      row.getCell(1).font = { color: { argb: 'FFFF6B00' } }
    }
  })

  // Add response type breakdown if any responses exist
  if (Object.keys(byResponseType).length > 0) {
    summarySheet.addRow({ field: '', value: '' })
    const rtHeaderRow = summarySheet.addRow({ field: 'By Response Type:', value: '' })
    rtHeaderRow.font = { bold: true }
    Object.entries(byResponseType).forEach(([type, count]) => {
      summarySheet.addRow({ field: type, value: count })
    })
  }

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return blob
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (!value) {return ''}
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download file helper
 */
export function downloadFile(content: string | Blob, filename: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: 'text/csv' }) : content

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
 * Export RFIs and download as CSV
 */
export function downloadRFIsAsCSV(rfis: RFIWithDetails[], projectName?: string): void {
  const csv = exportRFIsToCSV(rfis, projectName)
  const filename = `RFI-Log-${projectName || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.csv`
  downloadFile(csv, filename)
}

/**
 * Export RFIs and download as Excel
 */
export async function downloadRFIsAsExcel(rfis: RFIWithDetails[], projectName?: string): Promise<void> {
  const blob = await exportRFIsToExcel(rfis, projectName)
  const filename = `RFI-Log-${projectName || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  downloadFile(blob, filename)
}
