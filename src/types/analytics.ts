// File: /src/types/analytics.ts
// TypeScript types for Predictive Analytics Engine

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

/**
 * ML model types
 */
export type AnalyticsModelType =
  | 'budget_overrun'
  | 'schedule_delay'
  | 'risk_score'
  | 'resource_forecast'

/**
 * Recommendation categories
 */
export type RecommendationCategory =
  | 'budget'
  | 'schedule'
  | 'risk'
  | 'operational'
  | 'resource'

/**
 * Recommendation priority levels
 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'

/**
 * Recommendation status
 */
export type RecommendationStatus = 'pending' | 'acknowledged' | 'implemented' | 'dismissed'

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Project snapshot for analytics (stored daily)
 */
export interface ProjectSnapshot {
  id: string
  project_id: string
  snapshot_date: string // ISO date

  // Budget Metrics
  contract_value: number | null
  budget: number | null
  approved_change_orders_cost: number | null
  pending_change_orders_cost: number | null
  cost_to_date: number | null

  // Schedule Metrics
  planned_start_date: string | null
  planned_completion_date: string | null
  projected_completion_date: string | null
  baseline_variance_days: number | null
  critical_path_length_days: number | null
  tasks_on_critical_path: number | null

  // Progress Metrics
  overall_percent_complete: number | null
  schedule_items_completed: number | null
  schedule_items_total: number | null
  milestones_completed: number | null
  milestones_total: number | null

  // Workflow Metrics
  open_rfis: number | null
  open_change_orders: number | null
  open_submittals: number | null
  overdue_rfis: number | null
  overdue_change_orders: number | null
  overdue_submittals: number | null
  avg_rfi_response_days: number | null
  avg_co_approval_days: number | null
  avg_submittal_response_days: number | null

  // Resource Metrics
  avg_daily_workforce: number | null
  total_labor_hours: number | null
  total_equipment_hours: number | null

  // Weather Metrics
  weather_delay_days: number | null
  weather_delay_hours: number | null

  // Punch List Metrics
  open_punch_items: number | null
  completed_punch_items: number | null
  total_punch_items: number | null

  // Safety Metrics
  safety_incidents_mtd: number | null
  near_misses_mtd: number | null
  osha_recordable_mtd: number | null
  days_since_incident: number | null

  // Document Metrics
  total_documents: number | null
  pending_approvals: number | null

  created_at: string
}

/**
 * Prediction result from ML models
 */
export interface AnalyticsPrediction {
  id: string
  project_id: string
  prediction_date: string
  model_version: string

  // Budget Predictions
  budget_overrun_probability: number | null
  budget_overrun_amount_low: number | null
  budget_overrun_amount_mid: number | null
  budget_overrun_amount_high: number | null
  budget_confidence_score: number | null

  // Schedule Predictions
  schedule_delay_probability: number | null
  schedule_delay_days_low: number | null
  schedule_delay_days_mid: number | null
  schedule_delay_days_high: number | null
  schedule_confidence_score: number | null
  projected_completion_date: string | null

  // Risk Scores (0-100)
  overall_risk_score: number | null
  schedule_risk_score: number | null
  cost_risk_score: number | null
  operational_risk_score: number | null

  // Feature Importance
  budget_feature_importance: FeatureImportance[] | null
  schedule_feature_importance: FeatureImportance[] | null
  risk_feature_importance: FeatureImportance[] | null

  // Input data snapshot
  input_features: Record<string, number> | null

  created_at: string
  expires_at: string | null
  is_latest: boolean
}

/**
 * Feature importance for model explainability
 */
export interface FeatureImportance {
  feature: string
  importance: number // 0-1
  direction: 'positive' | 'negative' | 'neutral'
  description?: string
}

/**
 * Actionable recommendation from predictions
 */
export interface AnalyticsRecommendation {
  id: string
  prediction_id: string | null
  project_id: string
  category: RecommendationCategory
  priority: RecommendationPriority
  title: string
  description: string
  suggested_action: string | null
  potential_impact: string | null
  impact: string | null // UI display field for impact level (e.g., 'high', 'medium', 'low')
  effort: string | null // UI display field for effort level (e.g., 'high', 'medium', 'low')
  related_entity_type: string | null
  related_entity_id: string | null
  related_entity_data: Record<string, unknown> | null
  status: RecommendationStatus
  acknowledged_at: string | null
  acknowledged_by: string | null
  implemented_at: string | null
  implemented_by: string | null
  dismissed_at: string | null
  dismissed_by: string | null
  dismissal_reason: string | null
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * ML model metadata
 */
export interface ModelMetadata {
  id: string
  model_type: AnalyticsModelType
  model_version: string
  model_json_url: string | null
  model_weights_url: string | null
  config_json_url: string | null
  training_started_at: string | null
  training_completed_at: string | null
  training_samples: number | null
  validation_samples: number | null
  training_duration_seconds: number | null
  accuracy: number | null
  precision_score: number | null
  recall_score: number | null
  f1_score: number | null
  mae: number | null
  rmse: number | null
  r_squared: number | null
  feature_config: FeatureConfig | null
  hyperparameters: Hyperparameters | null
  normalization_params: NormalizationParams | null
  is_active: boolean
  is_production: boolean
  deployed_at: string | null
  deprecated_at: string | null
  created_at: string
  created_by: string | null
  notes: string | null
}

// ============================================================================
// ML MODEL CONFIGURATION
// ============================================================================

/**
 * Feature configuration for ML models
 */
export interface FeatureConfig {
  features: FeatureDefinition[]
  target: string
  categorical_features?: string[]
  numerical_features?: string[]
}

/**
 * Single feature definition
 */
export interface FeatureDefinition {
  name: string
  type: 'numerical' | 'categorical' | 'boolean'
  source_column: string
  transform?: 'normalize' | 'standardize' | 'log' | 'one_hot'
  default_value?: number
  min_value?: number
  max_value?: number
}

/**
 * Model hyperparameters
 */
export interface Hyperparameters {
  learning_rate?: number
  epochs?: number
  batch_size?: number
  hidden_layers?: number[]
  activation?: string
  dropout?: number
  optimizer?: string
  loss?: string
  [key: string]: unknown
}

/**
 * Normalization parameters for inference
 */
export interface NormalizationParams {
  means: Record<string, number>
  stds: Record<string, number>
  mins?: Record<string, number>
  maxs?: Record<string, number>
}

// ============================================================================
// RISK SCORING
// ============================================================================

/**
 * Complete risk assessment
 */
export interface RiskAssessment {
  project_id: string
  assessed_at: string
  overall: RiskScore
  schedule: RiskScore
  cost: RiskScore
  operational: RiskScore
  factors: RiskFactor[]
}

/**
 * Individual risk score with details
 */
export interface RiskScore {
  score: number // 0-100
  level: RiskLevel
  trend: 'improving' | 'stable' | 'worsening'
  change_from_previous: number
  contributing_factors: string[]
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  name: string
  category: RecommendationCategory
  impact: number // 0-100
  description: string
  metric_value: number | string
  threshold: number | string
  is_above_threshold: boolean
}

// ============================================================================
// PREDICTION RESULTS
// ============================================================================

/**
 * Budget overrun prediction
 */
export interface BudgetPrediction {
  probability: number // 0-1
  amount_low: number
  amount_mid: number
  amount_high: number
  confidence: number // 0-1
  contributing_factors: FeatureImportance[]
  comparable_projects?: ComparableProject[]
}

/**
 * Schedule delay prediction
 */
export interface SchedulePrediction {
  probability: number // 0-1
  days_low: number
  days_mid: number
  days_high: number
  projected_completion_date: string
  confidence: number // 0-1
  contributing_factors: FeatureImportance[]
  critical_path_items?: CriticalPathRisk[]
}

/**
 * Comparable project for context
 */
export interface ComparableProject {
  project_id: string
  project_name: string
  similarity_score: number
  actual_overrun_percentage: number
  actual_delay_days: number
}

/**
 * Critical path item risk
 */
export interface CriticalPathRisk {
  task_id: string
  task_name: string
  risk_score: number
  days_at_risk: number
  reason: string
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Request to get prediction for a project
 */
export interface PredictionRequest {
  project_id: string
  force_refresh?: boolean
  model_version?: string
}

/**
 * Request to acknowledge a recommendation
 */
export interface AcknowledgeRecommendationRequest {
  recommendation_id: string
  notes?: string
}

/**
 * Request to dismiss a recommendation
 */
export interface DismissRecommendationRequest {
  recommendation_id: string
  reason: string
}

/**
 * Request to mark recommendation as implemented
 */
export interface ImplementRecommendationRequest {
  recommendation_id: string
  notes?: string
}

/**
 * Filters for recommendations
 */
export interface RecommendationFilters {
  categories?: RecommendationCategory[]
  priorities?: RecommendationPriority[]
  statuses?: RecommendationStatus[]
  date_from?: string
  date_to?: string
}

/**
 * Filters for snapshots
 */
export interface SnapshotFilters {
  date_from?: string
  date_to?: string
  interval?: 'daily' | 'weekly' | 'monthly'
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Complete prediction response
 */
export interface PredictionResponse {
  prediction: AnalyticsPrediction
  budget: BudgetPrediction
  schedule: SchedulePrediction
  risk: RiskAssessment
  recommendations: AnalyticsRecommendation[]
  generated_at: string
  model_version: string
}

/**
 * Recommendation with project info
 */
export interface RecommendationWithProject extends AnalyticsRecommendation {
  project_name: string
}

/**
 * Snapshot with computed metrics
 */
export interface SnapshotWithMetrics extends ProjectSnapshot {
  project_status: string
  days_since_start: number
  days_to_planned_completion: number | null
  change_order_ratio: number
  completion_percentage: number
}

/**
 * Model performance summary
 */
export interface ModelPerformanceSummary {
  model_type: AnalyticsModelType
  model_version: string
  training_completed_at: string | null
  training_samples: number | null
  accuracy: number | null
  mae: number | null
  rmse: number | null
  r_squared: number | null
  is_production: boolean
  is_active: boolean
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

/**
 * Analytics dashboard data
 */
export interface AnalyticsDashboard {
  project_id: string
  project_name: string
  last_updated: string

  // Current State
  current_risk: RiskAssessment
  current_prediction: PredictionResponse | null

  // Trends
  risk_trend: TrendDataPoint[]
  progress_trend: TrendDataPoint[]
  cost_trend: TrendDataPoint[]

  // Pending Actions
  pending_recommendations: AnalyticsRecommendation[]
  recommendation_stats: RecommendationStats

  // Comparison
  vs_baseline: BaselineComparison | null
}

/**
 * Trend data point for charts
 */
export interface TrendDataPoint {
  date: string
  value: number
  label?: string
}

/**
 * Recommendation statistics
 */
export interface RecommendationStats {
  total: number
  pending: number
  acknowledged: number
  implemented: number
  dismissed: number
  by_category: Record<RecommendationCategory, number>
  by_priority: Record<RecommendationPriority, number>
}

/**
 * Baseline comparison
 */
export interface BaselineComparison {
  budget_variance: number
  budget_variance_percentage: number
  schedule_variance_days: number
  completion_variance: number
}

// ============================================================================
// TENSORFLOW.JS TYPES
// ============================================================================

/**
 * Prepared input for TensorFlow.js model
 */
export interface ModelInput {
  features: number[]
  feature_names: string[]
}

/**
 * Raw output from TensorFlow.js model
 */
export interface ModelOutput {
  predictions: number[]
  probabilities?: number[]
}

/**
 * Inference request
 */
export interface InferenceRequest {
  model_type: AnalyticsModelType
  project_id: string
  snapshot_data: Partial<ProjectSnapshot>
}

/**
 * Inference result
 */
export interface InferenceResult {
  model_type: AnalyticsModelType
  model_version: string
  predictions: number[]
  confidence: number
  inference_time_ms: number
  feature_importance: FeatureImportance[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Get risk level from score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) {return 'critical'}
  if (score >= 60) {return 'high'}
  if (score >= 30) {return 'medium'}
  return 'low'
}

/**
 * Risk level colors
 */
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e', // green
  medium: '#eab308', // yellow
  high: '#f97316', // orange
  critical: '#ef4444', // red
}

/**
 * Priority colors
 */
export const PRIORITY_COLORS: Record<RecommendationPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
}

/**
 * Category icons (for UI)
 */
export const CATEGORY_ICONS: Record<RecommendationCategory, string> = {
  budget: 'DollarSign',
  schedule: 'Calendar',
  risk: 'AlertTriangle',
  operational: 'Settings',
  resource: 'Users',
}
