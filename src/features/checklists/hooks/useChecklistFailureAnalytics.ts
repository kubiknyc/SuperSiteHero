// File: /src/features/checklists/hooks/useChecklistFailureAnalytics.ts
// React Query hooks for checklist failure analytics

import { useQuery } from '@tanstack/react-query'
import { checklistFailureAnalyticsApi } from '@/lib/api/services/checklist-failure-analytics'
import type { ChecklistFailureFilters } from '@/types/checklist-failure-analytics'

/**
 * Query keys for checklist failure analytics
 */
export const checklistFailureAnalyticsKeys = {
  all: ['checklist-failure-analytics'] as const,
  project: (projectId: string) =>
    [...checklistFailureAnalyticsKeys.all, 'project', projectId] as const,
  complete: (filters: ChecklistFailureFilters) =>
    [...checklistFailureAnalyticsKeys.all, 'complete', filters] as const,
  frequency: (filters: ChecklistFailureFilters) =>
    [...checklistFailureAnalyticsKeys.all, 'frequency', filters] as const,
  temporal: (filters: ChecklistFailureFilters) =>
    [...checklistFailureAnalyticsKeys.all, 'temporal', filters] as const,
  clusters: (filters: ChecklistFailureFilters) =>
    [...checklistFailureAnalyticsKeys.all, 'clusters', filters] as const,
  trends: (filters: ChecklistFailureFilters, granularity: 'day' | 'week' | 'month') =>
    [...checklistFailureAnalyticsKeys.all, 'trends', filters, granularity] as const,
}

/**
 * Hook to fetch complete checklist failure analytics
 * Includes summary, frequency, temporal patterns, clusters, and trends
 */
export function useChecklistFailureAnalytics(filters: ChecklistFailureFilters) {
  return useQuery({
    queryKey: checklistFailureAnalyticsKeys.complete(filters),
    queryFn: () => checklistFailureAnalyticsApi.getChecklistFailureAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!filters.projectId,
  })
}

/**
 * Hook to fetch failure frequency analysis
 * Shows which checklist items fail most often
 */
export function useFailureFrequency(filters: ChecklistFailureFilters) {
  return useQuery({
    queryKey: checklistFailureAnalyticsKeys.frequency(filters),
    queryFn: () => checklistFailureAnalyticsApi.getFailureFrequency(filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!filters.projectId,
  })
}

/**
 * Hook to fetch temporal analysis
 * Shows failure patterns by hour, day of week, and month
 */
export function useTemporalAnalysis(filters: ChecklistFailureFilters) {
  return useQuery({
    queryKey: checklistFailureAnalyticsKeys.temporal(filters),
    queryFn: () => checklistFailureAnalyticsApi.getTemporalAnalysis(filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!filters.projectId,
  })
}

/**
 * Hook to fetch failure clusters
 * Shows which items frequently fail together
 */
export function useFailureClusters(filters: ChecklistFailureFilters) {
  return useQuery({
    queryKey: checklistFailureAnalyticsKeys.clusters(filters),
    queryFn: () => checklistFailureAnalyticsApi.getFailureClusters(filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!filters.projectId,
  })
}

/**
 * Hook to fetch failure trends over time
 * Shows trends with moving averages at specified granularity
 */
export function useFailureTrends(
  filters: ChecklistFailureFilters,
  granularity: 'day' | 'week' | 'month' = 'week'
) {
  return useQuery({
    queryKey: checklistFailureAnalyticsKeys.trends(filters, granularity),
    queryFn: () => checklistFailureAnalyticsApi.getFailureTrends(filters, granularity),
    staleTime: 5 * 60 * 1000,
    enabled: !!filters.projectId,
  })
}
