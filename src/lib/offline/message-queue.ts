/**
 * Message Queue for Offline Messaging
 *
 * Manages queued messages when offline:
 * - Queue messages when offline
 * - Process queue when online
 * - Retry failed messages with exponential backoff
 * - Sync attachments separately
 */

import { v4 as uuidv4 } from 'uuid'
import { getDatabase, STORES, getByIndex, putInStore, deleteFromStore } from './indexeddb'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type { SendMessageDTO, MessageAttachment } from '@/types/messaging'

// Using extended Database types for tables not yet in generated types
const db = supabase as any

// Message queue item stored in IndexedDB
export interface QueuedMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'voice'
  attachments?: MessageAttachment[]
  mentioned_users?: string[]
  parent_message_id?: string | null
  timestamp: number
  status: 'pending' | 'processing' | 'failed' | 'sent'
  retryCount: number
  error?: string
  lastAttempt?: number
}

// Queue configuration
const MAX_RETRIES = 5
const BASE_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 60000 // 1 minute

// Store name for message queue (using existing syncQueue store)
const MESSAGE_QUEUE_STORE = STORES.SYNC_QUEUE

/**
 * Add a message to the offline queue
 */
export async function queueMessage(
  senderId: string,
  data: SendMessageDTO
): Promise<QueuedMessage> {
  const queuedMessage: QueuedMessage = {
    id: uuidv4(),
    conversation_id: data.conversation_id,
    sender_id: senderId,
    content: data.content,
    message_type: (data.message_type || 'text') as QueuedMessage['message_type'],
    attachments: data.attachments,
    mentioned_users: data.mentioned_users,
    parent_message_id: data.parent_message_id,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  }

  await putInStore(MESSAGE_QUEUE_STORE, {
    ...queuedMessage,
    // Add fields expected by QueuedMutation type
    table: 'messages',
    operation: 'INSERT',
    data: queuedMessage,
    priority: 'high',
  })

  logger.log(`Message queued: ${queuedMessage.id}`)
  return queuedMessage
}

/**
 * Get all pending messages in the queue
 */
export async function getPendingMessages(): Promise<QueuedMessage[]> {
  const allItems = await getByIndex<any>(MESSAGE_QUEUE_STORE, 'status', 'pending')
  return allItems
    .filter((item) => item.table === 'messages')
    .map((item) => item.data || item)
}

/**
 * Get all messages in the queue (any status)
 */
export async function getAllQueuedMessages(): Promise<QueuedMessage[]> {
  const db = await getDatabase()
  const allItems = await db.getAll(MESSAGE_QUEUE_STORE as any)
  return allItems
    .filter((item: any) => item.table === 'messages')
    .map((item: any) => item.data || item)
}

/**
 * Get messages for a specific conversation
 */
export async function getQueuedMessagesForConversation(
  conversationId: string
): Promise<QueuedMessage[]> {
  const allMessages = await getAllQueuedMessages()
  return allMessages.filter((m) => m.conversation_id === conversationId)
}

/**
 * Update message status in queue
 */
export async function updateMessageStatus(
  messageId: string,
  status: QueuedMessage['status'],
  error?: string
): Promise<void> {
  const db = await getDatabase()
  const item = await db.get(MESSAGE_QUEUE_STORE as any, messageId)

  if (item) {
    const updatedItem = {
      ...item,
      status,
      error,
      lastAttempt: Date.now(),
      data: {
        ...((item as any).data || {}),
        status,
        error,
        lastAttempt: Date.now(),
      },
    }
    await putInStore(MESSAGE_QUEUE_STORE, updatedItem)
    logger.log(`Message ${messageId} status updated to: ${status}`)
  }
}

/**
 * Remove a message from the queue
 */
export async function removeFromQueue(messageId: string): Promise<void> {
  await deleteFromStore(MESSAGE_QUEUE_STORE, messageId)
  logger.log(`Message ${messageId} removed from queue`)
}

/**
 * Increment retry count for a message
 */
export async function incrementRetry(messageId: string): Promise<number> {
  const db = await getDatabase()
  const item = await db.get(MESSAGE_QUEUE_STORE as any, messageId)

  if (item) {
    const newRetryCount = ((item as any).data?.retryCount || 0) + 1
    const updatedItem = {
      ...item,
      retryCount: newRetryCount,
      data: {
        ...((item as any).data || {}),
        retryCount: newRetryCount,
      },
    }
    await putInStore(MESSAGE_QUEUE_STORE, updatedItem)
    return newRetryCount
  }
  return 0
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number): number {
  const delay = Math.min(
    BASE_RETRY_DELAY * Math.pow(2, retryCount),
    MAX_RETRY_DELAY
  )
  // Add jitter (0-25% of delay)
  return delay + Math.random() * delay * 0.25
}

/**
 * Send a single queued message
 */
async function sendQueuedMessage(message: QueuedMessage): Promise<boolean> {
  try {
    await updateMessageStatus(message.id, 'processing')

    const { data, error } = await db.from('messages').insert({
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      message_type: message.message_type,
      attachments: message.attachments || null,
      mentioned_users: message.mentioned_users || null,
      parent_message_id: message.parent_message_id || null,
    })

    if (error) {
      throw error
    }

    // Success - remove from queue
    await removeFromQueue(message.id)
    logger.log(`Message ${message.id} sent successfully`)
    return true
  } catch (error) {
    const retryCount = await incrementRetry(message.id)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (retryCount >= MAX_RETRIES) {
      await updateMessageStatus(message.id, 'failed', errorMessage)
      logger.error(`Message ${message.id} failed after ${MAX_RETRIES} retries: ${errorMessage}`)
    } else {
      await updateMessageStatus(message.id, 'pending', errorMessage)
      logger.warn(`Message ${message.id} failed, will retry (attempt ${retryCount}/${MAX_RETRIES})`)
    }

    return false
  }
}

/**
 * Process all pending messages in the queue
 */
export async function processMessageQueue(): Promise<{
  sent: number
  failed: number
  pending: number
}> {
  const results = { sent: 0, failed: 0, pending: 0 }

  // Check if online
  if (!navigator.onLine) {
    logger.log('Offline - skipping message queue processing')
    return results
  }

  const pendingMessages = await getPendingMessages()
  logger.log(`Processing ${pendingMessages.length} pending messages`)

  for (const message of pendingMessages) {
    // Check retry delay
    if (message.lastAttempt && message.retryCount > 0) {
      const delay = calculateRetryDelay(message.retryCount)
      const timeSinceLastAttempt = Date.now() - message.lastAttempt
      if (timeSinceLastAttempt < delay) {
        results.pending++
        continue
      }
    }

    const success = await sendQueuedMessage(message)
    if (success) {
      results.sent++
    } else if (message.retryCount >= MAX_RETRIES) {
      results.failed++
    } else {
      results.pending++
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  logger.log(`Queue processed: ${results.sent} sent, ${results.failed} failed, ${results.pending} pending`)
  return results
}

/**
 * Clear failed messages from the queue
 */
export async function clearFailedMessages(): Promise<number> {
  const allMessages = await getAllQueuedMessages()
  const failedMessages = allMessages.filter((m) => m.status === 'failed')

  for (const message of failedMessages) {
    await removeFromQueue(message.id)
  }

  logger.log(`Cleared ${failedMessages.length} failed messages`)
  return failedMessages.length
}

/**
 * Retry all failed messages
 */
export async function retryFailedMessages(): Promise<void> {
  const allMessages = await getAllQueuedMessages()
  const failedMessages = allMessages.filter((m) => m.status === 'failed')

  for (const message of failedMessages) {
    await updateMessageStatus(message.id, 'pending')
    // Reset retry count
    const db = await getDatabase()
    const item = await db.get(MESSAGE_QUEUE_STORE as any, message.id)
    if (item) {
      await putInStore(MESSAGE_QUEUE_STORE, {
        ...item,
        retryCount: 0,
        data: { ...((item as any).data || {}), retryCount: 0 },
      })
    }
  }

  logger.log(`Reset ${failedMessages.length} failed messages to pending`)
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number
  pending: number
  processing: number
  failed: number
}> {
  const allMessages = await getAllQueuedMessages()

  return {
    total: allMessages.length,
    pending: allMessages.filter((m) => m.status === 'pending').length,
    processing: allMessages.filter((m) => m.status === 'processing').length,
    failed: allMessages.filter((m) => m.status === 'failed').length,
  }
}
