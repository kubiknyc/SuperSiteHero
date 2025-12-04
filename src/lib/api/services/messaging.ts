/**
 * Messaging System API Service
 *
 * Manages real-time messaging operations:
 * - Channels (direct, group, project) - mapped to chat_channels table
 * - Messages with attachments and mentions - mapped to chat_messages table
 * - Members and read receipts - mapped to chat_channel_members table
 * - Reactions - mapped to chat_message_reactions table
 *
 * NOTE: The frontend uses "Conversation" terminology but the database uses "Channel".
 * This service maps between the two naming conventions.
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
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
// TABLE/COLUMN MAPPING NOTES:
// Frontend Term     -> Database Column
// =====================================================
// conversations     -> chat_channels
// messages          -> chat_messages
// conversation_participants -> chat_channel_members
// message_reactions -> chat_message_reactions
// conversation_id   -> channel_id
// sender_id         -> user_id (in messages)
// mentioned_users   -> mentions
// type              -> channel_type
// deleted_at        -> archived_at (for channels)
// is_muted          -> notification_settings (JSON)
// role              -> role (same)
// =====================================================

// =====================================================
// CONVERSATION METHODS
// =====================================================

/**
 * Fetch conversations with optional filters and pagination
 * Maps from chat_channels table to Conversation type
 */
export async function getConversations(
  userId: string,
  filters?: ConversationFilters & { limit?: number; offset?: number }
): Promise<{ data: Conversation[] | null; error: Error | null }> {
  try {
    let query = db
      .from('chat_channels')
      .select(`
        *,
        participants:chat_channel_members(
          id,
          user_id,
          joined_at,
          last_read_at,
          notification_settings,
          role,
          user:users(id, full_name, email, avatar_url)
        )
      `)
      .is('archived_at', null)

    // Apply type filter (type -> channel_type)
    if (filters?.type) {
      query = query.eq('channel_type', filters.type)
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

    // Order by last activity (updated_at since no last_message_at column)
    query = query.order('updated_at', { ascending: false, nullsFirst: false })

    const { data, error } = await query

    if (error) {throw error}

    // Filter to only conversations where user is a participant
    // Note: chat_channel_members doesn't have left_at, so all members are active
    const userConversations = (data || []).filter((conv: any) =>
      conv.participants?.some(
        (p: any) => p.user_id === userId
      )
    )

    // Map database fields to Conversation type
    const mappedConversations = userConversations.map((conv: any) => ({
      ...conv,
      type: conv.channel_type, // Map channel_type -> type
      deleted_at: conv.archived_at, // Map archived_at -> deleted_at
      last_message_at: conv.updated_at, // Use updated_at as proxy for last_message_at
      participants: conv.participants?.map((p: any) => ({
        ...p,
        left_at: null, // chat_channel_members doesn't have left_at
        is_muted: p.notification_settings?.muted || false, // Extract from JSON
      })),
    }))

    // Apply unread filter client-side
    let filteredConversations = mappedConversations
    if (filters?.has_unread) {
      // Check if last_read_at is before updated_at
      filteredConversations = mappedConversations.filter((conv: any) => {
        const userParticipant = conv.participants?.find((p: any) => p.user_id === userId)
        if (!userParticipant?.last_read_at) return true // Never read = unread
        return new Date(userParticipant.last_read_at) < new Date(conv.updated_at)
      })
    }

    return { data: filteredConversations, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single conversation by ID
 * Maps from chat_channels table to Conversation type
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // First, verify user is a participant (member)
    const { data: participant } = await db
      .from('chat_channel_members')
      .select('id')
      .eq('channel_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!participant) {
      throw new Error('Not authorized to view this conversation')
    }

    // Fetch channel with details
    const { data, error } = await db
      .from('chat_channels')
      .select(`
        *,
        participants:chat_channel_members(
          id,
          user_id,
          joined_at,
          last_read_at,
          notification_settings,
          role,
          user:users(id, full_name, email, avatar_url)
        ),
        project:projects(id, name)
      `)
      .eq('id', conversationId)
      .is('archived_at', null)
      .single()

    if (error) {throw error}

    // Map database fields to Conversation type
    const mappedConversation = {
      ...data,
      type: data.channel_type,
      deleted_at: data.archived_at,
      last_message_at: data.updated_at,
      participants: data.participants?.map((p: any) => ({
        ...p,
        conversation_id: data.id, // Map channel_id -> conversation_id
        left_at: null,
        is_muted: p.notification_settings?.muted || false,
      })),
    }

    return { data: mappedConversation, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new conversation (channel)
 * Maps to chat_channels and chat_channel_members tables
 */
export async function createConversation(
  userId: string,
  data: CreateConversationDTO
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // Create channel
    const { data: channel, error: channelError } = await db
      .from('chat_channels')
      .insert({
        channel_type: data.type, // Map type -> channel_type
        name: data.name || null,
        project_id: data.project_id || null,
        created_by: userId,
      })
      .select()
      .single()

    if (channelError) {throw channelError}

    // Add creator as admin member
    const { error: creatorError } = await db
      .from('chat_channel_members')
      .insert({
        channel_id: channel.id, // Map conversation_id -> channel_id
        user_id: userId,
        role: 'admin',
      })

    if (creatorError) {throw creatorError}

    // Add other participants as members
    if (data.participant_ids && data.participant_ids.length > 0) {
      const memberRecords = data.participant_ids
        .filter((id) => id !== userId) // Don't duplicate creator
        .map((participantId) => ({
          channel_id: channel.id, // Map conversation_id -> channel_id
          user_id: participantId,
          role: 'member',
        }))

      if (memberRecords.length > 0) {
        const { error: membersError } = await db
          .from('chat_channel_members')
          .insert(memberRecords)

        if (membersError) {throw membersError}
      }
    }

    // Send initial message if provided
    if (data.initial_message) {
      await sendMessage(userId, {
        conversation_id: channel.id,
        content: data.initial_message,
        message_type: 'text',
      })
    }

    // Map to Conversation type
    const mappedConversation = {
      ...channel,
      type: channel.channel_type,
      deleted_at: channel.archived_at,
      last_message_at: channel.updated_at,
    }

    return { data: mappedConversation, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get or create a direct conversation between two users
 * Manually implemented since RPC function doesn't exist
 */
export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // Find existing direct channel between these two users
    // First, get all direct channels where user is a member
    const { data: userChannels } = await db
      .from('chat_channel_members')
      .select('channel_id')
      .eq('user_id', userId)

    if (userChannels && userChannels.length > 0) {
      const channelIds = userChannels.map((c: any) => c.channel_id)

      // Check if other user is also in any of these channels and it's a direct channel
      const { data: directChannel } = await db
        .from('chat_channels')
        .select(`
          *,
          members:chat_channel_members(user_id)
        `)
        .in('id', channelIds)
        .eq('channel_type', 'direct')
        .is('archived_at', null)

      // Find the channel that has exactly both users
      const existingChannel = directChannel?.find((channel: any) => {
        const memberIds = channel.members?.map((m: any) => m.user_id) || []
        return memberIds.length === 2 &&
               memberIds.includes(userId) &&
               memberIds.includes(otherUserId)
      })

      if (existingChannel) {
        // Return existing channel mapped to Conversation type
        return {
          data: {
            ...existingChannel,
            type: existingChannel.channel_type,
            deleted_at: existingChannel.archived_at,
            last_message_at: existingChannel.updated_at,
          },
          error: null,
        }
      }
    }

    // No existing channel found, create a new one
    return createConversation(userId, {
      type: 'direct',
      participant_ids: [userId, otherUserId],
    })
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update conversation details (name, description)
 * Maps to chat_channels table
 */
export async function updateConversation(
  conversationId: string,
  userId: string,
  updates: { name?: string; description?: string }
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // Verify user is a member
    const { data: member } = await db
      .from('chat_channel_members')
      .select('id')
      .eq('channel_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!member) {
      throw new Error('Not authorized to update this conversation')
    }

    const { data, error } = await db
      .from('chat_channels')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {throw error}

    // Map to Conversation type
    const mappedConversation = {
      ...data,
      type: data.channel_type,
      deleted_at: data.archived_at,
      last_message_at: data.updated_at,
    }

    return { data: mappedConversation, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Add participants (members) to a conversation (channel)
 * Maps to chat_channel_members table
 */
export async function addParticipants(
  conversationId: string,
  userId: string,
  participantUserIds: string[],
  role: 'admin' | 'member' = 'member'
): Promise<{ data: ConversationParticipant[] | null; error: Error | null }> {
  try {
    // Verify user is an admin member
    const { data: currentMember } = await db
      .from('chat_channel_members')
      .select('role')
      .eq('channel_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (!currentMember || currentMember.role !== 'admin') {
      throw new Error('Only admins can add participants')
    }

    // Get existing members to avoid duplicates
    const { data: existingMembers } = await db
      .from('chat_channel_members')
      .select('user_id')
      .eq('channel_id', conversationId)

    const existingUserIds = new Set(existingMembers?.map((p: any) => p.user_id) || [])

    // Filter out users who are already members
    const newMemberIds = participantUserIds.filter((id) => !existingUserIds.has(id))

    if (newMemberIds.length === 0) {
      return { data: [], error: null }
    }

    // Insert new members
    const memberRecords = newMemberIds.map((memberId) => ({
      channel_id: conversationId, // Map conversation_id -> channel_id
      user_id: memberId,
      role,
    }))

    const { data, error } = await db
      .from('chat_channel_members')
      .insert(memberRecords)
      .select()

    if (error) {throw error}

    // Map to ConversationParticipant type
    const mappedParticipants = (data || []).map((m: any) => ({
      ...m,
      conversation_id: m.channel_id,
      left_at: null,
      is_muted: m.notification_settings?.muted || false,
    }))

    return { data: mappedParticipants, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Remove a participant (member) from a conversation (admin only)
 * Maps to chat_channel_members table
 * Note: This does a hard delete since chat_channel_members has no left_at column
 */
export async function removeParticipant(
  conversationId: string,
  userId: string,
  participantUserId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Verify user is an admin
    const { data: currentMember } = await db
      .from('chat_channel_members')
      .select('role')
      .eq('channel_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (!currentMember || currentMember.role !== 'admin') {
      throw new Error('Only admins can remove participants')
    }

    // Don't allow removing self this way (use leaveConversation instead)
    if (participantUserId === userId) {
      throw new Error('Use leaveConversation to remove yourself')
    }

    // Delete the member record (hard delete)
    const { error } = await db
      .from('chat_channel_members')
      .delete()
      .eq('channel_id', conversationId)
      .eq('user_id', participantUserId)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Leave a conversation (user removes themselves)
 * Maps to chat_channel_members table
 * Note: This does a hard delete since chat_channel_members has no left_at column
 */
export async function leaveConversation(
  conversationId: string,
  userId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Delete the member record (hard delete)
    const { error } = await db
      .from('chat_channel_members')
      .delete()
      .eq('channel_id', conversationId)
      .eq('user_id', userId)

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
 * Maps from chat_messages and chat_message_reactions tables
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  filters?: MessageFilters
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    // Verify user is a member
    const { data: member } = await db
      .from('chat_channel_members')
      .select('id')
      .eq('channel_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!member) {
      throw new Error('Not authorized to view messages in this conversation')
    }

    let query = db
      .from('chat_messages')
      .select(`
        *,
        sender:users!chat_messages_user_id_fkey(id, full_name, email, avatar_url),
        reactions:chat_message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:users(id, full_name)
        )
      `)
      .eq('channel_id', conversationId)
      .is('deleted_at', null)

    // Apply filters
    if (filters?.before_id) {
      // Get messages before a specific message (for loading older messages)
      const { data: beforeMsg } = await db
        .from('chat_messages')
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
        .from('chat_messages')
        .select('created_at')
        .eq('id', filters.after_id)
        .single()

      if (afterMsg) {
        query = query.gt('created_at', afterMsg.created_at)
      }
    }

    if (filters?.sender_id) {
      // Map sender_id -> user_id
      query = query.eq('user_id', filters.sender_id)
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

    // Map database fields to Message type
    const mappedMessages = (data || []).map((msg: any) => ({
      ...msg,
      conversation_id: msg.channel_id, // Map channel_id -> conversation_id
      sender_id: msg.user_id, // Map user_id -> sender_id
      mentioned_users: msg.mentions, // Map mentions -> mentioned_users
    }))

    return { data: mappedMessages, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single message by ID
 * Maps from chat_messages table
 */
export async function getMessage(
  messageId: string,
  userId: string
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    const { data: message, error } = await db
      .from('chat_messages')
      .select(`
        *,
        sender:users!chat_messages_user_id_fkey(id, full_name, email, avatar_url),
        reactions:chat_message_reactions(
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

    // Verify user is a member of the channel
    const { data: member } = await db
      .from('chat_channel_members')
      .select('id')
      .eq('channel_id', message.channel_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!member) {
      throw new Error('Not authorized to view this message')
    }

    // Map database fields to Message type
    const mappedMessage = {
      ...message,
      conversation_id: message.channel_id,
      sender_id: message.user_id,
      mentioned_users: message.mentions,
    }

    return { data: mappedMessage, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Send a new message
 * Maps to chat_messages table
 */
export async function sendMessage(
  userId: string,
  data: SendMessageDTO
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    // Verify user is a member
    const { data: member } = await db
      .from('chat_channel_members')
      .select('id')
      .eq('channel_id', data.conversation_id) // conversation_id is actually channel_id
      .eq('user_id', userId)
      .maybeSingle()

    if (!member) {
      throw new Error('Not authorized to send messages in this conversation')
    }

    // Extract mentioned user IDs from content
    const mentionedUserIds = data.mentioned_users || extractMentionedUserIds(data.content)

    // Insert message with mapped column names
    const { data: message, error } = await db
      .from('chat_messages')
      .insert({
        channel_id: data.conversation_id, // Map conversation_id -> channel_id
        user_id: userId, // Map sender_id -> user_id
        content: data.content,
        message_type: data.message_type || 'text',
        attachments: data.attachments || null,
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : null, // Map mentioned_users -> mentions
        parent_message_id: data.parent_message_id || null,
      })
      .select(`
        *,
        sender:users!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {throw error}

    // Map database fields back to Message type
    const mappedMessage = {
      ...message,
      conversation_id: message.channel_id,
      sender_id: message.user_id,
      mentioned_users: message.mentions,
    }

    // Send mention notifications asynchronously (don't await)
    if (mentionedUserIds.length > 0) {
      // Get channel details for notification
      const { data: channel } = await db
        .from('chat_channels')
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
        conversationName: channel?.name || null,
        messagePreview: data.content,
      }).catch((error) => {
        logger.error('Failed to send mention notifications:', error)
      })
    }

    return { data: mappedMessage, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Edit a message (own messages only)
 * Maps to chat_messages table
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
      .from('chat_messages')
      .update({
        content,
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : null, // Map mentioned_users -> mentions
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('user_id', userId) // Map sender_id -> user_id
      .is('deleted_at', null)
      .select(`
        *,
        sender:users!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {throw error}

    // Map database fields back to Message type
    const mappedMessage = {
      ...data,
      conversation_id: data.channel_id,
      sender_id: data.user_id,
      mentioned_users: data.mentions,
    }

    return { data: mappedMessage, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a message (soft delete, own messages only)
 * Maps to chat_messages table
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await db
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', userId) // Map sender_id -> user_id
      .is('deleted_at', null)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Mark messages as read
 * Maps to chat_channel_members table
 * Note: chat_channel_members doesn't have has_unread column, only last_read_at
 */
export async function markAsRead(
  conversationId: string,
  userId: string,
  _messageIds?: string[] // Not used, but kept for API compatibility
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Update last_read_at for the member
    const { error } = await db
      .from('chat_channel_members')
      .update({
        last_read_at: new Date().toISOString(),
        // has_unread column doesn't exist in chat_channel_members
      })
      .eq('channel_id', conversationId) // Map conversation_id -> channel_id
      .eq('user_id', userId)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Search messages across conversations
 * Maps to chat_messages and chat_channels tables
 */
export async function searchMessages(
  userId: string,
  query: string,
  conversationId?: string
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    let messageQuery = db
      .from('chat_messages')
      .select(`
        *,
        sender:users!chat_messages_user_id_fkey(id, full_name, email, avatar_url),
        conversation:chat_channels(id, name, channel_type)
      `)
      .textSearch('content', query)
      .is('deleted_at', null)

    // Filter by specific channel if provided
    if (conversationId) {
      messageQuery = messageQuery.eq('channel_id', conversationId)
    } else {
      // Get user's channels
      const { data: userChannels } = await db
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', userId)

      const channelIds = userChannels?.map((p: any) => p.channel_id) || []

      if (channelIds.length > 0) {
        messageQuery = messageQuery.in('channel_id', channelIds)
      } else {
        return { data: [], error: null }
      }
    }

    const { data, error } = await messageQuery
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {throw error}

    // Map database fields to Message type
    const mappedMessages = (data || []).map((msg: any) => ({
      ...msg,
      conversation_id: msg.channel_id,
      sender_id: msg.user_id,
      mentioned_users: msg.mentions,
      conversation: msg.conversation ? {
        ...msg.conversation,
        type: msg.conversation.channel_type,
      } : null,
    }))

    return { data: mappedMessages, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

// =====================================================
// PARTICIPANT (MEMBER) METHODS
// =====================================================

/**
 * Get all participants (members) in a conversation (channel)
 * Maps to chat_channel_members table
 */
export async function getParticipants(
  conversationId: string,
  userId: string
): Promise<{ data: ConversationParticipant[] | null; error: Error | null }> {
  try {
    // Verify user is a member
    const { data: userMember } = await db
      .from('chat_channel_members')
      .select('id')
      .eq('channel_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!userMember) {
      throw new Error('Not authorized to view participants')
    }

    const { data, error } = await db
      .from('chat_channel_members')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('channel_id', conversationId)

    if (error) {throw error}

    // Map to ConversationParticipant type
    const mappedParticipants = (data || []).map((m: any) => ({
      ...m,
      conversation_id: m.channel_id,
      left_at: null,
      is_muted: m.notification_settings?.muted || false,
    }))

    return { data: mappedParticipants, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update participant (member) settings (notifications, last read, etc.)
 * Maps to chat_channel_members table
 */
export async function updateParticipant(
  conversationId: string,
  userId: string,
  updates: { is_muted?: boolean; last_read_at?: string }
): Promise<{ data: ConversationParticipant | null; error: Error | null }> {
  try {
    // Map is_muted to notification_settings JSON
    const dbUpdates: Record<string, any> = {}
    if (updates.last_read_at) {
      dbUpdates.last_read_at = updates.last_read_at
    }
    if (typeof updates.is_muted === 'boolean') {
      // Get current notification_settings and merge
      const { data: current } = await db
        .from('chat_channel_members')
        .select('notification_settings')
        .eq('channel_id', conversationId)
        .eq('user_id', userId)
        .single()

      dbUpdates.notification_settings = {
        ...(current?.notification_settings || {}),
        muted: updates.is_muted,
      }
    }

    const { data, error } = await db
      .from('chat_channel_members')
      .update(dbUpdates)
      .eq('channel_id', conversationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {throw error}

    // Map to ConversationParticipant type
    const mappedParticipant = {
      ...data,
      conversation_id: data.channel_id,
      left_at: null,
      is_muted: data.notification_settings?.muted || false,
    }

    return { data: mappedParticipant, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get unread message count for user
 * Manually implemented since RPC functions don't exist
 * Counts messages created after last_read_at for each channel
 */
export async function getUnreadCount(
  userId: string,
  conversationId?: string
): Promise<{ data: number; error: Error | null }> {
  try {
    if (conversationId) {
      // Get count for specific channel
      // First get the user's last_read_at for this channel
      const { data: membership } = await db
        .from('chat_channel_members')
        .select('last_read_at')
        .eq('channel_id', conversationId)
        .eq('user_id', userId)
        .single()

      if (!membership) {
        return { data: 0, error: null }
      }

      // Count messages after last_read_at (excluding own messages)
      let query = db
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', conversationId)
        .neq('user_id', userId) // Don't count own messages
        .is('deleted_at', null)

      if (membership.last_read_at) {
        query = query.gt('created_at', membership.last_read_at)
      }

      const { count, error } = await query

      if (error) {throw error}
      return { data: count || 0, error: null }
    } else {
      // Get total unread count across all channels
      // Get all user's channel memberships with last_read_at
      const { data: memberships } = await db
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', userId)

      if (!memberships || memberships.length === 0) {
        return { data: 0, error: null }
      }

      // For each channel, count unread messages
      let totalUnread = 0
      for (const membership of memberships) {
        let query = db
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', membership.channel_id)
          .neq('user_id', userId) // Don't count own messages
          .is('deleted_at', null)

        if (membership.last_read_at) {
          query = query.gt('created_at', membership.last_read_at)
        }

        const { count } = await query
        totalUnread += count || 0
      }

      return { data: totalUnread, error: null }
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
 * Maps to chat_message_reactions table
 */
export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<{ data: MessageReaction | null; error: Error | null }> {
  try {
    // Check if reaction already exists
    const { data: existingReaction } = await db
      .from('chat_message_reactions')
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
      .from('chat_message_reactions')
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
 * Maps to chat_message_reactions table
 */
export async function removeReaction(
  reactionId: string,
  userId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await db
      .from('chat_message_reactions')
      .delete()
      .eq('id', reactionId)
      .eq('user_id', userId)

    if (error) {throw error}

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}
