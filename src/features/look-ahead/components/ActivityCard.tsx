/**
 * ActivityCard Component
 * Card representing a single activity in the look-ahead schedule
 */

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui'
import {
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Users,
  MoreVertical,
} from 'lucide-react'
import { ConstraintCountBadge } from './ConstraintBadge'
import type { LookAheadActivityWithDetails, LookAheadActivityStatus } from '@/types/look-ahead'
import { ACTIVITY_STATUS_CONFIG } from '@/types/look-ahead'

interface ActivityCardProps {
  activity: LookAheadActivityWithDetails
  onClick?: () => void
  onStatusChange?: (status: LookAheadActivityStatus) => void
  isSelected?: boolean
  isDragging?: boolean
  className?: string
}

const statusIcons: Record<LookAheadActivityStatus, React.ComponentType<{ className?: string }>> = {
  planned: Calendar,
  in_progress: Loader2,
  completed: CheckCircle,
  delayed: Clock,
  blocked: AlertTriangle,
  cancelled: XCircle,
}

export function ActivityCard({
  activity,
  onClick,
  isSelected,
  isDragging,
  className,
}: ActivityCardProps) {
  const statusConfig = ACTIVITY_STATUS_CONFIG[activity.status]
  const StatusIcon = statusIcons[activity.status]

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) {return '-'}
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        statusConfig.borderColor,
        'border-l-4',
        isSelected && 'ring-2 ring-blue-500',
        isDragging && 'opacity-50 rotate-2',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate" className="heading-card">
              {activity.activity_name}
            </h4>
            {activity.location && (
              <p className="text-xs text-muted truncate">{activity.location}</p>
            )}
          </div>
          <button
            className="p-1 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation()
              // Menu would go here
            }}
          >
            <MoreVertical className="w-4 h-4 text-disabled" />
          </button>
        </div>

        {/* Status & Trade */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full',
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            <StatusIcon className={cn('w-3 h-3', activity.status === 'in_progress' && 'animate-spin')} />
            {statusConfig.label}
          </span>
          {activity.trade && (
            <span className="text-xs text-muted truncate">{activity.trade}</span>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-3 mt-2 text-xs text-secondary">
          <span title="Planned dates">
            {formatDate(activity.planned_start_date)} - {formatDate(activity.planned_end_date)}
          </span>
        </div>

        {/* Footer: Subcontractor & Constraints */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          {activity.subcontractor_name ? (
            <div className="flex items-center gap-1 text-xs text-secondary truncate">
              <Users className="w-3 h-3" />
              <span className="truncate">{activity.subcontractor_name}</span>
            </div>
          ) : (
            <span className="text-xs text-disabled">No subcontractor</span>
          )}
          <ConstraintCountBadge
            openCount={activity.open_constraints || 0}
            totalCount={activity.total_constraints || 0}
          />
        </div>

        {/* Progress bar (if applicable) */}
        {activity.percent_complete !== undefined && activity.percent_complete > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-secondary mb-1">
              <span>Progress</span>
              <span>{activity.percent_complete}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  activity.percent_complete >= 100
                    ? 'bg-green-500'
                    : activity.percent_complete >= 50
                      ? 'bg-blue-500'
                      : 'bg-warning'
                )}
                style={{ width: `${Math.min(activity.percent_complete, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ActivityCardSkeletonProps {
  className?: string
}

export function ActivityCardSkeleton({ className }: ActivityCardSkeletonProps) {
  return (
    <Card className={cn('border-l-4 border-border', className)}>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 bg-muted rounded-full w-20 animate-pulse" />
          <div className="h-5 bg-muted rounded w-16 animate-pulse" />
        </div>
        <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
      </CardContent>
    </Card>
  )
}
