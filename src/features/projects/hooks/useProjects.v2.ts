// File: /src/features/projects/hooks/useProjects.v2.ts
// REFACTORED: Projects hooks using new API abstraction layer
// This is the updated version - replace useProjects.ts with this when ready

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Project } from '@/types/database'
import { logger } from '@/lib/utils/logger'

/**
 * Fetch all projects for the current user's company
 * This replaces the old useProjects hook
 */
export function useProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['projects', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }
      return projectsApi.getProjectsByCompany(userProfile.company_id)
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Fetch a single project by ID
 * This replaces the old useProject hook
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      return projectsApi.getProject(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Create a new project mutation
 * This replaces the old useCreateProject hook
 */
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }
      return projectsApi.createProject(userProfile.company_id, project)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      logger.error('Error creating project:', getErrorMessage(error))
    },
  })
}

/**
 * Update an existing project mutation
 * This replaces the old useUpdateProject hook
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      return projectsApi.updateProject(id, updates)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] })
    },
    onError: (error) => {
      logger.error('Error updating project:', getErrorMessage(error))
    },
  })
}

/**
 * Delete a project mutation
 * This replaces the old useDeleteProject hook
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      return projectsApi.deleteProject(projectId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      logger.error('Error deleting project:', getErrorMessage(error))
    },
  })
}

/**
 * Fetch projects where user is assigned
 * This replaces the old useMyProjects hook
 */
export function useMyProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['my-projects', userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) {throw new Error('No user ID found')}
      return projectsApi.getUserProjects(userProfile.id)
    },
    enabled: !!userProfile?.id,
  })
}

/**
 * Search projects by name or address
 * New hook that wasn't in the original
 */
export function useSearchProjects(query: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['projects-search', userProfile?.company_id, query],
    queryFn: async () => {
      if (!userProfile?.company_id) {throw new Error('No company ID found')}
      if (!query) {return []}
      return projectsApi.searchProjects(userProfile.company_id, query)
    },
    enabled: !!userProfile?.company_id && !!query,
  })
}
