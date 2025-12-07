/**
 * useReadReceipts Hook
 *
 * Provides read receipt data for messages:
 * - Query who has read each message
 * - Track read status in real-time
 * - Efficient batched queries
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { messagingKeys } from './useMessaging'

export interface ReadReceipt {
  id: string
  message_id: string
  user_id: string
  read_at: string
  user?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

export interface MessageReadStatus {
  messageId: string
  readers: ReadReceipt[]
  readCount: number
  isReadByAll: boolean
}

/**
 * Get read receipts for a specific message
 */
export function useMessageReadReceipts(messageId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: [...messagingKeys.all, 'read-receipts', messageId],
    queryFn: async (): Promise<ReadReceipt[]> => {
      if (!messageId) return []

      const { data, error } = await supabase
        .from('message_read_receipts')
        .select(`
          *,
          user:users!message_read_receipts_user_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .eq('message_id', messageId)
        .neq('user_id', userProfile?.id || '') // Exclude current user
        .order('read_at', { ascending: false })

      if (error) throw error

      return (data || []) as unknown as ReadReceipt[]
    },
    enabled: !!messageId && !!userProfile?.id,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get read receipts for multiple messages in a conversation (batched)
 */
export function useConversationReadReceipts(
  conversationId: string | undefined,
  messageIds: string[]
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: [...messagingKeys.all, 'conversation-read-receipts', conversationId, messageIds.length],
    queryFn: async (): Promise<Map<string, ReadReceipt[]>> => {
      if (!conversationId || messageIds.length === 0) {
        return new Map()
      }

      const { data, error } = await supabase
        .from('message_read_receipts')
        .select(`
          *,
          user:users!message_read_receipts_user_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .in('message_id', messageIds)
        .neq('user_id', userProfile?.id || '') // Exclude current user

      if (error) throw error

      // Group by message_id
      const receiptMap = new Map<string, ReadReceipt[]>()
      for (const receipt of (data || []) as unknown as ReadReceipt[]) {
        const existing = receiptMap.get(receipt.message_id) || []
        existing.push(receipt)
        receiptMap.set(receipt.message_id, existing)
      }

      return receiptMap
    },
    enabled: !!conversationId && !!userProfile?.id && messageIds.length > 0,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Get who has read the latest messages (for showing "seen by" UI)
 * Returns only the most recent readers per message (max 5)
 */
export function useLatestReaders(
  conversationId: string | undefined,
  messageIds: string[],
  maxReadersPerMessage = 5
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: [...messagingKeys.all, 'latest-readers', conversationId, messageIds.slice(0, 10).join(',')],
    queryFn: async () => {
      if (!conversationId || messageIds.length === 0) {
        return new Map<string, ReadReceipt[]>()
      }

      // Only fetch for the most recent messages to avoid large queries
      const recentMessageIds = messageIds.slice(0, 20)

      const { data, error } = await supabase
        .from('message_read_receipts')
        .select(`
          *,
          user:users!message_read_receipts_user_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .in('message_id', recentMessageIds)
        .neq('user_id', userProfile?.id || '')
        .order('read_at', { ascending: false })

      if (error) throw error

      // Group by message_id and limit to maxReadersPerMessage
      const receiptMap = new Map<string, ReadReceipt[]>()
      for (const receipt of (data || []) as unknown as ReadReceipt[]) {
        const existing = receiptMap.get(receipt.message_id) || []
        if (existing.length < maxReadersPerMessage) {
          existing.push(receipt)
          receiptMap.set(receipt.message_id, existing)
        }
      }

      return receiptMap
    },
    enabled: !!conversationId && !!userProfile?.id && messageIds.length > 0,
    staleTime: 15000, // 15 seconds - more frequent updates for read status
  })
}

/**
 * Format read receipt info for display
 */
export function formatReadReceipts(
  receipts: ReadReceipt[],
  maxDisplay = 3
): { displayText: string; avatars: ReadReceipt[]; hasMore: boolean; moreCount: number } {
  if (receipts.length === 0) {
    return { displayText: '', avatars: [], hasMore: false, moreCount: 0 }
  }

  const avatars = receipts.slice(0, maxDisplay)
  const hasMore = receipts.length > maxDisplay
  const moreCount = receipts.length - maxDisplay

  // Build display text
  const names = receipts.slice(0, maxDisplay).map(
    (r) => r.user?.first_name || r.user?.email?.split('@')[0] || 'Someone'
  )

  let displayText: string
  if (names.length === 1) {
    displayText = `Seen by ${names[0]}`
  } else if (names.length === 2) {
    displayText = `Seen by ${names[0]} and ${names[1]}`
  } else if (names.length === 3 && !hasMore) {
    displayText = `Seen by ${names[0]}, ${names[1]}, and ${names[2]}`
  } else {
    displayText = `Seen by ${names.slice(0, 2).join(', ')} and ${receipts.length - 2} others`
  }

  return { displayText, avatars, hasMore, moreCount }
}
