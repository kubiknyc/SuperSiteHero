/**
 * Cursor Persistence Service
 *
 * Handles database operations for persisting cursor positions in collaboration sessions.
 * This enables cursor position restoration when users reconnect.
 */

import { supabase } from '@/lib/supabase';
import type {
  CollaborationSession,
  CollaborationCursor,
  PersistedCursor,
  UpsertCursorRequest,
  RoomType,
  CursorAction,
} from '@/types/collaboration';
import { logger } from '@/lib/utils/logger';

// =============================================
// Session Management
// =============================================

/**
 * Get or create a collaboration session for a room
 */
export async function getOrCreateSession(
  roomId: string,
  roomType: RoomType = 'document',
  resourceId?: string,
  resourceType?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_collaboration_session', {
      p_room_id: roomId,
      p_room_type: roomType,
      p_resource_id: resourceId || null,
      p_resource_type: resourceType || null,
    });

    if (error) {
      logger.error('Failed to get/create collaboration session:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    logger.error('Error in getOrCreateSession:', err);
    return null;
  }
}

/**
 * Get an active session by room ID
 */
export async function getSessionByRoomId(roomId: string): Promise<CollaborationSession | null> {
  try {
    const { data, error } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - session doesn't exist
        return null;
      }
      logger.error('Failed to get session:', error);
      return null;
    }

    return data as CollaborationSession;
  } catch (err) {
    logger.error('Error in getSessionByRoomId:', err);
    return null;
  }
}

// =============================================
// Cursor Operations
// =============================================

/**
 * Upsert (create or update) a cursor position
 */
export async function upsertCursorPosition(request: UpsertCursorRequest): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('upsert_cursor_position', {
      p_session_id: request.session_id,
      p_user_id: request.user_id,
      p_user_name: request.user_name,
      p_user_email: request.user_email || null,
      p_user_color: request.user_color,
      p_avatar_url: request.avatar_url || null,
      p_position_x: request.position_x,
      p_position_y: request.position_y,
      p_page_x: request.page_x ?? null,
      p_page_y: request.page_y ?? null,
      p_page_number: request.page_number ?? 1,
      p_current_action: request.current_action ?? 'idle',
    });

    if (error) {
      logger.error('Failed to upsert cursor position:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    logger.error('Error in upsertCursorPosition:', err);
    return null;
  }
}

/**
 * Deactivate a cursor (when user leaves)
 */
export async function deactivateCursor(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('deactivate_cursor', {
      p_session_id: sessionId,
      p_user_id: userId,
    });

    if (error) {
      logger.error('Failed to deactivate cursor:', error);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error in deactivateCursor:', err);
    return false;
  }
}

/**
 * Get all active cursors in a session
 */
export async function getSessionCursors(
  sessionId: string,
  excludeUserId?: string
): Promise<PersistedCursor[]> {
  try {
    const { data, error } = await supabase.rpc('get_session_cursors', {
      p_session_id: sessionId,
      p_exclude_user_id: excludeUserId || null,
    });

    if (error) {
      logger.error('Failed to get session cursors:', error);
      return [];
    }

    return (data as PersistedCursor[]) || [];
  } catch (err) {
    logger.error('Error in getSessionCursors:', err);
    return [];
  }
}

/**
 * Get a specific user's cursor in a session
 */
export async function getUserCursor(
  sessionId: string,
  userId: string
): Promise<CollaborationCursor | null> {
  try {
    const { data, error } = await supabase
      .from('collaboration_cursors')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Failed to get user cursor:', error);
      return null;
    }

    return data as CollaborationCursor;
  } catch (err) {
    logger.error('Error in getUserCursor:', err);
    return null;
  }
}

// =============================================
// Direct Table Operations (for more control)
// =============================================

/**
 * Direct update of cursor position (faster, no RPC overhead)
 */
export async function updateCursorPositionDirect(
  sessionId: string,
  userId: string,
  positionX: number,
  positionY: number,
  pageX?: number,
  pageY?: number,
  currentAction?: CursorAction
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = {
      position_x: positionX,
      position_y: positionY,
      last_seen_at: new Date().toISOString(),
      is_active: true,
    };

    if (pageX !== undefined) updates.page_x = pageX;
    if (pageY !== undefined) updates.page_y = pageY;
    if (currentAction) updates.current_action = currentAction;

    const { error } = await supabase
      .from('collaboration_cursors')
      .update(updates)
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      // If no row exists, we need to do a full upsert
      if (error.code === 'PGRST116') {
        return false; // Caller should use upsertCursorPosition
      }
      logger.error('Failed to update cursor position:', error);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error in updateCursorPositionDirect:', err);
    return false;
  }
}

// =============================================
// Cursor History (for analytics)
// =============================================

/**
 * Record cursor position in history (for analytics)
 */
export async function recordCursorHistory(
  sessionId: string,
  userId: string,
  positionX: number,
  positionY: number,
  pageNumber: number = 1
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collaboration_cursor_history')
      .insert({
        session_id: sessionId,
        user_id: userId,
        position_x: positionX,
        position_y: positionY,
        page_number: pageNumber,
      });

    if (error) {
      logger.error('Failed to record cursor history:', error);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Error in recordCursorHistory:', err);
    return false;
  }
}

// =============================================
// Cleanup Operations
// =============================================

/**
 * Cleanup stale cursors (called periodically)
 */
export async function cleanupStaleCursors(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_stale_cursors');

    if (error) {
      logger.error('Failed to cleanup stale cursors:', error);
      return 0;
    }

    return data as number;
  } catch (err) {
    logger.error('Error in cleanupStaleCursors:', err);
    return 0;
  }
}

// =============================================
// Realtime Subscription Helpers
// =============================================

/**
 * Subscribe to cursor changes in a session via Supabase Realtime
 */
export function subscribeToCursorChanges(
  sessionId: string,
  onInsert: (cursor: CollaborationCursor) => void,
  onUpdate: (cursor: CollaborationCursor, oldCursor: CollaborationCursor) => void,
  onDelete: (cursor: CollaborationCursor) => void
) {
  const channel = supabase
    .channel(`cursor-persistence:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'collaboration_cursors',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onInsert(payload.new as CollaborationCursor);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'collaboration_cursors',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onUpdate(
          payload.new as CollaborationCursor,
          payload.old as CollaborationCursor
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'collaboration_cursors',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onDelete(payload.old as CollaborationCursor);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =============================================
// Batch Operations
// =============================================

/**
 * Bulk fetch cursors for multiple sessions
 */
export async function getCursorsForSessions(
  sessionIds: string[],
  excludeUserId?: string
): Promise<Map<string, PersistedCursor[]>> {
  const result = new Map<string, PersistedCursor[]>();

  if (sessionIds.length === 0) return result;

  try {
    let query = supabase
      .from('collaboration_cursors')
      .select('*')
      .in('session_id', sessionIds)
      .eq('is_active', true)
      .gt('last_seen_at', new Date(Date.now() - 30000).toISOString());

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get cursors for sessions:', error);
      return result;
    }

    // Group by session_id
    for (const cursor of (data as CollaborationCursor[]) || []) {
      const sessionCursors = result.get(cursor.session_id) || [];
      sessionCursors.push({
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
      });
      result.set(cursor.session_id, sessionCursors);
    }

    return result;
  } catch (err) {
    logger.error('Error in getCursorsForSessions:', err);
    return result;
  }
}

// =============================================
// Export service object
// =============================================

export const cursorPersistenceService = {
  // Session management
  getOrCreateSession,
  getSessionByRoomId,

  // Cursor operations
  upsertCursorPosition,
  deactivateCursor,
  getSessionCursors,
  getUserCursor,
  updateCursorPositionDirect,

  // History
  recordCursorHistory,

  // Cleanup
  cleanupStaleCursors,

  // Subscriptions
  subscribeToCursorChanges,

  // Batch operations
  getCursorsForSessions,
};

export default cursorPersistenceService;
