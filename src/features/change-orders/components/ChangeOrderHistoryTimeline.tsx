// File: /src/features/change-orders/components/ChangeOrderHistoryTimeline.tsx
// Timeline view of change order history and audit trail

import { format, formatDistanceToNow } from 'date-fns'
import { useChangeOrderHistory } from '../hooks/useChangeOrdersV2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  History,
  User,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Trash2,
  Send,
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  Loader2,
  Ban,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChangeOrderHistory } from '@/types/change-order'

interface ChangeOrderHistoryTimelineProps {
  changeOrderId: string
  maxItems?: number
  showHeader?: boolean
}

// Map actions to icons and colors
const ACTION_CONFIG: Record<
  string,
  { icon: typeof History; color: string; bgColor: string; label: string }
> = {
  created: {
    icon: Plus,
    color: 'text-success',
    bgColor: 'bg-success-light',
    label: 'Created',
  },
  updated: {
    icon: Edit,
    color: 'text-primary dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-950',
    label: 'Updated',
  },
  submitted: {
    icon: Send,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'Submitted',
  },
  estimate_submitted: {
    icon: FileText,
    color: 'text-primary dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-950',
    label: 'Estimate Submitted',
  },
  internal_approved: {
    icon: CheckCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Internally Approved',
  },
  internal_rejected: {
    icon: XCircle,
    color: 'text-error',
    bgColor: 'bg-error-light',
    label: 'Internally Rejected',
  },
  owner_submitted: {
    icon: Send,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Submitted to Owner',
  },
  owner_approved: {
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success-light',
    label: 'Owner Approved',
  },
  owner_rejected: {
    icon: XCircle,
    color: 'text-error',
    bgColor: 'bg-error-light',
    label: 'Owner Rejected',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success-light',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-error',
    bgColor: 'bg-error-light',
    label: 'Rejected',
  },
  voided: {
    icon: Ban,
    color: 'text-secondary',
    bgColor: 'bg-muted',
    label: 'Voided',
  },
  void: {
    icon: Ban,
    color: 'text-secondary',
    bgColor: 'bg-muted',
    label: 'Voided',
  },
  status_change: {
    icon: RefreshCw,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Status Changed',
  },
  amount_changed: {
    icon: DollarSign,
    color: 'text-success',
    bgColor: 'bg-success-light',
    label: 'Amount Updated',
  },
  item_added: {
    icon: Plus,
    color: 'text-primary dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-950',
    label: 'Item Added',
  },
  item_updated: {
    icon: Edit,
    color: 'text-primary dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-950',
    label: 'Item Updated',
  },
  item_deleted: {
    icon: Trash2,
    color: 'text-error',
    bgColor: 'bg-error-light',
    label: 'Item Deleted',
  },
  attachment_added: {
    icon: FileText,
    color: 'text-primary dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-950',
    label: 'Attachment Added',
  },
  assignment_changed: {
    icon: User,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Assignment Changed',
  },
  default: {
    icon: History,
    color: 'text-secondary',
    bgColor: 'bg-muted',
    label: 'Change',
  },
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action.toLowerCase()] || ACTION_CONFIG.default
}

// Format field name for display
function formatFieldName(field: string | null): string {
  if (!field) {return ''}
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

// Format value for display
function formatValue(value: string | null, field: string | null): string {
  if (value === null || value === undefined) {return 'None'}
  if (value === '') {return 'Empty'}

  // Handle numeric fields
  if (field?.includes('amount') || field?.includes('cost')) {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(num)
    }
  }

  // Handle date fields
  if (field?.includes('date') || field?.includes('_at')) {
    try {
      return format(new Date(value), 'MMM d, yyyy')
    } catch {
      return value
    }
  }

  // Handle status values
  if (field === 'status') {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return value
}

export function ChangeOrderHistoryTimeline({
  changeOrderId,
  maxItems,
  showHeader = true,
}: ChangeOrderHistoryTimelineProps) {
  const { data: history, isLoading, error } = useChangeOrderHistory(changeOrderId)

  // Limit items if maxItems is specified
  const displayHistory = maxItems ? history?.slice(0, maxItems) : history

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-disabled mb-4" />
          <p className="text-muted">Loading history...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-error-light">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-error mb-4" />
          <p className="text-error">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change History
            {history && history.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {history.length} events
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && 'pt-6')}>
        {displayHistory && displayHistory.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

            {/* Timeline items */}
            <div className="space-y-6">
              {displayHistory.map((entry, index) => {
                const config = getActionConfig(entry.action)
                const Icon = config.icon
                const isFirst = index === 0
                const timeAgo = formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })

                return (
                  <div key={entry.id} className="relative flex gap-4 pl-2">
                    {/* Icon */}
                    <div
                      className={cn(
                        'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        config.bgColor,
                        isFirst && 'ring-2 ring-white shadow-sm'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-medium', config.color)}>{config.label}</span>
                            {entry.field_changed && (
                              <Badge variant="outline" className="text-xs">
                                {formatFieldName(entry.field_changed)}
                              </Badge>
                            )}
                          </div>

                          {/* Value change display */}
                          {entry.old_value !== null && entry.new_value !== null && (
                            <div className="mt-1 text-sm flex items-center gap-2">
                              <span className="text-muted line-through">
                                {formatValue(entry.old_value, entry.field_changed)}
                              </span>
                              <span className="text-disabled">→</span>
                              <span className="text-foreground font-medium">
                                {formatValue(entry.new_value, entry.field_changed)}
                              </span>
                            </div>
                          )}

                          {/* Notes */}
                          {entry.notes && (
                            <p className="mt-1 text-sm text-secondary italic">{entry.notes}</p>
                          )}

                          {/* User and time */}
                          <div className="mt-2 flex items-center gap-3 text-xs text-disabled">
                            {entry.changed_by_user ? (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.changed_by_user.full_name}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                System
                              </span>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo}
                            </span>
                          </div>
                        </div>

                        {/* Full timestamp on hover */}
                        <span
                          className="text-xs text-disabled shrink-0"
                          title={format(new Date(entry.changed_at), 'PPpp')}
                        >
                          {format(new Date(entry.changed_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Show more indicator */}
            {maxItems && history && history.length > maxItems && (
              <div className="mt-4 text-center">
                <Badge variant="outline" className="text-muted">
                  + {history.length - maxItems} more events
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted">No history recorded yet</p>
            <p className="text-xs text-disabled mt-1">
              Changes will be tracked as the change order progresses
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ChangeOrderHistoryTimeline
