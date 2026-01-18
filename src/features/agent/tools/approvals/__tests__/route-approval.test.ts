/**
 * Tests for Route Approval Tool
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

describe('routeApprovalTool', () => {
  let routeApprovalTool: any;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });

    // Dynamic import to get fresh module with mocks
    const module = await import('../route-approval');
    routeApprovalTool = module.routeApprovalTool;
  });

  // ==========================================================================
  // Tool Definition Tests
  // ==========================================================================

  describe('Tool Definition', () => {
    it('should have correct name and category', () => {
      expect(routeApprovalTool.name).toBe('route_approval');
      expect(routeApprovalTool.category).toBe('action');
    });

    it('should have required parameters defined', () => {
      const { parameters } = routeApprovalTool;
      expect(parameters.required).toContain('project_id');
      expect(parameters.required).toContain('item_type');
      expect(parameters.required).toContain('item_id');
    });

    it('should have valid item_type enum', () => {
      const { parameters } = routeApprovalTool;
      const itemTypeEnum = parameters.properties.item_type.enum;

      expect(itemTypeEnum).toContain('change_order');
      expect(itemTypeEnum).toContain('invoice');
      expect(itemTypeEnum).toContain('submittal');
      expect(itemTypeEnum).toContain('rfi');
      expect(itemTypeEnum).toContain('payment_application');
      expect(itemTypeEnum).toContain('purchase_order');
    });

    it('should have valid urgency enum', () => {
      const { parameters } = routeApprovalTool;
      const urgencyEnum = parameters.properties.urgency.enum;

      expect(urgencyEnum).toContain('low');
      expect(urgencyEnum).toContain('normal');
      expect(urgencyEnum).toContain('high');
      expect(urgencyEnum).toContain('critical');
    });

    it('should not require confirmation', () => {
      expect(routeApprovalTool.requiresConfirmation).toBe(false);
    });
  });

  // ==========================================================================
  // Change Order Routing Tests
  // ==========================================================================

  describe('Change Order Routing', () => {
    it('should route small change orders to project manager only', async () => {
      setupMockQueries({
        itemData: { title: 'Minor scope adjustment', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.requires_multiple_approvals).toBe(false);
      expect(result.data.approval_path.length).toBe(1);
      expect(result.data.approval_path[0].approver_role).toContain('Project Manager');
    });

    it('should route medium change orders to PM and executive', async () => {
      // Change orders >= $25,000 require PM + Project Executive
      setupMockQueries({
        itemData: { title: 'Equipment change', amount: 30000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
          createTeamMember('pe-1', 'Jane Exec', 'Project Executive'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.requires_multiple_approvals).toBe(true);
      expect(result.data.approval_path.length).toBe(2);
    });

    it('should route large change orders to PM, executive, and owner', async () => {
      setupMockQueries({
        itemData: { title: 'Major scope change', amount: 150000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
          createTeamMember('pe-1', 'Jane Exec', 'Project Executive'),
          createTeamMember('owner-1', 'Bob Owner', 'Owner'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.requires_multiple_approvals).toBe(true);
      expect(result.data.approval_path.length).toBe(3);
      expect(result.data.routing_rules_applied.some((r: string) => r.includes('$150,000'))).toBe(true);
    });
  });

  // ==========================================================================
  // Invoice Routing Tests
  // ==========================================================================

  describe('Invoice Routing', () => {
    it('should route small invoices to project manager', async () => {
      setupMockQueries({
        itemData: { invoice_number: 'INV-001', amount: 5000, vendor_name: 'ACME Corp' },
        itemType: 'invoices',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'invoice', item_id: 'inv-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.item_description).toContain('INV-001');
      expect(result.data.item_description).toContain('ACME Corp');
    });

    it('should route large invoices to PM and accounting manager', async () => {
      setupMockQueries({
        itemData: { invoice_number: 'INV-002', amount: 75000, vendor_name: 'Big Supplier' },
        itemType: 'invoices',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
          createTeamMember('acct-1', 'Jane Acct', 'Accounting Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'invoice', item_id: 'inv-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.requires_multiple_approvals).toBe(true);
    });
  });

  // ==========================================================================
  // Submittal and RFI Routing Tests
  // ==========================================================================

  describe('Submittal and RFI Routing', () => {
    it('should route submittals to project engineer', async () => {
      setupMockQueries({
        itemData: { number: 'SUB-001', title: 'Concrete Mix Design', spec_section: '03 30 00' },
        itemType: 'submittals',
        teamMembers: [
          createTeamMember('eng-1', 'Jane Engineer', 'Project Engineer'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'submittal', item_id: 'sub-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.item_description).toContain('SUB-001');
      expect(result.data.item_description).toContain('Concrete Mix Design');
    });

    it('should route RFIs to project engineer', async () => {
      setupMockQueries({
        itemData: { number: 'RFI-001', subject: 'Clarification on wall thickness' },
        itemType: 'rfis',
        teamMembers: [
          createTeamMember('eng-1', 'Jane Engineer', 'Project Engineer'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'rfi', item_id: 'rfi-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.item_description).toContain('RFI #RFI-001');
    });
  });

  // ==========================================================================
  // Approver Recommendation Tests
  // ==========================================================================

  describe('Approver Recommendations', () => {
    it('should recommend approvers based on role match', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
          createTeamMember('pm-2', 'Jane PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.recommended_approver).toBeDefined();
      expect(result.data.recommended_approver.role).toContain('Project Manager');
      expect(result.data.alternate_approvers.length).toBeGreaterThan(0);
    });

    it('should include confidence score in recommendations', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.recommended_approver.confidence).toBeGreaterThan(0);
      expect(result.data.recommended_approver.confidence).toBeLessThanOrEqual(1);
    });

    it('should boost confidence for available approvers', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager', true, new Date().toISOString()),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.recommended_approver.is_available).toBe(true);
      expect(result.data.recommended_approver.confidence).toBeGreaterThan(0.5);
    });

    it('should mark approvers with low workload as preferred', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
        pendingApprovals: [
          { assigned_to: 'pm-1', count: 2 }, // Low workload
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.recommended_approver.current_workload).toBeLessThan(50);
    });
  });

  // ==========================================================================
  // Response Time Calculation Tests
  // ==========================================================================

  describe('Response Time Calculation', () => {
    it('should calculate average response time from history', async () => {
      const now = new Date();
      const created = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const completed = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago (10 hour response)

      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
        responseHistory: [
          { assigned_to: 'pm-1', created_at: created.toISOString(), completed_at: completed.toISOString() },
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.recommended_approver.avg_response_time_hours).toBeDefined();
    });

    it('should calculate estimated completion date', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.estimated_completion_date).toBeDefined();
      const completionDate = new Date(result.data.estimated_completion_date);
      expect(completionDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ==========================================================================
  // Urgency Handling Tests
  // ==========================================================================

  describe('Urgency Handling', () => {
    it('should apply priority routing for critical items', async () => {
      setupMockQueries({
        itemData: { title: 'Critical change', amount: 5000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1', urgency: 'critical' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.routing_rules_applied.some((r: string) => r.includes('critical'))).toBe(true);
    });

    it('should apply priority routing for high urgency items', async () => {
      setupMockQueries({
        itemData: { title: 'Urgent change', amount: 5000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1', urgency: 'high' },
        mockContext
      );

      expect(result.data.routing_rules_applied.some((r: string) => r.includes('high'))).toBe(true);
    });
  });

  // ==========================================================================
  // Approval Path Tests
  // ==========================================================================

  describe('Approval Path', () => {
    it('should include threshold descriptions in approval path', async () => {
      setupMockQueries({
        itemData: { title: 'Large CO', amount: 150000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
          createTeamMember('pe-1', 'Jane Exec', 'Project Executive'),
          createTeamMember('owner-1', 'Bob Owner', 'Owner'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      const pathWithThreshold = result.data.approval_path.filter(
        (p: any) => p.threshold_applies && p.threshold_description
      );
      expect(pathWithThreshold.length).toBeGreaterThan(0);
    });

    it('should number approval path steps correctly', async () => {
      setupMockQueries({
        itemData: { title: 'Large CO', amount: 30000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
          createTeamMember('pe-1', 'Jane Exec', 'Project Executive'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.approval_path[0].step).toBe(1);
      expect(result.data.approval_path[1].step).toBe(2);
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle missing item data', async () => {
      setupMockQueries({
        itemData: null,
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.item_description).toBe('Unknown item');
    });

    it('should handle no matching team members', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 5000 },
        itemType: 'change_orders',
        teamMembers: [], // No team members
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.recommended_approver.user_name).toBe('No approver found');
      expect(result.data.recommended_approver.confidence).toBe(0);
    });

    it('should handle users without login history', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager', true, undefined),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should handle inactive approvers', async () => {
      // User hasn't logged in for more than 7 days
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager', true, oldDate.toISOString()),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.recommended_approver.is_available).toBe(false);
    });
  });

  // ==========================================================================
  // Workload Calculation Tests
  // ==========================================================================

  describe('Workload Calculation', () => {
    it('should calculate workload based on pending approvals', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
        pendingApprovals: [
          { assigned_to: 'pm-1', count: 5 },
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.recommended_approver.current_workload).toBe(50);
    });

    it('should cap workload at 100%', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 3000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
        pendingApprovals: [
          { assigned_to: 'pm-1', count: 15 }, // Would be 150 without cap
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      expect(result.data.recommended_approver.current_workload).toBe(100);
    });
  });

  // ==========================================================================
  // Output Formatting Tests
  // ==========================================================================

  describe('Output Formatting', () => {
    it('should format output correctly', async () => {
      setupMockQueries({
        itemData: { title: 'Test CO', amount: 5000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      const formatted = routeApprovalTool.formatOutput(result.data);

      expect(formatted.title).toBe('Approval Routing Complete');
      expect(formatted.summary).toContain('John PM');
      expect(formatted.details.some((d: any) => d.label === 'Recommended')).toBe(true);
      expect(formatted.details.some((d: any) => d.label === 'Role')).toBe(true);
    });

    it('should show warning status when approver unavailable', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      setupMockQueries({
        itemData: { title: 'Test CO', amount: 5000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager', true, oldDate.toISOString()),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      const formatted = routeApprovalTool.formatOutput(result.data);

      expect(formatted.status).toBe('warning');
    });

    it('should use different icon for multi-approval vs single', async () => {
      setupMockQueries({
        itemData: { title: 'Large CO', amount: 30000 },
        itemType: 'change_orders',
        teamMembers: [
          createTeamMember('pm-1', 'John PM', 'Project Manager'),
          createTeamMember('pe-1', 'Jane Exec', 'Project Executive'),
        ],
      });

      const result = await routeApprovalTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-1' },
        mockContext
      );

      const formatted = routeApprovalTool.formatOutput(result.data);

      expect(formatted.icon).toBe('git-branch');
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  function createTeamMember(
    userId: string,
    fullName: string,
    role: string,
    isActive: boolean = true,
    lastLogin?: string
  ) {
    return {
      user_id: userId,
      role,
      users: {
        id: userId,
        full_name: fullName,
        email: `${fullName.toLowerCase().replace(' ', '.')}@example.com`,
        last_sign_in_at: lastLogin || new Date().toISOString(),
        is_active: isActive,
      },
    };
  }

  interface MockQuerySetup {
    itemData: any;
    itemType: string;
    teamMembers: any[];
    pendingApprovals?: any[];
    responseHistory?: any[];
  }

  function setupMockQueries(setup: MockQuerySetup) {
    let workflowItemsCallCount = 0;

    mockSupabaseFrom.mockImplementation((table: string) => {
      // Item data query (change_orders, invoices, etc.)
      if (table === setup.itemType) {
        return createMockSupabaseQuery({
          data: setup.itemData,
          error: null,
        });
      }

      // Project team query
      if (table === 'project_team') {
        return createMockSupabaseQuery({
          data: setup.teamMembers,
          error: null,
        });
      }

      // Workflow items - handle both pending and response history calls
      if (table === 'workflow_items') {
        workflowItemsCallCount++;
        if (workflowItemsCallCount === 1) {
          // First call is for pending approvals
          // The code counts items by iterating, so return an array with one item per pending count
          const pendingItems = setup.pendingApprovals?.flatMap((p: any) =>
            Array(p.count || 1).fill({ assigned_to: p.assigned_to })
          ) || [];
          return createMockSupabaseQuery({
            data: pendingItems,
            error: null,
          });
        } else {
          // Second call is for response history
          return createMockSupabaseQuery({
            data: setup.responseHistory || [],
            error: null,
          });
        }
      }

      return createMockSupabaseQuery({ data: null, error: null });
    });
  }
});
