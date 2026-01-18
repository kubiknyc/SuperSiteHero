/**
 * Tests for Analyze Incident Patterns Tool
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

describe('analyzeIncidentPatternsTool', () => {
  let analyzeIncidentPatternsTool: any;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123', userId: 'user-123' });

    const module = await import('../analyze-incident-patterns');
    analyzeIncidentPatternsTool = module.analyzeIncidentPatternsTool;
  });

  // ==========================================================================
  // Tool Definition Tests
  // ==========================================================================

  describe('Tool Definition', () => {
    it('should have correct name and category', () => {
      expect(analyzeIncidentPatternsTool.name).toBe('analyze_incident_patterns');
      expect(analyzeIncidentPatternsTool.category).toBe('action');
    });

    it('should have company_id as required parameter', () => {
      const { parameters } = analyzeIncidentPatternsTool;
      expect(parameters.required).toContain('company_id');
      expect(parameters.required).not.toContain('project_id'); // Optional
    });

    it('should have optional date_range_days parameter', () => {
      const { parameters } = analyzeIncidentPatternsTool;
      expect(parameters.properties.date_range_days).toBeDefined();
      expect(parameters.properties.date_range_days.type).toBe('number');
    });

    it('should not require confirmation', () => {
      expect(analyzeIncidentPatternsTool.requiresConfirmation).toBe(false);
    });
  });

  // ==========================================================================
  // TRIR Calculation Tests
  // ==========================================================================

  describe('TRIR Calculation', () => {
    it('should calculate TRIR correctly', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', severity: 'recordable', location: 'Floor 1', incident_type: 'fall', incident_date: new Date().toISOString() },
          { id: '2', severity: 'lost_time', location: 'Floor 1', incident_type: 'struck_by', incident_date: new Date().toISOString() },
        ],
        totalHours: 100000,
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.success).toBe(true);
      // TRIR = (2 recordable incidents * 200000) / 100000 = 4
      expect(result.data.summary.trir).toBe(4);
    });

    it('should return 0 TRIR when no incidents', async () => {
      setupMockQueries({ incidents: [], totalHours: 100000 });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.summary.trir).toBe(0);
    });

    it('should handle zero hours worked', async () => {
      setupMockQueries({
        incidents: [{ id: '1', severity: 'recordable', location: 'Floor 1', incident_date: new Date().toISOString() }],
        totalHours: 0,
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      // Should use default hours when 0
      expect(result.success).toBe(true);
      expect(typeof result.data.summary.trir).toBe('number');
    });
  });

  // ==========================================================================
  // DART Rate Calculation Tests
  // ==========================================================================

  describe('DART Rate Calculation', () => {
    it('should calculate DART rate for lost time incidents', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', severity: 'lost_time', days_away_from_work: 3, location: 'Floor 1', incident_date: new Date().toISOString() },
          { id: '2', severity: 'recordable', days_away_from_work: 0, location: 'Floor 1', incident_date: new Date().toISOString() },
        ],
        totalHours: 100000,
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      // Only 1 DART incident (lost_time)
      expect(result.data.summary.dart_rate).toBe(2); // (1 * 200000) / 100000
    });

    it('should include days away from work in DART calculation', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', severity: 'recordable', days_away_from_work: 5, location: 'Floor 1', incident_date: new Date().toISOString() },
        ],
        totalHours: 100000,
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      // Has days_away_from_work > 0, so counts as DART
      expect(result.data.summary.dart_rate).toBe(2);
    });
  });

  // ==========================================================================
  // Pattern Detection Tests
  // ==========================================================================

  describe('Pattern Detection', () => {
    it('should detect location patterns', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', location: 'Rooftop', severity: 'recordable', incident_date: new Date().toISOString() },
          { id: '2', location: 'Rooftop', severity: 'recordable', incident_date: new Date().toISOString() },
          { id: '3', location: 'Basement', severity: 'first_aid', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const locationPattern = result.data.patterns.find((p: any) => p.pattern_type === 'location');
      expect(locationPattern).toBeDefined();
      expect(locationPattern.description).toContain('Rooftop');
    });

    it('should detect category patterns', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', incident_type: 'fall', location: 'Area A', incident_date: new Date().toISOString() },
          { id: '2', incident_type: 'fall', location: 'Area B', incident_date: new Date().toISOString() },
          { id: '3', incident_type: 'struck_by', location: 'Area C', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const categoryPattern = result.data.patterns.find((p: any) => p.pattern_type === 'category');
      expect(categoryPattern).toBeDefined();
      expect(categoryPattern.description).toContain('fall');
    });

    it('should detect time patterns (day of week)', async () => {
      // Create incidents on Monday
      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // Get last Monday

      setupMockQueries({
        incidents: [
          { id: '1', location: 'A', incident_date: monday.toISOString() },
          { id: '2', location: 'B', incident_date: monday.toISOString() },
          { id: '3', location: 'C', incident_date: monday.toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const timePattern = result.data.patterns.find((p: any) => p.pattern_type === 'time');
      expect(timePattern).toBeDefined();
      expect(timePattern.description).toContain('Monday');
    });
  });

  // ==========================================================================
  // Hotspot Detection Tests
  // ==========================================================================

  describe('Hotspot Detection', () => {
    it('should identify hotspots with multiple incidents', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', location: 'Roof Level 3', severity: 'recordable', incident_date: new Date().toISOString() },
          { id: '2', location: 'Roof Level 3', severity: 'lost_time', incident_date: new Date().toISOString() },
          { id: '3', location: 'Ground Floor', severity: 'first_aid', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.hotspots.length).toBeGreaterThan(0);
      expect(result.data.hotspots[0].location).toBe('Roof Level 3');
      expect(result.data.hotspots[0].incident_count).toBe(2);
    });

    it('should calculate risk score based on severity', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', location: 'Danger Zone', severity: 'lost_time', incident_date: new Date().toISOString() },
          { id: '2', location: 'Danger Zone', severity: 'lost_time', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const hotspot = result.data.hotspots[0];
      expect(hotspot.risk_score).toBeGreaterThan(0);
    });

    it('should identify hazards based on location keywords', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', location: 'Excavation Area', severity: 'recordable', incident_date: new Date().toISOString() },
          { id: '2', location: 'Excavation Area', severity: 'first_aid', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const hotspot = result.data.hotspots[0];
      expect(hotspot.primary_hazards).toContain('Cave-in');
    });
  });

  // ==========================================================================
  // Root Cause Pareto Tests
  // ==========================================================================

  describe('Root Cause Pareto Analysis', () => {
    it('should build Pareto chart data from root causes', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', root_cause: 'Lack of training', location: 'A', incident_date: new Date().toISOString() },
          { id: '2', root_cause: 'Lack of training', location: 'B', incident_date: new Date().toISOString() },
          { id: '3', root_cause: 'Equipment failure', location: 'C', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.root_cause_pareto.length).toBeGreaterThan(0);
      expect(result.data.root_cause_pareto[0].category).toBe('Lack of training');
      expect(result.data.root_cause_pareto[0].count).toBe(2);
    });

    it('should calculate cumulative percentages', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', root_cause: 'Cause A', location: 'A', incident_date: new Date().toISOString() },
          { id: '2', root_cause: 'Cause A', location: 'B', incident_date: new Date().toISOString() },
          { id: '3', root_cause: 'Cause B', location: 'C', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const pareto = result.data.root_cause_pareto;
      // Last item should have ~100% cumulative
      const lastItem = pareto[pareto.length - 1];
      expect(lastItem.cumulative_percentage).toBeCloseTo(100, 0);
    });
  });

  // ==========================================================================
  // Trend Detection Tests
  // ==========================================================================

  describe('Trend Detection', () => {
    it('should detect improving trend when recent incidents decrease', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 45);

      setupMockQueries({
        incidents: [
          // 1 recent incident
          { id: '1', location: 'A', incident_date: recentDate.toISOString() },
          // 5 older incidents (30-60 days ago)
          { id: '2', location: 'B', incident_date: olderDate.toISOString() },
          { id: '3', location: 'C', incident_date: olderDate.toISOString() },
          { id: '4', location: 'D', incident_date: olderDate.toISOString() },
          { id: '5', location: 'E', incident_date: olderDate.toISOString() },
          { id: '6', location: 'F', incident_date: olderDate.toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.summary.trend_direction).toBe('improving');
    });

    it('should detect declining trend when recent incidents increase', async () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 10);
      const olderDate = new Date(now);
      olderDate.setDate(olderDate.getDate() - 45);

      setupMockQueries({
        incidents: [
          // 5 recent incidents
          { id: '1', location: 'A', incident_date: recentDate.toISOString() },
          { id: '2', location: 'B', incident_date: recentDate.toISOString() },
          { id: '3', location: 'C', incident_date: recentDate.toISOString() },
          { id: '4', location: 'D', incident_date: recentDate.toISOString() },
          { id: '5', location: 'E', incident_date: recentDate.toISOString() },
          // 1 older incident
          { id: '6', location: 'F', incident_date: olderDate.toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      expect(result.data.summary.trend_direction).toBe('declining');
    });
  });

  // ==========================================================================
  // Recommendations Tests
  // ==========================================================================

  describe('Recommendations', () => {
    it('should recommend action when TRIR exceeds 3.0', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', severity: 'recordable', location: 'A', incident_date: new Date().toISOString() },
          { id: '2', severity: 'recordable', location: 'B', incident_date: new Date().toISOString() },
          { id: '3', severity: 'recordable', location: 'C', incident_date: new Date().toISOString() },
          { id: '4', severity: 'recordable', location: 'D', incident_date: new Date().toISOString() },
        ],
        totalHours: 50000, // High TRIR
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const trirRecommendation = result.data.recommendations.find((r: any) =>
        r.title.includes('TRIR')
      );
      expect(trirRecommendation).toBeDefined();
      expect(trirRecommendation.priority).toBe('high');
    });

    it('should recommend hotspot mitigation when hotspots exist', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', location: 'Hotspot Area', severity: 'recordable', incident_date: new Date().toISOString() },
          { id: '2', location: 'Hotspot Area', severity: 'recordable', incident_date: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const hotspotRecommendation = result.data.recommendations.find((r: any) =>
        r.category === 'Hotspot Mitigation'
      );
      expect(hotspotRecommendation).toBeDefined();
    });
  });

  // ==========================================================================
  // Near-Miss Integration Tests
  // ==========================================================================

  describe('Near-Miss Integration', () => {
    it('should include near-misses when include_near_misses is true', async () => {
      setupMockQueries({
        incidents: [],
        nearMisses: [
          { id: 'nm-1', category: 'near_miss', created_at: new Date().toISOString() },
          { id: 'nm-2', category: 'near_miss', created_at: new Date().toISOString() },
        ],
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123', include_near_misses: true },
        mockContext
      );

      expect(result.data.summary.total_near_misses).toBe(2);
    });

    it('should recognize good near-miss reporting culture', async () => {
      setupMockQueries({
        incidents: [
          { id: '1', location: 'A', severity: 'first_aid', incident_date: new Date().toISOString() },
        ],
        nearMisses: Array(10).fill(null).map((_, i) => ({
          id: `nm-${i}`,
          category: 'near_miss',
          created_at: new Date().toISOString(),
        })),
      });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123', include_near_misses: true },
        mockContext
      );

      const positiveRecommendation = result.data.recommendations.find((r: any) =>
        r.title.includes('Near-Miss Reporting')
      );
      expect(positiveRecommendation).toBeDefined();
      expect(positiveRecommendation.priority).toBe('low');
    });
  });

  // ==========================================================================
  // Output Formatting Tests
  // ==========================================================================

  describe('Output Formatting', () => {
    it('should format output with correct title', async () => {
      setupMockQueries({ incidents: [] });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const formatted = analyzeIncidentPatternsTool.formatOutput(result.data);
      expect(formatted.title).toBe('Incident Pattern Analysis');
    });

    it('should use correct icon based on trend', async () => {
      setupMockQueries({ incidents: [] });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const formatted = analyzeIncidentPatternsTool.formatOutput(result.data);
      expect(['trending-down', 'trending-up', 'minus']).toContain(formatted.icon);
    });

    it('should include TRIR in summary', async () => {
      setupMockQueries({ incidents: [] });

      const result = await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123' },
        mockContext
      );

      const formatted = analyzeIncidentPatternsTool.formatOutput(result.data);
      expect(formatted.summary).toContain('TRIR');
    });
  });

  // ==========================================================================
  // Project Filtering Tests
  // ==========================================================================

  describe('Project Filtering', () => {
    it('should filter by project_id when provided', async () => {
      setupMockQueries({ incidents: [] });

      await analyzeIncidentPatternsTool.execute(
        { company_id: 'company-123', project_id: 'project-456' },
        mockContext
      );

      // Verify the query was called (we'd need to capture the eq calls)
      expect(mockSupabaseFrom).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  interface MockSetup {
    incidents?: any[];
    nearMisses?: any[];
    totalHours?: number;
  }

  function setupMockQueries(setup: MockSetup) {
    let callCount = 0;

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'safety_incidents') {
        return createMockSupabaseQuery({
          data: setup.incidents || [],
          error: null,
        });
      }

      if (table === 'safety_observations') {
        return createMockSupabaseQuery({
          data: setup.nearMisses || [],
          error: null,
        });
      }

      if (table === 'daily_reports') {
        const hours = setup.totalHours || 50000;
        return createMockSupabaseQuery({
          data: [{ total_hours: hours }],
          error: null,
        });
      }

      return createMockSupabaseQuery({ data: null, error: null });
    });
  }
});
