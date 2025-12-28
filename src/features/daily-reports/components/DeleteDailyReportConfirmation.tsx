// File: /src/features/daily-reports/components/DeleteDailyReportConfirmation.tsx
// Delete daily report confirmation with toast notifications

import { useDeleteDailyReportWithNotification } from '../hooks/useDailyReportsMutations'
import { useToast } from '@/lib/notifications/ToastContext'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { logger } from '../../../lib/utils/logger';


interface DeleteDailyReportConfirmationProps {
  reportId: string
  reportDate: string
  onSuccess?: () => void
}

/**
 * DeleteDailyReportConfirmation Component
 * Shows a confirmation dialog via toast before deleting a daily report
 * Handles the deletion with automatic success/error notifications
 */
export function DeleteDailyReportConfirmation({
  reportId,
  reportDate,
  onSuccess,
}: DeleteDailyReportConfirmationProps) {
  const deleteReport = useDeleteDailyReportWithNotification()
  const { addToast } = useToast()

  const handleDelete = () => {
    // Show confirmation toast with action button
    addToast('warning', 'Confirm Delete', `Delete daily report for ${reportDate}? This cannot be undone.`, {
      action: {
        label: 'Yes, delete',
        onClick: async () => {
          try {
            await deleteReport.mutateAsync(reportId)
            // Success toast shown automatically by mutation hook
            onSuccess?.()
          } catch (_error) {
            // Error toast shown automatically by mutation hook
            logger.error('Failed to delete daily report:', error)
          }
        },
      },
    })
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={deleteReport.isPending}
      variant="ghost"
      size="sm"
      className="text-error hover:text-error-dark hover:bg-error-light"
      title="Delete report"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
