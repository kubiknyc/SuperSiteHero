// File: /src/features/cost-estimates/hooks/useCostEstimates.ts
// React Query hooks for cost estimates CRUD operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { costEstimatesApi, type CostEstimateWithItems } from '@/lib/api/services/cost-estimates'
import type {
  CostEstimate,
  CostEstimateInsert,
  CostEstimateUpdate,
  CostEstimateItem,
  CostEstimateItemInsert,
  CostEstimateItemUpdate,
} from '@/types/database-extensions'
import { toast } from 'sonner'

// Query keys for cost estimates
export const costEstimateKeys = {
  all: ['cost-estimates'] as const,
  lists: () => [...costEstimateKeys.all, 'list'] as const,
  list: (projectId: string) => [...costEstimateKeys.lists(), projectId] as const,
  details: () => [...costEstimateKeys.all, 'detail'] as const,
  detail: (estimateId: string) => [...costEstimateKeys.details(), estimateId] as const,
  items: (estimateId: string) => [...costEstimateKeys.detail(estimateId), 'items'] as const,
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all cost estimates for a project
 */
export function useProjectEstimates(projectId: string | undefined) {
  return useQuery({
    queryKey: costEstimateKeys.list(projectId!),
    queryFn: () => costEstimatesApi.getProjectEstimates(projectId!),
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Fetch a single cost estimate with its line items
 */
export function useEstimate(estimateId: string | undefined) {
  return useQuery({
    queryKey: costEstimateKeys.detail(estimateId!),
    queryFn: () => costEstimatesApi.getEstimateById(estimateId!),
    enabled: !!estimateId,
    staleTime: 30000,
  })
}

/**
 * Fetch line items for a cost estimate
 */
export function useEstimateItems(estimateId: string | undefined) {
  return useQuery({
    queryKey: costEstimateKeys.items(estimateId!),
    queryFn: () => costEstimatesApi.getEstimateItems(estimateId!),
    enabled: !!estimateId,
    staleTime: 30000,
  })
}

// ============================================================================
// MUTATIONS - ESTIMATES
// ============================================================================

/**
 * Create a new cost estimate
 */
export function useCreateEstimate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CostEstimateInsert) => costEstimatesApi.createEstimate(data),
    onSuccess: (newEstimate) => {
      // Invalidate project estimates list
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.list(newEstimate.project_id) })
      toast.success('Cost estimate created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create estimate: ${error.message}`)
    },
  })
}

/**
 * Update a cost estimate
 */
export function useUpdateEstimate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ estimateId, updates }: { estimateId: string; updates: CostEstimateUpdate }) =>
      costEstimatesApi.updateEstimate(estimateId, updates),
    onSuccess: (updatedEstimate) => {
      // Invalidate both the detail and list queries
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.detail(updatedEstimate.id) })
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.list(updatedEstimate.project_id) })
      toast.success('Cost estimate updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update estimate: ${error.message}`)
    },
  })
}

/**
 * Delete a cost estimate (soft delete)
 */
export function useDeleteEstimate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ estimateId, projectId }: { estimateId: string; projectId: string }) =>
      costEstimatesApi.deleteEstimate(estimateId),
    onSuccess: (_, variables) => {
      // Invalidate project estimates list
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.list(variables.projectId) })
      toast.success('Cost estimate deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete estimate: ${error.message}`)
    },
  })
}

/**
 * Duplicate an existing estimate
 */
export function useDuplicateEstimate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ estimateId, newName }: { estimateId: string; newName: string }) =>
      costEstimatesApi.duplicateEstimate(estimateId, newName),
    onSuccess: (newEstimate) => {
      // Invalidate project estimates list
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.list(newEstimate.project_id) })
      toast.success('Cost estimate duplicated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate estimate: ${error.message}`)
    },
  })
}

// ============================================================================
// MUTATIONS - ESTIMATE ITEMS
// ============================================================================

/**
 * Add a line item to an estimate
 */
export function useAddEstimateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: CostEstimateItemInsert) => costEstimatesApi.addEstimateItem(item),
    onSuccess: (newItem) => {
      // Invalidate estimate detail and items
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.detail(newItem.estimate_id) })
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.items(newItem.estimate_id) })
      toast.success('Line item added successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add line item: ${error.message}`)
    },
  })
}

/**
 * Update an estimate line item
 */
export function useUpdateEstimateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, updates, estimateId }: { itemId: string; updates: CostEstimateItemUpdate; estimateId: string }) =>
      costEstimatesApi.updateEstimateItem(itemId, updates),
    onSuccess: (_, variables) => {
      // Invalidate estimate detail and items
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.detail(variables.estimateId) })
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.items(variables.estimateId) })
      toast.success('Line item updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update line item: ${error.message}`)
    },
  })
}

/**
 * Delete an estimate line item
 */
export function useDeleteEstimateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, estimateId }: { itemId: string; estimateId: string }) =>
      costEstimatesApi.deleteEstimateItem(itemId),
    onSuccess: (_, variables) => {
      // Invalidate estimate detail and items
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.detail(variables.estimateId) })
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.items(variables.estimateId) })
      toast.success('Line item deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete line item: ${error.message}`)
    },
  })
}

// ============================================================================
// SPECIAL MUTATIONS
// ============================================================================

/**
 * Create a cost estimate from takeoff items
 */
export function useCreateEstimateFromTakeoff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      projectId: string
      name: string
      description?: string
      takeoffItemIds: string[]
      unitCosts: Record<string, number>
      laborRate?: number
      markupPercentage?: number
      createdBy: string
    }) => costEstimatesApi.createEstimateFromTakeoff(params),
    onSuccess: (newEstimate) => {
      // Invalidate project estimates list
      queryClient.invalidateQueries({ queryKey: costEstimateKeys.list(newEstimate.project_id) })
      toast.success('Cost estimate created from takeoff successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create estimate from takeoff: ${error.message}`)
    },
  })
}

// ============================================================================
// OPTIMISTIC UPDATE HELPERS
// ============================================================================

/**
 * Optimistically update an estimate in the cache
 */
export function useOptimisticEstimateUpdate() {
  const queryClient = useQueryClient()

  return (estimateId: string, updates: Partial<CostEstimate>) => {
    queryClient.setQueryData(
      costEstimateKeys.detail(estimateId),
      (old: CostEstimateWithItems | null | undefined) => {
        if (!old) return old
        return {
          ...old,
          ...updates,
        }
      }
    )
  }
}

/**
 * Optimistically update an estimate item in the cache
 */
export function useOptimisticItemUpdate() {
  const queryClient = useQueryClient()

  return (estimateId: string, itemId: string, updates: Partial<CostEstimateItem>) => {
    queryClient.setQueryData(
      costEstimateKeys.detail(estimateId),
      (old: CostEstimateWithItems | null | undefined) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }
      }
    )
  }
}
