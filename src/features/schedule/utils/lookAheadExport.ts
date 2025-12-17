/**
 * Look-Ahead Export Utilities
 *
 * Export 4-week look-ahead schedules to PDF and Excel formats.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { format, parseISO } from 'date-fns'
import { addDocumentHeader, addFootersToAllPages } from '@/lib/utils/pdfBranding'

// ============================================================================
// TYPES
// ============================================================================

interface LookAheadActivity {
  id: string
  name: string
  startDate: string
  endDate: string
  duration: number
  status: string
  assignedTo?: string
  percentComplete: number
}

interface LookAheadExportOptions {
  projectName: string
  startDate: string
  endDate: string
  activities: LookAheadActivity[]
}

// ============================================================================
// PDF EXPORT
// ============================================================================

export async function exportLookAheadToPdf(options: LookAheadExportOptions): Promise<void> {
  const { projectName, startDate, endDate, activities } = options

  // Create PDF document (landscape for better table fit)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  // Add header with branding
  await addDocumentHeader(doc, {
    title: '4-Week Look-Ahead Schedule',
    subtitle: projectName,
    projectName,
  })

  // Add date range
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(
    `${format(parseISO(startDate), 'MMMM d, yyyy')} - ${format(parseISO(endDate), 'MMMM d, yyyy')}`,
    14,
    45
  )
  doc.text(`Printed: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, 50)

  // Prepare table data
  const tableData = activities.map((activity) => [
    activity.name,
    format(parseISO(activity.startDate), 'MM/dd/yy'),
    format(parseISO(activity.endDate), 'MM/dd/yy'),
    `${activity.duration}d`,
    getStatusLabel(activity.status),
    `${activity.percentComplete}%`,
    activity.assignedTo || '—',
  ])

  // Add table
  autoTable(doc, {
    startY: 55,
    head: [
      [
        'Activity Name',
        'Start Date',
        'End Date',
        'Duration',
        'Status',
        '% Complete',
        'Assigned To',
      ],
    ],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 80 }, // Activity Name
      1: { cellWidth: 25, halign: 'center' }, // Start Date
      2: { cellWidth: 25, halign: 'center' }, // End Date
      3: { cellWidth: 20, halign: 'center' }, // Duration
      4: { cellWidth: 30, halign: 'left' }, // Status
      5: { cellWidth: 22, halign: 'center' }, // % Complete
      6: { cellWidth: 40, halign: 'left' }, // Assigned To
    },
    margin: { left: 14, right: 14 },
  })

  // Add footer with total count
  const finalY = (doc as any).lastAutoTable.finalY || 55
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Total Activities: ${activities.length}`, 14, finalY + 10)

  // Add page footers
  addFootersToAllPages(doc)

  // Download the PDF
  const filename = `Look-Ahead_${projectName.replace(/\s+/g, '_')}_${format(
    parseISO(startDate),
    'yyyy-MM-dd'
  )}.pdf`
  doc.save(filename)
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

export async function exportLookAheadToExcel(
  options: LookAheadExportOptions
): Promise<void> {
  const { projectName, startDate, endDate, activities } = options

  // Create workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JobSight'
  workbook.created = new Date()

  // Add worksheet
  const worksheet = workbook.addWorksheet('Look-Ahead Schedule')

  // Add title
  worksheet.mergeCells('A1:G1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = '4-Week Look-Ahead Schedule'
  titleCell.font = { size: 16, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Add project name
  worksheet.mergeCells('A2:G2')
  const projectCell = worksheet.getCell('A2')
  projectCell.value = projectName
  projectCell.font = { size: 12, bold: true }
  projectCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Add date range
  worksheet.mergeCells('A3:G3')
  const dateCell = worksheet.getCell('A3')
  dateCell.value = `${format(parseISO(startDate), 'MMMM d, yyyy')} - ${format(
    parseISO(endDate),
    'MMMM d, yyyy'
  )}`
  dateCell.font = { size: 10, color: { argb: 'FF666666' } }
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Add blank row
  worksheet.addRow([])

  // Add headers
  const headerRow = worksheet.addRow([
    'Activity Name',
    'Start Date',
    'End Date',
    'Duration (days)',
    'Status',
    '% Complete',
    'Assigned To',
  ])

  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }, // Blue
  }
  headerRow.alignment = { horizontal: 'left', vertical: 'middle' }
  headerRow.height = 20

  // Add data rows
  activities.forEach((activity, index) => {
    const row = worksheet.addRow([
      activity.name,
      format(parseISO(activity.startDate), 'MM/dd/yyyy'),
      format(parseISO(activity.endDate), 'MM/dd/yyyy'),
      activity.duration,
      getStatusLabel(activity.status),
      activity.percentComplete,
      activity.assignedTo || '—',
    ])

    // Alternate row colors
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' },
      }
    }

    // Center align certain columns
    row.getCell(2).alignment = { horizontal: 'center' } // Start Date
    row.getCell(3).alignment = { horizontal: 'center' } // End Date
    row.getCell(4).alignment = { horizontal: 'center' } // Duration
    row.getCell(6).alignment = { horizontal: 'center' } // % Complete
  })

  // Set column widths
  worksheet.columns = [
    { key: 'name', width: 50 },
    { key: 'start', width: 15 },
    { key: 'end', width: 15 },
    { key: 'duration', width: 15 },
    { key: 'status', width: 18 },
    { key: 'percent', width: 15 },
    { key: 'assigned', width: 25 },
  ]

  // Add borders to data range
  const lastRow = 5 + activities.length
  for (let row = 5; row <= lastRow; row++) {
    for (let col = 1; col <= 7; col++) {
      const cell = worksheet.getCell(row, col)
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      }
    }
  }

  // Add summary
  worksheet.addRow([])
  const summaryRow = worksheet.addRow([`Total Activities: ${activities.length}`])
  summaryRow.font = { bold: true }

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const filename = `Look-Ahead_${projectName.replace(/\s+/g, '_')}_${format(
    parseISO(startDate),
    'yyyy-MM-dd'
  )}.xlsx`

  // Trigger download
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

// ============================================================================
// HELPERS
// ============================================================================

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
