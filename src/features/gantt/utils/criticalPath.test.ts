// File: src/features/gantt/utils/criticalPath.test.ts
// Comprehensive tests for Critical Path Method (CPM) algorithm
// Phase: Testing - Gantt feature coverage

import { describe, it, expect } from 'vitest'
import {
  calculateCriticalPath,
  getCriticalTasks,
  isTaskCritical,
  getTaskFloat,
} from './criticalPath'
import type { GanttTask, TaskDependency } from '@/types/schedule'

// Helper to create mock GanttTask
const createMockTask = (overrides: Partial<GanttTask> = {}): GanttTask => ({
  id: 'task-1',
  project_id: 'project-1',
  task_name: 'Test Task',
  start_date: '2024-01-01',
  finish_date: '2024-01-10',
  duration_days: 10,
  percent_complete: 0,
  status: 'not_started',
  is_critical: false,
  is_milestone: false,
  sort_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// Helper to create mock TaskDependency
const createMockDependency = (overrides: Partial<TaskDependency> = {}): TaskDependency => ({
  id: 'dep-1',
  project_id: 'project-1',
  predecessor_id: 'task-1',
  successor_id: 'task-2',
  dependency_type: 'FS',
  lag_days: 0,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('Critical Path Module', () => {
  // =============================================
  // CALCULATE CRITICAL PATH
  // =============================================

  describe('calculateCriticalPath', () => {
    it('should handle empty task list', () => {
      const result = calculateCriticalPath([], [])

      expect(result.nodes.size).toBe(0)
      expect(result.criticalPath).toEqual([])
      expect(result.projectDuration).toBe(0)
    })

    it('should calculate critical path for single task', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
      ]

      const result = calculateCriticalPath(tasks, [])

      expect(result.nodes.size).toBe(1)
      expect(result.criticalPath).toContain('task-1')
    })

    it('should identify critical path in serial tasks', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-11', finish_date: '2024-01-20', duration_days: 10 }),
        createMockTask({ id: 'task-3', start_date: '2024-01-21', finish_date: '2024-01-30', duration_days: 10 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-2' }),
        createMockDependency({ id: 'dep-2', predecessor_id: 'task-2', successor_id: 'task-3' }),
      ]

      const result = calculateCriticalPath(tasks, dependencies)

      expect(result.criticalPath).toContain('task-1')
      expect(result.criticalPath).toContain('task-2')
      expect(result.criticalPath).toContain('task-3')
    })

    it('should identify critical path in parallel tasks', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-01', finish_date: '2024-01-05', duration_days: 5 }),
        createMockTask({ id: 'task-3', start_date: '2024-01-11', finish_date: '2024-01-15', duration_days: 5 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-3' }),
        createMockDependency({ id: 'dep-2', predecessor_id: 'task-2', successor_id: 'task-3' }),
      ]

      const result = calculateCriticalPath(tasks, dependencies)

      // Task 1 (10 days) -> Task 3 is critical
      // Task 2 (5 days) has float
      expect(result.criticalPath).toContain('task-1')
      expect(result.criticalPath).toContain('task-3')
    })

    it('should handle Start-to-Start (SS) dependency', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-01', finish_date: '2024-01-05', duration_days: 5 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-2', dependency_type: 'SS' }),
      ]

      const result = calculateCriticalPath(tasks, dependencies)

      expect(result.nodes.size).toBe(2)
    })

    it('should handle Finish-to-Finish (FF) dependency', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-05', finish_date: '2024-01-10', duration_days: 5 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-2', dependency_type: 'FF' }),
      ]

      const result = calculateCriticalPath(tasks, dependencies)

      expect(result.nodes.size).toBe(2)
    })

    it('should handle Start-to-Finish (SF) dependency', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-05', finish_date: '2024-01-15', duration_days: 10 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-2', dependency_type: 'SF' }),
      ]

      const result = calculateCriticalPath(tasks, dependencies)

      expect(result.nodes.size).toBe(2)
    })

    it('should calculate float correctly', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-01', finish_date: '2024-01-05', duration_days: 5 }),
        createMockTask({ id: 'task-3', start_date: '2024-01-11', finish_date: '2024-01-20', duration_days: 10 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-3' }),
        createMockDependency({ id: 'dep-2', predecessor_id: 'task-2', successor_id: 'task-3' }),
      ]

      const result = calculateCriticalPath(tasks, dependencies)

      // Task 2 has float since it's shorter than task 1
      const task2Node = result.nodes.get('task-2')
      expect(task2Node?.totalFloat).toBeGreaterThan(0)
    })

    it('should handle lag days in dependencies', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-13', finish_date: '2024-01-20', duration_days: 8 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-2', lag_days: 2 }),
      ]

      const result = calculateCriticalPath(tasks, dependencies)

      // Should account for 2-day lag
      expect(result.projectDuration).toBeGreaterThan(10)
    })
  })

  // =============================================
  // GET CRITICAL TASKS
  // =============================================

  describe('getCriticalTasks', () => {
    it('should return only critical tasks', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-01', finish_date: '2024-01-03', duration_days: 3 }),
      ]

      const criticalTasks = getCriticalTasks(tasks, [])

      expect(criticalTasks.length).toBeGreaterThan(0)
      expect(criticalTasks.every(t => tasks.some(task => task.id === t.id))).toBe(true)
    })

    it('should return empty array for empty input', () => {
      const result = getCriticalTasks([], [])

      expect(result).toEqual([])
    })
  })

  // =============================================
  // IS TASK CRITICAL
  // =============================================

  describe('isTaskCritical', () => {
    it('should return true for critical task', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-20', duration_days: 20 }),
      ]

      const isCritical = isTaskCritical('task-1', tasks, [])

      expect(isCritical).toBe(true)
    })

    it('should return false for non-existent task', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
      ]

      const isCritical = isTaskCritical('non-existent', tasks, [])

      expect(isCritical).toBe(false)
    })
  })

  // =============================================
  // GET TASK FLOAT
  // =============================================

  describe('getTaskFloat', () => {
    it('should return float values for existing task', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
        createMockTask({ id: 'task-2', start_date: '2024-01-01', finish_date: '2024-01-05', duration_days: 5 }),
        createMockTask({ id: 'task-3', start_date: '2024-01-11', finish_date: '2024-01-20', duration_days: 10 }),
      ]
      const dependencies = [
        createMockDependency({ id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-3' }),
        createMockDependency({ id: 'dep-2', predecessor_id: 'task-2', successor_id: 'task-3' }),
      ]

      const float = getTaskFloat('task-2', tasks, dependencies)

      expect(float).not.toBeNull()
      expect(float).toHaveProperty('totalFloat')
      expect(float).toHaveProperty('freeFloat')
    })

    it('should return null for non-existent task', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
      ]

      const float = getTaskFloat('non-existent', tasks, [])

      expect(float).toBeNull()
    })

    it('should return zero float for critical task', () => {
      const tasks = [
        createMockTask({ id: 'task-1', start_date: '2024-01-01', finish_date: '2024-01-10', duration_days: 10 }),
      ]

      const float = getTaskFloat('task-1', tasks, [])

      expect(float?.totalFloat).toBe(0)
    })
  })
})
