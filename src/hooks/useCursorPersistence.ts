/* eslint-disable react-hooks/set-state-in-effect */
/**
 * Cursor Persistence Hook
 *
 * Manages persistence of cursor positions for collaboration sessions.
 * Works alongside useLiveCursors to provide cursor position restoration
 * when users reconnect to a collaboration session.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { cursorPersistenceService } from '@/lib/api/services/cursor-persistence';
import { getUserColor } from '@/lib/realtime/types';
import type {
  PersistedCursor,
  CursorPosition,
  CursorAction,
  RoomType,
  UseCursorPersistenceOptions,
  UseCursorPersistenceReturn,
} from '@/types/collaboration';
import { logger } from '@/lib/utils/logger';

// Default persist interval (how often to save cursor position)
const DEFAULT_PERSIST_INTERVAL_MS = 500;

// Stale threshold - don't restore cursors older than this
const STALE_CURSOR_THRESHOLD_MS = 30000;

/**
 * Hook for persisting and restoring cursor positions in collaboration sessions.
 *
 * This hook:
 * 1. Creates/joins a collaboration session
 * 2. Persists cursor positions to the database
 * 3. Restores cursor positions on reconnect
 * 4. Subscribes to cursor changes from other users
 *
 * @example
 * ```tsx
 * const { sessionId, persistedCursors, persistCursor, deactivateCursor } = useCursorPersistence({
 *   roomId: `document:${documentId}`,
 *   roomType: 'document',
 *   resourceId: documentId,
 * });
 *
 * // In mouse move handler:
 * persistCursor({ x: event.clientX, y: event.clientY });
 *
 * // When leaving:
 * deactivateCursor();
 * ```
 */
export function useCursorPersistence(
  options: UseCursorPersistenceOptions
): UseCursorPersistenceReturn {
  const {
    roomId,
    roomType = 'document',
    resourceId,
    resourceType,
    enabled = true,
    persistInterval = DEFAULT_PERSIST_INTERVAL_MS,
    pageNumber = 1,
  } = options;

  const { user } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [persistedCursors, setPersistedCursors] = useState<PersistedCursor[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for throttling and cleanup
  const lastPersistRef = useRef<number>(0);
  const persistIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCursorRef = useRef<{ position: CursorPosition; action: CursorAction } | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  // User info for cursor
  const userName = user?.user_metadata?.full_name || user?.email || 'Anonymous';
  const userColor = user ? getUserColor(user.id) : '#888888';

  /**
   * Initialize session and restore cursors
   */
  const initializeSession = useCallback(async () => {
    if (!user || !roomId || !enabled || isInitializedRef.current) {return;}

    try {
      // Get or create session
      const newSessionId = await cursorPersistenceService.getOrCreateSession(
        roomId,
        roomType,
        resourceId,
        resourceType
      );

      if (!newSessionId) {
        logger.error('Failed to create collaboration session');
        return;
      }

      setSessionId(newSessionId);
      isInitializedRef.current = true;

      // Fetch existing cursors (for restoration)
      const existingCursors = await cursorPersistenceService.getSessionCursors(
        newSessionId,
        user.id
      );

      // Filter out stale cursors
      const now = Date.now();
      const activeCursors = existingCursors.filter((cursor) => {
        const lastSeen = new Date(cursor.last_seen_at).getTime();
        return now - lastSeen < STALE_CURSOR_THRESHOLD_MS;
      });

      setPersistedCursors(activeCursors);
      setIsConnected(true);

      // Subscribe to cursor changes via Realtime
      unsubscribeRef.current = cursorPersistenceService.subscribeToCursorChanges(
        newSessionId,
        // On insert
        (cursor) => {
          if (cursor.user_id !== user.id && cursor.is_active) {
            setPersistedCursors((prev) => {
              const filtered = prev.filter((c) => c.user_id !== cursor.user_id);
              return [
                ...filtered,
                {
                  cursor_id: cursor.id,
                  user_id: cursor.user_id,
                  user_name: cursor.user_name,
                  user_email: cursor.user_email,
                  user_color: cursor.user_color,
                  avatar_url: cursor.avatar_url,
                  position_x: cursor.position_x,
                  position_y: cursor.position_y,
                  page_x: cursor.page_x,
                  page_y: cursor.page_y,
                  page_number: cursor.page_number,
                  current_action: cursor.current_action as CursorAction,
                  last_seen_at: cursor.last_seen_at,
                },
              ];
            });
          }
        },
        // On update
        (cursor) => {
          if (cursor.user_id !== user.id) {
            if (!cursor.is_active) {
              // Cursor deactivated, remove it
              setPersistedCursors((prev) =>
                prev.filter((c) => c.user_id !== cursor.user_id)
              );
            } else {
              // Update cursor position
              setPersistedCursors((prev) =>
                prev.map((c) =>
                  c.user_id === cursor.user_id
                    ? {
                        ...c,
                        position_x: cursor.position_x,
                        position_y: cursor.position_y,
                        page_x: cursor.page_x,
                        page_y: cursor.page_y,
                        current_action: cursor.current_action as CursorAction,
                        last_seen_at: cursor.last_seen_at,
                      }
                    : c
                )
              );
            }
          }
        },
        // On delete
        (cursor) => {
          setPersistedCursors((prev) =>
            prev.filter((c) => c.user_id !== cursor.user_id)
          );
        }
      );

      logger.info('Cursor persistence initialized', { sessionId: newSessionId, roomId });
    } catch (err) {
      logger.error('Error initializing cursor persistence:', err);
    }
  }, [user, roomId, roomType, resourceId, resourceType, enabled]);

  /**
   * Persist cursor position to database
   */
  const persistCursor = useCallback(
    async (position: CursorPosition, action: CursorAction = 'idle') => {
      if (!sessionId || !user || !enabled) {return;}

      const now = Date.now();

      // Store pending cursor for interval-based persistence
      pendingCursorRef.current = { position, action };

      // Throttle immediate persistence
      if (now - lastPersistRef.current < persistInterval) {
        return;
      }

      lastPersistRef.current = now;

      try {
        // Try direct update first (faster)
        const updated = await cursorPersistenceService.updateCursorPositionDirect(
          sessionId,
          user.id,
          position.x,
          position.y,
          position.pageX,
          position.pageY,
          action
        );

        // If direct update failed (row doesn't exist), do full upsert
        if (!updated) {
          await cursorPersistenceService.upsertCursorPosition({
            session_id: sessionId,
            user_id: user.id,
            user_name: userName,
            user_email: user.email,
            user_color: userColor,
            avatar_url: user.user_metadata?.avatar_url,
            position_x: position.x,
            position_y: position.y,
            page_x: position.pageX,
            page_y: position.pageY,
            page_number: pageNumber,
            current_action: action,
          });
        }
      } catch (err) {
        logger.error('Error persisting cursor:', err);
      }
    },
    [sessionId, user, userName, userColor, enabled, persistInterval, pageNumber]
  );

  /**
   * Deactivate cursor when user leaves
   */
  const deactivateCursor = useCallback(async () => {
    if (!sessionId || !user) {return;}

    try {
      await cursorPersistenceService.deactivateCursor(sessionId, user.id);
    } catch (err) {
      logger.error('Error deactivating cursor:', err);
    }
  }, [sessionId, user]);

  /**
   * Manually refresh cursors
   */
  const refreshCursors = useCallback(async () => {
    if (!sessionId || !user) {return;}

    try {
      const cursors = await cursorPersistenceService.getSessionCursors(
        sessionId,
        user.id
      );

      // Filter stale cursors
      const now = Date.now();
      const activeCursors = cursors.filter((cursor) => {
        const lastSeen = new Date(cursor.last_seen_at).getTime();
        return now - lastSeen < STALE_CURSOR_THRESHOLD_MS;
      });

      setPersistedCursors(activeCursors);
    } catch (err) {
      logger.error('Error refreshing cursors:', err);
    }
  }, [sessionId, user]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();

    return () => {
      // Cleanup on unmount
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [initializeSession]);

  // Deactivate cursor on unmount
  useEffect(() => {
    return () => {
      if (sessionId && user) {
        // Fire and forget - we're unmounting
        cursorPersistenceService.deactivateCursor(sessionId, user.id);
      }
    };
  }, [sessionId, user]);

  // Periodic persistence of pending cursor
  useEffect(() => {
    if (!enabled || !sessionId) {return;}

    persistIntervalRef.current = setInterval(() => {
      if (pendingCursorRef.current && sessionId && user) {
        const { position, action } = pendingCursorRef.current;

        cursorPersistenceService
          .updateCursorPositionDirect(
            sessionId,
            user.id,
            position.x,
            position.y,
            position.pageX,
            position.pageY,
            action
          )
          .catch((err) => {
            logger.error('Error in periodic cursor persist:', err);
          });
      }
    }, persistInterval);

    return () => {
      if (persistIntervalRef.current) {
        clearInterval(persistIntervalRef.current);
        persistIntervalRef.current = null;
      }
    };
  }, [enabled, sessionId, user, persistInterval]);

  // Cleanup stale cursors from state periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setPersistedCursors((prev) =>
        prev.filter((cursor) => {
          const lastSeen = new Date(cursor.last_seen_at).getTime();
          return now - lastSeen < STALE_CURSOR_THRESHOLD_MS;
        })
      );
    }, 5000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    sessionId,
    persistedCursors,
    isConnected,
    persistCursor,
    deactivateCursor,
    refreshCursors,
  };
}

export default useCursorPersistence;
