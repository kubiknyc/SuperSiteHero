/**
 * Task Types
 * Types for background autonomous tasks and scheduling
 */

// ============================================================================
// Task Status & Types
// ============================================================================

export type TaskStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled'

export type TaskType =
  // Document processing
  | 'document_classify'
  | 'document_extract_metadata'
  | 'document_ocr'
  | 'document_link_entities'
  | 'document_batch_process'
  // Report generation
  | 'report_summarize'
  | 'report_extract_actions'
  | 'report_weekly_rollup'
  | 'report_daily_digest'
  // RFI/Submittal
  | 'rfi_suggest_routing'
  | 'rfi_draft_response'
  | 'submittal_classify'
  // Scheduled
  | 'scheduled_digest'
  | 'scheduled_cleanup'
  // Custom
  | 'custom'

// ============================================================================
// Agent Task
// ============================================================================

export interface AgentTask {
  id: string
  company_id: string
  project_id: string | null
  session_id: string | null

  task_type: TaskType
  status: TaskStatus
  priority: number

  input_data: Record<string, unknown>
  output_data: Record<string, unknown> | null
  error_message: string | null
  error_details: Record<string, unknown> | null

  target_entity_type: string | null
  target_entity_id: string | null

  scheduled_for: string | null
  started_at: string | null
  completed_at: string | null

  retry_count: number
  max_retries: number
  next_retry_at: string | null

  tokens_used: number | null
  cost_cents: number | null
  execution_time_ms: number | null

  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CreateTaskDTO {
  task_type: TaskType
  project_id?: string
  session_id?: string
  priority?: number
  input_data: Record<string, unknown>
  target_entity_type?: string
  target_entity_id?: string
  scheduled_for?: string
  max_retries?: number
}

export interface UpdateTaskDTO {
  status?: TaskStatus
  output_data?: Record<string, unknown>
  error_message?: string
  error_details?: Record<string, unknown>
  tokens_used?: number
  cost_cents?: number
}

// ============================================================================
// Agent Action (Audit Trail)
// ============================================================================

export type ActionType =
  | 'tool_call'
  | 'entity_create'
  | 'entity_update'
  | 'entity_delete'
  | 'notification_sent'
  | 'message_sent'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'

export type ActionStatus = 'pending' | 'executed' | 'failed' | 'rolled_back'

export interface AgentAction {
  id: string
  company_id: string
  session_id: string | null
  task_id: string | null
  message_id: string | null

  action_type: ActionType
  tool_name: string | null

  target_entity_type: string | null
  target_entity_id: string | null

  input_summary: string | null
  output_summary: string | null
  changes_made: Record<string, { old: unknown; new: unknown }> | null

  status: ActionStatus
  error_message: string | null

  requires_approval: boolean
  approved_by: string | null
  approved_at: string | null
  rejected_reason: string | null

  tokens_used: number | null
  cost_cents: number | null
  execution_time_ms: number | null

  created_at: string
  executed_at: string | null
}

export interface CreateActionDTO {
  session_id?: string
  task_id?: string
  message_id?: string
  action_type: ActionType
  tool_name?: string
  target_entity_type?: string
  target_entity_id?: string
  input_summary?: string
  output_summary?: string
  changes_made?: Record<string, { old: unknown; new: unknown }>
  requires_approval?: boolean
}

// ============================================================================
// Task Queue Types
// ============================================================================

export interface TaskQueueConfig {
  /** Maximum concurrent tasks */
  concurrency: number

  /** Polling interval in ms */
  pollIntervalMs: number

  /** Maximum tasks per poll */
  batchSize: number

  /** Task timeout in ms */
  taskTimeoutMs: number

  /** Whether to process during working hours only */
  respectWorkingHours: boolean
}

export const DEFAULT_TASK_QUEUE_CONFIG: TaskQueueConfig = {
  concurrency: 3,
  pollIntervalMs: 10000, // 10 seconds
  batchSize: 5,
  taskTimeoutMs: 300000, // 5 minutes
  respectWorkingHours: true,
}

export interface TaskQueueState {
  isRunning: boolean
  activeTaskIds: string[]
  completedCount: number
  failedCount: number
  lastPollAt: string | null
  lastError: string | null
}

// ============================================================================
// Task Triggers
// ============================================================================

export type TriggerType =
  | 'on_document_upload'
  | 'on_rfi_create'
  | 'on_submittal_create'
  | 'on_daily_report_submit'
  | 'on_meeting_create'
  | 'scheduled_daily'
  | 'scheduled_weekly'
  | 'manual'

export interface TaskTrigger {
  id: string
  name: string
  description: string
  trigger_type: TriggerType
  task_type: TaskType
  is_enabled: boolean
  config: TaskTriggerConfig
}

export interface TaskTriggerConfig {
  /** For scheduled triggers */
  schedule?: {
    cron?: string
    time?: string // HH:MM
    days?: number[] // 1=Monday, 7=Sunday
    timezone?: string
  }

  /** For event triggers - filter conditions */
  filter?: {
    project_ids?: string[]
    document_categories?: string[]
    entity_types?: string[]
  }

  /** Task creation config */
  taskConfig?: {
    priority?: number
    max_retries?: number
  }
}

// ============================================================================
// Task Statistics
// ============================================================================

export interface TaskStatistics {
  total: number
  by_status: Record<TaskStatus, number>
  by_type: Record<TaskType, number>
  average_execution_time_ms: number
  total_tokens_used: number
  total_cost_cents: number
  success_rate: number
  period: {
    start: string
    end: string
  }
}

export interface DailyTaskSummary {
  date: string
  tasks_created: number
  tasks_completed: number
  tasks_failed: number
  tokens_used: number
  cost_cents: number
}

// ============================================================================
// Task Handlers
// ============================================================================

export interface TaskHandler<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  /** Task type this handler processes */
  taskType: TaskType

  /** Human-readable name */
  displayName: string

  /** Description */
  description: string

  /** Execute the task */
  execute(task: AgentTask, context: TaskContext): Promise<TaskResult<TOutput>>

  /** Validate task input before execution */
  validate?(input: TInput): TaskValidationResult

  /** Handle task failure (for cleanup) */
  onFailure?(task: AgentTask, error: Error): Promise<void>

  /** Handle task completion (for side effects) */
  onComplete?(task: AgentTask, result: TOutput): Promise<void>
}

export interface TaskContext {
  companyId: string
  projectId: string | null
  userId: string | null
  abortSignal?: AbortSignal
}

export interface TaskResult<T = Record<string, unknown>> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  shouldRetry?: boolean
  metadata?: {
    tokensUsed?: number
    costCents?: number
  }
}

export interface TaskValidationResult {
  valid: boolean
  errors?: { field: string; message: string }[]
}
