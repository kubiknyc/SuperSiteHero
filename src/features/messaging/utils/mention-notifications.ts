/**
 * Mention Notification Utilities
 *
 * Sends notifications when users are @mentioned in messages
 */

import { sendNotification } from '@/lib/notifications/notification-service'
import { supabase } from '@/lib/supabase'

export interface MentionNotificationData {
  messageId: string
  conversationId: string
  mentionedUserIds: string[]
  senderName: string
  senderId: string
  conversationName: string | null
  messagePreview: string
}

/**
 * Send notifications to all mentioned users
 */
export async function sendMentionNotifications(data: MentionNotificationData): Promise<void> {
  const {
    messageId,
    conversationId,
    mentionedUserIds,
    senderName,
    senderId,
    conversationName,
    messagePreview,
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
    console.error('Failed to fetch mentioned users:', error)
    return
  }

  // Determine conversation display name
  const displayName = conversationName || 'Direct Message'

  // Truncate message preview to 100 characters
  const preview = messagePreview.length > 100
    ? `${messagePreview.substring(0, 100)}...`
    : messagePreview

  // Send notification to each mentioned user
  const notificationPromises = users.map(async (user) => {
    try {
      await sendNotification({
        user_id: user.id,
        type: 'mention',
        title: `${senderName} mentioned you`,
        message: `In ${displayName}: ${preview}`,
        link: `/messages/${conversationId}`,
        data: {
          message_id: messageId,
          conversation_id: conversationId,
          sender_id: senderId,
        },
      })
    } catch (error) {
      console.error(`Failed to send mention notification to ${user.full_name}:`, error)
    }
  })

  // Send all notifications in parallel
  await Promise.allSettled(notificationPromises)
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
