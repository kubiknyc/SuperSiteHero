/**
 * PDF Export Utilities for Lien Waivers
 * Generates PDF documents for various lien waiver types
 * Supports multiple state-specific statutory forms
 */

import jsPDF from 'jspdf'
import { format } from 'date-fns'
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding'
import type {
  LienWaiver,
  LienWaiverWithDetails,
  LienWaiverType,
} from '@/types/lien-waiver'
import {
  getWaiverTypeLabel,
  getStateName,
  isConditionalWaiver,
  isFinalWaiver,
  formatWaiverAmount,
} from '@/types/lien-waiver'

// Page dimensions (Letter size)
const PAGE_WIDTH = 215.9 // 8.5"
const PAGE_HEIGHT = 279.4 // 11"
const MARGIN = 25.4 // 1" margins

const COLORS = {
  black: [0, 0, 0] as [number, number, number],
  darkGray: [51, 51, 51] as [number, number, number],
  mediumGray: [128, 128, 128] as [number, number, number],
  lightGray: [200, 200, 200] as [number, number, number],
}

/**
 * PDF generation data interface
 */
export interface LienWaiverPDFData {
  waiver: LienWaiverWithDetails
  projectId: string
  gcCompany?: CompanyInfo
  projectAddress?: string
  ownerName?: string
  generalContractor?: string
}

/**
 * Format date for legal documents
 */
function formatLegalDate(date: string | null | undefined): string {
  if (!date) {return '________________'}
  try {
    return format(new Date(date), 'MMMM d, yyyy')
  } catch {
    return date
  }
}

/**
 * Spell out dollar amount (for legal documents)
 */
function spellOutAmount(amount: number): string {
  // Simple implementation - in production, use a library like 'written-number'
  const formatted = formatWaiverAmount(amount)
  return `${formatted} (${formatted})`
}

// Header function removed - now using centralized JobSight branding from pdfBranding.ts

/**
 * Draw project information section
 */
function drawProjectInfo(doc: jsPDF, data: LienWaiverPDFData, startY: number): number {
  let y = startY
  const waiver = data.waiver
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.black)

  const leftCol = MARGIN
  const rightCol = MARGIN + contentWidth / 2

  // Row 1
  doc.setFont('helvetica', 'bold')
  doc.text('Project Name:', leftCol, y)
  doc.text('Job Location:', rightCol, y)

  doc.setFont('helvetica', 'normal')
  doc.text(waiver.project?.name || '________________', leftCol + 30, y)
  doc.text(data.projectAddress || '________________', rightCol + 27, y)
  y += 7

  // Row 2
  doc.setFont('helvetica', 'bold')
  doc.text('Owner:', leftCol, y)
  doc.text('General Contractor:', rightCol, y)

  doc.setFont('helvetica', 'normal')
  doc.text(data.ownerName || '________________', leftCol + 17, y)
  doc.text(data.generalContractor || '________________', rightCol + 40, y)
  y += 12

  return y
}

/**
 * Generate conditional progress waiver text
 */
function getConditionalProgressText(data: LienWaiverPDFData): string {
  const waiver = data.waiver
  const amount = formatWaiverAmount(waiver.payment_amount)
  const throughDate = formatLegalDate(waiver.through_date)
  const checkNumber = waiver.check_number || '________________'

  return `Upon receipt by the undersigned of a check from ${data.generalContractor || '________________'} ` +
    `in the sum of ${amount} payable to ${waiver.claimant_company || waiver.vendor_name || '________________'} ` +
    `and when the check has been properly endorsed and has been paid by the bank upon which it is drawn, ` +
    `this document shall become effective to release any mechanic's lien, stop payment notice, or bond right ` +
    `the undersigned has on the job of ${data.ownerName || '________________'} located at ` +
    `${data.projectAddress || '________________'} to the following extent:\n\n` +
    `This release covers a progress payment for labor, services, equipment, or materials furnished to ` +
    `${data.generalContractor || '________________'} through ${throughDate} only and does not cover ` +
    `any retentions, items furnished after said date, pending change orders, disputed items, or claims ` +
    `for extra work.\n\n` +
    `Before any recipient of this document relies on it, that person should verify evidence of payment ` +
    `to the undersigned.\n\n` +
    (waiver.exceptions ? `EXCEPTIONS: This release does not cover the following items: ${waiver.exceptions}\n\n` : '')
}

/**
 * Generate unconditional progress waiver text
 */
function getUnconditionalProgressText(data: LienWaiverPDFData): string {
  const waiver = data.waiver
  const amount = formatWaiverAmount(waiver.payment_amount)
  const throughDate = formatLegalDate(waiver.through_date)

  return `The undersigned has been paid and has received a progress payment in the sum of ${amount} ` +
    `for labor, services, equipment, or materials furnished to ${data.generalContractor || '________________'} ` +
    `on the job of ${data.ownerName || '________________'} located at ${data.projectAddress || '________________'} ` +
    `and does hereby release any mechanic's lien, stop payment notice, or bond right that the undersigned ` +
    `has on the above referenced job to the following extent:\n\n` +
    `This release covers a progress payment for labor, services, equipment, or materials furnished to ` +
    `${data.generalContractor || '________________'} through ${throughDate} only and does not cover ` +
    `any retentions, items furnished after said date, pending change orders, disputed items, or claims ` +
    `for extra work.\n\n` +
    (waiver.exceptions ? `EXCEPTIONS: This release does not cover the following items: ${waiver.exceptions}\n\n` : '')
}

/**
 * Generate conditional final waiver text
 */
function getConditionalFinalText(data: LienWaiverPDFData): string {
  const waiver = data.waiver
  const amount = formatWaiverAmount(waiver.payment_amount)
  const checkNumber = waiver.check_number || '________________'

  return `Upon receipt by the undersigned of a check from ${data.generalContractor || '________________'} ` +
    `in the sum of ${amount} payable to ${waiver.claimant_company || waiver.vendor_name || '________________'} ` +
    `and when the check has been properly endorsed and has been paid by the bank upon which it is drawn, ` +
    `this document shall become effective to release any mechanic's lien, stop payment notice, or bond right ` +
    `the undersigned has on the job of ${data.ownerName || '________________'} located at ` +
    `${data.projectAddress || '________________'} to the following extent:\n\n` +
    `This release covers the final payment for all labor, services, equipment, or materials furnished on ` +
    `this job by the undersigned, except for disputed claims in the amount of $________________ for ` +
    `________________.\n\n` +
    `Before any recipient of this document relies on it, that person should verify evidence of payment ` +
    `to the undersigned.\n\n` +
    (waiver.exceptions ? `EXCEPTIONS: This release does not cover the following items: ${waiver.exceptions}\n\n` : '')
}

/**
 * Generate unconditional final waiver text
 */
function getUnconditionalFinalText(data: LienWaiverPDFData): string {
  const waiver = data.waiver
  const amount = formatWaiverAmount(waiver.payment_amount)

  return `The undersigned has been paid in full for all labor, services, equipment, or materials furnished to ` +
    `${data.generalContractor || '________________'} on the job of ${data.ownerName || '________________'} ` +
    `located at ${data.projectAddress || '________________'} and does hereby waive and release any right ` +
    `to a mechanic's lien, stop payment notice, or any right against a labor and material bond on the ` +
    `above referenced job, except for disputed claims for extra work in the amount of $________________.\n\n` +
    `The undersigned warrants that it has paid all persons, firms, and corporations from which ` +
    `materials were purchased or to whom money is due for labor, services, equipment, or materials ` +
    `used in the construction of improvements at the above-described property, and that no other person, ` +
    `firm, or corporation has any right to file a lien against the property because of any act or omission ` +
    `of the undersigned.\n\n` +
    (waiver.exceptions ? `EXCEPTIONS: This release does not cover the following items: ${waiver.exceptions}\n\n` : '')
}

/**
 * Get waiver text based on type
 */
function getWaiverText(data: LienWaiverPDFData): string {
  const waiverType = data.waiver.waiver_type

  switch (waiverType) {
    case 'conditional_progress':
      return getConditionalProgressText(data)
    case 'unconditional_progress':
      return getUnconditionalProgressText(data)
    case 'conditional_final':
      return getConditionalFinalText(data)
    case 'unconditional_final':
      return getUnconditionalFinalText(data)
    default:
      return getConditionalProgressText(data)
  }
}

/**
 * Draw waiver body text
 */
function drawWaiverBody(doc: jsPDF, data: LienWaiverPDFData, startY: number): number {
  let y = startY
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.black)

  const text = getWaiverText(data)
  const lines = doc.splitTextToSize(text, contentWidth)

  // Check for page break
  const textHeight = lines.length * 4.5
  if (y + textHeight > PAGE_HEIGHT - 80) {
    doc.addPage()
    y = MARGIN
  }

  doc.text(lines, MARGIN, y)
  y += lines.length * 4.5

  return y
}

/**
 * Draw signature section
 */
function drawSignatureSection(doc: jsPDF, data: LienWaiverPDFData, startY: number): number {
  let y = startY
  const waiver = data.waiver
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

  // Check for page break
  if (y + 60 > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    y = MARGIN
  }

  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('CLAIMANT\'S SIGNATURE', MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'normal')

  // Signature line
  doc.setDrawColor(...COLORS.black)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y + 8, MARGIN + contentWidth * 0.5, y + 8)
  doc.text('Signature', MARGIN, y + 12)

  // Date line
  doc.line(MARGIN + contentWidth * 0.55, y + 8, PAGE_WIDTH - MARGIN, y + 8)
  doc.text('Date', MARGIN + contentWidth * 0.55, y + 12)
  if (waiver.signature_date) {
    doc.text(formatLegalDate(waiver.signature_date), MARGIN + contentWidth * 0.55, y + 6)
  }

  y += 20

  // Printed name
  doc.line(MARGIN, y + 8, MARGIN + contentWidth * 0.5, y + 8)
  doc.text('Print Name', MARGIN, y + 12)
  if (waiver.claimant_name) {
    doc.text(waiver.claimant_name, MARGIN, y + 6)
  }

  // Title
  doc.line(MARGIN + contentWidth * 0.55, y + 8, PAGE_WIDTH - MARGIN, y + 8)
  doc.text('Title', MARGIN + contentWidth * 0.55, y + 12)
  if (waiver.claimant_title) {
    doc.text(waiver.claimant_title, MARGIN + contentWidth * 0.55, y + 6)
  }

  y += 20

  // Company name
  doc.line(MARGIN, y + 8, PAGE_WIDTH - MARGIN, y + 8)
  doc.text('Company Name', MARGIN, y + 12)
  if (waiver.claimant_company || waiver.vendor_name) {
    doc.text(waiver.claimant_company || waiver.vendor_name || '', MARGIN, y + 6)
  }

  y += 20

  return y
}

/**
 * Draw notarization section (if required)
 */
function drawNotarizationSection(doc: jsPDF, data: LienWaiverPDFData, startY: number): number {
  if (!data.waiver.notarization_required) {
    return startY
  }

  let y = startY
  const waiver = data.waiver
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

  // Check for page break
  if (y + 50 > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    y = MARGIN
  }

  y += 5

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  doc.text('NOTARIZATION', MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'normal')

  const notaryText = `State of ________________\n` +
    `County of ________________\n\n` +
    `On ________________, before me, ________________, Notary Public, ` +
    `personally appeared ________________, who proved to me on the basis of satisfactory ` +
    `evidence to be the person(s) whose name(s) is/are subscribed to the within instrument and ` +
    `acknowledged to me that he/she/they executed the same in his/her/their authorized capacity(ies), ` +
    `and that by his/her/their signature(s) on the instrument the person(s), or the entity upon behalf ` +
    `of which the person(s) acted, executed the instrument.`

  const lines = doc.splitTextToSize(notaryText, contentWidth)
  doc.text(lines, MARGIN, y)
  y += lines.length * 4

  y += 15

  // Notary signature area
  doc.setDrawColor(...COLORS.black)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, MARGIN + contentWidth * 0.4, y)
  doc.setFontSize(8)
  doc.text('Notary Public Signature', MARGIN, y + 4)

  doc.line(MARGIN + contentWidth * 0.5, y, PAGE_WIDTH - MARGIN, y)
  doc.text('My Commission Expires', MARGIN + contentWidth * 0.5, y + 4)

  y += 15

  // Notary seal area
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.mediumGray)
  doc.text('(NOTARY SEAL)', PAGE_WIDTH / 2, y, { align: 'center' })

  return y + 10
}

// Footer function removed - now using centralized JobSight branding from pdfBranding.ts

/**
 * Generate lien waiver PDF
 */
export async function generateLienWaiverPDF(data: LienWaiverPDFData): Promise<Blob> {
  // Fetch company info for branding
  const gcCompany = data.gcCompany || await getCompanyInfo(data.projectId)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const stateCode = data.waiver.template?.state_code || 'CA' // Default to California
  const waiver = data.waiver

  // Build document title
  const isConditional = isConditionalWaiver(waiver.waiver_type)
  const isFinal = isFinalWaiver(waiver.waiver_type)
  const waiverTypeText = isConditional
    ? `Conditional ${isFinal ? 'Final' : 'Progress'} Payment`
    : `Unconditional ${isFinal ? 'Final' : 'Progress'} Payment`

  // Add JobSight branded header with GC logo and info
  let y = await addDocumentHeader(doc, {
    gcCompany,
    documentTitle: `${waiver.waiver_number} - ${waiverTypeText}`,
    documentType: 'LIEN WAIVER',
  })

  // State indication below header
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.mediumGray)
  doc.text(`State of ${getStateName(stateCode)}`, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 8

  // Draw sections
  y = drawProjectInfo(doc, data, y)
  y = drawWaiverBody(doc, data, y)
  y = drawSignatureSection(doc, data, y)
  drawNotarizationSection(doc, data, y)

  // Add JobSight footer to all pages with "Powered by JobSightApp.com"
  addFootersToAllPages(doc)

  return doc.output('blob')
}

/**
 * Download lien waiver PDF
 */
export async function downloadLienWaiverPDF(data: LienWaiverPDFData): Promise<void> {
  const blob = await generateLienWaiverPDF(data)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const waiverType = getWaiverTypeLabel(data.waiver.waiver_type).replace(/\s+/g, '_')
  const waiverNum = data.waiver.waiver_number
  const date = format(new Date(), 'yyyy-MM-dd')
  link.download = `Lien_Waiver_${waiverType}_${waiverNum}_${date}.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate blank waiver template for printing
 */
export async function generateBlankWaiverPDF(
  waiverType: LienWaiverType,
  stateCode: string,
  projectId: string,
  projectInfo?: {
    projectName?: string
    projectAddress?: string
    ownerName?: string
    generalContractor?: string
  }
): Promise<Blob> {
  // Create a minimal waiver object for template generation
  const blankWaiver: LienWaiverWithDetails = {
    id: '',
    company_id: '',
    project_id: projectId,
    waiver_number: 'BLANK',
    waiver_type: waiverType,
    status: 'draft',
    payment_application_id: null,
    subcontractor_id: null,
    vendor_name: null,
    template_id: null,
    through_date: '',
    payment_amount: 0,
    check_number: null,
    check_date: null,
    exceptions: null,
    rendered_content: null,
    claimant_name: null,
    claimant_title: null,
    claimant_company: null,
    signature_url: null,
    signature_date: null,
    signed_at: null,
    notarization_required: stateCode === 'CA' || stateCode === 'TX', // Some states require notarization
    notary_name: null,
    notary_commission_number: null,
    notary_commission_expiration: null,
    notarized_at: null,
    notarized_document_url: null,
    document_url: null,
    sent_at: null,
    sent_to_email: null,
    received_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    due_date: null,
    reminder_sent_at: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    deleted_at: null,
    project: projectInfo?.projectName
      ? { id: projectId, name: projectInfo.projectName, project_number: null }
      : undefined,
    template: { id: '', name: 'Default', state_code: stateCode },
  }

  return generateLienWaiverPDF({
    waiver: blankWaiver,
    projectId,
    projectAddress: projectInfo?.projectAddress,
    ownerName: projectInfo?.ownerName,
    generalContractor: projectInfo?.generalContractor,
  })
}

/**
 * Download blank waiver template
 */
export async function downloadBlankWaiverPDF(
  waiverType: LienWaiverType,
  stateCode: string,
  projectId: string,
  projectInfo?: {
    projectName?: string
    projectAddress?: string
    ownerName?: string
    generalContractor?: string
  }
): Promise<void> {
  const blob = await generateBlankWaiverPDF(waiverType, stateCode, projectId, projectInfo)

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const waiverTypeLabel = getWaiverTypeLabel(waiverType).replace(/\s+/g, '_')
  const stateName = getStateName(stateCode)
  link.download = `Lien_Waiver_${waiverTypeLabel}_${stateName}_Blank.pdf`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
