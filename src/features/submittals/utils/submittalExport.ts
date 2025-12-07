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
  ball_in_court: string
  subcontractor: string
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
  overdue: number
  average_review_days: number
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
  if (!entity) return ''
  const found = BALL_IN_COURT_ENTITIES.find((e) => e.value === entity)
  return found?.label || entity
}

/**
 * Format date for export
 */
function formatDate(date: string | null): string {
  if (!date) return ''
  try {
    return format(new Date(date), 'MM/dd/yyyy')
  } catch {
    return date
  }
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
    ball_in_court: getBallInCourtLabel(s.ball_in_court_entity),
    subcontractor: s.subcontractor?.company_name || '',
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
  let overdue = 0
  let totalReviewDays = 0
  let reviewedCount = 0

  submittals.forEach((s) => {
    // Count by status
    const statusLabel = getStatusLabel(s.review_status)
    by_status[statusLabel] = (by_status[statusLabel] || 0) + 1

    // Count by type
    const typeLabel = getTypeLabel(s.submittal_type)
    by_type[typeLabel] = (by_type[typeLabel] || 0) + 1

    // Count overdue
    if (s.is_overdue) {
      overdue++
    }

    // Calculate average review days
    if (s.days_in_review !== null && s.days_in_review > 0) {
      totalReviewDays += s.days_in_review
      reviewedCount++
    }
  })

  return {
    total: submittals.length,
    by_status,
    by_type,
    overdue,
    average_review_days: reviewedCount > 0 ? Math.round(totalReviewDays / reviewedCount) : 0,
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

  // CSV header
  const header = [
    'Submittal #',
    'Rev',
    'Spec Section',
    'Spec Title',
    'Title',
    'Type',
    'Status',
    'Ball-in-Court',
    'Subcontractor',
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
      escapeCSV(row.ball_in_court),
      escapeCSV(row.subcontractor),
      row.date_required,
      row.date_submitted,
      row.date_returned,
      row.days_in_review ?? '',
      row.is_overdue ? 'Yes' : 'No',
      escapeCSV(row.description),
    ].join(',')
  })

  // Summary section
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
    '',
    'By Status:',
    ...Object.entries(summary.by_status).map(([status, count]) => `${escapeCSV(status)},${count}`),
    '',
    'By Type:',
    ...Object.entries(summary.by_type).map(([type, count]) => `${escapeCSV(type)},${count}`),
  ]

  return [header, ...csvRows, ...summaryRows].join('\n')
}

/**
 * Export to Excel (XLSX format)
 * Uses the xlsx library which is lazy loaded
 */
export async function exportSubmittalsToExcel(
  submittals: SubmittalWithDetails[],
  projectName?: string
): Promise<Blob> {
  // Lazy load xlsx library
  const XLSX = await import('xlsx')

  const rows = submittalsToRows(submittals)
  const summary = calculateSubmittalSummary(submittals)

  // Create workbook
  const wb = XLSX.utils.book_new()

  // Submittal Log sheet
  const logData = [
    [
      'Submittal #',
      'Rev',
      'Spec Section',
      'Spec Title',
      'Title',
      'Type',
      'Status',
      'Ball-in-Court',
      'Subcontractor',
      'Date Required',
      'Date Submitted',
      'Date Returned',
      'Days in Review',
      'Overdue',
      'Description',
    ],
    ...rows.map((row) => [
      row.submittal_number,
      row.revision,
      row.spec_section,
      row.spec_section_title,
      row.title,
      row.type,
      row.status,
      row.ball_in_court,
      row.subcontractor,
      row.date_required,
      row.date_submitted,
      row.date_returned,
      row.days_in_review ?? '',
      row.is_overdue ? 'Yes' : 'No',
      row.description,
    ]),
  ]

  const wsLog = XLSX.utils.aoa_to_sheet(logData)

  // Set column widths
  wsLog['!cols'] = [
    { wch: 15 }, // Submittal #
    { wch: 5 },  // Rev
    { wch: 12 }, // Spec Section
    { wch: 25 }, // Spec Title
    { wch: 35 }, // Title
    { wch: 18 }, // Type
    { wch: 20 }, // Status
    { wch: 18 }, // Ball-in-Court
    { wch: 25 }, // Subcontractor
    { wch: 12 }, // Date Required
    { wch: 12 }, // Date Submitted
    { wch: 12 }, // Date Returned
    { wch: 14 }, // Days in Review
    { wch: 8 },  // Overdue
    { wch: 40 }, // Description
  ]

  XLSX.utils.book_append_sheet(wb, wsLog, 'Submittal Log')

  // Summary sheet
  const summaryData = [
    ['Submittal Log Summary'],
    [],
    ['Project:', projectName || 'Unknown'],
    ['Date Generated:', format(new Date(), 'MMMM d, yyyy')],
    [],
    ['Total Submittals:', summary.total],
    ['Overdue:', summary.overdue],
    ['Average Review Days:', summary.average_review_days],
    [],
    ['By Status:'],
    ['Status', 'Count'],
    ...Object.entries(summary.by_status).map(([status, count]) => [status, count]),
    [],
    ['By Type:'],
    ['Type', 'Count'],
    ...Object.entries(summary.by_type).map(([type, count]) => [type, count]),
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths for summary
  wsSummary['!cols'] = [
    { wch: 25 },
    { wch: 15 },
  ]

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
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
