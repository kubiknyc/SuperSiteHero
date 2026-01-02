// File: /src/features/checklists/hooks/useTemplateItems.ts
// React Query hooks for checklist template items
// Phase: 2.3 - Item Builder with Item Types

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistsApi } from '@/lib/api/services/checklists'
import type {
  ChecklistTemplateItem,
  CreateChecklistTemplateItemDTO,
} from '@/types/checklists'
import { toast } from 'sonner'

/**
 * Fetch all items for a template
 */
export function useTemplateItems(templateId: string) {
  return useQuery({
    queryKey: ['checklist-template-items', templateId],
    queryFn: () => checklistsApi.getTemplateItems(templateId),
    enabled: !!templateId,
  })
}

/**
 * Create a new template item
 */
export function useCreateTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChecklistTemplateItemDTO) => checklistsApi.createTemplateItem(data),
    onSuccess: (data) => {
      // Invalidate items list for this template
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-items', data.checklist_template_id],
        exact: false,
      })
      // Invalidate template-with-items query
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-with-items', data.checklist_template_id],
        exact: false,
      })
      toast.success('Item added successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create item')
    },
  })
}

/**
 * Update a template item
 */
export function useUpdateTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: Partial<ChecklistTemplateItem> & { id: string }) =>
      checklistsApi.updateTemplateItem(id, updates),
    onSuccess: (data) => {
      // Invalidate items list for this template
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-items', data.checklist_template_id],
        exact: false,
      })
      // Invalidate template-with-items query
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-with-items', data.checklist_template_id],
        exact: false,
      })
      toast.success('Item updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update item')
    },
  })
}

/**
 * Delete a template item
 */
export function useDeleteTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      templateId: _templateId,
    }: {
      itemId: string
      templateId: string
    }) => checklistsApi.deleteTemplateItem(itemId),
    onSuccess: (_, variables) => {
      // Invalidate items list for this template
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-items', variables.templateId],
        exact: false,
      })
      // Invalidate template-with-items query
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-with-items', variables.templateId],
        exact: false,
      })
      toast.success('Item deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete item')
    },
  })
}

/**
 * Reorder template items (batch update sort_order)
 */
export function useReorderTemplateItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      items,
      templateId: _templateId,
    }: {
      items: { id: string; sort_order: number }[]
      templateId: string
    }) => checklistsApi.reorderTemplateItems(items),
    onSuccess: (_, variables) => {
      // Invalidate items list for this template
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-items', variables.templateId],
        exact: false,
      })
      // Invalidate template-with-items query
      queryClient.invalidateQueries({
        queryKey: ['checklist-template-with-items', variables.templateId],
        exact: false,
      })
      toast.success('Items reordered successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to reorder items')
    },
  })
}
