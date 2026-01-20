/**
 * PDF Export Utility for Daily Reports
 * Generates professional PDF documents from daily report data with JobSight branding
 */

import { format } from 'date-fns'
import type { DailyReport } from '@/types/database'
import type {
  DailyReportWorkforce,
  DailyReportEquipment,
  DailyReportDelivery,
  DailyReportVisitor,
  DailyReportPhoto,
} from '../hooks/useDailyReportRelatedData'
import { PDFGenerator, PDF_CONSTANTS } from '@/lib/utils/pdfGenerator'
import { getCompanyInfo, CompanyInfo } from '@/lib/utils/pdfBranding'

const { MARGIN, PAGE_WIDTH, COLORS } = PDF_CONSTANTS
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

// Helper functions removed as they are largely replaced by inline PDFGenerator calls or moved to the main function
// formatTime is still useful
function formatTime(time: string | null | undefined): string {
  if (!time) { return '-' }
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
  projectId: string
  gcCompany?: CompanyInfo
}

/**
 * Generate a PDF for a daily report with JobSight branding
 * Returns a Blob that can be downloaded
 */
/**
 * Generate a PDF for a daily report with JobSight branding
 * Returns a Blob that can be downloaded
 */
export async function generateDailyReportPDF(options: GeneratePDFOptions): Promise<Blob> {
  const { report, workforce, equipment, deliveries, visitors, projectName, projectId, gcCompany } = options

  // Fetch company info for branding
  const companyInfo = gcCompany || await getCompanyInfo(projectId)

  // Create PDF document
  const pdf = new PDFGenerator({ format: 'a4' })

  const reportDate = report.report_date
    ? format(new Date(report.report_date), 'MMMM d, yyyy')
    : 'N/A'

  await pdf.initialize(
    projectId,
    'DAILY REPORT',
    `Daily Report - ${reportDate}`,
    companyInfo
  )

  // Report Info Section
  // Custom manual drawing for badge
  const doc = pdf.getJsPDF()
  let yPos = pdf.getY()

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.darkGray)
  doc.text(projectName, MARGIN, yPos)
  yPos += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  const reportNumber = report.report_number || 'N/A'
  doc.text(`Date: ${reportDate}`, MARGIN, yPos)
  doc.text(`Report #: ${reportNumber}`, MARGIN + 80, yPos)

  // Status badge
  const status = report.status || 'draft'
  const statusColorMap: Record<string, [number, number, number]> = {
    'approved': COLORS.successGreen,
    'submitted': COLORS.primary,
    'in_review': COLORS.primary,
    'rejected': COLORS.urgentRed,
  }
  const statusColor = statusColorMap[status] || COLORS.lightGray

  const statusText = status.replace('_', ' ').toUpperCase()
  const statusWidth = doc.getTextWidth(statusText) + 8

  doc.setFillColor(...statusColor)
  doc.roundedRect(PAGE_WIDTH - MARGIN - statusWidth, yPos - 4, statusWidth, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(statusText, PAGE_WIDTH - MARGIN - statusWidth + 4, yPos + 1)

  pdf.setY(yPos + 8)

  // Weather Section
  pdf.addSectionHeader('WEATHER CONDITIONS')
  // We can use KeyValuePairs but need 3 columns mostly
  // Or stick to manual drawing using PDFGenerator currentY

  yPos = pdf.getY()
  const col1X = MARGIN
  const col2X = MARGIN + 60
  const col3X = MARGIN + 120

  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)

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

  if (report.weather_delays) {
    doc.setTextColor(...COLORS.urgentRed)
    doc.text('Yes', col3X + 35, yPos)
    doc.setTextColor(0, 0, 0)
  } else {
    doc.text('No', col3X + 35, yPos)
  }

  yPos += 6
  pdf.setY(yPos)

  if (report.weather_delay_notes) {
    pdf.addParagraph(`Delay Notes: ${report.weather_delay_notes}`)
  }

  pdf.setY(pdf.getY() + 4)

  // Workforce Section
  if (workforce.length > 0) {
    const totalWorkers = workforce.reduce((sum, w) => sum + (w.worker_count || 1), 0)
    pdf.addSectionHeader('WORKFORCE')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Workers: ${totalWorkers}`, MARGIN, pdf.getY())
    pdf.setY(pdf.getY() + 5)

    const tableData = workforce.map((w) => [
      w.trade || w.team_name || 'General',
      w.worker_count?.toString() || '1',
      w.hours_worked?.toString() || '-',
      w.activity || '-',
    ])

    pdf.addTable({
      head: [['Trade/Team', 'Workers', 'Hours', 'Activity']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 'auto' },
      }
    })
  }

  // Equipment Section
  if (equipment.length > 0) {
    pdf.addSectionHeader('EQUIPMENT ON SITE')

    const tableData = equipment.map((e) => [
      e.equipment_type,
      e.quantity?.toString() || '1',
      e.owner || '-',
      e.hours_used?.toString() || '-',
      e.notes || '-',
    ])

    pdf.addTable({
      head: [['Equipment Type', 'Qty', 'Owner', 'Hours', 'Notes']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 30 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 'auto' },
      }
    })
  }

  // Deliveries Section
  if (deliveries.length > 0) {
    pdf.addSectionHeader('MATERIAL DELIVERIES')

    const tableData = deliveries.map((d) => [
      d.material_description,
      d.quantity || '-',
      d.vendor || '-',
      d.delivery_ticket_number || '-',
      formatTime(d.delivery_time),
    ])

    pdf.addTable({
      head: [['Material', 'Quantity', 'Vendor', 'Ticket #', 'Time']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25, halign: 'center' },
      }
    })
  }

  // Visitors Section
  if (visitors.length > 0) {
    pdf.addSectionHeader('SITE VISITORS')

    const tableData = visitors.map((v) => [
      v.visitor_name,
      v.company || '-',
      v.purpose || '-',
      formatTime(v.arrival_time),
      formatTime(v.departure_time),
    ])

    pdf.addTable({
      head: [['Visitor Name', 'Company', 'Purpose', 'Arrival', 'Departure']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
      }
    })
  }

  // Work Performed Section
  if (report.work_completed) {
    pdf.addSectionHeader('WORK PERFORMED')
    pdf.addParagraph(report.work_completed)
  }

  // Issues Section
  if (report.issues || report.observations) {
    pdf.addSectionHeader('ISSUES & OBSERVATIONS')
    if (report.issues) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.darkGray)
      doc.text('Issues/Problems:', MARGIN, pdf.getY())
      doc.setTextColor(0, 0, 0)
      pdf.setY(pdf.getY() + 5)
      pdf.addParagraph(report.issues)
    }
    if (report.observations) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.darkGray)
      doc.text('Observations:', MARGIN, pdf.getY())
      doc.setTextColor(0, 0, 0)
      pdf.setY(pdf.getY() + 5)
      pdf.addParagraph(report.observations)
    }
  }

  // Comments Section
  if (report.comments) {
    pdf.addSectionHeader('ADDITIONAL COMMENTS')
    pdf.addParagraph(report.comments)
  }

  pdf.finalize()

  // Return as blob
  return pdf.getJsPDF().output('blob')
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
