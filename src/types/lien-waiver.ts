/**
 * Lien Waiver Types
 * Types for Lien Waiver Management System
 * Aligned with migration 069_lien_waivers.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type LienWaiverType =
  | 'conditional_progress'
  | 'unconditional_progress'
  | 'conditional_final'
  | 'unconditional_final';

export type LienWaiverStatus =
  | 'pending'
  | 'draft'
  | 'sent'
  | 'received'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'void';

export const LIEN_WAIVER_TYPES: Array<{
  value: LienWaiverType;
  label: string;
  description: string;
  isConditional: boolean;
  isFinal: boolean;
}> = [
  {
    value: 'conditional_progress',
    label: 'Conditional Progress',
    description: 'Conditional Waiver and Release on Progress Payment',
    isConditional: true,
    isFinal: false,
  },
  {
    value: 'unconditional_progress',
    label: 'Unconditional Progress',
    description: 'Unconditional Waiver and Release on Progress Payment',
    isConditional: false,
    isFinal: false,
  },
  {
    value: 'conditional_final',
    label: 'Conditional Final',
    description: 'Conditional Waiver and Release on Final Payment',
    isConditional: true,
    isFinal: true,
  },
  {
    value: 'unconditional_final',
    label: 'Unconditional Final',
    description: 'Unconditional Waiver and Release on Final Payment',
    isConditional: false,
    isFinal: true,
  },
];

export const LIEN_WAIVER_STATUSES: Array<{
  value: LienWaiverStatus;
  label: string;
  color: string;
  description: string;
}> = [
  { value: 'pending', label: 'Pending', color: 'gray', description: 'Waiver requested, not yet received' },
  { value: 'draft', label: 'Draft', color: 'gray', description: 'Waiver being prepared' },
  { value: 'sent', label: 'Sent', color: 'blue', description: 'Waiver sent to vendor/sub' },
  { value: 'received', label: 'Received', color: 'yellow', description: 'Waiver received, pending review' },
  { value: 'under_review', label: 'Under Review', color: 'yellow', description: 'Being reviewed' },
  { value: 'approved', label: 'Approved', color: 'green', description: 'Approved and filed' },
  { value: 'rejected', label: 'Rejected', color: 'red', description: 'Rejected, needs correction' },
  { value: 'expired', label: 'Expired', color: 'orange', description: 'Waiver expired (conditional with no payment)' },
  { value: 'void', label: 'Void', color: 'gray', description: 'Voided' },
];

// US States with commonly used lien waiver requirements
export const US_STATES: Array<{
  code: string;
  name: string;
  hasStatutoryForm: boolean;
}> = [
  { code: 'AL', name: 'Alabama', hasStatutoryForm: false },
  { code: 'AK', name: 'Alaska', hasStatutoryForm: false },
  { code: 'AZ', name: 'Arizona', hasStatutoryForm: true },
  { code: 'AR', name: 'Arkansas', hasStatutoryForm: false },
  { code: 'CA', name: 'California', hasStatutoryForm: true },
  { code: 'CO', name: 'Colorado', hasStatutoryForm: false },
  { code: 'CT', name: 'Connecticut', hasStatutoryForm: false },
  { code: 'DE', name: 'Delaware', hasStatutoryForm: false },
  { code: 'FL', name: 'Florida', hasStatutoryForm: false },
  { code: 'GA', name: 'Georgia', hasStatutoryForm: true },
  { code: 'HI', name: 'Hawaii', hasStatutoryForm: false },
  { code: 'ID', name: 'Idaho', hasStatutoryForm: false },
  { code: 'IL', name: 'Illinois', hasStatutoryForm: false },
  { code: 'IN', name: 'Indiana', hasStatutoryForm: false },
  { code: 'IA', name: 'Iowa', hasStatutoryForm: false },
  { code: 'KS', name: 'Kansas', hasStatutoryForm: false },
  { code: 'KY', name: 'Kentucky', hasStatutoryForm: false },
  { code: 'LA', name: 'Louisiana', hasStatutoryForm: false },
  { code: 'ME', name: 'Maine', hasStatutoryForm: false },
  { code: 'MD', name: 'Maryland', hasStatutoryForm: false },
  { code: 'MA', name: 'Massachusetts', hasStatutoryForm: false },
  { code: 'MI', name: 'Michigan', hasStatutoryForm: true },
  { code: 'MN', name: 'Minnesota', hasStatutoryForm: false },
  { code: 'MS', name: 'Mississippi', hasStatutoryForm: true },
  { code: 'MO', name: 'Missouri', hasStatutoryForm: true },
  { code: 'MT', name: 'Montana', hasStatutoryForm: false },
  { code: 'NE', name: 'Nebraska', hasStatutoryForm: false },
  { code: 'NV', name: 'Nevada', hasStatutoryForm: true },
  { code: 'NH', name: 'New Hampshire', hasStatutoryForm: false },
  { code: 'NJ', name: 'New Jersey', hasStatutoryForm: false },
  { code: 'NM', name: 'New Mexico', hasStatutoryForm: false },
  { code: 'NY', name: 'New York', hasStatutoryForm: false },
  { code: 'NC', name: 'North Carolina', hasStatutoryForm: false },
  { code: 'ND', name: 'North Dakota', hasStatutoryForm: false },
  { code: 'OH', name: 'Ohio', hasStatutoryForm: false },
  { code: 'OK', name: 'Oklahoma', hasStatutoryForm: false },
  { code: 'OR', name: 'Oregon', hasStatutoryForm: false },
  { code: 'PA', name: 'Pennsylvania', hasStatutoryForm: false },
  { code: 'RI', name: 'Rhode Island', hasStatutoryForm: false },
  { code: 'SC', name: 'South Carolina', hasStatutoryForm: false },
  { code: 'SD', name: 'South Dakota', hasStatutoryForm: false },
  { code: 'TN', name: 'Tennessee', hasStatutoryForm: false },
  { code: 'TX', name: 'Texas', hasStatutoryForm: true },
  { code: 'UT', name: 'Utah', hasStatutoryForm: true },
  { code: 'VT', name: 'Vermont', hasStatutoryForm: false },
  { code: 'VA', name: 'Virginia', hasStatutoryForm: false },
  { code: 'WA', name: 'Washington', hasStatutoryForm: false },
  { code: 'WV', name: 'West Virginia', hasStatutoryForm: false },
  { code: 'WI', name: 'Wisconsin', hasStatutoryForm: false },
  { code: 'WY', name: 'Wyoming', hasStatutoryForm: true },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Lien Waiver Template
 */
export interface LienWaiverTemplate {
  id: string;
  company_id: string | null;

  // Template identification
  name: string;
  state_code: string;
  waiver_type: LienWaiverType;

  // Template content
  template_content: string;
  legal_language: string | null;
  notarization_required: boolean;

  // Placeholders info
  placeholders: string[];

  // Template metadata
  is_default: boolean;
  is_active: boolean;
  version: number;
  effective_date: string | null;
  expiration_date: string | null;

  // Compliance info
  statute_reference: string | null;
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Lien Waiver
 */
export interface LienWaiver {
  id: string;
  company_id: string;
  project_id: string;

  // Waiver identification
  waiver_number: string;
  waiver_type: LienWaiverType;
  status: LienWaiverStatus;

  // Related entities
  payment_application_id: string | null;
  subcontractor_id: string | null;
  vendor_name: string | null;

  // Template used
  template_id: string | null;

  // Payment information
  through_date: string;
  payment_amount: number;
  check_number: string | null;
  check_date: string | null;

  // Exceptions
  exceptions: string | null;

  // Rendered content
  rendered_content: string | null;

  // Signature tracking
  claimant_name: string | null;
  claimant_title: string | null;
  claimant_company: string | null;
  signature_url: string | null;
  signature_date: string | null;
  signed_at: string | null;

  // Notarization
  notarization_required: boolean;
  notary_name: string | null;
  notary_commission_number: string | null;
  notary_commission_expiration: string | null;
  notarized_at: string | null;
  notarized_document_url: string | null;

  // Document tracking
  document_url: string | null;
  sent_at: string | null;
  sent_to_email: string | null;
  received_at: string | null;

  // Review/Approval
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;

  // Due date tracking
  due_date: string | null;
  reminder_sent_at: string | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Lien Waiver Requirements
 */
export interface LienWaiverRequirement {
  id: string;
  company_id: string;
  project_id: string | null;

  // Requirement configuration
  name: string;
  description: string | null;

  // When required
  required_for_progress_payments: boolean;
  required_for_final_payment: boolean;
  min_payment_threshold: number;

  // Who needs to provide
  requires_contractor_waiver: boolean;
  requires_sub_waivers: boolean;
  requires_supplier_waivers: boolean;

  // Timing
  days_before_payment_due: number;

  // Enforcement
  block_payment_without_waiver: boolean;
  allow_conditional_for_progress: boolean;
  require_unconditional_for_final: boolean;

  // Active flag
  is_active: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Lien Waiver History entry
 */
export interface LienWaiverHistory {
  id: string;
  lien_waiver_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  changed_at: string;
  changed_by: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Lien Waiver with related data
 */
export interface LienWaiverWithDetails extends LienWaiver {
  // Related project
  project?: {
    id: string;
    name: string;
    project_number: string | null;
  } | null;

  // Related subcontractor
  subcontractor?: {
    id: string;
    company_name: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;

  // Related payment application
  payment_application?: {
    id: string;
    application_number: number;
    current_payment_due: number;
  } | null;

  // Template info
  template?: {
    id: string;
    name: string;
    state_code: string;
  } | null;

  // User info
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;

  approved_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;

  // History
  history?: LienWaiverHistory[];
}

/**
 * Missing waiver info (from view)
 */
export interface MissingLienWaiver {
  payment_application_id: string;
  project_id: string;
  application_number: string;
  payment_amount: number;
  application_status: string;
  subcontractor_id: string;
  subcontractor_name: string;
  contact_email: string | null;
  required_waiver_type: LienWaiverType;
  days_before_payment_due: number;
  waiver_due_date: string;
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Lien Waiver Template input
 */
export interface CreateLienWaiverTemplateDTO {
  name: string;
  state_code: string;
  waiver_type: LienWaiverType;
  template_content: string;
  legal_language?: string;
  notarization_required?: boolean;
  placeholders?: string[];
  is_default?: boolean;
  statute_reference?: string;
  notes?: string;
}

/**
 * Update Lien Waiver Template input
 */
export interface UpdateLienWaiverTemplateDTO {
  name?: string;
  template_content?: string;
  legal_language?: string;
  notarization_required?: boolean;
  placeholders?: string[];
  is_default?: boolean;
  is_active?: boolean;
  statute_reference?: string;
  notes?: string;
}

/**
 * Create Lien Waiver input
 */
export interface CreateLienWaiverDTO {
  project_id: string;
  waiver_type: LienWaiverType;
  subcontractor_id?: string;
  vendor_name?: string;
  payment_application_id?: string;
  template_id?: string;
  through_date: string;
  payment_amount: number;
  check_number?: string;
  check_date?: string;
  exceptions?: string;
  claimant_name?: string;
  claimant_title?: string;
  claimant_company?: string;
  due_date?: string;
  notes?: string;
}

/**
 * Update Lien Waiver input
 */
export interface UpdateLienWaiverDTO {
  waiver_type?: LienWaiverType;
  through_date?: string;
  payment_amount?: number;
  check_number?: string;
  check_date?: string;
  exceptions?: string;
  claimant_name?: string;
  claimant_title?: string;
  claimant_company?: string;
  due_date?: string;
  notes?: string;
}

/**
 * Send Waiver Request input
 */
export interface SendWaiverRequestDTO {
  sent_to_email: string;
  message?: string;
}

/**
 * Sign Waiver input
 */
export interface SignWaiverDTO {
  claimant_name: string;
  claimant_title: string;
  claimant_company: string;
  signature_url: string;
  signature_date: string;
}

/**
 * Notarize Waiver input
 */
export interface NotarizeWaiverDTO {
  notary_name: string;
  notary_commission_number: string;
  notary_commission_expiration: string;
  notarized_document_url: string;
}

/**
 * Approve Waiver input
 */
export interface ApproveWaiverDTO {
  review_notes?: string;
}

/**
 * Reject Waiver input
 */
export interface RejectWaiverDTO {
  rejection_reason: string;
}

/**
 * Create Requirement input
 */
export interface CreateLienWaiverRequirementDTO {
  project_id?: string;
  name: string;
  description?: string;
  required_for_progress_payments?: boolean;
  required_for_final_payment?: boolean;
  min_payment_threshold?: number;
  requires_contractor_waiver?: boolean;
  requires_sub_waivers?: boolean;
  requires_supplier_waivers?: boolean;
  days_before_payment_due?: number;
  block_payment_without_waiver?: boolean;
  allow_conditional_for_progress?: boolean;
  require_unconditional_for_final?: boolean;
}

// =============================================
// Filter Types
// =============================================

export interface LienWaiverFilters {
  projectId?: string;
  status?: LienWaiverStatus;
  waiverType?: LienWaiverType;
  subcontractorId?: string;
  paymentApplicationId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface LienWaiverTemplateFilters {
  stateCode?: string;
  waiverType?: LienWaiverType;
  isActive?: boolean;
}

// =============================================
// Statistics Types
// =============================================

/**
 * Project waiver summary
 */
export interface ProjectWaiverSummary {
  total_waivers: number;
  pending_count: number;
  received_count: number;
  approved_count: number;
  missing_count: number;
  overdue_count: number;
  total_waived_amount: number;
}

/**
 * Waiver compliance status
 */
export interface WaiverComplianceStatus {
  project_id: string;
  project_name: string;
  payment_application_id: string | null;
  application_number: string | null;
  total_required: number;
  total_received: number;
  total_approved: number;
  compliance_percent: number;
  is_compliant: boolean;
  blocking_payment: boolean;
}

// =============================================
// Helper Functions
// =============================================

/**
 * Get waiver type label
 */
export function getWaiverTypeLabel(type: LienWaiverType): string {
  return LIEN_WAIVER_TYPES.find(t => t.value === type)?.label || type;
}

/**
 * Get waiver status label
 */
export function getWaiverStatusLabel(status: LienWaiverStatus): string {
  return LIEN_WAIVER_STATUSES.find(s => s.value === status)?.label || status;
}

/**
 * Get waiver status color
 */
export function getWaiverStatusColor(status: LienWaiverStatus): string {
  return LIEN_WAIVER_STATUSES.find(s => s.value === status)?.color || 'gray';
}

/**
 * Check if waiver type is conditional
 */
export function isConditionalWaiver(type: LienWaiverType): boolean {
  return LIEN_WAIVER_TYPES.find(t => t.value === type)?.isConditional ?? false;
}

/**
 * Check if waiver type is final
 */
export function isFinalWaiver(type: LienWaiverType): boolean {
  return LIEN_WAIVER_TYPES.find(t => t.value === type)?.isFinal ?? false;
}

/**
 * Get state name from code
 */
export function getStateName(code: string): string {
  return US_STATES.find(s => s.code === code)?.name || code;
}

/**
 * Check if state has statutory form requirement
 */
export function hasStatutoryForm(stateCode: string): boolean {
  return US_STATES.find(s => s.code === stateCode)?.hasStatutoryForm ?? false;
}

/**
 * Format waiver amount
 */
export function formatWaiverAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Check if waiver is overdue
 */
export function isWaiverOverdue(waiver: LienWaiver): boolean {
  if (!waiver.due_date) {return false;}
  if (waiver.status === 'approved' || waiver.status === 'void') {return false;}
  return new Date(waiver.due_date) < new Date();
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
