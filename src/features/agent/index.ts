/**
 * Agent Feature Module
 * Construction AI Agent with chat interface and autonomous capabilities
 */

// ============================================================================
// Types
// ============================================================================

export * from './types'

// ============================================================================
// Components
// ============================================================================

export { AgentChatPanel } from './components/AgentChatPanel'
export { AgentChatInput } from './components/AgentChatInput'
export { AgentMessage } from './components/AgentMessage'
export { AgentQuickActions, ContextQuickActions } from './components/AgentQuickActions'
export { AgentProvider, useAgent, useAgentSafe } from './components/AgentProvider'
export { AgentFAB } from './components/AgentFAB'
export { AgentKeyboardShortcut, useKeyboardShortcutText } from './components/AgentKeyboardShortcut'

// ============================================================================
// Hooks
// ============================================================================

export {
  useAgentChat,
  useAgentStore,
  useAgentMessages,
  useAgentMessage,
  selectActiveSession,
  selectSortedSessions,
  selectIsReady,
  // Background task hooks
  useBackgroundTasks,
  useTaskActions,
  useTask,
  useTaskHistory,
  useProcessorStatus,
  useQuickTaskActions,
} from './hooks'

// ============================================================================
// Core
// ============================================================================

export { agentOrchestrator } from './core/orchestrator'

// ============================================================================
// Tools
// ============================================================================

export {
  toolRegistry,
  createTool,
  initializeTools,
  // Individual tools
  classifyDocumentTool,
  semanticSearchTool,
  routeRFITool,
  summarizeDailyReportTool,
} from './tools'

// ============================================================================
// Services
// ============================================================================

export { taskService } from './services'

// ============================================================================
// Background Processing
// ============================================================================

export {
  taskProcessor,
  taskScheduler,
  registerTaskHandler,
  initializeAllTriggers,
  // Subscriptions
  subscribeToDocumentUploads,
  subscribeToRFICreation,
  subscribeToReportSubmissions,
  subscribeToInspectionResults,
} from './background'

// ============================================================================
// Initialize
// ============================================================================

// Auto-initialize tools when module is imported
import { initializeTools } from './tools'
initializeTools()
