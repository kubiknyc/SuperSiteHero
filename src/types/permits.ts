/**
 * Permits Types
 * Building permits tracking with status workflow and renewal management
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum PermitStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  ISSUED = 'issued',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RENEWED = 'renewed',
  REVOKED = 'revoked',
  CLOSED = 'closed',
}

export enum PermitType {
  BUILDING = 'building',
  DEMOLITION = 'demolition',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  MECHANICAL = 'mechanical',
  FIRE = 'fire',
  GRADING = 'grading',
  EXCAVATION = 'excavation',
  ENCROACHMENT = 'encroachment',
  SIGNAGE = 'signage',
  ENVIRONMENTAL = 'environmental',
  STORMWATER = 'stormwater',
  TEMPORARY = 'temporary',
  OCCUPANCY = 'occupancy',
  OTHER = 'other',
}

// =============================================================================
// CORE TYPES
// =============================================================================

export interface Permit {
  id: string;
  project_id: string;

  // Permit Identification
  permit_name: string;
  permit_number: string | null;
  permit_type: PermitType | string;

  // Status
  status: PermitStatus | string | null;

  // Document
  permit_document_url: string | null;

  // Dates
  application_date: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  renewal_date: string | null;

  // Renewal Management
  renewal_reminder_days_before: number | null;
  renewal_reminder_sent: boolean | null;

  // Issuing Authority
  issuing_agency: string | null;
  agency_contact: string | null;
  agency_phone: string | null;

  // Flags
  work_cannot_proceed_without: boolean | null;
  requires_inspections: boolean | null;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  deleted_at: string | null;

  // Relationships (populated via joins)
  project?: { id: string; name: string; project_number: string } | null;
  created_by_user?: { id: string; full_name: string; email: string } | null;
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreatePermitDTO {
  project_id: string;
  permit_name: string;
  permit_type: PermitType | string;
  permit_number?: string;
  status?: PermitStatus | string;
  permit_document_url?: string;
  application_date?: string;
  issue_date?: string;
  expiration_date?: string;
  renewal_date?: string;
  renewal_reminder_days_before?: number;
  issuing_agency?: string;
  agency_contact?: string;
  agency_phone?: string;
  work_cannot_proceed_without?: boolean;
  requires_inspections?: boolean;
  notes?: string;
}

export interface UpdatePermitDTO {
  permit_name?: string;
  permit_type?: PermitType | string;
  permit_number?: string;
  status?: PermitStatus | string;
  permit_document_url?: string;
  application_date?: string;
  issue_date?: string;
  expiration_date?: string;
  renewal_date?: string;
  renewal_reminder_days_before?: number;
  renewal_reminder_sent?: boolean;
  issuing_agency?: string;
  agency_contact?: string;
  agency_phone?: string;
  work_cannot_proceed_without?: boolean;
  requires_inspections?: boolean;
  notes?: string;
}

// =============================================================================
// QUERY/FILTER TYPES
// =============================================================================

export interface PermitFilters {
  project_id?: string;
  status?: PermitStatus | string;
  permit_type?: PermitType | string;
  issuing_agency?: string;
  requires_inspections?: boolean;
  work_cannot_proceed_without?: boolean;
  expiring_before?: string;
  expiring_within_days?: number;
  search?: string;
}

export interface PermitStatistics {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  expiring_soon: number;
  expired: number;
  critical_permits: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get display label for permit status
 */
export function getPermitStatusLabel(status: PermitStatus | string | null): string {
  const labels: Record<string, string> = {
    [PermitStatus.PENDING]: 'Pending',
    [PermitStatus.APPLIED]: 'Applied',
    [PermitStatus.UNDER_REVIEW]: 'Under Review',
    [PermitStatus.APPROVED]: 'Approved',
    [PermitStatus.ISSUED]: 'Issued',
    [PermitStatus.ACTIVE]: 'Active',
    [PermitStatus.EXPIRED]: 'Expired',
    [PermitStatus.RENEWED]: 'Renewed',
    [PermitStatus.REVOKED]: 'Revoked',
    [PermitStatus.CLOSED]: 'Closed',
  };
  return labels[status || ''] || status || 'Unknown';
}

/**
 * Get color class for permit status badge
 */
export function getPermitStatusColor(status: PermitStatus | string | null): string {
  const colors: Record<string, string> = {
    [PermitStatus.PENDING]: 'bg-gray-100 text-gray-800',
    [PermitStatus.APPLIED]: 'bg-blue-100 text-blue-800',
    [PermitStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
    [PermitStatus.APPROVED]: 'bg-green-100 text-green-800',
    [PermitStatus.ISSUED]: 'bg-green-100 text-green-800',
    [PermitStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [PermitStatus.EXPIRED]: 'bg-red-100 text-red-800',
    [PermitStatus.RENEWED]: 'bg-purple-100 text-purple-800',
    [PermitStatus.REVOKED]: 'bg-red-100 text-red-800',
    [PermitStatus.CLOSED]: 'bg-gray-100 text-gray-500',
  };
  return colors[status || ''] || 'bg-gray-100 text-gray-800';
}

/**
 * Get display label for permit type
 */
export function getPermitTypeLabel(type: PermitType | string): string {
  const labels: Record<string, string> = {
    [PermitType.BUILDING]: 'Building',
    [PermitType.DEMOLITION]: 'Demolition',
    [PermitType.ELECTRICAL]: 'Electrical',
    [PermitType.PLUMBING]: 'Plumbing',
    [PermitType.MECHANICAL]: 'Mechanical',
    [PermitType.FIRE]: 'Fire',
    [PermitType.GRADING]: 'Grading',
    [PermitType.EXCAVATION]: 'Excavation',
    [PermitType.ENCROACHMENT]: 'Encroachment',
    [PermitType.SIGNAGE]: 'Signage',
    [PermitType.ENVIRONMENTAL]: 'Environmental',
    [PermitType.STORMWATER]: 'Stormwater',
    [PermitType.TEMPORARY]: 'Temporary',
    [PermitType.OCCUPANCY]: 'Certificate of Occupancy',
    [PermitType.OTHER]: 'Other',
  };
  return labels[type] || type;
}

/**
 * Check if permit is expiring soon (within specified days)
 */
export function isPermitExpiringSoon(permit: Permit, withinDays: number = 30): boolean {
  if (!permit.expiration_date) {return false;}
  const expDate = new Date(permit.expiration_date);
  const now = new Date();
  const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= withinDays;
}

/**
 * Check if permit is expired
 */
export function isPermitExpired(permit: Permit): boolean {
  if (!permit.expiration_date) {return false;}
  return new Date(permit.expiration_date) < new Date();
}

/**
 * Calculate days until permit expiration
 */
export function getDaysUntilExpiration(permit: Permit): number | null {
  if (!permit.expiration_date) {return null;}
  const expDate = new Date(permit.expiration_date);
  const now = new Date();
  return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if permit is critical (work cannot proceed without)
 */
export function isCriticalPermit(permit: Permit): boolean {
  return permit.work_cannot_proceed_without === true;
}

/**
 * Get next status options based on current status
 */
export function getNextPermitStatusOptions(status: PermitStatus | string | null): PermitStatus[] {
  const transitions: Record<string, PermitStatus[]> = {
    [PermitStatus.PENDING]: [PermitStatus.APPLIED],
    [PermitStatus.APPLIED]: [PermitStatus.UNDER_REVIEW, PermitStatus.APPROVED],
    [PermitStatus.UNDER_REVIEW]: [PermitStatus.APPROVED, PermitStatus.PENDING],
    [PermitStatus.APPROVED]: [PermitStatus.ISSUED],
    [PermitStatus.ISSUED]: [PermitStatus.ACTIVE],
    [PermitStatus.ACTIVE]: [PermitStatus.EXPIRED, PermitStatus.RENEWED, PermitStatus.REVOKED, PermitStatus.CLOSED],
    [PermitStatus.EXPIRED]: [PermitStatus.RENEWED, PermitStatus.CLOSED],
    [PermitStatus.RENEWED]: [PermitStatus.ACTIVE],
    [PermitStatus.REVOKED]: [PermitStatus.CLOSED],
    [PermitStatus.CLOSED]: [],
  };
  return transitions[status || ''] || [PermitStatus.PENDING];
}
