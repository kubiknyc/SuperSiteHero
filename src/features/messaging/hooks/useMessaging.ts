/**
 * Messaging React Query Hooks
 *
 * Provides hooks for real-time messaging operations:
 * - Conversations (direct, group, project)
 * - Messages with attachments and mentions
 * - Participants and read receipts
 * - Reactions
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { toast } from 'react-hot-toast'
import * as messagingApi from '@/lib/api/services/messaging'
import type {
  Conversation,
  Message,
  ConversationFilters,
  MessageFilters,
  CreateConversationDTO,
  SendMessageDTO,
  ConversationType,
} from '@/types/messaging'

// Query key factory for consistent cache management
export const messagingKeys = {
  all: ['messaging'] as const,
  conversations: () => [...messagingKeys.all, 'conversations'] as const,
  conversationsList: (filters?: ConversationFilters) =>
    [...messagingKeys.conversations(), 'list', filters] as const,
  conversation: (id: string) => [...messagingKeys.conversations(), 'detail', id] as const,
  messages: () => [...messagingKeys.all, 'messages'] as const,
  messagesList: (conversationId: string, filters?: MessageFilters) =>
    [...messagingKeys.messages(), 'list', conversationId, filters] as const,
  messagesInfinite: (conversationId: string) =>
    [...messagingKeys.messages(), 'infinite', conversationId] as const,
  unreadCount: (userId: string) => [...messagingKeys.all, 'unread', userId] as const,
  totalUnread: (userId: string) => [...messagingKeys.all, 'totalUnread', userId] as const,
  search: (query: string) => [...messagingKeys.all, 'search', query] as const,
}

// =====================================================
// CONVERSATION HOOKS
// =====================================================

/**
 * Fetch user's conversations with optional filters
 */
export function useConversations(filters?: ConversationFilters & { limit?: number; offset?: number }) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: messagingKeys.conversationsList(filters),
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.getConversations(userProfile.id, filters)
      if (error) throw error
      return data || []
    },
    enabled: !!userProfile?.id,
    staleTime: 30 * 1000, // 30 seconds - conversations change frequently
  })
}

/**
 * Fetch a single conversation by ID
 */
export function useConversation(conversationId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: messagingKeys.conversation(conversationId || ''),
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      if (!conversationId) throw new Error('Conversation ID required')
      const { data, error } = await messagingApi.getConversation(conversationId, userProfile.id)
      if (error) throw error
      return data
    },
    enabled: !!userProfile?.id && !!conversationId,
    staleTime: 30 * 1000,
  })
}

/**
 * Create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateConversationDTO) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data: conversation, error } = await messagingApi.createConversation(userProfile.id, data)
      if (error) throw error
      return conversation
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() })
      toast.success(conversation?.type === 'direct' ? 'Conversation started' : 'Group created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create conversation: ${error.message}`)
    },
  })
}

/**
 * Get or create a direct conversation with another user
 */
export function useGetOrCreateDirectConversation() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.getOrCreateDirectConversation(
        userProfile.id,
        otherUserId
      )
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to start conversation: ${error.message}`)
    },
  })
}

/**
 * Update conversation details (name, etc.)
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      conversationId,
      updates,
    }: {
      conversationId: string
      updates: { name?: string }
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.updateConversation(
        conversationId,
        userProfile.id,
        updates
      )
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(variables.conversationId) })
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() })
      toast.success('Conversation updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update conversation: ${error.message}`)
    },
  })
}

/**
 * Leave a conversation
 */
export function useLeaveConversation() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.leaveConversation(conversationId, userProfile.id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() })
      toast.success('Left conversation')
    },
    onError: (error: Error) => {
      toast.error(`Failed to leave conversation: ${error.message}`)
    },
  })
}

// =====================================================
// MESSAGE HOOKS
// =====================================================

/**
 * Fetch messages for a conversation with pagination
 */
export function useMessages(conversationId: string | undefined, filters?: MessageFilters) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: messagingKeys.messagesList(conversationId || '', filters),
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      if (!conversationId) throw new Error('Conversation ID required')
      const { data, error } = await messagingApi.getMessages(conversationId, userProfile.id, filters)
      if (error) throw error
      return data || []
    },
    enabled: !!userProfile?.id && !!conversationId,
    staleTime: 10 * 1000, // 10 seconds - messages change very frequently
  })
}

/**
 * Infinite query for messages with cursor-based pagination
 */
export function useMessagesInfinite(conversationId: string | undefined) {
  const { userProfile } = useAuth()

  return useInfiniteQuery({
    queryKey: messagingKeys.messagesInfinite(conversationId || ''),
    queryFn: async ({ pageParam }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      if (!conversationId) throw new Error('Conversation ID required')

      const filters: MessageFilters = {
        conversation_id: conversationId,
        limit: 50,
        ...(pageParam ? { before_id: pageParam } : {}),
      }

      const { data, error } = await messagingApi.getMessages(conversationId, userProfile.id, filters)
      if (error) throw error
      return data || []
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Return the ID of the oldest message to load more
      if (lastPage.length < 50) return undefined
      return lastPage[lastPage.length - 1]?.id
    },
    enabled: !!userProfile?.id && !!conversationId,
    staleTime: 10 * 1000,
  })
}

/**
 * Send a new message
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (data: SendMessageDTO) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data: message, error } = await messagingApi.sendMessage(userProfile.id, data)
      if (error) throw error
      return message
    },
    onSuccess: (message) => {
      if (message) {
        // Update messages list
        queryClient.invalidateQueries({
          queryKey: messagingKeys.messagesList(message.conversation_id),
        })
        queryClient.invalidateQueries({
          queryKey: messagingKeys.messagesInfinite(message.conversation_id),
        })
        // Update conversations list (for last_message preview)
        queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() })
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`)
    },
  })
}

/**
 * Edit a message
 */
export function useEditMessage() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.editMessage(messageId, userProfile.id, content)
      if (error) throw error
      return data
    },
    onSuccess: (message) => {
      if (message) {
        queryClient.invalidateQueries({
          queryKey: messagingKeys.messagesList(message.conversation_id),
        })
        queryClient.invalidateQueries({
          queryKey: messagingKeys.messagesInfinite(message.conversation_id),
        })
      }
      toast.success('Message edited')
    },
    onError: (error: Error) => {
      toast.error(`Failed to edit message: ${error.message}`)
    },
  })
}

/**
 * Delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string
      conversationId: string
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.deleteMessage(messageId, userProfile.id)
      if (error) throw error
      return { success: data, conversationId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesList(result.conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesInfinite(result.conversationId),
      })
      toast.success('Message deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete message: ${error.message}`)
    },
  })
}

/**
 * Mark conversation as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.markAsRead(conversationId, userProfile.id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Update unread counts
      if (userProfile?.id) {
        queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount(userProfile.id) })
        queryClient.invalidateQueries({ queryKey: messagingKeys.totalUnread(userProfile.id) })
      }
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() })
    },
  })
}

// =====================================================
// PARTICIPANT HOOKS
// =====================================================

/**
 * Add participants to a conversation
 */
export function useAddParticipants() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      conversationId,
      participantIds,
    }: {
      conversationId: string
      participantIds: string[]
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.addParticipants(
        conversationId,
        userProfile.id,
        participantIds
      )
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(variables.conversationId) })
      toast.success('Participants added')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add participants: ${error.message}`)
    },
  })
}

/**
 * Remove a participant from a conversation
 */
export function useRemoveParticipant() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      conversationId,
      participantUserId,
    }: {
      conversationId: string
      participantUserId: string
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.removeParticipant(
        conversationId,
        userProfile.id,
        participantUserId
      )
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(variables.conversationId) })
      toast.success('Participant removed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove participant: ${error.message}`)
    },
  })
}

// =====================================================
// REACTION HOOKS
// =====================================================

/**
 * Add a reaction to a message
 */
export function useAddReaction() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      conversationId,
    }: {
      messageId: string
      emoji: string
      conversationId: string
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.addReaction(messageId, userProfile.id, emoji)
      if (error) throw error
      return { data, conversationId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesList(result.conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesInfinite(result.conversationId),
      })
    },
    onError: (error: Error) => {
      toast.error(`Failed to add reaction: ${error.message}`)
    },
  })
}

/**
 * Remove a reaction from a message
 */
export function useRemoveReaction() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string
      conversationId: string
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.removeReaction(messageId, userProfile.id)
      if (error) throw error
      return { data, conversationId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesList(result.conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: messagingKeys.messagesInfinite(result.conversationId),
      })
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove reaction: ${error.message}`)
    },
  })
}

// =====================================================
// SEARCH & UNREAD HOOKS
// =====================================================

/**
 * Search messages
 */
export function useSearchMessages(query: string, conversationId?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: messagingKeys.search(query),
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.searchMessages(userProfile.id, query, conversationId)
      if (error) throw error
      return data || []
    },
    enabled: !!userProfile?.id && query.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Get unread message count for a conversation
 */
export function useUnreadCount(conversationId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: [...messagingKeys.unreadCount(userProfile?.id || ''), conversationId],
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      if (!conversationId) throw new Error('Conversation ID required')
      const { data, error } = await messagingApi.getUnreadCount(conversationId, userProfile.id)
      if (error) throw error
      return data || 0
    },
    enabled: !!userProfile?.id && !!conversationId,
    staleTime: 30 * 1000,
  })
}

/**
 * Get total unread message count across all conversations
 */
export function useTotalUnreadCount() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: messagingKeys.totalUnread(userProfile?.id || ''),
    queryFn: async () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      const { data, error } = await messagingApi.getUnreadCount(userProfile.id)
      if (error) throw error
      return data || 0
    },
    enabled: !!userProfile?.id,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute for badge updates
  })
}

// =====================================================
// CONVENIENCE HOOKS
// =====================================================

/**
 * Get conversations by type
 */
export function useConversationsByType(type: ConversationType) {
  return useConversations({ type })
}

/**
 * Get project conversations
 */
export function useProjectConversations(projectId: string) {
  return useConversations({ project_id: projectId, type: 'project' })
}

/**
 * Get direct conversations
 */
export function useDirectConversations() {
  return useConversations({ type: 'direct' })
}

/**
 * Get group conversations
 */
export function useGroupConversations() {
  return useConversations({ type: 'group' })
}
