// File: /src/features/projects/hooks/useProjects.ts
// React Query hooks for projects

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Project, CreateInput } from '@/types/database'
import { useAuth } from '@/lib/auth/AuthContext'

// Fetch all projects for the current user's company
export function useProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['projects', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Project[]
    },
    enabled: !!userProfile?.company_id,
  })
}

// Fetch a single project by ID
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      return data as Project
    },
    enabled: !!projectId,
  })
}

// Create a new project
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (project: CreateInput<'projects'>) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }

      const { data, error} = await supabase
        .from('projects')
        .insert({
          ...project,
          company_id: userProfile.company_id,
        })
        .select()
        .single()

      if (error) throw error

      // Assign the creator to the project
      if (userProfile?.id) {
        try {
          await supabase
            .from('project_users')
            .insert({
              project_id: data.id,
              user_id: userProfile.id,
            })
        } catch (err) {
          console.error('Failed to assign user to project:', err)
          // Don't throw - project was created successfully
        }
      }

      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
    },
  })
}

// Update an existing project
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id], exact: false })
    },
  })
}

// Delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
    },
  })
}

// Fetch projects where user is assigned
export function useMyProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['my-projects', userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('No user ID found')

      // Query project_users to get user's projects
      const { data, error } = await supabase
        .from('project_users')
        .select(`
          project:projects(*)
        `)
        .eq('user_id', userProfile.id)

      if (error) throw error

      // Extract projects from the joined data
      return data.map((assignment: any) => assignment.project) as Project[]
    },
    enabled: !!userProfile?.id,
  })
}
