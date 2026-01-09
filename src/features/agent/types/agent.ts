/**
 * Core Agent Types
 * Types for agent configuration, sessions, and general agent operations
 */

// ============================================================================
// Agent Configuration
// ============================================================================

export type AgentAutonomyLevel = 'disabled' | 'suggest_only' | 'confirm_actions' | 'autonomous'

export interface AgentFeaturesEnabled {
  document_processing: boolean
  daily_report_summaries: boolean
  rfi_routing: boolean
  rfi_drafting: boolean
  submittal_classification: boolean
  weekly_rollups: boolean
  chat_interface: boolean
  background_tasks: boolean
  semantic_search: boolean
}

export interface AgentNotificationChannels {
  in_app: boolean
  email: boolean
}

export interface AgentConfiguration {
  id: string
  company_id: string
  is_enabled: boolean
  autonomy_level: AgentAutonomyLevel
  features_enabled: AgentFeaturesEnabled
  notification_channels: AgentNotificationChannels
  monthly_task_limit: number | null
  daily_task_limit: number
  working_hours_start: string // TIME format
  working_hours_end: string
  working_days: number[] // 1=Monday, 7=Sunday
  timezone: string
  preferred_model: string
  created_at: string
  updated_at: string
}

export interface UpdateAgentConfigurationDTO {
  is_enabled?: boolean
  autonomy_level?: AgentAutonomyLevel
  features_enabled?: Partial<AgentFeaturesEnabled>
  notification_channels?: Partial<AgentNotificationChannels>
  monthly_task_limit?: number | null
  daily_task_limit?: number
  working_hours_start?: string
  working_hours_end?: string
  working_days?: number[]
  timezone?: string
  preferred_model?: string
}

// ============================================================================
// Agent Sessions
// ============================================================================

export type AgentSessionStatus = 'active' | 'ended' | 'archived'

export interface AgentSession {
  id: string
  company_id: string
  user_id: string
  project_id: string | null
  status: AgentSessionStatus
  title: string | null
  system_context: Record<string, unknown>
  user_preferences: Record<string, unknown>
  context_entity_type: string | null
  context_entity_id: string | null
  message_count: number
  total_tokens_used: number
  total_cost_cents: number
  created_at: string
  updated_at: string
  ended_at: string | null
  last_message_at: string
}

export interface CreateSessionDTO {
  project_id?: string
  title?: string
  context_entity_type?: string
  context_entity_id?: string
  system_context?: Record<string, unknown>
}

export interface UpdateSessionDTO {
  title?: string
  context_entity_type?: string | null
  context_entity_id?: string | null
  system_context?: Record<string, unknown>
  status?: AgentSessionStatus
}

// ============================================================================
// Agent Context
// ============================================================================

export interface AgentContext {
  sessionId: string
  userId: string
  companyId: string
  projectId: string | null
  autonomyLevel: AgentAutonomyLevel
  featuresEnabled: AgentFeaturesEnabled
  currentEntity?: {
    type: string
    id: string
    data?: Record<string, unknown>
  }
  userPreferences: Record<string, unknown>
}

// ============================================================================
// Agent Events
// ============================================================================

export type AgentEventType =
  | 'document_uploaded'
  | 'rfi_created'
  | 'rfi_updated'
  | 'submittal_created'
  | 'daily_report_submitted'
  | 'meeting_created'
  | 'task_created'
  | 'scheduled_digest'
  | 'user_message'

export interface AgentEvent {
  type: AgentEventType
  entityType: string
  entityId: string
  projectId?: string
  companyId: string
  userId?: string
  data?: Record<string, unknown>
  timestamp: string
}

// ============================================================================
// Agent Response
// ============================================================================

export interface AgentResponse {
  content: string
  toolCalls?: ToolCallResult[]
  suggestedActions?: SuggestedAction[]
  tokens: {
    input: number
    output: number
    total: number
  }
  model: string
  latencyMs: number
}

export interface ToolCallResult {
  id: string
  toolName: string
  input: Record<string, unknown>
  output: unknown
  error?: string
  executionTimeMs: number
}

export interface SuggestedAction {
  id: string
  label: string
  description: string
  toolName: string
  toolInput: Record<string, unknown>
  icon?: string
}

// ============================================================================
// Agent Feedback
// ============================================================================

export type AgentFeedbackType = 'helpful' | 'not_helpful' | 'incorrect' | 'other'

export interface AgentFeedback {
  id: string
  company_id: string
  user_id: string
  message_id: string | null
  action_id: string | null
  task_id: string | null
  rating: number | null // 1-5
  feedback_type: AgentFeedbackType | null
  feedback_text: string | null
  expected_output: string | null
  tags: string[] | null
  created_at: string
}

export interface SubmitFeedbackDTO {
  message_id?: string
  action_id?: string
  task_id?: string
  rating?: number
  feedback_type?: AgentFeedbackType
  feedback_text?: string
  expected_output?: string
  tags?: string[]
}

// ============================================================================
// Agent Store State
// ============================================================================

export interface AgentStoreState {
  // Session state
  activeSessionId: string | null
  sessions: Map<string, AgentSession>
  isLoadingSessions: boolean

  // UI state
  isChatOpen: boolean
  isChatMinimized: boolean
  isProcessing: boolean
  streamingMessageId: string | null

  // Pending confirmations
  pendingConfirmations: PendingConfirmation[]

  // Error state
  error: string | null
}

export interface PendingConfirmation {
  id: string
  toolName: string
  toolInput: Record<string, unknown>
  description: string
  createdAt: string
  // Enhanced confirmation data
  toolCall?: {
    id: string
    name: string
    arguments: Record<string, unknown>
  }
  severity?: 'low' | 'medium' | 'high'
  estimatedImpact?: string
  onConfirm?: (result: unknown) => void | Promise<void>
  onReject?: () => void
}

export interface AgentStoreActions {
  // Session management
  loadSessions(): Promise<void>
  createSession(dto?: CreateSessionDTO): Promise<AgentSession>
  setActiveSession(sessionId: string | null): void
  endSession(sessionId: string): Promise<void>
  deleteSession(sessionId: string): Promise<void>

  // UI actions
  openChat(): void
  closeChat(): void
  toggleChat(): void
  minimizeChat(): void
  maximizeChat(): void

  // Message actions
  sendMessage(content: string): Promise<AgentResponse>
  cancelProcessing(): void

  // Confirmation actions
  addPendingConfirmation(confirmation: PendingConfirmation): void
  confirmAction(confirmationId: string): Promise<void>
  rejectAction(confirmationId: string): Promise<void>
  clearConfirmations(): void

  // Error handling
  setError(error: string | null): void
  clearError(): void

  // Reset
  reset(): void
}

export type AgentStore = AgentStoreState & AgentStoreActions
