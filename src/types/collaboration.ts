/**
 * TypeScript types for real-time collaboration and cursor persistence
 */

// =============================================
// Collaboration Session Types
// =============================================

export type RoomType = 'document' | 'project' | 'markup' | 'general';

export interface CollaborationSession {
  id: string;
  room_id: string;
  room_type: RoomType;
  resource_id: string | null;
  resource_type: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  max_participants: number;
  is_active: boolean;
}

export interface CreateSessionRequest {
  room_id: string;
  room_type?: RoomType;
  resource_id?: string;
  resource_type?: string;
}

// =============================================
// Cursor Types
// =============================================

export type CursorAction = 'idle' | 'drawing' | 'selecting' | 'transforming' | 'typing';

export interface CursorPosition {
  x: number;
  y: number;
  pageX?: number;
  pageY?: number;
}

export interface PersistedCursor {
  cursor_id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_color: string;
  avatar_url: string | null;
  position_x: number;
  position_y: number;
  page_x: number | null;
  page_y: number | null;
  page_number: number;
  current_action: CursorAction;
  last_seen_at: string;
}

export interface CollaborationCursor {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_color: string;
  avatar_url: string | null;
  position_x: number;
  position_y: number;
  page_x: number | null;
  page_y: number | null;
  page_number: number;
  current_action: CursorAction;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
  is_active: boolean;
}

export interface UpsertCursorRequest {
  session_id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_color: string;
  avatar_url?: string;
  position_x: number;
  position_y: number;
  page_x?: number;
  page_y?: number;
  page_number?: number;
  current_action?: CursorAction;
}

// =============================================
// Cursor History Types (for analytics)
// =============================================

export interface CursorHistoryEntry {
  id: string;
  session_id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  page_number: number;
  recorded_at: string;
}

// =============================================
// API Response Types
// =============================================

export interface GetSessionCursorsResponse {
  cursors: PersistedCursor[];
  session_id: string;
}

export interface CursorPersistenceResult {
  success: boolean;
  cursor_id?: string;
  error?: string;
}

export interface SessionResult {
  success: boolean;
  session_id?: string;
  error?: string;
}

// =============================================
// Realtime Subscription Types
// =============================================

export type CursorChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface CursorChangeEvent {
  type: CursorChangeType;
  cursor: CollaborationCursor;
  old_cursor?: CollaborationCursor;
}

export interface CursorSubscriptionOptions {
  session_id: string;
  exclude_user_id?: string;
  onCursorChange: (event: CursorChangeEvent) => void;
  onError?: (error: Error) => void;
}

// =============================================
// Hook Types
// =============================================

export interface UseCursorPersistenceOptions {
  roomId: string;
  roomType?: RoomType;
  resourceId?: string;
  resourceType?: string;
  enabled?: boolean;
  persistInterval?: number; // How often to persist cursor position (ms)
  pageNumber?: number;
}

export interface UseCursorPersistenceReturn {
  /** Session ID for the current room */
  sessionId: string | null;
  /** Persisted cursors from other users */
  persistedCursors: PersistedCursor[];
  /** Whether persistence is connected */
  isConnected: boolean;
  /** Persist current cursor position */
  persistCursor: (position: CursorPosition, action?: CursorAction) => Promise<void>;
  /** Deactivate cursor when leaving */
  deactivateCursor: () => Promise<void>;
  /** Fetch latest cursors manually */
  refreshCursors: () => Promise<void>;
}

// =============================================
// Utility Types
// =============================================

/** Converts a PersistedCursor to the format used by useLiveCursors */
export interface LiveCursorFromPersisted {
  userId: string;
  userName: string;
  color: string;
  position: CursorPosition;
  lastUpdate: number;
  avatarUrl?: string;
}

/** Convert persisted cursor to live cursor format */
export function toliveCursor(cursor: PersistedCursor): LiveCursorFromPersisted {
  return {
    userId: cursor.user_id,
    userName: cursor.user_name,
    color: cursor.user_color,
    position: {
      x: cursor.position_x,
      y: cursor.position_y,
      pageX: cursor.page_x ?? undefined,
      pageY: cursor.page_y ?? undefined,
    },
    lastUpdate: new Date(cursor.last_seen_at).getTime(),
    avatarUrl: cursor.avatar_url ?? undefined,
  };
}

/** Convert multiple persisted cursors */
export function toLiveCursors(cursors: PersistedCursor[]): LiveCursorFromPersisted[] {
  return cursors.map(toliveCursor);
}
