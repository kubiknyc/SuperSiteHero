/**
 * Equipment Certifications Types
 *
 * Types for managing operator certifications for equipment
 * including cranes, forklifts, scaffolds, and other certified equipment.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Types of equipment requiring operator certification
 */
export type CertificationType =
  | 'crane_operator'
  | 'forklift_operator'
  | 'scaffold_competent_person'
  | 'aerial_lift'
  | 'excavator'
  | 'loader'
  | 'rigging'
  | 'signal_person'
  | 'confined_space_entry'
  | 'fall_protection_competent'
  | 'trenching_competent'
  | 'concrete_pump'
  | 'paving_equipment'
  | 'welding'
  | 'electrical_qualified'
  | 'hazmat_handler'
  | 'first_aid_cpr'
  | 'osha_10'
  | 'osha_30'
  | 'other';

/**
 * Certification status based on expiration
 */
export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired' | 'pending';

/**
 * Issuing authority types
 */
export type IssuingAuthorityType =
  | 'nccco'        // National Commission for the Certification of Crane Operators
  | 'osha'
  | 'nccer'        // National Center for Construction Education and Research
  | 'company'
  | 'third_party'
  | 'manufacturer'
  | 'union'
  | 'state'
  | 'other';

// Label mappings
export const CERTIFICATION_TYPE_LABELS: Record<CertificationType, string> = {
  crane_operator: 'Crane Operator',
  forklift_operator: 'Forklift Operator',
  scaffold_competent_person: 'Scaffold Competent Person',
  aerial_lift: 'Aerial Lift Operator',
  excavator: 'Excavator Operator',
  loader: 'Loader Operator',
  rigging: 'Rigging',
  signal_person: 'Signal Person',
  confined_space_entry: 'Confined Space Entry',
  fall_protection_competent: 'Fall Protection Competent Person',
  trenching_competent: 'Trenching Competent Person',
  concrete_pump: 'Concrete Pump Operator',
  paving_equipment: 'Paving Equipment Operator',
  welding: 'Welding Certification',
  electrical_qualified: 'Electrical Qualified Person',
  hazmat_handler: 'Hazmat Handler',
  first_aid_cpr: 'First Aid/CPR',
  osha_10: 'OSHA 10-Hour',
  osha_30: 'OSHA 30-Hour',
  other: 'Other',
};

export const CERTIFICATION_STATUS_COLORS: Record<CertificationStatus, string> = {
  valid: 'green',
  expiring_soon: 'yellow',
  expired: 'red',
  pending: 'blue',
};

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  pending: 'Pending',
};

export const ISSUING_AUTHORITY_LABELS: Record<IssuingAuthorityType, string> = {
  nccco: 'NCCCO',
  osha: 'OSHA',
  nccer: 'NCCER',
  company: 'Company Training',
  third_party: 'Third Party',
  manufacturer: 'Manufacturer',
  union: 'Union',
  state: 'State Agency',
  other: 'Other',
};

// Alert thresholds in days
export const EXPIRATION_ALERT_THRESHOLDS = [30, 60, 90] as const;

// ============================================================================
// Core Types
// ============================================================================

/**
 * Operator information
 */
export interface OperatorInfo {
  id: string;
  full_name: string | null;
  email: string;
  phone?: string | null;
  trade?: string | null;
  company_name?: string | null;
}

/**
 * Equipment certification record
 */
export interface EquipmentCertification {
  id: string;
  company_id: string;

  // Operator
  operator_id: string | null;
  operator_name: string;
  operator_company: string | null;
  operator_badge_number: string | null;
  operator_employee_id: string | null;

  // Certification details
  certification_type: CertificationType;
  certification_name: string;
  certification_number: string | null;

  // Issuing authority
  issuing_authority: IssuingAuthorityType;
  issuing_authority_name: string | null;

  // Dates
  issue_date: string;
  expiration_date: string | null;

  // Equipment specific (for manufacturer-specific certs)
  equipment_make: string | null;
  equipment_model: string | null;
  equipment_id: string | null;

  // Capacity/restrictions
  capacity_rating: string | null;
  restrictions: string | null;

  // Documentation
  document_url: string | null;
  document_file_name: string | null;

  // Training details
  training_provider: string | null;
  training_hours: number | null;
  training_date: string | null;

  // Verification
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;

  // Status
  is_active: boolean;

  // Renewal
  renewal_reminder_sent: boolean;
  renewal_reminder_date: string | null;

  // Notes
  notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;

  // Computed fields
  status?: CertificationStatus;
  days_until_expiry?: number | null;
  operator?: OperatorInfo;
}

/**
 * Equipment assignment with certification requirements
 */
export interface EquipmentCertificationRequirement {
  id: string;
  equipment_id: string;
  certification_type: CertificationType;
  is_required: boolean;
  notes: string | null;
  created_at: string;
}

/**
 * Certification with full operator details
 */
export interface CertificationWithOperator extends EquipmentCertification {
  operator: OperatorInfo;
}

// ============================================================================
// DTO Types
// ============================================================================

/**
 * Create certification input
 */
export interface CreateEquipmentCertificationDTO {
  company_id: string;
  operator_id?: string | null;
  operator_name: string;
  operator_company?: string | null;
  operator_badge_number?: string | null;
  operator_employee_id?: string | null;
  certification_type: CertificationType;
  certification_name: string;
  certification_number?: string | null;
  issuing_authority: IssuingAuthorityType;
  issuing_authority_name?: string | null;
  issue_date: string;
  expiration_date?: string | null;
  equipment_make?: string | null;
  equipment_model?: string | null;
  equipment_id?: string | null;
  capacity_rating?: string | null;
  restrictions?: string | null;
  training_provider?: string | null;
  training_hours?: number | null;
  training_date?: string | null;
  notes?: string | null;
}

/**
 * Update certification input
 */
export interface UpdateEquipmentCertificationDTO {
  operator_name?: string;
  operator_company?: string | null;
  operator_badge_number?: string | null;
  operator_employee_id?: string | null;
  certification_type?: CertificationType;
  certification_name?: string;
  certification_number?: string | null;
  issuing_authority?: IssuingAuthorityType;
  issuing_authority_name?: string | null;
  issue_date?: string;
  expiration_date?: string | null;
  equipment_make?: string | null;
  equipment_model?: string | null;
  equipment_id?: string | null;
  capacity_rating?: string | null;
  restrictions?: string | null;
  training_provider?: string | null;
  training_hours?: number | null;
  training_date?: string | null;
  verified?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

/**
 * Upload certification document input
 */
export interface UploadCertificationDocumentDTO {
  certification_id: string;
  file: File;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for querying certifications
 */
export interface CertificationFilters {
  company_id?: string;
  operator_id?: string;
  operator_name?: string;
  certification_type?: CertificationType | CertificationType[];
  status?: CertificationStatus | CertificationStatus[];
  equipment_id?: string;
  is_active?: boolean;
  expiring_within_days?: number;
  search?: string;
  include_deleted?: boolean;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Certification statistics
 */
export interface CertificationStats {
  total_certifications: number;
  active_certifications: number;
  valid_count: number;
  expiring_soon_count: number;
  expired_count: number;
  pending_count: number;
  by_type: Record<CertificationType, number>;
  operators_with_certifications: number;
  average_certifications_per_operator: number;
  expiring_30_days: EquipmentCertification[];
  expiring_60_days: EquipmentCertification[];
  expiring_90_days: EquipmentCertification[];
}

/**
 * Operator certification summary
 */
export interface OperatorCertificationSummary {
  operator_id: string | null;
  operator_name: string;
  operator_company: string | null;
  total_certifications: number;
  valid_certifications: number;
  expiring_certifications: number;
  expired_certifications: number;
  certification_types: CertificationType[];
  next_expiration: string | null;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Expiration alert configuration
 */
export interface ExpirationAlertConfig {
  days_before: number;
  enabled: boolean;
  notify_operator: boolean;
  notify_supervisor: boolean;
  notify_safety_manager: boolean;
}

/**
 * Certification expiration alert
 */
export interface CertificationAlert {
  id: string;
  certification_id: string;
  certification: EquipmentCertification;
  days_until_expiry: number;
  alert_level: 'warning' | 'urgent' | 'critical';
  created_at: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate certification status based on expiration date
 */
export function calculateCertificationStatus(
  expirationDate: string | null,
  warningDays = 30
): CertificationStatus {
  if (!expirationDate) {
    return 'valid'; // No expiration = always valid
  }

  const now = new Date();
  const expDate = new Date(expirationDate);
  const daysUntilExpiry = Math.ceil(
    (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) {
    return 'expired';
  } else if (daysUntilExpiry <= warningDays) {
    return 'expiring_soon';
  } else {
    return 'valid';
  }
}

/**
 * Calculate days until expiry
 */
export function calculateDaysUntilExpiry(expirationDate: string | null): number | null {
  if (!expirationDate) {
    return null;
  }

  const now = new Date();
  const expDate = new Date(expirationDate);
  return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get alert level based on days until expiry
 */
export function getAlertLevel(daysUntilExpiry: number): 'warning' | 'urgent' | 'critical' {
  if (daysUntilExpiry <= 7) {
    return 'critical';
  } else if (daysUntilExpiry <= 30) {
    return 'urgent';
  } else {
    return 'warning';
  }
}

/**
 * Check if operator can operate equipment based on certifications
 */
export function canOperateEquipment(
  requiredCertifications: CertificationType[],
  operatorCertifications: EquipmentCertification[]
): { authorized: boolean; missing: CertificationType[]; expired: CertificationType[] } {
  const validCerts = operatorCertifications.filter(
    (cert) => cert.is_active && calculateCertificationStatus(cert.expiration_date) === 'valid'
  );

  const validCertTypes = new Set(validCerts.map((cert) => cert.certification_type));
  const expiredCerts = operatorCertifications.filter(
    (cert) => cert.is_active && calculateCertificationStatus(cert.expiration_date) === 'expired'
  );
  const expiredCertTypes = new Set(expiredCerts.map((cert) => cert.certification_type));

  const missing = requiredCertifications.filter(
    (type) => !validCertTypes.has(type) && !expiredCertTypes.has(type)
  );
  const expired = requiredCertifications.filter(
    (type) => expiredCertTypes.has(type) && !validCertTypes.has(type)
  );

  return {
    authorized: missing.length === 0 && expired.length === 0,
    missing,
    expired,
  };
}

/**
 * Get certification type label
 */
export function getCertificationTypeLabel(type: CertificationType): string {
  return CERTIFICATION_TYPE_LABELS[type] || type;
}

/**
 * Get certification status color
 */
export function getCertificationStatusColor(status: CertificationStatus): string {
  return CERTIFICATION_STATUS_COLORS[status] || 'gray';
}

/**
 * Get issuing authority label
 */
export function getIssuingAuthorityLabel(authority: IssuingAuthorityType): string {
  return ISSUING_AUTHORITY_LABELS[authority] || authority;
}
