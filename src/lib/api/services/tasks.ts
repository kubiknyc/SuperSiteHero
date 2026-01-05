// File: /src/lib/api/services/tasks.ts
// Tasks API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import { generateTaskAssignedEmail } from '@/lib/email/templates'
import type { Task } from '@/types/database'
import type { QueryOptions } from '../types'
import { logger } from '@/lib/utils/logger'

// Helper to get user details for notifications
async function getUserDetails(userId: string): Promise<{ email: string; full_name: string | null } | null> {
  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()
  return data
}

// Helper to get project name
async function getProjectName(projectId: string): Promise<string> {
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  return data?.name || 'Unknown Project'
}

// Helper to get subcontractor contact email
async function getSubcontractorContactEmail(subcontractorId: string): Promise<{ email: string; company_name: string } | null> {
  const { data } = await supabase
    .from('subcontractors')
    .select(`
      company_name,
      contacts(email, first_name, last_name)
    `)
    .eq('id', subcontractorId)
    .single()

  if (!data?.contacts) {return null}
  const contact = data.contacts as any
  return {
    email: contact.email,
    company_name: data.company_name,
  }
}

export const tasksApi = {
  /**
   * Fetch all tasks for a project
   */
  async getProjectTasks(
    projectId: string,
    options?: QueryOptions
  ): Promise<Task[]> {
    try {
      return await apiClient.select<Task>('tasks', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'project_id', operator: 'eq', value: projectId },
        ],
        orderBy: options?.orderBy || { column: 'due_date', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TASKS_ERROR',
            message: 'Failed to fetch tasks',
          })
    }
  },

  /**
   * Fetch a single task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    try {
      return await apiClient.selectOne<Task>('tasks', taskId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TASK_ERROR',
            message: 'Failed to fetch task',
          })
    }
  },

  /**
   * Fetch tasks assigned to a specific user
   */
  async getUserTasks(userId: string, projectId?: string): Promise<Task[]> {
    try {
      const filters = [{ column: 'assigned_to_user_id', operator: 'eq' as const, value: userId }]

      if (projectId) {
        filters.push({ column: 'project_id', operator: 'eq' as const, value: projectId })
      }

      return await apiClient.select<Task>('tasks', {
        filters,
        orderBy: { column: 'due_date', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_USER_TASKS_ERROR',
            message: 'Failed to fetch user tasks',
          })
    }
  },

  /**
   * Create a new task
   */
  async createTask(
    data: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
    options?: { createdById?: string }
  ): Promise<Task> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const result = await apiClient.insert<Task>('tasks', {
        ...data,
        status: data.status || 'pending',
      })

      // Send notification if task is assigned to a user
      if (data.assigned_to_user_id) {
        this._notifyTaskAssigned(result, options?.createdById).catch(err => logger.error('[Task] Failed to notify task assigned:', err))
      }

      // Send notification if task is assigned to a subcontractor
      if (data.assigned_to_subcontractor_id) {
        this._notifySubcontractorTaskAssigned(result, options?.createdById).catch(err => logger.error('[Task] Failed to notify subcontractor task assigned:', err))
      }

      return result
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TASK_ERROR',
            message: 'Failed to create task',
          })
    }
  },

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>,
    options?: { updatedById?: string }
  ): Promise<Task> {
    try {
      if (!taskId) {
        throw new ApiErrorClass({
          code: 'TASK_ID_REQUIRED',
          message: 'Task ID is required',
        })
      }

      // Get existing task to check for assignment changes
      const existingTask = await this.getTask(taskId)
      const wasAssignedToUser = existingTask.assigned_to_user_id
      const wasAssignedToSub = existingTask.assigned_to_subcontractor_id
      const newUserAssignee = updates.assigned_to_user_id
      const newSubcontractorAssignee = updates.assigned_to_subcontractor_id

      const result = await apiClient.update<Task>('tasks', taskId, updates)

      // Send notification if user assignee changed
      if (newUserAssignee && newUserAssignee !== wasAssignedToUser) {
        this._notifyTaskAssigned(result, options?.updatedById).catch(err => logger.error('[Task] Failed to notify task assigned:', err))
      }

      // Send notification if subcontractor assignee changed
      if (newSubcontractorAssignee && newSubcontractorAssignee !== wasAssignedToSub) {
        this._notifySubcontractorTaskAssigned(result, options?.updatedById).catch(err => logger.error('[Task] Failed to notify subcontractor task assigned:', err))
      }

      return result
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TASK_ERROR',
            message: 'Failed to update task',
          })
    }
  },

  /**
   * Send email notification when task is assigned
   */
  async _notifyTaskAssigned(task: Task, assignedById?: string): Promise<void> {
    try {
      if (!task.assigned_to_user_id) {return}

      const [assignee, assigner, projectName] = await Promise.all([
        getUserDetails(task.assigned_to_user_id),
        assignedById ? getUserDetails(assignedById) : Promise.resolve(null),
        getProjectName(task.project_id),
      ])

      if (!assignee?.email) {return}

      const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
      const { html, text } = generateTaskAssignedEmail({
        recipientName: assignee.full_name || assignee.email.split('@')[0],
        taskTitle: task.title,
        projectName,
        assignedBy: assigner?.full_name || 'Someone',
        dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
        priority: task.priority ?? undefined,
        description: task.description ?? undefined,
        category: (task as any).category ?? undefined,
        viewUrl: `${appUrl}/projects/${task.project_id}/tasks/${task.id}`,
      })

      await sendEmail({
        to: { email: assignee.email, name: assignee.full_name ?? undefined },
        subject: `Task Assigned: ${task.title}`,
        html,
        text,
        tags: ['task', 'assigned'],
      })
    } catch (error) {
      logger.error('[Task] Failed to send assignment notification:', error)
    }
  },

  /**
   * Send email notification when task is assigned to a subcontractor
   */
  async _notifySubcontractorTaskAssigned(task: Task, assignedById?: string): Promise<void> {
    try {
      if (!task.assigned_to_subcontractor_id) {return}

      const [subcontractor, assigner, projectName] = await Promise.all([
        getSubcontractorContactEmail(task.assigned_to_subcontractor_id),
        assignedById ? getUserDetails(assignedById) : Promise.resolve(null),
        getProjectName(task.project_id),
      ])

      if (!subcontractor?.email) {return}

      const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
      const { html, text } = generateTaskAssignedEmail({
        recipientName: subcontractor.company_name,
        taskTitle: task.title,
        projectName,
        assignedBy: assigner?.full_name || 'Someone',
        dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
        priority: task.priority ?? undefined,
        description: task.description ?? undefined,
        viewUrl: `${appUrl}/portal/tasks`,
      })

      await sendEmail({
        to: { email: subcontractor.email, name: subcontractor.company_name },
        subject: `Task Assigned: ${task.title}`,
        html,
        text,
        tags: ['task', 'assigned', 'subcontractor'],
      })
    } catch (error) {
      logger.error('[Task] Failed to send subcontractor assignment notification:', error)
    }
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      if (!taskId) {
        throw new ApiErrorClass({
          code: 'TASK_ID_REQUIRED',
          message: 'Task ID is required',
        })
      }

      await apiClient.delete('tasks', taskId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_TASK_ERROR',
            message: 'Failed to delete task',
          })
    }
  },

  /**
   * Complete a task
   */
  async completeTask(taskId: string): Promise<Task> {
    try {
      return await apiClient.update<Task>('tasks', taskId, {
        status: 'completed',
        completed_date: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'COMPLETE_TASK_ERROR',
            message: 'Failed to complete task',
          })
    }
  },

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string): Promise<Task> {
    try {
      return await apiClient.update<Task>('tasks', taskId, {
        status,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TASK_STATUS_ERROR',
            message: 'Failed to update task status',
          })
    }
  },
}
