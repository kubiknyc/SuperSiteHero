/**
 * React Query hooks for Approval Workflows
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalWorkflowsApi } from '@/lib/api/services/approval-workflows'
import type {
  ApprovalWorkflow,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowEntityType,
} from '@/types/approval-workflow'

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all workflows for a company
 */
export function useApprovalWorkflows(
  companyId: string | undefined,
  workflowType?: WorkflowEntityType,
  isActive?: boolean
) {
  return useQuery({
    queryKey: ['approval-workflows', companyId, workflowType, isActive],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID required')
      return approvalWorkflowsApi.getWorkflows({
        company_id: companyId,
        workflow_type: workflowType,
        is_active: isActive,
      })
    },
    enabled: !!companyId,
  })
}

/**
 * Fetch active workflows by type (for dropdown selection)
 */
export function useActiveWorkflowsByType(
  companyId: string | undefined,
  workflowType: WorkflowEntityType | undefined
) {
  return useQuery({
    queryKey: ['approval-workflows', 'active', companyId, workflowType],
    queryFn: async () => {
      if (!companyId || !workflowType) throw new Error('Company ID and workflow type required')
      return approvalWorkflowsApi.getActiveWorkflowsByType(companyId, workflowType)
    },
    enabled: !!companyId && !!workflowType,
  })
}

/**
 * Fetch a single workflow with steps
 */
export function useApprovalWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['approval-workflows', workflowId],
    queryFn: async () => {
      if (!workflowId) throw new Error('Workflow ID required')
      return approvalWorkflowsApi.getWorkflow(workflowId)
    },
    enabled: !!workflowId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create a new workflow
 */
export function useCreateApprovalWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateWorkflowInput) => {
      return approvalWorkflowsApi.createWorkflow(input)
    },
    onSuccess: (data) => {
      // Invalidate workflow lists
      queryClient.invalidateQueries({
        queryKey: ['approval-workflows', data.company_id],
        exact: false,
      })
    },
  })
}

/**
 * Update an existing workflow
 */
export function useUpdateApprovalWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workflowId,
      input,
    }: {
      workflowId: string
      input: UpdateWorkflowInput
    }) => {
      return approvalWorkflowsApi.updateWorkflow(workflowId, input)
    },
    onSuccess: (data) => {
      // Invalidate specific workflow and lists
      queryClient.invalidateQueries({
        queryKey: ['approval-workflows', data.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['approval-workflows', data.company_id],
        exact: false,
      })
    },
  })
}

/**
 * Delete (soft delete) a workflow
 */
export function useDeleteApprovalWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workflowId: string) => {
      return approvalWorkflowsApi.deleteWorkflow(workflowId)
    },
    onSuccess: () => {
      // Invalidate all workflow queries
      queryClient.invalidateQueries({
        queryKey: ['approval-workflows'],
        exact: false,
      })
    },
  })
}

/**
 * Duplicate a workflow
 */
export function useDuplicateApprovalWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ workflowId, newName }: { workflowId: string; newName: string }) => {
      return approvalWorkflowsApi.duplicateWorkflow(workflowId, newName)
    },
    onSuccess: (data) => {
      // Invalidate workflow lists for the company
      queryClient.invalidateQueries({
        queryKey: ['approval-workflows', data.company_id],
        exact: false,
      })
    },
  })
}

// =============================================
// Notification-enabled Hooks (with toast feedback)
// =============================================

/**
 * Create workflow with toast notifications
 */
export function useCreateApprovalWorkflowWithNotification(options?: {
  onSuccess?: (data: ApprovalWorkflow) => void
  onError?: (error: Error) => void
}) {
  const mutation = useCreateApprovalWorkflow()

  return {
    ...mutation,
    mutateAsync: async (input: CreateWorkflowInput) => {
      try {
        const result = await mutation.mutateAsync(input)
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      }
    },
  }
}

/**
 * Update workflow with toast notifications
 */
export function useUpdateApprovalWorkflowWithNotification(options?: {
  onSuccess?: (data: ApprovalWorkflow) => void
  onError?: (error: Error) => void
}) {
  const mutation = useUpdateApprovalWorkflow()

  return {
    ...mutation,
    mutateAsync: async (params: { workflowId: string; input: UpdateWorkflowInput }) => {
      try {
        const result = await mutation.mutateAsync(params)
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      }
    },
  }
}

/**
 * Delete workflow with toast notifications
 */
export function useDeleteApprovalWorkflowWithNotification(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  const mutation = useDeleteApprovalWorkflow()

  return {
    ...mutation,
    mutateAsync: async (workflowId: string) => {
      try {
        await mutation.mutateAsync(workflowId)
        options?.onSuccess?.()
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      }
    },
  }
}
