// File: /src/features/change-orders/hooks/useChangeOrders.v2.ts
// REFACTORED: Change Orders hooks using new API abstraction layer

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { changeOrdersApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ChangeOrderWithRelations, ChangeOrderDetailWithRelations } from '@/lib/api'
import type { Database } from '@/types/database'

type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']
type ChangeOrderBid = Database['public']['Tables']['change_order_bids']['Row']

/**
 * Fetch all change orders for a project
 * This replaces the old useChangeOrders hook
 */
export function useChangeOrders(projectId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery<ChangeOrderWithRelations[]>({
    queryKey: ['change-orders', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      if (!userProfile?.company_id) {throw new Error('No company ID found')}

      return changeOrdersApi.getProjectChangeOrders(projectId, userProfile.company_id)
    },
    enabled: !!projectId && !!userProfile?.company_id,
  })
}

/**
 * Fetch a single change order by ID
 * This replaces the old useChangeOrder hook
 */
export function useChangeOrder(changeOrderId: string | undefined) {
  return useQuery<ChangeOrderDetailWithRelations | null>({
    queryKey: ['change-orders', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) {throw new Error('Change Order ID required')}
      return changeOrdersApi.getChangeOrder(changeOrderId)
    },
    enabled: !!changeOrderId,
  })
}

/**
 * Create a new change order mutation
 * This replaces the old useCreateChangeOrder hook
 */
export function useCreateChangeOrder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      projectId: string
      workflowTypeId: string
      title: string
      description?: string
      priority?: string
      cost_impact?: number
      schedule_impact?: number
      assignees?: string[]
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      return changeOrdersApi.createChangeOrder(
        input.projectId,
        input.workflowTypeId,
        userProfile.id,
        {
          title: input.title,
          description: input.description,
          priority: input.priority,
          cost_impact: input.cost_impact,
          schedule_impact: input.schedule_impact,
          assignees: input.assignees,
        }
      )
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
    onError: (error) => {
      console.error('Error creating change order:', getErrorMessage(error))
    },
  })
}

/**
 * Update a change order mutation
 * This replaces the old useUpdateChangeOrder hook
 */
export function useUpdateChangeOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; updates: Partial<WorkflowItem> }) => {
      return changeOrdersApi.updateChangeOrder(input.id, input.updates)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.id] })
    },
    onError: (error) => {
      console.error('Error updating change order:', getErrorMessage(error))
    },
  })
}

/**
 * Delete a change order mutation (soft delete)
 * This replaces the old useDeleteChangeOrder hook
 */
export function useDeleteChangeOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (changeOrderId: string) => {
      return changeOrdersApi.deleteChangeOrder(changeOrderId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
    onError: (error) => {
      console.error('Error deleting change order:', getErrorMessage(error))
    },
  })
}

/**
 * Add a comment to a change order mutation
 * This replaces the old useAddChangeOrderComment hook
 */
export function useAddChangeOrderComment() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: { workflowItemId: string; comment: string }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      return changeOrdersApi.addComment(input.workflowItemId, userProfile.id, input.comment)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['change-orders', variables.workflowItemId],
      })
    },
    onError: (error) => {
      console.error('Error adding comment:', getErrorMessage(error))
    },
  })
}

/**
 * Request bids from subcontractors mutation
 * This replaces the old useRequestBids hook
 */
export function useRequestBids() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      workflowItemId: string
      projectId: string
      subcontractorIds: string[]
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      return changeOrdersApi.requestBids(
        input.workflowItemId,
        input.projectId,
        input.subcontractorIds,
        userProfile.id
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['change-orders', variables.workflowItemId],
      })
    },
    onError: (error) => {
      console.error('Error requesting bids:', getErrorMessage(error))
    },
  })
}

/**
 * Award a bid mutation
 * This replaces the old useAwardBid hook
 */
export function useAwardBid() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (bidId: string) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      return changeOrdersApi.awardBid(bidId, userProfile.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
    onError: (error) => {
      console.error('Error awarding bid:', getErrorMessage(error))
    },
  })
}

/**
 * Change order status mutation
 * New hook for status changes
 */
export function useChangeOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { changeOrderId: string; status: string }) => {
      return changeOrdersApi.changeStatus(input.changeOrderId, input.status)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.id] })
    },
    onError: (error) => {
      console.error('Error changing status:', getErrorMessage(error))
    },
  })
}
