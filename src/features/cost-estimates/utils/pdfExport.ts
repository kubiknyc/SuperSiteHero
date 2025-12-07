/**
 * PDF Export Utilities for Cost Estimates
 * Generates professional Cost Estimate documents for client proposals
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type {
  CostEstimate,
  CostEstimateItem,
  CostEstimateStatus,
} from '@/types/database-extensions'

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
  headerBlue: [0, 102, 153] as [number, number, number],
  headerBg: [230, 230, 230] as [number, number, number],
  accentGreen: [39, 174, 96] as [number, number, number],
}

const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

/**
 * PDF generation data interface
 */
export interface CostEstimatePDFData {
  estimate: CostEstimate & { items?: CostEstimateItem[] }
  projectInfo?: {
    name: string
    number?: string
    address?: string
    client?: string
  }
  companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo?: string
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
 * Format date for documents
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
 * Get status label
 */
function getStatusLabel(status: CostEstimateStatus | string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    approved: 'Approved',
    invoiced: 'Invoiced',
    archived: 'Archived',
  }
  return labels[status] || status
}

/**
 * Get status color
 */
function getStatusColor(status: CostEstimateStatus | string): [number, number, number] {
  const colors: Record<string, [number, number, number]> = {
    draft: COLORS.mediumGray,
    approved: COLORS.accentGreen,
    invoiced: COLORS.headerBlue,
    archived: COLORS.darkGray,
  }
  return colors[status] || COLORS.mediumGray
}

/**
 * Draw document header
 */
function drawHeader(doc: jsPDF, data: CostEstimatePDFData): number {
  let y = MARGIN

  // Title bar
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 14, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('COST ESTIMATE', PAGE_WIDTH / 2, y + 10, { align: 'center' })

  y += 16

  // Company info (if provided)
  if (data.companyInfo?.name) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text(data.companyInfo.name, MARGIN, y + 5)

    if (data.companyInfo.address) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(data.companyInfo.address, MARGIN, y + 10)
      y += 5
    }

    if (data.companyInfo.phone || data.companyInfo.email) {
      const contactInfo = [data.companyInfo.phone, data.companyInfo.email].filter(Boolean).join(' | ')
      doc.setFontSize(8)
      doc.text(contactInfo, MARGIN, y + 10)
      y += 5
    }

    y += 8
  }

  // Estimate details on right side
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text(`Estimate: ${data.estimate.name}`, PAGE_WIDTH - MARGIN, y - 8, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(data.estimate.created_at)}`, PAGE_WIDTH - MARGIN, y - 3, { align: 'right' })

  // Status badge
  const statusLabel = getStatusLabel(data.estimate.status)
  const statusColor = getStatusColor(data.estimate.status)
  doc.setFillColor(...statusColor)
  const statusWidth = doc.getTextWidth(statusLabel) + 6
  doc.roundedRect(PAGE_WIDTH - MARGIN - statusWidth, y + 1, statusWidth, 6, 1, 1, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.white)
  doc.text(statusLabel.toUpperCase(), PAGE_WIDTH - MARGIN - statusWidth / 2, y + 5, { align: 'center' })

  y += 10

  return y
}

/**
 * Draw project information section
 */
function drawProjectInfo(doc: jsPDF, data: CostEstimatePDFData, startY: number): number {
  let y = startY
  const rowHeight = 7

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('PROJECT INFORMATION', MARGIN + 2, y + 4)
  y += 8

  doc.setFontSize(8)

  // Project name
  if (data.projectInfo?.name) {
    doc.setFont('helvetica', 'bold')
    doc.text('Project:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    const projectText = data.projectInfo.number
      ? `${data.projectInfo.name} (#${data.projectInfo.number})`
      : data.projectInfo.name
    doc.text(projectText, MARGIN + 18, y + 4)
    y += rowHeight
  }

  // Client
  if (data.projectInfo?.client) {
    doc.setFont('helvetica', 'bold')
    doc.text('Client:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(data.projectInfo.client, MARGIN + 18, y + 4)
    y += rowHeight
  }

  // Address
  if (data.projectInfo?.address) {
    doc.setFont('helvetica', 'bold')
    doc.text('Location:', MARGIN, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.text(data.projectInfo.address, MARGIN + 18, y + 4)
    y += rowHeight
  }

  // Estimate description
  if (data.estimate.description) {
    doc.setFont('helvetica', 'bold')
    doc.text('Description:', MARGIN, y + 4)
    y += 5
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(data.estimate.description, CONTENT_WIDTH - 4)
    doc.text(descLines, MARGIN + 2, y + 4)
    y += descLines.length * 4 + 2
  }

  y += 4

  return y
}

/**
 * Draw line items table
 */
function drawItemsTable(doc: jsPDF, data: CostEstimatePDFData, startY: number): number {
  const items = data.estimate.items || []

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
  doc.text('LINE ITEMS', MARGIN + 2, y + 4)
  y += 8

  // Prepare table data
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.name.substring(0, 50),
    item.measurement_type || '-',
    item.quantity?.toFixed(2) || '-',
    formatCurrency(item.unit_cost),
    formatCurrency(item.material_cost),
    formatCurrency(item.labor_cost),
    formatCurrency(item.total_cost),
  ])

  // Calculate totals
  const totalMaterial = items.reduce((sum, item) => sum + (item.material_cost || 0), 0)
  const totalLabor = items.reduce((sum, item) => sum + (item.labor_cost || 0), 0)
  const totalCost = items.reduce((sum, item) => sum + (item.total_cost || 0), 0)

  // Add subtotal row
  tableData.push([
    '',
    'SUBTOTAL',
    '',
    '',
    '',
    formatCurrency(totalMaterial),
    formatCurrency(totalLabor),
    formatCurrency(totalCost),
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Unit', 'Qty', 'Unit Cost', 'Material', 'Labor', 'Total']],
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
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    },
    // Style the totals row
    didParseCell: (cellData) => {
      if (cellData.row.index === tableData.length - 1 && cellData.section === 'body') {
        cellData.cell.styles.fontStyle = 'bold'
        cellData.cell.styles.fillColor = COLORS.lightGray
      }
    },
  })

  return (doc as any).lastAutoTable.finalY + 5
}

/**
 * Draw cost summary section
 */
function drawCostSummary(doc: jsPDF, data: CostEstimatePDFData, startY: number): number {
  let y = startY
  const estimate = data.estimate
  const boxWidth = 80
  const rowHeight = 8

  // Check for page break
  if (y + 60 > PAGE_HEIGHT - 40) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('COST SUMMARY', MARGIN + 2, y + 4)
  y += 10

  // Position summary box on right side
  const boxX = PAGE_WIDTH - MARGIN - boxWidth

  doc.setFontSize(9)
  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.3)

  // Summary box
  doc.rect(boxX, y, boxWidth, rowHeight * 4 + 8, 'S')

  // Subtotal
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', boxX + 3, y + 6)
  doc.text(formatCurrency(estimate.subtotal), boxX + boxWidth - 3, y + 6, { align: 'right' })

  // Markup
  const markupLabel = `Markup (${(estimate.markup_percentage || 0)}%)`
  doc.text(markupLabel, boxX + 3, y + 6 + rowHeight)
  doc.text(formatCurrency(estimate.markup_amount), boxX + boxWidth - 3, y + 6 + rowHeight, { align: 'right' })

  // Labor Rate
  doc.text(`Labor Rate:`, boxX + 3, y + 6 + rowHeight * 2)
  doc.text(`${formatCurrency(estimate.labor_rate || 0)}/hr`, boxX + boxWidth - 3, y + 6 + rowHeight * 2, { align: 'right' })

  // Total (highlighted)
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(boxX, y + rowHeight * 3, boxWidth, rowHeight + 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('TOTAL:', boxX + 3, y + 6 + rowHeight * 3 + 2)
  doc.setFontSize(11)
  doc.text(formatCurrency(estimate.total_cost), boxX + boxWidth - 3, y + 6 + rowHeight * 3 + 2, { align: 'right' })

  y += rowHeight * 4 + 15

  return y
}

/**
 * Draw terms and conditions
 */
function drawTermsSection(doc: jsPDF, startY: number): number {
  let y = startY

  // Check for page break
  if (y + 40 > PAGE_HEIGHT - 30) {
    doc.addPage()
    y = MARGIN
  }

  // Section header
  doc.setFillColor(...COLORS.headerBg)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('TERMS & CONDITIONS', MARGIN + 2, y + 4)
  y += 10

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.mediumGray)

  const terms = [
    '1. This estimate is valid for 30 days from the date shown above.',
    '2. Prices are based on current material costs and may be subject to change.',
    '3. Payment terms: 50% upon acceptance, 50% upon completion unless otherwise agreed.',
    '4. Any changes to the scope of work may result in price adjustments.',
    '5. This estimate does not include permits, inspections, or fees unless explicitly stated.',
  ]

  terms.forEach((term, index) => {
    doc.text(term, MARGIN, y + 4 + index * 5)
  })

  y += terms.length * 5 + 8

  return y
}

/**
 * Draw signature section
 */
function drawSignatureSection(doc: jsPDF, startY: number): number {
  let y = startY

  // Check for page break
  if (y + 35 > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    y = MARGIN
  }

  const boxWidth = CONTENT_WIDTH / 2 - 10
  const boxHeight = 25

  doc.setFontSize(8)
  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.3)
  doc.setTextColor(...COLORS.black)

  // Prepared By
  doc.rect(MARGIN, y, boxWidth, boxHeight, 'S')
  doc.setFont('helvetica', 'bold')
  doc.text('PREPARED BY', MARGIN + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text('Signature:', MARGIN + 3, y + 12)
  doc.line(MARGIN + 25, y + 12, MARGIN + boxWidth - 5, y + 12)
  doc.text('Date:', MARGIN + 3, y + 20)
  doc.line(MARGIN + 15, y + 20, MARGIN + boxWidth - 5, y + 20)

  // Accepted By
  const rightX = PAGE_WIDTH - MARGIN - boxWidth
  doc.rect(rightX, y, boxWidth, boxHeight, 'S')
  doc.setFont('helvetica', 'bold')
  doc.text('ACCEPTED BY', rightX + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text('Signature:', rightX + 3, y + 12)
  doc.line(rightX + 25, y + 12, rightX + boxWidth - 5, y + 12)
  doc.text('Date:', rightX + 3, y + 20)
  doc.line(rightX + 15, y + 20, rightX + boxWidth - 5, y + 20)

  y += boxHeight + 5

  return y
}

/**
 * Draw footer
 */
function drawFooter(doc: jsPDF, data: CostEstimatePDFData): void {
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)

    doc.setFontSize(7)
    doc.setTextColor(...COLORS.mediumGray)

    // Estimate name
    doc.text(data.estimate.name, MARGIN, PAGE_HEIGHT - 7)

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
 * Generate cost estimate PDF
 */
export async function generateCostEstimatePDF(data: CostEstimatePDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  // Draw sections
  let y = drawHeader(doc, data)
  y = drawProjectInfo(doc, data, y)
  y = drawItemsTable(doc, data, y)
  y = drawCostSummary(doc, data, y)
  y = drawTermsSection(doc, y)
  drawSignatureSection(doc, y)

  // Add footer
  drawFooter(doc, data)

  return doc.output('blob')
}

/**
 * Download cost estimate PDF
 */
export async function downloadCostEstimatePDF(data: CostEstimatePDFData): Promise<void> {
  const blob = await generateCostEstimatePDF(data)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const estimateName = data.estimate.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `Cost_Estimate_${estimateName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
