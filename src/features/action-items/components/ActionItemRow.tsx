/**
 * Action Item Row Component
 * Individual action item display with status, urgency, and quick actions
 */

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle,
  Circle,
  Calendar,
  Link2,
  MoreVertical,
  Play,
  Check,
  ArrowRight,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import {
  getUrgencyStatusConfig,
  getActionItemPriorityConfig,
  type ActionItemWithContext,
} from '@/types/action-items'
import {
  useUpdateActionItemStatus,
  useConvertToTask,
} from '../hooks/useActionItems'

export interface ActionItemRowProps {
  item: ActionItemWithContext
}

export const ActionItemRow = memo(function ActionItemRow({ item }: ActionItemRowProps) {
  const updateStatus = useUpdateActionItemStatus()
  const convertToTask = useConvertToTask()

  const urgencyConfig = getUrgencyStatusConfig(item.urgency_status)
  const priorityConfig = item.priority ? getActionItemPriorityConfig(item.priority) : null

  const handleComplete = () => {
    updateStatus.mutate({ id: item.id, status: 'completed' })
  }

  const handleStartProgress = () => {
    updateStatus.mutate({ id: item.id, status: 'in_progress' })
  }

  const handleConvertToTask = () => {
    convertToTask.mutate(item.id)
  }

  return (
    <Card className={cn(
      item.urgency_status === 'overdue' && 'border-error bg-error-light/30',
      item.escalation_level > 0 && 'border-warning'
    )}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div className="mt-1">
            {item.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : item.status === 'in_progress' ? (
              <div className="h-5 w-5 rounded-full border-2 border-info flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-info" />
              </div>
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn(
                  'font-medium',
                  item.status === 'completed' && 'line-through text-muted'
                )}>
                  {item.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted">
                  {item.meeting_title && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.meeting_title}
                    </span>
                  )}
                  {item.assigned_to && (
                    <span>• {item.assigned_to}</span>
                  )}
                  {item.task_id && (
                    <span className="flex items-center gap-1 text-primary">
                      <Link2 className="h-3 w-3" />
                      Task linked
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.status === 'open' && (
                    <DropdownMenuItem onClick={handleStartProgress}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Progress
                    </DropdownMenuItem>
                  )}
                  {item.status !== 'completed' && (
                    <DropdownMenuItem onClick={handleComplete}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {!item.task_id && (
                    <DropdownMenuItem onClick={handleConvertToTask}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Convert to Task
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Urgency */}
              {item.urgency_status !== 'completed' && item.urgency_status !== 'no_date' && (
                <Badge
                  variant={item.urgency_status === 'overdue' ? 'destructive' : 'secondary'}
                  className={cn(
                    'text-xs',
                    item.urgency_status === 'due_today' && 'bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning',
                    item.urgency_status === 'due_soon' && 'bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning',
                    item.urgency_status === 'on_track' && 'bg-success-light text-success-dark dark:bg-success/20 dark:text-success'
                  )}
                >
                  {urgencyConfig.label}
                  {item.days_until_due !== null && item.days_until_due < 0 && (
                    <span className="ml-1">({Math.abs(item.days_until_due)}d)</span>
                  )}
                </Badge>
              )}

              {/* Priority */}
              {priorityConfig && item.priority !== 'normal' && (
                <Badge variant="outline" className="text-xs">
                  {priorityConfig.label}
                </Badge>
              )}

              {/* Category */}
              {item.category && (
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              )}

              {/* Escalation */}
              {item.escalation_level > 0 && (
                <Badge variant="secondary" className="text-xs bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning">
                  Escalated L{item.escalation_level}
                </Badge>
              )}

              {/* Carryover */}
              {item.carryover_count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Carried {item.carryover_count}x
                </Badge>
              )}

              {/* Due date */}
              {item.due_date && (
                <span className="text-xs text-muted">
                  Due: {formatDate(item.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default ActionItemRow
