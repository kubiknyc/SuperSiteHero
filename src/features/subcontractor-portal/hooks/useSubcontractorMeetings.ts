/**
 * Subcontractor Meetings Hooks
 * Hooks for viewing meeting minutes and action items (P2-2 Feature)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorMeeting,
  SubcontractorActionItem,
  MeetingAttachment,
  MeetingSummary,
  MeetingStatus,
  ActionItemStatus,
  ActionItemPriority,
} from '@/types/subcontractor-portal'

// =============================================
// QUERY KEYS
// =============================================

export const meetingKeys = {
  all: ['subcontractor', 'meetings'] as const,
  list: () => [...meetingKeys.all, 'list'] as const,
  actionItems: () => [...meetingKeys.all, 'action-items'] as const,
  attachments: (meetingId: string) => [...meetingKeys.all, 'attachments', meetingId] as const,
  summary: () => [...meetingKeys.all, 'summary'] as const,
}

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch meetings the subcontractor attended or was invited to
 */
export function useSubcontractorMeetings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: meetingKeys.list(),
    queryFn: () => subcontractorPortalApi.getMeetings(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch action items assigned to the subcontractor
 */
export function useSubcontractorActionItems() {
  const { user } = useAuth()

  return useQuery({
    queryKey: meetingKeys.actionItems(),
    queryFn: () => subcontractorPortalApi.getActionItems(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch attachments for a specific meeting
 */
export function useMeetingAttachments(meetingId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: meetingKeys.attachments(meetingId),
    queryFn: () => subcontractorPortalApi.getMeetingAttachments(meetingId),
    enabled: !!user?.id && !!meetingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch meeting summary for dashboard
 */
export function useMeetingSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: meetingKeys.summary(),
    queryFn: () => subcontractorPortalApi.getMeetingSummary(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// MUTATION HOOKS
// =============================================

/**
 * Mark an action item as complete
 */
export function useMarkActionItemComplete() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionItemId: string) =>
      subcontractorPortalApi.markActionItemComplete(user?.id || '', actionItemId),
    onSuccess: () => {
      // Invalidate action items and summary
      queryClient.invalidateQueries({ queryKey: meetingKeys.actionItems() })
      queryClient.invalidateQueries({ queryKey: meetingKeys.summary() })
    },
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get meeting status badge variant
 */
export function getMeetingStatusBadgeVariant(status: MeetingStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'scheduled':
      return 'outline'
    case 'in_progress':
      return 'secondary'
    case 'completed':
      return 'default'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get meeting status label
 */
export function getMeetingStatusLabel(status: MeetingStatus): string {
  const labels: Record<MeetingStatus, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

/**
 * Get meeting status color
 */
export function getMeetingStatusColor(status: MeetingStatus): string {
  switch (status) {
    case 'scheduled':
      return 'text-blue-600'
    case 'in_progress':
      return 'text-yellow-600'
    case 'completed':
      return 'text-green-600'
    case 'cancelled':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get action item status badge variant
 */
export function getActionItemStatusBadgeVariant(status: ActionItemStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pending':
      return 'outline'
    case 'in_progress':
      return 'secondary'
    case 'completed':
      return 'default'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get action item status label
 */
export function getActionItemStatusLabel(status: ActionItemStatus): string {
  const labels: Record<ActionItemStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

/**
 * Get action item status color
 */
export function getActionItemStatusColor(status: ActionItemStatus): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600'
    case 'in_progress':
      return 'text-blue-600'
    case 'completed':
      return 'text-green-600'
    case 'cancelled':
      return 'text-gray-600'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get action item priority badge variant
 */
export function getActionItemPriorityBadgeVariant(priority: ActionItemPriority): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (priority) {
    case 'low':
      return 'outline'
    case 'medium':
      return 'secondary'
    case 'high':
      return 'default'
    case 'urgent':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get action item priority label
 */
export function getActionItemPriorityLabel(priority: ActionItemPriority): string {
  const labels: Record<ActionItemPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  }
  return labels[priority] || priority
}

/**
 * Get action item priority color
 */
export function getActionItemPriorityColor(priority: ActionItemPriority): string {
  switch (priority) {
    case 'low':
      return 'text-gray-600'
    case 'medium':
      return 'text-blue-600'
    case 'high':
      return 'text-orange-600'
    case 'urgent':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Format meeting date for display
 */
export function formatMeetingDate(dateString: string | null): string {
  if (!dateString) {return '-'}
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format meeting time for display
 */
export function formatMeetingTime(timeString: string | null): string {
  if (!timeString) {return '-'}
  // Assume time is in HH:MM:SS format
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number | null): string {
  if (!minutes) {return '-'}
  if (minutes < 60) {return `${minutes} min`}
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {return `${hours} hr`}
  return `${hours} hr ${mins} min`
}

/**
 * Calculate days until due date
 */
export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) {return null}
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if action item is overdue
 */
export function isActionItemOverdue(item: SubcontractorActionItem): boolean {
  if (item.is_overdue) {return true}
  if (!item.due_date) {return false}
  if (item.status === 'completed' || item.status === 'cancelled') {return false}
  const days = getDaysUntilDue(item.due_date)
  return days !== null && days < 0
}

/**
 * Filter action items by status
 */
export function filterActionItemsByStatus(
  items: SubcontractorActionItem[],
  filter: 'all' | 'open' | 'overdue' | 'completed'
): SubcontractorActionItem[] {
  switch (filter) {
    case 'open':
      return items.filter(i => i.status === 'pending' || i.status === 'in_progress')
    case 'overdue':
      return items.filter(i => isActionItemOverdue(i))
    case 'completed':
      return items.filter(i => i.status === 'completed')
    default:
      return items
  }
}

/**
 * Filter meetings by status
 */
export function filterMeetingsByStatus(
  meetings: SubcontractorMeeting[],
  filter: 'all' | 'upcoming' | 'past' | 'attended'
): SubcontractorMeeting[] {
  switch (filter) {
    case 'upcoming':
      return meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress')
    case 'past':
      return meetings.filter(m => m.status === 'completed' || m.status === 'cancelled')
    case 'attended':
      return meetings.filter(m => m.subcontractor_attended)
    default:
      return meetings
  }
}

/**
 * Group meetings by project
 */
export function groupMeetingsByProject(
  meetings: SubcontractorMeeting[]
): Record<string, SubcontractorMeeting[]> {
  return meetings.reduce((acc, meeting) => {
    const key = meeting.project_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(meeting)
    return acc
  }, {} as Record<string, SubcontractorMeeting[]>)
}

/**
 * Group action items by meeting
 */
export function groupActionItemsByMeeting(
  items: SubcontractorActionItem[]
): Record<string, SubcontractorActionItem[]> {
  return items.reduce((acc, item) => {
    const key = item.meeting_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<string, SubcontractorActionItem[]>)
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) {return '-'}
  if (bytes < 1024) {return `${bytes} B`}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`}
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get meeting type label
 */
export function getMeetingTypeLabel(meetingType: string | null): string {
  if (!meetingType) {return 'General'}
  const labels: Record<string, string> = {
    kickoff: 'Kickoff',
    progress: 'Progress',
    safety: 'Safety',
    coordination: 'Coordination',
    owner: 'Owner Meeting',
    design: 'Design Meeting',
    closeout: 'Closeout',
    general: 'General',
  }
  return labels[meetingType] || meetingType
}

// Re-export types for convenience
export type {
  SubcontractorMeeting,
  SubcontractorActionItem,
  MeetingAttachment,
  MeetingSummary,
  MeetingStatus,
  ActionItemStatus,
  ActionItemPriority,
}
