/**
 * Unit Tests for Submittal Hooks
 * Tests all query and mutation hooks for the Submittal workflow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSubmittalWorkflowType,
  useSubmittals,
  useSubmittal,
  useMySubmittals,
  useSubmittalsByStatus,
  useSubmittalComments,
  useSubmittalProcurement,
} from '../useSubmittals';
import {
  useCreateSubmittalWithNotification,
  useUpdateSubmittalWithNotification,
  useDeleteSubmittalWithNotification,
  useUpdateSubmittalStatusWithNotification,
  useUpdateSubmittalProcurementStatusWithNotification,
} from '../useSubmittalMutations';
import { supabase } from '@/lib/supabase';
import { submittalsApi } from '@/lib/api/services/submittals';
import {
  createMockWorkflowType,
  createMockSubmittal,
  createMockSubmittals,
  createMockSubmittalProcurement,
  createMockUser,
  TEST_WORKFLOW_TYPE,
  TEST_SUBMITTALS,
} from '@/__tests__/factories';

// ============================================================================
// Mocks
// ============================================================================

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock API
vi.mock('@/lib/api/services/submittals');

// Mock Auth Context
const mockUserProfile = createMockUser({ role: 'superintendent' });
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}));

// Mock toast notifications
vi.mock('react-hot-toast');

// ============================================================================
// Test Utilities
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ============================================================================
// Query Hook Tests
// ============================================================================

describe('useSubmittalWorkflowType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch submittal workflow type for company', async () => {
    const mockWorkflowType = createMockWorkflowType();
    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockResolvedValue(mockWorkflowType);

    const { result } = renderHook(() => useSubmittalWorkflowType(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockWorkflowType);
    expect(submittalsApi.getSubmittalWorkflowType).toHaveBeenCalledWith(mockUserProfile.company_id);
  });

  it('should handle error when workflow type not found', async () => {
    const error = new Error('Submittal workflow type not configured');
    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockRejectedValue(error);

    const { result } = renderHook(() => useSubmittalWorkflowType(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should not fetch when company_id is missing', async () => {
    vi.mock('@/lib/auth/AuthContext', () => ({
      useAuth: () => ({
        userProfile: null,
      }),
    }));

    const { result } = renderHook(() => useSubmittalWorkflowType(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(submittalsApi.getSubmittalWorkflowType).not.toHaveBeenCalled();
  });

  it('should cache workflow type for 1 hour', async () => {
    const mockWorkflowType = createMockWorkflowType();
    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockResolvedValue(mockWorkflowType);

    const { result } = renderHook(() => useSubmittalWorkflowType(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Second call should use cache
    const { result: result2 } = renderHook(() => useSubmittalWorkflowType(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result2.current.isSuccess).toBe(true));

    // Should only be called once due to cache
    expect(submittalsApi.getSubmittalWorkflowType).toHaveBeenCalledTimes(1);
  });
});

describe('useSubmittals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch submittals for a project', async () => {
    const mockSubmittals = createMockSubmittals(3);
    const projectId = 'project-123';
    const workflowTypeId = 'workflow-type-123';

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSubmittals, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useSubmittals(projectId, workflowTypeId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSubmittals);
    expect(supabase.from).toHaveBeenCalledWith('workflow_items');
    expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
    expect(mockEq).toHaveBeenCalledWith('workflow_type_id', workflowTypeId);
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('should not fetch when projectId or workflowTypeId is missing', async () => {
    const { result } = renderHook(() => useSubmittals(undefined, undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const error = new Error('Database error');
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useSubmittals('project-123', 'workflow-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('should order submittals by created_at descending', async () => {
    const mockSubmittals = createMockSubmittals(3);
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSubmittals, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useSubmittals('project-123', 'workflow-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('useSubmittal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single submittal by id', async () => {
    const mockSubmittal = createMockSubmittal();
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockSubmittal, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useSubmittal(mockSubmittal.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSubmittal);
    expect(supabase.from).toHaveBeenCalledWith('workflow_items');
    expect(mockEq).toHaveBeenCalledWith('id', mockSubmittal.id);
  });

  it('should not fetch when submittalId is undefined', async () => {
    const { result } = renderHook(() => useSubmittal(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should handle error when submittal not found', async () => {
    const error = new Error('Submittal not found');
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useSubmittal('non-existent-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useMySubmittals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch submittals assigned to current user', async () => {
    const mockWorkflowType = createMockWorkflowType();
    const mockSubmittals = createMockSubmittals(2, { assignees: [mockUserProfile.id] });

    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockResolvedValue(mockWorkflowType);

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockContains = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSubmittals, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      contains: mockContains,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useMySubmittals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSubmittals);
    expect(mockEq).toHaveBeenCalledWith('workflow_type_id', mockWorkflowType.id);
    expect(mockContains).toHaveBeenCalledWith('assignees', [mockUserProfile.id]);
  });

  it('should filter by projectId when provided', async () => {
    const mockWorkflowType = createMockWorkflowType();
    const mockSubmittals = createMockSubmittals(2);
    const projectId = 'project-123';

    vi.mocked(submittalsApi.getSubmittalWorkflowType).mockResolvedValue(mockWorkflowType);

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockContains = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSubmittals, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      contains: mockContains,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useMySubmittals(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
  });
});

describe('useSubmittalsByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch submittals filtered by status', async () => {
    const mockSubmittals = createMockSubmittals(3, { status: 'approved' });
    const projectId = 'project-123';
    const workflowTypeId = 'workflow-123';
    const status = 'approved';

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSubmittals, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(
      () => useSubmittalsByStatus(projectId, workflowTypeId, status),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSubmittals);
    expect(mockEq).toHaveBeenCalledWith('status', status);
  });

  it('should fetch all submittals when status is undefined', async () => {
    const mockSubmittals = createMockSubmittals(3);
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockSubmittals, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(
      () => useSubmittalsByStatus('project-123', 'workflow-123', undefined),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should not filter by status
    expect(mockEq).not.toHaveBeenCalledWith('status', expect.anything());
  });
});

describe('useSubmittalComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch comments for a submittal', async () => {
    const submittalId = 'submittal-123';
    const mockComments = [
      {
        id: 'comment-1',
        workflow_item_id: submittalId,
        comment: 'Test comment 1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'comment-2',
        workflow_item_id: submittalId,
        comment: 'Test comment 2',
        created_at: new Date().toISOString(),
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockComments, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useSubmittalComments(submittalId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockComments);
    expect(supabase.from).toHaveBeenCalledWith('workflow_item_comments');
    expect(mockEq).toHaveBeenCalledWith('workflow_item_id', submittalId);
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('should not fetch when submittalId is undefined', async () => {
    const { result } = renderHook(() => useSubmittalComments(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('useSubmittalProcurement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch procurement records for a submittal', async () => {
    const submittalId = 'submittal-123';
    const mockProcurement = [createMockSubmittalProcurement({ workflow_item_id: submittalId })];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockProcurement, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useSubmittalProcurement(submittalId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProcurement);
    expect(supabase.from).toHaveBeenCalledWith('submittal_procurement');
    expect(mockEq).toHaveBeenCalledWith('workflow_item_id', submittalId);
  });

  it('should order procurement by created_at descending', async () => {
    const mockProcurement = [createMockSubmittalProcurement()];
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockProcurement, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useSubmittalProcurement('submittal-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

// ============================================================================
// Mutation Hook Tests
// ============================================================================

describe('useCreateSubmittalWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create submittal with user id', async () => {
    const input = {
      project_id: 'project-123',
      workflow_type_id: 'workflow-123',
      title: 'New Submittal',
      description: 'Test submittal',
      status: 'draft' as const,
      priority: 'medium',
      assignees: [mockUserProfile.id],
      spec_section: '05.12.00',
      submittal_type: 'Product Data',
      required_date: new Date().toISOString(),
      submitted_date: null,
      approved_date: null,
      company_id: mockUserProfile.company_id,
      created_by: mockUserProfile.id,
      metadata: null,
      custom_fields: null,
      deleted_at: null,
    };

    const mockData = createMockSubmittal(input);

    vi.mocked(submittalsApi.createSubmittal).mockResolvedValue(mockData);

    const { result } = renderHook(() => useCreateSubmittalWithNotification(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(input);

    expect(submittalsApi.createSubmittal).toHaveBeenCalledWith({
      ...input,
      created_by: mockUserProfile.id,
    });
  });

  it('should invalidate queries after successful creation', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      project_id: 'project-123',
      workflow_type_id: 'workflow-123',
      title: 'New Submittal',
      status: 'draft' as const,
      company_id: mockUserProfile.company_id,
      created_by: mockUserProfile.id,
    };

    const mockData = createMockSubmittal(input);
    vi.mocked(submittalsApi.createSubmittal).mockResolvedValue(mockData);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateSubmittalWithNotification(), {
      wrapper,
    });

    await result.current.mutateAsync(input as any);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submittals'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submittals', input.project_id] });
    });
  });

  it('should handle creation error', async () => {
    const error = new Error('Failed to create submittal');
    vi.mocked(submittalsApi.createSubmittal).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateSubmittalWithNotification(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({} as any)
    ).rejects.toThrow('Failed to create submittal');
  });
});

describe('useUpdateSubmittalWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update submittal', async () => {
    const submittalId = 'submittal-123';
    const updates = { title: 'Updated Title', description: 'Updated description' };
    const mockData = createMockSubmittal({ id: submittalId, ...updates });

    vi.mocked(submittalsApi.updateSubmittal).mockResolvedValue(mockData);

    const { result } = renderHook(() => useUpdateSubmittalWithNotification(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ id: submittalId, updates });

    expect(submittalsApi.updateSubmittal).toHaveBeenCalledWith(submittalId, updates);
  });

  it('should invalidate queries after successful update', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const submittalId = 'submittal-123';
    const projectId = 'project-123';
    const updates = { title: 'Updated Title' };
    const mockData = createMockSubmittal({ id: submittalId, project_id: projectId, ...updates });

    vi.mocked(submittalsApi.updateSubmittal).mockResolvedValue(mockData);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateSubmittalWithNotification(), {
      wrapper,
    });

    await result.current.mutateAsync({ id: submittalId, updates });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submittals'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submittals', projectId] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submittals', submittalId] });
    });
  });
});

describe('useUpdateSubmittalStatusWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update submittal status', async () => {
    const submittalId = 'submittal-123';
    const status = 'approved';
    const mockData = createMockSubmittal({ id: submittalId, status });

    vi.mocked(submittalsApi.updateSubmittalStatus).mockResolvedValue(mockData);

    const { result } = renderHook(() => useUpdateSubmittalStatusWithNotification(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ submittalId, status });

    expect(submittalsApi.updateSubmittalStatus).toHaveBeenCalledWith(submittalId, status);
  });

  it('should handle status transition from draft to submitted', async () => {
    const submittalId = 'submittal-123';
    const status = 'submitted';
    const mockData = createMockSubmittal({
      id: submittalId,
      status,
      submitted_date: new Date().toISOString(),
    });

    vi.mocked(submittalsApi.updateSubmittalStatus).mockResolvedValue(mockData);

    const { result } = renderHook(() => useUpdateSubmittalStatusWithNotification(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ submittalId, status });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('submitted');
  });

  it('should handle status transition from under_review to approved', async () => {
    const submittalId = 'submittal-123';
    const status = 'approved';
    const mockData = createMockSubmittal({
      id: submittalId,
      status,
      approved_date: new Date().toISOString(),
    });

    vi.mocked(submittalsApi.updateSubmittalStatus).mockResolvedValue(mockData);

    const { result } = renderHook(() => useUpdateSubmittalStatusWithNotification(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ submittalId, status });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('approved');
  });
});

describe('useUpdateSubmittalProcurementStatusWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update procurement status', async () => {
    const procurementId = 'procurement-123';
    const status = 'ordered';
    const mockData = createMockSubmittalProcurement({
      id: procurementId,
      procurement_status: status,
    });

    vi.mocked(submittalsApi.updateSubmittalProcurementStatus).mockResolvedValue(mockData);

    const { result } = renderHook(
      () => useUpdateSubmittalProcurementStatusWithNotification(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({ procurementId, status });

    expect(submittalsApi.updateSubmittalProcurementStatus).toHaveBeenCalledWith(
      procurementId,
      status
    );
  });

  it('should handle procurement status transitions', async () => {
    const procurementId = 'procurement-123';
    const statuses = ['pending', 'ordered', 'in_transit', 'delivered', 'installed'];

    for (const status of statuses) {
      const mockData = createMockSubmittalProcurement({
        id: procurementId,
        procurement_status: status as any,
      });

      vi.mocked(submittalsApi.updateSubmittalProcurementStatus).mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useUpdateSubmittalProcurementStatusWithNotification(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({ procurementId, status });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.procurement_status).toBe(status);

      vi.clearAllMocks();
    }
  });
});

describe('useDeleteSubmittalWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete submittal', async () => {
    const submittalId = 'submittal-123';
    vi.mocked(submittalsApi.deleteSubmittal).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteSubmittalWithNotification(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(submittalId);

    expect(submittalsApi.deleteSubmittal).toHaveBeenCalledWith(submittalId);
  });

  it('should invalidate queries after successful deletion', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const submittalId = 'submittal-123';
    vi.mocked(submittalsApi.deleteSubmittal).mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteSubmittalWithNotification(), {
      wrapper,
    });

    await result.current.mutateAsync(submittalId);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['submittals'] });
    });
  });

  it('should handle deletion error', async () => {
    const error = new Error('Failed to delete submittal');
    vi.mocked(submittalsApi.deleteSubmittal).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteSubmittalWithNotification(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync('submittal-123')
    ).rejects.toThrow('Failed to delete submittal');
  });
});
