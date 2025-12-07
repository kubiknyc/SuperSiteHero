// File: src/hooks/useRealtimeUpdates.ts
// Hook for automatic React Query cache invalidation on realtime changes

import { useEffect, useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { RealtimeTable } from '@/lib/realtime'

interface UseRealtimeUpdatesOptions {
  table: RealtimeTable
  filter?: string
  queryKey: unknown[]
  enabled?: boolean
  /** Show a "new updates" banner instead of auto-refreshing */
  showUpdateBanner?: boolean
  /** Custom invalidation logic */
  onUpdate?: () => void
}

interface UseRealtimeUpdatesReturn {
  /** Number of pending updates (when showUpdateBanner is true) */
  pendingUpdates: number
  /** Apply pending updates by invalidating the query */
  applyUpdates: () => void
  /** Dismiss pending updates without applying */
  dismissUpdates: () => void
}

/**
 * Hook to automatically invalidate React Query cache on realtime table changes
 *
 * @example
 * ```tsx
 * // Auto-refresh on changes
 * const { data } = useRFIs(projectId)
 * useRealtimeUpdates({
 *   table: 'workflow_items',
 *   filter: `project_id=eq.${projectId}`,
 *   queryKey: ['rfis', projectId],
 * })
 *
 * // Show "new updates" banner
 * const { pendingUpdates, applyUpdates } = useRealtimeUpdates({
 *   table: 'daily_reports',
 *   queryKey: ['daily-reports', projectId],
 *   showUpdateBanner: true,
 * })
 * ```
 */
export function useRealtimeUpdates(
  options: UseRealtimeUpdatesOptions
): UseRealtimeUpdatesReturn {
  const {
    table,
    filter,
    queryKey,
    enabled = true,
    showUpdateBanner = false,
    onUpdate,
  } = options

  const queryClient = useQueryClient()
  const [pendingUpdates, setPendingUpdates] = useState(0)

  // Track the query key to avoid stale closures
  const queryKeyRef = useRef(queryKey)
  useEffect(() => {
    queryKeyRef.current = queryKey
  }, [queryKey])

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeyRef.current })
    onUpdate?.()
  }, [queryClient, onUpdate])

  const handleChange = useCallback(() => {
    if (showUpdateBanner) {
      setPendingUpdates((prev) => prev + 1)
    } else {
      invalidateQueries()
    }
  }, [showUpdateBanner, invalidateQueries])

  // Subscribe to realtime changes
  useRealtimeSubscription({
    table,
    filter,
    enabled,
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  })

  const applyUpdates = useCallback(() => {
    invalidateQueries()
    setPendingUpdates(0)
  }, [invalidateQueries])

  const dismissUpdates = useCallback(() => {
    setPendingUpdates(0)
  }, [])

  return {
    pendingUpdates,
    applyUpdates,
    dismissUpdates,
  }
}

/**
 * Convenience hook for project-scoped realtime updates
 */
export function useProjectRealtimeUpdates(
  table: RealtimeTable,
  projectId: string,
  queryKey: unknown[],
  options?: { showUpdateBanner?: boolean }
) {
  return useRealtimeUpdates({
    table,
    filter: `project_id=eq.${projectId}`,
    queryKey,
    enabled: !!projectId,
    showUpdateBanner: options?.showUpdateBanner,
  })
}

/**
 * Pre-configured hook for daily reports realtime
 */
export function useDailyReportsRealtime(projectId: string, showBanner = false) {
  return useProjectRealtimeUpdates(
    'daily_reports',
    projectId,
    ['daily-reports', projectId],
    { showUpdateBanner: showBanner }
  )
}

/**
 * Pre-configured hook for workflow items (RFIs, Submittals) realtime
 */
export function useWorkflowItemsRealtime(
  projectId: string,
  workflowType: 'rfis' | 'submittals',
  showBanner = false
) {
  return useProjectRealtimeUpdates(
    'workflow_items',
    projectId,
    [workflowType, projectId],
    { showUpdateBanner: showBanner }
  )
}

/**
 * Pre-configured hook for documents realtime
 */
export function useDocumentsRealtime(projectId: string, showBanner = false) {
  return useProjectRealtimeUpdates(
    'documents',
    projectId,
    ['documents', projectId],
    { showUpdateBanner: showBanner }
  )
}

/**
 * Pre-configured hook for approval requests realtime
 */
export function useApprovalsRealtime(projectId: string, showBanner = false) {
  return useProjectRealtimeUpdates(
    'approval_requests',
    projectId,
    ['approval-requests', projectId],
    { showUpdateBanner: showBanner }
  )
}
