// File: /src/features/documents/hooks/useMarkupTemplates.ts
// React Query hooks for markup template operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type {
  MarkupTemplate,
  CreateMarkupTemplateInput,
  UpdateMarkupTemplateInput,
  MarkupTemplateCategory,
} from '../types/markup'

// ============================================================
// QUERY KEYS
// ============================================================

export const markupTemplateKeys = {
  all: ['markup-templates'] as const,
  lists: () => [...markupTemplateKeys.all, 'list'] as const,
  list: (filters: { projectId?: string; category?: MarkupTemplateCategory }) =>
    [...markupTemplateKeys.lists(), filters] as const,
  details: () => [...markupTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...markupTemplateKeys.details(), id] as const,
}

// ============================================================
// API FUNCTIONS
// ============================================================

async function fetchTemplates(projectId?: string): Promise<MarkupTemplate[]> {
  let query = supabase
    .from('markup_templates')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // If projectId is provided, get templates for that project or global templates
  if (projectId) {
    query = query.or(`project_id.eq.${projectId},project_id.is.null`)
  } else {
    query = query.is('project_id', null)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch markup templates: ${error.message}`)
  }

  return (data || []) as MarkupTemplate[]
}

async function fetchTemplate(id: string): Promise<MarkupTemplate> {
  const { data, error } = await supabase
    .from('markup_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    throw new Error(`Failed to fetch markup template: ${error.message}`)
  }

  return data as MarkupTemplate
}

async function createTemplate(
  input: CreateMarkupTemplateInput,
  userId: string
): Promise<MarkupTemplate> {
  const { data, error } = await supabase
    .from('markup_templates')
    .insert({
      name: input.name,
      description: input.description,
      category: input.category,
      markups: input.markups,
      is_shared: input.is_shared,
      project_id: input.project_id,
      tags: input.tags,
      created_by: userId,
      usage_count: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create markup template: ${error.message}`)
  }

  return data as MarkupTemplate
}

async function updateTemplate(
  id: string,
  input: UpdateMarkupTemplateInput
): Promise<MarkupTemplate> {
  const { data, error } = await supabase
    .from('markup_templates')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update markup template: ${error.message}`)
  }

  return data as MarkupTemplate
}

async function deleteTemplate(id: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('markup_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete markup template: ${error.message}`)
  }
}

async function incrementUsageCount(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_usage', { template_id: id })

  if (error) {
    console.error('Failed to increment usage count:', error)
    // Don't throw - this is not critical
  }
}

// ============================================================
// HOOKS
// ============================================================

interface UseMarkupTemplatesOptions {
  projectId?: string
  category?: MarkupTemplateCategory
}

export function useMarkupTemplates(options: UseMarkupTemplatesOptions = {}) {
  const { projectId, category } = options
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const userId = userProfile?.id || ''

  // Fetch templates
  const {
    data: templates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: markupTemplateKeys.list({ projectId, category }),
    queryFn: () => fetchTemplates(projectId),
    enabled: !!userId,
  })

  // Filter by category if specified
  const filteredTemplates = category
    ? templates?.filter(t => t.category === category)
    : templates

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateMarkupTemplateInput) => createTemplate(input, userId),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: markupTemplateKeys.lists() })
      toast.success('Template saved successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to save template: ${error.message}`)
    },
  })

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMarkupTemplateInput }) =>
      updateTemplate(id, input),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: markupTemplateKeys.lists() })
      queryClient.setQueryData(
        markupTemplateKeys.detail(updatedTemplate.id),
        updatedTemplate
      )
      toast.success('Template updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: markupTemplateKeys.lists() })
      toast.success('Template deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })

  // Duplicate template
  const duplicateMutation = useMutation({
    mutationFn: async (template: Omit<MarkupTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const input: CreateMarkupTemplateInput = {
        name: template.name,
        description: template.description,
        category: template.category,
        markups: template.markups,
        is_shared: false, // Duplicates are private by default
        project_id: template.project_id,
        tags: template.tags,
      }
      return createTemplate(input, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: markupTemplateKeys.lists() })
      toast.success('Template duplicated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate template: ${error.message}`)
    },
  })

  // Use template (load and track usage)
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await incrementUsageCount(templateId)
      return fetchTemplate(templateId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: markupTemplateKeys.lists() })
    },
  })

  return {
    // Data
    templates: filteredTemplates,
    isLoading,
    error,

    // Actions
    createTemplate: createMutation.mutate,
    updateTemplate: (id: string, input: UpdateMarkupTemplateInput) =>
      updateMutation.mutate({ id, input }),
    deleteTemplate: deleteMutation.mutate,
    duplicateTemplate: duplicateMutation.mutate,
    useTemplate: useTemplateMutation.mutateAsync,
    refetch,

    // Status
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// Single template hook
export function useMarkupTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: markupTemplateKeys.detail(templateId || ''),
    queryFn: () => fetchTemplate(templateId!),
    enabled: !!templateId,
  })
}

// Category options hook
export function useTemplateCategoryOptions() {
  return [
    { value: 'qc_review', label: 'QC Review' },
    { value: 'site_walk', label: 'Site Walk' },
    { value: 'punch_list', label: 'Punch List' },
    { value: 'coordination', label: 'Coordination' },
    { value: 'safety_inspection', label: 'Safety Inspection' },
    { value: 'custom', label: 'Custom' },
  ] as const
}

export default useMarkupTemplates
