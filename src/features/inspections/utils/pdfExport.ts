/**
 * PDF Export Utilities for Inspections
 * Generates professional Inspection documents for distribution and archival
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding'
import type { InspectionPhoto } from '../types/photo'

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
  passGreen: [22, 163, 74] as [number, number, number],
  failRed: [220, 38, 38] as [number, number, number],
  conditionalOrange: [249, 115, 22] as [number, number, number],
  pendingGray: [107, 114, 128] as [number, number, number],
}

const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

/**
 * Inspection data interface for PDF generation
 */
export interface InspectionPDFData {
  inspection: {
    id: string
    inspection_type: string
    inspection_name: string
    description?: string | null
    scheduled_date?: string | null
    scheduled_time?: string | null
    inspector_name?: string | null
    inspector_company?: string | null
    inspector_phone?: string | null
    result?: string | null
    result_date?: string | null
    inspector_notes?: string | null
    failure_reasons?: string | null
    corrective_actions_required?: string | null
    reinspection_scheduled_date?: string | null
    permit_number?: string | null
    status?: string
  }
  projectInfo?: {
    name: string
    number?: string
    address?: string
    owner?: string
    contractor?: string
  }
  projectId: string
  gcCompany?: CompanyInfo
  photos?: InspectionPhoto[]
  includePhotos?: boolean
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
 * Format time for documents
 */
function formatTime(time: string | null | undefined): string {
  if (!time) return 'N/A'
  try {
    // Parse time string (HH:MM:SS format)
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  } catch {
    return time
  }
}

/**
 * Get result display info
 */
function getResultInfo(result: string | null | undefined): {
  label: string
  color: [number, number, number]
} {
  switch (result?.toLowerCase()) {
    case 'pass':
    case 'passed':
      return { label: 'PASSED', color: COLORS.passGreen }
    case 'fail':
    case 'failed':
      return { label: 'FAILED', color: COLORS.failRed }
    case 'conditional':
    case 'conditional_pass':
      return { label: 'CONDITIONAL PASS', color: COLORS.conditionalOrange }
    case 'pending':
      return { label: 'PENDING', color: COLORS.pendingGray }
    default:
      return { label: result || 'PENDING', color: COLORS.pendingGray }
  }
}

/**
 * Add a section header
 */
function addSectionHeader(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.white)
  doc.text(title, MARGIN + 3, y + 5.5)
  return y + 12
}

/**
 * Add inspection details section
 */
function addDetailsSection(doc: jsPDF, data: InspectionPDFData, startY: number): number {
  let y = startY
  const { inspection } = data

  y = addSectionHeader(doc, y, 'INSPECTION DETAILS')

  const leftColX = MARGIN
  const rightColX = MARGIN + CONTENT_WIDTH / 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.darkGray)

  // Left column
  const leftItems = [
    { label: 'Type:', value: inspection.inspection_type },
    { label: 'Scheduled Date:', value: formatDate(inspection.scheduled_date) },
    { label: 'Scheduled Time:', value: formatTime(inspection.scheduled_time) },
    { label: 'Permit #:', value: inspection.permit_number || 'N/A' },
  ]

  // Right column
  const rightItems = [
    { label: 'Inspector:', value: inspection.inspector_name || 'N/A' },
    { label: 'Company:', value: inspection.inspector_company || 'N/A' },
    { label: 'Phone:', value: inspection.inspector_phone || 'N/A' },
    { label: 'Result Date:', value: formatDate(inspection.result_date) },
  ]

  let maxY = y

  // Draw left column
  leftItems.forEach((item, index) => {
    const itemY = y + index * 6
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, leftColX, itemY)
    doc.setFont('helvetica', 'normal')
    doc.text(item.value || 'N/A', leftColX + 35, itemY)
    maxY = Math.max(maxY, itemY)
  })

  // Draw right column
  rightItems.forEach((item, index) => {
    const itemY = y + index * 6
    doc.setFont('helvetica', 'bold')
    doc.text(item.label, rightColX, itemY)
    doc.setFont('helvetica', 'normal')
    doc.text(item.value || 'N/A', rightColX + 30, itemY)
    maxY = Math.max(maxY, itemY)
  })

  return maxY + 10
}

/**
 * Add result section with prominent display
 */
function addResultSection(doc: jsPDF, data: InspectionPDFData, startY: number): number {
  let y = startY
  const { inspection } = data

  y = addSectionHeader(doc, y, 'INSPECTION RESULT')

  const resultInfo = getResultInfo(inspection.result)

  // Result box
  const boxHeight = 20
  doc.setFillColor(...resultInfo.color)
  doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COLORS.white)
  doc.text(resultInfo.label, PAGE_WIDTH / 2, y + boxHeight / 2 + 3, { align: 'center' })

  y += boxHeight + 5

  // Notes
  if (inspection.inspector_notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.darkGray)
    doc.text('Inspector Notes:', MARGIN, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    const notesLines = doc.splitTextToSize(inspection.inspector_notes, CONTENT_WIDTH)
    doc.text(notesLines, MARGIN, y)
    y += notesLines.length * 4 + 5
  }

  // Failure reasons (if failed)
  if (inspection.failure_reasons) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.failRed)
    doc.text('Failure Reasons:', MARGIN, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.darkGray)
    const reasonsLines = doc.splitTextToSize(inspection.failure_reasons, CONTENT_WIDTH)
    doc.text(reasonsLines, MARGIN, y)
    y += reasonsLines.length * 4 + 5
  }

  // Corrective actions
  if (inspection.corrective_actions_required) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.conditionalOrange)
    doc.text('Corrective Actions Required:', MARGIN, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.darkGray)
    const actionsLines = doc.splitTextToSize(inspection.corrective_actions_required, CONTENT_WIDTH)
    doc.text(actionsLines, MARGIN, y)
    y += actionsLines.length * 4 + 5
  }

  // Reinspection date
  if (inspection.reinspection_scheduled_date) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.darkGray)
    doc.text('Reinspection Scheduled:', MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(inspection.reinspection_scheduled_date), MARGIN + 50, y)
    y += 8
  }

  return y
}

/**
 * Add photos section
 */
async function addPhotosSection(
  doc: jsPDF,
  photos: InspectionPhoto[],
  startY: number
): Promise<number> {
  if (!photos || photos.length === 0) return startY

  let y = startY

  // Check if we need a new page
  if (y > PAGE_HEIGHT - 80) {
    doc.addPage()
    y = MARGIN
  }

  y = addSectionHeader(doc, y, `PHOTOS (${photos.length})`)

  // Photo grid (2 columns)
  const photoWidth = (CONTENT_WIDTH - 10) / 2
  const photoHeight = 50
  let col = 0

  for (const photo of photos) {
    if (y + photoHeight > PAGE_HEIGHT - 30) {
      doc.addPage()
      y = MARGIN
    }

    try {
      // Load image
      const img = await loadImage(photo.url)
      const x = MARGIN + col * (photoWidth + 10)

      // Draw image
      doc.addImage(img, 'JPEG', x, y, photoWidth, photoHeight, undefined, 'MEDIUM')

      // Photo type badge
      doc.setFillColor(...COLORS.headerBlue)
      doc.rect(x, y + photoHeight - 6, 25, 6, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(...COLORS.white)
      doc.text(photo.photo_type.toUpperCase(), x + 1, y + photoHeight - 2)

      // Caption
      if (photo.caption) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.mediumGray)
        const captionText = doc.splitTextToSize(photo.caption, photoWidth)
        doc.text(captionText[0] || '', x, y + photoHeight + 4)
      }

      col++
      if (col >= 2) {
        col = 0
        y += photoHeight + 12
      }
    } catch {
      // Skip failed image loads
      continue
    }
  }

  // Handle odd number of photos
  if (col === 1) {
    y += photoHeight + 12
  }

  return y
}

/**
 * Load an image and return as data URL
 */
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

/**
 * Generate inspection PDF
 */
export async function generateInspectionPDF(data: InspectionPDFData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const { inspection, projectInfo, photos, includePhotos = true } = data

  // Get company info for branding
  const companyInfo = data.gcCompany || (await getCompanyInfo(data.projectId))

  // Add header with company branding
  let y = MARGIN
  y = addDocumentHeader(doc, {
    title: 'INSPECTION REPORT',
    documentNumber: inspection.id?.slice(0, 8).toUpperCase(),
    date: formatDate(inspection.result_date || inspection.scheduled_date),
    companyInfo,
    projectInfo,
  })

  // Inspection name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.headerBlue)
  doc.text(inspection.inspection_name, MARGIN, y)
  y += 8

  // Description
  if (inspection.description) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.darkGray)
    const descLines = doc.splitTextToSize(inspection.description, CONTENT_WIDTH)
    doc.text(descLines, MARGIN, y)
    y += descLines.length * 4 + 5
  }

  y += 5

  // Inspection details section
  y = addDetailsSection(doc, data, y)

  // Result section
  y = addResultSection(doc, data, y)

  // Photos section
  if (includePhotos && photos && photos.length > 0) {
    y = await addPhotosSection(doc, photos, y + 5)
  }

  // Add footers
  addFootersToAllPages(doc, {
    companyInfo,
    documentType: 'Inspection Report',
    documentId: inspection.id,
  })

  return doc
}

/**
 * Export inspection to PDF and trigger download
 */
export async function exportInspectionToPDF(data: InspectionPDFData): Promise<void> {
  const doc = await generateInspectionPDF(data)

  const { inspection, projectInfo } = data
  const projectName = projectInfo?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Project'
  const inspectionName = inspection.inspection_name.replace(/[^a-zA-Z0-9]/g, '_')
  const date = inspection.result_date || inspection.scheduled_date || new Date().toISOString()
  const formattedDate = format(new Date(date), 'yyyy-MM-dd')

  const filename = `Inspection_${projectName}_${inspectionName}_${formattedDate}.pdf`

  doc.save(filename)
}

/**
 * Get inspection PDF as blob for sharing
 */
export async function getInspectionPDFBlob(data: InspectionPDFData): Promise<Blob> {
  const doc = await generateInspectionPDF(data)
  return doc.output('blob')
}

/**
 * Get inspection PDF as base64 for email attachments
 */
export async function getInspectionPDFBase64(data: InspectionPDFData): Promise<string> {
  const doc = await generateInspectionPDF(data)
  return doc.output('datauristring')
}
