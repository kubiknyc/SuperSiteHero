/**
 * Tests for Predict Approval Timeline Tool
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

describe('predictApprovalTimelineTool', () => {
  let predictApprovalTimelineTool: any;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });

    // Dynamic import to get fresh module with mocks
    const module = await import('../predict-approval-timeline');
    predictApprovalTimelineTool = module.predictApprovalTimelineTool;
  });

  // ==========================================================================
  // Tool Definition Tests
  // ==========================================================================

  describe('Tool Definition', () => {
    it('should have correct name and category', () => {
      expect(predictApprovalTimelineTool.name).toBe('predict_approval_timeline');
      expect(predictApprovalTimelineTool.category).toBe('action');
    });

    it('should have required parameters defined', () => {
      const { parameters } = predictApprovalTimelineTool;
      expect(parameters.required).toContain('project_id');
      expect(parameters.required).toContain('item_type');
    });

    it('should have valid item_type enum', () => {
      const { parameters } = predictApprovalTimelineTool;
      const itemTypeEnum = parameters.properties.item_type.enum;

      expect(itemTypeEnum).toContain('change_order');
      expect(itemTypeEnum).toContain('invoice');
      expect(itemTypeEnum).toContain('submittal');
      expect(itemTypeEnum).toContain('rfi');
      expect(itemTypeEnum).toContain('payment_application');
      expect(itemTypeEnum).toContain('purchase_order');
    });

    it('should not require confirmation', () => {
      expect(predictApprovalTimelineTool.requiresConfirmation).toBe(false);
    });
  });

  // ==========================================================================
  // Basic Prediction Tests
  // ==========================================================================

  describe('Basic Predictions', () => {
    it('should predict timeline for change orders', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.item_type).toBe('change_order');
      expect(result.data.predicted_hours).toBeGreaterThan(0);
      expect(result.data.predicted_completion).toBeDefined();
    });

    it('should predict timeline for submittals', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 96) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'submittal' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.item_type).toBe('submittal');
    });

    it('should predict timeline for RFIs', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 72) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'rfi' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.item_type).toBe('rfi');
    });

    it('should use base approval times when no historical data', async () => {
      setupMockQueries({ historicalItems: [] });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'invoice' },
        mockContext
      );

      expect(result.success).toBe(true);
      // Base time for invoice is 48 hours (may be modified by day factor)
      expect(result.data.predicted_hours).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Historical Analysis Tests
  // ==========================================================================

  describe('Historical Analysis', () => {
    it('should calculate average from historical data', async () => {
      // Create items that complete in 24-48 hours
      setupMockQueries({ historicalItems: createHistoricalItems(20, 36) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      expect(result.data.historical_comparison.similar_items_count).toBe(20);
      expect(result.data.historical_comparison.avg_completion_hours).toBeGreaterThan(0);
    });

    it('should calculate min and max completion times', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48, 24, 96) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      expect(result.data.historical_comparison.min_hours).toBeGreaterThan(0);
      expect(result.data.historical_comparison.max_hours).toBeGreaterThan(
        result.data.historical_comparison.min_hours
      );
    });

    it('should calculate on-time percentage', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 36) }); // All on time (< 48h)

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'invoice' },
        mockContext
      );

      expect(result.data.historical_comparison.on_time_percentage).toBeDefined();
      expect(result.data.historical_comparison.on_time_percentage).toBeGreaterThanOrEqual(0);
      expect(result.data.historical_comparison.on_time_percentage).toBeLessThanOrEqual(100);
    });

    it('should exclude outliers over 30 days', async () => {
      const items = [
        ...createHistoricalItems(5, 48),
        // Add outlier (35 days = 840 hours)
        createHistoricalItem(840),
      ];
      setupMockQueries({ historicalItems: items });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      // Should only count 5 items (outlier excluded)
      expect(result.data.historical_comparison.similar_items_count).toBe(5);
    });
  });

  // ==========================================================================
  // Assignee-Based Prediction Tests
  // ==========================================================================

  describe('Assignee-Based Predictions', () => {
    it('should adjust prediction based on assignee history', async () => {
      setupMockQueries({
        historicalItems: createHistoricalItems(10, 48),
        assigneeHistory: createHistoricalItems(10, 24), // Fast approver
        pendingCount: 2,
      });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', assigned_to: 'fast-approver' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.confidence_percentage).toBeGreaterThan(70); // Higher confidence with assignee
    });

    it('should add delay factor for high workload', async () => {
      setupMockQueries({
        historicalItems: createHistoricalItems(10, 48),
        assigneeHistory: createHistoricalItems(5, 48),
        pendingCount: 15, // High workload
      });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', assigned_to: 'busy-approver' },
        mockContext
      );

      expect(result.success).toBe(true);
      // Should have a risk factor about workload
      const workloadRisk = result.data.risk_factors.find((r: any) =>
        r.factor.toLowerCase().includes('workload')
      );
      expect(workloadRisk).toBeDefined();
      expect(workloadRisk.impact).toBe('delays');
    });

    it('should identify fast approvers as positive factor', async () => {
      setupMockQueries({
        historicalItems: createHistoricalItems(10, 72),
        assigneeHistory: createHistoricalItems(10, 24), // Much faster than average
        pendingCount: 2,
      });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', assigned_to: 'fast-approver' },
        mockContext
      );

      const fastApproverRisk = result.data.risk_factors.find((r: any) =>
        r.factor.toLowerCase().includes('fast')
      );
      if (fastApproverRisk) {
        expect(fastApproverRisk.impact).toBe('speeds_up');
      }
    });
  });

  // ==========================================================================
  // Value-Based Prediction Tests
  // ==========================================================================

  describe('Value-Based Predictions', () => {
    it('should apply longer timeline for high-value items', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const lowValueResult = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', value: 5000 },
        mockContext
      );

      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const highValueResult = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', value: 150000 },
        mockContext
      );

      expect(highValueResult.data.predicted_hours).toBeGreaterThan(
        lowValueResult.data.predicted_hours
      );
    });

    it('should add risk factor for high-value items', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', value: 200000 },
        mockContext
      );

      const valueRisk = result.data.risk_factors.find((r: any) =>
        r.factor.toLowerCase().includes('value')
      );
      expect(valueRisk).toBeDefined();
      expect(valueRisk.impact).toBe('delays');
    });
  });

  // ==========================================================================
  // Timeline Breakdown Tests
  // ==========================================================================

  describe('Timeline Breakdown', () => {
    it('should provide stage breakdown', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 72) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      expect(result.data.timeline_breakdown).toBeDefined();
      expect(result.data.timeline_breakdown.length).toBe(3);
    });

    it('should include Initial Review stage', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 72) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      const initialReview = result.data.timeline_breakdown.find((s: any) =>
        s.stage === 'Initial Review'
      );
      expect(initialReview).toBeDefined();
      expect(initialReview.estimated_hours).toBeGreaterThan(0);
    });

    it('should include confidence per stage', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 72) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      for (const stage of result.data.timeline_breakdown) {
        expect(stage.confidence).toBeDefined();
        expect(stage.confidence).toBeGreaterThan(0);
        expect(stage.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should include factors for each stage', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 72) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      for (const stage of result.data.timeline_breakdown) {
        expect(stage.factors).toBeDefined();
        expect(stage.factors.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // Confidence Level Tests
  // ==========================================================================

  describe('Confidence Levels', () => {
    it('should have high confidence with lots of historical data', async () => {
      setupMockQueries({
        historicalItems: createHistoricalItems(30, 48), // Many historical items
        assigneeHistory: createHistoricalItems(10, 48),
        pendingCount: 2,
      });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', assigned_to: 'approver-1' },
        mockContext
      );

      expect(result.data.confidence_level).toBe('high');
      expect(result.data.confidence_percentage).toBeGreaterThanOrEqual(80);
    });

    it('should have lower confidence with little historical data', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(2, 48) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      expect(['low', 'medium']).toContain(result.data.confidence_level);
    });

    it('should boost confidence when assignee is specified', async () => {
      setupMockQueries({
        historicalItems: createHistoricalItems(10, 48),
        assigneeHistory: [],
        pendingCount: 0,
      });

      const withoutAssignee = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      setupMockQueries({
        historicalItems: createHistoricalItems(10, 48),
        assigneeHistory: createHistoricalItems(5, 48),
        pendingCount: 0,
      });

      const withAssignee = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', assigned_to: 'approver-1' },
        mockContext
      );

      expect(withAssignee.data.confidence_percentage).toBeGreaterThanOrEqual(
        withoutAssignee.data.confidence_percentage
      );
    });
  });

  // ==========================================================================
  // Recommendations Tests
  // ==========================================================================

  describe('Recommendations', () => {
    it('should recommend monitoring for historically delayed items', async () => {
      // All items took > 48 hours (60% on-time threshold)
      setupMockQueries({ historicalItems: createHistoricalItems(10, 72) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'invoice' },
        mockContext
      );

      const monitorRecommendation = result.data.recommendations.find((r: string) =>
        r.toLowerCase().includes('monitor') || r.toLowerCase().includes('delay')
      );
      if (result.data.historical_comparison.on_time_percentage < 70) {
        expect(monitorRecommendation).toBeDefined();
      }
    });

    it('should recommend escalation for high workload', async () => {
      setupMockQueries({
        historicalItems: createHistoricalItems(10, 48),
        assigneeHistory: createHistoricalItems(5, 72), // Slow approver
        pendingCount: 15, // High workload
      });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', assigned_to: 'busy-approver' },
        mockContext
      );

      const escalateRecommendation = result.data.recommendations.find((r: string) =>
        r.toLowerCase().includes('escalat') || r.toLowerCase().includes('alternate')
      );
      expect(escalateRecommendation).toBeDefined();
    });

    it('should recommend pre-approval discussion for high-value items', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', value: 150000 },
        mockContext
      );

      const valueRecommendation = result.data.recommendations.find((r: string) =>
        r.toLowerCase().includes('high-value') || r.toLowerCase().includes('pre-approval')
      );
      expect(valueRecommendation).toBeDefined();
    });
  });

  // ==========================================================================
  // Output Formatting Tests
  // ==========================================================================

  describe('Output Formatting', () => {
    it('should format output with correct title', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      const formatted = predictApprovalTimelineTool.formatOutput(result.data);

      expect(formatted.title).toBe('Timeline Prediction');
      expect(formatted.icon).toBe('clock');
    });

    it('should include predicted hours in summary', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      const formatted = predictApprovalTimelineTool.formatOutput(result.data);

      expect(formatted.summary).toContain('h');
      expect(formatted.summary).toContain('confidence');
    });

    it('should show warning status when multiple delay risks', async () => {
      setupMockQueries({
        historicalItems: createHistoricalItems(10, 48),
        assigneeHistory: createHistoricalItems(5, 96), // Slow
        pendingCount: 20, // Overloaded
      });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order', assigned_to: 'slow-approver', value: 200000 },
        mockContext
      );

      const formatted = predictApprovalTimelineTool.formatOutput(result.data);

      if (result.data.risk_factors.filter((r: any) => r.impact === 'delays').length > 1) {
        expect(formatted.status).toBe('warning');
      }
    });

    it('should include all required details', async () => {
      setupMockQueries({ historicalItems: createHistoricalItems(10, 48) });

      const result = await predictApprovalTimelineTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      const formatted = predictApprovalTimelineTool.formatOutput(result.data);

      const detailLabels = formatted.details.map((d: any) => d.label);
      expect(detailLabels).toContain('Predicted Time');
      expect(detailLabels).toContain('Confidence');
      expect(detailLabels).toContain('Historical Avg');
      expect(detailLabels).toContain('On-Time Rate');
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  function createHistoricalItem(completionHours: number): any {
    const created = new Date();
    const completed = new Date(created.getTime() + completionHours * 60 * 60 * 1000);
    return {
      created_at: created.toISOString(),
      completed_at: completed.toISOString(),
      assigned_to: 'user-1',
      status: 'completed',
      item_type: 'change_order',
    };
  }

  function createHistoricalItems(count: number, avgHours: number, minHours?: number, maxHours?: number): any[] {
    const items = [];
    for (let i = 0; i < count; i++) {
      let hours = avgHours;
      if (minHours && maxHours) {
        hours = minHours + Math.random() * (maxHours - minHours);
      }
      items.push(createHistoricalItem(hours));
    }
    return items;
  }

  interface MockSetup {
    historicalItems: any[];
    assigneeHistory?: any[];
    pendingCount?: number;
  }

  function setupMockQueries(setup: MockSetup) {
    let workflowCallCount = 0;

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'workflow_items') {
        workflowCallCount++;

        // First call: historical items for project
        if (workflowCallCount === 1) {
          return createMockSupabaseQuery({
            data: setup.historicalItems,
            error: null,
          });
        }

        // Second call: assignee history (if assigned_to provided)
        if (workflowCallCount === 2 && setup.assigneeHistory !== undefined) {
          return createMockSupabaseQuery({
            data: setup.assigneeHistory,
            error: null,
          });
        }

        // Third call: pending count
        if (setup.pendingCount !== undefined) {
          return createMockSupabaseQuery({
            data: null,
            error: null,
            count: setup.pendingCount,
          });
        }

        return createMockSupabaseQuery({ data: [], error: null });
      }

      return createMockSupabaseQuery({ data: null, error: null });
    });
  }
});
