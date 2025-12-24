/**
 * Approval Request Card Component
 *
 * Displays an approval request with status, progress, and action buttons
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ApprovalStatusBadge } from './ApprovalStatusBadge'
import { ApproveWithConditionsDialog } from './ApproveWithConditionsDialog'
import type { ApprovalRequest, ApprovalStep } from '@/types/approval-workflow'
import { WORKFLOW_ENTITY_CONFIG } from '@/types/approval-workflow'

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

export function ApprovalRequestCard({
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
  const [showRejectInput, setShowRejectInput] = React.useState(false)
  const [showConditionsDialog, setShowConditionsDialog] = React.useState(false)
  const [rejectComment, setRejectComment] = React.useState('')

  const entityConfig = WORKFLOW_ENTITY_CONFIG[request.entity_type]
  const steps = request.workflow?.steps || []
  const totalSteps = steps.length
  const currentStep = steps.find((s) => s.step_order === request.current_step)

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

  const formattedDate = new Date(request.initiated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className={cn('bg-card border rounded-lg shadow-sm p-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-muted">
              {entityConfig.label}
            </span>
            <ApprovalStatusBadge
              status={request.status}
              conditions={request.conditions}
              showConditions
            />
          </div>
          <h3 className="font-semibold text-foreground heading-subsection">
            {request.workflow?.name || 'Approval Request'}
          </h3>
        </div>
        <span className="text-xs text-muted whitespace-nowrap">{formattedDate}</span>
      </div>

      {/* Progress indicator */}
      {totalSteps > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>
              Step {request.current_step} of {totalSteps}
              {currentStep && `: ${currentStep.name}`}
            </span>
            <span>{Math.round((request.current_step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                request.status === 'approved' || request.status === 'approved_with_conditions'
                  ? 'bg-green-500'
                  : request.status === 'rejected'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              )}
              style={{ width: `${(request.current_step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Conditions display */}
      {request.status === 'approved_with_conditions' && request.conditions && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <span className="text-sm font-medium text-blue-800">Conditions:</span>
          <p className="text-sm text-primary-hover mt-1">{request.conditions}</p>
        </div>
      )}

      {/* Initiator info */}
      <div className="text-sm text-secondary mb-4">
        Submitted by{' '}
        <span className="font-medium">
          {request.initiator?.full_name || request.initiator?.email || 'Unknown'}
        </span>
      </div>

      {/* Reject comment input */}
      {showRejectInput && (
        <div className="mb-4 p-3 bg-surface rounded-lg">
          <label className="block text-sm font-medium text-secondary mb-1">
            Rejection reason (required)
          </label>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Please provide a reason for rejection..."
            className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectComment.trim() || isLoading}
            >
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
      <div className="flex flex-wrap gap-2">
        {/* Approver actions */}
        {canApprove && !showRejectInput && (
          <>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isLoading}
              className="bg-success hover:bg-green-700"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConditionsDialog(true)}
              disabled={isLoading}
              className="border-blue-300 text-primary hover:bg-blue-50"
            >
              Approve with Conditions
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRejectInput(true)}
              disabled={isLoading}
              className="border-red-300 text-error hover:bg-error-light"
            >
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
            className="text-secondary"
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
            className="ml-auto"
          >
            View Details
          </Button>
        )}
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
}

export default ApprovalRequestCard
