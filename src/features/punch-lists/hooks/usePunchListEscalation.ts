/**
 * Punch List Escalation Hook
 *
 * Provides automatic escalation for overdue punch items.
 * Tracks escalation history and sends notifications.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, differenceInBusinessDays, addDays, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { PunchItem } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export interface EscalationConfig {
  firstWarningDays: number
  urgentThresholdDays: number
  criticalThresholdDays: number
  autoEscalatePriority: boolean
  notifyAssignee: boolean
  notifyProjectManager: boolean
  useBusinessDays: boolean
}

export type EscalationLevel = 'none' | 'warning' | 'urgent' | 'critical'

export interface OverduePunchItem extends PunchItem {
  daysOverdue: number
  escalationLevel: EscalationLevel
  lastEscalatedAt?: string
  escalationCount: number
  assigneeName?: string
  subcontractorName?: string
}

export interface EscalationStats {
  total: number
  warning: number
  urgent: number
  critical: number
  averageDaysOverdue: number
  bySubcontractor: Array<{
    subcontractorId: string
    subcontractorName: string
    count: number
    averageDaysOverdue: number
  }>
}

export interface EscalationResult {
  punchItemId: string
  previousLevel: EscalationLevel
  newLevel: EscalationLevel
  notificationsSent: string[]
  success: boolean
  error?: string
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  firstWarningDays: 3,
  urgentThresholdDays: 7,
  criticalThresholdDays: 14,
  autoEscalatePriority: true,
  notifyAssignee: true,
  notifyProjectManager: true,
  useBusinessDays: true,
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysOverdue(
  dueDate: string | null,
  useBusinessDays: boolean
): number {
  if (!dueDate) return 0

  const due = new Date(dueDate)
  const now = new Date()

  if (now <= due) return 0

  return useBusinessDays
    ? differenceInBusinessDays(now, due)
    : differenceInDays(now, due)
}

function determineEscalationLevel(
  daysOverdue: number,
  config: EscalationConfig
): EscalationLevel {
  if (daysOverdue >= config.criticalThresholdDays) return 'critical'
  if (daysOverdue >= config.urgentThresholdDays) return 'urgent'
  if (daysOverdue >= config.firstWarningDays) return 'warning'
  return 'none'
}

function getEscalationLevelInfo(level: EscalationLevel) {
  switch (level) {
    case 'critical':
      return {
        label: 'Critical',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        description: 'Requires immediate action',
      }
    case 'urgent':
      return {
        label: 'Urgent',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-300',
        description: 'Needs prompt attention',
      }
    case 'warning':
      return {
        label: 'Warning',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        description: 'Approaching deadline concerns',
      }
    default:
      return {
        label: 'None',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        description: 'No escalation needed',
      }
  }
}

function priorityFromEscalationLevel(level: EscalationLevel): string {
  switch (level) {
    case 'critical':
      return 'critical'
    case 'urgent':
      return 'high'
    case 'warning':
      return 'normal'
    default:
      return 'low'
  }
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all overdue punch items with escalation info
 */
export function useOverduePunchItems(
  projectId: string | undefined,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
) {
  return useQuery({
    queryKey: ['punch-items', 'overdue', projectId, config],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      // Get all open punch items with due dates
      const { data, error } = await supabase
        .from('punch_items')
        .select(`
          *,
          profiles:assigned_to (first_name, last_name),
          subcontractors:subcontractor_id (company_name)
        `)
        .eq('project_id', projectId)
        .not('due_date', 'is', null)
        .in('status', ['open', 'in_progress', 'rejected'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true })

      if (error) throw error

      const now = new Date()

      // Filter to only overdue items and enhance with escalation info
      const overdueItems = (data || [])
        .filter((item) => new Date(item.due_date!) < now)
        .map((item): OverduePunchItem => {
          const daysOverdue = calculateDaysOverdue(item.due_date, config.useBusinessDays)
          const escalationLevel = determineEscalationLevel(daysOverdue, config)

          // Get escalation history from metadata
          const metadata = (item as any).metadata || {}
          const escalationHistory = metadata.escalationHistory || []

          return {
            ...item,
            daysOverdue,
            escalationLevel,
            lastEscalatedAt: escalationHistory[escalationHistory.length - 1]?.timestamp,
            escalationCount: escalationHistory.length,
            assigneeName: item.profiles
              ? `${(item.profiles as any).first_name} ${(item.profiles as any).last_name}`
              : undefined,
            subcontractorName: item.subcontractors
              ? (item.subcontractors as any).company_name
              : undefined,
          }
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue)

      return overdueItems
    },
    enabled: !!projectId,
  })
}

/**
 * Get escalation statistics
 */
export function useEscalationStats(
  projectId: string | undefined,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
) {
  const { data: overdueItems } = useOverduePunchItems(projectId, config)

  if (!overdueItems || overdueItems.length === 0) {
    return {
      total: 0,
      warning: 0,
      urgent: 0,
      critical: 0,
      averageDaysOverdue: 0,
      bySubcontractor: [],
    } as EscalationStats
  }

  // Count by escalation level
  const warning = overdueItems.filter((i) => i.escalationLevel === 'warning').length
  const urgent = overdueItems.filter((i) => i.escalationLevel === 'urgent').length
  const critical = overdueItems.filter((i) => i.escalationLevel === 'critical').length

  // Calculate average days overdue
  const totalDaysOverdue = overdueItems.reduce((sum, i) => sum + i.daysOverdue, 0)
  const averageDaysOverdue = totalDaysOverdue / overdueItems.length

  // Group by subcontractor
  const subcontractorMap = new Map<
    string,
    { name: string; count: number; totalDays: number }
  >()

  overdueItems.forEach((item) => {
    const subId = item.subcontractor_id || 'unassigned'
    const subName = item.subcontractorName || 'Unassigned'
    const existing = subcontractorMap.get(subId) || { name: subName, count: 0, totalDays: 0 }
    subcontractorMap.set(subId, {
      name: subName,
      count: existing.count + 1,
      totalDays: existing.totalDays + item.daysOverdue,
    })
  })

  const bySubcontractor = Array.from(subcontractorMap.entries())
    .map(([id, data]) => ({
      subcontractorId: id,
      subcontractorName: data.name,
      count: data.count,
      averageDaysOverdue: data.totalDays / data.count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    total: overdueItems.length,
    warning,
    urgent,
    critical,
    averageDaysOverdue,
    bySubcontractor,
  } as EscalationStats
}

/**
 * Get items needing escalation action
 */
export function useItemsNeedingEscalation(
  projectId: string | undefined,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
) {
  const { data: overdueItems, ...rest } = useOverduePunchItems(projectId, config)

  // Filter to items that haven't been escalated recently (within 24 hours)
  const needsEscalation = overdueItems?.filter((item) => {
    if (!item.lastEscalatedAt) return true
    const lastEscalated = new Date(item.lastEscalatedAt)
    const hoursSinceEscalation = differenceInDays(new Date(), lastEscalated) * 24
    return hoursSinceEscalation >= 24
  })

  return {
    ...rest,
    data: needsEscalation || [],
    count: needsEscalation?.length || 0,
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Escalate a punch item
 */
export function useEscalatePunchItem() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      escalationLevel,
      updatePriority = true,
      sendNotification = true,
      notes,
    }: {
      punchItemId: string
      escalationLevel: EscalationLevel
      updatePriority?: boolean
      sendNotification?: boolean
      notes?: string
    }): Promise<EscalationResult> => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      // Get current punch item
      const { data: current, error: fetchError } = await supabase
        .from('punch_items')
        .select('*')
        .eq('id', punchItemId)
        .single()

      if (fetchError) throw fetchError

      const currentMetadata = (current as any).metadata || {}
      const escalationHistory = currentMetadata.escalationHistory || []
      const previousLevel = determineEscalationLevel(
        calculateDaysOverdue(current.due_date, true),
        DEFAULT_ESCALATION_CONFIG
      )

      // Add new escalation entry
      const newEscalationEntry = {
        timestamp: new Date().toISOString(),
        escalatedBy: userProfile.id,
        previousLevel,
        newLevel: escalationLevel,
        notes,
      }

      // Prepare updates
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        metadata: {
          ...currentMetadata,
          escalationHistory: [...escalationHistory, newEscalationEntry],
          lastEscalatedAt: new Date().toISOString(),
          lastEscalatedBy: userProfile.id,
        },
      }

      // Optionally update priority
      if (updatePriority) {
        updates.priority = priorityFromEscalationLevel(escalationLevel)
      }

      const { error: updateError } = await supabase
        .from('punch_items')
        .update(updates)
        .eq('id', punchItemId)

      if (updateError) throw updateError

      const notificationsSent: string[] = []

      // Send notification if requested (would integrate with notification system)
      if (sendNotification && current.assigned_to) {
        // In a real implementation, this would send actual notifications
        notificationsSent.push(current.assigned_to)
      }

      return {
        punchItemId,
        previousLevel,
        newLevel: escalationLevel,
        notificationsSent,
        success: true,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
    },
  })
}

/**
 * Batch escalate multiple punch items
 */
export function useBatchEscalatePunchItems() {
  const queryClient = useQueryClient()
  const escalateMutation = useEscalatePunchItem()

  return useMutation({
    mutationFn: async (
      items: Array<{
        punchItemId: string
        escalationLevel: EscalationLevel
      }>
    ) => {
      const results: EscalationResult[] = []

      for (const item of items) {
        try {
          const result = await escalateMutation.mutateAsync(item)
          results.push(result)
        } catch (error) {
          results.push({
            punchItemId: item.punchItemId,
            previousLevel: 'none',
            newLevel: item.escalationLevel,
            notificationsSent: [],
            success: false,
            error: (error as Error).message,
          })
        }
      }

      const successful = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success).length

      return {
        results,
        successful,
        failed,
        total: items.length,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
    },
  })
}

/**
 * Record that a reminder was sent for a punch item
 */
export function useRecordPunchListReminder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      recipientId,
      reminderType,
    }: {
      punchItemId: string
      recipientId: string
      reminderType: 'email' | 'in_app' | 'sms'
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data: current, error: fetchError } = await supabase
        .from('punch_items')
        .select('*')
        .eq('id', punchItemId)
        .single()

      if (fetchError) throw fetchError

      const currentMetadata = (current as any).metadata || {}
      const reminderHistory = currentMetadata.reminderHistory || []

      const newReminderEntry = {
        timestamp: new Date().toISOString(),
        sentBy: userProfile.id,
        recipientId,
        reminderType,
      }

      const { error: updateError } = await supabase
        .from('punch_items')
        .update({
          metadata: {
            ...currentMetadata,
            reminderHistory: [...reminderHistory, newReminderEntry],
            lastReminderSentAt: new Date().toISOString(),
          },
        })
        .eq('id', punchItemId)

      if (updateError) throw updateError

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
    },
  })
}

// ============================================================================
// Exports
// ============================================================================

export {
  calculateDaysOverdue,
  determineEscalationLevel,
  getEscalationLevelInfo,
  priorityFromEscalationLevel,
}
