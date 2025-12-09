/**
 * AI Features
 * Re-exports for AI-related hooks, services, and components
 */

// Hooks
export * from './hooks/useAIConfiguration'

// Re-export types
export type {
  AIProviderType,
  AIConfiguration,
  AIFeaturesEnabled,
  AIUsageLog,
  TokenCount,
  CompletionOptions,
  CompletionResult,
  RFIRoutingSuggestion,
  AISummary,
  AISummaryType,
  AIExtractedActionItem,
  ActivityRiskPrediction,
  RiskAlert,
  RiskAlertType,
  ScheduleOptimizationRecommendation,
  DocumentLLMResult,
  DocumentEntityLink,
} from '@/types/ai'
