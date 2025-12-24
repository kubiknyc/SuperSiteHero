// File: /src/components/sync/SyncQueueBadge.tsx
// Shows count of pending changes in sync queue

import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore'
import { Clock } from 'lucide-react'

/**
 * SyncQueueBadge Component
 * Displays the number of pending changes waiting to be synced
 * Only visible when there are items in the sync queue
 */
export function SyncQueueBadge() {
  const syncQueue = useOfflineReportStore((state) => state.syncQueue)

  if (syncQueue.length === 0) {
    return null
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning-light border border-amber-200"
      title={`${syncQueue.length} pending change${syncQueue.length !== 1 ? 's' : ''}`}
    >
      <Clock className="h-4 w-4 text-warning animate-spin" />
      <span className="text-xs font-medium text-amber-700">
        {syncQueue.length} pending
      </span>
    </div>
  )
}
