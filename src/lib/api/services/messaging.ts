/**
 * Messaging System API Service
 *
 * Manages real-time messaging operations:
 * - Conversations (direct, group, project)
 * - Messages with attachments and mentions
 * - Participants and read receipts
 * - Reactions
 */

import { supabase } from '@/lib/supabase'
import type {
  Conversation,
  Message,
  ConversationParticipant,
  MessageReaction,
  CreateConversationDTO,
  SendMessageDTO,
  ConversationFilters,
  MessageFilters,
  ConversationType,
} from '@/types/messaging'
import { extractMentionedUserIds } from '@/types/messaging'
import { sendMentionNotifications } from '@/features/messaging/utils/mention-notifications'

// Using extended Database types for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// =====================================================
// CONVERSATION METHODS
// =====================================================

/**
 * Fetch conversations with optional filters and pagination
 */
export async function getConversations(
  userId: string,
  filters?: ConversationFilters & { limit?: number; offset?: number }
): Promise<{ data: Conversation[] | null; error: Error | null }> {
  try {
    let query = db
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          id,
          user_id,
          joined_at,
          left_at,
          last_read_at,
          is_muted,
          user:users(id, full_name, email, avatar_url)
        )
      `)
      .is('deleted_at', null)

    // Apply type filter
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    // Apply project filter
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    // Apply search filter (name search)
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    // Apply pagination
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    // Order by last activity
    query = query.order('last_message_at', { ascending: false, nullsFirst: false })

    const { data, error } = await query

    if (error) {throw error}

    // Filter to only conversations where user is a participant
    const userConversations = (data || []).filter((conv: Conversation) =>
      conv.participants?.some(
        (p) => p.user_id === userId && p.left_at === null
      )
    )

    // Apply unread filter client-side (could also be done with RPC)
    let filteredConversations = userConversations
    if (filters?.has_unread) {
      // This would need additional logic to check unread status
      // For now, returning all conversations
      filteredConversations = userConversations
    }

    return { data: filteredConversations, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // First, verify user is a participant
    const { data: participant } = await db
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle()

    if (!participant) {
      throw new Error('Not authorized to view this conversation')
    }

    // Fetch conversation with details
    const { data, error } = await db
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          id,
          user_id,
          joined_at,
          left_at,
          last_read_at,
          is_muted,
          user:users(id, full_name, email, avatar_url)
        ),
        project:projects(id, name)
      `)
      .eq('id', conversationId)
      .is('deleted_at', null)
      .single()

    if (error) {throw error}

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  data: CreateConversationDTO
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // Create conversation
    const { data: conversation, error: convError } = await db
      .from('conversations')
      .insert({
        type: data.type,
        name: data.name || null,
        project_id: data.project_id || null,
        created_by: userId,
      })
      .select()
      .single()

    if (convError) {throw convError}

    // Add creator as admin participant
    const { error: creatorError } = await db
      .from('conversation_participants')
      .insert({
        conversation_id: conversation.id,
        user_id: userId,
        role: 'admin',
      })

    if (creatorError) {throw creatorError}

    // Add other participants as members
    if (data.participant_ids && data.participant_ids.length > 0) {
      const participantRecords = data.participant_ids
        .filter((id) => id !== userId) // Don't duplicate creator
        .map((participantId) => ({
          conversation_id: conversation.id,
          user_id: participantId,
          role: 'member',
        }))

      if (participantRecords.length > 0) {
        const { error: participantsError } = await db
          .from('conversation_participants')
          .insert(participantRecords)

        if (participantsError) {throw participantsError}
      }
    }

    // Send initial message if provided
    if (data.initial_message) {
      await sendMessage(userId, {
        conversation_id: conversation.id,
        content: data.initial_message,
        message_type: 'text',
      })
    }

    return { data: conversation, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get or create a direct conversation between two users
 */
export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    const { data, error } = await db.rpc('get_or_create_direct_conversation', {
      p_user_id_1: userId,
      p_user_id_2: otherUserId,
    })

    if (error) {throw error}

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update conversation details (name, avatar)
 */
export async function updateConversation(
  conversationId: string,
  userId: string,
  updates: { name?: string; avatar_url?: string }
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // Verify user is a participant
    const { data: participant } = await db
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle()

    if (!participant) {
      throw new Error('Not authorized to update this conversation')
    }

    const { data, error } = await db
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {throw error}

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Add participants to a conversation
 */
export async function addParticipants(
  conversationId: string,
  userId: string,
  participantUserIds: string[],
  role: 'admin' | 'member' = 'member'
): Promise<{ data: ConversationParticipant[] | null; error: Error | null }> {
  try {
    // Verify user is an admin participant
    const { data: currentParticipant } = await db
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single()

    if (!currentParticipant || currentParticipant.role !== 'admin') {
      throw new Error('Only admins can add participants')
    }

    // Get existing participants to avoid duplicates
    const { data: existingParticipants } = await db
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .is('left_at', null)

    const existingUserIds = new Set(existingParticipants?.map((p: any) => p.user_id) || [])

    // Filter out users who are already participants
    const newParticipantIds = participantUserIds.filter((id) => !existingUserIds.has(id))

    if (newParticipantIds.length === 0) {
      return { data: [], error: null }
    }

    // Insert new participants
    const participantRecords = newParticipantIds.map((participantId) => ({
      conversation_id: conversationId,
      user_id: participantId,
      role,
    }))

    const { data, error } = await db
      .from('conversation_participants')
      .insert(participantRecords)
      .select()

    if (error) {throw error}

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Remove a participant from a conversation (admin only)
 */
export async function removeParticipant(
  conversationId: string,
  userId: string,
  participantUserId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Verify user is an admin
    const { data: currentParticipant } = await db
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single()

    if (!currentParticipant || currentParticipant.role !== 'admin') {
      throw new Error('Only admins can remove participants')
    }

    // Don't allow removing self this way (use leaveConversation instead)
    if (participantUserId === userId) {
      throw new Error('Use leaveConversation to remove yourself')
    }

    // Set left_at timestamp
    const { error } = await db
      .from('conversation_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', participantUserId)
      .is('left_at', null)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Leave a conversation (user removes themselves)
 */
export async function leaveConversation(
  conversationId: string,
  userId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await db
      .from('conversation_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

// =====================================================
// MESSAGE METHODS
// =====================================================

/**
 * Fetch messages for a conversation with pagination
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  filters?: MessageFilters
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    // Verify user is a participant
    const { data: participant } = await db
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle()

    if (!participant) {
      throw new Error('Not authorized to view messages in this conversation')
    }

    let query = db
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, avatar_url),
        reactions:message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:users(id, full_name)
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)

    // Apply filters
    if (filters?.before_id) {
      // Get messages before a specific message (for loading older messages)
      const { data: beforeMsg } = await db
        .from('messages')
        .select('created_at')
        .eq('id', filters.before_id)
        .single()

      if (beforeMsg) {
        query = query.lt('created_at', beforeMsg.created_at)
      }
    }

    if (filters?.after_id) {
      // Get messages after a specific message (for loading newer messages)
      const { data: afterMsg } = await db
        .from('messages')
        .select('created_at')
        .eq('id', filters.after_id)
        .single()

      if (afterMsg) {
        query = query.gt('created_at', afterMsg.created_at)
      }
    }

    if (filters?.sender_id) {
      query = query.eq('sender_id', filters.sender_id)
    }

    if (filters?.parent_message_id) {
      query = query.eq('parent_message_id', filters.parent_message_id)
    }

    // Pagination
    const limit = filters?.limit || 50
    query = query.limit(limit)

    // Order: newest first if loading before, oldest first if loading after
    const orderAscending = !!filters?.after_id
    query = query.order('created_at', { ascending: orderAscending })

    const { data, error } = await query

    if (error) {throw error}

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single message by ID
 */
export async function getMessage(
  messageId: string,
  userId: string
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    const { data: message, error } = await db
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, avatar_url),
        reactions:message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:users(id, full_name)
        )
      `)
      .eq('id', messageId)
      .is('deleted_at', null)
      .single()

    if (error) {throw error}

    // Verify user is a participant of the conversation
    const { data: participant } = await db
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle()

    if (!participant) {
      throw new Error('Not authorized to view this message')
    }

    return { data: message, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Send a new message
 */
export async function sendMessage(
  userId: string,
  data: SendMessageDTO
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    // Verify user is a participant
    const { data: participant } = await db
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', data.conversation_id)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle()

    if (!participant) {
      throw new Error('Not authorized to send messages in this conversation')
    }

    // Extract mentioned user IDs from content
    const mentionedUserIds = data.mentioned_users || extractMentionedUserIds(data.content)

    // Insert message
    const { data: message, error } = await db
      .from('messages')
      .insert({
        conversation_id: data.conversation_id,
        sender_id: userId,
        content: data.content,
        message_type: data.message_type || 'text',
        attachments: data.attachments || null,
        mentioned_users: mentionedUserIds.length > 0 ? mentionedUserIds : null,
        parent_message_id: data.parent_message_id || null,
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {throw error}

    // Send mention notifications asynchronously (don't await)
    if (mentionedUserIds.length > 0) {
      // Get conversation details for notification
      const { data: conversation } = await db
        .from('conversations')
        .select('name')
        .eq('id', data.conversation_id)
        .single()

      // Send notifications (fire and forget)
      sendMentionNotifications({
        messageId: message.id,
        conversationId: data.conversation_id,
        mentionedUserIds,
        senderName: message.sender?.full_name || 'Someone',
        senderId: userId,
        conversationName: conversation?.name || null,
        messagePreview: data.content,
      }).catch((error) => {
        console.error('Failed to send mention notifications:', error)
      })
    }

    return { data: message, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Edit a message (own messages only)
 */
export async function editMessage(
  messageId: string,
  userId: string,
  content: string
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    // Extract mentioned user IDs from new content
    const mentionedUserIds = extractMentionedUserIds(content)

    // Update message (RLS will ensure user owns it)
    const { data, error } = await db
      .from('messages')
      .update({
        content,
        mentioned_users: mentionedUserIds.length > 0 ? mentionedUserIds : null,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .is('deleted_at', null)
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {throw error}

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a message (soft delete, own messages only)
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await db
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .is('deleted_at', null)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Mark messages as read
 */
export async function markAsRead(
  conversationId: string,
  userId: string,
  messageIds?: string[]
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Update last_read_at for the participant
    const { error } = await db
      .from('conversation_participants')
      .update({
        last_read_at: new Date().toISOString(),
        has_unread: false,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Search messages across conversations
 */
export async function searchMessages(
  userId: string,
  query: string,
  conversationId?: string
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    let messageQuery = db
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, avatar_url),
        conversation:conversations(id, name, type)
      `)
      .textSearch('content', query)
      .is('deleted_at', null)

    // Filter by specific conversation if provided
    if (conversationId) {
      messageQuery = messageQuery.eq('conversation_id', conversationId)
    } else {
      // Get user's conversations
      const { data: userConversations } = await db
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .is('left_at', null)

      const conversationIds = userConversations?.map((p: any) => p.conversation_id) || []

      if (conversationIds.length > 0) {
        messageQuery = messageQuery.in('conversation_id', conversationIds)
      } else {
        return { data: [], error: null }
      }
    }

    const { data, error } = await messageQuery
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {throw error}

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

// =====================================================
// PARTICIPANT METHODS
// =====================================================

/**
 * Get all participants in a conversation
 */
export async function getParticipants(
  conversationId: string,
  userId: string
): Promise<{ data: ConversationParticipant[] | null; error: Error | null }> {
  try {
    // Verify user is a participant
    const { data: userParticipant } = await db
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle()

    if (!userParticipant) {
      throw new Error('Not authorized to view participants')
    }

    const { data, error } = await db
      .from('conversation_participants')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .is('left_at', null)

    if (error) {throw error}

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update participant settings (notifications, last read, etc.)
 */
export async function updateParticipant(
  conversationId: string,
  userId: string,
  updates: { is_muted?: boolean; last_read_at?: string }
): Promise<{ data: ConversationParticipant | null; error: Error | null }> {
  try {
    const { data, error } = await db
      .from('conversation_participants')
      .update(updates)
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .select()
      .single()

    if (error) {throw error}

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get unread message count for user
 */
export async function getUnreadCount(
  userId: string,
  conversationId?: string
): Promise<{ data: number; error: Error | null }> {
  try {
    if (conversationId) {
      // Get count for specific conversation
      const { data, error } = await db.rpc('get_unread_message_count', {
        p_user_id: userId,
        p_conversation_id: conversationId,
      })

      if (error) {throw error}
      return { data: data || 0, error: null }
    } else {
      // Get total unread count across all conversations
      const { data, error } = await db.rpc('get_total_unread_count', {
        p_user_id: userId,
      })

      if (error) {throw error}
      return { data: data || 0, error: null }
    }
  } catch (error) {
    return { data: 0, error: error as Error }
  }
}

// =====================================================
// REACTION METHODS
// =====================================================

/**
 * Add a reaction to a message
 */
export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<{ data: MessageReaction | null; error: Error | null }> {
  try {
    // Check if reaction already exists
    const { data: existingReaction } = await db
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existingReaction) {
      return { data: existingReaction, error: null }
    }

    // Insert new reaction
    const { data, error } = await db
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      })
      .select(`
        *,
        user:users(id, full_name)
      `)
      .single()

    if (error) {throw error}

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(
  reactionId: string,
  userId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await db
      .from('message_reactions')
      .delete()
      .eq('id', reactionId)
      .eq('user_id', userId)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}
