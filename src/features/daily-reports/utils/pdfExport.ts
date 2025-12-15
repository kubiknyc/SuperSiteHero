/**
 * PDF Export Utility for Daily Reports
 * Generates professional PDF documents from daily report data
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { DailyReport } from '@/types/database'
import type {
  DailyReportWorkforce,
  DailyReportEquipment,
  DailyReportDelivery,
  DailyReportVisitor,
  DailyReportPhoto,
} from '../hooks/useDailyReportRelatedData'

// =====================================================
// CONSTANTS
// =====================================================

const PAGE_WIDTH = 210 // A4 width in mm
const PAGE_HEIGHT = 297 // A4 height in mm
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

const COLORS = {
  primary: [41, 128, 185] as [number, number, number], // Blue
  secondary: [52, 73, 94] as [number, number, number], // Dark gray
  accent: [46, 204, 113] as [number, number, number], // Green
  warning: [241, 196, 15] as [number, number, number], // Yellow
  danger: [231, 76, 60] as [number, number, number], // Red
  lightGray: [245, 245, 245] as [number, number, number],
  mediumGray: [189, 195, 199] as [number, number, number],
  text: [44, 62, 80] as [number, number, number],
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if we need a page break and add one if necessary
 */
function checkPageBreak(doc: jsPDF, yPos: number, neededSpace: number): number {
  if (yPos + neededSpace > PAGE_HEIGHT - MARGIN - 15) {
    doc.addPage()
    return MARGIN + 10
  }
  return yPos
}

/**
 * Add a section header
 */
function addSectionHeader(doc: jsPDF, title: string, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 15)

  doc.setFillColor(...COLORS.primary)
  doc.rect(MARGIN, yPos, CONTENT_WIDTH, 8, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MARGIN + 3, yPos + 5.5)

  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')

  return yPos + 12
}

/**
 * Add a text block with word wrapping
 */
function addTextBlock(doc: jsPDF, label: string, text: string | null | undefined, yPos: number): number {
  if (!text) {return yPos}

  yPos = checkPageBreak(doc, yPos, 20)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.secondary)
  doc.text(label, MARGIN, yPos)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)

  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 5)
  doc.text(lines, MARGIN, yPos + 5)

  return yPos + 5 + lines.length * 4 + 3
}

/**
 * Format time string for display
 */
function formatTime(time: string | null | undefined): string {
  if (!time) {return '-'}
  // Handle HH:MM:SS format
  const parts = time.split(':')
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10)
    const minutes = parts[1]
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes} ${ampm}`
  }
  return time
}

/**
 * Get status badge color
 */
function getStatusColor(status: string | null | undefined): [number, number, number] {
  switch (status) {
    case 'approved':
      return COLORS.accent
    case 'submitted':
    case 'in_review':
      return COLORS.primary
    case 'rejected':
      return COLORS.danger
    default:
      return COLORS.mediumGray
  }
}

// =====================================================
// SECTION RENDERERS
// =====================================================

/**
 * Add report header
 */
function addHeader(
  doc: jsPDF,
  report: DailyReport,
  projectName: string
): number {
  let yPos = MARGIN

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DAILY REPORT', MARGIN, yPos + 8)

  // Status badge
  const status = report.status || 'draft'
  const statusColor = getStatusColor(status)
  const statusText = status.replace('_', ' ').toUpperCase()
  const statusWidth = doc.getTextWidth(statusText) + 8

  doc.setFillColor(...statusColor)
  doc.roundedRect(PAGE_WIDTH - MARGIN - statusWidth, yPos, statusWidth, 10, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(statusText, PAGE_WIDTH - MARGIN - statusWidth + 4, yPos + 6.5)

  yPos += 15

  // Project name
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.secondary)
  doc.text(projectName, MARGIN, yPos)

  yPos += 8

  // Report details line
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)

  const reportDate = report.report_date
    ? format(new Date(report.report_date), 'MMMM d, yyyy')
    : 'N/A'
  const reportNumber = report.report_number || 'N/A'

  doc.text(`Date: ${reportDate}`, MARGIN, yPos)
  doc.text(`Report #: ${reportNumber}`, MARGIN + 80, yPos)

  yPos += 5

  // Divider line
  doc.setDrawColor(...COLORS.mediumGray)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, yPos, PAGE_WIDTH - MARGIN, yPos)

  return yPos + 8
}

/**
 * Add weather section
 */
function addWeatherSection(doc: jsPDF, report: DailyReport, yPos: number): number {
  yPos = addSectionHeader(doc, 'WEATHER CONDITIONS', yPos)

  const col1X = MARGIN
  const col2X = MARGIN + 60
  const col3X = MARGIN + 120

  doc.setFontSize(9)

  // Row 1
  doc.setFont('helvetica', 'bold')
  doc.text('Conditions:', col1X, yPos)
  doc.text('High Temp:', col2X, yPos)
  doc.text('Low Temp:', col3X, yPos)

  doc.setFont('helvetica', 'normal')
  doc.text(report.weather_condition || '-', col1X + 25, yPos)
  doc.text(report.temperature_high ? `${report.temperature_high}°F` : '-', col2X + 25, yPos)
  doc.text(report.temperature_low ? `${report.temperature_low}°F` : '-', col3X + 22, yPos)

  yPos += 6

  // Row 2
  doc.setFont('helvetica', 'bold')
  doc.text('Precipitation:', col1X, yPos)
  doc.text('Wind Speed:', col2X, yPos)
  doc.text('Weather Delays:', col3X, yPos)

  doc.setFont('helvetica', 'normal')
  doc.text(report.precipitation ? `${report.precipitation}"` : '-', col1X + 28, yPos)
  doc.text(report.wind_speed ? `${report.wind_speed} mph` : '-', col2X + 28, yPos)

  // Weather delays with color
  const hasDelays = report.weather_delays
  if (hasDelays) {
    doc.setTextColor(...COLORS.danger)
    doc.text('Yes', col3X + 35, yPos)
    doc.setTextColor(...COLORS.text)
  } else {
    doc.text('No', col3X + 35, yPos)
  }

  yPos += 6

  // Weather delay notes
  if (report.weather_delay_notes) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    const notes = doc.splitTextToSize(`Delay Notes: ${report.weather_delay_notes}`, CONTENT_WIDTH)
    doc.text(notes, col1X, yPos)
    yPos += notes.length * 3.5
  }

  return yPos + 5
}

/**
 * Add workforce section
 */
function addWorkforceSection(
  doc: jsPDF,
  workforce: DailyReportWorkforce[],
  yPos: number
): number {
  if (workforce.length === 0) {return yPos}

  yPos = addSectionHeader(doc, 'WORKFORCE', yPos)

  // Calculate total workers
  const totalWorkers = workforce.reduce((sum, w) => sum + (w.worker_count || 1), 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Workers: ${totalWorkers}`, MARGIN, yPos)
  yPos += 5

  // Table
  const tableData = workforce.map((w) => [
    w.trade || w.team_name || 'General',
    w.worker_count?.toString() || '1',
    w.hours_worked?.toString() || '-',
    w.activity || '-',
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Trade/Team', 'Workers', 'Hours', 'Activity']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
  })

  return (doc as any).lastAutoTable.finalY + 8
}

/**
 * Add equipment section
 */
function addEquipmentSection(
  doc: jsPDF,
  equipment: DailyReportEquipment[],
  yPos: number
): number {
  if (equipment.length === 0) {return yPos}

  yPos = addSectionHeader(doc, 'EQUIPMENT ON SITE', yPos)

  const tableData = equipment.map((e) => [
    e.equipment_type,
    e.quantity?.toString() || '1',
    e.owner || '-',
    e.hours_used?.toString() || '-',
    e.notes || '-',
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Equipment Type', 'Qty', 'Owner', 'Hours', 'Notes']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
  })

  return (doc as any).lastAutoTable.finalY + 8
}

/**
 * Add deliveries section
 */
function addDeliveriesSection(
  doc: jsPDF,
  deliveries: DailyReportDelivery[],
  yPos: number
): number {
  if (deliveries.length === 0) {return yPos}

  yPos = addSectionHeader(doc, 'MATERIAL DELIVERIES', yPos)

  const tableData = deliveries.map((d) => [
    d.material_description,
    d.quantity || '-',
    d.vendor || '-',
    d.delivery_ticket_number || '-',
    formatTime(d.delivery_time),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Material', 'Quantity', 'Vendor', 'Ticket #', 'Time']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25 },
      2: { cellWidth: 40 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: 'center' },
    },
  })

  return (doc as any).lastAutoTable.finalY + 8
}

/**
 * Add visitors section
 */
function addVisitorsSection(
  doc: jsPDF,
  visitors: DailyReportVisitor[],
  yPos: number
): number {
  if (visitors.length === 0) {return yPos}

  yPos = addSectionHeader(doc, 'SITE VISITORS', yPos)

  const tableData = visitors.map((v) => [
    v.visitor_name,
    v.company || '-',
    v.purpose || '-',
    formatTime(v.arrival_time),
    formatTime(v.departure_time),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Visitor Name', 'Company', 'Purpose', 'Arrival', 'Departure']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
    },
  })

  return (doc as any).lastAutoTable.finalY + 8
}

/**
 * Add work performed section
 */
function addWorkPerformedSection(doc: jsPDF, report: DailyReport, yPos: number): number {
  if (!report.work_completed) {return yPos}

  yPos = addSectionHeader(doc, 'WORK PERFORMED', yPos)
  yPos = addTextBlock(doc, '', report.work_completed, yPos)

  return yPos + 3
}

/**
 * Add issues section
 */
function addIssuesSection(doc: jsPDF, report: DailyReport, yPos: number): number {
  if (!report.issues && !report.observations) {return yPos}

  yPos = addSectionHeader(doc, 'ISSUES & OBSERVATIONS', yPos)

  if (report.issues) {
    yPos = addTextBlock(doc, 'Issues/Problems:', report.issues, yPos)
  }

  if (report.observations) {
    yPos = addTextBlock(doc, 'Observations:', report.observations, yPos)
  }

  return yPos + 3
}

/**
 * Add comments section
 */
function addCommentsSection(doc: jsPDF, report: DailyReport, yPos: number): number {
  if (!report.comments) {return yPos}

  yPos = addSectionHeader(doc, 'ADDITIONAL COMMENTS', yPos)
  yPos = addTextBlock(doc, '', report.comments, yPos)

  return yPos + 3
}

/**
 * Add footer to all pages
 */
function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...COLORS.mediumGray)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)

    // Page number
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.secondary)
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_WIDTH - MARGIN,
      PAGE_HEIGHT - 7,
      { align: 'right' }
    )

    // Generated timestamp
    doc.text(
      `Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
      MARGIN,
      PAGE_HEIGHT - 7
    )
  }
}

// =====================================================
// MAIN EXPORT FUNCTION
// =====================================================

export interface GeneratePDFOptions {
  report: DailyReport
  workforce: DailyReportWorkforce[]
  equipment: DailyReportEquipment[]
  deliveries: DailyReportDelivery[]
  visitors: DailyReportVisitor[]
  photos: DailyReportPhoto[]
  projectName: string
}

/**
 * Generate a PDF for a daily report
 * Returns a Blob that can be downloaded
 */
export async function generateDailyReportPDF(options: GeneratePDFOptions): Promise<Blob> {
  const { report, workforce, equipment, deliveries, visitors, projectName } = options

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Add sections
  let yPos = addHeader(doc, report, projectName)
  yPos = addWeatherSection(doc, report, yPos)
  yPos = addWorkforceSection(doc, workforce, yPos)
  yPos = addEquipmentSection(doc, equipment, yPos)
  yPos = addDeliveriesSection(doc, deliveries, yPos)
  yPos = addVisitorsSection(doc, visitors, yPos)
  yPos = addWorkPerformedSection(doc, report, yPos)
  yPos = addIssuesSection(doc, report, yPos)
  addCommentsSection(doc, report, yPos)

  // Add footer to all pages
  addFooter(doc)

  // Return as blob
  return doc.output('blob')
}

/**
 * Generate and download a PDF for a daily report
 */
export async function downloadDailyReportPDF(options: GeneratePDFOptions): Promise<void> {
  const blob = await generateDailyReportPDF(options)

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  // Generate filename
  const dateStr = options.report.report_date
    ? format(new Date(options.report.report_date), 'yyyy-MM-dd')
    : 'report'
  const reportNum = options.report.report_number || ''
  link.download = `Daily_Report_${dateStr}${reportNum ? '_' + reportNum : ''}.pdf`

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup
  URL.revokeObjectURL(url)
}
