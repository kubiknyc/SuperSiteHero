// File: /src/components/ui/progress-stepper.tsx
// Multi-step progress stepper component for wizards and multi-step forms

import * as React from 'react'
import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface Step {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  optional?: boolean
}

export type StepStatus = 'upcoming' | 'current' | 'completed' | 'error'

export interface ProgressStepperProps {
  /** Array of steps */
  steps: Step[]
  /** Current step index (0-based) */
  currentStep: number
  /** Callback when a step is clicked */
  onStepClick?: (stepIndex: number) => void
  /** Whether completed steps are clickable */
  allowClickCompleted?: boolean
  /** Whether to show step numbers */
  showNumbers?: boolean
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Custom class name */
  className?: string
  /** Steps with errors (by index) */
  errorSteps?: number[]
}

// ============================================================================
// Helper Components
// ============================================================================

interface StepIndicatorProps {
  step: Step
  index: number
  status: StepStatus
  showNumber: boolean
  size: 'sm' | 'default' | 'lg'
}

const sizeClasses = {
  sm: {
    indicator: 'h-6 w-6',
    icon: 'h-3 w-3',
    text: 'text-xs',
    label: 'text-xs',
    description: 'text-[10px]',
    connector: 'h-0.5',
    connectorVertical: 'w-0.5',
  },
  default: {
    indicator: 'h-8 w-8',
    icon: 'h-4 w-4',
    text: 'text-sm',
    label: 'text-sm',
    description: 'text-xs',
    connector: 'h-0.5',
    connectorVertical: 'w-0.5',
  },
  lg: {
    indicator: 'h-10 w-10',
    icon: 'h-5 w-5',
    text: 'text-base',
    label: 'text-base',
    description: 'text-sm',
    connector: 'h-1',
    connectorVertical: 'w-1',
  },
}

const statusStyles: Record<StepStatus, { indicator: string; text: string }> = {
  upcoming: {
    indicator: 'bg-muted border-2 border-muted-foreground/30 text-muted-foreground',
    text: 'text-muted-foreground',
  },
  current: {
    indicator: 'bg-primary border-2 border-primary text-primary-foreground',
    text: 'text-foreground font-medium',
  },
  completed: {
    indicator: 'bg-primary border-2 border-primary text-primary-foreground',
    text: 'text-foreground',
  },
  error: {
    indicator: 'bg-destructive border-2 border-destructive text-destructive-foreground',
    text: 'text-destructive font-medium',
  },
}

function StepIndicator({ step, index, status, showNumber, size }: StepIndicatorProps) {
  const sizes = sizeClasses[size]
  const styles = statusStyles[status]
  const Icon = step.icon

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200',
        sizes.indicator,
        styles.indicator
      )}
    >
      {status === 'completed' ? (
        <Check className={sizes.icon} />
      ) : Icon ? (
        <Icon className={sizes.icon} />
      ) : showNumber ? (
        <span className={sizes.text}>{index + 1}</span>
      ) : (
        <Circle className={cn(sizes.icon, 'fill-current')} />
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ProgressStepper({
  steps,
  currentStep,
  onStepClick,
  allowClickCompleted = true,
  showNumbers = true,
  orientation = 'horizontal',
  size = 'default',
  className,
  errorSteps = [],
}: ProgressStepperProps) {
  const sizes = sizeClasses[size]

  const getStepStatus = (index: number): StepStatus => {
    if (errorSteps.includes(index)) {return 'error'}
    if (index < currentStep) {return 'completed'}
    if (index === currentStep) {return 'current'}
    return 'upcoming'
  }

  const handleStepClick = (index: number) => {
    if (!onStepClick) {return}

    const status = getStepStatus(index)
    if (status === 'completed' && allowClickCompleted) {
      onStepClick(index)
    } else if (status === 'current') {
      onStepClick(index)
    }
  }

  const isClickable = (index: number): boolean => {
    if (!onStepClick) {return false}
    const status = getStepStatus(index)
    return status === 'current' || (status === 'completed' && allowClickCompleted)
  }

  // Horizontal layout
  if (orientation === 'horizontal') {
    return (
      <nav aria-label="Progress" className={cn('w-full', className)}>
        <ol className="flex items-center">
          {steps.map((step, index) => {
            const status = getStepStatus(index)
            const styles = statusStyles[status]
            const clickable = isClickable(index)

            return (
              <li
                key={step.id}
                className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}
              >
                {/* Step button */}
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!clickable}
                  className={cn(
                    'flex items-center gap-2 group',
                    clickable && 'cursor-pointer',
                    !clickable && 'cursor-default'
                  )}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  <StepIndicator
                    step={step}
                    index={index}
                    status={status}
                    showNumber={showNumbers}
                    size={size}
                  />
                  <div className="hidden sm:block">
                    <p className={cn(sizes.label, styles.text)}>
                      {step.label}
                      {step.optional && (
                        <span className="text-muted-foreground ml-1">(Optional)</span>
                      )}
                    </p>
                    {step.description && (
                      <p className={cn(sizes.description, 'text-muted-foreground')}>
                        {step.description}
                      </p>
                    )}
                  </div>
                </button>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 mx-4',
                      sizes.connector,
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  }

  // Vertical layout
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="relative">
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          const styles = statusStyles[status]
          const clickable = isClickable(index)

          return (
            <li key={step.id} className="relative pb-8 last:pb-0">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-4 top-8 -bottom-0 -translate-x-1/2',
                    sizes.connectorVertical,
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step content */}
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!clickable}
                className={cn(
                  'flex items-start gap-4 w-full text-left group',
                  clickable && 'cursor-pointer',
                  !clickable && 'cursor-default'
                )}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <StepIndicator
                  step={step}
                  index={index}
                  status={status}
                  showNumber={showNumbers}
                  size={size}
                />
                <div className="pt-0.5">
                  <p className={cn(sizes.label, styles.text)}>
                    {step.label}
                    {step.optional && (
                      <span className="text-muted-foreground ml-1">(Optional)</span>
                    )}
                  </p>
                  {step.description && (
                    <p className={cn(sizes.description, 'text-muted-foreground mt-1')}>
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ============================================================================
// Compact Stepper (for mobile or tight spaces)
// ============================================================================

export interface CompactStepperProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function CompactStepper({ currentStep, totalSteps, className }: CompactStepperProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium">
        Step {currentStep + 1} of {totalSteps}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Dot Stepper (minimal indicator)
// ============================================================================

export interface DotStepperProps {
  currentStep: number
  totalSteps: number
  onStepClick?: (index: number) => void
  className?: string
}

export function DotStepper({ currentStep, totalSteps, onStepClick, className }: DotStepperProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <button
          key={index}
          onClick={() => onStepClick?.(index)}
          disabled={!onStepClick}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-200',
            index === currentStep
              ? 'bg-primary w-4'
              : index < currentStep
              ? 'bg-primary/60'
              : 'bg-muted',
            onStepClick && 'cursor-pointer hover:scale-125'
          )}
          aria-label={`Step ${index + 1}`}
          aria-current={index === currentStep ? 'step' : undefined}
        />
      ))}
    </div>
  )
}
