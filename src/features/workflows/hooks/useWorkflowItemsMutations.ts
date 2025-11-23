// File: /src/features/workflows/hooks/useWorkflowItemsMutations.ts
// Workflow items mutations with notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { workflowsApi } from '@/lib/api'
import type { WorkflowItem } from '@/types/database'

export function useCreateWorkflowItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: async (workflowItem) => {
      return workflowsApi.createWorkflowItem(workflowItem)
    },
    successMessage: (data) => `Workflow item "${data.title}" created successfully`,
    errorMessage: (error) => `Failed to create workflow item: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.project_id], exact: false })
    },
  })
}

export function useUpdateWorkflowItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    { id: string; updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      return workflowsApi.updateWorkflowItem(id, updates)
    },
    successMessage: (data) => `Workflow item "${data.title}" updated successfully`,
    errorMessage: (error) => `Failed to update workflow item: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.project_id], exact: false })
    },
  })
}

export function useDeleteWorkflowItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (workflowItemId) => {
      return workflowsApi.deleteWorkflowItem(workflowItemId)
    },
    successMessage: 'Workflow item deleted successfully',
    errorMessage: (error) => `Failed to delete workflow item: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
    },
  })
}

export function useUpdateWorkflowItemStatusWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    { workflowItemId: string; status: string }
  >({
    mutationFn: async ({ workflowItemId, status }) => {
      return workflowsApi.updateWorkflowItemStatus(workflowItemId, status)
    },
    successMessage: (data) => `Workflow item status updated to "${data.status}"`,
    errorMessage: (error) => `Failed to update workflow item status: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.project_id], exact: false })
    },
  })
}
