/**
 * Chat/Messaging System Type Definitions
 *
 * Types for the existing messaging system (conversations, messages, etc.)
 * Updated to match migrations 029 and 039
 */

import type { Database } from './database';

export type UserProfile = Database['public']['Tables']['users']['Row'];

/**
 * Conversation (Chat Channel)
 * Supports: direct messages, group chats, project discussions, company-wide #general
 */
export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project' | 'general';
  name?: string; // Required for group/project/general, null for direct
  project_id?: string; // Required for project type
  company_id?: string; // For company-wide conversations (e.g., #general)
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  deleted_at?: string;
  metadata?: {
    system_channel?: boolean; // Auto-created system channel
    auto_created?: boolean; // Created automatically by triggers
    deletable?: boolean; // Can be deleted by users
    [key: string]: any;
  };

  // Joined/computed data (not in database)
  unread_count?: number;
  last_message?: Message;
  participants?: ConversationParticipant[];
  other_user?: UserProfile; // For direct messages - the other participant
}

/**
 * Conversation Participant
 * Users who are members of a conversation
 */
export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at?: string; // If user left the conversation
  last_read_at?: string; // Last time user read messages in this conversation
  is_muted: boolean; // User muted notifications for this conversation

  // Joined data
  user?: UserProfile;
}

/**
 * Message
 * Individual message in a conversation
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  attachments?: MessageAttachment[]; // JSONB field
  mentioned_users?: string[]; // Array of user IDs mentioned with @
  parent_message_id?: string; // For threaded replies
  created_at: string;
  updated_at: string;
  deleted_at?: string; // Soft delete
  edited_at?: string; // When message was last edited

  // Joined/computed data
  sender?: UserProfile;
  reactions?: MessageReaction[];
  read_receipts?: MessageReadReceipt[];
  reply_count?: number; // Number of threaded replies
  replies?: Message[]; // When viewing thread
  parent_message?: Message; // When message is a reply
}

/**
 * Message Attachment
 * File or image attached to a message
 */
export interface MessageAttachment {
  id: string;
  type: 'image' | 'document' | 'file';
  name: string;
  url: string;
  size: number; // In bytes (max 50MB from migration 037)
  mime_type: string;
  thumbnail_url?: string; // For images
  width?: number; // For images
  height?: number; // For images
}

/**
 * Message Reaction
 * Emoji reaction to a message
 */
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string; // Emoji character (e.g., '👍', '❤️')
  created_at: string;

  // Joined data
  user?: UserProfile;
}

/**
 * Typing Indicator
 * Real-time indication of who's typing
 */
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  typing_at: string;

  // Joined data
  user?: UserProfile;
}

/**
 * Message Read Receipt
 * Track when each user read each message
 */
export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;

  // Joined data
  user?: UserProfile;
}

/**
 * Message Search Result
 * Result from full-text message search
 */
export interface MessageSearchResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  rank: number; // Search relevance score

  // Additional context
  conversation?: Conversation;
  sender?: UserProfile;
  match_context?: string; // Snippet showing the match
}

/**
 * Message Search Parameters
 * Query parameters for searching messages
 */
export interface MessageSearchParams {
  query: string; // Search query
  conversation_id?: string; // Optional: search within specific conversation
  date_from?: string;
  date_to?: string;
}

/**
 * Conversation Groups
 * Conversations grouped by type for UI display
 */
export interface ConversationGroups {
  general: Conversation[]; // #general conversation
  projects: Conversation[]; // Project-specific conversations
  groups: Conversation[]; // User-created group chats
  directMessages: Conversation[]; // 1-on-1 DMs
}

/**
 * New Message Input
 * Data for creating a new message
 */
export interface NewMessageInput {
  conversation_id: string;
  content: string;
  parent_message_id?: string; // For threaded replies
  attachments?: File[]; // Files to upload
  mentioned_users?: string[]; // User IDs to mention
}

/**
 * New Conversation Input
 * Data for creating a new conversation
 */
export interface NewConversationInput {
  type: 'group' | 'direct'; // Only allow creating group or direct (project/general are auto-created)
  name?: string; // Required for group, omit for direct
  participant_ids: string[]; // Initial participants (for group: multiple, for direct: exactly 1 other user)
  company_id: string;
}

/**
 * Conversation Update Input
 * Data for updating conversation settings
 */
export interface ConversationUpdateInput {
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Participant Settings Update
 * Update user's settings for a conversation
 */
export interface ParticipantSettingsUpdate {
  is_muted?: boolean;
  last_read_at?: string;
}

/**
 * Unread Counts
 * Summary of unread messages across conversations
 */
export interface UnreadCounts {
  total: number;
  by_conversation: Record<string, number>; // conversation_id -> count
  direct_messages: number;
  project_conversations: number;
  group_conversations: number;
}
