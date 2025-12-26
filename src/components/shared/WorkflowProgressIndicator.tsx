// File: /src/components/shared/WorkflowProgressIndicator.tsx
// Reusable step-based workflow visualization component

import { CheckCircle, XCircle, AlertTriangle, Clock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

/**
 * Configuration for a single workflow step
 */
export interface WorkflowStep {
  /** Unique key for the step (usually status value) */
  key: string
  /** Display label for the step */
  label: string
  /** Step number (1-indexed) for ordering */
  step: number
  /** Optional icon for the step */
  icon?: LucideIcon
}

/**
 * Props for the WorkflowProgressIndicator component
 */
export interface WorkflowProgressIndicatorProps {
  /** Array of workflow steps in order */
  steps: WorkflowStep[]
  /** Current step number (1-indexed) */
  currentStep: number
  /** Whether the workflow is in an error/rejected state */
  isError?: boolean
  /** Whether the workflow is in a voided/cancelled state */
  isVoided?: boolean
  /** Error message to display when isError is true */
  errorMessage?: string
  /** Void/cancelled message to display when isVoided is true */
  voidedMessage?: string
  /** Ball-in-court information */
  ballInCourt?: {
    name?: string
    role?: string
    entity?: string
  }
  /** Orientation - horizontal on desktop, can force vertical */
  orientation?: 'horizontal' | 'vertical' | 'auto'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class name */
  className?: string
}

/**
 * WorkflowProgressIndicator
 *
 * A reusable component for displaying workflow progress with connected steps.
 * Supports error states, ball-in-court tracking, and responsive layouts.
 *
 * @example
 * ```tsx
 * const RFI_STEPS: WorkflowStep[] = [
 *   { key: 'draft', label: 'Draft', step: 1, icon: FileEdit },
 *   { key: 'submitted', label: 'Submitted', step: 2, icon: Send },
 *   { key: 'under_review', label: 'Under Review', step: 3, icon: Clock },
 *   { key: 'responded', label: 'Responded', step: 4, icon: MessageSquare },
 *   { key: 'closed', label: 'Closed', step: 5, icon: CheckCircle },
 * ];
 *
 * <WorkflowProgressIndicator
 *   steps={RFI_STEPS}
 *   currentStep={3}
 *   ballInCourt={{ name: 'John Doe', role: 'Architect' }}
 * />
 * ```
 */
export function WorkflowProgressIndicator({
  steps,
  currentStep,
  isError = false,
  isVoided = false,
  errorMessage,
  voidedMessage,
  ballInCourt,
  orientation = 'auto',
  size = 'md',
  className,
}: WorkflowProgressIndicatorProps) {
  // Sort steps by step number
  const sortedSteps = [...steps].sort((a, b) => a.step - b.step)

  // Size configurations
  const sizeConfig = {
    sm: {
      circle: 'w-8 h-8',
      icon: 'h-4 w-4',
      text: 'text-xs',
      ring: 'ring-2',
    },
    md: {
      circle: 'w-10 h-10',
      icon: 'h-5 w-5',
      text: 'text-xs',
      ring: 'ring-4',
    },
    lg: {
      circle: 'w-12 h-12',
      icon: 'h-6 w-6',
      text: 'text-sm',
      ring: 'ring-4',
    },
  }

  const config = sizeConfig[size]

  // Determine orientation based on viewport if auto
  const isVertical = orientation === 'vertical'
  const containerClass = isVertical
    ? 'flex flex-col gap-2'
    : 'flex items-center justify-between'

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error/Voided Banner */}
      {(isError || isVoided) && (
        <div
          className={cn(
            'p-4 rounded-lg flex items-center gap-3',
            isVoided
              ? 'bg-muted text-muted-foreground'
              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
          )}
        >
          {isVoided ? (
            <XCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {isVoided ? 'Workflow Cancelled' : 'Workflow Issue'}
            </p>
            {(errorMessage || voidedMessage) && (
              <p className="text-sm mt-1 opacity-90">
                {isVoided ? voidedMessage : errorMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ball-in-Court Badge */}
      {ballInCourt && (ballInCourt.name || ballInCourt.entity || ballInCourt.role) && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-orange-500" />
          <span className="text-orange-700 dark:text-orange-400 font-medium">
            Ball in Court:
          </span>
          {ballInCourt.name && (
            <span className="text-foreground">{ballInCourt.name}</span>
          )}
          {ballInCourt.entity && !ballInCourt.name && (
            <span className="text-foreground">{ballInCourt.entity}</span>
          )}
          {ballInCourt.role && (
            <Badge variant="outline" className="text-xs capitalize">
              {ballInCourt.role}
            </Badge>
          )}
        </div>
      )}

      {/* Step Indicators */}
      <div className={containerClass}>
        {sortedSteps.map((step, index) => {
          const StepIcon = step.icon || CheckCircle
          const isCompleted = currentStep > step.step
          const isCurrent = currentStep === step.step
          const isActive = isCompleted || isCurrent
          const isLast = index === sortedSteps.length - 1

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center',
                isVertical ? 'flex-row gap-3' : 'flex-1'
              )}
            >
              <div className={cn('flex', isVertical ? 'flex-row items-center gap-3' : 'flex-col items-center')}>
                {/* Step Circle */}
                <div
                  className={cn(
                    config.circle,
                    'rounded-full flex items-center justify-center transition-colors flex-shrink-0',
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? cn('bg-primary text-primary-foreground', config.ring, 'ring-blue-100 dark:ring-blue-900')
                      : 'bg-muted text-muted-foreground',
                    isError && isCurrent && 'bg-red-500 text-white ring-red-100 dark:ring-red-900',
                    isVoided && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted && !isVoided ? (
                    <CheckCircle className={config.icon} />
                  ) : isError && isCurrent ? (
                    <XCircle className={config.icon} />
                  ) : (
                    <StepIcon className={config.icon} />
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={cn(
                    config.text,
                    isVertical ? '' : 'mt-2 text-center',
                    'font-medium transition-colors',
                    isActive && !isVoided ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line (horizontal layout only) */}
              {!isLast && !isVertical && (
                <div className="flex-1 mx-2">
                  <div
                    className={cn(
                      'h-1 rounded transition-colors',
                      isCompleted && !isVoided
                        ? 'bg-green-500'
                        : isCurrent && !isVoided
                        ? 'bg-blue-200 dark:bg-blue-800'
                        : 'bg-muted'
                    )}
                  />
                </div>
              )}

              {/* Connector Line (vertical layout) */}
              {!isLast && isVertical && (
                <div className="absolute left-4 top-10 w-0.5 h-8 bg-muted" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Helper function to calculate current step from status
 *
 * @param status - Current status value
 * @param statusStepMap - Map of status values to step numbers
 * @returns The current step number, or 0 if status not found
 *
 * @example
 * ```tsx
 * const currentStep = getStepFromStatus(rfi.status, {
 *   draft: 1,
 *   submitted: 2,
 *   under_review: 3,
 *   responded: 4,
 *   closed: 5,
 * });
 * ```
 */
export function getStepFromStatus(
  status: string,
  statusStepMap: Record<string, number>
): number {
  return statusStepMap[status] ?? 0
}

/**
 * RFI workflow steps configuration
 */
export const RFI_WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'draft', label: 'Draft', step: 1 },
  { key: 'submitted', label: 'Submitted', step: 2 },
  { key: 'under_review', label: 'Under Review', step: 3 },
  { key: 'responded', label: 'Responded', step: 4 },
  { key: 'closed', label: 'Closed', step: 5 },
]

/**
 * RFI status to step mapping
 */
export const RFI_STATUS_STEP_MAP: Record<string, number> = {
  draft: 1,
  open: 2,
  submitted: 2,
  under_review: 3,
  pending: 3,
  answered: 4,
  responded: 4,
  closed: 5,
  rejected: 0,
  void: 0,
}

/**
 * Submittal workflow steps configuration
 */
export const SUBMITTAL_WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'not_submitted', label: 'Not Submitted', step: 1 },
  { key: 'submitted', label: 'Submitted', step: 2 },
  { key: 'under_gc_review', label: 'GC Review', step: 3 },
  { key: 'submitted_to_architect', label: 'To Architect', step: 4 },
  { key: 'approved', label: 'Approved', step: 5 },
]

/**
 * Submittal status to step mapping
 */
export const SUBMITTAL_STATUS_STEP_MAP: Record<string, number> = {
  not_submitted: 1,
  draft: 1,
  pending: 2,
  submitted: 2,
  under_review: 3,
  under_gc_review: 3,
  in_review: 3,
  submitted_to_architect: 4,
  with_architect: 4,
  approved: 5,
  approved_as_noted: 5,
  revise_resubmit: 2,
  rejected: 0,
  void: 0,
}

export default WorkflowProgressIndicator
