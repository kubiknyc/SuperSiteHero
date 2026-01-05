/**
 * Approval Request Detail Page
 *
 * Shows full details of an approval request with history and actions
 */

import * as React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import {
  ApprovalStatusBadge,
  ApprovalHistory,
  ApproveWithConditionsDialog,
} from '@/features/approvals/components'
import {
  useApprovalRequest,
  useApprovalHistory,
  useCanUserApprove,
  useApproveRequest,
  useApproveWithConditions,
  useRejectRequest,
  useCancelApprovalRequest,
  useAddApprovalComment,
} from '@/features/approvals/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import { WORKFLOW_ENTITY_CONFIG } from '@/types/approval-workflow'
import { cn } from '@/lib/utils'
import { logger } from '../../lib/utils/logger';


export function ApprovalRequestPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const [showRejectInput, setShowRejectInput] = React.useState(false)
  const [showConditionsDialog, setShowConditionsDialog] = React.useState(false)
  const [rejectComment, setRejectComment] = React.useState('')
  const [newComment, setNewComment] = React.useState('')

  // Queries
  const { data: request, isLoading, error } = useApprovalRequest(id)
  const { data: history } = useApprovalHistory(id)
  const { data: canApprove } = useCanUserApprove(id, userProfile?.id)

  // Mutations
  const approveMutation = useApproveRequest()
  const approveWithConditionsMutation = useApproveWithConditions()
  const rejectMutation = useRejectRequest()
  const cancelMutation = useCancelApprovalRequest()
  const addCommentMutation = useAddApprovalComment()

  const isMutating =
    approveMutation.isPending ||
    approveWithConditionsMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    addCommentMutation.isPending

  const isInitiator = userProfile?.id === request?.initiated_by
  const isPending = request?.status === 'pending'

  const entityConfig = request
    ? WORKFLOW_ENTITY_CONFIG[request.entity_type]
    : null

  const steps = request?.workflow?.steps || []
  const currentStep = steps.find((s) => s.step_order === request?.current_step)

  const handleApprove = async () => {
    if (!id) {return}
    try {
      await approveMutation.mutateAsync({ requestId: id })
    } catch (error) {
      logger.error('Failed to approve:', error)
    }
  }

  const handleApproveWithConditions = async (
    conditions: string,
    comment?: string
  ) => {
    if (!id) {return}
    try {
      await approveWithConditionsMutation.mutateAsync({
        requestId: id,
        conditions,
        comment,
      })
      setShowConditionsDialog(false)
    } catch (error) {
      logger.error('Failed to approve with conditions:', error)
    }
  }

  const handleReject = async () => {
    if (!id || !rejectComment.trim()) {return}
    try {
      await rejectMutation.mutateAsync({
        requestId: id,
        comment: rejectComment.trim(),
      })
      setRejectComment('')
      setShowRejectInput(false)
    } catch (error) {
      logger.error('Failed to reject:', error)
    }
  }

  const handleCancel = async () => {
    if (!id) {return}
    try {
      await cancelMutation.mutateAsync(id)
      navigate('/approvals')
    } catch (error) {
      logger.error('Failed to cancel:', error)
    }
  }

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) {return}
    try {
      await addCommentMutation.mutateAsync({
        requestId: id,
        comment: newComment.trim(),
      })
      setNewComment('')
    } catch (error) {
      logger.error('Failed to add comment:', error)
    }
  }

  if (isLoading) {
    return (
      <SmartLayout title="Approval Request">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="text-center py-12 text-muted">
            Loading approval details...
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (error || !request) {
    return (
      <SmartLayout title="Approval Request">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-foreground mb-2 heading-section">
              Approval Request Not Found
            </h2>
            <p className="text-muted mb-4">
              The approval request you're looking for doesn't exist or you don't
              have access to it.
            </p>
            <Button onClick={() => navigate('/approvals')}>
              Back to Approvals
            </Button>
          </div>
        </div>
      </SmartLayout>
    )
  }

  const formattedDate = new Date(request.initiated_at).toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  )

  return (
    <SmartLayout title="Approval Request">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          to="/approvals"
          className="inline-flex items-center text-sm text-muted hover:text-secondary mb-4"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Approvals
        </Link>

        {/* Header */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted">
                  {entityConfig?.label}
                </span>
                <ApprovalStatusBadge
                  status={request.status}
                  conditions={request.conditions}
                  showConditions
                />
              </div>
              <h1 className="text-2xl font-bold text-foreground heading-page">
                {request.workflow?.name || 'Approval Request'}
              </h1>
              {request.workflow?.description && (
                <p className="text-muted mt-1">
                  {request.workflow.description}
                </p>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted uppercase">Submitted by</div>
              <div className="font-medium text-foreground">
                {request.initiator?.full_name || request.initiator?.email || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted uppercase">Submitted on</div>
              <div className="font-medium text-foreground">{formattedDate}</div>
            </div>
            <div>
              <div className="text-xs text-muted uppercase">Current Step</div>
              <div className="font-medium text-foreground">
                {currentStep?.name || `Step ${request.current_step}`} of {steps.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted uppercase">Approvers</div>
              <div className="font-medium text-foreground">
                {currentStep?.approver_ids?.length || 0} assigned
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {steps.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>Progress</span>
                <span>
                  {Math.round((request.current_step / steps.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    request.status === 'approved' ||
                      request.status === 'approved_with_conditions'
                      ? 'bg-green-500'
                      : request.status === 'rejected'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  )}
                  style={{
                    width: `${(request.current_step / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Conditions display */}
          {request.status === 'approved_with_conditions' && request.conditions && (
            <div className="mt-4 pt-4 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-1 heading-subsection">
                  Approval Conditions
                </h3>
                <p className="text-primary-hover">{request.conditions}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (canApprove || isInitiator) && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 heading-section">Actions</h2>

            {/* Reject input */}
            {showRejectInput && canApprove && (
              <div className="mb-4 p-4 bg-error-light rounded-lg">
                <label className="block text-sm font-medium text-secondary mb-2">
                  Rejection reason (required)
                </label>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full px-3 py-2 border border-red-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectComment.trim() || isMutating}
                  >
                    Confirm Rejection
                  </Button>
                  <Button
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

            <div className="flex flex-wrap gap-3">
              {/* Approver actions */}
              {canApprove && !showRejectInput && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={isMutating}
                    className="bg-success hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowConditionsDialog(true)}
                    disabled={isMutating}
                    className="border-blue-300 text-primary hover:bg-blue-50"
                  >
                    Approve with Conditions
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectInput(true)}
                    disabled={isMutating}
                    className="border-red-300 text-error hover:bg-error-light"
                  >
                    Reject
                  </Button>
                </>
              )}

              {/* Initiator cancel */}
              {isInitiator && (
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isMutating}
                  className="text-secondary"
                >
                  Cancel Request
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Add comment */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 heading-section">
            Add Comment
          </h2>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="mt-2">
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || isMutating}
            >
              Add Comment
            </Button>
          </div>
        </div>

        {/* Activity history */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 heading-section">
            Activity History
          </h2>
          <ApprovalHistory actions={history || []} />
        </div>

        {/* Conditions dialog */}
        <ApproveWithConditionsDialog
          open={showConditionsDialog}
          onOpenChange={setShowConditionsDialog}
          onConfirm={handleApproveWithConditions}
          isLoading={isMutating}
        />
      </div>
    </SmartLayout>
  )
}

export default ApprovalRequestPage
