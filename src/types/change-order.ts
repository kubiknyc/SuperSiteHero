/**
 * Change Order Types - V2
 * Enhanced Change Orders with PCO/CO distinction and multi-level approval
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum ChangeOrderStatus {
  DRAFT = 'draft',
  PENDING_ESTIMATE = 'pending_estimate',
  ESTIMATE_COMPLETE = 'estimate_complete',
  PENDING_INTERNAL_APPROVAL = 'pending_internal_approval',
  INTERNALLY_APPROVED = 'internally_approved',
  PENDING_OWNER_REVIEW = 'pending_owner_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  VOID = 'void',
}

export enum ChangeType {
  SCOPE_CHANGE = 'scope_change',
  DESIGN_CLARIFICATION = 'design_clarification',
  UNFORESEEN_CONDITION = 'unforeseen_condition',
  OWNER_REQUEST = 'owner_request',
  VALUE_ENGINEERING = 'value_engineering',
  ERROR_OMISSION = 'error_omission',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PricingMethod {
  LUMP_SUM = 'lump_sum',
  TIME_MATERIALS = 'time_materials',
  UNIT_PRICE = 'unit_price',
}

export enum BallInCourtRole {
  ESTIMATING = 'estimating',
  PM = 'pm',
  OWNER = 'owner',
  ARCHITECT = 'architect',
}

// =============================================================================
// CORE TYPES
// =============================================================================

export interface ChangeOrder {
  id: string;
  project_id: string;
  company_id: string;

  // Change Order Identification
  co_number: number | null;  // Approved CO number (null until approved)
  pco_number: number;        // Potential Change Order number (always assigned)

  // Core Fields
  title: string;
  description: string | null;

  // Change Type
  change_type: ChangeType | string;

  // PCO vs CO Status
  is_pco: boolean;

  // Approval Status (Multi-level)
  status: ChangeOrderStatus | string;
  internal_approval_status: ApprovalStatus | string;
  owner_approval_status: ApprovalStatus | string;

  // Dates
  date_created: string | null;
  date_submitted: string | null;
  date_estimated: string | null;
  date_internal_approved: string | null;
  date_owner_submitted: string | null;
  date_owner_approved: string | null;
  date_executed: string | null;

  // Pricing Method
  pricing_method: PricingMethod | string;

  // Cost Summary
  proposed_amount: number;
  approved_amount: number | null;

  // Time Impact
  proposed_days: number;
  approved_days: number | null;

  // Contract Tracking
  original_contract_amount: number | null;
  previous_changes_amount: number;
  revised_contract_amount: number | null;

  // Assignment
  initiated_by: string | null;
  assigned_to: string | null;
  estimator_id: string | null;

  // Ball-in-Court
  ball_in_court: string | null;
  ball_in_court_role: BallInCourtRole | string | null;

  // Related Items
  related_rfi_id: string | null;
  related_submittal_id: string | null;
  related_site_condition_id: string | null;

  // Subcontractor
  subcontractor_id: string | null;

  // Reason/Justification
  justification: string | null;
  owner_comments: string | null;

  // Signatures
  internal_approver_id: string | null;
  internal_approver_name: string | null;
  owner_approver_name: string | null;
  owner_signature_url: string | null;

  // Legacy reference
  legacy_workflow_item_id: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;

  // Relationships (optional, populated by joins)
  items?: ChangeOrderItem[];
  attachments?: ChangeOrderAttachment[];
  initiated_by_user?: { full_name: string; email: string } | null;
  assigned_to_user?: { full_name: string; email: string } | null;
  ball_in_court_user?: { full_name: string; email: string } | null;
  related_rfi?: { rfi_number: number; subject: string } | null;
  related_submittal?: { submittal_number: string; title: string } | null;
  project?: { name: string; number: string } | null;
}

export interface ChangeOrderItem {
  id: string;
  change_order_id: string;

  // Item Identification
  item_number: number;
  description: string;

  // Cost Code Reference
  cost_code_id: string | null;
  cost_code: string | null;

  // Quantity and Unit
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;

  // Labor
  labor_hours: number | null;
  labor_rate: number | null;
  labor_amount: number | null;

  // Material
  material_amount: number | null;

  // Equipment
  equipment_amount: number | null;

  // Subcontract
  subcontract_amount: number | null;

  // Other/Misc
  other_amount: number | null;

  // Markup
  markup_percent: number | null;
  markup_amount: number | null;

  // Total
  total_amount: number | null;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ChangeOrderAttachment {
  id: string;
  change_order_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ChangeOrderHistory {
  id: string;
  change_order_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  changed_by_user?: { full_name: string; email: string } | null;
}

// =============================================================================
// DTOs - Create/Update
// =============================================================================

export interface CreateChangeOrderDTO {
  project_id: string;
  title: string;
  description?: string;
  change_type: ChangeType | string;
  pricing_method?: PricingMethod | string;
  proposed_amount?: number;
  proposed_days?: number;
  justification?: string;
  related_rfi_id?: string;
  related_submittal_id?: string;
  related_site_condition_id?: string;
  subcontractor_id?: string;
  assigned_to?: string;
  estimator_id?: string;
}

export interface UpdateChangeOrderDTO {
  title?: string;
  description?: string;
  change_type?: ChangeType | string;
  status?: ChangeOrderStatus | string;
  pricing_method?: PricingMethod | string;
  proposed_amount?: number;
  approved_amount?: number;
  proposed_days?: number;
  approved_days?: number;
  justification?: string;
  owner_comments?: string;
  assigned_to?: string;
  estimator_id?: string;
  ball_in_court?: string;
  ball_in_court_role?: BallInCourtRole | string;
  related_rfi_id?: string;
  related_submittal_id?: string;
  original_contract_amount?: number;
  previous_changes_amount?: number;
}

export interface SubmitEstimateDTO {
  proposed_amount: number;
  proposed_days?: number;
  items?: CreateChangeOrderItemDTO[];
}

export interface InternalApprovalDTO {
  approved: boolean;
  comments?: string;
}

export interface OwnerApprovalDTO {
  approved: boolean;
  approved_amount?: number;
  approved_days?: number;
  comments?: string;
  signature_url?: string;
  approver_name?: string;
}

export interface CreateChangeOrderItemDTO {
  description: string;
  cost_code_id?: string;
  cost_code?: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  labor_hours?: number;
  labor_rate?: number;
  labor_amount?: number;
  material_amount?: number;
  equipment_amount?: number;
  subcontract_amount?: number;
  other_amount?: number;
  markup_percent?: number;
  notes?: string;
}

export interface UpdateChangeOrderItemDTO extends Partial<CreateChangeOrderItemDTO> {
  id?: string;
}

export interface CreateChangeOrderAttachmentDTO {
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  description?: string;
}

// =============================================================================
// QUERY/FILTER TYPES
// =============================================================================

export interface ChangeOrderFilters {
  project_id?: string;
  status?: ChangeOrderStatus | string;
  change_type?: ChangeType | string;
  is_pco?: boolean;
  ball_in_court?: string;
  assigned_to?: string;
  initiated_by?: string;
  subcontractor_id?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
}

export interface ChangeOrderStatistics {
  total_count: number;
  pco_count: number;
  approved_co_count: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  total_proposed_amount: number;
  total_approved_amount: number;
  total_proposed_days: number;
  total_approved_days: number;
  pending_internal: number;
  pending_owner: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format change order number for display
 */
export function formatChangeOrderNumber(co: ChangeOrder): string {
  if (co.is_pco || co.co_number === null) {
    return `PCO-${String(co.pco_number).padStart(3, '0')}`;
  }
  return `CO-${String(co.co_number).padStart(3, '0')}`;
}

/**
 * Get display label for change type
 */
export function getChangeTypeLabel(type: ChangeType | string): string {
  const labels: Record<string, string> = {
    [ChangeType.SCOPE_CHANGE]: 'Scope Change',
    [ChangeType.DESIGN_CLARIFICATION]: 'Design Clarification',
    [ChangeType.UNFORESEEN_CONDITION]: 'Unforeseen Condition',
    [ChangeType.OWNER_REQUEST]: 'Owner Request',
    [ChangeType.VALUE_ENGINEERING]: 'Value Engineering',
    [ChangeType.ERROR_OMISSION]: 'Error/Omission',
  };
  return labels[type] || type;
}

/**
 * Get display label for status
 */
export function getChangeOrderStatusLabel(status: ChangeOrderStatus | string): string {
  const labels: Record<string, string> = {
    [ChangeOrderStatus.DRAFT]: 'Draft',
    [ChangeOrderStatus.PENDING_ESTIMATE]: 'Pending Estimate',
    [ChangeOrderStatus.ESTIMATE_COMPLETE]: 'Estimate Complete',
    [ChangeOrderStatus.PENDING_INTERNAL_APPROVAL]: 'Pending Internal Approval',
    [ChangeOrderStatus.INTERNALLY_APPROVED]: 'Internally Approved',
    [ChangeOrderStatus.PENDING_OWNER_REVIEW]: 'Pending Owner Review',
    [ChangeOrderStatus.APPROVED]: 'Approved',
    [ChangeOrderStatus.REJECTED]: 'Rejected',
    [ChangeOrderStatus.VOID]: 'Void',
  };
  return labels[status] || status;
}

/**
 * Get color class for status badge
 */
export function getChangeOrderStatusColor(status: ChangeOrderStatus | string): string {
  const colors: Record<string, string> = {
    [ChangeOrderStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [ChangeOrderStatus.PENDING_ESTIMATE]: 'bg-yellow-100 text-yellow-800',
    [ChangeOrderStatus.ESTIMATE_COMPLETE]: 'bg-blue-100 text-blue-800',
    [ChangeOrderStatus.PENDING_INTERNAL_APPROVAL]: 'bg-orange-100 text-orange-800',
    [ChangeOrderStatus.INTERNALLY_APPROVED]: 'bg-purple-100 text-purple-800',
    [ChangeOrderStatus.PENDING_OWNER_REVIEW]: 'bg-indigo-100 text-indigo-800',
    [ChangeOrderStatus.APPROVED]: 'bg-green-100 text-green-800',
    [ChangeOrderStatus.REJECTED]: 'bg-red-100 text-red-800',
    [ChangeOrderStatus.VOID]: 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Check if change order can be edited
 */
export function canEditChangeOrder(co: ChangeOrder): boolean {
  return [
    ChangeOrderStatus.DRAFT,
    ChangeOrderStatus.PENDING_ESTIMATE,
    ChangeOrderStatus.ESTIMATE_COMPLETE,
  ].includes(co.status as ChangeOrderStatus);
}

/**
 * Check if change order can be submitted for approval
 */
export function canSubmitForApproval(co: ChangeOrder): boolean {
  return co.status === ChangeOrderStatus.ESTIMATE_COMPLETE && co.proposed_amount > 0;
}

/**
 * Check if user can approve internally
 */
export function canApproveInternally(co: ChangeOrder): boolean {
  return co.status === ChangeOrderStatus.PENDING_INTERNAL_APPROVAL;
}

/**
 * Check if change order can be sent to owner
 */
export function canSendToOwner(co: ChangeOrder): boolean {
  return co.status === ChangeOrderStatus.INTERNALLY_APPROVED;
}

/**
 * Get next status options based on current status
 */
export function getNextStatusOptions(status: ChangeOrderStatus | string): ChangeOrderStatus[] {
  const transitions: Record<string, ChangeOrderStatus[]> = {
    [ChangeOrderStatus.DRAFT]: [ChangeOrderStatus.PENDING_ESTIMATE],
    [ChangeOrderStatus.PENDING_ESTIMATE]: [ChangeOrderStatus.ESTIMATE_COMPLETE],
    [ChangeOrderStatus.ESTIMATE_COMPLETE]: [ChangeOrderStatus.PENDING_INTERNAL_APPROVAL],
    [ChangeOrderStatus.PENDING_INTERNAL_APPROVAL]: [ChangeOrderStatus.INTERNALLY_APPROVED, ChangeOrderStatus.REJECTED],
    [ChangeOrderStatus.INTERNALLY_APPROVED]: [ChangeOrderStatus.PENDING_OWNER_REVIEW],
    [ChangeOrderStatus.PENDING_OWNER_REVIEW]: [ChangeOrderStatus.APPROVED, ChangeOrderStatus.REJECTED],
    [ChangeOrderStatus.APPROVED]: [],
    [ChangeOrderStatus.REJECTED]: [ChangeOrderStatus.DRAFT],
    [ChangeOrderStatus.VOID]: [],
  };
  return transitions[status] || [];
}

/**
 * Calculate item total from components
 */
export function calculateItemTotal(item: Partial<ChangeOrderItem>): number {
  const direct =
    (item.labor_amount || 0) +
    (item.material_amount || 0) +
    (item.equipment_amount || 0) +
    (item.subcontract_amount || 0) +
    (item.other_amount || 0);

  const unitBased = (item.quantity || 0) * (item.unit_cost || 0);
  const base = Math.max(direct, unitBased);

  const markup = item.markup_percent ? base * (item.markup_percent / 100) : 0;

  return base + markup;
}

/**
 * Calculate total from all items
 */
export function calculateChangeOrderTotal(items: ChangeOrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.total_amount || 0), 0);
}
