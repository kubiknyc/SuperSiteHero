// File: /src/lib/hooks/useMutationWithNotification.ts
// Wrapper for React Query mutations with automatic notifications

import { useMutation, UseMutationOptions } from '@tanstack/react-query'
import { useNotifications } from '@/lib/notifications/useNotifications'

export interface MutationWithNotificationOptions<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onError' | 'onSuccess'> {
  successMessage?: string | ((data: TData) => string)
  errorMessage?: string | ((error: Error) => string)
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
}

/**
 * Wrapper around useMutation that automatically shows success/error notifications
 */
export function useMutationWithNotification<TData, TError = Error, TVariables = void>(
  options: MutationWithNotificationOptions<TData, TError, TVariables>
) {
  const { handleError, showSuccess } = useNotifications()

  const mutation = useMutation<TData, TError, TVariables>({
    ...options,
    onSuccess: (data, variables, _context) => {
      if (options.successMessage) {
        const message = typeof options.successMessage === 'function'
          ? options.successMessage(data)
          : options.successMessage
        showSuccess('Success', message)
      }

      options.onSuccess?.(data, variables)
    },
    onError: (error, variables, _context) => {
      const message = options.errorMessage
        ? typeof options.errorMessage === 'function'
          ? options.errorMessage(error as Error)
          : options.errorMessage
        : undefined

      handleError(error, message)

      options.onError?.(error, variables)
    },
  })

  return mutation
}
