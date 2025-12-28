/**
 * useThread Hook
 *
 * Provides thread/reply functionality for messages:
 * - Fetch thread messages (replies to a parent message)
 * - Get reply count for messages
 * - Create replies to messages
 * - Navigate to thread context
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { messagingKeys } from './useMessaging'
import type { Message, SendMessageDTO } from '@/types/messaging'
import { toast } from '@/lib/notifications/ToastContext'

// Using extended Database types for tables not yet in generated types
const db = supabase as any

// Query keys for threads
export const threadKeys = {
  all: ['threads'] as const,
  thread: (parentMessageId: string) => [...threadKeys.all, 'thread', parentMessageId] as const,
  replyCounts: (conversationId: string) => [...threadKeys.all, 'reply-counts', conversationId] as const,
}

export interface ThreadMessage extends Message {
  reply_count?: number
}

export interface ReplyCount {
  parent_message_id: string
  count: number
}

/**
 * Get all replies to a parent message (thread view)
 */
export function useThreadMessages(parentMessageId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: threadKeys.thread(parentMessageId || ''),
    queryFn: async (): Promise<Message[]> => {
      if (!parentMessageId) {return []}

      const { data, error } = await db
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          ),
          reactions:message_reactions(
            id,
            emoji,
            user_id,
            created_at
          )
        `)
        .eq('parent_message_id', parentMessageId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {throw error}

      return (data || []) as unknown as Message[]
    },
    enabled: !!parentMessageId && !!userProfile?.id,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Get infinite scrolling thread messages
 */
export function useThreadMessagesInfinite(
  parentMessageId: string | undefined,
  pageSize = 20
) {
  const { userProfile } = useAuth()

  return useInfiniteQuery({
    queryKey: [...threadKeys.thread(parentMessageId || ''), 'infinite'],
    queryFn: async ({ pageParam }) => {
      if (!parentMessageId) {return []}

      let query = db
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          ),
          reactions:message_reactions(
            id,
            emoji,
            user_id,
            created_at
          )
        `)
        .eq('parent_message_id', parentMessageId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(pageSize)

      if (pageParam) {
        query = query.gt('created_at', pageParam)
      }

      const { data, error } = await query

      if (error) {throw error}

      return (data || []) as unknown as Message[]
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < pageSize) {return undefined}
      return lastPage[lastPage.length - 1]?.created_at
    },
    enabled: !!parentMessageId && !!userProfile?.id,
    staleTime: 30000,
  })
}

/**
 * Get reply counts for messages in a conversation
 * Useful for showing "X replies" indicator on parent messages
 */
export function useReplyCounts(conversationId: string | undefined, messageIds: string[]) {
  return useQuery({
    queryKey: [...threadKeys.replyCounts(conversationId || ''), messageIds.slice(0, 10).join(',')],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!conversationId || messageIds.length === 0) {
        return new Map()
      }

      // Get count of replies for each message
      const { data, error } = await db
        .from('messages')
        .select('parent_message_id')
        .in('parent_message_id', messageIds)
        .is('deleted_at', null)

      if (error) {throw error}

      // Count replies per parent message
      const countMap = new Map<string, number>()
      for (const row of data || []) {
        if (row.parent_message_id) {
          const current = countMap.get(row.parent_message_id) || 0
          countMap.set(row.parent_message_id, current + 1)
        }
      }

      return countMap
    },
    enabled: !!conversationId && messageIds.length > 0,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get reply count for a single message
 */
export function useReplyCount(messageId: string | undefined) {
  return useQuery({
    queryKey: [...threadKeys.all, 'reply-count', messageId],
    queryFn: async (): Promise<number> => {
      if (!messageId) {return 0}

      const { count, error } = await db
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('parent_message_id', messageId)
        .is('deleted_at', null)

      if (error) {throw error}

      return count || 0
    },
    enabled: !!messageId,
    staleTime: 60000,
  })
}

/**
 * Send a reply to a message (create thread)
 */
export function useSendReply() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (data: SendMessageDTO & { parent_message_id: string }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      const { data: message, error } = await db
        .from('messages')
        .insert({
          conversation_id: data.conversation_id,
          sender_id: userProfile.id,
          content: data.content,
          message_type: data.message_type || 'text',
          attachments: data.attachments || null,
          mentioned_users: data.mentioned_users || null,
          parent_message_id: data.parent_message_id,
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) {throw error}

      return message as unknown as Message
    },
    // Optimistic update for thread
    onMutate: async (newReply) => {
      await queryClient.cancelQueries({
        queryKey: threadKeys.thread(newReply.parent_message_id),
      })

      const previousReplies = queryClient.getQueryData<Message[]>(
        threadKeys.thread(newReply.parent_message_id)
      )

      // Create optimistic reply
      const optimisticReply: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: newReply.conversation_id,
        sender_id: userProfile?.id || '',
        content: newReply.content,
        message_type: newReply.message_type || 'text',
        priority: 'normal',
        attachments: newReply.attachments || null,
        mentioned_users: newReply.mentioned_users || null,
        parent_message_id: newReply.parent_message_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        edited_at: null,
        sender: userProfile ? {
          id: userProfile.id,
          full_name: userProfile.full_name || 'You',
          email: userProfile.email || '',
          avatar_url: userProfile.avatar_url,
        } : undefined,
        reactions: [],
        _isPending: true,
      } as Message & { _isPending?: boolean }

      // Add to thread cache
      queryClient.setQueryData<Message[]>(
        threadKeys.thread(newReply.parent_message_id),
        (old) => [...(old || []), optimisticReply]
      )

      return { previousReplies, parentMessageId: newReply.parent_message_id }
    },
    onError: (error: Error, _newReply, context) => {
      if (context?.previousReplies !== undefined) {
        queryClient.setQueryData(
          threadKeys.thread(context.parentMessageId),
          context.previousReplies
        )
      }
      toast.error(`Failed to send reply: ${error.message}`)
    },
    onSettled: (_reply, _error, variables) => {
      // Invalidate thread queries
      queryClient.invalidateQueries({
        queryKey: threadKeys.thread(variables.parent_message_id),
      })
      // Update reply count
      queryClient.invalidateQueries({
        queryKey: [...threadKeys.all, 'reply-count', variables.parent_message_id],
      })
      // Update conversation messages list (to show reply count)
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesList(variables.conversation_id),
      })
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesInfinite(variables.conversation_id),
      })
    },
  })
}

/**
 * Get parent message for a thread
 */
export function useParentMessage(messageId: string | undefined) {
  return useQuery({
    queryKey: [...threadKeys.all, 'parent', messageId],
    queryFn: async (): Promise<Message | null> => {
      if (!messageId) {return null}

      const { data, error } = await db
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .eq('id', messageId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {return null} // Not found
        throw error
      }

      return data as unknown as Message
    },
    enabled: !!messageId,
    staleTime: 60000,
  })
}

/**
 * Get the latest reply in a thread (for preview)
 */
export function useLatestReply(parentMessageId: string | undefined) {
  return useQuery({
    queryKey: [...threadKeys.all, 'latest-reply', parentMessageId],
    queryFn: async (): Promise<Message | null> => {
      if (!parentMessageId) {return null}

      const { data, error } = await db
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .eq('parent_message_id', parentMessageId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {return null} // Not found
        throw error
      }

      return data as unknown as Message
    },
    enabled: !!parentMessageId,
    staleTime: 30000,
  })
}
