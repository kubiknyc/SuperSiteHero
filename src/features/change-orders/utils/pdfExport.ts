/**
 * PDF Export Utilities for Change Orders
 * Generates professional Change Order documents for owner approval
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type {
  ChangeOrder,
  ChangeOrderItem,
  ChangeOrderStatus,
  ChangeType,
} from '@/types/change-order'

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
}

const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

/**
 * PDF generation data interface
 */
export interface ChangeOrderPDFData {
  changeOrder: ChangeOrder
  items: ChangeOrderItem[]
  projectInfo?: {
    name: string
    number?: string
    address?: string
    owner?: string
    architect?: string
    contractor?: string
    contractorAddress?: string
  }
}

/**
 * Format currency
 */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

/**
 * Format date for legal documents
 */
function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return format(new Date(date), 'MMMM d, yyyy')
  } catch {
    return date
  }
}

/**
 * Get change type label
 */
function getChangeTypeLabel(type: ChangeType | string): string {
  const labels: Record<string, string> = {
    scope_change: 'Scope Change',
    design_clarification: 'Design Clarification',
    unforeseen_condition: 'Unforeseen Condition',
    owner_request: 'Owner Request',
    value_engineering: 'Value Engineering',
    error_omission: 'Error/Omission',
  }
  return labels[type] || type
}

/**
 * Get status label
 */
function getStatusLabel(status: ChangeOrderStatus | string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_estimate: 'Pending Estimate',
    estimate_complete: 'Estimate Complete',
    pending_internal_approval: 'Pending Internal Approval',
    internally_approved: 'Internally Approved',
    pending_owner_review: 'Pending Owner Review',
    approved: 'Approved',
    rejected: 'Rejected',
    void: 'Void',
  }
  return labels[status] || status
}

/**
 * Draw document header
 */
function drawHeader(doc: jsPDF, data: ChangeOrderPDFData): number {
  let y = MARGIN
  const co = data.changeOrder

  // Title bar
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 12, 'F')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('CHANGE ORDER', PAGE_WIDTH / 2, y + 8, { align: 'center' })

  y += 14

  // Change Order Number and Date
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)

  const coNumber = co.co_number ? `CO #${co.co_number}` : `PCO #${co.pco_number}`
  doc.text(coNumber, MARGIN, y + 5)

  const dateText = formatDate(co.date_created || co.created_at)
  doc.text(dateText, PAGE_WIDTH - MARGIN, y + 5, { align: 'right' })

  y += 10

  return y
}

/**
 * Draw project information section
 */
function drawProjectInfo(doc: jsPDF, data: ChangeOrderPDFData, startY: number): number {
  let y = startY
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

  // Row 1 - Project Name and Number
  doc.setFont('helvetica', 'bold')
  doc.text('Project:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  const projectName = data.projectInfo?.name || data.changeOrder.project?.name || 'N/A'
  const projectNumber = data.projectInfo?.number || data.changeOrder.project?.number || ''
  doc.text(`${projectName}${projectNumber ? ` (#${projectNumber})` : ''}`, MARGIN + 20, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.text('Contract Amount:', MARGIN + colWidth + 4, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(formatCurrency(data.changeOrder.original_contract_amount), MARGIN + colWidth + 40, y + 4)

  y += rowHeight

  // Row 2 - Owner and Contractor
  doc.setFont('helvetica', 'bold')
  doc.text('Owner:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(data.projectInfo?.owner || 'N/A', MARGIN + 20, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.text('Contractor:', MARGIN + colWidth + 4, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(data.projectInfo?.contractor || 'N/A', MARGIN + colWidth + 30, y + 4)

  y += rowHeight

  // Row 3 - Address and Architect
  if (data.projectInfo?.address) {
    doc.setFont('helvetica', 'bold')
    doc.text('Address:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(data.projectInfo.address, MARGIN + 20, y + 4)
  }

  if (data.projectInfo?.architect) {
    doc.setFont('helvetica', 'bold')
    doc.text('Architect:', MARGIN + colWidth + 4, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(data.projectInfo.architect, MARGIN + colWidth + 30, y + 4)
  }

  y += rowHeight + 2

  return y
}

/**
 * Draw change order details section
 */
function drawChangeOrderDetails(doc: jsPDF, data: ChangeOrderPDFData, startY: number): number {
  let y = startY
  const co = data.changeOrder

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('CHANGE ORDER DETAILS', MARGIN + 2, y + 4)
  y += 8

  doc.setFontSize(9)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.text('Title:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(co.title, MARGIN + 15, y + 4)
  y += 7

  // Change Type and Status
  doc.setFont('helvetica', 'bold')
  doc.text('Type:', MARGIN, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(getChangeTypeLabel(co.change_type), MARGIN + 15, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.text('Status:', MARGIN + CONTENT_WIDTH / 2, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text(getStatusLabel(co.status), MARGIN + CONTENT_WIDTH / 2 + 18, y + 4)
  y += 7

  // Description
  if (co.description) {
    doc.setFont('helvetica', 'bold')
    doc.text('Description:', MARGIN, y + 4)
    y += 5

    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(co.description, CONTENT_WIDTH - 4)
    doc.text(descLines, MARGIN + 2, y + 4)
    y += descLines.length * 4 + 3
  }

  // Justification
  if (co.justification) {
    doc.setFont('helvetica', 'bold')
    doc.text('Justification:', MARGIN, y + 4)
    y += 5

    doc.setFont('helvetica', 'normal')
    const justLines = doc.splitTextToSize(co.justification, CONTENT_WIDTH - 4)
    doc.text(justLines, MARGIN + 2, y + 4)
    y += justLines.length * 4 + 3
  }

  y += 3

  return y
}

/**
 * Draw line items table
 */
function drawItemsTable(doc: jsPDF, data: ChangeOrderPDFData, startY: number): number {
  const items = data.items || []

  if (items.length === 0) {
    return startY
  }

  let y = startY

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('SCHEDULE OF VALUES', MARGIN + 2, y + 4)
  y += 8

  // Table
  const tableData = items.map(item => [
    item.item_number.toString(),
    item.description.substring(0, 60),
    item.unit || '-',
    item.quantity?.toFixed(2) || '-',
    formatCurrency(item.unit_cost),
    formatCurrency(item.total_amount),
  ])

  // Calculate totals
  const totalCost = items.reduce((sum, item) => sum + (item.total_amount || 0), 0)

  // Add totals row
  tableData.push([
    '',
    'TOTAL',
    '',
    '',
    '',
    formatCurrency(totalCost),
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Unit', 'Qty', 'Unit Cost', 'Total']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
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
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    // Style the totals row
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = COLORS.lightGray
      }
    },
  })

  return (doc as any).lastAutoTable.finalY + 5
}

/**
 * Draw cost summary section
 */
function drawCostSummary(doc: jsPDF, data: ChangeOrderPDFData, startY: number): number {
  let y = startY
  const co = data.changeOrder
  const boxWidth = CONTENT_WIDTH / 2 - 5
  const rowHeight = 7

  // Check for page break
  if (y + 50 > PAGE_HEIGHT - 60) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('COST & TIME SUMMARY', MARGIN + 2, y + 4)
  y += 10

  doc.setFontSize(9)

  // Left column - Cost
  const leftX = MARGIN

  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.3)
  doc.rect(leftX, y, boxWidth, rowHeight * 4 + 6, 'S')

  doc.setFont('helvetica', 'bold')
  doc.text('Proposed Amount:', leftX + 2, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text(formatCurrency(co.proposed_amount), leftX + boxWidth - 2, y + 5, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.text('Approved Amount:', leftX + 2, y + 5 + rowHeight)
  doc.setFont('helvetica', 'normal')
  doc.text(formatCurrency(co.approved_amount), leftX + boxWidth - 2, y + 5 + rowHeight, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.text('Previous Changes:', leftX + 2, y + 5 + rowHeight * 2)
  doc.setFont('helvetica', 'normal')
  doc.text(formatCurrency(co.previous_changes_amount), leftX + boxWidth - 2, y + 5 + rowHeight * 2, { align: 'right' })

  doc.setFillColor(...COLORS.veryLightGray)
  doc.rect(leftX, y + rowHeight * 3, boxWidth, rowHeight + 6, 'F')
  doc.rect(leftX, y + rowHeight * 3, boxWidth, rowHeight + 6, 'S')
  doc.setFont('helvetica', 'bold')
  doc.text('Revised Contract:', leftX + 2, y + 5 + rowHeight * 3)
  doc.text(formatCurrency(co.revised_contract_amount), leftX + boxWidth - 2, y + 5 + rowHeight * 3, { align: 'right' })

  // Right column - Time
  const rightX = MARGIN + boxWidth + 10

  doc.rect(rightX, y, boxWidth, rowHeight * 2 + 3, 'S')

  doc.setFont('helvetica', 'bold')
  doc.text('Proposed Days:', rightX + 2, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${co.proposed_days} days`, rightX + boxWidth - 2, y + 5, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.text('Approved Days:', rightX + 2, y + 5 + rowHeight)
  doc.setFont('helvetica', 'normal')
  doc.text(`${co.approved_days || 0} days`, rightX + boxWidth - 2, y + 5 + rowHeight, { align: 'right' })

  y += rowHeight * 4 + 12

  return y
}

/**
 * Draw signature section
 */
function drawSignatureSection(doc: jsPDF, data: ChangeOrderPDFData, startY: number): number {
  let y = startY
  const co = data.changeOrder

  // Check for page break
  if (y + 60 > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('APPROVALS', MARGIN + 2, y + 4)
  y += 10

  const boxWidth = CONTENT_WIDTH / 2 - 5
  const boxHeight = 25

  doc.setFontSize(8)
  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.3)

  // Contractor Approval
  doc.rect(MARGIN, y, boxWidth, boxHeight, 'S')
  doc.setFont('helvetica', 'bold')
  doc.text('CONTRACTOR', MARGIN + 2, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text('Signature:', MARGIN + 2, y + 11)
  doc.line(MARGIN + 22, y + 11, MARGIN + boxWidth - 5, y + 11)
  doc.text('Name:', MARGIN + 2, y + 17)
  if (co.internal_approver_name) {
    doc.text(co.internal_approver_name, MARGIN + 18, y + 17)
  }
  doc.text('Date:', MARGIN + 2, y + 22)
  if (co.date_internal_approved) {
    doc.text(formatDate(co.date_internal_approved), MARGIN + 18, y + 22)
  }

  // Owner Approval
  doc.rect(MARGIN + boxWidth + 10, y, boxWidth, boxHeight, 'S')
  doc.setFont('helvetica', 'bold')
  doc.text('OWNER', MARGIN + boxWidth + 12, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.text('Signature:', MARGIN + boxWidth + 12, y + 11)
  doc.line(MARGIN + boxWidth + 32, y + 11, PAGE_WIDTH - MARGIN - 5, y + 11)
  doc.text('Name:', MARGIN + boxWidth + 12, y + 17)
  if (co.owner_approver_name) {
    doc.text(co.owner_approver_name, MARGIN + boxWidth + 28, y + 17)
  }
  doc.text('Date:', MARGIN + boxWidth + 12, y + 22)
  if (co.date_owner_approved) {
    doc.text(formatDate(co.date_owner_approved), MARGIN + boxWidth + 28, y + 22)
  }

  y += boxHeight + 5

  // Approval disclaimer
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.mediumGray)
  const disclaimer = 'The above described change in the Work is hereby authorized. This Change Order constitutes ' +
    'full and final settlement of all claims of the Contractor arising from or related to this change.'
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_WIDTH)
  doc.text(disclaimerLines, MARGIN, y + 3)

  y += disclaimerLines.length * 3 + 5

  return y
}

/**
 * Draw footer
 */
function drawFooter(doc: jsPDF, data: ChangeOrderPDFData): void {
  const pageCount = doc.getNumberOfPages()
  const co = data.changeOrder

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)

    doc.setFontSize(7)
    doc.setTextColor(...COLORS.mediumGray)

    // CO number
    const coNumber = co.co_number ? `CO #${co.co_number}` : `PCO #${co.pco_number}`
    doc.text(coNumber, MARGIN, PAGE_HEIGHT - 7)

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
 * Generate change order PDF
 */
export async function generateChangeOrderPDF(data: ChangeOrderPDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  // Draw sections
  let y = drawHeader(doc, data)
  y = drawProjectInfo(doc, data, y)
  y = drawChangeOrderDetails(doc, data, y)
  y = drawItemsTable(doc, data, y)
  y = drawCostSummary(doc, data, y)
  drawSignatureSection(doc, data, y)

  // Add footer
  drawFooter(doc, data)

  return doc.output('blob')
}

/**
 * Download change order PDF
 */
export async function downloadChangeOrderPDF(data: ChangeOrderPDFData): Promise<void> {
  const blob = await generateChangeOrderPDF(data)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const co = data.changeOrder
  const coNumber = co.co_number ? `CO${co.co_number}` : `PCO${co.pco_number}`
  const projectName = (data.projectInfo?.name || data.changeOrder.project?.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `Change_Order_${coNumber}_${projectName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate change order log PDF (summary of all change orders)
 */
export async function generateChangeOrderLogPDF(
  changeOrders: ChangeOrder[],
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
  doc.text('CHANGE ORDER LOG', pageWidth / 2, y + 7, { align: 'center' })
  y += 12

  // Project name
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.text(`Project: ${projectName}`, margin, y + 5)
  doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth - margin, y + 5, { align: 'right' })
  y += 10

  // Table
  const tableData = changeOrders.map(co => [
    co.co_number ? `CO-${co.co_number}` : `PCO-${co.pco_number}`,
    co.title.substring(0, 40),
    getChangeTypeLabel(co.change_type),
    getStatusLabel(co.status),
    formatCurrency(co.proposed_amount),
    formatCurrency(co.approved_amount),
    `${co.proposed_days}d`,
    formatDate(co.date_created),
  ])

  // Calculate totals
  const totalProposed = changeOrders.reduce((sum, co) => sum + (co.proposed_amount || 0), 0)
  const totalApproved = changeOrders.reduce((sum, co) => sum + (co.approved_amount || 0), 0)

  autoTable(doc, {
    startY: y,
    head: [['CO #', 'Title', 'Type', 'Status', 'Proposed', 'Approved', 'Days', 'Date']],
    body: tableData,
    foot: [['', `TOTALS (${changeOrders.length} items)`, '', '', formatCurrency(totalProposed), formatCurrency(totalApproved), '', '']],
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: COLORS.darkGray,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: COLORS.lightGray,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.veryLightGray,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 25 },
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
 * Download change order log PDF
 */
export async function downloadChangeOrderLogPDF(
  changeOrders: ChangeOrder[],
  projectName: string
): Promise<void> {
  const blob = await generateChangeOrderLogPDF(changeOrders, projectName)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `Change_Order_Log_${safeName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
