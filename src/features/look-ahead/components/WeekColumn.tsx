/**
 * WeekColumn Component
 * Column representing a week in the 3-week look-ahead view
 */

import { cn } from '@/lib/utils'
import { Plus, Calendar, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui'
import { ActivityCard, ActivityCardSkeleton } from './ActivityCard'
import type {
  LookAheadActivityWithDetails,
  WeekRange,
  LookAheadActivityStatus,
} from '@/types/look-ahead'

interface WeekColumnProps {
  week: WeekRange
  activities: LookAheadActivityWithDetails[]
  isLoading?: boolean
  onAddActivity?: (weekNumber: number, weekStartDate: string) => void
  onActivityClick?: (activity: LookAheadActivityWithDetails) => void
  onEditActivity?: (activity: LookAheadActivityWithDetails) => void
  onActivityStatusChange?: (activityId: string, status: LookAheadActivityStatus) => void
  onStatusChange?: (activityId: string, status: LookAheadActivityStatus) => void
  onDeleteActivity?: (activityId: string) => void
  onDragStart?: (activityId: string) => void
  onDragEnd?: () => void
  onDrop?: (activityId: string, weekNumber: number, weekStartDate: string) => void
  isDragTarget?: boolean
  maxHeight?: string
  className?: string
}

export function WeekColumn({
  week,
  activities,
  isLoading,
  onAddActivity,
  onActivityClick,
  className,
}: WeekColumnProps) {
  const formatWeekHeader = (weekRange: WeekRange) => {
    const startMonth = weekRange.weekStart.toLocaleDateString('en-US', { month: 'short' })
    const startDay = weekRange.weekStart.getDate()
    const endMonth = weekRange.weekEnd.toLocaleDateString('en-US', { month: 'short' })
    const endDay = weekRange.weekEnd.getDate()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
  }

  const getWeekLabel = (weekNumber: number) => {
    switch (weekNumber) {
      case 1:
        return 'This Week'
      case 2:
        return 'Next Week'
      case 3:
        return 'Week 3'
      default:
        return `Week ${weekNumber}`
    }
  }

  // Calculate metrics
  const metrics = {
    total: activities.length,
    completed: activities.filter((a) => a.status === 'completed').length,
    blocked: activities.filter((a) => a.status === 'blocked').length,
    inProgress: activities.filter((a) => a.status === 'in_progress').length,
  }

  const ppc =
    metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-50 rounded-lg border border-gray-200 min-h-[400px]',
        week.weekNumber === 1 && 'border-blue-300 bg-blue-50/30',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-4 py-3 border-b',
        week.weekNumber === 1 ? 'bg-blue-100/50 border-blue-200' : 'bg-gray-100 border-gray-200'
      )}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">
            {getWeekLabel(week.weekNumber)}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddActivity?.(week.weekNumber, week.weekStart.toISOString().split('T')[0])}
            className="h-7 px-2"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar className="w-3 h-3" />
          <span>{formatWeekHeader(week)}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-gray-600">{metrics.total} activities</span>
            {metrics.completed > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                {metrics.completed}
              </span>
            )}
            {metrics.inProgress > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <Clock className="w-3 h-3" />
                {metrics.inProgress}
              </span>
            )}
            {metrics.blocked > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                {metrics.blocked}
              </span>
            )}
          </div>
          {metrics.total > 0 && (
            <span
              className={cn(
                'font-medium',
                ppc >= 80 ? 'text-green-600' : ppc >= 50 ? 'text-yellow-600' : 'text-red-600'
              )}
              title="Percent Plan Complete"
            >
              {ppc}% PPC
            </span>
          )}
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {isLoading ? (
          <>
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
          </>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mb-2 text-gray-300" />
            <p className="text-sm">No activities scheduled</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddActivity?.(week.weekNumber, week.weekStart.toISOString().split('T')[0])}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Activity
            </Button>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => onActivityClick?.(activity)}
            />
          ))
        )}
      </div>
    </div>
  )
}
