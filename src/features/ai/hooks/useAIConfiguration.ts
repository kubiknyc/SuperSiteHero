/**
 * AI Configuration Hooks
 * React Query hooks for managing AI configuration and usage
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiConfigurationApi, aiUsageApi } from '@/lib/api/services/ai-provider'
import type { UpdateAIConfigurationDTO, AIConfiguration, AIUsageStats } from '@/types/ai'
import { toast } from 'sonner'

// Query keys
export const aiQueryKeys = {
  all: ['ai'] as const,
  configuration: () => [...aiQueryKeys.all, 'configuration'] as const,
  usage: (startDate?: string, endDate?: string) =>
    [...aiQueryKeys.all, 'usage', startDate, endDate] as const,
  budgetCheck: () => [...aiQueryKeys.all, 'budget-check'] as const,
}

/**
 * Hook to get AI configuration
 */
export function useAIConfiguration() {
  return useQuery({
    queryKey: aiQueryKeys.configuration(),
    queryFn: () => aiConfigurationApi.getConfiguration(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to update AI configuration
 */
export function useUpdateAIConfiguration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: UpdateAIConfigurationDTO) =>
      aiConfigurationApi.updateConfiguration(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.configuration() })
      toast.success('AI configuration updated')
    },
    onError: (error) => {
      toast.error(`Failed to update configuration: ${error.message}`)
    },
  })
}

/**
 * Hook to test AI configuration
 */
export function useTestAIConfiguration() {
  return useMutation({
    mutationFn: (config: AIConfiguration) => aiConfigurationApi.testConfiguration(config),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('AI connection test successful!')
      } else {
        toast.error(`Connection test failed: ${result.error}`)
      }
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`)
    },
  })
}

/**
 * Hook to get AI usage statistics
 */
export function useAIUsageStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: aiQueryKeys.usage(startDate, endDate),
    queryFn: () => aiUsageApi.getUsageStats(startDate, endDate),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to check budget status
 */
export function useAIBudgetCheck() {
  return useQuery({
    queryKey: aiQueryKeys.budgetCheck(),
    queryFn: () => aiUsageApi.checkBudget(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Hook to check if a specific AI feature is enabled
 */
export function useAIFeatureEnabled(feature: keyof AIConfiguration['features_enabled']) {
  const { data: config, isLoading } = useAIConfiguration()

  return {
    isEnabled: config?.is_enabled && config?.features_enabled?.[feature],
    isLoading,
  }
}
