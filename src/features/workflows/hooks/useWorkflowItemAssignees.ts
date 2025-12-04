// File: /src/features/workflows/hooks/useWorkflowItemAssignees.ts
// React Query hooks for workflow item assignees

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowsApi, type ProjectUserWithDetails } from '@/lib/api/services/workflows'

// Fetch all users assigned to a project (for assignee selection)
export function useProjectUsers(projectId: string | undefined) {
  return useQuery<ProjectUserWithDetails[]>({
    queryKey: ['project-users', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID required')
      }
      return workflowsApi.getProjectUsers(projectId)
    },
    enabled: !!projectId,
  })
}

// Update assignees on a workflow item
export function useUpdateWorkflowItemAssignees() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workflowItemId,
      assignees,
    }: {
      workflowItemId: string
      assignees: string[]
    }) => {
      return workflowsApi.updateWorkflowItemAssignees(workflowItemId, assignees)
    },
    onSuccess: (data) => {
      // Invalidate the workflow item query
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.id] })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.project_id] })
      // Also invalidate history since assignee changes may be logged
      queryClient.invalidateQueries({ queryKey: ['workflow-item-history', data.id] })
    },
  })
}
