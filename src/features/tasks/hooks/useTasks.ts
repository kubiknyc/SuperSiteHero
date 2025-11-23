// File: /src/features/tasks/hooks/useTasks.ts
// React Query hooks for tasks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Task, CreateInput } from '@/types/database'

// Fetch all tasks for a project
export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data as Task[]
    },
    enabled: !!projectId,
  })
}

// Fetch a single task by ID
export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID required')

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw error
      return data as Task
    },
    enabled: !!taskId,
  })
}

// Fetch tasks assigned to current user
export function useMyTasks(projectId?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['my-tasks', projectId, userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('User ID required')

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to_user_id', userProfile.id)
        .is('deleted_at', null)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.order('due_date', { ascending: true })

      if (error) throw error
      return data as Task[]
    },
    enabled: !!userProfile?.id,
  })
}

// Create a new task
export function useCreateTask() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (task: CreateInput<Task>) => {
      if (!userProfile?.id) {
        throw new Error('User profile required')
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] })
    },
  })
}

// Update an existing task
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] })
    },
  })
}

// Delete a task (soft delete)
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
