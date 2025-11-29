// File: /src/lib/validation/validateAndCall.ts
// Utilities for validating before API calls

import { z } from 'zod'
import { ApiErrorClass } from '@/lib/api/errors'

/**
 * Validate data and execute API call if validation passes
 */
export async function validateAndCall<T, R>(
  data: unknown,
  schema: z.ZodSchema<T>,
  apiCall: (validData: T) => Promise<R>
): Promise<{ success: boolean; data?: R; errors?: Record<string, string[]> }> {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string[]> = {}
    result.error.issues.forEach((error: any) => {
      const path = error.path.join('.')
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(error.message)
    })

    return { success: false, errors }
  }

  try {
    const apiResult = await apiCall(result.data)
    return { success: true, data: apiResult }
  } catch (error) {
    const apiError = error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'API_CALL_ERROR',
          message: error instanceof Error ? error.message : 'API call failed',
        })

    throw apiError
  }
}

/**
 * Create a validated API function that combines validation and API call
 */
export function createValidatedAPI<T, R>(
  schema: z.ZodSchema<T>,
  apiCall: (validData: T) => Promise<R>
) {
  return async (data: unknown) => {
    return validateAndCall(data, schema, apiCall)
  }
}

/**
 * Merge validation errors with API errors
 */
export function mergeErrors(
  validationErrors?: Record<string, string[]>,
  apiError?: ApiErrorClass
): Record<string, string[]> {
  const merged = validationErrors ? { ...validationErrors } : {}

  if (apiError) {
    // Check if API error is related to specific fields
    const apiMessage = apiError.message.toLowerCase()

    // Map common API errors to fields
    if (apiMessage.includes('email')) {
      merged['email'] = [apiError.getUserMessage()]
    } else if (apiMessage.includes('name')) {
      merged['name'] = [apiError.getUserMessage()]
    } else {
      // Generic API error
      merged['_form'] = [apiError.getUserMessage()]
    }
  }

  return merged
}

/**
 * Check if errors object has any errors
 */
export function hasErrors(errors?: Record<string, string[]>): boolean {
  if (!errors) {return false}
  return Object.values(errors).some((msgs) => msgs.length > 0)
}

/**
 * Get first error message from errors object
 */
export function getFirstError(errors?: Record<string, string[]>): string | undefined {
  if (!errors) {return undefined}

  for (const messages of Object.values(errors)) {
    if (messages.length > 0) {
      return messages[0]
    }
  }

  return undefined
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors?: Record<string, string[]>): string {
  if (!errors) {return ''}

  return Object.entries(errors)
    .flatMap(([field, messages]) =>
      messages.map((msg) => `${field}: ${msg}`)
    )
    .join('\n')
}
