// File: /src/features/workflows/hooks/useWorkflowItems.ts
// React Query hooks for workflow items

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowsApi } from '@/lib/api'
import type { WorkflowItem } from '@/types/database'

// Fetch all workflow items for a project, optionally filtered by workflow type
export function useWorkflowItems(projectId: string | undefined, workflowTypeId?: string) {
  return useQuery({
    queryKey: ['workflow-items', projectId, workflowTypeId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      return workflowsApi.getWorkflowItemsByProject(projectId, workflowTypeId)
    },
    enabled: !!projectId,
  })
}

// Fetch single workflow item
export function useWorkflowItem(workflowItemId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-items', workflowItemId],
    queryFn: async () => {
      if (!workflowItemId) throw new Error('Workflow item ID required')

      return workflowsApi.getWorkflowItem(workflowItemId)
    },
    enabled: !!workflowItemId,
  })
}

// Create workflow item mutation
export function useCreateWorkflowItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>) => {
      return workflowsApi.createWorkflowItem(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.project_id], exact: false })
    },
  })
}

// Update workflow item mutation
export function useUpdateWorkflowItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowItem> & { id: string }) => {
      return workflowsApi.updateWorkflowItem(id, updates)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.project_id], exact: false })
    },
  })
}

// Delete workflow item mutation
export function useDeleteWorkflowItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workflowItemId: string) => {
      return workflowsApi.deleteWorkflowItem(workflowItemId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
    },
  })
}

// Update workflow item status
export function useUpdateWorkflowItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ workflowItemId, status }: { workflowItemId: string; status: string }) => {
      return workflowsApi.updateWorkflowItemStatus(workflowItemId, status)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items', data.project_id], exact: false })
    },
  })
}
