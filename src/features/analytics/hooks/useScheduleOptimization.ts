/**
 * Schedule Optimization Hooks
 * React Query hooks for schedule analysis and optimization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { scheduleOptimizer } from '@/lib/ml/scoring/schedule-optimizer'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type {
  ScheduleAnalysisRequest,
  ScheduleOptimizationRecommendation,
} from '@/types/ai'
// Additional types available: ScheduleAnalysisResponse
import { toast } from 'sonner'

// Query keys
export const scheduleQueryKeys = {
  all: ['schedule-optimization'] as const,
  analysis: (projectId: string, date?: string) =>
    [...scheduleQueryKeys.all, 'analysis', projectId, date] as const,
  recommendations: (projectId: string) =>
    [...scheduleQueryKeys.all, 'recommendations', projectId] as const,
  criticalPath: (projectId: string) =>
    [...scheduleQueryKeys.all, 'critical-path', projectId] as const,
}

/**
 * Hook to get schedule analysis
 */
export function useScheduleAnalysis(projectId: string | undefined, options?: {
  analysisDate?: string
  includeResourceLeveling?: boolean
  enabled?: boolean
}) {
  const { isEnabled } = useAIFeatureEnabled('schedule_optimization')

  return useQuery({
    queryKey: scheduleQueryKeys.analysis(projectId || '', options?.analysisDate),
    queryFn: () =>
      scheduleOptimizer.analyzeSchedule({
        project_id: projectId!,
        analysis_date: options?.analysisDate,
        include_resource_leveling: options?.includeResourceLeveling ?? true,
      }),
    enabled: (options?.enabled ?? true) && isEnabled && !!projectId,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  })
}

/**
 * Hook to manually run schedule analysis
 */
export function useRunScheduleAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ScheduleAnalysisRequest) =>
      scheduleOptimizer.analyzeSchedule(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        scheduleQueryKeys.analysis(variables.project_id, variables.analysis_date),
        data
      )
      toast.success(`Analysis complete: ${data.criticalPath.activities.length} activities on critical path`)
    },
    onError: (error) => {
      toast.error(`Schedule analysis failed: ${error.message}`)
    },
  })
}

/**
 * Hook to get optimization recommendations
 */
export function useScheduleRecommendations(projectId: string | undefined) {
  const { isEnabled } = useAIFeatureEnabled('schedule_optimization')

  return useQuery({
    queryKey: scheduleQueryKeys.recommendations(projectId || ''),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('schedule_optimization_recommendations')
        .select('*')
        .eq('project_id', projectId!)
        .eq('is_implemented', false)
        .order('priority', { ascending: false })
        .limit(20)

      if (error) {throw error}
      return data as ScheduleOptimizationRecommendation[]
    },
    enabled: isEnabled && !!projectId,
    staleTime: 30 * 60 * 1000,
  })
}

/**
 * Hook to implement a recommendation
 */
export function useImplementRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      recommendationId,
      notes,
    }: {
      recommendationId: string
      notes?: string
    }) => {
      const { error } = await (supabase as any)
        .from('schedule_optimization_recommendations')
        .update({
          is_implemented: true,
          implemented_at: new Date().toISOString(),
          implementation_notes: notes,
        })
        .eq('id', recommendationId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all })
      toast.success('Recommendation marked as implemented')
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`)
    },
  })
}

/**
 * Hook to dismiss a recommendation
 */
export function useDismissRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await (supabase as any)
        .from('schedule_optimization_recommendations')
        .delete()
        .eq('id', recommendationId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all })
    },
    onError: (error) => {
      toast.error(`Failed to dismiss: ${error.message}`)
    },
  })
}

/**
 * Combined hook for schedule optimization workflow
 */
export function useScheduleOptimization(projectId: string | undefined) {
  const analysis = useScheduleAnalysis(projectId)
  const recommendations = useScheduleRecommendations(projectId)
  const runAnalysis = useRunScheduleAnalysis()
  const implementRec = useImplementRecommendation()
  const dismissRec = useDismissRecommendation()

  const criticalPathLength = analysis.data?.criticalPath.activities.length || 0
  const projectDuration = analysis.data?.criticalPath.totalDurationDays || 0
  const constraintCount = analysis.data?.constraintPriorities.length || 0
  const conflictCount = analysis.data?.resourceConflicts.length || 0

  return {
    // Data
    analysis: analysis.data,
    criticalPath: analysis.data?.criticalPath,
    floatOpportunities: analysis.data?.floatOpportunities || [],
    constraintPriorities: analysis.data?.constraintPriorities || [],
    resourceConflicts: analysis.data?.resourceConflicts || [],
    recommendations: [
      ...(analysis.data?.recommendations || []),
      ...(recommendations.data || []),
    ],

    // Metrics
    criticalPathLength,
    projectDuration,
    projectEndDate: analysis.data?.criticalPath.projectEndDate,
    constraintCount,
    conflictCount,
    bottlenecks: analysis.data?.criticalPath.bottlenecks || [],

    // Loading states
    isLoading: analysis.isLoading,
    isAnalyzing: runAnalysis.isPending,

    // Actions
    analyze: (options?: Partial<ScheduleAnalysisRequest>) => {
      if (!projectId) {return}
      runAnalysis.mutate({
        project_id: projectId,
        ...options,
      })
    },
    implementRecommendation: (id: string, notes?: string) => {
      implementRec.mutate({ recommendationId: id, notes })
    },
    dismissRecommendation: (id: string) => {
      dismissRec.mutate(id)
    },
  }
}
