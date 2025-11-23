// File: /src/features/change-orders/hooks/useChangeOrders.ts
// React Query hooks for change orders

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useAuth } from '@/lib/auth/AuthContext'

// Type aliases from Database
type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']
type WorkflowItemInsert = Database['public']['Tables']['workflow_items']['Insert']
type WorkflowItemUpdate = Database['public']['Tables']['workflow_items']['Update']
type ChangeOrderBid = Database['public']['Tables']['change_order_bids']['Row']
type ChangeOrderBidInsert = Database['public']['Tables']['change_order_bids']['Insert']
type ChangeOrderBidUpdate = Database['public']['Tables']['change_order_bids']['Update']
type WorkflowItemComment = Database['public']['Tables']['workflow_item_comments']['Row']
type WorkflowItemCommentInsert = Database['public']['Tables']['workflow_item_comments']['Insert']

// Type definitions for complex queries with relations
type ChangeOrderWithRelations = WorkflowItem & {
  workflow_type?: {
    name_singular: string
    prefix: string | null
  }
  raised_by_user?: {
    first_name: string
    last_name: string
  }
  bids?: (ChangeOrderBid & {
    subcontractor?: {
      company_name: string
    }
  })[]
}

type ChangeOrderDetailWithRelations = WorkflowItem & {
  workflow_type?: {
    name_singular: string
    prefix: string | null
    statuses: any
    priorities: any
  }
  raised_by_user?: {
    first_name: string
    last_name: string
    email: string
  }
  created_by_user?: {
    first_name: string
    last_name: string
  }
  comments?: (WorkflowItemComment & {
    created_by_user?: {
      first_name: string
      last_name: string
    }
  })[]
  bids?: (ChangeOrderBid & {
    subcontractor?: {
      company_name: string
      contact_name: string | null
      email: string | null
      phone: string | null
    }
  })[]
}

// Fetch all change orders for a project
export function useChangeOrders(projectId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery<ChangeOrderWithRelations[]>({
    queryKey: ['change-orders', projectId],
    queryFn: async (): Promise<ChangeOrderWithRelations[]> => {
      if (!projectId) throw new Error('Project ID required')

      if (!userProfile?.company_id) throw new Error('No company ID found')

      // First, get the change order workflow type ID
      const { data: workflowTypes, error: wtError } = await supabase
        .from('workflow_types')
        .select('id')
        .eq('company_id', userProfile.company_id)
        .ilike('name_singular', '%change%order%')
        .single()

      if (wtError) throw wtError
      if (!workflowTypes) throw new Error('Change order workflow type not found')

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
      return (data || []) as ChangeOrderWithRelations[]
    },
    enabled: !!projectId && !!userProfile?.company_id,
  })
}

// Fetch a single change order by ID
export function useChangeOrder(changeOrderId: string | undefined) {
  return useQuery<ChangeOrderDetailWithRelations | null>({
    queryKey: ['change-orders', changeOrderId],
    queryFn: async (): Promise<ChangeOrderDetailWithRelations | null> => {
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
      return data as ChangeOrderDetailWithRelations | null
    },
    enabled: !!changeOrderId,
  })
}

// Create a new change order
export function useCreateChangeOrder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation<WorkflowItem, Error, Partial<WorkflowItem> & { project_id: string; workflow_type_id: string; title: string }>({
    mutationFn: async (changeOrder): Promise<WorkflowItem> => {
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

      const insertData = {
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
      } as const

      const { data, error } = await supabase
        .from('workflow_items')
        .insert(insertData as WorkflowItemInsert as any)
        .select()
        .single()

      if (error) throw error
      return data
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

  return useMutation<WorkflowItem, Error, Partial<WorkflowItem> & { id: string }>({
    mutationFn: async ({ id, ...updates }): Promise<WorkflowItem> => {
      const updateData: WorkflowItemUpdate = updates

      const { data, error } = await supabase
        .from('workflow_items')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
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

  return useMutation<void, Error, string>({
    mutationFn: async (changeOrderId: string): Promise<void> => {
      const updateData: WorkflowItemUpdate = {
        deleted_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('workflow_items')
        .update(updateData as any)
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

  return useMutation<WorkflowItemComment, Error, { workflow_item_id: string; comment: string }>({
    mutationFn: async ({ workflow_item_id, comment }): Promise<WorkflowItemComment> => {
      if (!userProfile?.id) throw new Error('User profile required')

      const insertData = {
        workflow_item_id,
        comment,
        mentioned_users: [] as string[],
        created_by: userProfile.id,
      }

      const { data, error } = await supabase
        .from('workflow_item_comments')
        .insert(insertData as WorkflowItemCommentInsert as any)
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

  type RequestBidsInput = {
    workflow_item_id: string
    project_id: string
    subcontractor_ids: string[]
  }

  return useMutation<ChangeOrderBid[], Error, RequestBidsInput>({
    mutationFn: async ({
      workflow_item_id,
      project_id,
      subcontractor_ids
    }): Promise<ChangeOrderBid[]> => {
      const bids = subcontractor_ids.map(subcontractor_id => ({
        workflow_item_id,
        project_id,
        subcontractor_id,
        bid_status: 'requested' as const,
        is_awarded: false,
        submitted_by: userProfile?.id || null,
      }))

      const { data, error } = await supabase
        .from('change_order_bids')
        .insert(bids as ChangeOrderBidInsert[] as any)
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

  return useMutation<ChangeOrderBid, Error, string>({
    mutationFn: async (bidId: string): Promise<ChangeOrderBid> => {
      if (!userProfile?.id) throw new Error('User profile required')

      // First, get the bid to find workflow_item_id
      const { data: bid, error: bidError } = await supabase
        .from('change_order_bids')
        .select('workflow_item_id')
        .eq('id', bidId)
        .single()

      if (bidError) throw bidError
      if (!bid) throw new Error('Bid not found')

      // Unmark all other bids for this CO
      const unmarkUpdate: ChangeOrderBidUpdate = { is_awarded: false }
      await supabase
        .from('change_order_bids')
        .update(unmarkUpdate as any)
        .eq('workflow_item_id', bid.workflow_item_id)

      // Award this bid
      const awardUpdate: ChangeOrderBidUpdate = {
        is_awarded: true,
        bid_status: 'awarded',
        awarded_at: new Date().toISOString(),
        awarded_by: userProfile.id,
      }

      const { data, error } = await supabase
        .from('change_order_bids')
        .update(awardUpdate as any)
        .eq('id', bidId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
    },
  })
}