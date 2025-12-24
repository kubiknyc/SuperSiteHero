// File: /src/features/notices/components/ResponseDueIndicator.tsx
// Displays response due date with urgency coloring

import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notice } from '../types'
import { getDaysUntilDue, isResponseOverdue } from '../types'

interface ResponseDueIndicatorProps {
  notice: Notice
  showIcon?: boolean
  className?: string
}

export function ResponseDueIndicator({
  notice,
  showIcon = true,
  className,
}: ResponseDueIndicatorProps) {
  // If response not required or already responded, show different states
  if (!notice.response_required) {
    return null
  }

  if (notice.response_date) {
    return (
      <div className={cn('flex items-center gap-1 text-success', className)}>
        {showIcon && <CheckCircle className="w-4 h-4" />}
        <span className="text-sm">Responded</span>
      </div>
    )
  }

  if (!notice.response_due_date) {
    return (
      <div className={cn('flex items-center gap-1 text-muted', className)}>
        {showIcon && <Clock className="w-4 h-4" />}
        <span className="text-sm">Response required (no due date)</span>
      </div>
    )
  }

  const daysUntilDue = getDaysUntilDue(notice)
  const overdue = isResponseOverdue(notice)

  if (daysUntilDue === null) {return null}

  // Determine urgency level and styling
  let urgencyClass = 'text-secondary'
  let Icon = Clock
  let label = ''

  if (overdue) {
    urgencyClass = 'text-error font-medium'
    Icon = AlertTriangle
    const daysOverdue = Math.abs(daysUntilDue)
    label = daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`
  } else if (daysUntilDue === 0) {
    urgencyClass = 'text-error font-medium'
    Icon = AlertTriangle
    label = 'Due today'
  } else if (daysUntilDue === 1) {
    urgencyClass = 'text-orange-600 font-medium'
    Icon = AlertTriangle
    label = 'Due tomorrow'
  } else if (daysUntilDue <= 3) {
    urgencyClass = 'text-orange-500'
    label = `Due in ${daysUntilDue} days`
  } else if (daysUntilDue <= 7) {
    urgencyClass = 'text-warning'
    label = `Due in ${daysUntilDue} days`
  } else {
    label = `Due in ${daysUntilDue} days`
  }

  return (
    <div className={cn('flex items-center gap-1', urgencyClass, className)}>
      {showIcon && <Icon className="w-4 h-4" />}
      <span className="text-sm">{label}</span>
    </div>
  )
}
