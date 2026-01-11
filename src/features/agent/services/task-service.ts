/**
 * Task Service
 * CRUD operations and management for agent background tasks
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type {
  AgentTask,
  TaskType,
  TaskStatus,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskStatistics,
  DailyTaskSummary,
} from '../types/tasks'

// ============================================================================
// Types
// ============================================================================

interface ListTasksOptions {
  projectId?: string
  status?: TaskStatus | TaskStatus[]
  taskType?: TaskType | TaskType[]
  targetEntityType?: string
  targetEntityId?: string
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'updated_at' | 'priority' | 'scheduled_for'
  orderDirection?: 'asc' | 'desc'
}

interface TaskFilters {
  dateFrom?: string
  dateTo?: string
  status?: TaskStatus[]
  taskType?: TaskType[]
}

// ============================================================================
// Task Service Class
// ============================================================================

class TaskService {
  /**
   * Get the current user's company ID
   */
  private async getCompanyId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {return null}

    const { data } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    return data?.company_id || null
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new task
   */
  async create(dto: CreateTaskDTO): Promise<AgentTask> {
    const companyId = await this.getCompanyId()
    if (!companyId) {
      throw new Error('User not authenticated or no company association')
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('agent_tasks')
      .insert({
        company_id: companyId,
        project_id: dto.project_id || null,
        session_id: dto.session_id || null,
        task_type: dto.task_type,
        status: dto.scheduled_for ? 'scheduled' : 'pending',
        priority: dto.priority || 100,
        input_data: dto.input_data,
        target_entity_type: dto.target_entity_type || null,
        target_entity_id: dto.target_entity_id || null,
        scheduled_for: dto.scheduled_for || null,
        max_retries: dto.max_retries ?? 3,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('[TaskService] Error creating task:', error)
      throw error
    }

    return data as AgentTask
  }

  /**
   * Get a single task by ID
   */
  async get(taskId: string): Promise<AgentTask | null> {
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {return null}
      logger.error('[TaskService] Error fetching task:', error)
      throw error
    }

    return data as AgentTask
  }

  /**
   * List tasks with filters
   */
  async list(options: ListTasksOptions = {}): Promise<{ tasks: AgentTask[]; total: number }> {
    const {
      projectId,
      status,
      taskType,
      targetEntityType,
      targetEntityId,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = options

    let query = supabase
      .from('agent_tasks')
      .select('*', { count: 'exact' })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status)
      } else {
        query = query.eq('status', status)
      }
    }

    if (taskType) {
      if (Array.isArray(taskType)) {
        query = query.in('task_type', taskType)
      } else {
        query = query.eq('task_type', taskType)
      }
    }

    if (targetEntityType) {
      query = query.eq('target_entity_type', targetEntityType)
    }

    if (targetEntityId) {
      query = query.eq('target_entity_id', targetEntityId)
    }

    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      logger.error('[TaskService] Error listing tasks:', error)
      throw error
    }

    return {
      tasks: (data || []) as AgentTask[],
      total: count || 0,
    }
  }

  /**
   * Update a task
   */
  async update(taskId: string, dto: UpdateTaskDTO): Promise<AgentTask> {
    const updateData: Record<string, unknown> = {}

    if (dto.status !== undefined) {updateData.status = dto.status}
    if (dto.output_data !== undefined) {updateData.output_data = dto.output_data}
    if (dto.error_message !== undefined) {updateData.error_message = dto.error_message}
    if (dto.error_details !== undefined) {updateData.error_details = dto.error_details}
    if (dto.tokens_used !== undefined) {updateData.tokens_used = dto.tokens_used}
    if (dto.cost_cents !== undefined) {updateData.cost_cents = dto.cost_cents}

    const { data, error } = await supabase
      .from('agent_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      logger.error('[TaskService] Error updating task:', error)
      throw error
    }

    return data as AgentTask
  }

  /**
   * Cancel a task
   */
  async cancel(taskId: string): Promise<AgentTask> {
    return this.update(taskId, { status: 'cancelled' })
  }

  /**
   * Delete a task
   */
  async delete(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      logger.error('[TaskService] Error deleting task:', error)
      throw error
    }
  }

  // ============================================================================
  // Task Status Management
  // ============================================================================

  /**
   * Get pending tasks ready for processing
   */
  async getPendingTasks(limit: number = 10): Promise<AgentTask[]> {
    const { data, error } = await supabase.rpc('get_pending_agent_tasks', {
      p_company_id: null, // Will be filtered by RLS
      p_limit: limit,
    })

    if (error) {
      logger.error('[TaskService] Error getting pending tasks:', error)
      throw error
    }

    return (data || []) as AgentTask[]
  }

  /**
   * Claim a task for processing
   */
  async claimTask(taskId: string): Promise<AgentTask | null> {
    const { data, error } = await supabase.rpc('claim_agent_task', {
      p_task_id: taskId,
    })

    if (error) {
      logger.error('[TaskService] Error claiming task:', error)
      throw error
    }

    return data as AgentTask | null
  }

  /**
   * Complete a task successfully
   */
  async completeTask(
    taskId: string,
    outputData: Record<string, unknown>,
    metrics?: { tokensUsed?: number; costCents?: number }
  ): Promise<AgentTask> {
    const { data, error } = await supabase.rpc('complete_agent_task', {
      p_task_id: taskId,
      p_output_data: outputData,
      p_tokens_used: metrics?.tokensUsed || null,
      p_cost_cents: metrics?.costCents || null,
    })

    if (error) {
      logger.error('[TaskService] Error completing task:', error)
      throw error
    }

    return data as AgentTask
  }

  /**
   * Fail a task with optional retry
   */
  async failTask(
    taskId: string,
    errorMessage: string,
    errorDetails?: Record<string, unknown>,
    shouldRetry: boolean = true
  ): Promise<AgentTask> {
    const { data, error } = await supabase.rpc('fail_agent_task', {
      p_task_id: taskId,
      p_error_message: errorMessage,
      p_error_details: errorDetails || null,
      p_should_retry: shouldRetry,
    })

    if (error) {
      logger.error('[TaskService] Error failing task:', error)
      throw error
    }

    return data as AgentTask
  }

  // ============================================================================
  // Task Statistics
  // ============================================================================

  /**
   * Get task statistics for a period
   */
  async getStatistics(filters: TaskFilters = {}): Promise<TaskStatistics> {
    const {
      dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      dateTo = new Date().toISOString(),
      status,
      taskType,
    } = filters

    let query = supabase
      .from('agent_tasks')
      .select('status, task_type, execution_time_ms, tokens_used, cost_cents')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)

    if (status && status.length > 0) {
      query = query.in('status', status)
    }

    if (taskType && taskType.length > 0) {
      query = query.in('task_type', taskType)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[TaskService] Error getting statistics:', error)
      throw error
    }

    const tasks = data || []
    const byStatus: Record<TaskStatus, number> = {
      pending: 0,
      scheduled: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }
    const byType: Record<string, number> = {}
    let totalExecutionTime = 0
    let executionCount = 0
    let totalTokens = 0
    let totalCost = 0
    let completedCount = 0
    let failedCount = 0

    for (const task of tasks) {
      // Count by status
      byStatus[task.status as TaskStatus] = (byStatus[task.status as TaskStatus] || 0) + 1

      // Count by type
      byType[task.task_type] = (byType[task.task_type] || 0) + 1

      // Aggregate metrics
      if (task.execution_time_ms) {
        totalExecutionTime += task.execution_time_ms
        executionCount++
      }
      if (task.tokens_used) {totalTokens += task.tokens_used}
      if (task.cost_cents) {totalCost += task.cost_cents}

      // Success rate calculation
      if (task.status === 'completed') {completedCount++}
      if (task.status === 'failed') {failedCount++}
    }

    return {
      total: tasks.length,
      by_status: byStatus,
      by_type: byType as Record<TaskType, number>,
      average_execution_time_ms: executionCount > 0 ? totalExecutionTime / executionCount : 0,
      total_tokens_used: totalTokens,
      total_cost_cents: totalCost,
      success_rate: completedCount + failedCount > 0
        ? (completedCount / (completedCount + failedCount)) * 100
        : 100,
      period: {
        start: dateFrom,
        end: dateTo,
      },
    }
  }

  /**
   * Get daily task summaries
   */
  async getDailySummaries(days: number = 7): Promise<DailyTaskSummary[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('agent_tasks')
      .select('created_at, completed_at, status, tokens_used, cost_cents')
      .gte('created_at', startDate.toISOString())

    if (error) {
      logger.error('[TaskService] Error getting daily summaries:', error)
      throw error
    }

    // Group by date
    const summaryMap = new Map<string, DailyTaskSummary>()

    for (let i = 0; i <= days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      summaryMap.set(dateStr, {
        date: dateStr,
        tasks_created: 0,
        tasks_completed: 0,
        tasks_failed: 0,
        tokens_used: 0,
        cost_cents: 0,
      })
    }

    for (const task of data || []) {
      const createdDate = task.created_at.split('T')[0]
      const summary = summaryMap.get(createdDate)
      if (summary) {
        summary.tasks_created++
        if (task.status === 'completed') {summary.tasks_completed++}
        if (task.status === 'failed') {summary.tasks_failed++}
        if (task.tokens_used) {summary.tokens_used += task.tokens_used}
        if (task.cost_cents) {summary.cost_cents += task.cost_cents}
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.date.localeCompare(a.date))
  }

  // ============================================================================
  // Task History
  // ============================================================================

  /**
   * Get task history for an entity
   */
  async getTaskHistoryForEntity(
    entityType: string,
    entityId: string,
    limit: number = 20
  ): Promise<AgentTask[]> {
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('target_entity_type', entityType)
      .eq('target_entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('[TaskService] Error getting task history:', error)
      throw error
    }

    return (data || []) as AgentTask[]
  }

  /**
   * Get recent tasks for a project
   */
  async getRecentProjectTasks(projectId: string, limit: number = 20): Promise<AgentTask[]> {
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('[TaskService] Error getting project tasks:', error)
      throw error
    }

    return (data || []) as AgentTask[]
  }

  /**
   * Retry a failed task
   */
  async retryTask(taskId: string): Promise<AgentTask> {
    const task = await this.get(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    if (task.status !== 'failed' && task.status !== 'cancelled') {
      throw new Error(`Cannot retry task with status: ${task.status}`)
    }

    const { data, error } = await supabase
      .from('agent_tasks')
      .update({
        status: 'pending',
        error_message: null,
        error_details: null,
        started_at: null,
        completed_at: null,
        retry_count: 0,
        next_retry_at: null,
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      logger.error('[TaskService] Error retrying task:', error)
      throw error
    }

    return data as AgentTask
  }

  /**
   * Bulk cancel tasks
   */
  async bulkCancel(taskIds: string[]): Promise<number> {
    const { error, count } = await supabase
      .from('agent_tasks')
      .update({ status: 'cancelled' })
      .in('id', taskIds)
      .in('status', ['pending', 'scheduled'])

    if (error) {
      logger.error('[TaskService] Error bulk cancelling tasks:', error)
      throw error
    }

    return count || 0
  }

  /**
   * Clean up old completed/failed tasks
   */
  async cleanupOldTasks(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { error, count } = await supabase
      .from('agent_tasks')
      .delete()
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('completed_at', cutoffDate.toISOString())

    if (error) {
      logger.error('[TaskService] Error cleaning up old tasks:', error)
      throw error
    }

    return count || 0
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const taskService = new TaskService()

// ============================================================================
// Re-export types
// ============================================================================

export type {
  AgentTask,
  TaskType,
  TaskStatus,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskStatistics,
  DailyTaskSummary,
  ListTasksOptions,
  TaskFilters,
}
