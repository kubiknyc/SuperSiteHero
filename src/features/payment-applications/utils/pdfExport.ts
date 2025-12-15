/**
 * PDF Export Utilities for Payment Applications
 * Exports G702 and G703 AIA forms as PDF documents
 */

export { generateG702PDF, downloadG702PDF } from './g702Template'
export { generateG703PDF, downloadG703PDF, generatePaymentApplicationPackage } from './g703Template'
export {
  formatCurrency,
  formatPercent,
  formatDate,
  formatShortDate,
  COLORS,
  FONT_SIZES,
} from './pdfStyles'

import type {
  G702PDFData,
  G703PDFData,
  PaymentApplicationWithDetails,
  ScheduleOfValuesItem,
} from '@/types/payment-application'
import { downloadG702PDF } from './g702Template'
import { downloadG703PDF } from './g703Template'

/**
 * Build G702 PDF data from a payment application
 */
export function buildG702Data(
  application: PaymentApplicationWithDetails,
  projectInfo?: {
    address?: string
    owner?: string
    architect?: string
    contractor?: string
    contractorAddress?: string
  }
): G702PDFData {
  return {
    application,
    project: {
      name: application.project?.name || 'Unknown Project',
      number: application.project?.project_number || null,
      address: projectInfo?.address || null,
    },
    contractor: {
      name: projectInfo?.contractor || 'Contractor',
      address: projectInfo?.contractorAddress || null,
    },
    architect: {
      name: projectInfo?.architect || null,
    },
    owner: {
      name: projectInfo?.owner || null,
    },
    projectId: application.project_id,
  }
}

/**
 * Build G703 PDF data from a payment application and SOV items
 */
export function buildG703Data(
  application: PaymentApplicationWithDetails,
  items: ScheduleOfValuesItem[]
): G703PDFData {
  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      scheduled_value: acc.scheduled_value + (item.scheduled_value || 0),
      work_completed_previous: acc.work_completed_previous + (item.work_completed_previous || 0),
      work_completed_this_period: acc.work_completed_this_period + (item.work_completed_this_period || 0),
      materials_stored: acc.materials_stored + (item.materials_stored || 0),
      total_completed_stored: acc.total_completed_stored + (item.total_completed_stored || 0),
      balance_to_finish: acc.balance_to_finish + (item.balance_to_finish || 0),
      retainage: acc.retainage + (item.retainage_amount || 0),
    }),
    {
      scheduled_value: 0,
      work_completed_previous: 0,
      work_completed_this_period: 0,
      materials_stored: 0,
      total_completed_stored: 0,
      balance_to_finish: 0,
      retainage: 0,
    }
  )

  return {
    application,
    items,
    totals,
  }
}

/**
 * Download complete payment application package (G702 + G703)
 */
export async function downloadPaymentApplicationPDFs(
  application: PaymentApplicationWithDetails,
  items: ScheduleOfValuesItem[],
  projectInfo?: {
    address?: string
    owner?: string
    architect?: string
    contractor?: string
    contractorAddress?: string
  }
): Promise<void> {
  const g702Data = buildG702Data(application, projectInfo)
  const g703Data = buildG703Data(application, items)

  // Download both PDFs
  await Promise.all([
    downloadG702PDF(g702Data),
    downloadG703PDF(g703Data),
  ])
}

/**
 * Export types for use in components
 */
export type { G702PDFData, G703PDFData }
