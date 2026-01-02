/**
 * ProgressIndicator Component
 * Shows progress for multi-step operations with optional estimated time
 */

import * as React from 'react'
import { X, Check, Loader2, AlertCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

// ============================================================================
// Types
// ============================================================================

export interface ProgressStep {
  /** Unique identifier for the step */
  id: string
  /** Display label for the step */
  label: string
  /** Current status of the step */
  status: 'pending' | 'active' | 'completed' | 'error'
  /** Optional description */
  description?: string
  /** Optional custom icon */
  icon?: LucideIcon
}

export interface ProgressIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Steps to display */
  steps: ProgressStep[]
  /** Current step index (0-based) */
  currentStep?: number
  /** Overall progress percentage (0-100) */
  progress?: number
  /** Estimated time remaining */
  estimatedTime?: string
  /** Whether the operation can be cancelled */
  cancellable?: boolean
  /** Callback when cancel is clicked */
  onCancel?: () => void
  /** Variant style */
  variant?: 'default' | 'compact' | 'minimal'
  /** Whether to show the progress bar */
  showProgressBar?: boolean
  /** Custom completion message */
  completionMessage?: string
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  value: number
  className?: string
  showPercentage?: boolean
}

export function ProgressBar({ value, className, showPercentage = true }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Step Indicator Component
// ============================================================================

function StepIndicator({ step, isLast }: { step: ProgressStep; isLast: boolean }) {
  const Icon = step.icon

  return (
    <div className="flex items-start gap-3">
      {/* Step circle */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
            step.status === 'completed' && 'border-success bg-success text-white',
            step.status === 'active' && 'border-primary bg-primary/10 text-primary',
            step.status === 'error' && 'border-destructive bg-destructive/10 text-destructive',
            step.status === 'pending' && 'border-muted-foreground/30 bg-muted text-muted-foreground'
          )}
        >
          {step.status === 'completed' && <Check className="h-4 w-4" />}
          {step.status === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
          {step.status === 'error' && <AlertCircle className="h-4 w-4" />}
          {step.status === 'pending' && (
            Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs font-medium">•</span>
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div
            className={cn(
              'w-0.5 h-6 my-1 transition-colors',
              step.status === 'completed' ? 'bg-success' : 'bg-muted-foreground/20'
            )}
          />
        )}
      </div>

      {/* Step content */}
      <div className="pb-6">
        <p
          className={cn(
            'font-medium text-sm',
            step.status === 'completed' && 'text-foreground',
            step.status === 'active' && 'text-primary',
            step.status === 'error' && 'text-destructive',
            step.status === 'pending' && 'text-muted-foreground'
          )}
        >
          {step.label}
        </p>
        {step.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ProgressIndicator({
  steps,
  currentStep,
  progress,
  estimatedTime,
  cancellable = false,
  onCancel,
  variant = 'default',
  showProgressBar = true,
  completionMessage = 'Completed',
  className,
  ...props
}: ProgressIndicatorProps) {
  const completedSteps = steps.filter((s) => s.status === 'completed').length
  const hasError = steps.some((s) => s.status === 'error')
  const isComplete = completedSteps === steps.length && !hasError

  // Calculate progress from steps if not provided
  const calculatedProgress = progress ?? (completedSteps / steps.length) * 100

  if (variant === 'minimal') {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {completedSteps + (hasError || isComplete ? 0 : 1)} of {steps.length}
          </span>
          {estimatedTime && !isComplete && (
            <span className="text-muted-foreground">{estimatedTime} remaining</span>
          )}
        </div>
        <ProgressBar value={calculatedProgress} />
        {cancellable && onCancel && !isComplete && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="mt-2">
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    const activeStep = steps.find((s) => s.status === 'active')
    return (
      <div className={cn('space-y-3', className)} {...props}>
        {showProgressBar && <ProgressBar value={calculatedProgress} />}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : isComplete ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            <span className="text-sm font-medium">
              {hasError
                ? 'Error occurred'
                : isComplete
                ? completionMessage
                : activeStep?.label ?? 'Processing...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {estimatedTime && !isComplete && !hasError && (
              <span className="text-xs text-muted-foreground">{estimatedTime}</span>
            )}
            {cancellable && onCancel && !isComplete && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default full variant
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {/* Header with progress bar */}
      {showProgressBar && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {hasError
                ? 'Error occurred'
                : isComplete
                ? completionMessage
                : `Step ${completedSteps + 1} of ${steps.length}`}
            </span>
            {estimatedTime && !isComplete && !hasError && (
              <span className="text-muted-foreground">{estimatedTime}</span>
            )}
          </div>
          <ProgressBar value={calculatedProgress} showPercentage={false} />
        </div>
      )}

      {/* Steps list */}
      <div className="space-y-0">
        {steps.map((step, index) => (
          <StepIndicator key={step.id} step={step} isLast={index === steps.length - 1} />
        ))}
      </div>

      {/* Cancel button */}
      {cancellable && onCancel && !isComplete && (
        <Button variant="outline" size="sm" onClick={onCancel} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Cancel Operation
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Hook for Managing Progress Steps
// ============================================================================

export function useProgressSteps(initialSteps: Omit<ProgressStep, 'status'>[]) {
  const [steps, setSteps] = React.useState<ProgressStep[]>(
    initialSteps.map((step) => ({ ...step, status: 'pending' as const }))
  )

  const startStep = React.useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status: 'active' as const } : step
      )
    )
  }, [])

  const completeStep = React.useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status: 'completed' as const } : step
      )
    )
  }, [])

  const failStep = React.useCallback((stepId: string, description?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, status: 'error' as const, description: description ?? step.description }
          : step
      )
    )
  }, [])

  const reset = React.useCallback(() => {
    setSteps(initialSteps.map((step) => ({ ...step, status: 'pending' as const })))
  }, [initialSteps])

  const progress = React.useMemo(() => {
    const completed = steps.filter((s) => s.status === 'completed').length
    return (completed / steps.length) * 100
  }, [steps])

  return {
    steps,
    startStep,
    completeStep,
    failStep,
    reset,
    progress,
    isComplete: steps.every((s) => s.status === 'completed'),
    hasError: steps.some((s) => s.status === 'error'),
  }
}
