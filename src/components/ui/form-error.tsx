// Form error message component with accessibility
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormErrorProps {
  message?: string
  className?: string
  id?: string
}

export function FormError({ message, className, id }: FormErrorProps) {
  if (!message) {return null}

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-red-600 mt-1.5',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface FormErrorListProps {
  errors: string[]
  className?: string
}

export function FormErrorList({ errors, className }: FormErrorListProps) {
  if (errors.length === 0) {return null}

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn('space-y-1.5 mt-2', className)}
    >
      {errors.map((error, index) => (
        <div key={index} className="flex items-center gap-2 text-sm font-medium text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
    </div>
  )
}
