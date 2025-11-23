// File: /src/lib/validation/useFormValidation.ts
// Custom hook for form validation

import { useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import { useNotifications } from '@/lib/notifications/useNotifications'

export interface FieldError {
  [key: string]: string[]
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: FieldError
}

export interface UseFormValidationOptions {
  showNotification?: boolean
}

/**
 * Custom hook for form validation
 * Provides validation, error tracking, and helper methods
 */
export function useFormValidation<T>(
  schema: z.ZodSchema<T>,
  options?: UseFormValidationOptions
) {
  const [errors, setErrors] = useState<FieldError>({})
  const [isValidating, setIsValidating] = useState(false)
  const { showError } = useNotifications()
  const validationTimeoutRef = useRef<NodeJS.Timeout>()

  /**
   * Validate data against schema
   */
  const validate = useCallback(
    (data: unknown): ValidationResult<T> => {
      const result = schema.safeParse(data)

      if (!result.success) {
        const fieldErrors: FieldError = {}

        result.error.issues.forEach((error: any) => {
          const path = error.path.join('.')
          if (!fieldErrors[path]) {
            fieldErrors[path] = []
          }
          fieldErrors[path].push(error.message)
        })

        setErrors(fieldErrors)

        if (options?.showNotification) {
          showError('Validation Error', 'Please check the form for errors')
        }

        return {
          success: false,
          errors: fieldErrors,
        }
      }

      setErrors({})
      return {
        success: true,
        data: result.data,
      }
    },
    [schema, options, showError]
  )

  /**
   * Validate a single field with debounce
   */
  const validateField = useCallback(
    (fieldName: string, value: unknown, debounceMs: number = 300) => {
      setIsValidating(true)

      // Clear previous timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }

      // Set new timeout
      validationTimeoutRef.current = setTimeout(() => {
        try {
          // Try to validate the field by creating a partial schema
          const fieldSchema = (schema as any).pick?.({ [fieldName]: true }) ||
            z.object({ [fieldName]: z.any() })

          const result = fieldSchema.safeParse({ [fieldName]: value })

          if (!result.success) {
            const fieldErrors = result.error.issues.map((e: any) => e.message)
            setErrors((prev) => ({
              ...prev,
              [fieldName]: fieldErrors,
            }))
          } else {
            // Clear error for this field if validation passed
            setErrors((prev) => {
              const next = { ...prev }
              delete next[fieldName]
              return next
            })
          }
        } catch (error) {
          // If field validation fails, just skip it
          console.debug('Field validation skipped:', fieldName)
        }

        setIsValidating(false)
      }, debounceMs)
    },
    [schema]
  )

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  /**
   * Clear error for specific field
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }, [])

  /**
   * Get error message for field
   */
  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return errors[fieldName]?.[0]
    },
    [errors]
  )

  /**
   * Check if field has error
   */
  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      return !!errors[fieldName]?.length
    },
    [errors]
  )

  /**
   * Check if form has any errors
   */
  const hasErrors = useCallback((): boolean => {
    return Object.keys(errors).length > 0
  }, [errors])

  /**
   * Get all errors as formatted string
   */
  const getErrorSummary = useCallback((): string => {
    const errorMessages = Object.entries(errors)
      .flatMap(([field, messages]) => messages.map((msg) => `${field}: ${msg}`))
      .join('\n')

    return errorMessages
  }, [errors])

  return {
    errors,
    isValidating,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasFieldError,
    hasErrors,
    getErrorSummary,
  }
}

/**
 * Hook for real-time field validation during typing
 */
export function useFieldValidation<T>(schema: z.ZodSchema<T>) {
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})

  const validateField = useCallback(
    (fieldName: string, value: unknown) => {
      try {
        // Create a partial schema for the field
        const fieldSchema = (schema as any).pick?.({ [fieldName]: true }) ||
          z.object({ [fieldName]: z.any() })

        const result = fieldSchema.safeParse({ [fieldName]: value })

        if (!result.success) {
          const errors = result.error.issues.map((e: any) => e.message)
          setFieldErrors((prev) => ({
            ...prev,
            [fieldName]: errors,
          }))
          return errors
        } else {
          setFieldErrors((prev) => {
            const next = { ...prev }
            delete next[fieldName]
            return next
          })
          return []
        }
      } catch (error) {
        return []
      }
    },
    [schema]
  )

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }, [])

  const hasFieldError = useCallback((fieldName: string) => {
    return !!fieldErrors[fieldName]?.length
  }, [fieldErrors])

  const getFieldError = useCallback((fieldName: string) => {
    return fieldErrors[fieldName]?.[0]
  }, [fieldErrors])

  return {
    fieldErrors,
    validateField,
    clearFieldError,
    hasFieldError,
    getFieldError,
  }
}
