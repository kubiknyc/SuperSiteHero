/**
 * useCloneTemplate Hook
 *
 * Hook for cloning report templates with all their configuration.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ============================================================================
// Types
// ============================================================================

export interface CloneTemplateOptions {
  /** The ID of the template to clone */
  templateId: string
  /** Optional new name for the cloned template (defaults to "Original Name (Copy)") */
  newName?: string
  /** Optional new description */
  newDescription?: string
  /** Optional category ID for the new template */
  categoryId?: string
}

export interface ClonedTemplate {
  id: string
  name: string
  description: string | null
  data_source: string
  output_format: string
  page_orientation: string
  include_charts: boolean
  include_summary: boolean
  category_id: string | null
  company_id: string
  created_by: string
  created_at: string
  updated_at: string
}

// ============================================================================
// Clone Function
// ============================================================================

async function cloneTemplate(options: CloneTemplateOptions): Promise<ClonedTemplate> {
  const { templateId, newName, newDescription, categoryId } = options

  // Fetch the original template with all related data
  const { data: original, error: fetchError } = await supabase
    .from('report_templates')
    .select(`
      *,
      report_template_fields (*),
      report_template_filters (*),
      report_template_sorting (*),
      report_template_grouping (*)
    `)
    .eq('id', templateId)
    .single()

  if (fetchError || !original) {
    throw new Error('Failed to fetch template to clone')
  }

  // Create the cloned template
  const cloneName = newName || `${original.name} (Copy)`
  const cloneDescription = newDescription !== undefined ? newDescription : original.description

  const { data: cloned, error: createError } = await supabase
    .from('report_templates')
    .insert({
      name: cloneName,
      description: cloneDescription,
      data_source: original.data_source,
      output_format: original.output_format,
      page_orientation: original.page_orientation,
      include_charts: original.include_charts,
      include_summary: original.include_summary,
      category_id: categoryId !== undefined ? categoryId : original.category_id,
      company_id: original.company_id,
    })
    .select()
    .single()

  if (createError || !cloned) {
    throw new Error('Failed to create cloned template')
  }

  // Clone template fields
  if (original.report_template_fields?.length > 0) {
    const fields = original.report_template_fields.map((field: Record<string, unknown>) => ({
      template_id: cloned.id,
      field_name: field.field_name,
      display_name: field.display_name,
      field_type: field.field_type,
      display_order: field.display_order,
      is_visible: field.is_visible,
      width: field.width,
      alignment: field.alignment,
      format: field.format,
      aggregation: field.aggregation,
    }))

    const { error: fieldsError } = await supabase
      .from('report_template_fields')
      .insert(fields)

    if (fieldsError) {
      // Clean up on partial failure
      await supabase.from('report_templates').delete().eq('id', cloned.id)
      throw new Error('Failed to clone template fields')
    }
  }

  // Clone template filters
  if (original.report_template_filters?.length > 0) {
    const filters = original.report_template_filters.map((filter: Record<string, unknown>) => ({
      template_id: cloned.id,
      field_name: filter.field_name,
      operator: filter.operator,
      filter_value: filter.filter_value,
      is_relative_date: filter.is_relative_date,
      relative_date_value: filter.relative_date_value,
      relative_date_unit: filter.relative_date_unit,
      filter_group: filter.filter_group,
    }))

    const { error: filtersError } = await supabase
      .from('report_template_filters')
      .insert(filters)

    if (filtersError) {
      // Clean up on partial failure
      await supabase.from('report_template_fields').delete().eq('template_id', cloned.id)
      await supabase.from('report_templates').delete().eq('id', cloned.id)
      throw new Error('Failed to clone template filters')
    }
  }

  // Clone template sorting
  if (original.report_template_sorting?.length > 0) {
    const sorting = original.report_template_sorting.map((sort: Record<string, unknown>) => ({
      template_id: cloned.id,
      field_name: sort.field_name,
      direction: sort.direction,
      sort_order: sort.sort_order,
    }))

    const { error: sortingError } = await supabase
      .from('report_template_sorting')
      .insert(sorting)

    if (sortingError) {
      console.warn('Failed to clone template sorting:', sortingError)
      // Don't fail the whole operation for sorting
    }
  }

  // Clone template grouping
  if (original.report_template_grouping?.length > 0) {
    const grouping = original.report_template_grouping.map((group: Record<string, unknown>) => ({
      template_id: cloned.id,
      field_name: group.field_name,
      group_order: group.group_order,
      include_subtotals: group.include_subtotals,
    }))

    const { error: groupingError } = await supabase
      .from('report_template_grouping')
      .insert(grouping)

    if (groupingError) {
      console.warn('Failed to clone template grouping:', groupingError)
      // Don't fail the whole operation for grouping
    }
  }

  return cloned
}

// ============================================================================
// Hook
// ============================================================================

export interface UseCloneTemplateResult {
  cloneTemplate: (options: CloneTemplateOptions) => Promise<ClonedTemplate>
  isCloning: boolean
  error: Error | null
}

export function useCloneTemplate(): UseCloneTemplateResult {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: cloneTemplate,
    onSuccess: (data) => {
      // Invalidate templates queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['report-templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-counts'] })
      toast.success(`Template "${data.name}" created`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone template')
    },
  })

  return {
    cloneTemplate: mutation.mutateAsync,
    isCloning: mutation.isPending,
    error: mutation.error,
  }
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for bulk cloning templates
 */
export function useBulkCloneTemplates() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      const results = await Promise.allSettled(
        templateIds.map((id) =>
          cloneTemplate({ templateId: id })
        )
      )

      const succeeded = results.filter(
        (r): r is PromiseFulfilledResult<ClonedTemplate> => r.status === 'fulfilled'
      )
      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      )

      return {
        cloned: succeeded.map((r) => r.value),
        failedCount: failed.length,
        totalCount: templateIds.length,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-counts'] })

      if (data.failedCount === 0) {
        toast.success(`Successfully cloned ${data.cloned.length} templates`)
      } else if (data.cloned.length > 0) {
        toast.success(
          `Cloned ${data.cloned.length} of ${data.totalCount} templates`
        )
      } else {
        toast.error('Failed to clone templates')
      }
    },
    onError: () => {
      toast.error('Failed to clone templates')
    },
  })

  return {
    bulkClone: mutation.mutateAsync,
    isCloning: mutation.isPending,
    error: mutation.error,
  }
}

export default useCloneTemplate
