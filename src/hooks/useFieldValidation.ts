/**
 * useFieldValidation Hook
 *
 * Provides real-time form field validation with debouncing
 * and proper state management for validation feedback.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ValidationState } from '@/components/ui/form-field'

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean
  error?: string
  warning?: string
}

export type SyncValidator<T> = (value: T) => ValidationResult
export type AsyncValidator<T> = (value: T) => Promise<ValidationResult>
export type Validator<T> = SyncValidator<T> | AsyncValidator<T>

export interface UseFieldValidationOptions<T> {
  /** Initial value */
  initialValue: T
  /** Validators to run (can be sync or async) */
  validators?: Validator<T>[]
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number
  /** Validate on mount */
  validateOnMount?: boolean
  /** Transform value before validation */
  transform?: (value: T) => T
}

export interface UseFieldValidationReturn<T> {
  /** Current field value */
  value: T
  /** Set field value */
  setValue: (value: T) => void
  /** Current validation state */
  validationState: ValidationState
  /** Error message if validation failed */
  error: string | undefined
  /** Warning message (non-blocking) */
  warning: string | undefined
  /** Whether field has been touched (blurred at least once) */
  touched: boolean
  /** Mark field as touched */
  setTouched: (touched: boolean) => void
  /** Trigger validation manually */
  validate: () => Promise<ValidationResult>
  /** Reset to initial state */
  reset: () => void
  /** Field props to spread onto input */
  fieldProps: {
    value: T
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFieldValidation<T>({
  initialValue,
  validators = [],
  debounceMs = 300,
  validateOnMount = false,
  transform,
}: UseFieldValidationOptions<T>): UseFieldValidationReturn<T> {
  const [value, setValueInternal] = useState<T>(initialValue)
  const [validationState, setValidationState] = useState<ValidationState>('idle')
  const [error, setError] = useState<string | undefined>()
  const [warning, setWarning] = useState<string | undefined>()
  const [touched, setTouched] = useState(false)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationIdRef = useRef(0)

  // Run all validators
  const runValidation = useCallback(
    async (valueToValidate: T): Promise<ValidationResult> => {
      if (validators.length === 0) {
        return { valid: true }
      }

      const currentId = ++validationIdRef.current
      setValidationState('validating')

      try {
        const transformedValue = transform
          ? transform(valueToValidate)
          : valueToValidate

        for (const validator of validators) {
          const result = await Promise.resolve(validator(transformedValue))

          // Check if this validation is still current
          if (currentId !== validationIdRef.current) {
            return { valid: true } // Superseded by newer validation
          }

          if (!result.valid) {
            setValidationState('invalid')
            setError(result.error)
            setWarning(result.warning)
            return result
          }

          if (result.warning) {
            setWarning(result.warning)
          }
        }

        // All validators passed
        if (currentId === validationIdRef.current) {
          setValidationState('valid')
          setError(undefined)
        }

        return { valid: true, warning }
      } catch (err) {
        if (currentId === validationIdRef.current) {
          setValidationState('invalid')
          const errorMessage =
            err instanceof Error ? err.message : 'Validation failed'
          setError(errorMessage)
          return { valid: false, error: errorMessage }
        }
        return { valid: false }
      }
    },
    [validators, transform, warning]
  )

  // Debounced validation
  const debouncedValidate = useCallback(
    (valueToValidate: T) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        runValidation(valueToValidate)
      }, debounceMs)
    },
    [runValidation, debounceMs]
  )

  // Set value with validation
  const setValue = useCallback(
    (newValue: T) => {
      setValueInternal(newValue)
      if (touched) {
        debouncedValidate(newValue)
      }
    },
    [touched, debouncedValidate]
  )

  // Manual validation trigger
  const validate = useCallback(async (): Promise<ValidationResult> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    return runValidation(value)
  }, [runValidation, value])

  // Reset to initial state
  const reset = useCallback(() => {
    setValueInternal(initialValue)
    setValidationState('idle')
    setError(undefined)
    setWarning(undefined)
    setTouched(false)
    validationIdRef.current++
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }, [initialValue])

  // Handle input change event
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const newValue = e.target.value as unknown as T
      setValue(newValue)
    },
    [setValue]
  )

  // Handle blur
  const handleBlur = useCallback(() => {
    if (!touched) {
      setTouched(true)
      runValidation(value)
    }
  }, [touched, runValidation, value])

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      runValidation(initialValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    value,
    setValue,
    validationState,
    error,
    warning,
    touched,
    setTouched,
    validate,
    reset,
    fieldProps: {
      value,
      onChange: handleChange,
      onBlur: handleBlur,
    },
  }
}

// ============================================================================
// Common Validators
// ============================================================================

/** Required field validator */
export function required(
  message = 'This field is required'
): SyncValidator<string> {
  return (value) => ({
    valid: value.trim().length > 0,
    error: value.trim().length > 0 ? undefined : message,
  })
}

/** Minimum length validator */
export function minLength(
  min: number,
  message?: string
): SyncValidator<string> {
  return (value) => ({
    valid: value.length >= min,
    error:
      value.length >= min
        ? undefined
        : message ?? `Must be at least ${min} characters`,
  })
}

/** Maximum length validator */
export function maxLength(
  max: number,
  message?: string
): SyncValidator<string> {
  return (value) => ({
    valid: value.length <= max,
    error:
      value.length <= max
        ? undefined
        : message ?? `Must be at most ${max} characters`,
  })
}

/** Email format validator */
export function email(message = 'Invalid email address'): SyncValidator<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return (value) => ({
    valid: !value || emailRegex.test(value),
    error: !value || emailRegex.test(value) ? undefined : message,
  })
}

/** Pattern match validator */
export function pattern(
  regex: RegExp,
  message = 'Invalid format'
): SyncValidator<string> {
  return (value) => ({
    valid: !value || regex.test(value),
    error: !value || regex.test(value) ? undefined : message,
  })
}

/** Number range validator */
export function numberRange(
  min?: number,
  max?: number,
  message?: string
): SyncValidator<string | number> {
  return (value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) {
      return { valid: false, error: 'Must be a valid number' }
    }
    if (min !== undefined && num < min) {
      return {
        valid: false,
        error: message ?? `Must be at least ${min}`,
      }
    }
    if (max !== undefined && num > max) {
      return {
        valid: false,
        error: message ?? `Must be at most ${max}`,
      }
    }
    return { valid: true }
  }
}

/** Custom async validator helper */
export function asyncValidator<T>(
  validateFn: (value: T) => Promise<string | undefined>,
  validateEmpty = false
): AsyncValidator<T> {
  return async (value) => {
    // Skip validation for empty values unless specified
    if (!validateEmpty) {
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      if (isEmpty) {
        return { valid: true }
      }
    }

    const error = await validateFn(value)
    return {
      valid: !error,
      error,
    }
  }
}

/** Compose multiple validators */
export function composeValidators<T>(
  ...validators: Validator<T>[]
): AsyncValidator<T> {
  return async (value) => {
    for (const validator of validators) {
      const result = await Promise.resolve(validator(value))
      if (!result.valid) {
        return result
      }
    }
    return { valid: true }
  }
}
