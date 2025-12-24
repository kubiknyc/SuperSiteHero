// File: /src/components/sync/SyncStatusIndicator.tsx
// Shows overall sync status with error details

import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

/**
 * SyncStatusIndicator Component
 * Displays the current sync status:
 * - idle: No sync in progress
 * - syncing: Currently syncing changes
 * - success: Last sync was successful
 * - error: Last sync had an error
 */
export function SyncStatusIndicator() {
  const syncStatus = useOfflineReportStore((state) => state.syncStatus)
  const syncError = useOfflineReportStore((state) => state.syncError)

  if (syncStatus === 'idle') {
    return null
  }

  const getIndicatorContent = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
          label: 'Syncing...',
          className: 'bg-blue-50 border-blue-200',
          textColor: 'text-primary-hover',
          tooltip: 'Changes are being synced to the server',
        }
      case 'success':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-success" />,
          label: 'Synced',
          className: 'bg-success-light border-green-200',
          textColor: 'text-success-dark',
          tooltip: 'All changes have been synced successfully',
        }
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4 text-error" />,
          label: 'Sync Failed',
          className: 'bg-error-light border-red-200',
          textColor: 'text-error-dark',
          tooltip: syncError || 'An error occurred during sync. Please try again.',
        }
      default:
        return null
    }
  }

  const content = getIndicatorContent()
  if (!content) {return null}

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md border ${content.className}`}
      title={content.tooltip}
    >
      {content.icon}
      <span className={`text-xs font-medium ${content.textColor}`}>
        {content.label}
      </span>
    </div>
  )
}
