// Validation utility functions
import { z } from 'zod'

/**
 * Format validation errors from Zod for display
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {}

  error.issues.forEach((err) => {
    const path = err.path.join('.')
    formattedErrors[path] = err.message
  })

  return formattedErrors
}

/**
 * Validate a single field with a schema
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: boolean; error?: string } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { success: true }
  }

  const firstError = result.error?.issues?.[0]?.message
  return {
    success: false,
    error: firstError || 'Invalid value',
  }
}

/**
 * Check if a value is empty/null/undefined
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Get character count for textarea with max limit indicator
 */
export function getCharacterCount(
  value: string | undefined,
  maxLength: number
): { count: number; remaining: number; isNearLimit: boolean; isOverLimit: boolean } {
  const count = value?.length || 0
  const remaining = maxLength - count

  return {
    count,
    remaining,
    isNearLimit: remaining <= maxLength * 0.1 && remaining > 0, // 10% threshold
    isOverLimit: remaining < 0,
  }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate time format (HH:MM)
 */
export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

/**
 * Validate date is not in the future
 */
export function validateDateNotFuture(date: string): boolean {
  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return selectedDate <= today
}

/**
 * Create a debounced validation function
 */
export function createDebouncedValidator<T>(
  validateFn: (value: T) => Promise<boolean> | boolean,
  delay: number = 300
): (value: T) => Promise<boolean> {
  let timeoutId: NodeJS.Timeout | null = null

  return async (value: T): Promise<boolean> => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        const result = await validateFn(value)
        resolve(result)
      }, delay)
    })
  }
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter((field) => isEmpty(data[field]))

  return {
    isValid: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Format field name for display (camelCase to Title Case)
 */
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, ' ')
}
