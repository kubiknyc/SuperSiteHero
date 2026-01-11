/**
 * useAgentChat Hook
 * Comprehensive chat management with streaming, tool handling, and message operations
 */

import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAgentStore } from '../state/store'
import { useChatStore } from '../state/chat-store'
import { useAgentMessages, useAddMessage } from './useAgentMessages'
import { useAgentSession, useSessionTitleGeneration } from './useAgentSession'
import { agentOrchestrator } from '../core/orchestrator'
import type { AgentMessage, StreamChunk, Mention, Attachment } from '../types/chat'
import type { AgentResponse } from '../types/agent'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface SendMessageOptions {
  mentions?: Mention[]
  attachments?: Attachment[]
  skipOptimistic?: boolean
}

interface UseAgentChatOptions {
  projectId?: string
  autoCreateSession?: boolean
  onMessageSent?: (message: AgentMessage) => void
  onResponseReceived?: (response: AgentResponse) => void
  onStreamChunk?: (chunk: StreamChunk) => void
  onError?: (error: Error) => void
}

interface UseAgentChatResult {
  // State
  messages: AgentMessage[]
  isLoading: boolean
  isProcessing: boolean
  isStreaming: boolean
  error: string | null
  streamingContent: string
  streamingToolCalls: Array<{
    id: string
    name: string
    arguments: string
    status: 'pending' | 'executing' | 'complete' | 'error'
  }>

  // Session
  session: ReturnType<typeof useAgentSession>['session']
  sessionId: string | null
  sessions: ReturnType<typeof useAgentSession>['sessions']

  // Actions
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>
  cancelRequest: () => void
  retryLastMessage: () => Promise<void>
  regenerateResponse: (messageId: string) => Promise<void>
  editMessage: (messageId: string, newContent: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  clearChat: () => Promise<void>

  // Session actions
  createSession: ReturnType<typeof useAgentSession>['createSession']
  switchSession: ReturnType<typeof useAgentSession>['switchSession']
  endSession: ReturnType<typeof useAgentSession>['endSession']

  // Feedback
  submitFeedback: (messageId: string, rating: 'positive' | 'negative', comment?: string) => Promise<void>

  // UI state
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  minimizeChat: () => void
  maximizeChat: () => void
  isOpen: boolean
  isMinimized: boolean
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAgentChatEnhanced(options: UseAgentChatOptions = {}): UseAgentChatResult {
  const {
    projectId,
    autoCreateSession = true,
    onMessageSent,
    onResponseReceived,
    onStreamChunk,
    onError,
  } = options

  const queryClient = useQueryClient()
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastUserMessageRef = useRef<string | null>(null)

  // Store state
  const {
    isProcessing,
    error,
    isChatOpen,
    isChatMinimized,
    sendMessage: storeSendMessage,
    cancelProcessing,
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
    maximizeChat,
    clearError,
  } = useAgentStore()

  // Chat UI store
  const {
    streamingContent,
    streamingToolCalls,
    handleStreamChunk,
    clearStreamingContent,
    clearStreamingToolCalls,
    clearInput,
  } = useChatStore()

  // Session management
  const {
    session,
    sessionId,
    sessions,
    isLoading: isLoadingSession,
    createSession,
    switchSession,
    endSession,
  } = useAgentSession({ autoCreate: autoCreateSession, projectId })

  // Title generation
  const { generateTitle } = useSessionTitleGeneration(sessionId)

  // Messages
  const { messages, isLoading: isLoadingMessages, refetch: refetchMessages } = useAgentMessages(sessionId)
  const addMessage = useAddMessage(sessionId || '')

  // Local state for streaming
  const [isStreaming, setIsStreaming] = useState(false)

  // ============================================================================
  // Actions
  // ============================================================================

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      if (!content.trim() || !sessionId) {return}

      const { mentions, attachments, skipOptimistic } = options
      lastUserMessageRef.current = content

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      try {
        // Clear previous streaming state
        clearStreamingContent()
        clearStreamingToolCalls()
        setIsStreaming(true)

        // Build message content with mentions
        let finalContent = content
        if (mentions && mentions.length > 0) {
          // Mentions are already embedded in the content
          // But we could add metadata here if needed
        }

        // Handle attachments
        if (attachments && attachments.length > 0) {
          // Upload attachments and add references to message
          const attachmentRefs = await Promise.all(
            attachments.map(async (attachment) => {
              if (attachment.file) {
                const { data, error } = await supabase.storage
                  .from('chat-attachments')
                  .upload(`${sessionId}/${Date.now()}-${attachment.name}`, attachment.file)

                if (error) {throw error}
                return { name: attachment.name, path: data.path }
              }
              return { name: attachment.name, url: attachment.url }
            })
          )

          // Add attachment info to message
          finalContent += `\n\n[Attachments: ${attachmentRefs.map((a) => a.name).join(', ')}]`
        }

        // Generate title from first message if needed
        if (messages.length === 0) {
          generateTitle(finalContent)
        }

        // Send message through store
        const response = await storeSendMessage(finalContent)

        // Notify callbacks
        onResponseReceived?.(response)

        // Clear input
        clearInput()
      } catch (err) {
        const error = err as Error
        logger.error('[useAgentChat] Error sending message:', error)
        onError?.(error)
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [
      sessionId,
      messages.length,
      generateTitle,
      storeSendMessage,
      clearStreamingContent,
      clearStreamingToolCalls,
      clearInput,
      onResponseReceived,
      onError,
    ]
  )

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    cancelProcessing()
    clearStreamingContent()
    clearStreamingToolCalls()
    setIsStreaming(false)
  }, [cancelProcessing, clearStreamingContent, clearStreamingToolCalls])

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) {return}
    await sendMessage(lastUserMessageRef.current)
  }, [sendMessage])

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      if (!sessionId) {return}

      // Find the user message before this assistant message
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      if (messageIndex <= 0) {return}

      // Find previous user message
      let userMessageIndex = messageIndex - 1
      while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
        userMessageIndex--
      }

      if (userMessageIndex < 0) {return}
      const userMessage = messages[userMessageIndex]

      // Delete the assistant message and any tool messages after it
      const messagesToDelete = messages.slice(messageIndex).map((m) => m.id)
      await Promise.all(
        messagesToDelete.map((id) =>
          supabase.from('agent_messages').delete().eq('id', id)
        )
      )

      // Refresh messages
      await refetchMessages()

      // Resend the user message
      await sendMessage(userMessage.content)
    },
    [sessionId, messages, refetchMessages, sendMessage]
  )

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!sessionId) {return}

      // Update the message
      await supabase
        .from('agent_messages')
        .update({ content: newContent })
        .eq('id', messageId)

      // Refresh messages
      await refetchMessages()

      // If it was a user message, regenerate response
      const message = messages.find((m) => m.id === messageId)
      if (message?.role === 'user') {
        // Find and delete subsequent messages
        const messageIndex = messages.findIndex((m) => m.id === messageId)
        const messagesToDelete = messages.slice(messageIndex + 1).map((m) => m.id)

        await Promise.all(
          messagesToDelete.map((id) =>
            supabase.from('agent_messages').delete().eq('id', id)
          )
        )

        // Refresh and resend
        await refetchMessages()
        await sendMessage(newContent)
      }
    },
    [sessionId, messages, refetchMessages, sendMessage]
  )

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await supabase.from('agent_messages').delete().eq('id', messageId)
      await refetchMessages()
    },
    [refetchMessages]
  )

  const clearChat = useCallback(async () => {
    if (!sessionId) {return}

    await supabase.from('agent_messages').delete().eq('session_id', sessionId)
    await refetchMessages()
  }, [sessionId, refetchMessages])

  const submitFeedback = useCallback(
    async (messageId: string, rating: 'positive' | 'negative', comment?: string) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {return}

        const { data: userRecord } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', userData.user.id)
          .single()

        await supabase.from('agent_feedback').insert({
          company_id: userRecord?.company_id,
          user_id: userData.user.id,
          message_id: messageId,
          rating: rating === 'positive' ? 5 : 1,
          feedback_type: rating === 'positive' ? 'helpful' : 'not_helpful',
          feedback_text: comment,
        })
      } catch (err) {
        logger.error('[useAgentChat] Error submitting feedback:', err)
      }
    },
    []
  )

  return {
    // State
    messages,
    isLoading: isLoadingMessages || isLoadingSession,
    isProcessing,
    isStreaming,
    error,
    streamingContent,
    streamingToolCalls,

    // Session
    session,
    sessionId,
    sessions,

    // Actions
    sendMessage,
    cancelRequest,
    retryLastMessage,
    regenerateResponse,
    editMessage,
    deleteMessage,
    clearChat,

    // Session actions
    createSession,
    switchSession,
    endSession,

    // Feedback
    submitFeedback,

    // UI state
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
    maximizeChat,
    isOpen: isChatOpen,
    isMinimized: isChatMinimized,
  }
}

// ============================================================================
// Simplified Chat Hook (re-export from store for backward compatibility)
// ============================================================================

export { useAgentChat } from '../state/store'

// ============================================================================
// Chat Commands Hook
// ============================================================================

interface ChatCommand {
  name: string
  description: string
  execute: (args: string[]) => Promise<string>
}

const DEFAULT_COMMANDS: ChatCommand[] = [
  {
    name: 'help',
    description: 'Show available commands',
    execute: async () => {
      return `Available commands:
/help - Show this help message
/summarize [today|week] - Summarize reports
/search <query> - Search project data
/route <rfi-id> - Get RFI routing suggestion
/draft <rfi-id> - Draft RFI response
/weekly - Generate weekly status report
/clear - Clear chat history`
    },
  },
  {
    name: 'clear',
    description: 'Clear chat history',
    execute: async () => {
      return 'Chat cleared. Starting fresh.'
    },
  },
]

export function useChatCommands() {
  const [commands] = useState<ChatCommand[]>(DEFAULT_COMMANDS)

  const executeCommand = useCallback(
    async (input: string): Promise<string | null> => {
      if (!input.startsWith('/')) {return null}

      const parts = input.slice(1).split(' ')
      const commandName = parts[0].toLowerCase()
      const args = parts.slice(1)

      const command = commands.find(
        (c) => c.name.toLowerCase() === commandName
      )

      if (command) {
        return command.execute(args)
      }

      return null
    },
    [commands]
  )

  const getCommandSuggestions = useCallback(
    (filter: string) => {
      const normalizedFilter = filter.toLowerCase()
      return commands.filter(
        (c) =>
          c.name.toLowerCase().includes(normalizedFilter) ||
          c.description.toLowerCase().includes(normalizedFilter)
      )
    },
    [commands]
  )

  return {
    commands,
    executeCommand,
    getCommandSuggestions,
  }
}

// ============================================================================
// Mention Suggestions Hook
// ============================================================================

interface MentionSuggestion {
  type: 'user' | 'project' | 'rfi' | 'document'
  id: string
  name: string
  subtitle?: string
}

export function useMentionSuggestions(projectId?: string) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const searchMentions = useCallback(
    async (query: string, type?: MentionSuggestion['type']) => {
      if (!query || query.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const results: MentionSuggestion[] = []

        // Search users
        if (!type || type === 'user') {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, email')
            .ilike('full_name', `%${query}%`)
            .limit(5)

          if (users) {
            results.push(
              ...users.map((u) => ({
                type: 'user' as const,
                id: u.id,
                name: u.full_name || u.email,
                subtitle: u.email,
              }))
            )
          }
        }

        // Search projects
        if (!type || type === 'project') {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name, project_number')
            .ilike('name', `%${query}%`)
            .limit(5)

          if (projects) {
            results.push(
              ...projects.map((p) => ({
                type: 'project' as const,
                id: p.id,
                name: p.name,
                subtitle: p.project_number,
              }))
            )
          }
        }

        // Search RFIs
        if ((!type || type === 'rfi') && projectId) {
          const { data: rfis } = await supabase
            .from('workflow_items')
            .select('id, item_number, subject')
            .eq('project_id', projectId)
            .eq('workflow_type', 'rfi')
            .or(`item_number.ilike.%${query}%,subject.ilike.%${query}%`)
            .limit(5)

          if (rfis) {
            results.push(
              ...rfis.map((r) => ({
                type: 'rfi' as const,
                id: r.id,
                name: r.item_number || r.id,
                subtitle: r.subject,
              }))
            )
          }
        }

        setSuggestions(results)
      } catch (error) {
        logger.error('[useMentionSuggestions] Error:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    },
    [projectId]
  )

  return {
    suggestions,
    isLoading,
    searchMentions,
    clearSuggestions: () => setSuggestions([]),
  }
}
