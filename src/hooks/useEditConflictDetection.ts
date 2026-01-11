// File: src/hooks/useEditConflictDetection.ts
// Hook for detecting when another user edits the same record while you're editing

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import { useAuth } from '@/lib/auth'

export interface EditConflict<T = Record<string, unknown>> {
  /** The updated record from the server */
  serverData: T
  /** Timestamp when the conflict was detected */
  detectedAt: number
  /** Who made the change (if available) */
  updatedBy?: string
}

export interface UseEditConflictDetectionOptions<T = Record<string, unknown>> {
  /** Table name to watch */
  table: string
  /** Record ID to watch */
  recordId: string | undefined
  /** Current local data (to compare against server updates) */
  localData?: T
  /** Whether conflict detection is enabled (typically when dialog is open) */
  enabled?: boolean
  /** Callback when a conflict is detected */
  onConflict?: (conflict: EditConflict<T>) => void
}

export interface UseEditConflictDetectionResult<T = Record<string, unknown>> {
  /** Whether a conflict has been detected */
  hasConflict: boolean
  /** The conflict details (if any) */
  conflict: EditConflict<T> | null
  /** Clear the conflict (user chose to dismiss) */
  dismissConflict: () => void
  /** Refresh local data with server data */
  acceptServerChanges: () => T | null
  /** Mark conflict as resolved (user chose to overwrite) */
  resolveWithLocalChanges: () => void
}

/**
 * Hook that detects when another user updates a record while you're editing it.
 *
 * @example
 * ```tsx
 * const { hasConflict, conflict, dismissConflict, acceptServerChanges } = useEditConflictDetection({
 *   table: 'daily_reports',
 *   recordId: report.id,
 *   localData: formData,
 *   enabled: dialogOpen,
 *   onConflict: (conflict) => {
 *     toast.warning('Someone else updated this record')
 *   }
 * })
 *
 * // Show warning banner when conflict detected
 * {hasConflict && (
 *   <EditConflictBanner
 *     onAcceptServer={acceptServerChanges}
 *     onKeepLocal={resolveWithLocalChanges}
 *     onDismiss={dismissConflict}
 *   />
 * )}
 * ```
 */
export function useEditConflictDetection<T = Record<string, unknown>>(
  options: UseEditConflictDetectionOptions<T>
): UseEditConflictDetectionResult<T> {
  const { table, recordId, localData, enabled = true, onConflict } = options
  const { user } = useAuth()

  const [conflict, setConflict] = useState<EditConflict<T> | null>(null)
  const onConflictRef = useRef(onConflict)
  const localDataRef = useRef(localData)

  // Keep refs updated
  useEffect(() => {
    onConflictRef.current = onConflict
    localDataRef.current = localData
  }, [onConflict, localData])

  // Subscribe to updates on this specific record
  useRealtimeSubscription<T>({
    table,
    filter: recordId ? `id=eq.${recordId}` : undefined,
    enabled: enabled && !!recordId,
    onUpdate: (newRecord, _oldRecord) => {
      // Check if update was made by someone else
      const updatedBy = (newRecord as Record<string, unknown>).updated_by as string | undefined
      const currentUserId = user?.id

      // If we made the update ourselves, ignore it
      if (updatedBy && currentUserId && updatedBy === currentUserId) {
        return
      }

      // Check if there are actual differences from our local state
      const hasChanges = detectChanges(localDataRef.current, newRecord)

      if (hasChanges) {
        const newConflict: EditConflict<T> = {
          serverData: newRecord,
          detectedAt: Date.now(),
          updatedBy,
        }

        setConflict(newConflict)
        onConflictRef.current?.(newConflict)
      }
    },
  })

  const dismissConflict = useCallback(() => {
    setConflict(null)
  }, [])

  const acceptServerChanges = useCallback(() => {
    if (!conflict) {return null}
    const serverData = conflict.serverData
    setConflict(null)
    return serverData
  }, [conflict])

  const resolveWithLocalChanges = useCallback(() => {
    // User chose to keep their local changes and overwrite
    setConflict(null)
  }, [])

  // Reset conflict when recordId changes or detection is disabled
  useEffect(() => {
    if (!enabled || !recordId) {
      setConflict(null)
    }
  }, [enabled, recordId])

  return {
    hasConflict: conflict !== null,
    conflict,
    dismissConflict,
    acceptServerChanges,
    resolveWithLocalChanges,
  }
}

/**
 * Detect if there are meaningful changes between local and server data
 */
function detectChanges<T>(local: T | undefined, server: T): boolean {
  if (!local) {return false}

  // Compare JSON representations (simple deep equality)
  // Exclude timestamps and metadata fields
  const localClean = cleanForComparison(local as Record<string, unknown>)
  const serverClean = cleanForComparison(server as Record<string, unknown>)

  return JSON.stringify(localClean) !== JSON.stringify(serverClean)
}

/**
 * Remove metadata fields that shouldn't trigger conflict detection
 */
function cleanForComparison(data: Record<string, unknown>): Record<string, unknown> {
  const {
    updated_at,
    updated_by,
    created_at,
    created_by,
    ...rest
  } = data
  return rest
}
