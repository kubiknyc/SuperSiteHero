// @ts-nocheck
// File: /src/features/tasks/hooks/useTasksMutations.ts
// Task mutation hooks WITH notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { tasksApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthContext'
import { sendTaskAssignedNotification } from '@/lib/notifications/notification-service'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type { Task } from '@/types/database'

/**
 * Helper to get user details for notification
 */
async function getUserDetails(userId: string): Promise<{ email: string; name?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (error || !data) {return null}
    return { email: data.email, name: data.full_name || undefined }
  } catch {
    return null
  }
}

/**
 * Helper to get project name
 */
async function getProjectName(projectId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()
    return data?.name || 'Unknown Project'
  } catch {
    return 'Unknown Project'
  }
}

/**
 * Create a new task with automatic success/error notifications
 */
export function useCreateTaskWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    Task,
    Error,
    Omit<Task, 'id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: async (task) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return tasksApi.createTask({
        ...task,
        created_by: userProfile.id,
      })
    },
    successMessage: (data) => `Task "${data.title}" created successfully`,
    errorMessage: (error) => `Failed to create task: ${error.message}`,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })

      // Send email notification if task is assigned to someone other than creator
      if (data.assigned_to && data.assigned_to !== userProfile?.id) {
        try {
          const assigneeDetails = await getUserDetails(data.assigned_to)
          if (assigneeDetails) {
            const projectName = await getProjectName(data.project_id)
            const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'

            await sendTaskAssignedNotification(
              {
                userId: data.assigned_to,
                email: assigneeDetails.email,
                name: assigneeDetails.name,
              },
              {
                taskTitle: data.title,
                projectName,
                assignedBy: userProfile?.full_name || userProfile?.email || 'Unknown',
                dueDate: data.due_date ? new Date(data.due_date).toLocaleDateString() : undefined,
                priority: data.priority || undefined,
                description: data.description || undefined,
                viewUrl: `${appUrl}/tasks/${data.id}`,
              }
            )
          }
        } catch (_error) {
          logger.error('[Tasks] Failed to send task assignment notification:', _error)
        }
      }
    },
  })
}

/**
 * Update a task with automatic success/error notifications
 */
export function useUpdateTaskWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Task,
    Error,
    { id: string; data: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, data }) => {
      return tasksApi.updateTask(id, data)
    },
    successMessage: (data) => `Task "${data.title}" updated successfully`,
    errorMessage: (error) => `Failed to update task: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.id] })
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
    },
  })
}

/**
 * Delete a task with automatic success/error notifications
 */
export function useDeleteTaskWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (taskId) => {
      return tasksApi.deleteTask(taskId)
    },
    successMessage: 'Task deleted successfully',
    errorMessage: (error) => `Failed to delete task: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
    },
  })
}

/**
 * Complete a task with automatic success/error notifications
 */
export function useCompleteTaskWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<Task, Error, string>({
    mutationFn: async (taskId) => {
      return tasksApi.completeTask(taskId)
    },
    successMessage: 'Task completed',
    errorMessage: (error) => `Failed to complete task: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.id] })
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
    },
  })
}

/**
 * Update task status with automatic success/error notifications
 */
export function useUpdateTaskStatusWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Task,
    Error,
    { taskId: string; status: string }
  >({
    mutationFn: async ({ taskId, status }) => {
      return tasksApi.updateTaskStatus(taskId, status)
    },
    successMessage: (data) => `Task status updated to "${data.status}"`,
    errorMessage: (error) => `Failed to update task status: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', data.id] })
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
    },
  })
}
