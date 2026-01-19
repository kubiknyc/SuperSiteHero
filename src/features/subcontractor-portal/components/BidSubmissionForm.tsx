/**
 * Bid Submission Form Component
 * Form for subcontractors to submit their bid response
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSubmitBid, useDeclineBid } from '../hooks'
import { Loader2, Send, XCircle } from 'lucide-react'
import type { BidWithRelations } from '@/types/subcontractor-portal'

const bidSchema = z.object({
  lump_sum_cost: z.number().positive('Bid amount must be greater than 0'),
  duration_days: z.number().int().positive('Duration must be at least 1 day'),
  notes: z.string().optional(),
  exclusions: z.string().optional(),
})

type BidFormData = z.infer<typeof bidSchema>

interface BidSubmissionFormProps {
  bid: BidWithRelations
}

export function BidSubmissionForm({ bid }: BidSubmissionFormProps) {
  const navigate = useNavigate()
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const submitBid = useSubmitBid()
  const declineBid = useDeclineBid()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BidFormData>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      lump_sum_cost: bid.lump_sum_cost || undefined,
      duration_days: bid.duration_days || undefined,
      notes: bid.notes || '',
      exclusions: bid.exclusions || '',
    },
  })

  const onSubmit = async (data: BidFormData) => {
    await submitBid.mutateAsync({
      bidId: bid.id,
      data: {
        lump_sum_cost: data.lump_sum_cost,
        duration_days: data.duration_days,
        notes: data.notes,
        exclusions: data.exclusions,
      },
    })
    navigate('/sub/bids')
  }

  const handleDecline = async () => {
    await declineBid.mutateAsync({
      bidId: bid.id,
      reason: declineReason || undefined,
    })
    setShowDeclineDialog(false)
    navigate('/sub/bids')
  }

  const isPending = bid.bid_status === 'pending' || bid.bid_status === 'draft'

  if (!isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="heading-card">Bid Already Submitted</CardTitle>
          <CardDescription>
            This bid has already been {bid.bid_status}. You cannot modify it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Bid Amount</p>
              <p className="heading-subsection">
                ${bid.lump_sum_cost?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="heading-subsection">
                {bid.duration_days || 'N/A'} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="heading-card">Submit Your Bid</CardTitle>
          <CardDescription>
            Provide your pricing and timeline for this change order work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bid Amount */}
              <div className="space-y-2">
                <Label htmlFor="lump_sum_cost">Bid Amount ($) *</Label>
                <Input
                  id="lump_sum_cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('lump_sum_cost', { valueAsNumber: true })}
                />
                {errors.lump_sum_cost && (
                  <p className="text-sm text-destructive">{errors.lump_sum_cost.message}</p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration_days">Duration (days) *</Label>
                <Input
                  id="duration_days"
                  type="number"
                  placeholder="0"
                  {...register('duration_days', { valueAsNumber: true })}
                />
                {errors.duration_days && (
                  <p className="text-sm text-destructive">{errors.duration_days.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or clarifications..."
                rows={3}
                {...register('notes')}
              />
            </div>

            {/* Exclusions */}
            <div className="space-y-2">
              <Label htmlFor="exclusions">Exclusions (optional)</Label>
              <Textarea
                id="exclusions"
                placeholder="List any exclusions from your bid..."
                rows={3}
                {...register('exclusions')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || submitBid.isPending}
                className="flex-1"
              >
                {(isSubmitting || submitBid.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Bid
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeclineDialog(true)}
                disabled={declineBid.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Bid Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this bid request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="decline-reason">Reason (optional)</Label>
            <Textarea
              id="decline-reason"
              placeholder="Why are you declining this bid request?"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={declineBid.isPending}
            >
              {declineBid.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                'Decline Bid'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BidSubmissionForm
