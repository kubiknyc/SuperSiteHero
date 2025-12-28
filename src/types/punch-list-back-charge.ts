/**
 * Punch List Back-Charge Types
 * Types for tracking costs for deficient work requiring back-charges
 * Aligned with migration 154_punch_list_back_charges.sql
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum BackChargeReason {
  SUBSTANDARD_WORK = 'substandard_work',
  REWORK_REQUIRED = 'rework_required',
  DAMAGE = 'damage',
  CLEANUP = 'cleanup',
  SAFETY_VIOLATION = 'safety_violation',
  SCHEDULE_DELAY = 'schedule_delay',
  OTHER = 'other',
}

export enum BackChargeStatus {
  INITIATED = 'initiated',
  ESTIMATED = 'estimated',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT_TO_SUB = 'sent_to_sub',
  DISPUTED = 'disputed',
  RESOLVED = 'resolved',
  APPLIED = 'applied',
  VOIDED = 'voided',
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const BACK_CHARGE_REASONS: { value: BackChargeReason; label: string; description: string }[] = [
  { value: BackChargeReason.SUBSTANDARD_WORK, label: 'Substandard Work', description: 'Work does not meet quality standards' },
  { value: BackChargeReason.REWORK_REQUIRED, label: 'Rework Required', description: 'Work must be redone due to errors' },
  { value: BackChargeReason.DAMAGE, label: 'Damage', description: 'Damage to property or materials' },
  { value: BackChargeReason.CLEANUP, label: 'Cleanup', description: 'Failure to clean work area' },
  { value: BackChargeReason.SAFETY_VIOLATION, label: 'Safety Violation', description: 'Violation of safety requirements' },
  { value: BackChargeReason.SCHEDULE_DELAY, label: 'Schedule Delay', description: 'Caused project delays' },
  { value: BackChargeReason.OTHER, label: 'Other', description: 'Other reason (specify)' },
];

export const BACK_CHARGE_STATUSES: { value: BackChargeStatus; label: string; color: string; description: string }[] = [
  { value: BackChargeStatus.INITIATED, label: 'Initiated', color: 'gray', description: 'Back-charge created' },
  { value: BackChargeStatus.ESTIMATED, label: 'Estimated', color: 'blue', description: 'Cost estimate complete' },
  { value: BackChargeStatus.PENDING_APPROVAL, label: 'Pending Approval', color: 'yellow', description: 'Awaiting internal approval' },
  { value: BackChargeStatus.APPROVED, label: 'Approved', color: 'green', description: 'Internally approved' },
  { value: BackChargeStatus.SENT_TO_SUB, label: 'Sent to Sub', color: 'purple', description: 'Notified subcontractor' },
  { value: BackChargeStatus.DISPUTED, label: 'Disputed', color: 'orange', description: 'Subcontractor disputed' },
  { value: BackChargeStatus.RESOLVED, label: 'Resolved', color: 'teal', description: 'Dispute resolved' },
  { value: BackChargeStatus.APPLIED, label: 'Applied', color: 'emerald', description: 'Applied to payment' },
  { value: BackChargeStatus.VOIDED, label: 'Voided', color: 'red', description: 'Cancelled' },
];

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Punch Item Back-Charge
 */
export interface PunchItemBackCharge {
  id: string;
  punch_item_id: string;
  project_id: string;
  company_id: string;

  // Identification
  back_charge_number: number;

  // Responsible Party
  subcontractor_id: string | null;
  subcontractor_name: string | null;

  // Reason
  reason: BackChargeReason | string;
  reason_other: string | null;
  description: string | null;

  // Cost Code Reference
  cost_code_id: string | null;
  cost_code: string | null;

  // Cost Breakdown
  labor_hours: number;
  labor_rate: number;
  labor_amount: number;
  material_amount: number;
  equipment_amount: number;
  subcontract_amount: number;
  other_amount: number;

  // Markup
  markup_percent: number;
  markup_amount: number;

  // Totals
  subtotal: number;
  total_amount: number;

  // Status & Workflow
  status: BackChargeStatus | string;

  // Approval
  approval_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;

  // Dispute Handling
  dispute_reason: string | null;
  dispute_response: string | null;
  dispute_resolved_by: string | null;
  dispute_resolved_at: string | null;

  // Application to Payment
  applied_to_invoice_id: string | null;
  applied_at: string | null;
  applied_by: string | null;

  // Tracking
  initiated_by: string | null;
  date_initiated: string;
  date_sent_to_sub: string | null;

  // Attachments
  attachments: BackChargeAttachment[];

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Back-Charge with related entity details
 */
export interface PunchItemBackChargeDetailed extends PunchItemBackCharge {
  // Punch item details
  punch_number: number | null;
  punch_title: string;
  punch_trade: string;
  building: string | null;
  floor: string | null;
  room: string | null;
  punch_status: string;

  // Related entity names
  subcontractor_display_name: string | null;
  cost_code_name: string | null;
  cost_code_division: string | null;
  initiated_by_name: string | null;
  approved_by_name: string | null;
}

/**
 * Back-Charge History Entry
 */
export interface PunchItemBackChargeHistory {
  id: string;
  back_charge_id: string;

  // Change Info
  previous_status: BackChargeStatus | string | null;
  new_status: BackChargeStatus | string | null;
  action: string;

  // Details
  notes: string | null;
  amount_before: number | null;
  amount_after: number | null;

  // Who & When
  changed_by: string | null;
  changed_at: string;

  // Joined data
  changed_by_user?: { full_name: string; email: string } | null;
}

/**
 * Back-Charge Attachment
 */
export interface BackChargeAttachment {
  id: string;
  name: string;
  url: string;
  type: 'photo' | 'document' | 'receipt' | 'other';
  size?: number;
  uploaded_at?: string;
  uploaded_by?: string;
}

// =============================================================================
// SUMMARY TYPES (From Views)
// =============================================================================

/**
 * Back-charges by subcontractor summary
 */
export interface BackChargesBySubcontractor {
  project_id: string;
  subcontractor_id: string | null;
  subcontractor_name: string;
  total_back_charges: number;
  initiated_count: number;
  estimated_count: number;
  pending_approval_count: number;
  approved_count: number;
  sent_count: number;
  disputed_count: number;
  applied_count: number;
  total_amount: number;
  applied_amount: number;
  pending_amount: number;
  disputed_amount: number;
}

/**
 * Back-charges by project summary
 */
export interface BackChargesByProject {
  project_id: string;
  total_back_charges: number;
  punch_items_with_back_charges: number;
  subcontractors_with_back_charges: number;
  total_amount: number;
  applied_amount: number;
  pending_collection_amount: number;
  disputed_amount: number;
  disputed_count: number;
}

/**
 * Project back-charge statistics
 */
export interface ProjectBackChargeStats {
  total_back_charges: number;
  total_amount: number;
  applied_amount: number;
  pending_amount: number;
  disputed_amount: number;
  avg_back_charge_amount: number;
  top_reason: BackChargeReason | string | null;
  top_subcontractor_name: string | null;
  top_subcontractor_amount: number;
}

// =============================================================================
// DTO TYPES (Data Transfer Objects)
// =============================================================================

/**
 * Create Back-Charge input
 */
export interface CreateBackChargeDTO {
  punch_item_id: string;
  project_id: string;
  company_id: string;

  // Responsible Party
  subcontractor_id?: string;
  subcontractor_name?: string;

  // Reason
  reason: BackChargeReason | string;
  reason_other?: string;
  description?: string;

  // Cost Code
  cost_code_id?: string;
  cost_code?: string;

  // Cost Breakdown
  labor_hours?: number;
  labor_rate?: number;
  labor_amount?: number;
  material_amount?: number;
  equipment_amount?: number;
  subcontract_amount?: number;
  other_amount?: number;

  // Markup
  markup_percent?: number;

  // Attachments
  attachments?: BackChargeAttachment[];
}

/**
 * Update Back-Charge input
 */
export interface UpdateBackChargeDTO {
  // Responsible Party
  subcontractor_id?: string;
  subcontractor_name?: string;

  // Reason
  reason?: BackChargeReason | string;
  reason_other?: string;
  description?: string;

  // Cost Code
  cost_code_id?: string;
  cost_code?: string;

  // Cost Breakdown
  labor_hours?: number;
  labor_rate?: number;
  labor_amount?: number;
  material_amount?: number;
  equipment_amount?: number;
  subcontract_amount?: number;
  other_amount?: number;

  // Markup
  markup_percent?: number;

  // Status
  status?: BackChargeStatus | string;

  // Approval
  approval_notes?: string;

  // Dispute
  dispute_reason?: string;
  dispute_response?: string;

  // Attachments
  attachments?: BackChargeAttachment[];
}

/**
 * Approve Back-Charge input
 */
export interface ApproveBackChargeDTO {
  approval_notes?: string;
}

/**
 * Dispute Back-Charge input
 */
export interface DisputeBackChargeDTO {
  dispute_reason: string;
}

/**
 * Resolve Dispute input
 */
export interface ResolveDisputeDTO {
  dispute_response: string;
  adjusted_amount?: number;
}

/**
 * Apply Back-Charge to Payment input
 */
export interface ApplyBackChargeDTO {
  applied_to_invoice_id?: string;
  notes?: string;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface BackChargeFilters {
  projectId: string;
  punchItemId?: string;
  subcontractorId?: string;
  status?: BackChargeStatus | string;
  reason?: BackChargeReason | string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface BackChargeFormData {
  subcontractor_id: string;
  subcontractor_name: string;
  reason: BackChargeReason | string;
  reason_other: string;
  description: string;
  cost_code_id: string;
  cost_code: string;
  labor_hours: string; // String for form input
  labor_rate: string;
  material_amount: string;
  equipment_amount: string;
  subcontract_amount: string;
  other_amount: string;
  markup_percent: string;
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

/**
 * Check if back-charge can be edited
 */
export function canEditBackCharge(status: BackChargeStatus | string): boolean {
  return [BackChargeStatus.INITIATED, BackChargeStatus.ESTIMATED].includes(status as BackChargeStatus);
}

/**
 * Check if back-charge can be approved
 */
export function canApproveBackCharge(status: BackChargeStatus | string): boolean {
  return [BackChargeStatus.ESTIMATED, BackChargeStatus.PENDING_APPROVAL].includes(status as BackChargeStatus);
}

/**
 * Check if back-charge can be sent to subcontractor
 */
export function canSendToSub(status: BackChargeStatus | string): boolean {
  return [BackChargeStatus.APPROVED].includes(status as BackChargeStatus);
}

/**
 * Check if back-charge can be disputed
 */
export function canDispute(status: BackChargeStatus | string): boolean {
  return [BackChargeStatus.SENT_TO_SUB].includes(status as BackChargeStatus);
}

/**
 * Check if back-charge can be applied to payment
 */
export function canApplyToPayment(status: BackChargeStatus | string): boolean {
  return [BackChargeStatus.APPROVED, BackChargeStatus.SENT_TO_SUB, BackChargeStatus.RESOLVED].includes(status as BackChargeStatus);
}

/**
 * Check if back-charge can be voided
 */
export function canVoid(status: BackChargeStatus | string): boolean {
  return status !== BackChargeStatus.APPLIED && status !== BackChargeStatus.VOIDED;
}

/**
 * Get status display configuration
 */
export function getBackChargeStatusConfig(status: BackChargeStatus | string): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const config = BACK_CHARGE_STATUSES.find(s => s.value === status);
  if (!config) {
    return { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' };
  }

  const colorMap: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    gray: { color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' },
    blue: { color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
    yellow: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' },
    green: { color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
    purple: { color: 'text-purple-700', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
    orange: { color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
    teal: { color: 'text-teal-700', bgColor: 'bg-teal-100', borderColor: 'border-teal-200' },
    emerald: { color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200' },
    red: { color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
  };

  return {
    label: config.label,
    ...colorMap[config.color] || colorMap.gray,
  };
}

/**
 * Get reason display configuration
 */
export function getBackChargeReasonConfig(reason: BackChargeReason | string): {
  label: string;
  description: string;
} {
  const config = BACK_CHARGE_REASONS.find(r => r.value === reason);
  return config || { label: reason, description: '' };
}
