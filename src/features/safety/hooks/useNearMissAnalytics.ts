/**
 * Near-Miss Analytics React Query Hooks
 *
 * Provides data fetching and mutation hooks for near-miss trend analysis
 * and pattern detection.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/notifications/ToastContext'
import { nearMissAnalyticsApi } from '@/lib/api/services/near-miss-analytics'
import type {
  NearMissAnalyticsSummary,
  DailyTrendPoint,
  LocationHeatMapData,
  TimeMatrix,
  RootCauseParetoData,
  FrequencySpike,
  LocationHotspot,
  TrendCalculation,
  NearMissPattern,
  NearMissAlert,
  NearMissZone,
  NearMissCategory,
  AlertThreshold,
  MonthlyReport,
  SafetyBenchmark,
  NearMissAnalyticsFilters,
  CreateZoneDTO,
  CreateCategoryDTO,
  CreateThresholdDTO,
  UpdatePatternDTO,
  PatternStatus,
} from '@/types/near-miss-analytics'

// ============================================================================
// Query Keys
// ============================================================================

export const nearMissAnalyticsKeys = {
  all: ['near-miss-analytics'] as const,
  summary: (companyId: string, projectId?: string) =>
    [...nearMissAnalyticsKeys.all, 'summary', companyId, projectId] as const,
  dailyTrends: (filters: NearMissAnalyticsFilters, days?: number) =>
    [...nearMissAnalyticsKeys.all, 'daily-trends', filters, days] as const,
  heatMap: (filters: NearMissAnalyticsFilters) =>
    [...nearMissAnalyticsKeys.all, 'heat-map', filters] as const,
  timePatterns: (filters: NearMissAnalyticsFilters) =>
    [...nearMissAnalyticsKeys.all, 'time-patterns', filters] as const,
  rootCausePareto: (filters: NearMissAnalyticsFilters) =>
    [...nearMissAnalyticsKeys.all, 'root-cause-pareto', filters] as const,
  frequencySpikes: (companyId: string, projectId?: string) =>
    [...nearMissAnalyticsKeys.all, 'frequency-spikes', companyId, projectId] as const,
  locationHotspots: (companyId: string, projectId?: string) =>
    [...nearMissAnalyticsKeys.all, 'location-hotspots', companyId, projectId] as const,
  trend: (companyId: string, projectId?: string, days?: number) =>
    [...nearMissAnalyticsKeys.all, 'trend', companyId, projectId, days] as const,
  patterns: (companyId: string, projectId?: string, status?: PatternStatus | PatternStatus[]) =>
    [...nearMissAnalyticsKeys.all, 'patterns', companyId, projectId, status] as const,
  alerts: (companyId: string, projectId?: string) =>
    [...nearMissAnalyticsKeys.all, 'alerts', companyId, projectId] as const,
  zones: (projectId: string) =>
    [...nearMissAnalyticsKeys.all, 'zones', projectId] as const,
  categories: (companyId: string) =>
    [...nearMissAnalyticsKeys.all, 'categories', companyId] as const,
  thresholds: (companyId: string, projectId?: string) =>
    [...nearMissAnalyticsKeys.all, 'thresholds', companyId, projectId] as const,
  monthlyReports: (companyId: string, projectId?: string) =>
    [...nearMissAnalyticsKeys.all, 'monthly-reports', companyId, projectId] as const,
  benchmarks: (industryType?: string) =>
    [...nearMissAnalyticsKeys.all, 'benchmarks', industryType] as const,
}

// ============================================================================
// Summary & Dashboard Hooks
// ============================================================================

/**
 * Fetch analytics summary for dashboard
 */
export function useNearMissSummary(companyId: string, projectId?: string) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.summary(companyId, projectId),
    queryFn: () => nearMissAnalyticsApi.getSummary(companyId, projectId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch daily trend data for charts
 */
export function useDailyTrends(
  filters: NearMissAnalyticsFilters,
  days = 30
) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.dailyTrends(filters, days),
    queryFn: () => nearMissAnalyticsApi.getDailyTrends(filters, days),
    enabled: !!filters.company_id || !!filters.project_id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch location heat map data
 */
export function useLocationHeatMap(filters: NearMissAnalyticsFilters) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.heatMap(filters),
    queryFn: () => nearMissAnalyticsApi.getLocationHeatMap(filters),
    enabled: !!filters.company_id || !!filters.project_id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch time pattern matrix
 */
export function useTimePatterns(filters: NearMissAnalyticsFilters) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.timePatterns(filters),
    queryFn: () => nearMissAnalyticsApi.getTimePatterns(filters),
    enabled: !!filters.company_id || !!filters.project_id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch root cause Pareto data
 */
export function useRootCausePareto(filters: NearMissAnalyticsFilters) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.rootCausePareto(filters),
    queryFn: () => nearMissAnalyticsApi.getRootCausePareto(filters),
    enabled: !!filters.company_id || !!filters.project_id,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// Pattern Detection Hooks
// ============================================================================

/**
 * Detect frequency spikes
 */
export function useFrequencySpikes(
  companyId: string,
  projectId?: string,
  lookbackDays = 30,
  spikeThreshold = 2.0
) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.frequencySpikes(companyId, projectId),
    queryFn: () =>
      nearMissAnalyticsApi.detectFrequencySpikes(
        companyId,
        projectId,
        lookbackDays,
        spikeThreshold
      ),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Detect location hotspots
 */
export function useLocationHotspots(
  companyId: string,
  projectId?: string,
  minIncidents = 3,
  days = 30
) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.locationHotspots(companyId, projectId),
    queryFn: () =>
      nearMissAnalyticsApi.detectLocationHotspots(
        companyId,
        projectId,
        minIncidents,
        days
      ),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Calculate trend comparison
 */
export function useTrendCalculation(
  companyId: string,
  projectId?: string,
  periodDays = 30
) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.trend(companyId, projectId, periodDays),
    queryFn: () =>
      nearMissAnalyticsApi.calculateTrend(companyId, projectId, periodDays),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// Pattern & Alert Hooks
// ============================================================================

/**
 * Fetch detected patterns
 */
export function usePatterns(
  companyId: string,
  projectId?: string,
  status?: PatternStatus | PatternStatus[]
) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.patterns(companyId, projectId, status),
    queryFn: () => nearMissAnalyticsApi.getPatterns(companyId, projectId, status),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Update a pattern
 */
export function useUpdatePattern() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePatternDTO }) =>
      nearMissAnalyticsApi.updatePattern(id, data),
    onSuccess: (pattern) => {
      queryClient.invalidateQueries({
        queryKey: nearMissAnalyticsKeys.patterns(pattern.company_id, pattern.project_id || undefined),
      })
      showToast({
        type: 'success',
        title: 'Pattern Updated',
        message: 'The pattern has been updated successfully.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update pattern',
      })
    },
  })
}

/**
 * Fetch active alerts
 */
export function useAlerts(
  companyId: string,
  projectId?: string,
  includeRead = false,
  includeDismissed = false
) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.alerts(companyId, projectId),
    queryFn: () =>
      nearMissAnalyticsApi.getAlerts(
        companyId,
        projectId,
        includeRead,
        includeDismissed
      ),
    enabled: !!companyId,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  })
}

/**
 * Mark an alert as read
 */
export function useMarkAlertRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => nearMissAnalyticsApi.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['near-miss-analytics', 'alerts'],
      })
    },
  })
}

/**
 * Dismiss an alert
 */
export function useDismissAlert() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => nearMissAnalyticsApi.dismissAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['near-miss-analytics', 'alerts'],
      })
      showToast({
        type: 'success',
        title: 'Alert Dismissed',
        message: 'The alert has been dismissed.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to dismiss alert',
      })
    },
  })
}

// ============================================================================
// Zone & Category Hooks
// ============================================================================

/**
 * Fetch zones for a project
 */
export function useZones(projectId: string) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.zones(projectId),
    queryFn: () => nearMissAnalyticsApi.getZones(projectId),
    enabled: !!projectId,
  })
}

/**
 * Create a zone
 */
export function useCreateZone() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateZoneDTO) => nearMissAnalyticsApi.createZone(data),
    onSuccess: (zone) => {
      queryClient.invalidateQueries({
        queryKey: nearMissAnalyticsKeys.zones(zone.project_id),
      })
      showToast({
        type: 'success',
        title: 'Zone Created',
        message: `Zone "${zone.name}" has been created.`,
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create zone',
      })
    },
  })
}

/**
 * Fetch categories for a company
 */
export function useCategories(companyId: string) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.categories(companyId),
    queryFn: () => nearMissAnalyticsApi.getCategories(companyId),
    enabled: !!companyId,
  })
}

/**
 * Create a category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateCategoryDTO) =>
      nearMissAnalyticsApi.createCategory(data),
    onSuccess: (category) => {
      queryClient.invalidateQueries({
        queryKey: nearMissAnalyticsKeys.categories(category.company_id),
      })
      showToast({
        type: 'success',
        title: 'Category Created',
        message: `Category "${category.name}" has been created.`,
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create category',
      })
    },
  })
}

// ============================================================================
// Threshold Hooks
// ============================================================================

/**
 * Fetch alert thresholds
 */
export function useThresholds(companyId: string, projectId?: string) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.thresholds(companyId, projectId),
    queryFn: () => nearMissAnalyticsApi.getThresholds(companyId, projectId),
    enabled: !!companyId,
  })
}

/**
 * Create an alert threshold
 */
export function useCreateThreshold() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateThresholdDTO) =>
      nearMissAnalyticsApi.createThreshold(data),
    onSuccess: (threshold) => {
      queryClient.invalidateQueries({
        queryKey: nearMissAnalyticsKeys.thresholds(
          threshold.company_id,
          threshold.project_id || undefined
        ),
      })
      showToast({
        type: 'success',
        title: 'Threshold Created',
        message: 'The alert threshold has been created.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create threshold',
      })
    },
  })
}

// ============================================================================
// Report & Benchmark Hooks
// ============================================================================

/**
 * Fetch monthly reports
 */
export function useMonthlyReports(
  companyId: string,
  projectId?: string,
  limit = 12
) {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.monthlyReports(companyId, projectId),
    queryFn: () =>
      nearMissAnalyticsApi.getMonthlyReports(companyId, projectId, limit),
    enabled: !!companyId,
  })
}

/**
 * Fetch industry benchmarks
 */
export function useBenchmarks(industryType = 'construction') {
  return useQuery({
    queryKey: nearMissAnalyticsKeys.benchmarks(industryType),
    queryFn: () => nearMissAnalyticsApi.getBenchmarks(industryType),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}

// ============================================================================
// Composite Hook for Dashboard
// ============================================================================

/**
 * Combined hook for fetching all dashboard data
 */
export function useNearMissAnalyticsDashboard(
  companyId: string,
  projectId?: string
) {
  const filters: NearMissAnalyticsFilters = {
    company_id: companyId,
    project_id: projectId,
  }

  const summary = useNearMissSummary(companyId, projectId)
  const dailyTrends = useDailyTrends(filters, 30)
  const heatMap = useLocationHeatMap(filters)
  const timePatterns = useTimePatterns(filters)
  const paretoData = useRootCausePareto(filters)
  const patterns = usePatterns(companyId, projectId, ['new', 'acknowledged'])
  const alerts = useAlerts(companyId, projectId)
  const benchmarks = useBenchmarks()

  const isLoading =
    summary.isLoading ||
    dailyTrends.isLoading ||
    heatMap.isLoading ||
    timePatterns.isLoading ||
    paretoData.isLoading

  const hasError =
    summary.isError ||
    dailyTrends.isError ||
    heatMap.isError ||
    timePatterns.isError ||
    paretoData.isError

  return {
    summary: summary.data,
    dailyTrends: dailyTrends.data,
    heatMap: heatMap.data,
    timePatterns: timePatterns.data,
    paretoData: paretoData.data,
    patterns: patterns.data,
    alerts: alerts.data,
    benchmarks: benchmarks.data,
    isLoading,
    hasError,
    refetch: () => {
      summary.refetch()
      dailyTrends.refetch()
      heatMap.refetch()
      timePatterns.refetch()
      paretoData.refetch()
      patterns.refetch()
      alerts.refetch()
    },
  }
}
