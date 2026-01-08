/**
 * Chat Types
 * Types for agent chat messages and conversation management
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface AgentMessage {
  id: string
  session_id: string
  role: MessageRole
  content: string
  tool_calls: ToolCall[] | null
  tool_call_id: string | null
  tool_name: string | null
  tool_input: Record<string, unknown> | null
  tool_output: unknown | null
  tool_error: string | null
  tokens_used: number | null
  latency_ms: number | null
  model_used: string | null
  is_streaming: boolean
  created_at: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface CreateMessageDTO {
  session_id: string
  role: MessageRole
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_output?: unknown
  tool_error?: string
  tokens_used?: number
  latency_ms?: number
  model_used?: string
}

// ============================================================================
// Streaming Types
// ============================================================================

export type StreamChunkType =
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_end'
  | 'tool_result'
  | 'message_complete'
  | 'error'

export interface StreamChunk {
  type: StreamChunkType
  content?: string
  toolCall?: {
    id: string
    name: string
    arguments?: string // Partial JSON being streamed
  }
  toolResult?: {
    toolCallId: string
    result: unknown
    error?: string
  }
  error?: string
  messageId?: string
  tokens?: {
    input: number
    output: number
  }
}

// ============================================================================
// Conversation Context
// ============================================================================

export interface ConversationContext {
  sessionId: string
  projectId: string | null
  companyId: string

  // Current entity context (what the user is looking at)
  currentEntity?: {
    type: string
    id: string
    name?: string
    data?: Record<string, unknown>
  }

  // Recent entities mentioned in conversation
  recentEntities: EntityReference[]

  // User preferences for this conversation
  preferences: {
    verbosity: 'concise' | 'normal' | 'detailed'
    autoExecuteTools: boolean
    showToolDetails: boolean
  }
}

export interface EntityReference {
  type: string
  id: string
  name: string
  mentionedAt: string
}

// ============================================================================
// Chat Input Types
// ============================================================================

export interface ChatInputState {
  value: string
  mentions: Mention[]
  attachments: Attachment[]
}

export interface Mention {
  type: 'user' | 'project' | 'rfi' | 'document' | 'task'
  id: string
  name: string
  startIndex: number
  endIndex: number
}

export interface Attachment {
  id: string
  type: 'file' | 'image' | 'document'
  name: string
  url?: string
  file?: File
}

// ============================================================================
// Quick Action Types
// ============================================================================

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: string
  command: string
  category: 'document' | 'report' | 'rfi' | 'search' | 'general'
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'summarize_today',
    label: 'Summarize today',
    description: "Generate a summary of today's activities",
    icon: 'FileText',
    command: '/summarize today',
    category: 'report',
  },
  {
    id: 'find_open_rfis',
    label: 'Find open RFIs',
    description: 'Search for all open RFIs in this project',
    icon: 'Search',
    command: '/search open RFIs',
    category: 'rfi',
  },
  {
    id: 'weekly_status',
    label: 'Weekly status',
    description: 'Generate weekly status report',
    icon: 'Calendar',
    command: '/weekly-status',
    category: 'report',
  },
  {
    id: 'process_documents',
    label: 'Process new documents',
    description: 'Classify and process unprocessed documents',
    icon: 'FileStack',
    command: '/process-documents',
    category: 'document',
  },
  {
    id: 'extract_actions',
    label: 'Extract action items',
    description: 'Extract action items from recent reports',
    icon: 'ListTodo',
    command: '/extract-actions',
    category: 'report',
  },
  {
    id: 'help',
    label: 'What can you do?',
    description: 'Learn about available agent capabilities',
    icon: 'HelpCircle',
    command: '/help',
    category: 'general',
  },
]

// ============================================================================
// Chat Commands
// ============================================================================

export interface ChatCommand {
  name: string
  aliases: string[]
  description: string
  usage: string
  examples: string[]
  handler: string // Handler function name
}

export const CHAT_COMMANDS: ChatCommand[] = [
  {
    name: 'summarize',
    aliases: ['sum', 's'],
    description: 'Summarize a daily report, meeting, or time period',
    usage: '/summarize [today|yesterday|week|<report-id>]',
    examples: ['/summarize today', '/summarize week', '/summarize report-123'],
    handler: 'handleSummarizeCommand',
  },
  {
    name: 'search',
    aliases: ['find', 'q'],
    description: 'Search across all project data',
    usage: '/search <query>',
    examples: ['/search concrete pour schedule', '/search open RFIs about electrical'],
    handler: 'handleSearchCommand',
  },
  {
    name: 'route',
    aliases: ['assign'],
    description: 'Get routing suggestion for an RFI',
    usage: '/route <rfi-id>',
    examples: ['/route RFI-042'],
    handler: 'handleRouteCommand',
  },
  {
    name: 'draft',
    aliases: ['respond'],
    description: 'Draft a response to an RFI',
    usage: '/draft <rfi-id> [context]',
    examples: ['/draft RFI-042', '/draft RFI-042 approved per drawings'],
    handler: 'handleDraftCommand',
  },
  {
    name: 'classify',
    aliases: ['categorize'],
    description: 'Classify a document or submittal',
    usage: '/classify <document-id>',
    examples: ['/classify DOC-123'],
    handler: 'handleClassifyCommand',
  },
  {
    name: 'weekly-status',
    aliases: ['weekly', 'status'],
    description: 'Generate weekly status report',
    usage: '/weekly-status [week-start-date]',
    examples: ['/weekly-status', '/weekly-status 2025-01-06'],
    handler: 'handleWeeklyStatusCommand',
  },
  {
    name: 'extract-actions',
    aliases: ['actions', 'todos'],
    description: 'Extract action items from reports or meetings',
    usage: '/extract-actions [source-id]',
    examples: ['/extract-actions', '/extract-actions meeting-456'],
    handler: 'handleExtractActionsCommand',
  },
  {
    name: 'process-documents',
    aliases: ['process', 'scan'],
    description: 'Process and classify unprocessed documents',
    usage: '/process-documents [limit]',
    examples: ['/process-documents', '/process-documents 10'],
    handler: 'handleProcessDocumentsCommand',
  },
  {
    name: 'help',
    aliases: ['?', 'commands'],
    description: 'Show available commands and capabilities',
    usage: '/help [command]',
    examples: ['/help', '/help search'],
    handler: 'handleHelpCommand',
  },
]

// ============================================================================
// Message Display Types
// ============================================================================

export interface MessageGroup {
  role: MessageRole
  messages: AgentMessage[]
  timestamp: string
}

export interface ToolResultDisplay {
  toolName: string
  displayName: string
  icon: string
  status: 'success' | 'error' | 'pending'
  summary: string
  details?: Record<string, unknown>
  actions?: ToolResultAction[]
}

export interface ToolResultAction {
  id: string
  label: string
  action: 'view' | 'navigate' | 'copy' | 'retry'
  data?: unknown
}
