// File: /src/features/checklists/hooks/useExecutions.ts
// React Query hooks for checklist executions
// Phase: 3.1 - Checklist Execution UI

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistsApi } from '@/lib/api/services/checklists'
import type {
  ChecklistExecution,
  ChecklistExecutionWithResponses,
  CreateChecklistExecutionDTO,
  ChecklistFilters,
} from '@/types/checklists'
import toast from 'react-hot-toast'

/**
 * Fetch all executions with optional filters
 */
export function useExecutions(filters?: ChecklistFilters) {
  return useQuery({
    queryKey: ['checklist-executions', filters],
    queryFn: () => checklistsApi.getExecutions(filters),
  })
}

/**
 * Fetch a single execution by ID
 */
export function useExecution(executionId: string) {
  return useQuery({
    queryKey: ['checklist-execution', executionId],
    queryFn: () => checklistsApi.getExecution(executionId),
    enabled: !!executionId,
  })
}

/**
 * Fetch execution with all responses
 */
export function useExecutionWithResponses(executionId: string) {
  return useQuery({
    queryKey: ['checklist-execution-with-responses', executionId],
    queryFn: () => checklistsApi.getExecutionWithResponses(executionId),
    enabled: !!executionId,
  })
}

/**
 * Create a new execution
 */
export function useCreateExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChecklistExecutionDTO) => checklistsApi.createExecution(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions'], exact: false })
      toast.success('Checklist started successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create checklist')
    },
  })
}

/**
 * Update an execution
 */
export function useUpdateExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: Partial<ChecklistExecution> & { id: string }) =>
      checklistsApi.updateExecution(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution', data.id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution-with-responses', data.id] })
      toast.success('Checklist updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update checklist')
    },
  })
}

/**
 * Submit an execution (marks as completed)
 */
export function useSubmitExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (executionId: string) => checklistsApi.submitExecution(executionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution', data.id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution-with-responses', data.id] })
      toast.success('Checklist submitted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to submit checklist')
    },
  })
}

/**
 * Delete an execution
 */
export function useDeleteExecution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (executionId: string) => checklistsApi.deleteExecution(executionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions'], exact: false })
      toast.success('Checklist deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete checklist')
    },
  })
}
