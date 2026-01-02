/**
 * Schedule of Values (SOV) and AIA Billing Types
 * Industry-standard construction financial management
 */

// ============================================================
// SCHEDULE OF VALUES (SOV) TYPES
// ============================================================

/**
 * SOV Line Item - Single line in the Schedule of Values
 * Based on AIA G703 format
 */
export interface SOVLineItem {
  id: string
  sov_id: string
  item_number: string // e.g., "001", "001.01"
  description: string
  scheduled_value: number // Original scheduled value

  // Work Completed
  work_completed_previous: number // $ completed in previous periods
  work_completed_this_period: number // $ completed this period
  work_completed_total: number // Calculated: previous + this period

  // Materials Stored
  materials_stored_previous: number
  materials_stored_this_period: number
  materials_stored_total: number

  // Total Completed & Stored
  total_completed_and_stored: number // work_completed_total + materials_stored_total

  // Percentage & Balance
  percent_complete: number // Calculated: total_completed_and_stored / scheduled_value * 100
  balance_to_finish: number // Calculated: scheduled_value - total_completed_and_stored

  // Retainage
  retainage_percent: number // Usually 10% or 5%
  retainage_amount: number // Calculated: total_completed_and_stored * retainage_percent
  retainage_released: number // Retainage released to date

  // Cost Code Assignment
  cost_code_id: string | null
  cost_code: string | null // e.g., "03-3000" for Cast-in-Place Concrete

  // Spec Section (optional)
  spec_section: string | null

  // Subcontractor Assignment
  subcontractor_id: string | null
  subcontractor_name: string | null

  // Display order
  sort_order: number

  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

/**
 * Schedule of Values - Master document
 */
export interface ScheduleOfValues {
  id: string
  project_id: string

  // Contract Info
  original_contract_sum: number
  change_orders_total: number // Sum of approved COs
  current_contract_sum: number // original + change_orders

  // Calculated Totals
  total_scheduled_value: number
  total_work_completed: number
  total_materials_stored: number
  total_completed_and_stored: number
  overall_percent_complete: number
  total_balance_to_finish: number

  // Retainage
  retainage_percent: number // Default retainage percentage
  total_retainage_held: number
  total_retainage_released: number

  // Status
  status: 'draft' | 'active' | 'locked' | 'archived'

  // Line Items
  line_items: SOVLineItem[]

  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  company_id: string
}

/**
 * SOV Insert Type (for creating new SOVs)
 */
export interface SOVInsert {
  project_id: string
  original_contract_sum: number
  retainage_percent?: number
  status?: 'draft' | 'active'
}

/**
 * SOV Line Item Insert Type
 */
export interface SOVLineItemInsert {
  sov_id: string
  item_number: string
  description: string
  scheduled_value: number
  retainage_percent?: number
  cost_code_id?: string
  cost_code?: string
  spec_section?: string
  subcontractor_id?: string
  sort_order?: number
}

/**
 * SOV Line Item Update Type (for billing updates)
 */
export interface SOVLineItemBillingUpdate {
  id: string
  work_completed_this_period?: number
  materials_stored_this_period?: number
  retainage_released?: number
}

// ============================================================
// AIA G702 - Application and Certificate for Payment
// ============================================================

/**
 * AIA G702 Application for Payment
 */
export interface AIAG702 {
  id: string
  project_id: string
  sov_id: string

  // Application Info
  application_number: number
  period_to: string // Date - end of billing period

  // Contract Data
  original_contract_sum: number
  net_change_by_change_orders: number // Sum of approved COs
  contract_sum_to_date: number // original + change orders

  // Completed and Stored
  total_completed_and_stored_to_date: number

  // Retainage
  retainage_from_work_completed: number
  retainage_from_stored_materials: number
  total_retainage: number

  // Current Payment Due
  total_earned_less_retainage: number // total_completed - total_retainage
  less_previous_certificates: number // Amount previously certified
  current_payment_due: number // total_earned_less_retainage - less_previous_certificates

  // Balance to Finish
  balance_to_finish_including_retainage: number

  // Signatures
  contractor_signature: string | null
  contractor_signature_date: string | null
  contractor_name: string | null

  architect_signature: string | null
  architect_signature_date: string | null
  architect_name: string | null

  owner_signature: string | null
  owner_signature_date: string | null
  owner_name: string | null

  // Notarization
  notarized: boolean
  notary_signature: string | null
  notary_date: string | null
  notary_county: string | null
  notary_state: string | null

  // Status
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected'
  rejection_reason: string | null

  // Payment Info
  date_submitted: string | null
  date_approved: string | null
  date_paid: string | null
  check_number: string | null

  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

/**
 * AIA G702 Create DTO
 */
export interface AIAG702Create {
  project_id: string
  sov_id: string
  period_to: string
}

// ============================================================
// AIA G703 - Continuation Sheet
// ============================================================

/**
 * AIA G703 Continuation Sheet Line Item
 * This is the billing period snapshot of SOV line items
 */
export interface AIAG703LineItem {
  id: string
  g702_id: string
  sov_line_item_id: string

  // Item Info (copied from SOV for the period)
  item_number: string
  description_of_work: string
  scheduled_value: number

  // Work Completed
  from_previous_application: number // $ completed from previous
  this_period: number // $ completed this period
  materials_presently_stored: number // Materials on site

  // Totals
  total_completed_and_stored_to_date: number // Columns C + D + E
  percent_complete: number // Column F / B * 100
  balance_to_finish: number // B - F
  retainage: number // F * retainage %

  // Cost Code (for reference)
  cost_code: string | null

  // Sort order
  sort_order: number
}

/**
 * Complete G703 Continuation Sheet
 */
export interface AIAG703 {
  g702_id: string
  application_number: number
  period_to: string

  // Totals (sum of all line items)
  total_scheduled_value: number
  total_from_previous: number
  total_this_period: number
  total_materials_stored: number
  total_completed_and_stored: number
  total_balance_to_finish: number
  total_retainage: number

  // Line Items
  line_items: AIAG703LineItem[]
}

// ============================================================
// JOB COSTING TYPES
// ============================================================

/**
 * Cost Code - Hierarchical budget category
 */
export interface CostCode {
  id: string
  project_id: string

  // Code Structure
  code: string // e.g., "03-3000"
  parent_code: string | null // For hierarchy
  name: string // e.g., "Cast-in-Place Concrete"
  description: string | null

  // Budget
  original_budget: number
  revised_budget: number // Original + approved changes

  // Committed Costs
  committed_cost: number // POs + Subcontracts

  // Actual Costs
  actual_cost: number

  // Variance
  budget_variance: number // revised_budget - (committed + actual)
  percent_spent: number

  // SOV Reference
  sov_line_item_id: string | null

  // Type
  cost_type: 'labor' | 'material' | 'equipment' | 'subcontract' | 'other'

  // Status
  is_active: boolean

  // Metadata
  created_at: string
  updated_at: string
}

/**
 * Job Cost Summary - Aggregated view
 */
export interface JobCostSummary {
  project_id: string
  project_name: string

  // Overall Totals
  total_budget: number
  total_revised_budget: number
  total_committed: number
  total_actual: number
  total_variance: number
  percent_complete: number

  // By Cost Type
  by_type: {
    labor: CostTypeSummary
    material: CostTypeSummary
    equipment: CostTypeSummary
    subcontract: CostTypeSummary
    other: CostTypeSummary
  }

  // Top Variances (positive = under, negative = over)
  top_over_budget: CostCode[]
  top_under_budget: CostCode[]
}

export interface CostTypeSummary {
  budget: number
  committed: number
  actual: number
  variance: number
  percent_spent: number
}

// ============================================================
// COMMITTED COST TRACKING
// ============================================================

/**
 * Purchase Order
 */
export interface PurchaseOrder {
  id: string
  project_id: string

  // PO Info
  po_number: string
  vendor_id: string | null
  vendor_name: string

  // Dates
  date_issued: string
  date_required: string | null
  date_received: string | null

  // Amounts
  subtotal: number
  tax: number
  shipping: number
  total_amount: number

  // Invoiced/Paid
  invoiced_amount: number
  paid_amount: number
  balance_remaining: number

  // Status
  status: 'draft' | 'issued' | 'acknowledged' | 'partial' | 'complete' | 'cancelled'

  // Cost Code
  cost_code_id: string | null
  cost_code: string | null

  // Line Items
  line_items: POLineItem[]

  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

export interface POLineItem {
  id: string
  po_id: string
  line_number: number
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  cost_code_id: string | null
  cost_code: string | null
  received_quantity: number
  notes: string | null
}

/**
 * Subcontract
 */
export interface Subcontract {
  id: string
  project_id: string

  // Subcontract Info
  subcontract_number: string
  subcontractor_id: string
  subcontractor_name: string

  // Scope
  scope_description: string
  spec_sections: string[]

  // Contract Amounts
  original_amount: number
  change_orders_amount: number
  current_contract_amount: number

  // Billing
  billed_to_date: number
  paid_to_date: number
  retainage_held: number
  balance_to_finish: number
  percent_complete: number

  // Dates
  start_date: string | null
  end_date: string | null
  substantial_completion_date: string | null

  // Status
  status: 'pending' | 'executed' | 'in_progress' | 'complete' | 'closed' | 'terminated'

  // Insurance & Compliance
  insurance_verified: boolean
  insurance_expiration: string | null

  // Cost Codes (multiple allowed)
  cost_codes: string[]

  // SOV Line Items (for billing correlation)
  sov_line_item_ids: string[]

  // Metadata
  created_at: string
  updated_at: string
  created_by: string
}

/**
 * Committed Cost Summary
 */
export interface CommittedCostSummary {
  project_id: string

  // PO Totals
  total_po_amount: number
  total_po_invoiced: number
  total_po_paid: number
  total_po_remaining: number
  po_count: number

  // Subcontract Totals
  total_subcontract_amount: number
  total_subcontract_billed: number
  total_subcontract_paid: number
  total_subcontract_retainage: number
  total_subcontract_remaining: number
  subcontract_count: number

  // Combined
  total_committed: number
  total_invoiced: number
  total_paid: number
  total_open: number
}

// ============================================================
// CASH FLOW PROJECTION
// ============================================================

/**
 * Monthly Cash Flow Entry
 */
export interface CashFlowMonth {
  month: string // YYYY-MM format
  month_label: string // "Jan 2025"

  // Billings (Revenue)
  projected_billings: number
  actual_billings: number

  // Collections
  projected_collections: number
  actual_collections: number

  // Disbursements (Expenses)
  projected_disbursements: number
  actual_disbursements: number

  // Net Cash Flow
  projected_net: number
  actual_net: number

  // Running Balance
  projected_cumulative: number
  actual_cumulative: number

  // S-Curve Data
  planned_percent_complete: number
  actual_percent_complete: number
  earned_value: number
}

/**
 * Cash Flow Projection for a Project
 */
export interface CashFlowProjection {
  project_id: string
  project_name: string

  // Project Totals
  contract_value: number
  total_projected_billings: number
  total_actual_billings: number
  total_collected: number
  total_disbursed: number

  // Monthly Data
  months: CashFlowMonth[]

  // S-Curve Metrics
  planned_value_to_date: number
  earned_value_to_date: number
  actual_cost_to_date: number

  // Variance Indices
  schedule_variance: number // EV - PV
  cost_variance: number // EV - AC
  schedule_performance_index: number // EV / PV
  cost_performance_index: number // EV / AC

  // Forecasts
  estimate_at_completion: number
  estimate_to_complete: number
  variance_at_completion: number
}

// ============================================================
// FILTERS AND QUERY TYPES
// ============================================================

export interface SOVFilters {
  project_id?: string
  status?: ScheduleOfValues['status']
  include_line_items?: boolean
}

export interface BillingFilters {
  project_id?: string
  sov_id?: string
  status?: AIAG702['status']
  period_from?: string
  period_to?: string
}

export interface CostCodeFilters {
  project_id?: string
  cost_type?: CostCode['cost_type']
  parent_code?: string
  has_variance?: boolean
  is_active?: boolean
}

export interface CommittedCostFilters {
  project_id?: string
  vendor_id?: string
  subcontractor_id?: string
  cost_code?: string
  status?: PurchaseOrder['status'] | Subcontract['status']
  date_from?: string
  date_to?: string
}

export interface CashFlowFilters {
  project_id: string
  months_forward?: number // How many months to project
  months_back?: number // Historical months to include
}
