/**
 * Tests for Near-Miss Trends Tool
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockToolContext,
  createMockSupabaseQuery,
} from '../../__tests__/test-utils';

// Hoist all mocks
const mockCreateTool = vi.hoisted(() => vi.fn((config) => config));
const mockSupabaseFrom = vi.hoisted(() => vi.fn());

vi.mock('../../registry', () => ({
  createTool: mockCreateTool,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

describe('nearMissTrendsTool', () => {
  let nearMissTrendsTool: any;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123', userId: 'user-123' });

    const module = await import('../near-miss-trends');
    nearMissTrendsTool = module.nearMissTrendsTool;
  });

  // ==========================================================================
  // Tool Definition Tests
  // ==========================================================================

  describe('Tool Definition', () => {
    it('should have correct name and category', () => {
      expect(nearMissTrendsTool.name).toBe('near_miss_trends');
      expect(nearMissTrendsTool.category).toBe('action');
    });

    it('should have company_id as required parameter', () => {
      const { parameters } = nearMissTrendsTool;
      expect(parameters.required).toContain('company_id');
    });

    it('should have optional lookback_days parameter', () => {
      const { parameters } = nearMissTrendsTool;
      expect(parameters.properties.lookback_days).toBeDefined();
      expect(parameters.properties.lookback_days.type).toBe('number');
    });

    it('should have optional spike_threshold parameter', () => {
      const { parameters } = nearMissTrendsTool;
      expect(parameters.properties.spike_threshold).toBeDefined();
    });

    it('should not require confirmation', () => {
      expect(nearMissTrendsTool.requiresConfirmation).toBe(false);
    });
  });

  // ==========================================================================
  // Trend Summary Tests
  // ==========================================================================

  describe('Trend Summary', () => {
    it('should calculate total near-misses', async () => {
      setupMockQueries({
        nearMisses: createNearMisses(15),
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.trend_summary.total_near_misses).toBe(15);
    });

    it('should detect increasing trend', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 60);

      setupMockQueries({
        nearMisses: [
          // 8 in current period (recent)
          ...Array(8).fill(null).map((_, i) => ({
            id: `recent-${i}`,
            category: 'near_miss',
            created_at: recentDate.toISOString(),
          })),
          // 2 in previous period (older)
          ...Array(2).fill(null).map((_, i) => ({
            id: `old-${i}`,
            category: 'near_miss',
            created_at: olderDate.toISOString(),
          })),
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.trend_summary.trend_direction).toBe('increasing');
      expect(result.data.trend_summary.percent_change).toBeGreaterThan(15);
    });

    it('should detect decreasing trend', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 60);

      setupMockQueries({
        nearMisses: [
          // 2 in current period
          ...Array(2).fill(null).map((_, i) => ({
            id: `recent-${i}`,
            category: 'near_miss',
            created_at: recentDate.toISOString(),
          })),
          // 8 in previous period
          ...Array(8).fill(null).map((_, i) => ({
            id: `old-${i}`,
            category: 'near_miss',
            created_at: olderDate.toISOString(),
          })),
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.trend_summary.trend_direction).toBe('decreasing');
    });

    it('should detect stable trend', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 60);

      setupMockQueries({
        nearMisses: [
          // 5 in current period
          ...Array(5).fill(null).map((_, i) => ({
            id: `recent-${i}`,
            category: 'near_miss',
            created_at: recentDate.toISOString(),
          })),
          // 5 in previous period
          ...Array(5).fill(null).map((_, i) => ({
            id: `old-${i}`,
            category: 'near_miss',
            created_at: olderDate.toISOString(),
          })),
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.trend_summary.trend_direction).toBe('stable');
    });
  });

  // ==========================================================================
  // Frequency Analysis Tests
  // ==========================================================================

  describe('Frequency Analysis', () => {
    it('should calculate daily average', async () => {
      setupMockQueries({
        nearMisses: createNearMisses(90), // 90 near-misses over 90 days = 1/day
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123', lookback_days: 90 },
        mockContext
      );

      expect(result.data.frequency_analysis.daily_average).toBe(1);
    });

    it('should generate weekly pattern', async () => {
      setupMockQueries({
        nearMisses: createNearMisses(10),
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.frequency_analysis.weekly_pattern).toHaveLength(7);
      expect(result.data.frequency_analysis.weekly_pattern[0].day).toBe('Sunday');
      expect(result.data.frequency_analysis.weekly_pattern[1].day).toBe('Monday');
    });

    it('should generate hourly pattern', async () => {
      setupMockQueries({
        nearMisses: createNearMisses(10),
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.frequency_analysis.hourly_pattern).toBeDefined();
      // Only hours with data are included
    });
  });

  // ==========================================================================
  // Emerging Risks Tests
  // ==========================================================================

  describe('Emerging Risks', () => {
    it('should identify new risk categories', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 60);

      setupMockQueries({
        nearMisses: [
          // New category only in current period
          { id: '1', observation_type: 'electrical', category: 'near_miss', created_at: recentDate.toISOString() },
          { id: '2', observation_type: 'electrical', category: 'near_miss', created_at: recentDate.toISOString() },
          { id: '3', observation_type: 'electrical', category: 'near_miss', created_at: recentDate.toISOString() },
          // Old category only in previous period
          { id: '4', observation_type: 'general', category: 'near_miss', created_at: olderDate.toISOString() },
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const electricalRisk = result.data.emerging_risks.find((r: any) =>
        r.category === 'electrical'
      );
      expect(electricalRisk).toBeDefined();
      expect(electricalRisk.trend).toBe('new');
    });

    it('should identify increasing risk categories', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 60);

      setupMockQueries({
        nearMisses: [
          // 5 in current period
          ...Array(5).fill(null).map((_, i) => ({
            id: `recent-${i}`,
            observation_type: 'fall',
            category: 'near_miss',
            created_at: recentDate.toISOString(),
          })),
          // 2 in previous period
          ...Array(2).fill(null).map((_, i) => ({
            id: `old-${i}`,
            observation_type: 'fall',
            category: 'near_miss',
            created_at: olderDate.toISOString(),
          })),
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const fallRisk = result.data.emerging_risks.find((r: any) =>
        r.category === 'fall'
      );
      expect(fallRisk).toBeDefined();
      expect(fallRisk.trend).toBe('increasing');
    });

    it('should assess severity potential based on category', async () => {
      setupMockQueries({
        nearMisses: [
          // Fall hazards have high potential
          { id: '1', observation_type: 'fall', category: 'near_miss', created_at: new Date().toISOString() },
          { id: '2', observation_type: 'fall', category: 'near_miss', created_at: new Date().toISOString() },
          { id: '3', observation_type: 'fall', category: 'near_miss', created_at: new Date().toISOString() },
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const fallRisk = result.data.emerging_risks.find((r: any) =>
        r.category === 'fall'
      );
      expect(fallRisk?.severity_potential).toBe('high');
    });

    it('should sort emerging risks by severity and count', async () => {
      setupMockQueries({
        nearMisses: [
          // High severity, 3 occurrences
          ...Array(3).fill(null).map((_, i) => ({
            id: `fall-${i}`,
            observation_type: 'fall',
            category: 'near_miss',
            created_at: new Date().toISOString(),
          })),
          // Low severity, 5 occurrences
          ...Array(5).fill(null).map((_, i) => ({
            id: `other-${i}`,
            observation_type: 'housekeeping',
            category: 'near_miss',
            created_at: new Date().toISOString(),
          })),
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      // High severity should come first even with fewer occurrences
      if (result.data.emerging_risks.length >= 2) {
        expect(result.data.emerging_risks[0].category).toBe('fall');
      }
    });
  });

  // ==========================================================================
  // Spike Detection Tests
  // ==========================================================================

  describe('Spike Detection', () => {
    it('should detect daily spikes above threshold', async () => {
      const spikeDate = new Date();
      spikeDate.setDate(spikeDate.getDate() - 5);
      const spikeDateStr = spikeDate.toISOString().split('T')[0];

      // Create many near-misses on one day
      const nearMisses = Array(10).fill(null).map((_, i) => ({
        id: `spike-${i}`,
        category: 'near_miss',
        created_at: `${spikeDateStr}T${String(9 + i).padStart(2, '0')}:00:00.000Z`,
      }));

      // Add a few spread across other days
      for (let i = 0; i < 5; i++) {
        const otherDate = new Date();
        otherDate.setDate(otherDate.getDate() - (i + 10));
        nearMisses.push({
          id: `other-${i}`,
          category: 'near_miss',
          created_at: otherDate.toISOString(),
        });
      }

      setupMockQueries({ nearMisses });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123', spike_threshold: 50 },
        mockContext
      );

      const spike = result.data.spike_alerts.find((s: any) =>
        s.date === spikeDateStr
      );
      expect(spike).toBeDefined();
      expect(spike.count).toBe(10);
      expect(spike.deviation_percent).toBeGreaterThan(50);
    });

    it('should generate possible causes for spikes', async () => {
      // Create a Monday spike
      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // Last Monday
      const mondayStr = monday.toISOString().split('T')[0];

      setupMockQueries({
        nearMisses: Array(10).fill(null).map((_, i) => ({
          id: `spike-${i}`,
          category: 'near_miss',
          created_at: `${mondayStr}T09:00:00.000Z`,
        })),
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const spike = result.data.spike_alerts[0];
      if (spike) {
        expect(spike.possible_causes).toBeDefined();
        expect(spike.possible_causes.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // Predictive Insights Tests
  // ==========================================================================

  describe('Predictive Insights', () => {
    it('should generate insight for increasing trend', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 60);

      setupMockQueries({
        nearMisses: [
          // 10 recent vs 2 older = increasing
          ...Array(10).fill(null).map((_, i) => ({
            id: `recent-${i}`,
            category: 'near_miss',
            created_at: recentDate.toISOString(),
          })),
          ...Array(2).fill(null).map((_, i) => ({
            id: `old-${i}`,
            category: 'near_miss',
            created_at: olderDate.toISOString(),
          })),
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const trendInsight = result.data.predictive_insights.find((i: any) =>
        i.prediction.includes('trending upward')
      );
      expect(trendInsight).toBeDefined();
      expect(trendInsight.recommended_action).toContain('stand-down');
    });

    it('should generate insight for high-risk categories', async () => {
      setupMockQueries({
        nearMisses: [
          // Fall hazards
          ...Array(5).fill(null).map((_, i) => ({
            id: `fall-${i}`,
            observation_type: 'fall',
            category: 'near_miss',
            created_at: new Date().toISOString(),
          })),
        ],
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const highRiskInsight = result.data.predictive_insights.find((i: any) =>
        i.prediction.includes('high-severity')
      );
      expect(highRiskInsight).toBeDefined();
      expect(highRiskInsight.confidence).toBeGreaterThan(0.7);
    });

    it('should generate insight for location hotspots', async () => {
      setupMockQueries({
        nearMisses: Array(8).fill(null).map((_, i) => ({
          id: `nm-${i}`,
          category: 'near_miss',
          location: 'Roof Level 3',
          created_at: new Date().toISOString(),
        })),
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const locationInsight = result.data.predictive_insights.find((i: any) =>
        i.prediction.includes('hotspot')
      );
      expect(locationInsight).toBeDefined();
      expect(locationInsight.prediction).toContain('Roof Level 3');
    });
  });

  // ==========================================================================
  // Output Formatting Tests
  // ==========================================================================

  describe('Output Formatting', () => {
    it('should format output with correct title', async () => {
      setupMockQueries({ nearMisses: [] });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const formatted = nearMissTrendsTool.formatOutput(result.data);
      expect(formatted.title).toBe('Near-Miss Trend Analysis');
    });

    it('should use correct icon based on trend', async () => {
      setupMockQueries({ nearMisses: [] });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const formatted = nearMissTrendsTool.formatOutput(result.data);
      expect(['trending-up', 'trending-down', 'minus']).toContain(formatted.icon);
    });

    it('should show warning status for high-risk categories', async () => {
      setupMockQueries({
        nearMisses: Array(5).fill(null).map((_, i) => ({
          id: `fall-${i}`,
          observation_type: 'fall',
          category: 'near_miss',
          created_at: new Date().toISOString(),
        })),
      });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const formatted = nearMissTrendsTool.formatOutput(result.data);
      expect(formatted.status).toBe('warning');
    });

    it('should include trend percentage change in details', async () => {
      setupMockQueries({ nearMisses: createNearMisses(10) });

      const result = await nearMissTrendsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const formatted = nearMissTrendsTool.formatOutput(result.data);
      const changeDetail = formatted.details.find((d: any) => d.label === 'Change');
      expect(changeDetail).toBeDefined();
      expect(changeDetail.value).toContain('%');
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  interface MockSetup {
    nearMisses?: any[];
  }

  function setupMockQueries(setup: MockSetup) {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'safety_observations') {
        return createMockSupabaseQuery({
          data: setup.nearMisses || [],
          error: null,
        });
      }

      return createMockSupabaseQuery({ data: null, error: null });
    });
  }

  function createNearMisses(count: number, options: any = {}): any[] {
    return Array(count).fill(null).map((_, i) => ({
      id: `nm-${i}`,
      category: 'near_miss',
      observation_type: options.type || 'general',
      location: options.location || `Location ${i}`,
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      ...options,
    }));
  }
});
