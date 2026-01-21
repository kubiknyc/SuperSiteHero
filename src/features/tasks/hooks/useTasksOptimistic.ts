// File: /src/features/tasks/hooks/useTasksOptimistic.ts
// Optimistic mutation hooks for tasks
// These hooks use the optimistic update helpers for instant UI feedback

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useOptimisticAdd,
  useOptimisticUpdate,
  useOptimisticDelete,
  useOptimisticToggle,
  generateTempId,
} from '@/lib/hooks/useOptimisticMutation'
import type { Task, CreateInput } from '@/types/database'

// ============================================================================
// Query Keys (shared with useTasks.ts)
// ============================================================================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (projectId: string) => [...taskKeys.lists(), projectId] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
  myTasks: (userId?: string) => ['my-tasks', userId] as const,
}

// ============================================================================
// Optimistic Create Task
// ============================================================================

/**
 * Create a task with optimistic UI update
 * Shows the task immediately in the list before server confirms
 */
export function useCreateTaskOptimistic(projectId: string) {
  const { userProfile } = useAuth()

  return useOptimisticAdd<Task, CreateInput<'tasks'>>({
    queryKey: taskKeys.list(projectId),
    position: 'end',
    createOptimisticItem: (variables) => ({
      id: generateTempId(),
      ...variables,
      project_id: projectId,
      created_by: userProfile?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: variables.status || 'pending',
      deleted_at: null,
    } as Task),
    mutationFn: async (task) => {
      if (!userProfile?.id) {
        throw new Error('User profile required')
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          project_id: projectId,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as Task
    },
    notifications: {
      success: (data) => `Task "${data.title}" created`,
      error: 'Failed to create task',
    },
    invalidateKeys: [taskKeys.all, taskKeys.myTasks(userProfile?.id)],
  })
}

// ============================================================================
// Optimistic Update Task
// ============================================================================

/**
 * Update a task with optimistic UI update
 * Shows changes immediately before server confirms
 */
export function useUpdateTaskOptimistic(projectId: string) {
  return useOptimisticUpdate<Task, { id: string; updates: Partial<Task> }>({
    queryKey: taskKeys.list(projectId),
    getItemId: (vars) => vars.id,
    updateItem: (item, vars) => ({
      ...item,
      ...vars.updates,
      updated_at: new Date().toISOString(),
    }),
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Task
    },
    notifications: {
      success: 'Task updated',
      error: 'Failed to update task',
    },
    invalidateKeys: [taskKeys.all],
  })
}

// ============================================================================
// Optimistic Delete Task
// ============================================================================

/**
 * Delete a task with optimistic UI update
 * Removes from list immediately before server confirms
 */
export function useDeleteTaskOptimistic(projectId: string) {
  return useOptimisticDelete<Task, string>({
    queryKey: taskKeys.list(projectId),
    getItemId: (taskId) => taskId,
    mutationFn: async (taskId) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) {throw error}
    },
    notifications: {
      success: 'Task deleted',
      error: 'Failed to delete task',
    },
    invalidateKeys: [taskKeys.all],
  })
}

// ============================================================================
// Optimistic Complete Task Toggle
// ============================================================================

/**
 * Toggle task completion status with optimistic UI
 * Instantly updates the UI while server processes
 */
export function useToggleTaskCompleteOptimistic(projectId: string) {
  return useOptimisticToggle<Task, string>({
    queryKey: taskKeys.list(projectId),
    getItemId: (taskId) => taskId,
    toggleField: 'status' as keyof Task, // Note: This is a simplified example
    mutationFn: async (taskId) => {
      // First get current task to determine new status
      const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single()

      if (fetchError) {throw fetchError}

      const newStatus = currentTask.status === 'completed' ? 'pending' : 'completed'

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {throw error}
      return data as Task
    },
    notifications: {
      success: (data) => data.status === 'completed' ? 'Task completed' : 'Task reopened',
      error: 'Failed to update task status',
    },
    invalidateKeys: [taskKeys.all],
  })
}

// ============================================================================
// Optimistic Update Task Status
// ============================================================================

/**
 * Update task status with optimistic UI
 * Useful for kanban-style status changes
 */
export function useUpdateTaskStatusOptimistic(projectId: string) {
  return useOptimisticUpdate<Task, { id: string; status: string }>({
    queryKey: taskKeys.list(projectId),
    getItemId: (vars) => vars.id,
    updateItem: (item, vars) => ({
      ...item,
      status: vars.status,
      updated_at: new Date().toISOString(),
      completed_at: vars.status === 'completed' ? new Date().toISOString() : item.completed_at,
    }),
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Task
    },
    notifications: {
      success: (data) => `Task status updated to ${data.status}`,
      error: 'Failed to update task status',
    },
    invalidateKeys: [taskKeys.all],
  })
}
