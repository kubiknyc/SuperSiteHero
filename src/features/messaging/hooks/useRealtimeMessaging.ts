/**
 * Supabase Realtime Hooks for Messaging
 *
 * Provides live updates for:
 * - New messages in conversations
 * - Typing indicators
 * - Presence status
 * - Conversation updates
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { messagingKeys } from './useMessaging'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Message, TypingIndicatorEvent } from '@/types/messaging'

// =====================================================
// REALTIME MESSAGE SUBSCRIPTION
// =====================================================

/**
 * Subscribe to real-time message updates for a conversation
 */
export function useRealtimeMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!conversationId || !userProfile?.id) {return}

    // Create a unique channel for this conversation
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          // Invalidate queries to refetch messages
          queryClient.invalidateQueries({
            queryKey: messagingKeys.messagesList(conversationId),
          })
          queryClient.invalidateQueries({
            queryKey: messagingKeys.messagesInfinite(conversationId),
          })
          // Update conversations list for last_message preview
          queryClient.invalidateQueries({
            queryKey: messagingKeys.conversations(),
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          queryClient.invalidateQueries({
            queryKey: messagingKeys.messagesList(conversationId),
          })
          queryClient.invalidateQueries({
            queryKey: messagingKeys.messagesInfinite(conversationId),
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: messagingKeys.messagesList(conversationId),
          })
          queryClient.invalidateQueries({
            queryKey: messagingKeys.messagesInfinite(conversationId),
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId, userProfile?.id, queryClient])

  return channelRef.current
}

// =====================================================
// TYPING INDICATOR
// =====================================================

interface TypingState {
  [userId: string]: {
    userName: string
    timestamp: number
  }
}

/**
 * Subscribe to and broadcast typing indicators
 */
export function useTypingIndicator(conversationId: string | undefined) {
  const { userProfile } = useAuth()
  const [typingUsers, setTypingUsers] = useState<TypingState>({})
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up stale typing indicators (older than 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now()
        const updated: TypingState = {}
        let hasChanges = false

        for (const [userId, data] of Object.entries(prev)) {
          if (now - data.timestamp < 3000) {
            updated[userId] = data
          } else {
            hasChanges = true
          }
        }

        return hasChanges ? updated : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Subscribe to typing broadcasts
  useEffect(() => {
    if (!conversationId || !userProfile?.id) {return}

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const event = payload.payload as TypingIndicatorEvent

        // Don't show our own typing
        if (event.user_id === userProfile.id) {return}

        if (event.is_typing) {
          setTypingUsers((prev) => ({
            ...prev,
            [event.user_id]: {
              userName: event.user_name,
              timestamp: Date.now(),
            },
          }))
        } else {
          setTypingUsers((prev) => {
            const updated = { ...prev }
            delete updated[event.user_id]
            return updated
          })
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId, userProfile?.id])

  // Broadcast that user is typing
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !userProfile?.id || !conversationId) {return}

      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversation_id: conversationId,
          user_id: userProfile.id,
          user_name: userProfile.first_name
            ? `${userProfile.first_name}${userProfile.last_name ? ' ' + userProfile.last_name : ''}`
            : userProfile.email || 'User',
          is_typing: isTyping,
        } as TypingIndicatorEvent,
      })

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(false)
        }, 3000)
      }
    },
    [conversationId, userProfile]
  )

  // Get array of typing user names (excluding current user)
  const typingUserNames = Object.entries(typingUsers)
    .filter(([userId]) => userId !== userProfile?.id)
    .map(([_, data]) => data.userName)

  return {
    typingUsers: typingUserNames,
    sendTyping,
    isTyping: typingUserNames.length > 0,
  }
}

// =====================================================
// PRESENCE (ONLINE STATUS)
// =====================================================

interface PresenceState {
  [userId: string]: {
    online: boolean
    lastSeen?: string
  }
}

/**
 * Subscribe to user presence for a conversation
 */
export function usePresence(conversationId: string | undefined) {
  const { userProfile } = useAuth()
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!conversationId || !userProfile?.id) {return}

    const channel = supabase.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: userProfile.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const newPresence: PresenceState = {}

        for (const [userId, presences] of Object.entries(state)) {
          if (Array.isArray(presences) && presences.length > 0) {
            newPresence[userId] = { online: true }
          }
        }

        setPresenceState(newPresence)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setPresenceState((prev) => ({
          ...prev,
          [key]: { online: true },
        }))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresenceState((prev) => ({
          ...prev,
          [key]: { online: false, lastSeen: new Date().toISOString() },
        }))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userProfile.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId, userProfile?.id])

  const isUserOnline = useCallback(
    (userId: string) => presenceState[userId]?.online ?? false,
    [presenceState]
  )

  const getLastSeen = useCallback(
    (userId: string) => presenceState[userId]?.lastSeen,
    [presenceState]
  )

  return {
    presenceState,
    isUserOnline,
    getLastSeen,
  }
}

// =====================================================
// CONVERSATION LIST REALTIME
// =====================================================

/**
 * Subscribe to real-time conversation list updates
 */
export function useRealtimeConversations() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userProfile?.id) {return}

    // Subscribe to conversation_participants changes for the current user
    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: messagingKeys.conversations(),
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userProfile.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: messagingKeys.conversations(),
          })
          // Also update unread count
          queryClient.invalidateQueries({
            queryKey: messagingKeys.totalUnread(userProfile.id),
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userProfile?.id, queryClient])

  return channelRef.current
}

// =====================================================
// COMBINED HOOK
// =====================================================

/**
 * Combined hook for all messaging realtime features in a conversation
 */
export function useConversationRealtime(conversationId: string | undefined) {
  const messagesChannel = useRealtimeMessages(conversationId)
  const typingIndicator = useTypingIndicator(conversationId)
  const presence = usePresence(conversationId)

  return {
    messagesChannel,
    ...typingIndicator,
    ...presence,
  }
}
