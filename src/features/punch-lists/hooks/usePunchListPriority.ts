/**
 * Punch List Priority Management Hook
 *
 * Provides enhanced priority levels for punch items with
 * construction-specific categorization and filtering.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { PunchItem } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export type PunchItemPriority = 'critical' | 'high' | 'normal' | 'low'

export interface PriorityLevel {
  value: PunchItemPriority
  label: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  icon: 'alert-octagon' | 'alert-triangle' | 'circle' | 'minus-circle'
  sortOrder: number
  escalationDays?: number // Days before auto-escalation
}

export interface PunchItemWithPriority extends PunchItem {
  priority: PunchItemPriority
  daysOpen?: number
  isOverdue?: boolean
  shouldEscalate?: boolean
}

export interface PriorityStats {
  total: number
  critical: number
  high: number
  normal: number
  low: number
  overdue: number
}

// ============================================================================
// Constants
// ============================================================================

export const PRIORITY_LEVELS: Record<PunchItemPriority, PriorityLevel> = {
  critical: {
    value: 'critical',
    label: 'Critical',
    description: 'Safety hazard, blocking work, or owner/architect requirement',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: 'alert-octagon',
    sortOrder: 1,
    escalationDays: 1,
  },
  high: {
    value: 'high',
    label: 'High',
    description: 'Affects substantial completion or inspection readiness',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: 'alert-triangle',
    sortOrder: 2,
    escalationDays: 3,
  },
  normal: {
    value: 'normal',
    label: 'Normal',
    description: 'Standard punch item requiring correction',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: 'circle',
    sortOrder: 3,
    escalationDays: 7,
  },
  low: {
    value: 'low',
    label: 'Low',
    description: 'Cosmetic or minor items that can wait',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: 'minus-circle',
    sortOrder: 4,
    escalationDays: 14,
  },
}

export const PRIORITY_OPTIONS = Object.values(PRIORITY_LEVELS).sort(
  (a, b) => a.sortOrder - b.sortOrder
)

// ============================================================================
// Helper Functions
// ============================================================================

export function getPriorityLevel(priority: string | null): PriorityLevel {
  const normalizedPriority = (priority?.toLowerCase() || 'normal') as PunchItemPriority
  return PRIORITY_LEVELS[normalizedPriority] || PRIORITY_LEVELS.normal
}

export function getPriorityColor(priority: string | null): string {
  return getPriorityLevel(priority).color
}

export function getPriorityBgColor(priority: string | null): string {
  return getPriorityLevel(priority).bgColor
}

export function getPriorityLabel(priority: string | null): string {
  return getPriorityLevel(priority).label
}

export function sortByPriority(items: PunchItemWithPriority[]): PunchItemWithPriority[] {
  return [...items].sort((a, b) => {
    const priorityA = getPriorityLevel(a.priority).sortOrder
    const priorityB = getPriorityLevel(b.priority).sortOrder
    return priorityA - priorityB
  })
}

function calculateDaysOpen(createdAt: string | null): number {
  if (!createdAt) {return 0}
  const created = new Date(createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) {return false}
  return new Date(dueDate) < new Date()
}

function shouldEscalatePriority(
  priority: string | null,
  daysOpen: number,
  currentStatus: string | null
): boolean {
  // Don't escalate completed or verified items
  if (currentStatus === 'completed' || currentStatus === 'verified') {
    return false
  }

  const level = getPriorityLevel(priority)
  if (!level.escalationDays) {return false}

  // Already at highest priority
  if (priority === 'critical') {return false}

  // Check if days open exceeds escalation threshold
  return daysOpen >= level.escalationDays
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get punch items with priority information
 */
export function usePunchItemsWithPriority(projectId: string | undefined) {
  return useQuery({
    queryKey: ['punch-items', 'with-priority', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      // Enhance with priority calculations
      return (data || []).map((item): PunchItemWithPriority => {
        const daysOpen = calculateDaysOpen(item.created_at)
        const overdue = isOverdue(item.due_date)
        const escalate = shouldEscalatePriority(item.priority, daysOpen, item.status)

        return {
          ...item,
          priority: (item.priority as PunchItemPriority) || 'normal',
          daysOpen,
          isOverdue: overdue,
          shouldEscalate: escalate,
        }
      })
    },
    enabled: !!projectId,
  })
}

/**
 * Get punch items by priority level
 */
export function usePunchItemsByPriority(
  projectId: string | undefined,
  priority: PunchItemPriority
) {
  return useQuery({
    queryKey: ['punch-items', 'by-priority', projectId, priority],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('priority', priority)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as PunchItem[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get priority statistics for a project
 */
export function usePunchListPriorityStats(projectId: string | undefined) {
  const { data: items } = usePunchItemsWithPriority(projectId)

  const stats: PriorityStats = {
    total: items?.length || 0,
    critical: items?.filter((i) => i.priority === 'critical').length || 0,
    high: items?.filter((i) => i.priority === 'high').length || 0,
    normal: items?.filter((i) => i.priority === 'normal').length || 0,
    low: items?.filter((i) => i.priority === 'low').length || 0,
    overdue: items?.filter((i) => i.isOverdue).length || 0,
  }

  return stats
}

/**
 * Get items that need priority escalation
 */
export function usePunchItemsNeedingEscalation(projectId: string | undefined) {
  const { data: items, ...rest } = usePunchItemsWithPriority(projectId)

  const needsEscalation = items?.filter((item) => item.shouldEscalate) || []

  return {
    ...rest,
    data: needsEscalation,
    count: needsEscalation.length,
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Update punch item priority
 */
export function useUpdatePunchItemPriority() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      punchItemId,
      priority,
      reason,
    }: {
      punchItemId: string
      priority: PunchItemPriority
      reason?: string
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      // Get current item to log the change
      const { data: current, error: fetchError } = await supabase
        .from('punch_items')
        .select('priority, project_id')
        .eq('id', punchItemId)
        .single()

      if (fetchError) {throw fetchError}

      // Update priority
      const { data, error } = await supabase
        .from('punch_items')
        .update({
          priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', punchItemId)
        .select()
        .single()

      if (error) {throw error}

      return {
        punchItem: data,
        previousPriority: current.priority,
        newPriority: priority,
        reason,
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['punch-items'] })
      queryClient.invalidateQueries({ queryKey: ['punch-items', result.punchItem.id] })
      queryClient.invalidateQueries({
        queryKey: ['punch-items', 'with-priority', result.punchItem.project_id],
      })
    },
  })
}

/**
 * Batch update priorities (for escalation)
 */
export function useBatchEscalatePunchItemPriorities() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (
      items: Array<{
        punchItemId: string
        currentPriority: PunchItemPriority
      }>
    ) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      const escalationMap: Record<PunchItemPriority, PunchItemPriority> = {
        low: 'normal',
        normal: 'high',
        high: 'critical',
        critical: 'critical', // Already at highest
      }

      const results = await Promise.allSettled(
        items.map(async ({ punchItemId, currentPriority }) => {
          const newPriority = escalationMap[currentPriority]

          if (newPriority === currentPriority) {
            return { punchItemId, escalated: false, reason: 'Already at highest priority' }
          }

          const { error } = await supabase
            .from('punch_items')
            .update({
              priority: newPriority,
              updated_at: new Date().toISOString(),
            })
            .eq('id', punchItemId)

          if (error) {throw error}

          return {
            punchItemId,
            escalated: true,
            previousPriority: currentPriority,
            newPriority,
          }
        })
      )

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as { escalated: boolean }).escalated
      ).length
      const failed = results.filter((r) => r.status === 'rejected').length

      return { successful, failed, total: items.length }
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
  calculateDaysOpen,
  isOverdue,
  shouldEscalatePriority,
}
