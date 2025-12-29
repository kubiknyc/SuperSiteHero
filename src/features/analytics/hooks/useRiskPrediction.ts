/**
 * Risk Prediction Hooks
 * React Query hooks for activity risk prediction and alerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { activityRiskScorer } from '@/lib/ml/scoring/activity-risk-scorer'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type {
  RiskAnalysisRequest,
  ActivityRiskPrediction,
  RiskAlert,
} from '@/types/ai'
// Additional types available: RiskAnalysisResponse, RiskAlertType
import { toast } from 'sonner'

// Query keys
export const riskQueryKeys = {
  all: ['risk-prediction'] as const,
  analysis: (projectId: string, date?: string) =>
    [...riskQueryKeys.all, 'analysis', projectId, date] as const,
  alerts: (projectId: string) => [...riskQueryKeys.all, 'alerts', projectId] as const,
  activityPrediction: (activityId: string) =>
    [...riskQueryKeys.all, 'activity', activityId] as const,
}

/**
 * Hook to get risk analysis for a project
 */
export function useRiskAnalysis(projectId: string | undefined, options?: {
  analysisDate?: string
  includeWeather?: boolean
  lookAheadWeeks?: number
  enabled?: boolean
}) {
  const { isEnabled } = useAIFeatureEnabled('risk_prediction')

  return useQuery({
    queryKey: riskQueryKeys.analysis(projectId || '', options?.analysisDate),
    queryFn: () =>
      activityRiskScorer.analyzeProjectRisk({
        project_id: projectId!,
        analysis_date: options?.analysisDate,
        include_weather: options?.includeWeather ?? true,
        look_ahead_weeks: options?.lookAheadWeeks ?? 3,
      }),
    enabled: (options?.enabled ?? true) && isEnabled && !!projectId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  })
}

/**
 * Hook to manually trigger risk analysis
 */
export function useRunRiskAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: RiskAnalysisRequest) =>
      activityRiskScorer.analyzeProjectRisk(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        riskQueryKeys.analysis(variables.project_id, variables.analysis_date),
        data
      )
      toast.success(`Analysis complete: ${data.atRiskActivities.length} at-risk activities`)
    },
    onError: (error) => {
      toast.error(`Risk analysis failed: ${error.message}`)
    },
  })
}

/**
 * Hook to get risk alerts for a project
 */
export function useRiskAlerts(projectId: string | undefined, options?: {
  unacknowledgedOnly?: boolean
  unresolvedOnly?: boolean
  severity?: string[]
}) {
  const { isEnabled } = useAIFeatureEnabled('risk_prediction')

  return useQuery({
    queryKey: riskQueryKeys.alerts(projectId || ''),
    queryFn: async () => {
      let query = (supabase as any)
        .from('risk_alerts')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })

      if (options?.unacknowledgedOnly) {
        query = query.eq('is_acknowledged', false)
      }
      if (options?.unresolvedOnly) {
        query = query.eq('is_resolved', false)
      }
      if (options?.severity?.length) {
        query = query.in('severity', options.severity)
      }

      const { data, error } = await query.limit(100)
      if (error) {throw error}
      return data as RiskAlert[]
    },
    enabled: isEnabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from('risk_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskQueryKeys.all })
      toast.success('Alert acknowledged')
    },
    onError: (error) => {
      toast.error(`Failed to acknowledge: ${error.message}`)
    },
  })
}

/**
 * Hook to resolve an alert
 */
export function useResolveAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      alertId,
      notes,
    }: {
      alertId: string
      notes?: string
    }) => {
      const { error } = await (supabase as any)
        .from('risk_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', alertId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskQueryKeys.all })
      toast.success('Alert resolved')
    },
    onError: (error) => {
      toast.error(`Failed to resolve: ${error.message}`)
    },
  })
}

/**
 * Hook to get risk prediction for a specific activity
 */
export function useActivityRiskPrediction(activityId: string | undefined) {
  const { isEnabled } = useAIFeatureEnabled('risk_prediction')

  return useQuery({
    queryKey: riskQueryKeys.activityPrediction(activityId || ''),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('activity_risk_predictions')
        .select('*')
        .eq('activity_id', activityId!)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {throw error}
      return data as ActivityRiskPrediction | null
    },
    enabled: isEnabled && !!activityId,
    staleTime: 30 * 60 * 1000,
  })
}

/**
 * Combined hook for risk management workflow
 */
export function useRiskManagement(projectId: string | undefined) {
  const analysis = useRiskAnalysis(projectId)
  const alerts = useRiskAlerts(projectId, {
    unresolvedOnly: true,
  })
  const runAnalysis = useRunRiskAnalysis()
  const acknowledgeAlert = useAcknowledgeAlert()
  const resolveAlert = useResolveAlert()

  const criticalAlerts = alerts.data?.filter(a => a.severity === 'critical') || []
  const highAlerts = alerts.data?.filter(a => a.severity === 'high') || []
  const unacknowledgedCount = alerts.data?.filter(a => !a.is_acknowledged).length || 0

  return {
    // Data
    analysis: analysis.data,
    alerts: alerts.data || [],
    criticalAlerts,
    highAlerts,
    unacknowledgedCount,
    overallRiskScore: analysis.data?.overallRiskScore || 0,
    atRiskActivities: analysis.data?.atRiskActivities || [],

    // Loading states
    isLoading: analysis.isLoading,
    isAnalyzing: runAnalysis.isPending,

    // Actions
    runAnalysis: (options?: Partial<RiskAnalysisRequest>) => {
      if (!projectId) {return}
      runAnalysis.mutate({
        project_id: projectId,
        ...options,
      })
    },
    acknowledge: (alertId: string, userId: string) => {
      acknowledgeAlert.mutate({ alertId, userId })
    },
    resolve: (alertId: string, notes?: string) => {
      resolveAlert.mutate({ alertId, notes })
    },
  }
}
