/**
 * Insurance Certificate Tracking Types
 */

// Insurance Types Enum
export type InsuranceType =
  | 'general_liability'
  | 'auto_liability'
  | 'workers_compensation'
  | 'umbrella'
  | 'professional_liability'
  | 'builders_risk'
  | 'pollution'
  | 'cyber'
  | 'other'

// Certificate Status Enum
export type CertificateStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'pending_renewal'
  | 'void'

/**
 * Insurance Certificate - Main tracking entity
 */
export interface InsuranceCertificate {
  id: string
  company_id: string
  project_id: string | null
  subcontractor_id: string | null

  // Certificate Identification
  certificate_number: string
  insurance_type: InsuranceType

  // Carrier Information
  carrier_name: string
  carrier_naic_number: string | null
  policy_number: string

  // Coverage Limits
  each_occurrence_limit: number | null
  general_aggregate_limit: number | null
  products_completed_ops_limit: number | null
  personal_adv_injury_limit: number | null
  damage_to_rented_premises: number | null
  medical_expense_limit: number | null
  combined_single_limit: number | null
  bodily_injury_per_person: number | null
  bodily_injury_per_accident: number | null
  property_damage_limit: number | null
  umbrella_each_occurrence: number | null
  umbrella_aggregate: number | null
  workers_comp_el_each_accident: number | null
  workers_comp_el_disease_policy: number | null
  workers_comp_el_disease_employee: number | null

  // Dates
  effective_date: string
  expiration_date: string

  // Status
  status: CertificateStatus

  // Additional Insured Requirements
  additional_insured_required: boolean
  additional_insured_verified: boolean
  additional_insured_name: string | null

  // Waiver of Subrogation
  waiver_of_subrogation_required: boolean
  waiver_of_subrogation_verified: boolean

  // Primary/Non-contributory
  primary_noncontributory_required: boolean
  primary_noncontributory_verified: boolean

  // Document Storage
  certificate_url: string | null
  certificate_storage_path: string | null

  // Certificate Holder
  issued_by_name: string | null
  issued_by_email: string | null
  issued_by_phone: string | null

  // Notes
  notes: string | null
  description_of_operations: string | null

  // Alert Settings
  alert_days_before_expiry: number
  suppress_alerts: boolean

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Insurance Certificate with relations
 */
export interface InsuranceCertificateWithRelations extends InsuranceCertificate {
  subcontractor?: {
    id: string
    company_name: string
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
  }
  project?: {
    id: string
    name: string
    project_number: string | null
  }
}

/**
 * Create Insurance Certificate DTO
 */
export interface CreateInsuranceCertificateDTO {
  company_id: string
  project_id?: string | null
  subcontractor_id?: string | null
  certificate_number: string
  insurance_type: InsuranceType
  carrier_name: string
  carrier_naic_number?: string | null
  policy_number: string

  // Coverage Limits
  each_occurrence_limit?: number | null
  general_aggregate_limit?: number | null
  products_completed_ops_limit?: number | null
  personal_adv_injury_limit?: number | null
  damage_to_rented_premises?: number | null
  medical_expense_limit?: number | null
  combined_single_limit?: number | null
  bodily_injury_per_person?: number | null
  bodily_injury_per_accident?: number | null
  property_damage_limit?: number | null
  umbrella_each_occurrence?: number | null
  umbrella_aggregate?: number | null
  workers_comp_el_each_accident?: number | null
  workers_comp_el_disease_policy?: number | null
  workers_comp_el_disease_employee?: number | null

  // Dates
  effective_date: string
  expiration_date: string

  // Endorsements
  additional_insured_required?: boolean
  additional_insured_verified?: boolean
  additional_insured_name?: string | null
  waiver_of_subrogation_required?: boolean
  waiver_of_subrogation_verified?: boolean
  primary_noncontributory_required?: boolean
  primary_noncontributory_verified?: boolean

  // Document
  certificate_url?: string | null
  certificate_storage_path?: string | null

  // Issued By
  issued_by_name?: string | null
  issued_by_email?: string | null
  issued_by_phone?: string | null

  // Notes
  notes?: string | null
  description_of_operations?: string | null

  // Alerts
  alert_days_before_expiry?: number
  suppress_alerts?: boolean
}

/**
 * Update Insurance Certificate DTO
 */
export type UpdateInsuranceCertificateDTO = Partial<Omit<CreateInsuranceCertificateDTO, 'company_id'>>

/**
 * Insurance Requirement - Define required coverage
 */
export interface InsuranceRequirement {
  id: string
  company_id: string
  project_id: string | null

  // Requirement Details
  name: string
  insurance_type: InsuranceType
  description: string | null

  // Minimum Coverage Amounts
  min_each_occurrence: number | null
  min_general_aggregate: number | null
  min_products_completed_ops: number | null
  min_combined_single_limit: number | null
  min_umbrella_each_occurrence: number | null
  min_umbrella_aggregate: number | null
  min_workers_comp_el_each_accident: number | null

  // Required Endorsements
  additional_insured_required: boolean
  waiver_of_subrogation_required: boolean
  primary_noncontributory_required: boolean

  // Applies To
  applies_to_all_subcontractors: boolean
  specific_subcontractor_ids: string[] | null

  // Active Status
  is_active: boolean

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Create Insurance Requirement DTO
 */
export interface CreateInsuranceRequirementDTO {
  company_id: string
  project_id?: string | null
  name: string
  insurance_type: InsuranceType
  description?: string | null
  min_each_occurrence?: number | null
  min_general_aggregate?: number | null
  min_products_completed_ops?: number | null
  min_combined_single_limit?: number | null
  min_umbrella_each_occurrence?: number | null
  min_umbrella_aggregate?: number | null
  min_workers_comp_el_each_accident?: number | null
  additional_insured_required?: boolean
  waiver_of_subrogation_required?: boolean
  primary_noncontributory_required?: boolean
  applies_to_all_subcontractors?: boolean
  specific_subcontractor_ids?: string[] | null
  is_active?: boolean
}

/**
 * Update Insurance Requirement DTO
 */
export type UpdateInsuranceRequirementDTO = Partial<Omit<CreateInsuranceRequirementDTO, 'company_id'>>

/**
 * Insurance Certificate History
 */
export interface InsuranceCertificateHistory {
  id: string
  certificate_id: string
  action: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  notes: string | null
  changed_at: string
  changed_by: string | null
}

/**
 * Insurance Expiration Alert
 */
export interface InsuranceExpirationAlert {
  id: string
  certificate_id: string
  alert_type: '30_day' | '14_day' | '7_day' | 'expired'
  days_until_expiry: number | null
  sent_at: string
  sent_to_emails: string[] | null
  sent_to_user_ids: string[] | null
  acknowledged_at: string | null
  acknowledged_by: string | null
  renewal_received: boolean
  created_at: string
}

/**
 * Compliance Check Result
 */
export interface ComplianceCheckResult {
  requirement_id: string
  requirement_name: string
  insurance_type: InsuranceType
  is_compliant: boolean
  certificate_id: string | null
  gap_description: string | null
}

/**
 * Compliance Summary
 */
export interface ComplianceSummary {
  subcontractor_id: string
  subcontractor_name: string
  company_id: string
  project_id: string | null
  project_name: string | null
  active_certificates: number
  expiring_certificates: number
  expired_certificates: number
  next_expiration: string | null
  all_additional_insured_verified: boolean
}

/**
 * Expiring Certificate View
 */
export interface ExpiringCertificate {
  id: string
  certificate_number: string
  insurance_type: InsuranceType
  carrier_name: string
  expiration_date: string
  days_until_expiry: number
  status: CertificateStatus
  subcontractor_id: string | null
  subcontractor_name: string | null
  project_id: string | null
  project_name: string | null
  company_name: string | null
}

/**
 * Insurance Dashboard Stats
 */
export interface InsuranceDashboardStats {
  totalCertificates: number
  activeCertificates: number
  expiringWithin30Days: number
  expiredCertificates: number
  pendingRenewal: number
  complianceRate: number
  subcontractorsWithGaps: number
}

/**
 * Insurance Type Display Names
 */
export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  general_liability: 'Commercial General Liability',
  auto_liability: 'Business Auto Liability',
  workers_compensation: "Workers' Compensation",
  umbrella: 'Umbrella/Excess Liability',
  professional_liability: 'Professional Liability (E&O)',
  builders_risk: "Builder's Risk",
  pollution: 'Pollution Liability',
  cyber: 'Cyber Liability',
  other: 'Other',
}

/**
 * Certificate Status Display Names
 */
export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  pending_renewal: 'Pending Renewal',
  void: 'Void',
}

/**
 * Certificate Status Colors (for badges)
 */
export const CERTIFICATE_STATUS_COLORS: Record<CertificateStatus, string> = {
  active: 'green',
  expiring_soon: 'yellow',
  expired: 'red',
  pending_renewal: 'blue',
  void: 'gray',
}

/**
 * Format currency for display
 */
export function formatInsuranceLimit(value: number | null | undefined): string {
  if (value == null) {return '-'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiry(expirationDate: string): number {
  const expiry = new Date(expirationDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = expiry.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Get status from days until expiry
 */
export function getStatusFromExpiry(daysUntilExpiry: number): CertificateStatus {
  if (daysUntilExpiry < 0) {return 'expired'}
  if (daysUntilExpiry <= 30) {return 'expiring_soon'}
  return 'active'
}
