/**
 * Cost Tracking Types
 * Types for cost codes, project budgets, and cost transactions
 * Aligned with migration 048_cost_codes.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type CostType = 'direct' | 'indirect' | 'overhead';

export type TransactionType = 'commitment' | 'actual' | 'adjustment' | 'forecast';

export type SourceType =
  | 'change_order'
  | 'invoice'
  | 'timesheet'
  | 'material'
  | 'equipment'
  | 'subcontract'
  | 'purchase_order'
  | 'manual';

// CSI MasterFormat Divisions
export type CSIDivision =
  | '00' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09'
  | '10' | '11' | '12' | '13' | '14'
  | '21' | '22' | '23' | '25' | '26' | '27' | '28'
  | '31' | '32' | '33' | '34' | '35'
  | '40' | '41' | '42' | '43' | '44' | '45' | '46' | '48';

export const COST_TYPES: { value: CostType; label: string }[] = [
  { value: 'direct', label: 'Direct Cost' },
  { value: 'indirect', label: 'Indirect Cost' },
  { value: 'overhead', label: 'Overhead' },
];

export const TRANSACTION_TYPES: { value: TransactionType; label: string; color: string }[] = [
  { value: 'commitment', label: 'Commitment', color: 'blue' },
  { value: 'actual', label: 'Actual', color: 'green' },
  { value: 'adjustment', label: 'Adjustment', color: 'orange' },
  { value: 'forecast', label: 'Forecast', color: 'purple' },
];

export const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'change_order', label: 'Change Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'timesheet', label: 'Timesheet' },
  { value: 'material', label: 'Material' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontract', label: 'Subcontract' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'manual', label: 'Manual Entry' },
];

export const CSI_DIVISIONS: { division: CSIDivision; name: string; group: string }[] = [
  // Procurement and Contracting
  { division: '00', name: 'Procurement and Contracting Requirements', group: 'General' },

  // General Requirements
  { division: '01', name: 'General Requirements', group: 'General' },

  // Facility Construction
  { division: '02', name: 'Existing Conditions', group: 'Facility Construction' },
  { division: '03', name: 'Concrete', group: 'Facility Construction' },
  { division: '04', name: 'Masonry', group: 'Facility Construction' },
  { division: '05', name: 'Metals', group: 'Facility Construction' },
  { division: '06', name: 'Wood, Plastics, and Composites', group: 'Facility Construction' },
  { division: '07', name: 'Thermal and Moisture Protection', group: 'Facility Construction' },
  { division: '08', name: 'Openings', group: 'Facility Construction' },
  { division: '09', name: 'Finishes', group: 'Facility Construction' },
  { division: '10', name: 'Specialties', group: 'Facility Construction' },
  { division: '11', name: 'Equipment', group: 'Facility Construction' },
  { division: '12', name: 'Furnishings', group: 'Facility Construction' },
  { division: '13', name: 'Special Construction', group: 'Facility Construction' },
  { division: '14', name: 'Conveying Equipment', group: 'Facility Construction' },

  // Facility Services
  { division: '21', name: 'Fire Suppression', group: 'Facility Services' },
  { division: '22', name: 'Plumbing', group: 'Facility Services' },
  { division: '23', name: 'HVAC', group: 'Facility Services' },
  { division: '25', name: 'Integrated Automation', group: 'Facility Services' },
  { division: '26', name: 'Electrical', group: 'Facility Services' },
  { division: '27', name: 'Communications', group: 'Facility Services' },
  { division: '28', name: 'Electronic Safety and Security', group: 'Facility Services' },

  // Site and Infrastructure
  { division: '31', name: 'Earthwork', group: 'Site and Infrastructure' },
  { division: '32', name: 'Exterior Improvements', group: 'Site and Infrastructure' },
  { division: '33', name: 'Utilities', group: 'Site and Infrastructure' },
  { division: '34', name: 'Transportation', group: 'Site and Infrastructure' },
  { division: '35', name: 'Waterway and Marine Construction', group: 'Site and Infrastructure' },

  // Process Equipment
  { division: '40', name: 'Process Interconnections', group: 'Process Equipment' },
  { division: '41', name: 'Material Processing and Handling Equipment', group: 'Process Equipment' },
  { division: '42', name: 'Process Heating, Cooling, and Drying Equipment', group: 'Process Equipment' },
  { division: '43', name: 'Process Gas and Liquid Handling', group: 'Process Equipment' },
  { division: '44', name: 'Pollution and Waste Control Equipment', group: 'Process Equipment' },
  { division: '45', name: 'Industry-Specific Manufacturing Equipment', group: 'Process Equipment' },
  { division: '46', name: 'Water and Wastewater Equipment', group: 'Process Equipment' },
  { division: '48', name: 'Electrical Power Generation', group: 'Process Equipment' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Cost Code - CSI MasterFormat based code definitions
 */
export interface CostCode {
  id: string;
  company_id: string;

  // Code Identification
  code: string;  // e.g., "03 30 00"
  name: string;
  description: string | null;

  // Hierarchy
  parent_code_id: string | null;
  level: number;  // 1=Division, 2=Section, 3=Subsection

  // Classification
  division: string | null;  // CSI Division: 01-49
  section: string | null;

  // Cost Type
  cost_type: CostType;

  // Status
  is_active: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Project Budget - Budget allocations by cost code per project
 */
export interface ProjectBudget {
  id: string;
  project_id: string;
  cost_code_id: string;

  // Budget Amounts
  original_budget: number;
  approved_changes: number;

  // Committed Costs (contracts, POs)
  committed_cost: number;

  // Actual Costs
  actual_cost: number;

  // Projections
  estimated_cost_at_completion: number | null;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Cost Transaction - Individual cost entry
 */
export interface CostTransaction {
  id: string;
  project_id: string;
  cost_code_id: string;

  // Transaction Info
  transaction_date: string;
  description: string;

  // Transaction Type
  transaction_type: TransactionType;
  source_type: SourceType | null;
  source_id: string | null;

  // Amounts
  amount: number;

  // Vendor/Subcontractor
  vendor_name: string | null;
  subcontractor_id: string | null;

  // Reference Numbers
  invoice_number: string | null;
  po_number: string | null;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Cost Code with children (hierarchical view)
 */
export interface CostCodeWithChildren extends CostCode {
  children?: CostCodeWithChildren[];
}

/**
 * Project Budget with computed fields and relations
 */
export interface ProjectBudgetWithDetails extends ProjectBudget {
  // Cost Code Info
  cost_code: string;
  cost_code_name: string;
  division: string | null;

  // Computed Fields
  revised_budget: number;  // original_budget + approved_changes
  variance: number;  // revised_budget - actual_cost
  percent_spent: number;  // (actual_cost / revised_budget) * 100
}

/**
 * Cost Transaction with relations
 */
export interface CostTransactionWithDetails extends CostTransaction {
  cost_code: CostCode;
  subcontractor?: {
    id: string;
    name: string;
  } | null;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Cost Code input
 */
export interface CreateCostCodeDTO {
  company_id: string;
  code: string;
  name: string;
  description?: string;
  parent_code_id?: string;
  level?: number;
  division?: string;
  section?: string;
  cost_type?: CostType;
  is_active?: boolean;
}

/**
 * Update Cost Code input
 */
export interface UpdateCostCodeDTO {
  name?: string;
  description?: string;
  parent_code_id?: string;
  level?: number;
  division?: string;
  section?: string;
  cost_type?: CostType;
  is_active?: boolean;
}

/**
 * Create Project Budget input
 */
export interface CreateProjectBudgetDTO {
  project_id: string;
  cost_code_id: string;
  original_budget: number;
  approved_changes?: number;
  committed_cost?: number;
  actual_cost?: number;
  estimated_cost_at_completion?: number;
  notes?: string;
}

/**
 * Update Project Budget input
 */
export interface UpdateProjectBudgetDTO {
  original_budget?: number;
  approved_changes?: number;
  committed_cost?: number;
  actual_cost?: number;
  estimated_cost_at_completion?: number;
  notes?: string;
}

/**
 * Create Cost Transaction input
 */
export interface CreateCostTransactionDTO {
  project_id: string;
  cost_code_id: string;
  transaction_date: string;
  description: string;
  transaction_type: TransactionType;
  source_type?: SourceType;
  source_id?: string;
  amount: number;
  vendor_name?: string;
  subcontractor_id?: string;
  invoice_number?: string;
  po_number?: string;
  notes?: string;
}

/**
 * Update Cost Transaction input
 */
export interface UpdateCostTransactionDTO {
  transaction_date?: string;
  description?: string;
  transaction_type?: TransactionType;
  source_type?: SourceType;
  source_id?: string;
  amount?: number;
  vendor_name?: string;
  subcontractor_id?: string;
  invoice_number?: string;
  po_number?: string;
  notes?: string;
}

// =============================================
// Filter Types
// =============================================

export interface CostCodeFilters {
  companyId: string;
  division?: string;
  level?: number;
  costType?: CostType;
  isActive?: boolean;
  parentCodeId?: string;
  search?: string;
}

export interface ProjectBudgetFilters {
  projectId: string;
  costCodeId?: string;
  division?: string;
  hasVariance?: boolean;  // true = over budget, false = under budget
}

export interface CostTransactionFilters {
  projectId: string;
  costCodeId?: string;
  transactionType?: TransactionType;
  sourceType?: SourceType;
  dateFrom?: string;
  dateTo?: string;
  vendorName?: string;
  subcontractorId?: string;
}

// =============================================
// Statistics Types
// =============================================

/**
 * Project budget totals
 */
export interface ProjectBudgetTotals {
  total_original_budget: number;
  total_approved_changes: number;
  total_revised_budget: number;
  total_committed_cost: number;
  total_actual_cost: number;
  total_variance: number;
  budget_count: number;
}

/**
 * Budget summary by division
 */
export interface BudgetSummaryByDivision {
  division: string;
  division_name: string;
  original_budget: number;
  revised_budget: number;
  actual_cost: number;
  variance: number;
  percent_spent: number;
}

/**
 * Cost trend data point
 */
export interface CostTrendDataPoint {
  date: string;
  committed: number;
  actual: number;
  budget: number;
}

// =============================================
// Form Types
// =============================================

export interface ProjectBudgetFormData {
  cost_code_id: string;
  original_budget: string;  // String for form input
  approved_changes: string;
  committed_cost: string;
  actual_cost: string;
  estimated_cost_at_completion: string;
  notes: string;
}

export interface CostTransactionFormData {
  cost_code_id: string;
  transaction_date: string;
  description: string;
  transaction_type: TransactionType;
  source_type: SourceType | '';
  amount: string;  // String for form input
  vendor_name: string;
  subcontractor_id: string;
  invoice_number: string;
  po_number: string;
  notes: string;
}
