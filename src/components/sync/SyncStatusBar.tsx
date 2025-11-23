// File: /src/components/sync/SyncStatusBar.tsx
// Combined sync status indicators for the app header

import { OfflineIndicator } from './OfflineIndicator'
import { SyncQueueBadge } from './SyncQueueBadge'
import { SyncStatusIndicator } from './SyncStatusIndicator'

/**
 * SyncStatusBar Component
 * Displays all sync-related indicators:
 * - Online/Offline status
 * - Pending changes count
 * - Sync operation status
 *
 * Typically placed in the app header for visibility
 */
export function SyncStatusBar() {
  return (
    <div className="flex items-center gap-3">
      <OfflineIndicator />
      <SyncQueueBadge />
      <SyncStatusIndicator />
    </div>
  )
}
