/**
 * Daily Report Cost Aggregation Types
 * Types for cost views that aggregate daily report data by cost code
 * Aligned with migration 153_daily_report_cost_aggregation.sql
 */

// =============================================
// View Types (matching SQL views)
// =============================================

/**
 * Labor aggregated by cost code and date
 * From: labor_by_cost_code view
 */
export interface LaborByCostCode {
  project_id: string;
  report_date: string;
  cost_code: string;
  phase_code: string | null;
  entry_count: number;
  total_headcount: number;
  total_regular_hours: number;
  total_overtime_hours: number;
  total_double_time_hours: number;
  total_hours: number;
  total_weighted_hours: number; // Regular + OT*1.5 + DT*2
}

/**
 * Equipment usage aggregated by cost code and date
 * From: equipment_by_cost_code view
 */
export interface EquipmentByCostCode {
  project_id: string;
  report_date: string;
  cost_code: string;
  entry_count: number;
  total_operated_hours: number;
  total_idle_hours: number;
  total_breakdown_hours: number;
  total_fuel_used: number;
}

/**
 * Production progress aggregated by cost code and date
 * From: progress_by_cost_code view
 */
export interface ProgressByCostCode {
  project_id: string;
  report_date: string;
  cost_code: string;
  unit_of_measure: string | null;
  entry_count: number;
  total_planned_quantity: number;
  total_actual_quantity: number;
  productivity_percentage: number;
}

/**
 * Combined work performed aggregated by cost code
 * From: work_performed_by_cost_code view
 */
export interface WorkPerformedByCostCode {
  project_id: string;
  report_date: string;
  cost_code: string;
  total_labor_hours: number;
  total_labor_weighted_hours: number;
  total_equipment_hours: number;
  total_quantity_installed: number;
  total_headcount: number;
  total_equipment_count: number;
}

/**
 * Daily report cost summary with cost code details
 * From: daily_report_cost_summary view
 */
export interface DailyReportCostSummary {
  project_id: string;
  report_date: string;
  cost_code: string;
  cost_code_name: string | null;
  division: string | null;
  cost_code_description: string | null;
  total_labor_hours: number;
  total_labor_weighted_hours: number;
  total_equipment_hours: number;
  total_quantity_installed: number;
  total_headcount: number;
  total_equipment_count: number;
}

// =============================================
// Function Return Types
// =============================================

/**
 * Project cost by date range result
 * From: get_project_cost_by_date_range function
 */
export interface ProjectCostByDateRange {
  cost_code: string;
  cost_code_name: string | null;
  division: string | null;
  total_labor_hours: number;
  total_labor_weighted_hours: number;
  total_equipment_hours: number;
  total_quantity_installed: number;
  total_headcount: number;
  day_count: number;
}

/**
 * Daily cost trend data point
 * From: get_daily_cost_trend function
 */
export interface DailyCostTrend {
  report_date: string;
  total_labor_hours: number;
  total_equipment_hours: number;
  total_quantity_installed: number;
  total_headcount: number;
}

// =============================================
// Extended Types with Computed Fields
// =============================================

/**
 * Labor with productivity metrics
 */
export interface LaborByCostCodeWithMetrics extends LaborByCostCode {
  avg_hours_per_worker: number;
  overtime_ratio: number; // OT hours / total hours
}

/**
 * Equipment with utilization metrics
 */
export interface EquipmentByCostCodeWithMetrics extends EquipmentByCostCode {
  utilization_rate: number; // operated / (operated + idle + breakdown)
  downtime_rate: number; // breakdown / total
}

/**
 * Progress with productivity analysis
 */
export interface ProgressByCostCodeWithMetrics extends ProgressByCostCode {
  variance: number; // actual - planned
  variance_percentage: number;
  is_on_track: boolean;
}

/**
 * Aggregated cost summary for a period
 */
export interface CostCodePeriodSummary {
  cost_code: string;
  cost_code_name: string | null;
  division: string | null;

  // Labor totals
  total_labor_hours: number;
  total_weighted_hours: number;
  total_headcount: number;
  avg_daily_headcount: number;

  // Equipment totals
  total_equipment_hours: number;
  total_equipment_count: number;
  avg_equipment_utilization: number;

  // Production totals
  total_quantity_installed: number;
  production_rate: number; // quantity per labor hour

  // Period info
  start_date: string;
  end_date: string;
  work_days: number;
}

// =============================================
// Filter Types
// =============================================

export interface DailyReportCostFilters {
  projectId: string;
  costCode?: string;
  phaseCode?: string;
  startDate?: string;
  endDate?: string;
  division?: string;
}

export interface CostTrendFilters {
  projectId: string;
  costCode?: string;
  days?: number; // Default 30
}

export interface DateRangeFilters {
  projectId: string;
  startDate: string;
  endDate: string;
  costCodes?: string[];
  divisions?: string[];
}

// =============================================
// Chart Data Types
// =============================================

/**
 * Data point for labor trend chart
 */
export interface LaborTrendChartData {
  date: string;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  headcount: number;
}

/**
 * Data point for equipment utilization chart
 */
export interface EquipmentUtilizationChartData {
  date: string;
  operatedHours: number;
  idleHours: number;
  breakdownHours: number;
  fuelUsed: number;
}

/**
 * Data point for production chart
 */
export interface ProductionChartData {
  date: string;
  plannedQuantity: number;
  actualQuantity: number;
  productivity: number;
}

/**
 * Combined daily cost chart data
 */
export interface DailyCostChartData {
  date: string;
  laborHours: number;
  equipmentHours: number;
  quantityInstalled: number;
  headcount: number;
}

// =============================================
// Summary Stats Types
// =============================================

/**
 * Project-level cost statistics
 */
export interface ProjectCostStats {
  projectId: string;

  // Labor stats
  totalLaborHours: number;
  totalWeightedHours: number;
  avgDailyHeadcount: number;
  peakHeadcount: number;

  // Equipment stats
  totalEquipmentHours: number;
  avgEquipmentUtilization: number;
  totalFuelUsed: number;

  // Production stats
  totalQuantityInstalled: number;
  avgProductivityPercent: number;

  // Cost codes
  activeCostCodes: number;
  topCostCodeByHours: string | null;
  topCostCodeByQuantity: string | null;

  // Period
  periodStart: string;
  periodEnd: string;
  workDays: number;
}

/**
 * Cost code comparison data
 */
export interface CostCodeComparison {
  costCode: string;
  costCodeName: string | null;

  // Current period
  currentLaborHours: number;
  currentEquipmentHours: number;
  currentQuantity: number;

  // Previous period
  previousLaborHours: number;
  previousEquipmentHours: number;
  previousQuantity: number;

  // Variance
  laborHoursChange: number;
  laborHoursChangePercent: number;
  equipmentHoursChange: number;
  equipmentHoursChangePercent: number;
  quantityChange: number;
  quantityChangePercent: number;
}

// =============================================
// API Response Types
// =============================================

export interface LaborByCostCodeResponse {
  data: LaborByCostCode[];
  totals: {
    totalEntries: number;
    totalHeadcount: number;
    totalHours: number;
    totalWeightedHours: number;
  };
}

export interface EquipmentByCostCodeResponse {
  data: EquipmentByCostCode[];
  totals: {
    totalEntries: number;
    totalOperatedHours: number;
    totalIdleHours: number;
    totalFuelUsed: number;
  };
}

export interface ProgressByCostCodeResponse {
  data: ProgressByCostCode[];
  totals: {
    totalEntries: number;
    totalPlannedQuantity: number;
    totalActualQuantity: number;
    overallProductivity: number;
  };
}

export interface DailyReportCostSummaryResponse {
  data: DailyReportCostSummary[];
  byDivision: Record<string, {
    totalLaborHours: number;
    totalEquipmentHours: number;
    totalQuantity: number;
  }>;
}
