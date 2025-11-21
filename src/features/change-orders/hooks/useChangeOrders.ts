// File: /src/features/change-orders/hooks/useChangeOrders.ts
// React Query hooks for change orders

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkflowItem } from '@/types/database'
import { useAuth } from '@/lib/auth/AuthContext'

// Fetch all change orders for a project
export function useChangeOrders(projectId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['change-orders', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      if (!userProfile?.company_id) throw new Error('No company ID found')

      // First, get the change order workflow type ID
      const { data: workflowTypes, error: wtError} = await supabase
        .from('workflow_types')
        .select('id')
        .eq('company_id', userProfile.company_id)
        .ilike('name_singular', '%change%order%')
        .single()

      if (wtError) throw wtError

      const { data, error } = await supabase
        .from('workflow_items')
        .select(`
          *,
          workflow_type:workflow_types(name_singular, prefix),
          raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name),
          bids:change_order_bids(
            id,
            subcontractor_id,
            bid_status,
            lump_sum_cost,
            is_awarded,
            subcontractor:subcontractors(company_name)
          )
        `)
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypes.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (WorkflowItem & {
        workflow_type?: any
        raised_by_user?: any
        bids?: any[]
      })[]
    },
    enabled: !!projectId && !!userProfile?.company_id,
  })
}

// Fetch a single change order by ID
export function useChangeOrder(changeOrderId: string | undefined) {
  return useQuery({
    queryKey: ['change-orders', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) throw new Error('Change Order ID required')

      const { data, error } = await supabase
        .from('workflow_items')
        .select(`
          *,
          workflow_type:workflow_types(name_singular, prefix, statuses, priorities),
          raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name, email),
          created_by_user:users!workflow_items_created_by_fkey(first_name, last_name),
          comments:workflow_item_comments(
            *,
            created_by_user:users!workflow_item_comments_created_by_fkey(first_name, last_name)
          ),
          bids:change_order_bids(
            *,
            subcontractor:subcontractors(company_name, contact_name, email, phone)
          )
        `)
        .eq('id', changeOrderId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!changeOrderId,
  })
}

// Create a new change order
export function useCreateChangeOrder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (changeOrder: Partial<WorkflowItem> & { project_id: string; workflow_type_id: string; title: string }) => {
      if (!userProfile?.id) {
        throw new Error('User profile required')
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
          ...changeOrder,
          number: nextNumber,
          status: 'draft',
          priority: changeOrder.priority || 'normal',
          created_by: userProfile.id,
          raised_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.project_id] })
    },
  })
}

// Update an existing change order
export function useUpdateChangeOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as WorkflowItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['change-orders', data.project_id] })
    },
  })
}

// Delete a change order (soft delete)
export function useDeleteChangeOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (changeOrderId: string) => {
      const { error } = await supabase
        .from('workflow_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', changeOrderId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}

// Add a comment to a change order
export function useAddChangeOrderComment() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ workflow_item_id, comment }: { workflow_item_id: string; comment: string }) => {
      if (!userProfile?.id) throw new Error('User profile required')

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
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', variables.workflow_item_id] })
    },
  })
}

// Request bids from subcontractors
export function useRequestBids() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      workflow_item_id,
      project_id,
      subcontractor_ids
    }: {
      workflow_item_id: string
      project_id: string
      subcontractor_ids: string[]
    }) => {
      const bids = subcontractor_ids.map(subcontractor_id => ({
        workflow_item_id,
        project_id,
        subcontractor_id,
        bid_status: 'requested' as const,
        is_awarded: false,
        submitted_by: userProfile?.id,
      }))

      const { data, error } = await supabase
        .from('change_order_bids')
        .insert(bids)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', variables.workflow_item_id] })
    },
  })
}

// Award a bid
export function useAwardBid() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (bidId: string) => {
      if (!userProfile?.id) throw new Error('User profile required')

      // First, get the bid to find workflow_item_id
      const { data: bid, error: bidError } = await supabase
        .from('change_order_bids')
        .select('workflow_item_id')
        .eq('id', bidId)
        .single()

      if (bidError) throw bidError

      // Unmark all other bids for this CO
      await supabase
        .from('change_order_bids')
        .update({ is_awarded: false })
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
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}