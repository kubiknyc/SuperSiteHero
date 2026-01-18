/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock setup
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Import after mocks
import {
  createMockSupabaseQuery,
  createMockToolContext,
  expectSuccess,
  expectError,
} from '../../__tests__/test-utils';

describe('escalate-stalled', () => {
  let escalateStalledTool: any;
  let mockContext: ReturnType<typeof createMockToolContext>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });
    // Dynamic import to ensure mocks are applied
    const module = await import('../escalate-stalled');
    escalateStalledTool = module.escalateStalledTool;
  });

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('tool definition', () => {
    it('should have correct tool metadata', () => {
      expect(escalateStalledTool.name).toBe('escalate_stalled');
      expect(escalateStalledTool.displayName).toBe('Escalate Stalled Approvals');
      expect(escalateStalledTool.category).toBe('action');
      expect(escalateStalledTool.requiresConfirmation).toBe(true);
    });

    it('should have correct parameters schema', () => {
      const params = escalateStalledTool.parameters;
      expect(params.type).toBe('object');
      expect(params.required).toContain('project_id');
      expect(params.properties.project_id.type).toBe('string');
      expect(params.properties.item_type.type).toBe('string');
      expect(params.properties.item_type.enum).toContain('change_order');
      expect(params.properties.days_overdue_threshold.type).toBe('number');
    });

    it('should have estimated token count', () => {
      expect(escalateStalledTool.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Basic Execution Tests
  // ============================================================================

  describe('basic execution', () => {
    it('should return empty results when no stalled items', async () => {
      // Mock workflow items query - no stalled items
      const workflowQuery = createMockSupabaseQuery({ data: [], error: null });
      const teamQuery = createMockSupabaseQuery({ data: [], error: null });

      let queryCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            ...workflowQuery,
            select: vi.fn().mockReturnValue({
              ...workflowQuery,
              eq: vi.fn().mockReturnValue({
                ...workflowQuery,
                lt: vi.fn().mockReturnValue({
                  ...workflowQuery,
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            ...teamQuery,
            select: vi.fn().mockReturnValue({
              ...teamQuery,
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return workflowQuery;
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.stalled_items).toEqual([]);
      expect(result.data.summary.total_stalled).toBe(0);
    });

    it('should identify stalled items based on days overdue threshold', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const stalledItems = [
        {
          id: 'item-1',
          title: 'Overdue Change Order',
          created_at: oldDate.toISOString(),
          due_date: null,
          status: 'pending',
          assignees: ['user-1'],
        },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'escalation_history') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123', days_overdue_threshold: 3 },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.stalled_items.length).toBe(1);
      expect(result.data.stalled_items[0].days_overdue).toBeGreaterThanOrEqual(10);
      expect(result.data.stalled_items[0].title).toBe('Overdue Change Order');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed' },
                }),
              }),
            }),
          }),
        }),
      }));

      await expect(
        escalateStalledTool.execute({ project_id: 'project-123' }, mockContext)
      ).rejects.toThrow('Failed to fetch stalled items');
    });
  });

  // ============================================================================
  // Priority Calculation Tests
  // ============================================================================

  describe('priority calculation', () => {
    const createStalledItem = (daysAgo: number, value?: number) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return {
        id: `item-${daysAgo}`,
        title: `Item ${daysAgo} days overdue`,
        created_at: date.toISOString(),
        due_date: null,
        status: 'pending',
        assignees: ['user-1'],
        value,
      };
    };

    beforeEach(() => {
      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn(),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });
    });

    it('should mark items as critical when >= 14 days overdue', async () => {
      const stalledItems = [createStalledItem(15)];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'user-1',
                    role: 'project_engineer',
                    users: { id: 'user-1', full_name: 'John', email: 'john@test.com' },
                  },
                  {
                    user_id: 'user-2',
                    role: 'project_manager',
                    users: { id: 'user-2', full_name: 'Jane', email: 'jane@test.com' },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.stalled_items[0].priority).toBe('critical');
      expect(result.data.summary.critical_items).toBe(1);
    });

    it('should mark items as critical when value > $100,000', async () => {
      const stalledItems = [createStalledItem(5, 150000)];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'user-1',
                    role: 'project_engineer',
                    users: { id: 'user-1', full_name: 'John', email: 'john@test.com' },
                  },
                  {
                    user_id: 'user-2',
                    role: 'project_manager',
                    users: { id: 'user-2', full_name: 'Jane', email: 'jane@test.com' },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.stalled_items[0].priority).toBe('critical');
    });

    it('should mark items as high priority when 7-13 days overdue', async () => {
      const stalledItems = [createStalledItem(10)];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'user-1',
                    role: 'project_engineer',
                    users: { id: 'user-1', full_name: 'John', email: 'john@test.com' },
                  },
                  {
                    user_id: 'user-2',
                    role: 'project_manager',
                    users: { id: 'user-2', full_name: 'Jane', email: 'jane@test.com' },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.stalled_items[0].priority).toBe('high');
    });

    it('should mark items as normal priority when 3-6 days overdue', async () => {
      const stalledItems = [createStalledItem(4)];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'user-1',
                    role: 'project_engineer',
                    users: { id: 'user-1', full_name: 'John', email: 'john@test.com' },
                  },
                  {
                    user_id: 'user-2',
                    role: 'project_manager',
                    users: { id: 'user-2', full_name: 'Jane', email: 'jane@test.com' },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.stalled_items[0].priority).toBe('normal');
    });
  });

  // ============================================================================
  // Escalation Path Tests
  // ============================================================================

  describe('escalation paths', () => {
    it('should escalate from project_engineer to project_manager', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const stalledItems = [
        {
          id: 'item-1',
          title: 'Stalled Item',
          created_at: oldDate.toISOString(),
          status: 'pending',
          assignees: ['user-1'],
        },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'Engineer Joe', email: 'joe@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Manager Jane', email: 'jane@test.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.escalation_actions.length).toBe(1);
      expect(result.data.escalation_actions[0].from_role).toBe('project_engineer');
      expect(result.data.escalation_actions[0].to_role).toBe('project_manager');
      expect(result.data.escalation_actions[0].to_user).toBe('Manager Jane');
    });

    it('should escalate from project_manager to project_executive', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const stalledItems = [
        {
          id: 'item-1',
          title: 'Stalled Item',
          created_at: oldDate.toISOString(),
          status: 'pending',
          assignees: ['user-1'],
        },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_manager',
          users: { id: 'user-1', full_name: 'Manager Bob', email: 'bob@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_executive',
          users: { id: 'user-2', full_name: 'Exec Alice', email: 'alice@test.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.escalation_actions[0].to_role).toBe('project_executive');
    });

    it('should fall back to default escalation target when role not in hierarchy', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const stalledItems = [
        {
          id: 'item-1',
          title: 'Stalled Item',
          created_at: oldDate.toISOString(),
          status: 'pending',
          assignees: ['user-1'],
        },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'custom_role',
          users: { id: 'user-1', full_name: 'Custom User', email: 'custom@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Manager Jane', email: 'jane@test.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      // Falls back to project_manager as default escalation target
      expect(result.data.escalation_actions[0].to_role).toBe('project_manager');
    });
  });

  // ============================================================================
  // Notification Tests
  // ============================================================================

  describe('notifications', () => {
    it('should send urgent_alert for critical items', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15); // Critical: >= 14 days

      const stalledItems = [
        {
          id: 'item-1',
          title: 'Critical Item',
          created_at: oldDate.toISOString(),
          status: 'pending',
          assignees: ['user-1'],
        },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'Engineer', email: 'eng@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Manager', email: 'mgr@test.com' },
        },
      ];

      let insertedNotification: any = null;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn((data) => {
              insertedNotification = data;
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        if (table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.notifications_sent.length).toBe(1);
      expect(result.data.notifications_sent[0].notification_type).toBe('urgent_alert');
    });

    it('should send escalation notification for high priority items', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // High priority: 7-13 days

      const stalledItems = [
        {
          id: 'item-1',
          title: 'High Priority Item',
          created_at: oldDate.toISOString(),
          status: 'pending',
          assignees: ['user-1'],
        },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'Engineer', email: 'eng@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Manager', email: 'mgr@test.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.notifications_sent[0].notification_type).toBe('escalation');
    });

    it('should consolidate notifications to same recipient', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const stalledItems = [
        {
          id: 'item-1',
          title: 'Item 1',
          created_at: oldDate.toISOString(),
          status: 'pending',
          assignees: ['user-1'],
        },
        {
          id: 'item-2',
          title: 'Item 2',
          created_at: oldDate.toISOString(),
          status: 'pending',
          assignees: ['user-1'],
        },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'Engineer', email: 'eng@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Manager', email: 'mgr@test.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      // Should only send 1 notification to the manager, not 2
      expect(result.data.notifications_sent.length).toBe(1);
      expect(result.data.notifications_sent[0].items_count).toBe(2);
    });
  });

  // ============================================================================
  // Summary Calculation Tests
  // ============================================================================

  describe('summary calculations', () => {
    it('should calculate correct average days overdue', async () => {
      const date1 = new Date();
      date1.setDate(date1.getDate() - 5);
      const date2 = new Date();
      date2.setDate(date2.getDate() - 15);

      const stalledItems = [
        { id: 'item-1', title: 'Item 1', created_at: date1.toISOString(), status: 'pending', assignees: ['user-1'] },
        { id: 'item-2', title: 'Item 2', created_at: date2.toISOString(), status: 'pending', assignees: ['user-1'] },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'Engineer', email: 'eng@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Manager', email: 'mgr@test.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.summary.total_stalled).toBe(2);
      // Average of 5 and 15 = 10
      expect(result.data.summary.avg_days_overdue).toBe(10);
    });

    it('should count escalated items correctly', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const stalledItems = [
        { id: 'item-1', title: 'Item 1', created_at: oldDate.toISOString(), status: 'pending', assignees: ['user-1'] },
        { id: 'item-2', title: 'Item 2', created_at: oldDate.toISOString(), status: 'pending', assignees: ['user-1'] },
      ];

      const teamMembers = [
        {
          user_id: 'user-1',
          role: 'project_engineer',
          users: { id: 'user-1', full_name: 'Engineer', email: 'eng@test.com' },
        },
        {
          user_id: 'user-2',
          role: 'project_manager',
          users: { id: 'user-2', full_name: 'Manager', email: 'mgr@test.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: stalledItems, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: teamMembers, error: null }),
            }),
          };
        }
        if (table === 'notifications' || table === 'escalation_history') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.summary.escalated_count).toBe(2);
    });
  });

  // ============================================================================
  // Output Formatting Tests
  // ============================================================================

  describe('formatOutput', () => {
    it('should format output with error status for critical items', () => {
      const output = {
        stalled_items: [],
        escalation_actions: [],
        notifications_sent: [],
        summary: {
          total_stalled: 5,
          escalated_count: 3,
          notified_count: 2,
          critical_items: 2,
          avg_days_overdue: 10,
        },
      };

      const formatted = escalateStalledTool.formatOutput(output);

      expect(formatted.title).toBe('Stalled Approvals Escalation');
      expect(formatted.status).toBe('error');
      expect(formatted.icon).toBe('alert-triangle');
      expect(formatted.summary).toContain('5 stalled');
      expect(formatted.summary).toContain('3 escalated');
    });

    it('should format output with warning status for non-critical stalled items', () => {
      const output = {
        stalled_items: [],
        escalation_actions: [],
        notifications_sent: [],
        summary: {
          total_stalled: 3,
          escalated_count: 1,
          notified_count: 1,
          critical_items: 0,
          avg_days_overdue: 5,
        },
      };

      const formatted = escalateStalledTool.formatOutput(output);

      expect(formatted.status).toBe('warning');
    });

    it('should format output with success status when no stalled items', () => {
      const output = {
        stalled_items: [],
        escalation_actions: [],
        notifications_sent: [],
        summary: {
          total_stalled: 0,
          escalated_count: 0,
          notified_count: 0,
          critical_items: 0,
          avg_days_overdue: 0,
        },
      };

      const formatted = escalateStalledTool.formatOutput(output);

      expect(formatted.status).toBe('success');
    });

    it('should include all summary details in output', () => {
      const output = {
        stalled_items: [],
        escalation_actions: [],
        notifications_sent: [],
        summary: {
          total_stalled: 4,
          escalated_count: 2,
          notified_count: 3,
          critical_items: 1,
          avg_days_overdue: 7,
        },
      };

      const formatted = escalateStalledTool.formatOutput(output);

      expect(formatted.details).toContainEqual({ label: 'Total Stalled', value: 4, type: 'text' });
      expect(formatted.details).toContainEqual({ label: 'Escalated', value: 2, type: 'text' });
      expect(formatted.details).toContainEqual({ label: 'Notifications', value: 3, type: 'text' });
      expect(formatted.details).toContainEqual({ label: 'Critical Items', value: 1, type: 'badge' });
      expect(formatted.details).toContainEqual({ label: 'Avg Days Overdue', value: '7d', type: 'text' });
    });
  });

  // ============================================================================
  // Item Type Filtering Tests
  // ============================================================================

  describe('item type filtering', () => {
    it('should accept change_order item type filter', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await escalateStalledTool.execute(
        { project_id: 'project-123', item_type: 'change_order' },
        mockContext
      );

      expectSuccess(result);
    });

    it('should use custom days_overdue_threshold', async () => {
      const date = new Date();
      date.setDate(date.getDate() - 2); // 2 days ago

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'item-1',
                          title: 'Item',
                          created_at: date.toISOString(),
                          status: 'pending',
                          assignees: [],
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'project_team') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      // With threshold of 1, 2-day old items should be stalled
      const result = await escalateStalledTool.execute(
        { project_id: 'project-123', days_overdue_threshold: 1 },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.stalled_items.length).toBe(1);
    });
  });
});
