// File: /src/features/checklists/hooks/useResponses.ts
// React Query hooks for checklist responses
// Phase: 3.1 - Checklist Execution UI

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistsApi } from '@/lib/api/services/checklists'
import type {
  ChecklistResponse,
  CreateChecklistResponseDTO,
} from '@/types/checklists'
import toast from 'react-hot-toast'

/**
 * Fetch all responses for an execution
 */
export function useResponses(executionId: string) {
  return useQuery({
    queryKey: ['checklist-responses', executionId],
    queryFn: () => checklistsApi.getResponses(executionId),
    enabled: !!executionId,
  })
}

/**
 * Fetch execution score summary
 */
export function useExecutionScore(executionId: string) {
  return useQuery({
    queryKey: ['checklist-execution-score', executionId],
    queryFn: () => checklistsApi.getExecutionScore(executionId),
    enabled: !!executionId,
  })
}

/**
 * Create a single response
 */
export function useCreateResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChecklistResponseDTO) => checklistsApi.createResponse(data),
    onSuccess: (data) => {
      // Invalidate responses list for this execution
      queryClient.invalidateQueries({
        queryKey: ['checklist-responses', data.checklist_id],
        exact: false,
      })
      // Invalidate execution-with-responses query
      queryClient.invalidateQueries({
        queryKey: ['checklist-execution-with-responses', data.checklist_id],
        exact: false,
      })
      // Invalidate execution score
      queryClient.invalidateQueries({
        queryKey: ['checklist-execution-score', data.checklist_id],
        exact: false,
      })
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create response')
    },
  })
}

/**
 * Update a response (main hook for filling out checklist)
 */
export function useUpdateResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: Partial<ChecklistResponse> & { id: string }) =>
      checklistsApi.updateResponse(id, updates),
    onSuccess: (data) => {
      // Invalidate responses list for this execution
      queryClient.invalidateQueries({
        queryKey: ['checklist-responses', data.checklist_id],
        exact: false,
      })
      // Invalidate execution-with-responses query
      queryClient.invalidateQueries({
        queryKey: ['checklist-execution-with-responses', data.checklist_id],
        exact: false,
      })
      // Invalidate execution score (if response has score_value)
      if (data.score_value) {
        queryClient.invalidateQueries({
          queryKey: ['checklist-execution-score', data.checklist_id],
          exact: false,
        })
      }
      // Don't show toast for auto-save - too noisy
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update response')
    },
  })
}

/**
 * Delete a response
 */
export function useDeleteResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (responseId: string) => checklistsApi.deleteResponse(responseId),
    onSuccess: () => {
      // Invalidate all response queries
      queryClient.invalidateQueries({ queryKey: ['checklist-responses'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution-with-responses'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution-score'], exact: false })
      toast.success('Response deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete response')
    },
  })
}

/**
 * Batch create responses (when starting execution from template)
 */
export function useBatchCreateResponses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (responses: CreateChecklistResponseDTO[]) =>
      checklistsApi.batchCreateResponses(responses),
    onSuccess: (data) => {
      if (data.length > 0) {
        const executionId = data[0].checklist_id
        // Invalidate responses list for this execution
        queryClient.invalidateQueries({
          queryKey: ['checklist-responses', executionId],
          exact: false,
        })
        // Invalidate execution-with-responses query
        queryClient.invalidateQueries({
          queryKey: ['checklist-execution-with-responses', executionId],
          exact: false,
        })
      }
      toast.success(`${data.length} checklist items initialized`)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to initialize checklist items')
    },
  })
}
