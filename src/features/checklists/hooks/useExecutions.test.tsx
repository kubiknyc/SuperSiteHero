/**
 * Tests for Checklist Executions Hooks
 * Comprehensive testing for checklist execution CRUD and submission workflows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import {
  useExecutions,
  useExecution,
  useExecutionWithResponses,
  useCreateExecution,
  useUpdateExecution,
  useSubmitExecution,
  useDeleteExecution,
  useSubmitExecutionWithEscalation,
} from './useExecutions'

import type {
  ChecklistExecution,
  ChecklistExecutionWithResponses,
  CreateChecklistExecutionDTO,
} from '@/types/checklists'

// Mock dependencies
const mockChecklistsApi = {
  getExecutions: vi.fn(),
  getExecution: vi.fn(),
  getExecutionWithResponses: vi.fn(),
  createExecution: vi.fn(),
  updateExecution: vi.fn(),
  submitExecution: vi.fn(),
  deleteExecution: vi.fn(),
}

const mockEscalationHook = {
  triggerEscalation: vi.fn(),
  escalateSingleItem: vi.fn(),
  calculateSeverityLevel: vi.fn(),
}

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

vi.mock('@/lib/api/services/checklists', () => ({
  checklistsApi: mockChecklistsApi,
}))

vi.mock('./useChecklistEscalation', () => ({
  useChecklistEscalation: () => mockEscalationHook,
}))

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Test data
const mockExecution: ChecklistExecution = {
  id: 'exec-1',
  project_id: 'project-1',
  checklist_template_id: 'template-1',
  name: 'Daily Safety Inspection',
  location: 'Floor 3',
  inspector_user_id: 'user-1',
  inspector_name: 'John Inspector',
  score_total: 10,
  score_pass: 8,
  score_fail: 2,
  score_na: 0,
  status: 'in_progress',
  submitted_at: null,
  created_at: '2025-01-11T09:00:00Z',
  updated_at: '2025-01-11T09:00:00Z',
  created_by: 'user-1',
  deleted_at: null,
}

const mockExecutionWithResponses: ChecklistExecutionWithResponses = {
  ...mockExecution,
  responses: [
    {
      id: 'response-1',
      checklist_execution_id: 'exec-1',
      checklist_template_item_id: 'item-1',
      item_label: 'Check fire extinguishers',
      score_value: 'pass',
      notes: null,
      photo_urls: [],
      created_at: '2025-01-11T09:10:00Z',
      updated_at: '2025-01-11T09:10:00Z',
    },
    {
      id: 'response-2',
      checklist_execution_id: 'exec-1',
      checklist_template_item_id: 'item-2',
      item_label: 'Emergency exits clear',
      score_value: 'fail',
      notes: 'Exit blocked by equipment',
      photo_urls: [],
      created_at: '2025-01-11T09:15:00Z',
      updated_at: '2025-01-11T09:15:00Z',
    },
  ],
}

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Checklist Execution Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useExecutions', () => {
    it('should fetch all executions without filters', async () => {
      mockChecklistsApi.getExecutions.mockResolvedValue([mockExecution])

      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([mockExecution])
      expect(mockChecklistsApi.getExecutions).toHaveBeenCalledWith(undefined)
    })

    it('should fetch executions with filters', async () => {
      const filters = {
        project_id: 'project-1',
        status: 'completed' as const,
      }

      mockChecklistsApi.getExecutions.mockResolvedValue([mockExecution])

      const { result } = renderHook(() => useExecutions(filters), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockChecklistsApi.getExecutions).toHaveBeenCalledWith(filters)
    })

    it('should handle fetch error', async () => {
      mockChecklistsApi.getExecutions.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error?.message).toBe('Network error')
    })
  })

  describe('useExecution', () => {
    it('should fetch single execution by ID', async () => {
      mockChecklistsApi.getExecution.mockResolvedValue(mockExecution)

      const { result } = renderHook(() => useExecution('exec-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockExecution)
      expect(mockChecklistsApi.getExecution).toHaveBeenCalledWith('exec-1')
    })

    it('should not fetch when execution ID is empty', async () => {
      const { result } = renderHook(() => useExecution(''), { wrapper: createWrapper() })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockChecklistsApi.getExecution).not.toHaveBeenCalled()
    })
  })

  describe('useExecutionWithResponses', () => {
    it('should fetch execution with all responses', async () => {
      mockChecklistsApi.getExecutionWithResponses.mockResolvedValue(mockExecutionWithResponses)

      const { result } = renderHook(() => useExecutionWithResponses('exec-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockExecutionWithResponses)
      expect(result.current.data?.responses).toHaveLength(2)
    })

    it('should not fetch when execution ID is empty', async () => {
      const { result } = renderHook(() => useExecutionWithResponses(''), {
        wrapper: createWrapper(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockChecklistsApi.getExecutionWithResponses).not.toHaveBeenCalled()
    })
  })
})

describe('Checklist Execution Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateExecution', () => {
    it('should create new execution successfully', async () => {
      const createData: CreateChecklistExecutionDTO = {
        project_id: 'project-1',
        checklist_template_id: 'template-1',
        name: 'Morning Safety Check',
        location: 'Floor 2',
        inspector_user_id: 'user-1',
      }

      mockChecklistsApi.createExecution.mockResolvedValue(mockExecution)

      const { result } = renderHook(() => useCreateExecution(), { wrapper: createWrapper() })

      result.current.mutate(createData)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockChecklistsApi.createExecution).toHaveBeenCalledWith(createData)
      expect(mockToast.success).toHaveBeenCalledWith('Checklist started successfully')
    })

    it('should handle creation error', async () => {
      const createData: CreateChecklistExecutionDTO = {
        project_id: 'project-1',
        checklist_template_id: 'template-1',
        name: 'Test',
        location: null,
        inspector_user_id: 'user-1',
      }

      mockChecklistsApi.createExecution.mockRejectedValue(
        new Error('Template not found')
      )

      const { result } = renderHook(() => useCreateExecution(), { wrapper: createWrapper() })

      result.current.mutate(createData)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockToast.error).toHaveBeenCalledWith('Template not found')
    })
  })

  describe('useUpdateExecution', () => {
    it('should update execution successfully', async () => {
      const updates = {
        id: 'exec-1',
        name: 'Updated Inspection Name',
        location: 'Floor 4',
      }

      mockChecklistsApi.updateExecution.mockResolvedValue({
        ...mockExecution,
        ...updates,
      })

      const { result } = renderHook(() => useUpdateExecution(), { wrapper: createWrapper() })

      result.current.mutate(updates)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockChecklistsApi.updateExecution).toHaveBeenCalledWith('exec-1', {
        name: 'Updated Inspection Name',
        location: 'Floor 4',
      })
      expect(mockToast.success).toHaveBeenCalledWith('Checklist updated successfully')
    })

    it('should handle update error', async () => {
      mockChecklistsApi.updateExecution.mockRejectedValue(
        new Error('Execution not found')
      )

      const { result } = renderHook(() => useUpdateExecution(), { wrapper: createWrapper() })

      result.current.mutate({ id: 'exec-1', name: 'Updated' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockToast.error).toHaveBeenCalledWith('Execution not found')
    })
  })

  describe('useSubmitExecution', () => {
    it('should submit execution successfully', async () => {
      const submittedExecution = {
        ...mockExecution,
        status: 'completed' as const,
        submitted_at: '2025-01-11T10:00:00Z',
      }

      mockChecklistsApi.submitExecution.mockResolvedValue(submittedExecution)

      const { result } = renderHook(() => useSubmitExecution(), { wrapper: createWrapper() })

      result.current.mutate('exec-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockChecklistsApi.submitExecution).toHaveBeenCalledWith('exec-1')
      expect(mockToast.success).toHaveBeenCalledWith('Checklist submitted successfully')
      expect(result.current.data?.status).toBe('completed')
    })

    it('should handle submit error', async () => {
      mockChecklistsApi.submitExecution.mockRejectedValue(
        new Error('Cannot submit incomplete checklist')
      )

      const { result } = renderHook(() => useSubmitExecution(), { wrapper: createWrapper() })

      result.current.mutate('exec-1')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockToast.error).toHaveBeenCalledWith('Cannot submit incomplete checklist')
    })
  })

  describe('useDeleteExecution', () => {
    it('should delete execution successfully', async () => {
      mockChecklistsApi.deleteExecution.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteExecution(), { wrapper: createWrapper() })

      result.current.mutate('exec-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockChecklistsApi.deleteExecution).toHaveBeenCalledWith('exec-1')
      expect(mockToast.success).toHaveBeenCalledWith('Checklist deleted successfully')
    })

    it('should handle delete error', async () => {
      mockChecklistsApi.deleteExecution.mockRejectedValue(
        new Error('Cannot delete submitted checklist')
      )

      const { result } = renderHook(() => useDeleteExecution(), { wrapper: createWrapper() })

      result.current.mutate('exec-1')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockToast.error).toHaveBeenCalledWith('Cannot delete submitted checklist')
    })
  })
})

describe('useSubmitExecutionWithEscalation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit execution and trigger escalation for failed items', async () => {
    const submittedExecution = {
      ...mockExecution,
      status: 'completed' as const,
      score_fail: 3,
      score_total: 10,
      submitted_at: '2025-01-11T10:00:00Z',
    }

    mockChecklistsApi.getExecutionWithResponses.mockResolvedValue(mockExecutionWithResponses)
    mockChecklistsApi.submitExecution.mockResolvedValue(submittedExecution)
    mockEscalationHook.calculateSeverityLevel.mockReturnValue('high')
    mockEscalationHook.triggerEscalation.mockResolvedValue({
      triggered: true,
      recipientCount: 2,
      severity: 'high',
      autoCreated: { punchItemsCreated: 0, tasksCreated: 0, createdItems: [] },
    })

    const { result } = renderHook(() => useSubmitExecutionWithEscalation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('exec-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockChecklistsApi.getExecutionWithResponses).toHaveBeenCalledWith('exec-1')
    expect(mockChecklistsApi.submitExecution).toHaveBeenCalledWith('exec-1')
    expect(mockEscalationHook.triggerEscalation).toHaveBeenCalledWith(
      submittedExecution,
      mockExecutionWithResponses.responses
    )
    expect(mockToast.success).toHaveBeenCalledWith(
      'Checklist submitted. 2 supervisors notified about 3 failed items.'
    )
  })

  it('should submit execution without escalation if no failures', async () => {
    const submittedExecution = {
      ...mockExecution,
      status: 'completed' as const,
      score_fail: 0,
      score_total: 10,
      submitted_at: '2025-01-11T10:00:00Z',
    }

    mockChecklistsApi.getExecutionWithResponses.mockResolvedValue({
      ...mockExecutionWithResponses,
      responses: [],
    })
    mockChecklistsApi.submitExecution.mockResolvedValue(submittedExecution)

    const { result } = renderHook(() => useSubmitExecutionWithEscalation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('exec-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockEscalationHook.triggerEscalation).not.toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('Checklist submitted successfully')
  })

  it('should handle escalation failure gracefully', async () => {
    const submittedExecution = {
      ...mockExecution,
      status: 'completed' as const,
      score_fail: 2,
      score_total: 10,
    }

    mockChecklistsApi.getExecutionWithResponses.mockResolvedValue(mockExecutionWithResponses)
    mockChecklistsApi.submitExecution.mockResolvedValue(submittedExecution)
    mockEscalationHook.calculateSeverityLevel.mockReturnValue('medium')
    mockEscalationHook.triggerEscalation.mockRejectedValue(
      new Error('Email service unavailable')
    )

    const { result } = renderHook(() => useSubmitExecutionWithEscalation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('exec-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockToast.success).toHaveBeenCalledWith(
      'Checklist submitted. Note: Escalation notifications may have failed.'
    )
  })

  it('should show correct singular message for 1 failed item and 1 recipient', async () => {
    const submittedExecution = {
      ...mockExecution,
      score_fail: 1,
      score_total: 10,
    }

    mockChecklistsApi.getExecutionWithResponses.mockResolvedValue(mockExecutionWithResponses)
    mockChecklistsApi.submitExecution.mockResolvedValue(submittedExecution)
    mockEscalationHook.calculateSeverityLevel.mockReturnValue('low')
    mockEscalationHook.triggerEscalation.mockResolvedValue({
      triggered: true,
      recipientCount: 1,
      severity: 'low',
      autoCreated: { punchItemsCreated: 0, tasksCreated: 0, createdItems: [] },
    })

    const { result } = renderHook(() => useSubmitExecutionWithEscalation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('exec-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockToast.success).toHaveBeenCalledWith(
      'Checklist submitted. 1 supervisor notified about 1 failed item.'
    )
  })

  it('should handle submission error', async () => {
    mockChecklistsApi.getExecutionWithResponses.mockResolvedValue(mockExecutionWithResponses)
    mockChecklistsApi.submitExecution.mockRejectedValue(
      new Error('Database error')
    )

    const { result } = renderHook(() => useSubmitExecutionWithEscalation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('exec-1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockToast.error).toHaveBeenCalledWith('Database error')
    expect(mockEscalationHook.triggerEscalation).not.toHaveBeenCalled()
  })

  it('should calculate correct failure percentage for escalation severity', async () => {
    const submittedExecution = {
      ...mockExecution,
      score_fail: 6,
      score_total: 10,
    }

    mockChecklistsApi.getExecutionWithResponses.mockResolvedValue(mockExecutionWithResponses)
    mockChecklistsApi.submitExecution.mockResolvedValue(submittedExecution)
    mockEscalationHook.calculateSeverityLevel.mockReturnValue('critical')
    mockEscalationHook.triggerEscalation.mockResolvedValue({
      triggered: true,
      recipientCount: 3,
      severity: 'critical',
      autoCreated: { punchItemsCreated: 0, tasksCreated: 0, createdItems: [] },
    })

    const { result } = renderHook(() => useSubmitExecutionWithEscalation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('exec-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockEscalationHook.calculateSeverityLevel).toHaveBeenCalledWith(60)
  })
})
