/**
 * G703 PDF Template - AIA Document G703 (Continuation Sheet)
 * Generates professional AIA-style G703 continuation sheet as PDF with JobSight branding
 * This is the Schedule of Values breakdown for payment applications
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { G703PDFData, ScheduleOfValuesItem } from '@/types/payment-application'
import {
  PAGE_WIDTH_LANDSCAPE,
  PAGE_HEIGHT_LANDSCAPE,
  MARGIN,
  COLORS,
  FONT_SIZES,
  BORDER_WIDTH,
  formatCurrency,
  formatPercent,
  formatDate,
} from './pdfStyles'
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
} from '@/lib/utils/pdfBranding'

const CONTENT_WIDTH = PAGE_WIDTH_LANDSCAPE - 2 * MARGIN

/**
 * Draw the G703 info section (replaces old header)
 */
function drawApplicationInfo(doc: jsPDF, data: G703PDFData, startY: number): number {
  let y = startY

  // Application info
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZES.body)

  const projectName = data.application.project?.name || 'Unknown Project'
  const appNumber = data.application.application_number
  const periodTo = formatDate(data.application.period_to)
  const architectProject = data.application.project?.project_number || 'N/A'

  // Info boxes
  const boxWidth = CONTENT_WIDTH / 4 - 2
  const boxHeight = 12

  // Project Name
  doc.setDrawColor(...COLORS.black)
  doc.setLineWidth(BORDER_WIDTH.thin)
  doc.rect(MARGIN, y, boxWidth, boxHeight, 'S')
  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(...COLORS.mediumGray)
  doc.text('PROJECT NAME', MARGIN + 2, y + 3)
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(...COLORS.black)
  doc.text(projectName.substring(0, 35), MARGIN + 2, y + 8)

  // Application Number
  doc.rect(MARGIN + boxWidth + 2, y, boxWidth, boxHeight, 'S')
  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(...COLORS.mediumGray)
  doc.text('APPLICATION NUMBER', MARGIN + boxWidth + 4, y + 3)
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(...COLORS.black)
  doc.text(String(appNumber), MARGIN + boxWidth + 4, y + 8)

  // Period To
  doc.rect(MARGIN + (boxWidth + 2) * 2, y, boxWidth, boxHeight, 'S')
  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(...COLORS.mediumGray)
  doc.text('PERIOD TO', MARGIN + (boxWidth + 2) * 2 + 2, y + 3)
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(...COLORS.black)
  doc.text(periodTo, MARGIN + (boxWidth + 2) * 2 + 2, y + 8)

  // Architect's Project No
  doc.rect(MARGIN + (boxWidth + 2) * 3, y, boxWidth, boxHeight, 'S')
  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(...COLORS.mediumGray)
  doc.text('PROJECT NUMBER', MARGIN + (boxWidth + 2) * 3 + 2, y + 3)
  doc.setFontSize(FONT_SIZES.small)
  doc.setTextColor(...COLORS.black)
  doc.text(architectProject, MARGIN + (boxWidth + 2) * 3 + 2, y + 8)

  y += boxHeight + 4

  return y
}

/**
 * Format item for table row
 */
function formatTableRow(item: ScheduleOfValuesItem): string[] {
  const percentComplete = item.total_scheduled_value > 0
    ? ((item.total_completed_stored / item.total_scheduled_value) * 100)
    : 0

  return [
    item.item_number,
    item.description.substring(0, 50),
    formatCurrency(item.scheduled_value),
    formatCurrency(item.work_completed_previous),
    formatCurrency(item.work_completed_this_period),
    formatCurrency(item.materials_stored),
    formatCurrency(item.total_completed_stored),
    formatPercent(percentComplete),
    formatCurrency(item.balance_to_finish),
    formatCurrency(item.retainage_amount || 0),
  ]
}

/**
 * Draw the Schedule of Values table
 */
function drawSOVTable(doc: jsPDF, data: G703PDFData, startY: number): number {
  const items = data.items || []
  const totals = data.totals

  // Table headers matching AIA G703 columns
  const headers = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    [
      'Item\nNo.',
      'Description of Work',
      'Scheduled\nValue',
      'Work Completed\n(Previous)',
      'Work Completed\n(This Period)',
      'Materials\nPresently Stored',
      'Total Completed\n& Stored (D+E+F)',
      '%\n(G÷C)',
      'Balance\nTo Finish\n(C-G)',
      'Retainage',
    ],
  ]

  // Format data rows
  const tableData = items.map(formatTableRow)

  // Add totals row
  const totalsRow = [
    '',
    'TOTALS',
    formatCurrency(totals.scheduled_value),
    formatCurrency(totals.work_completed_previous),
    formatCurrency(totals.work_completed_this_period),
    formatCurrency(totals.materials_stored),
    formatCurrency(totals.total_completed_stored),
    formatPercent(totals.scheduled_value > 0 ? (totals.total_completed_stored / totals.scheduled_value) * 100 : 0),
    formatCurrency(totals.balance_to_finish),
    formatCurrency(totals.retainage),
  ]

  // Column widths (proportional to CONTENT_WIDTH)
  const columnStyles: { [key: number]: { cellWidth: number | 'auto'; halign?: 'left' | 'center' | 'right' } } = {
    0: { cellWidth: 12, halign: 'center' },    // Item No.
    1: { cellWidth: 'auto' },                   // Description (auto-expand)
    2: { cellWidth: 25, halign: 'right' },     // Scheduled Value
    3: { cellWidth: 25, halign: 'right' },     // Work Previous
    4: { cellWidth: 25, halign: 'right' },     // Work This Period
    5: { cellWidth: 25, halign: 'right' },     // Materials Stored
    6: { cellWidth: 28, halign: 'right' },     // Total Completed
    7: { cellWidth: 14, halign: 'center' },    // %
    8: { cellWidth: 25, halign: 'right' },     // Balance
    9: { cellWidth: 22, halign: 'right' },     // Retainage
  }

  // Draw table
  autoTable(doc, {
    startY,
    head: headers,
    body: [...tableData, totalsRow],
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: FONT_SIZES.tiny,
      cellPadding: 1.5,
      lineColor: COLORS.black,
      lineWidth: BORDER_WIDTH.thin,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.black,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 12,
    },
    bodyStyles: {
      minCellHeight: 6,
    },
    alternateRowStyles: {
      fillColor: COLORS.veryLightGray,
    },
    columnStyles,
    // Style totals row differently
    didParseCell: (data) => {
      if (data.row.index === tableData.length && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = COLORS.lightGray
      }
    },
    // Add column letters row styling
    willDrawCell: (data) => {
      if (data.row.index === 0 && data.section === 'head') {
        data.cell.styles.fillColor = COLORS.aiaBlue
        data.cell.styles.textColor = COLORS.white
        data.cell.styles.minCellHeight = 6
      }
    },
  })

  return (doc as any).lastAutoTable.finalY + 5
}

/**
 * Draw instructions/notes section
 */
function drawInstructions(doc: jsPDF, startY: number): number {
  let y = startY

  // Check if we need a new page
  if (y > PAGE_HEIGHT_LANDSCAPE - 40) {
    doc.addPage()
    y = MARGIN
  }

  doc.setFontSize(FONT_SIZES.tiny)
  doc.setTextColor(...COLORS.mediumGray)
  doc.setFont('helvetica', 'italic')

  const instructions = [
    'Column A: Item numbers correspond to the Schedule of Values.',
    'Column B: Description of work items as per the contract.',
    'Column C: Original scheduled value plus any approved change orders.',
    'Columns D, E, F: Work completed and materials stored as of this application.',
    'Column G: Sum of columns D, E, and F.',
    'Column H: Percentage of work completed (Column G ÷ Column C).',
    'Column I: Remaining balance to complete the work (Column C - Column G).',
    'Column J: Retainage withheld per contract terms.',
  ]

  instructions.forEach((instruction, index) => {
    doc.text(instruction, MARGIN, y + (index * 3.5))
  })

  return y + instructions.length * 3.5 + 5
}

// Footer function removed - now using centralized JobSight branding from pdfBranding.ts

/**
 * Generate G703 PDF with JobSight branding
 */
export async function generateG703PDF(data: G703PDFData): Promise<Blob> {
  // Fetch company info for branding
  const gcCompany = data.gcCompany || await getCompanyInfo(data.projectId)

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  // Add JobSight branded header with GC logo and info
  const appNumber = data.application.application_number

  let y = await addDocumentHeader(doc, {
    gcCompany,
    documentTitle: `Schedule of Values - Application #${appNumber}`,
    documentType: 'PAYMENT APPLICATION',
  })

  // Draw sections
  y = drawApplicationInfo(doc, data, y)
  y = drawSOVTable(doc, data, y)
  drawInstructions(doc, y)

  // Add JobSight footer to all pages with "Powered by JobSightApp.com"
  addFootersToAllPages(doc)

  return doc.output('blob')
}

/**
 * Download G703 PDF
 */
export async function downloadG703PDF(data: G703PDFData): Promise<void> {
  const blob = await generateG703PDF(data)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const appNum = data.application.application_number
  const projectName = (data.application.project?.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `G703_App${appNum}_${projectName}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate combined G702/G703 PDF package
 */
export async function generatePaymentApplicationPackage(
  _g702Data: import('@/types/payment-application').G702PDFData,
  g703Data: G703PDFData
): Promise<Blob> {
  // TODO: Implement PDF merging. For now, we return just the G703
  // A more complete implementation would merge the G702 and G703 PDFs
  return generateG703PDF(g703Data)
}
