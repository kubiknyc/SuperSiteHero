/**
 * Schedule PDF Export Utility
 *
 * Generates professional PDF exports of schedule data including:
 * - Project header with summary statistics
 * - Milestone table (construction priority)
 * - Activity list with dates and status
 *
 * Uses JobSight branding with GC company logo and information
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import type { ScheduleActivity, ScheduleStats } from '@/types/schedule-activities'
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding'

// ============================================================================
// TYPES
// ============================================================================

interface SchedulePdfOptions {
  /** @deprecated Reserved for company info lookup via getCompanyInfo */
  projectId?: string
  projectName: string
  projectNumber?: string
  activities: ScheduleActivity[]
  stats?: ScheduleStats | null
  includeBaseline?: boolean
  includeMilestones?: boolean
  includeAllActivities?: boolean
  orientation?: 'portrait' | 'landscape'
  gcCompany?: CompanyInfo
}

interface PdfColors {
  primary: [number, number, number]
  secondary: [number, number, number]
  success: [number, number, number]
  warning: [number, number, number]
  danger: [number, number, number]
  gray: [number, number, number]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS: PdfColors = {
  primary: [59, 130, 246],    // Blue
  secondary: [107, 114, 128], // Gray
  success: [34, 197, 94],     // Green
  warning: [245, 158, 11],    // Amber
  danger: [239, 68, 68],      // Red
  gray: [156, 163, 175],      // Light gray
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  not_started: [156, 163, 175],  // Gray
  in_progress: [59, 130, 246],   // Blue
  completed: [34, 197, 94],      // Green
  on_hold: [245, 158, 11],       // Amber
  cancelled: [239, 68, 68],      // Red
}

// ============================================================================
// HELPERS
// ============================================================================

function _formatDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MM/dd/yy')
  } catch {
    return dateString
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

function calculateVariance(
  baseline: string | null | undefined,
  actual: string | null | undefined
): number | null {
  if (!baseline || !actual) {return null}
  try {
    const baselineDate = parseISO(baseline)
    const actualDate = parseISO(actual)
    return Math.round((actualDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

// ============================================================================
// PDF GENERATION
// ============================================================================

export async function generateSchedulePdf(options: SchedulePdfOptions): Promise<jsPDF> {
  const {
    projectId,
    projectName,
    projectNumber,
    activities,
    stats,
    includeBaseline = true,
    includeMilestones = true,
    includeAllActivities = true,
    orientation = 'landscape',
    gcCompany: providedGcCompany,
  } = options

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const _pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  // Fetch company info for branding
  const gcCompany = providedGcCompany || (projectId ? await getCompanyInfo(projectId) : undefined)

  // ========================================
  // HEADER - Using JobSight branding
  // ========================================

  const documentTitle = projectNumber
    ? `${projectName} (${projectNumber})`
    : projectName

  let yPos = await addDocumentHeader(doc, {
    gcCompany,
    documentTitle,
    documentType: 'MASTER SCHEDULE',
  })

  // Old header code removed - now using addDocumentHeader() from pdfBranding

  // ========================================
  // SUMMARY STATISTICS
  // ========================================

  if (stats) {
    doc.setFillColor(248, 250, 252) // Light gray background
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 2, 2, 'F')

    const statItems = [
      { label: 'Total', value: stats.total_activities },
      { label: 'Completed', value: stats.completed_activities, color: COLORS.success },
      { label: 'In Progress', value: stats.in_progress_activities, color: COLORS.primary },
      { label: 'Not Started', value: stats.not_started_activities, color: COLORS.gray },
      { label: 'Critical', value: stats.critical_activities, color: COLORS.danger },
      { label: 'Progress', value: `${stats.overall_progress}%` },
    ]

    const statWidth = (pageWidth - margin * 2) / statItems.length
    statItems.forEach((item, index) => {
      const x = margin + statWidth * index + statWidth / 2

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(item.color || [0, 0, 0]))
      doc.text(String(item.value), x, yPos + 9, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.secondary)
      doc.text(item.label, x, yPos + 15, { align: 'center' })
    })

    yPos += 26
  }

  // ========================================
  // MILESTONES TABLE
  // ========================================

  if (includeMilestones) {
    const milestones = activities.filter(a => a.is_milestone)

    if (milestones.length > 0) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Key Milestones', margin, yPos)
      yPos += 4

      const milestoneData = milestones.map(m => {
        const variance = calculateVariance(m.baseline_finish, m.planned_finish)
        return [
          m.activity_id,
          m.name.substring(0, 40) + (m.name.length > 40 ? '...' : ''),
          formatShortDate(m.planned_finish),
          includeBaseline ? formatShortDate(m.baseline_finish) : '',
          includeBaseline && variance !== null
            ? `${variance > 0 ? '+' : ''}${variance}d`
            : '',
          `${m.percent_complete}%`,
        ].filter((_, i) => includeBaseline || (i !== 3 && i !== 4))
      })

      const milestoneHeaders = [
        'ID',
        'Milestone',
        'Target Date',
        ...(includeBaseline ? ['Baseline', 'Variance'] : []),
        'Progress',
      ]

      autoTable(doc, {
        startY: yPos,
        head: [milestoneHeaders],
        body: milestoneData,
        theme: 'striped',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 22 },
          3: includeBaseline ? { cellWidth: 22 } : {},
          4: includeBaseline ? { cellWidth: 18 } : {},
          [includeBaseline ? 5 : 3]: { cellWidth: 18 },
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          // Color variance cells
          if (includeBaseline && data.column.index === 4 && data.section === 'body') {
            const text = String(data.cell.raw)
            if (text.startsWith('+')) {
              data.cell.styles.textColor = COLORS.danger
            } else if (text.startsWith('-')) {
              data.cell.styles.textColor = COLORS.success
            }
          }
        },
      })

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    }
  }

  // ========================================
  // ALL ACTIVITIES TABLE
  // ========================================

  if (includeAllActivities) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Schedule Activities', margin, yPos)
    yPos += 4

    const activityData = activities.map(a => [
      a.activity_id,
      a.name.substring(0, 35) + (a.name.length > 35 ? '...' : ''),
      formatShortDate(a.planned_start),
      formatShortDate(a.planned_finish),
      a.planned_duration ? `${a.planned_duration}d` : '—',
      getStatusLabel(a.status),
      `${a.percent_complete}%`,
      a.is_critical ? 'Yes' : '',
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Activity Name', 'Start', 'Finish', 'Dur.', 'Status', '%', 'Crit.']],
      body: activityData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 14 },
        5: { cellWidth: 22 },
        6: { cellWidth: 12 },
        7: { cellWidth: 12 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        // Color status cells
        if (data.column.index === 5 && data.section === 'body') {
          const status = activities[data.row.index]?.status
          if (status && STATUS_COLORS[status]) {
            data.cell.styles.textColor = STATUS_COLORS[status]
          }
        }
        // Color critical cells
        if (data.column.index === 7 && data.section === 'body' && data.cell.raw === 'Yes') {
          data.cell.styles.textColor = COLORS.danger
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
  }

  // ========================================
  // FOOTER - Using JobSight branding
  // ========================================

  // Old footer code removed - now using addFootersToAllPages() from pdfBranding
  addFootersToAllPages(doc)

  return doc
}

/**
 * Export schedule to PDF and trigger download
 */
export async function exportScheduleToPdf(options: SchedulePdfOptions): Promise<void> {
  const doc = await generateSchedulePdf(options)
  const filename = `${options.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Schedule_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(filename)
}
