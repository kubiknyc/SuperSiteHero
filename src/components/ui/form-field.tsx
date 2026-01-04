// Form field wrapper component with label, error, validation states, and required indicator
import { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { FormError } from './form-error'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2 } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
  description?: string
  characterCount?: {
    current: number
    max: number
    isNearLimit?: boolean
    isOverLimit?: boolean
  }
  /** Validation state for real-time feedback */
  validationState?: ValidationState
  /** Show validation indicator inline with label */
  showValidationIndicator?: boolean
  /** Success message when field is valid */
  successMessage?: string
  /** Whether the field has been touched (focused and blurred) */
  touched?: boolean
}

// ============================================================================
// Validation Indicator
// ============================================================================

function ValidationIndicator({
  state,
  className,
}: {
  state: ValidationState
  className?: string
}) {
  if (state === 'idle') return null

  return (
    <span className={cn('ml-2', className)}>
      {state === 'validating' && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {state === 'valid' && (
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
      )}
    </span>
  )
}

// ============================================================================
// Form Field Component
// ============================================================================

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  children,
  className,
  description,
  characterCount,
  validationState = 'idle',
  showValidationIndicator = false,
  successMessage,
  touched = true,
}: FormFieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined
  const descriptionId = description ? `${htmlFor}-description` : undefined
  const showError = touched && error
  const showSuccess = validationState === 'valid' && successMessage && touched

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={htmlFor}
          className={cn(
            'flex items-center gap-1',
            showError && 'text-error'
          )}
        >
          {label}
          {required && (
            <span className="text-error" aria-label="required">
              *
            </span>
          )}
          {showValidationIndicator && (
            <ValidationIndicator state={validationState} />
          )}
        </Label>

        {/* Character Counter */}
        {characterCount && (
          <span
            className={cn(
              'text-xs transition-colors',
              characterCount.isOverLimit
                ? 'text-error font-semibold'
                : characterCount.isNearLimit
                ? 'text-warning'
                : 'text-muted'
            )}
            aria-live="polite"
          >
            {characterCount.current} / {characterCount.max}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p id={descriptionId} className="text-sm text-secondary">
          {description}
        </p>
      )}

      {/* Input Field with visual state */}
      <div
        className={cn(
          'relative',
          validationState === 'valid' && touched && '[&>input]:border-success [&>textarea]:border-success',
          showError && '[&>input]:border-error [&>textarea]:border-error'
        )}
      >
        {children}
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      <FormError message={showError ? error : undefined} id={errorId} />
    </div>
  )
}

// ============================================================================
// Form Section Component
// ============================================================================

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  error?: string
  /** Collapsible section */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
}

export function FormSection({
  title,
  description,
  children,
  className,
  error,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold text-foreground heading-subsection">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-secondary mt-1">{description}</p>
        )}
      </div>

      {error && <FormError message={error} />}

      <div className="space-y-4">{children}</div>
    </div>
  )
}

// ============================================================================
// Inline Form Field (Label + Input on same row)
// ============================================================================

interface InlineFormFieldProps extends Omit<FormFieldProps, 'className'> {
  labelWidth?: string
  className?: string
}

export function InlineFormField({
  label,
  htmlFor,
  error,
  required = false,
  children,
  labelWidth = 'w-32',
  className,
  description,
  validationState = 'idle',
  showValidationIndicator = false,
  touched = true,
}: InlineFormFieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined
  const showError = touched && error

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-start gap-4">
        {/* Label */}
        <Label
          htmlFor={htmlFor}
          className={cn(
            'flex items-center gap-1 pt-2 flex-shrink-0',
            labelWidth,
            showError && 'text-error'
          )}
        >
          {label}
          {required && (
            <span className="text-error" aria-label="required">
              *
            </span>
          )}
          {showValidationIndicator && (
            <ValidationIndicator state={validationState} />
          )}
        </Label>

        {/* Input and error */}
        <div className="flex-1">
          {children}
          {description && (
            <p className="text-xs text-muted mt-1">{description}</p>
          )}
          <FormError message={showError ? error : undefined} id={errorId} />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Form Fieldset (Group of related fields)
// ============================================================================

interface FormFieldsetProps {
  legend: string
  children: ReactNode
  className?: string
  description?: string
  error?: string
  required?: boolean
}

export function FormFieldset({
  legend,
  children,
  className,
  description,
  error,
  required = false,
}: FormFieldsetProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      <legend className="text-sm font-medium text-foreground flex items-center gap-1">
        {legend}
        {required && (
          <span className="text-error" aria-label="required">
            *
          </span>
        )}
      </legend>
      {description && (
        <p className="text-sm text-secondary -mt-2">{description}</p>
      )}
      {error && <FormError message={error} />}
      <div className="space-y-3">{children}</div>
    </fieldset>
  )
}
