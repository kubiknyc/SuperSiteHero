/**
 * Action Items Hooks Tests
 * Comprehensive tests for all action item React Query hooks
 *
 * Test Coverage:
 * - Query Hooks (9): useActionItems, useProjectActionItems, useActionItem, etc.
 * - Mutation Hooks (9): useCreateActionItem, useUpdateActionItem, useDeleteActionItem, etc.
 * - Success/Error cases for all hooks
 * - Cache invalidation after mutations
 * - Loading and error states
 *
 * Total: 80+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';

// Import hooks to test
import {
  actionItemKeys,
  useActionItems,
  useProjectActionItems,
  useActionItem,
  useActionItemSummary,
  useActionItemsByAssignee,
  useOverdueActionItems,
  useActionItemsDueSoon,
  useEscalatedActionItems,
  useActionItemStatusCounts,
  useCreateActionItem,
  useUpdateActionItem,
  useDeleteActionItem,
  useUpdateActionItemStatus,
  useResolveActionItem,
  useLinkActionItem,
  useUnlinkActionItem,
  useConvertToTask,
  useCarryoverActionItems,
} from '../useActionItems';

// Import API service to mock
import * as actionItemsApi from '@/lib/api/services/action-items';

// Import test factories and helpers
import {
  createMockActionItem,
  createMockActionItemWithContext,
  createMockOpenActionItem,
  createMockOverdueActionItem,
  createMockDueSoonActionItem,
  createMockEscalatedActionItem,
  createMockActionItemProjectSummary,
  createMockActionItemsByAssignee,
  createMockActionItems,
  TEST_ACTION_ITEMS,
} from '@/__tests__/factories/actionItem.factory';

// Mock the API service
vi.mock('@/lib/api/services/action-items');

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    session: { access_token: 'test-token' },
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
      log: console.info,
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

describe('Action Items Hooks', () => {
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

  describe('useActionItems', () => {
    it('should fetch action items successfully', async () => {
      const mockItems = createMockActionItems(3);
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItems({}), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith({});
    });

    it('should fetch action items with filters', async () => {
      const mockItems = [createMockOpenActionItem()];
      const filters = { status: 'open' as const, project_id: 'project-1' };
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItems(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith(filters);
    });

    it('should handle error when fetching action items fails', async () => {
      const error = new Error('Failed to fetch action items');
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockRejectedValue(error);

      const { result } = renderHook(() => useActionItems({}), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should use correct query key with filters', () => {
      const filters = { project_id: 'project-1', status: 'open' as const };
      const expectedKey = actionItemKeys.list(filters);

      expect(expectedKey).toEqual(['action-items', 'list', filters]);
    });

    it('should fetch with multiple status filters', async () => {
      const mockItems = createMockActionItems(5);
      const filters = { status: ['open', 'in_progress'] as const };
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItems(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith(filters);
    });

    it('should fetch with priority filters', async () => {
      const mockItems = [createMockOpenActionItem({ priority: 'high' })];
      const filters = { priority: 'high' as const };
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItems(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith(filters);
    });

    it('should fetch with search filter', async () => {
      const mockItems = createMockActionItems(2);
      const filters = { search: 'foundation' };
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItems(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith(filters);
    });

    it('should fetch with pagination', async () => {
      const mockItems = createMockActionItems(10);
      const filters = { limit: 10, offset: 0 };
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItems(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith(filters);
    });
  });

  describe('useProjectActionItems', () => {
    it('should fetch project action items successfully', async () => {
      const projectId = 'project-1';
      const mockItems = createMockActionItems(3, { project_id: projectId });
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useProjectActionItems(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith({
        project_id: projectId,
      });
    });

    it('should not fetch when projectId is undefined', () => {
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue([]);

      const { result } = renderHook(() => useProjectActionItems(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(actionItemsApi.actionItemsApi.getActionItems).not.toHaveBeenCalled();
    });

    it('should fetch with extra filters', async () => {
      const projectId = 'project-1';
      const extraFilters = { status: 'open' as const };
      const mockItems = [createMockOpenActionItem({ project_id: projectId })];
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockResolvedValue(mockItems);

      const { result } = renderHook(
        () => useProjectActionItems(projectId, extraFilters),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getActionItems).toHaveBeenCalledWith({
        project_id: projectId,
        ...extraFilters,
      });
    });

    it('should handle error when fetching project items fails', async () => {
      const error = new Error('Failed to fetch project items');
      vi.mocked(actionItemsApi.actionItemsApi.getActionItems).mockRejectedValue(error);

      const { result } = renderHook(() => useProjectActionItems('project-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useActionItem', () => {
    it('should fetch single action item successfully', async () => {
      const mockItem = createMockActionItemWithContext({ id: 'item-1' });
      vi.mocked(actionItemsApi.actionItemsApi.getActionItem).mockResolvedValue(mockItem);

      const { result } = renderHook(() => useActionItem('item-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItem);
      expect(actionItemsApi.actionItemsApi.getActionItem).toHaveBeenCalledWith('item-1');
    });

    it('should not fetch when id is undefined', () => {
      vi.mocked(actionItemsApi.actionItemsApi.getActionItem).mockResolvedValue(null);

      const { result } = renderHook(() => useActionItem(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(actionItemsApi.actionItemsApi.getActionItem).not.toHaveBeenCalled();
    });

    it('should handle not found action item', async () => {
      vi.mocked(actionItemsApi.actionItemsApi.getActionItem).mockResolvedValue(null);

      const { result } = renderHook(() => useActionItem('non-existent'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle error when fetching action item fails', async () => {
      const error = new Error('Failed to fetch action item');
      vi.mocked(actionItemsApi.actionItemsApi.getActionItem).mockRejectedValue(error);

      const { result } = renderHook(() => useActionItem('item-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useActionItemSummary', () => {
    it('should fetch project summary successfully', async () => {
      const projectId = 'project-1';
      const mockSummary = createMockActionItemProjectSummary({ project_id: projectId });
      vi.mocked(actionItemsApi.actionItemsApi.getProjectSummary).mockResolvedValue(mockSummary);

      const { result } = renderHook(() => useActionItemSummary(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSummary);
      expect(actionItemsApi.actionItemsApi.getProjectSummary).toHaveBeenCalledWith(projectId);
    });

    it('should not fetch when projectId is undefined', () => {
      vi.mocked(actionItemsApi.actionItemsApi.getProjectSummary).mockResolvedValue(null);

      const { result } = renderHook(() => useActionItemSummary(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(actionItemsApi.actionItemsApi.getProjectSummary).not.toHaveBeenCalled();
    });

    it('should handle error when fetching summary fails', async () => {
      const error = new Error('Failed to fetch summary');
      vi.mocked(actionItemsApi.actionItemsApi.getProjectSummary).mockRejectedValue(error);

      const { result } = renderHook(() => useActionItemSummary('project-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useActionItemsByAssignee', () => {
    it('should fetch items by assignee successfully', async () => {
      const projectId = 'project-1';
      const mockData = [
        createMockActionItemsByAssignee({ project_id: projectId, assignee: 'John Doe' }),
        createMockActionItemsByAssignee({ project_id: projectId, assignee: 'Jane Smith' }),
      ];
      vi.mocked(actionItemsApi.actionItemsApi.getItemsByAssignee).mockResolvedValue(mockData);

      const { result } = renderHook(() => useActionItemsByAssignee(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(actionItemsApi.actionItemsApi.getItemsByAssignee).toHaveBeenCalledWith(projectId);
    });

    it('should not fetch when projectId is undefined', () => {
      vi.mocked(actionItemsApi.actionItemsApi.getItemsByAssignee).mockResolvedValue([]);

      const { result } = renderHook(() => useActionItemsByAssignee(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(actionItemsApi.actionItemsApi.getItemsByAssignee).not.toHaveBeenCalled();
    });

    it('should handle error when fetching by assignee fails', async () => {
      const error = new Error('Failed to fetch by assignee');
      vi.mocked(actionItemsApi.actionItemsApi.getItemsByAssignee).mockRejectedValue(error);

      const { result } = renderHook(() => useActionItemsByAssignee('project-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useOverdueActionItems', () => {
    it('should fetch overdue items successfully', async () => {
      const mockItems = [createMockOverdueActionItem(), createMockOverdueActionItem()];
      vi.mocked(actionItemsApi.actionItemsApi.getOverdueItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useOverdueActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(actionItemsApi.actionItemsApi.getOverdueItems).toHaveBeenCalledWith(undefined, 50);
    });

    it('should fetch overdue items for specific project', async () => {
      const projectId = 'project-1';
      const mockItems = [createMockOverdueActionItem({ project_id: projectId })];
      vi.mocked(actionItemsApi.actionItemsApi.getOverdueItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useOverdueActionItems(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getOverdueItems).toHaveBeenCalledWith(projectId, 50);
    });

    it('should fetch with custom limit', async () => {
      const mockItems = createMockActionItems(20);
      vi.mocked(actionItemsApi.actionItemsApi.getOverdueItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useOverdueActionItems(undefined, 20), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getOverdueItems).toHaveBeenCalledWith(undefined, 20);
    });

    it('should handle error when fetching overdue items fails', async () => {
      const error = new Error('Failed to fetch overdue items');
      vi.mocked(actionItemsApi.actionItemsApi.getOverdueItems).mockRejectedValue(error);

      const { result } = renderHook(() => useOverdueActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useActionItemsDueSoon', () => {
    it('should fetch items due soon successfully', async () => {
      const mockItems = [createMockDueSoonActionItem(), createMockDueSoonActionItem()];
      vi.mocked(actionItemsApi.actionItemsApi.getItemsDueSoon).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItemsDueSoon(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(actionItemsApi.actionItemsApi.getItemsDueSoon).toHaveBeenCalledWith(undefined, 50);
    });

    it('should fetch items due soon for specific project', async () => {
      const projectId = 'project-1';
      const mockItems = [createMockDueSoonActionItem({ project_id: projectId })];
      vi.mocked(actionItemsApi.actionItemsApi.getItemsDueSoon).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useActionItemsDueSoon(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getItemsDueSoon).toHaveBeenCalledWith(projectId, 50);
    });

    it('should handle error when fetching items due soon fails', async () => {
      const error = new Error('Failed to fetch items due soon');
      vi.mocked(actionItemsApi.actionItemsApi.getItemsDueSoon).mockRejectedValue(error);

      const { result } = renderHook(() => useActionItemsDueSoon(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useEscalatedActionItems', () => {
    it('should fetch escalated items successfully', async () => {
      const mockItems = [
        createMockEscalatedActionItem({ escalation_level: 1 }),
        createMockEscalatedActionItem({ escalation_level: 2 }),
      ];
      vi.mocked(actionItemsApi.actionItemsApi.getEscalatedItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useEscalatedActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(actionItemsApi.actionItemsApi.getEscalatedItems).toHaveBeenCalledWith(undefined, 50);
    });

    it('should fetch escalated items for specific project', async () => {
      const projectId = 'project-1';
      const mockItems = [createMockEscalatedActionItem({ project_id: projectId })];
      vi.mocked(actionItemsApi.actionItemsApi.getEscalatedItems).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useEscalatedActionItems(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.getEscalatedItems).toHaveBeenCalledWith(projectId, 50);
    });

    it('should handle error when fetching escalated items fails', async () => {
      const error = new Error('Failed to fetch escalated items');
      vi.mocked(actionItemsApi.actionItemsApi.getEscalatedItems).mockRejectedValue(error);

      const { result } = renderHook(() => useEscalatedActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useActionItemStatusCounts', () => {
    it('should fetch status counts successfully', async () => {
      const projectId = 'project-1';
      const mockCounts = { open: 10, in_progress: 5, completed: 8, deferred: 2 };
      vi.mocked(actionItemsApi.actionItemsApi.getStatusCounts).mockResolvedValue(mockCounts);

      const { result } = renderHook(() => useActionItemStatusCounts(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCounts);
      expect(actionItemsApi.actionItemsApi.getStatusCounts).toHaveBeenCalledWith(projectId);
    });

    it('should not fetch when projectId is undefined', () => {
      vi.mocked(actionItemsApi.actionItemsApi.getStatusCounts).mockResolvedValue({
        open: 0,
        in_progress: 0,
        completed: 0,
        deferred: 0,
      });

      const { result } = renderHook(() => useActionItemStatusCounts(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(actionItemsApi.actionItemsApi.getStatusCounts).not.toHaveBeenCalled();
    });

    it('should handle error when fetching status counts fails', async () => {
      const error = new Error('Failed to fetch status counts');
      vi.mocked(actionItemsApi.actionItemsApi.getStatusCounts).mockRejectedValue(error);

      const { result } = renderHook(() => useActionItemStatusCounts('project-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  // ==========================================================================
  // Mutation Hooks Tests
  // ==========================================================================

  describe('useCreateActionItem', () => {
    it('should create action item successfully', async () => {
      const newItem = createMockActionItem({ project_id: 'project-1' });
      const createDTO = {
        meeting_id: 'meeting-1',
        project_id: 'project-1',
        title: 'New Action Item',
        description: 'Description',
      };
      vi.mocked(actionItemsApi.actionItemsApi.createActionItem).mockResolvedValue(newItem);

      const { result } = renderHook(() => useCreateActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(createDTO);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newItem);
      expect(actionItemsApi.actionItemsApi.createActionItem).toHaveBeenCalledWith(createDTO);
      expect(toast.success).toHaveBeenCalledWith('Action item created');
    });

    it('should invalidate queries after successful creation', async () => {
      const newItem = createMockActionItem({ project_id: 'project-1' });
      vi.mocked(actionItemsApi.actionItemsApi.createActionItem).mockResolvedValue(newItem);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meeting_id: 'meeting-1',
          project_id: 'project-1',
          title: 'Test',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: actionItemKeys.summary('project-1'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: actionItemKeys.statusCounts('project-1'),
      });
    });

    it('should handle error when creation fails', async () => {
      const error = new Error('Failed to create action item');
      vi.mocked(actionItemsApi.actionItemsApi.createActionItem).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          meeting_id: 'meeting-1',
          project_id: 'project-1',
          title: 'Test',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create action item: Failed to create action item'
      );
    });
  });

  describe('useUpdateActionItem', () => {
    it('should update action item successfully', async () => {
      const updatedItem = createMockActionItem({ id: 'item-1', title: 'Updated Title' });
      const updateDTO = { title: 'Updated Title' };
      vi.mocked(actionItemsApi.actionItemsApi.updateActionItem).mockResolvedValue(updatedItem);

      const { result } = renderHook(() => useUpdateActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: updateDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedItem);
      expect(actionItemsApi.actionItemsApi.updateActionItem).toHaveBeenCalledWith(
        'item-1',
        updateDTO
      );
      expect(toast.success).toHaveBeenCalledWith('Action item updated');
    });

    it('should invalidate queries after successful update', async () => {
      const updatedItem = createMockActionItem({ id: 'item-1', project_id: 'project-1' });
      vi.mocked(actionItemsApi.actionItemsApi.updateActionItem).mockResolvedValue(updatedItem);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: { title: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.detail('item-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: actionItemKeys.summary('project-1'),
      });
    });

    it('should handle error when update fails', async () => {
      const error = new Error('Failed to update');
      vi.mocked(actionItemsApi.actionItemsApi.updateActionItem).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: { title: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update action item: Failed to update');
    });
  });

  describe('useDeleteActionItem', () => {
    it('should delete action item successfully', async () => {
      vi.mocked(actionItemsApi.actionItemsApi.deleteActionItem).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('item-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.deleteActionItem).toHaveBeenCalledWith('item-1');
      expect(toast.success).toHaveBeenCalledWith('Action item deleted');
    });

    it('should invalidate all queries after successful deletion', async () => {
      vi.mocked(actionItemsApi.actionItemsApi.deleteActionItem).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('item-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.all });
    });

    it('should handle error when deletion fails', async () => {
      const error = new Error('Failed to delete');
      vi.mocked(actionItemsApi.actionItemsApi.deleteActionItem).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('item-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to delete action item: Failed to delete');
    });
  });

  describe('useUpdateActionItemStatus', () => {
    it('should update status successfully', async () => {
      const updatedItem = createMockActionItem({ id: 'item-1', status: 'completed' });
      vi.mocked(actionItemsApi.actionItemsApi.updateActionItemStatus).mockResolvedValue(
        updatedItem
      );

      const { result } = renderHook(() => useUpdateActionItemStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', status: 'completed' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.updateActionItemStatus).toHaveBeenCalledWith(
        'item-1',
        'completed'
      );
    });

    it('should show completion toast when status is completed', async () => {
      const updatedItem = createMockActionItem({
        id: 'item-1',
        status: 'completed',
        project_id: 'project-1',
      });
      vi.mocked(actionItemsApi.actionItemsApi.updateActionItemStatus).mockResolvedValue(
        updatedItem
      );

      const { result } = renderHook(() => useUpdateActionItemStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', status: 'completed' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Action item completed');
    });

    it('should invalidate queries after status update', async () => {
      const updatedItem = createMockActionItem({
        id: 'item-1',
        status: 'in_progress',
        project_id: 'project-1',
      });
      vi.mocked(actionItemsApi.actionItemsApi.updateActionItemStatus).mockResolvedValue(
        updatedItem
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateActionItemStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', status: 'in_progress' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.detail('item-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: actionItemKeys.statusCounts('project-1'),
      });
    });

    it('should handle error when status update fails', async () => {
      const error = new Error('Failed to update status');
      vi.mocked(actionItemsApi.actionItemsApi.updateActionItemStatus).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateActionItemStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', status: 'completed' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update status: Failed to update status');
    });
  });

  describe('useResolveActionItem', () => {
    it('should resolve action item successfully', async () => {
      const resolvedItem = createMockActionItem({
        id: 'item-1',
        status: 'completed',
        resolution_type: 'completed',
      });
      const resolveDTO = { resolution_type: 'completed' as const, resolution_notes: 'Done' };
      vi.mocked(actionItemsApi.actionItemsApi.resolveActionItem).mockResolvedValue(resolvedItem);

      const { result } = renderHook(() => useResolveActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: resolveDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.resolveActionItem).toHaveBeenCalledWith(
        'item-1',
        resolveDTO
      );
      expect(toast.success).toHaveBeenCalledWith('Action item resolved');
    });

    it('should invalidate queries after successful resolution', async () => {
      const resolvedItem = createMockActionItem({
        id: 'item-1',
        project_id: 'project-1',
        status: 'completed',
      });
      vi.mocked(actionItemsApi.actionItemsApi.resolveActionItem).mockResolvedValue(resolvedItem);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useResolveActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          id: 'item-1',
          dto: { resolution_type: 'completed' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.detail('item-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: actionItemKeys.statusCounts('project-1'),
      });
    });

    it('should handle error when resolution fails', async () => {
      const error = new Error('Failed to resolve');
      vi.mocked(actionItemsApi.actionItemsApi.resolveActionItem).mockRejectedValue(error);

      const { result } = renderHook(() => useResolveActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: { resolution_type: 'completed' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to resolve action item: Failed to resolve'
      );
    });
  });

  describe('useLinkActionItem', () => {
    it('should link action item to task successfully', async () => {
      const linkedItem = createMockActionItem({ id: 'item-1', task_id: 'task-1' });
      const linkDTO = { type: 'task' as const, entity_id: 'task-1' };
      vi.mocked(actionItemsApi.actionItemsApi.linkActionItem).mockResolvedValue(linkedItem);

      const { result } = renderHook(() => useLinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: linkDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.linkActionItem).toHaveBeenCalledWith('item-1', linkDTO);
      expect(toast.success).toHaveBeenCalledWith('Link created');
    });

    it('should link action item to RFI successfully', async () => {
      const linkedItem = createMockActionItem({ id: 'item-1', related_rfi_id: 'rfi-1' });
      const linkDTO = { type: 'rfi' as const, entity_id: 'rfi-1' };
      vi.mocked(actionItemsApi.actionItemsApi.linkActionItem).mockResolvedValue(linkedItem);

      const { result } = renderHook(() => useLinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: linkDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.linkActionItem).toHaveBeenCalledWith('item-1', linkDTO);
    });

    it('should invalidate queries after successful link', async () => {
      const linkedItem = createMockActionItem({ id: 'item-1', task_id: 'task-1' });
      vi.mocked(actionItemsApi.actionItemsApi.linkActionItem).mockResolvedValue(linkedItem);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useLinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: { type: 'task', entity_id: 'task-1' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.detail('item-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
    });

    it('should handle error when linking fails', async () => {
      const error = new Error('Failed to link');
      vi.mocked(actionItemsApi.actionItemsApi.linkActionItem).mockRejectedValue(error);

      const { result } = renderHook(() => useLinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', dto: { type: 'task', entity_id: 'task-1' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to link: Failed to link');
    });
  });

  describe('useUnlinkActionItem', () => {
    it('should unlink action item from task successfully', async () => {
      const unlinkedItem = createMockActionItem({ id: 'item-1', task_id: null });
      vi.mocked(actionItemsApi.actionItemsApi.unlinkActionItem).mockResolvedValue(unlinkedItem);

      const { result } = renderHook(() => useUnlinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', linkType: 'task' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.unlinkActionItem).toHaveBeenCalledWith(
        'item-1',
        'task'
      );
      expect(toast.success).toHaveBeenCalledWith('Link removed');
    });

    it('should unlink action item from RFI successfully', async () => {
      const unlinkedItem = createMockActionItem({ id: 'item-1', related_rfi_id: null });
      vi.mocked(actionItemsApi.actionItemsApi.unlinkActionItem).mockResolvedValue(unlinkedItem);

      const { result } = renderHook(() => useUnlinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', linkType: 'rfi' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.unlinkActionItem).toHaveBeenCalledWith('item-1', 'rfi');
    });

    it('should invalidate queries after successful unlink', async () => {
      const unlinkedItem = createMockActionItem({ id: 'item-1', task_id: null });
      vi.mocked(actionItemsApi.actionItemsApi.unlinkActionItem).mockResolvedValue(unlinkedItem);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUnlinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', linkType: 'task' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.detail('item-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
    });

    it('should handle error when unlinking fails', async () => {
      const error = new Error('Failed to unlink');
      vi.mocked(actionItemsApi.actionItemsApi.unlinkActionItem).mockRejectedValue(error);

      const { result } = renderHook(() => useUnlinkActionItem(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'item-1', linkType: 'task' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to unlink: Failed to unlink');
    });
  });

  describe('useConvertToTask', () => {
    it('should convert action item to task successfully', async () => {
      const taskId = 'task-123';
      vi.mocked(actionItemsApi.actionItemsApi.convertToTask).mockResolvedValue(taskId);

      const { result } = renderHook(() => useConvertToTask(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('item-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(taskId);
      expect(actionItemsApi.actionItemsApi.convertToTask).toHaveBeenCalledWith(
        'item-1',
        'user-123'
      );
      expect(toast.success).toHaveBeenCalledWith('Converted to task');
    });

    it('should invalidate queries after successful conversion', async () => {
      const taskId = 'task-123';
      vi.mocked(actionItemsApi.actionItemsApi.convertToTask).mockResolvedValue(taskId);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useConvertToTask(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('item-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.detail('item-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    });

    it('should handle error when conversion fails', async () => {
      const error = new Error('Failed to convert');
      vi.mocked(actionItemsApi.actionItemsApi.convertToTask).mockRejectedValue(error);

      const { result } = renderHook(() => useConvertToTask(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('item-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to convert: Failed to convert');
    });
  });

  describe('useCarryoverActionItems', () => {
    it('should carryover action items successfully', async () => {
      const count = 5;
      const carryoverDTO = {
        source_meeting_id: 'meeting-1',
        target_meeting_id: 'meeting-2',
      };
      vi.mocked(actionItemsApi.actionItemsApi.carryoverActionItems).mockResolvedValue(count);

      const { result } = renderHook(() => useCarryoverActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(carryoverDTO);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(count);
      expect(actionItemsApi.actionItemsApi.carryoverActionItems).toHaveBeenCalledWith(
        carryoverDTO
      );
      expect(toast.success).toHaveBeenCalledWith('5 action items carried over');
    });

    it('should handle single item carryover message correctly', async () => {
      const count = 1;
      vi.mocked(actionItemsApi.actionItemsApi.carryoverActionItems).mockResolvedValue(count);

      const { result } = renderHook(() => useCarryoverActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          source_meeting_id: 'meeting-1',
          target_meeting_id: 'meeting-2',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('1 action item carried over');
    });

    it('should carryover specific action items', async () => {
      const count = 2;
      const carryoverDTO = {
        source_meeting_id: 'meeting-1',
        target_meeting_id: 'meeting-2',
        action_item_ids: ['item-1', 'item-2'],
      };
      vi.mocked(actionItemsApi.actionItemsApi.carryoverActionItems).mockResolvedValue(count);

      const { result } = renderHook(() => useCarryoverActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(carryoverDTO);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(actionItemsApi.actionItemsApi.carryoverActionItems).toHaveBeenCalledWith(
        carryoverDTO
      );
    });

    it('should invalidate queries after successful carryover', async () => {
      const count = 3;
      vi.mocked(actionItemsApi.actionItemsApi.carryoverActionItems).mockResolvedValue(count);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCarryoverActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          source_meeting_id: 'meeting-1',
          target_meeting_id: 'meeting-2',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: actionItemKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meetings'] });
    });

    it('should handle error when carryover fails', async () => {
      const error = new Error('Failed to carry over');
      vi.mocked(actionItemsApi.actionItemsApi.carryoverActionItems).mockRejectedValue(error);

      const { result } = renderHook(() => useCarryoverActionItems(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          source_meeting_id: 'meeting-1',
          target_meeting_id: 'meeting-2',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to carry over: Failed to carry over');
    });
  });

  // ==========================================================================
  // Query Keys Tests
  // ==========================================================================

  describe('actionItemKeys', () => {
    it('should generate correct key for all', () => {
      expect(actionItemKeys.all).toEqual(['action-items']);
    });

    it('should generate correct key for lists', () => {
      expect(actionItemKeys.lists()).toEqual(['action-items', 'list']);
    });

    it('should generate correct key for list with filters', () => {
      const filters = { project_id: 'project-1', status: 'open' as const };
      expect(actionItemKeys.list(filters)).toEqual(['action-items', 'list', filters]);
    });

    it('should generate correct key for details', () => {
      expect(actionItemKeys.details()).toEqual(['action-items', 'detail']);
    });

    it('should generate correct key for detail with id', () => {
      expect(actionItemKeys.detail('item-1')).toEqual(['action-items', 'detail', 'item-1']);
    });

    it('should generate correct key for summary', () => {
      expect(actionItemKeys.summary('project-1')).toEqual([
        'action-items',
        'summary',
        'project-1',
      ]);
    });

    it('should generate correct key for byAssignee', () => {
      expect(actionItemKeys.byAssignee('project-1')).toEqual([
        'action-items',
        'by-assignee',
        'project-1',
      ]);
    });

    it('should generate correct key for overdue', () => {
      expect(actionItemKeys.overdue('project-1')).toEqual([
        'action-items',
        'overdue',
        'project-1',
      ]);
    });

    it('should generate correct key for overdue without project', () => {
      expect(actionItemKeys.overdue()).toEqual(['action-items', 'overdue', undefined]);
    });

    it('should generate correct key for dueSoon', () => {
      expect(actionItemKeys.dueSoon('project-1')).toEqual([
        'action-items',
        'due-soon',
        'project-1',
      ]);
    });

    it('should generate correct key for escalated', () => {
      expect(actionItemKeys.escalated('project-1')).toEqual([
        'action-items',
        'escalated',
        'project-1',
      ]);
    });

    it('should generate correct key for statusCounts', () => {
      expect(actionItemKeys.statusCounts('project-1')).toEqual([
        'action-items',
        'status-counts',
        'project-1',
      ]);
    });
  });
});
