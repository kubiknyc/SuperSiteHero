// File: /src/lib/api/services/analytics.ts
// Predictive Analytics API service

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  ProjectSnapshot,
  AnalyticsPrediction,
  AnalyticsRecommendation,
  ModelMetadata,
  RiskAssessment,
  RiskScore,
  RecommendationCategory,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationFilters,
  SnapshotFilters,
  PredictionResponse,
  RecommendationWithProject,
  SnapshotWithMetrics,
  ModelPerformanceSummary,
  AnalyticsDashboard,
  TrendDataPoint,
  RecommendationStats,
  BaselineComparison,
} from '@/types/analytics'
import { getRiskLevel } from '@/types/analytics'

// Use 'any' for tables not in generated Supabase types
const db = supabase as any

export const analyticsApi = {
  // ============================================================================
  // SNAPSHOT OPERATIONS
  // ============================================================================

  /**
   * Collect a snapshot for a project (calls database function)
   */
  async collectProjectSnapshot(projectId: string): Promise<string> {
    try {
      const { data, error } = await db.rpc('collect_project_snapshot', {
        p_project_id: projectId,
      })

      if (error) {throw error}

      return data // Returns snapshot ID
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'COLLECT_SNAPSHOT_ERROR',
            message: 'Failed to collect project snapshot',
          })
    }
  },

  /**
   * Get snapshots for a project
   */
  async getProjectSnapshots(
    projectId: string,
    filters?: SnapshotFilters
  ): Promise<ProjectSnapshot[]> {
    try {
      let query = db
        .from('analytics_project_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .order('snapshot_date', { ascending: false })

      if (filters?.date_from) {
        query = query.gte('snapshot_date', filters.date_from)
      }

      if (filters?.date_to) {
        query = query.lte('snapshot_date', filters.date_to)
      }

      const { data, error } = await query

      if (error) {throw error}

      return data || []
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SNAPSHOTS_ERROR',
            message: 'Failed to fetch project snapshots',
          })
    }
  },

  /**
   * Get latest snapshot for a project
   */
  async getLatestSnapshot(projectId: string): Promise<ProjectSnapshot | null> {
    try {
      const { data, error } = await db
        .from('analytics_project_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SNAPSHOT_ERROR',
            message: 'Failed to fetch latest snapshot',
          })
    }
  },

  /**
   * Get snapshots with computed metrics
   */
  async getSnapshotsWithMetrics(
    projectId: string,
    filters?: SnapshotFilters
  ): Promise<SnapshotWithMetrics[]> {
    try {
      let query = db
        .from('analytics_training_data_view')
        .select('*')
        .eq('project_id', projectId)
        .order('snapshot_date', { ascending: false })

      if (filters?.date_from) {
        query = query.gte('snapshot_date', filters.date_from)
      }

      if (filters?.date_to) {
        query = query.lte('snapshot_date', filters.date_to)
      }

      const { data, error } = await query

      if (error) {throw error}

      return data || []
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_METRICS_ERROR',
        message: 'Failed to fetch snapshots with metrics',
      })
    }
  },

  // ============================================================================
  // PREDICTION OPERATIONS
  // ============================================================================

  /**
   * Get latest prediction for a project
   */
  async getLatestPrediction(projectId: string): Promise<AnalyticsPrediction | null> {
    try {
      const { data, error } = await db
        .from('analytics_predictions')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_latest', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PREDICTION_ERROR',
            message: 'Failed to fetch latest prediction',
          })
    }
  },

  /**
   * Get prediction history for a project
   */
  async getPredictionHistory(projectId: string, limit: number = 30): Promise<AnalyticsPrediction[]> {
    try {
      const { data, error } = await db
        .from('analytics_predictions')
        .select('*')
        .eq('project_id', projectId)
        .order('prediction_date', { ascending: false })
        .limit(limit)

      if (error) {throw error}

      return data || []
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_HISTORY_ERROR',
            message: 'Failed to fetch prediction history',
          })
    }
  },

  /**
   * Store a new prediction
   */
  async storePrediction(prediction: Omit<AnalyticsPrediction, 'id' | 'created_at'>): Promise<AnalyticsPrediction> {
    try {
      const { data, error } = await db
        .from('analytics_predictions')
        .insert({
          ...prediction,
          is_latest: true,
        })
        .select()
        .single()

      if (error) {throw error}

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'STORE_PREDICTION_ERROR',
            message: 'Failed to store prediction',
          })
    }
  },

  // ============================================================================
  // RISK SCORE OPERATIONS
  // ============================================================================

  /**
   * Get risk scores for a project (uses database function as fallback)
   */
  async getRiskScores(projectId: string): Promise<RiskAssessment> {
    try {
      // First, try to get from latest prediction
      const prediction = await this.getLatestPrediction(projectId)

      if (prediction && prediction.overall_risk_score !== null) {
        return {
          project_id: projectId,
          assessed_at: prediction.prediction_date,
          overall: this.buildRiskScore(prediction.overall_risk_score, prediction.risk_feature_importance),
          schedule: this.buildRiskScore(prediction.schedule_risk_score || 0),
          cost: this.buildRiskScore(prediction.cost_risk_score || 0),
          operational: this.buildRiskScore(prediction.operational_risk_score || 0),
          factors: [],
        }
      }

      // Fallback to database function
      const { data, error } = await db.rpc('calculate_risk_score', {
        p_project_id: projectId,
      })

      if (error) {throw error}

      const result = data?.[0] || { overall_risk: 0, schedule_risk: 0, cost_risk: 0, operational_risk: 0 }

      return {
        project_id: projectId,
        assessed_at: new Date().toISOString(),
        overall: this.buildRiskScore(result.overall_risk),
        schedule: this.buildRiskScore(result.schedule_risk),
        cost: this.buildRiskScore(result.cost_risk),
        operational: this.buildRiskScore(result.operational_risk),
        factors: [],
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RISK_ERROR',
            message: 'Failed to fetch risk scores',
          })
    }
  },

  /**
   * Helper to build a RiskScore object
   */
  buildRiskScore(score: number, featureImportance?: any[] | null): RiskScore {
    return {
      score,
      level: getRiskLevel(score),
      trend: 'stable',
      change_from_previous: 0,
      contributing_factors: featureImportance?.slice(0, 5).map((f) => f.feature) || [],
    }
  },

  // ============================================================================
  // RECOMMENDATION OPERATIONS
  // ============================================================================

  /**
   * Get recommendations for a project
   */
  async getRecommendations(
    projectId: string,
    filters?: RecommendationFilters
  ): Promise<AnalyticsRecommendation[]> {
    try {
      let query = db
        .from('analytics_recommendations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (filters?.categories?.length) {
        query = query.in('category', filters.categories)
      }

      if (filters?.priorities?.length) {
        query = query.in('priority', filters.priorities)
      }

      if (filters?.statuses?.length) {
        query = query.in('status', filters.statuses)
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      const { data, error } = await query

      if (error) {throw error}

      return data || []
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RECOMMENDATIONS_ERROR',
            message: 'Failed to fetch recommendations',
          })
    }
  },

  /**
   * Get pending recommendations for a project
   */
  async getPendingRecommendations(projectId: string): Promise<AnalyticsRecommendation[]> {
    return this.getRecommendations(projectId, { statuses: ['pending'] })
  },

  /**
   * Acknowledge a recommendation
   */
  async acknowledgeRecommendation(recommendationId: string, notes?: string): Promise<AnalyticsRecommendation> {
    try {
      const { data: user } = await supabase.auth.getUser()

      const { data, error } = await db
        .from('analytics_recommendations')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.user?.id,
          notes: notes || null,
        })
        .eq('id', recommendationId)
        .select()
        .single()

      if (error) {throw error}

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ACKNOWLEDGE_ERROR',
            message: 'Failed to acknowledge recommendation',
          })
    }
  },

  /**
   * Mark recommendation as implemented
   */
  async implementRecommendation(recommendationId: string, notes?: string): Promise<AnalyticsRecommendation> {
    try {
      const { data: user } = await supabase.auth.getUser()

      const { data, error } = await db
        .from('analytics_recommendations')
        .update({
          status: 'implemented',
          implemented_at: new Date().toISOString(),
          implemented_by: user?.user?.id,
          notes: notes || null,
        })
        .eq('id', recommendationId)
        .select()
        .single()

      if (error) {throw error}

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'IMPLEMENT_ERROR',
            message: 'Failed to mark recommendation as implemented',
          })
    }
  },

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(recommendationId: string, reason: string): Promise<AnalyticsRecommendation> {
    try {
      const { data: user } = await supabase.auth.getUser()

      const { data, error } = await db
        .from('analytics_recommendations')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_by: user?.user?.id,
          dismissal_reason: reason,
        })
        .eq('id', recommendationId)
        .select()
        .single()

      if (error) {throw error}

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DISMISS_ERROR',
            message: 'Failed to dismiss recommendation',
          })
    }
  },

  /**
   * Create a new recommendation
   */
  async createRecommendation(
    recommendation: Omit<AnalyticsRecommendation, 'id' | 'created_at' | 'updated_at' | 'status'>
  ): Promise<AnalyticsRecommendation> {
    try {
      const { data, error } = await db
        .from('analytics_recommendations')
        .insert({
          ...recommendation,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {throw error}

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_RECOMMENDATION_ERROR',
            message: 'Failed to create recommendation',
          })
    }
  },

  /**
   * Get recommendation statistics for a project
   */
  async getRecommendationStats(projectId: string): Promise<RecommendationStats> {
    try {
      const { data, error } = await db
        .from('analytics_recommendations')
        .select('status, category, priority')
        .eq('project_id', projectId)

      if (error) {throw error}

      const items = data || []

      const stats: RecommendationStats = {
        total: items.length,
        pending: items.filter((i: any) => i.status === 'pending').length,
        acknowledged: items.filter((i: any) => i.status === 'acknowledged').length,
        implemented: items.filter((i: any) => i.status === 'implemented').length,
        dismissed: items.filter((i: any) => i.status === 'dismissed').length,
        by_category: {
          budget: items.filter((i: any) => i.category === 'budget').length,
          schedule: items.filter((i: any) => i.category === 'schedule').length,
          risk: items.filter((i: any) => i.category === 'risk').length,
          operational: items.filter((i: any) => i.category === 'operational').length,
          resource: items.filter((i: any) => i.category === 'resource').length,
        },
        by_priority: {
          critical: items.filter((i: any) => i.priority === 'critical').length,
          high: items.filter((i: any) => i.priority === 'high').length,
          medium: items.filter((i: any) => i.priority === 'medium').length,
          low: items.filter((i: any) => i.priority === 'low').length,
        },
      }

      return stats
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_STATS_ERROR',
        message: 'Failed to fetch recommendation statistics',
      })
    }
  },

  // ============================================================================
  // MODEL METADATA OPERATIONS
  // ============================================================================

  /**
   * Get active model for a type
   */
  async getActiveModel(modelType: string): Promise<ModelMetadata | null> {
    try {
      const { data, error } = await db
        .from('analytics_model_metadata')
        .select('*')
        .eq('model_type', modelType)
        .eq('is_production', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_MODEL_ERROR',
            message: 'Failed to fetch active model',
          })
    }
  },

  /**
   * Get all models
   */
  async getModels(): Promise<ModelMetadata[]> {
    try {
      const { data, error } = await db
        .from('analytics_model_metadata')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return data || []
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_MODELS_ERROR',
            message: 'Failed to fetch models',
          })
    }
  },

  /**
   * Get model performance summary
   */
  async getModelPerformance(): Promise<ModelPerformanceSummary[]> {
    try {
      const { data, error } = await db
        .from('analytics_model_performance')
        .select('*')

      if (error) {throw error}

      return data || []
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_PERFORMANCE_ERROR',
        message: 'Failed to fetch model performance',
      })
    }
  },

  // ============================================================================
  // DASHBOARD / AGGREGATED DATA
  // ============================================================================

  /**
   * Get complete analytics dashboard data
   */
  async getDashboardData(projectId: string): Promise<AnalyticsDashboard> {
    try {
      const [
        projectResult,
        riskScores,
        prediction,
        recommendations,
        recommendationStats,
        snapshots,
      ] = await Promise.all([
        supabase.from('projects').select('name').eq('id', projectId).single(),
        this.getRiskScores(projectId),
        this.getLatestPrediction(projectId),
        this.getPendingRecommendations(projectId),
        this.getRecommendationStats(projectId),
        this.getProjectSnapshots(projectId, {
          date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }),
      ])

      // Build trend data from snapshots
      const riskTrend: TrendDataPoint[] = []
      const progressTrend: TrendDataPoint[] = []
      const costTrend: TrendDataPoint[] = []

      for (const snapshot of snapshots.reverse()) {
        const date = snapshot.snapshot_date

        // Risk trend (simplified - would need historical predictions)
        riskTrend.push({
          date,
          value: riskScores.overall.score,
        })

        // Progress trend
        progressTrend.push({
          date,
          value: snapshot.overall_percent_complete || 0,
        })

        // Cost trend (CO ratio)
        if (snapshot.budget && snapshot.budget > 0) {
          const coRatio = ((snapshot.approved_change_orders_cost || 0) / snapshot.budget) * 100
          costTrend.push({
            date,
            value: coRatio,
          })
        }
      }

      return {
        project_id: projectId,
        project_name: projectResult.data?.name || 'Unknown Project',
        last_updated: new Date().toISOString(),
        current_risk: riskScores,
        current_prediction: prediction
          ? {
              prediction,
              budget: {
                probability: prediction.budget_overrun_probability || 0,
                amount_low: prediction.budget_overrun_amount_low || 0,
                amount_mid: prediction.budget_overrun_amount_mid || 0,
                amount_high: prediction.budget_overrun_amount_high || 0,
                confidence: prediction.budget_confidence_score || 0,
                contributing_factors: prediction.budget_feature_importance || [],
              },
              schedule: {
                probability: prediction.schedule_delay_probability || 0,
                days_low: prediction.schedule_delay_days_low || 0,
                days_mid: prediction.schedule_delay_days_mid || 0,
                days_high: prediction.schedule_delay_days_high || 0,
                projected_completion_date: prediction.projected_completion_date || '',
                confidence: prediction.schedule_confidence_score || 0,
                contributing_factors: prediction.schedule_feature_importance || [],
              },
              risk: riskScores,
              recommendations,
              generated_at: prediction.prediction_date,
              model_version: prediction.model_version,
            }
          : null,
        risk_trend: riskTrend,
        progress_trend: progressTrend,
        cost_trend: costTrend,
        pending_recommendations: recommendations,
        recommendation_stats: recommendationStats,
        vs_baseline: this.calculateBaselineComparison(snapshots),
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DASHBOARD_ERROR',
            message: 'Failed to fetch dashboard data',
          })
    }
  },

  /**
   * Calculate baseline comparison from snapshots
   * Uses the earliest snapshot as baseline and compares to the latest
   */
  calculateBaselineComparison(snapshots: ProjectSnapshot[]): BaselineComparison | null {
    if (snapshots.length < 2) {
      return null
    }

    // Get baseline (earliest) and current (latest) snapshots
    const baseline = snapshots[snapshots.length - 1] // Oldest after reverse()
    const current = snapshots[0] // Most recent after reverse()

    // Calculate budget variance
    const baselineBudget = baseline.budget || baseline.contract_value || 0
    const currentCost = current.cost_to_date || 0
    const budgetVariance = baselineBudget > 0 ? currentCost - baselineBudget : 0
    const budgetVariancePercentage = baselineBudget > 0
      ? ((currentCost - baselineBudget) / baselineBudget) * 100
      : 0

    // Calculate schedule variance
    // Use baseline_variance_days from current snapshot if available
    // Otherwise, calculate from planned vs projected dates
    let scheduleVarianceDays = current.baseline_variance_days || 0
    if (!scheduleVarianceDays && current.planned_completion_date && current.projected_completion_date) {
      const planned = new Date(current.planned_completion_date)
      const projected = new Date(current.projected_completion_date)
      scheduleVarianceDays = Math.round((projected.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate completion variance (current progress vs expected progress)
    const currentProgress = current.overall_percent_complete || 0
    const baselineProgress = baseline.overall_percent_complete || 0
    const completionVariance = currentProgress - baselineProgress

    return {
      budget_variance: Math.round(budgetVariance * 100) / 100,
      budget_variance_percentage: Math.round(budgetVariancePercentage * 100) / 100,
      schedule_variance_days: scheduleVarianceDays,
      completion_variance: Math.round(completionVariance * 100) / 100,
    }
  },
}
