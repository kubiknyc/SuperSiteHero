/**
 * Activity Card Component
 * Draggable card for look-ahead activities
 */

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  Link2,
  MapPin,
  HardHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type LookAheadActivityWithDetails,
  type LookAheadActivityStatus,
  getActivityStatusConfig,
  isActivityOverdue,
  getDaysUntilStart,
} from '@/types/look-ahead'

interface ActivityCardProps {
  activity: LookAheadActivityWithDetails
  onEdit?: (activity: LookAheadActivityWithDetails) => void
  onStatusChange?: (activityId: string, status: LookAheadActivityStatus) => void
  onDelete?: (activityId: string) => void
  onViewConstraints?: (activityId: string) => void
  isDragging?: boolean
  compact?: boolean
  className?: string
}

export function ActivityCard({
  activity,
  onEdit,
  onStatusChange,
  onDelete,
  onViewConstraints,
  isDragging = false,
  compact = false,
  className,
}: ActivityCardProps) {
  const statusConfig = getActivityStatusConfig(activity.status)
  const isOverdue = isActivityOverdue(activity)
  const daysUntilStart = getDaysUntilStart(activity)

  const dateLabel = useMemo(() => {
    const start = new Date(activity.planned_start_date)
    const end = new Date(activity.planned_end_date)
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (startStr === endStr) {
      return startStr
    }
    return `${startStr} - ${endStr}`
  }, [activity.planned_start_date, activity.planned_end_date])

  const handleStatusQuickChange = (newStatus: LookAheadActivityStatus) => {
    if (onStatusChange) {
      onStatusChange(activity.id, newStatus)
    }
  }

  if (compact) {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isDragging && 'opacity-50 rotate-2 scale-105',
          isOverdue && 'border-red-300',
          className
        )}
        onClick={() => onEdit?.(activity)}
      >
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', statusConfig.bgColor)} />
            <span className="text-sm font-medium truncate flex-1">{activity.activity_name}</span>
            {activity.open_constraints > 0 && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                {activity.open_constraints}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-lg',
        isOverdue && 'border-red-300 bg-red-50/50',
        activity.status === 'blocked' && 'border-orange-300 bg-orange-50/50',
        className
      )}
    >
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight truncate">{activity.activity_name}</h4>
            {activity.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{activity.location}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(activity)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewConstraints?.(activity.id)}>
                <Link2 className="h-4 w-4 mr-2" />
                View Constraints ({activity.total_constraints || 0})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {activity.status !== 'in_progress' && activity.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusQuickChange('in_progress')}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Activity
                </DropdownMenuItem>
              )}
              {activity.status === 'in_progress' && (
                <DropdownMenuItem onClick={() => handleStatusQuickChange('completed')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              {activity.status !== 'delayed' && activity.status !== 'completed' && (
                <DropdownMenuItem onClick={() => handleStatusQuickChange('delayed')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Mark Delayed
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(activity.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status & Trade */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="outline" className={cn('text-xs', statusConfig.color, statusConfig.bgColor)}>
            {statusConfig.label}
          </Badge>
          {activity.trade && (
            <Badge variant="secondary" className="text-xs">
              <HardHat className="h-3 w-3 mr-1" />
              {activity.trade}
            </Badge>
          )}
        </div>

        {/* Date & Duration */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{dateLabel}</span>
          </div>
          {activity.duration_days > 1 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{activity.duration_days} days</span>
            </div>
          )}
        </div>

        {/* Subcontractor */}
        {activity.subcontractor_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Users className="h-3 w-3" />
            <span className="truncate">{activity.subcontractor_name}</span>
          </div>
        )}

        {/* Progress */}
        {(activity.status === 'in_progress' || activity.percent_complete > 0) && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{activity.percent_complete}%</span>
            </div>
            <Progress value={activity.percent_complete} className="h-1.5" />
          </div>
        )}

        {/* Constraints Warning */}
        {activity.open_constraints > 0 && (
          <div
            className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 cursor-pointer hover:bg-orange-100"
            onClick={() => onViewConstraints?.(activity.id)}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>
              {activity.open_constraints} open constraint{activity.open_constraints > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Overdue Warning */}
        {isOverdue && activity.status !== 'completed' && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1 mt-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Overdue</span>
          </div>
        )}

        {/* Starting Soon Indicator */}
        {daysUntilStart === 0 && activity.status === 'planned' && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 mt-1">
            <Calendar className="h-3 w-3" />
            <span>Starts today</span>
          </div>
        )}
        {daysUntilStart === 1 && activity.status === 'planned' && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 mt-1">
            <Calendar className="h-3 w-3" />
            <span>Starts tomorrow</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityCard
