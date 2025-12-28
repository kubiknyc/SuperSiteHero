/**
 * Markup Sync Manager
 * Handles real-time synchronization of markup operations between collaborators
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserColor } from './types';
import {
  type MarkupOperation,
  type MarkupSyncOptions,
  type MarkupSyncState,
  type CollaboratorInfo,
  type CollaboratorAction,
  type MarkupData,
  type TransformData,
  type CursorBroadcast,
  type ActionBroadcast,
  getMarkupChannelName,
  MARKUP_SYNC_CONSTANTS,
} from './markup-sync-types';
import { logger } from '../utils/logger';

type OperationCallback = (operation: MarkupOperation) => void;
type CollaboratorsCallback = (collaborators: CollaboratorInfo[]) => void;
type ConnectionCallback = (isConnected: boolean) => void;

interface PendingOperation {
  operation: MarkupOperation;
  timestamp: number;
}

class MarkupSyncManager {
  private static instance: MarkupSyncManager;
  private sessions: Map<string, MarkupSyncSession> = new Map();

  private constructor() {}

  static getInstance(): MarkupSyncManager {
    if (!MarkupSyncManager.instance) {
      MarkupSyncManager.instance = new MarkupSyncManager();
    }
    return MarkupSyncManager.instance;
  }

  /**
   * Join a markup collaboration session
   */
  async joinSession(options: MarkupSyncOptions): Promise<MarkupSyncSession> {
    const sessionKey = getMarkupChannelName(options.documentId, options.pageNumber);

    // Return existing session if already joined
    const existing = this.sessions.get(sessionKey);
    if (existing) {
      existing.updateCallbacks(options);
      return existing;
    }

    const session = new MarkupSyncSession(options);
    await session.connect();

    this.sessions.set(sessionKey, session);
    return session;
  }

  /**
   * Leave a markup collaboration session
   */
  async leaveSession(documentId: string, pageNumber: number): Promise<void> {
    const sessionKey = getMarkupChannelName(documentId, pageNumber);
    const session = this.sessions.get(sessionKey);

    if (session) {
      await session.disconnect();
      this.sessions.delete(sessionKey);
    }
  }

  /**
   * Get an active session
   */
  getSession(documentId: string, pageNumber: number): MarkupSyncSession | undefined {
    const sessionKey = getMarkupChannelName(documentId, pageNumber);
    return this.sessions.get(sessionKey);
  }

  /**
   * Check if session exists
   */
  hasSession(documentId: string, pageNumber: number): boolean {
    const sessionKey = getMarkupChannelName(documentId, pageNumber);
    return this.sessions.has(sessionKey);
  }

  /**
   * Dispose all sessions
   */
  async dispose(): Promise<void> {
    const sessions = Array.from(this.sessions.values());
    await Promise.all(sessions.map(s => s.disconnect()));
    this.sessions.clear();
  }
}

/**
 * Individual markup sync session for a document page
 */
export class MarkupSyncSession {
  private channel: RealtimeChannel | null = null;
  private state: MarkupSyncState;
  private options: MarkupSyncOptions;
  private operationCallbacks: Set<OperationCallback> = new Set();
  private collaboratorCallbacks: Set<CollaboratorsCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private pendingOperations: PendingOperation[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private collaboratorTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(options: MarkupSyncOptions) {
    this.options = options;
    this.state = {
      documentId: options.documentId,
      pageNumber: options.pageNumber,
      isConnected: false,
      activeCollaborators: [],
      pendingOperations: [],
      lastSyncTimestamp: Date.now(),
      reconnectAttempts: 0,
    };

    // Register initial callbacks
    if (options.onRemoteOperation) {
      this.operationCallbacks.add(options.onRemoteOperation);
    }
    if (options.onCollaboratorsChange) {
      this.collaboratorCallbacks.add(options.onCollaboratorsChange);
    }
    if (options.onConnectionChange) {
      this.connectionCallbacks.add(options.onConnectionChange);
    }
  }

  /**
   * Update callbacks (when re-joining existing session)
   */
  updateCallbacks(options: MarkupSyncOptions): void {
    if (options.onRemoteOperation) {
      this.operationCallbacks.add(options.onRemoteOperation);
    }
    if (options.onCollaboratorsChange) {
      this.collaboratorCallbacks.add(options.onCollaboratorsChange);
    }
    if (options.onConnectionChange) {
      this.connectionCallbacks.add(options.onConnectionChange);
    }
  }

  /**
   * Connect to the collaboration channel
   */
  async connect(): Promise<void> {
    const channelName = getMarkupChannelName(
      this.options.documentId,
      this.options.pageNumber
    );

    this.channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: this.options.user.id,
        },
        broadcast: {
          self: false, // Don't receive our own broadcasts
        },
      },
    });

    // Set up event handlers
    this.channel
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync();
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        this.handlePresenceJoin(newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        this.handlePresenceLeave(leftPresences);
      })
      .on('broadcast', { event: 'operation' }, ({ payload }) => {
        this.handleRemoteOperation(payload as MarkupOperation);
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        this.handleCursorMove(payload as CursorBroadcast);
      })
      .on('broadcast', { event: 'action_start' }, ({ payload }) => {
        this.handleActionStart(payload as ActionBroadcast);
      })
      .on('broadcast', { event: 'action_end' }, ({ payload }) => {
        this.handleActionEnd(payload as ActionBroadcast);
      });

    // Subscribe and track presence
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.setConnected(true);
        this.state.reconnectAttempts = 0;

        // Track our presence
        const userColor = getUserColor(this.options.user.id);
        await this.channel?.track({
          id: this.options.user.id,
          name: this.options.user.name,
          email: this.options.user.email,
          avatarUrl: this.options.user.avatarUrl,
          color: userColor,
          currentAction: 'idle' as CollaboratorAction,
          lastActivityAt: Date.now(),
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.setConnected(false);
        this.scheduleReconnect();
      } else if (status === 'CLOSED') {
        this.setConnected(false);
      }
    });
  }

  /**
   * Disconnect from the collaboration channel
   */
  async disconnect(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.collaboratorTimeouts.forEach(t => clearTimeout(t));
    this.collaboratorTimeouts.clear();

    if (this.channel) {
      await this.channel.untrack();
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.setConnected(false);
    this.operationCallbacks.clear();
    this.collaboratorCallbacks.clear();
    this.connectionCallbacks.clear();
  }

  /**
   * Broadcast a markup creation
   */
  broadcastCreate(markup: MarkupData): void {
    this.queueOperation({
      id: crypto.randomUUID(),
      type: 'CREATE',
      markupId: markup.id,
      userId: this.options.user.id,
      userName: this.options.user.name,
      userColor: getUserColor(this.options.user.id),
      timestamp: Date.now(),
      data: markup,
      pageNumber: this.options.pageNumber,
    });
  }

  /**
   * Broadcast a markup update
   */
  broadcastUpdate(markupId: string, changes: Partial<MarkupData>): void {
    this.queueOperation({
      id: crypto.randomUUID(),
      type: 'UPDATE',
      markupId,
      userId: this.options.user.id,
      userName: this.options.user.name,
      userColor: getUserColor(this.options.user.id),
      timestamp: Date.now(),
      data: changes as MarkupData,
      pageNumber: this.options.pageNumber,
    });
  }

  /**
   * Broadcast a markup transform (position, size, rotation)
   */
  broadcastTransform(markupId: string, transform: TransformData): void {
    this.queueOperation({
      id: crypto.randomUUID(),
      type: 'TRANSFORM',
      markupId,
      userId: this.options.user.id,
      userName: this.options.user.name,
      userColor: getUserColor(this.options.user.id),
      timestamp: Date.now(),
      data: transform,
      pageNumber: this.options.pageNumber,
    });
  }

  /**
   * Broadcast a markup deletion
   */
  broadcastDelete(markupId: string): void {
    this.queueOperation({
      id: crypto.randomUUID(),
      type: 'DELETE',
      markupId,
      userId: this.options.user.id,
      userName: this.options.user.name,
      userColor: getUserColor(this.options.user.id),
      timestamp: Date.now(),
      data: null,
      pageNumber: this.options.pageNumber,
    });
  }

  /**
   * Broadcast cursor position
   */
  broadcastCursor(x: number, y: number): void {
    if (!this.channel || !this.state.isConnected) return;

    this.channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: {
        userId: this.options.user.id,
        x,
        y,
        timestamp: Date.now(),
      } as CursorBroadcast,
    });
  }

  /**
   * Broadcast action start (drawing, selecting, etc.)
   */
  broadcastActionStart(action: CollaboratorAction, markupId?: string): void {
    if (!this.channel || !this.state.isConnected) return;

    this.channel.send({
      type: 'broadcast',
      event: 'action_start',
      payload: {
        userId: this.options.user.id,
        action,
        markupId,
        timestamp: Date.now(),
      } as ActionBroadcast,
    });
  }

  /**
   * Broadcast action end
   */
  broadcastActionEnd(): void {
    if (!this.channel || !this.state.isConnected) return;

    this.channel.send({
      type: 'broadcast',
      event: 'action_end',
      payload: {
        userId: this.options.user.id,
        action: 'idle' as CollaboratorAction,
        timestamp: Date.now(),
      } as ActionBroadcast,
    });
  }

  /**
   * Get current collaborators
   */
  getCollaborators(): CollaboratorInfo[] {
    return [...this.state.activeCollaborators];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Subscribe to remote operations
   */
  onRemoteOperation(callback: OperationCallback): () => void {
    this.operationCallbacks.add(callback);
    return () => this.operationCallbacks.delete(callback);
  }

  /**
   * Subscribe to collaborator changes
   */
  onCollaboratorsChange(callback: CollaboratorsCallback): () => void {
    this.collaboratorCallbacks.add(callback);
    // Immediately notify with current state
    callback(this.state.activeCollaborators);
    return () => this.collaboratorCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection changes
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    callback(this.state.isConnected);
    return () => this.connectionCallbacks.delete(callback);
  }

  // Private methods

  private setConnected(connected: boolean): void {
    if (this.state.isConnected !== connected) {
      this.state.isConnected = connected;
      this.connectionCallbacks.forEach(cb => cb(connected));
    }
  }

  private queueOperation(operation: MarkupOperation): void {
    this.pendingOperations.push({
      operation,
      timestamp: Date.now(),
    });

    // Debounce batch sending
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushOperations();
    }, MARKUP_SYNC_CONSTANTS.OPERATION_DEBOUNCE_MS);
  }

  private flushOperations(): void {
    if (!this.channel || !this.state.isConnected) return;
    if (this.pendingOperations.length === 0) return;

    const operations = this.pendingOperations.map(p => p.operation);
    this.pendingOperations = [];

    // Send as individual operations or batch
    if (operations.length === 1) {
      this.channel.send({
        type: 'broadcast',
        event: 'operation',
        payload: operations[0],
      });
    } else {
      // Batch multiple operations
      const batchOp: MarkupOperation = {
        id: crypto.randomUUID(),
        type: 'BATCH',
        markupId: '',
        userId: this.options.user.id,
        userName: this.options.user.name,
        userColor: getUserColor(this.options.user.id),
        timestamp: Date.now(),
        data: null,
        pageNumber: this.options.pageNumber,
        operations,
      };

      this.channel.send({
        type: 'broadcast',
        event: 'operation',
        payload: batchOp,
      });
    }

    this.state.lastSyncTimestamp = Date.now();
  }

  private handlePresenceSync(): void {
    if (!this.channel) return;

    const presenceState = this.channel.presenceState();
    const collaborators: CollaboratorInfo[] = [];

    for (const presences of Object.values(presenceState)) {
      for (const presence of presences as unknown as CollaboratorInfo[]) {
        // Don't include ourselves
        if (presence.id !== this.options.user.id) {
          collaborators.push({
            id: presence.id,
            name: presence.name,
            email: presence.email,
            avatarUrl: presence.avatarUrl,
            color: presence.color || getUserColor(presence.id),
            currentAction: presence.currentAction || 'idle',
            lastActivityAt: presence.lastActivityAt || Date.now(),
            cursorPosition: presence.cursorPosition,
          });
        }
      }
    }

    this.state.activeCollaborators = collaborators;
    this.notifyCollaboratorCallbacks();
  }

  private handlePresenceJoin(newPresences: unknown[]): void {
    for (const presence of newPresences as CollaboratorInfo[]) {
      if (presence.id !== this.options.user.id) {
        // Add new collaborator if not already present
        const exists = this.state.activeCollaborators.some(c => c.id === presence.id);
        if (!exists) {
          this.state.activeCollaborators.push({
            id: presence.id,
            name: presence.name,
            email: presence.email,
            avatarUrl: presence.avatarUrl,
            color: presence.color || getUserColor(presence.id),
            currentAction: 'idle',
            lastActivityAt: Date.now(),
          });
        }
      }
    }
    this.notifyCollaboratorCallbacks();
  }

  private handlePresenceLeave(leftPresences: unknown[]): void {
    for (const presence of leftPresences as CollaboratorInfo[]) {
      this.state.activeCollaborators = this.state.activeCollaborators.filter(
        c => c.id !== presence.id
      );
      // Clear any pending timeouts
      const timeout = this.collaboratorTimeouts.get(presence.id);
      if (timeout) {
        clearTimeout(timeout);
        this.collaboratorTimeouts.delete(presence.id);
      }
    }
    this.notifyCollaboratorCallbacks();
  }

  private handleRemoteOperation(operation: MarkupOperation): void {
    // Ignore our own operations (shouldn't happen with self: false, but just in case)
    if (operation.userId === this.options.user.id) return;

    // Handle batch operations
    if (operation.type === 'BATCH' && operation.operations) {
      for (const op of operation.operations) {
        this.operationCallbacks.forEach(cb => cb(op));
      }
    } else {
      this.operationCallbacks.forEach(cb => cb(operation));
    }

    // Update collaborator's last activity
    this.updateCollaboratorActivity(operation.userId);
  }

  private handleCursorMove(cursor: CursorBroadcast): void {
    if (cursor.userId === this.options.user.id) return;

    const collaborator = this.state.activeCollaborators.find(
      c => c.id === cursor.userId
    );
    if (collaborator) {
      collaborator.cursorPosition = { x: cursor.x, y: cursor.y };
      collaborator.lastActivityAt = cursor.timestamp;
      this.notifyCollaboratorCallbacks();
    }
  }

  private handleActionStart(action: ActionBroadcast): void {
    if (action.userId === this.options.user.id) return;

    const collaborator = this.state.activeCollaborators.find(
      c => c.id === action.userId
    );
    if (collaborator) {
      collaborator.currentAction = action.action;
      collaborator.lastActivityAt = action.timestamp;
      this.notifyCollaboratorCallbacks();
    }
  }

  private handleActionEnd(action: ActionBroadcast): void {
    if (action.userId === this.options.user.id) return;

    const collaborator = this.state.activeCollaborators.find(
      c => c.id === action.userId
    );
    if (collaborator) {
      collaborator.currentAction = 'idle';
      collaborator.lastActivityAt = action.timestamp;
      this.notifyCollaboratorCallbacks();
    }
  }

  private updateCollaboratorActivity(userId: string): void {
    const collaborator = this.state.activeCollaborators.find(
      c => c.id === userId
    );
    if (collaborator) {
      collaborator.lastActivityAt = Date.now();
    }
  }

  private notifyCollaboratorCallbacks(): void {
    const collaborators = [...this.state.activeCollaborators];
    this.collaboratorCallbacks.forEach(cb => cb(collaborators));
  }

  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= MARKUP_SYNC_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Markup sync: Max reconnection attempts reached');
      this.options.onError?.(new Error('Failed to reconnect to collaboration session'));
      return;
    }

    this.state.reconnectAttempts++;
    const delay = MARKUP_SYNC_CONSTANTS.RECONNECT_DELAY_MS * this.state.reconnectAttempts;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Markup sync: Reconnection failed', error);
        this.scheduleReconnect();
      }
    }, delay);
  }
}

// Export singleton instance
export const markupSyncManager = MarkupSyncManager.getInstance();

// Export class for testing
export { MarkupSyncManager };
