// File: /src/features/analytics/hooks/useAnalytics.ts
// React Query hooks for Predictive Analytics features

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { analyticsApi } from '@/lib/api/services/analytics'
import { getPredictionService } from '@/lib/ml/inference/prediction-service'
import type {
  ProjectSnapshot,
  AnalyticsPrediction,
  AnalyticsRecommendation,
  RiskAssessment,
  SnapshotFilters,
  RecommendationFilters,
  AnalyticsDashboard,
  ModelMetadata,
  RecommendationStats,
  SnapshotWithMetrics,
  ModelPerformanceSummary,
} from '@/types/analytics'

// =============================================
// Query Keys
// =============================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  snapshots: (projectId: string) => [...analyticsKeys.all, 'snapshots', projectId] as const,
  latestSnapshot: (projectId: string) =>
    [...analyticsKeys.all, 'latest-snapshot', projectId] as const,
  snapshotsWithMetrics: (projectId: string) =>
    [...analyticsKeys.all, 'snapshots-metrics', projectId] as const,
  prediction: (projectId: string) => [...analyticsKeys.all, 'prediction', projectId] as const,
  predictionHistory: (projectId: string) =>
    [...analyticsKeys.all, 'prediction-history', projectId] as const,
  riskScores: (projectId: string) => [...analyticsKeys.all, 'risk', projectId] as const,
  recommendations: (projectId: string) =>
    [...analyticsKeys.all, 'recommendations', projectId] as const,
  pendingRecommendations: (projectId: string) =>
    [...analyticsKeys.all, 'pending-recommendations', projectId] as const,
  recommendationStats: (projectId: string) =>
    [...analyticsKeys.all, 'recommendation-stats', projectId] as const,
  dashboard: (projectId: string) => [...analyticsKeys.all, 'dashboard', projectId] as const,
  models: () => [...analyticsKeys.all, 'models'] as const,
  activeModel: (modelType: string) => [...analyticsKeys.all, 'model', modelType] as const,
  modelPerformance: () => [...analyticsKeys.all, 'model-performance'] as const,
}

// =============================================
// Snapshot Queries and Mutations
// =============================================

/**
 * Get project snapshots
 */
export function useProjectSnapshots(
  projectId: string | undefined,
  filters?: SnapshotFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...analyticsKeys.snapshots(projectId || ''), filters],
    queryFn: () => analyticsApi.getProjectSnapshots(projectId!, filters),
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get latest snapshot for a project
 */
export function useLatestSnapshot(projectId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.latestSnapshot(projectId || ''),
    queryFn: () => analyticsApi.getLatestSnapshot(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get snapshots with computed metrics
 */
export function useSnapshotsWithMetrics(
  projectId: string | undefined,
  filters?: SnapshotFilters
) {
  return useQuery({
    queryKey: [...analyticsKeys.snapshotsWithMetrics(projectId || ''), filters],
    queryFn: () => analyticsApi.getSnapshotsWithMetrics(projectId!, filters),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Collect a new project snapshot
 */
export function useCollectSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => analyticsApi.collectProjectSnapshot(projectId),
    onSuccess: (_, projectId) => {
      toast.success('Snapshot collected successfully')
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.snapshots(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.latestSnapshot(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboard(projectId),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to collect snapshot')
    },
  })
}

// =============================================
// Prediction Queries and Mutations
// =============================================

/**
 * Get latest prediction for a project
 */
export function useLatestPrediction(projectId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.prediction(projectId || ''),
    queryFn: () => analyticsApi.getLatestPrediction(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get prediction history for a project
 */
export function usePredictionHistory(
  projectId: string | undefined,
  limit: number = 30
) {
  return useQuery({
    queryKey: [...analyticsKeys.predictionHistory(projectId || ''), limit],
    queryFn: () => analyticsApi.getPredictionHistory(projectId!, limit),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Generate a new prediction using ML service
 */
export function useGeneratePrediction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      snapshot,
    }: {
      projectId: string
      snapshot: ProjectSnapshot
    }) => {
      const service = getPredictionService()
      const result = await service.predict(projectId, snapshot)

      // Store the prediction in the database
      const prediction = await analyticsApi.storePrediction({
        project_id: projectId,
        prediction_date: new Date().toISOString(),
        model_version: result.modelVersion,
        budget_overrun_probability: result.budget.probability,
        budget_overrun_amount_low: result.budget.amount_low,
        budget_overrun_amount_mid: result.budget.amount_mid,
        budget_overrun_amount_high: result.budget.amount_high,
        budget_confidence_score: result.budget.confidence,
        budget_feature_importance: result.budget.contributing_factors,
        schedule_delay_probability: result.schedule.probability,
        schedule_delay_days_low: result.schedule.days_low,
        schedule_delay_days_mid: result.schedule.days_mid,
        schedule_delay_days_high: result.schedule.days_high,
        projected_completion_date: result.schedule.projected_completion_date,
        schedule_confidence_score: result.schedule.confidence,
        schedule_feature_importance: result.schedule.contributing_factors,
        overall_risk_score: result.risk.overall.score,
        schedule_risk_score: result.risk.schedule.score,
        cost_risk_score: result.risk.cost.score,
        operational_risk_score: result.risk.operational.score,
        risk_feature_importance: [],
        input_features: null,
        expires_at: null,
        is_latest: true,
      })

      return prediction
    },
    onSuccess: (_, { projectId }) => {
      toast.success('Prediction generated successfully')
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.prediction(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.predictionHistory(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.riskScores(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboard(projectId),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate prediction')
    },
  })
}

// =============================================
// Risk Score Queries
// =============================================

/**
 * Get risk scores for a project
 */
export function useRiskScores(projectId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.riskScores(projectId || ''),
    queryFn: () => analyticsApi.getRiskScores(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

// =============================================
// Recommendation Queries and Mutations
// =============================================

/**
 * Get recommendations for a project
 */
export function useRecommendations(
  projectId: string | undefined,
  filters?: RecommendationFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...analyticsKeys.recommendations(projectId || ''), filters],
    queryFn: () => analyticsApi.getRecommendations(projectId!, filters),
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Get pending recommendations for a project
 */
export function usePendingRecommendations(projectId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.pendingRecommendations(projectId || ''),
    queryFn: () => analyticsApi.getPendingRecommendations(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Get recommendation statistics
 */
export function useRecommendationStats(projectId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.recommendationStats(projectId || ''),
    queryFn: () => analyticsApi.getRecommendationStats(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Acknowledge a recommendation
 */
export function useAcknowledgeRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recommendationId, notes }: { recommendationId: string; notes?: string }) =>
      analyticsApi.acknowledgeRecommendation(recommendationId, notes),
    onSuccess: (data) => {
      toast.success('Recommendation acknowledged')
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.pendingRecommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendationStats(data.project_id),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to acknowledge recommendation')
    },
  })
}

/**
 * Mark recommendation as implemented
 */
export function useImplementRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recommendationId, notes }: { recommendationId: string; notes?: string }) =>
      analyticsApi.implementRecommendation(recommendationId, notes),
    onSuccess: (data) => {
      toast.success('Recommendation marked as implemented')
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.pendingRecommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendationStats(data.project_id),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to implement recommendation')
    },
  })
}

/**
 * Dismiss a recommendation
 */
export function useDismissRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recommendationId, reason }: { recommendationId: string; reason: string }) =>
      analyticsApi.dismissRecommendation(recommendationId, reason),
    onSuccess: (data) => {
      toast.success('Recommendation dismissed')
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.pendingRecommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendationStats(data.project_id),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to dismiss recommendation')
    },
  })
}

/**
 * Create a new recommendation
 */
export function useCreateRecommendation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      recommendation: Omit<
        AnalyticsRecommendation,
        'id' | 'created_at' | 'updated_at' | 'status'
      >
    ) => analyticsApi.createRecommendation(recommendation),
    onSuccess: (data) => {
      toast.success('Recommendation created')
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.pendingRecommendations(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.recommendationStats(data.project_id),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create recommendation')
    },
  })
}

// =============================================
// Dashboard Queries
// =============================================

/**
 * Get complete analytics dashboard data
 */
export function useAnalyticsDashboard(projectId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(projectId || ''),
    queryFn: () => analyticsApi.getDashboardData(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes - dashboard should be fairly fresh
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  })
}

// =============================================
// Model Metadata Queries
// =============================================

/**
 * Get all models
 */
export function useModels() {
  return useQuery({
    queryKey: analyticsKeys.models(),
    queryFn: () => analyticsApi.getModels(),
    staleTime: 30 * 60 * 1000, // 30 minutes - models don't change often
  })
}

/**
 * Get active model for a type
 */
export function useActiveModel(modelType: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.activeModel(modelType || ''),
    queryFn: () => analyticsApi.getActiveModel(modelType!),
    enabled: !!modelType,
    staleTime: 30 * 60 * 1000,
  })
}

/**
 * Get model performance metrics
 */
export function useModelPerformance() {
  return useQuery({
    queryKey: analyticsKeys.modelPerformance(),
    queryFn: () => analyticsApi.getModelPerformance(),
    staleTime: 30 * 60 * 1000,
  })
}

// =============================================
// Utility Hooks
// =============================================

/**
 * Combined hook for project analytics overview
 * Returns risk scores, latest prediction, and pending recommendations
 */
export function useProjectAnalyticsOverview(projectId: string | undefined) {
  const riskScores = useRiskScores(projectId)
  const prediction = useLatestPrediction(projectId)
  const recommendations = usePendingRecommendations(projectId)
  const stats = useRecommendationStats(projectId)

  return {
    riskScores: riskScores.data,
    prediction: prediction.data,
    recommendations: recommendations.data,
    stats: stats.data,
    isLoading:
      riskScores.isLoading ||
      prediction.isLoading ||
      recommendations.isLoading ||
      stats.isLoading,
    isError:
      riskScores.isError || prediction.isError || recommendations.isError || stats.isError,
    error: riskScores.error || prediction.error || recommendations.error || stats.error,
  }
}

/**
 * Hook to trigger a full analytics refresh
 * Collects snapshot + generates prediction in sequence
 */
export function useRefreshAnalytics() {
  const collectSnapshot = useCollectSnapshot()
  const generatePrediction = useGeneratePrediction()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      // First collect a snapshot
      const snapshotId = await collectSnapshot.mutateAsync(projectId)

      // Get the snapshot data
      const snapshot = await analyticsApi.getLatestSnapshot(projectId)

      if (!snapshot) {
        throw new Error('Failed to get snapshot after collection')
      }

      // Generate prediction using the snapshot
      const prediction = await generatePrediction.mutateAsync({
        projectId,
        snapshot,
      })

      return { snapshotId, prediction }
    },
    onSuccess: (_, projectId) => {
      toast.success('Analytics refreshed successfully')
      // Invalidate all analytics queries for this project
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.dashboard(projectId),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to refresh analytics')
    },
  })
}

/**
 * Hook for checking if ML models are available
 */
export function useMLStatus() {
  return useQuery({
    queryKey: [...analyticsKeys.all, 'ml-status'],
    queryFn: async () => {
      const service = getPredictionService()
      await service.initialize()
      return {
        initialized: true,
        usingMLModels: service.isUsingMLModels(),
        modelVersion: service.getModelVersion(),
      }
    },
    staleTime: Infinity, // Only check once per session
  })
}
