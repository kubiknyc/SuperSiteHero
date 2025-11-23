import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useChangeOrders,
} from './useChangeOrders';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { faker } from '@faker-js/faker';
import type { Database } from '@/types/database';

// Type aliases
type WorkflowItem = Database['public']['Tables']['workflow_items']['Row'];
type ChangeOrderBid = Database['public']['Tables']['change_order_bids']['Row'];

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Auth Context
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-123',
  role: 'superintendent',
};

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}));

// Factory for mock workflow items (change orders)
const mockWorkflowItem = (overrides: Partial<WorkflowItem> = {}): WorkflowItem => ({
  id: faker.string.uuid(),
  workflow_type_id: faker.string.uuid(),
  project_id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  status: faker.helpers.arrayElement(['draft', 'submitted', 'approved', 'rejected', 'completed']),
  priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
  raised_by: faker.string.uuid(),
  raised_at: faker.date.recent().toISOString(),
  due_date: faker.date.future().toISOString().split('T')[0],
  resolution: null,
  resolution_date: null,
  created_by: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  metadata: {},
  ...overrides,
});

// Factory for mock change order bids
const mockChangeOrderBid = (overrides: Partial<ChangeOrderBid> = {}): ChangeOrderBid => ({
  id: faker.string.uuid(),
  workflow_item_id: faker.string.uuid(),
  subcontractor_id: faker.string.uuid(),
  bid_status: faker.helpers.arrayElement(['pending', 'submitted', 'accepted', 'rejected']),
  lump_sum_cost: faker.number.float({ min: 1000, max: 100000, fractionDigits: 2 }),
  notes: faker.lorem.sentence(),
  submitted_at: faker.date.recent().toISOString(),
  accepted_date: null,
  rejected_date: null,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});

describe('useChangeOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all change orders for a project with relations', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'workflow-type-456';

    // Mock workflow type query response
    const mockFrom = vi.fn();
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockIlike = vi.fn();
    const mockSingle = vi.fn();
    const mockIs = vi.fn();
    const mockOrder = vi.fn();

    // Setup workflow type query chain
    mockFrom.mockImplementation((table) => {
      if (table === 'workflow_types') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              ilike: mockIlike.mockReturnValue({
                single: mockSingle.mockResolvedValue({
                  data: { id: workflowTypeId },
                  error: null
                })
              })
            })
          })
        };
      }

      if (table === 'workflow_items') {
        const mockChangeOrders = [
          {
            ...mockWorkflowItem({ project_id: projectId, workflow_type_id: workflowTypeId }),
            workflow_type: {
              name_singular: 'Change Order',
              prefix: 'CO',
            },
            raised_by_user: {
              first_name: 'John',
              last_name: 'Doe',
            },
            bids: [
              {
                ...mockChangeOrderBid(),
                subcontractor: {
                  company_name: 'ABC Contractors',
                },
              },
            ],
          },
          {
            ...mockWorkflowItem({ project_id: projectId, workflow_type_id: workflowTypeId }),
            workflow_type: {
              name_singular: 'Change Order',
              prefix: 'CO',
            },
            raised_by_user: {
              first_name: 'Jane',
              last_name: 'Smith',
            },
            bids: [],
          },
        ];

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockChangeOrders,
                  error: null
                })
              })
            })
          })
        };
      }
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useChangeOrders(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toHaveProperty('workflow_type');
    expect(result.current.data?.[0]).toHaveProperty('raised_by_user');
    expect(result.current.data?.[0]).toHaveProperty('bids');
  });

  it('should be disabled when projectId is undefined', () => {
    const { result } = renderHook(() => useChangeOrders(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should handle error when workflow type not found', async () => {
    const projectId = 'project-123';
    const mockError = new Error('Change order workflow type not found');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      })
    } as any);

    const { result } = renderHook(() => useChangeOrders(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });

  it('should be disabled when user profile is missing company_id', async () => {
    // Temporarily replace the auth mock
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: {
        id: 'user-123',
        company_id: null,
        role: 'superintendent',
      },
    })) as any;

    const projectId = 'project-123';

    const { result } = renderHook(() => useChangeOrders(projectId), {
      wrapper: createWrapper(),
    });

    // Query should be disabled when company_id is not available
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Restore original mock
    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });

  it('should filter out soft-deleted change orders', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'workflow-type-456';

    const mockFrom = vi.fn();

    mockFrom.mockImplementation((table) => {
      if (table === 'workflow_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: workflowTypeId },
                  error: null
                })
              })
            })
          })
        };
      }

      if (table === 'workflow_items') {
        const activeChangeOrders = [
          {
            ...mockWorkflowItem({
              project_id: projectId,
              workflow_type_id: workflowTypeId,
              deleted_at: null
            }),
            workflow_type: {
              name_singular: 'Change Order',
              prefix: 'CO',
            },
            raised_by_user: {
              first_name: 'John',
              last_name: 'Doe',
            },
            bids: [] as any[],
          },
        ];

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: activeChangeOrders,
                  error: null
                })
              })
            })
          })
        };
      }
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useChangeOrders(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].deleted_at).toBeNull();
  });

  it('should include bid information with subcontractor details', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'workflow-type-456';

    const mockFrom = vi.fn();

    mockFrom.mockImplementation((table) => {
      if (table === 'workflow_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: workflowTypeId },
                  error: null
                })
              })
            })
          })
        };
      }

      if (table === 'workflow_items') {
        const changeOrderWithBids = {
          ...mockWorkflowItem({ project_id: projectId, workflow_type_id: workflowTypeId }),
          workflow_type: {
            name_singular: 'Change Order',
            prefix: 'CO',
          },
          raised_by_user: {
            first_name: 'John',
            last_name: 'Doe',
          },
          bids: [
            {
              ...mockChangeOrderBid({ bid_status: 'submitted', lump_sum_cost: 15000 }),
              subcontractor: {
                company_name: 'Elite Electric',
              },
            },
            {
              ...mockChangeOrderBid({ bid_status: 'pending', lump_sum_cost: 12000 }),
              subcontractor: {
                company_name: 'Pro Plumbing',
              },
            },
          ],
        };

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [changeOrderWithBids],
                  error: null
                })
              })
            })
          })
        };
      }
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useChangeOrders(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    const changeOrder = result.current.data?.[0];
    expect(changeOrder?.bids).toHaveLength(2);
    expect(changeOrder?.bids?.[0]).toHaveProperty('subcontractor');
    expect(changeOrder?.bids?.[0].subcontractor?.company_name).toBe('Elite Electric');
    expect(changeOrder?.bids?.[0].lump_sum_cost).toBe(15000);
  });

  it('should handle empty change orders list', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'workflow-type-456';

    const mockFrom = vi.fn();

    mockFrom.mockImplementation((table) => {
      if (table === 'workflow_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: workflowTypeId },
                  error: null
                })
              })
            })
          })
        };
      }

      if (table === 'workflow_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        };
      }
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useChangeOrders(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should order change orders by raised_date descending', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'workflow-type-456';

    const mockFrom = vi.fn();
    const mockOrderSpy = vi.fn();

    mockFrom.mockImplementation((table) => {
      if (table === 'workflow_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: workflowTypeId },
                  error: null
                })
              })
            })
          })
        };
      }

      if (table === 'workflow_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: mockOrderSpy.mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        };
      }
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useChangeOrders(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockOrderSpy).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});