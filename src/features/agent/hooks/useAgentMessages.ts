/**
 * useAgentMessages Hook
 * Manages chat messages for an agent session with real-time updates
 */

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AgentMessage } from '../types/chat'

// ============================================================================
// Types
// ============================================================================

interface UseAgentMessagesOptions {
  enabled?: boolean
  limit?: number
}

interface UseAgentMessagesResult {
  messages: AgentMessage[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentMessages(
  sessionId: string | null | undefined,
  options: UseAgentMessagesOptions = {}
): UseAgentMessagesResult {
  const { enabled = true, limit = 100 } = options
  const queryClient = useQueryClient()

  // Query for messages
  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agent-messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return []

      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data as AgentMessage[]
    },
    enabled: enabled && !!sessionId,
    staleTime: 0, // Always fetch fresh data
  })

  // Set up real-time subscription
  useEffect(() => {
    if (!sessionId || !enabled) return

    const channel = supabase
      .channel(`agent-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // Add new message to cache
          queryClient.setQueryData<AgentMessage[]>(
            ['agent-messages', sessionId],
            (old = []) => [...old, payload.new as AgentMessage]
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // Update message in cache
          queryClient.setQueryData<AgentMessage[]>(
            ['agent-messages', sessionId],
            (old = []) =>
              old.map((msg) =>
                msg.id === payload.new.id ? (payload.new as AgentMessage) : msg
              )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, enabled, queryClient])

  return {
    messages,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook to get a single message by ID
 */
export function useAgentMessage(messageId: string | null | undefined) {
  return useQuery({
    queryKey: ['agent-message', messageId],
    queryFn: async () => {
      if (!messageId) return null

      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (error) throw error
      return data as AgentMessage
    },
    enabled: !!messageId,
  })
}

/**
 * Hook to add a new message (used internally by the store)
 */
export function useAddMessage(sessionId: string) {
  const queryClient = useQueryClient()

  return useCallback(
    async (message: Partial<AgentMessage>) => {
      // Optimistically add to cache
      const tempId = `temp-${Date.now()}`
      const tempMessage: AgentMessage = {
        id: tempId,
        session_id: sessionId,
        role: message.role || 'user',
        content: message.content || '',
        tool_calls: null,
        tool_call_id: null,
        tool_name: null,
        tool_input: null,
        tool_output: null,
        tool_error: null,
        tokens_used: null,
        latency_ms: null,
        model_used: null,
        is_streaming: false,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<AgentMessage[]>(
        ['agent-messages', sessionId],
        (old = []) => [...old, tempMessage]
      )

      // Insert into database
      const { data, error } = await supabase
        .from('agent_messages')
        .insert({
          session_id: sessionId,
          role: message.role,
          content: message.content,
          tool_calls: message.tool_calls,
          tool_call_id: message.tool_call_id,
          tool_name: message.tool_name,
          tool_input: message.tool_input,
          tool_output: message.tool_output,
          tool_error: message.tool_error,
          tokens_used: message.tokens_used,
          model_used: message.model_used,
        })
        .select()
        .single()

      if (error) {
        // Remove temp message on error
        queryClient.setQueryData<AgentMessage[]>(
          ['agent-messages', sessionId],
          (old = []) => old.filter((m) => m.id !== tempId)
        )
        throw error
      }

      // Replace temp message with real one
      queryClient.setQueryData<AgentMessage[]>(
        ['agent-messages', sessionId],
        (old = []) =>
          old.map((m) => (m.id === tempId ? (data as AgentMessage) : m))
      )

      return data as AgentMessage
    },
    [sessionId, queryClient]
  )
}
