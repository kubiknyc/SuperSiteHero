/**
 * useRFIResponseAnalytics Hook
 *
 * React Query hook for fetching and managing RFI response time analytics.
 * Provides cached access to response metrics, trends, and performance data.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import {
  rfiResponseAnalyticsService,
  getDateRangeFromPreset,
} from '@/lib/api/services/rfi-response-analytics'
import type {
  DateRange,
  RFIAverageResponseMetrics,
  ResponseTimeByPriority,
  ResponseTimeByAssignee,
  ResponseTimeByResponseType,
  ResponseTimeDistribution,
  ResponseTimeTrends,
  ResponseTimeByDayOfWeek,
  ResponseTimeByMonth,
  ResponseTimeRecord,
  RFIResponseTimeAnalytics,
  RFIResponseAnalyticsFilters,
  DateRangePreset,
} from '@/types/rfi-response-analytics'

// =============================================
// Query Keys
// =============================================

export const rfiResponseAnalyticsKeys = {
  all: ['rfi-response-analytics'] as const,
  project: (projectId: string) => [...rfiResponseAnalyticsKeys.all, 'project', projectId] as const,
  average: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'average', filters] as const,
  byPriority: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'by-priority', filters] as const,
  byAssignee: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'by-assignee', filters] as const,
  byResponseType: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'by-response-type', filters] as const,
  distribution: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'distribution', filters] as const,
  trends: (projectId: string, dateRange: DateRange, granularity: 'day' | 'week' | 'month') =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'trends', dateRange, granularity] as const,
  onTimePerformance: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'on-time-performance', filters] as const,
  byDayOfWeek: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'by-day-of-week', filters] as const,
  byMonth: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'by-month', filters] as const,
  records: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'records', filters] as const,
  complete: (projectId: string, filters?: Partial<RFIResponseAnalyticsFilters>) =>
    [...rfiResponseAnalyticsKeys.project(projectId), 'complete', filters] as const,
}

// =============================================
// Default Query Options
// =============================================

const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  refetchOnWindowFocus: false,
  retry: 2,
}

// =============================================
// Individual Metric Hooks
// =============================================

/**
 * Hook to get average response time metrics
 */
export function useAverageResponseTime(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<RFIAverageResponseMetrics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.average(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getAverageResponseTime(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get response time metrics by priority
 */
export function useResponseTimeByPriority(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<ResponseTimeByPriority[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.byPriority(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getResponseTimeByPriority(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get response time metrics by assignee
 */
export function useResponseTimeByAssignee(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<ResponseTimeByAssignee[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.byAssignee(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getResponseTimeByAssignee(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get response time metrics by response type
 */
export function useResponseTimeByResponseType(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<ResponseTimeByResponseType[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.byResponseType(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getResponseTimeByResponseType(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get response time distribution
 */
export function useResponseTimeDistribution(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<ResponseTimeDistribution>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.distribution(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getResponseTimeDistribution(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get response time trends
 */
export function useResponseTimeTrends(
  projectId: string | undefined,
  dateRange: DateRange,
  granularity: 'day' | 'week' | 'month' = 'week',
  options?: Omit<UseQueryOptions<ResponseTimeTrends>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.trends(projectId || '', dateRange, granularity),
    queryFn: () =>
      rfiResponseAnalyticsService.getResponseTimeTrends(projectId!, dateRange, granularity),
    enabled: !!projectId && !!dateRange.startDate && !!dateRange.endDate,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get on-time performance metrics
 */
export function useOnTimePerformance(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<
    UseQueryOptions<{
      totalResponded: number
      onTime: number
      late: number
      onTimePercentage: number
      latePercentage: number
      averageDaysLate: number
      averageDaysEarly: number
    }>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.onTimePerformance(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getOnTimePerformance(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get response time by day of week
 */
export function useResponseTimeByDayOfWeek(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<ResponseTimeByDayOfWeek[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.byDayOfWeek(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getResponseTimeByDayOfWeek(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get response time by month
 */
export function useResponseTimeByMonth(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<ResponseTimeByMonth[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.byMonth(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getResponseTimeByMonth(projectId!, filters),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

/**
 * Hook to get fastest and slowest response records
 */
export function useResponseTimeRecords(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  limit: number = 5,
  options?: Omit<
    UseQueryOptions<{ fastest: ResponseTimeRecord[]; slowest: ResponseTimeRecord[] }>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.records(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getResponseTimeRecords(projectId!, filters, limit),
    enabled: !!projectId,
    ...defaultQueryOptions,
    ...options,
  })
}

// =============================================
// Complete Analytics Hook
// =============================================

/**
 * Hook to get complete RFI response time analytics
 * Fetches all metrics in a single request for dashboard use
 */
export function useRFIResponseAnalytics(
  projectId: string | undefined,
  filters?: Partial<RFIResponseAnalyticsFilters>,
  options?: Omit<UseQueryOptions<RFIResponseTimeAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: rfiResponseAnalyticsKeys.complete(projectId || '', filters),
    queryFn: () => rfiResponseAnalyticsService.getCompleteAnalytics(projectId!, filters),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes for complete analytics
    gcTime: 60 * 60 * 1000, // 1 hour cache (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    ...options,
  })
}

// =============================================
// Convenience Hook with Date Range Preset
// =============================================

/**
 * Hook to get RFI response metrics with a date range preset
 */
export function useRFIResponseMetrics(
  projectId: string | undefined,
  dateRangePreset: DateRangePreset = 'last_90_days',
  additionalFilters?: Partial<Omit<RFIResponseAnalyticsFilters, 'dateRange'>>
) {
  const dateRange = getDateRangeFromPreset(dateRangePreset)

  const filters: Partial<RFIResponseAnalyticsFilters> = {
    ...additionalFilters,
    dateRange,
  }

  const summaryQuery = useAverageResponseTime(projectId, filters)
  const byPriorityQuery = useResponseTimeByPriority(projectId, filters)
  const distributionQuery = useResponseTimeDistribution(projectId, filters)
  const onTimeQuery = useOnTimePerformance(projectId, filters)

  const isLoading =
    summaryQuery.isLoading ||
    byPriorityQuery.isLoading ||
    distributionQuery.isLoading ||
    onTimeQuery.isLoading

  const isError =
    summaryQuery.isError ||
    byPriorityQuery.isError ||
    distributionQuery.isError ||
    onTimeQuery.isError

  const error = summaryQuery.error || byPriorityQuery.error || distributionQuery.error || onTimeQuery.error

  return {
    summary: summaryQuery.data,
    byPriority: byPriorityQuery.data,
    distribution: distributionQuery.data,
    onTimePerformance: onTimeQuery.data,
    dateRange,
    isLoading,
    isError,
    error,
    refetch: () => {
      summaryQuery.refetch()
      byPriorityQuery.refetch()
      distributionQuery.refetch()
      onTimeQuery.refetch()
    },
  }
}

// =============================================
// Assignee Performance Hook
// =============================================

/**
 * Hook specifically for assignee performance comparison
 */
export function useAssigneePerformance(
  projectId: string | undefined,
  dateRangePreset: DateRangePreset = 'last_90_days',
  assigneeIds?: string[]
) {
  const dateRange = getDateRangeFromPreset(dateRangePreset)

  const filters: Partial<RFIResponseAnalyticsFilters> = {
    dateRange,
    assigneeId: assigneeIds,
  }

  const byAssigneeQuery = useResponseTimeByAssignee(projectId, filters)

  return {
    assignees: byAssigneeQuery.data || [],
    dateRange,
    isLoading: byAssigneeQuery.isLoading,
    isError: byAssigneeQuery.isError,
    error: byAssigneeQuery.error,
    refetch: byAssigneeQuery.refetch,
    // Computed helpers
    topPerformers: byAssigneeQuery.data?.filter(
      (a) => a.performanceRating === 'excellent' || a.performanceRating === 'good'
    ) || [],
    needsAttention: byAssigneeQuery.data?.filter(
      (a) => a.performanceRating === 'needs_improvement'
    ) || [],
    averageOnTimePercentage:
      byAssigneeQuery.data && byAssigneeQuery.data.length > 0
        ? byAssigneeQuery.data.reduce((sum, a) => sum + a.onTimePercentage, 0) /
          byAssigneeQuery.data.length
        : 0,
  }
}

// =============================================
// Trend Analysis Hook
// =============================================

/**
 * Hook specifically for trend analysis
 */
export function useResponseTimeTrendAnalysis(
  projectId: string | undefined,
  dateRangePreset: DateRangePreset = 'last_90_days',
  granularity: 'day' | 'week' | 'month' = 'week'
) {
  const dateRange = getDateRangeFromPreset(dateRangePreset)

  const trendsQuery = useResponseTimeTrends(projectId, dateRange, granularity)

  return {
    trends: trendsQuery.data,
    dateRange,
    granularity,
    isLoading: trendsQuery.isLoading,
    isError: trendsQuery.isError,
    error: trendsQuery.error,
    refetch: trendsQuery.refetch,
    // Computed helpers
    isImproving: trendsQuery.data?.overallTrend === 'improving',
    isDeclining: trendsQuery.data?.overallTrend === 'declining',
    isStable: trendsQuery.data?.overallTrend === 'stable',
    trendPercentageChange: trendsQuery.data?.trendPercentageChange || 0,
  }
}

// =============================================
// Export utility
// =============================================

export { getDateRangeFromPreset }
