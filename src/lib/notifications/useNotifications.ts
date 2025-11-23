// File: /src/lib/notifications/useNotifications.ts
// Hook for integrating notifications with API calls

import { useToast } from './ToastContext'
import { ApiErrorClass } from '@/lib/api/errors'
import { useCallback } from 'react'

export function useNotifications() {
  const toast = useToast()

  /**
   * Execute an async operation with automatic error/success notifications
   */
  const withNotification = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options?: {
        loadingMessage?: string
        successMessage?: string
        errorMessage?: string
        onSuccess?: (result: T) => void
        onError?: (error: ApiErrorClass) => void
      }
    ): Promise<T | null> => {
      try {
        const result = await operation()

        if (options?.successMessage) {
          toast.success('Success', options.successMessage)
        }

        options?.onSuccess?.(result)
        return result
      } catch (error) {
        const apiError = error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'UNKNOWN_ERROR',
              message: error instanceof Error ? error.message : 'An unexpected error occurred',
            })

        const errorMessage = options?.errorMessage || apiError.getUserMessage()
        toast.error('Error', errorMessage)

        options?.onError?.(apiError)
        return null
      }
    },
    [toast]
  )

  /**
   * Handle API error with toast notification
   */
  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const apiError = error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
          })

      const message = customMessage || apiError.getUserMessage()

      if (apiError.isAuthError()) {
        toast.error('Authentication Required', message, {
          duration: 5000,
        })
      } else if (apiError.isNetworkError()) {
        toast.warning('Connection Error', message, {
          duration: 5000,
        })
      } else {
        toast.error('Error', message)
      }

      return apiError
    },
    [toast]
  )

  /**
   * Show success notification
   */
  const showSuccess = useCallback(
    (title: string, message?: string) => {
      toast.success(title, message, { duration: 3000 })
    },
    [toast]
  )

  /**
   * Show error notification
   */
  const showError = useCallback(
    (title: string, message?: string) => {
      toast.error(title, message, { duration: 5000 })
    },
    [toast]
  )

  /**
   * Show warning notification
   */
  const showWarning = useCallback(
    (title: string, message?: string) => {
      toast.warning(title, message, { duration: 4000 })
    },
    [toast]
  )

  /**
   * Show info notification
   */
  const showInfo = useCallback(
    (title: string, message?: string) => {
      toast.info(title, message, { duration: 3000 })
    },
    [toast]
  )

  return {
    ...toast,
    withNotification,
    handleError,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
