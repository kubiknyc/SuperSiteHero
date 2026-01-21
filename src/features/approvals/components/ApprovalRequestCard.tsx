/**
 * Approval Request Card Component
 *
 * A visually distinctive card for approval requests with:
 * - Entity type color coding and icons
 * - Progress visualization with step indicators
 * - Urgency indicators for pending items
 * - Enhanced action buttons with visual hierarchy
 */

import { useState, memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ApprovalStatusBadge } from './ApprovalStatusBadge'
import { ApproveWithConditionsDialog } from './ApproveWithConditionsDialog'
import { WORKFLOW_ENTITY_CONFIG, type ApprovalRequest, type WorkflowEntityType } from '@/types/approval-workflow'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import {
  FileText,
  FileCheck,
  MessageSquare,
  Receipt,
  Clock,
  User,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'

// Entity type configuration for visual styling
const ENTITY_STYLES: Record<
  WorkflowEntityType,
  { icon: React.ElementType; color: string; bgColor: string; borderColor: string }
> = {
  document: {
    icon: FileText,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-l-info',
  },
  submittal: {
    icon: FileCheck,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-l-primary',
  },
  rfi: {
    icon: MessageSquare,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-l-success',
  },
  change_order: {
    icon: Receipt,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-l-warning',
  },
}

interface ApprovalRequestCardProps {
  request: ApprovalRequest
  currentUserId?: string
  onApprove?: (requestId: string, comment?: string) => void
  onApproveWithConditions?: (requestId: string, conditions: string, comment?: string) => void
  onReject?: (requestId: string, comment: string) => void
  onViewDetails?: (requestId: string) => void
  onCancel?: (requestId: string) => void
  isLoading?: boolean
  className?: string
}

export const ApprovalRequestCard = memo(function ApprovalRequestCard({
  request,
  currentUserId,
  onApprove,
  onApproveWithConditions,
  onReject,
  onViewDetails,
  onCancel,
  isLoading = false,
  className,
}: ApprovalRequestCardProps) {
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showConditionsDialog, setShowConditionsDialog] = useState(false)
  const [rejectComment, setRejectComment] = useState('')

  const entityConfig = WORKFLOW_ENTITY_CONFIG[request.entity_type]
  const entityStyle = ENTITY_STYLES[request.entity_type]
  const EntityIcon = entityStyle.icon

  const steps = request.workflow?.steps || []
  const totalSteps = steps.length
  const currentStep = steps.find((s) => s.step_order === request.current_step)
  const progressPercent = totalSteps > 0 ? Math.round((request.current_step / totalSteps) * 100) : 0

  // Calculate how long the request has been pending
  const daysPending = useMemo(() => {
    if (request.status !== 'pending') {return null}
    return differenceInDays(new Date(), new Date(request.initiated_at))
  }, [request.initiated_at, request.status])

  // Determine urgency level
  const urgencyLevel = useMemo(() => {
    if (daysPending === null) {return 'none'}
    if (daysPending >= 7) {return 'critical'}
    if (daysPending >= 3) {return 'warning'}
    return 'normal'
  }, [daysPending])

  // Check if current user can approve
  const canApprove =
    currentUserId &&
    request.status === 'pending' &&
    currentStep?.approver_ids?.includes(currentUserId)

  // Check if current user is the initiator
  const isInitiator = currentUserId === request.initiated_by

  const handleApprove = () => {
    if (onApprove) {
      onApprove(request.id)
    }
  }

  const handleReject = () => {
    if (onReject && rejectComment.trim()) {
      onReject(request.id, rejectComment.trim())
      setRejectComment('')
      setShowRejectInput(false)
    }
  }

  const handleConditionsConfirm = (conditions: string, comment?: string) => {
    if (onApproveWithConditions) {
      onApproveWithConditions(request.id, conditions, comment)
      setShowConditionsDialog(false)
    }
  }

  const formattedDate = formatDistanceToNow(new Date(request.initiated_at), { addSuffix: true })

  // Status-based progress bar color
  const progressColor =
    request.status === 'approved' || request.status === 'approved_with_conditions'
      ? 'bg-success'
      : request.status === 'rejected'
        ? 'bg-error'
        : urgencyLevel === 'critical'
          ? 'bg-error'
          : urgencyLevel === 'warning'
            ? 'bg-warning'
            : 'bg-primary'

  return (
    <div
      className={cn(
        'group bg-card border rounded-xl shadow-sm transition-all duration-200',
        'hover:shadow-md hover:border-border/80',
        'border-l-4',
        entityStyle.borderColor,
        urgencyLevel === 'critical' && request.status === 'pending' && 'ring-2 ring-error/20',
        className
      )}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Entity type icon */}
            <div className={cn('p-2.5 rounded-lg flex-shrink-0', entityStyle.bgColor)}>
              <EntityIcon className={cn('h-5 w-5', entityStyle.color)} />
            </div>

            <div className="min-w-0">
              {/* Entity type label */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {entityConfig.label}
                </span>
                {urgencyLevel !== 'none' && urgencyLevel !== 'normal' && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
                      urgencyLevel === 'critical'
                        ? 'bg-error-light text-error-dark dark:bg-error/20 dark:text-error'
                        : 'bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning'
                    )}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {daysPending}d pending
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="heading-subsection text-foreground truncate">
                {request.workflow?.name || 'Approval Request'}
              </h3>
            </div>
          </div>

          {/* Status badge and date */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <ApprovalStatusBadge
              status={request.status}
              conditions={request.conditions}
              showConditions
            />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        {totalSteps > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-medium text-foreground">Step {request.current_step}</span>
                <span>of {totalSteps}</span>
                {currentStep && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground">{currentStep.name}</span>
                  </>
                )}
              </span>
              <span className="font-mono text-foreground">{progressPercent}%</span>
            </div>

            {/* Progress bar with step indicators */}
            <div className="relative">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500 ease-out rounded-full', progressColor)}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Step dots */}
              {totalSteps <= 5 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0.5">
                  {steps.map((step, i) => (
                    <div
                      key={step.id}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full transition-colors',
                        i < request.current_step
                          ? progressColor
                          : i === request.current_step - 1
                            ? 'bg-white ring-2 ring-primary'
                            : 'bg-muted-foreground/30'
                      )}
                      title={step.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conditions display */}
        {request.status === 'approved_with_conditions' && request.conditions && (
          <div className="bg-info-light dark:bg-info/20 border border-info dark:border-info/50 rounded-lg p-3 mb-4">
            <span className="text-sm font-medium text-info-dark dark:text-info">Conditions:</span>
            <p className="text-sm text-info-dark dark:text-info mt-1">{request.conditions}</p>
          </div>
        )}

        {/* Initiator info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <User className="h-4 w-4" />
          <span>
            Submitted by{' '}
            <span className="font-medium text-foreground">
              {request.initiator?.full_name || request.initiator?.email || 'Unknown'}
            </span>
          </span>
        </div>

        {/* Reject comment input */}
        {showRejectInput && (
          <div className="mb-4 p-4 bg-error-light dark:bg-error/20 rounded-lg border border-error dark:border-error/50">
            <label className="block text-sm font-medium text-error-dark dark:text-error mb-2">
              Rejection reason (required)
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className={cn(
                'w-full px-3 py-2 border rounded-md text-sm resize-none',
                'bg-white dark:bg-background',
                'border-error dark:border-error/50',
                'focus:outline-none focus:ring-2 focus:ring-error',
                'placeholder:text-muted-foreground'
              )}
              rows={2}
            />
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectComment.trim() || isLoading}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Confirm Rejection
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowRejectInput(false)
                  setRejectComment('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          {/* Approver actions */}
          {canApprove && !showRejectInput && (
            <>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-success hover:bg-success/90 text-white gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConditionsDialog(true)}
                disabled={isLoading}
                className="border-primary/30 text-primary hover:bg-primary/5 gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                With Conditions
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectInput(true)}
                disabled={isLoading}
                className="border-error text-error hover:bg-error-light dark:hover:bg-error/20 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}

          {/* Initiator cancel action */}
          {isInitiator && request.status === 'pending' && onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(request.id)}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel Request
            </Button>
          )}

          {/* View details */}
          {onViewDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetails(request.id)}
              className="ml-auto gap-1.5 text-muted-foreground hover:text-foreground"
            >
              View Details
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Conditions dialog */}
      <ApproveWithConditionsDialog
        open={showConditionsDialog}
        onOpenChange={setShowConditionsDialog}
        onConfirm={handleConditionsConfirm}
        isLoading={isLoading}
      />
    </div>
  )
})

export default ApprovalRequestCard
