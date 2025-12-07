// File: /src/lib/hooks/useApiCall.ts
// Custom hook for handling API calls with error handling and notifications

import { useCallback } from 'react'
import { ApiErrorClass, getErrorMessage } from '@/lib/api/errors'
import { useToast } from '@/lib/notifications/ToastContext'

/**
 * Options for useApiCall hook
 */
export interface UseApiCallOptions {
  onSuccess?: (message?: string) => void
  onError?: (error: ApiErrorClass) => void
  showSuccessMessage?: boolean
  showErrorMessage?: boolean
  successMessage?: string
}

/**
 * Custom hook for handling API calls with error handling and toast notifications
 */
export function useApiCall() {
  const { success, error: showError } = useToast()

  const execute = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options?: UseApiCallOptions
    ): Promise<T | null> => {
      try {
        const result = await fn()

        if (options?.showSuccessMessage) {
          success('Success', options.successMessage || 'Operation successful')
        }

        options?.onSuccess?.()
        return result
      } catch (error) {
        const apiError = error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'UNKNOWN_ERROR',
              message: error instanceof Error ? error.message : 'An unexpected error occurred',
            })

        if (options?.showErrorMessage) {
          showError('Error', apiError.getUserMessage())
        }

        options?.onError?.(apiError)
        return null
      }
    },
    [success, showError]
  )

  return { execute }
}
