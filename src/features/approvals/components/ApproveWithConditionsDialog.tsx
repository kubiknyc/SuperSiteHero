/**
 * Approve With Conditions Dialog Component
 *
 * Modal dialog for entering conditions when approving with conditions
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ApproveWithConditionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (conditions: string, comment?: string) => void
  isLoading?: boolean
  title?: string
  description?: string
}

export function ApproveWithConditionsDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  title = 'Approve with Conditions',
  description = 'Specify the conditions that must be met for this approval.',
}: ApproveWithConditionsDialogProps) {
  const [conditions, setConditions] = React.useState('')
  const [comment, setComment] = React.useState('')

  const handleConfirm = () => {
    if (conditions.trim()) {
      onConfirm(conditions.trim(), comment.trim() || undefined)
    }
  }

  const handleClose = () => {
    setConditions('')
    setComment('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conditions (required) */}
          <div>
            <label
              htmlFor="conditions"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Conditions <span className="text-red-500">*</span>
            </label>
            <textarea
              id="conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Enter the conditions that must be met..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              These conditions will be visible to the requester.
            </p>
          </div>

          {/* Comment (optional) */}
          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Additional Comment (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add any additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!conditions.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Approving...' : 'Approve with Conditions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApproveWithConditionsDialog
