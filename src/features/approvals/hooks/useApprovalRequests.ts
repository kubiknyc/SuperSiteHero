/**
 * React Query hooks for Approval Requests
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalRequestsApi } from '@/lib/api/services/approval-requests'
import type {
  ApprovalRequest,
  ApprovalRequestFilters,
  CreateApprovalRequestInput,
  WorkflowEntityType,
} from '@/types/approval-workflow'
import { logger } from '../../../lib/utils/logger';


// =============================================
// Query Hooks
// =============================================

/**
 * Fetch approval requests with optional filters
 */
export function useApprovalRequests(filters?: ApprovalRequestFilters) {
  return useQuery({
    queryKey: ['approval-requests', filters],
    queryFn: async () => {
      try {
        return await approvalRequestsApi.getRequests(filters)
      } catch (_error) {
        // Log the actual error for debugging
        logger.error('[useApprovalRequests] Query failed:', _error)
        // Return empty array on error (DB tables may not exist)
        return []
      }
    },
    retry: false, // Don't retry if DB tables don't exist
    staleTime: 0, // Always refetch to avoid cached malformed queries
  })
}

/**
 * Fetch a single approval request with full details
 */
export function useApprovalRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ['approval-requests', requestId],
    queryFn: async () => {
      if (!requestId) {throw new Error('Request ID required')}
      return approvalRequestsApi.getRequest(requestId)
    },
    enabled: !!requestId,
  })
}

/**
 * Fetch pending approvals for current user
 */
export function usePendingApprovals(userId: string | undefined) {
  return useQuery({
    queryKey: ['approval-requests', 'pending', userId],
    queryFn: async () => {
      if (!userId) {throw new Error('User ID required')}
      try {
        return await approvalRequestsApi.getPendingForUser(userId)
      } catch {
        // Return empty summary on error (DB tables may not exist)
        return { total: 0, by_type: { document: 0, submittal: 0, rfi: 0, change_order: 0 }, requests: [] }
      }
    },
    enabled: !!userId,
    // Refresh frequently to keep badge counts up to date
    refetchInterval: 30000, // 30 seconds
    retry: false, // Don't retry if DB tables don't exist
  })
}

/**
 * Get approval status for a specific entity
 * Useful for showing status badge on documents, submittals, etc.
 */
export function useEntityApprovalStatus(
  entityType: WorkflowEntityType | undefined,
  entityId: string | undefined
) {
  return useQuery({
    queryKey: ['approval-requests', 'entity-status', entityType, entityId],
    queryFn: async () => {
      if (!entityType || !entityId) {throw new Error('Entity type and ID required')}
      return approvalRequestsApi.getEntityStatus(entityType, entityId)
    },
    enabled: !!entityType && !!entityId,
  })
}

/**
 * Check if current user can approve a request
 */
export function useCanUserApprove(requestId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['approval-requests', 'can-approve', requestId, userId],
    queryFn: async () => {
      if (!requestId || !userId) {return false}
      return approvalRequestsApi.canUserApprove(requestId, userId)
    },
    enabled: !!requestId && !!userId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create a new approval request
 */
export function useCreateApprovalRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateApprovalRequestInput) => {
      return approvalRequestsApi.createRequest(input)
    },
    onSuccess: (data) => {
      // Invalidate request lists
      queryClient.invalidateQueries({
        queryKey: ['approval-requests'],
        exact: false,
      })
      // Invalidate entity status
      queryClient.invalidateQueries({
        queryKey: ['approval-requests', 'entity-status', data.entity_type, data.entity_id],
      })
      // Invalidate pending approvals
      queryClient.invalidateQueries({
        queryKey: ['approval-requests', 'pending'],
        exact: false,
      })
    },
  })
}

/**
 * Cancel an approval request
 */
export function useCancelApprovalRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => {
      return approvalRequestsApi.cancelRequest(requestId)
    },
    onSuccess: (data) => {
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
      // Invalidate pending approvals
      queryClient.invalidateQueries({
        queryKey: ['approval-requests', 'pending'],
        exact: false,
      })
    },
  })
}

// =============================================
// Notification-enabled Hooks (with toast feedback)
// =============================================

/**
 * Create request with toast notifications
 */
export function useCreateApprovalRequestWithNotification(options?: {
  onSuccess?: (data: ApprovalRequest) => void
  onError?: (error: Error) => void
}) {
  const mutation = useCreateApprovalRequest()

  return {
    ...mutation,
    mutateAsync: async (input: CreateApprovalRequestInput) => {
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
 * Cancel request with toast notifications
 */
export function useCancelApprovalRequestWithNotification(options?: {
  onSuccess?: (data: ApprovalRequest) => void
  onError?: (error: Error) => void
}) {
  const mutation = useCancelApprovalRequest()

  return {
    ...mutation,
    mutateAsync: async (requestId: string) => {
      try {
        const result = await mutation.mutateAsync(requestId)
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      }
    },
  }
}
