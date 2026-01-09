/**
 * useAgentConfig Hook
 * Fetches and updates agent configuration with optimistic updates and caching
 */

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AgentConfiguration,
  UpdateAgentConfigurationDTO,
  AgentFeaturesEnabled,
  AgentNotificationChannels,
} from '../types/agent'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface UseAgentConfigOptions {
  /** Whether to auto-fetch on mount */
  enabled?: boolean
}

interface UseAgentConfigResult {
  /** Current agent configuration */
  config: AgentConfiguration | null
  /** Whether the config is loading */
  isLoading: boolean
  /** Whether the config is being updated */
  isUpdating: boolean
  /** Error state */
  error: Error | null
  /** Refetch the configuration */
  refetch: () => Promise<void>
  /** Update the entire configuration */
  updateConfig: (updates: UpdateAgentConfigurationDTO) => Promise<void>
  /** Toggle a specific feature */
  toggleFeature: (feature: keyof AgentFeaturesEnabled, enabled: boolean) => Promise<void>
  /** Update all features at once */
  updateFeatures: (features: Partial<AgentFeaturesEnabled>) => Promise<void>
  /** Update notification channels */
  updateNotifications: (channels: Partial<AgentNotificationChannels>) => Promise<void>
  /** Update autonomy level */
  updateAutonomyLevel: (level: AgentConfiguration['autonomy_level']) => Promise<void>
  /** Update preferred model */
  updatePreferredModel: (model: string) => Promise<void>
  /** Update task limits */
  updateTaskLimits: (daily: number, monthly: number | null) => Promise<void>
  /** Update working hours */
  updateWorkingHours: (start: string, end: string, days: number[], timezone: string) => Promise<void>
  /** Reset configuration to defaults */
  resetToDefaults: () => Promise<void>
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_QUERY_KEY = ['agent-configuration'] as const

const DEFAULT_CONFIG: Omit<AgentConfiguration, 'id' | 'company_id' | 'created_at' | 'updated_at'> = {
  is_enabled: true,
  autonomy_level: 'suggest_only',
  features_enabled: {
    document_processing: true,
    daily_report_summaries: true,
    rfi_routing: false,
    rfi_drafting: false,
    submittal_classification: false,
    weekly_rollups: true,
    chat_interface: true,
    background_tasks: true,
    semantic_search: true,
  },
  notification_channels: {
    in_app: true,
    email: false,
  },
  monthly_task_limit: null,
  daily_task_limit: 100,
  working_hours_start: '08:00',
  working_hours_end: '18:00',
  working_days: [1, 2, 3, 4, 5], // Monday-Friday
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  preferred_model: 'claude-3-5-sonnet',
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAgentConfig(options: UseAgentConfigOptions = {}): UseAgentConfigResult {
  const { enabled = true } = options
  const queryClient = useQueryClient()

  // Fetch configuration
  const {
    data: config,
    isLoading,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: async (): Promise<AgentConfiguration | null> => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error('Not authenticated')
      }

      // Get user's company_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!profile?.company_id) {
        logger.warn('[useAgentConfig] User has no company_id')
        return null
      }

      // Fetch agent configuration for the company
      const { data, error } = await supabase
        .from('agent_configuration')
        .select('*')
        .eq('company_id', profile.company_id)
        .single()

      if (error) {
        // If no config exists, return null (will be created on first update)
        if (error.code === 'PGRST116') {
          logger.info('[useAgentConfig] No configuration found, will create on first update')
          return null
        }
        throw error
      }

      return data as AgentConfiguration
    },
    enabled,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  })

  // Update configuration mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async (updates: UpdateAgentConfigurationDTO): Promise<AgentConfiguration> => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error('Not authenticated')
      }

      // Get user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!profile?.company_id) {
        throw new Error('User has no company')
      }

      // Check if configuration exists
      const { data: existingConfig } = await supabase
        .from('agent_configuration')
        .select('id')
        .eq('company_id', profile.company_id)
        .single()

      let result: AgentConfiguration

      if (existingConfig) {
        // Update existing configuration
        const { data, error } = await supabase
          .from('agent_configuration')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', profile.company_id)
          .select()
          .single()

        if (error) throw error
        result = data as AgentConfiguration
      } else {
        // Create new configuration with defaults + updates
        const newConfig = {
          company_id: profile.company_id,
          ...DEFAULT_CONFIG,
          ...updates,
        }

        const { data, error } = await supabase
          .from('agent_configuration')
          .insert(newConfig)
          .select()
          .single()

        if (error) throw error
        result = data as AgentConfiguration
      }

      return result
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CONFIG_QUERY_KEY })

      // Snapshot current value
      const previousConfig = queryClient.getQueryData<AgentConfiguration | null>(CONFIG_QUERY_KEY)

      // Optimistically update
      if (previousConfig) {
        const optimisticConfig: AgentConfiguration = {
          ...previousConfig,
          ...updates,
          features_enabled: {
            ...previousConfig.features_enabled,
            ...updates.features_enabled,
          },
          notification_channels: {
            ...previousConfig.notification_channels,
            ...updates.notification_channels,
          },
          updated_at: new Date().toISOString(),
        }
        queryClient.setQueryData(CONFIG_QUERY_KEY, optimisticConfig)
      }

      return { previousConfig }
    },
    onError: (err, _, context) => {
      // Rollback on error
      logger.error('[useAgentConfig] Update failed, rolling back:', err)
      if (context?.previousConfig) {
        queryClient.setQueryData(CONFIG_QUERY_KEY, context.previousConfig)
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEY })
    },
  })

  // Convenience methods
  const refetch = useCallback(async () => {
    await refetchQuery()
  }, [refetchQuery])

  const updateConfig = useCallback(
    async (updates: UpdateAgentConfigurationDTO) => {
      await updateMutation.mutateAsync(updates)
    },
    [updateMutation]
  )

  const toggleFeature = useCallback(
    async (feature: keyof AgentFeaturesEnabled, enabled: boolean) => {
      await updateMutation.mutateAsync({
        features_enabled: {
          [feature]: enabled,
        },
      })
    },
    [updateMutation]
  )

  const updateFeatures = useCallback(
    async (features: Partial<AgentFeaturesEnabled>) => {
      await updateMutation.mutateAsync({
        features_enabled: features,
      })
    },
    [updateMutation]
  )

  const updateNotifications = useCallback(
    async (channels: Partial<AgentNotificationChannels>) => {
      await updateMutation.mutateAsync({
        notification_channels: channels,
      })
    },
    [updateMutation]
  )

  const updateAutonomyLevel = useCallback(
    async (level: AgentConfiguration['autonomy_level']) => {
      await updateMutation.mutateAsync({
        autonomy_level: level,
      })
    },
    [updateMutation]
  )

  const updatePreferredModel = useCallback(
    async (model: string) => {
      await updateMutation.mutateAsync({
        preferred_model: model,
      })
    },
    [updateMutation]
  )

  const updateTaskLimits = useCallback(
    async (daily: number, monthly: number | null) => {
      await updateMutation.mutateAsync({
        daily_task_limit: daily,
        monthly_task_limit: monthly,
      })
    },
    [updateMutation]
  )

  const updateWorkingHours = useCallback(
    async (start: string, end: string, days: number[], timezone: string) => {
      await updateMutation.mutateAsync({
        working_hours_start: start,
        working_hours_end: end,
        working_days: days,
        timezone,
      })
    },
    [updateMutation]
  )

  const resetToDefaults = useCallback(async () => {
    await updateMutation.mutateAsync({
      ...DEFAULT_CONFIG,
      features_enabled: DEFAULT_CONFIG.features_enabled,
      notification_channels: DEFAULT_CONFIG.notification_channels,
    })
  }, [updateMutation])

  return {
    config: config ?? null,
    isLoading,
    isUpdating: updateMutation.isPending,
    error: error as Error | null,
    refetch,
    updateConfig,
    toggleFeature,
    updateFeatures,
    updateNotifications,
    updateAutonomyLevel,
    updatePreferredModel,
    updateTaskLimits,
    updateWorkingHours,
    resetToDefaults,
  }
}

// ============================================================================
// Feature Metadata Hook
// ============================================================================

export interface FeatureMetadata {
  key: keyof AgentFeaturesEnabled
  name: string
  description: string
  isPremium: boolean
  category: 'documents' | 'workflows' | 'communication' | 'intelligence'
}

const FEATURE_METADATA: FeatureMetadata[] = [
  {
    key: 'document_processing',
    name: 'Document Processing',
    description: 'Automatically extract and index content from uploaded documents',
    isPremium: false,
    category: 'documents',
  },
  {
    key: 'daily_report_summaries',
    name: 'Daily Report Summaries',
    description: 'Generate AI summaries of daily reports for quick review',
    isPremium: false,
    category: 'communication',
  },
  {
    key: 'rfi_routing',
    name: 'RFI Routing',
    description: 'Automatically route RFIs to the appropriate team members',
    isPremium: true,
    category: 'workflows',
  },
  {
    key: 'rfi_drafting',
    name: 'RFI Draft Generation',
    description: 'Generate draft RFI responses based on project context',
    isPremium: true,
    category: 'workflows',
  },
  {
    key: 'submittal_classification',
    name: 'Submittal Classification',
    description: 'Automatically classify and tag submittals by CSI code',
    isPremium: true,
    category: 'documents',
  },
  {
    key: 'weekly_rollups',
    name: 'Weekly Rollups',
    description: 'Compile weekly progress summaries across all projects',
    isPremium: false,
    category: 'communication',
  },
  {
    key: 'chat_interface',
    name: 'Chat Interface',
    description: 'Enable the AI chat assistant for questions and commands',
    isPremium: false,
    category: 'intelligence',
  },
  {
    key: 'background_tasks',
    name: 'Background Tasks',
    description: 'Allow the agent to perform tasks automatically in the background',
    isPremium: false,
    category: 'intelligence',
  },
  {
    key: 'semantic_search',
    name: 'Semantic Search',
    description: 'Search across documents using natural language queries',
    isPremium: true,
    category: 'intelligence',
  },
]

/**
 * Hook to get feature metadata for rendering feature toggles
 */
export function useFeatureMetadata() {
  return {
    features: FEATURE_METADATA,
    getFeaturesByCategory: (category: FeatureMetadata['category']) =>
      FEATURE_METADATA.filter((f) => f.category === category),
    getFeature: (key: keyof AgentFeaturesEnabled) =>
      FEATURE_METADATA.find((f) => f.key === key),
  }
}

// ============================================================================
// Model Options Hook
// ============================================================================

export interface ModelOption {
  id: string
  name: string
  description: string
  contextWindow: number
  isPremium: boolean
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Balanced performance and cost, ideal for most tasks',
    contextWindow: 200000,
    isPremium: false,
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and cost-effective for simple tasks',
    contextWindow: 200000,
    isPremium: false,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Most capable model for complex analysis',
    contextWindow: 200000,
    isPremium: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI flagship model with multimodal capabilities',
    contextWindow: 128000,
    isPremium: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Efficient OpenAI model for everyday tasks',
    contextWindow: 128000,
    isPremium: false,
  },
]

/**
 * Hook to get available model options
 */
export function useModelOptions() {
  return {
    models: MODEL_OPTIONS,
    getModel: (id: string) => MODEL_OPTIONS.find((m) => m.id === id),
    standardModels: MODEL_OPTIONS.filter((m) => !m.isPremium),
    premiumModels: MODEL_OPTIONS.filter((m) => m.isPremium),
  }
}
