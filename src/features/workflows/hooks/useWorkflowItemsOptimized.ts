// File: /src/features/workflows/hooks/useWorkflowItemsOptimized.ts
// Optimized React Query hooks for workflow items with selective field fetching

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkflowTypeById } from '@/lib/hooks/useWorkflowTypeCache'
import type { Database } from '@/types/database'

type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']
type WorkflowItemInsert = Database['public']['Tables']['workflow_items']['Insert']
type WorkflowItemUpdate = Database['public']['Tables']['workflow_items']['Update']

/**
 * Essential fields for list views - minimal data transfer
 */
const LIST_VIEW_FIELDS = `
  id,
  project_id,
  workflow_type_id,
  title,
  reference_number,
  number,
  status,
  priority,
  due_date,
  created_at,
  raised_by
`

/**
 * Complete fields for detail views
 */
const DETAIL_VIEW_FIELDS = `
  *,
  raised_by_user:users!workflow_items_raised_by_fkey(
    id,
    first_name,
    last_name,
    email
  ),
  created_by_user:users!workflow_items_created_by_fkey(
    id,
    first_name,
    last_name
  )
`

/**
 * Workflow item with essential fields only
 */
interface WorkflowItemEssential {
  id: string
  project_id: string
  workflow_type_id: string
  title: string
  reference_number: string | null
  number: number
  status: string
  priority: string
  due_date: string | null
  created_at: string
  raised_by: string | null
}

/**
 * Workflow item with relations
 */
interface WorkflowItemWithRelations extends WorkflowItem {
  raised_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  created_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

/**
 * Fetch workflow items with optimized field selection
 * Uses essential fields only for list views to reduce data transfer
 */
export function useWorkflowItemsOptimized(
  projectId: string | undefined,
  workflowTypeId?: string,
  options?: {
    fetchFullData?: boolean
    keepPreviousData?: boolean
  }
) {
  // Get workflow type from cache instead of fetching it
  const workflowType = useWorkflowTypeById(workflowTypeId)

  const query = useQuery<(WorkflowItemEssential | WorkflowItemWithRelations)[]>({
    queryKey: ['workflow-items-optimized', projectId, workflowTypeId, options?.fetchFullData],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const fields = options?.fetchFullData ? DETAIL_VIEW_FIELDS : LIST_VIEW_FIELDS

      let query = supabase
        .from('workflow_items')
        .select(fields)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (workflowTypeId) {
        query = query.eq('workflow_type_id', workflowTypeId)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || !Array.isArray(data)) return []
      return data as unknown as (WorkflowItemEssential | WorkflowItemWithRelations)[]
    },
    enabled: !!projectId,
    // Optimization: Keep previous data while fetching for smoother pagination
    placeholderData: options?.keepPreviousData ? (previousData) => previousData : undefined,
    // Cache for 5 minutes, but allow background refetching
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Enrich data with cached workflow type info
  const items = query.data && Array.isArray(query.data) ? query.data : []
  const enrichedData = items.map((item: WorkflowItemEssential | WorkflowItemWithRelations) => ({
    ...item,
    workflowType: workflowType || undefined,
  }))

  return {
    ...query,
    data: enrichedData,
  }
}

/**
 * Fetch single workflow item with full details
 * Always fetches complete data for detail views
 */
export function useWorkflowItemOptimized(workflowItemId: string | undefined) {
  // Get workflow type from cache
  const queryClient = useQueryClient()

  return useQuery<WorkflowItemWithRelations | null>({
    queryKey: ['workflow-item-detail', workflowItemId],
    queryFn: async () => {
      if (!workflowItemId) throw new Error('Workflow item ID required')

      const { data, error } = await supabase
        .from('workflow_items')
        .select(DETAIL_VIEW_FIELDS)
        .eq('id', workflowItemId)
        .single()

      if (error) throw error

      // Try to get workflow type from cache
      const cachedTypes = queryClient.getQueryData<any[]>(['workflow-types-cache'])
      if (cachedTypes && data) {
        const workflowType = cachedTypes.find(t => t.id === data.workflow_type_id)
        return {
          ...data,
          workflowType,
        } as WorkflowItemWithRelations
      }

      return data as WorkflowItemWithRelations
    },
    enabled: !!workflowItemId,
    staleTime: 2 * 60 * 1000, // 2 minutes for detail views
  })
}

/**
 * Create workflow item with optimized cache invalidation
 */
export function useCreateWorkflowItemOptimized() {
  const queryClient = useQueryClient()

  return useMutation<WorkflowItem, Error, Partial<WorkflowItemInsert>>({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('workflow_items')
        .insert(data as WorkflowItemInsert)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      // Invalidate list views but preserve detail views
      queryClient.invalidateQueries({
        queryKey: ['workflow-items-optimized'],
        refetchType: 'active',
      })
      // Add to detail cache immediately
      queryClient.setQueryData(['workflow-item-detail', data.id], data)
    },
  })
}

/**
 * Update workflow item with selective cache invalidation
 */
export function useUpdateWorkflowItemOptimized() {
  const queryClient = useQueryClient()

  return useMutation<WorkflowItem, Error, { id: string } & Partial<WorkflowItemUpdate>>({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates as WorkflowItemUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Update detail cache immediately
      queryClient.setQueryData(['workflow-item-detail', data.id], data)

      // Invalidate list caches that might contain this item
      queryClient.invalidateQueries({
        queryKey: ['workflow-items-optimized', data.project_id],
        refetchType: 'active',
      })
    },
  })
}

/**
 * Batch fetch workflow items by IDs
 * Useful for fetching related items without N+1 queries
 */
export function useBatchWorkflowItems(itemIds: string[]) {
  return useQuery<WorkflowItemEssential[]>({
    queryKey: ['workflow-items-batch', itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return []

      const { data, error } = await supabase
        .from('workflow_items')
        .select(LIST_VIEW_FIELDS)
        .in('id', itemIds)

      if (error) throw error
      if (!data || !Array.isArray(data)) return []
      return data as unknown as WorkflowItemEssential[]
    },
    enabled: itemIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Prefetch workflow items for improved perceived performance
 */
export function usePrefetchWorkflowItems(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return async (workflowTypeId?: string) => {
    if (!projectId) return

    await queryClient.prefetchQuery({
      queryKey: ['workflow-items-optimized', projectId, workflowTypeId, false],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('workflow_items')
          .select(LIST_VIEW_FIELDS)
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}