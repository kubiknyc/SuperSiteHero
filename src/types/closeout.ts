/**
 * Closeout Document Types
 * Types for the project closeout document tracking system
 * Aligned with migration 082_closeout_documents.sql
 */

// =============================================
// Enums and Constants
// =============================================

/**
 * Closeout document type options
 */
export type CloseoutDocumentType =
  | 'om_manual'               // Operation & Maintenance Manual
  | 'warranty'                // Warranty document
  | 'warranty_letter'         // Warranty letter/certificate
  | 'as_built'                // As-built drawings
  | 'as_built_markup'         // As-built markups/redlines
  | 'training_cert'           // Training certificate
  | 'training_video'          // Training video
  | 'attic_stock'             // Attic stock list/photos
  | 'spare_parts'             // Spare parts list
  | 'final_lien_waiver'       // Final lien waiver
  | 'consent_surety'          // Consent of surety
  | 'certificate_occupancy'   // Certificate of Occupancy
  | 'certificate_completion'  // Certificate of Substantial Completion
  | 'final_inspection'        // Final inspection certificate
  | 'punchlist_completion'    // Punchlist completion certificate
  | 'test_report'             // Test/inspection report
  | 'commissioning_report'    // Commissioning report
  | 'air_balance_report'      // Air balance report
  | 'keying_schedule'         // Keying schedule
  | 'door_hardware_schedule'  // Door hardware schedule
  | 'paint_schedule'          // Paint schedule with colors
  | 'equipment_list'          // Major equipment list
  | 'maintenance_agreement'   // Maintenance agreement
  | 'permit_closeout'         // Permit closeout documentation
  | 'utility_transfer'        // Utility transfer documentation
  | 'software_license'        // Software licenses
  | 'access_credentials'      // Access codes/credentials
  | 'other'                   // Other closeout document

/**
 * Closeout status options
 */
export type CloseoutStatus =
  | 'not_required'    // Document not required for this project
  | 'pending'         // Awaiting document
  | 'submitted'       // Document submitted, pending review
  | 'under_review'    // Document under review
  | 'approved'        // Document approved
  | 'rejected'        // Document rejected, needs resubmission
  | 'waived'          // Requirement waived
  | 'na'              // Not applicable

/**
 * Warranty type options
 */
export type WarrantyType =
  | 'manufacturer'   // Manufacturer warranty
  | 'labor'          // Labor only warranty
  | 'parts_labor'    // Parts and labor warranty
  | 'extended'       // Extended warranty

/**
 * Warranty status options
 */
export type WarrantyStatus = 'active' | 'expired' | 'claimed' | 'voided'

/**
 * Checklist category options
 */
export type CloseoutCategory =
  | 'documentation'
  | 'training'
  | 'inspection'
  | 'administrative'
  | 'warranty'
  | 'turnover'

/**
 * Document type configuration
 */
export const CLOSEOUT_DOCUMENT_TYPES: { value: CloseoutDocumentType; label: string; category: CloseoutCategory }[] = [
  { value: 'om_manual', label: 'O&M Manual', category: 'documentation' },
  { value: 'warranty', label: 'Warranty', category: 'warranty' },
  { value: 'warranty_letter', label: 'Warranty Letter', category: 'warranty' },
  { value: 'as_built', label: 'As-Built Drawings', category: 'documentation' },
  { value: 'as_built_markup', label: 'As-Built Markups', category: 'documentation' },
  { value: 'training_cert', label: 'Training Certificate', category: 'training' },
  { value: 'training_video', label: 'Training Video', category: 'training' },
  { value: 'attic_stock', label: 'Attic Stock', category: 'turnover' },
  { value: 'spare_parts', label: 'Spare Parts List', category: 'turnover' },
  { value: 'final_lien_waiver', label: 'Final Lien Waiver', category: 'administrative' },
  { value: 'consent_surety', label: 'Consent of Surety', category: 'administrative' },
  { value: 'certificate_occupancy', label: 'Certificate of Occupancy', category: 'inspection' },
  { value: 'certificate_completion', label: 'Certificate of Substantial Completion', category: 'administrative' },
  { value: 'final_inspection', label: 'Final Inspection Certificate', category: 'inspection' },
  { value: 'punchlist_completion', label: 'Punchlist Completion', category: 'inspection' },
  { value: 'test_report', label: 'Test Report', category: 'inspection' },
  { value: 'commissioning_report', label: 'Commissioning Report', category: 'inspection' },
  { value: 'air_balance_report', label: 'Air Balance Report', category: 'inspection' },
  { value: 'keying_schedule', label: 'Keying Schedule', category: 'turnover' },
  { value: 'door_hardware_schedule', label: 'Door Hardware Schedule', category: 'documentation' },
  { value: 'paint_schedule', label: 'Paint Schedule', category: 'documentation' },
  { value: 'equipment_list', label: 'Equipment List', category: 'documentation' },
  { value: 'maintenance_agreement', label: 'Maintenance Agreement', category: 'warranty' },
  { value: 'permit_closeout', label: 'Permit Closeout', category: 'administrative' },
  { value: 'utility_transfer', label: 'Utility Transfer', category: 'administrative' },
  { value: 'software_license', label: 'Software License', category: 'turnover' },
  { value: 'access_credentials', label: 'Access Credentials', category: 'turnover' },
  { value: 'other', label: 'Other', category: 'documentation' },
]

/**
 * Closeout status configuration
 */
export const CLOSEOUT_STATUSES: { value: CloseoutStatus; label: string; color: string }[] = [
  { value: 'not_required', label: 'Not Required', color: 'slate' },
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'under_review', label: 'Under Review', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'waived', label: 'Waived', color: 'purple' },
  { value: 'na', label: 'N/A', color: 'slate' },
]

/**
 * Warranty type configuration
 */
export const WARRANTY_TYPES: { value: WarrantyType; label: string }[] = [
  { value: 'manufacturer', label: 'Manufacturer Warranty' },
  { value: 'labor', label: 'Labor Only' },
  { value: 'parts_labor', label: 'Parts & Labor' },
  { value: 'extended', label: 'Extended Warranty' },
]

/**
 * Warranty status configuration
 */
export const WARRANTY_STATUSES: { value: WarrantyStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'expired', label: 'Expired', color: 'gray' },
  { value: 'claimed', label: 'Claimed', color: 'yellow' },
  { value: 'voided', label: 'Voided', color: 'red' },
]

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Closeout document record
 */
export interface CloseoutDocument {
  id: string
  company_id: string
  project_id: string
  document_type: CloseoutDocumentType
  title: string
  description: string | null
  spec_section: string | null
  spec_section_title: string | null
  subcontractor_id: string | null
  responsible_party: string | null
  required: boolean
  required_copies: number
  format_required: string | null
  required_date: string | null
  submitted_date: string | null
  approved_date: string | null
  status: CloseoutStatus
  document_url: string | null
  document_urls: string[]
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Closeout requirement template
 */
export interface CloseoutRequirement {
  id: string
  company_id: string | null
  project_id: string | null
  spec_section: string | null
  spec_section_title: string | null
  document_type: CloseoutDocumentType
  description: string | null
  required: boolean
  required_copies: number
  format_required: string | null
  days_before_completion: number
  default_responsible_trade: string | null
  is_template: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Closeout checklist item
 */
export interface CloseoutChecklistItem {
  id: string
  company_id: string
  project_id: string
  item_number: number | null
  category: CloseoutCategory | null
  description: string
  assigned_to_user_id: string | null
  assigned_to_name: string | null
  subcontractor_id: string | null
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  due_date: string | null
  notes: string | null
  sort_order: number
  closeout_document_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Warranty record
 */
export interface Warranty {
  id: string
  company_id: string
  project_id: string
  warranty_number: string | null
  title: string
  description: string | null
  spec_section: string | null
  subcontractor_id: string | null
  manufacturer_name: string | null
  manufacturer_contact: string | null
  manufacturer_phone: string | null
  manufacturer_email: string | null
  warranty_type: WarrantyType | null
  coverage_description: string | null
  start_date: string
  end_date: string
  duration_years: number | null
  document_url: string | null
  closeout_document_id: string | null
  status: WarrantyStatus
  notification_days: number[]
  last_notification_sent: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Closeout document with related data
 */
export interface CloseoutDocumentWithDetails extends CloseoutDocument {
  project?: {
    id: string
    name: string
    number: string | null
  }
  subcontractor?: {
    id: string
    company_name: string
    contact_name: string | null
  }
  reviewed_by_user?: {
    id: string
    full_name: string
    email: string
  }
}

/**
 * Warranty with related data
 */
export interface WarrantyWithDetails extends Warranty {
  project?: {
    id: string
    name: string
  }
  subcontractor?: {
    id: string
    company_name: string
  }
  days_until_expiration?: number
  is_expiring_soon?: boolean
}

/**
 * Checklist item with related data
 */
export interface CloseoutChecklistItemWithDetails extends CloseoutChecklistItem {
  assigned_to_user?: {
    id: string
    full_name: string
    email: string
  }
  subcontractor?: {
    id: string
    company_name: string
  }
  closeout_document?: CloseoutDocument
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create closeout document input
 */
export interface CreateCloseoutDocumentDTO {
  project_id: string
  document_type: CloseoutDocumentType
  title: string
  description?: string
  spec_section?: string
  spec_section_title?: string
  subcontractor_id?: string
  responsible_party?: string
  required?: boolean
  required_copies?: number
  format_required?: string
  required_date?: string
  notes?: string
}

/**
 * Update closeout document input
 */
export interface UpdateCloseoutDocumentDTO {
  title?: string
  description?: string
  spec_section?: string
  spec_section_title?: string
  subcontractor_id?: string
  responsible_party?: string
  required?: boolean
  required_copies?: number
  format_required?: string
  required_date?: string
  status?: CloseoutStatus
  document_url?: string
  document_urls?: string[]
  review_notes?: string
  rejection_reason?: string
  notes?: string
}

/**
 * Create warranty input
 */
export interface CreateWarrantyDTO {
  project_id: string
  title: string
  description?: string
  spec_section?: string
  subcontractor_id?: string
  manufacturer_name?: string
  manufacturer_contact?: string
  manufacturer_phone?: string
  manufacturer_email?: string
  warranty_type?: WarrantyType
  coverage_description?: string
  start_date: string
  end_date: string
  duration_years?: number
  document_url?: string
  notification_days?: number[]
  notes?: string
}

/**
 * Update warranty input
 */
export interface UpdateWarrantyDTO {
  title?: string
  description?: string
  manufacturer_name?: string
  manufacturer_contact?: string
  manufacturer_phone?: string
  manufacturer_email?: string
  warranty_type?: WarrantyType
  coverage_description?: string
  start_date?: string
  end_date?: string
  status?: WarrantyStatus
  document_url?: string
  notification_days?: number[]
  notes?: string
}

/**
 * Create checklist item input
 */
export interface CreateCloseoutChecklistItemDTO {
  project_id: string
  category?: CloseoutCategory
  description: string
  assigned_to_user_id?: string
  assigned_to_name?: string
  subcontractor_id?: string
  due_date?: string
  sort_order?: number
  closeout_document_id?: string
  notes?: string
}

// =============================================
// Filter Types
// =============================================

export interface CloseoutDocumentFilters {
  projectId: string
  documentType?: CloseoutDocumentType | CloseoutDocumentType[]
  status?: CloseoutStatus | CloseoutStatus[]
  specSection?: string
  subcontractorId?: string
  required?: boolean
  search?: string
}

export interface WarrantyFilters {
  projectId: string
  status?: WarrantyStatus | WarrantyStatus[]
  warrantyType?: WarrantyType | WarrantyType[]
  subcontractorId?: string
  expiringSoon?: boolean
  daysUntilExpiration?: number
  search?: string
}

// =============================================
// Statistics Types
// =============================================

export interface CloseoutStatistics {
  total_documents: number
  by_status: Record<CloseoutStatus, number>
  by_type: Record<CloseoutDocumentType, number>
  required_count: number
  approved_count: number
  pending_count: number
  rejected_count: number
  completion_percentage: number
}

export interface WarrantyStatistics {
  total_warranties: number
  active_count: number
  expiring_soon_count: number
  expired_count: number
  by_type: Record<WarrantyType, number>
}

export interface ProjectCloseoutSummary {
  project_id: string
  project_name: string
  total_documents: number
  approved: number
  pending: number
  rejected: number
  completion_percentage: number
  total_checklist_items: number
  completed_checklist_items: number
  active_warranties: number
  expiring_warranties: number
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get document type label
 */
export function getCloseoutDocumentTypeLabel(type: CloseoutDocumentType): string {
  const config = CLOSEOUT_DOCUMENT_TYPES.find((t) => t.value === type)
  return config?.label || type
}

/**
 * Get document type category
 */
export function getCloseoutDocumentCategory(type: CloseoutDocumentType): CloseoutCategory {
  const config = CLOSEOUT_DOCUMENT_TYPES.find((t) => t.value === type)
  return config?.category || 'documentation'
}

/**
 * Get closeout status color
 */
export function getCloseoutStatusColor(status: CloseoutStatus): string {
  const config = CLOSEOUT_STATUSES.find((s) => s.value === status)
  return config?.color || 'gray'
}

/**
 * Get warranty status color
 */
export function getWarrantyStatusColor(status: WarrantyStatus): string {
  const config = WARRANTY_STATUSES.find((s) => s.value === status)
  return config?.color || 'gray'
}

/**
 * Check if warranty is expiring soon (within 90 days)
 */
export function isWarrantyExpiringSoon(warranty: Warranty, daysThreshold: number = 90): boolean {
  if (warranty.status !== 'active') return false

  const endDate = new Date(warranty.end_date)
  const today = new Date()
  const daysUntilExpiration = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return daysUntilExpiration <= daysThreshold && daysUntilExpiration > 0
}

/**
 * Calculate days until warranty expiration
 */
export function getDaysUntilWarrantyExpiration(warranty: Warranty): number {
  const endDate = new Date(warranty.end_date)
  const today = new Date()
  return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get traffic light status for closeout progress
 */
export function getCloseoutTrafficLight(
  approved: number,
  pending: number,
  rejected: number,
  total: number
): 'green' | 'yellow' | 'red' | 'gray' {
  if (total === 0) return 'gray'
  if (rejected > 0) return 'red'
  if (approved === total) return 'green'
  if (approved > 0 || pending > 0) return 'yellow'
  return 'gray'
}

/**
 * Group documents by spec section
 */
export function groupDocumentsBySpecSection(
  documents: CloseoutDocument[]
): Record<string, CloseoutDocument[]> {
  return documents.reduce(
    (acc, doc) => {
      const section = doc.spec_section || 'Unassigned'
      if (!acc[section]) {
        acc[section] = []
      }
      acc[section].push(doc)
      return acc
    },
    {} as Record<string, CloseoutDocument[]>
  )
}

/**
 * Group documents by category
 */
export function groupDocumentsByCategory<T extends CloseoutDocument>(
  documents: T[]
): Record<CloseoutCategory, T[]> {
  return documents.reduce(
    (acc, doc) => {
      const category = getCloseoutDocumentCategory(doc.document_type)
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(doc)
      return acc
    },
    {} as Record<CloseoutCategory, T[]>
  )
}
