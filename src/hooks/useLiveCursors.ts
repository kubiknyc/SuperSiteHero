/**
 * Live Cursor Tracking Hook
 *
 * Real-time cursor position tracking for collaborative document editing.
 * Broadcasts local cursor position and receives cursor positions from other users.
 *
 * Now includes optional persistence layer for cursor position restoration on reconnect.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { realtimeManager } from '@/lib/realtime/client'
import { getUserColor } from '@/lib/realtime/types'
import { cursorPersistenceService } from '@/lib/api/services/cursor-persistence'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { RoomType, PersistedCursor } from '@/types/collaboration'

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
  avatarUrl?: string
}

interface UserPresenceWithCursor {
  user_id: string
  user_name: string
  user_color: string
  cursor?: CursorPosition
  online_at: string
}

export interface LiveCursorOptions {
  /** Whether to enable cursor persistence for recovery on reconnect */
  enablePersistence?: boolean
  /** Room type for persistence (default: 'document') */
  roomType?: RoomType
  /** Resource ID for persistence context */
  resourceId?: string
  /** Resource type for persistence context */
  resourceType?: string
  /** Page number for document-based cursors */
  pageNumber?: number
  /** How often to persist cursor position in ms (default: 500) */
  persistInterval?: number
}

// Throttle cursor broadcasts to 60fps (approximately 16ms)
const CURSOR_THROTTLE_MS = 16
// Remove stale cursors after 3 seconds of inactivity
const CURSOR_STALE_THRESHOLD_MS = 3000
// Cleanup interval for checking stale cursors
const CLEANUP_INTERVAL_MS = 1000
// Default persistence interval
const DEFAULT_PERSIST_INTERVAL_MS = 500
// Stale threshold for persisted cursors
const PERSISTED_CURSOR_STALE_MS = 30000

/**
 * Hook for live cursor tracking in collaborative editing
 *
 * @param roomId - Unique identifier for the collaborative room (e.g., "document:123")
 * @param enabled - Whether cursor tracking is enabled (default: true)
 * @param options - Additional options including persistence settings
 * @returns Object with cursors array, setContainer function, and isConnected status
 */
export function useLiveCursors(
  roomId: string,
  enabled: boolean = true,
  options: LiveCursorOptions = {}
) {
  const {
    enablePersistence = false,
    roomType = 'document',
    resourceId,
    resourceType,
    pageNumber = 1,
    persistInterval = DEFAULT_PERSIST_INTERVAL_MS,
  } = options

  const { user } = useAuth()
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const lastBroadcastRef = useRef<number>(0)
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const persistIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingPositionRef = useRef<CursorPosition | null>(null)
  const isInitializedRef = useRef(false)

  const userName = user?.user_metadata?.full_name || user?.email || 'Anonymous'
  const userColor = user ? getUserColor(user.id) : '#888888'

  // Initialize persistence session and restore cursors
  useEffect(() => {
    if (!enablePersistence || !user || !roomId || !enabled || isInitializedRef.current) return

    const initPersistence = async () => {
      try {
        // Get or create session
        const newSessionId = await cursorPersistenceService.getOrCreateSession(
          roomId,
          roomType,
          resourceId,
          resourceType
        )

        if (!newSessionId) return

        setSessionId(newSessionId)
        isInitializedRef.current = true

        // Restore existing cursors
        const existingCursors = await cursorPersistenceService.getSessionCursors(
          newSessionId,
          user.id
        )

        // Filter stale and add to state
        const now = Date.now()
        existingCursors.forEach((cursor: PersistedCursor) => {
          const lastSeen = new Date(cursor.last_seen_at).getTime()
          if (now - lastSeen < PERSISTED_CURSOR_STALE_MS) {
            setCursors((prev) => {
              const updated = new Map(prev)
              updated.set(cursor.user_id, {
                userId: cursor.user_id,
                userName: cursor.user_name,
                color: cursor.user_color,
                position: {
                  x: cursor.position_x,
                  y: cursor.position_y,
                  pageX: cursor.page_x ?? undefined,
                  pageY: cursor.page_y ?? undefined,
                },
                lastUpdate: lastSeen,
                avatarUrl: cursor.avatar_url ?? undefined,
              })
              return updated
            })
          }
        })
      } catch {
        // Silently fail - persistence is optional
      }
    }

    initPersistence()

    return () => {
      isInitializedRef.current = false
    }
  }, [enablePersistence, user, roomId, roomType, resourceId, resourceType, enabled])

  // Periodic persistence of cursor position
  useEffect(() => {
    if (!enablePersistence || !sessionId || !user || !enabled) return

    persistIntervalRef.current = setInterval(async () => {
      if (pendingPositionRef.current && sessionId) {
        const position = pendingPositionRef.current
        try {
          await cursorPersistenceService.updateCursorPositionDirect(
            sessionId,
            user.id,
            position.x,
            position.y,
            position.pageX,
            position.pageY
          )
        } catch {
          // Silently fail
        }
      }
    }, persistInterval)

    return () => {
      if (persistIntervalRef.current) {
        clearInterval(persistIntervalRef.current)
        persistIntervalRef.current = null
      }
    }
  }, [enablePersistence, sessionId, user, enabled, persistInterval])

  // Cleanup: Deactivate cursor on unmount
  useEffect(() => {
    return () => {
      if (enablePersistence && sessionId && user) {
        cursorPersistenceService.deactivateCursor(sessionId, user.id)
      }
    }
  }, [enablePersistence, sessionId, user])

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
      user_name: userName,
      user_color: userColor,
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

        // If persistence enabled, create initial cursor record
        if (enablePersistence && sessionId && user) {
          try {
            await cursorPersistenceService.upsertCursorPosition({
              session_id: sessionId,
              user_id: user.id,
              user_name: userName,
              user_email: user.email,
              user_color: userColor,
              avatar_url: user.user_metadata?.avatar_url,
              position_x: 0,
              position_y: 0,
              page_number: pageNumber,
              current_action: 'idle',
            })
          } catch {
            // Silently fail
          }
        }
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
  }, [user, roomId, enabled, userName, userColor, enablePersistence, sessionId, pageNumber])

  // Broadcast cursor position (throttled to 60fps)
  const broadcastCursorPosition = useCallback(
    (position: CursorPosition) => {
      if (!channelRef.current || !user) {return}

      const now = Date.now()
      if (now - lastBroadcastRef.current < CURSOR_THROTTLE_MS) {
        return // Throttle updates
      }
      lastBroadcastRef.current = now

      // Store pending position for persistence
      if (enablePersistence) {
        pendingPositionRef.current = position
      }

      channelRef.current.track({
        user_id: user.id,
        user_name: userName,
        user_color: userColor,
        cursor: position,
        online_at: new Date().toISOString(),
      })
    },
    [user, userName, userColor, enablePersistence]
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
      user_name: userName,
      user_color: userColor,
      cursor: undefined,
      online_at: new Date().toISOString(),
    })

    // Clear pending position
    if (enablePersistence) {
      pendingPositionRef.current = null
    }
  }, [user, userName, userColor, enablePersistence])

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

    /**
     * Session ID for persistence (if enabled)
     */
    sessionId,
  }
}

export default useLiveCursors
