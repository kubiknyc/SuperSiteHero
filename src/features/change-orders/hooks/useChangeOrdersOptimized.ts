// File: /src/features/change-orders/hooks/useChangeOrdersOptimized.ts
// Optimized React Query hooks for change orders with selective field fetching

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { useWorkflowTypeByName, useWorkflowTypeCache } from '@/lib/hooks/useWorkflowTypeCache'
import type { Database } from '@/types/database'

// Type aliases from Database
type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']
type WorkflowItemInsert = Database['public']['Tables']['workflow_items']['Insert']
type WorkflowItemUpdate = Database['public']['Tables']['workflow_items']['Update']
type ChangeOrderBid = Database['public']['Tables']['change_order_bids']['Row']
type ChangeOrderBidInsert = Database['public']['Tables']['change_order_bids']['Insert']
type ChangeOrderBidUpdate = Database['public']['Tables']['change_order_bids']['Update']
type WorkflowItemComment = Database['public']['Tables']['workflow_item_comments']['Row']
type WorkflowItemCommentInsert = Database['public']['Tables']['workflow_item_comments']['Insert']

/**
 * Essential fields for change order list views
 */
const CHANGE_ORDER_LIST_FIELDS = `
  id,
  project_id,
  workflow_type_id,
  title,
  reference_number,
  number,
  status,
  priority,
  cost_impact,
  schedule_impact,
  due_date,
  created_at,
  raised_by,
  raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name)
`

/**
 * Fields for change order cards with bid summary
 */
const CHANGE_ORDER_CARD_FIELDS = `
  id,
  project_id,
  workflow_type_id,
  title,
  reference_number,
  number,
  status,
  priority,
  cost_impact,
  schedule_impact,
  due_date,
  created_at,
  raised_by,
  raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name),
  bids:change_order_bids(count)
`

/**
 * Complete fields for change order detail views
 */
const CHANGE_ORDER_DETAIL_FIELDS = `
  *,
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
`

// Type for list view change orders
interface ChangeOrderListItem {
  id: string
  project_id: string
  workflow_type_id: string
  title: string
  reference_number: string | null
  number: number
  status: string
  priority: string
  cost_impact: number | null
  schedule_impact: number | null
  due_date: string | null
  created_at: string
  raised_by: string | null
  raised_by_user?: {
    first_name: string
    last_name: string
  }
}

// Type for card view with bid count
interface ChangeOrderCardItem extends ChangeOrderListItem {
  bids?: { count: number }[]
}

// Type for detailed change order
type ChangeOrderDetailWithRelations = WorkflowItem & {
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

/**
 * Fetch change orders with optimized field selection
 * @param projectId - The project ID
 * @param viewType - Type of view determining field selection
 */
export function useChangeOrdersOptimized(
  projectId: string | undefined,
  viewType: 'list' | 'card' | 'full' = 'list'
) {
  const { userProfile } = useAuth()

  // Use cached workflow type instead of fetching every time
  const changeOrderType = useWorkflowTypeByName('change order')

  const query = useQuery({
    queryKey: ['change-orders-optimized', projectId, viewType],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      if (!userProfile?.company_id) {throw new Error('No company ID found')}

      // Get workflow type ID from cache or fetch if needed
      let workflowTypeId = changeOrderType?.id

      if (!workflowTypeId) {
        const { data: workflowTypes, error: wtError } = await supabase
          .from('workflow_types')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .ilike('name_singular', '%change%order%')
          .single()

        if (wtError) {throw wtError}
        if (!workflowTypes) {throw new Error('Change order workflow type not found')}
        workflowTypeId = workflowTypes.id
      }

      // Select appropriate fields based on view type
      let fields = CHANGE_ORDER_LIST_FIELDS
      if (viewType === 'card') {
        fields = CHANGE_ORDER_CARD_FIELDS
      } else if (viewType === 'full') {
        fields = CHANGE_ORDER_DETAIL_FIELDS
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .select(fields)
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data || []
    },
    enabled: !!projectId && !!userProfile?.company_id,
    // Keep data fresh but use cache when possible
    staleTime: viewType === 'list' ? 5 * 60 * 1000 : 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Keep previous data for smoother transitions
    placeholderData: (previousData) => previousData,
  })

  // Enrich with cached workflow type
  const items = query.data && Array.isArray(query.data) ? query.data : []
  const enrichedData = items.map(item => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      return {
        ...(item as Record<string, any>),
        workflowType: changeOrderType || undefined,
      }
    }
    return item
  })

  return {
    ...query,
    data: enrichedData,
  }
}

/**
 * Fetch single change order with full details
 * Uses aggressive caching for detail views
 */
export function useChangeOrderOptimized(changeOrderId: string | undefined) {
  return useQuery<ChangeOrderDetailWithRelations | null>({
    queryKey: ['change-order-detail', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) {throw new Error('Change Order ID required')}

      const { data, error } = await supabase
        .from('workflow_items')
        .select(CHANGE_ORDER_DETAIL_FIELDS)
        .eq('id', changeOrderId)
        .single()

      if (error) {throw error}
      return data as any as ChangeOrderDetailWithRelations
    },
    enabled: !!changeOrderId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Create change order with optimized cache updates
 */
export function useCreateChangeOrderOptimized() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const changeOrderType = useWorkflowTypeByName('change order')

  return useMutation<WorkflowItem, Error, Partial<WorkflowItem> & { project_id: string; title: string }>({
    mutationFn: async (changeOrder) => {
      if (!userProfile?.id) {throw new Error('User profile required')}

      // Use cached workflow type ID
      const workflowTypeId = changeOrderType?.id || changeOrder.workflow_type_id
      if (!workflowTypeId) {throw new Error('Workflow type ID required')}

      // Get next number for this workflow type
      const { data: lastItem } = await supabase
        .from('workflow_items')
        .select('number')
        .eq('project_id', changeOrder.project_id)
        .eq('workflow_type_id', workflowTypeId)
        .order('number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (lastItem?.number || 0) + 1

      const insertData = {
        project_id: changeOrder.project_id,
        workflow_type_id: workflowTypeId,
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

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      // Invalidate list views
      queryClient.invalidateQueries({
        queryKey: ['change-orders-optimized', data.project_id],
        refetchType: 'active',
      })
      // Immediately cache the new detail
      queryClient.setQueryData(['change-order-detail', data.id], data)
    },
  })
}

/**
 * Update change order with selective cache invalidation
 */
export function useUpdateChangeOrderOptimized() {
  const queryClient = useQueryClient()

  return useMutation<WorkflowItem, Error, Partial<WorkflowItem> & { id: string }>({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates as WorkflowItemUpdate as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      // Update detail cache immediately
      queryClient.setQueryData(['change-order-detail', data.id], (old: any) => ({
        ...old,
        ...data,
      }))
      // Invalidate list views
      queryClient.invalidateQueries({
        queryKey: ['change-orders-optimized', data.project_id],
        refetchType: 'active',
      })
    },
    onError: (error, variables) => {
      // Optionally rollback optimistic updates
      queryClient.invalidateQueries({
        queryKey: ['change-order-detail', variables.id],
      })
    },
  })
}

/**
 * Batch fetch change order summaries
 * Useful for dashboard widgets
 */
export function useChangeOrderSummary(projectId: string | undefined) {
  const { userProfile } = useAuth()
  const changeOrderType = useWorkflowTypeByName('change order')

  return useQuery({
    queryKey: ['change-orders-summary', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      if (!userProfile?.company_id) {throw new Error('No company ID found')}

      const workflowTypeId = changeOrderType?.id
      if (!workflowTypeId) {throw new Error('Change order type not found')}

      // Fetch aggregated data
      const { data, error } = await supabase
        .rpc('get_change_order_summary' as any, {
          p_project_id: projectId,
          p_workflow_type_id: workflowTypeId,
        })

      if (error) {throw error}

      // If RPC doesn't exist, fall back to manual aggregation
      if (!data) {
        const { data: items, error: itemsError } = await supabase
          .from('workflow_items')
          .select('status, cost_impact')
          .eq('project_id', projectId)
          .eq('workflow_type_id', workflowTypeId)
          .is('deleted_at', null)

        if (itemsError) {throw itemsError}

        const summary = {
          total: items?.length || 0,
          draft: items?.filter(i => i.status === 'draft').length || 0,
          pending: items?.filter(i => i.status === 'pending').length || 0,
          approved: items?.filter(i => i.status === 'approved').length || 0,
          rejected: items?.filter(i => i.status === 'rejected').length || 0,
          total_cost_impact: items?.reduce((sum, i) => sum + (i.cost_impact || 0), 0) || 0,
        }

        return summary
      }

      return data
    },
    enabled: !!projectId && !!userProfile?.company_id && !!changeOrderType,
    staleTime: 5 * 60 * 1000, // Summary data can be cached longer
    gcTime: 15 * 60 * 1000,
  })
}

/**
 * Prefetch change orders for improved navigation
 */
export function usePrefetchChangeOrders() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const changeOrderType = useWorkflowTypeByName('change order')

  return async (projectId: string) => {
    if (!userProfile?.company_id || !changeOrderType?.id) {return}

    await queryClient.prefetchQuery({
      queryKey: ['change-orders-optimized', projectId, 'list'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('workflow_items')
          .select(CHANGE_ORDER_LIST_FIELDS)
          .eq('project_id', projectId)
          .eq('workflow_type_id', changeOrderType.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20) // Prefetch only first page

        if (error) {throw error}
        return data || []
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}