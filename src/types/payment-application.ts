/**
 * Payment Application Types
 * Types for AIA G702/G703 Payment Applications and Schedule of Values
 * Aligned with migration 068_payment_applications.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type PaymentApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'void';

export const PAYMENT_APPLICATION_STATUSES: Array<{
  value: PaymentApplicationStatus;
  label: string;
  color: string;
  description: string;
}> = [
  { value: 'draft', label: 'Draft', color: 'gray', description: 'Application being prepared' },
  { value: 'submitted', label: 'Submitted', color: 'blue', description: 'Submitted for review' },
  { value: 'under_review', label: 'Under Review', color: 'yellow', description: 'Being reviewed by architect/owner' },
  { value: 'approved', label: 'Approved', color: 'green', description: 'Approved for payment' },
  { value: 'rejected', label: 'Rejected', color: 'red', description: 'Rejected - corrections needed' },
  { value: 'paid', label: 'Paid', color: 'emerald', description: 'Payment received' },
  { value: 'void', label: 'Void', color: 'gray', description: 'Application voided' },
];

// Standard retainage percentages
export const RETAINAGE_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Payment Application - AIA G702 header
 */
export interface PaymentApplication {
  id: string;
  project_id: string;
  company_id: string;

  // Application Identification
  application_number: number;
  period_to: string;  // Date string

  // Contract Information (G702 Header)
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;  // Computed: original + net changes

  // Work Completed (from SOV totals)
  total_completed_previous: number;
  total_completed_this_period: number;
  total_materials_stored: number;
  total_completed_and_stored: number;  // Computed

  // Retainage
  retainage_percent: number;
  retainage_from_completed: number;
  retainage_from_stored: number;
  total_retainage: number;  // Computed
  retainage_release: number;

  // Payment Calculation
  total_earned_less_retainage: number;  // Computed
  less_previous_certificates: number;
  current_payment_due: number;  // Computed

  // Balance and Percent
  balance_to_finish: number;  // Computed
  percent_complete: number;  // Computed

  // Status
  status: PaymentApplicationStatus;

  // Submission/Approval Info
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  payment_received_amount: number | null;
  payment_reference: string | null;

  // Signatures
  contractor_signature_url: string | null;
  contractor_signature_date: string | null;
  architect_signature_url: string | null;
  architect_signature_date: string | null;
  owner_signature_url: string | null;
  owner_signature_date: string | null;

  // Notes
  notes: string | null;
  rejection_reason: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Schedule of Values Item - AIA G703 line item
 */
export interface ScheduleOfValuesItem {
  id: string;
  payment_application_id: string;

  // Item Identification
  item_number: string;
  description: string;

  // Cost Code Reference
  cost_code_id: string | null;
  cost_code: string | null;

  // Scheduled Value
  scheduled_value: number;
  change_order_adjustments: number;
  total_scheduled_value: number;  // Computed

  // Work Completed
  work_completed_previous: number;
  work_completed_this_period: number;
  materials_stored: number;
  total_completed_stored: number;  // Computed

  // Percent and Balance
  percent_complete: number;  // Computed
  balance_to_finish: number;  // Computed

  // Retainage
  retainage_percent: number | null;
  retainage_amount: number | null;

  // Sort Order
  sort_order: number;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Payment Application History entry
 */
export interface PaymentApplicationHistory {
  id: string;
  payment_application_id: string;
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
 * Payment Application with project info and SOV items
 */
export interface PaymentApplicationWithDetails extends PaymentApplication {
  // Display fields
  display_number: string;  // "App #1"
  sov_item_count: number;

  // Project info
  project?: {
    id: string;
    name: string;
    project_number: string | null;
  } | null;

  // Related data
  sov_items?: ScheduleOfValuesItem[];
  history?: PaymentApplicationHistory[];

  // User info
  submitted_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  approved_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

/**
 * Schedule of Values item with cost code details
 */
export interface SOVItemWithCostCode extends ScheduleOfValuesItem {
  cost_code_details?: {
    id: string;
    code: string;
    name: string;
    division: string | null;
  } | null;
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Payment Application input
 */
export interface CreatePaymentApplicationDTO {
  project_id: string;
  period_to: string;
  original_contract_sum: number;
  net_change_orders?: number;
  retainage_percent?: number;
  notes?: string;
}

/**
 * Update Payment Application input
 */
export interface UpdatePaymentApplicationDTO {
  period_to?: string;
  original_contract_sum?: number;
  net_change_orders?: number;
  retainage_percent?: number;
  retainage_release?: number;
  less_previous_certificates?: number;
  notes?: string;
  contractor_signature_url?: string;
  contractor_signature_date?: string;
}

/**
 * Submit Payment Application
 */
export interface SubmitPaymentApplicationDTO {
  contractor_signature_url?: string;
  contractor_signature_date?: string;
  notes?: string;
}

/**
 * Approve Payment Application
 */
export interface ApprovePaymentApplicationDTO {
  architect_signature_url?: string;
  architect_signature_date?: string;
  owner_signature_url?: string;
  owner_signature_date?: string;
  notes?: string;
}

/**
 * Reject Payment Application
 */
export interface RejectPaymentApplicationDTO {
  rejection_reason: string;
}

/**
 * Mark Payment Application as Paid
 */
export interface MarkPaidDTO {
  payment_received_amount: number;
  payment_reference?: string;
  paid_at?: string;
}

/**
 * Create SOV Item input
 */
export interface CreateSOVItemDTO {
  payment_application_id: string;
  item_number: string;
  description: string;
  cost_code_id?: string;
  cost_code?: string;
  scheduled_value: number;
  change_order_adjustments?: number;
  work_completed_previous?: number;
  work_completed_this_period?: number;
  materials_stored?: number;
  retainage_percent?: number;
  sort_order?: number;
  notes?: string;
}

/**
 * Update SOV Item input
 */
export interface UpdateSOVItemDTO {
  item_number?: string;
  description?: string;
  cost_code_id?: string;
  cost_code?: string;
  scheduled_value?: number;
  change_order_adjustments?: number;
  work_completed_previous?: number;
  work_completed_this_period?: number;
  materials_stored?: number;
  retainage_percent?: number;
  sort_order?: number;
  notes?: string;
}

/**
 * Bulk update SOV items (for spreadsheet-like editing)
 */
export interface BulkUpdateSOVItemDTO {
  id: string;
  work_completed_this_period?: number;
  materials_stored?: number;
  notes?: string;
}

// =============================================
// Filter Types
// =============================================

export interface PaymentApplicationFilters {
  projectId: string;
  status?: PaymentApplicationStatus;
  dateFrom?: string;
  dateTo?: string;
}

// =============================================
// Statistics Types
// =============================================

/**
 * Project payment summary
 */
export interface ProjectPaymentSummary {
  total_applications: number;
  total_billed: number;
  total_received: number;
  total_outstanding: number;
  total_retainage_held: number;
  last_application_date: string | null;
  last_payment_date: string | null;
  percent_billed: number;
}

/**
 * Payment application stats for dashboard
 */
export interface PaymentApplicationStats {
  draft_count: number;
  submitted_count: number;
  under_review_count: number;
  approved_count: number;
  paid_count: number;
  total_pending_amount: number;
  total_paid_amount: number;
}

// =============================================
// Form Types
// =============================================

/**
 * Payment Application form data
 */
export interface PaymentApplicationFormData {
  period_to: string;
  original_contract_sum: string;
  net_change_orders: string;
  retainage_percent: string;
  retainage_release: string;
  less_previous_certificates: string;
  notes: string;
}

/**
 * SOV Item form data (for inline editing)
 */
export interface SOVItemFormData {
  item_number: string;
  description: string;
  cost_code: string;
  scheduled_value: string;
  change_order_adjustments: string;
  work_completed_previous: string;
  work_completed_this_period: string;
  materials_stored: string;
  notes: string;
}

// =============================================
// PDF Generation Types
// =============================================

/**
 * G702 PDF data
 */
export interface G702PDFData {
  application: PaymentApplicationWithDetails;
  project: {
    name: string;
    number: string | null;
    address: string | null;
  };
  contractor: {
    name: string;
    address: string | null;
  };
  architect: {
    name: string | null;
  };
  owner: {
    name: string | null;
  };
}

/**
 * G703 PDF data
 */
export interface G703PDFData {
  application: PaymentApplicationWithDetails;
  items: ScheduleOfValuesItem[];
  totals: {
    scheduled_value: number;
    work_completed_previous: number;
    work_completed_this_period: number;
    materials_stored: number;
    total_completed_stored: number;
    balance_to_finish: number;
    retainage: number;
  };
}
