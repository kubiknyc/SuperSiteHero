// File: /src/features/projects/hooks/useProjectsMutations.ts
// Project mutation hooks WITH notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { projectsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Project } from '@/types/database'

/**
 * Create a new project with automatic success/error notifications
 */
export function useCreateProjectWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<Project, Error, Omit<Project, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (project) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }
      return projectsApi.createProject(userProfile.company_id, project, userProfile?.id)
    },
    successMessage: (data) => `Project "${data.name}" created successfully`,
    errorMessage: (error) => `Failed to create project: ${error.message}`,
    onSuccess: () => {
      console.log('🟢 CREATE PROJECT SUCCESS - Invalidating queries...')
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['my-projects'], exact: false })
      console.log('🟢 CREATE PROJECT - Queries invalidated')
    },
  })
}

/**
 * Update a project with automatic success/error notifications
 */
export function useUpdateProjectWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Project,
    Error,
    { id: string; updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      return projectsApi.updateProject(id, updates)
    },
    successMessage: (data) => `Project "${data.name}" updated successfully`,
    errorMessage: (error) => `Failed to update project: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id], exact: false })
    },
  })
}

/**
 * Delete a project with automatic success/error notifications
 */
export function useDeleteProjectWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (projectId) => {
      return projectsApi.deleteProject(projectId)
    },
    successMessage: 'Project deleted successfully',
    errorMessage: (error) => `Failed to delete project: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['my-projects'], exact: false })
    },
  })
}
