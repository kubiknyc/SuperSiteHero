/**
 * Type definitions for real-time markup collaboration
 * Used for synchronizing drawing operations between multiple users
 */

import type { PresenceUser } from './types';

// Operation types for markup synchronization
export type MarkupOperationType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'TRANSFORM'
  | 'BATCH';

// Transform data for shape modifications
export interface TransformData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  points?: number[];
}

// Markup data for creation/update operations
export interface MarkupData {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  // Layer information
  layerId?: string;
  // Visibility
  visible?: boolean;
  // Additional attributes
  attrs?: Record<string, unknown>;
}

// A single markup operation to be broadcast
export interface MarkupOperation {
  id: string;
  type: MarkupOperationType;
  markupId: string;
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
  data: MarkupData | TransformData | null;
  pageNumber: number;
  // For batch operations
  operations?: MarkupOperation[];
}

// Information about a collaborator in the markup session
export interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
  currentAction?: CollaboratorAction;
  lastActivityAt: number;
  cursorPosition?: { x: number; y: number };
}

// Current action a collaborator is performing
export type CollaboratorAction =
  | 'idle'
  | 'drawing'
  | 'selecting'
  | 'transforming'
  | 'typing';

// State for the markup collaboration session
export interface MarkupSyncState {
  documentId: string;
  pageNumber: number;
  isConnected: boolean;
  activeCollaborators: CollaboratorInfo[];
  pendingOperations: MarkupOperation[];
  lastSyncTimestamp: number;
  reconnectAttempts: number;
}

// Options for joining a markup collaboration session
export interface MarkupSyncOptions {
  documentId: string;
  pageNumber: number;
  user: Pick<PresenceUser, 'id' | 'email' | 'name' | 'avatarUrl'>;
  onRemoteOperation?: (operation: MarkupOperation) => void;
  onCollaboratorsChange?: (collaborators: CollaboratorInfo[]) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onError?: (error: Error) => void;
}

// Broadcast message types
export type MarkupBroadcastEvent =
  | 'operation'
  | 'action_start'
  | 'action_end'
  | 'cursor_move';

// Message for broadcasting cursor position
export interface CursorBroadcast {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

// Message for broadcasting action state
export interface ActionBroadcast {
  userId: string;
  action: CollaboratorAction;
  markupId?: string;
  timestamp: number;
}

// Conflict resolution strategies
export type ConflictStrategy = 'last-write-wins' | 'merge' | 'reject';

// Result of a conflict resolution
export interface ConflictResolutionResult {
  resolved: boolean;
  winningOperation?: MarkupOperation;
  mergedData?: MarkupData | TransformData;
  rejectedOperations?: MarkupOperation[];
}

// Remote edit highlight data
export interface RemoteEditHighlight {
  markupId: string;
  userId: string;
  userName: string;
  userColor: string;
  action: CollaboratorAction;
  timestamp: number;
}

// Export channel name generator
export function getMarkupChannelName(documentId: string, pageNumber: number): string {
  return `markup-sync:${documentId}:${pageNumber}`;
}

// Constants for markup sync
export const MARKUP_SYNC_CONSTANTS = {
  OPERATION_DEBOUNCE_MS: 50,
  CURSOR_THROTTLE_MS: 16, // ~60fps
  STALE_HIGHLIGHT_MS: 2000,
  RECONNECT_DELAY_MS: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
  BATCH_WINDOW_MS: 100,
} as const;
