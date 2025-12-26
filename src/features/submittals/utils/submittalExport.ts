// File: /src/features/submittals/utils/submittalExport.ts
// Export utilities for submittal log (CSV and Excel)

import { format } from 'date-fns'
import type { SubmittalWithDetails } from '@/types/submittal'
import {
  SUBMITTAL_REVIEW_STATUSES,
  SUBMITTAL_TYPES,
  BALL_IN_COURT_ENTITIES,
} from '@/types/submittal'

export interface SubmittalExportRow {
  submittal_number: string
  revision: number
  spec_section: string
  spec_section_title: string
  title: string
  type: string
  status: string
  approval_code: string
  ball_in_court: string
  subcontractor: string
  lead_time_days: number | null
  date_required: string
  date_submitted: string
  date_returned: string
  days_in_review: number | null
  is_overdue: boolean
  description: string
}

export interface SubmittalExportSummary {
  total: number
  by_status: Record<string, number>
  by_type: Record<string, number>
  by_approval_code: Record<string, number>
  overdue: number
  average_review_days: number
  average_lead_time: number
}

// Approval code colors for Excel conditional formatting
const APPROVAL_CODE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  A: { bg: 'FF228B22', fg: 'FFFFFFFF', label: 'A - Approved' },           // Green
  B: { bg: 'FF9ACD32', fg: 'FF000000', label: 'B - Approved as Noted' }, // Yellow-green
  C: { bg: 'FFFF8C00', fg: 'FFFFFFFF', label: 'C - Revise & Resubmit' }, // Orange
  D: { bg: 'FFDC143C', fg: 'FFFFFFFF', label: 'D - Rejected' },          // Crimson
}

// Status colors for Excel conditional formatting
const STATUS_COLORS: Record<string, string> = {
  not_submitted: 'FFE0E0E0',    // Light gray
  submitted: 'FFFFD700',        // Gold
  under_review: 'FF87CEEB',     // Sky blue
  under_gc_review: 'FF87CEEB',  // Sky blue
  submitted_to_architect: 'FF9370DB', // Purple
  approved: 'FF228B22',         // Green
  approved_as_noted: 'FF9ACD32', // Yellow-green
  revise_resubmit: 'FFFF8C00',  // Orange
  rejected: 'FFDC143C',         // Crimson
  void: 'FF696969',             // Dim gray
}

/**
 * Get status label from value
 */
function getStatusLabel(status: string): string {
  const found = SUBMITTAL_REVIEW_STATUSES.find((s) => s.value === status)
  return found?.label || status
}

/**
 * Get type label from value
 */
function getTypeLabel(type: string): string {
  const found = SUBMITTAL_TYPES.find((t) => t.value === type)
  return found?.label || type
}

/**
 * Get ball-in-court entity label
 */
function getBallInCourtLabel(entity: string | null): string {
  if (!entity) {return ''}
  const found = BALL_IN_COURT_ENTITIES.find((e) => e.value === entity)
  return found?.label || entity
}

/**
 * Format date for export
 */
function formatDate(date: string | null): string {
  if (!date) {return ''}
  try {
    return format(new Date(date), 'MM/dd/yyyy')
  } catch {
    return date
  }
}

/**
 * Get approval code label
 */
function getApprovalCodeLabel(code: string | null | undefined): string {
  if (!code) {return ''}
  return APPROVAL_CODE_COLORS[code]?.label || code
}

/**
 * Convert submittals to export rows
 */
export function submittalsToRows(submittals: SubmittalWithDetails[]): SubmittalExportRow[] {
  return submittals.map((s) => ({
    submittal_number: s.submittal_number,
    revision: s.revision_number,
    spec_section: s.spec_section,
    spec_section_title: s.spec_section_title || '',
    title: s.title,
    type: getTypeLabel(s.submittal_type),
    status: getStatusLabel(s.review_status),
    approval_code: getApprovalCodeLabel(s.approval_code),
    ball_in_court: getBallInCourtLabel(s.ball_in_court_entity),
    subcontractor: s.subcontractor?.company_name || '',
    lead_time_days: s.lead_time_days || null,
    date_required: formatDate(s.date_required),
    date_submitted: formatDate(s.date_submitted),
    date_returned: formatDate(s.date_returned),
    days_in_review: s.days_in_review,
    is_overdue: s.is_overdue || false,
    description: s.description || '',
  }))
}

/**
 * Calculate export summary
 */
export function calculateSubmittalSummary(submittals: SubmittalWithDetails[]): SubmittalExportSummary {
  const by_status: Record<string, number> = {}
  const by_type: Record<string, number> = {}
  const by_approval_code: Record<string, number> = {}
  let overdue = 0
  let totalReviewDays = 0
  let reviewedCount = 0
  let totalLeadTime = 0
  let leadTimeCount = 0

  submittals.forEach((s) => {
    // Count by status
    const statusLabel = getStatusLabel(s.review_status)
    by_status[statusLabel] = (by_status[statusLabel] || 0) + 1

    // Count by type
    const typeLabel = getTypeLabel(s.submittal_type)
    by_type[typeLabel] = (by_type[typeLabel] || 0) + 1

    // Count by approval code
    if (s.approval_code) {
      const codeLabel = getApprovalCodeLabel(s.approval_code)
      by_approval_code[codeLabel] = (by_approval_code[codeLabel] || 0) + 1
    }

    // Count overdue
    if (s.is_overdue) {
      overdue++
    }

    // Calculate average review days
    if (s.days_in_review !== null && s.days_in_review > 0) {
      totalReviewDays += s.days_in_review
      reviewedCount++
    }

    // Calculate average lead time
    if (s.lead_time_days && s.lead_time_days > 0) {
      totalLeadTime += s.lead_time_days
      leadTimeCount++
    }
  })

  return {
    total: submittals.length,
    by_status,
    by_type,
    by_approval_code,
    overdue,
    average_review_days: reviewedCount > 0 ? Math.round(totalReviewDays / reviewedCount) : 0,
    average_lead_time: leadTimeCount > 0 ? Math.round(totalLeadTime / leadTimeCount) : 0,
  }
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Export to CSV
 */
export function exportSubmittalsToCSV(
  submittals: SubmittalWithDetails[],
  projectName?: string
): string {
  const rows = submittalsToRows(submittals)

  // CSV header with new columns
  const header = [
    'Submittal #',
    'Rev',
    'Spec Section',
    'Spec Title',
    'Title',
    'Type',
    'Status',
    'Approval Code',
    'Ball-in-Court',
    'Subcontractor',
    'Lead Time (Days)',
    'Date Required',
    'Date Submitted',
    'Date Returned',
    'Days in Review',
    'Overdue',
    'Description',
  ].join(',')

  // CSV rows
  const csvRows = rows.map((row) => {
    return [
      escapeCSV(row.submittal_number),
      row.revision,
      escapeCSV(row.spec_section),
      escapeCSV(row.spec_section_title),
      escapeCSV(row.title),
      escapeCSV(row.type),
      escapeCSV(row.status),
      escapeCSV(row.approval_code),
      escapeCSV(row.ball_in_court),
      escapeCSV(row.subcontractor),
      row.lead_time_days ?? '',
      row.date_required,
      row.date_submitted,
      row.date_returned,
      row.days_in_review ?? '',
      row.is_overdue ? 'Yes' : 'No',
      escapeCSV(row.description),
    ].join(',')
  })

  // Summary section with approval codes
  const summary = calculateSubmittalSummary(submittals)
  const summaryRows = [
    '',
    'SUBMITTAL LOG SUMMARY',
    `Project,${escapeCSV(projectName || 'Unknown')}`,
    `Date Generated,${format(new Date(), 'MM/dd/yyyy')}`,
    '',
    `Total Submittals,${summary.total}`,
    `Overdue,${summary.overdue}`,
    `Average Review Days,${summary.average_review_days}`,
    `Average Lead Time (Days),${summary.average_lead_time}`,
    '',
    'By Status:',
    ...Object.entries(summary.by_status).map(([status, count]) => `${escapeCSV(status)},${count}`),
    '',
    'By Approval Code:',
    ...Object.entries(summary.by_approval_code).map(([code, count]) => `${escapeCSV(code)},${count}`),
    '',
    'By Type:',
    ...Object.entries(summary.by_type).map(([type, count]) => `${escapeCSV(type)},${count}`),
  ]

  return [header, ...csvRows, ...summaryRows].join('\n')
}

/**
 * Export to Excel (XLSX format)
 * Enhanced with approval codes, lead time, and color-coded statuses
 */
export async function exportSubmittalsToExcel(
  submittals: SubmittalWithDetails[],
  projectName?: string
): Promise<Blob> {
  // Lazy load exceljs library
  const ExcelJS = await import('exceljs')

  const rows = submittalsToRows(submittals)
  const summary = calculateSubmittalSummary(submittals)

  // Create workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JobSight'
  workbook.created = new Date()

  // Submittal Log sheet
  const logSheet = workbook.addWorksheet('Submittal Log')

  // Define columns with headers and widths (enhanced with Approval Code and Lead Time)
  logSheet.columns = [
    { header: 'Submittal #', key: 'submittal_number', width: 15 },
    { header: 'Rev', key: 'revision', width: 5 },
    { header: 'Spec Section', key: 'spec_section', width: 12 },
    { header: 'Spec Title', key: 'spec_section_title', width: 25 },
    { header: 'Title', key: 'title', width: 35 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Approval Code', key: 'approval_code', width: 20 },
    { header: 'Ball-in-Court', key: 'ball_in_court', width: 18 },
    { header: 'Subcontractor', key: 'subcontractor', width: 25 },
    { header: 'Lead Time', key: 'lead_time_days', width: 10 },
    { header: 'Date Required', key: 'date_required', width: 12 },
    { header: 'Date Submitted', key: 'date_submitted', width: 12 },
    { header: 'Date Returned', key: 'date_returned', width: 12 },
    { header: 'Days in Review', key: 'days_in_review', width: 14 },
    { header: 'Overdue', key: 'is_overdue', width: 8 },
    { header: 'Description', key: 'description', width: 40 },
  ]

  // Style header row with professional look
  logSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  logSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D5A8A' }, // Dark blue header
  }
  logSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

  // Add data rows with conditional formatting
  rows.forEach((row, index) => {
    const excelRow = logSheet.addRow({
      ...row,
      is_overdue: row.is_overdue ? 'Yes' : 'No',
      days_in_review: row.days_in_review ?? '',
      lead_time_days: row.lead_time_days ?? '',
    })

    // Find original submittal for raw status value
    const originalSubmittal = submittals[index]

    // Apply status-based background color to status column (column 7)
    const statusCell = excelRow.getCell(7)
    const statusColor = STATUS_COLORS[originalSubmittal.review_status]
    if (statusColor) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusColor },
      }
      // Use white text for dark backgrounds
      if (['approved', 'rejected', 'void', 'submitted_to_architect', 'revise_resubmit'].includes(originalSubmittal.review_status)) {
        statusCell.font = { color: { argb: 'FFFFFFFF' } }
      }
    }

    // Apply approval code coloring (column 8)
    if (originalSubmittal.approval_code) {
      const approvalCodeCell = excelRow.getCell(8)
      const codeColor = APPROVAL_CODE_COLORS[originalSubmittal.approval_code]
      if (codeColor) {
        approvalCodeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: codeColor.bg },
        }
        approvalCodeCell.font = { color: { argb: codeColor.fg }, bold: true }
      }
    }

    // Highlight overdue rows in red
    if (row.is_overdue) {
      const overdueCell = excelRow.getCell(16) // Overdue column
      overdueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCCCB' }, // Light red background
      }
      overdueCell.font = { color: { argb: 'FFCC0000' }, bold: true }

      // Also highlight the date required cell
      const dateRequiredCell = excelRow.getCell(12)
      dateRequiredCell.font = { color: { argb: 'FFCC0000' }, bold: true }
    }
  })

  // Add auto-filter
  logSheet.autoFilter = {
    from: 'A1',
    to: `Q${rows.length + 1}`,
  }

  // Freeze header row
  logSheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary')

  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Value', key: 'value', width: 15 },
  ]

  // Title row
  const titleRow = summarySheet.addRow({ field: 'SUBMITTAL LOG SUMMARY', value: '' })
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D5A8A' },
  }
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }

  summarySheet.addRow({ field: '', value: '' })
  summarySheet.addRow({ field: 'Project:', value: projectName || 'Unknown' })
  summarySheet.addRow({ field: 'Date Generated:', value: format(new Date(), 'MMMM d, yyyy h:mm a') })
  summarySheet.addRow({ field: '', value: '' })

  // Stats with formatting
  summarySheet.addRow({ field: 'Total Submittals:', value: summary.total })

  // Overdue with red highlighting
  const overdueRow = summarySheet.addRow({ field: 'Overdue:', value: summary.overdue })
  if (summary.overdue > 0) {
    overdueRow.getCell(2).font = { color: { argb: 'FFCC0000' }, bold: true }
  }

  summarySheet.addRow({ field: 'Average Review Days:', value: summary.average_review_days })
  summarySheet.addRow({ field: 'Average Lead Time (Days):', value: summary.average_lead_time })
  summarySheet.addRow({ field: '', value: '' })

  // By Status
  const statusHeaderRow = summarySheet.addRow({ field: 'By Status:', value: '' })
  statusHeaderRow.font = { bold: true }
  Object.entries(summary.by_status).forEach(([status, count]) => {
    summarySheet.addRow({ field: status, value: count })
  })
  summarySheet.addRow({ field: '', value: '' })

  // By Approval Code with color coding
  if (Object.keys(summary.by_approval_code).length > 0) {
    const codeHeaderRow = summarySheet.addRow({ field: 'By Approval Code:', value: '' })
    codeHeaderRow.font = { bold: true }
    Object.entries(summary.by_approval_code).forEach(([code, count]) => {
      const row = summarySheet.addRow({ field: code, value: count })
      // Extract just the letter from the label (e.g., "A - Approved" -> "A")
      const letter = code.charAt(0)
      const codeColor = APPROVAL_CODE_COLORS[letter]
      if (codeColor) {
        row.getCell(1).font = { color: { argb: codeColor.bg.replace('FF', '') === '228B22' ? 'FF228B22' : codeColor.bg } }
      }
    })
    summarySheet.addRow({ field: '', value: '' })
  }

  // By Type
  const typeHeaderRow = summarySheet.addRow({ field: 'By Type:', value: '' })
  typeHeaderRow.font = { bold: true }
  Object.entries(summary.by_type).forEach(([type, count]) => {
    summarySheet.addRow({ field: type, value: count })
  })

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return blob
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
 * Download submittal log as Excel
 */
export async function downloadSubmittalLog(
  submittals: SubmittalWithDetails[],
  projectName?: string
): Promise<void> {
  const blob = await exportSubmittalsToExcel(submittals, projectName)
  const filename = `Submittal_Log_${projectName?.replace(/\s+/g, '_') || 'Export'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  downloadFile(blob, filename)
}

/**
 * Download submittal log as CSV
 */
export function downloadSubmittalLogCSV(
  submittals: SubmittalWithDetails[],
  projectName?: string
): void {
  const csv = exportSubmittalsToCSV(submittals, projectName)
  const filename = `Submittal_Log_${projectName?.replace(/\s+/g, '_') || 'Export'}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  downloadFile(csv, filename)
}
