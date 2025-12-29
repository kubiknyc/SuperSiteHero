/**
 * Action Items React Query Hooks
 *
 * Hooks for cross-meeting action item management, pipeline operations,
 * and integration with tasks, RFIs, and constraints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { actionItemsApi } from '@/lib/api/services/action-items'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import type {
  ActionItemFilters,
  CreateActionItemDTO,
  UpdateActionItemDTO,
  ResolveActionItemDTO,
  LinkActionItemDTO,
  CarryoverActionItemsDTO,
  ActionItemStatus,
} from '@/types/action-items'

// ============================================================================
// Query Keys
// ============================================================================

export const actionItemKeys = {
  all: ['action-items'] as const,
  lists: () => [...actionItemKeys.all, 'list'] as const,
  list: (filters: ActionItemFilters) => [...actionItemKeys.lists(), filters] as const,
  details: () => [...actionItemKeys.all, 'detail'] as const,
  detail: (id: string) => [...actionItemKeys.details(), id] as const,
  summary: (projectId: string) => [...actionItemKeys.all, 'summary', projectId] as const,
  byAssignee: (projectId: string) => [...actionItemKeys.all, 'by-assignee', projectId] as const,
  overdue: (projectId?: string) => [...actionItemKeys.all, 'overdue', projectId] as const,
  dueSoon: (projectId?: string) => [...actionItemKeys.all, 'due-soon', projectId] as const,
  escalated: (projectId?: string) => [...actionItemKeys.all, 'escalated', projectId] as const,
  statusCounts: (projectId: string) => [...actionItemKeys.all, 'status-counts', projectId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get action items with filters
 */
export function useActionItems(filters: ActionItemFilters = {}) {
  return useQuery({
    queryKey: actionItemKeys.list(filters),
    queryFn: () => actionItemsApi.getActionItems(filters),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Get action items for a specific project
 */
export function useProjectActionItems(projectId: string | undefined, extraFilters?: Partial<ActionItemFilters>) {
  return useQuery({
    queryKey: actionItemKeys.list({ project_id: projectId, ...extraFilters }),
    queryFn: () => actionItemsApi.getActionItems({ project_id: projectId!, ...extraFilters }),
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Get single action item
 */
export function useActionItem(id: string | undefined) {
  return useQuery({
    queryKey: actionItemKeys.detail(id || ''),
    queryFn: () => actionItemsApi.getActionItem(id!),
    enabled: !!id,
  })
}

/**
 * Get project action item summary
 */
export function useActionItemSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: actionItemKeys.summary(projectId || ''),
    queryFn: () => actionItemsApi.getProjectSummary(projectId!),
    enabled: !!projectId,
    staleTime: 60000,
  })
}

/**
 * Get action items by assignee
 */
export function useActionItemsByAssignee(projectId: string | undefined) {
  return useQuery({
    queryKey: actionItemKeys.byAssignee(projectId || ''),
    queryFn: () => actionItemsApi.getItemsByAssignee(projectId!),
    enabled: !!projectId,
    staleTime: 60000,
  })
}

/**
 * Get overdue action items
 */
export function useOverdueActionItems(projectId?: string, limit = 50) {
  return useQuery({
    queryKey: actionItemKeys.overdue(projectId),
    queryFn: () => actionItemsApi.getOverdueItems(projectId, limit),
    staleTime: 30000,
  })
}

/**
 * Get action items due soon
 */
export function useActionItemsDueSoon(projectId?: string, limit = 50) {
  return useQuery({
    queryKey: actionItemKeys.dueSoon(projectId),
    queryFn: () => actionItemsApi.getItemsDueSoon(projectId, limit),
    staleTime: 30000,
  })
}

/**
 * Get escalated action items
 */
export function useEscalatedActionItems(projectId?: string, limit = 50) {
  return useQuery({
    queryKey: actionItemKeys.escalated(projectId),
    queryFn: () => actionItemsApi.getEscalatedItems(projectId, limit),
    staleTime: 30000,
  })
}

/**
 * Get action item status counts
 */
export function useActionItemStatusCounts(projectId: string | undefined) {
  return useQuery({
    queryKey: actionItemKeys.statusCounts(projectId || ''),
    queryFn: () => actionItemsApi.getStatusCounts(projectId!),
    enabled: !!projectId,
    staleTime: 60000,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create action item
 */
export function useCreateActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateActionItemDTO) => actionItemsApi.createActionItem(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.summary(data.project_id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.statusCounts(data.project_id) })
      toast.success('Action item created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create action item: ${error.message}`)
    },
  })
}

/**
 * Update action item
 */
export function useUpdateActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateActionItemDTO }) =>
      actionItemsApi.updateActionItem(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.summary(data.project_id) })
      toast.success('Action item updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update action item: ${error.message}`)
    },
  })
}

/**
 * Delete action item
 */
export function useDeleteActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => actionItemsApi.deleteActionItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.all })
      toast.success('Action item deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete action item: ${error.message}`)
    },
  })
}

/**
 * Update action item status
 */
export function useUpdateActionItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActionItemStatus }) =>
      actionItemsApi.updateActionItemStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.summary(data.project_id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.statusCounts(data.project_id) })

      if (data.status === 'completed') {
        toast.success('Action item completed')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`)
    },
  })
}

/**
 * Resolve action item
 */
export function useResolveActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ResolveActionItemDTO }) =>
      actionItemsApi.resolveActionItem(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.summary(data.project_id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.statusCounts(data.project_id) })
      toast.success('Action item resolved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve action item: ${error.message}`)
    },
  })
}

/**
 * Link action item to entity
 */
export function useLinkActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: LinkActionItemDTO }) =>
      actionItemsApi.linkActionItem(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      toast.success('Link created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to link: ${error.message}`)
    },
  })
}

/**
 * Unlink action item from entity
 */
export function useUnlinkActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, linkType }: { id: string; linkType: 'task' | 'rfi' | 'constraint' | 'change_order' }) =>
      actionItemsApi.unlinkActionItem(id, linkType),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      toast.success('Link removed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink: ${error.message}`)
    },
  })
}

/**
 * Convert action item to task
 */
export function useConvertToTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (actionItemId: string) =>
      actionItemsApi.convertToTask(actionItemId, user?.id),
    onSuccess: (taskId, actionItemId) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.detail(actionItemId) })
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Converted to task')
    },
    onError: (error: Error) => {
      toast.error(`Failed to convert: ${error.message}`)
    },
  })
}

/**
 * Carry over action items to new meeting
 */
export function useCarryoverActionItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CarryoverActionItemsDTO) =>
      actionItemsApi.carryoverActionItems(dto),
    onSuccess: (count, _dto) => {
      queryClient.invalidateQueries({ queryKey: actionItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      toast.success(`${count} action item${count !== 1 ? 's' : ''} carried over`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to carry over: ${error.message}`)
    },
  })
}

// ============================================================================
// Export
// ============================================================================

export default {
  keys: actionItemKeys,

  // Query hooks
  useActionItems,
  useProjectActionItems,
  useActionItem,
  useActionItemSummary,
  useActionItemsByAssignee,
  useOverdueActionItems,
  useActionItemsDueSoon,
  useEscalatedActionItems,
  useActionItemStatusCounts,

  // Mutation hooks
  useCreateActionItem,
  useUpdateActionItem,
  useDeleteActionItem,
  useUpdateActionItemStatus,
  useResolveActionItem,
  useLinkActionItem,
  useUnlinkActionItem,
  useConvertToTask,
  useCarryoverActionItems,
}
