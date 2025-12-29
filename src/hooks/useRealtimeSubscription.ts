// File: src/hooks/useRealtimeSubscription.ts
// Generic hook for subscribing to Supabase Realtime table changes

import { useEffect, useRef, useState } from 'react'
import { realtimeManager, type SubscriptionOptions } from '@/lib/realtime'


interface UseRealtimeSubscriptionOptions<T = Record<string, unknown>> {
  table: string
  schema?: string
  filter?: string
  enabled?: boolean
  onInsert?: (record: T) => void
  onUpdate?: (newRecord: T, oldRecord: T) => void
  onDelete?: (oldRecord: T) => void
  onError?: (error: Error) => void
}

/**
 * Subscribe to realtime changes on a database table
 *
 * @example
 * ```tsx
 * useRealtimeSubscription({
 *   table: 'daily_reports',
 *   filter: `project_id=eq.${projectId}`,
 *   onInsert: (report) => logger.log('New report:', report),
 *   onUpdate: (newReport) => logger.log('Updated:', newReport),
 * })
 * ```
 */
export function useRealtimeSubscription<T = Record<string, unknown>>(
  options: UseRealtimeSubscriptionOptions<T>
): void {
  const {
    table,
    schema = 'public',
    filter,
    enabled = true,
    onInsert,
    onUpdate,
    onDelete,
    onError,
  } = options

  // Use refs to avoid re-subscribing when callbacks change
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
    onErrorRef.current = onError
  }, [onInsert, onUpdate, onDelete, onError])

  useEffect(() => {
    if (!enabled) {return}

    const subscriptionOptions: SubscriptionOptions<T> = {
      table,
      schema,
      filter,
      onInsert: (record) => onInsertRef.current?.(record),
      onUpdate: (newRecord, oldRecord) => onUpdateRef.current?.(newRecord, oldRecord),
      onDelete: (oldRecord) => onDeleteRef.current?.(oldRecord),
      onError: (error) => onErrorRef.current?.(error),
    }

    const unsubscribe = realtimeManager.subscribeToTable(subscriptionOptions)

    return () => {
      unsubscribe()
    }
  }, [table, schema, filter, enabled])
}

/**
 * Hook to get the current realtime connection state
 */
export function useRealtimeConnectionState() {
  const [connectionState, setConnectionState] = useState(
    realtimeManager.getConnectionState()
  )

  useEffect(() => {
    return realtimeManager.onConnectionChange(setConnectionState)
  }, [])

  return connectionState
}
