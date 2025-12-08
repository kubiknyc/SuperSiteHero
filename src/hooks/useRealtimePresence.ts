// File: src/hooks/useRealtimePresence.ts
// Hook for presence tracking in rooms

import { useEffect, useState, useCallback, useRef } from 'react'
import { presenceManager } from '@/lib/realtime'
import type { PresenceUser, TypingState } from '@/lib/realtime'
import { useAuth } from '@/hooks/useAuth'

interface UseRealtimePresenceOptions {
  roomId: string
  enabled?: boolean
  trackPage?: string
}

interface UseRealtimePresenceReturn {
  users: PresenceUser[]
  typingUsers: TypingState[]
  isConnected: boolean
  sendTyping: (isTyping: boolean) => void
  updatePage: (page: string) => void
}

/**
 * Hook for presence tracking in a room
 *
 * @example
 * ```tsx
 * const { users, typingUsers, sendTyping } = useRealtimePresence({
 *   roomId: `project:${projectId}`,
 *   trackPage: '/projects/123/daily-reports',
 * })
 * ```
 */
export function useRealtimePresence(
  options: UseRealtimePresenceOptions
): UseRealtimePresenceReturn {
  const { roomId, enabled = true, trackPage } = options
  const { user, userProfile } = useAuth()

  const [users, setUsers] = useState<PresenceUser[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Track if we've joined the room
  const hasJoined = useRef(false)

  // Join the room when enabled
  useEffect(() => {
    if (!enabled || !user || hasJoined.current) return

    const joinRoom = async () => {
      try {
        await presenceManager.joinRoom({
          roomId,
          user: {
            id: user.id,
            email: user.email ?? '',
            name: userProfile?.full_name ?? user.email ?? 'Anonymous',
            avatarUrl: userProfile?.avatar_url ?? undefined,
          },
          initialPage: trackPage,
          onSync: () => {
            setIsConnected(true)
          },
        })
        hasJoined.current = true
      } catch (error) {
        console.error('Failed to join presence room:', error)
      }
    }

    joinRoom()

    return () => {
      if (hasJoined.current) {
        presenceManager.leaveRoom(roomId)
        hasJoined.current = false
        setIsConnected(false)
      }
    }
  }, [roomId, enabled, user, userProfile, trackPage])

  // Subscribe to presence changes
  useEffect(() => {
    if (!enabled || !hasJoined.current) return

    const unsubscribePresence = presenceManager.onPresenceChange(roomId, setUsers)
    const unsubscribeTyping = presenceManager.onTypingChange(roomId, setTypingUsers)

    return () => {
      unsubscribePresence()
      unsubscribeTyping()
    }
  }, [roomId, enabled])

  // Send typing indicator
  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      if (!hasJoined.current) return
      await presenceManager.sendTyping(roomId, isTyping)
    },
    [roomId]
  )

  // Update current page
  const updatePage = useCallback(
    async (page: string) => {
      if (!hasJoined.current) return
      await presenceManager.updatePresence(roomId, { currentPage: page })
    },
    [roomId]
  )

  return {
    users,
    typingUsers,
    isConnected,
    sendTyping,
    updatePage,
  }
}

/**
 * Simple hook to show presence on a specific page/resource
 */
export function usePagePresence(resourceType: string, resourceId: string) {
  const roomId = `${resourceType}:${resourceId}`

  return useRealtimePresence({
    roomId,
    trackPage: `/${resourceType}/${resourceId}`,
  })
}

/**
 * Hook for project-level presence
 */
export function useProjectPresence(projectId: string) {
  return usePagePresence('project', projectId)
}
