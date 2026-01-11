/**
 * RFI Escalation Hook
 *
 * Provides automatic escalation for overdue RFIs including:
 * - Priority auto-escalation based on aging
 * - Notification triggers for escalated items
 * - Escalation history tracking
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, differenceInBusinessDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { WorkflowItem } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export interface EscalationConfig {
  /** Days overdue before escalating to high priority */
  highPriorityThreshold: number
  /** Days overdue before sending reminder notification */
  reminderThreshold: number
  /** Days overdue before escalating to manager */
  managerEscalationThreshold: number
  /** Use business days instead of calendar days */
  useBusinessDays: boolean
}

export interface EscalationResult {
  rfiId: string
  rfiNumber: number
  title: string
  daysOverdue: number
  previousPriority: string
  newPriority: string
  escalationType: 'priority' | 'reminder' | 'manager'
  escalatedAt: string
}

export interface OverdueRFI extends WorkflowItem {
  daysOverdue: number
  shouldEscalatePriority: boolean
  shouldSendReminder: boolean
  shouldEscalateToManager: boolean
  lastEscalatedAt?: string
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  highPriorityThreshold: 3,      // 3 days overdue -> escalate to high
  reminderThreshold: 1,          // 1 day overdue -> send reminder
  managerEscalationThreshold: 7, // 7 days overdue -> escalate to manager
  useBusinessDays: true,
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysOverdue(dueDate: string, useBusinessDays: boolean): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  if (useBusinessDays) {
    return differenceInBusinessDays(today, due)
  }
  return differenceInDays(today, due)
}

function shouldEscalatePriority(
  rfi: WorkflowItem,
  daysOverdue: number,
  config: EscalationConfig
): boolean {
  // Only escalate if overdue and not already high priority
  if (daysOverdue < config.highPriorityThreshold) {return false}
  if (rfi.priority === 'high') {return false}
  return true
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all overdue RFIs for a project with escalation analysis
 */
export function useOverdueRFIs(
  projectId: string | undefined,
  workflowTypeId: string | undefined,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
) {
  return useQuery({
    queryKey: ['rfis', 'overdue', projectId, workflowTypeId, config],
    queryFn: async () => {
      if (!projectId || !workflowTypeId) {
        throw new Error('Project ID and workflow type ID required')
      }

      // Fetch open RFIs with due dates in the past
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .in('status', ['pending', 'submitted', 'under_review'])
        .lt('due_date', today)
        .is('deleted_at', null)
        .order('due_date', { ascending: true })

      if (error) {throw error}

      // Analyze each RFI for escalation needs
      const overdueRFIs: OverdueRFI[] = (data || []).map((rfi) => {
        const daysOverdue = rfi.due_date
          ? calculateDaysOverdue(rfi.due_date, config.useBusinessDays)
          : 0

        return {
          ...rfi,
          daysOverdue,
          shouldEscalatePriority: shouldEscalatePriority(rfi, daysOverdue, config),
          shouldSendReminder: daysOverdue >= config.reminderThreshold,
          shouldEscalateToManager: daysOverdue >= config.managerEscalationThreshold,
          lastEscalatedAt: rfi.metadata?.lastEscalatedAt as string | undefined,
        }
      })

      return overdueRFIs
    },
    enabled: !!projectId && !!workflowTypeId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })
}

/**
 * Get escalation statistics for a project
 */
export function useEscalationStats(
  projectId: string | undefined,
  workflowTypeId: string | undefined
) {
  const { data: overdueRFIs } = useOverdueRFIs(projectId, workflowTypeId)

  return {
    total: overdueRFIs?.length || 0,
    needsPriorityEscalation: overdueRFIs?.filter(r => r.shouldEscalatePriority).length || 0,
    needsReminder: overdueRFIs?.filter(r => r.shouldSendReminder).length || 0,
    needsManagerEscalation: overdueRFIs?.filter(r => r.shouldEscalateToManager).length || 0,
    averageDaysOverdue: overdueRFIs?.length
      ? Math.round(overdueRFIs.reduce((sum, r) => sum + r.daysOverdue, 0) / overdueRFIs.length)
      : 0,
    criticalCount: overdueRFIs?.filter(r => r.daysOverdue >= 7).length || 0,
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Escalate a single RFI's priority
 */
export function useEscalateRFIPriority() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ rfiId, reason }: { rfiId: string; reason?: string }) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated')
      }

      // Get current RFI
      const { data: rfi, error: fetchError } = await supabase
        .from('workflow_items')
        .select('priority, metadata')
        .eq('id', rfiId)
        .single()

      if (fetchError) {throw fetchError}

      const previousPriority = rfi.priority || 'normal'
      const newPriority = 'high'

      // Update priority and track escalation in metadata
      const updatedMetadata = {
        ...(rfi.metadata || {}),
        lastEscalatedAt: new Date().toISOString(),
        escalationHistory: [
          ...((rfi.metadata?.escalationHistory as any[]) || []),
          {
            timestamp: new Date().toISOString(),
            from: previousPriority,
            to: newPriority,
            reason: reason || 'Automatic escalation due to overdue status',
            escalatedBy: userProfile.id,
          },
        ],
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .update({
          priority: newPriority,
          metadata: updatedMetadata,
        })
        .eq('id', rfiId)
        .select()
        .single()

      if (error) {throw error}

      return {
        rfi: data as WorkflowItem,
        previousPriority,
        newPriority,
      }
    },
    onSuccess: (_, { rfiId }) => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', rfiId] })
      queryClient.invalidateQueries({ queryKey: ['rfis', 'overdue'] })
    },
  })
}

/**
 * Batch escalate multiple RFIs
 */
export function useBatchEscalateRFIs() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (rfiIds: string[]) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated')
      }

      const results: EscalationResult[] = []
      const now = new Date().toISOString()

      for (const rfiId of rfiIds) {
        // Get current RFI
        const { data: rfi, error: fetchError } = await supabase
          .from('workflow_items')
          .select('number, title, priority, due_date, metadata')
          .eq('id', rfiId)
          .single()

        if (fetchError) {continue}

        const daysOverdue = rfi.due_date
          ? calculateDaysOverdue(rfi.due_date, true)
          : 0

        const previousPriority = rfi.priority || 'normal'

        // Skip if already high priority
        if (previousPriority === 'high') {continue}

        const updatedMetadata = {
          ...(rfi.metadata || {}),
          lastEscalatedAt: now,
          escalationHistory: [
            ...((rfi.metadata?.escalationHistory as any[]) || []),
            {
              timestamp: now,
              from: previousPriority,
              to: 'high',
              reason: `Automatic escalation: ${daysOverdue} days overdue`,
              escalatedBy: userProfile.id,
            },
          ],
        }

        const { error } = await supabase
          .from('workflow_items')
          .update({
            priority: 'high',
            metadata: updatedMetadata,
          })
          .eq('id', rfiId)

        if (!error) {
          results.push({
            rfiId,
            rfiNumber: rfi.number || 0,
            title: rfi.title || '',
            daysOverdue,
            previousPriority,
            newPriority: 'high',
            escalationType: 'priority',
            escalatedAt: now,
          })
        }
      }

      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', 'overdue'] })
    },
  })
}

/**
 * Record that a reminder was sent for an RFI
 */
export function useRecordReminderSent() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ rfiId, recipients }: { rfiId: string; recipients: string[] }) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated')
      }

      const { data: rfi, error: fetchError } = await supabase
        .from('workflow_items')
        .select('metadata')
        .eq('id', rfiId)
        .single()

      if (fetchError) {throw fetchError}

      const updatedMetadata = {
        ...(rfi.metadata || {}),
        reminderHistory: [
          ...((rfi.metadata?.reminderHistory as any[]) || []),
          {
            timestamp: new Date().toISOString(),
            recipients,
            sentBy: userProfile.id,
          },
        ],
      }

      const { error } = await supabase
        .from('workflow_items')
        .update({ metadata: updatedMetadata })
        .eq('id', rfiId)

      if (error) {throw error}

      return { rfiId, recipients }
    },
    onSuccess: (_, { rfiId }) => {
      queryClient.invalidateQueries({ queryKey: ['rfis', rfiId] })
    },
  })
}

// ============================================================================
// Export all hooks
// ============================================================================

export {
  calculateDaysOverdue,
  shouldEscalatePriority,
}
