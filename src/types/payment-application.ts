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
  projectId: string;
  gcCompany?: import('@/lib/utils/pdfBranding').CompanyInfo;
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
  projectId: string;
  gcCompany?: import('@/lib/utils/pdfBranding').CompanyInfo;
}

// =============================================
// Payment Aging Types
// =============================================

/**
 * Aging bucket periods
 */
export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export const AGING_BUCKETS: Array<{
  key: AgingBucket;
  label: string;
  minDays: number;
  maxDays: number | null;
  color: string;
}> = [
  { key: 'current', label: 'Current', minDays: 0, maxDays: 0, color: 'green' },
  { key: '1-30', label: '1-30 Days', minDays: 1, maxDays: 30, color: 'blue' },
  { key: '31-60', label: '31-60 Days', minDays: 31, maxDays: 60, color: 'yellow' },
  { key: '61-90', label: '61-90 Days', minDays: 61, maxDays: 90, color: 'orange' },
  { key: '90+', label: '90+ Days', minDays: 91, maxDays: null, color: 'red' },
];

/**
 * Individual receivable item for aging
 */
export interface AgingReceivable {
  id: string;
  project_id: string;
  project_name: string;
  project_number: string | null;
  application_number: number;
  display_number: string;
  period_to: string;
  submitted_at: string | null;
  approved_at: string | null;
  status: PaymentApplicationStatus;
  amount_due: number;
  amount_received: number;
  amount_outstanding: number;
  retainage_held: number;
  days_outstanding: number;
  aging_bucket: AgingBucket;
}

/**
 * Aging bucket totals
 */
export interface AgingBucketSummary {
  bucket: AgingBucket;
  label: string;
  count: number;
  amount: number;
  percent: number;
}

/**
 * Complete aging report
 */
export interface PaymentAgingReport {
  as_of_date: string;
  company_id: string;

  // Summary totals
  total_outstanding: number;
  total_retainage: number;
  total_receivables: number;

  // Bucket breakdown
  buckets: AgingBucketSummary[];

  // Detailed items
  receivables: AgingReceivable[];

  // Metrics
  average_days_outstanding: number;
  weighted_average_days: number;
  oldest_receivable_days: number;

  // By project summary
  by_project: ProjectAgingSummary[];
}

/**
 * Project-level aging summary
 */
export interface ProjectAgingSummary {
  project_id: string;
  project_name: string;
  project_number: string | null;
  total_outstanding: number;
  total_retainage: number;
  application_count: number;
  oldest_days: number;
  average_days: number;
  buckets: {
    current: number;
    '1-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

/**
 * Aging alert thresholds
 */
export interface AgingAlertConfig {
  warn_at_days: number;  // Show warning
  critical_at_days: number;  // Show critical
  auto_escalate_at_days: number;  // Auto-create escalation
  escalate_to_role: string;  // Role to notify
}

export const DEFAULT_AGING_ALERT_CONFIG: AgingAlertConfig = {
  warn_at_days: 30,
  critical_at_days: 60,
  auto_escalate_at_days: 90,
  escalate_to_role: 'project_manager',
};

/**
 * Aging alert
 */
export interface AgingAlert {
  id: string;
  receivable: AgingReceivable;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

/**
 * DSO (Days Sales Outstanding) metrics
 */
export interface DSOMetrics {
  current_dso: number;  // Current DSO
  target_dso: number;  // Target DSO
  trend: 'improving' | 'stable' | 'worsening';
  trend_change_days: number;  // Change from last period
  historical: Array<{
    period: string;
    dso: number;
  }>;
}

/**
 * Cash flow forecast item
 */
export interface CashFlowForecastItem {
  date: string;
  expected_receipts: number;
  confidence: 'high' | 'medium' | 'low';
  source_applications: string[];  // Application IDs
}

/**
 * Payment aging dashboard data
 */
export interface PaymentAgingDashboard {
  report: PaymentAgingReport;
  alerts: AgingAlert[];
  dso_metrics: DSOMetrics;
  forecast: CashFlowForecastItem[];
}
