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
// Initialize
// ============================================================================

// Auto-initialize tools when module is imported
import { initializeTools } from './tools'
initializeTools()
