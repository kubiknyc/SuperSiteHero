/**
 * Daily Report Cost Aggregation API Service
 *
 * Provides access to cost aggregation views and functions that summarize
 * daily report data by cost code. Uses the SQL views and functions from
 * migration 153_daily_report_cost_aggregation.sql
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';

import type {
  LaborByCostCode,
  EquipmentByCostCode,
  ProgressByCostCode,
  WorkPerformedByCostCode,
  DailyReportCostSummary,
  ProjectCostByDateRange,
  DailyCostTrend,
  DailyReportCostFilters,
  CostTrendFilters,
  DateRangeFilters,
  ProjectCostStats,
  CostCodePeriodSummary,
  LaborByCostCodeResponse,
  EquipmentByCostCodeResponse,
  ProgressByCostCodeResponse,
  DailyReportCostSummaryResponse,
} from '@/types/daily-report-costs';

// Using extended Database types for views not yet in generated types
const db: any = supabase;

// ============================================================================
// LABOR BY COST CODE
// ============================================================================

export const laborByCostCodeApi = {
  /**
   * Get labor data aggregated by cost code with optional filters
   */
  async getLaborByCostCode(filters: DailyReportCostFilters): Promise<LaborByCostCode[]> {
    let query = db
      .from('labor_by_cost_code')
      .select('*')
      .eq('project_id', filters.projectId)
      .order('report_date', { ascending: false })
      .order('cost_code', { ascending: true });

    if (filters.costCode) {
      query = query.eq('cost_code', filters.costCode);
    }
    if (filters.phaseCode) {
      query = query.eq('phase_code', filters.phaseCode);
    }
    if (filters.startDate) {
      query = query.gte('report_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('report_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Get labor data with totals for a date range
   */
  async getLaborWithTotals(filters: DailyReportCostFilters): Promise<LaborByCostCodeResponse> {
    const data = await this.getLaborByCostCode(filters);

    const totals = data.reduce(
      (acc, row) => ({
        totalEntries: acc.totalEntries + Number(row.entry_count || 0),
        totalHeadcount: acc.totalHeadcount + Number(row.total_headcount || 0),
        totalHours: acc.totalHours + Number(row.total_hours || 0),
        totalWeightedHours: acc.totalWeightedHours + Number(row.total_weighted_hours || 0),
      }),
      { totalEntries: 0, totalHeadcount: 0, totalHours: 0, totalWeightedHours: 0 }
    );

    return { data, totals };
  },
};

// ============================================================================
// EQUIPMENT BY COST CODE
// ============================================================================

export const equipmentByCostCodeApi = {
  /**
   * Get equipment data aggregated by cost code with optional filters
   */
  async getEquipmentByCostCode(filters: DailyReportCostFilters): Promise<EquipmentByCostCode[]> {
    let query = db
      .from('equipment_by_cost_code')
      .select('*')
      .eq('project_id', filters.projectId)
      .order('report_date', { ascending: false })
      .order('cost_code', { ascending: true });

    if (filters.costCode) {
      query = query.eq('cost_code', filters.costCode);
    }
    if (filters.startDate) {
      query = query.gte('report_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('report_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Get equipment data with totals for a date range
   */
  async getEquipmentWithTotals(filters: DailyReportCostFilters): Promise<EquipmentByCostCodeResponse> {
    const data = await this.getEquipmentByCostCode(filters);

    const totals = data.reduce(
      (acc, row) => ({
        totalEntries: acc.totalEntries + Number(row.entry_count || 0),
        totalOperatedHours: acc.totalOperatedHours + Number(row.total_operated_hours || 0),
        totalIdleHours: acc.totalIdleHours + Number(row.total_idle_hours || 0),
        totalFuelUsed: acc.totalFuelUsed + Number(row.total_fuel_used || 0),
      }),
      { totalEntries: 0, totalOperatedHours: 0, totalIdleHours: 0, totalFuelUsed: 0 }
    );

    return { data, totals };
  },
};

// ============================================================================
// PROGRESS BY COST CODE
// ============================================================================

export const progressByCostCodeApi = {
  /**
   * Get progress/production data aggregated by cost code with optional filters
   */
  async getProgressByCostCode(filters: DailyReportCostFilters): Promise<ProgressByCostCode[]> {
    let query = db
      .from('progress_by_cost_code')
      .select('*')
      .eq('project_id', filters.projectId)
      .order('report_date', { ascending: false })
      .order('cost_code', { ascending: true });

    if (filters.costCode) {
      query = query.eq('cost_code', filters.costCode);
    }
    if (filters.startDate) {
      query = query.gte('report_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('report_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Get progress data with totals for a date range
   */
  async getProgressWithTotals(filters: DailyReportCostFilters): Promise<ProgressByCostCodeResponse> {
    const data = await this.getProgressByCostCode(filters);

    const totals = data.reduce(
      (acc, row) => ({
        totalEntries: acc.totalEntries + Number(row.entry_count || 0),
        totalPlannedQuantity: acc.totalPlannedQuantity + Number(row.total_planned_quantity || 0),
        totalActualQuantity: acc.totalActualQuantity + Number(row.total_actual_quantity || 0),
        overallProductivity: 0, // Calculate below
      }),
      { totalEntries: 0, totalPlannedQuantity: 0, totalActualQuantity: 0, overallProductivity: 0 }
    );

    // Calculate overall productivity percentage
    if (totals.totalPlannedQuantity > 0) {
      totals.overallProductivity = (totals.totalActualQuantity / totals.totalPlannedQuantity) * 100;
    }

    return { data, totals };
  },
};

// ============================================================================
// WORK PERFORMED BY COST CODE (Combined View)
// ============================================================================

export const workPerformedByCostCodeApi = {
  /**
   * Get combined work performed data (labor + equipment + progress)
   */
  async getWorkPerformedByCostCode(filters: DailyReportCostFilters): Promise<WorkPerformedByCostCode[]> {
    let query = db
      .from('work_performed_by_cost_code')
      .select('*')
      .eq('project_id', filters.projectId)
      .order('report_date', { ascending: false })
      .order('cost_code', { ascending: true });

    if (filters.costCode) {
      query = query.eq('cost_code', filters.costCode);
    }
    if (filters.startDate) {
      query = query.gte('report_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('report_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Get work performed grouped by cost code (aggregated across dates)
   */
  async getWorkPerformedGroupedByCostCode(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Map<string, WorkPerformedByCostCode>> {
    const filters: DailyReportCostFilters = { projectId, startDate, endDate };
    const data = await this.getWorkPerformedByCostCode(filters);

    const grouped = new Map<string, WorkPerformedByCostCode>();

    data.forEach((row) => {
      const existing = grouped.get(row.cost_code);
      if (existing) {
        existing.total_labor_hours += Number(row.total_labor_hours || 0);
        existing.total_labor_weighted_hours += Number(row.total_labor_weighted_hours || 0);
        existing.total_equipment_hours += Number(row.total_equipment_hours || 0);
        existing.total_quantity_installed += Number(row.total_quantity_installed || 0);
        existing.total_headcount += Number(row.total_headcount || 0);
        existing.total_equipment_count += Number(row.total_equipment_count || 0);
      } else {
        grouped.set(row.cost_code, { ...row });
      }
    });

    return grouped;
  },
};

// ============================================================================
// DAILY REPORT COST SUMMARY (View with Cost Code Details)
// ============================================================================

export const dailyReportCostSummaryApi = {
  /**
   * Get cost summary with cost code details
   */
  async getCostSummary(filters: DailyReportCostFilters): Promise<DailyReportCostSummary[]> {
    let query = db
      .from('daily_report_cost_summary')
      .select('*')
      .eq('project_id', filters.projectId)
      .order('report_date', { ascending: false })
      .order('cost_code', { ascending: true });

    if (filters.costCode) {
      query = query.eq('cost_code', filters.costCode);
    }
    if (filters.division) {
      query = query.eq('division', filters.division);
    }
    if (filters.startDate) {
      query = query.gte('report_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('report_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Get cost summary with division breakdown
   */
  async getCostSummaryByDivision(filters: DailyReportCostFilters): Promise<DailyReportCostSummaryResponse> {
    const data = await this.getCostSummary(filters);

    const byDivision: Record<string, { totalLaborHours: number; totalEquipmentHours: number; totalQuantity: number }> = {};

    data.forEach((row) => {
      const division = row.division || 'Unknown';
      if (!byDivision[division]) {
        byDivision[division] = { totalLaborHours: 0, totalEquipmentHours: 0, totalQuantity: 0 };
      }
      byDivision[division].totalLaborHours += Number(row.total_labor_hours || 0);
      byDivision[division].totalEquipmentHours += Number(row.total_equipment_hours || 0);
      byDivision[division].totalQuantity += Number(row.total_quantity_installed || 0);
    });

    return { data, byDivision };
  },
};

// ============================================================================
// RPC FUNCTIONS
// ============================================================================

export const dailyReportCostFunctionsApi = {
  /**
   * Get project cost aggregated by date range
   * Uses: get_project_cost_by_date_range function
   */
  async getProjectCostByDateRange(filters: DateRangeFilters): Promise<ProjectCostByDateRange[]> {
    const { data, error } = await db.rpc('get_project_cost_by_date_range', {
      p_project_id: filters.projectId,
      p_start_date: filters.startDate,
      p_end_date: filters.endDate,
    });

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Get daily cost trend for a project
   * Uses: get_daily_cost_trend function
   */
  async getDailyCostTrend(filters: CostTrendFilters): Promise<DailyCostTrend[]> {
    const { data, error } = await db.rpc('get_daily_cost_trend', {
      p_project_id: filters.projectId,
      p_cost_code: filters.costCode || null,
      p_days: filters.days || 30,
    });

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },
};

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

export const dailyReportCostStatsApi = {
  /**
   * Get comprehensive project cost statistics
   */
  async getProjectCostStats(projectId: string, startDate?: string, endDate?: string): Promise<ProjectCostStats> {
    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch data from all views in parallel
    const [laborData, equipmentData, progressData] = await Promise.all([
      laborByCostCodeApi.getLaborByCostCode({ projectId, startDate: start, endDate: end }),
      equipmentByCostCodeApi.getEquipmentByCostCode({ projectId, startDate: start, endDate: end }),
      progressByCostCodeApi.getProgressByCostCode({ projectId, startDate: start, endDate: end }),
    ]);

    // Calculate labor stats
    let totalLaborHours = 0;
    let totalWeightedHours = 0;
    let totalHeadcount = 0;
    let peakHeadcount = 0;
    const laborCostCodeHours = new Map<string, number>();

    laborData.forEach((row) => {
      totalLaborHours += Number(row.total_hours || 0);
      totalWeightedHours += Number(row.total_weighted_hours || 0);
      totalHeadcount += Number(row.total_headcount || 0);
      if (Number(row.total_headcount || 0) > peakHeadcount) {
        peakHeadcount = Number(row.total_headcount);
      }

      const existing = laborCostCodeHours.get(row.cost_code) || 0;
      laborCostCodeHours.set(row.cost_code, existing + Number(row.total_hours || 0));
    });

    // Calculate equipment stats
    let totalEquipmentHours = 0;
    let totalFuelUsed = 0;
    let totalOperatedHours = 0;
    let totalIdleHours = 0;
    let totalBreakdownHours = 0;

    equipmentData.forEach((row) => {
      totalOperatedHours += Number(row.total_operated_hours || 0);
      totalIdleHours += Number(row.total_idle_hours || 0);
      totalBreakdownHours += Number(row.total_breakdown_hours || 0);
      totalFuelUsed += Number(row.total_fuel_used || 0);
    });
    totalEquipmentHours = totalOperatedHours + totalIdleHours + totalBreakdownHours;

    const avgEquipmentUtilization =
      totalEquipmentHours > 0 ? (totalOperatedHours / totalEquipmentHours) * 100 : 0;

    // Calculate production stats
    let totalQuantityInstalled = 0;
    let totalPlanned = 0;
    let totalActual = 0;
    const progressCostCodeQuantity = new Map<string, number>();

    progressData.forEach((row) => {
      totalQuantityInstalled += Number(row.total_actual_quantity || 0);
      totalPlanned += Number(row.total_planned_quantity || 0);
      totalActual += Number(row.total_actual_quantity || 0);

      const existing = progressCostCodeQuantity.get(row.cost_code) || 0;
      progressCostCodeQuantity.set(row.cost_code, existing + Number(row.total_actual_quantity || 0));
    });

    const avgProductivityPercent = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

    // Get unique dates for work days calculation
    const uniqueDates = new Set<string>();
    laborData.forEach((row) => uniqueDates.add(row.report_date));
    equipmentData.forEach((row) => uniqueDates.add(row.report_date));
    progressData.forEach((row) => uniqueDates.add(row.report_date));

    const workDays = uniqueDates.size;
    const avgDailyHeadcount = workDays > 0 ? totalHeadcount / workDays : 0;

    // Find top cost codes
    let topCostCodeByHours: string | null = null;
    let maxHours = 0;
    laborCostCodeHours.forEach((hours, code) => {
      if (hours > maxHours) {
        maxHours = hours;
        topCostCodeByHours = code;
      }
    });

    let topCostCodeByQuantity: string | null = null;
    let maxQuantity = 0;
    progressCostCodeQuantity.forEach((qty, code) => {
      if (qty > maxQuantity) {
        maxQuantity = qty;
        topCostCodeByQuantity = code;
      }
    });

    // Get unique cost codes
    const activeCostCodes = new Set<string>();
    laborData.forEach((row) => activeCostCodes.add(row.cost_code));
    equipmentData.forEach((row) => activeCostCodes.add(row.cost_code));
    progressData.forEach((row) => activeCostCodes.add(row.cost_code));

    return {
      projectId,
      totalLaborHours,
      totalWeightedHours,
      avgDailyHeadcount,
      peakHeadcount,
      totalEquipmentHours,
      avgEquipmentUtilization,
      totalFuelUsed,
      totalQuantityInstalled,
      avgProductivityPercent,
      activeCostCodes: activeCostCodes.size,
      topCostCodeByHours,
      topCostCodeByQuantity,
      periodStart: start,
      periodEnd: end,
      workDays,
    };
  },

  /**
   * Get cost code period summary for reporting
   */
  async getCostCodePeriodSummary(
    projectId: string,
    costCode: string,
    startDate: string,
    endDate: string
  ): Promise<CostCodePeriodSummary | null> {
    const filters: DailyReportCostFilters = { projectId, costCode, startDate, endDate };

    const [laborData, equipmentData, progressData, costSummaryData] = await Promise.all([
      laborByCostCodeApi.getLaborByCostCode(filters),
      equipmentByCostCodeApi.getEquipmentByCostCode(filters),
      progressByCostCodeApi.getProgressByCostCode(filters),
      dailyReportCostSummaryApi.getCostSummary(filters),
    ]);

    if (laborData.length === 0 && equipmentData.length === 0 && progressData.length === 0) {
      return null;
    }

    // Get cost code name from summary data
    const costCodeName = costSummaryData[0]?.cost_code_name || null;
    const division = costSummaryData[0]?.division || null;

    // Calculate labor totals
    let totalLaborHours = 0;
    let totalWeightedHours = 0;
    let totalHeadcount = 0;
    const laborDates = new Set<string>();

    laborData.forEach((row) => {
      totalLaborHours += Number(row.total_hours || 0);
      totalWeightedHours += Number(row.total_weighted_hours || 0);
      totalHeadcount += Number(row.total_headcount || 0);
      laborDates.add(row.report_date);
    });

    // Calculate equipment totals
    let totalEquipmentHours = 0;
    let totalEquipmentCount = 0;
    let totalOperatedHours = 0;
    let totalIdleHours = 0;
    let totalBreakdownHours = 0;

    equipmentData.forEach((row) => {
      totalOperatedHours += Number(row.total_operated_hours || 0);
      totalIdleHours += Number(row.total_idle_hours || 0);
      totalBreakdownHours += Number(row.total_breakdown_hours || 0);
      totalEquipmentCount += Number(row.entry_count || 0);
    });
    totalEquipmentHours = totalOperatedHours + totalIdleHours + totalBreakdownHours;

    const avgEquipmentUtilization =
      totalEquipmentHours > 0 ? (totalOperatedHours / totalEquipmentHours) * 100 : 0;

    // Calculate production totals
    let totalQuantityInstalled = 0;
    progressData.forEach((row) => {
      totalQuantityInstalled += Number(row.total_actual_quantity || 0);
    });

    // Calculate work days
    const uniqueDates = new Set<string>();
    laborData.forEach((row) => uniqueDates.add(row.report_date));
    equipmentData.forEach((row) => uniqueDates.add(row.report_date));
    progressData.forEach((row) => uniqueDates.add(row.report_date));

    const workDays = uniqueDates.size;
    const avgDailyHeadcount = workDays > 0 ? totalHeadcount / workDays : 0;
    const productionRate = totalLaborHours > 0 ? totalQuantityInstalled / totalLaborHours : 0;

    return {
      cost_code: costCode,
      cost_code_name: costCodeName,
      division,
      total_labor_hours: totalLaborHours,
      total_weighted_hours: totalWeightedHours,
      total_headcount: totalHeadcount,
      avg_daily_headcount: avgDailyHeadcount,
      total_equipment_hours: totalEquipmentHours,
      total_equipment_count: totalEquipmentCount,
      avg_equipment_utilization: avgEquipmentUtilization,
      total_quantity_installed: totalQuantityInstalled,
      production_rate: productionRate,
      start_date: startDate,
      end_date: endDate,
      work_days: workDays,
    };
  },
};

// ============================================================================
// COMBINED API EXPORT
// ============================================================================

export const dailyReportCostsApi = {
  labor: laborByCostCodeApi,
  equipment: equipmentByCostCodeApi,
  progress: progressByCostCodeApi,
  workPerformed: workPerformedByCostCodeApi,
  summary: dailyReportCostSummaryApi,
  functions: dailyReportCostFunctionsApi,
  stats: dailyReportCostStatsApi,
};
