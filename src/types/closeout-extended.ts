/**
 * Extended Closeout Types
 * Additional types for O&M Manual Builder, Attic Stock Tracker,
 * Training Records, Warranty Claims, and Closeout Progress
 */

import type { WarrantyType } from './closeout'

// =============================================
// O&M Manual Types
// =============================================

/**
 * O&M Manual section types
 */
export type OMManualSectionType =
  | 'cover'
  | 'toc'
  | 'equipment'
  | 'maintenance'
  | 'warranties'
  | 'as_builts'
  | 'emergency_contacts'
  | 'system_overview'
  | 'operating_procedures'
  | 'preventive_maintenance'
  | 'spare_parts'
  | 'vendor_list'
  | 'commissioning_data'
  | 'test_reports'
  | 'custom'

export const OM_MANUAL_SECTION_TYPES: { value: OMManualSectionType; label: string; required: boolean }[] = [
  { value: 'cover', label: 'Cover Page', required: true },
  { value: 'toc', label: 'Table of Contents', required: true },
  { value: 'emergency_contacts', label: 'Emergency Contacts', required: true },
  { value: 'system_overview', label: 'System Overview', required: false },
  { value: 'equipment', label: 'Equipment Information', required: true },
  { value: 'operating_procedures', label: 'Operating Procedures', required: true },
  { value: 'maintenance', label: 'Maintenance Schedules', required: true },
  { value: 'preventive_maintenance', label: 'Preventive Maintenance', required: false },
  { value: 'warranties', label: 'Warranties', required: true },
  { value: 'spare_parts', label: 'Spare Parts List', required: false },
  { value: 'vendor_list', label: 'Vendor Contact List', required: false },
  { value: 'as_builts', label: 'As-Built Drawings', required: true },
  { value: 'commissioning_data', label: 'Commissioning Data', required: false },
  { value: 'test_reports', label: 'Test Reports', required: false },
  { value: 'custom', label: 'Custom Section', required: false },
]

/**
 * O&M Manual Section
 */
export interface OMManualSection {
  id: string
  company_id: string
  project_id: string
  section_type: OMManualSectionType
  title: string
  description: string | null
  sort_order: number
  content: string | null
  custom_template: string | null
  document_urls: string[]
  is_complete: boolean
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * O&M Manual Version (generated manual)
 */
export type OMManualRecipientType = 'owner' | 'facility_manager' | 'contractor' | 'archive'
export type OMManualVersionStatus = 'generating' | 'complete' | 'failed' | 'archived'

export interface OMManualVersion {
  id: string
  company_id: string
  project_id: string
  version_number: number
  version_label: string | null
  recipient_type: OMManualRecipientType | null
  document_url: string | null
  file_name: string | null
  file_size: number | null
  page_count: number | null
  generated_at: string
  generated_by: string | null
  status: OMManualVersionStatus
  error_message: string | null
  download_count: number
  last_downloaded_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// =============================================
// Attic Stock Types
// =============================================

/**
 * Attic Stock Item
 */
export interface AtticStockItem {
  id: string
  company_id: string
  project_id: string
  item_name: string
  description: string | null
  spec_section: string | null
  manufacturer: string | null
  model_number: string | null
  color_finish: string | null
  quantity_required: number
  quantity_delivered: number
  unit: string
  building_location: string | null
  floor_level: string | null
  room_area: string | null
  storage_notes: string | null
  subcontractor_id: string | null
  delivery_date: string | null
  delivery_notes: string | null
  photo_urls: string[]
  owner_verified: boolean
  verified_by: string | null
  verified_at: string | null
  verification_notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface AtticStockItemWithDetails extends AtticStockItem {
  subcontractor?: {
    id: string
    company_name: string
  }
  verified_by_user?: {
    id: string
    full_name: string
  }
  deliveries?: AtticStockDelivery[]
}

/**
 * Attic Stock Delivery
 */
export interface AtticStockDelivery {
  id: string
  attic_stock_item_id: string
  delivery_date: string
  quantity_delivered: number
  delivery_ticket_number: string | null
  delivery_ticket_url: string | null
  photo_urls: string[]
  received_by: string | null
  received_by_name: string | null
  notes: string | null
  created_at: string
  created_by: string | null
}

// =============================================
// Training Types
// =============================================

export type TrainingSessionType =
  | 'equipment_operation'
  | 'maintenance_procedures'
  | 'safety_systems'
  | 'hvac_controls'
  | 'fire_alarm'
  | 'security_systems'
  | 'bms_automation'
  | 'general'
  | 'other'

export type TrainingSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled'

export const TRAINING_SESSION_TYPES: { value: TrainingSessionType; label: string }[] = [
  { value: 'equipment_operation', label: 'Equipment Operation' },
  { value: 'maintenance_procedures', label: 'Maintenance Procedures' },
  { value: 'safety_systems', label: 'Safety Systems' },
  { value: 'hvac_controls', label: 'HVAC Controls' },
  { value: 'fire_alarm', label: 'Fire Alarm' },
  { value: 'security_systems', label: 'Security Systems' },
  { value: 'bms_automation', label: 'BMS/Automation' },
  { value: 'general', label: 'General Training' },
  { value: 'other', label: 'Other' },
]

export const TRAINING_SESSION_STATUSES: { value: TrainingSessionStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'orange' },
]

/**
 * Training Session
 */
export interface TrainingSession {
  id: string
  company_id: string
  project_id: string
  title: string
  description: string | null
  session_type: TrainingSessionType | null
  equipment_systems: string[]
  spec_sections: string[]
  scheduled_date: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  actual_duration_minutes: number | null
  location: string | null
  status: TrainingSessionStatus
  trainer_name: string | null
  trainer_company: string | null
  trainer_contact: string | null
  trainer_email: string | null
  trainer_credentials: string | null
  training_materials_urls: string[]
  video_recording_urls: string[]
  presentation_url: string | null
  handout_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface TrainingSessionWithDetails extends TrainingSession {
  attendees?: TrainingAttendee[]
  attendee_count?: number
  signed_in_count?: number
  certificates_generated?: number
}

/**
 * Training Attendee
 */
export interface TrainingAttendee {
  id: string
  training_session_id: string
  attendee_name: string
  attendee_email: string | null
  attendee_phone: string | null
  attendee_company: string | null
  attendee_title: string | null
  signed_in: boolean
  sign_in_time: string | null
  signature_url: string | null
  certificate_generated: boolean
  certificate_url: string | null
  certificate_number: string | null
  certificate_generated_at: string | null
  created_at: string
  updated_at: string
}

// =============================================
// Warranty Claim Types
// =============================================

export type WarrantyClaimStatus =
  | 'open'
  | 'submitted'
  | 'in_progress'
  | 'pending_parts'
  | 'scheduled'
  | 'resolved'
  | 'denied'
  | 'closed'

export type WarrantyClaimPriority = 'low' | 'medium' | 'high' | 'critical'

export const WARRANTY_CLAIM_STATUSES: { value: WarrantyClaimStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'gray' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'pending_parts', label: 'Pending Parts', color: 'orange' },
  { value: 'scheduled', label: 'Scheduled', color: 'purple' },
  { value: 'resolved', label: 'Resolved', color: 'green' },
  { value: 'denied', label: 'Denied', color: 'red' },
  { value: 'closed', label: 'Closed', color: 'slate' },
]

export const WARRANTY_CLAIM_PRIORITIES: { value: WarrantyClaimPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'slate' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
]

/**
 * Warranty Claim
 */
export interface WarrantyClaim {
  id: string
  company_id: string
  project_id: string
  warranty_id: string
  claim_number: string | null
  title: string
  description: string
  issue_date: string
  issue_discovered_by: string | null
  issue_location: string | null
  status: WarrantyClaimStatus
  priority: WarrantyClaimPriority
  photo_urls: string[]
  document_urls: string[]
  contractor_contacted_date: string | null
  contractor_response_date: string | null
  contractor_response: string | null
  contractor_contact_name: string | null
  contractor_contact_phone: string | null
  contractor_contact_email: string | null
  resolution_date: string | null
  resolution_description: string | null
  resolution_satisfactory: boolean | null
  resolution_photos: string[]
  estimated_resolution_date: string | null
  actual_cost: number | null
  denial_reason: string | null
  denial_date: string | null
  owner_signed_off: boolean
  owner_sign_off_date: string | null
  owner_sign_off_by: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface WarrantyClaimWithDetails extends WarrantyClaim {
  warranty?: {
    id: string
    title: string
    warranty_type: WarrantyType | null
    end_date: string
    manufacturer_name: string | null
    subcontractor_id: string | null
  }
  project?: {
    id: string
    name: string
  }
  activities?: WarrantyClaimActivity[]
}

/**
 * Warranty Claim Activity
 */
export type WarrantyClaimActivityType =
  | 'status_change'
  | 'note_added'
  | 'photo_added'
  | 'document_added'
  | 'contractor_response'
  | 'resolution_update'
  | 'scheduled'
  | 'call_logged'
  | 'email_sent'
  | 'other'

export interface WarrantyClaimActivity {
  id: string
  warranty_claim_id: string
  activity_type: WarrantyClaimActivityType
  previous_status: string | null
  new_status: string | null
  description: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

// =============================================
// Closeout Milestone Types
// =============================================

export type CloseoutMilestoneType =
  | 'substantial_completion'
  | 'punch_list_complete'
  | 'training_complete'
  | 'om_manuals_delivered'
  | 'warranties_collected'
  | 'attic_stock_delivered'
  | 'final_inspection'
  | 'certificate_of_occupancy'
  | 'final_payment_released'
  | 'project_closed'

export const CLOSEOUT_MILESTONE_TYPES: { value: CloseoutMilestoneType; label: string; order: number }[] = [
  { value: 'substantial_completion', label: 'Substantial Completion', order: 1 },
  { value: 'punch_list_complete', label: 'Punch List Complete', order: 2 },
  { value: 'training_complete', label: 'Training Complete', order: 3 },
  { value: 'om_manuals_delivered', label: 'O&M Manuals Delivered', order: 4 },
  { value: 'warranties_collected', label: 'Warranties Collected', order: 5 },
  { value: 'attic_stock_delivered', label: 'Attic Stock Delivered', order: 6 },
  { value: 'final_inspection', label: 'Final Inspection', order: 7 },
  { value: 'certificate_of_occupancy', label: 'Certificate of Occupancy', order: 8 },
  { value: 'final_payment_released', label: 'Final Payment Released', order: 9 },
  { value: 'project_closed', label: 'Project Closed', order: 10 },
]

/**
 * Closeout Milestone
 */
export interface CloseoutMilestone {
  id: string
  company_id: string
  project_id: string
  milestone_type: CloseoutMilestoneType
  title: string
  description: string | null
  target_date: string | null
  actual_date: string | null
  is_complete: boolean
  completed_by: string | null
  requires_owner_signoff: boolean
  owner_signed_off: boolean
  owner_sign_off_date: string | null
  owner_sign_off_by: string | null
  owner_sign_off_notes: string | null
  document_urls: string[]
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface CloseoutMilestoneWithDetails extends CloseoutMilestone {
  completed_by_user?: {
    id: string
    full_name: string
  }
  owner_sign_off_by_user?: {
    id: string
    full_name: string
  }
}

// =============================================
// DTO Types for New Features
// =============================================

export interface CreateOMManualSectionDTO {
  project_id: string
  section_type: OMManualSectionType
  title: string
  description?: string
  sort_order?: number
  content?: string
  custom_template?: string
  document_urls?: string[]
}

export interface UpdateOMManualSectionDTO {
  title?: string
  description?: string
  sort_order?: number
  content?: string
  custom_template?: string
  document_urls?: string[]
  is_complete?: boolean
}

export interface CreateAtticStockItemDTO {
  project_id: string
  item_name: string
  description?: string
  spec_section?: string
  manufacturer?: string
  model_number?: string
  color_finish?: string
  quantity_required: number
  unit?: string
  building_location?: string
  floor_level?: string
  room_area?: string
  storage_notes?: string
  subcontractor_id?: string
}

export interface UpdateAtticStockItemDTO {
  item_name?: string
  description?: string
  spec_section?: string
  manufacturer?: string
  model_number?: string
  color_finish?: string
  quantity_required?: number
  quantity_delivered?: number
  unit?: string
  building_location?: string
  floor_level?: string
  room_area?: string
  storage_notes?: string
  subcontractor_id?: string
  delivery_date?: string
  delivery_notes?: string
  photo_urls?: string[]
  owner_verified?: boolean
  verification_notes?: string
}

export interface CreateAtticStockDeliveryDTO {
  attic_stock_item_id: string
  delivery_date: string
  quantity_delivered: number
  delivery_ticket_number?: string
  delivery_ticket_url?: string
  photo_urls?: string[]
  received_by_name?: string
  notes?: string
}

export interface CreateTrainingSessionDTO {
  project_id: string
  title: string
  description?: string
  session_type?: TrainingSessionType
  equipment_systems?: string[]
  spec_sections?: string[]
  scheduled_date?: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  location?: string
  trainer_name?: string
  trainer_company?: string
  trainer_contact?: string
  trainer_email?: string
  trainer_credentials?: string
}

export interface UpdateTrainingSessionDTO {
  title?: string
  description?: string
  session_type?: TrainingSessionType
  equipment_systems?: string[]
  spec_sections?: string[]
  scheduled_date?: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  actual_duration_minutes?: number
  location?: string
  status?: TrainingSessionStatus
  trainer_name?: string
  trainer_company?: string
  trainer_contact?: string
  trainer_email?: string
  trainer_credentials?: string
  training_materials_urls?: string[]
  video_recording_urls?: string[]
  presentation_url?: string
  handout_url?: string
  notes?: string
}

export interface CreateTrainingAttendeeDTO {
  training_session_id: string
  attendee_name: string
  attendee_email?: string
  attendee_phone?: string
  attendee_company?: string
  attendee_title?: string
}

export interface UpdateTrainingAttendeeDTO {
  attendee_name?: string
  attendee_email?: string
  attendee_phone?: string
  attendee_company?: string
  attendee_title?: string
  signed_in?: boolean
  signature_url?: string
}

export interface CreateWarrantyClaimDTO {
  project_id: string
  warranty_id: string
  title: string
  description: string
  issue_date: string
  issue_discovered_by?: string
  issue_location?: string
  priority?: WarrantyClaimPriority
  photo_urls?: string[]
}

export interface UpdateWarrantyClaimDTO {
  title?: string
  description?: string
  issue_date?: string
  issue_discovered_by?: string
  issue_location?: string
  status?: WarrantyClaimStatus
  priority?: WarrantyClaimPriority
  photo_urls?: string[]
  document_urls?: string[]
  contractor_contacted_date?: string
  contractor_response_date?: string
  contractor_response?: string
  contractor_contact_name?: string
  contractor_contact_phone?: string
  contractor_contact_email?: string
  resolution_date?: string
  resolution_description?: string
  resolution_satisfactory?: boolean
  resolution_photos?: string[]
  estimated_resolution_date?: string
  actual_cost?: number
  denial_reason?: string
  internal_notes?: string
}

export interface CreateCloseoutMilestoneDTO {
  project_id: string
  milestone_type: CloseoutMilestoneType
  title: string
  description?: string
  target_date?: string
  requires_owner_signoff?: boolean
}

export interface UpdateCloseoutMilestoneDTO {
  title?: string
  description?: string
  target_date?: string
  actual_date?: string
  is_complete?: boolean
  requires_owner_signoff?: boolean
  owner_sign_off_notes?: string
  document_urls?: string[]
  notes?: string
}

// =============================================
// Statistics Types for New Features
// =============================================

export interface OMManualStatistics {
  total_sections: number
  completed_sections: number
  completion_percentage: number
  versions_generated: number
}

export interface AtticStockStatistics {
  total_items: number
  fully_delivered: number
  partially_delivered: number
  not_delivered: number
  owner_verified: number
  pending_verification: number
}

export interface TrainingStatistics {
  total_sessions: number
  completed_sessions: number
  scheduled_sessions: number
  total_attendees: number
  certificates_generated: number
}

export interface WarrantyClaimStatistics {
  total_claims: number
  open_claims: number
  in_progress_claims: number
  resolved_claims: number
  denied_claims: number
  by_priority: Record<WarrantyClaimPriority, number>
}

export interface CloseoutProgressSummary {
  project_id: string
  overall_percentage: number
  milestones_completed: number
  milestones_total: number
  documents_approved: number
  documents_total: number
  training_complete: boolean
  warranties_collected: boolean
  attic_stock_delivered: boolean
  punch_list_status: {
    total: number
    completed: number
    verified: number
  }
  outstanding_items: string[]
  owner_signoffs_required: number
  owner_signoffs_complete: number
  certificate_of_occupancy: boolean
  final_payment_criteria_met: boolean
}
