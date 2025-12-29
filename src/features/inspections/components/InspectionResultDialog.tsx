/**
 * Inspection Result Dialog Component
 *
 * Dialog for recording inspection results (pass/fail/conditional).
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { RecordInspectionResultInput, InspectionResult } from '../types'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface InspectionResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inspectionId: string
  inspectionName: string
  onSubmit: (data: RecordInspectionResultInput) => void
  isSubmitting?: boolean
}

const resultOptions: {
  value: InspectionResult
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
  {
    value: 'pass',
    label: 'Pass',
    icon: CheckCircle,
    color: 'text-success border-green-500 bg-success-light',
  },
  {
    value: 'fail',
    label: 'Fail',
    icon: XCircle,
    color: 'text-error border-red-500 bg-error-light',
  },
  {
    value: 'conditional',
    label: 'Conditional',
    icon: AlertCircle,
    color: 'text-warning border-warning bg-warning-light',
  },
]

export function InspectionResultDialog({
  open,
  onOpenChange,
  inspectionId,
  inspectionName,
  onSubmit,
  isSubmitting = false,
}: InspectionResultDialogProps) {
  const [result, setResult] = useState<InspectionResult | null>(null)
  const [resultDate, setResultDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [inspectorNotes, setInspectorNotes] = useState('')
  const [failureReasons, setFailureReasons] = useState('')
  const [correctiveActions, setCorrectiveActions] = useState('')
  const [reinspectionDate, setReinspectionDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!result) {
      newErrors.result = 'Please select a result'
    }

    if (!resultDate) {
      newErrors.resultDate = 'Result date is required'
    }

    if (!inspectorNotes.trim()) {
      newErrors.inspectorNotes = 'Inspector notes are required'
    }

    if (result === 'fail') {
      if (!failureReasons.trim()) {
        newErrors.failureReasons = 'Failure reasons are required for failed inspections'
      }
      if (!correctiveActions.trim()) {
        newErrors.correctiveActions =
          'Corrective actions are required for failed inspections'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm() || !result) {
      return
    }

    onSubmit({
      id: inspectionId,
      result,
      result_date: resultDate,
      inspector_notes: inspectorNotes,
      failure_reasons: result === 'fail' || result === 'conditional' ? failureReasons : undefined,
      corrective_actions_required:
        result === 'fail' || result === 'conditional' ? correctiveActions : undefined,
      reinspection_scheduled_date: result === 'fail' ? reinspectionDate || undefined : undefined,
    })
  }

  const resetForm = () => {
    setResult(null)
    setResultDate(new Date().toISOString().split('T')[0])
    setInspectorNotes('')
    setFailureReasons('')
    setCorrectiveActions('')
    setReinspectionDate('')
    setErrors({})
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Inspection Result</DialogTitle>
          <DialogDescription>
            Record the result for: <strong>{inspectionName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Result Selection */}
          <div className="space-y-3">
            <Label>
              Result <span className="text-error">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {resultOptions.map((option) => {
                const Icon = option.icon
                const isSelected = result === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setResult(option.value)}
                    className={cn(
                      'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all',
                      isSelected ? option.color : 'border-border hover:border-input'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-8 w-8 mb-2',
                        isSelected ? '' : 'text-disabled'
                      )}
                    />
                    <span
                      className={cn(
                        'font-medium',
                        isSelected ? '' : 'text-secondary'
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {errors.result && (
              <p className="text-sm text-error">{errors.result}</p>
            )}
          </div>

          {/* Result Date */}
          <div className="space-y-2">
            <Label htmlFor="resultDate">
              Result Date <span className="text-error">*</span>
            </Label>
            <Input
              id="resultDate"
              type="date"
              value={resultDate}
              onChange={(e) => setResultDate(e.target.value)}
              className={cn(errors.resultDate && 'border-red-500')}
            />
            {errors.resultDate && (
              <p className="text-sm text-error">{errors.resultDate}</p>
            )}
          </div>

          {/* Inspector Notes */}
          <div className="space-y-2">
            <Label htmlFor="inspectorNotes">
              Inspector Notes <span className="text-error">*</span>
            </Label>
            <Textarea
              id="inspectorNotes"
              value={inspectorNotes}
              onChange={(e) => setInspectorNotes(e.target.value)}
              placeholder="Enter inspection findings and notes..."
              rows={3}
              className={cn(errors.inspectorNotes && 'border-red-500')}
            />
            {errors.inspectorNotes && (
              <p className="text-sm text-error">{errors.inspectorNotes}</p>
            )}
          </div>

          {/* Failure-specific fields */}
          {(result === 'fail' || result === 'conditional') && (
            <>
              {/* Failure Reasons */}
              <div className="space-y-2">
                <Label htmlFor="failureReasons">
                  Failure Reasons{' '}
                  {result === 'fail' && <span className="text-error">*</span>}
                </Label>
                <Textarea
                  id="failureReasons"
                  value={failureReasons}
                  onChange={(e) => setFailureReasons(e.target.value)}
                  placeholder="Describe why the inspection failed..."
                  rows={3}
                  className={cn(errors.failureReasons && 'border-red-500')}
                />
                {errors.failureReasons && (
                  <p className="text-sm text-error">{errors.failureReasons}</p>
                )}
              </div>

              {/* Corrective Actions */}
              <div className="space-y-2">
                <Label htmlFor="correctiveActions">
                  Corrective Actions Required{' '}
                  {result === 'fail' && <span className="text-error">*</span>}
                </Label>
                <Textarea
                  id="correctiveActions"
                  value={correctiveActions}
                  onChange={(e) => setCorrectiveActions(e.target.value)}
                  placeholder="List required corrective actions..."
                  rows={3}
                  className={cn(errors.correctiveActions && 'border-red-500')}
                />
                {errors.correctiveActions && (
                  <p className="text-sm text-error">{errors.correctiveActions}</p>
                )}
              </div>

              {/* Reinspection Date (only for fail) */}
              {result === 'fail' && (
                <div className="space-y-2">
                  <Label htmlFor="reinspectionDate">
                    Reinspection Date (optional)
                  </Label>
                  <Input
                    id="reinspectionDate"
                    type="date"
                    value={reinspectionDate}
                    onChange={(e) => setReinspectionDate(e.target.value)}
                  />
                  <p className="text-xs text-muted">
                    Schedule a reinspection date if known
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Record Result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default InspectionResultDialog
