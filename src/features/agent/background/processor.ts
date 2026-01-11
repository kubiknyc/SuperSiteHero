/**
 * Task Queue Processor
 * Background processor for agent tasks with rate limiting and retry handling
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import { taskService } from '../services/task-service'
import { agentOrchestrator } from '../core/orchestrator'
import type {
  AgentTask,
  TaskType,
  TaskQueueConfig,
  TaskQueueState,
  DEFAULT_TASK_QUEUE_CONFIG,
  TaskHandler,
  TaskContext,
  TaskResult,
} from '../types/tasks'
import type { AgentContext } from '../types/agent'

// ============================================================================
// Types
// ============================================================================

interface RateLimitConfig {
  /** Maximum tasks per minute */
  maxTasksPerMinute: number
  /** Maximum tokens per minute */
  maxTokensPerMinute: number
  /** Delay between tasks in ms */
  taskDelayMs: number
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxTasksPerMinute: 30,
  maxTokensPerMinute: 100000,
  taskDelayMs: 2000,
}

// ============================================================================
// Task Handlers Registry
// ============================================================================

const taskHandlers = new Map<TaskType, TaskHandler>()

/**
 * Register a task handler
 */
export function registerTaskHandler(handler: TaskHandler): void {
  taskHandlers.set(handler.taskType, handler)
}

/**
 * Get a task handler by type
 */
export function getTaskHandler(taskType: TaskType): TaskHandler | undefined {
  return taskHandlers.get(taskType)
}

// ============================================================================
// Task Queue Processor Class
// ============================================================================

export class TaskQueueProcessor {
  private config: TaskQueueConfig
  private rateLimit: RateLimitConfig
  private state: TaskQueueState
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private abortController: AbortController | null = null
  private tasksThisMinute: number = 0
  private tokensThisMinute: number = 0
  private minuteResetTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    config?: Partial<TaskQueueConfig>,
    rateLimit?: Partial<RateLimitConfig>
  ) {
    this.config = {
      concurrency: 3,
      pollIntervalMs: 10000,
      batchSize: 5,
      taskTimeoutMs: 300000,
      respectWorkingHours: true,
      ...config
    }
    this.rateLimit = { ...DEFAULT_RATE_LIMIT, ...rateLimit }
    this.state = {
      isRunning: false,
      activeTaskIds: [],
      completedCount: 0,
      failedCount: 0,
      lastPollAt: null,
      lastError: null,
    }
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Start the processor
   */
  start(): void {
    if (this.state.isRunning) {
      logger.warn('[TaskProcessor] Already running')
      return
    }

    logger.info('[TaskProcessor] Starting task queue processor')
    this.state.isRunning = true
    this.abortController = new AbortController()

    // Start polling
    this.poll()
    this.pollInterval = setInterval(() => this.poll(), this.config.pollIntervalMs)

    // Start rate limit reset interval
    this.startRateLimitReset()
  }

  /**
   * Stop the processor
   */
  stop(): void {
    if (!this.state.isRunning) {return}

    logger.info('[TaskProcessor] Stopping task queue processor')
    this.state.isRunning = false

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    if (this.minuteResetTimeout) {
      clearTimeout(this.minuteResetTimeout)
      this.minuteResetTimeout = null
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Get current state
   */
  getState(): TaskQueueState {
    return { ...this.state }
  }

  // ============================================================================
  // Polling & Processing
  // ============================================================================

  /**
   * Poll for new tasks
   */
  private async poll(): Promise<void> {
    if (!this.state.isRunning) {return}

    // Check if we should respect working hours
    if (this.config.respectWorkingHours && !this.isWithinWorkingHours()) {
      logger.debug('[TaskProcessor] Outside working hours, skipping poll')
      return
    }

    // Check rate limits
    if (!this.canProcessMore()) {
      logger.debug('[TaskProcessor] Rate limit reached, waiting...')
      return
    }

    try {
      this.state.lastPollAt = new Date().toISOString()

      // Calculate how many tasks we can fetch
      const availableSlots = this.config.concurrency - this.state.activeTaskIds.length
      if (availableSlots <= 0) {return}

      const batchSize = Math.min(availableSlots, this.config.batchSize)

      // Fetch pending tasks
      const tasks = await taskService.getPendingTasks(batchSize)

      if (tasks.length === 0) {
        logger.debug('[TaskProcessor] No pending tasks')
        return
      }

      logger.info(`[TaskProcessor] Found ${tasks.length} pending tasks`)

      // Process tasks concurrently
      for (const task of tasks) {
        if (!this.canProcessMore()) {break}

        // Claim and process task
        this.processTask(task)
      }
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[TaskProcessor] Poll error:', error)
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: AgentTask): Promise<void> {
    const taskId = task.id

    try {
      // Claim the task
      const claimedTask = await taskService.claimTask(taskId)
      if (!claimedTask) {
        logger.debug(`[TaskProcessor] Task ${taskId} already claimed`)
        return
      }

      // Track active task
      this.state.activeTaskIds.push(taskId)
      this.tasksThisMinute++

      logger.info(`[TaskProcessor] Processing task ${taskId} (${task.task_type})`)

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeoutMs)
      })

      // Execute task with timeout
      const result = await Promise.race([
        this.executeTask(claimedTask),
        timeoutPromise,
      ])

      // Update token usage
      if (result.metadata?.tokensUsed) {
        this.tokensThisMinute += result.metadata.tokensUsed
      }

      if (result.success) {
        await taskService.completeTask(taskId, result.data || {}, {
          tokensUsed: result.metadata?.tokensUsed,
          costCents: result.metadata?.costCents,
        })
        this.state.completedCount++
        logger.info(`[TaskProcessor] Task ${taskId} completed`)
      } else {
        await taskService.failTask(
          taskId,
          result.error || 'Task failed',
          result.errorCode ? { code: result.errorCode } : undefined,
          result.shouldRetry !== false
        )
        this.state.failedCount++
        logger.warn(`[TaskProcessor] Task ${taskId} failed: ${result.error}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await taskService.failTask(taskId, errorMessage, undefined, true)
      this.state.failedCount++
      logger.error(`[TaskProcessor] Task ${taskId} error:`, error)
    } finally {
      // Remove from active tasks
      this.state.activeTaskIds = this.state.activeTaskIds.filter((id) => id !== taskId)

      // Add delay between tasks for rate limiting
      await this.delay(this.rateLimit.taskDelayMs)
    }
  }

  /**
   * Execute a task using the appropriate handler
   */
  private async executeTask(task: AgentTask): Promise<TaskResult> {
    const handler = taskHandlers.get(task.task_type)

    if (handler) {
      // Use registered handler
      const context: TaskContext = {
        companyId: task.company_id,
        projectId: task.project_id,
        userId: task.created_by,
        abortSignal: this.abortController?.signal,
      }

      // Validate input if handler has validation
      if (handler.validate) {
        const validation = handler.validate(task.input_data)
        if (!validation.valid) {
          return {
            success: false,
            error: `Validation failed: ${validation.errors?.map((e) => e.message).join(', ')}`,
            errorCode: 'VALIDATION_ERROR',
            shouldRetry: false,
          }
        }
      }

      try {
        const result = await handler.execute(task, context)

        // Call onComplete hook if successful
        if (result.success && handler.onComplete) {
          await handler.onComplete(task, result.data || {})
        }

        return result
      } catch (error) {
        // Call onFailure hook
        if (handler.onFailure) {
          await handler.onFailure(task, error as Error)
        }
        throw error
      }
    }

    // Fallback to orchestrator execution
    const agentContext: AgentContext = {
      sessionId: task.session_id || '',
      userId: task.created_by || '',
      companyId: task.company_id,
      projectId: task.project_id,
      autonomyLevel: 'autonomous',
      featuresEnabled: {
        document_processing: true,
        daily_report_summaries: true,
        rfi_routing: true,
        rfi_drafting: true,
        submittal_classification: true,
        weekly_rollups: true,
        chat_interface: true,
        background_tasks: true,
        semantic_search: true,
      },
      userPreferences: {},
    }

    const result = await agentOrchestrator.executeTask(
      task.task_type,
      task.input_data,
      agentContext
    )

    return {
      success: result.success,
      data: result.data as Record<string, unknown> | undefined,
      error: result.error,
      errorCode: result.errorCode,
      metadata: result.metadata,
    }
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  /**
   * Check if we can process more tasks
   */
  private canProcessMore(): boolean {
    if (this.state.activeTaskIds.length >= this.config.concurrency) {
      return false
    }

    if (this.tasksThisMinute >= this.rateLimit.maxTasksPerMinute) {
      return false
    }

    if (this.tokensThisMinute >= this.rateLimit.maxTokensPerMinute) {
      return false
    }

    return true
  }

  /**
   * Start the rate limit reset interval
   */
  private startRateLimitReset(): void {
    const resetRateLimits = () => {
      this.tasksThisMinute = 0
      this.tokensThisMinute = 0
      if (this.state.isRunning) {
        this.minuteResetTimeout = setTimeout(resetRateLimits, 60000)
      }
    }

    this.minuteResetTimeout = setTimeout(resetRateLimits, 60000)
  }

  // ============================================================================
  // Working Hours
  // ============================================================================

  /**
   * Check if current time is within working hours
   */
  private isWithinWorkingHours(): boolean {
    // For now, use simple hour check
    // In production, this should check agent_configuration for the company
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay() // 0 = Sunday, 6 = Saturday

    // Default working hours: 6 AM to 8 PM, Monday to Saturday
    const isWorkingDay = day >= 1 && day <= 6
    const isWorkingHour = hour >= 6 && hour < 20

    return isWorkingDay && isWorkingHour
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Process a single task immediately (for manual triggering)
   */
  async processSingleTask(taskId: string): Promise<TaskResult> {
    const task = await taskService.get(taskId)
    if (!task) {
      return {
        success: false,
        error: `Task not found: ${taskId}`,
        errorCode: 'TASK_NOT_FOUND',
      }
    }

    if (task.status !== 'pending' && task.status !== 'scheduled') {
      return {
        success: false,
        error: `Task cannot be processed with status: ${task.status}`,
        errorCode: 'INVALID_STATUS',
      }
    }

    // Claim and execute
    const claimedTask = await taskService.claimTask(taskId)
    if (!claimedTask) {
      return {
        success: false,
        error: 'Failed to claim task',
        errorCode: 'CLAIM_FAILED',
      }
    }

    try {
      const result = await this.executeTask(claimedTask)

      if (result.success) {
        await taskService.completeTask(taskId, result.data || {}, {
          tokensUsed: result.metadata?.tokensUsed,
          costCents: result.metadata?.costCents,
        })
      } else {
        await taskService.failTask(
          taskId,
          result.error || 'Task failed',
          undefined,
          result.shouldRetry !== false
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await taskService.failTask(taskId, errorMessage)
      return {
        success: false,
        error: errorMessage,
        errorCode: 'EXECUTION_ERROR',
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const taskProcessor = new TaskQueueProcessor()

// ============================================================================
// Built-in Task Handlers
// ============================================================================

// Import and register built-in handlers when this module loads
// The actual handlers are in the triggers folder

// ============================================================================
// Re-exports
// ============================================================================

export type { TaskQueueConfig, TaskQueueState, RateLimitConfig }
