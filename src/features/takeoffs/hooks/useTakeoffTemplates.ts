// File: /src/features/takeoffs/hooks/useTakeoffTemplates.ts
// React Query hooks for takeoff templates data fetching and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { takeoffTemplatesApi } from '@/lib/api/services/takeoff-templates'
import type { TakeoffTemplateInsert, TakeoffTemplateUpdate } from '@/types/database-extensions'

/**
 * Fetch company-wide templates
 * Use when: Showing all company templates (admin view)
 */
export function useCompanyTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ['takeoff-templates', 'company', companyId],
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required')}
      return await takeoffTemplatesApi.getCompanyTemplates(companyId)
    },
    enabled: !!companyId,
  })
}

/**
 * Fetch templates for a project (company-wide + project-specific)
 * Use when: In TakeoffsListPage or TakeoffPage (most common)
 */
export function useProjectTemplates(
  projectId: string | undefined,
  companyId: string | undefined
) {
  return useQuery({
    queryKey: ['takeoff-templates', 'project', projectId, companyId],
    queryFn: async () => {
      if (!projectId || !companyId) {throw new Error('Project and Company ID required')}
      return await takeoffTemplatesApi.getProjectTemplates(projectId, companyId)
    },
    enabled: !!projectId && !!companyId,
  })
}

/**
 * Fetch templates by measurement type
 * Use when: Filtering templates for specific measurement type
 */
export function useTemplatesByType(
  measurementType: string | undefined,
  companyId: string | undefined,
  projectId?: string
) {
  return useQuery({
    queryKey: ['takeoff-templates', 'type', measurementType, companyId, projectId],
    queryFn: async () => {
      if (!measurementType || !companyId) {
        throw new Error('Type and Company ID required')
      }
      return await takeoffTemplatesApi.getTemplatesByType(
        measurementType,
        companyId,
        projectId
      )
    },
    enabled: !!measurementType && !!companyId,
  })
}

/**
 * Get single template
 */
export function useTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['takeoff-templates', templateId],
    queryFn: async () => {
      if (!templateId) {throw new Error('Template ID required')}
      return await takeoffTemplatesApi.getTemplate(templateId)
    },
    enabled: !!templateId,
  })
}

/**
 * Create new template mutation
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TakeoffTemplateInsert) => {
      return await takeoffTemplatesApi.createTemplate(data)
    },
    onSuccess: (data) => {
      // Invalidate all template queries
      queryClient.invalidateQueries({ queryKey: ['takeoff-templates'] })

      // Invalidate specific queries
      queryClient.invalidateQueries({
        queryKey: ['takeoff-templates', 'company', data.company_id],
      })
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: ['takeoff-templates', 'project', data.project_id],
        })
      }
    },
  })
}

/**
 * Update template mutation
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: TakeoffTemplateUpdate & { id: string }) => {
      return await takeoffTemplatesApi.updateTemplate(id, updates)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff-templates'] })
      queryClient.invalidateQueries({ queryKey: ['takeoff-templates', data.id] })
    },
  })
}

/**
 * Delete template mutation
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      return await takeoffTemplatesApi.deleteTemplate(templateId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff-templates'] })
    },
  })
}

/**
 * Increment usage mutation (call when template applied)
 */
export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      return await takeoffTemplatesApi.incrementUsage(templateId)
    },
    onSuccess: (_, templateId) => {
      // Invalidate to refresh usage count
      queryClient.invalidateQueries({ queryKey: ['takeoff-templates', templateId] })
      queryClient.invalidateQueries({ queryKey: ['takeoff-templates'] })
    },
  })
}

/**
 * Search templates
 */
export function useSearchTemplates(
  query: string,
  companyId: string | undefined,
  projectId?: string
) {
  return useQuery({
    queryKey: ['takeoff-templates', 'search', query, companyId, projectId],
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required')}
      return await takeoffTemplatesApi.searchTemplates(query, companyId, projectId)
    },
    enabled: !!companyId && query.length > 0,
  })
}
