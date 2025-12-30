/**
 * Offline-First Integration Example
 *
 * This example shows how to integrate all the offline-first components
 * into a real-world feature (e.g., punch list management)
 */

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { SyncBadge } from '@/components/SyncBadge';
import { ConflictResolutionDialog } from '@/components/ConflictResolutionDialog';
import { detectConflict, createConflictInfo, type ConflictInfo } from '@/lib/offline/conflictResolution';

// Example: Punch List Item
interface PunchListItem {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  due_date: string;
  updated_at: number;
  // Offline sync metadata
  syncStatus: 'synced' | 'pending' | 'syncing' | 'error' | 'conflict';
  lastSyncedAt?: number;
}

// Example offline store type (simplified - in production use Zustand)
// Note: This interface documents the expected store shape for reference
// interface OfflineStore {
//   items: PunchListItem[];
//   pendingQueue: Array<{
//     id: string;
//     action: 'create' | 'update' | 'delete';
//     item: PunchListItem;
//     timestamp: number;
//   }>;
//   conflicts: ConflictInfo<PunchListItem>[];
// }

/**
 * Example Component: Offline-Aware Punch List
 */
export function OfflinePunchListExample() {
  // Network status
  const { isOnline, networkQuality } = useOnlineStatus();

  // Local state (in production, use Zustand or similar)
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeConflict, setActiveConflict] = useState<ConflictInfo<PunchListItem> | null>(null);

  // Simulated pending syncs count
  const pendingSyncs = items.filter(item => item.syncStatus === 'pending').length;

  /**
   * Create or update item (works offline)
   */
  const saveItem = async (item: PunchListItem) => {
    // Update local state immediately (optimistic update)
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      const updated = {
        ...item,
        syncStatus: isOnline ? 'syncing' : 'pending',
        updated_at: Date.now(),
      } as PunchListItem;

      if (existing) {
        return prev.map(i => i.id === item.id ? updated : i);
      } else {
        return [...prev, updated];
      }
    });

    if (!isOnline) {
      // Queue for later sync
      console.info('Offline: Queued item for sync', item.id);
      return;
    }

    // Online: sync immediately
    try {
      await syncItemToServer(item);
    } catch (error) {
      console.error('Failed to sync item:', error);
      setItems(prev =>
        prev.map(i => i.id === item.id
          ? { ...i, syncStatus: 'error' }
          : i
        )
      );
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    }
  };

  /**
   * Sync item to server with conflict detection
   */
  const syncItemToServer = useCallback(async (item: PunchListItem) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      // Fetch current server version
      const serverItem = await fetchItemFromServer(item.id);

      if (serverItem) {
        // Check for conflicts
        const hasConflict = detectConflict(
          item,
          serverItem,
          item.updated_at,
          serverItem.updated_at
        );

        if (hasConflict) {
          // Conflict detected - pause sync and show dialog
          const conflict = createConflictInfo(
            'punch_list_items',
            item.id,
            item,
            serverItem,
            item.updated_at,
            serverItem.updated_at
          );

          setActiveConflict(conflict);
          setItems(prev =>
            prev.map(i => i.id === item.id
              ? { ...i, syncStatus: 'conflict' }
              : i
            )
          );
          return;
        }
      }

      // No conflict - proceed with sync
      await updateItemOnServer(item);

      // Success - update local state
      setItems(prev =>
        prev.map(i => i.id === item.id
          ? { ...i, syncStatus: 'synced', lastSyncedAt: Date.now() }
          : i
        )
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Process all pending syncs when coming back online
   */
  const processPendingQueue = useCallback(async () => {
    const pending = items.filter(item => item.syncStatus === 'pending');

    if (pending.length === 0 || !isOnline) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    for (const item of pending) {
      try {
        await syncItemToServer(item);
      } catch (error) {
        console.error('Failed to sync pending item:', error);
        // Continue with other items
      }
    }

    setIsSyncing(false);
  }, [items, isOnline, syncItemToServer]);

  /**
   * Handle conflict resolution
   */
  const handleResolveConflict = async (resolution: 'local' | 'server' | 'merge') => {
    if (!activeConflict) {return;}

    let resolvedItem: PunchListItem;

    switch (resolution) {
      case 'local':
        resolvedItem = activeConflict.localVersion;
        break;
      case 'server':
        resolvedItem = activeConflict.serverVersion;
        break;
      case 'merge':
        // Smart merge: use local for user-editable fields, server for system fields
        resolvedItem = {
          ...activeConflict.serverVersion,
          ...activeConflict.localVersion,
          // Server wins for system fields
          id: activeConflict.serverVersion.id,
          updated_at: Date.now(),
        };
        break;
      default:
        return;
    }

    // Update local state
    setItems(prev =>
      prev.map(i => i.id === activeConflict.entityId ? resolvedItem : i)
    );

    // Sync resolved version to server
    try {
      await updateItemOnServer(resolvedItem);
      setActiveConflict(null);
    } catch (error) {
      console.error('Failed to sync resolved conflict:', error);
      setSyncError('Failed to sync resolved conflict');
    }
  };

  /**
   * Auto-sync when coming back online
   */
  useEffect(() => {
    if (isOnline && pendingSyncs > 0) {
      const timer = setTimeout(() => {
        processPendingQueue();
      }, 1000); // Wait 1 second after reconnection

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSyncs, processPendingQueue]);

  /**
   * Retry sync on error
   */
  const handleRetrySync = () => {
    setSyncError(null);
    processPendingQueue();
  };

  return (
    <div className="space-y-4">
      {/* Global sync status banner */}
      <SyncStatusBanner
        pendingSyncs={pendingSyncs}
        isSyncing={isSyncing}
        syncError={syncError}
        onRetrySync={handleRetrySync}
      />

      {/* Network quality indicator (optional) */}
      {networkQuality.type === 'slow' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
          Slow connection detected ({networkQuality.effectiveType}) - syncing may be delayed
        </div>
      )}

      {/* Punch list items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Punch List Items</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isOnline ? (
              <span className="text-green-600">Online</span>
            ) : (
              <span className="text-yellow-600">Offline</span>
            )}
          </div>
        </div>

        {items.map(item => (
          <div
            key={item.id}
            className="border rounded-lg p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded ${
                    item.priority === 'high' ? 'bg-red-100 text-red-800' :
                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.priority}
                  </span>
                  <span>{item.status}</span>
                  <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Sync status badge */}
              <SyncBadge
                status={item.syncStatus}
                showLabel={true}
                size="md"
              />
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No punch list items yet
          </div>
        )}
      </div>

      {/* Conflict resolution dialog */}
      {activeConflict && (
        <ConflictResolutionDialog
          conflict={activeConflict}
          open={true}
          onResolve={handleResolveConflict}
          onClose={() => setActiveConflict(null)}
          entityDisplayName="punch list item"
        />
      )}

      {/* Example: Add item button */}
      <button
        onClick={() => saveItem({
          id: `item-${Date.now()}`,
          title: 'Test Punch Item',
          description: 'Test description',
          status: 'open',
          priority: 'medium',
          assigned_to: 'user123',
          due_date: new Date().toISOString(),
          updated_at: Date.now(),
          syncStatus: 'pending',
        })}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Add Test Item {!isOnline && '(Offline)'}
      </button>
    </div>
  );
}

// Mock API functions (replace with real API calls)
async function fetchItemFromServer(_id: string): Promise<PunchListItem | null> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  return null; // Not found
}

async function updateItemOnServer(item: PunchListItem): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.info('Synced to server:', item.id);
}

export default OfflinePunchListExample;
