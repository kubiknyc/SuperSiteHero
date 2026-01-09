/**
 * Tool Types
 * Types for agent tools, registry, and execution
 */

import type { AgentContext } from './agent'

// ============================================================================
// Tool Definition Types
// ============================================================================

export type ToolCategory = 'document' | 'report' | 'rfi' | 'submittal' | 'search' | 'action' | 'inspection' | 'safety' | 'schedule'

export type ToolHandlerType = 'builtin' | 'supabase_function' | 'edge_function' | 'webhook'

export interface ToolDefinition {
  id: string
  company_id: string | null // null = system tool
  name: string
  display_name: string
  description: string
  category: ToolCategory
  parameters_schema: JSONSchema
  handler_type: ToolHandlerType
  handler_config: Record<string, unknown> | null
  requires_confirmation: boolean
  allowed_roles: string[] | null // null = all roles
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  properties?: Record<string, JSONSchemaProperty>
  items?: JSONSchemaProperty
  required?: string[]
  additionalProperties?: boolean
  description?: string
}

export interface JSONSchemaProperty {
  type: string | string[]
  description?: string
  enum?: string[]
  default?: unknown
  format?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
}

// ============================================================================
// Tool Interface
// ============================================================================

export interface Tool<TInput = Record<string, unknown>, TOutput = unknown> {
  /** Unique tool name */
  name: string

  /** Display name for UI */
  displayName: string

  /** Description for the LLM */
  description: string

  /** Tool category */
  category: ToolCategory

  /** JSON Schema for parameters */
  parameters: JSONSchema

  /** Whether this tool requires user confirmation before execution */
  requiresConfirmation: boolean

  /** Estimated tokens this tool typically uses */
  estimatedTokens?: number

  /** Execute the tool */
  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>

  /** Validate input before execution */
  validate?(input: unknown): ValidationResult

  /** Format output for display */
  formatOutput?(output: TOutput): ToolResultDisplay
}

export interface ToolContext extends AgentContext {
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal

  /** Whether to skip confirmation even if tool requires it */
  skipConfirmation?: boolean

  /** Parent message ID for logging */
  messageId?: string

  /** Parent task ID for background tasks */
  taskId?: string
}

export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  metadata?: {
    executionTimeMs: number
    tokensUsed?: number
    costCents?: number
  }
}

export interface ValidationResult {
  valid: boolean
  errors?: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ToolResultDisplay {
  title: string
  summary: string
  icon: string
  status: 'success' | 'error' | 'warning' | 'info'
  details?: ToolResultDetailItem[]
  actions?: ToolResultAction[]
  expandedContent?: string | Record<string, unknown>
}

export interface ToolResultDetailItem {
  label: string
  value: string | number | boolean
  type?: 'text' | 'link' | 'badge' | 'date'
  linkHref?: string
}

export interface ToolResultAction {
  id: string
  label: string
  icon?: string
  action: 'navigate' | 'copy' | 'download' | 'retry' | 'custom'
  data?: unknown
}

// ============================================================================
// Tool Registry Types
// ============================================================================

export interface ToolRegistry {
  /** Register a tool */
  register(tool: Tool): void

  /** Unregister a tool */
  unregister(name: string): void

  /** Get a tool by name */
  get(name: string): Tool | undefined

  /** Get all registered tools */
  list(): Tool[]

  /** Get tools for a specific context (filtered by permissions, features) */
  getForContext(context: AgentContext): Tool[]

  /** Get tools by category */
  getByCategory(category: ToolCategory): Tool[]

  /** Convert tools to OpenAI function format */
  toOpenAIFormat(tools?: Tool[]): OpenAITool[]

  /** Convert tools to Anthropic tool format */
  toAnthropicFormat(tools?: Tool[]): AnthropicTool[]
}

// ============================================================================
// LLM Tool Formats
// ============================================================================

export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: JSONSchema
  }
}

export interface AnthropicTool {
  name: string
  description: string
  input_schema: JSONSchema
}

// ============================================================================
// Tool Execution Types
// ============================================================================

export interface ToolExecutionRequest {
  toolName: string
  input: Record<string, unknown>
  context: ToolContext
}

export interface ToolExecutionResult {
  toolName: string
  input: Record<string, unknown>
  output: unknown
  success: boolean
  error?: string
  executionTimeMs: number
  tokensUsed?: number
  costCents?: number
}

// ============================================================================
// Built-in Tool Input/Output Types
// ============================================================================

// Document Tools
export interface ClassifyDocumentInput {
  document_id: string
}

export interface ClassifyDocumentOutput {
  document_id: string
  category: string
  subcategory?: string
  confidence: number
  csi_section?: string
  reasoning: string
}

export interface ExtractDocumentMetadataInput {
  document_id: string
  metadata_types?: string[]
}

export interface ExtractDocumentMetadataOutput {
  document_id: string
  metadata: {
    sheet_number?: string
    revision?: string
    title?: string
    date?: string
    author?: string
    parties?: string[]
    amounts?: { type: string; value: number; currency: string }[]
    dates?: { type: string; value: string }[]
    [key: string]: unknown
  }
  confidence: number
}

export interface LinkDocumentEntitiesInput {
  document_id: string
}

export interface LinkDocumentEntitiesOutput {
  document_id: string
  links: {
    entity_type: string
    entity_id: string
    entity_name: string
    link_type: string
    confidence: number
    reference_text?: string
  }[]
}

// Report Tools
export interface SummarizeDailyReportInput {
  report_id: string
  include_recommendations?: boolean
}

export interface SummarizeDailyReportOutput {
  report_id: string
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  metrics: {
    workers_on_site: number
    hours_worked: number
    safety_incidents: number
  }
}

export interface ExtractActionItemsInput {
  source_type: 'daily_report' | 'meeting'
  source_id: string
}

export interface ExtractActionItemsOutput {
  source_id: string
  action_items: {
    description: string
    assignee_name?: string
    due_date?: string
    priority: 'high' | 'medium' | 'low'
    confidence: number
    source_text?: string
  }[]
}

export interface GenerateWeeklyRollupInput {
  project_id: string
  week_start?: string // ISO date
}

export interface GenerateWeeklyRollupOutput {
  project_id: string
  week_start: string
  week_end: string
  narrative: string
  accomplishments: string[]
  challenges: string[]
  next_week_priorities: string[]
  metrics: {
    tasks_completed: number
    tasks_in_progress: number
    issues_resolved: number
    issues_open: number
    ppc_value?: number
  }
  trends: {
    metric: string
    direction: 'up' | 'down' | 'stable'
    change_percent: number
  }[]
}

// RFI Tools
export interface SuggestRFIRoutingInput {
  rfi_id: string
}

export interface SuggestRFIRoutingOutput {
  rfi_id: string
  suggested_role: string
  role_confidence: number
  suggested_assignee_id?: string
  suggested_assignee_name?: string
  assignee_confidence?: number
  csi_section?: string
  keywords: string[]
  reasoning: string
  similar_rfis: {
    id: string
    number: string
    subject: string
    resolution?: string
    similarity: number
  }[]
}

export interface DraftRFIResponseInput {
  rfi_id: string
  response_context?: string
}

export interface DraftRFIResponseOutput {
  rfi_id: string
  draft_response: string
  confidence: number
  references: {
    type: string
    id: string
    name: string
    relevant_excerpt?: string
  }[]
  suggested_attachments: string[]
  review_notes: string[]
}

// Search Tools
export interface SemanticSearchInput {
  query: string
  project_id?: string
  entity_types?: string[]
  limit?: number
}

export interface SemanticSearchOutput {
  query: string
  results: {
    entity_type: string
    entity_id: string
    title: string
    excerpt: string
    relevance_score: number
    metadata?: Record<string, unknown>
  }[]
  total_count: number
  search_time_ms: number
}

// Action Tools
export interface CreateTaskInput {
  project_id: string
  title: string
  description?: string
  assignee_id?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface CreateTaskOutput {
  task_id: string
  task_number: string
  title: string
  status: string
  assignee_name?: string
  created_at: string
}

export interface SendNotificationInput {
  user_id: string
  title: string
  message: string
  link?: string
}

export interface SendNotificationOutput {
  notification_id: string
  sent_to: string
  sent_at: string
}
