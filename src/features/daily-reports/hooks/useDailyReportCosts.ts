/**
 * Daily Report Cost Aggregation React Query Hooks
 *
 * Query hooks for accessing cost aggregation views that summarize
 * daily report data by cost code. Uses the API service from
 * daily-report-costs.ts
 */

import { useQuery } from '@tanstack/react-query';
import { dailyReportCostsApi } from '@/lib/api/services/daily-report-costs';

import type {
  DailyReportCostFilters,
  CostTrendFilters,
  DateRangeFilters,
} from '@/types/daily-report-costs';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const dailyReportCostKeys = {
  all: ['daily-report-costs'] as const,

  // Labor by cost code
  labor: () => [...dailyReportCostKeys.all, 'labor'] as const,
  laborList: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.labor(), 'list', filters] as const,
  laborWithTotals: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.labor(), 'with-totals', filters] as const,

  // Equipment by cost code
  equipment: () => [...dailyReportCostKeys.all, 'equipment'] as const,
  equipmentList: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.equipment(), 'list', filters] as const,
  equipmentWithTotals: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.equipment(), 'with-totals', filters] as const,

  // Progress by cost code
  progress: () => [...dailyReportCostKeys.all, 'progress'] as const,
  progressList: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.progress(), 'list', filters] as const,
  progressWithTotals: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.progress(), 'with-totals', filters] as const,

  // Work performed (combined view)
  workPerformed: () => [...dailyReportCostKeys.all, 'work-performed'] as const,
  workPerformedList: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.workPerformed(), 'list', filters] as const,
  workPerformedGrouped: (projectId: string, startDate?: string, endDate?: string) =>
    [...dailyReportCostKeys.workPerformed(), 'grouped', { projectId, startDate, endDate }] as const,

  // Cost summary (with cost code details)
  summary: () => [...dailyReportCostKeys.all, 'summary'] as const,
  summaryList: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.summary(), 'list', filters] as const,
  summaryByDivision: (filters: DailyReportCostFilters) => [...dailyReportCostKeys.summary(), 'by-division', filters] as const,

  // RPC Functions
  projectCostByDateRange: (filters: DateRangeFilters) => [...dailyReportCostKeys.all, 'date-range', filters] as const,
  dailyCostTrend: (filters: CostTrendFilters) => [...dailyReportCostKeys.all, 'trend', filters] as const,

  // Stats & Analytics
  projectStats: (projectId: string, startDate?: string, endDate?: string) =>
    [...dailyReportCostKeys.all, 'stats', { projectId, startDate, endDate }] as const,
  costCodeSummary: (projectId: string, costCode: string, startDate: string, endDate: string) =>
    [...dailyReportCostKeys.all, 'cost-code-summary', { projectId, costCode, startDate, endDate }] as const,
};

// ============================================================================
// LABOR BY COST CODE HOOKS
// ============================================================================

/**
 * Get labor data aggregated by cost code
 */
export function useLaborByCostCode(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.laborList(filters),
    queryFn: () => dailyReportCostsApi.labor.getLaborByCostCode(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - views are relatively static
  });
}

/**
 * Get labor data with totals for a date range
 */
export function useLaborByCostCodeWithTotals(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.laborWithTotals(filters),
    queryFn: () => dailyReportCostsApi.labor.getLaborWithTotals(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// EQUIPMENT BY COST CODE HOOKS
// ============================================================================

/**
 * Get equipment data aggregated by cost code
 */
export function useEquipmentByCostCode(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.equipmentList(filters),
    queryFn: () => dailyReportCostsApi.equipment.getEquipmentByCostCode(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get equipment data with totals for a date range
 */
export function useEquipmentByCostCodeWithTotals(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.equipmentWithTotals(filters),
    queryFn: () => dailyReportCostsApi.equipment.getEquipmentWithTotals(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// PROGRESS BY COST CODE HOOKS
// ============================================================================

/**
 * Get progress/production data aggregated by cost code
 */
export function useProgressByCostCode(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.progressList(filters),
    queryFn: () => dailyReportCostsApi.progress.getProgressByCostCode(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get progress data with totals for a date range
 */
export function useProgressByCostCodeWithTotals(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.progressWithTotals(filters),
    queryFn: () => dailyReportCostsApi.progress.getProgressWithTotals(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// WORK PERFORMED BY COST CODE HOOKS (Combined View)
// ============================================================================

/**
 * Get combined work performed data (labor + equipment + progress)
 */
export function useWorkPerformedByCostCode(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.workPerformedList(filters),
    queryFn: () => dailyReportCostsApi.workPerformed.getWorkPerformedByCostCode(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get work performed grouped by cost code (aggregated across dates)
 */
export function useWorkPerformedGroupedByCostCode(
  projectId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: dailyReportCostKeys.workPerformedGrouped(projectId || '', startDate, endDate),
    queryFn: () => dailyReportCostsApi.workPerformed.getWorkPerformedGroupedByCostCode(
      projectId!,
      startDate,
      endDate
    ),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    select: (data) => Object.fromEntries(data), // Convert Map to object for easier use
  });
}

// ============================================================================
// DAILY REPORT COST SUMMARY HOOKS
// ============================================================================

/**
 * Get cost summary with cost code details
 */
export function useDailyReportCostSummary(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.summaryList(filters),
    queryFn: () => dailyReportCostsApi.summary.getCostSummary(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get cost summary with division breakdown
 */
export function useDailyReportCostSummaryByDivision(filters: DailyReportCostFilters) {
  return useQuery({
    queryKey: dailyReportCostKeys.summaryByDivision(filters),
    queryFn: () => dailyReportCostsApi.summary.getCostSummaryByDivision(filters),
    enabled: !!filters.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// RPC FUNCTION HOOKS
// ============================================================================

/**
 * Get project cost aggregated by date range
 * Uses: get_project_cost_by_date_range function
 */
export function useProjectCostByDateRange(filters: DateRangeFilters | undefined) {
  return useQuery({
    queryKey: dailyReportCostKeys.projectCostByDateRange(filters!),
    queryFn: () => dailyReportCostsApi.functions.getProjectCostByDateRange(filters!),
    enabled: !!filters?.projectId && !!filters?.startDate && !!filters?.endDate,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get daily cost trend for a project
 * Uses: get_daily_cost_trend function
 */
export function useDailyCostTrend(filters: CostTrendFilters | undefined) {
  return useQuery({
    queryKey: dailyReportCostKeys.dailyCostTrend(filters!),
    queryFn: () => dailyReportCostsApi.functions.getDailyCostTrend(filters!),
    enabled: !!filters?.projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// STATISTICS & ANALYTICS HOOKS
// ============================================================================

/**
 * Get comprehensive project cost statistics
 */
export function useProjectCostStats(
  projectId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: dailyReportCostKeys.projectStats(projectId || '', startDate, endDate),
    queryFn: () => dailyReportCostsApi.stats.getProjectCostStats(projectId!, startDate, endDate),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get cost code period summary for detailed reporting
 */
export function useCostCodePeriodSummary(
  projectId: string | undefined,
  costCode: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: dailyReportCostKeys.costCodeSummary(
      projectId || '',
      costCode || '',
      startDate || '',
      endDate || ''
    ),
    queryFn: () => dailyReportCostsApi.stats.getCostCodePeriodSummary(
      projectId!,
      costCode!,
      startDate!,
      endDate!
    ),
    enabled: !!projectId && !!costCode && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// COMBINED HOOKS FOR COMMON USE CASES
// ============================================================================

/**
 * Get all cost data for a project within a date range
 * Combines labor, equipment, and progress data
 */
export function useAllCostData(filters: DailyReportCostFilters) {
  const laborQuery = useLaborByCostCodeWithTotals(filters);
  const equipmentQuery = useEquipmentByCostCodeWithTotals(filters);
  const progressQuery = useProgressByCostCodeWithTotals(filters);

  return {
    labor: laborQuery,
    equipment: equipmentQuery,
    progress: progressQuery,
    isLoading: laborQuery.isLoading || equipmentQuery.isLoading || progressQuery.isLoading,
    isError: laborQuery.isError || equipmentQuery.isError || progressQuery.isError,
    error: laborQuery.error || equipmentQuery.error || progressQuery.error,
  };
}

/**
 * Get cost trend data for charts
 */
export function useCostTrendData(projectId: string | undefined, days: number = 30) {
  const filters: CostTrendFilters | undefined = projectId ? { projectId, days } : undefined;
  return useDailyCostTrend(filters);
}
