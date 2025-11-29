/**
 * Messaging System Types
 *
 * TypeScript types for real-time in-app messaging:
 * - Conversations (direct, group, project)
 * - Messages with attachments and mentions
 * - Participants and read receipts
 * - Reactions
 */

// =====================================================
// ENUMS
// =====================================================

export type ConversationType = 'direct' | 'group' | 'project'
export type MessageType = 'text' | 'file' | 'system'

// =====================================================
// CORE INTERFACES
// =====================================================

export interface Conversation {
  id: string
  type: ConversationType
  name: string | null
  project_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  last_message_at: string | null
  deleted_at: string | null
  // Populated relations
  participants?: ConversationParticipant[]
  last_message?: Message | null
  unread_count?: number
  project?: {
    id: string
    name: string
  }
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  left_at: string | null
  last_read_at: string | null
  is_muted: boolean
  role: 'admin' | 'member'
  // Populated relations
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: MessageType
  attachments: MessageAttachment[] | null
  mentioned_users: string[] | null
  parent_message_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  edited_at: string | null
  // Populated relations
  sender?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  parent_message?: Message
  reactions?: MessageReaction[]
}

export interface MessageAttachment {
  url: string
  name: string
  type: string // MIME type
  size: number
  path?: string // Storage path for deletion
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  // Populated relations
  user?: {
    id: string
    full_name: string
  }
}

// =====================================================
// DTOs (Data Transfer Objects)
// =====================================================

export interface CreateConversationDTO {
  type: ConversationType
  name?: string
  participant_ids: string[]
  project_id?: string
  initial_message?: string
}

export interface UpdateConversationDTO {
  name?: string
  is_archived?: boolean
}

export interface SendMessageDTO {
  conversation_id: string
  content: string
  message_type?: MessageType
  attachments?: MessageAttachment[]
  mentioned_users?: string[]
  parent_message_id?: string
}

export interface EditMessageDTO {
  content: string
}

// =====================================================
// FILTERS
// =====================================================

export interface ConversationFilters {
  type?: ConversationType
  project_id?: string
  participant_id?: string
  has_unread?: boolean
  search?: string
}

export interface MessageFilters {
  conversation_id: string
  sender_id?: string
  before_id?: string // For pagination (cursor)
  after_id?: string // For loading newer messages
  limit?: number
  parent_message_id?: string // For threading
}

// =====================================================
// VIEW MODELS (for UI)
// =====================================================

export interface ConversationWithDetails extends Conversation {
  participants: ConversationParticipant[]
  last_message: Message | null
  unread_count: number
  is_typing?: string[] // User IDs currently typing
}

export interface MessageWithDetails extends Message {
  sender: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  reactions: MessageReaction[]
  reply_count?: number
}

// =====================================================
// REAL-TIME EVENTS
// =====================================================

export interface TypingIndicatorEvent {
  conversation_id: string
  user_id: string
  user_name: string
  is_typing: boolean
}

export interface MessageEvent {
  type: 'new' | 'updated' | 'deleted'
  message: Message
}

export interface ConversationEvent {
  type: 'new' | 'updated' | 'deleted'
  conversation: Conversation
}

export interface PresenceEvent {
  user_id: string
  status: 'online' | 'offline' | 'away'
  last_seen?: string
}

// =====================================================
// PAGINATION
// =====================================================

export interface MessagePage {
  messages: Message[]
  has_more: boolean
  next_cursor?: string
  prev_cursor?: string
}

export interface ConversationPage {
  conversations: Conversation[]
  has_more: boolean
  next_cursor?: string
}

// =====================================================
// SEARCH
// =====================================================

export interface MessageSearchResult {
  message: Message
  conversation: Conversation
  highlighted_content: string
  match_score: number
}

export interface MessageSearchFilters {
  query: string
  conversation_id?: string
  sender_id?: string
  date_from?: string
  date_to?: string
  limit?: number
}

// =====================================================
// STATISTICS
// =====================================================

export interface MessagingStats {
  total_conversations: number
  total_messages_sent: number
  total_messages_received: number
  unread_count: number
  active_conversations_count: number
}

export interface ConversationStats {
  message_count: number
  participant_count: number
  unread_count: number
  last_activity: string | null
}

// =====================================================
// UI CONFIGURATION
// =====================================================

export const CONVERSATION_TYPE_CONFIG = {
  direct: {
    label: 'Direct Message',
    icon: 'User',
    description: 'Private conversation between two people',
    color: 'blue',
  },
  group: {
    label: 'Group Chat',
    icon: 'Users',
    description: 'Group conversation with multiple participants',
    color: 'green',
  },
  project: {
    label: 'Project Chat',
    icon: 'Building',
    description: 'Conversation linked to a project',
    color: 'purple',
  },
} as const

export const MESSAGE_TYPE_CONFIG = {
  text: {
    label: 'Text Message',
    icon: 'MessageSquare',
  },
  file: {
    label: 'File Attachment',
    icon: 'Paperclip',
  },
  system: {
    label: 'System Message',
    icon: 'Info',
  },
} as const

// =====================================================
// NOTIFICATION SETTINGS
// =====================================================

export interface NotificationPreferences {
  conversation_id: string
  user_id: string
  is_muted: boolean
  notify_mentions_only: boolean
  notify_on_email: boolean
}

// =====================================================
// MENTION HELPERS
// =====================================================

export interface MentionData {
  user_id: string
  user_name: string
  display_text: string
  start_index: number
  end_index: number
}

/**
 * Parse @mentions from message content
 * Format: @[UserName](userId)
 */
export function parseMentions(content: string): MentionData[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const mentions: MentionData[] = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      user_name: match[1],
      user_id: match[2],
      display_text: match[0],
      start_index: match.index,
      end_index: match.index + match[0].length,
    })
  }

  return mentions
}

/**
 * Extract user IDs from @mentions
 */
export function extractMentionedUserIds(content: string): string[] {
  const mentions = parseMentions(content)
  return mentions.map((m) => m.user_id)
}

/**
 * Format content with @mentions for display
 * Converts @[Name](userId) to HTML with highlighting
 */
export function formatMentionsForDisplay(content: string): string {
  return content.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    '<span class="mention">@$1</span>'
  )
}

/**
 * Create mention markup for insertion
 */
export function createMention(userId: string, userName: string): string {
  return `@[${userName}](${userId})`
}

// =====================================================
// TIME HELPERS
// =====================================================

/**
 * Format timestamp for message display
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {return 'Just now'}
  if (diffMins < 60) {return `${diffMins}m ago`}
  if (diffHours < 24) {return `${diffHours}h ago`}
  if (diffDays < 7) {return `${diffDays}d ago`}

  return date.toLocaleDateString()
}

/**
 * Check if message is recent (within last 24 hours)
 */
export function isRecentMessage(timestamp: string): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / 3600000
  return diffHours < 24
}

// =====================================================
// VALIDATION
// =====================================================

export function isValidMessageContent(content: string): boolean {
  return content.trim().length > 0 && content.length <= 10000
}

export function isValidConversationName(name: string | null, type: ConversationType): boolean {
  if (type === 'direct') {return name === null}
  return name !== null && name.trim().length > 0 && name.length <= 100
}

export function isValidAttachment(attachment: MessageAttachment): boolean {
  return (
    attachment.url.length > 0 &&
    attachment.name.length > 0 &&
    attachment.size > 0 &&
    attachment.size <= 50 * 1024 * 1024 // 50MB max
  )
}
