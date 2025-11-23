// File: /src/lib/api/services/tasks.ts
// Tasks API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { Task } from '@/types/database'
import type { QueryOptions } from '../types'

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
    data: Omit<Task, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Task> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.insert<Task>('tasks', {
        ...data,
        status: data.status || 'pending',
      })
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
    updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Task> {
    try {
      if (!taskId) {
        throw new ApiErrorClass({
          code: 'TASK_ID_REQUIRED',
          message: 'Task ID is required',
        })
      }

      return await apiClient.update<Task>('tasks', taskId, updates)
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
