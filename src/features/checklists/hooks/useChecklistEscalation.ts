// File: /src/features/checklists/hooks/useChecklistEscalation.ts
// Hook for auto-escalating failed checklist items after submission

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { notificationService, type NotificationRecipient } from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import type { ChecklistExecution, ChecklistResponse } from '@/types/checklists'

// Severity thresholds based on failure percentage
const SEVERITY_THRESHOLDS = {
  critical: 50, // >= 50% failure rate
  high: 30, // >= 30% failure rate
  medium: 15, // >= 15% failure rate
  low: 0, // any failures
}

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

interface EscalationConfig {
  // Minimum number of failed items to trigger escalation
  minFailedItems: number
  // Whether to send email notifications
  sendEmail: boolean
  // Whether to send in-app notifications
  sendInApp: boolean
  // Custom recipients (if empty, uses project managers)
  customRecipients?: string[]
}

const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  minFailedItems: 1,
  sendEmail: true,
  sendInApp: true,
}

/**
 * Calculate severity level based on failure percentage
 */
function calculateSeverityLevel(failurePercentage: number): SeverityLevel {
  if (failurePercentage >= SEVERITY_THRESHOLDS.critical) return 'critical'
  if (failurePercentage >= SEVERITY_THRESHOLDS.high) return 'high'
  if (failurePercentage >= SEVERITY_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/**
 * Get project managers and site supervisors for a project
 */
async function getEscalationRecipients(projectId: string): Promise<NotificationRecipient[]> {
  try {
    // Get project team members with PM or supervisor roles
    const { data: teamMembers, error } = await supabase
      .from('project_team_members')
      .select(`
        user_id,
        role,
        users!inner (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .in('role', ['project_manager', 'site_supervisor', 'superintendent', 'owner'])

    if (error || !teamMembers) {
      logger.error('[Escalation] Failed to fetch team members:', error)
      return []
    }

    return teamMembers
      .filter((tm) => tm.users)
      .map((tm) => {
        const user = tm.users as unknown as { id: string; email: string; first_name?: string; last_name?: string }
        return {
          userId: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
        }
      })
  } catch (error) {
    logger.error('[Escalation] Error getting recipients:', error)
    return []
  }
}

/**
 * Get project name for the notification
 */
async function getProjectName(projectId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    if (error || !data) return 'Unknown Project'
    return data.name
  } catch {
    return 'Unknown Project'
  }
}

/**
 * Extract failed items from responses
 */
function getFailedItems(responses: ChecklistResponse[]): Array<{
  label: string
  section?: string
  notes?: string
}> {
  return responses
    .filter((r) => r.score_value === 'fail')
    .map((r) => ({
      label: r.item_label,
      section: undefined, // Would need to join with template items to get section
      notes: r.notes || undefined,
    }))
}

/**
 * Hook for triggering checklist escalation after submission
 */
export function useChecklistEscalation() {
  /**
   * Trigger escalation for a submitted checklist with failed items
   */
  const triggerEscalation = useCallback(async (
    execution: ChecklistExecution,
    responses: ChecklistResponse[],
    config: Partial<EscalationConfig> = {}
  ): Promise<{ triggered: boolean; recipientCount: number; severity: SeverityLevel }> => {
    const mergedConfig = { ...DEFAULT_ESCALATION_CONFIG, ...config }

    // Check if escalation should be triggered
    const failedCount = execution.score_fail
    const totalCount = execution.score_total

    if (failedCount < mergedConfig.minFailedItems) {
      logger.info('[Escalation] No escalation needed - below threshold')
      return { triggered: false, recipientCount: 0, severity: 'low' }
    }

    // Calculate severity
    const failurePercentage = totalCount > 0 ? (failedCount / totalCount) * 100 : 0
    const severity = calculateSeverityLevel(failurePercentage)

    // Get recipients
    const recipients = mergedConfig.customRecipients?.length
      ? await getCustomRecipients(mergedConfig.customRecipients)
      : await getEscalationRecipients(execution.project_id)

    if (recipients.length === 0) {
      logger.warn('[Escalation] No recipients found for escalation')
      return { triggered: false, recipientCount: 0, severity }
    }

    // Get project name
    const projectName = await getProjectName(execution.project_id)

    // Get failed items details
    const failedItems = getFailedItems(responses)

    // Build the app URL for viewing the checklist
    const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'
    const viewUrl = `${appUrl}/checklists/executions/${execution.id}`

    // Send escalation notifications
    try {
      await notificationService.notifyChecklistFailedItems(
        recipients,
        {
          checklistName: execution.name,
          projectName,
          location: execution.location || undefined,
          inspectorName: execution.inspector_name || 'Unknown Inspector',
          submittedAt: new Date(execution.submitted_at || execution.updated_at).toLocaleString(),
          failedCount,
          totalCount,
          failurePercentage,
          failedItems,
          viewUrl,
          severityLevel: severity,
        },
        {
          sendEmail: mergedConfig.sendEmail,
          sendInApp: mergedConfig.sendInApp,
        }
      )

      logger.info(`[Escalation] Sent escalation to ${recipients.length} recipient(s) for checklist ${execution.id}`)

      // Record the escalation in the database (optional - for audit trail)
      await recordEscalation(execution.id, recipients, severity)

      return { triggered: true, recipientCount: recipients.length, severity }
    } catch (error) {
      logger.error('[Escalation] Failed to send notifications:', error)
      return { triggered: false, recipientCount: 0, severity }
    }
  }, [])

  return {
    triggerEscalation,
    calculateSeverityLevel,
  }
}

/**
 * Helper to get custom recipients by user IDs
 */
async function getCustomRecipients(userIds: string[]): Promise<NotificationRecipient[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', userIds)

    if (error || !users) return []

    return users.map((user) => ({
      userId: user.id,
      email: user.email,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
    }))
  } catch {
    return []
  }
}

/**
 * Record escalation for audit trail
 */
async function recordEscalation(
  executionId: string,
  recipients: NotificationRecipient[],
  severity: SeverityLevel
): Promise<void> {
  try {
    // This would insert into a checklist_escalations table if it exists
    // For now, we'll just log it
    logger.info('[Escalation] Recorded escalation:', {
      executionId,
      recipientCount: recipients.length,
      severity,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Non-critical, just log
    logger.warn('[Escalation] Failed to record escalation:', error)
  }
}

/**
 * Export severity thresholds for configuration UI
 */
export { SEVERITY_THRESHOLDS }
export type { SeverityLevel, EscalationConfig }
