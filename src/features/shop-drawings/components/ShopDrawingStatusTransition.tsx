// File: /src/features/shop-drawings/components/ShopDrawingStatusTransition.tsx
// Status transition controls for shop drawings with validation

import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Loader2,
  ChevronDown,
  CheckCircle,
  XCircle,
  RotateCcw,
  Send,
  Lock,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SubmittalReviewStatus, SubmittalApprovalCode } from '@/types/database'
import { SUBMITTAL_REVIEW_STATUSES } from '@/types/submittal'
import {
  useTransitionShopDrawingStatus,
  isShopDrawingLocked,
  getShopDrawingNextStatusOptions,
} from '../hooks'

interface ShopDrawingStatusTransitionProps {
  shopDrawingId: string
  currentStatus: SubmittalReviewStatus
  onTransitionComplete?: () => void
}

// Map status to icon
const statusIcons: Record<string, React.ReactNode> = {
  submitted: <Send className="h-4 w-4" />,
  under_gc_review: <AlertCircle className="h-4 w-4" />,
  submitted_to_architect: <Send className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  approved_as_noted: <CheckCircle className="h-4 w-4" />,
  revise_resubmit: <RotateCcw className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
}

// Map status to approval code
const statusToApprovalCode: Record<string, SubmittalApprovalCode> = {
  approved: 'A',
  approved_as_noted: 'B',
  revise_resubmit: 'C',
  rejected: 'D',
}

export const ShopDrawingStatusTransition = memo(function ShopDrawingStatusTransition({
  shopDrawingId,
  currentStatus,
  onTransitionComplete,
}: ShopDrawingStatusTransitionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<SubmittalReviewStatus | null>(null)
  const [comments, setComments] = useState('')

  const transitionMutation = useTransitionShopDrawingStatus()

  const validNextStatuses = getShopDrawingNextStatusOptions(currentStatus)
  const isLocked = isShopDrawingLocked(currentStatus)

  const handleStatusSelect = (status: SubmittalReviewStatus) => {
    setSelectedStatus(status)
    setComments('')
    setIsDialogOpen(true)
  }

  const handleConfirmTransition = async () => {
    if (!selectedStatus) return

    try {
      const approvalCode = statusToApprovalCode[selectedStatus]

      await transitionMutation.mutateAsync({
        id: shopDrawingId,
        newStatus: selectedStatus,
        approvalCode,
        comments: comments.trim() || undefined,
      })

      const statusLabel = SUBMITTAL_REVIEW_STATUSES.find(s => s.value === selectedStatus)?.label || selectedStatus
      toast.success(`Status changed to ${statusLabel}`)

      setIsDialogOpen(false)
      setSelectedStatus(null)
      setComments('')
      onTransitionComplete?.()
    } catch (error) {
      toast.error('Failed to update status: ' + (error as Error).message)
    }
  }

  // If locked, show locked indicator
  if (isLocked) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
        <Lock className="h-4 w-4" />
        <span>
          This shop drawing is {currentStatus === 'approved' ? 'approved' : 'approved as noted'} and locked.
        </span>
      </div>
    )
  }

  // If no valid transitions, show nothing
  if (validNextStatuses.length === 0) {
    return null
  }

  const getStatusButtonVariant = (status: SubmittalReviewStatus): 'default' | 'destructive' | 'outline' => {
    if (['approved', 'approved_as_noted'].includes(status)) return 'default'
    if (['rejected'].includes(status)) return 'destructive'
    return 'outline'
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Actions:</span>

        {/* Quick action buttons for common transitions */}
        {validNextStatuses.length <= 3 ? (
          // Show individual buttons if few options
          validNextStatuses.map((status) => {
            const statusInfo = SUBMITTAL_REVIEW_STATUSES.find(s => s.value === status)
            return (
              <Button
                key={status}
                variant={getStatusButtonVariant(status)}
                size="sm"
                onClick={() => handleStatusSelect(status)}
                disabled={transitionMutation.isPending}
              >
                {statusIcons[status]}
                <span className="ml-1">{statusInfo?.label || status}</span>
              </Button>
            )
          })
        ) : (
          // Show dropdown if many options
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={transitionMutation.isPending}>
                Change Status
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {validNextStatuses.map((status) => {
                const statusInfo = SUBMITTAL_REVIEW_STATUSES.find(s => s.value === status)
                return (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                  >
                    <span className="mr-2">{statusIcons[status]}</span>
                    {statusInfo?.label || status}
                    {statusToApprovalCode[status] && (
                      <span className="ml-2 text-muted-foreground">
                        (Code {statusToApprovalCode[status]})
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                Changing status from{' '}
                <span className="font-medium">
                  {SUBMITTAL_REVIEW_STATUSES.find(s => s.value === currentStatus)?.label || currentStatus}
                </span>
                {' '}to{' '}
                <span className="font-medium">
                  {SUBMITTAL_REVIEW_STATUSES.find(s => s.value === selectedStatus)?.label || selectedStatus}
                </span>
                {statusToApprovalCode[selectedStatus || ''] && (
                  <span className="ml-1 text-muted-foreground">
                    (Approval Code: {statusToApprovalCode[selectedStatus || '']})
                  </span>
                )}
              </p>
            </div>

            {/* Warning for terminal states */}
            {selectedStatus && ['approved', 'approved_as_noted'].includes(selectedStatus) && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Once approved, this shop drawing will be <strong>locked</strong> and cannot be modified.
                  Any changes will require creating a new revision.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="transition-comments">
                Comments {selectedStatus === 'revise_resubmit' ? '(required)' : '(optional)'}
              </Label>
              <Textarea
                id="transition-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  selectedStatus === 'approved'
                    ? 'No exceptions taken...'
                    : selectedStatus === 'approved_as_noted'
                    ? 'Make corrections noted...'
                    : selectedStatus === 'revise_resubmit'
                    ? 'Describe required revisions...'
                    : selectedStatus === 'rejected'
                    ? 'Reason for rejection...'
                    : 'Add comments...'
                }
                rows={4}
                required={selectedStatus === 'revise_resubmit'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={transitionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={getStatusButtonVariant(selectedStatus || 'submitted')}
              onClick={handleConfirmTransition}
              disabled={
                transitionMutation.isPending ||
                (selectedStatus === 'revise_resubmit' && !comments.trim())
              }
            >
              {transitionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
