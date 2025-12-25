// Form field wrapper component with label, error, and required indicator
import { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { FormError } from './form-error'
import { cn } from '@/lib/utils'

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
}

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  children,
  className,
  description,
  characterCount,
}: FormFieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="flex items-center gap-1">
          {label}
          {required && <span className="text-error" aria-label="required">*</span>}
        </Label>

        {/* Character Counter */}
        {characterCount && (
          <span
            className={cn(
              'text-xs',
              characterCount.isOverLimit
                ? 'text-error font-semibold'
                : characterCount.isNearLimit
                ? 'text-warning'
                : 'text-muted'
            )}
          >
            {characterCount.current} / {characterCount.max}
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-secondary">{description}</p>
      )}

      {/* Input Field */}
      <div>
        {children}
      </div>

      {/* Error Message */}
      <FormError message={error} id={errorId} />
    </div>
  )
}

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  error?: string
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
        <h3 className="text-lg font-semibold text-foreground heading-subsection">{title}</h3>
        {description && (
          <p className="text-sm text-secondary mt-1">{description}</p>
        )}
      </div>

      {error && <FormError message={error} />}

      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
