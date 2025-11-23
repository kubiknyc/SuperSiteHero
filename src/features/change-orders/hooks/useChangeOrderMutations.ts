// File: /src/features/change-orders/hooks/useChangeOrderMutations.ts
// Change order mutation hooks WITH notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

// Type aliases
type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']
type ChangeOrderBid = Database['public']['Tables']['change_order_bids']['Row']
type WorkflowItemComment = Database['public']['Tables']['workflow_item_comments']['Row']

/**
 * Create a new change order with automatic success/error notifications
 */
export function useCreateChangeOrderWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    {
      project_id: string
      workflow_type_id: string
      title: string
      description?: string | null
      priority?: string
      cost_impact?: number | null
      schedule_impact?: number | null
      assignees?: string[]
    }
  >({
    mutationFn: async (changeOrder) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      // Get next number for this workflow type
      const { data: lastItem } = await supabase
        .from('workflow_items')
        .select('number')
        .eq('project_id', changeOrder.project_id)
        .eq('workflow_type_id', changeOrder.workflow_type_id)
        .order('number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (lastItem?.number || 0) + 1

      const { data, error } = await supabase
        .from('workflow_items')
        .insert({
          project_id: changeOrder.project_id,
          workflow_type_id: changeOrder.workflow_type_id,
          title: changeOrder.title,
          description: changeOrder.description || null,
          priority: changeOrder.priority || 'normal',
          cost_impact: changeOrder.cost_impact || null,
          schedule_impact: changeOrder.schedule_impact || null,
          assignees: changeOrder.assignees || [],
          number: nextNumber,
          status: 'draft',
          created_by: userProfile.id,
          raised_by: userProfile.id,
        } as Database['public']['Tables']['workflow_items']['Insert'])
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    },
    successMessage: (data) => `Change Order #${data.number} created successfully`,
    errorMessage: (error) => `Failed to create change order: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.project_id] })
    },
  })
}

/**
 * Update a change order with automatic success/error notifications
 */
export function useUpdateChangeOrderWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    { id: string; updates: Partial<Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    },
    successMessage: (data) => `Change Order #${data.number} updated successfully`,
    errorMessage: (error) => `Failed to update change order: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.id] })
    },
  })
}

/**
 * Delete a change order with automatic success/error notifications
 */
export function useDeleteChangeOrderWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (changeOrderId) => {
      const { error } = await supabase
        .from('workflow_items')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', changeOrderId)

      if (error) throw error
    },
    successMessage: 'Change order deleted successfully',
    errorMessage: (error) => `Failed to delete change order: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}

/**
 * Update change order status with automatic notifications
 */
export function useUpdateChangeOrderStatusWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    WorkflowItem,
    Error,
    { changeOrderId: string; status: string }
  >({
    mutationFn: async ({ changeOrderId, status }) => {
      const { data, error } = await supabase
        .from('workflow_items')
        .update({ status } as any)
        .eq('id', changeOrderId)
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    },
    successMessage: (data) => `Status updated to "${data.status}"`,
    errorMessage: (error) => `Failed to update status: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.id] })
    },
  })
}

/**
 * Add a comment to a change order with automatic notifications
 */
export function useAddChangeOrderCommentWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    WorkflowItemComment,
    Error,
    { workflow_item_id: string; comment: string }
  >({
    mutationFn: async ({ workflow_item_id, comment }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('workflow_item_comments')
        .insert({
          workflow_item_id,
          comment,
          mentioned_users: [],
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItemComment
    },
    successMessage: 'Comment added successfully',
    errorMessage: (error) => `Failed to add comment: ${error.message}`,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', variables.workflow_item_id] })
    },
  })
}

/**
 * Request bids from subcontractors with automatic notifications
 */
export function useRequestBidsWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    ChangeOrderBid[],
    Error,
    {
      workflow_item_id: string
      project_id: string
      subcontractor_ids: string[]
    }
  >({
    mutationFn: async ({ workflow_item_id, project_id, subcontractor_ids }) => {
      const bids = subcontractor_ids.map((subcontractor_id) => ({
        workflow_item_id,
        project_id,
        subcontractor_id,
        bid_status: 'requested' as const,
        is_awarded: false,
        submitted_by: userProfile?.id || null,
      }))

      const { data, error } = await supabase
        .from('change_order_bids')
        .insert(bids as any)
        .select()

      if (error) throw error
      return data as ChangeOrderBid[]
    },
    successMessage: (data) => `Bids requested from ${data.length} subcontractor${data.length !== 1 ? 's' : ''}`,
    errorMessage: (error) => `Failed to request bids: ${error.message}`,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', variables.workflow_item_id] })
    },
  })
}

/**
 * Award a bid with automatic notifications
 */
export function useAwardBidWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    ChangeOrderBid,
    Error,
    string
  >({
    mutationFn: async (bidId) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      // Get the bid to find workflow_item_id
      const { data: bid, error: bidError } = await supabase
        .from('change_order_bids')
        .select('workflow_item_id')
        .eq('id', bidId)
        .single()

      if (bidError) throw bidError
      if (!bid) throw new Error('Bid not found')

      // Unmark all other bids for this CO
      await supabase
        .from('change_order_bids')
        .update({ is_awarded: false } as any)
        .eq('workflow_item_id', bid.workflow_item_id)

      // Award this bid
      const { data, error } = await supabase
        .from('change_order_bids')
        .update({
          is_awarded: true,
          bid_status: 'awarded',
          awarded_at: new Date().toISOString(),
          awarded_by: userProfile.id,
        })
        .eq('id', bidId)
        .select()
        .single()

      if (error) throw error
      return data as ChangeOrderBid
    },
    successMessage: 'Bid awarded successfully',
    errorMessage: (error) => `Failed to award bid: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}
