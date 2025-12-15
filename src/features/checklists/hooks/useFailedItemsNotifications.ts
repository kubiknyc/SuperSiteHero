// File: /src/features/checklists/hooks/useFailedItemsNotifications.ts
// Hook for managing failed items notifications and alerts
// Enhancement: #6 - Notification System for Failed Items

import { useMemo, useCallback, useEffect } from 'react'
import { useExecutions } from './useExecutions'
import type { ChecklistExecution, ChecklistFilters } from '@/types/checklists'
import toast from 'react-hot-toast'

export interface FailedItemsSummary {
  totalFailedItems: number
  executionsWithFailures: ChecklistExecution[]
  failureRate: number
  recentFailures: Array<{
    execution: ChecklistExecution
    failedCount: number
  }>
}

interface UseFailedItemsNotificationsOptions {
  filters?: ChecklistFilters
  enableToasts?: boolean
  monitorNewFailures?: boolean
}

/**
 * Hook to track and manage notifications for failed checklist items
 * Provides summary data and can trigger toast notifications for new failures
 */
export function useFailedItemsNotifications({
  filters,
  enableToasts = false,
  monitorNewFailures = false,
}: UseFailedItemsNotificationsOptions = {}): {
  summary: FailedItemsSummary
  isLoading: boolean
  hasFailures: boolean
  dismissFailure: (executionId: string) => void
} {
  const { data: executions = [], isLoading } = useExecutions(filters)

  // Calculate failed items summary
  const summary = useMemo<FailedItemsSummary>(() => {
    // Filter to only completed executions
    const completedExecutions = executions.filter((e) => e.is_completed)

    // Find executions with failures (score_fail > 0)
    const executionsWithFailures = completedExecutions.filter((e) => e.score_fail > 0)

    // Calculate total failed items across all executions
    const totalFailedItems = executionsWithFailures.reduce(
      (sum, e) => sum + e.score_fail,
      0
    )

    // Calculate failure rate (percentage of items that failed)
    const totalItems = completedExecutions.reduce((sum, e) => sum + e.score_total, 0)
    const failureRate = totalItems > 0 ? (totalFailedItems / totalItems) * 100 : 0

    // Get recent failures (last 5 executions with failures, sorted by date)
    const recentFailures = executionsWithFailures
      .map((execution) => ({
        execution,
        failedCount: execution.score_fail,
      }))
      .sort(
        (a, b) =>
          new Date(b.execution.completed_at || b.execution.created_at).getTime() -
          new Date(a.execution.completed_at || a.execution.created_at).getTime()
      )
      .slice(0, 5)

    return {
      totalFailedItems,
      executionsWithFailures,
      failureRate,
      recentFailures,
    }
  }, [executions])

  // Monitor for new failures and show toast notifications
  useEffect(() => {
    if (!enableToasts || !monitorNewFailures || isLoading) {return}

    // Show toast for recent failures (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    summary.recentFailures.forEach(({ execution, failedCount }) => {
      const completedAt = new Date(execution.completed_at || execution.created_at)

      if (completedAt > oneHourAgo) {
        const toastId = `failure-${execution.id}`

        // Check if we've already shown this toast (using a simple cache key)
        const shownKey = `toast-shown-${execution.id}`
        if (sessionStorage.getItem(shownKey)) {return}

        toast.error(
          `⚠️ ${failedCount} failed item${failedCount > 1 ? 's' : ''} in "${execution.name}"`,
          {
            id: toastId,
            duration: 8000,
            position: 'top-right',
          }
        )

        // Mark as shown
        sessionStorage.setItem(shownKey, 'true')
      }
    })
  }, [summary.recentFailures, enableToasts, monitorNewFailures, isLoading])

  const dismissFailure = useCallback((executionId: string) => {
    // Mark as dismissed in session storage
    sessionStorage.setItem(`failure-dismissed-${executionId}`, 'true')
  }, [])

  return {
    summary,
    isLoading,
    hasFailures: summary.totalFailedItems > 0,
    dismissFailure,
  }
}

/**
 * Check if a specific execution has been dismissed
 */
export function isFailureDismissed(executionId: string): boolean {
  return sessionStorage.getItem(`failure-dismissed-${executionId}`) === 'true'
}

/**
 * Clear all dismissed failures
 */
export function clearDismissedFailures(): void {
  // Get all keys from sessionStorage
  const keys = Object.keys(sessionStorage)

  // Remove all failure-dismissed keys
  keys.forEach((key) => {
    if (key.startsWith('failure-dismissed-') || key.startsWith('toast-shown-')) {
      sessionStorage.removeItem(key)
    }
  })
}

/**
 * Get failure severity level based on failure rate
 */
export function getFailureSeverity(failureRate: number): 'low' | 'medium' | 'high' | 'critical' {
  if (failureRate >= 30) {return 'critical'}
  if (failureRate >= 20) {return 'high'}
  if (failureRate >= 10) {return 'medium'}
  return 'low'
}

/**
 * Get color class based on severity
 */
export function getSeverityColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'text-red-700 bg-red-100 border-red-300'
    case 'high':
      return 'text-orange-700 bg-orange-100 border-orange-300'
    case 'medium':
      return 'text-yellow-700 bg-yellow-100 border-yellow-300'
    case 'low':
      return 'text-blue-700 bg-blue-100 border-blue-300'
  }
}
