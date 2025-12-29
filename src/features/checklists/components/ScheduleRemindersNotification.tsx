// File: /src/features/checklists/components/ScheduleRemindersNotification.tsx
// Notification component for upcoming and overdue scheduled checklists
// Enhancement: #7 - Reminders and Recurring Checklists

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Play,
  Calendar as CalendarIcon,
} from 'lucide-react'
import type { ChecklistSchedule } from '@/types/checklist-schedules'
import { getFrequencyLabel, getHoursUntilDue } from '@/types/checklist-schedules'
import { format, formatDistanceToNow } from 'date-fns'

interface ScheduleRemindersNotificationProps {
  schedules: ChecklistSchedule[]
  onDismiss?: () => void
  onStartChecklist?: (schedule: ChecklistSchedule) => void
}

export function ScheduleRemindersNotification({
  schedules,
  onDismiss,
  onStartChecklist,
}: ScheduleRemindersNotificationProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  if (schedules.length === 0 || isDismissed) {
    return null
  }

  // Separate into overdue and upcoming
  const now = new Date()
  const overdue = schedules.filter((s) => {
    const dueDate = new Date(s.next_execution_date || s.start_date)
    return dueDate <= now
  })

  const upcoming = schedules.filter((s) => {
    const dueDate = new Date(s.next_execution_date || s.start_date)
    const hoursUntil = getHoursUntilDue(dueDate)
    return hoursUntil > 0 && hoursUntil <= s.reminder_hours_before
  })

  const hasOverdue = overdue.length > 0
  const totalCount = schedules.length

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleStartChecklist = (schedule: ChecklistSchedule) => {
    if (onStartChecklist) {
      onStartChecklist(schedule)
    } else {
      // Navigate to template or create new execution
      navigate(`/checklists/templates/${schedule.checklist_template_id}/preview`)
    }
  }

  return (
    <Card className={hasOverdue ? 'border-red-200 bg-error-light' : 'border-blue-200 bg-blue-50'}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-full p-2 ${
                hasOverdue ? 'bg-error-light' : 'bg-info-light'
              }`}
            >
              {hasOverdue ? (
                <AlertCircle className="w-5 h-5 text-error" />
              ) : (
                <Bell className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className={hasOverdue ? 'text-red-900' : 'text-blue-900'}>
                  {hasOverdue ? 'Overdue Checklists' : 'Upcoming Checklists'}
                </span>
                <Badge variant={hasOverdue ? 'destructive' : 'default'} className="ml-2">
                  {totalCount} {totalCount === 1 ? 'Schedule' : 'Schedules'}
                </Badge>
              </CardTitle>
              <p className={`text-sm mt-1 ${hasOverdue ? 'text-error-dark' : 'text-primary-hover'}`}>
                {hasOverdue
                  ? `${overdue.length} overdue, ${upcoming.length} upcoming`
                  : `${upcoming.length} scheduled checklist${upcoming.length === 1 ? '' : 's'} coming up`}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${hasOverdue ? 'text-error hover:text-red-800' : 'text-primary hover:text-blue-800'}`}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${hasOverdue ? 'text-error hover:text-red-800' : 'text-primary hover:text-blue-800'}`}
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2 mb-4">
            {/* Overdue schedules first */}
            {overdue.map((schedule) => {
              const dueDate = new Date(schedule.next_execution_date || schedule.start_date)
              const hoursOverdue = Math.abs(getHoursUntilDue(dueDate))

              return (
                <div
                  key={schedule.id}
                  className="flex items-start justify-between p-3 bg-card rounded-md border border-red-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-error" />
                      <span className="font-medium text-foreground">{schedule.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        OVERDUE
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-secondary ml-6">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {getFrequencyLabel(schedule.frequency, schedule.interval)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {hoursOverdue < 24
                          ? `${hoursOverdue} hours overdue`
                          : `${Math.floor(hoursOverdue / 24)} days overdue`}
                      </span>
                      <span>Due: {format(dueDate, 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => handleStartChecklist(schedule)}>
                    <Play className="w-3 h-3 mr-1" />
                    Start Now
                  </Button>
                </div>
              )
            })}

            {/* Upcoming schedules */}
            {upcoming.map((schedule) => {
              const dueDate = new Date(schedule.next_execution_date || schedule.start_date)
              const _hoursUntil = getHoursUntilDue(dueDate)

              return (
                <div
                  key={schedule.id}
                  className="flex items-start justify-between p-3 bg-card rounded-md border border-blue-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{schedule.name}</span>
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        DUE SOON
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-secondary ml-6">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {getFrequencyLabel(schedule.frequency, schedule.interval)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(dueDate, { addSuffix: true })}
                      </span>
                      <span>Due: {format(dueDate, 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleStartChecklist(schedule)}>
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/checklists/schedules')}
              className="flex-1"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Manage Schedules
            </Button>
            <Button variant="ghost" onClick={handleDismiss}>
              Dismiss
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Mini reminder badge that shows count
 */
interface RemindersBadgeProps {
  count: number
  hasOverdue: boolean
  onClick?: () => void
}

export function RemindersBadge({ count, hasOverdue, onClick }: RemindersBadgeProps) {
  if (count === 0) {return null}

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-full ${
        hasOverdue
          ? 'bg-error-light text-error-dark hover:bg-red-200'
          : 'bg-info-light text-primary-hover hover:bg-blue-200'
      } transition-colors`}
      aria-label={`${count} scheduled checklists`}
    >
      {hasOverdue ? (
        <AlertCircle className="w-3 h-3" />
      ) : (
        <Bell className="w-3 h-3" />
      )}
      <span className="text-xs font-semibold">{count}</span>
    </button>
  )
}
