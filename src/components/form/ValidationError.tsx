// File: /src/components/form/ValidationError.tsx
// Component for displaying validation errors

import { AlertCircle } from 'lucide-react'

interface ValidationErrorProps {
  error?: string
  errors?: string[]
  className?: string
}

export function ValidationError({ error, errors, className = '' }: ValidationErrorProps) {
  const messages = error ? [error] : errors || []

  if (messages.length === 0) {
    return null
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {messages.map((msg, index) => (
        <div key={index} className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Wrapper component for form fields with error handling
 */
export function FormField({
  children,
  error,
  errors,
  className = '',
}: {
  children: React.ReactNode
  error?: string
  errors?: string[]
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
      {(error || errors?.length) && (
        <ValidationError error={error} errors={errors} />
      )}
    </div>
  )
}

/**
 * Input wrapper with error styling
 */
export function InputWithError({
  error,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const hasError = !!error

  return (
    <div className="space-y-2">
      <input
        className={`
          px-3 py-2 border rounded-md w-full
          ${hasError
            ? 'border-red-500 bg-red-50 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
          }
          focus:outline-none focus:ring-2
          ${className}
        `}
        {...props}
      />
      {error && <ValidationError error={error} />}
    </div>
  )
}

/**
 * Textarea wrapper with error styling
 */
export function TextareaWithError({
  error,
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  const hasError = !!error

  return (
    <div className="space-y-2">
      <textarea
        className={`
          px-3 py-2 border rounded-md w-full
          ${hasError
            ? 'border-red-500 bg-red-50 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
          }
          focus:outline-none focus:ring-2
          ${className}
        `}
        {...props}
      />
      {error && <ValidationError error={error} />}
    </div>
  )
}

/**
 * Select wrapper with error styling
 */
export function SelectWithError({
  error,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  const hasError = !!error

  return (
    <div className="space-y-2">
      <select
        className={`
          px-3 py-2 border rounded-md w-full
          ${hasError
            ? 'border-red-500 bg-red-50 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
          }
          focus:outline-none focus:ring-2
          ${className}
        `}
        {...props}
      />
      {error && <ValidationError error={error} />}
    </div>
  )
}
