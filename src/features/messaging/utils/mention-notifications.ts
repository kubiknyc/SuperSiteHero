/**
 * Mention Notification Utilities
 *
 * Sends notifications when users are @mentioned in messages
 */

import { notificationService, type NotificationRecipient } from '@/lib/notifications/notification-service'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

export interface MentionNotificationData {
  messageId: string
  conversationId: string
  mentionedUserIds: string[]
  senderName: string
  senderId: string
  conversationName: string | null
  messagePreview: string
  projectName?: string
}

export interface EntityMentionNotificationData {
  entityType: 'rfi' | 'submittal' | 'change_order' | 'document' | 'task' | 'daily_report' | 'punch_item' | 'message' | 'general'
  entityId: string
  entityName: string
  entityNumber?: string
  projectId: string
  projectName: string
  mentionedUserIds: string[]
  senderName: string
  senderId: string
  commentText: string
  viewUrl: string
}

/**
 * Send notifications to all mentioned users in a message
 */
export async function sendMentionNotifications(data: MentionNotificationData): Promise<void> {
  const {
    conversationId,
    mentionedUserIds,
    senderName,
    senderId,
    conversationName,
    messagePreview,
    projectName,
  } = data

  // Don't notify if no one is mentioned
  if (mentionedUserIds.length === 0) {return}

  // Filter out the sender (don't notify yourself)
  const usersToNotify = mentionedUserIds.filter((id) => id !== senderId)

  if (usersToNotify.length === 0) {return}

  // Get user details for personalized notifications
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', usersToNotify)

  if (error) {
    logger.error('Failed to fetch mentioned users:', error)
    return
  }

  // Determine conversation display name
  const displayName = conversationName || 'Direct Message'

  // Build recipients list
  const recipients: NotificationRecipient[] = users.map(user => ({
    userId: user.id,
    email: user.email,
    name: user.full_name || undefined,
  }))

  // Send notification using the new comment mention service
  try {
    await notificationService.notifyCommentMention(recipients, {
      mentionedBy: senderName,
      entityType: 'message',
      entityName: displayName,
      projectName: projectName || 'Direct Message',
      commentText: messagePreview,
      commentedAt: new Date().toLocaleString(),
      viewUrl: `/messages/${conversationId}`,
    })
  } catch (err) {
    logger.error('Failed to send mention notifications:', err)
  }
}

/**
 * Send notifications to all mentioned users in an entity comment (RFI, Submittal, etc.)
 */
export async function sendEntityMentionNotifications(data: EntityMentionNotificationData): Promise<void> {
  const {
    entityType,
    entityName,
    entityNumber,
    projectName,
    mentionedUserIds,
    senderName,
    senderId,
    commentText,
    viewUrl,
  } = data

  // Don't notify if no one is mentioned
  if (mentionedUserIds.length === 0) {return}

  // Filter out the sender (don't notify yourself)
  const usersToNotify = mentionedUserIds.filter((id) => id !== senderId)

  if (usersToNotify.length === 0) {return}

  // Get user details for personalized notifications
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', usersToNotify)

  if (error) {
    logger.error('Failed to fetch mentioned users:', error)
    return
  }

  // Build recipients list
  const recipients: NotificationRecipient[] = users.map(user => ({
    userId: user.id,
    email: user.email,
    name: user.full_name || undefined,
  }))

  // Send notification using the comment mention service
  try {
    await notificationService.notifyCommentMention(recipients, {
      mentionedBy: senderName,
      entityType,
      entityName,
      entityNumber,
      projectName,
      commentText,
      commentedAt: new Date().toLocaleString(),
      viewUrl,
    })
  } catch (err) {
    logger.error('Failed to send entity mention notifications:', err)
  }
}

/**
 * Extract user IDs from @mention tags in message content
 * Format: @[UserName](userId)
 */
export function extractMentionedUserIds(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const matches = Array.from(content.matchAll(mentionRegex))
  return matches.map((match) => match[2])
}
