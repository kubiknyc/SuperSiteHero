/**
 * Subcontractor Portal Types
 * Types for the subcontractor portal feature including access control,
 * compliance documents, invitations, and dashboard data.
 */

// =============================================
// ENUMS & CONSTANTS
// =============================================

export type SubcontractorRole = 'subcontractor';

export type ComplianceDocumentType =
  | 'insurance_certificate'
  | 'license'
  | 'w9'
  | 'bond'
  | 'safety_cert'
  | 'other';

export type ComplianceDocumentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'cancelled';

export type BidStatus =
  | 'pending'
  | 'draft'
  | 'submitted'
  | 'awarded'
  | 'rejected'
  | 'declined';

export type PunchItemStatus =
  | 'open'
  | 'in_progress'
  | 'ready_for_review'
  | 'completed'
  | 'verified'
  | 'rejected';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// =============================================
// PORTAL ACCESS
// =============================================

export interface SubcontractorPortalAccess {
  id: string;
  subcontractor_id: string;
  user_id: string;
  project_id: string;

  // Permissions
  can_view_scope: boolean;
  can_view_documents: boolean;
  can_submit_bids: boolean;
  can_view_schedule: boolean;
  can_update_punch_items: boolean;
  can_update_tasks: boolean;
  can_upload_documents: boolean;
  can_view_daily_reports: boolean;

  // Invitation tracking
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string | null;

  // Status
  is_active: boolean;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface SubcontractorPortalAccessWithRelations extends SubcontractorPortalAccess {
  subcontractor?: SubcontractorBasic;
  user?: UserBasic;
  project?: ProjectBasic;
  invited_by_user?: UserBasic;
}

export interface CreatePortalAccessDTO {
  subcontractor_id: string;
  user_id: string;
  project_id: string;
  can_view_scope?: boolean;
  can_view_documents?: boolean;
  can_submit_bids?: boolean;
  can_view_schedule?: boolean;
  can_update_punch_items?: boolean;
  can_update_tasks?: boolean;
  can_upload_documents?: boolean;
  can_view_daily_reports?: boolean;
  expires_at?: string;
}

export interface UpdatePortalAccessDTO {
  can_view_scope?: boolean;
  can_view_documents?: boolean;
  can_submit_bids?: boolean;
  can_view_schedule?: boolean;
  can_update_punch_items?: boolean;
  can_update_tasks?: boolean;
  can_upload_documents?: boolean;
  can_view_daily_reports?: boolean;
  is_active?: boolean;
  expires_at?: string | null;
}

// =============================================
// COMPLIANCE DOCUMENTS
// =============================================

export interface SubcontractorComplianceDocument {
  id: string;
  subcontractor_id: string;
  project_id: string | null;

  // Document info
  document_type: ComplianceDocumentType;
  document_name: string;
  description: string | null;

  // File storage
  file_url: string;
  file_size: number | null;
  mime_type: string | null;

  // Expiration tracking
  issue_date: string | null;
  expiration_date: string | null;
  is_expired: boolean;
  expiration_warning_sent: boolean;

  // Coverage details (for insurance)
  coverage_amount: number | null;
  policy_number: string | null;
  provider_name: string | null;

  // Status
  status: ComplianceDocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_notes: string | null;

  // Audit
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ComplianceDocumentWithRelations extends SubcontractorComplianceDocument {
  subcontractor?: SubcontractorBasic;
  project?: ProjectBasic;
  reviewed_by_user?: UserBasic;
  uploaded_by_user?: UserBasic;
}

export interface CreateComplianceDocumentDTO {
  subcontractor_id: string;
  project_id?: string;
  document_type: ComplianceDocumentType;
  document_name: string;
  description?: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  issue_date?: string;
  expiration_date?: string;
  coverage_amount?: number;
  policy_number?: string;
  provider_name?: string;
}

export interface UpdateComplianceDocumentDTO {
  document_name?: string;
  description?: string;
  issue_date?: string;
  expiration_date?: string;
  coverage_amount?: number;
  policy_number?: string;
  provider_name?: string;
  status?: ComplianceDocumentStatus;
  rejection_notes?: string;
}

export interface ExpiringDocument {
  id: string;
  subcontractor_id: string;
  document_type: ComplianceDocumentType;
  document_name: string;
  expiration_date: string;
  days_until_expiration: number;
  contact_email: string;
}

// =============================================
// INVITATIONS
// =============================================

export interface SubcontractorInvitation {
  id: string;
  subcontractor_id: string;
  project_id: string;

  // Invitation details
  email: string;
  token: string;

  // Status
  status: InvitationStatus;

  // Timestamps
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface InvitationWithRelations extends SubcontractorInvitation {
  subcontractor?: SubcontractorBasic;
  project?: ProjectBasic;
  invited_by_user?: UserBasic;
}

export interface CreateInvitationDTO {
  subcontractor_id: string;
  project_id: string;
  email: string;
}

// =============================================
// SUBCONTRACTOR BIDS (Enhanced)
// =============================================

export interface SubcontractorBid {
  id: string;
  project_id: string;
  subcontractor_id: string;
  workflow_item_id: string;

  // Bid details
  bid_status: BidStatus;
  lump_sum_cost: number | null;
  duration_days: number | null;
  notes: string | null;
  exclusions: string | null;

  // Submission
  submitted_at: string | null;
  submitted_by: string | null;

  // Award
  is_awarded: boolean;
  awarded_at: string | null;
  awarded_by: string | null;

  // Supporting documents
  supporting_documents: string[] | null;

  // Audit
  created_at: string;
  updated_at: string;
}

export interface BidWithRelations extends SubcontractorBid {
  subcontractor?: SubcontractorBasic;
  project?: ProjectBasic;
  workflow_item?: WorkflowItemBasic;
}

export interface SubmitBidDTO {
  lump_sum_cost: number;
  duration_days: number;
  notes?: string;
  exclusions?: string;
  supporting_documents?: string[];
}

export interface DeclineBidDTO {
  reason?: string;
}

// =============================================
// SUBCONTRACTOR ITEMS (Punch Items & Tasks)
// =============================================

export interface SubcontractorPunchItem {
  id: string;
  project_id: string;
  subcontractor_id: string | null;

  // Item details
  title: string;
  trade: string | null;
  description: string | null;
  priority: 'low' | 'normal' | 'high' | null;  // Allow null from database
  status: PunchItemStatus;

  // Location
  building: string | null;
  floor: string | null;
  room: string | null;
  area: string | null;
  location_notes: string | null;

  // Dates
  due_date: string | null;
  completed_date: string | null;

  // Workflow
  marked_complete_by: string | null;
  marked_complete_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_notes: string | null;

  // Photos
  photo_count?: number;

  // Audit
  created_at: string;
  created_by: string | null;
}

export interface SubcontractorTask {
  id: string;
  project_id: string;
  assigned_to_subcontractor_id: string | null;

  // Task details
  title: string;
  description: string | null;
  location: string | null;
  priority: 'low' | 'normal' | 'high' | null;  // Allow null from database
  status: TaskStatus;

  // Dates
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;

  // Audit
  created_at: string;
  created_by: string | null;
}

export interface UpdateItemStatusDTO {
  status: PunchItemStatus | TaskStatus;
  notes?: string;
}

// =============================================
// DASHBOARD & STATS
// =============================================

export interface SubcontractorStats {
  total_projects: number;
  pending_bids: number;
  open_punch_items: number;
  open_tasks: number;
  expiring_documents: number;
  overdue_items: number;
}

export interface SubcontractorProject {
  id: string;
  name: string;
  address: string | null;
  status: string;

  // Subcontractor-specific data
  trade: string;
  scope_of_work: string | null;
  contract_amount: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;

  // Counts
  punch_item_count: number;
  task_count: number;
  pending_bid_count: number;

  // Access
  permissions: SubcontractorPermissions;
}

export interface SubcontractorPermissions {
  can_view_scope: boolean;
  can_view_documents: boolean;
  can_submit_bids: boolean;
  can_view_schedule: boolean;
  can_update_punch_items: boolean;
  can_update_tasks: boolean;
  can_upload_documents: boolean;
}

export interface SubcontractorDashboardData {
  subcontractor: SubcontractorBasic;
  stats: SubcontractorStats;
  projects: SubcontractorProject[];
  pending_bids: BidWithRelations[];
  recent_punch_items: SubcontractorPunchItem[];
  recent_tasks: SubcontractorTask[];
  expiring_documents: ExpiringDocument[];
}

// =============================================
// BASIC TYPES (for relations)
// =============================================

export interface SubcontractorBasic {
  id: string;
  company_name: string;
  trade: string;
  contact_id: string | null;
}

export interface UserBasic {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name?: string;
}

export interface ProjectBasic {
  id: string;
  name: string;
  address: string | null;
  status: string;
}

export interface WorkflowItemBasic {
  id: string;
  title: string;
  item_number: number | null;
  workflow_type: string;
  status: string;
  description?: string | null;  // Add description field
}

// =============================================
// FILTERS & QUERIES
// =============================================

export interface SubcontractorItemsFilter {
  project_id?: string;
  status?: string | string[];
  priority?: string | string[];
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

export interface ComplianceDocumentsFilter {
  subcontractor_id?: string;
  project_id?: string;
  document_type?: ComplianceDocumentType | ComplianceDocumentType[];
  status?: ComplianceDocumentStatus | ComplianceDocumentStatus[];
  expiring_within_days?: number;
}

export interface BidsFilter {
  project_id?: string;
  status?: BidStatus | BidStatus[];
  subcontractor_id?: string;
}

// =============================================
// API RESPONSES
// =============================================

export interface SubcontractorPortalApiResponse<T> {
  data: T;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// =============================================
// INVITATION ACCEPTANCE
// =============================================

export interface AcceptInvitationDTO {
  token: string;
  password?: string; // If new user needs to set password
}

export interface InvitationValidation {
  is_valid: boolean;
  invitation?: SubcontractorInvitation;
  subcontractor?: SubcontractorBasic;
  project?: ProjectBasic;
  error?: string;
}

// =============================================
// LIEN WAIVER TYPES (Subcontractor Portal)
// =============================================

export type SubcontractorLienWaiverType =
  | 'conditional_progress'
  | 'unconditional_progress'
  | 'conditional_final'
  | 'unconditional_final';

export type SubcontractorLienWaiverStatus =
  | 'pending'
  | 'sent'
  | 'received'
  | 'under_review'
  | 'approved'
  | 'rejected';

/**
 * Lien waiver as viewed by subcontractor in the portal
 */
export interface SubcontractorLienWaiver {
  id: string;
  waiver_number: string;
  waiver_type: SubcontractorLienWaiverType;
  status: SubcontractorLienWaiverStatus;

  // Payment details
  payment_application_id: string | null;
  payment_application_number: string | null;
  payment_amount: number;
  through_date: string;

  // Dates
  due_date: string | null;
  sent_at: string | null;
  received_at: string | null;
  signed_at: string | null;

  // Project/subcontractor info
  project_id: string;
  project_name: string;
  subcontractor_id: string;

  // Signature info
  signed_by_name: string | null;
  signed_by_title: string | null;
  signature_url: string | null;

  // Document
  document_url: string | null;

  // Notes
  notes: string | null;
  rejection_reason: string | null;

  created_at: string;
  updated_at: string;
}

export interface SubcontractorLienWaiverFilters {
  project_id?: string;
  status?: SubcontractorLienWaiverStatus | SubcontractorLienWaiverStatus[];
  waiver_type?: SubcontractorLienWaiverType | SubcontractorLienWaiverType[];
}

export interface SignLienWaiverDTO {
  signed_by_name: string;
  signed_by_title: string;
  signature_url?: string; // Base64 or URL to uploaded signature
  notary_name?: string;
  notary_date?: string;
}

export interface LienWaiverSummary {
  pending_count: number;
  awaiting_signature_count: number;
  signed_count: number;
  approved_count: number;
  total_waived_amount: number;
  overdue_count: number;
}

// =============================================
// RETAINAGE TRACKING TYPES
// =============================================

/**
 * Subcontract with retainage tracking info
 */
export interface SubcontractorRetainageInfo {
  id: string;
  contract_number: string;
  project_id: string;
  project_name: string;

  // Contract values
  original_contract_value: number;
  current_contract_value: number;
  approved_change_orders: number;

  // Billing progress
  total_billed: number;
  total_paid: number;
  percent_complete: number;

  // Retainage
  retention_percent: number;
  retention_held: number;
  retention_released: number;
  retention_balance: number;

  // Release milestones
  substantial_completion_date: string | null;
  final_completion_date: string | null;
  warranty_expiration_date: string | null;

  // Lien waiver status
  pending_lien_waivers: number;

  // Status
  status: 'active' | 'substantial_completion' | 'final_completion' | 'closed';

  created_at: string;
  updated_at: string;
}

export interface RetainageRelease {
  id: string;
  subcontract_id: string;
  release_type: 'partial' | 'substantial_completion' | 'final';
  amount: number;
  release_date: string;
  approved_by: string | null;
  approved_by_name: string | null;
  notes: string | null;
  lien_waiver_required: boolean;
  lien_waiver_received: boolean;
  lien_waiver_id: string | null;
  status: 'pending' | 'approved' | 'released' | 'rejected';
  created_at: string;
}

export interface RetainageSummary {
  total_contracts: number;
  total_retention_held: number;
  total_retention_released: number;
  total_retention_balance: number;
  pending_releases: number;
  contracts_at_substantial: number;
  contracts_at_final: number;
}

// =============================================
// INSURANCE ENDORSEMENT VERIFICATION TYPES (P0-3)
// =============================================

export type InsuranceType =
  | 'general_liability'
  | 'auto_liability'
  | 'workers_compensation'
  | 'umbrella'
  | 'professional_liability'
  | 'builders_risk'
  | 'pollution'
  | 'cyber'
  | 'other';

export type EndorsementStatus = 'required' | 'verified' | 'missing' | 'not_required';

/**
 * Individual endorsement requirement and status
 */
export interface EndorsementRequirement {
  type: 'additional_insured' | 'waiver_of_subrogation' | 'primary_noncontributory';
  required: boolean;
  verified: boolean;
  status: EndorsementStatus;
  additional_insured_name?: string | null;
}

/**
 * Insurance certificate with endorsement verification for subcontractor view
 */
export interface SubcontractorInsuranceCertificate {
  id: string;
  certificate_number: string | null;
  insurance_type: InsuranceType;
  carrier_name: string;
  policy_number: string;

  // Dates
  effective_date: string;
  expiration_date: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'pending_renewal' | 'void';

  // Coverage Limits
  each_occurrence_limit: number | null;
  general_aggregate_limit: number | null;
  products_completed_ops_limit: number | null;
  combined_single_limit: number | null;
  umbrella_each_occurrence: number | null;
  umbrella_aggregate: number | null;
  workers_comp_el_each_accident: number | null;

  // Endorsement Status
  endorsements: EndorsementRequirement[];
  has_all_required_endorsements: boolean;
  missing_endorsements: string[];

  // Project association
  project_id: string | null;
  project_name: string | null;

  // Document
  certificate_url: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Project-specific insurance requirements for subcontractor view
 */
export interface SubcontractorInsuranceRequirement {
  id: string;
  project_id: string;
  project_name: string;
  insurance_type: InsuranceType;

  // Minimum coverage amounts
  min_each_occurrence: number | null;
  min_general_aggregate: number | null;
  min_umbrella: number | null;

  // Required endorsements
  additional_insured_required: boolean;
  waiver_of_subrogation_required: boolean;
  primary_noncontributory_required: boolean;

  // Compliance status for this subcontractor
  is_compliant: boolean;
  compliance_gap: string | null;
  matching_certificate_id: string | null;
}

/**
 * Overall insurance compliance summary for subcontractor
 */
export interface SubcontractorInsuranceComplianceSummary {
  is_fully_compliant: boolean;
  compliance_score: number; // 0-100

  // Certificates
  total_certificates: number;
  active_certificates: number;
  expiring_soon_count: number;
  expired_count: number;

  // Endorsement Status
  endorsement_summary: {
    additional_insured: {
      required_count: number;
      verified_count: number;
      missing_count: number;
    };
    waiver_of_subrogation: {
      required_count: number;
      verified_count: number;
      missing_count: number;
    };
    primary_noncontributory: {
      required_count: number;
      verified_count: number;
      missing_count: number;
    };
  };

  // Gaps
  missing_insurance_types: InsuranceType[];
  insufficient_coverage: {
    insurance_type: InsuranceType;
    required_amount: number;
    current_amount: number;
    gap_description: string;
  }[];
  missing_endorsement_certificates: {
    certificate_id: string;
    insurance_type: InsuranceType;
    missing_endorsements: string[];
  }[];

  // Payment Impact
  payment_hold_active: boolean;
  payment_hold_reason: string | null;
}

// =============================================
// ASSIGNMENT TYPES (For MyAssignments tabs)
// =============================================

/**
 * RFI assigned to subcontractor (ball in their court)
 */
export interface SubcontractorRFI {
  id: string;
  rfi_number: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'open' | 'responded' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'critical' | null;
  due_date: string | null;
  project_id: string;
  project_name: string;
  ball_in_court_role: string | null;
  ball_in_court_user_id: string | null;
  assigned_to_user_id: string | null;
  question: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Document shared with subcontractor
 */
export interface SubcontractorDocument {
  id: string;
  document_id: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
  file_url: string;
  category: string | null;
  project_id: string;
  project_name: string;
  shared_at: string;
  shared_by_name: string | null;
  can_download: boolean;
  can_edit: boolean;
  expires_at: string | null;
}

/**
 * Payment application for subcontractor
 */
export interface SubcontractorPayment {
  id: string;
  application_number: string | null;
  period_from: string | null;
  period_to: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  scheduled_value: number | null;
  work_completed_to_date: number | null;
  previous_payments: number | null;
  current_payment_due: number | null;
  retainage_held: number | null;
  project_id: string;
  project_name: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
}

// =============================================
// PAY APPLICATION LINE ITEMS (P1)
// =============================================

export type PayApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'void';

/**
 * Pay application with detailed line items (Schedule of Values / G703)
 */
export interface SubcontractorPayApplication {
  id: string;
  application_number: number;
  period_to: string;

  // Project info
  project_id: string;
  project_name: string;
  project_address: string | null;

  // Contract info
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;

  // Work completed totals
  total_completed_previous: number;
  total_completed_this_period: number;
  total_materials_stored: number;
  total_completed_and_stored: number;

  // Retainage
  retainage_percent: number;
  retainage_from_completed: number;
  retainage_from_stored: number;
  total_retainage: number;
  retainage_release: number;

  // Payment
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;

  // Balance & Percent
  balance_to_finish: number;
  percent_complete: number;

  // Status
  status: PayApplicationStatus;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_received_amount: number | null;
  payment_reference: string | null;
  rejection_reason: string | null;

  // Line items
  line_items: SubcontractorPayAppLineItem[];

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Individual line item (Schedule of Values item / G703 row)
 */
export interface SubcontractorPayAppLineItem {
  id: string;
  item_number: string;
  description: string;

  // Cost code
  cost_code: string | null;
  cost_code_id: string | null;

  // Scheduled value
  scheduled_value: number;
  change_order_adjustments: number;
  total_scheduled_value: number;

  // Work completed
  work_completed_previous: number;
  work_completed_this_period: number;
  materials_stored: number;
  total_completed_stored: number;

  // Completion
  percent_complete: number;
  balance_to_finish: number;

  // Retainage
  retainage_percent: number | null;
  retainage_amount: number;

  // Display
  sort_order: number;
  notes: string | null;
}

/**
 * Summary of pay applications for dashboard
 */
export interface PayApplicationSummary {
  total_applications: number;
  total_billed: number;
  total_received: number;
  total_outstanding: number;
  total_retainage_held: number;
  pending_approval_count: number;
  pending_approval_amount: number;
}

// =============================================
// CHANGE ORDER IMPACT DISPLAY (P1-2)
// =============================================

export type ChangeOrderStatus =
  | 'draft'
  | 'pending_estimate'
  | 'estimate_complete'
  | 'pending_internal_approval'
  | 'internally_approved'
  | 'pending_owner_review'
  | 'approved'
  | 'rejected'
  | 'void';

export type ChangeOrderType =
  | 'scope_change'
  | 'design_clarification'
  | 'unforeseen_condition'
  | 'owner_request'
  | 'value_engineering'
  | 'error_omission';

/**
 * Change order as viewed by subcontractor in the portal
 */
export interface SubcontractorChangeOrder {
  id: string;
  pco_number: number | null;
  co_number: number | null;
  is_pco: boolean;
  title: string;
  description: string | null;
  change_type: ChangeOrderType;
  status: ChangeOrderStatus;

  // Project info
  project_id: string;
  project_name: string;

  // Amounts
  proposed_amount: number;
  approved_amount: number | null;

  // Time impact
  proposed_days: number | null;
  approved_days: number | null;

  // Contract impact
  original_contract_amount: number | null;
  previous_changes_amount: number | null;
  revised_contract_amount: number | null;

  // Workflow dates
  created_at: string;
  submitted_at: string | null;
  internally_approved_at: string | null;
  owner_approved_at: string | null;

  // Line items summary
  line_item_count: number;

  // Related items
  related_rfi_number: string | null;
  related_submittal_number: string | null;

  // Notes
  justification: string | null;
  owner_comments: string | null;
  rejection_reason: string | null;
}

/**
 * Change order line item for subcontractor view
 */
export interface SubcontractorChangeOrderItem {
  id: string;
  item_number: number;
  description: string;
  cost_code: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;

  // Cost breakdown
  labor_amount: number;
  material_amount: number;
  equipment_amount: number;
  subcontract_amount: number;
  other_amount: number;
  markup_percent: number | null;
  markup_amount: number;
  total_amount: number;

  notes: string | null;
}

/**
 * Summary of change orders for subcontractor dashboard
 */
export interface ChangeOrderSummary {
  total_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_proposed_amount: number;
  total_approved_amount: number;
  net_contract_impact: number;
  total_days_impact: number;
}

// =============================================
// SCHEDULE NOTIFICATIONS (P1-3)
// =============================================

export type ScheduleActivityStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'delayed'
  | 'cancelled';

/**
 * Schedule activity as viewed by subcontractor
 */
export interface SubcontractorScheduleActivity {
  id: string;
  activity_id: string | null;
  activity_name: string;
  wbs_code: string | null;

  // Project info
  project_id: string;
  project_name: string;

  // Dates
  planned_start: string | null;
  planned_finish: string | null;
  actual_start: string | null;
  actual_finish: string | null;
  baseline_start: string | null;
  baseline_finish: string | null;

  // Status
  status: ScheduleActivityStatus;
  percent_complete: number;

  // Variance (days)
  start_variance: number | null;
  finish_variance: number | null;

  // Flags
  is_milestone: boolean;
  is_critical: boolean;
  is_on_critical_path: boolean;
  is_overdue: boolean;
  is_upcoming: boolean;

  // Assignment
  responsible_party: string | null;

  // Notes
  notes: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Schedule change notification for subcontractor
 */
export interface ScheduleChangeNotification {
  id: string;
  activity_id: string;
  activity_name: string;
  project_id: string;
  project_name: string;

  // Change details
  change_type: 'date_change' | 'status_change' | 'delay' | 'assignment' | 'completion';
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string;

  // Impact
  days_impact: number | null;
  is_critical_path_impact: boolean;

  // Timestamp
  changed_at: string;
  changed_by_name: string | null;

  // Read status
  is_read: boolean;
}

/**
 * Summary of schedule for subcontractor dashboard
 */
export interface ScheduleSummary {
  total_activities: number;
  activities_this_week: number;
  overdue_count: number;
  delayed_count: number;
  on_critical_path_count: number;
  upcoming_milestones: number;
  percent_complete_avg: number;
  unread_changes: number;
}

// =============================================
// P1-4: SAFETY COMPLIANCE DASHBOARD
// =============================================

/**
 * Safety incident severity levels for display
 */
export type SafetyIncidentSeverity = 'near_miss' | 'first_aid' | 'medical_treatment' | 'lost_time' | 'fatality';

/**
 * Safety incident status for display
 */
export type SafetyIncidentStatus = 'reported' | 'under_investigation' | 'corrective_actions' | 'closed';

/**
 * A safety incident involving the subcontractor
 */
export interface SubcontractorSafetyIncident {
  id: string;
  incident_number: string;
  project_id: string;
  project_name: string;

  // Incident details
  incident_date: string;
  incident_time: string | null;
  location: string | null;
  severity: SafetyIncidentSeverity;
  status: SafetyIncidentStatus;
  type: string;

  // Description
  title: string;
  description: string;

  // OSHA recordability
  is_osha_recordable: boolean;

  // Impact
  days_away: number;
  days_restricted: number;

  // Timestamps
  reported_at: string;
  closed_at: string | null;
}

/**
 * A corrective action assigned to the subcontractor
 */
export interface SubcontractorCorrectiveAction {
  id: string;
  incident_id: string;
  incident_number: string;
  project_id: string;
  project_name: string;

  // Action details
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Assignment
  assigned_to_name: string | null;

  // Dates
  due_date: string | null;
  completed_date: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Overdue check
  is_overdue: boolean;
}

/**
 * A toolbox talk/safety training record
 */
export interface SubcontractorToolboxTalk {
  id: string;
  project_id: string;
  project_name: string;

  // Talk details
  topic: string;
  description: string | null;
  conducted_by: string;
  conducted_at: string;
  duration_minutes: number | null;

  // Attendance
  attendees_count: number;
  subcontractor_attendees_count: number;
}

/**
 * Safety metrics for the subcontractor
 */
export interface SubcontractorSafetyMetrics {
  // Key rates (may be null if no hours worked data)
  trir: number | null;
  dart: number | null;
  ltir: number | null;
  emr: number | null;

  // Incident counts
  total_incidents: number;
  recordable_incidents: number;
  lost_time_incidents: number;

  // Time tracking
  days_since_last_incident: number | null;
  days_since_last_recordable: number | null;

  // Period
  hours_worked: number | null;
  period_start: string;
  period_end: string;
}

/**
 * Summary of safety compliance for dashboard
 */
export interface SafetyComplianceSummary {
  // Overall status
  compliance_score: number; // 0-100

  // Incident summary
  incidents_ytd: number;
  recordable_incidents_ytd: number;
  days_since_last_incident: number | null;

  // Open items
  open_corrective_actions: number;
  overdue_corrective_actions: number;

  // Training
  toolbox_talks_this_month: number;
  training_compliance_percent: number;

  // Document compliance
  safety_certs_valid: number;
  safety_certs_expiring: number;
  safety_certs_expired: number;

  // Metrics comparison
  trir_status: 'good' | 'warning' | 'critical' | 'unknown';
  dart_status: 'good' | 'warning' | 'critical' | 'unknown';
}

// =============================================
// P2-1: PHOTO DOCUMENTATION ACCESS
// =============================================

/**
 * Photo category for filtering
 */
export type PhotoCategory = 'progress' | 'safety' | 'quality' | 'weather' | 'delivery' | 'equipment' | 'general' | 'issue';

/**
 * A photo accessible to the subcontractor
 */
export interface SubcontractorPhoto {
  id: string;
  project_id: string;
  project_name: string;

  // Photo details
  photo_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  category: PhotoCategory | null;

  // Location info
  location: string | null;
  area: string | null;

  // Metadata
  taken_at: string | null;
  uploaded_at: string;
  uploaded_by_name: string | null;

  // Tags
  tags: string[];

  // Dimensions (if available)
  width: number | null;
  height: number | null;
}

/**
 * Filters for photo queries
 */
export interface SubcontractorPhotoFilters {
  project_id?: string;
  category?: PhotoCategory;
  date_from?: string;
  date_to?: string;
  search?: string;
}

/**
 * Summary of photos for dashboard
 */
export interface PhotoSummary {
  total_photos: number;
  photos_this_week: number;
  photos_this_month: number;
  photos_by_category: Record<string, number>;
  photos_by_project: Array<{
    project_id: string;
    project_name: string;
    count: number;
  }>;
  recent_photos: SubcontractorPhoto[];
}

// =============================================
// P2-2: MEETING MINUTES & ACTION ITEMS
// =============================================

/**
 * Meeting status types
 */
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Action item status
 */
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Action item priority
 */
export type ActionItemPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * A meeting accessible to the subcontractor
 */
export interface SubcontractorMeeting {
  id: string;
  project_id: string;
  project_name: string;

  // Meeting details
  title: string;
  meeting_type: string;
  description: string | null;

  // Timing
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number | null;

  // Location
  location: string | null;
  is_virtual: boolean;
  meeting_link: string | null;

  // Status
  status: MeetingStatus;

  // Attendee info
  total_attendees: number;
  subcontractor_attended: boolean;

  // Content
  agenda: string | null;
  minutes_summary: string | null;

  // Attachments count
  attachments_count: number;
}

/**
 * A meeting attachment
 */
export interface MeetingAttachment {
  id: string;
  meeting_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

/**
 * An action item from a meeting
 */
export interface SubcontractorActionItem {
  id: string;
  meeting_id: string;
  meeting_title: string;
  project_id: string;
  project_name: string;

  // Action details
  description: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;

  // Assignment
  assigned_to_name: string | null;
  is_assigned_to_subcontractor: boolean;

  // Dates
  due_date: string | null;
  completed_date: string | null;
  created_at: string;

  // Status flags
  is_overdue: boolean;
}

/**
 * Summary of meetings for dashboard
 */
export interface MeetingSummary {
  total_meetings: number;
  upcoming_meetings: number;
  meetings_this_month: number;
  open_action_items: number;
  overdue_action_items: number;
  completed_action_items: number;
}

// =============================================
// P2-3: EQUIPMENT & LABOR CERTIFICATIONS
// =============================================

/**
 * Certification type categories
 */
export type CertificationType =
  | 'equipment_operator'    // Crane, forklift, etc.
  | 'safety_training'       // OSHA-30, OSHA-10, etc.
  | 'first_aid'            // First Aid, CPR, AED
  | 'trade_license'        // Electrician, Plumber, etc.
  | 'professional'         // PE, Architect, etc.
  | 'hazmat'               // Hazardous materials
  | 'confined_space'       // Confined space entry
  | 'fall_protection'      // Fall protection
  | 'welding'              // Welding certifications
  | 'other';

/**
 * Certification status based on expiration
 */
export type CertificationStatusType = 'valid' | 'expiring_soon' | 'expired' | 'pending_verification';

/**
 * A certification record
 */
export interface SubcontractorCertification {
  id: string;
  subcontractor_id: string;

  // Certificate details
  certification_type: CertificationType;
  certification_name: string;
  issuing_authority: string | null;
  certificate_number: string | null;

  // Person holding certification
  holder_name: string;
  holder_title: string | null;

  // Dates
  issue_date: string | null;
  expiration_date: string | null;

  // Document
  document_url: string | null;
  document_name: string | null;

  // Status
  status: CertificationStatusType;
  verified_at: string | null;
  verified_by_name: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * DTO for uploading a new certification
 */
export interface CreateCertificationDTO {
  certification_type: CertificationType;
  certification_name: string;
  issuing_authority?: string;
  certificate_number?: string;
  holder_name: string;
  holder_title?: string;
  issue_date?: string;
  expiration_date?: string;
  document_url?: string;
  document_name?: string;
}

/**
 * Summary of certifications for dashboard
 */
export interface CertificationSummary {
  total_certifications: number;
  valid_count: number;
  expiring_soon_count: number;
  expired_count: number;
  pending_verification_count: number;
  certifications_by_type: Record<string, number>;
  expiring_within_30_days: SubcontractorCertification[];
}
