// File: /src/features/workflows/hooks/useWorkflowItemComments.ts
// React Query hooks for workflow item comments

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowsApi } from '@/lib/api'
import type { WorkflowItemComment } from '@/types/database'

// Fetch all comments for a workflow item
export function useWorkflowItemComments(workflowItemId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-item-comments', workflowItemId],
    queryFn: async () => {
      if (!workflowItemId) {
        throw new Error('Workflow item ID required')
      }
      return workflowsApi.getWorkflowItemComments(workflowItemId)
    },
    enabled: !!workflowItemId,
  })
}

// Create comment mutation
export function useCreateWorkflowItemComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      data: Omit<WorkflowItemComment, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
    ) => {
      return workflowsApi.createWorkflowItemComment(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-item-comments', data.workflow_item_id],
      })
    },
  })
}

// Update comment mutation
export function useUpdateWorkflowItemComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
      workflowItemId: _workflowItemId,
      updates,
    }: {
      commentId: string
      workflowItemId: string
      updates: Partial<Pick<WorkflowItemComment, 'comment' | 'mentioned_users'>>
    }) => {
      return workflowsApi.updateWorkflowItemComment(commentId, updates)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-item-comments', variables.workflowItemId],
      })
    },
  })
}

// Delete comment mutation (soft delete)
export function useDeleteWorkflowItemComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
      workflowItemId: _workflowItemId,
    }: {
      commentId: string
      workflowItemId: string
    }) => {
      return workflowsApi.deleteWorkflowItemComment(commentId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-item-comments', variables.workflowItemId],
      })
    },
  })
}
