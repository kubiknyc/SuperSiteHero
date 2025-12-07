/**
 * Week Column Component
 * Column display for a single week in the 3-week look-ahead view
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ActivityCard } from './ActivityCard'
import {
  type LookAheadActivityWithDetails,
  type LookAheadActivityStatus,
  type WeekRange,
  sortActivities,
} from '@/types/look-ahead'

interface WeekColumnProps {
  week: WeekRange
  activities: LookAheadActivityWithDetails[]
  onAddActivity?: (weekNumber: number, weekStartDate: string) => void
  onEditActivity?: (activity: LookAheadActivityWithDetails) => void
  onStatusChange?: (activityId: string, status: LookAheadActivityStatus) => void
  onDeleteActivity?: (activityId: string) => void
  onViewConstraints?: (activityId: string) => void
  onDragStart?: (activityId: string) => void
  onDragEnd?: () => void
  onDrop?: (activityId: string, weekNumber: number, weekStartDate: string) => void
  isDragTarget?: boolean
  maxHeight?: string | number
  showStats?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
}

export function WeekColumn({
  week,
  activities,
  onAddActivity,
  onEditActivity,
  onStatusChange,
  onDeleteActivity,
  onViewConstraints,
  onDragStart,
  onDragEnd,
  onDrop,
  isDragTarget = false,
  maxHeight = '600px',
  showStats = true,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: WeekColumnProps) {
  const sortedActivities = useMemo(() => sortActivities(activities), [activities])

  const stats = useMemo(() => {
    const total = activities.length
    const completed = activities.filter((a) => a.status === 'completed').length
    const inProgress = activities.filter((a) => a.status === 'in_progress').length
    const blocked = activities.filter((a) => a.status === 'blocked').length
    const delayed = activities.filter((a) => a.status === 'delayed').length
    const planned = activities.filter((a) => a.status === 'planned').length

    return { total, completed, inProgress, blocked, delayed, planned }
  }, [activities])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const activityId = e.dataTransfer.getData('activityId')
    if (activityId && onDrop) {
      onDrop(activityId, week.weekNumber, week.weekStart.toISOString().split('T')[0])
    }
  }

  const handleDragStart = (e: React.DragEvent, activityId: string) => {
    e.dataTransfer.setData('activityId', activityId)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(activityId)
  }

  const handleDragEnd = () => {
    onDragEnd?.()
  }

  return (
    <Card
      className={cn(
        'flex flex-col h-full',
        isDragTarget && 'ring-2 ring-primary ring-offset-2',
        week.isCurrentWeek && 'border-primary',
        className
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Week {week.weekNumber}</span>
            {week.isCurrentWeek && (
              <Badge variant="default" className="text-xs">
                Current
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              onAddActivity?.(week.weekNumber, week.weekStart.toISOString().split('T')[0])
            }
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{week.weekLabel}</p>

        {/* Stats Row */}
        {showStats && stats.total > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1">
              <span className="font-medium">{stats.total}</span>
              <span className="text-muted-foreground">total</span>
            </Badge>
            {stats.completed > 0 && (
              <Badge variant="outline" className="text-xs gap-1 text-green-700 bg-green-50">
                <CheckCircle className="h-3 w-3" />
                {stats.completed}
              </Badge>
            )}
            {stats.inProgress > 0 && (
              <Badge variant="outline" className="text-xs gap-1 text-yellow-700 bg-yellow-50">
                <Clock className="h-3 w-3" />
                {stats.inProgress}
              </Badge>
            )}
            {stats.blocked > 0 && (
              <Badge variant="outline" className="text-xs gap-1 text-red-700 bg-red-50">
                <AlertTriangle className="h-3 w-3" />
                {stats.blocked}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-2">
        <ScrollArea className="h-full" style={{ maxHeight }}>
          <div className="space-y-2 pr-2">
            {sortedActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activities</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    onAddActivity?.(week.weekNumber, week.weekStart.toISOString().split('T')[0])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Activity
                </Button>
              </div>
            ) : (
              sortedActivities.map((activity) => (
                <div
                  key={activity.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, activity.id)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <ActivityCard
                    activity={activity}
                    onEdit={onEditActivity}
                    onStatusChange={onStatusChange}
                    onDelete={onDeleteActivity}
                    onViewConstraints={onViewConstraints}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default WeekColumn
