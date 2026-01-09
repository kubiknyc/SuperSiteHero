/**
 * AI Types
 * Type definitions for AI agent features including providers,
 * RFI routing, smart summaries, risk prediction, and schedule optimization
 */

// ============================================================================
// Provider Types
// ============================================================================

export type AIProviderType = 'openai' | 'anthropic' | 'local'

export interface AIConfiguration {
  id: string
  company_id: string

  // Provider Settings (matches database schema)
  default_provider: AIProviderType
  openai_model: string
  anthropic_model: string

  // API Keys - vault references (UUID) or direct encrypted keys
  openai_api_key_id?: string
  anthropic_api_key_id?: string
  // Legacy support for direct API key storage
  api_key_encrypted?: string

  // Feature Toggles (individual booleans matching database)
  enable_rfi_routing: boolean
  enable_smart_summaries: boolean
  enable_action_item_extraction: boolean
  enable_risk_prediction: boolean
  enable_schedule_optimization: boolean
  enable_document_enhancement: boolean

  // Cost Controls
  monthly_budget_cents: number
  current_month_usage_cents: number
  last_usage_reset: string
  alert_threshold_percent: number

  created_at: string
  updated_at: string

  // Computed property helpers (for backwards compatibility)
  /** @deprecated Use default_provider instead */
  provider?: AIProviderType
  /** @deprecated Use openai_model or anthropic_model instead */
  model_preference?: string
  /** @deprecated Check individual enable_* properties instead */
  is_enabled?: boolean
  /** @deprecated Use individual enable_* properties instead */
  features_enabled?: AIFeaturesEnabled
}

export interface AIFeaturesEnabled {
  rfi_routing: boolean
  smart_summaries: boolean
  risk_prediction: boolean
  schedule_optimization: boolean
  document_enhancement: boolean
}

export interface AIUsageLog {
  id: string
  company_id: string
  feature: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_cents: number
  latency_ms: number
  request_metadata?: Record<string, unknown>
  created_at: string
}

export interface TokenCount {
  input: number
  output: number
  total: number
}

export interface CompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  responseFormat?: 'text' | 'json'
  stopSequences?: string[]
}

export interface CompletionResult {
  content: string
  tokens: TokenCount
  model: string
  finishReason: 'stop' | 'length' | 'content_filter' | 'error'
  latencyMs: number
}

export interface JSONExtractionOptions extends CompletionOptions {
  schema?: JSONSchema
  retryOnParseError?: boolean
}

export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  enum?: string[]
  description?: string
}

// ============================================================================
// RFI Routing Types
// ============================================================================

export type BallInCourtRole =
  | 'architect'
  | 'engineer'
  | 'owner'
  | 'gc_pm'
  | 'subcontractor'
  | 'consultant'
  | 'inspector'

export type SuggestionFeedbackStatus = 'pending' | 'accepted' | 'rejected' | 'modified'

export interface RFIRoutingSuggestion {
  id: string
  rfi_id: string
  suggested_role: BallInCourtRole
  role_confidence: number
  suggested_assignee_id?: string
  assignee_confidence?: number
  csi_division?: string
  csi_section?: string
  csi_confidence?: number
  keywords: string[]
  reasoning?: string
  feedback_status: SuggestionFeedbackStatus
  actual_role_assigned?: BallInCourtRole
  actual_assignee_id?: string
  feedback_notes?: string
  processing_time_ms: number
  model_used: string
  created_at: string
  updated_at: string
}

export interface RFIRoutingPattern {
  id: string
  company_id: string
  project_id?: string
  keyword_pattern: string
  typical_role: BallInCourtRole
  typical_assignee_id?: string
  csi_division?: string
  match_count: number
  success_rate: number
  last_matched_at?: string
  created_at: string
  updated_at: string
}

export interface GenerateRoutingSuggestionDTO {
  rfi_id: string
  subject: string
  question: string
  project_id: string
  spec_section?: string
}

export interface RoutingSuggestionResponse {
  suggestion: RFIRoutingSuggestion
  relatedRFIs: RelatedItem[]
  relatedSubmittals: RelatedItem[]
}

export interface RelatedItem {
  id: string
  number: string
  subject: string
  similarity: number
  status: string
}

export interface SubmitRoutingFeedbackDTO {
  suggestion_id: string
  feedback_status: SuggestionFeedbackStatus
  actual_role_assigned?: BallInCourtRole
  actual_assignee_id?: string
  feedback_notes?: string
}

// ============================================================================
// Smart Summary Types
// ============================================================================

export type AISummaryType =
  | 'daily_report'
  | 'meeting_minutes'
  | 'weekly_status'
  | 'change_order_impact'
  | 'project_overview'

export interface AISummary {
  id: string
  company_id: string
  project_id: string
  summary_type: AISummaryType
  source_type: string
  source_id: string
  summary_content: string
  key_points: string[]
  metrics?: SummaryMetrics
  model_used: string
  tokens_used: number
  generated_at: string
  expires_at?: string
  created_at: string
}

export interface SummaryMetrics {
  // Daily report metrics
  workersOnSite?: number
  hoursWorked?: number
  equipmentHours?: number
  safetyIncidents?: number

  // Meeting metrics
  attendeeCount?: number
  actionItemCount?: number
  decisionsCount?: number

  // Weekly status metrics
  tasksCompleted?: number
  tasksInProgress?: number
  issuesResolved?: number
  issuesOpen?: number
  ppcValue?: number

  // Change order metrics
  totalCostImpact?: number
  totalScheduleImpact?: number
  approvedCount?: number
  pendingCount?: number
}

export interface AIExtractedActionItem {
  id: string
  summary_id: string
  action_description: string
  assignee_name?: string
  assignee_id?: string
  due_date?: string
  priority: 'high' | 'medium' | 'low'
  status: 'extracted' | 'confirmed' | 'rejected' | 'completed'
  source_text?: string
  confidence: number
  created_at: string
  updated_at: string
}

export interface GenerateSummaryDTO {
  summary_type: AISummaryType
  source_type: string
  source_id: string
  project_id: string
  force_regenerate?: boolean
}

export interface DailyReportSummaryResponse {
  summary: AISummary
  highlights: string[]
  concerns: string[]
  tomorrowFocus: string[]
}

export interface MeetingActionItemsResponse {
  summary: AISummary
  actionItems: AIExtractedActionItem[]
  decisions: string[]
  nextMeetingTopics: string[]
}

export interface WeeklyStatusResponse {
  summary: AISummary
  weeklyNarrative: string
  accomplishments: string[]
  challenges: string[]
  nextWeekPriorities: string[]
  trendIndicators: TrendIndicator[]
}

export interface TrendIndicator {
  metric: string
  direction: 'up' | 'down' | 'stable'
  value: number
  previousValue: number
  percentChange: number
}

// ============================================================================
// Risk Prediction Types
// ============================================================================

export type RiskAlertType =
  | 'activity_high_risk'
  | 'critical_path_threat'
  | 'constraint_overdue'
  | 'weather_impact_forecast'
  | 'resource_conflict'
  | 'trade_performance_issue'

export type RiskAlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ActivityRiskPrediction {
  id: string
  activity_id: string
  project_id: string
  analysis_date: string
  slip_probability: number
  slip_risk_score: number
  projected_delay_days_low: number
  projected_delay_days_mid: number
  projected_delay_days_high: number
  risk_factors: RiskFactor[]
  is_on_critical_path: boolean
  model_version: string
  created_at: string
}

export interface RiskFactor {
  factor: string
  impact: number
  description: string
  mitigationSuggestion?: string
}

export interface RiskAlert {
  id: string
  project_id: string
  alert_type: RiskAlertType
  severity: RiskAlertSeverity
  title: string
  description: string
  affected_activity_id?: string
  affected_constraint_id?: string
  risk_score: number
  recommended_actions: string[]
  is_acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  is_resolved: boolean
  resolved_at?: string
  resolution_notes?: string
  created_at: string
  updated_at: string
}

export interface RiskAnalysisRequest {
  project_id: string
  analysis_date?: string
  include_weather?: boolean
  look_ahead_weeks?: number
}

export interface RiskAnalysisResponse {
  analysisDate: string
  projectId: string
  overallRiskScore: number
  atRiskActivities: ActivityRiskPrediction[]
  alerts: RiskAlert[]
  weatherForecast?: WeatherImpact[]
  resourceConflicts: ResourceConflict[]
}

export interface WeatherImpact {
  date: string
  isWorkable: boolean
  precipitationProbability: number
  conditions: string
  impactedTrades: string[]
}

export interface ResourceConflict {
  resourceType: string
  resourceName?: string
  conflictDate: string
  demandPercent: number
  affectedActivities: string[]
}

// ============================================================================
// Schedule Optimization Types
// ============================================================================

export type ScheduleRecommendationType =
  | 'resequence_task'
  | 'add_float'
  | 'resource_level'
  | 'constraint_priority'
  | 'crew_optimization'
  | 'weather_adjustment'

export interface ScheduleOptimizationRecommendation {
  id: string
  project_id: string
  recommendation_type: ScheduleRecommendationType
  priority: number
  title: string
  description: string
  affected_activity_ids: string[]
  potential_days_saved: number
  potential_cost_savings?: number
  implementation_effort: 'low' | 'medium' | 'high'
  is_implemented: boolean
  implemented_at?: string
  implementation_notes?: string
  created_at: string
  updated_at: string
}

export interface CriticalPathAnalysis {
  id: string
  project_id: string
  analysis_date: string
  critical_path_activities: string[]
  total_duration_days: number
  total_float_days: number
  near_critical_activities: string[]
  bottleneck_resources: string[]
  created_at: string
}

export interface ConstraintScheduleImpact {
  id: string
  constraint_id: string
  project_id: string
  analysis_date: string
  days_until_critical: number
  downstream_activities_count: number
  potential_delay_days: number
  priority_score: number
  created_at: string
}

export interface ScheduleAnalysisRequest {
  project_id: string
  analysis_date?: string
  include_resource_leveling?: boolean
  include_what_if?: boolean
}

export interface ScheduleAnalysisResponse {
  analysisDate: string
  projectId: string
  criticalPath: CriticalPathResult
  floatOpportunities: FloatOpportunity[]
  resourceConflicts: ResourceConflict[]
  constraintPriorities: ConstraintPriority[]
  recommendations: ScheduleOptimizationRecommendation[]
}

export interface CriticalPathResult {
  activities: CriticalPathActivity[]
  totalDurationDays: number
  projectEndDate: string
  bottlenecks: string[]
}

export interface CriticalPathActivity {
  id: string
  name: string
  startDate: string
  endDate: string
  durationDays: number
  totalFloat: number
  freeFloat: number
  predecessors: string[]
  successors: string[]
  trade?: string
}

export interface FloatOpportunity {
  activityId: string
  activityName: string
  currentFloat: number
  potentialFloat: number
  recommendation: string
}

export interface ConstraintPriority {
  constraintId: string
  constraintDescription: string
  activityId: string
  activityName: string
  priorityScore: number
  daysUntilCritical: number
  downstreamImpact: number
  recommendedResolutionDate: string
}

// ============================================================================
// Document AI Enhancement Types
// ============================================================================

export interface DocumentLLMResult {
  id: string
  document_id: string
  classification_method: 'keyword' | 'llm' | 'hybrid'
  llm_category?: string
  llm_confidence?: number
  llm_reasoning?: string
  csi_section?: string
  csi_confidence?: number
  extracted_metadata?: ExtractedDocumentMetadata
  summary?: string
  model_used?: string
  tokens_used?: number
  processing_time_ms?: number
  created_at: string
  updated_at: string
}

export interface ExtractedDocumentMetadata {
  // Drawing metadata
  sheetNumber?: string
  sheetTitle?: string
  revision?: string
  scale?: string
  drawnBy?: string

  // Submittal metadata
  specSection?: string
  manufacturer?: string
  model?: string
  submittalDate?: string

  // RFI metadata
  rfiNumber?: string
  answerSummary?: string
  costImpact?: string
  scheduleImpact?: string

  // Contract metadata
  contractValue?: number
  effectiveDate?: string
  expirationDate?: string
  keyTerms?: string[]
  milestones?: ContractMilestone[]

  // General metadata
  parties?: string[]
  dates?: ExtractedDate[]
  amounts?: ExtractedAmount[]
}

export interface ContractMilestone {
  name: string
  date: string
  value?: number
}

export interface ExtractedDate {
  type: string
  value: string
  context?: string
}

export interface ExtractedAmount {
  type: string
  value: number
  currency: string
  context?: string
}

export interface DocumentEntityLink {
  id: string
  document_id: string
  entity_type: 'rfi' | 'submittal' | 'change_order' | 'daily_report' | 'punch_item'
  entity_id: string
  link_type: 'reference' | 'response' | 'attachment' | 'related'
  confidence: number
  extracted_reference?: string
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  created_at: string
}

export interface EnhanceDocumentRequest {
  document_id: string
  force_llm?: boolean
  extract_metadata?: boolean
  generate_summary?: boolean
  find_entity_links?: boolean
}

export interface EnhanceDocumentResponse {
  llmResult: DocumentLLMResult
  entityLinks: DocumentEntityLink[]
  suggestedCategory?: string
  processingStats: {
    method: 'keyword' | 'llm' | 'hybrid'
    totalTimeMs: number
    tokensUsed: number
    costCents: number
  }
}

// ============================================================================
// AI Feedback Types
// ============================================================================

export type AIFeedbackType =
  | 'routing_suggestion'
  | 'summary_quality'
  | 'risk_prediction'
  | 'schedule_recommendation'
  | 'document_classification'

export interface AIFeedback {
  id: string
  company_id: string
  user_id: string
  feedback_type: AIFeedbackType
  feature: string
  source_id: string
  rating: number
  feedback_text?: string
  improvement_suggestions?: string
  created_at: string
}

export interface SubmitFeedbackDTO {
  feedback_type: AIFeedbackType
  feature: string
  source_id: string
  rating: number
  feedback_text?: string
  improvement_suggestions?: string
}

// ============================================================================
// AI Provider Interface
// ============================================================================

export interface AIProvider {
  /**
   * Generate a text completion
   */
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult>

  /**
   * Extract structured JSON from text
   */
  extractJSON<T>(prompt: string, options?: JSONExtractionOptions): Promise<T>

  /**
   * Estimate cost for a given token count
   */
  estimateCost(tokens: TokenCount): number

  /**
   * Get provider name
   */
  getProviderName(): AIProviderType

  /**
   * Get available models
   */
  getAvailableModels(): string[]

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean
}

// ============================================================================
// API DTOs
// ============================================================================

export interface UpdateAIConfigurationDTO {
  // Provider Settings
  default_provider?: AIProviderType
  openai_model?: string
  anthropic_model?: string

  // API Keys (direct values to be stored/encrypted)
  openai_api_key?: string
  anthropic_api_key?: string

  // Feature Toggles
  enable_rfi_routing?: boolean
  enable_smart_summaries?: boolean
  enable_action_item_extraction?: boolean
  enable_risk_prediction?: boolean
  enable_schedule_optimization?: boolean
  enable_document_enhancement?: boolean

  // Cost Controls
  monthly_budget_cents?: number
  alert_threshold_percent?: number

  // Legacy support
  /** @deprecated Use default_provider instead */
  provider?: AIProviderType
  /** @deprecated Use openai_api_key or anthropic_api_key instead */
  api_key?: string
  /** @deprecated Use openai_model or anthropic_model instead */
  model_preference?: string
  /** @deprecated Use individual enable_* properties instead */
  is_enabled?: boolean
  /** @deprecated Use individual enable_* properties instead */
  features_enabled?: Partial<AIFeaturesEnabled>
}

export interface AIUsageStats {
  companyId: string
  periodStart: string
  periodEnd: string
  totalTokens: number
  totalCostCents: number
  budgetCents?: number
  budgetUsedPercent: number
  byFeature: FeatureUsage[]
  byDay: DailyUsage[]
}

export interface FeatureUsage {
  feature: string
  tokens: number
  costCents: number
  requestCount: number
}

export interface DailyUsage {
  date: string
  tokens: number
  costCents: number
}

// ============================================================================
// Model Pricing (cents per 1K tokens)
// ============================================================================

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 0.25, output: 1.0 },
  'gpt-4o-mini': { input: 0.015, output: 0.06 },
  'gpt-4-turbo': { input: 1.0, output: 3.0 },
  'gpt-3.5-turbo': { input: 0.05, output: 0.15 },

  // Anthropic
  'claude-3-haiku-20240307': { input: 0.025, output: 0.125 },
  'claude-3-5-sonnet-20241022': { input: 0.3, output: 1.5 },
  'claude-3-5-haiku-20241022': { input: 0.08, output: 0.4 },
  'claude-3-opus-20240229': { input: 1.5, output: 7.5 },

  // Local (free)
  'local': { input: 0, output: 0 },
}

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  local: 'local',
}
