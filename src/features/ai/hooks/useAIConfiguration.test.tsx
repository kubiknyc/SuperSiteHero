/**
 * AI Configuration Hooks Tests
 * Tests for AI configuration and usage management hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { AIConfiguration, AIUsageStats } from '@/types/ai';

// Mock functions must be defined BEFORE vi.mock calls
const mockGetConfiguration = vi.fn();
const mockUpdateConfiguration = vi.fn();
const mockTestConfiguration = vi.fn();
const mockGetUsageStats = vi.fn();
const mockCheckBudget = vi.fn();

// Mock the AI provider API
vi.mock('@/lib/api/services/ai-provider', () => ({
  aiConfigurationApi: {
    getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
    updateConfiguration: (...args: unknown[]) => mockUpdateConfiguration(...args),
    testConfiguration: (...args: unknown[]) => mockTestConfiguration(...args),
  },
  aiUsageApi: {
    getUsageStats: (...args: unknown[]) => mockGetUsageStats(...args),
    checkBudget: (...args: unknown[]) => mockCheckBudget(...args),
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import {
  aiQueryKeys,
  useAIConfiguration,
  useUpdateAIConfiguration,
  useTestAIConfiguration,
  useAIUsageStats,
  useAIBudgetCheck,
  useAIFeatureEnabled,
} from './useAIConfiguration';
import { toast } from 'sonner';

// Test data
const mockAIConfiguration: AIConfiguration = {
  id: 'config-123',
  company_id: 'company-123',
  provider: 'openai',
  api_key_encrypted: 'encrypted-key-xyz',
  model_preference: 'gpt-4o-mini',
  is_enabled: true,
  monthly_budget_cents: 10000,
  monthly_usage_cents: 2500,
  features_enabled: {
    rfi_routing: true,
    smart_summaries: true,
    risk_prediction: true,
    schedule_optimization: false,
    document_enhancement: true,
  },
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
};

const mockUsageStats: AIUsageStats = {
  companyId: 'company-123',
  periodStart: '2024-06-01',
  periodEnd: '2024-06-30',
  totalTokens: 1500000,
  totalCostCents: 4500,
  budgetCents: 10000,
  budgetUsedPercent: 45,
  byFeature: [
    { feature: 'rfi_routing', tokens: 500000, costCents: 1500, requestCount: 150 },
    { feature: 'smart_summaries', tokens: 800000, costCents: 2400, requestCount: 80 },
    { feature: 'risk_prediction', tokens: 200000, costCents: 600, requestCount: 30 },
  ],
  byDay: [
    { date: '2024-06-15', tokens: 50000, costCents: 150 },
    { date: '2024-06-16', tokens: 75000, costCents: 225 },
  ],
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAIConfiguration hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================
  // QUERY KEYS TESTS
  // =============================================

  describe('aiQueryKeys', () => {
    it('should generate base key', () => {
      expect(aiQueryKeys.all).toEqual(['ai']);
    });

    it('should generate configuration key', () => {
      expect(aiQueryKeys.configuration()).toEqual(['ai', 'configuration']);
    });

    it('should generate usage key without dates', () => {
      expect(aiQueryKeys.usage()).toEqual(['ai', 'usage', undefined, undefined]);
    });

    it('should generate usage key with dates', () => {
      expect(aiQueryKeys.usage('2024-06-01', '2024-06-30')).toEqual([
        'ai',
        'usage',
        '2024-06-01',
        '2024-06-30',
      ]);
    });

    it('should generate budget check key', () => {
      expect(aiQueryKeys.budgetCheck()).toEqual(['ai', 'budget-check']);
    });
  });

  // =============================================
  // QUERY HOOKS TESTS
  // =============================================

  describe('useAIConfiguration', () => {
    it('should fetch AI configuration', async () => {
      mockGetConfiguration.mockResolvedValue(mockAIConfiguration);

      const { result } = renderHook(() => useAIConfiguration(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetConfiguration).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockAIConfiguration);
    });

    it('should handle null configuration (not set up)', async () => {
      mockGetConfiguration.mockResolvedValue(null);

      const { result } = renderHook(() => useAIConfiguration(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
    });

    it('should handle configuration fetch error', async () => {
      mockGetConfiguration.mockRejectedValue(new Error('Failed to fetch configuration'));

      const { result } = renderHook(() => useAIConfiguration(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useAIUsageStats', () => {
    it('should fetch usage stats without dates', async () => {
      mockGetUsageStats.mockResolvedValue(mockUsageStats);

      const { result } = renderHook(() => useAIUsageStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetUsageStats).toHaveBeenCalledWith(undefined, undefined);
      expect(result.current.data).toEqual(mockUsageStats);
    });

    it('should fetch usage stats with date range', async () => {
      mockGetUsageStats.mockResolvedValue(mockUsageStats);

      const { result } = renderHook(
        () => useAIUsageStats('2024-06-01', '2024-06-30'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetUsageStats).toHaveBeenCalledWith('2024-06-01', '2024-06-30');
    });

    it('should return usage breakdown by feature', async () => {
      mockGetUsageStats.mockResolvedValue(mockUsageStats);

      const { result } = renderHook(() => useAIUsageStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.byFeature).toHaveLength(3);
      expect(result.current.data?.byFeature[0].feature).toBe('rfi_routing');
    });
  });

  describe('useAIBudgetCheck', () => {
    it('should check budget status', async () => {
      const budgetStatus = { withinBudget: true, usedPercent: 45 };
      mockCheckBudget.mockResolvedValue(budgetStatus);

      const { result } = renderHook(() => useAIBudgetCheck(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockCheckBudget).toHaveBeenCalled();
      expect(result.current.data).toEqual(budgetStatus);
    });

    it('should indicate when budget is exceeded', async () => {
      const budgetExceeded = { withinBudget: false, usedPercent: 120 };
      mockCheckBudget.mockResolvedValue(budgetExceeded);

      const { result } = renderHook(() => useAIBudgetCheck(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.withinBudget).toBe(false);
      expect(result.current.data?.usedPercent).toBeGreaterThan(100);
    });
  });

  describe('useAIFeatureEnabled', () => {
    it('should return enabled status for enabled feature', async () => {
      mockGetConfiguration.mockResolvedValue(mockAIConfiguration);

      const { result } = renderHook(
        () => useAIFeatureEnabled('rfi_routing'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEnabled).toBe(true);
    });

    it('should return disabled status for disabled feature', async () => {
      mockGetConfiguration.mockResolvedValue(mockAIConfiguration);

      const { result } = renderHook(
        () => useAIFeatureEnabled('schedule_optimization'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEnabled).toBe(false);
    });

    it('should return disabled when AI is globally disabled', async () => {
      const disabledConfig = { ...mockAIConfiguration, is_enabled: false };
      mockGetConfiguration.mockResolvedValue(disabledConfig);

      const { result } = renderHook(
        () => useAIFeatureEnabled('rfi_routing'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEnabled).toBe(false);
    });

    it('should return disabled when config is null', async () => {
      mockGetConfiguration.mockResolvedValue(null);

      const { result } = renderHook(
        () => useAIFeatureEnabled('smart_summaries'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // When config is null, isEnabled is falsy (undefined or false)
      expect(result.current.isEnabled).toBeFalsy();
    });
  });

  // =============================================
  // MUTATION HOOKS TESTS
  // =============================================

  describe('useUpdateAIConfiguration', () => {
    it('should update AI configuration', async () => {
      const updatedConfig = { ...mockAIConfiguration, model_preference: 'gpt-4o' };
      mockUpdateConfiguration.mockResolvedValue(updatedConfig);

      const { result } = renderHook(() => useUpdateAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        model_preference: 'gpt-4o',
      });

      expect(mockUpdateConfiguration).toHaveBeenCalledWith({
        model_preference: 'gpt-4o',
      });
      expect(toast.success).toHaveBeenCalledWith('AI configuration updated');
    });

    it('should handle update error', async () => {
      mockUpdateConfiguration.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateAIConfiguration(), { wrapper: createWrapper() });

      try {
        await result.current.mutateAsync({
          provider: 'anthropic',
        });
      } catch (error) {
        // Expected to throw
      }

      expect(toast.error).toHaveBeenCalledWith('Failed to update configuration: Update failed');
    });

    it('should update provider settings', async () => {
      const newConfig = { ...mockAIConfiguration, provider: 'anthropic' as const };
      mockUpdateConfiguration.mockResolvedValue(newConfig);

      const { result } = renderHook(() => useUpdateAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        provider: 'anthropic',
        api_key: 'sk-ant-new-key',
        model_preference: 'claude-3-5-haiku-latest',
      });

      expect(mockUpdateConfiguration).toHaveBeenCalledWith({
        provider: 'anthropic',
        api_key: 'sk-ant-new-key',
        model_preference: 'claude-3-5-haiku-latest',
      });
    });

    it('should update budget settings', async () => {
      const updatedConfig = { ...mockAIConfiguration, monthly_budget_cents: 20000 };
      mockUpdateConfiguration.mockResolvedValue(updatedConfig);

      const { result } = renderHook(() => useUpdateAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        monthly_budget_cents: 20000,
      });

      expect(mockUpdateConfiguration).toHaveBeenCalledWith({
        monthly_budget_cents: 20000,
      });
    });

    it('should update feature toggles', async () => {
      mockUpdateConfiguration.mockResolvedValue(mockAIConfiguration);

      const { result } = renderHook(() => useUpdateAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        features_enabled: {
          risk_prediction: false,
          schedule_optimization: true,
        },
      });

      expect(mockUpdateConfiguration).toHaveBeenCalledWith({
        features_enabled: {
          risk_prediction: false,
          schedule_optimization: true,
        },
      });
    });
  });

  describe('useTestAIConfiguration', () => {
    it('should test configuration successfully', async () => {
      mockTestConfiguration.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useTestAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync(mockAIConfiguration);

      expect(mockTestConfiguration).toHaveBeenCalledWith(mockAIConfiguration);
      expect(toast.success).toHaveBeenCalledWith('AI connection test successful!');
    });

    it('should handle test failure from API response', async () => {
      mockTestConfiguration.mockResolvedValue({ success: false, error: 'Invalid API key' });

      const { result } = renderHook(() => useTestAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync(mockAIConfiguration);

      expect(toast.error).toHaveBeenCalledWith('Connection test failed: Invalid API key');
    });

    it('should handle test exception', async () => {
      mockTestConfiguration.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTestAIConfiguration(), { wrapper: createWrapper() });

      try {
        await result.current.mutateAsync(mockAIConfiguration);
      } catch (error) {
        // Expected to throw
      }

      expect(toast.error).toHaveBeenCalledWith('Test failed: Network error');
    });

    it('should test OpenAI configuration', async () => {
      const openAIConfig: AIConfiguration = {
        ...mockAIConfiguration,
        provider: 'openai',
        model_preference: 'gpt-4o',
      };
      mockTestConfiguration.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useTestAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync(openAIConfig);

      expect(mockTestConfiguration).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'openai',
        model_preference: 'gpt-4o',
      }));
    });

    it('should test Anthropic configuration', async () => {
      const anthropicConfig: AIConfiguration = {
        ...mockAIConfiguration,
        provider: 'anthropic',
        model_preference: 'claude-3-5-sonnet-latest',
      };
      mockTestConfiguration.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useTestAIConfiguration(), { wrapper: createWrapper() });

      await result.current.mutateAsync(anthropicConfig);

      expect(mockTestConfiguration).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'anthropic',
      }));
    });
  });

  // =============================================
  // BUSINESS LOGIC TESTS
  // =============================================

  describe('AI Configuration Business Logic', () => {
    it('should identify provider from configuration', async () => {
      mockGetConfiguration.mockResolvedValue(mockAIConfiguration);

      const { result } = renderHook(() => useAIConfiguration(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.provider).toBe('openai');
    });

    it('should calculate budget usage percentage', async () => {
      mockGetUsageStats.mockResolvedValue(mockUsageStats);

      const { result } = renderHook(() => useAIUsageStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const stats = result.current.data!;
      const calculatedPercent = Math.round((stats.totalCostCents / stats.budgetCents!) * 100);
      expect(stats.budgetUsedPercent).toBe(calculatedPercent);
    });

    it('should aggregate costs by feature correctly', async () => {
      mockGetUsageStats.mockResolvedValue(mockUsageStats);

      const { result } = renderHook(() => useAIUsageStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const stats = result.current.data!;
      const totalFromFeatures = stats.byFeature.reduce((sum, f) => sum + f.costCents, 0);
      expect(totalFromFeatures).toBe(stats.totalCostCents);
    });

    it('should support all AI providers', () => {
      const providers = ['openai', 'anthropic', 'local'] as const;

      providers.forEach(provider => {
        const config: AIConfiguration = {
          ...mockAIConfiguration,
          provider,
        };
        expect(config.provider).toBe(provider);
      });
    });

    it('should support all AI features', () => {
      const features = [
        'rfi_routing',
        'smart_summaries',
        'risk_prediction',
        'schedule_optimization',
        'document_enhancement',
      ] as const;

      features.forEach(feature => {
        expect(mockAIConfiguration.features_enabled[feature]).toBeDefined();
      });
    });
  });

  describe('Cost Management', () => {
    it('should track monthly usage against budget', async () => {
      mockGetConfiguration.mockResolvedValue(mockAIConfiguration);

      const { result } = renderHook(() => useAIConfiguration(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const config = result.current.data!;
      expect(config.monthly_usage_cents).toBeLessThanOrEqual(config.monthly_budget_cents!);
    });

    it('should return budget status correctly', async () => {
      const withinBudget = { withinBudget: true, usedPercent: 75 };
      mockCheckBudget.mockResolvedValue(withinBudget);

      const { result } = renderHook(() => useAIBudgetCheck(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.withinBudget).toBe(true);
      expect(result.current.data?.usedPercent).toBeLessThan(100);
    });
  });
});
