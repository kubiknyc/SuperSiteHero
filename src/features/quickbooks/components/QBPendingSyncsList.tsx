/**
 * QuickBooks Pending Syncs List
 *
 * Display pending and failed sync items with retry/cancel actions
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RefreshCw, X, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { QBSyncStatusBadge } from './QBSyncStatusBadge'
import { useRetrySync, useCancelPendingSync } from '../hooks/useQuickBooks'
import { formatDistanceToNow } from 'date-fns'
import type { QBPendingSync } from '@/types/quickbooks'
import { logger } from '../../../lib/utils/logger';


interface QBPendingSyncsListProps {
  items: QBPendingSync[]
  compact?: boolean
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  subcontractors: 'Vendor',
  payment_applications: 'Invoice',
  change_orders: 'Bill',
  cost_transactions: 'Expense',
  projects: 'Customer',
}

export function QBPendingSyncsList({ items, compact = false }: QBPendingSyncsListProps) {
  const retrySync = useRetrySync()
  const cancelSync = useCancelPendingSync()

  const handleRetry = async (itemId: string) => {
    try {
      await retrySync.mutateAsync(itemId)
    } catch (error) {
      logger.error('Failed to retry sync:', error)
    }
  }

  const handleCancel = async (itemId: string) => {
    try {
      await cancelSync.mutateAsync(itemId)
    } catch (error) {
      logger.error('Failed to cancel sync:', error)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No pending or failed syncs.
      </div>
    )
  }

  const failedItems = items.filter((item) => item.status === 'failed')
  const pendingItems = items.filter((item) => item.status === 'pending')

  if (compact) {
    return (
      <div className="space-y-2">
        {failedItems.length > 0 && (
          <div className="text-xs font-medium text-error mb-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {failedItems.length} failed
          </div>
        )}
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-2 border rounded-md text-sm ${
              item.status === 'failed' ? 'border-red-200 bg-error-light' : ''
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {item.status === 'failed' ? (
                <AlertCircle className="h-4 w-4 text-error flex-shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-warning flex-shrink-0" />
              )}
              <span className="truncate">
                {ENTITY_TYPE_LABELS[item.local_entity_type] || item.local_entity_type}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleRetry(item.id)}
                disabled={retrySync.isPending}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {items.length > 5 && (
          <div className="text-xs text-muted-foreground text-center">
            +{items.length - 5} more items
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {failedItems.length > 0 && (
        <div>
          <div className="text-sm font-medium text-error mb-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Failed Syncs ({failedItems.length})
          </div>
          <div className="space-y-2">
            {failedItems.map((item) => (
              <PendingSyncItem
                key={item.id}
                item={item}
                onRetry={handleRetry}
                onCancel={handleCancel}
                isRetrying={retrySync.isPending}
                isCancelling={cancelSync.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {pendingItems.length > 0 && (
        <div>
          <div className="text-sm font-medium text-warning mb-2 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Pending Syncs ({pendingItems.length})
          </div>
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <PendingSyncItem
                key={item.id}
                item={item}
                onRetry={handleRetry}
                onCancel={handleCancel}
                isRetrying={retrySync.isPending}
                isCancelling={cancelSync.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface PendingSyncItemProps {
  item: QBPendingSync
  onRetry: (id: string) => void
  onCancel: (id: string) => void
  isRetrying: boolean
  isCancelling: boolean
}

function PendingSyncItem({
  item,
  onRetry,
  onCancel,
  isRetrying,
  isCancelling,
}: PendingSyncItemProps) {
  const isFailed = item.status === 'failed'

  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg ${
        isFailed ? 'border-red-200 bg-error-light' : 'border-yellow-200 bg-warning-light'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {ENTITY_TYPE_LABELS[item.local_entity_type] || item.local_entity_type}
          </Badge>
          <QBSyncStatusBadge status={item.status} size="sm" />
          {item.priority > 5 && (
            <Badge variant="outline" className="text-xs">
              High Priority
            </Badge>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground truncate">
          ID: {item.local_entity_id}
        </div>
        {item.last_error && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-1 text-xs text-error truncate cursor-help">
                  Error: {item.last_error}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{item.last_error}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {item.attempt_count > 0 && (
            <span>Attempts: {item.attempt_count}/{item.max_attempts} &bull; </span>
          )}
          <span>
            Scheduled {formatDistanceToNow(new Date(item.scheduled_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRetry(item.id)}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </>
          )}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-error hover:text-error-dark"
              disabled={isCancelling}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Sync?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the item from the sync queue. You can manually sync it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onCancel(item.id)}
                className="bg-error hover:bg-red-700"
              >
                Cancel Sync
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
