// File: /src/features/checklists/hooks/useExecutions.ts
// React Query hooks for checklist executions
// Phase: 3.1 - Checklist Execution UI

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistsApi } from '@/lib/api/services/checklists'
import { useChecklistEscalation } from './useChecklistEscalation'
import type {
  ChecklistExecution,
  CreateChecklistExecutionDTO,
  ChecklistFilters,
} from '@/types/checklists'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'

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

/**
 * Submit an execution with automatic escalation for failed items
 * This hook handles the full submission flow:
 * 1. Submit the checklist
 * 2. Check for failed items
 * 3. Trigger escalation notifications if needed
 */
export function useSubmitExecutionWithEscalation() {
  const queryClient = useQueryClient()
  const { triggerEscalation, calculateSeverityLevel } = useChecklistEscalation()

  return useMutation({
    mutationFn: async (executionId: string) => {
      // First, fetch the execution with responses to check for failures
      const executionWithResponses = await checklistsApi.getExecutionWithResponses(executionId)

      // Submit the execution
      const submittedExecution = await checklistsApi.submitExecution(executionId)

      // Return both for the onSuccess callback
      return { execution: submittedExecution, responses: executionWithResponses.responses }
    },
    onSuccess: async ({ execution, responses }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['checklist-executions'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution', execution.id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution-with-responses', execution.id] })

      // Check if there are failed items
      if (execution.score_fail > 0) {
        const failurePercentage = execution.score_total > 0
          ? (execution.score_fail / execution.score_total) * 100
          : 0
        // Calculate severity for potential future use (currently unused)
        const _severity = calculateSeverityLevel(failurePercentage)

        // Trigger escalation
        try {
          const result = await triggerEscalation(execution, responses)

          if (result.triggered) {
            toast.success(
              `Checklist submitted. ${result.recipientCount} supervisor${result.recipientCount > 1 ? 's' : ''} notified about ${execution.score_fail} failed item${execution.score_fail > 1 ? 's' : ''}.`
            )
          } else {
            toast.success('Checklist submitted successfully')
          }
        } catch (error) {
          logger.error('[SubmitWithEscalation] Escalation failed:', error)
          toast.success('Checklist submitted. Note: Escalation notifications may have failed.')
        }
      } else {
        toast.success('Checklist submitted successfully')
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to submit checklist')
    },
  })
}
