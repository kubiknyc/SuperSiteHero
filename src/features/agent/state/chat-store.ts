/**
 * Chat Store
 * Specialized Zustand store for chat-specific state management
 * Complements the main agent store with chat-focused functionality
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AgentMessage, Mention, Attachment, StreamChunk } from '../types/chat'

// ============================================================================
// Types
// ============================================================================

export interface ChatInputState {
  value: string
  mentions: Mention[]
  attachments: Attachment[]
  cursorPosition: number
  isComposing: boolean
}

export interface ChatUIState {
  // Panel state
  panelWidth: number
  panelPosition: 'right' | 'bottom' | 'floating'

  // Input state
  inputState: ChatInputState

  // Suggestions state
  showCommandSuggestions: boolean
  showMentionSuggestions: boolean
  suggestionFilter: string
  selectedSuggestionIndex: number

  // Message state
  editingMessageId: string | null
  replyingToMessageId: string | null
  selectedMessageIds: Set<string>

  // Streaming state
  streamingContent: string
  streamingToolCalls: Array<{
    id: string
    name: string
    arguments: string
    status: 'pending' | 'executing' | 'complete' | 'error'
  }>

  // UI preferences
  showTimestamps: boolean
  showToolDetails: boolean
  compactMode: boolean
  soundEnabled: boolean
}

export interface ChatStoreActions {
  // Input actions
  setInputValue: (value: string) => void
  setCursorPosition: (position: number) => void
  addMention: (mention: Mention) => void
  removeMention: (mentionId: string) => void
  clearMentions: () => void
  addAttachment: (attachment: Attachment) => void
  removeAttachment: (attachmentId: string) => void
  clearAttachments: () => void
  clearInput: () => void

  // Suggestion actions
  setShowCommandSuggestions: (show: boolean) => void
  setShowMentionSuggestions: (show: boolean) => void
  setSuggestionFilter: (filter: string) => void
  setSelectedSuggestionIndex: (index: number) => void
  nextSuggestion: () => void
  prevSuggestion: () => void

  // Message actions
  setEditingMessage: (messageId: string | null) => void
  setReplyingToMessage: (messageId: string | null) => void
  toggleMessageSelection: (messageId: string) => void
  clearMessageSelection: () => void

  // Streaming actions
  appendStreamingContent: (content: string) => void
  clearStreamingContent: () => void
  addStreamingToolCall: (toolCall: { id: string; name: string }) => void
  updateStreamingToolCall: (id: string, updates: Partial<ChatUIState['streamingToolCalls'][0]>) => void
  clearStreamingToolCalls: () => void
  handleStreamChunk: (chunk: StreamChunk) => void

  // UI preference actions
  setPanelWidth: (width: number) => void
  setPanelPosition: (position: 'right' | 'bottom' | 'floating') => void
  toggleTimestamps: () => void
  toggleToolDetails: () => void
  toggleCompactMode: () => void
  toggleSound: () => void

  // Reset
  reset: () => void
}

export type ChatStore = ChatUIState & ChatStoreActions

// ============================================================================
// Initial State
// ============================================================================

const initialInputState: ChatInputState = {
  value: '',
  mentions: [],
  attachments: [],
  cursorPosition: 0,
  isComposing: false,
}

const initialState: ChatUIState = {
  panelWidth: 420,
  panelPosition: 'right',
  inputState: initialInputState,
  showCommandSuggestions: false,
  showMentionSuggestions: false,
  suggestionFilter: '',
  selectedSuggestionIndex: 0,
  editingMessageId: null,
  replyingToMessageId: null,
  selectedMessageIds: new Set(),
  streamingContent: '',
  streamingToolCalls: [],
  showTimestamps: true,
  showToolDetails: true,
  compactMode: false,
  soundEnabled: true,
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ======================================================================
        // Input Actions
        // ======================================================================

        setInputValue: (value: string) => {
          set((state) => {
            state.inputState.value = value

            // Check for command trigger
            if (value.startsWith('/')) {
              state.showCommandSuggestions = true
              state.suggestionFilter = value.slice(1)
              state.showMentionSuggestions = false
            } else if (value.includes('@') && !state.inputState.isComposing) {
              // Check for mention trigger
              const lastAtIndex = value.lastIndexOf('@')
              const afterAt = value.slice(lastAtIndex + 1)
              if (!afterAt.includes(' ')) {
                state.showMentionSuggestions = true
                state.suggestionFilter = afterAt
                state.showCommandSuggestions = false
              }
            } else {
              state.showCommandSuggestions = false
              state.showMentionSuggestions = false
            }
          })
        },

        setCursorPosition: (position: number) => {
          set((state) => {
            state.inputState.cursorPosition = position
          })
        },

        addMention: (mention: Mention) => {
          set((state) => {
            state.inputState.mentions.push(mention)
            state.showMentionSuggestions = false
            state.suggestionFilter = ''
          })
        },

        removeMention: (mentionId: string) => {
          set((state) => {
            state.inputState.mentions = state.inputState.mentions.filter(
              (m) => m.id !== mentionId
            )
          })
        },

        clearMentions: () => {
          set((state) => {
            state.inputState.mentions = []
          })
        },

        addAttachment: (attachment: Attachment) => {
          set((state) => {
            state.inputState.attachments.push(attachment)
          })
        },

        removeAttachment: (attachmentId: string) => {
          set((state) => {
            state.inputState.attachments = state.inputState.attachments.filter(
              (a) => a.id !== attachmentId
            )
          })
        },

        clearAttachments: () => {
          set((state) => {
            state.inputState.attachments = []
          })
        },

        clearInput: () => {
          set((state) => {
            state.inputState = { ...initialInputState }
            state.showCommandSuggestions = false
            state.showMentionSuggestions = false
            state.suggestionFilter = ''
            state.selectedSuggestionIndex = 0
          })
        },

        // ======================================================================
        // Suggestion Actions
        // ======================================================================

        setShowCommandSuggestions: (show: boolean) => {
          set((state) => {
            state.showCommandSuggestions = show
            if (!show) {
              state.selectedSuggestionIndex = 0
            }
          })
        },

        setShowMentionSuggestions: (show: boolean) => {
          set((state) => {
            state.showMentionSuggestions = show
            if (!show) {
              state.selectedSuggestionIndex = 0
            }
          })
        },

        setSuggestionFilter: (filter: string) => {
          set((state) => {
            state.suggestionFilter = filter
            state.selectedSuggestionIndex = 0
          })
        },

        setSelectedSuggestionIndex: (index: number) => {
          set((state) => {
            state.selectedSuggestionIndex = index
          })
        },

        nextSuggestion: () => {
          set((state) => {
            state.selectedSuggestionIndex += 1
          })
        },

        prevSuggestion: () => {
          set((state) => {
            state.selectedSuggestionIndex = Math.max(0, state.selectedSuggestionIndex - 1)
          })
        },

        // ======================================================================
        // Message Actions
        // ======================================================================

        setEditingMessage: (messageId: string | null) => {
          set((state) => {
            state.editingMessageId = messageId
          })
        },

        setReplyingToMessage: (messageId: string | null) => {
          set((state) => {
            state.replyingToMessageId = messageId
          })
        },

        toggleMessageSelection: (messageId: string) => {
          set((state) => {
            if (state.selectedMessageIds.has(messageId)) {
              state.selectedMessageIds.delete(messageId)
            } else {
              state.selectedMessageIds.add(messageId)
            }
          })
        },

        clearMessageSelection: () => {
          set((state) => {
            state.selectedMessageIds.clear()
          })
        },

        // ======================================================================
        // Streaming Actions
        // ======================================================================

        appendStreamingContent: (content: string) => {
          set((state) => {
            state.streamingContent += content
          })
        },

        clearStreamingContent: () => {
          set((state) => {
            state.streamingContent = ''
          })
        },

        addStreamingToolCall: (toolCall: { id: string; name: string }) => {
          set((state) => {
            state.streamingToolCalls.push({
              ...toolCall,
              arguments: '',
              status: 'pending',
            })
          })
        },

        updateStreamingToolCall: (id: string, updates: Partial<ChatUIState['streamingToolCalls'][0]>) => {
          set((state) => {
            const index = state.streamingToolCalls.findIndex((tc) => tc.id === id)
            if (index !== -1) {
              state.streamingToolCalls[index] = {
                ...state.streamingToolCalls[index],
                ...updates,
              }
            }
          })
        },

        clearStreamingToolCalls: () => {
          set((state) => {
            state.streamingToolCalls = []
          })
        },

        handleStreamChunk: (chunk: StreamChunk) => {
          const state = get()

          switch (chunk.type) {
            case 'text_delta':
              if (chunk.content) {
                state.appendStreamingContent(chunk.content)
              }
              break

            case 'tool_call_start':
              if (chunk.toolCall) {
                state.addStreamingToolCall({
                  id: chunk.toolCall.id,
                  name: chunk.toolCall.name,
                })
              }
              break

            case 'tool_call_delta':
              if (chunk.toolCall) {
                state.updateStreamingToolCall(chunk.toolCall.id, {
                  arguments: (state.streamingToolCalls.find((tc) => tc.id === chunk.toolCall?.id)?.arguments || '') + (chunk.toolCall.arguments || ''),
                })
              }
              break

            case 'tool_call_end':
              if (chunk.toolCall) {
                state.updateStreamingToolCall(chunk.toolCall.id, {
                  status: 'executing',
                })
              }
              break

            case 'tool_result':
              if (chunk.toolResult) {
                state.updateStreamingToolCall(chunk.toolResult.toolCallId, {
                  status: chunk.toolResult.error ? 'error' : 'complete',
                })
              }
              break

            case 'message_complete':
              state.clearStreamingContent()
              state.clearStreamingToolCalls()
              break

            case 'error':
              // Error handling will be done at a higher level
              break
          }
        },

        // ======================================================================
        // UI Preference Actions
        // ======================================================================

        setPanelWidth: (width: number) => {
          set((state) => {
            state.panelWidth = Math.max(320, Math.min(600, width))
          })
        },

        setPanelPosition: (position: 'right' | 'bottom' | 'floating') => {
          set((state) => {
            state.panelPosition = position
          })
        },

        toggleTimestamps: () => {
          set((state) => {
            state.showTimestamps = !state.showTimestamps
          })
        },

        toggleToolDetails: () => {
          set((state) => {
            state.showToolDetails = !state.showToolDetails
          })
        },

        toggleCompactMode: () => {
          set((state) => {
            state.compactMode = !state.compactMode
          })
        },

        toggleSound: () => {
          set((state) => {
            state.soundEnabled = !state.soundEnabled
          })
        },

        // ======================================================================
        // Reset
        // ======================================================================

        reset: () => {
          set((state) => {
            Object.assign(state, initialState)
          })
        },
      })),
      {
        name: 'chat-ui-store',
        partialize: (state) => ({
          // Only persist UI preferences
          panelWidth: state.panelWidth,
          panelPosition: state.panelPosition,
          showTimestamps: state.showTimestamps,
          showToolDetails: state.showToolDetails,
          compactMode: state.compactMode,
          soundEnabled: state.soundEnabled,
        }),
      }
    ),
    { name: 'ChatStore' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectInputValue = (state: ChatStore) => state.inputState.value
export const selectMentions = (state: ChatStore) => state.inputState.mentions
export const selectAttachments = (state: ChatStore) => state.inputState.attachments
export const selectIsStreaming = (state: ChatStore) =>
  state.streamingContent.length > 0 || state.streamingToolCalls.length > 0
export const selectStreamingState = (state: ChatStore) => ({
  content: state.streamingContent,
  toolCalls: state.streamingToolCalls,
})
