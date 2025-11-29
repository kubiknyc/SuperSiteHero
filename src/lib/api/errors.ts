// File: /src/lib/api/errors.ts
// Error handling utilities and custom error classes

import type { ApiError } from './types'

/**
 * Custom error class for API errors
 */
export class ApiErrorClass extends Error implements ApiError {
  code: string
  status?: number
  details?: any

  constructor(error: ApiError) {
    super(error.message)
    this.code = error.code
    this.status = error.status
    // Only include detailed error info in development mode to prevent information leakage
    this.details = import.meta.env.DEV ? error.details : undefined
    this.name = 'ApiError'
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    // Handle specific error codes
    switch (this.code) {
      case '23505': // Unique constraint violation
        return 'This record already exists'
      case '23503': // Foreign key violation
        return 'Cannot delete this record due to dependencies'
      case '23502': // Not null violation
        return 'Please fill in all required fields'
      case '42P01': // Table does not exist
        return 'Database table not found'
      case 'PGRST116': // Table does not exist
        return 'The requested resource does not exist'
      case '401':
        return 'You are not authenticated. Please log in.'
      case '403':
        return 'You do not have permission to perform this action'
      case '404':
        return 'The requested resource was not found'
      default:
        return this.message || 'An unexpected error occurred'
    }
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || !this.status
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return ['23502', '23505'].includes(this.code)
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.code === '401' || this.message?.includes('unauthorized')
  }
}

/**
 * Wrap an API call with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    onError?: (error: ApiErrorClass) => void
    rethrow?: boolean
  }
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    const apiError = error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        })

    options?.onError?.(apiError)

    if (options?.rethrow) {
      throw apiError
    }

    return null
  }
}

/**
 * Handle API errors consistently
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiErrorClass) {
    return error.getUserMessage()
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}
