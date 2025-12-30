/**
 * useOfflineMessaging Hook
 *
 * Provides offline-aware messaging functionality:
 * - Queue messages when offline
 * - Show queued messages in UI
 * - Process queue when online
 * - Sync status indicators
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { messagingKeys } from './useMessaging'
import {
  queueMessage,
  getAllQueuedMessages,
  getQueuedMessagesForConversation,
  processMessageQueue,
  clearFailedMessages,
  retryFailedMessages,
  getQueueStats,
  removeFromQueue,
  type QueuedMessage,
} from '@/lib/offline/message-queue'
import type { SendMessageDTO } from '@/types/messaging'

// Query keys for offline messaging
export const offlineMessagingKeys = {
  all: ['offline-messaging'] as const,
  queue: () => [...offlineMessagingKeys.all, 'queue'] as const,
  queueByConversation: (conversationId: string) =>
    [...offlineMessagingKeys.all, 'queue', conversationId] as const,
  stats: () => [...offlineMessagingKeys.all, 'stats'] as const,
}

/**
 * Hook to get all queued messages
 */
export function useQueuedMessages() {
  return useQuery({
    queryKey: offlineMessagingKeys.queue(),
    queryFn: getAllQueuedMessages,
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

/**
 * Hook to get queued messages for a specific conversation
 */
export function useConversationQueuedMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: offlineMessagingKeys.queueByConversation(conversationId || ''),
    queryFn: () => getQueuedMessagesForConversation(conversationId || ''),
    enabled: !!conversationId,
    staleTime: 5000,
    refetchInterval: 10000,
  })
}

/**
 * Hook to get queue statistics
 */
export function useQueueStats() {
  return useQuery({
    queryKey: offlineMessagingKeys.stats(),
    queryFn: getQueueStats,
    staleTime: 5000,
    refetchInterval: 15000,
  })
}

/**
 * Hook to send a message with offline support
 * When offline, queues the message for later delivery
 */
export function useSendMessageOffline(conversationId: string) {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (data: SendMessageDTO): Promise<QueuedMessage | null> => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      // If online, let the regular mutation handle it
      if (navigator.onLine) {
        return null // Signal to use regular send
      }

      // Queue the message for offline delivery
      return queueMessage(userProfile.id, data)
    },
    onSuccess: (queuedMessage) => {
      if (queuedMessage) {
        // Invalidate queue queries to show the new message
        queryClient.invalidateQueries({ queryKey: offlineMessagingKeys.queue() })
        queryClient.invalidateQueries({
          queryKey: offlineMessagingKeys.queueByConversation(conversationId),
        })
        queryClient.invalidateQueries({ queryKey: offlineMessagingKeys.stats() })
      }
    },
  })
}

/**
 * Hook to process the message queue
 * Automatically processes when coming back online
 */
export function useQueueProcessor() {
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<{
    sent: number
    failed: number
    pending: number
  } | null>(null)

  const processQueue = useCallback(async () => {
    if (isProcessing || !navigator.onLine) {return}

    setIsProcessing(true)
    try {
      const result = await processMessageQueue()
      setLastResult(result)

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: offlineMessagingKeys.all })
      queryClient.invalidateQueries({ queryKey: messagingKeys.all })
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, queryClient])

  // Use ref to store latest processQueue for mount effect
  const processQueueRef = useRef(processQueue)
  useEffect(() => {
    processQueueRef.current = processQueue
  }, [processQueue])

  // Auto-process when coming online
  useEffect(() => {
    const handleOnline = () => {
      // Delay slightly to ensure connection is stable
      setTimeout(() => processQueueRef.current(), 1000)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // Process on mount if online
  useEffect(() => {
    if (navigator.onLine) {
      processQueueRef.current()
    }
  }, [])

  return {
    processQueue,
    isProcessing,
    lastResult,
  }
}

/**
 * Hook to manage failed messages
 */
export function useFailedMessages() {
  const queryClient = useQueryClient()
  const { data: allMessages = [] } = useQueuedMessages()

  const failedMessages = useMemo(
    () => allMessages.filter((m) => m.status === 'failed'),
    [allMessages]
  )

  const clearFailed = useMutation({
    mutationFn: clearFailedMessages,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offlineMessagingKeys.all })
    },
  })

  const retryFailed = useMutation({
    mutationFn: retryFailedMessages,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offlineMessagingKeys.all })
    },
  })

  const removeMessage = useMutation({
    mutationFn: removeFromQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offlineMessagingKeys.all })
    },
  })

  return {
    failedMessages,
    clearFailed: clearFailed.mutate,
    retryFailed: retryFailed.mutate,
    removeMessage: removeMessage.mutate,
    isClearingFailed: clearFailed.isPending,
    isRetryingFailed: retryFailed.isPending,
  }
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Combined hook for offline messaging in a conversation
 * Provides everything needed to handle offline messaging in a chat view
 */
export function useOfflineMessaging(conversationId: string) {
  const isOnline = useOnlineStatus()
  const { data: queuedMessages = [], isLoading: isLoadingQueue } =
    useConversationQueuedMessages(conversationId)
  const { data: stats } = useQueueStats()
  const { processQueue, isProcessing } = useQueueProcessor()
  const sendOffline = useSendMessageOffline(conversationId)
  const { failedMessages, retryFailed, clearFailed, removeMessage } = useFailedMessages()

  // Pending messages for this conversation
  const pendingMessages = useMemo(
    () => queuedMessages.filter((m) => m.status === 'pending' || m.status === 'processing'),
    [queuedMessages]
  )

  // Failed messages for this conversation
  const conversationFailedMessages = useMemo(
    () => failedMessages.filter((m) => m.conversation_id === conversationId),
    [failedMessages, conversationId]
  )

  return {
    // Status
    isOnline,
    isProcessing,
    isLoadingQueue,

    // Messages
    queuedMessages,
    pendingMessages,
    failedMessages: conversationFailedMessages,

    // Stats (global)
    totalPending: stats?.pending ?? 0,
    totalFailed: stats?.failed ?? 0,

    // Actions
    sendOffline: sendOffline.mutate,
    processQueue,
    retryFailed,
    clearFailed,
    removeMessage,

    // Mutation state
    isSendingOffline: sendOffline.isPending,
  }
}

/**
 * Utility to convert a queued message to display format
 * Use this to show queued messages in the message list
 */
export function queuedMessageToDisplayFormat(
  queuedMessage: QueuedMessage,
  sender?: { id: string; full_name: string | null; avatar_url: string | null }
) {
  return {
    id: queuedMessage.id,
    conversation_id: queuedMessage.conversation_id,
    sender_id: queuedMessage.sender_id,
    content: queuedMessage.content,
    message_type: queuedMessage.message_type,
    attachments: queuedMessage.attachments || null,
    mentioned_users: queuedMessage.mentioned_users || null,
    parent_message_id: queuedMessage.parent_message_id || null,
    created_at: new Date(queuedMessage.timestamp).toISOString(),
    updated_at: new Date(queuedMessage.timestamp).toISOString(),
    is_edited: false,
    is_deleted: false,
    reactions: null,
    metadata: null,
    // Offline-specific fields
    _isQueued: true,
    _queueStatus: queuedMessage.status,
    _queueError: queuedMessage.error,
    _retryCount: queuedMessage.retryCount,
    // Optional sender info
    sender: sender || {
      id: queuedMessage.sender_id,
      full_name: null,
      avatar_url: null,
    },
  }
}
