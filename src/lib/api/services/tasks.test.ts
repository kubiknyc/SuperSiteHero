/**
 * Tasks API Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tasksApi } from './tasks'
import { apiClient } from '../client'

vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('tasksApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API client mocks
    vi.mocked(apiClient).select.mockResolvedValue([])
    vi.mocked(apiClient).selectOne.mockResolvedValue({} as any)
    vi.mocked(apiClient).insert.mockResolvedValue({} as any)
    vi.mocked(apiClient).update.mockResolvedValue({} as any)
    vi.mocked(apiClient).delete.mockResolvedValue(undefined)
  })

  describe('getProjectTasks', () => {
    const mockTasks = [
      {
        id: 'task-1',
        project_id: 'proj-1',
        title: 'Install electrical panel',
        description: 'Complete installation by Friday',
        status: 'in_progress',
        priority: 'high',
        due_date: '2025-01-31',
      },
      {
        id: 'task-2',
        project_id: 'proj-1',
        title: 'Review structural drawings',
        description: 'Check for compliance',
        status: 'pending',
        priority: 'normal',
        due_date: '2025-02-05',
      },
    ]

    it('should fetch all tasks for a project', async () => {
      vi.mocked(apiClient).select.mockResolvedValue(mockTasks)

      const result = await tasksApi.getProjectTasks('proj-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('task-1')
      expect(apiClient.select).toHaveBeenCalledWith(
        'tasks',
        expect.objectContaining({
          filters: expect.arrayContaining([
            { column: 'project_id', operator: 'eq', value: 'proj-1' },
          ]),
          orderBy: { column: 'due_date', ascending: true },
        })
      )
    })

    it('should apply custom query options', async () => {
      vi.mocked(apiClient).select.mockResolvedValue(mockTasks)

      await tasksApi.getProjectTasks('proj-1', {
        filters: [{ column: 'status', operator: 'eq', value: 'in_progress' }],
        orderBy: { column: 'priority', ascending: false },
      })

      expect(apiClient.select).toHaveBeenCalledWith(
        'tasks',
        expect.objectContaining({
          filters: expect.arrayContaining([
            { column: 'status', operator: 'eq', value: 'in_progress' },
            { column: 'project_id', operator: 'eq', value: 'proj-1' },
          ]),
          orderBy: { column: 'priority', ascending: false },
        })
      )
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).select.mockRejectedValue(new Error('API error'))

      await expect(tasksApi.getProjectTasks('proj-1')).rejects.toThrow()
    })
  })

  describe('getTask', () => {
    const mockTask = {
      id: 'task-1',
      project_id: 'proj-1',
      title: 'Install electrical panel',
      status: 'in_progress',
      priority: 'high',
    }

    it('should fetch a single task by ID', async () => {
      vi.mocked(apiClient).selectOne.mockResolvedValue(mockTask)

      const result = await tasksApi.getTask('task-1')

      expect(result.id).toBe('task-1')
      expect(result.title).toBe('Install electrical panel')
      expect(apiClient.selectOne).toHaveBeenCalledWith('tasks', 'task-1')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).selectOne.mockRejectedValue(new Error('Not found'))

      await expect(tasksApi.getTask('nonexistent')).rejects.toThrow()
    })
  })

  describe('getUserTasks', () => {
    const mockUserTasks = [
      {
        id: 'task-1',
        project_id: 'proj-1',
        assigned_to_user_id: 'user-1',
        title: 'Review plans',
        status: 'pending',
        due_date: '2025-01-28',
      },
      {
        id: 'task-2',
        project_id: 'proj-2',
        assigned_to_user_id: 'user-1',
        title: 'Inspect site',
        status: 'in_progress',
        due_date: '2025-01-29',
      },
    ]

    it('should fetch all tasks for a user', async () => {
      vi.mocked(apiClient).select.mockResolvedValue(mockUserTasks)

      const result = await tasksApi.getUserTasks('user-1')

      expect(result).toHaveLength(2)
      expect(result[0].assigned_to_user_id).toBe('user-1')
      expect(apiClient.select).toHaveBeenCalledWith(
        'tasks',
        expect.objectContaining({
          filters: expect.arrayContaining([
            { column: 'assigned_to_user_id', operator: 'eq', value: 'user-1' },
          ]),
          orderBy: { column: 'due_date', ascending: true },
        })
      )
    })

    it('should filter by project when projectId is provided', async () => {
      vi.mocked(apiClient).select.mockResolvedValue([mockUserTasks[0]])

      const result = await tasksApi.getUserTasks('user-1', 'proj-1')

      expect(result).toHaveLength(1)
      expect(result[0].project_id).toBe('proj-1')
      expect(apiClient.select).toHaveBeenCalledWith(
        'tasks',
        expect.objectContaining({
          filters: expect.arrayContaining([
            { column: 'assigned_to_user_id', operator: 'eq', value: 'user-1' },
            { column: 'project_id', operator: 'eq', value: 'proj-1' },
          ]),
        })
      )
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).select.mockRejectedValue(new Error('API error'))

      await expect(tasksApi.getUserTasks('user-1')).rejects.toThrow()
    })
  })

  describe('createTask', () => {
    const taskInput = {
      project_id: 'proj-1',
      title: 'New Task',
      description: 'Task description',
      priority: 'normal',
      assigned_to_user_id: 'user-1',
      due_date: '2025-02-01',
    }

    const createdTask = {
      id: 'task-new',
      ...taskInput,
      status: 'pending',
      created_at: '2025-01-27T10:00:00Z',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should create a new task', async () => {
      vi.mocked(apiClient).insert.mockResolvedValue(createdTask)

      const result = await tasksApi.createTask(taskInput as any)

      expect(result.id).toBe('task-new')
      expect(result.status).toBe('pending')
      expect(apiClient.insert).toHaveBeenCalledWith(
        'tasks',
        expect.objectContaining({
          ...taskInput,
          status: 'pending',
        })
      )
    })

    it('should use provided status if specified', async () => {
      const taskWithStatus = { ...taskInput, status: 'in_progress' }
      const createdTaskWithStatus = { ...createdTask, status: 'in_progress' }

      vi.mocked(apiClient).insert.mockResolvedValue(createdTaskWithStatus)

      const result = await tasksApi.createTask(taskWithStatus as any)

      expect(result.status).toBe('in_progress')
      expect(apiClient.insert).toHaveBeenCalledWith(
        'tasks',
        expect.objectContaining({
          status: 'in_progress',
        })
      )
    })

    it('should throw error when project_id is missing', async () => {
      const invalidInput = { ...taskInput, project_id: '' } as any

      await expect(tasksApi.createTask(invalidInput)).rejects.toThrow('Project ID is required')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).insert.mockRejectedValue(new Error('Insert failed'))

      await expect(tasksApi.createTask(taskInput as any)).rejects.toThrow()
    })
  })

  describe('updateTask', () => {
    const updatedTask = {
      id: 'task-1',
      title: 'Updated Task Title',
      priority: 'high',
      status: 'in_progress',
    }

    it('should update a task', async () => {
      vi.mocked(apiClient).update.mockResolvedValue(updatedTask)

      const result = await tasksApi.updateTask('task-1', {
        title: 'Updated Task Title',
        priority: 'high',
      })

      expect(result.title).toBe('Updated Task Title')
      expect(result.priority).toBe('high')
      expect(apiClient.update).toHaveBeenCalledWith(
        'tasks',
        'task-1',
        expect.objectContaining({
          title: 'Updated Task Title',
          priority: 'high',
        })
      )
    })

    it('should throw error when task ID is missing', async () => {
      await expect(tasksApi.updateTask('', {})).rejects.toThrow('Task ID is required')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).update.mockRejectedValue(new Error('Update failed'))

      await expect(tasksApi.updateTask('task-1', {})).rejects.toThrow()
    })
  })

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      vi.mocked(apiClient).delete.mockResolvedValue(undefined)

      await tasksApi.deleteTask('task-1')

      expect(apiClient.delete).toHaveBeenCalledWith('tasks', 'task-1')
    })

    it('should throw error when task ID is missing', async () => {
      await expect(tasksApi.deleteTask('')).rejects.toThrow('Task ID is required')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).delete.mockRejectedValue(new Error('Delete failed'))

      await expect(tasksApi.deleteTask('task-1')).rejects.toThrow()
    })
  })

  describe('completeTask', () => {
    const completedTask = {
      id: 'task-1',
      title: 'Install electrical panel',
      status: 'completed',
      completed_date: '2025-01-27T10:00:00Z',
    }

    it('should complete a task', async () => {
      vi.mocked(apiClient).update.mockResolvedValue(completedTask)

      const result = await tasksApi.completeTask('task-1')

      expect(result.status).toBe('completed')
      expect(result.completed_date).toBeDefined()
      expect(apiClient.update).toHaveBeenCalledWith(
        'tasks',
        'task-1',
        expect.objectContaining({
          status: 'completed',
          completed_date: expect.any(String),
        })
      )
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).update.mockRejectedValue(new Error('Update failed'))

      await expect(tasksApi.completeTask('task-1')).rejects.toThrow()
    })
  })

  describe('updateTaskStatus', () => {
    const updatedTask = {
      id: 'task-1',
      title: 'Install electrical panel',
      status: 'in_progress',
    }

    it('should update task status', async () => {
      vi.mocked(apiClient).update.mockResolvedValue(updatedTask)

      const result = await tasksApi.updateTaskStatus('task-1', 'in_progress')

      expect(result.status).toBe('in_progress')
      expect(apiClient.update).toHaveBeenCalledWith(
        'tasks',
        'task-1',
        expect.objectContaining({
          status: 'in_progress',
        })
      )
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).update.mockRejectedValue(new Error('Update failed'))

      await expect(tasksApi.updateTaskStatus('task-1', 'completed')).rejects.toThrow()
    })
  })
})
