/**
 * useAgentSession Hook
 * Manages agent session lifecycle with persistence and history
 */

import { useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAgentStore } from '../state/store'
import type { AgentSession, CreateSessionDTO, UpdateSessionDTO } from '../types/agent'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface UseAgentSessionOptions {
  autoCreate?: boolean
  projectId?: string
}

interface UseAgentSessionResult {
  // Current session
  session: AgentSession | null
  sessionId: string | null
  isLoading: boolean
  error: Error | null

  // Session list
  sessions: AgentSession[]
  isLoadingSessions: boolean

  // Actions
  createSession: (dto?: CreateSessionDTO) => Promise<AgentSession>
  updateSession: (dto: UpdateSessionDTO) => Promise<void>
  switchSession: (sessionId: string) => void
  endSession: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  clearHistory: () => Promise<void>

  // Session history
  loadMoreHistory: () => Promise<void>
  hasMoreHistory: boolean
}

// ============================================================================
// Constants
// ============================================================================

const SESSION_QUERY_KEY = 'agent-session'
const SESSIONS_QUERY_KEY = 'agent-sessions'
const SESSIONS_PER_PAGE = 20

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAgentSession(options: UseAgentSessionOptions = {}): UseAgentSessionResult {
  const { autoCreate = true, projectId } = options
  const queryClient = useQueryClient()

  const {
    activeSessionId,
    sessions: sessionMap,
    isLoadingSessions,
    setActiveSession,
    createSession: storeCreateSession,
    endSession: storeEndSession,
    deleteSession: storeDeleteSession,
    loadSessions: storeLoadSessions,
  } = useAgentStore()

  // Convert sessions map to sorted array
  const sessions = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )

  // Query for current session details
  const {
    data: session,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useQuery({
    queryKey: [SESSION_QUERY_KEY, activeSessionId],
    queryFn: async (): Promise<AgentSession | null> => {
      if (!activeSessionId) {return null}

      const { data, error } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('id', activeSessionId)
        .single()

      if (error) {throw error}
      return data as unknown as AgentSession
    },
    enabled: !!activeSessionId,
    staleTime: 30000, // 30 seconds
  })

  // Load sessions on mount
  useEffect(() => {
    if (sessionMap.size === 0 && !isLoadingSessions) {
      storeLoadSessions()
    }
  }, [sessionMap.size, isLoadingSessions, storeLoadSessions])

  // Auto-create session if needed
  useEffect(() => {
    if (autoCreate && !activeSessionId && !isLoadingSessions && sessionMap.size === 0) {
      storeCreateSession({ project_id: projectId }).catch((err) => {
        logger.error('[useAgentSession] Failed to auto-create session:', err)
      })
    }
  }, [autoCreate, activeSessionId, isLoadingSessions, sessionMap.size, projectId, storeCreateSession])

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (dto?: CreateSessionDTO) => {
      return storeCreateSession(dto)
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
      queryClient.setQueryData([SESSION_QUERY_KEY, newSession.id], newSession)
    },
  })

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (dto: UpdateSessionDTO) => {
      if (!activeSessionId) {throw new Error('No active session')}

      const { error } = await supabase
        .from('agent_sessions')
        .update(dto as any)
        .eq('id', activeSessionId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY, activeSessionId] })
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
    },
  })

  // Archive session mutation
  const archiveSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('agent_sessions')
        .update({ status: 'archived' })
        .eq('id', sessionId)

      if (error) {throw error}
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY, sessionId] })
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
    },
  })

  // Clear history mutation (delete all archived sessions)
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {throw new Error('Not authenticated')}

      const { error } = await supabase
        .from('agent_sessions')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('status', 'archived')

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
    },
  })

  // Callbacks
  const createSession = useCallback(
    async (dto?: CreateSessionDTO) => {
      return createSessionMutation.mutateAsync(dto)
    },
    [createSessionMutation]
  )

  const updateSession = useCallback(
    async (dto: UpdateSessionDTO) => {
      await updateSessionMutation.mutateAsync(dto)
    },
    [updateSessionMutation]
  )

  const switchSession = useCallback(
    (sessionId: string) => {
      setActiveSession(sessionId)
    },
    [setActiveSession]
  )

  const endSession = useCallback(async () => {
    if (activeSessionId) {
      await storeEndSession(activeSessionId)
    }
  }, [activeSessionId, storeEndSession])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await storeDeleteSession(sessionId)
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
    },
    [storeDeleteSession, queryClient]
  )

  const archiveSession = useCallback(
    async (sessionId: string) => {
      await archiveSessionMutation.mutateAsync(sessionId)
    },
    [archiveSessionMutation]
  )

  const clearHistory = useCallback(async () => {
    await clearHistoryMutation.mutateAsync()
  }, [clearHistoryMutation])

  const loadMoreHistory = useCallback(async () => {
    // This would implement pagination for session history
    // For now, we load all recent sessions in the store
    await storeLoadSessions()
  }, [storeLoadSessions])

  return {
    session: session || (activeSessionId ? sessionMap.get(activeSessionId) ?? null : null),
    sessionId: activeSessionId,
    isLoading: isLoadingSession,
    error: sessionError as Error | null,
    sessions,
    isLoadingSessions,
    createSession,
    updateSession,
    switchSession,
    endSession,
    deleteSession,
    archiveSession,
    clearHistory,
    loadMoreHistory,
    hasMoreHistory: false, // Would be implemented with pagination
  }
}

// ============================================================================
// Session Title Generation Hook
// ============================================================================

/**
 * Hook to auto-generate session title from first message
 */
export function useSessionTitleGeneration(sessionId: string | null) {
  const queryClient = useQueryClient()

  const generateTitle = useCallback(
    async (firstMessage: string) => {
      if (!sessionId || !firstMessage) {return}

      // Simple title generation - take first 50 chars
      // In production, this could use AI to generate a better title
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')

      try {
        await supabase
          .from('agent_sessions')
          .update({ title })
          .eq('id', sessionId)
          .is('title', null) // Only update if title is not set

        queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY, sessionId] })
      } catch (error) {
        logger.error('[useSessionTitleGeneration] Failed to update title:', error)
      }
    },
    [sessionId, queryClient]
  )

  return { generateTitle }
}

// ============================================================================
// Session Context Hook
// ============================================================================

/**
 * Hook to manage session context (current entity being viewed)
 */
export function useSessionContext(sessionId: string | null) {
  const queryClient = useQueryClient()

  const setContext = useCallback(
    async (entityType: string, entityId: string, entityData?: Record<string, unknown>) => {
      if (!sessionId) {return}

      try {
        await supabase
          .from('agent_sessions')
          .update({
            context_entity_type: entityType,
            context_entity_id: entityId,
            system_context: entityData ? { currentEntity: entityData } : {},
          })
          .eq('id', sessionId)

        queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY, sessionId] })
      } catch (error) {
        logger.error('[useSessionContext] Failed to set context:', error)
      }
    },
    [sessionId, queryClient]
  )

  const clearContext = useCallback(async () => {
    if (!sessionId) {return}

    try {
      await supabase
        .from('agent_sessions')
        .update({
          context_entity_type: null,
          context_entity_id: null,
          system_context: {},
        })
        .eq('id', sessionId)

      queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY, sessionId] })
    } catch (error) {
      logger.error('[useSessionContext] Failed to clear context:', error)
    }
  }, [sessionId, queryClient])

  return { setContext, clearContext }
}

// ============================================================================
// Session Statistics Hook
// ============================================================================

interface SessionStats {
  totalMessages: number
  totalTokens: number
  totalCostCents: number
  averageLatencyMs: number
}

export function useSessionStats(sessionId: string | null) {
  return useQuery({
    queryKey: ['agent-session-stats', sessionId],
    queryFn: async (): Promise<SessionStats> => {
      if (!sessionId) {
        return {
          totalMessages: 0,
          totalTokens: 0,
          totalCostCents: 0,
          averageLatencyMs: 0,
        }
      }

      const { data: session } = await supabase
        .from('agent_sessions')
        .select('message_count, total_tokens_used, total_cost_cents')
        .eq('id', sessionId)
        .single()

      const { data: messages } = await supabase
        .from('agent_messages')
        .select('latency_ms')
        .eq('session_id', sessionId)
        .not('latency_ms', 'is', null)

      const latencies = messages?.map((m) => m.latency_ms).filter(Boolean) || []
      const avgLatency =
        latencies.length > 0
          ? latencies.reduce((a, b) => (a || 0) + (b || 0), 0) / latencies.length
          : 0

      return {
        totalMessages: session?.message_count || 0,
        totalTokens: session?.total_tokens_used || 0,
        totalCostCents: session?.total_cost_cents || 0,
        averageLatencyMs: avgLatency || 0,
      }
    },
    enabled: !!sessionId,
    staleTime: 60000, // 1 minute
  })
}
