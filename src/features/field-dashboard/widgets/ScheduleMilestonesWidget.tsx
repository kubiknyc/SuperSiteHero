/**
 * Schedule Milestones Widget
 * Displays upcoming project milestones
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { Flag, Calendar, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useLookAheadActivities } from '@/features/look-ahead/hooks/useLookAhead'
import { cn } from '@/lib/utils'
import { differenceInDays, format, isPast, isToday } from 'date-fns'
import type { WidgetProps } from '@/types/dashboard'

export function ScheduleMilestonesWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const navigate = useNavigate()

  const { data: activities = [], isLoading } = useLookAheadActivities(projectId, {
    status: ['ready', 'in_progress'],
  })

  const milestones = useMemo(() => {
    return activities
      .filter((activity) => activity.is_milestone && activity.status !== 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.planned_end_date || a.planned_start_date || '')
        const dateB = new Date(b.planned_end_date || b.planned_start_date || '')
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 5)
  }, [activities])

  const getMilestoneStatus = (dueDate: string | null) => {
    if (!dueDate) {return { label: 'No Date', variant: 'outline' as const, isOverdue: false }}

    const date = new Date(dueDate)
    const daysUntil = differenceInDays(date, new Date())

    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', variant: 'destructive' as const, isOverdue: true }
    }
    if (isToday(date)) {
      return { label: 'Due Today', variant: 'default' as const, isOverdue: false }
    }
    if (daysUntil <= 7) {
      return { label: `${daysUntil} days`, variant: 'secondary' as const, isOverdue: false }
    }
    return { label: format(date, 'MMM d'), variant: 'outline' as const, isOverdue: false }
  }

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Upcoming Milestones
          </CardTitle>
          <button
            onClick={() => navigate(`/projects/${projectId}/schedule`)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Schedule
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {milestones.length > 0 ? (
          milestones.map((milestone) => {
            const status = getMilestoneStatus(milestone.planned_end_date || null)
            return (
              <div
                key={milestone.id}
                className={cn(
                  'rounded-lg p-3 min-h-[56px]',
                  status.isOverdue
                    ? 'bg-red-50 dark:bg-red-950/20'
                    : 'bg-blue-50 dark:bg-blue-950/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {status.isOverdue && (
                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate">
                        {milestone.description || milestone.activity_id}
                      </p>
                    </div>
                    {milestone.planned_end_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(milestone.planned_end_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  <Badge variant={status.variant} className="flex-shrink-0">
                    {status.label}
                  </Badge>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming milestones</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
