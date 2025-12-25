/**
 * Cost Tracking Types
 * Types for cost codes, project budgets, and cost transactions
 * Aligned with migration 048_cost_codes.sql
 * Enhanced with multi-currency support
 */

import type { CurrencyCode, MultiCurrencyAmount } from './currency';

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

  // Multi-Currency Support
  currency: CurrencyCode;
  original_budget_base: number;  // Amount in base currency
  approved_changes_base: number;
  committed_cost_base: number;
  actual_cost_base: number;
  estimated_cost_at_completion_base: number | null;
  exchange_rate: number;  // Rate used for conversion
  conversion_date: string;

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

  // Multi-Currency Support
  currency: CurrencyCode;
  amount_base_currency: number;  // Amount in project's base currency
  exchange_rate: number;  // Rate at time of transaction
  conversion_date: string;

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
  currency?: CurrencyCode;  // If not provided, uses project's base currency
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
  currency?: CurrencyCode;
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
  currency?: CurrencyCode;  // If not provided, uses project's base currency
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
  currency?: CurrencyCode;
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

// =============================================
// Earned Value Management (EVM) Types
// =============================================

/**
 * EVM Performance Status based on CPI/SPI thresholds
 */
export type EVMPerformanceStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * EVM Trend direction
 */
export type EVMTrend = 'improving' | 'stable' | 'declining';

/**
 * Core Earned Value Metrics
 * Standard EVM calculations per PMI/PMBOK methodology
 */
export interface EarnedValueMetrics {
  // Baseline Values
  BAC: number;  // Budget at Completion - total project budget

  // Point-in-Time Values (as of status date)
  PV: number;   // Planned Value (BCWS) - budgeted cost of work scheduled
  EV: number;   // Earned Value (BCWP) - budgeted cost of work performed
  AC: number;   // Actual Cost (ACWP) - actual cost of work performed

  // Variance Metrics
  CV: number;   // Cost Variance = EV - AC (positive = under budget)
  SV: number;   // Schedule Variance = EV - PV (positive = ahead of schedule)
  CV_percent: number;  // CV% = CV / EV * 100
  SV_percent: number;  // SV% = SV / PV * 100

  // Performance Indices
  CPI: number;  // Cost Performance Index = EV / AC (>1 = under budget)
  SPI: number;  // Schedule Performance Index = EV / PV (>1 = ahead)
  CSI: number;  // Cost-Schedule Index = CPI * SPI (critical metric)

  // Forecasts (Estimates at Completion)
  EAC: number;  // Estimate at Completion - projected final cost
  ETC: number;  // Estimate to Complete = EAC - AC
  VAC: number;  // Variance at Completion = BAC - EAC
  VAC_percent: number;  // VAC% = VAC / BAC * 100

  // To-Complete Performance Index
  TCPI_BAC: number;  // TCPI to meet original budget = (BAC - EV) / (BAC - AC)
  TCPI_EAC: number;  // TCPI to meet EAC = (BAC - EV) / (EAC - AC)

  // Schedule Forecasts
  planned_duration: number;    // Original planned duration in days
  actual_duration: number;     // Days elapsed since start
  estimated_duration: number;  // Projected total duration = planned_duration / SPI

  // Percent Complete
  percent_complete_planned: number;  // PV / BAC * 100
  percent_complete_actual: number;   // EV / BAC * 100
  percent_spent: number;             // AC / BAC * 100

  // Status indicators
  cost_status: EVMPerformanceStatus;
  schedule_status: EVMPerformanceStatus;
  overall_status: EVMPerformanceStatus;

  // Metadata
  status_date: string;  // Date of this EVM snapshot
  data_currency: 'current' | 'stale';  // Based on how recent data is
}

/**
 * EVM metrics aggregated by cost code division
 */
export interface EVMByDivision {
  division: string;
  division_name: string;
  BAC: number;
  PV: number;
  EV: number;
  AC: number;
  CV: number;
  SV: number;
  CPI: number;
  SPI: number;
  EAC: number;
  percent_complete: number;
  cost_status: EVMPerformanceStatus;
  schedule_status: EVMPerformanceStatus;
}

/**
 * EVM historical data point for trend analysis
 */
export interface EVMTrendDataPoint {
  date: string;
  PV: number;
  EV: number;
  AC: number;
  CPI: number;
  SPI: number;
  percent_complete: number;
}

/**
 * EVM S-Curve data for visualization
 */
export interface EVMSCurveData {
  date: string;
  planned_cumulative: number;  // Cumulative PV
  earned_cumulative: number;   // Cumulative EV
  actual_cumulative: number;   // Cumulative AC
  forecast_cumulative: number; // Projected based on current CPI
}

/**
 * EVM Forecast Scenarios
 */
export interface EVMForecastScenarios {
  // Original Plan
  original: {
    EAC: number;
    completion_date: string;
    method: 'Original Budget';
  };

  // Current CPI-based forecast
  cpi_based: {
    EAC: number;  // BAC / CPI
    completion_date: string;
    method: 'CPI Projection';
  };

  // SPI-adjusted forecast (most common)
  spi_adjusted: {
    EAC: number;  // AC + (BAC - EV) / (CPI * SPI)
    completion_date: string;
    method: 'CPI×SPI Projection';
  };

  // Manager's estimate (manual override)
  management: {
    EAC: number | null;
    completion_date: string | null;
    method: 'Management Estimate';
    notes: string | null;
  };
}

/**
 * Project EVM Summary for dashboard
 */
export interface ProjectEVMSummary {
  project_id: string;
  project_name: string;
  metrics: EarnedValueMetrics;
  trend: EVMTrendDataPoint[];
  forecasts: EVMForecastScenarios;
  by_division: EVMByDivision[];
  health_indicators: {
    cost_trend: EVMTrend;
    schedule_trend: EVMTrend;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    alerts: EVMAlert[];
  };
}

/**
 * EVM Alert for proactive warnings
 */
export interface EVMAlert {
  id: string;
  type: 'cost_overrun' | 'schedule_slip' | 'budget_exhaustion' | 'performance_decline' | 'milestone_risk';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric: string;
  threshold: number;
  current_value: number;
  created_at: string;
}

/**
 * EVM Configuration thresholds
 */
export interface EVMThresholds {
  // CPI thresholds
  cpi_excellent: number;    // >= 1.05
  cpi_good: number;         // >= 1.0
  cpi_fair: number;         // >= 0.95
  cpi_poor: number;         // >= 0.90
  // Below cpi_poor = critical

  // SPI thresholds
  spi_excellent: number;    // >= 1.05
  spi_good: number;         // >= 1.0
  spi_fair: number;         // >= 0.95
  spi_poor: number;         // >= 0.90

  // Alert thresholds
  alert_variance_percent: number;  // Trigger alert when CV% or SV% exceeds this
  alert_index_threshold: number;   // Trigger alert when CPI or SPI falls below this
}

/**
 * Default EVM threshold configuration
 */
export const DEFAULT_EVM_THRESHOLDS: EVMThresholds = {
  cpi_excellent: 1.05,
  cpi_good: 1.0,
  cpi_fair: 0.95,
  cpi_poor: 0.90,
  spi_excellent: 1.05,
  spi_good: 1.0,
  spi_fair: 0.95,
  spi_poor: 0.90,
  alert_variance_percent: 10,
  alert_index_threshold: 0.90,
};

/**
 * Helper function to determine performance status from index value
 */
export function getPerformanceStatus(
  index: number,
  thresholds: EVMThresholds = DEFAULT_EVM_THRESHOLDS,
  type: 'cpi' | 'spi' = 'cpi'
): EVMPerformanceStatus {
  const prefix = type;
  if (index >= thresholds[`${prefix}_excellent`]) {return 'excellent';}
  if (index >= thresholds[`${prefix}_good`]) {return 'good';}
  if (index >= thresholds[`${prefix}_fair`]) {return 'fair';}
  if (index >= thresholds[`${prefix}_poor`]) {return 'poor';}
  return 'critical';
}

/**
 * EVM display configuration for UI
 */
export const EVM_STATUS_CONFIG: Record<EVMPerformanceStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  excellent: { label: 'Excellent', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: 'TrendingUp' },
  good: { label: 'Good', color: 'text-success-dark', bgColor: 'bg-success-light', icon: 'CheckCircle' },
  fair: { label: 'Fair', color: 'text-yellow-700', bgColor: 'bg-warning-light', icon: 'AlertTriangle' },
  poor: { label: 'Poor', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: 'AlertCircle' },
  critical: { label: 'Critical', color: 'text-error-dark', bgColor: 'bg-error-light', icon: 'XCircle' },
};

// =============================================
// Budget Variance Alerts
// =============================================

/**
 * Budget variance alert type
 */
export type BudgetVarianceAlertType =
  | 'line_over_budget'     // Individual budget line exceeded
  | 'line_near_budget'     // Individual line approaching threshold
  | 'project_over_budget'  // Total project variance exceeds threshold
  | 'division_over_budget' // Division total exceeds threshold
  | 'variance_trending'    // Variance getting worse over time

/**
 * Budget variance alert severity
 */
export type BudgetVarianceAlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Budget variance threshold configuration
 */
export interface BudgetVarianceThresholds {
  // Budget line thresholds (% over revised budget)
  critical_overrun_percent: number;  // Default: 10%
  warning_overrun_percent: number;   // Default: 5%
  near_budget_percent: number;       // Default: 90% spent

  // Project-level thresholds
  project_critical_percent: number;  // Default: 5%
  project_warning_percent: number;   // Default: 3%

  // Minimum variance amount to trigger alert (avoid noise on small items)
  minimum_variance_amount: number;   // Default: $1,000
}

/**
 * Default budget variance thresholds
 */
export const DEFAULT_VARIANCE_THRESHOLDS: BudgetVarianceThresholds = {
  critical_overrun_percent: 10,
  warning_overrun_percent: 5,
  near_budget_percent: 90,
  project_critical_percent: 5,
  project_warning_percent: 3,
  minimum_variance_amount: 1000,
};

/**
 * Budget variance alert
 */
export interface BudgetVarianceAlert {
  id: string;
  type: BudgetVarianceAlertType;
  severity: BudgetVarianceAlertSeverity;
  title: string;
  message: string;

  // Related entity
  budget_id?: string;
  cost_code?: string;
  cost_code_name?: string;
  division?: string;

  // Variance details
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent: number;
  threshold_percent: number;

  created_at: string;
}

/**
 * Budget variance alert summary
 */
export interface BudgetVarianceAlertSummary {
  total_alerts: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  total_overrun_amount: number;
  lines_over_budget: number;
  alerts: BudgetVarianceAlert[];
}

/**
 * UI configuration for variance alert severity
 */
export const VARIANCE_ALERT_CONFIG: Record<BudgetVarianceAlertSeverity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  critical: {
    label: 'Critical',
    color: 'text-error-dark',
    bgColor: 'bg-error-light',
    borderColor: 'border-red-200',
    icon: 'AlertCircle',
  },
  warning: {
    label: 'Warning',
    color: 'text-amber-700',
    bgColor: 'bg-warning-light',
    borderColor: 'border-amber-200',
    icon: 'AlertTriangle',
  },
  info: {
    label: 'Info',
    color: 'text-primary-hover',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: 'Info',
  },
};
