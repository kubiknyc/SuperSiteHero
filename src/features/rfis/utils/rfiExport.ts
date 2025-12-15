// File: /src/features/rfis/utils/rfiExport.ts
// Export utilities for RFI Log (CSV and Excel)

import { format } from 'date-fns'
import type { RFIWithDetails } from '../hooks/useDedicatedRFIs'
import { formatRFINumber, getBallInCourtLabel, RFI_STATUSES, RFI_PRIORITIES } from '../hooks/useDedicatedRFIs'

export interface RFIExportRow {
  rfiNumber: string
  subject: string
  status: string
  priority: string
  ballInCourt: string
  drawingReference: string
  specSection: string
  dateSubmitted: string
  dateRequired: string
  dateResponded: string
  dateClosed: string
  daysOpen: number
  costImpact: string
  scheduleImpact: string
  question: string
  response: string
  submittedBy: string
  assignedTo: string
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

    return {
      rfiNumber: formatRFINumber(rfi.rfi_number),
      subject: rfi.subject || '',
      status: RFI_STATUSES.find((s) => s.value === rfi.status)?.label || rfi.status,
      priority: RFI_PRIORITIES.find((p) => p.value === rfi.priority)?.label || rfi.priority || 'Normal',
      ballInCourt: rfi.ball_in_court_role ? getBallInCourtLabel(rfi.ball_in_court_role as any) : '',
      drawingReference: rfi.drawing_reference || '',
      specSection: rfi.spec_section || '',
      dateSubmitted: rfi.date_submitted ? format(new Date(rfi.date_submitted), 'MM/dd/yyyy') : '',
      dateRequired: rfi.date_required ? format(new Date(rfi.date_required), 'MM/dd/yyyy') : '',
      dateResponded: rfi.date_responded ? format(new Date(rfi.date_responded), 'MM/dd/yyyy') : '',
      dateClosed: rfi.date_closed ? format(new Date(rfi.date_closed), 'MM/dd/yyyy') : '',
      daysOpen,
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
    'Ball-in-Court',
    'Drawing Ref',
    'Spec Section',
    'Date Submitted',
    'Date Required',
    'Date Responded',
    'Date Closed',
    'Days Open',
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
      escapeCSV(row.ballInCourt),
      escapeCSV(row.drawingReference),
      escapeCSV(row.specSection),
      row.dateSubmitted,
      row.dateRequired,
      row.dateResponded,
      row.dateClosed,
      row.daysOpen.toString(),
      escapeCSV(row.costImpact),
      escapeCSV(row.scheduleImpact),
      escapeCSV(row.question),
      escapeCSV(row.response),
      escapeCSV(row.submittedBy),
      escapeCSV(row.assignedTo),
    ].join(',')
  })

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
  ]

  return [headerRow, ...csvRows, ...summaryRows].join('\n')
}

/**
 * Export RFIs to Excel using ExcelJS (secure alternative to xlsx)
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

  // Define columns with headers and widths
  worksheet.columns = [
    { header: 'RFI #', key: 'rfiNumber', width: 10 },
    { header: 'Subject', key: 'subject', width: 40 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Ball-in-Court', key: 'ballInCourt', width: 15 },
    { header: 'Drawing Ref', key: 'drawingReference', width: 12 },
    { header: 'Spec Section', key: 'specSection', width: 12 },
    { header: 'Date Submitted', key: 'dateSubmitted', width: 12 },
    { header: 'Date Required', key: 'dateRequired', width: 12 },
    { header: 'Date Responded', key: 'dateResponded', width: 12 },
    { header: 'Date Closed', key: 'dateClosed', width: 12 },
    { header: 'Days Open', key: 'daysOpen', width: 10 },
    { header: 'Cost Impact', key: 'costImpact', width: 12 },
    { header: 'Schedule Impact', key: 'scheduleImpact', width: 14 },
    { header: 'Question', key: 'question', width: 50 },
    { header: 'Response', key: 'response', width: 50 },
    { header: 'Submitted By', key: 'submittedBy', width: 20 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
  ]

  // Style header row
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Add data rows
  rows.forEach((row) => {
    worksheet.addRow(row)
  })

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary')

  const openRFIs = rfis.filter((r) => ['draft', 'open', 'pending_response'].includes(r.status))
  const respondedRFIs = rfis.filter((r) => r.status === 'responded')
  const closedRFIs = rfis.filter((r) => r.status === 'closed')

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

  // Add summary data
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 15 },
  ]

  summarySheet.addRow({ field: 'RFI LOG SUMMARY', value: '' })
  summarySheet.addRow({ field: '', value: '' })
  summarySheet.addRow({ field: 'Project:', value: projectName || 'All Projects' })
  summarySheet.addRow({ field: 'Export Date:', value: format(new Date(), 'MM/dd/yyyy HH:mm') })
  summarySheet.addRow({ field: '', value: '' })
  summarySheet.addRow({ field: 'Status Summary:', value: '' })
  summarySheet.addRow({ field: 'Total RFIs:', value: rfis.length })
  summarySheet.addRow({ field: 'Open:', value: openRFIs.length })
  summarySheet.addRow({ field: 'Responded:', value: respondedRFIs.length })
  summarySheet.addRow({ field: 'Closed:', value: closedRFIs.length })
  summarySheet.addRow({ field: '', value: '' })
  summarySheet.addRow({ field: 'By Ball-in-Court:', value: '' })
  Object.entries(byBallInCourt).forEach(([role, count]) => {
    summarySheet.addRow({ field: role, value: count })
  })
  summarySheet.addRow({ field: '', value: '' })
  summarySheet.addRow({ field: 'By Priority:', value: '' })
  Object.entries(byPriority).forEach(([priority, count]) => {
    summarySheet.addRow({ field: priority, value: count })
  })

  // Style summary title
  summarySheet.getRow(1).font = { bold: true, size: 14 }

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
