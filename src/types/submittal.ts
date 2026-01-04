/**
 * Submittal Types
 * Types for the dedicated Submittal system with spec-based numbering
 * Aligned with migration 050_dedicated_submittals.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type SubmittalReviewStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_gc_review'
  | 'submitted_to_architect'
  | 'approved'
  | 'approved_as_noted'
  | 'revise_resubmit'
  | 'rejected';

export type SubmittalType =
  | 'product_data'
  | 'shop_drawing'
  | 'sample'
  | 'mix_design'
  | 'test_report'
  | 'certificate'
  | 'warranty'
  | 'operation_maintenance'
  | 'closeout'
  | 'other';

export type BallInCourtEntity =
  | 'subcontractor'
  | 'gc'
  | 'architect'
  | 'engineer'
  | 'owner'
  | 'consultant';

export type SubmittalAttachmentType =
  | 'product_data'
  | 'shop_drawing'
  | 'sample_photo'
  | 'cut_sheet'
  | 'catalog'
  | 'spec_sheet'
  | 'calculation'
  | 'other';

/**
 * Industry-standard submittal approval codes
 * A = Approved (No exceptions taken)
 * B = Approved as Noted (Make corrections noted)
 * C = Revise & Resubmit (Revise and resubmit)
 * D = Rejected (Not approved)
 */
export type SubmittalApprovalCode = 'A' | 'B' | 'C' | 'D';

export const SUBMITTAL_REVIEW_STATUSES: { value: SubmittalReviewStatus; label: string; color: string }[] = [
  { value: 'not_submitted', label: 'Not Submitted', color: 'gray' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'under_gc_review', label: 'Under GC Review', color: 'yellow' },
  { value: 'submitted_to_architect', label: 'Submitted to Architect', color: 'purple' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'approved_as_noted', label: 'Approved as Noted', color: 'lime' },
  { value: 'revise_resubmit', label: 'Revise & Resubmit', color: 'orange' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
];

export const SUBMITTAL_TYPES: { value: SubmittalType; label: string }[] = [
  { value: 'product_data', label: 'Product Data' },
  { value: 'shop_drawing', label: 'Shop Drawing' },
  { value: 'sample', label: 'Sample' },
  { value: 'mix_design', label: 'Mix Design' },
  { value: 'test_report', label: 'Test Report' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'operation_maintenance', label: 'Operation & Maintenance' },
  { value: 'closeout', label: 'Closeout Document' },
  { value: 'other', label: 'Other' },
];

export const BALL_IN_COURT_ENTITIES: { value: BallInCourtEntity; label: string }[] = [
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'gc', label: 'General Contractor' },
  { value: 'architect', label: 'Architect' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'owner', label: 'Owner' },
  { value: 'consultant', label: 'Consultant' },
];

export const SUBMITTAL_ATTACHMENT_TYPES: { value: SubmittalAttachmentType; label: string }[] = [
  { value: 'product_data', label: 'Product Data' },
  { value: 'shop_drawing', label: 'Shop Drawing' },
  { value: 'sample_photo', label: 'Sample Photo' },
  { value: 'cut_sheet', label: 'Cut Sheet' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'spec_sheet', label: 'Spec Sheet' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'other', label: 'Other' },
];

/**
 * Industry-standard approval codes with descriptions
 */
export const SUBMITTAL_APPROVAL_CODES: { value: SubmittalApprovalCode; label: string; description: string; color: string }[] = [
  { value: 'A', label: 'Approved', description: 'No exceptions taken', color: 'green' },
  { value: 'B', label: 'Approved as Noted', description: 'Make corrections noted', color: 'lime' },
  { value: 'C', label: 'Revise & Resubmit', description: 'Revise and resubmit', color: 'orange' },
  { value: 'D', label: 'Rejected', description: 'Not approved', color: 'red' },
];

// Common disciplines in construction (same as RFIs)
export const SUBMITTAL_DISCIPLINES = [
  'Architectural',
  'Structural',
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Fire Protection',
  'Civil',
  'Landscape',
  'Interior Design',
  'General',
];

// =============================================
// Shop Drawing Specific Types
// =============================================

/**
 * Shop Drawing Priority levels
 */
export type ShopDrawingPriority = 'critical_path' | 'standard' | 'non_critical';

export const SHOP_DRAWING_PRIORITIES: { value: ShopDrawingPriority; label: string; color: string; description: string }[] = [
  { value: 'critical_path', label: 'Critical Path', color: 'red', description: 'On critical path - delays affect project schedule' },
  { value: 'standard', label: 'Standard', color: 'blue', description: 'Normal priority item' },
  { value: 'non_critical', label: 'Non-Critical', color: 'gray', description: 'Can be delayed without schedule impact' },
];

/**
 * Shop Drawing Disciplines (specific to shop drawings)
 */
export type ShopDrawingDiscipline =
  | 'Structural'
  | 'Mechanical'
  | 'Electrical'
  | 'Plumbing'
  | 'Architectural'
  | 'Fire Protection'
  | 'Civil'
  | 'Other';

export const SHOP_DRAWING_DISCIPLINES: { value: ShopDrawingDiscipline; label: string; prefix: string }[] = [
  { value: 'Structural', label: 'Structural', prefix: 'SD-S' },
  { value: 'Mechanical', label: 'Mechanical', prefix: 'SD-M' },
  { value: 'Electrical', label: 'Electrical', prefix: 'SD-E' },
  { value: 'Plumbing', label: 'Plumbing', prefix: 'SD-P' },
  { value: 'Fire Protection', label: 'Fire Protection', prefix: 'SD-FP' },
  { value: 'Architectural', label: 'Architectural', prefix: 'SD-A' },
  { value: 'Civil', label: 'Civil', prefix: 'SD-C' },
  { value: 'Other', label: 'Other', prefix: 'SD' },
];

/**
 * Valid status transitions for shop drawings
 * Terminal states (approved, approved_as_noted) cannot transition to other states
 */
export const SHOP_DRAWING_VALID_TRANSITIONS: Record<SubmittalReviewStatus, SubmittalReviewStatus[]> = {
  'not_submitted': ['submitted'],
  'submitted': ['under_gc_review'],
  'under_gc_review': ['approved', 'approved_as_noted', 'revise_resubmit', 'rejected', 'submitted_to_architect'],
  'submitted_to_architect': ['approved', 'approved_as_noted', 'revise_resubmit', 'rejected'],
  'revise_resubmit': ['submitted'], // Creates new revision
  'rejected': ['submitted'], // As new product
  'approved': [], // TERMINAL - locked
  'approved_as_noted': [], // TERMINAL - locked
};

/**
 * Check if a status transition is valid for shop drawings
 */
export function isValidShopDrawingTransition(
  currentStatus: SubmittalReviewStatus,
  newStatus: SubmittalReviewStatus
): boolean {
  const validNextStatuses = SHOP_DRAWING_VALID_TRANSITIONS[currentStatus] || [];
  return validNextStatuses.includes(newStatus);
}

/**
 * Check if a shop drawing is in a terminal (locked) state
 */
export function isShopDrawingLocked(status: SubmittalReviewStatus): boolean {
  return ['approved', 'approved_as_noted'].includes(status);
}

/**
 * Get valid next status options for a shop drawing
 */
export function getShopDrawingNextStatusOptions(currentStatus: SubmittalReviewStatus): SubmittalReviewStatus[] {
  return SHOP_DRAWING_VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Get revision label from revision number
 */
export function getRevisionLabel(revisionNumber: number): string {
  if (revisionNumber === 0) {
    return 'Original';
  }
  return `Rev ${revisionNumber}`;
}

// Common spec sections (CSI MasterFormat)
export const COMMON_SPEC_SECTIONS = [
  { code: '03 30 00', title: 'Cast-in-Place Concrete' },
  { code: '04 20 00', title: 'Unit Masonry' },
  { code: '05 12 00', title: 'Structural Steel Framing' },
  { code: '06 10 00', title: 'Rough Carpentry' },
  { code: '07 21 00', title: 'Thermal Insulation' },
  { code: '07 46 00', title: 'Siding' },
  { code: '07 62 00', title: 'Sheet Metal Flashing and Trim' },
  { code: '08 11 00', title: 'Metal Doors and Frames' },
  { code: '08 14 00', title: 'Wood Doors' },
  { code: '08 51 00', title: 'Metal Windows' },
  { code: '08 71 00', title: 'Door Hardware' },
  { code: '09 29 00', title: 'Gypsum Board' },
  { code: '09 30 00', title: 'Tiling' },
  { code: '09 51 00', title: 'Acoustical Ceilings' },
  { code: '09 65 00', title: 'Resilient Flooring' },
  { code: '09 91 00', title: 'Painting' },
  { code: '10 14 00', title: 'Signage' },
  { code: '10 28 00', title: 'Toilet, Bath, and Laundry Accessories' },
  { code: '21 00 00', title: 'Fire Suppression' },
  { code: '22 00 00', title: 'Plumbing' },
  { code: '23 00 00', title: 'HVAC' },
  { code: '26 00 00', title: 'Electrical' },
  { code: '27 00 00', title: 'Communications' },
  { code: '28 00 00', title: 'Electronic Safety and Security' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Submittal - Submittal package
 */
export interface Submittal {
  id: string;
  project_id: string;
  company_id: string;

  // Submittal Identification (spec-section based)
  submittal_number: string;  // e.g., "03 30 00-1"
  revision_number: number;

  // Core Fields
  title: string;
  description: string | null;

  // Specification Reference
  spec_section: string;  // e.g., "03 30 00"
  spec_section_title: string | null;

  // Submittal Type
  submittal_type: SubmittalType;

  // Dates
  date_required: string | null;
  date_submitted: string | null;
  date_received: string | null;
  date_returned: string | null;

  // Review Status
  review_status: SubmittalReviewStatus;
  review_comments: string | null;

  // Ball-in-Court
  ball_in_court: string | null;
  ball_in_court_entity: BallInCourtEntity | null;

  // Assignment
  submitted_by_company: string | null;
  submitted_by_user: string | null;
  reviewer_id: string | null;

  // Subcontractor
  subcontractor_id: string | null;

  // Review Tracking
  days_for_review: number;
  review_due_date: string | null;

  // Related Items
  related_rfi_id: string | null;

  // Discipline
  discipline: string | null;

  // Approval Code (A/B/C/D)
  approval_code: SubmittalApprovalCode | null;
  approval_code_date: string | null;
  approval_code_set_by: string | null;

  // Legacy reference
  legacy_workflow_item_id: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Submittal Item - Individual items within a submittal package
 */
export interface SubmittalItem {
  id: string;
  submittal_id: string;

  // Item details
  item_number: number;
  description: string;
  manufacturer: string | null;
  model_number: string | null;
  quantity: number | null;
  unit: string | null;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Submittal Attachment
 */
export interface SubmittalAttachment {
  id: string;
  submittal_id: string;

  // Document or file
  document_id: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;

  // Metadata
  uploaded_by: string | null;
  created_at: string;
}

/**
 * Submittal Review - Review history for submittals
 */
export interface SubmittalReview {
  id: string;
  submittal_id: string;

  // Review Info
  review_status: SubmittalReviewStatus;
  comments: string | null;

  // Approval Code (A/B/C/D)
  approval_code: SubmittalApprovalCode | null;

  // Reviewer
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewer_company: string | null;

  // Dates
  reviewed_at: string;

  // Attachments (marked up drawings, etc.)
  review_attachments: {
    file_url: string;
    file_name: string;
    file_type?: string;
  }[];

  // Metadata
  created_at: string;
}

/**
 * Submittal History Entry
 */
export interface SubmittalHistory {
  id: string;
  submittal_id: string;

  // Change Info
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;

  // Metadata
  changed_at: string;
  changed_by: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Submittal with computed fields from view
 */
export interface SubmittalWithComputedFields extends Submittal {
  days_until_required: number | null;
  days_in_review: number | null;
  is_overdue: boolean;
  item_count: number;
  attachment_count: number;
}

/**
 * Submittal with all relations
 */
export interface SubmittalWithDetails extends Submittal {
  // Computed fields
  days_until_required: number | null;
  days_in_review: number | null;
  is_overdue: boolean;

  // Relations
  project?: {
    id: string;
    name: string;
    number: string | null;
  };
  submitted_by_company_data?: {
    id: string;
    name: string;
  };
  submitted_by_user_data?: {
    id: string;
    full_name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
    email: string;
  };
  ball_in_court_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  subcontractor?: {
    id: string;
    company_name: string;
    contact_name: string | null;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  items?: SubmittalItem[];
  attachments?: SubmittalAttachment[];
  reviews?: SubmittalReviewWithUser[];
  item_count?: number;
  attachment_count?: number;
  review_count?: number;
}

/**
 * Submittal Review with user info
 */
export interface SubmittalReviewWithUser extends SubmittalReview {
  reviewed_by_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Submittal input
 */
export interface CreateSubmittalDTO {
  project_id: string;
  title: string;
  description?: string;
  spec_section: string;
  spec_section_title?: string;
  submittal_type: SubmittalType;
  date_required?: string;
  ball_in_court?: string;
  ball_in_court_entity?: BallInCourtEntity;
  submitted_by_company?: string;
  submitted_by_user?: string;
  reviewer_id?: string;
  subcontractor_id?: string;
  days_for_review?: number;
  discipline?: string;
  // Items to create with submittal
  items?: CreateSubmittalItemDTO[];
}

/**
 * Update Submittal input
 */
export interface UpdateSubmittalDTO {
  title?: string;
  description?: string;
  spec_section?: string;
  spec_section_title?: string;
  submittal_type?: SubmittalType;
  date_required?: string;
  date_submitted?: string;
  date_received?: string;
  date_returned?: string;
  review_status?: SubmittalReviewStatus;
  review_comments?: string;
  ball_in_court?: string;
  ball_in_court_entity?: BallInCourtEntity;
  submitted_by_company?: string;
  submitted_by_user?: string;
  reviewer_id?: string;
  subcontractor_id?: string;
  days_for_review?: number;
  review_due_date?: string;
  related_rfi_id?: string;
  discipline?: string;
}

/**
 * Submit Submittal (transition from draft)
 */
export interface SubmitSubmittalDTO {
  date_submitted?: string;  // Defaults to now
  submitted_by_user?: string;
  ball_in_court?: string;
  ball_in_court_entity?: BallInCourtEntity;
}

/**
 * Review Submittal input
 */
export interface ReviewSubmittalDTO {
  review_status: SubmittalReviewStatus;
  approval_code?: SubmittalApprovalCode;
  comments?: string;
  reviewer_name?: string;
  reviewer_company?: string;
  review_attachments?: {
    file_url: string;
    file_name: string;
    file_type?: string;
  }[];
}

/**
 * Create Submittal Item input
 */
export interface CreateSubmittalItemDTO {
  submittal_id?: string;  // Optional if creating with submittal
  description: string;
  manufacturer?: string;
  model_number?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

/**
 * Update Submittal Item input
 */
export interface UpdateSubmittalItemDTO {
  description?: string;
  manufacturer?: string;
  model_number?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

/**
 * Create Submittal Attachment input
 */
export interface CreateSubmittalAttachmentDTO {
  submittal_id: string;
  document_id?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
}

// =============================================
// Filter Types
// =============================================

export interface SubmittalFilters {
  projectId: string;
  reviewStatus?: SubmittalReviewStatus | SubmittalReviewStatus[];
  submittalType?: SubmittalType | SubmittalType[];
  specSection?: string;
  subcontractorId?: string;
  ballInCourt?: string;
  ballInCourtEntity?: BallInCourtEntity;
  discipline?: string;
  isOverdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// =============================================
// Statistics Types
// =============================================

/**
 * Submittal statistics for a project
 */
export interface SubmittalStatistics {
  total: number;
  by_status: Record<SubmittalReviewStatus, number>;
  by_type: Record<SubmittalType, number>;
  by_spec_section: { spec_section: string; count: number }[];
  open: number;
  overdue: number;
  approved_this_week: number;
  average_review_days: number;
  pending_review: number;
}

/**
 * Submittal register summary
 */
export interface SubmittalRegisterSummary {
  spec_section: string;
  spec_section_title: string | null;
  total_submittals: number;
  approved: number;
  pending: number;
  rejected: number;
}

// =============================================
// Form Types
// =============================================

export interface SubmittalFormData {
  title: string;
  description: string;
  spec_section: string;
  spec_section_title: string;
  submittal_type: SubmittalType;
  date_required: string;
  ball_in_court: string;
  ball_in_court_entity: BallInCourtEntity | '';
  subcontractor_id: string;
  reviewer_id: string;
  days_for_review: number;
  discipline: string;
}

export interface SubmittalItemFormData {
  description: string;
  manufacturer: string;
  model_number: string;
  quantity: string;
  unit: string;
  notes: string;
}

export interface SubmittalReviewFormData {
  review_status: SubmittalReviewStatus;
  comments: string;
}

// =============================================
// Utility Functions
// =============================================

/**
 * Format submittal number with revision
 */
export function formatSubmittalNumber(submittalNumber: string, revisionNumber: number): string {
  if (revisionNumber === 0) {
    return submittalNumber;
  }
  return `${submittalNumber} Rev ${revisionNumber}`;
}

/**
 * Generate submittal number from spec section
 */
export function generateSubmittalNumber(specSection: string, sequenceNumber: number): string {
  return `${specSection}-${sequenceNumber}`;
}

/**
 * Get review status color class
 */
export function getSubmittalStatusColor(status: SubmittalReviewStatus): string {
  const statusConfig = SUBMITTAL_REVIEW_STATUSES.find((s) => s.value === status);
  return statusConfig?.color || 'gray';
}

/**
 * Get submittal type label
 */
export function getSubmittalTypeLabel(type: SubmittalType): string {
  const typeConfig = SUBMITTAL_TYPES.find((t) => t.value === type);
  return typeConfig?.label || type;
}

/**
 * Check if submittal can be edited
 */
export function canEditSubmittal(status: SubmittalReviewStatus): boolean {
  return ['not_submitted', 'revise_resubmit'].includes(status);
}

/**
 * Check if submittal can be submitted
 */
export function canSubmitSubmittal(status: SubmittalReviewStatus): boolean {
  return ['not_submitted', 'revise_resubmit'].includes(status);
}

/**
 * Check if submittal can be reviewed
 */
export function canReviewSubmittal(status: SubmittalReviewStatus): boolean {
  return ['submitted', 'under_gc_review', 'submitted_to_architect'].includes(status);
}

/**
 * Check if submittal is in final state
 */
export function isSubmittalClosed(status: SubmittalReviewStatus): boolean {
  return ['approved', 'approved_as_noted', 'rejected'].includes(status);
}

/**
 * Get approval code label
 */
export function getApprovalCodeLabel(code: SubmittalApprovalCode): string {
  const config = SUBMITTAL_APPROVAL_CODES.find((c) => c.value === code);
  return config?.label || code;
}

/**
 * Get approval code color
 */
export function getApprovalCodeColor(code: SubmittalApprovalCode): string {
  const config = SUBMITTAL_APPROVAL_CODES.find((c) => c.value === code);
  return config?.color || 'gray';
}

/**
 * Get suggested approval code from review status
 */
export function getSuggestedApprovalCode(status: SubmittalReviewStatus): SubmittalApprovalCode | null {
  switch (status) {
    case 'approved':
      return 'A';
    case 'approved_as_noted':
      return 'B';
    case 'revise_resubmit':
      return 'C';
    case 'rejected':
      return 'D';
    default:
      return null;
  }
}

/**
 * Get next workflow status options
 */
export function getNextStatusOptions(currentStatus: SubmittalReviewStatus): SubmittalReviewStatus[] {
  switch (currentStatus) {
    case 'not_submitted':
      return ['submitted'];
    case 'submitted':
      return ['under_gc_review'];
    case 'under_gc_review':
      return ['submitted_to_architect', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected'];
    case 'submitted_to_architect':
      return ['approved', 'approved_as_noted', 'revise_resubmit', 'rejected'];
    case 'revise_resubmit':
      return ['submitted'];
    default:
      return [];
  }
}

/**
 * Calculate review due date
 */
export function calculateReviewDueDate(dateSubmitted: string, daysForReview: number): string {
  const submitted = new Date(dateSubmitted);
  submitted.setDate(submitted.getDate() + daysForReview);
  return submitted.toISOString().split('T')[0];
}
