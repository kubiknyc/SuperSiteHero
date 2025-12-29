/**
 * Client Schedule View
 *
 * Read-only schedule/timeline view for clients.
 */

import { useParams } from 'react-router-dom'
import { useClientSchedule } from '../hooks/useClientPortal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Calendar,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, differenceInDays, isAfter, isBefore } from 'date-fns'

export function ClientSchedule() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: scheduleItems, isLoading } = useClientSchedule(projectId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  const milestones = scheduleItems?.filter(item => item.is_milestone) || []
  const tasks = scheduleItems?.filter(item => !item.is_milestone) || []

  // Calculate overall progress
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.percent_complete >= 100).length
  const overallProgress = totalTasks > 0
    ? Math.round(tasks.reduce((sum, t) => sum + t.percent_complete, 0) / totalTasks)
    : 0

  // Upcoming milestones (next 30 days)
  const today = new Date()
  const upcomingMilestones = milestones.filter(m => {
    const finishDate = new Date(m.finish_date)
    return isAfter(finishDate, today) && differenceInDays(finishDate, today) <= 30
  })

  const getTaskStatus = (item: typeof tasks[0]) => {
    const finishDate = new Date(item.finish_date)
    const startDate = new Date(item.start_date)

    if (item.percent_complete >= 100) {
      return { label: 'Complete', color: 'text-success', bgColor: 'bg-success-light' }
    }
    if (isBefore(finishDate, today) && item.percent_complete < 100) {
      return { label: 'Overdue', color: 'text-error', bgColor: 'bg-error-light' }
    }
    if (isAfter(startDate, today)) {
      return { label: 'Not Started', color: 'text-secondary', bgColor: 'bg-muted' }
    }
    return { label: 'In Progress', color: 'text-primary', bgColor: 'bg-info-light' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground heading-page">Project Schedule</h1>
        <p className="text-secondary mt-1">
          Track project timeline and milestones.
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-foreground">{overallProgress}%</span>
              <span className="text-sm text-muted">
                {completedTasks} of {totalTasks} tasks complete
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 heading-section">
            <Flag className="h-5 w-5 text-orange-500" />
            Upcoming Milestones
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingMilestones.map((milestone) => {
              const daysUntil = differenceInDays(new Date(milestone.finish_date), today)
              return (
                <Card key={milestone.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Flag className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground heading-subsection">{milestone.task_name}</h3>
                        <p className="text-sm text-muted mt-1">
                          {format(new Date(milestone.finish_date), 'MMM d, yyyy')}
                        </p>
                        <p className={cn(
                          'text-sm font-medium mt-2',
                          daysUntil <= 7 ? 'text-orange-600' : 'text-secondary'
                        )}>
                          {daysUntil === 0 ? 'Today' : `${daysUntil} days away`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* All Milestones */}
      {milestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 heading-section">
            <Flag className="h-5 w-5" />
            All Milestones ({milestones.length})
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {milestones.map((milestone, index) => {
                  const finishDate = new Date(milestone.finish_date)
                  const isPast = isBefore(finishDate, today)
                  const isComplete = milestone.percent_complete >= 100

                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-lg',
                        isComplete ? 'bg-success-light' : isPast ? 'bg-error-light' : 'bg-surface'
                      )}
                    >
                      <div className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        isComplete ? 'bg-green-200' : isPast ? 'bg-red-200' : 'bg-muted'
                      )}>
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <span className="text-sm font-medium text-secondary">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          'font-medium',
                          isComplete ? 'text-green-800' : isPast ? 'text-red-800' : 'text-foreground'
                        )}>
                          {milestone.task_name}
                        </p>
                        <p className={cn(
                          'text-sm',
                          isComplete ? 'text-success' : isPast ? 'text-error' : 'text-muted'
                        )}>
                          {format(finishDate, 'MMM d, yyyy')}
                          {isPast && !isComplete && ' (Overdue)'}
                          {isComplete && ' (Complete)'}
                        </p>
                      </div>
                      {milestone.is_critical && (
                        <span title="Critical Path">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 heading-section">
            <Calendar className="h-5 w-5" />
            Schedule Items ({tasks.length})
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {tasks.map((task) => {
                  const status = getTaskStatus(task)
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-surface transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {task.task_name}
                          </p>
                          {task.is_critical && (
                            <span title="Critical Path">
                              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.start_date), 'MMM d')} - {format(new Date(task.finish_date), 'MMM d, yyyy')}
                          </span>
                          <span>{task.duration_days} days</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted">Progress</span>
                            <span className="font-medium">{task.percent_complete}%</span>
                          </div>
                          <Progress value={task.percent_complete} className="h-2" />
                        </div>

                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          status.bgColor,
                          status.color
                        )}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {(!scheduleItems || scheduleItems.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-disabled mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground heading-subsection">No Schedule Available</h3>
            <p className="text-muted mt-1">
              Schedule information will appear here once it's added.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
