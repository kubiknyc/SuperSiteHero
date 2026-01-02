/**
 * Approval Workflow Visualizer
 * Visual component showing the approval process for items like submittals, RFIs, change orders
 */

import { useMemo } from 'react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import {
  Check,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  User,
  Calendar,
  MessageSquare,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped'

export interface WorkflowStep {
  id: string
  name: string
  description?: string
  status: WorkflowStepStatus
  assignee?: {
    id: string
    name: string
    avatar?: string
    role?: string
  }
  dueDate?: string
  completedAt?: string
  completedBy?: {
    id: string
    name: string
    avatar?: string
  }
  comments?: number
  attachments?: number
  notes?: string
}

export interface WorkflowItem {
  id: string
  type: 'submittal' | 'rfi' | 'change_order' | 'punch_item' | 'custom'
  title: string
  number?: string
  currentStep: number
  steps: WorkflowStep[]
  createdAt: string
  updatedAt: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  isOverdue?: boolean
}

interface ApprovalWorkflowVisualizerProps {
  item: WorkflowItem
  variant?: 'full' | 'compact' | 'horizontal'
  showTimeline?: boolean
  onStepClick?: (step: WorkflowStep) => void
  className?: string
}

// ============================================================================
// Helper Components
// ============================================================================

function getStepIcon(status: WorkflowStepStatus) {
  switch (status) {
    case 'approved':
      return <Check className="h-4 w-4" />
    case 'rejected':
      return <XCircle className="h-4 w-4" />
    case 'in_progress':
      return <Clock className="h-4 w-4 animate-pulse" />
    case 'skipped':
      return <ChevronRight className="h-4 w-4" />
    default:
      return <div className="h-2 w-2 rounded-full bg-current" />
  }
}

function getStepColor(status: WorkflowStepStatus, isActive: boolean) {
  if (isActive) {
    return {
      bg: 'bg-primary',
      border: 'border-primary',
      text: 'text-primary-foreground',
      line: 'bg-primary',
    }
  }

  switch (status) {
    case 'approved':
      return {
        bg: 'bg-green-500',
        border: 'border-green-500',
        text: 'text-white',
        line: 'bg-green-500',
      }
    case 'rejected':
      return {
        bg: 'bg-red-500',
        border: 'border-red-500',
        text: 'text-white',
        line: 'bg-red-500',
      }
    case 'in_progress':
      return {
        bg: 'bg-blue-500',
        border: 'border-blue-500',
        text: 'text-white',
        line: 'bg-blue-200',
      }
    case 'skipped':
      return {
        bg: 'bg-gray-300',
        border: 'border-gray-300',
        text: 'text-gray-500',
        line: 'bg-gray-300',
      }
    default:
      return {
        bg: 'bg-gray-200',
        border: 'border-gray-300',
        text: 'text-gray-500',
        line: 'bg-gray-200',
      }
  }
}

function getPriorityVariant(priority?: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive'
    case 'high':
      return 'secondary'
    case 'low':
      return 'outline'
    default:
      return 'default'
  }
}

// ============================================================================
// Horizontal Workflow (Compact View)
// ============================================================================

function HorizontalWorkflow({
  item,
  onStepClick,
}: {
  item: WorkflowItem
  onStepClick?: (step: WorkflowStep) => void
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {item.steps.map((step, index) => {
        const isActive = index === item.currentStep
        const isComplete = step.status === 'approved' || step.status === 'rejected'
        const colors = getStepColor(step.status, isActive)

        return (
          <div key={step.id} className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onStepClick?.(step)}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full transition-all',
                      colors.bg,
                      colors.text,
                      onStepClick && 'cursor-pointer hover:ring-2 hover:ring-offset-2'
                    )}
                  >
                    {getStepIcon(step.status)}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">{step.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{step.status}</p>
                    {step.assignee && (
                      <p className="text-xs text-muted-foreground">
                        Assigned: {step.assignee.name}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Connector line */}
            {index < item.steps.length - 1 && (
              <div
                className={cn(
                  'w-6 h-0.5 mx-0.5',
                  isComplete ? colors.line : 'bg-gray-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Compact View
// ============================================================================

function CompactWorkflow({
  item,
  onStepClick,
}: {
  item: WorkflowItem
  onStepClick?: (step: WorkflowStep) => void
}) {
  const currentStep = item.steps[item.currentStep]
  const progress = Math.round(
    (item.steps.filter((s) => s.status === 'approved').length / item.steps.length) * 100
  )

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Step {item.currentStep + 1} of {item.steps.length}</span>
          <span>{progress}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current step */}
      {currentStep && (
        <div
          className={cn(
            'p-3 rounded-lg border',
            currentStep.status === 'in_progress' && 'border-blue-200 bg-blue-50',
            currentStep.status === 'pending' && 'border-gray-200 bg-gray-50'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{currentStep.name}</p>
              {currentStep.assignee && (
                <p className="text-xs text-muted-foreground">
                  Assigned to {currentStep.assignee.name}
                </p>
              )}
            </div>
            <Badge variant={currentStep.status === 'in_progress' ? 'default' : 'secondary'}>
              {currentStep.status}
            </Badge>
          </div>
          {currentStep.dueDate && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Due {format(new Date(currentStep.dueDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      )}

      {/* Step dots */}
      <HorizontalWorkflow item={item} onStepClick={onStepClick} />
    </div>
  )
}

// ============================================================================
// Full View (Vertical Timeline)
// ============================================================================

function FullWorkflow({
  item,
  showTimeline,
  onStepClick,
}: {
  item: WorkflowItem
  showTimeline?: boolean
  onStepClick?: (step: WorkflowStep) => void
}) {
  return (
    <div className="space-y-0">
      {item.steps.map((step, index) => {
        const isActive = index === item.currentStep
        const isComplete = step.status === 'approved' || step.status === 'rejected'
        const isLast = index === item.steps.length - 1
        const colors = getStepColor(step.status, isActive)

        return (
          <div key={step.id} className="relative flex gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              {/* Step icon */}
              <button
                onClick={() => onStepClick?.(step)}
                className={cn(
                  'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  colors.bg,
                  colors.border,
                  colors.text,
                  isActive && 'ring-4 ring-primary/20',
                  onStepClick && 'cursor-pointer hover:ring-4 hover:ring-primary/20'
                )}
              >
                {getStepIcon(step.status)}
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[60px]',
                    isComplete ? colors.line : 'bg-gray-200'
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className={cn('flex-1 pb-8', isLast && 'pb-0')}>
              <div
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  isActive && 'border-primary bg-primary/5',
                  step.status === 'rejected' && 'border-red-200 bg-red-50',
                  step.status === 'approved' && 'border-green-200 bg-green-50',
                  !isActive && step.status === 'pending' && 'border-gray-200 bg-gray-50/50'
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-medium">{step.name}</h4>
                    {step.description && (
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    )}
                  </div>
                  <Badge variant={step.status === 'approved' ? 'default' : step.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {step.status}
                  </Badge>
                </div>

                {/* Assignee */}
                {step.assignee && (
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={step.assignee.avatar} />
                      <AvatarFallback>
                        {step.assignee.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">{step.assignee.name}</p>
                      {step.assignee.role && (
                        <p className="text-xs text-muted-foreground">{step.assignee.role}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {step.dueDate && !step.completedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due {format(new Date(step.dueDate), 'MMM d')}
                    </span>
                  )}
                  {step.completedAt && (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      Completed {format(new Date(step.completedAt), 'MMM d')}
                    </span>
                  )}
                  {step.comments && step.comments > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {step.comments} comment{step.comments !== 1 ? 's' : ''}
                    </span>
                  )}
                  {step.attachments && step.attachments > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {step.attachments} file{step.attachments !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Notes */}
                {step.notes && (
                  <div className="mt-3 p-2 rounded bg-muted/50 text-sm">
                    <p className="text-muted-foreground italic">"{step.notes}"</p>
                    {step.completedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        — {step.completedBy.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ApprovalWorkflowVisualizer({
  item,
  variant = 'full',
  showTimeline = true,
  onStepClick,
  className,
}: ApprovalWorkflowVisualizerProps) {
  const progress = useMemo(() => {
    const approved = item.steps.filter((s) => s.status === 'approved').length
    return Math.round((approved / item.steps.length) * 100)
  }, [item.steps])

  const renderContent = () => {
    switch (variant) {
      case 'horizontal':
        return <HorizontalWorkflow item={item} onStepClick={onStepClick} />
      case 'compact':
        return <CompactWorkflow item={item} onStepClick={onStepClick} />
      default:
        return <FullWorkflow item={item} showTimeline={showTimeline} onStepClick={onStepClick} />
    }
  }

  if (variant === 'horizontal') {
    return <div className={className}>{renderContent()}</div>
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{item.title}</CardTitle>
              {item.number && (
                <Badge variant="outline" className="text-xs font-mono">
                  {item.number}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="capitalize">{item.type.replace('_', ' ')}</span>
              <span>•</span>
              <span>{progress}% complete</span>
              {item.isOverdue && (
                <>
                  <span>•</span>
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </span>
                </>
              )}
            </div>
          </div>
          {item.priority && (
            <Badge variant={getPriorityVariant(item.priority)}>
              {item.priority}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}

export default ApprovalWorkflowVisualizer
