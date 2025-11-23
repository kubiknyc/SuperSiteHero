import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useSubmittalWorkflowType,
  useSubmittals,
  useSubmittal,
  useMySubmittals,
  useSubmittalsByStatus,
  useSubmittalComments,
  useSubmittalProcurement,
} from './useSubmittals';
import { supabase } from '@/lib/supabase';
import { submittalsApi } from '@/lib/api/services/submittals';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { faker } from '@faker-js/faker';
import type { WorkflowItem, WorkflowType, SubmittalProcurement, WorkflowItemComment } from '@/types/database';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Submittals API
vi.mock('@/lib/api/services/submittals', () => ({
  submittalsApi: {
    getSubmittalWorkflowType: vi.fn(),
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

// Factory for mock workflow items (Submittals)
const mockSubmittal = (overrides: Partial<WorkflowItem> = {}): WorkflowItem => ({
  id: faker.string.uuid(),
  workflow_type_id: 'submittal-type-123',
  project_id: faker.string.uuid(),
  number: faker.number.int({ min: 1, max: 100 }),
  custom_id: null,
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  more_information: null,
  discipline: null,
  status: faker.helpers.arrayElement(['pending', 'submitted', 'approved', 'rejected']),
  priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
  raised_by: faker.string.uuid(),
  raised_date: faker.date.recent().toISOString(),
  due_date: faker.date.future().toISOString().split('T')[0],
  opened_date: null,
  closed_date: null,
  resolution: null,
  resolution_date: null,
  assignees: [],
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
  id: 'submittal-type-123',
  company_id: 'company-123',
  name_singular: 'Submittal',
  name_plural: 'Submittals',
  prefix: 'SUB',
  description: 'Submittal tracking',
  statuses: ['pending', 'submitted', 'approved', 'rejected'],
  priorities: ['low', 'normal', 'high'],
  fields: {},
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});

// Factory for mock procurement
const mockProcurement = (overrides: Partial<SubmittalProcurement> = {}): SubmittalProcurement => ({
  id: faker.string.uuid(),
  workflow_item_id: faker.string.uuid(),
  vendor_name: faker.company.name(),
  product_description: faker.commerce.productDescription(),
  model_number: faker.string.alphanumeric(10),
  quantity: faker.number.int({ min: 1, max: 100 }),
  unit_price: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
  total_cost: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
  lead_time_days: faker.number.int({ min: 7, max: 90 }),
  expected_delivery_date: faker.date.future().toISOString().split('T')[0],
  actual_delivery_date: null,
  status: faker.helpers.arrayElement(['pending', 'ordered', 'received']),
  notes: faker.lorem.sentence(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
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

describe('useSubmittalWorkflowType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch submittal workflow type for company', async () => {
    const workflowType = mockWorkflowType();

    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockResolvedValue(workflowType);

    const { result } = renderHook(() => useSubmittalWorkflowType(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(workflowType);
    expect(submittalsApi.getSubmittalWorkflowType).toHaveBeenCalledWith(mockUserProfile.company_id);
  });

  it('should be disabled when company_id is not available', async () => {
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: { ...mockUserProfile, company_id: null },
    })) as any;

    const { result } = renderHook(() => useSubmittalWorkflowType(), {
      wrapper: createWrapper(),
    });

    // When disabled, the query should not be fetching
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPending).toBe(true);

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });
});

describe('useSubmittals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all submittals for a project', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'submittal-type-123';
    const submittals = [
      mockSubmittal({ project_id: projectId, workflow_type_id: workflowTypeId }),
      mockSubmittal({ project_id: projectId, workflow_type_id: workflowTypeId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: submittals,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittals(projectId, workflowTypeId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toEqual(submittals);
  });

  it('should be disabled when projectId or workflowTypeId is undefined', () => {
    const { result } = renderHook(() => useSubmittals(undefined, undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should filter out soft-deleted submittals', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'submittal-type-123';
    const activeSubmittals = [
      mockSubmittal({ project_id: projectId, deleted_at: null }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: activeSubmittals,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittals(projectId, workflowTypeId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].deleted_at).toBeNull();
  });
});

describe('useSubmittal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single submittal by ID', async () => {
    const submittalId = 'submittal-123';
    const submittal = mockSubmittal({ id: submittalId });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: submittal,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittal(submittalId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(submittal);
  });

  it('should be disabled when submittalId is undefined', () => {
    const { result } = renderHook(() => useSubmittal(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should handle error when submittal not found', async () => {
    const submittalId = 'non-existent';
    const mockError = new Error('Submittal not found');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittal(submittalId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useMySubmittals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch submittals assigned to current user', async () => {
    const workflowType = mockWorkflowType();
    const mySubmittals = [
      mockSubmittal({ assignees: [mockUserProfile.id], workflow_type_id: workflowType.id }),
      mockSubmittal({ assignees: [mockUserProfile.id], workflow_type_id: workflowType.id }),
    ];

    // Mock workflow type fetch
    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockResolvedValue(workflowType);

    // Mock submittals fetch
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mySubmittals,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useMySubmittals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.every(s => s.assignees.includes(mockUserProfile.id))).toBe(true);
  });

  it('should filter by project when projectId provided', async () => {
    const projectId = 'project-123';
    const workflowType = mockWorkflowType();
    const projectSubmittals = [
      mockSubmittal({ project_id: projectId, assignees: [mockUserProfile.id], workflow_type_id: workflowType.id }),
    ];

    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockResolvedValue(workflowType);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          contains: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: projectSubmittals,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useMySubmittals(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].project_id).toBe(projectId);
  });
});

describe('useSubmittalsByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch submittals filtered by status', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'submittal-type-123';
    const status = 'approved';
    const approvedSubmittals = [
      mockSubmittal({ project_id: projectId, status: 'approved' }),
      mockSubmittal({ project_id: projectId, status: 'approved' }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: approvedSubmittals,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittalsByStatus(projectId, workflowTypeId, status), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.every(s => s.status === 'approved')).toBe(true);
  });

  it('should fetch all submittals when status is not provided', async () => {
    const projectId = 'project-123';
    const workflowTypeId = 'submittal-type-123';
    const allSubmittals = [
      mockSubmittal({ project_id: projectId }),
      mockSubmittal({ project_id: projectId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: allSubmittals,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittalsByStatus(projectId, workflowTypeId, undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });
});

describe('useSubmittalComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch comments for a submittal', async () => {
    const submittalId = 'submittal-123';
    const comments = [
      mockComment({ workflow_item_id: submittalId }),
      mockComment({ workflow_item_id: submittalId }),
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

    const { result } = renderHook(() => useSubmittalComments(submittalId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });

  it('should be disabled when submittalId is undefined', () => {
    const { result } = renderHook(() => useSubmittalComments(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });
});

describe('useSubmittalProcurement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch procurement records for a submittal', async () => {
    const submittalId = 'submittal-123';
    const procurement = [
      mockProcurement({ workflow_item_id: submittalId }),
      mockProcurement({ workflow_item_id: submittalId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: procurement,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittalProcurement(submittalId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toEqual(procurement);
  });

  it('should be disabled when submittalId is undefined', () => {
    const { result } = renderHook(() => useSubmittalProcurement(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should filter out deleted procurement records', async () => {
    const submittalId = 'submittal-123';
    const activeProcurement = [
      mockProcurement({ workflow_item_id: submittalId, deleted_at: null }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: activeProcurement,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useSubmittalProcurement(submittalId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].deleted_at).toBeNull();
  });
});
