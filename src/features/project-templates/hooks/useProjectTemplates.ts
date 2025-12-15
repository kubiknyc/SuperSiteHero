/**
 * React Query hooks for Project Templates
 *
 * Provides hooks for:
 * - Fetching templates (list, single, recent, popular)
 * - Creating, updating, deleting templates
 * - Duplicating templates
 * - Applying templates to projects
 * - Managing template phases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectTemplatesApi } from '@/lib/api/services/project-templates'
import type {
  ProjectTemplate,
  ProjectTemplateWithDetails,
  ProjectTemplatePhase,
  CreateProjectTemplateInput,
  UpdateProjectTemplateInput,
  CreateTemplateFromProjectInput,
  ProjectTemplateFilters,
  ApplyTemplateResult,
  TemplateCategory,
} from '@/types/project-template'

// ============================================================================
// Query Keys
// ============================================================================

export const projectTemplateKeys = {
  all: ['project-templates'] as const,
  lists: () => [...projectTemplateKeys.all, 'list'] as const,
  list: (companyId: string, filters?: ProjectTemplateFilters) =>
    [...projectTemplateKeys.lists(), companyId, filters] as const,
  details: () => [...projectTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectTemplateKeys.details(), id] as const,
  recent: (companyId: string) => [...projectTemplateKeys.all, 'recent', companyId] as const,
  popular: (companyId: string) => [...projectTemplateKeys.all, 'popular', companyId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all templates for a company with optional filters
 */
export function useProjectTemplates(
  companyId: string | undefined,
  filters?: ProjectTemplateFilters
) {
  return useQuery({
    queryKey: projectTemplateKeys.list(companyId || '', filters),
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required')}
      return projectTemplatesApi.getTemplates(companyId, filters)
    },
    enabled: !!companyId,
  })
}

/**
 * Fetch templates filtered by category
 */
export function useProjectTemplatesByCategory(
  companyId: string | undefined,
  category: TemplateCategory | undefined
) {
  return useProjectTemplates(companyId, category ? { category } : undefined)
}

/**
 * Fetch only active templates
 */
export function useActiveProjectTemplates(companyId: string | undefined) {
  return useProjectTemplates(companyId, { is_active: true })
}

/**
 * Fetch a single template with all details
 */
export function useProjectTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: projectTemplateKeys.detail(templateId || ''),
    queryFn: async () => {
      if (!templateId) {throw new Error('Template ID required')}
      return projectTemplatesApi.getTemplate(templateId)
    },
    enabled: !!templateId,
  })
}

/**
 * Fetch recently used templates
 */
export function useRecentProjectTemplates(
  companyId: string | undefined,
  limit: number = 5
) {
  return useQuery({
    queryKey: projectTemplateKeys.recent(companyId || ''),
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required')}
      return projectTemplatesApi.getRecentTemplates(companyId, limit)
    },
    enabled: !!companyId,
  })
}

/**
 * Fetch most popular templates by usage
 */
export function usePopularProjectTemplates(
  companyId: string | undefined,
  limit: number = 5
) {
  return useQuery({
    queryKey: projectTemplateKeys.popular(companyId || ''),
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required')}
      return projectTemplatesApi.getPopularTemplates(companyId, limit)
    },
    enabled: !!companyId,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new template
 */
export function useCreateProjectTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      userId,
    }: {
      input: CreateProjectTemplateInput
      userId: string
    }) => {
      return projectTemplatesApi.createTemplate(input, userId)
    },
    onSuccess: (data) => {
      // Invalidate template lists for the company
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Create a template from an existing project
 */
export function useCreateTemplateFromProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      userId,
    }: {
      input: CreateTemplateFromProjectInput
      userId: string
    }) => {
      return projectTemplatesApi.createTemplateFromProject(input, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Update an existing template
 */
export function useUpdateProjectTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      input,
    }: {
      templateId: string
      input: UpdateProjectTemplateInput
    }) => {
      return projectTemplatesApi.updateTemplate(templateId, input)
    },
    onSuccess: (data) => {
      // Invalidate specific template and lists
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.detail(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Delete (soft delete) a template
 */
export function useDeleteProjectTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => {
      return projectTemplatesApi.deleteTemplate(templateId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.all,
      })
    },
  })
}

/**
 * Permanently delete a template
 */
export function usePermanentlyDeleteProjectTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => {
      return projectTemplatesApi.permanentlyDeleteTemplate(templateId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.all,
      })
    },
  })
}

/**
 * Duplicate a template
 */
export function useDuplicateProjectTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      newName,
      userId,
    }: {
      templateId: string
      newName: string
      userId: string
    }) => {
      return projectTemplatesApi.duplicateTemplate(templateId, newName, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.lists(),
      })
    },
  })
}

/**
 * Apply a template to a project
 */
export function useApplyTemplateToProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      templateId,
      userId,
    }: {
      projectId: string
      templateId: string
      userId: string
    }) => {
      return projectTemplatesApi.applyTemplateToProject(projectId, templateId, userId)
    },
    onSuccess: (result) => {
      // Invalidate template usage stats
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.detail(result.template_id),
      })
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.recent(result.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.popular(result.project_id),
      })
      // Invalidate project-related queries
      queryClient.invalidateQueries({
        queryKey: ['projects', result.project_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['folders', result.project_id],
      })
    },
  })
}

// ============================================================================
// Phase Management Hooks
// ============================================================================

/**
 * Add a phase to a template
 */
export function useAddTemplatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      phase,
    }: {
      templateId: string
      phase: { name: string; description?: string; estimated_duration_days?: number }
    }) => {
      return projectTemplatesApi.addPhase(templateId, phase)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.detail(variables.templateId),
      })
    },
  })
}

/**
 * Update a phase
 */
export function useUpdateTemplatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      phaseId,
      templateId,
      updates,
    }: {
      phaseId: string
      templateId: string
      updates: { name?: string; description?: string; estimated_duration_days?: number }
    }) => {
      return projectTemplatesApi.updatePhase(phaseId, updates)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.detail(variables.templateId),
      })
    },
  })
}

/**
 * Delete a phase
 */
export function useDeleteTemplatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      phaseId,
      templateId,
    }: {
      phaseId: string
      templateId: string
    }) => {
      return projectTemplatesApi.deletePhase(phaseId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.detail(variables.templateId),
      })
    },
  })
}

/**
 * Reorder phases
 */
export function useReorderTemplatePhases() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      phaseIds,
    }: {
      templateId: string
      phaseIds: string[]
    }) => {
      return projectTemplatesApi.reorderPhases(templateId, phaseIds)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectTemplateKeys.detail(variables.templateId),
      })
    },
  })
}

// ============================================================================
// Convenience Hooks with Callbacks
// ============================================================================

/**
 * Create template with success/error callbacks
 */
export function useCreateProjectTemplateWithCallbacks(options?: {
  onSuccess?: (data: ProjectTemplate) => void
  onError?: (error: Error) => void
}) {
  const mutation = useCreateProjectTemplate()

  return {
    ...mutation,
    mutateAsync: async (params: { input: CreateProjectTemplateInput; userId: string }) => {
      try {
        const result = await mutation.mutateAsync(params)
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      }
    },
  }
}

/**
 * Apply template with success/error callbacks
 */
export function useApplyTemplateWithCallbacks(options?: {
  onSuccess?: (result: ApplyTemplateResult) => void
  onError?: (error: Error) => void
}) {
  const mutation = useApplyTemplateToProject()

  return {
    ...mutation,
    mutateAsync: async (params: {
      projectId: string
      templateId: string
      userId: string
    }) => {
      try {
        const result = await mutation.mutateAsync(params)
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      }
    },
  }
}

/**
 * Delete template with success/error callbacks
 */
export function useDeleteProjectTemplateWithCallbacks(options?: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  const mutation = useDeleteProjectTemplate()

  return {
    ...mutation,
    mutateAsync: async (templateId: string) => {
      try {
        await mutation.mutateAsync(templateId)
        options?.onSuccess?.()
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      }
    },
  }
}
