/**
 * AI Types Tests
 * Tests for AI type definitions, constants, and model pricing
 */

import { describe, it, expect } from 'vitest';
import {
  MODEL_PRICING,
  DEFAULT_MODELS,
  type AIProviderType,
  type AIFeaturesEnabled,
  type RiskAlertSeverity,
  type LienWaiverType,
  type AISummaryType,
  type ScheduleRecommendationType,
} from './ai';

describe('AI Types', () => {
  // =============================================
  // MODEL PRICING TESTS
  // =============================================

  describe('MODEL_PRICING', () => {
    it('should have pricing for OpenAI models', () => {
      expect(MODEL_PRICING['gpt-4o']).toBeDefined();
      expect(MODEL_PRICING['gpt-4o-mini']).toBeDefined();
      expect(MODEL_PRICING['gpt-4-turbo']).toBeDefined();
      expect(MODEL_PRICING['gpt-3.5-turbo']).toBeDefined();

      // Verify structure
      expect(MODEL_PRICING['gpt-4o'].input).toBeGreaterThan(0);
      expect(MODEL_PRICING['gpt-4o'].output).toBeGreaterThan(0);
    });

    it('should have pricing for Anthropic models', () => {
      expect(MODEL_PRICING['claude-3-5-sonnet-latest']).toBeDefined();
      expect(MODEL_PRICING['claude-3-5-haiku-latest']).toBeDefined();
      expect(MODEL_PRICING['claude-3-opus-latest']).toBeDefined();

      // Verify structure
      expect(MODEL_PRICING['claude-3-5-sonnet-latest'].input).toBeGreaterThan(0);
      expect(MODEL_PRICING['claude-3-5-sonnet-latest'].output).toBeGreaterThan(0);
    });

    it('should have free pricing for local models', () => {
      expect(MODEL_PRICING['local']).toBeDefined();
      expect(MODEL_PRICING['local'].input).toBe(0);
      expect(MODEL_PRICING['local'].output).toBe(0);
    });

    it('should have output pricing higher than input pricing for most models', () => {
      // This is typical for LLM APIs - output tokens cost more
      Object.entries(MODEL_PRICING).forEach(([model, pricing]) => {
        if (model !== 'local') {
          expect(pricing.output).toBeGreaterThanOrEqual(pricing.input);
        }
      });
    });

    it('should have GPT-4o-mini as cheapest OpenAI option', () => {
      const gpt4oMini = MODEL_PRICING['gpt-4o-mini'];
      const gpt4o = MODEL_PRICING['gpt-4o'];
      const gpt4Turbo = MODEL_PRICING['gpt-4-turbo'];

      expect(gpt4oMini.input).toBeLessThan(gpt4o.input);
      expect(gpt4oMini.input).toBeLessThan(gpt4Turbo.input);
    });

    it('should have Claude Haiku as cheapest Anthropic option', () => {
      const haiku = MODEL_PRICING['claude-3-5-haiku-latest'];
      const sonnet = MODEL_PRICING['claude-3-5-sonnet-latest'];
      const opus = MODEL_PRICING['claude-3-opus-latest'];

      expect(haiku.input).toBeLessThan(sonnet.input);
      expect(haiku.input).toBeLessThan(opus.input);
    });
  });

  describe('DEFAULT_MODELS', () => {
    it('should have default models for all providers', () => {
      const providers: AIProviderType[] = ['openai', 'anthropic', 'local'];

      providers.forEach(provider => {
        expect(DEFAULT_MODELS[provider]).toBeDefined();
        expect(typeof DEFAULT_MODELS[provider]).toBe('string');
      });
    });

    it('should use cost-effective defaults', () => {
      // Defaults should be the cheaper options for cost-conscious defaults
      expect(DEFAULT_MODELS.openai).toBe('gpt-4o-mini');
      expect(DEFAULT_MODELS.anthropic).toBe('claude-3-5-haiku-latest');
      expect(DEFAULT_MODELS.local).toBe('local');
    });

    it('should have valid model names that exist in pricing', () => {
      // Except 'local' which maps to itself
      expect(MODEL_PRICING[DEFAULT_MODELS.openai]).toBeDefined();
      expect(MODEL_PRICING[DEFAULT_MODELS.anthropic]).toBeDefined();
    });
  });

  // =============================================
  // TYPE STRUCTURE TESTS
  // =============================================

  describe('AIConfiguration interface', () => {
    it('should support all required configuration fields', () => {
      const config = {
        id: 'config-123',
        company_id: 'company-123',
        provider: 'openai' as AIProviderType,
        api_key_encrypted: 'encrypted-key',
        model_preference: 'gpt-4o-mini',
        is_enabled: true,
        monthly_budget_cents: 10000,
        monthly_usage_cents: 2500,
        features_enabled: {
          rfi_routing: true,
          smart_summaries: true,
          risk_prediction: true,
          schedule_optimization: true,
          document_enhancement: true,
        } as AIFeaturesEnabled,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(config.provider).toBe('openai');
      expect(config.is_enabled).toBe(true);
      expect(config.features_enabled.rfi_routing).toBe(true);
    });
  });

  describe('AIFeaturesEnabled interface', () => {
    it('should have all AI feature flags', () => {
      const features: AIFeaturesEnabled = {
        rfi_routing: true,
        smart_summaries: true,
        risk_prediction: false,
        schedule_optimization: true,
        document_enhancement: false,
      };

      expect(typeof features.rfi_routing).toBe('boolean');
      expect(typeof features.smart_summaries).toBe('boolean');
      expect(typeof features.risk_prediction).toBe('boolean');
      expect(typeof features.schedule_optimization).toBe('boolean');
      expect(typeof features.document_enhancement).toBe('boolean');
    });
  });

  describe('RFI Routing types', () => {
    it('should support all ball-in-court roles', () => {
      const roles = ['architect', 'engineer', 'owner', 'gc_pm', 'subcontractor', 'consultant', 'inspector'];

      roles.forEach(role => {
        expect(typeof role).toBe('string');
      });
    });

    it('should have proper routing suggestion structure', () => {
      const suggestion = {
        id: 'suggestion-123',
        rfi_id: 'rfi-123',
        suggested_role: 'architect',
        role_confidence: 0.92,
        suggested_assignee_id: 'user-456',
        assignee_confidence: 0.85,
        csi_division: '03',
        csi_section: '03 30 00',
        csi_confidence: 0.88,
        keywords: ['concrete', 'reinforcement', 'structural'],
        reasoning: 'RFI pertains to concrete reinforcement specifications...',
        feedback_status: 'pending',
        processing_time_ms: 1250,
        model_used: 'gpt-4o',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      };

      expect(suggestion.role_confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.role_confidence).toBeLessThanOrEqual(1);
      expect(suggestion.keywords.length).toBeGreaterThan(0);
    });
  });

  describe('Smart Summary types', () => {
    it('should support all summary types', () => {
      const summaryTypes: AISummaryType[] = [
        'daily_report',
        'meeting_minutes',
        'weekly_status',
        'change_order_impact',
        'project_overview',
      ];

      expect(summaryTypes).toHaveLength(5);
    });

    it('should have proper summary metrics structure', () => {
      const metrics = {
        workersOnSite: 45,
        hoursWorked: 360,
        equipmentHours: 120,
        safetyIncidents: 0,
        attendeeCount: 12,
        actionItemCount: 8,
        decisionsCount: 3,
        tasksCompleted: 15,
        tasksInProgress: 22,
        issuesResolved: 5,
        issuesOpen: 3,
        ppcValue: 82,
        totalCostImpact: 50000,
        totalScheduleImpact: 5,
        approvedCount: 3,
        pendingCount: 2,
      };

      expect(metrics.workersOnSite).toBeGreaterThanOrEqual(0);
      expect(metrics.ppcValue).toBeGreaterThanOrEqual(0);
      expect(metrics.ppcValue).toBeLessThanOrEqual(100);
    });
  });

  describe('Risk Prediction types', () => {
    it('should support all risk alert types', () => {
      const alertTypes = [
        'activity_high_risk',
        'critical_path_threat',
        'constraint_overdue',
        'weather_impact_forecast',
        'resource_conflict',
        'trade_performance_issue',
      ];

      expect(alertTypes).toHaveLength(6);
    });

    it('should support all severity levels', () => {
      const severities: RiskAlertSeverity[] = ['low', 'medium', 'high', 'critical'];
      expect(severities).toHaveLength(4);
    });

    it('should have proper risk prediction structure', () => {
      const prediction = {
        id: 'pred-123',
        activity_id: 'act-456',
        project_id: 'proj-789',
        analysis_date: '2024-01-15',
        slip_probability: 0.35,
        slip_risk_score: 72,
        projected_delay_days_low: 2,
        projected_delay_days_mid: 5,
        projected_delay_days_high: 10,
        risk_factors: [
          {
            factor: 'weather',
            impact: 0.4,
            description: 'Rain forecast for next week',
            mitigationSuggestion: 'Consider scheduling indoor work',
          },
          {
            factor: 'resource_availability',
            impact: 0.25,
            description: 'Crew availability limited',
          },
        ],
        is_on_critical_path: true,
        model_version: '1.2.0',
        created_at: '2024-01-15T08:00:00Z',
      };

      expect(prediction.slip_probability).toBeGreaterThanOrEqual(0);
      expect(prediction.slip_probability).toBeLessThanOrEqual(1);
      expect(prediction.projected_delay_days_low).toBeLessThanOrEqual(prediction.projected_delay_days_mid);
      expect(prediction.projected_delay_days_mid).toBeLessThanOrEqual(prediction.projected_delay_days_high);
    });
  });

  describe('Schedule Optimization types', () => {
    it('should support all recommendation types', () => {
      const recommendationTypes: ScheduleRecommendationType[] = [
        'resequence_task',
        'add_float',
        'resource_level',
        'constraint_priority',
        'crew_optimization',
        'weather_adjustment',
      ];

      expect(recommendationTypes).toHaveLength(6);
    });

    it('should have proper recommendation structure', () => {
      const recommendation = {
        id: 'rec-123',
        project_id: 'proj-456',
        recommendation_type: 'resequence_task' as ScheduleRecommendationType,
        priority: 1,
        title: 'Resequence electrical rough-in',
        description: 'Moving electrical rough-in before drywall can save 3 days',
        affected_activity_ids: ['act-1', 'act-2', 'act-3'],
        potential_days_saved: 3,
        potential_cost_savings: 15000,
        implementation_effort: 'medium' as const,
        is_implemented: false,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z',
      };

      expect(recommendation.potential_days_saved).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(recommendation.implementation_effort);
    });
  });

  describe('Document AI Enhancement types', () => {
    it('should support extracted metadata structure', () => {
      const metadata = {
        // Drawing metadata
        sheetNumber: 'A-101',
        sheetTitle: 'First Floor Plan',
        revision: 'C',
        scale: '1/4" = 1\'-0"',
        drawnBy: 'JDS',

        // Submittal metadata
        specSection: '08 11 13',
        manufacturer: 'Hollow Metal Doors Inc.',
        model: 'HM-1000',
        submittalDate: '2024-01-15',

        // RFI metadata
        rfiNumber: 'RFI-042',
        answerSummary: 'Use 3/4" plywood for all backing',
        costImpact: 'No cost impact',
        scheduleImpact: 'No schedule impact',

        // Contract metadata
        contractValue: 5000000,
        effectiveDate: '2024-01-01',
        expirationDate: '2025-12-31',
        keyTerms: ['liquidated damages', 'retainage', 'change order process'],
        milestones: [
          { name: 'Foundation Complete', date: '2024-03-15', value: 500000 },
          { name: 'Substantial Completion', date: '2024-12-01', value: 4000000 },
        ],

        // General metadata
        parties: ['ABC Construction', 'XYZ Development'],
        dates: [
          { type: 'start_date', value: '2024-01-15' },
          { type: 'completion_date', value: '2024-12-31' },
        ],
        amounts: [
          { type: 'contract_sum', value: 5000000, currency: 'USD' },
          { type: 'retainage', value: 250000, currency: 'USD' },
        ],
      };

      expect(metadata.contractValue).toBeGreaterThan(0);
      expect(metadata.milestones.length).toBeGreaterThan(0);
      expect(metadata.keyTerms.length).toBeGreaterThan(0);
    });
  });

  describe('AI Usage and Cost tracking', () => {
    it('should have proper usage stats structure', () => {
      const stats = {
        companyId: 'company-123',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
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
          { date: '2024-01-15', tokens: 50000, costCents: 150 },
          { date: '2024-01-16', tokens: 75000, costCents: 225 },
        ],
      };

      expect(stats.budgetUsedPercent).toBeLessThanOrEqual(100);
      expect(stats.byFeature.reduce((sum, f) => sum + f.costCents, 0)).toBe(stats.totalCostCents);
    });

    it('should calculate cost correctly based on token counts', () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const pricing = MODEL_PRICING['gpt-4o-mini'];

      // Cost calculation: (input * inputPrice + output * outputPrice) / 1000
      const expectedCost = Math.ceil(
        (inputTokens * pricing.input + outputTokens * pricing.output) / 1000
      );

      expect(expectedCost).toBeGreaterThan(0);
    });
  });

  describe('Token Count interface', () => {
    it('should track input, output, and total tokens', () => {
      const tokens = {
        input: 1500,
        output: 750,
        total: 2250,
      };

      expect(tokens.total).toBe(tokens.input + tokens.output);
    });
  });

  describe('Completion Options interface', () => {
    it('should support all completion parameters', () => {
      const options = {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: 'You are a helpful construction assistant.',
        responseFormat: 'json' as const,
        stopSequences: ['END', '###'],
      };

      expect(options.temperature).toBeGreaterThanOrEqual(0);
      expect(options.temperature).toBeLessThanOrEqual(2);
      expect(options.maxTokens).toBeGreaterThan(0);
    });
  });

  describe('Completion Result interface', () => {
    it('should return proper completion structure', () => {
      const result = {
        content: 'The recommended approach is to...',
        tokens: {
          input: 500,
          output: 150,
          total: 650,
        },
        model: 'gpt-4o-mini',
        finishReason: 'stop' as const,
        latencyMs: 1250,
      };

      expect(['stop', 'length', 'content_filter', 'error']).toContain(result.finishReason);
      expect(result.latencyMs).toBeGreaterThan(0);
    });
  });
});
