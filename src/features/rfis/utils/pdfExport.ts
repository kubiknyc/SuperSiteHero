/**
 * PDF Export Utilities for RFIs
 * Generates professional RFI documents for distribution and archival
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type {
  RFI,
  RFIWithDetails,
  RFIAttachment,
  RFICommentWithUser,
  RFIStatus,
  RFIPriority,
  RFIResponseType,
} from '@/types/rfi'
import { formatRFINumber, getRFIResponseTypeLabel } from '@/types/rfi'

// Page dimensions (Letter size)
const PAGE_WIDTH = 215.9 // 8.5"
const PAGE_HEIGHT = 279.4 // 11"
const MARGIN = 15

const COLORS = {
  black: [0, 0, 0] as [number, number, number],
  darkGray: [51, 51, 51] as [number, number, number],
  mediumGray: [128, 128, 128] as [number, number, number],
  lightGray: [200, 200, 200] as [number, number, number],
  veryLightGray: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  headerBlue: [0, 51, 102] as [number, number, number],
  headerBg: [230, 230, 230] as [number, number, number],
  urgentRed: [220, 38, 38] as [number, number, number],
  successGreen: [22, 163, 74] as [number, number, number],
}

const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

/**
 * PDF generation data interface
 */
export interface RFIPDFData {
  rfi: RFIWithDetails
  projectInfo?: {
    name: string
    number?: string
    address?: string
    owner?: string
    contractor?: string
  }
  includeComments?: boolean
  includeAttachments?: boolean
}

/**
 * Format date for documents
 */
function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A'
  try {
    return format(new Date(date), 'MMMM d, yyyy')
  } catch {
    return date
  }
}

/**
 * Format date short
 */
function formatDateShort(date: string | null | undefined): string {
  if (!date) return 'N/A'
  try {
    return format(new Date(date), 'MMM d, yyyy')
  } catch {
    return date
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: RFIStatus): string {
  const labels: Record<RFIStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    responded: 'Responded',
    approved: 'Approved',
    rejected: 'Rejected',
    closed: 'Closed',
  }
  return labels[status] || status
}

/**
 * Get priority label
 */
function getPriorityLabel(priority: RFIPriority): string {
  const labels: Record<RFIPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    critical: 'Critical',
  }
  return labels[priority] || priority
}

/**
 * Draw document header
 */
function drawHeader(doc: jsPDF, data: RFIPDFData): number {
  let y = MARGIN
  const rfi = data.rfi

  // Title bar
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 12, 'F')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('REQUEST FOR INFORMATION', PAGE_WIDTH / 2, y + 8, { align: 'center' })

  y += 14

  // RFI Number and Date
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)

  const rfiNumber = formatRFINumber(rfi.rfi_number)
  doc.text(rfiNumber, MARGIN, y + 5)

  const dateText = formatDate(rfi.date_created || rfi.created_at)
  doc.text(dateText, PAGE_WIDTH - MARGIN, y + 5, { align: 'right' })

  y += 10

  return y
}

/**
 * Draw project information section
 */
function drawProjectInfo(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const rfi = data.rfi
  const colWidth = CONTENT_WIDTH / 2 - 2
  const rowHeight = 8

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('PROJECT INFORMATION', MARGIN + 2, y + 4)
  y += 8

  doc.setFontSize(8)

  // Row 1 - Project Name
  doc.setFont('helvetica', 'bold')
  doc.text('Project:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  const projectName = data.projectInfo?.name || rfi.project?.name || 'N/A'
  const projectNumber = data.projectInfo?.number || rfi.project?.number || ''
  doc.text(`${projectName}${projectNumber ? ` (#${projectNumber})` : ''}`, MARGIN + 20, y + 4)

  // Status
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', MARGIN + colWidth + 4, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(getStatusLabel(rfi.status), MARGIN + colWidth + 20, y + 4)

  y += rowHeight

  // Row 2 - From/To
  if (rfi.submitted_by_user) {
    doc.setFont('helvetica', 'bold')
    doc.text('From:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(rfi.submitted_by_user.full_name || 'N/A', MARGIN + 20, y + 4)
  }

  if (rfi.assigned_to_user) {
    doc.setFont('helvetica', 'bold')
    doc.text('To:', MARGIN + colWidth + 4, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(rfi.assigned_to_user.full_name || 'N/A', MARGIN + colWidth + 20, y + 4)
  }

  y += rowHeight

  // Row 3 - Priority and Discipline
  doc.setFont('helvetica', 'bold')
  doc.text('Priority:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(getPriorityLabel(rfi.priority), MARGIN + 20, y + 4)

  if (rfi.discipline) {
    doc.setFont('helvetica', 'bold')
    doc.text('Discipline:', MARGIN + colWidth + 4, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(rfi.discipline, MARGIN + colWidth + 28, y + 4)
  }

  y += rowHeight + 2

  return y
}

/**
 * Draw dates section
 */
function drawDatesSection(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const rfi = data.rfi
  const colWidth = CONTENT_WIDTH / 3

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('DATES', MARGIN + 2, y + 4)
  y += 8

  doc.setFontSize(8)

  // Date submitted
  doc.setFont('helvetica', 'bold')
  doc.text('Date Submitted:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateShort(rfi.date_submitted), MARGIN + 35, y + 4)

  // Date Required
  doc.setFont('helvetica', 'bold')
  doc.text('Date Required:', MARGIN + colWidth, y + 4)
  doc.setFont('helvetica', 'normal')
  if (rfi.is_overdue && rfi.date_required) {
    doc.setTextColor(...COLORS.urgentRed)
    doc.text(`${formatDateShort(rfi.date_required)} (OVERDUE)`, MARGIN + colWidth + 32, y + 4)
    doc.setTextColor(...COLORS.black)
  } else {
    doc.text(formatDateShort(rfi.date_required), MARGIN + colWidth + 32, y + 4)
  }

  // Date Responded
  doc.setFont('helvetica', 'bold')
  doc.text('Date Responded:', MARGIN + colWidth * 2, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateShort(rfi.date_responded), MARGIN + colWidth * 2 + 35, y + 4)

  y += 10

  return y
}

/**
 * Draw references section
 */
function drawReferences(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const rfi = data.rfi

  // Check if we have any references
  const hasRefs = rfi.spec_section || rfi.drawing_reference || rfi.location
  if (!hasRefs) return y

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('REFERENCES', MARGIN + 2, y + 4)
  y += 8

  doc.setFontSize(8)
  const colWidth = CONTENT_WIDTH / 3

  if (rfi.spec_section) {
    doc.setFont('helvetica', 'bold')
    doc.text('Spec Section:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(rfi.spec_section, MARGIN + 28, y + 4)
  }

  if (rfi.drawing_reference) {
    doc.setFont('helvetica', 'bold')
    doc.text('Drawing:', MARGIN + colWidth, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(rfi.drawing_reference, MARGIN + colWidth + 20, y + 4)
  }

  if (rfi.location) {
    doc.setFont('helvetica', 'bold')
    doc.text('Location:', MARGIN + colWidth * 2, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(rfi.location, MARGIN + colWidth * 2 + 20, y + 4)
  }

  y += 10

  return y
}

/**
 * Draw question section
 */
function drawQuestion(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const rfi = data.rfi

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('QUESTION', MARGIN + 2, y + 4)
  y += 8

  // Subject
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Subject:', MARGIN, y + 5)
  doc.setFont('helvetica', 'normal')
  const subjectLines = doc.splitTextToSize(rfi.subject, CONTENT_WIDTH - 25)
  doc.text(subjectLines, MARGIN + 20, y + 5)
  y += subjectLines.length * 5 + 3

  // Question text
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Draw question in a box
  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.3)

  const questionLines = doc.splitTextToSize(rfi.question || 'No question provided', CONTENT_WIDTH - 8)
  const questionHeight = questionLines.length * 4 + 8

  doc.rect(MARGIN, y, CONTENT_WIDTH, questionHeight, 'S')
  doc.text(questionLines, MARGIN + 4, y + 6)

  y += questionHeight + 5

  return y
}

/**
 * Draw response section
 */
function drawResponse(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const rfi = data.rfi

  // Check for page break
  if (y + 40 > PAGE_HEIGHT - 40) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  const hasResponse = rfi.response && rfi.response.trim().length > 0
  doc.setFillColor(...(hasResponse ? COLORS.successGreen : COLORS.headerBg))
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...(hasResponse ? COLORS.white : COLORS.black))
  doc.text('RESPONSE', MARGIN + 2, y + 4)
  doc.setTextColor(...COLORS.black)
  y += 8

  if (!hasResponse) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COLORS.mediumGray)
    doc.text('Awaiting response...', MARGIN, y + 5)
    doc.setTextColor(...COLORS.black)
    y += 10
    return y
  }

  // Response type and responder info
  doc.setFontSize(8)
  if (rfi.response_type) {
    doc.setFont('helvetica', 'bold')
    doc.text('Response Type:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(getRFIResponseTypeLabel(rfi.response_type), MARGIN + 33, y + 4)
  }

  if (rfi.responded_by_user) {
    doc.setFont('helvetica', 'bold')
    doc.text('Responded By:', MARGIN + CONTENT_WIDTH / 2, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(rfi.responded_by_user.full_name || 'N/A', MARGIN + CONTENT_WIDTH / 2 + 32, y + 4)
  }

  y += 8

  // Response text
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(...COLORS.successGreen)
  doc.setLineWidth(0.5)

  const responseLines = doc.splitTextToSize(rfi.response!, CONTENT_WIDTH - 8)
  const responseHeight = responseLines.length * 4 + 8

  doc.rect(MARGIN, y, CONTENT_WIDTH, responseHeight, 'S')
  doc.text(responseLines, MARGIN + 4, y + 6)

  y += responseHeight + 5

  // Cost and schedule impact
  if (rfi.cost_impact || rfi.schedule_impact_days) {
    doc.setFontSize(8)
    doc.setDrawColor(...COLORS.lightGray)

    if (rfi.cost_impact) {
      doc.setFont('helvetica', 'bold')
      doc.text('Cost Impact:', MARGIN, y + 4)
      doc.setFont('helvetica', 'normal')
      const costFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(rfi.cost_impact)
      doc.text(costFormatted, MARGIN + 28, y + 4)
    }

    if (rfi.schedule_impact_days) {
      doc.setFont('helvetica', 'bold')
      doc.text('Schedule Impact:', MARGIN + CONTENT_WIDTH / 2, y + 4)
      doc.setFont('helvetica', 'normal')
      doc.text(`${rfi.schedule_impact_days} days`, MARGIN + CONTENT_WIDTH / 2 + 35, y + 4)
    }

    y += 10
  }

  return y
}

/**
 * Draw distribution list
 */
function drawDistributionList(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const rfi = data.rfi

  if (!rfi.distribution_list || rfi.distribution_list.length === 0) {
    return y
  }

  // Check for page break
  if (y + 30 > PAGE_HEIGHT - 40) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('DISTRIBUTION', MARGIN + 2, y + 4)
  y += 8

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  // Just show the count or IDs since we may not have user names
  doc.text(`${rfi.distribution_list.length} recipient(s) in distribution list`, MARGIN, y + 4)
  y += 8

  return y
}

/**
 * Draw attachments list
 */
function drawAttachments(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const attachments = data.rfi.attachments || []

  if (attachments.length === 0 || !data.includeAttachments) {
    return y
  }

  // Check for page break
  if (y + 30 > PAGE_HEIGHT - 40) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text(`ATTACHMENTS (${attachments.length})`, MARGIN + 2, y + 4)
  y += 8

  // Attachments table
  const tableData = attachments.map((att, idx) => [
    (idx + 1).toString(),
    att.file_name || 'Unnamed file',
    att.attachment_type || 'general',
    formatDateShort(att.created_at),
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'File Name', 'Type', 'Date']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: COLORS.darkGray,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.veryLightGray,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
    },
  })

  return (doc as any).lastAutoTable.finalY + 5
}

/**
 * Draw comments section
 */
function drawComments(doc: jsPDF, data: RFIPDFData, startY: number): number {
  let y = startY
  const comments = data.rfi.comments || []

  if (comments.length === 0 || !data.includeComments) {
    return y
  }

  // Check for page break
  if (y + 40 > PAGE_HEIGHT - 40) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text(`COMMENTS (${comments.length})`, MARGIN + 2, y + 4)
  y += 10

  doc.setFontSize(8)

  for (const comment of comments) {
    // Check for page break
    if (y + 20 > PAGE_HEIGHT - 40) {
      doc.addPage()
      y = MARGIN
    }

    // Comment header
    doc.setFont('helvetica', 'bold')
    const authorName = comment.created_by_user?.full_name || 'Unknown'
    const commentDate = formatDateShort(comment.created_at)
    doc.text(`${authorName} - ${commentDate}`, MARGIN, y + 4)

    if (comment.comment_type !== 'comment') {
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(...COLORS.mediumGray)
      doc.text(`[${comment.comment_type.replace('_', ' ')}]`, MARGIN + 80, y + 4)
      doc.setTextColor(...COLORS.black)
    }

    y += 6

    // Comment text
    doc.setFont('helvetica', 'normal')
    const commentLines = doc.splitTextToSize(comment.comment, CONTENT_WIDTH - 4)
    doc.text(commentLines, MARGIN + 2, y + 3)
    y += commentLines.length * 4 + 6
  }

  return y
}

/**
 * Draw footer
 */
function drawFooter(doc: jsPDF, data: RFIPDFData): void {
  const pageCount = doc.getNumberOfPages()
  const rfi = data.rfi

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)

    doc.setFontSize(7)
    doc.setTextColor(...COLORS.mediumGray)

    // RFI number
    const rfiNumber = formatRFINumber(rfi.rfi_number)
    doc.text(rfiNumber, MARGIN, PAGE_HEIGHT - 7)

    // Generated date
    doc.text(
      `Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 7,
      { align: 'center' }
    )

    // Page number
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, { align: 'right' })
  }
}

/**
 * Generate RFI PDF
 */
export async function generateRFIPDF(data: RFIPDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  // Draw sections
  let y = drawHeader(doc, data)
  y = drawProjectInfo(doc, data, y)
  y = drawDatesSection(doc, data, y)
  y = drawReferences(doc, data, y)
  y = drawQuestion(doc, data, y)
  y = drawResponse(doc, data, y)
  y = drawDistributionList(doc, data, y)
  y = drawAttachments(doc, data, y)
  y = drawComments(doc, data, y)

  // Add footer
  drawFooter(doc, data)

  return doc.output('blob')
}

/**
 * Download RFI PDF
 */
export async function downloadRFIPDF(data: RFIPDFData): Promise<void> {
  const blob = await generateRFIPDF(data)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const rfi = data.rfi
  const rfiNumber = formatRFINumber(rfi.rfi_number).replace('-', '')
  const projectName = (data.projectInfo?.name || rfi.project?.name || 'Project')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `RFI_${rfiNumber}_${projectName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate RFI Log PDF (summary of multiple RFIs)
 */
export async function generateRFILogPDF(
  rfis: RFIWithDetails[],
  projectName: string
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = 279.4
  const pageHeight = 215.9
  const margin = 15
  const contentWidth = pageWidth - 2 * margin

  let y = margin

  // Header
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(margin, y, contentWidth, 10, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('RFI LOG', pageWidth / 2, y + 7, { align: 'center' })
  y += 12

  // Project name
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.text(`Project: ${projectName}`, margin, y + 5)
  doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth - margin, y + 5, { align: 'right' })
  y += 10

  // Summary stats
  const openCount = rfis.filter(r => ['draft', 'submitted', 'under_review'].includes(r.status)).length
  const overdueCount = rfis.filter(r => r.is_overdue).length
  const respondedCount = rfis.filter(r => ['responded', 'approved', 'closed'].includes(r.status)).length

  doc.setFontSize(8)
  doc.text(`Total: ${rfis.length}  |  Open: ${openCount}  |  Overdue: ${overdueCount}  |  Responded: ${respondedCount}`, margin, y + 4)
  y += 8

  // Table
  const tableData = rfis.map(rfi => [
    formatRFINumber(rfi.rfi_number),
    rfi.subject.substring(0, 50) + (rfi.subject.length > 50 ? '...' : ''),
    getStatusLabel(rfi.status),
    getPriorityLabel(rfi.priority),
    rfi.discipline || '-',
    rfi.assigned_to_user?.full_name || '-',
    formatDateShort(rfi.date_submitted),
    formatDateShort(rfi.date_required),
    rfi.is_overdue ? 'Yes' : '-',
  ])

  autoTable(doc, {
    startY: y,
    head: [['RFI #', 'Subject', 'Status', 'Priority', 'Discipline', 'Assigned To', 'Submitted', 'Required', 'Overdue']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: COLORS.darkGray,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.veryLightGray,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 18 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30 },
      6: { cellWidth: 22 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18 },
    },
    didParseCell: (cellData) => {
      // Highlight overdue
      if (cellData.column.index === 8 && cellData.cell.raw === 'Yes') {
        cellData.cell.styles.textColor = COLORS.urgentRed
        cellData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.mediumGray)
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, margin, pageHeight - 5)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' })
  }

  return doc.output('blob')
}

/**
 * Download RFI Log PDF
 */
export async function downloadRFILogPDF(
  rfis: RFIWithDetails[],
  projectName: string
): Promise<void> {
  const blob = await generateRFILogPDF(rfis, projectName)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `RFI_Log_${safeName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
