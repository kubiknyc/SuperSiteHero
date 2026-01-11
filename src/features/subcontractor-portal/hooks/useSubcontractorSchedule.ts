/**
 * Subcontractor Schedule Hooks
 * Hooks for viewing schedule activities and notifications (P1-3 Feature)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorScheduleActivity,
  ScheduleChangeNotification,
  ScheduleSummary,
  ScheduleActivityStatus,
} from '@/types/subcontractor-portal'

// =============================================
// QUERY KEYS
// =============================================

export const scheduleKeys = {
  all: ['subcontractor', 'schedule'] as const,
  activities: () => [...scheduleKeys.all, 'activities'] as const,
  notifications: () => [...scheduleKeys.all, 'notifications'] as const,
  summary: () => [...scheduleKeys.all, 'summary'] as const,
}

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch all schedule activities for the current subcontractor
 */
export function useSubcontractorScheduleActivities() {
  const { user } = useAuth()

  return useQuery({
    queryKey: scheduleKeys.activities(),
    queryFn: () => subcontractorPortalApi.getScheduleActivities(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - schedule data changes frequently
  })
}

/**
 * Fetch schedule change notifications
 */
export function useScheduleChangeNotifications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: scheduleKeys.notifications(),
    queryFn: () => subcontractorPortalApi.getScheduleChangeNotifications(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 1, // 1 minute
  })
}

/**
 * Fetch schedule summary for dashboard
 */
export function useScheduleSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: scheduleKeys.summary(),
    queryFn: () => subcontractorPortalApi.getScheduleSummary(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// =============================================
// MUTATION HOOKS
// =============================================

/**
 * Mark a schedule notification as read
 */
export function useMarkScheduleNotificationRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) =>
      subcontractorPortalApi.markScheduleNotificationRead(user?.id || '', notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.notifications() })
      queryClient.invalidateQueries({ queryKey: scheduleKeys.summary() })
    },
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get status badge variant for activity status
 */
export function getActivityStatusVariant(status: ScheduleActivityStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'not_started':
      return 'outline'
    case 'in_progress':
      return 'secondary'
    case 'completed':
      return 'default'
    case 'on_hold':
      return 'outline'
    case 'delayed':
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get human-readable label for activity status
 */
export function getActivityStatusLabel(status: ScheduleActivityStatus): string {
  const labels: Record<ScheduleActivityStatus, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold',
    delayed: 'Delayed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

/**
 * Get status color for styling
 */
export function getActivityStatusColor(status: ScheduleActivityStatus): string {
  switch (status) {
    case 'not_started':
      return 'text-muted-foreground'
    case 'in_progress':
      return 'text-blue-600'
    case 'completed':
      return 'text-green-600'
    case 'on_hold':
      return 'text-yellow-600'
    case 'delayed':
      return 'text-red-600'
    case 'cancelled':
      return 'text-gray-500'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Format variance in days
 */
export function formatVariance(days: number | null): string {
  if (days == null) {return '-'}
  if (days === 0) {return 'On schedule'}
  const sign = days > 0 ? '+' : ''
  return `${sign}${days} day${Math.abs(days) !== 1 ? 's' : ''}`
}

/**
 * Get variance color
 */
export function getVarianceColor(days: number | null): string {
  if (days == null || days === 0) {return 'text-muted-foreground'}
  if (days < 0) {return 'text-green-600'} // Ahead of schedule
  if (days <= 3) {return 'text-yellow-600'} // Slightly behind
  return 'text-red-600' // Significantly behind
}

/**
 * Get change type label
 */
export function getChangeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    date_change: 'Date Changed',
    status_change: 'Status Updated',
    delay: 'Delay Alert',
    assignment: 'Assignment Changed',
    completion: 'Completed',
  }
  return labels[type] || type
}

/**
 * Get change type color
 */
export function getChangeTypeColor(type: string): string {
  switch (type) {
    case 'date_change':
      return 'text-blue-600'
    case 'status_change':
      return 'text-purple-600'
    case 'delay':
      return 'text-red-600'
    case 'assignment':
      return 'text-orange-600'
    case 'completion':
      return 'text-green-600'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Group activities by project
 */
export function groupActivitiesByProject(
  activities: SubcontractorScheduleActivity[]
): Record<string, SubcontractorScheduleActivity[]> {
  return activities.reduce((acc, activity) => {
    const key = activity.project_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(activity)
    return acc
  }, {} as Record<string, SubcontractorScheduleActivity[]>)
}

/**
 * Filter activities by status
 */
export function filterActivitiesByStatus(
  activities: SubcontractorScheduleActivity[],
  filter: 'all' | 'upcoming' | 'overdue' | 'delayed' | 'critical'
): SubcontractorScheduleActivity[] {
  switch (filter) {
    case 'upcoming':
      return activities.filter((a) => a.is_upcoming)
    case 'overdue':
      return activities.filter((a) => a.is_overdue)
    case 'delayed':
      return activities.filter((a) => a.status === 'delayed')
    case 'critical':
      return activities.filter((a) => a.is_on_critical_path)
    default:
      return activities
  }
}

/**
 * Format date for display
 */
export function formatScheduleDate(dateString: string | null): string {
  if (!dateString) {return '-'}
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get days until a date
 */
export function getDaysUntil(dateString: string | null): number | null {
  if (!dateString) {return null}
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Re-export types for convenience
export type {
  SubcontractorScheduleActivity,
  ScheduleChangeNotification,
  ScheduleSummary,
  ScheduleActivityStatus,
}
