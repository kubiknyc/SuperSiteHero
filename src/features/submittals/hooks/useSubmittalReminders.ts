/**
 * Submittal Reminders Hook
 *
 * Provides automated reminder logic for submittals approaching their submit-by dates.
 * Calculates urgency based on lead time and review cycles.
 */

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, differenceInBusinessDays, addDays, subDays, isPast, isToday, isTomorrow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

// ============================================================================
// Types
// ============================================================================

export interface ReminderConfig {
  /** Days before submit-by date for first reminder */
  firstReminderDays: number
  /** Days before submit-by date for urgent reminder */
  urgentReminderDays: number
  /** Days before submit-by date for critical reminder */
  criticalReminderDays: number
  /** Include weekends in calculations */
  includeWeekends: boolean
}

export interface SubmittalWithReminder {
  id: string
  number: number | null
  title: string
  status: string
  priority: string | null
  submitByDate: Date | null
  requiredOnSite: Date | null
  leadTimeWeeks: number | null
  daysUntilDeadline: number
  reminderLevel: 'none' | 'upcoming' | 'urgent' | 'critical' | 'overdue'
  reminderMessage: string
  lastReminderSent?: string
  projectId: string
  assignees: string[]
}

export interface ReminderStats {
  total: number
  overdue: number
  critical: number
  urgent: number
  upcoming: number
  onTrack: number
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  firstReminderDays: 14,    // 2 weeks before
  urgentReminderDays: 7,    // 1 week before
  criticalReminderDays: 3,  // 3 days before
  includeWeekends: false,   // Use business days
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysUntil(date: Date, includeWeekends: boolean): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (includeWeekends) {
    return differenceInDays(date, today)
  }
  return differenceInBusinessDays(date, today)
}

function getReminderLevel(
  daysUntil: number,
  config: ReminderConfig
): SubmittalWithReminder['reminderLevel'] {
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= config.criticalReminderDays) return 'critical'
  if (daysUntil <= config.urgentReminderDays) return 'urgent'
  if (daysUntil <= config.firstReminderDays) return 'upcoming'
  return 'none'
}

function getReminderMessage(level: SubmittalWithReminder['reminderLevel'], daysUntil: number): string {
  switch (level) {
    case 'overdue':
      return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}! Submit immediately.`
    case 'critical':
      if (daysUntil === 0) return 'Due TODAY! Submit now to avoid delays.'
      if (daysUntil === 1) return 'Due TOMORROW! Prepare for immediate submission.'
      return `Only ${daysUntil} days left! Critical deadline approaching.`
    case 'urgent':
      return `${daysUntil} days until deadline. Review and prepare for submission.`
    case 'upcoming':
      return `${daysUntil} days until deadline. Ensure documentation is ready.`
    default:
      return 'On track'
  }
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch submittals with reminder status
 */
export function useSubmittalsWithReminders(
  projectId: string | undefined,
  workflowTypeId: string | undefined,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG
) {
  return useQuery({
    queryKey: ['submittals', 'reminders', projectId, workflowTypeId],
    queryFn: async () => {
      if (!projectId || !workflowTypeId) {
        throw new Error('Project ID and workflow type ID required')
      }

      // Fetch submittals that are not yet approved/closed
      const { data, error } = await supabase
        .from('workflow_items')
        .select('id, number, title, status, priority, due_date, metadata, assignees, project_id')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .in('status', ['pending', 'submitted', 'under_review', 'revision_required'])
        .is('deleted_at', null)
        .not('due_date', 'is', null) // Only submittals with due dates
        .order('due_date', { ascending: true })

      if (error) throw error

      // Process each submittal to calculate reminder status
      const submittalsWithReminders: SubmittalWithReminder[] = (data || []).map((item) => {
        const submitByDate = item.due_date ? new Date(item.due_date) : null
        const daysUntilDeadline = submitByDate
          ? calculateDaysUntil(submitByDate, config.includeWeekends)
          : 999

        const reminderLevel = submitByDate
          ? getReminderLevel(daysUntilDeadline, config)
          : 'none'

        const reminderMessage = getReminderMessage(reminderLevel, daysUntilDeadline)

        return {
          id: item.id,
          number: item.number,
          title: item.title,
          status: item.status,
          priority: item.priority,
          submitByDate,
          requiredOnSite: (item.metadata as any)?.requiredOnSite
            ? new Date((item.metadata as any).requiredOnSite)
            : null,
          leadTimeWeeks: (item.metadata as any)?.leadTimeWeeks || null,
          daysUntilDeadline,
          reminderLevel,
          reminderMessage,
          lastReminderSent: (item.metadata as any)?.lastReminderSent,
          projectId: item.project_id,
          assignees: item.assignees || [],
        }
      })

      // Filter to only those needing reminders
      return submittalsWithReminders.filter(s => s.reminderLevel !== 'none')
    },
    enabled: !!projectId && !!workflowTypeId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })
}

/**
 * Get reminder statistics for a project
 */
export function useSubmittalReminderStats(
  projectId: string | undefined,
  workflowTypeId: string | undefined
) {
  const { data: submittals } = useSubmittalsWithReminders(projectId, workflowTypeId)

  return useMemo((): ReminderStats => {
    if (!submittals) {
      return { total: 0, overdue: 0, critical: 0, urgent: 0, upcoming: 0, onTrack: 0 }
    }

    return {
      total: submittals.length,
      overdue: submittals.filter(s => s.reminderLevel === 'overdue').length,
      critical: submittals.filter(s => s.reminderLevel === 'critical').length,
      urgent: submittals.filter(s => s.reminderLevel === 'urgent').length,
      upcoming: submittals.filter(s => s.reminderLevel === 'upcoming').length,
      onTrack: submittals.filter(s => s.reminderLevel === 'none').length,
    }
  }, [submittals])
}

/**
 * Fetch all submittals needing reminders across all projects
 */
export function useAllSubmittalReminders(workflowTypeId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['submittals', 'all-reminders', workflowTypeId, userProfile?.id],
    queryFn: async () => {
      if (!workflowTypeId || !userProfile?.id) {
        throw new Error('Workflow type ID and user ID required')
      }

      const config = DEFAULT_REMINDER_CONFIG
      const cutoffDate = addDays(new Date(), config.firstReminderDays)

      // Fetch submittals due within reminder window
      const { data, error } = await supabase
        .from('workflow_items')
        .select('id, number, title, status, priority, due_date, metadata, assignees, project_id')
        .eq('workflow_type_id', workflowTypeId)
        .in('status', ['pending', 'submitted', 'under_review', 'revision_required'])
        .is('deleted_at', null)
        .lte('due_date', cutoffDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true })

      if (error) throw error

      // Process and filter to only those assigned to current user
      const submittalsWithReminders: SubmittalWithReminder[] = (data || [])
        .filter(item => item.assignees?.includes(userProfile.id))
        .map((item) => {
          const submitByDate = item.due_date ? new Date(item.due_date) : null
          const daysUntilDeadline = submitByDate
            ? calculateDaysUntil(submitByDate, config.includeWeekends)
            : 999

          const reminderLevel = submitByDate
            ? getReminderLevel(daysUntilDeadline, config)
            : 'none'

          return {
            id: item.id,
            number: item.number,
            title: item.title,
            status: item.status,
            priority: item.priority,
            submitByDate,
            requiredOnSite: (item.metadata as any)?.requiredOnSite
              ? new Date((item.metadata as any).requiredOnSite)
              : null,
            leadTimeWeeks: (item.metadata as any)?.leadTimeWeeks || null,
            daysUntilDeadline,
            reminderLevel,
            reminderMessage: getReminderMessage(reminderLevel, daysUntilDeadline),
            lastReminderSent: (item.metadata as any)?.lastReminderSent,
            projectId: item.project_id,
            assignees: item.assignees || [],
          }
        })
        .filter(s => s.reminderLevel !== 'none')

      return submittalsWithReminders
    },
    enabled: !!workflowTypeId && !!userProfile?.id,
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Record that a reminder was sent
 */
export function useRecordSubmittalReminder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submittalId,
      reminderType,
      recipients,
    }: {
      submittalId: string
      reminderType: 'email' | 'in_app' | 'both'
      recipients: string[]
    }) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated')
      }

      // Get current metadata
      const { data: submittal, error: fetchError } = await supabase
        .from('workflow_items')
        .select('metadata')
        .eq('id', submittalId)
        .single()

      if (fetchError) throw fetchError

      const now = new Date().toISOString()
      const updatedMetadata = {
        ...(submittal.metadata || {}),
        lastReminderSent: now,
        reminderHistory: [
          ...((submittal.metadata as any)?.reminderHistory || []),
          {
            timestamp: now,
            type: reminderType,
            recipients,
            sentBy: userProfile.id,
          },
        ],
      }

      const { error } = await supabase
        .from('workflow_items')
        .update({ metadata: updatedMetadata })
        .eq('id', submittalId)

      if (error) throw error

      return { submittalId, timestamp: now }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals', 'reminders'] })
      queryClient.invalidateQueries({ queryKey: ['submittals', 'all-reminders'] })
    },
  })
}

/**
 * Snooze reminders for a submittal
 */
export function useSnoozeSubmittalReminder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submittalId,
      snoozeDays,
    }: {
      submittalId: string
      snoozeDays: number
    }) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated')
      }

      const snoozeUntil = addDays(new Date(), snoozeDays).toISOString()

      // Get current metadata
      const { data: submittal, error: fetchError } = await supabase
        .from('workflow_items')
        .select('metadata')
        .eq('id', submittalId)
        .single()

      if (fetchError) throw fetchError

      const updatedMetadata = {
        ...(submittal.metadata || {}),
        reminderSnoozedUntil: snoozeUntil,
        reminderSnoozedBy: userProfile.id,
      }

      const { error } = await supabase
        .from('workflow_items')
        .update({ metadata: updatedMetadata })
        .eq('id', submittalId)

      if (error) throw error

      return { submittalId, snoozeUntil }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals', 'reminders'] })
    },
  })
}

// ============================================================================
// Exports
// ============================================================================

export {
  calculateDaysUntil,
  getReminderLevel,
  getReminderMessage,
}
