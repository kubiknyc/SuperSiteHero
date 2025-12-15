/**
 * Live Cursor Tracking Hook
 *
 * Real-time cursor position tracking for collaborative document editing.
 * Broadcasts local cursor position and receives cursor positions from other users.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { realtimeManager } from '@/lib/realtime/client'
import { getUserColor } from '@/lib/realtime/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface CursorPosition {
  x: number
  y: number
  pageX?: number
  pageY?: number
}

export interface UserCursor {
  userId: string
  userName: string
  color: string
  position: CursorPosition
  lastUpdate: number
}

interface UserPresenceWithCursor {
  user_id: string
  user_name: string
  user_color: string
  cursor?: CursorPosition
  online_at: string
}

// Throttle cursor broadcasts to 60fps (approximately 16ms)
const CURSOR_THROTTLE_MS = 16
// Remove stale cursors after 3 seconds of inactivity
const CURSOR_STALE_THRESHOLD_MS = 3000
// Cleanup interval for checking stale cursors
const CLEANUP_INTERVAL_MS = 1000

/**
 * Hook for live cursor tracking in collaborative editing
 *
 * @param roomId - Unique identifier for the collaborative room (e.g., "document:123")
 * @param enabled - Whether cursor tracking is enabled (default: true)
 * @returns Object with cursors array, setContainer function, and isConnected status
 */
export function useLiveCursors(roomId: string, enabled: boolean = true) {
  const { user } = useAuth()
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const lastBroadcastRef = useRef<number>(0)
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup stale cursors periodically
  useEffect(() => {
    if (!enabled) {return}

    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now()
      setCursors((prev) => {
        const updated = new Map(prev)
        let changed = false

        updated.forEach((cursor, oderId) => {
          if (now - cursor.lastUpdate > CURSOR_STALE_THRESHOLD_MS) {
            updated.delete(oderId)
            changed = true
          }
        })

        return changed ? updated : prev
      })
    }, CLEANUP_INTERVAL_MS)

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [enabled])

  // Initialize presence channel and subscribe to cursor updates
  useEffect(() => {
    if (!user || !roomId || !enabled) {return}

    const channel = realtimeManager.createPresenceChannel(`cursors:${roomId}`)
    channelRef.current = channel

    const currentUserPresence: UserPresenceWithCursor = {
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email || 'Anonymous',
      user_color: getUserColor(user.id),
      online_at: new Date().toISOString(),
    }

    // Handle presence sync (cursor updates from all users)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<UserPresenceWithCursor>()

      setCursors((prev) => {
        const updated = new Map(prev)
        let changed = false

        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            // Skip our own cursor
            if (presence.user_id === user.id) {return}

            if (presence.cursor) {
              const existing = updated.get(presence.user_id)
              const newCursor: UserCursor = {
                userId: presence.user_id,
                userName: presence.user_name,
                color: presence.user_color,
                position: presence.cursor,
                lastUpdate: Date.now(),
              }

              // Only update if position changed
              if (!existing ||
                  existing.position.x !== presence.cursor.x ||
                  existing.position.y !== presence.cursor.y) {
                updated.set(presence.user_id, newCursor)
                changed = true
              }
            }
          })
        })

        return changed ? updated : prev
      })
    })

    // Handle user leaving
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      setCursors((prev) => {
        const updated = new Map(prev)
        let changed = false

        leftPresences.forEach((presence: any) => {
          if (presence.user_id && updated.has(presence.user_id)) {
            updated.delete(presence.user_id)
            changed = true
          }
        })

        return changed ? updated : prev
      })
    })

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(currentUserPresence)
        setIsConnected(true)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setIsConnected(false)
      }
    })

    return () => {
      channel.untrack()
      realtimeManager.removePresenceChannel(`cursors:${roomId}`)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [user, roomId, enabled])

  // Broadcast cursor position (throttled to 60fps)
  const broadcastCursorPosition = useCallback(
    (position: CursorPosition) => {
      if (!channelRef.current || !user) {return}

      const now = Date.now()
      if (now - lastBroadcastRef.current < CURSOR_THROTTLE_MS) {
        return // Throttle updates
      }
      lastBroadcastRef.current = now

      channelRef.current.track({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || 'Anonymous',
        user_color: getUserColor(user.id),
        cursor: position,
        online_at: new Date().toISOString(),
      })
    },
    [user]
  )

  // Handle mouse move within container
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!containerRef.current) {return}

      const rect = containerRef.current.getBoundingClientRect()
      const position: CursorPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        pageX: event.pageX,
        pageY: event.pageY,
      }

      broadcastCursorPosition(position)
    },
    [broadcastCursorPosition]
  )

  // Handle mouse leave - broadcast null cursor
  const handleMouseLeave = useCallback(() => {
    if (!channelRef.current || !user) {return}

    channelRef.current.track({
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email || 'Anonymous',
      user_color: getUserColor(user.id),
      cursor: undefined,
      online_at: new Date().toISOString(),
    })
  }, [user])

  // Set container element for cursor tracking
  const setContainer = useCallback(
    (element: HTMLElement | null) => {
      // Remove listeners from old container
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove)
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave)
      }

      containerRef.current = element

      // Add listeners to new container
      if (element) {
        element.addEventListener('mousemove', handleMouseMove)
        element.addEventListener('mouseleave', handleMouseLeave)
      }
    },
    [handleMouseMove, handleMouseLeave]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove)
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [handleMouseMove, handleMouseLeave])

  return {
    /**
     * Array of all visible cursors from other users
     */
    cursors: Array.from(cursors.values()),

    /**
     * Function to set the container element for cursor tracking
     * Pass null to stop tracking
     */
    setContainer,

    /**
     * Whether the cursor tracking channel is connected
     */
    isConnected,

    /**
     * Manually broadcast cursor position (useful for non-mouse inputs)
     */
    broadcastCursorPosition,
  }
}

export default useLiveCursors
