/**
 * Agent Store
 * Zustand store for agent state management
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { agentOrchestrator } from '../core/orchestrator'
import type {
  AgentStore,
  AgentStoreState,
  AgentSession,
  CreateSessionDTO,
  AgentResponse,
  PendingConfirmation,
} from '../types/agent'
import type { AgentMessage } from '../types/chat'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Initial State
// ============================================================================

const initialState: AgentStoreState = {
  activeSessionId: null,
  sessions: new Map(),
  isLoadingSessions: false,
  isChatOpen: false,
  isChatMinimized: false,
  isProcessing: false,
  streamingMessageId: null,
  activeAbortController: null,
  pendingConfirmations: [],
  error: null,
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAgentStore = create<AgentStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ======================================================================
        // Session Management
        // ======================================================================

        loadSessions: async () => {
          set({ isLoadingSessions: true, error: null })

          try {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) {
              set({ isLoadingSessions: false })
              return
            }

            const { data: sessions, error } = await supabase
              .from('agent_sessions')
              .select('*')
              .eq('user_id', userData.user.id)
              .eq('status', 'active')
              .order('last_message_at', { ascending: false })
              .limit(20)

            if (error) {throw error}

            const sessionsMap = new Map<string, AgentSession>()
            for (const session of sessions || []) {
              sessionsMap.set(session.id, session as unknown as AgentSession)
            }

            set({
              sessions: sessionsMap,
              isLoadingSessions: false,
            })

            // Set active session to most recent if none selected
            if (!get().activeSessionId && sessions && sessions.length > 0) {
              set({ activeSessionId: sessions[0].id })
            }
          } catch (error) {
            logger.error('[AgentStore] Error loading sessions:', error)
            set({
              isLoadingSessions: false,
              error: 'Failed to load chat sessions',
            })
          }
        },

        createSession: async (dto?: CreateSessionDTO) => {
          set({ error: null })

          try {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) {
              throw new Error('User not authenticated')
            }

            // Get user's company
            const { data: userRecord } = await supabase
              .from('users')
              .select('company_id')
              .eq('id', userData.user.id)
              .single()

            if (!userRecord?.company_id) {
              throw new Error('User not associated with a company')
            }

            const { data: session, error } = await supabase
              .from('agent_sessions')
              .insert({
                company_id: userRecord.company_id,
                user_id: userData.user.id,
                project_id: dto?.project_id,
                title: dto?.title || 'New Conversation',
                context_entity_type: dto?.context_entity_type,
                context_entity_id: dto?.context_entity_id,
                system_context: dto?.system_context || {},
                status: 'active',
              } as any)
              .select()
              .single()

            if (error) {throw error}

            const newSession = session as unknown as AgentSession

            set((state) => ({
              sessions: new Map(state.sessions).set(newSession.id, newSession),
              activeSessionId: newSession.id,
            }))

            return newSession
          } catch (error) {
            logger.error('[AgentStore] Error creating session:', error)
            set({ error: 'Failed to create chat session' })
            throw error
          }
        },

        setActiveSession: (sessionId: string | null) => {
          set({ activeSessionId: sessionId })
        },

        endSession: async (sessionId: string) => {
          try {
            await supabase
              .from('agent_sessions')
              .update({
                status: 'ended',
                ended_at: new Date().toISOString(),
              } as any)
              .eq('id', sessionId)

            set((state) => {
              const sessions = new Map(state.sessions)
              sessions.delete(sessionId)
              return {
                sessions,
                activeSessionId:
                  state.activeSessionId === sessionId ? null : state.activeSessionId,
              }
            })
          } catch (error) {
            logger.error('[AgentStore] Error ending session:', error)
            set({ error: 'Failed to end chat session' })
          }
        },

        deleteSession: async (sessionId: string) => {
          try {
            await supabase.from('agent_sessions').delete().eq('id', sessionId)

            set((state) => {
              const sessions = new Map(state.sessions)
              sessions.delete(sessionId)
              return {
                sessions,
                activeSessionId:
                  state.activeSessionId === sessionId ? null : state.activeSessionId,
              }
            })
          } catch (error) {
            logger.error('[AgentStore] Error deleting session:', error)
            set({ error: 'Failed to delete chat session' })
          }
        },

        // ======================================================================
        // UI Actions
        // ======================================================================

        openChat: () => {
          set({ isChatOpen: true, isChatMinimized: false })

          // Load sessions if not loaded
          const state = get()
          if (state.sessions.size === 0 && !state.isLoadingSessions) {
            state.loadSessions()
          }

          // Create session if none exists
          if (!state.activeSessionId && !state.isLoadingSessions) {
            state.createSession()
          }
        },

        closeChat: () => {
          set({ isChatOpen: false })
        },

        toggleChat: () => {
          const state = get()
          if (state.isChatOpen) {
            state.closeChat()
          } else {
            state.openChat()
          }
        },

        minimizeChat: () => {
          set({ isChatMinimized: true })
        },

        maximizeChat: () => {
          set({ isChatMinimized: false })
        },

        // ======================================================================
        // Message Actions
        // ======================================================================

        sendMessage: async (content: string): Promise<AgentResponse> => {
          const state = get()

          if (!state.activeSessionId) {
            throw new Error('No active session')
          }

          const session = state.sessions.get(state.activeSessionId)
          if (!session) {
            throw new Error('Session not found')
          }

          // Create AbortController for this request
          const abortController = new AbortController()
          set({ isProcessing: true, error: null, activeAbortController: abortController })

          try {
            const response = await agentOrchestrator.processMessage(session, content, {
              abortSignal: abortController.signal,
              onStreamChunk: (chunk) => {
                // Handle streaming updates
                if (chunk.type === 'text_delta') {
                  // Update streaming state
                  set({ streamingMessageId: chunk.messageId || null })
                }
              },
              onConfirmationRequired: (confirmation) => {
                // Add to pending confirmations queue
                const pendingConfirmation: PendingConfirmation = {
                  id: confirmation.id,
                  toolName: confirmation.toolName,
                  toolInput: confirmation.toolInput,
                  description: confirmation.description,
                  createdAt: new Date().toISOString(),
                  toolCall: confirmation.toolCall,
                  severity: confirmation.severity,
                  estimatedImpact: confirmation.estimatedImpact,
                }
                get().addPendingConfirmation(pendingConfirmation)
              },
            })

            set({ isProcessing: false, streamingMessageId: null, activeAbortController: null })
            return response
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            // Don't log abort errors as they're intentional
            if (errorMessage !== 'Request aborted') {
              logger.error('[AgentStore] Error sending message:', error)
            }
            set({
              isProcessing: false,
              streamingMessageId: null,
              activeAbortController: null,
              error: errorMessage === 'Request aborted' ? null : (errorMessage || 'Failed to send message'),
            })
            throw error
          }
        },

        cancelProcessing: () => {
          const controller = get().activeAbortController
          if (controller) {
            controller.abort()
          }
          set({
            isProcessing: false,
            streamingMessageId: null,
            activeAbortController: null,
          })
        },

        // ======================================================================
        // Confirmation Actions
        // ======================================================================

        addPendingConfirmation: (confirmation: PendingConfirmation) => {
          set((state) => ({
            pendingConfirmations: [...state.pendingConfirmations, confirmation],
          }))
        },

        confirmAction: async (confirmationId: string) => {
          const state = get()
          const confirmation = state.pendingConfirmations.find((c) => c.id === confirmationId)
          if (!confirmation) {return}

          // Remove from pending
          set((s) => ({
            pendingConfirmations: s.pendingConfirmations.filter((c) => c.id !== confirmationId),
            isProcessing: true,
          }))

          try {
            // Execute the confirmed tool
            const session = state.sessions.get(state.activeSessionId || '')
            if (session && confirmation.toolCall) {
              const context = {
                sessionId: session.id,
                userId: session.user_id,
                companyId: session.company_id,
                projectId: session.project_id,
                autonomyLevel: 'autonomous' as const, // Confirmed by user
                featuresEnabled: {},
              }

              const result = await agentOrchestrator.executeTask(
                confirmation.toolCall.name,
                confirmation.toolCall.arguments,
                context
              )

              // Save the tool result to the session
              await supabase.from('agent_messages').insert({
                session_id: session.id,
                role: 'tool',
                content: JSON.stringify(result.data || result.error),
                tool_call_id: confirmation.toolCall.id,
                tool_name: confirmation.toolCall.name,
                tool_input: confirmation.toolCall.arguments,
                tool_output: result.data,
                tool_error: result.error,
              })

              // Call the onConfirm callback if provided
              if (confirmation.onConfirm) {
                await confirmation.onConfirm(result)
              }
            }
          } catch (error) {
            logger.error('[AgentStore] Error executing confirmed action:', error)
            set({ error: 'Failed to execute action' })
          } finally {
            set({ isProcessing: false })
          }
        },

        rejectAction: async (confirmationId: string) => {
          const state = get()
          const confirmation = state.pendingConfirmations.find((c) => c.id === confirmationId)

          set((s) => ({
            pendingConfirmations: s.pendingConfirmations.filter(
              (c) => c.id !== confirmationId
            ),
          }))

          // Save rejection to session
          if (confirmation && state.activeSessionId) {
            await supabase.from('agent_messages').insert({
              session_id: state.activeSessionId,
              role: 'tool',
              content: JSON.stringify({ rejected: true, message: 'User rejected this action' }),
              tool_call_id: confirmation.toolCall?.id,
              tool_name: confirmation.toolCall?.name,
              tool_error: 'Action rejected by user',
            })

            // Call the onReject callback if provided
            if (confirmation.onReject) {
              confirmation.onReject()
            }
          }
        },

        clearConfirmations: () => {
          set({ pendingConfirmations: [] })
        },

        // ======================================================================
        // Error Handling
        // ======================================================================

        setError: (error: string | null) => {
          set({ error })
        },

        clearError: () => {
          set({ error: null })
        },

        // ======================================================================
        // Reset
        // ======================================================================

        reset: () => {
          set(initialState)
        },
      }),
      {
        name: 'agent-store',
        partialize: (state) => ({
          // Only persist UI preferences
          isChatOpen: state.isChatOpen,
          activeSessionId: state.activeSessionId,
        }),
      }
    ),
    { name: 'AgentStore' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveSession = (state: AgentStore) =>
  state.activeSessionId ? state.sessions.get(state.activeSessionId) : null

export const selectSortedSessions = (state: AgentStore) =>
  Array.from(state.sessions.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )

export const selectIsReady = (state: AgentStore) =>
  !state.isLoadingSessions && state.activeSessionId !== null

// ============================================================================
// Hooks
// ============================================================================

export function useAgentChat() {
  const store = useAgentStore()

  return {
    isOpen: store.isChatOpen,
    isMinimized: store.isChatMinimized,
    isProcessing: store.isProcessing,
    error: store.error,
    activeSession: selectActiveSession(store),
    sessions: selectSortedSessions(store),
    openChat: store.openChat,
    closeChat: store.closeChat,
    toggleChat: store.toggleChat,
    minimizeChat: store.minimizeChat,
    maximizeChat: store.maximizeChat,
    sendMessage: store.sendMessage,
    cancelProcessing: store.cancelProcessing,
    createSession: store.createSession,
    setActiveSession: store.setActiveSession,
    endSession: store.endSession,
    clearError: store.clearError,
  }
}
