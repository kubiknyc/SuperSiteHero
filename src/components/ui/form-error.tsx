// Form error and success message components with accessibility and animations
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormErrorProps {
  message?: string
  className?: string
  id?: string
  /** Animate the error message appearance */
  animate?: boolean
}

export function FormError({ message, className, id, animate = true }: FormErrorProps) {
  if (!message) {return null}

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-destructive mt-1.5',
        animate && 'animate-in fade-in-0 slide-in-from-top-1 duration-200',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface FormSuccessProps {
  message?: string
  className?: string
  id?: string
  animate?: boolean
}

export function FormSuccess({ message, className, id, animate = true }: FormSuccessProps) {
  if (!message) {return null}

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-success mt-1.5',
        animate && 'animate-in fade-in-0 slide-in-from-top-1 duration-200',
        className
      )}
    >
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface FormHintProps {
  message?: string
  className?: string
  id?: string
}

export function FormHint({ message, className, id }: FormHintProps) {
  if (!message) {return null}

  return (
    <div
      id={id}
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground mt-1.5',
        className
      )}
    >
      <Info className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface FormErrorListProps {
  errors: string[]
  className?: string
  animate?: boolean
}

export function FormErrorList({ errors, className, animate = true }: FormErrorListProps) {
  if (errors.length === 0) {return null}

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'space-y-1.5 mt-2',
        animate && 'animate-in fade-in-0 slide-in-from-top-1 duration-200',
        className
      )}
    >
      {errors.map((error, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-sm font-medium text-destructive"
          style={animate ? { animationDelay: `${index * 50}ms` } : undefined}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Form summary error banner - for displaying form-level errors at top of form
 */
interface FormErrorBannerProps {
  title?: string
  errors: string[]
  className?: string
  onDismiss?: () => void
}

export function FormErrorBanner({
  title = 'Please fix the following errors:',
  errors,
  className,
  onDismiss,
}: FormErrorBannerProps) {
  if (errors.length === 0) {return null}

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/10 p-4',
        'animate-in fade-in-0 slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-destructive">{title}</h4>
          <ul className="mt-2 space-y-1 text-sm text-destructive/90">
            {errors.map((error, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                {error}
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-destructive/70 hover:text-destructive transition-colors p-1"
            aria-label="Dismiss errors"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        )}
      </div>
    </div>
  )
}
