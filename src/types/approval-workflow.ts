/**
 * Approval Workflow Types
 *
 * Types for multi-step document approval workflows supporting:
 * - Documents, Submittals, RFIs, Change Orders
 * - User-based approvers (TODO: Add role-based when roles system exists)
 * - Conditional approvals ("approved with conditions")
 * - Delegation and audit trail
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Status of an approval request
 */
export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'approved_with_conditions'
  | 'rejected'
  | 'cancelled'

/**
 * Actions that can be taken on an approval request
 */
export type ApprovalActionType =
  | 'approve'
  | 'approve_with_conditions'
  | 'reject'
  | 'delegate'
  | 'comment'

/**
 * Entity types that can have approval workflows
 */
export type WorkflowEntityType =
  | 'document'
  | 'submittal'
  | 'rfi'
  | 'change_order'

/**
 * Type of approver for a step
 * Currently only 'user' is supported
 * TODO: Add 'role' | 'any_of_users' when roles system is implemented
 */
export type ApproverType = 'user'

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Approval workflow template
 * Defines the steps and configuration for an approval process
 */
export interface ApprovalWorkflow {
  id: string
  name: string
  description: string | null
  company_id: string
  workflow_type: WorkflowEntityType
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  steps?: ApprovalStep[]
}

/**
 * A single step in an approval workflow
 */
export interface ApprovalStep {
  id: string
  workflow_id: string
  step_order: number
  name: string
  approver_type: ApproverType
  approver_ids: string[] // User IDs for now
  required_approvals: number // How many must approve (for multiple approvers)
  allow_delegation: boolean
  auto_approve_after_days: number | null // Optional auto-approval timeout
  created_at: string
  // Joined data
  approvers?: ApprovalStepApprover[]
}

/**
 * Approver info with user details (for display)
 */
export interface ApprovalStepApprover {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

/**
 * An active approval request for an entity
 */
export interface ApprovalRequest {
  id: string
  workflow_id: string
  entity_type: WorkflowEntityType
  entity_id: string
  current_step: number
  status: ApprovalStatus
  conditions: string | null // Conditions text when approved_with_conditions
  initiated_by: string
  initiated_at: string
  completed_at: string | null
  project_id: string
  // Joined data
  workflow?: ApprovalWorkflow
  initiator?: UserInfo
  current_step_info?: ApprovalStep
  actions?: ApprovalActionRecord[]
}

/**
 * A recorded action in the approval history (audit trail)
 */
export interface ApprovalActionRecord {
  id: string
  request_id: string
  step_id: string
  user_id: string
  action: ApprovalActionType
  comment: string | null
  conditions: string | null // For approve_with_conditions
  delegated_to: string | null
  created_at: string
  // Joined data
  user?: UserInfo
  step?: ApprovalStep
  delegated_user?: UserInfo
}

/**
 * Basic user info for display
 */
export interface UserInfo {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

// ============================================================================
// Input Types (for creating/updating)
// ============================================================================

/**
 * Input for creating a new workflow
 */
export interface CreateWorkflowInput {
  name: string
  description?: string | null
  company_id: string
  workflow_type: WorkflowEntityType
  steps: CreateStepInput[]
}

/**
 * Input for creating a workflow step
 */
export interface CreateStepInput {
  step_order: number
  name: string
  approver_ids: string[]
  required_approvals?: number
  allow_delegation?: boolean
  auto_approve_after_days?: number | null
}

/**
 * Input for updating a workflow
 */
export interface UpdateWorkflowInput {
  name?: string
  description?: string | null
  is_active?: boolean
  steps?: CreateStepInput[] // Full replacement of steps
}

/**
 * Input for creating an approval request
 */
export interface CreateApprovalRequestInput {
  workflow_id: string
  entity_type: WorkflowEntityType
  entity_id: string
  project_id: string
}

/**
 * Input for taking an action on a request
 */
export interface ApprovalActionInput {
  request_id: string
  action: ApprovalActionType
  comment?: string | null
  conditions?: string | null // Required for 'approve_with_conditions'
  delegated_to?: string | null // Required for 'delegate'
}

// ============================================================================
// Filter / Query Types
// ============================================================================

/**
 * Filters for querying approval requests
 */
export interface ApprovalRequestFilters {
  status?: ApprovalStatus | ApprovalStatus[]
  entity_type?: WorkflowEntityType
  project_id?: string
  initiated_by?: string
  pending_for_user?: string // Requests where user is current approver
}

/**
 * Filters for querying workflows
 */
export interface ApprovalWorkflowFilters {
  company_id: string
  workflow_type?: WorkflowEntityType
  is_active?: boolean
}

// ============================================================================
// Response / Result Types
// ============================================================================

/**
 * Result of checking entity approval status
 */
export interface EntityApprovalStatus {
  has_active_request: boolean
  request?: ApprovalRequest
  status: ApprovalStatus | null
  conditions?: string | null // Conditions text when approved_with_conditions
  can_submit: boolean // true if no active/approved request exists
}

/**
 * Summary of pending approvals for a user
 */
export interface PendingApprovalsSummary {
  total: number
  by_type: Record<WorkflowEntityType, number>
  requests: ApprovalRequest[]
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Status badge configuration
 */
export interface ApprovalStatusConfig {
  label: string
  color: 'yellow' | 'green' | 'blue' | 'red' | 'gray'
  icon?: string
}

/**
 * Map of status to display configuration
 */
export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, ApprovalStatusConfig> = {
  pending: { label: 'Pending', color: 'yellow' },
  approved: { label: 'Approved', color: 'green' },
  approved_with_conditions: { label: 'Approved with Conditions', color: 'blue' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
}

/**
 * Action type display configuration
 */
export const APPROVAL_ACTION_CONFIG: Record<ApprovalActionType, { label: string; pastTense: string }> = {
  approve: { label: 'Approve', pastTense: 'Approved' },
  approve_with_conditions: { label: 'Approve with Conditions', pastTense: 'Approved with Conditions' },
  reject: { label: 'Reject', pastTense: 'Rejected' },
  delegate: { label: 'Delegate', pastTense: 'Delegated' },
  comment: { label: 'Comment', pastTense: 'Commented' },
}

/**
 * Entity type display configuration
 */
export const WORKFLOW_ENTITY_CONFIG: Record<WorkflowEntityType, { label: string; plural: string }> = {
  document: { label: 'Document', plural: 'Documents' },
  submittal: { label: 'Submittal', plural: 'Submittals' },
  rfi: { label: 'RFI', plural: 'RFIs' },
  change_order: { label: 'Change Order', plural: 'Change Orders' },
}

// ============================================================================
// Public Approval Link Types
// ============================================================================

/**
 * Client decision options
 */
export type ClientDecision = 'approved' | 'rejected' | 'changes_requested'

/**
 * Public link type
 */
export type PublicLinkType = 'single_use' | 'multi_use'

/**
 * Public approval link for client access
 */
export interface PublicApprovalLink {
  id: string
  approval_request_id: string
  token: string
  link_type: PublicLinkType
  expires_at: string
  max_uses: number
  current_uses: number
  client_email: string | null
  client_name: string | null
  ip_restrictions: string[] | null
  require_email_verification: boolean
  created_at: string
  created_by: string | null
  last_accessed_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  access_log: Array<{
    timestamp: string
    ip: string
    user_agent: string
  }>
  // Joined data
  approval_request?: ApprovalRequest
}

/**
 * Client approval response
 */
export interface ClientApprovalResponse {
  id: string
  public_link_id: string
  approval_request_id: string
  decision: ClientDecision
  comments: string | null
  conditions: string | null
  client_name: string
  client_email: string
  client_company: string | null
  client_title: string | null
  signature_data: string | null
  signed_at: string | null
  attachment_ids: string[] | null
  submitted_from_ip: string | null
  user_agent: string | null
  submitted_at: string
  email_verified: boolean
  verification_code: string | null
  verification_sent_at: string | null
}

/**
 * Input for creating a public approval link
 */
export interface CreatePublicLinkInput {
  approval_request_id: string
  client_email?: string
  client_name?: string
  link_type?: PublicLinkType
  expires_in_days?: number
  max_uses?: number
}

/**
 * Input for submitting a client approval response
 */
export interface SubmitClientApprovalInput {
  public_link_id: string
  decision: ClientDecision
  client_name: string
  client_email: string
  comments?: string
  conditions?: string
  client_company?: string
  client_title?: string
  signature_data?: string
}

/**
 * Result of validating a public link
 */
export interface PublicLinkValidation {
  is_valid: boolean
  link_id: string | null
  approval_request_id: string | null
  remaining_uses: number | null
  error_message: string | null
}

/**
 * Public approval page data (for unauthenticated view)
 */
export interface PublicApprovalPageData {
  link: PublicApprovalLink
  request: ApprovalRequest
  workflow: ApprovalWorkflow
  entity_details: {
    type: WorkflowEntityType
    name: string
    description: string | null
    reference_number: string | null
    amount?: number
    attachments?: Array<{
      id: string
      name: string
      url: string
      type: string
    }>
  }
  project: {
    id: string
    name: string
    company_name: string
  }
  existing_response?: ClientApprovalResponse
}

/**
 * Client decision display configuration
 */
export const CLIENT_DECISION_CONFIG: Record<ClientDecision, {
  label: string
  color: 'green' | 'red' | 'yellow'
  icon: string
}> = {
  approved: { label: 'Approve', color: 'green', icon: 'CheckCircle' },
  rejected: { label: 'Reject', color: 'red', icon: 'XCircle' },
  changes_requested: { label: 'Request Changes', color: 'yellow', icon: 'AlertCircle' },
}
