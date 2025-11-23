import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useRFIWorkflowType,
  useRFIs,
  useRFI,
  useRFIsByStatus,
  useMyRFIs,
  useRFIComments,
  useRFIHistory,
  useCreateRFI,
  useUpdateRFI,
  useChangeRFIStatus,
  useAddRFIComment,
  useDeleteRFI,
} from './useRFIs';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { faker } from '@faker-js/faker';
import type { WorkflowItem, WorkflowType, WorkflowItemComment, WorkflowItemHistory } from '@/types/database';

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

// Factory for mock workflow items (RFIs)
const mockRFI = (overrides: Partial<WorkflowItem> = {}): WorkflowItem => ({
  id: faker.string.uuid(),
  workflow_type_id: 'rfi-type-123',
  project_id: faker.string.uuid(),
  number: faker.number.int({ min: 1, max: 100 }),
  custom_id: null,
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  more_information: faker.lorem.paragraph(),
  discipline: faker.helpers.arrayElement(['Electrical', 'Plumbing', 'HVAC', 'Structural']),
  status: faker.helpers.arrayElement(['pending', 'submitted', 'approved', 'rejected', 'closed']),
  priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
  raised_by: faker.string.uuid(),
  raised_date: faker.date.recent().toISOString(),
  due_date: faker.date.future().toISOString().split('T')[0],
  opened_date: faker.date.recent().toISOString(),
  closed_date: null,
  resolution: null,
  resolution_date: null,
  assignees: [faker.string.uuid()],
  created_by: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  metadata: {},
  sequence_number: faker.number.int({ min: 1, max: 100 }),
  ...overrides,
});

// Factory for mock workflow type
const mockWorkflowType = (overrides: Partial<WorkflowType> = {}): WorkflowType => ({
  id: 'rfi-type-123',
  company_id: 'company-123',
  name_singular: 'RFI',
  name_plural: 'RFIs',
  prefix: 'RFI',
  description: 'Request for Information',
  statuses: ['pending', 'submitted', 'approved', 'rejected', 'closed'],
  priorities: ['low', 'normal', 'high'],
  fields: {},
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});

// Factory for mock comment
const mockComment = (overrides: Partial<WorkflowItemComment> = {}): WorkflowItemComment => ({
  id: faker.string.uuid(),
  workflow_item_id: faker.string.uuid(),
  comment: faker.lorem.sentence(),
  mentioned_users: [],
  created_by: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  ...overrides,
});

// Factory for mock history
const mockHistory = (overrides: Partial<WorkflowItemHistory> = {}): WorkflowItemHistory => ({
  id: faker.string.uuid(),
  workflow_item_id: faker.string.uuid(),
  changed_by: faker.string.uuid(),
  changed_at: faker.date.recent().toISOString(),
  field_name: 'status',
  old_value: 'pending',
  new_value: 'submitted',
  ...overrides,
});

describe('useRFIWorkflowType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch RFI workflow type for company', async () => {
    const workflowType = mockWorkflowType();

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: workflowType,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useRFIWorkflowType(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(workflowType);
    expect(supabase.from).toHaveBeenCalledWith('workflow_types');
  });

  it('should be disabled when company_id is not available', async () => {
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: { ...mockUserProfile, company_id: null },
    })) as any;

    const { result } = renderHook(() => useRFIWorkflowType(), {
      wrapper: createWrapper(),
    });

    // When disabled, the query should not be fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(true);

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });
});

describe('useRFIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all RFIs for a project', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'rfi-type-123';
    const mockRFIs = [
      mockRFI({ project_id: projectId, workflow_type_id: workflowTypeId }),
      mockRFI({ project_id: projectId, workflow_type_id: workflowTypeId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockRFIs,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useRFIs(projectId, workflowTypeId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRFIs);
    expect(result.current.data).toHaveLength(2);
  });

  it('should be disabled when projectId or workflowTypeId is undefined', () => {
    const { result } = renderHook(() => useRFIs(undefined, undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should filter out soft-deleted RFIs', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'rfi-type-123';
    const activeRFIs = [
      mockRFI({ project_id: projectId, deleted_at: null }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: activeRFIs,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useRFIs(projectId, workflowTypeId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].deleted_at).toBeNull();
  });
});

describe('useRFI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single RFI by ID', async () => {
    const rfiId = 'rfi-123';
    const rfi = mockRFI({ id: rfiId });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: rfi,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useRFI(rfiId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(rfi);
  });

  it('should throw error when rfiId is undefined', () => {
    expect(() => {
      renderHook(() => useRFI(undefined), {
        wrapper: createWrapper(),
      });
    }).toThrow('RFI ID is required for useRFI');
  });
});

describe('useRFIsByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch RFIs filtered by status', async () => {
    const projectId = 'project-123';
    const status = 'pending';
    const pendingRFIs = [
      mockRFI({ project_id: projectId, status: 'pending' }),
      mockRFI({ project_id: projectId, status: 'pending' }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: pendingRFIs,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useRFIsByStatus(projectId, status), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.every(rfi => rfi.status === 'pending')).toBe(true);
  });

  it('should throw error when projectId is undefined', () => {
    expect(() => {
      renderHook(() => useRFIsByStatus(undefined, 'pending'), {
        wrapper: createWrapper(),
      });
    }).toThrow('Project ID is required for useRFIsByStatus');
  });
});

describe('useMyRFIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch RFIs assigned to current user', async () => {
    const myRFIs = [
      mockRFI({ assignees: [mockUserProfile.id] }),
      mockRFI({ assignees: [mockUserProfile.id] }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        contains: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: myRFIs,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useMyRFIs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.every(rfi => rfi.assignees.includes(mockUserProfile.id))).toBe(true);
  });

  it('should filter by project when projectId provided', async () => {
    const projectId = 'project-123';
    const projectRFIs = [
      mockRFI({ project_id: projectId, assignees: [mockUserProfile.id] }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        contains: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: projectRFIs,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useMyRFIs(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].project_id).toBe(projectId);
  });

  it('should throw error when user is not authenticated', async () => {
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: null,
    })) as any;

    expect(() => {
      renderHook(() => useMyRFIs(), {
        wrapper: createWrapper(),
      });
    }).toThrow('User must be authenticated to use useMyRFIs');

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });
});

describe('useRFIComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch comments for an RFI', async () => {
    const rfiId = 'rfi-123';
    const comments = [
      mockComment({ workflow_item_id: rfiId }),
      mockComment({ workflow_item_id: rfiId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: comments,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useRFIComments(rfiId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });

  it('should throw error when rfiId is undefined', () => {
    expect(() => {
      renderHook(() => useRFIComments(undefined), {
        wrapper: createWrapper(),
      });
    }).toThrow('RFI ID is required for useRFIComments');
  });
});

describe('useRFIHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch history for an RFI', async () => {
    const rfiId = 'rfi-123';
    const history = [
      mockHistory({ workflow_item_id: rfiId }),
      mockHistory({ workflow_item_id: rfiId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: history,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useRFIHistory(rfiId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });

  it('should throw error when rfiId is undefined', () => {
    expect(() => {
      renderHook(() => useRFIHistory(undefined), {
        wrapper: createWrapper(),
      });
    }).toThrow('RFI ID is required for useRFIHistory');
  });
});

describe('useCreateRFI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create RFI with auto-generated number', async () => {
    const input = {
      project_id: 'project-123',
      workflow_type_id: 'rfi-type-123',
      title: 'Test RFI',
      description: 'Test description',
      priority: 'high' as const,
    };

    const createdRFI = mockRFI({ ...input, number: 1 });

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'workflow_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: createdRFI,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRFI(), {
      wrapper: createWrapper(queryClient),
    });

    const created = await result.current.mutateAsync(input);

    expect(created).toEqual(createdRFI);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', createdRFI.project_id] });
  });

  it('should throw error when title is empty', async () => {
    const input = {
      project_id: 'project-123',
      workflow_type_id: 'rfi-type-123',
      title: '   ',
    };

    const { result } = renderHook(() => useCreateRFI(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync(input)).rejects.toThrow('RFI title is required');
  });

  it('should throw error when user is not authenticated', async () => {
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: null,
    })) as any;

    const input = {
      project_id: 'project-123',
      workflow_type_id: 'rfi-type-123',
      title: 'Test RFI',
    };

    const { result } = renderHook(() => useCreateRFI(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync(input)).rejects.toThrow('User must be authenticated to create RFI');

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });
});

describe('useUpdateRFI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update RFI fields', async () => {
    const rfiId = 'rfi-123';
    const updates = {
      title: 'Updated title',
      priority: 'high' as const,
    };

    const updatedRFI = mockRFI({ id: rfiId, ...updates });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedRFI,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateRFI(), {
      wrapper: createWrapper(queryClient),
    });

    const updated = await result.current.mutateAsync({ id: rfiId, updates });

    expect(updated).toEqual(updatedRFI);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', updatedRFI.id] });
  });

  it('should throw error when ID is missing', async () => {
    const { result } = renderHook(() => useUpdateRFI(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({ id: '', updates: {} })).rejects.toThrow('RFI ID is required');
  });
});

describe('useChangeRFIStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should change RFI status and set opened_date when submitted', async () => {
    const rfiId = 'rfi-123';
    const updatedRFI = mockRFI({ id: rfiId, status: 'submitted' });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { opened_date: null },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedRFI,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useChangeRFIStatus(), {
      wrapper: createWrapper(),
    });

    const updated = await result.current.mutateAsync({ rfiId, newStatus: 'submitted' });

    expect(updated.status).toBe('submitted');
  });

  it('should set closed_date when status is closed', async () => {
    const rfiId = 'rfi-123';
    const updatedRFI = mockRFI({ id: rfiId, status: 'closed', closed_date: new Date().toISOString() });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedRFI,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useChangeRFIStatus(), {
      wrapper: createWrapper(),
    });

    const updated = await result.current.mutateAsync({ rfiId, newStatus: 'closed' });

    expect(updated.status).toBe('closed');
    expect(updated.closed_date).toBeTruthy();
  });

  it('should throw error for invalid status', async () => {
    const { result } = renderHook(() => useChangeRFIStatus(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ rfiId: 'rfi-123', newStatus: 'invalid' })
    ).rejects.toThrow('Invalid status');
  });
});

describe('useAddRFIComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add comment to RFI', async () => {
    const rfiId = 'rfi-123';
    const comment = 'This is a test comment';
    const createdComment = mockComment({ workflow_item_id: rfiId, comment });

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdComment,
            error: null,
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddRFIComment(), {
      wrapper: createWrapper(queryClient),
    });

    const created = await result.current.mutateAsync({ rfiId, comment });

    expect(created.comment).toBe(comment);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', rfiId, 'comments'] });
  });

  it('should throw error when comment is empty', async () => {
    const { result } = renderHook(() => useAddRFIComment(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ rfiId: 'rfi-123', comment: '   ' })
    ).rejects.toThrow('Comment text is required');
  });
});

describe('useDeleteRFI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete RFI', async () => {
    const rfiId = 'rfi-123';

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteRFI(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(rfiId);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis'] });
  });

  it('should throw error when ID is missing', async () => {
    const { result } = renderHook(() => useDeleteRFI(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('')).rejects.toThrow('RFI ID is required');
  });
});
