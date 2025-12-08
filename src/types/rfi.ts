/**
 * RFI (Request for Information) Types
 * Types for the dedicated RFI system with industry-standard fields
 * Aligned with migration 049_dedicated_rfis.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type RFIStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'responded'
  | 'approved'
  | 'rejected'
  | 'closed';

export type RFIPriority = 'low' | 'normal' | 'high' | 'critical';

export type BallInCourtRole =
  | 'gc'
  | 'architect'
  | 'engineer'
  | 'subcontractor'
  | 'owner'
  | 'consultant';

export type RFIAttachmentType =
  | 'question'
  | 'response'
  | 'general'
  | 'sketch'
  | 'photo';

export type RFICommentType =
  | 'comment'
  | 'response'
  | 'internal_note'
  | 'question_clarification';

/**
 * RFI Response Type (how the RFI was answered)
 * Aligned with migration 078_rfi_response_types.sql
 */
export type RFIResponseType =
  | 'answered'              // Direct answer provided
  | 'see_drawings'          // Refer to drawings for answer
  | 'see_specs'             // Refer to specifications for answer
  | 'deferred'              // Decision deferred
  | 'partial_response'      // Partial answer, more information needed
  | 'request_clarification' // Need clarification from submitter
  | 'no_change_required'    // No change to documents required

export const RFI_STATUSES: { value: RFIStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'under_review', label: 'Under Review', color: 'yellow' },
  { value: 'responded', label: 'Responded', color: 'green' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'closed', label: 'Closed', color: 'slate' },
];

export const RFI_PRIORITIES: { value: RFIPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
];

export const BALL_IN_COURT_ROLES: { value: BallInCourtRole; label: string }[] = [
  { value: 'gc', label: 'General Contractor' },
  { value: 'architect', label: 'Architect' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'owner', label: 'Owner' },
  { value: 'consultant', label: 'Consultant' },
];

export const RFI_ATTACHMENT_TYPES: { value: RFIAttachmentType; label: string }[] = [
  { value: 'question', label: 'Question Attachment' },
  { value: 'response', label: 'Response Attachment' },
  { value: 'general', label: 'General' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'photo', label: 'Photo' },
];

export const RFI_RESPONSE_TYPES: { value: RFIResponseType; label: string; description: string }[] = [
  { value: 'answered', label: 'Answered', description: 'Direct answer provided' },
  { value: 'see_drawings', label: 'See Drawings', description: 'Refer to drawings for answer' },
  { value: 'see_specs', label: 'See Specifications', description: 'Refer to specifications for answer' },
  { value: 'deferred', label: 'Deferred', description: 'Decision deferred to later date' },
  { value: 'partial_response', label: 'Partial Response', description: 'Partial answer, more information needed' },
  { value: 'request_clarification', label: 'Request Clarification', description: 'Need clarification from submitter' },
  { value: 'no_change_required', label: 'No Change Required', description: 'No change to documents required' },
];

// Common disciplines in construction
export const RFI_DISCIPLINES = [
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
// Core Types (Database Schema)
// =============================================

/**
 * RFI - Request for Information
 */
export interface RFI {
  id: string;
  project_id: string;
  company_id: string;

  // RFI Identification
  rfi_number: number;

  // Core Fields
  subject: string;
  question: string;
  response: string | null;

  // References
  spec_section: string | null;
  drawing_id: string | null;
  drawing_reference: string | null;
  location: string | null;

  // Dates
  date_created: string;
  date_submitted: string | null;
  date_required: string | null;
  date_responded: string | null;
  date_closed: string | null;

  // Status & Priority
  status: RFIStatus;
  priority: RFIPriority;

  // Ball-in-Court Tracking
  ball_in_court: string | null;
  ball_in_court_role: BallInCourtRole | null;

  // Assignment
  submitted_by: string | null;
  assigned_to: string | null;
  responded_by: string | null;

  // Discipline
  discipline: string | null;

  // Response Type (how the RFI was answered)
  response_type: RFIResponseType | null;
  required_response_days: number;
  is_internal: boolean;

  // Impact Assessment
  cost_impact: number | null;
  schedule_impact_days: number | null;

  // Related Items
  related_submittal_id: string | null;
  related_change_order_id: string | null;

  // Distribution
  distribution_list: string[];

  // Legacy reference
  legacy_workflow_item_id: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * RFI Attachment
 */
export interface RFIAttachment {
  id: string;
  rfi_id: string;

  // Document or file
  document_id: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;

  // Type
  attachment_type: RFIAttachmentType;

  // Metadata
  uploaded_by: string | null;
  created_at: string;
}

/**
 * RFI Comment
 */
export interface RFIComment {
  id: string;
  rfi_id: string;

  // Content
  comment: string;
  comment_type: RFICommentType;

  // Mentions
  mentioned_users: string[];

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * RFI History Entry
 */
export interface RFIHistory {
  id: string;
  rfi_id: string;

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
 * RFI with computed fields from view
 */
export interface RFIWithComputedFields extends RFI {
  days_until_due: number | null;
  days_overdue: number;
  days_open: number | null;
  is_overdue: boolean;
  response_due_date: string | null;
}

/**
 * RFI with all relations
 */
export interface RFIWithDetails extends RFI {
  // Computed fields
  days_until_due: number | null;
  days_overdue: number;
  days_open: number | null;
  is_overdue: boolean;
  response_due_date: string | null;

  // Relations
  project?: {
    id: string;
    name: string;
    number: string | null;
  };
  drawing?: {
    id: string;
    name: string;
    drawing_number: string | null;
  };
  submitted_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  responded_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  ball_in_court_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  attachments?: RFIAttachment[];
  comments?: RFICommentWithUser[];
  attachment_count?: number;
  comment_count?: number;
}

/**
 * RFI Comment with user info
 */
export interface RFICommentWithUser extends RFIComment {
  created_by_user?: {
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
 * Create RFI input
 */
export interface CreateRFIDTO {
  project_id: string;
  subject: string;
  question: string;
  spec_section?: string;
  drawing_id?: string;
  drawing_reference?: string;
  location?: string;
  date_required?: string;
  priority?: RFIPriority;
  assigned_to?: string;
  ball_in_court?: string;
  ball_in_court_role?: BallInCourtRole;
  discipline?: string;
  distribution_list?: string[];
  required_response_days?: number;
  is_internal?: boolean;
  // Auto-submit on create
  auto_submit?: boolean;
}

/**
 * Update RFI input
 */
export interface UpdateRFIDTO {
  subject?: string;
  question?: string;
  response?: string;
  spec_section?: string;
  drawing_id?: string;
  drawing_reference?: string;
  location?: string;
  date_required?: string;
  status?: RFIStatus;
  priority?: RFIPriority;
  assigned_to?: string;
  responded_by?: string;
  ball_in_court?: string;
  ball_in_court_role?: BallInCourtRole;
  discipline?: string;
  response_type?: RFIResponseType;
  required_response_days?: number;
  is_internal?: boolean;
  cost_impact?: number;
  schedule_impact_days?: number;
  related_submittal_id?: string;
  related_change_order_id?: string;
  distribution_list?: string[];
}

/**
 * Submit RFI response input
 */
export interface SubmitRFIResponseDTO {
  response: string;
  response_type?: RFIResponseType;
  cost_impact?: number;
  schedule_impact_days?: number;
  attachments?: CreateRFIAttachmentDTO[];
}

/**
 * Create RFI Attachment input
 */
export interface CreateRFIAttachmentDTO {
  rfi_id: string;
  document_id?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  attachment_type?: RFIAttachmentType;
}

/**
 * Create RFI Comment input
 */
export interface CreateRFICommentDTO {
  rfi_id: string;
  comment: string;
  comment_type?: RFICommentType;
  mentioned_users?: string[];
}

/**
 * Update RFI Comment input
 */
export interface UpdateRFICommentDTO {
  comment?: string;
  comment_type?: RFICommentType;
  mentioned_users?: string[];
}

// =============================================
// Filter Types
// =============================================

export interface RFIFilters {
  projectId: string;
  status?: RFIStatus | RFIStatus[];
  priority?: RFIPriority | RFIPriority[];
  responseType?: RFIResponseType | RFIResponseType[];
  assignedTo?: string;
  ballInCourt?: string;
  discipline?: string;
  isOverdue?: boolean;
  isInternal?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// =============================================
// Statistics Types
// =============================================

/**
 * RFI statistics for a project
 */
export interface RFIStatistics {
  total: number;
  by_status: Record<RFIStatus, number>;
  by_priority: Record<RFIPriority, number>;
  open: number;
  overdue: number;
  responded_this_week: number;
  average_response_days: number;
  oldest_open_days: number;
}

/**
 * RFI aging report
 */
export interface RFIAgingReport {
  range: string;  // e.g., "0-7 days", "8-14 days", etc.
  count: number;
  rfi_ids: string[];
}

// =============================================
// Form Types
// =============================================

export interface RFIFormData {
  subject: string;
  question: string;
  spec_section: string;
  drawing_id: string;
  drawing_reference: string;
  location: string;
  date_required: string;
  priority: RFIPriority;
  assigned_to: string;
  ball_in_court: string;
  ball_in_court_role: BallInCourtRole | '';
  discipline: string;
  distribution_list: string[];
}

export interface RFIResponseFormData {
  response: string;
  cost_impact: string;
  schedule_impact_days: string;
}

// =============================================
// Utility Functions
// =============================================

/**
 * Format RFI number with prefix
 */
export function formatRFINumber(rfiNumber: number, prefix: string = 'RFI'): string {
  return `${prefix}-${String(rfiNumber).padStart(3, '0')}`
}

/**
 * Get status color class
 */
export function getRFIStatusColor(status: RFIStatus): string {
  const statusConfig = RFI_STATUSES.find((s) => s.value === status)
  return statusConfig?.color || 'gray'
}

/**
 * Get priority color class
 */
export function getRFIPriorityColor(priority: RFIPriority): string {
  const priorityConfig = RFI_PRIORITIES.find((p) => p.value === priority)
  return priorityConfig?.color || 'blue'
}

/**
 * Check if RFI can be edited
 */
export function canEditRFI(status: RFIStatus): boolean {
  return ['draft', 'submitted', 'under_review'].includes(status)
}

/**
 * Check if RFI can be responded to
 */
export function canRespondToRFI(status: RFIStatus): boolean {
  return ['submitted', 'under_review'].includes(status)
}

/**
 * Check if RFI can be closed
 */
export function canCloseRFI(status: RFIStatus): boolean {
  return ['responded', 'approved', 'rejected'].includes(status)
}

/**
 * Get response type label
 */
export function getRFIResponseTypeLabel(responseType: RFIResponseType): string {
  const config = RFI_RESPONSE_TYPES.find((t) => t.value === responseType)
  return config?.label || responseType
}

/**
 * Get response type description
 */
export function getRFIResponseTypeDescription(responseType: RFIResponseType): string {
  const config = RFI_RESPONSE_TYPES.find((t) => t.value === responseType)
  return config?.description || ''
}

/**
 * Calculate response due date based on submitted date and required days
 */
export function calculateResponseDueDate(dateSubmitted: string | null, requiredDays: number): Date | null {
  if (!dateSubmitted) return null
  const submitted = new Date(dateSubmitted)
  const dueDate = new Date(submitted)
  dueDate.setDate(dueDate.getDate() + requiredDays)
  return dueDate
}
