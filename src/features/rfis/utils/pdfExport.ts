/**
 * PDF Export Utilities for RFIs
 * Generates professional RFI documents for distribution and archival
 */

import { format } from 'date-fns'
import { PDFGenerator, PDF_CONSTANTS } from '@/lib/utils/pdfGenerator'
import { getCompanyInfo, CompanyInfo } from '@/lib/utils/pdfBranding'
import {
  formatRFINumber,
  getRFIResponseTypeLabel,
  type RFIWithDetails,
  type RFIStatus,
  type RFIPriority,
} from '@/types/rfi'

const { MARGIN, PAGE_WIDTH, COLORS } = PDF_CONSTANTS
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
  projectId: string
  gcCompany?: CompanyInfo
  includeComments?: boolean
  includeAttachments?: boolean
}

/**
 * Format date for documents
 */
function formatDate(date: string | null | undefined): string {
  if (!date) { return 'N/A' }
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
  if (!date) { return 'N/A' }
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

// Header function removed - now using centralized JobSight branding from pdfBranding.ts

/**
 * Draw project information section
 */
/**
 * Generate RFI PDF
 */
export async function generateRFIPDF(data: RFIPDFData): Promise<Blob> {
  const rfi = data.rfi
  const rfiNumber = formatRFINumber(rfi.rfi_number)
  const rfiDate = formatDate(rfi.date_created || rfi.created_at)

  const pdf = new PDFGenerator()
  await pdf.initialize(
    data.projectId,
    'REQUEST FOR INFORMATION',
    `${rfiNumber} - ${rfiDate}`,
    data.gcCompany
  )

  // -- Project Info Section --
  pdf.addSectionHeader('Project Information')

  const projectInfoPairs = [
    {
      label: 'Project',
      value: `${data.projectInfo?.name || rfi.project?.name || 'N/A'}${data.projectInfo?.number || rfi.project?.number ? ` (#${data.projectInfo?.number || rfi.project?.number})` : ''}`
    },
    { label: 'Status', value: getStatusLabel(rfi.status) },
  ]

  if (rfi.submitted_by_user) {
    projectInfoPairs.push({ label: 'From', value: rfi.submitted_by_user.full_name || 'N/A' })
  }
  if (rfi.assigned_to_user) {
    projectInfoPairs.push({ label: 'To', value: rfi.assigned_to_user.full_name || 'N/A' })
  }

  projectInfoPairs.push({ label: 'Priority', value: getPriorityLabel(rfi.priority) })
  if (rfi.discipline) {
    projectInfoPairs.push({ label: 'Discipline', value: rfi.discipline })
  }

  pdf.addKeyValuePairs(projectInfoPairs, 2)

  // -- Dates Section --
  pdf.addSectionHeader('Dates')

  const datesPairs = [
    { label: 'Date Submitted', value: formatDateShort(rfi.date_submitted) },
    {
      label: 'Date Required',
      value: rfi.is_overdue && rfi.date_required
        ? `${formatDateShort(rfi.date_required)} (OVERDUE)`
        : formatDateShort(rfi.date_required)
    },
    { label: 'Date Responded', value: formatDateShort(rfi.date_responded) },
  ]
  pdf.addKeyValuePairs(datesPairs, 3)

  // -- References Section --
  const referencesPairs = []
  if (rfi.spec_section) referencesPairs.push({ label: 'Spec Section', value: rfi.spec_section })
  if (rfi.drawing_reference) referencesPairs.push({ label: 'Drawing', value: rfi.drawing_reference })
  if (rfi.location) referencesPairs.push({ label: 'Location', value: rfi.location })

  if (referencesPairs.length > 0) {
    pdf.addSectionHeader('References')
    pdf.addKeyValuePairs(referencesPairs, 3)
  }

  // -- Question Section --
  pdf.addSectionHeader('Question')

  pdf.getJsPDF().setFontSize(10)
  pdf.getJsPDF().setFont('helvetica', 'bold')
  pdf.getJsPDF().text('Subject:', MARGIN, pdf.getY())
  pdf.getJsPDF().setFont('helvetica', 'normal')

  const subjectLines = pdf.getJsPDF().splitTextToSize(rfi.subject, CONTENT_WIDTH - 25)
  pdf.getJsPDF().text(subjectLines, MARGIN + 20, pdf.getY())
  pdf.setY(pdf.getY() + subjectLines.length * 5 + 3)

  // Question Text Box
  const questionLines = pdf.getJsPDF().splitTextToSize(rfi.question || 'No question provided', CONTENT_WIDTH - 8)
  const questionHeight = questionLines.length * 4 + 8

  pdf.getJsPDF().setDrawColor(...COLORS.lightGray)
  pdf.getJsPDF().setLineWidth(0.3)
  pdf.getJsPDF().rect(MARGIN, pdf.getY(), CONTENT_WIDTH, questionHeight, 'S')
  pdf.getJsPDF().text(questionLines, MARGIN + 4, pdf.getY() + 6)

  pdf.setY(pdf.getY() + questionHeight + 5)

  // -- Response Section --
  pdf.checkPageBreak(40)

  const hasResponse = rfi.response && rfi.response.trim().length > 0
  const doc = pdf.getJsPDF()

  // Custom Response Header to support green background if responded
  doc.setFillColor(...(hasResponse ? COLORS.successGreen : COLORS.headerBg))
  doc.rect(MARGIN, pdf.getY(), CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...(hasResponse ? COLORS.white : COLORS.black))
  doc.text('RESPONSE', MARGIN + 2, pdf.getY() + 4)
  doc.setTextColor(...COLORS.black)
  pdf.setY(pdf.getY() + 10)

  if (!hasResponse) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COLORS.mediumGray)
    doc.text('Awaiting response...', MARGIN, pdf.getY())
    doc.setTextColor(...COLORS.black)
    pdf.setY(pdf.getY() + 10)
  } else {
    // Response Metadata
    const responsePairs = []
    if (rfi.response_type) responsePairs.push({ label: 'Response Type', value: getRFIResponseTypeLabel(rfi.response_type) })
    if (rfi.responded_by_user) responsePairs.push({ label: 'Responded By', value: rfi.responded_by_user.full_name || 'N/A' })
    pdf.addKeyValuePairs(responsePairs, 2)

    // Response Text Box
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setDrawColor(...COLORS.successGreen)
    doc.setLineWidth(0.5)

    const responseLines = doc.splitTextToSize(rfi.response!, CONTENT_WIDTH - 8)
    const responseHeight = responseLines.length * 4 + 8

    doc.rect(MARGIN, pdf.getY(), CONTENT_WIDTH, responseHeight, 'S')
    doc.text(responseLines, MARGIN + 4, pdf.getY() + 6)

    pdf.setY(pdf.getY() + responseHeight + 5)

    // Impact
    const impactPairs = []
    if (rfi.cost_impact) {
      impactPairs.push({
        label: 'Cost Impact',
        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rfi.cost_impact)
      })
    }
    if (rfi.schedule_impact_days) {
      impactPairs.push({ label: 'Schedule Impact', value: `${rfi.schedule_impact_days} days` })
    }
    if (impactPairs.length > 0) {
      pdf.addKeyValuePairs(impactPairs, 2)
    }
  }

  // list sections continue...
  if (data.rfi.distribution_list && data.rfi.distribution_list.length > 0) {
    pdf.addSectionHeader('Distribution')
    pdf.addParagraph(`${data.rfi.distribution_list.length} recipient(s) in distribution list`)
  }

  if (data.includeAttachments && data.rfi.attachments && data.rfi.attachments.length > 0) {
    pdf.addSectionHeader(`Attachments (${data.rfi.attachments.length})`)
    const tableData = data.rfi.attachments.map((att, idx) => [
      (idx + 1).toString(),
      att.file_name || 'Unnamed file',
      att.attachment_type || 'general',
      formatDateShort(att.created_at),
    ])

    pdf.addTable({
      head: [['#', 'File Name', 'Type', 'Date']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      },
    })
  }

  if (data.includeComments && data.rfi.comments && data.rfi.comments.length > 0) {
    pdf.addSectionHeader(`Comments (${data.rfi.comments.length})`)

    for (const comment of data.rfi.comments) {
      pdf.checkPageBreak(20)
      const y = pdf.getY()

      pdf.getJsPDF().setFont('helvetica', 'bold')
      const authorName = comment.created_by_user?.full_name || 'Unknown'
      const commentDate = formatDateShort(comment.created_at)
      pdf.getJsPDF().text(`${authorName} - ${commentDate}`, MARGIN, y + 4)

      if (comment.comment_type !== 'comment') {
        pdf.getJsPDF().setFont('helvetica', 'italic')
        pdf.getJsPDF().setTextColor(...COLORS.mediumGray)
        pdf.getJsPDF().text(`[${comment.comment_type.replace('_', ' ')}]`, MARGIN + 80, y + 4)
        pdf.getJsPDF().setTextColor(...COLORS.black)
      }

      pdf.setY(y + 6)
      pdf.addParagraph(comment.comment)
    }
  }

  pdf.finalize()
  return pdf.getJsPDF().output('blob')
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
/**
 * Generate RFI Log PDF (summary of multiple RFIs)
 */
export async function generateRFILogPDF(
  rfis: RFIWithDetails[],
  projectName: string
): Promise<Blob> {
  const pdf = new PDFGenerator({ orientation: 'landscape' })

  // We don't have projectId here easily available, usually logs are project scoped but input array might be mixed? 
  // Assuming strict project scope for RFI log usually. 
  // For now let's skip strict company branding or use a dummy ID. 
  // Or better, just use standard header manually if we want to avoid async fetch or if we don't have ID.
  // Actually, getCompanyInfo handles missing ID gracefully.
  await pdf.initialize(
    'placeholder-id',
    'RFI LOG',
    `Project: ${projectName}`
  )

  // Summary stats
  const openCount = rfis.filter(r => ['draft', 'submitted', 'under_review'].includes(r.status)).length
  const overdueCount = rfis.filter(r => r.is_overdue).length
  const respondedCount = rfis.filter(r => ['responded', 'approved', 'closed'].includes(r.status)).length

  pdf.addParagraph(`Total: ${rfis.length}  |  Open: ${openCount}  |  Overdue: ${overdueCount}  |  Responded: ${respondedCount}`)

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

  pdf.addTable({
    head: [['RFI #', 'Subject', 'Status', 'Priority', 'Discipline', 'Assigned To', 'Submitted', 'Required', 'Overdue']],
    body: tableData,
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

  pdf.finalize()
  return pdf.getJsPDF().output('blob')
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
