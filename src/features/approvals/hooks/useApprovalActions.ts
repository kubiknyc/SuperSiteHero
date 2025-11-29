/**
 * React Query hooks for Approval Actions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalActionsApi } from '@/lib/api/services/approval-actions'
import type { ApprovalActionRecord, ApprovalRequest } from '@/types/approval-workflow'

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch action history for a request
 */
export function useApprovalHistory(requestId: string | undefined) {
  return useQuery({
    queryKey: ['approval-actions', 'history', requestId],
    queryFn: async () => {
      if (!requestId) {throw new Error('Request ID required')}
      return approvalActionsApi.getHistory(requestId)
    },
    enabled: !!requestId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Approve a request
 */
export function useApproveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, comment }: { requestId: string; comment?: string }) => {
      return approvalActionsApi.approve(requestId, comment)
    },
    onSuccess: (data) => {
      invalidateApprovalQueries(queryClient, data)
    },
  })
}

/**
 * Approve a request with conditions
 */
export function useApproveWithConditions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      requestId,
      conditions,
      comment,
    }: {
      requestId: string
      conditions: string
      comment?: string
    }) => {
      return approvalActionsApi.approveWithConditions(requestId, conditions, comment)
    },
    onSuccess: (data) => {
      invalidateApprovalQueries(queryClient, data)
    },
  })
}

/**
 * Reject a request
 */
export function useRejectRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, comment }: { requestId: string; comment: string }) => {
      return approvalActionsApi.reject(requestId, comment)
    },
    onSuccess: (data) => {
      invalidateApprovalQueries(queryClient, data)
    },
  })
}

/**
 * Delegate a request to another user
 */
export function useDelegateRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      requestId,
      toUserId,
      comment,
    }: {
      requestId: string
      toUserId: string
      comment?: string
    }) => {
      return approvalActionsApi.delegate(requestId, toUserId, comment)
    },
    onSuccess: (data) => {
      invalidateApprovalQueries(queryClient, data)
    },
  })
}

/**
 * Add a comment to a request
 */
export function useAddApprovalComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, comment }: { requestId: string; comment: string }) => {
      return approvalActionsApi.addComment(requestId, comment)
    },
    onSuccess: (data) => {
      // Invalidate history for this request
      queryClient.invalidateQueries({
        queryKey: ['approval-actions', 'history', data.request_id],
      })
      // Invalidate the request detail
      queryClient.invalidateQueries({
        queryKey: ['approval-requests', data.request_id],
      })
    },
  })
}

// =============================================
// Helper Functions
// =============================================

/**
 * Invalidate all approval-related queries after an action
 */
function invalidateApprovalQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  data: ApprovalRequest
) {
  // Invalidate specific request
  queryClient.invalidateQueries({
    queryKey: ['approval-requests', data.id],
  })
  // Invalidate request lists
  queryClient.invalidateQueries({
    queryKey: ['approval-requests'],
    exact: false,
  })
  // Invalidate entity status
  queryClient.invalidateQueries({
    queryKey: ['approval-requests', 'entity-status', data.entity_type, data.entity_id],
  })
  // Invalidate pending approvals (counts may have changed)
  queryClient.invalidateQueries({
    queryKey: ['approval-requests', 'pending'],
    exact: false,
  })
  // Invalidate action history
  queryClient.invalidateQueries({
    queryKey: ['approval-actions', 'history', data.id],
  })
  // Invalidate can-approve checks
  queryClient.invalidateQueries({
    queryKey: ['approval-requests', 'can-approve', data.id],
    exact: false,
  })
}

// =============================================
// Notification-enabled Hooks (with toast feedback)
// =============================================

/**
 * Approve with toast notifications
 */
export function useApproveRequestWithNotification(options?: {
  onSuccess?: (data: ApprovalRequest) => void
  onError?: (error: Error) => void
}) {
  const mutation = useApproveRequest()

  return {
    ...mutation,
    mutateAsync: async (params: { requestId: string; comment?: string }) => {
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
 * Approve with conditions and toast notifications
 */
export function useApproveWithConditionsWithNotification(options?: {
  onSuccess?: (data: ApprovalRequest) => void
  onError?: (error: Error) => void
}) {
  const mutation = useApproveWithConditions()

  return {
    ...mutation,
    mutateAsync: async (params: {
      requestId: string
      conditions: string
      comment?: string
    }) => {
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
 * Reject with toast notifications
 */
export function useRejectRequestWithNotification(options?: {
  onSuccess?: (data: ApprovalRequest) => void
  onError?: (error: Error) => void
}) {
  const mutation = useRejectRequest()

  return {
    ...mutation,
    mutateAsync: async (params: { requestId: string; comment: string }) => {
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
 * Add comment with toast notifications
 */
export function useAddApprovalCommentWithNotification(options?: {
  onSuccess?: (data: ApprovalActionRecord) => void
  onError?: (error: Error) => void
}) {
  const mutation = useAddApprovalComment()

  return {
    ...mutation,
    mutateAsync: async (params: { requestId: string; comment: string }) => {
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
