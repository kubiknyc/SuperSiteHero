// File: /src/features/workflows/hooks/useWorkflowItems.test.ts
// Test suite for workflow items hooks

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWorkflowItems, useWorkflowItem, useCreateWorkflowItem, useUpdateWorkflowItem, useDeleteWorkflowItem, useUpdateWorkflowItemStatus } from './useWorkflowItems'
import * as apiModule from '@/lib/api'

// Mock the API
vi.mock('@/lib/api', () => ({
  workflowsApi: {
    getWorkflowItemsByProject: vi.fn(),
    getWorkflowItem: vi.fn(),
    createWorkflowItem: vi.fn(),
    updateWorkflowItem: vi.fn(),
    deleteWorkflowItem: vi.fn(),
    updateWorkflowItemStatus: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Workflow Items Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useWorkflowItems', () => {
    it('should fetch workflow items for a project', async () => {
      const mockItems = [
        {
          id: '1',
          project_id: 'proj-1',
          workflow_type_id: 'rfi',
          title: 'RFI #1',
          status: 'open',
          priority: 'high',
          description: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
          assignees: [],
          closed_date: null,
          cost_impact: null,
          discipline: null,
          due_date: null,
          more_information: null,
          number: null,
          opened_date: null,
          raised_by: null,
          reference_number: null,
          resolution: null,
          schedule_impact: null,
          created_by: null,
        },
      ]

      vi.mocked(apiModule.workflowsApi.getWorkflowItemsByProject).mockResolvedValue(mockItems)

      const { result } = renderHook(() => useWorkflowItems('proj-1'), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockItems)
    })

    it('should not fetch when project ID is undefined', async () => {
      const { result } = renderHook(() => useWorkflowItems(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(apiModule.workflowsApi.getWorkflowItemsByProject).not.toHaveBeenCalled()
    })

    it('should filter by workflow type ID if provided', async () => {
      vi.mocked(apiModule.workflowsApi.getWorkflowItemsByProject).mockResolvedValue([])

      renderHook(() => useWorkflowItems('proj-1', 'rfi'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(apiModule.workflowsApi.getWorkflowItemsByProject).toHaveBeenCalledWith('proj-1', 'rfi')
      })
    })
  })

  describe('useWorkflowItem', () => {
    it('should fetch a single workflow item', async () => {
      const mockItem = {
        id: '1',
        project_id: 'proj-1',
        workflow_type_id: 'rfi',
        title: 'RFI #1',
        status: 'open',
        priority: 'high',
        description: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
        assignees: [],
        closed_date: null,
        cost_impact: null,
        discipline: null,
        due_date: null,
        more_information: null,
        number: null,
        opened_date: null,
        raised_by: null,
        reference_number: null,
        resolution: null,
        schedule_impact: null,
        created_by: null,
      }

      vi.mocked(apiModule.workflowsApi.getWorkflowItem).mockResolvedValue(mockItem)

      const { result } = renderHook(() => useWorkflowItem('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockItem)
    })

    it('should not fetch when item ID is undefined', async () => {
      const { result } = renderHook(() => useWorkflowItem(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(apiModule.workflowsApi.getWorkflowItem).not.toHaveBeenCalled()
    })
  })

  describe('useCreateWorkflowItem', () => {
    it('should create a workflow item', async () => {
      const newItem = {
        project_id: 'proj-1',
        workflow_type_id: 'rfi',
        title: 'New RFI',
        status: 'open',
        priority: 'normal',
        description: null,
        assignees: null,
        closed_date: null,
        cost_impact: null,
        discipline: null,
        due_date: null,
        more_information: null,
        number: null,
        opened_date: null,
        raised_by: null,
        reference_number: null,
        resolution: null,
        schedule_impact: null,
        created_by: null,
        deleted_at: null,
      }

      const createdItem = {
        id: '1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        ...newItem,
      }

      vi.mocked(apiModule.workflowsApi.createWorkflowItem).mockResolvedValue(createdItem)

      const { result } = renderHook(() => useCreateWorkflowItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newItem)

      await waitFor(() => {
        expect(result.current.data).toEqual(createdItem)
      })
    })
  })

  describe('useUpdateWorkflowItem', () => {
    it('should update a workflow item', async () => {
      const updates = { title: 'Updated Title' }
      const updatedItem = { id: '1', ...updates, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', project_id: 'proj-1', workflow_type_id: 'rfi' }

      vi.mocked(apiModule.workflowsApi.updateWorkflowItem).mockResolvedValue(updatedItem)

      const { result } = renderHook(() => useUpdateWorkflowItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: '1', updates })

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedItem)
      })
    })
  })

  describe('useDeleteWorkflowItem', () => {
    it('should delete a workflow item', async () => {
      vi.mocked(apiModule.workflowsApi.deleteWorkflowItem).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteWorkflowItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('useUpdateWorkflowItemStatus', () => {
    it('should update workflow item status', async () => {
      const updatedItem = {
        id: '1',
        status: 'approved',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        project_id: 'proj-1',
        workflow_type_id: 'rfi',
        title: 'Test',
      }

      vi.mocked(apiModule.workflowsApi.updateWorkflowItemStatus).mockResolvedValue(updatedItem)

      const { result } = renderHook(() => useUpdateWorkflowItemStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ workflowItemId: '1', status: 'approved' })

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedItem)
      })
    })
  })
})
