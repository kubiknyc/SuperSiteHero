// File: /src/features/submittals/components/SubmittalReviewForm.tsx
// Enhanced submittal review form with prominent A/B/C/D approval code buttons

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { useSubmitReviewWithCode } from '../hooks/useDedicatedSubmittals'
import { cn } from '@/lib/utils'

interface SubmittalReviewFormProps {
  submittalId: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Approval code configuration
const APPROVAL_CODES = [
  {
    code: 'A' as const,
    label: 'Approved',
    description: 'No exceptions taken. Proceed with fabrication/installation.',
    icon: CheckCircle,
    bgColor: 'bg-green-500 hover:bg-green-600',
    borderColor: 'border-green-500',
    textColor: 'text-green-700',
    lightBg: 'bg-green-50',
  },
  {
    code: 'B' as const,
    label: 'Approved as Noted',
    description: 'Make corrections noted. No resubmittal required.',
    icon: CheckCircle,
    bgColor: 'bg-lime-500 hover:bg-lime-600',
    borderColor: 'border-lime-500',
    textColor: 'text-lime-700',
    lightBg: 'bg-lime-50',
  },
  {
    code: 'C' as const,
    label: 'Revise & Resubmit',
    description: 'Make corrections noted and resubmit.',
    icon: RefreshCw,
    bgColor: 'bg-orange-500 hover:bg-orange-600',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-700',
    lightBg: 'bg-orange-50',
  },
  {
    code: 'D' as const,
    label: 'Rejected',
    description: 'Not approved. See comments for details.',
    icon: XCircle,
    bgColor: 'bg-red-500 hover:bg-red-600',
    borderColor: 'border-red-500',
    textColor: 'text-red-700',
    lightBg: 'bg-red-50',
  },
]

export function SubmittalReviewForm({
  submittalId,
  onSuccess,
  onCancel,
}: SubmittalReviewFormProps) {
  const [selectedCode, setSelectedCode] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [comments, setComments] = useState('')

  const submitReview = useSubmitReviewWithCode()

  const handleSubmit = async () => {
    if (!selectedCode) {return}

    try {
      await submitReview.mutateAsync({
        submittalId,
        approvalCode: selectedCode,
        comments: comments.trim() || undefined,
      })

      // Reset form
      setSelectedCode(null)
      setComments('')
      onSuccess?.()
    } catch (_error) {
      // Error handling done by React Query
    }
  }

  const selectedCodeConfig = selectedCode
    ? APPROVAL_CODES.find((c) => c.code === selectedCode)
    : null

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Submit Review
          {selectedCodeConfig && (
            <Badge className={cn('text-white', selectedCodeConfig.bgColor)}>
              Code {selectedCode}: {selectedCodeConfig.label}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Select an approval code to complete the review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Approval Code Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {APPROVAL_CODES.map((code) => {
            const Icon = code.icon
            const isSelected = selectedCode === code.code

            return (
              <button
                key={code.code}
                type="button"
                onClick={() => setSelectedCode(code.code)}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? cn(code.borderColor, code.lightBg)
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg',
                      code.bgColor
                    )}
                  >
                    {code.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('font-semibold', isSelected && code.textColor)}>
                        {code.label}
                      </span>
                      {isSelected && <Icon className={cn('h-4 w-4', code.textColor)} />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {code.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Comments Section */}
        {selectedCode && (
          <div className="space-y-2">
            <Label htmlFor="comments">
              Review Comments
              {['C', 'D'].includes(selectedCode) && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                selectedCode === 'A'
                  ? 'Optional comments...'
                  : selectedCode === 'B'
                  ? 'Describe the notes/corrections to be made...'
                  : selectedCode === 'C'
                  ? 'Describe what needs to be revised and resubmitted...'
                  : 'Explain why the submittal was rejected...'
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className={cn(
                ['C', 'D'].includes(selectedCode) && !comments.trim()
                  ? 'border-red-300 focus:border-red-500'
                  : ''
              )}
            />
            {['C', 'D'].includes(selectedCode) && !comments.trim() && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Comments are required for this approval code
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedCode ||
              submitReview.isPending ||
              (['C', 'D'].includes(selectedCode || '') && !comments.trim())
            }
            className={cn(
              'min-w-[140px]',
              selectedCodeConfig ? selectedCodeConfig.bgColor : ''
            )}
          >
            {submitReview.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Review
                {selectedCode && <span className="ml-2 font-bold">({selectedCode})</span>}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SubmittalReviewForm
