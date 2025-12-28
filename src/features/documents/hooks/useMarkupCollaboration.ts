/**
 * React hook for real-time markup collaboration
 * Provides synchronized drawing/annotation capabilities between multiple users
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  markupSyncManager,
  MarkupSyncSession,
} from '@/lib/realtime/markup-sync';
import type {
  MarkupOperation,
  CollaboratorInfo,
  MarkupData,
  TransformData,
  CollaboratorAction,
  RemoteEditHighlight,
} from '@/lib/realtime/markup-sync-types';
import { MARKUP_SYNC_CONSTANTS } from '@/lib/realtime/markup-sync-types';

interface UseMarkupCollaborationOptions {
  documentId: string;
  pageNumber: number;
  enabled?: boolean;
  onRemoteCreate?: (operation: MarkupOperation) => void;
  onRemoteUpdate?: (operation: MarkupOperation) => void;
  onRemoteTransform?: (operation: MarkupOperation) => void;
  onRemoteDelete?: (operation: MarkupOperation) => void;
}

interface UseMarkupCollaborationReturn {
  // Connection state
  isConnected: boolean;
  isCollaborating: boolean;

  // Collaborators
  collaborators: CollaboratorInfo[];
  collaboratorCount: number;

  // Remote edit highlights
  remoteEditHighlights: RemoteEditHighlight[];

  // Broadcasting functions
  broadcastCreate: (markup: MarkupData) => void;
  broadcastUpdate: (markupId: string, changes: Partial<MarkupData>) => void;
  broadcastTransform: (markupId: string, transform: TransformData) => void;
  broadcastDelete: (markupId: string) => void;
  broadcastCursor: (x: number, y: number) => void;
  broadcastActionStart: (action: CollaboratorAction, markupId?: string) => void;
  broadcastActionEnd: () => void;

  // Session management
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Hook for enabling real-time markup collaboration on a document
 */
export function useMarkupCollaboration(
  options: UseMarkupCollaborationOptions
): UseMarkupCollaborationReturn {
  const {
    documentId,
    pageNumber,
    enabled = true,
    onRemoteCreate,
    onRemoteUpdate,
    onRemoteTransform,
    onRemoteDelete,
  } = options;

  const { userProfile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [remoteEditHighlights, setRemoteEditHighlights] = useState<RemoteEditHighlight[]>([]);

  const sessionRef = useRef<MarkupSyncSession | null>(null);
  const highlightTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cursorThrottleRef = useRef<number>(0);

  // Handle remote operations
  const handleRemoteOperation = useCallback((operation: MarkupOperation) => {
    // Update remote edit highlights
    if (operation.type !== 'DELETE') {
      const highlight: RemoteEditHighlight = {
        markupId: operation.markupId,
        userId: operation.userId,
        userName: operation.userName,
        userColor: operation.userColor,
        action: operation.type === 'CREATE' ? 'drawing' :
               operation.type === 'TRANSFORM' ? 'transforming' : 'selecting',
        timestamp: operation.timestamp,
      };

      setRemoteEditHighlights(prev => {
        const filtered = prev.filter(h => h.markupId !== operation.markupId);
        return [...filtered, highlight];
      });

      // Clear highlight after timeout
      const existingTimeout = highlightTimeoutsRef.current.get(operation.markupId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        setRemoteEditHighlights(prev =>
          prev.filter(h => h.markupId !== operation.markupId)
        );
        highlightTimeoutsRef.current.delete(operation.markupId);
      }, MARKUP_SYNC_CONSTANTS.STALE_HIGHLIGHT_MS);

      highlightTimeoutsRef.current.set(operation.markupId, timeout);
    }

    // Call appropriate callback based on operation type
    switch (operation.type) {
      case 'CREATE':
        onRemoteCreate?.(operation);
        break;
      case 'UPDATE':
        onRemoteUpdate?.(operation);
        break;
      case 'TRANSFORM':
        onRemoteTransform?.(operation);
        break;
      case 'DELETE':
        onRemoteDelete?.(operation);
        // Clear highlight for deleted markup
        setRemoteEditHighlights(prev =>
          prev.filter(h => h.markupId !== operation.markupId)
        );
        break;
    }
  }, [onRemoteCreate, onRemoteUpdate, onRemoteTransform, onRemoteDelete]);

  // Handle collaborator changes
  const handleCollaboratorsChange = useCallback((newCollaborators: CollaboratorInfo[]) => {
    setCollaborators(newCollaborators);
  }, []);

  // Handle connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Connect to collaboration session
  const connect = useCallback(async () => {
    if (!userProfile || !enabled) {return;}

    try {
      const session = await markupSyncManager.joinSession({
        documentId,
        pageNumber,
        user: {
          id: userProfile.id,
          email: userProfile.email || '',
          name: userProfile.display_name || userProfile.email || 'Unknown User',
          avatarUrl: userProfile.avatar_url || undefined,
        },
        onRemoteOperation: handleRemoteOperation,
        onCollaboratorsChange: handleCollaboratorsChange,
        onConnectionChange: handleConnectionChange,
      });

      sessionRef.current = session;
    } catch (error) {
      console.error('Failed to connect to markup collaboration:', error);
    }
  }, [
    userProfile,
    enabled,
    documentId,
    pageNumber,
    handleRemoteOperation,
    handleCollaboratorsChange,
    handleConnectionChange,
  ]);

  // Disconnect from collaboration session
  const disconnect = useCallback(async () => {
    await markupSyncManager.leaveSession(documentId, pageNumber);
    sessionRef.current = null;
    setIsConnected(false);
    setCollaborators([]);
    setRemoteEditHighlights([]);

    // Clear all highlight timeouts
    highlightTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    highlightTimeoutsRef.current.clear();
  }, [documentId, pageNumber]);

  // Broadcasting functions
  const broadcastCreate = useCallback((markup: MarkupData) => {
    sessionRef.current?.broadcastCreate(markup);
  }, []);

  const broadcastUpdate = useCallback((markupId: string, changes: Partial<MarkupData>) => {
    sessionRef.current?.broadcastUpdate(markupId, changes);
  }, []);

  const broadcastTransform = useCallback((markupId: string, transform: TransformData) => {
    sessionRef.current?.broadcastTransform(markupId, transform);
  }, []);

  const broadcastDelete = useCallback((markupId: string) => {
    sessionRef.current?.broadcastDelete(markupId);
  }, []);

  const broadcastCursor = useCallback((x: number, y: number) => {
    // Throttle cursor broadcasts
    const now = Date.now();
    if (now - cursorThrottleRef.current < MARKUP_SYNC_CONSTANTS.CURSOR_THROTTLE_MS) {
      return;
    }
    cursorThrottleRef.current = now;
    sessionRef.current?.broadcastCursor(x, y);
  }, []);

  const broadcastActionStart = useCallback((action: CollaboratorAction, markupId?: string) => {
    sessionRef.current?.broadcastActionStart(action, markupId);
  }, []);

  const broadcastActionEnd = useCallback(() => {
    sessionRef.current?.broadcastActionEnd();
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled && userProfile && documentId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, userProfile, documentId, pageNumber]); // Don't include connect/disconnect to avoid loops

  // Computed values
  const isCollaborating = useMemo(() =>
    isConnected && collaborators.length > 0,
    [isConnected, collaborators.length]
  );

  const collaboratorCount = useMemo(() =>
    collaborators.length,
    [collaborators.length]
  );

  return {
    isConnected,
    isCollaborating,
    collaborators,
    collaboratorCount,
    remoteEditHighlights,
    broadcastCreate,
    broadcastUpdate,
    broadcastTransform,
    broadcastDelete,
    broadcastCursor,
    broadcastActionStart,
    broadcastActionEnd,
    connect,
    disconnect,
  };
}

/**
 * Hook to get a collaborator's display color
 */
export function useCollaboratorColor(userId: string): string {
  return useMemo(() => {
    // Simple hash function for consistent colors
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }

    const colors = [
      '#EF4444', '#F97316', '#EAB308', '#22C55E',
      '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
    ];

    return colors[Math.abs(hash) % colors.length];
  }, [userId]);
}

/**
 * Hook for debounced transform broadcasting
 * Useful for continuous operations like dragging
 */
export function useDebouncedTransformBroadcast(
  broadcastTransform: (markupId: string, transform: TransformData) => void,
  delay: number = MARKUP_SYNC_CONSTANTS.OPERATION_DEBOUNCE_MS
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTransformRef = useRef<{ markupId: string; transform: TransformData } | null>(null);

  const debouncedBroadcast = useCallback((markupId: string, transform: TransformData) => {
    latestTransformRef.current = { markupId, transform };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (latestTransformRef.current) {
        broadcastTransform(
          latestTransformRef.current.markupId,
          latestTransformRef.current.transform
        );
        latestTransformRef.current = null;
      }
    }, delay);
  }, [broadcastTransform, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Flush any pending broadcasts
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (latestTransformRef.current) {
      broadcastTransform(
        latestTransformRef.current.markupId,
        latestTransformRef.current.transform
      );
      latestTransformRef.current = null;
    }
  }, [broadcastTransform]);

  return { debouncedBroadcast, flush };
}
