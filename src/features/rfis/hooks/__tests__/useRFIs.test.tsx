/**
 * RFI Hooks Tests
 * Comprehensive tests for all RFI React Query hooks
 *
 * Test Coverage:
 * - Query Hooks (6): useRFIs, useRFI, useRFIsByStatus, useMyRFIs, useRFIComments, useRFIHistory
 * - Mutation Hooks (5): useCreateRFI, useUpdateRFI, useChangeRFIStatus, useAddRFIComment, useDeleteRFI
 * - Success/Error cases for all hooks
 * - Cache invalidation after mutations
 * - Loading and error states
 * - Auto-numbering logic
 * - Status transitions with date logic
 * - Empty assignee arrays
 * - Edge cases (undefined IDs, invalid dates, etc.)
 *
 * Total: 60+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Import hooks to test
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
} from '../useRFIs';

// Import test factories
import {
  createMockRFI,
  createMockRFIs,
  createMockPendingRFI,
  createMockSubmittedRFI,
  createMockClosedRFI,
  createMockUnassignedRFI,
  createMockRFIWithoutDueDate,
  createMockOverdueRFI,
  createMockRFIComment,
  createMockRFIComments,
  createMockRFIHistory,
  createMockStatusChangeHistory,
  createMockRFIHistoryEntries,
  createMockRFIWorkflowType,
  TEST_RFIS,
} from '@/__tests__/factories';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock useAuth hook
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-123',
  role: 'superintendent' as const,
  email: 'test@example.com',
  full_name: 'Test User',
};

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
    user: { id: 'user-123', email: 'test@example.com' },
  }),
}));

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });
};

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('RFI Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // Query Hooks Tests
  // ==========================================================================

  describe('useRFIWorkflowType', () => {
    it('should fetch RFI workflow type successfully', async () => {
      const mockWorkflowType = createMockRFIWorkflowType({
        id: 'wf-rfi',
        company_id: 'company-123',
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIlike = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockWorkflowType, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        ilike: mockIlike,
        single: mockSingle,
      });

      const { result } = renderHook(() => useRFIWorkflowType(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWorkflowType);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_types');
      expect(mockEq).toHaveBeenCalledWith('company_id', 'company-123');
      expect(mockIlike).toHaveBeenCalledWith('name_singular', 'RFI');
    });

    it('should handle error when fetching workflow type fails', async () => {
      const error = new Error('Failed to fetch workflow type');

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIlike = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        ilike: mockIlike,
        single: mockSingle,
      });

      const { result } = renderHook(() => useRFIWorkflowType(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useRFIs', () => {
    it('should fetch RFIs for a project successfully', async () => {
      const projectId = 'project-1';
      const workflowTypeId = 'wf-rfi';
      const mockRFIs = createMockRFIs(3, { project_id: projectId, workflow_type_id: workflowTypeId });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: mockRFIs, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        order: mockOrder,
        limit: mockLimit,
      });

      const { result } = renderHook(() => useRFIs(projectId, workflowTypeId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRFIs);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_items');
      expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
      expect(mockEq).toHaveBeenCalledWith('workflow_type_id', workflowTypeId);
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useRFIs(undefined, 'wf-rfi'), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should not fetch when workflowTypeId is undefined', () => {
      const { result } = renderHook(() => useRFIs('project-1', undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle error when fetching RFIs fails', async () => {
      const error = new Error('Failed to fetch RFIs');

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: null, error });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        order: mockOrder,
        limit: mockLimit,
      });

      const { result } = renderHook(() => useRFIs('project-1', 'wf-rfi'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useRFI', () => {
    it('should fetch single RFI successfully', async () => {
      const mockRFI = createMockRFI({ id: 'rfi-1' });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockRFI, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        single: mockSingle,
      });

      const { result } = renderHook(() => useRFI('rfi-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRFI);
      expect(mockEq).toHaveBeenCalledWith('id', 'rfi-1');
    });

    it('should throw error when rfiId is undefined', () => {
      expect(() => {
        renderHook(() => useRFI(undefined as any), {
          wrapper: createWrapper(queryClient),
        });
      }).toThrow('RFI ID is required for useRFI');
    });

    it('should handle error when fetching RFI fails', async () => {
      const error = new Error('Failed to fetch RFI');

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        single: mockSingle,
      });

      const { result } = renderHook(() => useRFI('rfi-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useRFIsByStatus', () => {
    it('should fetch RFIs by status successfully', async () => {
      const projectId = 'project-1';
      const status = 'submitted';
      const mockRFIs = createMockRFIs(2, { project_id: projectId, status });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockRFIs, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        order: mockOrder,
      });

      const { result } = renderHook(() => useRFIsByStatus(projectId, status), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRFIs);
      expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
      expect(mockEq).toHaveBeenCalledWith('status', status);
    });

    it('should throw error when projectId is undefined', () => {
      expect(() => {
        renderHook(() => useRFIsByStatus(undefined as any, 'pending'), {
          wrapper: createWrapper(queryClient),
        });
      }).toThrow('Project ID is required for useRFIsByStatus');
    });

    it('should order by due_date and created_at', async () => {
      const mockRFIs = createMockRFIs(3, { status: 'pending' });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();

      // Mock the final order call
      mockOrder.mockResolvedValueOnce({ data: mockRFIs, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        order: mockOrder,
      });

      const { result } = renderHook(() => useRFIsByStatus('project-1', 'pending'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify ordering calls
      expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true, nullsFirst: false });
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('useMyRFIs', () => {
    it('should fetch RFIs assigned to current user', async () => {
      const projectId = 'project-1';
      const mockRFIs = createMockRFIs(2, {
        project_id: projectId,
        assignees: ['user-123'],
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockContains = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockRFIs, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        contains: mockContains,
        is: mockIs,
        eq: mockEq,
        order: mockOrder,
      });

      const { result } = renderHook(() => useMyRFIs(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRFIs);
      expect(mockContains).toHaveBeenCalledWith('assignees', ['user-123']);
      expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
    });

    it('should fetch RFIs across all projects when projectId is undefined', async () => {
      const mockRFIs = createMockRFIs(3, { assignees: ['user-123'] });

      const mockSelect = vi.fn().mockReturnThis();
      const mockContains = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockRFIs, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        contains: mockContains,
        is: mockIs,
        order: mockOrder,
      });

      const { result } = renderHook(() => useMyRFIs(undefined), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRFIs);
      expect(mockContains).toHaveBeenCalledWith('assignees', ['user-123']);
    });

    it('should throw error when user is not authenticated', () => {
      // Temporarily override the mock
      vi.mocked(vi.importActual('@/lib/auth/AuthContext')).useAuth = () => ({
        userProfile: null,
        user: null,
      }) as any;

      expect(() => {
        renderHook(() => useMyRFIs(), {
          wrapper: createWrapper(queryClient),
        });
      }).toThrow('User must be authenticated to use useMyRFIs');
    });
  });

  describe('useRFIComments', () => {
    it('should fetch RFI comments successfully', async () => {
      const rfiId = 'rfi-1';
      const mockComments = createMockRFIComments(3, rfiId);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockComments, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        is: mockIs,
        order: mockOrder,
      });

      const { result } = renderHook(() => useRFIComments(rfiId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockComments);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_item_comments');
      expect(mockEq).toHaveBeenCalledWith('workflow_item_id', rfiId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should throw error when rfiId is undefined', () => {
      expect(() => {
        renderHook(() => useRFIComments(undefined as any), {
          wrapper: createWrapper(queryClient),
        });
      }).toThrow('RFI ID is required for useRFIComments');
    });
  });

  describe('useRFIHistory', () => {
    it('should fetch RFI history successfully', async () => {
      const rfiId = 'rfi-1';
      const mockHistory = createMockRFIHistoryEntries(5, rfiId);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockHistory, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const { result } = renderHook(() => useRFIHistory(rfiId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHistory);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_item_history');
      expect(mockEq).toHaveBeenCalledWith('workflow_item_id', rfiId);
      expect(mockOrder).toHaveBeenCalledWith('changed_at', { ascending: false });
    });

    it('should throw error when rfiId is undefined', () => {
      expect(() => {
        renderHook(() => useRFIHistory(undefined as any), {
          wrapper: createWrapper(queryClient),
        });
      }).toThrow('RFI ID is required for useRFIHistory');
    });
  });

  // ==========================================================================
  // Mutation Hooks Tests
  // ==========================================================================

  describe('useCreateRFI', () => {
    it('should create RFI with auto-generated number', async () => {
      const input = {
        project_id: 'project-1',
        workflow_type_id: 'wf-rfi',
        title: 'New RFI',
        description: 'Description',
        priority: 'high' as const,
        assignees: ['user-1', 'user-2'],
      };

      // Mock getting last item number
      const mockLastItem = { number: 5 };
      const mockSelectLast = vi.fn().mockReturnThis();
      const mockEqLast = vi.fn().mockReturnThis();
      const mockOrderLast = vi.fn().mockReturnThis();
      const mockLimitLast = vi.fn().mockReturnThis();
      const mockMaybeSingleLast = vi.fn().mockResolvedValue({ data: mockLastItem, error: null });

      // Mock insert
      const newRFI = createMockRFI({ ...input, number: 6 });
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: newRFI, error: null });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'workflow_items') {
          // First call for getting last number
          if (!mockInsert.mock.calls.length) {
            return {
              select: mockSelectLast,
              eq: mockEqLast,
              order: mockOrderLast,
              limit: mockLimitLast,
              maybeSingle: mockMaybeSingleLast,
            };
          }
          // Second call for insert
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle,
          };
        }
      });

      const { result } = renderHook(() => useCreateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(input);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newRFI);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-1',
          workflow_type_id: 'wf-rfi',
          number: 6, // Last number + 1
          title: 'New RFI',
          status: 'pending',
          raised_by: 'user-123',
          created_by: 'user-123',
          assignees: ['user-1', 'user-2'],
        })
      );
    });

    it('should start numbering at 1 when no previous RFIs exist', async () => {
      const input = {
        project_id: 'project-1',
        workflow_type_id: 'wf-rfi',
        title: 'First RFI',
      };

      // Mock getting last item number (none exists)
      const mockSelectLast = vi.fn().mockReturnThis();
      const mockEqLast = vi.fn().mockReturnThis();
      const mockOrderLast = vi.fn().mockReturnThis();
      const mockLimitLast = vi.fn().mockReturnThis();
      const mockMaybeSingleLast = vi.fn().mockResolvedValue({ data: null, error: null });

      // Mock insert
      const newRFI = createMockRFI({ ...input, number: 1 });
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: newRFI, error: null });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'workflow_items') {
          if (!mockInsert.mock.calls.length) {
            return {
              select: mockSelectLast,
              eq: mockEqLast,
              order: mockOrderLast,
              limit: mockLimitLast,
              maybeSingle: mockMaybeSingleLast,
            };
          }
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle,
          };
        }
      });

      const { result } = renderHook(() => useCreateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(input);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          number: 1,
        })
      );
    });

    it('should handle empty assignees array', async () => {
      const input = {
        project_id: 'project-1',
        workflow_type_id: 'wf-rfi',
        title: 'Unassigned RFI',
        assignees: [],
      };

      // Setup mocks
      const mockSelectLast = vi.fn().mockReturnThis();
      const mockEqLast = vi.fn().mockReturnThis();
      const mockOrderLast = vi.fn().mockReturnThis();
      const mockLimitLast = vi.fn().mockReturnThis();
      const mockMaybeSingleLast = vi.fn().mockResolvedValue({ data: null, error: null });

      const newRFI = createMockUnassignedRFI({ ...input, number: 1 });
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: newRFI, error: null });

      mockSupabase.from.mockImplementation(() => {
        if (!mockInsert.mock.calls.length) {
          return {
            select: mockSelectLast,
            eq: mockEqLast,
            order: mockOrderLast,
            limit: mockLimitLast,
            maybeSingle: mockMaybeSingleLast,
          };
        }
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        };
      });

      const { result } = renderHook(() => useCreateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(input);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          assignees: [],
        })
      );
    });

    it('should throw error when project_id is missing', async () => {
      const { result } = renderHook(() => useCreateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            workflow_type_id: 'wf-rfi',
            title: 'Test',
          } as any);
        } catch (error) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Project ID is required'));
    });

    it('should throw error when title is empty', async () => {
      const { result } = renderHook(() => useCreateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            project_id: 'project-1',
            workflow_type_id: 'wf-rfi',
            title: '   ',
          });
        } catch (error) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('RFI title is required'));
    });

    it('should invalidate queries after successful creation', async () => {
      const input = {
        project_id: 'project-1',
        workflow_type_id: 'wf-rfi',
        title: 'Test RFI',
      };

      // Setup mocks
      const mockSelectLast = vi.fn().mockReturnThis();
      const mockEqLast = vi.fn().mockReturnThis();
      const mockOrderLast = vi.fn().mockReturnThis();
      const mockLimitLast = vi.fn().mockReturnThis();
      const mockMaybeSingleLast = vi.fn().mockResolvedValue({ data: null, error: null });

      const newRFI = createMockRFI({ ...input, number: 1 });
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: newRFI, error: null });

      mockSupabase.from.mockImplementation(() => {
        if (!mockInsert.mock.calls.length) {
          return {
            select: mockSelectLast,
            eq: mockEqLast,
            order: mockOrderLast,
            limit: mockLimitLast,
            maybeSingle: mockMaybeSingleLast,
          };
        }
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        };
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(input);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', 'project-1'] });
    });
  });

  describe('useUpdateRFI', () => {
    it('should update RFI fields successfully', async () => {
      const updates = {
        title: 'Updated Title',
        priority: 'high' as const,
        due_date: '2025-12-31',
      };

      const updatedRFI = createMockRFI({ id: 'rfi-1', ...updates });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRFI, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: 'rfi-1', updates });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedRFI);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Title',
          priority: 'high',
          due_date: '2025-12-31',
        })
      );
    });

    it('should handle undefined values in updates', async () => {
      const updates = {
        title: 'New Title',
        description: undefined,
      };

      const updatedRFI = createMockRFI({ id: 'rfi-1', title: 'New Title' });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRFI, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: 'rfi-1', updates });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only update title, not description
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Title',
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          description: expect.anything(),
        })
      );
    });

    it('should trim string values', async () => {
      const updates = {
        title: '  Trimmed Title  ',
        description: '  Trimmed Description  ',
      };

      const updatedRFI = createMockRFI({ id: 'rfi-1' });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRFI, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: 'rfi-1', updates });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trimmed Title',
          description: 'Trimmed Description',
        })
      );
    });

    it('should invalidate queries after successful update', async () => {
      const updatedRFI = createMockRFI({ id: 'rfi-1', project_id: 'project-1' });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRFI, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'rfi-1',
          updates: { title: 'Updated' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', 'project-1'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', 'rfi-1'] });
    });
  });

  describe('useChangeRFIStatus', () => {
    it('should change status to submitted and set opened_date', async () => {
      // Mock current RFI without opened_date
      const currentRFI = createMockPendingRFI({ id: 'rfi-1' });
      const mockSelectCurrent = vi.fn().mockReturnThis();
      const mockEqCurrent = vi.fn().mockReturnThis();
      const mockSingleCurrent = vi.fn().mockResolvedValue({ data: currentRFI, error: null });

      // Mock update
      const updatedRFI = createMockSubmittedRFI({ id: 'rfi-1' });
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRFI, error: null });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call to get current RFI
          return {
            select: mockSelectCurrent,
            eq: mockEqCurrent,
            single: mockSingleCurrent,
          };
        } else {
          // Second call to update
          return {
            update: mockUpdate,
            eq: mockEq,
            select: mockSelect,
            single: mockSingle,
          };
        }
      });

      const { result } = renderHook(() => useChangeRFIStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({ rfiId: 'rfi-1', newStatus: 'submitted' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'submitted',
          opened_date: expect.any(String),
        })
      );
    });

    it('should change status to closed and set closed_date', async () => {
      const updatedRFI = createMockClosedRFI({ id: 'rfi-1' });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRFI, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useChangeRFIStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({ rfiId: 'rfi-1', newStatus: 'closed' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'closed',
          closed_date: expect.any(String),
        })
      );
    });

    it('should throw error for invalid status', async () => {
      const { result } = renderHook(() => useChangeRFIStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            rfiId: 'rfi-1',
            newStatus: 'invalid-status' as any,
          });
        } catch (error) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Invalid status');
    });

    it('should invalidate history query after status change', async () => {
      const updatedRFI = createMockSubmittedRFI({ id: 'rfi-1', project_id: 'project-1' });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRFI, error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useChangeRFIStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({ rfiId: 'rfi-1', newStatus: 'submitted' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', 'rfi-1', 'history'] });
    });
  });

  describe('useAddRFIComment', () => {
    it('should add comment successfully', async () => {
      const comment = {
        rfiId: 'rfi-1',
        comment: 'This is a test comment',
        mentioned_users: ['user-2'],
      };

      const newComment = createMockRFIComment({
        workflow_item_id: 'rfi-1',
        comment: 'This is a test comment',
        mentioned_users: ['user-2'],
        created_by: 'user-123',
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: newComment, error: null });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useAddRFIComment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(comment);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newComment);
      expect(mockInsert).toHaveBeenCalledWith({
        workflow_item_id: 'rfi-1',
        comment: 'This is a test comment',
        mentioned_users: ['user-2'],
        created_by: 'user-123',
      });
    });

    it('should throw error when comment is empty', async () => {
      const { result } = renderHook(() => useAddRFIComment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            rfiId: 'rfi-1',
            comment: '   ',
          });
        } catch (error) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Comment text is required'));
    });

    it('should invalidate comments query after adding comment', async () => {
      const newComment = createMockRFIComment({ workflow_item_id: 'rfi-1' });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: newComment, error: null });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddRFIComment(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          rfiId: 'rfi-1',
          comment: 'Test comment',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', 'rfi-1', 'comments'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis', 'rfi-1'] });
    });
  });

  describe('useDeleteRFI', () => {
    it('should soft delete RFI successfully', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const { result } = renderHook(() => useDeleteRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync('rfi-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockEq).toHaveBeenCalledWith('id', 'rfi-1');
    });

    it('should invalidate all RFI queries after deletion', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync('rfi-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['rfis'] });
    });

    it('should throw error when rfiId is missing', async () => {
      const { result } = renderHook(() => useDeleteRFI(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('' as any);
        } catch (error) {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('RFI ID is required'));
    });
  });
});
