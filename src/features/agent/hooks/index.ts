/**
 * Agent Hooks Index
 * Export all agent-related hooks
 */

// Main store hook
export { useAgentChat } from '../state/store'

// Message hooks
export { useAgentMessages, useAgentMessage, useAddMessage } from './useAgentMessages'

// Session hooks
export {
  useAgentSession,
  useSessionTitleGeneration,
  useSessionContext,
  useSessionStats,
} from './useAgentSession'

// Enhanced chat hook
export {
  useAgentChatEnhanced,
  useChatCommands,
  useMentionSuggestions,
} from './useAgentChat'

// Chat store
export {
  useChatStore,
  selectInputValue,
  selectMentions,
  selectAttachments,
  selectIsStreaming,
  selectStreamingState,
} from '../state/chat-store'

// Re-export store selectors
export {
  useAgentStore,
  selectActiveSession,
  selectSortedSessions,
  selectIsReady,
} from '../state/store'

// Background task hooks
export {
  useBackgroundTasks,
  useTaskActions,
  useTask,
  useTaskHistory,
  useProcessorStatus,
  useQuickTaskActions,
} from './useBackgroundTasks'

export type {
  UseBackgroundTasksOptions,
  UseBackgroundTasksResult,
  UseTaskActionsResult,
  UseTaskOptions,
  UseTaskResult,
  UseTaskHistoryOptions,
  UseProcessorStatusResult,
  QuickTaskActions,
} from './useBackgroundTasks'
