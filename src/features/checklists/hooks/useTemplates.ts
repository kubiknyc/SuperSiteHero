// File: /src/features/checklists/hooks/useTemplates.ts
// React Query hooks for checklist templates
// Phase: 2.1 - Template List/Grid View

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checklistsApi } from '@/lib/api/services/checklists'
import type {
  ChecklistTemplate,
  CreateChecklistTemplateDTO,
  TemplateFilters,
} from '@/types/checklists'
import toast from 'react-hot-toast'

/**
 * Fetch all templates with optional filters
 */
export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: ['checklist-templates', filters],
    queryFn: () => checklistsApi.getTemplates(filters),
  })
}

/**
 * Fetch a single template by ID
 */
export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ['checklist-template', templateId],
    queryFn: () => checklistsApi.getTemplate(templateId),
    enabled: !!templateId,
  })
}

/**
 * Fetch template with items
 */
export function useTemplateWithItems(templateId: string) {
  return useQuery({
    queryKey: ['checklist-template-with-items', templateId],
    queryFn: () => checklistsApi.getTemplateWithItems(templateId),
    enabled: !!templateId,
  })
}

/**
 * Create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChecklistTemplateDTO) => checklistsApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'], exact: false })
      toast.success('Template created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create template')
    },
  })
}

/**
 * Update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: Partial<ChecklistTemplate> & { id: string }) =>
      checklistsApi.updateTemplate(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-template', data.id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-template-with-items', data.id] })
      toast.success('Template updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update template')
    },
  })
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => checklistsApi.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'], exact: false })
      toast.success('Template deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete template')
    },
  })
}

/**
 * Duplicate a template
 */
export function useDuplicateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, newName }: { templateId: string; newName: string }) =>
      checklistsApi.duplicateTemplate(templateId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'], exact: false })
      toast.success('Template duplicated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to duplicate template')
    },
  })
}
