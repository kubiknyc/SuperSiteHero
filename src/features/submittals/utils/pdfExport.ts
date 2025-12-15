/**
 * PDF Export Utilities for Submittals
 * Generates professional Submittal documents for distribution and archival
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type {
  Submittal,
  SubmittalWithDetails,
  SubmittalItem,
  SubmittalAttachment,
  SubmittalReviewWithUser,
  SubmittalReviewStatus,
  SubmittalType,
  SubmittalApprovalCode,
} from '@/types/submittal'
import {
  formatSubmittalNumber,
  getSubmittalTypeLabel,
  getApprovalCodeLabel,
} from '@/types/submittal'

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
  approvedGreen: [22, 163, 74] as [number, number, number],
  approvedAsNotedLime: [132, 204, 22] as [number, number, number],
  reviseOrange: [249, 115, 22] as [number, number, number],
}

const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

/**
 * PDF generation data interface
 */
export interface SubmittalPDFData {
  submittal: SubmittalWithDetails
  projectInfo?: {
    name: string
    number?: string
    address?: string
    owner?: string
    contractor?: string
    architect?: string
  }
  includeItems?: boolean
  includeReviews?: boolean
  includeAttachments?: boolean
}

/**
 * Format date for documents
 */
function formatDate(date: string | null | undefined): string {
  if (!date) {return 'N/A'}
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
  if (!date) {return 'N/A'}
  try {
    return format(new Date(date), 'MMM d, yyyy')
  } catch {
    return date
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: SubmittalReviewStatus): string {
  const labels: Record<SubmittalReviewStatus, string> = {
    not_submitted: 'Not Submitted',
    submitted: 'Submitted',
    under_gc_review: 'Under GC Review',
    submitted_to_architect: 'Submitted to Architect',
    approved: 'Approved',
    approved_as_noted: 'Approved as Noted',
    revise_resubmit: 'Revise & Resubmit',
    rejected: 'Rejected',
  }
  return labels[status] || status
}

/**
 * Get approval code color
 */
function getApprovalCodeColor(code: SubmittalApprovalCode): [number, number, number] {
  switch (code) {
    case 'A':
      return COLORS.approvedGreen
    case 'B':
      return COLORS.approvedAsNotedLime
    case 'C':
      return COLORS.reviseOrange
    case 'D':
      return COLORS.urgentRed
    default:
      return COLORS.mediumGray
  }
}

/**
 * Draw document header
 */
function drawHeader(doc: jsPDF, data: SubmittalPDFData): number {
  let y = MARGIN
  const submittal = data.submittal

  // Title bar
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 12, 'F')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('SUBMITTAL', PAGE_WIDTH / 2, y + 8, { align: 'center' })

  y += 14

  // Submittal Number and Spec Section
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)

  const submittalNumber = formatSubmittalNumber(submittal.submittal_number, submittal.revision_number)
  doc.text(submittalNumber, MARGIN, y + 5)

  const dateText = formatDate(submittal.date_submitted || submittal.created_at)
  doc.text(dateText, PAGE_WIDTH - MARGIN, y + 5, { align: 'right' })

  y += 10

  // Approval Code Badge (prominent display)
  if (submittal.approval_code) {
    const code = submittal.approval_code
    const codeLabel = getApprovalCodeLabel(code)
    const codeColor = getApprovalCodeColor(code)

    // Draw approval code box
    const boxWidth = 60
    const boxHeight = 15
    const boxX = (PAGE_WIDTH - boxWidth) / 2

    doc.setFillColor(...codeColor)
    doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, 'F')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text(`${code} - ${codeLabel}`, PAGE_WIDTH / 2, y + 10, { align: 'center' })

    doc.setTextColor(...COLORS.black)
    y += boxHeight + 5
  }

  return y
}

/**
 * Draw project information section
 */
function drawProjectInfo(doc: jsPDF, data: SubmittalPDFData, startY: number): number {
  let y = startY
  const submittal = data.submittal
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
  const projectName = data.projectInfo?.name || submittal.project?.name || 'N/A'
  const projectNumber = data.projectInfo?.number || submittal.project?.number || ''
  doc.text(`${projectName}${projectNumber ? ` (#${projectNumber})` : ''}`, MARGIN + 20, y + 4)

  // Status
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', MARGIN + colWidth + 4, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(getStatusLabel(submittal.review_status), MARGIN + colWidth + 20, y + 4)

  y += rowHeight

  // Row 2 - Spec Section and Type
  doc.setFont('helvetica', 'bold')
  doc.text('Spec Section:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  const specInfo = submittal.spec_section_title
    ? `${submittal.spec_section} - ${submittal.spec_section_title}`
    : submittal.spec_section
  doc.text(specInfo, MARGIN + 28, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.text('Type:', MARGIN + colWidth + 4, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(getSubmittalTypeLabel(submittal.submittal_type), MARGIN + colWidth + 18, y + 4)

  y += rowHeight

  // Row 3 - Subcontractor and Discipline
  if (submittal.subcontractor) {
    doc.setFont('helvetica', 'bold')
    doc.text('Subcontractor:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(submittal.subcontractor.company_name, MARGIN + 32, y + 4)
  }

  if (submittal.discipline) {
    doc.setFont('helvetica', 'bold')
    doc.text('Discipline:', MARGIN + colWidth + 4, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(submittal.discipline, MARGIN + colWidth + 28, y + 4)
  }

  y += rowHeight + 2

  return y
}

/**
 * Draw dates section
 */
function drawDatesSection(doc: jsPDF, data: SubmittalPDFData, startY: number): number {
  let y = startY
  const submittal = data.submittal
  const colWidth = CONTENT_WIDTH / 4

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('DATES', MARGIN + 2, y + 4)
  y += 8

  doc.setFontSize(8)

  // Date Submitted
  doc.setFont('helvetica', 'bold')
  doc.text('Submitted:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateShort(submittal.date_submitted), MARGIN + 25, y + 4)

  // Date Required
  doc.setFont('helvetica', 'bold')
  doc.text('Required:', MARGIN + colWidth, y + 4)
  doc.setFont('helvetica', 'normal')
  if (submittal.is_overdue && submittal.date_required) {
    doc.setTextColor(...COLORS.urgentRed)
    doc.text(`${formatDateShort(submittal.date_required)} (OVERDUE)`, MARGIN + colWidth + 22, y + 4)
    doc.setTextColor(...COLORS.black)
  } else {
    doc.text(formatDateShort(submittal.date_required), MARGIN + colWidth + 22, y + 4)
  }

  // Date Received
  doc.setFont('helvetica', 'bold')
  doc.text('Received:', MARGIN + colWidth * 2, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateShort(submittal.date_received), MARGIN + colWidth * 2 + 23, y + 4)

  // Date Returned
  doc.setFont('helvetica', 'bold')
  doc.text('Returned:', MARGIN + colWidth * 3, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateShort(submittal.date_returned), MARGIN + colWidth * 3 + 22, y + 4)

  y += 10

  return y
}

/**
 * Draw submittal details section
 */
function drawSubmittalDetails(doc: jsPDF, data: SubmittalPDFData, startY: number): number {
  let y = startY
  const submittal = data.submittal

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('SUBMITTAL DETAILS', MARGIN + 2, y + 4)
  y += 8

  // Title
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Title:', MARGIN, y + 5)
  doc.setFont('helvetica', 'normal')
  const titleLines = doc.splitTextToSize(submittal.title, CONTENT_WIDTH - 20)
  doc.text(titleLines, MARGIN + 15, y + 5)
  y += titleLines.length * 5 + 3

  // Description
  if (submittal.description) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Description:', MARGIN, y + 4)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.3)

    const descLines = doc.splitTextToSize(submittal.description, CONTENT_WIDTH - 8)
    const descHeight = descLines.length * 4 + 8

    doc.rect(MARGIN, y, CONTENT_WIDTH, descHeight, 'S')
    doc.text(descLines, MARGIN + 4, y + 6)

    y += descHeight + 5
  }

  return y
}

/**
 * Draw items table
 */
function drawItemsTable(doc: jsPDF, data: SubmittalPDFData, startY: number): number {
  let y = startY
  const items = data.submittal.items || []

  if (items.length === 0 || !data.includeItems) {
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
  doc.text(`ITEMS (${items.length})`, MARGIN + 2, y + 4)
  y += 8

  // Items table
  const tableData = items.map((item, idx) => [
    (idx + 1).toString(),
    item.description.substring(0, 50) + (item.description.length > 50 ? '...' : ''),
    item.manufacturer || '-',
    item.model_number || '-',
    item.quantity ? item.quantity.toString() : '-',
    item.unit || '-',
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Manufacturer', 'Model #', 'Qty', 'Unit']],
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
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
    },
  })

  return (doc as any).lastAutoTable.finalY + 5
}

/**
 * Draw review history
 */
function drawReviewHistory(doc: jsPDF, data: SubmittalPDFData, startY: number): number {
  let y = startY
  const reviews = data.submittal.reviews || []

  if (reviews.length === 0 || !data.includeReviews) {
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
  doc.text(`REVIEW HISTORY (${reviews.length})`, MARGIN + 2, y + 4)
  y += 10

  doc.setFontSize(8)

  for (const review of reviews) {
    // Check for page break
    if (y + 25 > PAGE_HEIGHT - 40) {
      doc.addPage()
      y = MARGIN
    }

    // Review header
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y += 4

    // Reviewer and date
    doc.setFont('helvetica', 'bold')
    const reviewerName = review.reviewed_by_user?.full_name || review.reviewer_name || 'Unknown'
    const reviewDate = formatDateShort(review.reviewed_at)
    doc.text(`${reviewerName}`, MARGIN, y + 4)

    doc.setFont('helvetica', 'normal')
    doc.text(reviewDate, MARGIN + 60, y + 4)

    // Status and approval code
    doc.text(getStatusLabel(review.review_status), MARGIN + 100, y + 4)

    if (review.approval_code) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...getApprovalCodeColor(review.approval_code))
      doc.text(`[${review.approval_code}]`, MARGIN + 150, y + 4)
      doc.setTextColor(...COLORS.black)
    }

    y += 8

    // Comments
    if (review.comments) {
      doc.setFont('helvetica', 'normal')
      const commentLines = doc.splitTextToSize(review.comments, CONTENT_WIDTH - 8)
      doc.text(commentLines, MARGIN + 4, y + 3)
      y += commentLines.length * 4 + 4
    }

    y += 3
  }

  return y
}

/**
 * Draw review comments section (current)
 */
function drawReviewComments(doc: jsPDF, data: SubmittalPDFData, startY: number): number {
  let y = startY
  const submittal = data.submittal

  if (!submittal.review_comments) {
    return y
  }

  // Check for page break
  if (y + 30 > PAGE_HEIGHT - 40) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  const isApproved = ['approved', 'approved_as_noted'].includes(submittal.review_status)
  doc.setFillColor(...(isApproved ? COLORS.approvedGreen : COLORS.headerBg))
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...(isApproved ? COLORS.white : COLORS.black))
  doc.text('REVIEW COMMENTS', MARGIN + 2, y + 4)
  doc.setTextColor(...COLORS.black)
  y += 8

  // Comments text
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(...(isApproved ? COLORS.approvedGreen : COLORS.lightGray))
  doc.setLineWidth(0.5)

  const commentLines = doc.splitTextToSize(submittal.review_comments, CONTENT_WIDTH - 8)
  const commentHeight = commentLines.length * 4 + 8

  doc.rect(MARGIN, y, CONTENT_WIDTH, commentHeight, 'S')
  doc.text(commentLines, MARGIN + 4, y + 6)

  y += commentHeight + 5

  return y
}

/**
 * Draw attachments list
 */
function drawAttachments(doc: jsPDF, data: SubmittalPDFData, startY: number): number {
  let y = startY
  const attachments = data.submittal.attachments || []

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
    att.file_type || '-',
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
 * Draw footer
 */
function drawFooter(doc: jsPDF, data: SubmittalPDFData): void {
  const pageCount = doc.getNumberOfPages()
  const submittal = data.submittal

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)

    doc.setFontSize(7)
    doc.setTextColor(...COLORS.mediumGray)

    // Submittal number
    const submittalNumber = formatSubmittalNumber(submittal.submittal_number, submittal.revision_number)
    doc.text(submittalNumber, MARGIN, PAGE_HEIGHT - 7)

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
 * Generate Submittal PDF
 */
export async function generateSubmittalPDF(data: SubmittalPDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  // Default options
  const options = {
    includeItems: data.includeItems ?? true,
    includeReviews: data.includeReviews ?? true,
    includeAttachments: data.includeAttachments ?? true,
    ...data,
  }

  // Draw sections
  let y = drawHeader(doc, options)
  y = drawProjectInfo(doc, options, y)
  y = drawDatesSection(doc, options, y)
  y = drawSubmittalDetails(doc, options, y)
  y = drawItemsTable(doc, options, y)
  y = drawReviewComments(doc, options, y)
  y = drawReviewHistory(doc, options, y)
  y = drawAttachments(doc, options, y)

  // Add footer
  drawFooter(doc, options)

  return doc.output('blob')
}

/**
 * Download Submittal PDF
 */
export async function downloadSubmittalPDF(data: SubmittalPDFData): Promise<void> {
  const blob = await generateSubmittalPDF(data)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const submittal = data.submittal
  const submittalNumber = submittal.submittal_number.replace(/\s+/g, '_')
  const projectName = (data.projectInfo?.name || submittal.project?.name || 'Project')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `Submittal_${submittalNumber}_${projectName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate Submittal Log PDF (summary of multiple submittals)
 */
export async function generateSubmittalLogPDF(
  submittals: SubmittalWithDetails[],
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
  doc.text('SUBMITTAL LOG', pageWidth / 2, y + 7, { align: 'center' })
  y += 12

  // Project name
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.text(`Project: ${projectName}`, margin, y + 5)
  doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth - margin, y + 5, { align: 'right' })
  y += 10

  // Summary stats
  const approvedCount = submittals.filter(s => ['approved', 'approved_as_noted'].includes(s.review_status)).length
  const pendingCount = submittals.filter(s => ['submitted', 'under_gc_review', 'submitted_to_architect'].includes(s.review_status)).length
  const overdueCount = submittals.filter(s => s.is_overdue).length
  const rejectedCount = submittals.filter(s => s.review_status === 'rejected').length

  doc.setFontSize(8)
  doc.text(`Total: ${submittals.length}  |  Approved: ${approvedCount}  |  Pending: ${pendingCount}  |  Overdue: ${overdueCount}  |  Rejected: ${rejectedCount}`, margin, y + 4)
  y += 8

  // Table
  const tableData = submittals.map(sub => [
    formatSubmittalNumber(sub.submittal_number, sub.revision_number),
    sub.title.substring(0, 40) + (sub.title.length > 40 ? '...' : ''),
    sub.spec_section,
    getSubmittalTypeLabel(sub.submittal_type),
    getStatusLabel(sub.review_status),
    sub.approval_code || '-',
    sub.subcontractor?.company_name || '-',
    formatDateShort(sub.date_submitted),
    formatDateShort(sub.date_required),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Submittal #', 'Title', 'Spec', 'Type', 'Status', 'Code', 'Subcontractor', 'Submitted', 'Required']],
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
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 25 },
      4: { cellWidth: 28 },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 30 },
      7: { cellWidth: 22 },
      8: { cellWidth: 22 },
    },
    didParseCell: (cellData) => {
      // Color approval codes
      if (cellData.column.index === 5 && cellData.section === 'body') {
        const code = cellData.cell.raw as string
        if (code === 'A') {
          cellData.cell.styles.textColor = COLORS.approvedGreen
          cellData.cell.styles.fontStyle = 'bold'
        } else if (code === 'B') {
          cellData.cell.styles.textColor = COLORS.approvedAsNotedLime
          cellData.cell.styles.fontStyle = 'bold'
        } else if (code === 'C') {
          cellData.cell.styles.textColor = COLORS.reviseOrange
          cellData.cell.styles.fontStyle = 'bold'
        } else if (code === 'D') {
          cellData.cell.styles.textColor = COLORS.urgentRed
          cellData.cell.styles.fontStyle = 'bold'
        }
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
 * Download Submittal Log PDF
 */
export async function downloadSubmittalLogPDF(
  submittals: SubmittalWithDetails[],
  projectName: string
): Promise<void> {
  const blob = await generateSubmittalLogPDF(submittals, projectName)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `Submittal_Log_${safeName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
