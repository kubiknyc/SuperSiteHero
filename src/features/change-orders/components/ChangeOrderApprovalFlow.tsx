// File: /src/features/change-orders/components/ChangeOrderApprovalFlow.tsx
// Visual workflow indicator and approval actions for change orders

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import {
  useSubmitEstimate,
  useProcessInternalApproval,
  useSubmitToOwner,
  useProcessOwnerApproval,
  useVoidChangeOrder,
} from '../hooks/useChangeOrdersV2'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Send,
  Ban,
  FileCheck,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ChangeOrderStatus,
  canSubmitForApproval,
  canApproveInternally,
  canSendToOwner,
  type ChangeOrder,
} from '@/types/change-order'
import { logger } from '../../../lib/utils/logger';


interface ChangeOrderApprovalFlowProps {
  changeOrder: ChangeOrder
  onStatusChange?: () => void
}

// Workflow step configuration
const WORKFLOW_STEPS = [
  { status: 'draft', label: 'Draft', step: 1, icon: FileCheck },
  { status: 'estimate_complete', label: 'Estimate', step: 2, icon: FileCheck },
  { status: 'pending_internal_approval', label: 'Internal Review', step: 3, icon: Clock },
  { status: 'internally_approved', label: 'Internally Approved', step: 4, icon: CheckCircle },
  { status: 'pending_owner_review', label: 'Owner Review', step: 5, icon: Clock },
  { status: 'approved', label: 'Approved', step: 6, icon: CheckCircle },
]

export function ChangeOrderApprovalFlow({ changeOrder, onStatusChange }: ChangeOrderApprovalFlowProps) {
  // Mutations
  const submitEstimate = useSubmitEstimate()
  const processInternalApproval = useProcessInternalApproval()
  const submitToOwner = useSubmitToOwner()
  const processOwnerApproval = useProcessOwnerApproval()
  const voidChangeOrder = useVoidChangeOrder()

  // Local state for approval dialog
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [approvalType, setApprovalType] = useState<'internal' | 'owner' | null>(null)
  const [comments, setComments] = useState('')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [approvedDays, setApprovedDays] = useState('')
  const [approverName, setApproverName] = useState('')
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)

  // Calculate current step
  const getCurrentStep = (status: string): number => {
    const stepMap: Record<string, number> = {
      draft: 1,
      pending_estimate: 1,
      estimate_complete: 2,
      pending_internal_approval: 3,
      internally_approved: 4,
      pending_owner_review: 5,
      approved: 6,
      rejected: 0,
      void: 0,
    }
    return stepMap[status] || 0
  }

  const currentStep = getCurrentStep(changeOrder.status)
  const isRejected = changeOrder.status === ChangeOrderStatus.REJECTED
  const isVoid = changeOrder.status === ChangeOrderStatus.VOID
  const isPending = changeOrder.status.includes('pending')

  // Check capabilities
  const canSubmit = canSubmitForApproval(changeOrder)
  const canApproveInt = canApproveInternally(changeOrder)
  const canSendOwner = canSendToOwner(changeOrder)
  const isPendingOwner = changeOrder.status === ChangeOrderStatus.PENDING_OWNER_REVIEW

  // Reset form
  const resetForm = () => {
    setShowApprovalForm(false)
    setApprovalType(null)
    setComments('')
    setApprovedAmount('')
    setApprovedDays('')
    setApproverName('')
  }

  // Handle submit estimate
  const handleSubmitEstimate = async () => {
    try {
      await submitEstimate.mutateAsync({
        id: changeOrder.id,
        proposed_amount: changeOrder.proposed_amount,
        proposed_days: changeOrder.proposed_days,
      })
      onStatusChange?.()
    } catch (e) {
      logger.error('Failed to submit estimate:', e)
    }
  }

  // Handle internal approval
  const handleInternalApproval = async (approved: boolean) => {
    try {
      await processInternalApproval.mutateAsync({
        id: changeOrder.id,
        approved,
        comments,
      })
      resetForm()
      onStatusChange?.()
    } catch (e) {
      logger.error('Failed to process internal approval:', e)
    }
  }

  // Handle submit to owner
  const handleSubmitToOwner = async () => {
    try {
      await submitToOwner.mutateAsync(changeOrder.id)
      onStatusChange?.()
    } catch (e) {
      logger.error('Failed to submit to owner:', e)
    }
  }

  // Handle owner approval
  const handleOwnerApproval = async (approved: boolean) => {
    try {
      await processOwnerApproval.mutateAsync({
        id: changeOrder.id,
        approved,
        approved_amount: approved ? parseFloat(approvedAmount) || changeOrder.proposed_amount : undefined,
        approved_days: approved ? parseInt(approvedDays) || changeOrder.proposed_days : undefined,
        comments,
        approver_name: approverName || undefined,
      })
      resetForm()
      onStatusChange?.()
    } catch (e) {
      logger.error('Failed to process owner approval:', e)
    }
  }

  // Handle void
  const handleVoidConfirm = useCallback(async () => {
    try {
      await voidChangeOrder.mutateAsync({ id: changeOrder.id, reason: comments || 'Voided by user' })
      resetForm()
      onStatusChange?.()
    } catch (e) {
      logger.error('Failed to void change order:', e)
    }
  }, [changeOrder.id, comments, voidChangeOrder, onStatusChange])

  // Render approval form
  const renderApprovalForm = () => {
    if (!showApprovalForm) {return null}

    const isOwnerApproval = approvalType === 'owner'

    return (
      <Card className={cn('mt-4', isOwnerApproval ? 'border-purple-200 bg-purple-50' : 'border-blue-200 bg-blue-50')}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {isOwnerApproval ? 'Owner Approval' : 'Internal Approval'}
          </CardTitle>
          <CardDescription>
            {isOwnerApproval
              ? 'Enter final approved amounts for this change order'
              : 'Review and approve or reject this change order internally'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwnerApproval && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Approved Amount</Label>
                  <Input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    placeholder={changeOrder.proposed_amount.toString()}
                  />
                  <p className="text-xs text-muted mt-1">
                    Proposed: ${changeOrder.proposed_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Approved Days</Label>
                  <Input
                    type="number"
                    value={approvedDays}
                    onChange={(e) => setApprovedDays(e.target.value)}
                    placeholder={changeOrder.proposed_days.toString()}
                  />
                  <p className="text-xs text-muted mt-1">
                    Proposed: {changeOrder.proposed_days} days
                  </p>
                </div>
              </div>
              <div>
                <Label>Owner Representative Name</Label>
                <Input
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Name of person signing"
                />
              </div>
            </>
          )}

          <div>
            <Label>Comments</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={isOwnerApproval ? 'Optional approval notes...' : 'Approval or rejection reason...'}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-error border-red-200 hover:bg-error-light"
              onClick={() => (isOwnerApproval ? handleOwnerApproval(false) : handleInternalApproval(false))}
              disabled={processInternalApproval.isPending || processOwnerApproval.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              className="bg-success hover:bg-green-700"
              onClick={() => (isOwnerApproval ? handleOwnerApproval(true) : handleInternalApproval(true))}
              disabled={processInternalApproval.isPending || processOwnerApproval.isPending}
            >
              {(processInternalApproval.isPending || processOwnerApproval.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Approval Workflow
              {isPending && (
                <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </CardTitle>
            {changeOrder.ball_in_court_user && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-orange-500" />
                <span className="text-orange-700 font-medium">
                  Ball: {changeOrder.ball_in_court_user.full_name}
                </span>
                {changeOrder.ball_in_court_role && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {changeOrder.ball_in_court_role}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Rejected/Void banner */}
          {(isRejected || isVoid) && (
            <div
              className={cn(
                'p-4 rounded-lg mb-4 flex items-center gap-3',
                isVoid ? 'bg-muted text-secondary' : 'bg-error-light text-error-dark'
              )}
            >
              {isVoid ? <Ban className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <div>
                <p className="font-medium">{isVoid ? 'Change Order Voided' : 'Change Order Rejected'}</p>
                {changeOrder.owner_comments && (
                  <p className="text-sm mt-1">{changeOrder.owner_comments}</p>
                )}
              </div>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, i) => {
              const StepIcon = step.icon
              const isCompleted = currentStep > step.step
              const isCurrent = currentStep === step.step
              const isActive = isCompleted || isCurrent

              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                        isCompleted
                          ? 'bg-success text-white'
                          : isCurrent
                          ? 'bg-primary text-white ring-4 ring-blue-100'
                          : 'bg-muted text-muted'
                      )}
                    >
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <span
                      className={cn(
                        'text-xs mt-2 text-center font-medium',
                        isActive ? 'text-primary' : 'text-disabled'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div className="flex-1 mx-2">
                      <div
                        className={cn(
                          'h-1 rounded',
                          isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-200' : 'bg-muted'
                        )}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Approval dates */}
          {(changeOrder.date_internal_approved || changeOrder.date_owner_approved) && (
            <div className="mt-4 pt-4 border-t flex gap-6 text-sm">
              {changeOrder.date_internal_approved && (
                <div>
                  <span className="text-muted">Internal Approved:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(changeOrder.date_internal_approved), 'MMM d, yyyy')}
                  </span>
                  {changeOrder.internal_approver_name && (
                    <span className="text-muted"> by {changeOrder.internal_approver_name}</span>
                  )}
                </div>
              )}
              {changeOrder.date_owner_approved && (
                <div>
                  <span className="text-muted">Owner Approved:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(changeOrder.date_owner_approved), 'MMM d, yyyy')}
                  </span>
                  {changeOrder.owner_approver_name && (
                    <span className="text-muted"> by {changeOrder.owner_approver_name}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!isVoid && currentStep > 0 && (
            <div className="mt-6 pt-4 border-t flex flex-wrap gap-3 justify-end">
              {canSubmit && (
                <Button onClick={handleSubmitEstimate} disabled={submitEstimate.isPending}>
                  {submitEstimate.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit for Internal Approval
                </Button>
              )}

              {canApproveInt && !showApprovalForm && (
                <Button
                  onClick={() => {
                    setShowApprovalForm(true)
                    setApprovalType('internal')
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review Internal Approval
                </Button>
              )}

              {canSendOwner && (
                <Button onClick={handleSubmitToOwner} disabled={submitToOwner.isPending}>
                  {submitToOwner.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit to Owner
                </Button>
              )}

              {isPendingOwner && !showApprovalForm && (
                <Button
                  onClick={() => {
                    setShowApprovalForm(true)
                    setApprovalType('owner')
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Process Owner Approval
                </Button>
              )}

              {/* Void button */}
              {changeOrder.status !== 'approved' && (
                <Button
                  variant="outline"
                  className="text-error border-red-200 hover:bg-error-light"
                  onClick={() => setShowVoidConfirm(true)}
                  disabled={voidChangeOrder.isPending}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Void
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval form */}
      {renderApprovalForm()}

      {/* Void confirmation dialog */}
      <AlertDialog open={showVoidConfirm} onOpenChange={setShowVoidConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Change Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this change order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidConfirm}
              className="bg-error hover:bg-red-700"
            >
              Void Change Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ChangeOrderApprovalFlow
