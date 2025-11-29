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
