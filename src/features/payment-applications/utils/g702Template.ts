/**
 * G702 PDF Template - AIA Document G702 (Application and Certificate for Payment)
 * Generates professional AIA-style G702 form as PDF
 */

import jsPDF from 'jspdf'
import { format } from 'date-fns'
import type { G702PDFData } from '@/types/payment-application'
import {
  PAGE_WIDTH_PORTRAIT,
  PAGE_HEIGHT_PORTRAIT,
  MARGIN,
  COLORS,
  FONT_SIZES,
  BORDER_WIDTH,
  formatCurrency,
  formatPercent,
  formatDate,
} from './pdfStyles'

const CONTENT_WIDTH = PAGE_WIDTH_PORTRAIT - 2 * MARGIN

/**
 * Draw a bordered box with optional fill
 */
function drawBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: { fill?: boolean; fillColor?: [number, number, number] }
): void {
  if (options?.fill && options.fillColor) {
    doc.setFillColor(...options.fillColor)
    doc.rect(x, y, width, height, 'F')
  }
  doc.setDrawColor(...COLORS.black)
  doc.setLineWidth(BORDER_WIDTH.thin)
  doc.rect(x, y, width, height, 'S')
}

/**
 * Draw text with optional styling
 */
function drawText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right'; maxWidth?: number }
): void {
  doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
  doc.setFontSize(options?.size || FONT_SIZES.body)
  doc.setTextColor(...COLORS.black)

  if (options?.align === 'center' && options.maxWidth) {
    doc.text(text, x + options.maxWidth / 2, y, { align: 'center' })
  } else if (options?.align === 'right' && options.maxWidth) {
    doc.text(text, x + options.maxWidth, y, { align: 'right' })
  } else {
    doc.text(text, x, y)
  }
}

/**
 * Draw a labeled field (label above, value below in box)
 */
function drawLabeledField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number = 10
): number {
  // Draw box
  drawBox(doc, x, y, width, height)

  // Draw label above
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(...COLORS.mediumGray)
  doc.text(label, x + 1, y - 1)

  // Draw value inside
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(...COLORS.black)
  doc.text(value, x + 2, y + height / 2 + 1)

  return y + height
}

/**
 * Draw the G702 header section
 */
function drawHeader(doc: jsPDF, data: G702PDFData): number {
  let y = MARGIN

  // AIA Document title
  doc.setFillColor(...COLORS.aiaBlue)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 12, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_SIZES.title)
  doc.setTextColor(...COLORS.white)
  doc.text('AIA DOCUMENT G702', PAGE_WIDTH_PORTRAIT / 2, y + 8, { align: 'center' })

  y += 14

  // Document subtitle
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONT_SIZES.subtitle)
  doc.setTextColor(...COLORS.black)
  doc.text('APPLICATION AND CERTIFICATE FOR PAYMENT', PAGE_WIDTH_PORTRAIT / 2, y + 4, { align: 'center' })

  y += 8

  // Application info line
  const appNumber = data.application.application_number
  const periodTo = formatDate(data.application.period_to)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZES.body)
  doc.text(`Application No: ${appNumber}`, MARGIN, y + 4)
  doc.text(`Period To: ${periodTo}`, CONTENT_WIDTH / 2 + MARGIN, y + 4)

  y += 8

  return y
}

/**
 * Draw project/party information section
 */
function drawProjectInfo(doc: jsPDF, data: G702PDFData, startY: number): number {
  let y = startY
  const colWidth = CONTENT_WIDTH / 2 - 2

  // Section header
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, 6, { fill: true, fillColor: COLORS.headerBg })
  drawText(doc, 'PROJECT AND PARTY INFORMATION', MARGIN + 2, y + 4, { bold: true, size: FONT_SIZES.small })
  y += 8

  // Left column - TO (Owner/Architect)
  drawText(doc, 'TO (Owner):', MARGIN, y + 3, { bold: true, size: FONT_SIZES.tiny })
  y += 4
  drawBox(doc, MARGIN, y, colWidth, 15)
  drawText(doc, data.owner.name || 'N/A', MARGIN + 2, y + 6, { size: FONT_SIZES.small })

  // Right column - FROM (Contractor)
  drawText(doc, 'FROM (Contractor):', MARGIN + colWidth + 4, startY + 12, { bold: true, size: FONT_SIZES.tiny })
  drawBox(doc, MARGIN + colWidth + 4, startY + 16, colWidth, 15)
  drawText(doc, data.contractor.name || 'N/A', MARGIN + colWidth + 6, startY + 22, { size: FONT_SIZES.small })
  if (data.contractor.address) {
    drawText(doc, data.contractor.address, MARGIN + colWidth + 6, startY + 26, { size: FONT_SIZES.tiny })
  }

  y += 17

  // Project info
  drawText(doc, 'PROJECT:', MARGIN, y + 3, { bold: true, size: FONT_SIZES.tiny })
  y += 4
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, 12)
  drawText(doc, data.project.name, MARGIN + 2, y + 5, { size: FONT_SIZES.small })
  if (data.project.number) {
    drawText(doc, `Project #: ${data.project.number}`, MARGIN + 2, y + 9, { size: FONT_SIZES.tiny })
  }
  if (data.project.address) {
    drawText(doc, data.project.address, MARGIN + CONTENT_WIDTH / 2, y + 5, { size: FONT_SIZES.small })
  }

  y += 14

  // Architect info
  drawText(doc, 'VIA (Architect):', MARGIN, y + 3, { bold: true, size: FONT_SIZES.tiny })
  y += 4
  drawBox(doc, MARGIN, y, colWidth, 10)
  drawText(doc, data.architect.name || 'N/A', MARGIN + 2, y + 6, { size: FONT_SIZES.small })

  y += 12

  return y
}

/**
 * Draw the contract summary table (main G702 calculation section)
 */
function drawContractSummary(doc: jsPDF, data: G702PDFData, startY: number): number {
  let y = startY
  const app = data.application
  const labelWidth = CONTENT_WIDTH * 0.65
  const valueWidth = CONTENT_WIDTH * 0.35
  const rowHeight = 7

  // Section header
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, 6, { fill: true, fillColor: COLORS.headerBg })
  drawText(doc, 'CONTRACTOR\'S APPLICATION FOR PAYMENT', MARGIN + 2, y + 4, { bold: true, size: FONT_SIZES.small })
  y += 8

  // Contract summary rows
  const rows = [
    { num: '1', label: 'ORIGINAL CONTRACT SUM', value: formatCurrency(app.original_contract_sum) },
    { num: '2', label: 'Net change by Change Orders', value: formatCurrency(app.net_change_orders) },
    { num: '3', label: 'CONTRACT SUM TO DATE (Line 1 ± 2)', value: formatCurrency(app.contract_sum_to_date), bold: true },
    { num: '4', label: 'TOTAL COMPLETED & STORED TO DATE (Column G on G703)', value: formatCurrency(app.total_completed_and_stored) },
    { num: '5', label: 'RETAINAGE:', value: '' },
    { num: '5a', label: `   a. ${formatPercent(app.retainage_percent)} of Completed Work`, value: formatCurrency(app.retainage_from_completed), indent: true },
    { num: '5b', label: `   b. ${formatPercent(app.retainage_percent)} of Stored Material`, value: formatCurrency(app.retainage_from_stored), indent: true },
    { num: '', label: '   Total Retainage (Lines 5a + 5b)', value: formatCurrency(app.total_retainage), indent: true },
    { num: '6', label: 'TOTAL EARNED LESS RETAINAGE (Line 4 Less Line 5 Total)', value: formatCurrency(app.total_earned_less_retainage) },
    { num: '7', label: 'LESS PREVIOUS CERTIFICATES FOR PAYMENT', value: formatCurrency(app.less_previous_certificates) },
    { num: '8', label: 'CURRENT PAYMENT DUE', value: formatCurrency(app.current_payment_due), bold: true, highlight: true },
    { num: '9', label: 'BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 less Line 6)', value: formatCurrency(app.balance_to_finish) },
  ]

  rows.forEach((row) => {
    // Line number
    drawBox(doc, MARGIN, y, 10, rowHeight)
    drawText(doc, row.num, MARGIN + 1, y + 5, { size: FONT_SIZES.small })

    // Label
    drawBox(doc, MARGIN + 10, y, labelWidth - 10, rowHeight)
    drawText(doc, row.label, MARGIN + 12, y + 5, { size: FONT_SIZES.small, bold: row.bold })

    // Value
    const fillColor = row.highlight ? COLORS.veryLightGray : undefined
    drawBox(doc, MARGIN + labelWidth, y, valueWidth, rowHeight, { fill: !!fillColor, fillColor })
    drawText(doc, row.value, MARGIN + labelWidth + valueWidth - 2, y + 5, { size: FONT_SIZES.small, bold: row.bold, align: 'right', maxWidth: valueWidth - 4 })

    y += rowHeight
  })

  return y + 3
}

/**
 * Draw change order summary
 */
function drawChangeOrderSummary(doc: jsPDF, data: G702PDFData, startY: number): number {
  let y = startY
  const colWidth = CONTENT_WIDTH / 3

  // Section header
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, 6, { fill: true, fillColor: COLORS.headerBg })
  drawText(doc, 'CHANGE ORDER SUMMARY', MARGIN + 2, y + 4, { bold: true, size: FONT_SIZES.small })
  y += 8

  // Headers
  drawBox(doc, MARGIN, y, colWidth, 6)
  drawText(doc, '', MARGIN + 2, y + 4, { size: FONT_SIZES.tiny })
  drawBox(doc, MARGIN + colWidth, y, colWidth, 6)
  drawText(doc, 'ADDITIONS', MARGIN + colWidth + 2, y + 4, { size: FONT_SIZES.tiny, bold: true })
  drawBox(doc, MARGIN + colWidth * 2, y, colWidth, 6)
  drawText(doc, 'DEDUCTIONS', MARGIN + colWidth * 2 + 2, y + 4, { size: FONT_SIZES.tiny, bold: true })
  y += 6

  // Total row
  drawBox(doc, MARGIN, y, colWidth, 7)
  drawText(doc, 'Total changes approved in previous months', MARGIN + 2, y + 5, { size: FONT_SIZES.tiny })
  drawBox(doc, MARGIN + colWidth, y, colWidth, 7)
  drawText(doc, formatCurrency(data.application.net_change_orders > 0 ? data.application.net_change_orders : 0), MARGIN + colWidth + colWidth - 2, y + 5, { size: FONT_SIZES.tiny, align: 'right', maxWidth: colWidth - 4 })
  drawBox(doc, MARGIN + colWidth * 2, y, colWidth, 7)
  drawText(doc, formatCurrency(data.application.net_change_orders < 0 ? Math.abs(data.application.net_change_orders) : 0), MARGIN + colWidth * 2 + colWidth - 2, y + 5, { size: FONT_SIZES.tiny, align: 'right', maxWidth: colWidth - 4 })
  y += 7

  // Net changes
  drawBox(doc, MARGIN, y, colWidth * 2, 7)
  drawText(doc, 'NET CHANGES by Change Order', MARGIN + 2, y + 5, { size: FONT_SIZES.tiny, bold: true })
  drawBox(doc, MARGIN + colWidth * 2, y, colWidth, 7)
  drawText(doc, formatCurrency(data.application.net_change_orders), MARGIN + colWidth * 2 + colWidth - 2, y + 5, { size: FONT_SIZES.tiny, bold: true, align: 'right', maxWidth: colWidth - 4 })
  y += 9

  return y
}

/**
 * Draw contractor certification section
 */
function drawContractorCertification(doc: jsPDF, data: G702PDFData, startY: number): number {
  let y = startY

  // Section header
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, 6, { fill: true, fillColor: COLORS.headerBg })
  drawText(doc, 'CONTRACTOR\'S CERTIFICATION', MARGIN + 2, y + 4, { bold: true, size: FONT_SIZES.small })
  y += 8

  // Certification text
  const certText = 'The undersigned Contractor certifies that to the best of the Contractor\'s knowledge, ' +
    'information and belief the Work covered by this Application for Payment has been completed in accordance ' +
    'with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous ' +
    'Certificates for Payment were issued and payments received from the Owner, and that current payment shown ' +
    'herein is now due.'

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZES.tiny)
  const lines = doc.splitTextToSize(certText, CONTENT_WIDTH - 4)
  doc.text(lines, MARGIN + 2, y + 3)
  y += lines.length * 3 + 4

  // Signature line
  drawText(doc, 'CONTRACTOR:', MARGIN, y + 3, { bold: true, size: FONT_SIZES.tiny })
  y += 5

  const halfWidth = CONTENT_WIDTH / 2 - 2

  // Signature box
  drawBox(doc, MARGIN, y, halfWidth, 12)
  drawText(doc, 'By:', MARGIN + 2, y + 4, { size: FONT_SIZES.tiny })
  drawText(doc, 'Date:', MARGIN + 2, y + 9, { size: FONT_SIZES.tiny })
  if (data.application.contractor_signature_date) {
    drawText(doc, formatDate(data.application.contractor_signature_date), MARGIN + 15, y + 9, { size: FONT_SIZES.small })
  }

  // State/County notarization
  drawBox(doc, MARGIN + halfWidth + 4, y, halfWidth, 12)
  drawText(doc, 'State of:', MARGIN + halfWidth + 6, y + 4, { size: FONT_SIZES.tiny })
  drawText(doc, 'County of:', MARGIN + halfWidth + 6, y + 9, { size: FONT_SIZES.tiny })

  y += 14

  return y
}

/**
 * Draw architect's certificate section
 */
function drawArchitectCertificate(doc: jsPDF, data: G702PDFData, startY: number): number {
  let y = startY

  // Section header
  drawBox(doc, MARGIN, y, CONTENT_WIDTH, 6, { fill: true, fillColor: COLORS.headerBg })
  drawText(doc, 'ARCHITECT\'S CERTIFICATE FOR PAYMENT', MARGIN + 2, y + 4, { bold: true, size: FONT_SIZES.small })
  y += 8

  // Certificate text
  const certText = 'In accordance with the Contract Documents, based on on-site observations and the data ' +
    'comprising this application, the Architect certifies to the Owner that to the best of the Architect\'s ' +
    'knowledge, information and belief the Work has progressed as indicated, the quality of the Work is in ' +
    'accordance with the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED.'

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZES.tiny)
  const lines = doc.splitTextToSize(certText, CONTENT_WIDTH - 4)
  doc.text(lines, MARGIN + 2, y + 3)
  y += lines.length * 3 + 4

  // Amount certified
  drawBox(doc, MARGIN, y, CONTENT_WIDTH / 2, 8, { fill: true, fillColor: COLORS.veryLightGray })
  drawText(doc, 'AMOUNT CERTIFIED:', MARGIN + 2, y + 5, { bold: true, size: FONT_SIZES.small })
  drawBox(doc, MARGIN + CONTENT_WIDTH / 2, y, CONTENT_WIDTH / 2, 8)
  drawText(doc, formatCurrency(data.application.current_payment_due), MARGIN + CONTENT_WIDTH - 4, y + 5, { bold: true, size: FONT_SIZES.body, align: 'right', maxWidth: CONTENT_WIDTH / 2 - 6 })
  y += 10

  // Architect signature
  drawText(doc, 'ARCHITECT:', MARGIN, y + 3, { bold: true, size: FONT_SIZES.tiny })
  y += 5

  const halfWidth = CONTENT_WIDTH / 2 - 2

  drawBox(doc, MARGIN, y, halfWidth, 10)
  drawText(doc, 'By:', MARGIN + 2, y + 4, { size: FONT_SIZES.tiny })
  drawText(doc, 'Date:', MARGIN + 2, y + 8, { size: FONT_SIZES.tiny })
  if (data.application.architect_signature_date) {
    drawText(doc, formatDate(data.application.architect_signature_date), MARGIN + 15, y + 8, { size: FONT_SIZES.small })
  }

  // Note about modifications
  drawBox(doc, MARGIN + halfWidth + 4, y, halfWidth, 10)
  doc.setFontSize(FONT_SIZES.tiny)
  doc.text('This Certificate is not negotiable. The AMOUNT', MARGIN + halfWidth + 6, y + 4)
  doc.text('CERTIFIED is payable only to the Contractor named herein.', MARGIN + halfWidth + 6, y + 7)

  y += 12

  return y
}

/**
 * Draw footer with page numbers
 */
function drawFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(BORDER_WIDTH.thin)
    doc.line(MARGIN, PAGE_HEIGHT_PORTRAIT - 10, PAGE_WIDTH_PORTRAIT - MARGIN, PAGE_HEIGHT_PORTRAIT - 10)

    // Page number
    doc.setFontSize(FONT_SIZES.tiny)
    doc.setTextColor(...COLORS.mediumGray)
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_WIDTH_PORTRAIT - MARGIN,
      PAGE_HEIGHT_PORTRAIT - 6,
      { align: 'right' }
    )

    // Generated timestamp
    doc.text(
      `Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
      MARGIN,
      PAGE_HEIGHT_PORTRAIT - 6
    )

    // AIA document notice
    doc.text(
      'AIA Document G702 - Application and Certificate for Payment',
      PAGE_WIDTH_PORTRAIT / 2,
      PAGE_HEIGHT_PORTRAIT - 6,
      { align: 'center' }
    )
  }
}

/**
 * Generate G702 PDF
 */
export async function generateG702PDF(data: G702PDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  // Draw sections
  let y = drawHeader(doc, data)
  y = drawProjectInfo(doc, data, y)
  y = drawContractSummary(doc, data, y)
  y = drawChangeOrderSummary(doc, data, y)
  y = drawContractorCertification(doc, data, y)
  drawArchitectCertificate(doc, data, y)

  // Add footer
  drawFooter(doc)

  return doc.output('blob')
}

/**
 * Download G702 PDF
 */
export async function downloadG702PDF(data: G702PDFData): Promise<void> {
  const blob = await generateG702PDF(data)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const appNum = data.application.application_number
  const projectName = data.project.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `G702_App${appNum}_${projectName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
