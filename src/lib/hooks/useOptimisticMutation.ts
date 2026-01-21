// File: /src/lib/hooks/useOptimisticMutation.ts
// Optimistic update helpers for TanStack Query mutations
// Provides automatic UI updates with rollback on failure

import { useMutation, useQueryClient, QueryKey, UseMutationOptions } from '@tanstack/react-query'
import { useNotifications } from '@/lib/notifications/useNotifications'

// ============================================================================
// Types
// ============================================================================

export interface OptimisticConfig<TData, TVariables, TContext = unknown> {
  /** Query key(s) to update optimistically */
  queryKey: QueryKey | QueryKey[]
  /** Create the optimistic data from variables before mutation runs */
  getOptimisticData: (variables: TVariables, currentData: TData | undefined) => TData
  /** Optional: Get the ID for the optimistic item (for single item updates) */
  getOptimisticId?: (variables: TVariables) => string
  /** Whether to show success/error notifications */
  notifications?: {
    success?: string | ((data: TData, variables: TVariables) => string)
    error?: string | ((error: Error, variables: TVariables) => string)
  }
  /** Additional query keys to invalidate on success */
  invalidateKeys?: QueryKey[]
  /** Callback after rollback */
  onRollback?: (context: TContext, variables: TVariables) => void
}

export interface OptimisticListConfig<TItem, TVariables> {
  /** Query key for the list */
  queryKey: QueryKey
  /** How to add the optimistic item to the list */
  position?: 'start' | 'end'
  /** Create the optimistic item from variables */
  createOptimisticItem: (variables: TVariables) => TItem
  /** Get a temporary ID for the optimistic item */
  getTempId?: () => string
  /** Field name for the item ID (default: 'id') */
  idField?: keyof TItem
  /** Optional: Get the ID for the optimistic item (for single item updates) */
  getOptimisticId?: (variables: TVariables) => string
  /** Notifications config */
  notifications?: {
    success?: string | ((data: TItem, variables: TVariables) => string)
    error?: string | ((error: Error, variables: TVariables) => string)
  }
  /** Additional query keys to invalidate */
  invalidateKeys?: QueryKey[]
}

export interface OptimisticUpdateConfig<TItem, TVariables> {
  /** Query key for the list */
  queryKey: QueryKey
  /** Get the item ID from variables */
  getItemId: (variables: TVariables) => string
  /** Apply the update to the item */
  updateItem: (item: TItem, variables: TVariables) => TItem
  /** Field name for the item ID (default: 'id') */
  idField?: keyof TItem
  /** Notifications config */
  notifications?: {
    success?: string | ((data: TItem, variables: TVariables) => string)
    error?: string | ((error: Error, variables: TVariables) => string)
  }
  /** Additional query keys to invalidate */
  invalidateKeys?: QueryKey[]
}

export interface OptimisticDeleteConfig<TItem, TVariables> {
  /** Query key for the list */
  queryKey: QueryKey
  /** Get the item ID from variables */
  getItemId: (variables: TVariables) => string
  /** Field name for the item ID (default: 'id') */
  idField?: keyof TItem
  /** Notifications config */
  notifications?: {
    success?: string
    error?: string | ((error: Error, variables: TVariables) => string)
  }
  /** Additional query keys to invalidate */
  invalidateKeys?: QueryKey[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate a temporary ID for optimistic items */
export function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/** Check if an ID is a temporary optimistic ID */
export function isTempId(id: string): boolean {
  return id.startsWith('temp-')
}

// ============================================================================
// useOptimisticAdd - Add an item to a list optimistically
// ============================================================================

/**
 * Hook for optimistically adding an item to a list
 *
 * @example
 * const addTask = useOptimisticAdd<Task, CreateTaskDTO>({
 *   queryKey: ['tasks', projectId],
 *   createOptimisticItem: (variables) => ({
 *     id: generateTempId(),
 *     ...variables,
 *     created_at: new Date().toISOString(),
 *     _isPending: true,
 *   }),
 *   mutationFn: (variables) => tasksApi.createTask(variables),
 *   notifications: {
 *     success: (data) => `Task "${data.title}" created`,
 *     error: 'Failed to create task',
 *   },
 * })
 */
export function useOptimisticAdd<TItem extends { [key: string]: unknown }, TVariables>(
  config: OptimisticListConfig<TItem, TVariables> & {
    mutationFn: (variables: TVariables) => Promise<TItem>
  }
) {
  const queryClient = useQueryClient()
  const { handleError, showSuccess } = useNotifications()

  const idField = (config.idField || 'id') as keyof TItem
  const getTempId = config.getTempId || generateTempId

  return useMutation<TItem, Error, TVariables, { previousData: TItem[] | undefined }>({
    mutationFn: config.mutationFn,

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey })

      // Snapshot current data
      const previousData = queryClient.getQueryData<TItem[]>(config.queryKey)

      // Create optimistic item
      const optimisticItem = {
        ...config.createOptimisticItem(variables),
        [idField]: getTempId(),
        _isPending: true,
      } as TItem

      // Optimistically update cache
      queryClient.setQueryData<TItem[]>(config.queryKey, (old) => {
        const list = old || []
        return config.position === 'start'
          ? [optimisticItem, ...list]
          : [...list, optimisticItem]
      })

      return { previousData }
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData)
      }

      // Show error notification
      const message = config.notifications?.error
        ? typeof config.notifications.error === 'function'
          ? config.notifications.error(error, variables)
          : config.notifications.error
        : `Operation failed: ${error.message}`
      handleError(error, message)
    },

    onSuccess: (data, variables) => {
      // Show success notification
      if (config.notifications?.success) {
        const message = typeof config.notifications.success === 'function'
          ? config.notifications.success(data, variables)
          : config.notifications.success
        showSuccess('Success', message)
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: config.queryKey })

      // Invalidate additional keys
      config.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

// ============================================================================
// useOptimisticUpdate - Update an item in a list optimistically
// ============================================================================

/**
 * Hook for optimistically updating an item in a list
 *
 * @example
 * const updateTask = useOptimisticUpdate<Task, { id: string; data: Partial<Task> }>({
 *   queryKey: ['tasks', projectId],
 *   getItemId: (vars) => vars.id,
 *   updateItem: (item, vars) => ({ ...item, ...vars.data, _isPending: true }),
 *   mutationFn: (vars) => tasksApi.updateTask(vars.id, vars.data),
 *   notifications: {
 *     success: 'Task updated',
 *     error: 'Failed to update task',
 *   },
 * })
 */
export function useOptimisticUpdate<TItem extends { [key: string]: unknown }, TVariables>(
  config: OptimisticUpdateConfig<TItem, TVariables> & {
    mutationFn: (variables: TVariables) => Promise<TItem>
  }
) {
  const queryClient = useQueryClient()
  const { handleError, showSuccess } = useNotifications()

  const idField = (config.idField || 'id') as keyof TItem

  return useMutation<TItem, Error, TVariables, { previousData: TItem[] | undefined }>({
    mutationFn: config.mutationFn,

    onMutate: async (variables) => {
      const itemId = config.getItemId(variables)

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey })

      // Snapshot current data
      const previousData = queryClient.getQueryData<TItem[]>(config.queryKey)

      // Optimistically update the item in the list
      queryClient.setQueryData<TItem[]>(config.queryKey, (old) => {
        if (!old) {return old}
        return old.map((item) =>
          item[idField] === itemId
            ? { ...config.updateItem(item, variables), _isPending: true }
            : item
        )
      })

      return { previousData }
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData)
      }

      // Show error notification
      const message = config.notifications?.error
        ? typeof config.notifications.error === 'function'
          ? config.notifications.error(error, variables)
          : config.notifications.error
        : `Update failed: ${error.message}`
      handleError(error, message)
    },

    onSuccess: (data, variables) => {
      // Show success notification
      if (config.notifications?.success) {
        const message = typeof config.notifications.success === 'function'
          ? config.notifications.success(data, variables)
          : config.notifications.success
        showSuccess('Success', message)
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: config.queryKey })

      // Invalidate additional keys
      config.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

// ============================================================================
// useOptimisticDelete - Delete an item from a list optimistically
// ============================================================================

/**
 * Hook for optimistically deleting an item from a list
 *
 * @example
 * const deleteTask = useOptimisticDelete<Task, string>({
 *   queryKey: ['tasks', projectId],
 *   getItemId: (taskId) => taskId,
 *   mutationFn: (taskId) => tasksApi.deleteTask(taskId),
 *   notifications: {
 *     success: 'Task deleted',
 *     error: 'Failed to delete task',
 *   },
 * })
 */
export function useOptimisticDelete<TItem extends { [key: string]: unknown }, TVariables>(
  config: OptimisticDeleteConfig<TItem, TVariables> & {
    mutationFn: (variables: TVariables) => Promise<void>
  }
) {
  const queryClient = useQueryClient()
  const { handleError, showSuccess } = useNotifications()

  const idField = (config.idField || 'id') as keyof TItem

  return useMutation<void, Error, TVariables, { previousData: TItem[] | undefined; deletedItem: TItem | undefined }>({
    mutationFn: config.mutationFn,

    onMutate: async (variables) => {
      const itemId = config.getItemId(variables)

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey })

      // Snapshot current data
      const previousData = queryClient.getQueryData<TItem[]>(config.queryKey)
      const deletedItem = previousData?.find((item) => item[idField] === itemId)

      // Optimistically remove the item from the list
      queryClient.setQueryData<TItem[]>(config.queryKey, (old) => {
        if (!old) {return old}
        return old.filter((item) => item[idField] !== itemId)
      })

      return { previousData, deletedItem }
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData)
      }

      // Show error notification
      const message = config.notifications?.error
        ? typeof config.notifications.error === 'function'
          ? config.notifications.error(error, variables)
          : config.notifications.error
        : `Delete failed: ${error.message}`
      handleError(error, message)
    },

    onSuccess: () => {
      // Show success notification
      if (config.notifications?.success) {
        showSuccess('Success', config.notifications.success)
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: config.queryKey })

      // Invalidate additional keys
      config.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

// ============================================================================
// useOptimisticToggle - Toggle a boolean field optimistically
// ============================================================================

export interface OptimisticToggleConfig<TItem, TVariables> {
  /** Query key for the list */
  queryKey: QueryKey
  /** Get the item ID from variables */
  getItemId: (variables: TVariables) => string
  /** The boolean field to toggle */
  toggleField: keyof TItem
  /** Field name for the item ID (default: 'id') */
  idField?: keyof TItem
  /** Notifications config */
  notifications?: {
    success?: string | ((data: TItem, variables: TVariables) => string)
    error?: string | ((error: Error, variables: TVariables) => string)
  }
  /** Additional query keys to invalidate */
  invalidateKeys?: QueryKey[]
}

/**
 * Hook for optimistically toggling a boolean field
 *
 * @example
 * const toggleComplete = useOptimisticToggle<Task, string>({
 *   queryKey: ['tasks', projectId],
 *   getItemId: (taskId) => taskId,
 *   toggleField: 'is_completed',
 *   mutationFn: (taskId) => tasksApi.toggleComplete(taskId),
 *   notifications: {
 *     success: (data) => data.is_completed ? 'Task completed' : 'Task reopened',
 *   },
 * })
 */
export function useOptimisticToggle<TItem extends { [key: string]: unknown }, TVariables>(
  config: OptimisticToggleConfig<TItem, TVariables> & {
    mutationFn: (variables: TVariables) => Promise<TItem>
  }
) {
  const queryClient = useQueryClient()
  const { handleError, showSuccess } = useNotifications()

  const idField = (config.idField || 'id') as keyof TItem

  return useMutation<TItem, Error, TVariables, { previousData: TItem[] | undefined }>({
    mutationFn: config.mutationFn,

    onMutate: async (variables) => {
      const itemId = config.getItemId(variables)

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey })

      // Snapshot current data
      const previousData = queryClient.getQueryData<TItem[]>(config.queryKey)

      // Optimistically toggle the field
      queryClient.setQueryData<TItem[]>(config.queryKey, (old) => {
        if (!old) {return old}
        return old.map((item) =>
          item[idField] === itemId
            ? {
                ...item,
                [config.toggleField]: !item[config.toggleField],
                _isPending: true,
              }
            : item
        )
      })

      return { previousData }
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData)
      }

      // Show error notification
      const message = config.notifications?.error
        ? typeof config.notifications.error === 'function'
          ? config.notifications.error(error, variables)
          : config.notifications.error
        : `Toggle failed: ${error.message}`
      handleError(error, message)
    },

    onSuccess: (data, variables) => {
      // Show success notification
      if (config.notifications?.success) {
        const message = typeof config.notifications.success === 'function'
          ? config.notifications.success(data, variables)
          : config.notifications.success
        showSuccess('Success', message)
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: config.queryKey })

      // Invalidate additional keys
      config.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
  })
}

// ============================================================================
// useOptimisticMutation - Generic optimistic mutation with custom logic
// ============================================================================

/**
 * Generic hook for custom optimistic mutations
 *
 * @example
 * const reorderTasks = useOptimisticMutation<Task[], { oldIndex: number; newIndex: number }>({
 *   queryKey: ['tasks', projectId],
 *   getOptimisticData: (vars, current) => {
 *     const items = [...(current || [])]
 *     const [removed] = items.splice(vars.oldIndex, 1)
 *     items.splice(vars.newIndex, 0, removed)
 *     return items
 *   },
 *   mutationFn: (vars) => tasksApi.reorder(vars.oldIndex, vars.newIndex),
 * })
 */
export function useOptimisticMutation<TData, TVariables, TResult = TData>(
  config: OptimisticConfig<TData, TVariables> & {
    mutationFn: (variables: TVariables) => Promise<TResult>
  },
  mutationOptions?: Omit<UseMutationOptions<TResult, Error, TVariables>, 'mutationFn'>
) {
  const queryClient = useQueryClient()
  const { handleError, showSuccess } = useNotifications()

  // Normalize queryKey to array of keys
  const queryKeys = Array.isArray(config.queryKey[0])
    ? (config.queryKey as QueryKey[])
    : [config.queryKey as QueryKey]

  return useMutation<TResult, Error, TVariables, { previousData: Map<string, TData | undefined> }>({
    mutationFn: config.mutationFn,

    onMutate: async (variables) => {
      // Cancel outgoing refetches for all keys
      await Promise.all(
        queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key }))
      )

      // Snapshot current data for all keys
      const previousData = new Map<string, TData | undefined>()
      queryKeys.forEach((key) => {
        previousData.set(JSON.stringify(key), queryClient.getQueryData<TData>(key))
      })

      // Optimistically update all keys
      queryKeys.forEach((key) => {
        const currentData = queryClient.getQueryData<TData>(key)
        queryClient.setQueryData(key, config.getOptimisticData(variables, currentData))
      })

      return { previousData }
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          const key = JSON.parse(keyString) as QueryKey
          queryClient.setQueryData(key, data)
        })
      }

      // Show error notification
      const message = config.notifications?.error
        ? typeof config.notifications.error === 'function'
          ? config.notifications.error(error, variables)
          : config.notifications.error
        : `Operation failed: ${error.message}`
      handleError(error, message)

      config.onRollback?.(context as unknown as unknown, variables)
      mutationOptions?.onError?.(error, variables, context)
    },

    onSuccess: (data, variables, context) => {
      // Show success notification
      if (config.notifications?.success) {
        const message = typeof config.notifications.success === 'function'
          ? config.notifications.success(data as unknown as TData, variables)
          : config.notifications.success
        showSuccess('Success', message)
      }

      mutationOptions?.onSuccess?.(data, variables, context)
    },

    onSettled: (data, error, variables, context) => {
      // Always refetch to ensure consistency
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })

      // Invalidate additional keys
      config.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })

      mutationOptions?.onSettled?.(data, error, variables, context)
    },

    ...mutationOptions,
  })
}

// ============================================================================
// Utility: withPending - Add pending state to item
// ============================================================================

/**
 * Utility to add pending state indicator to an item
 * Useful for showing loading spinners on optimistic items
 */
export function withPending<T extends object>(item: T): T & { _isPending: boolean } {
  return { ...item, _isPending: true }
}

/**
 * Utility to check if an item is pending (optimistic)
 */
export function isPending<T extends { _isPending?: boolean }>(item: T): boolean {
  return item._isPending === true
}

/**
 * Utility to remove pending items from a list (after successful mutation)
 */
export function removePendingItems<T extends { _isPending?: boolean }>(items: T[]): T[] {
  return items.filter((item) => !item._isPending)
}
