// File: /src/features/checklists/hooks/useChecklistEscalation.ts
// Hook for auto-escalating failed checklist items after submission
// Includes auto-creation of punch items and tasks for failed items

import { useCallback } from 'react'
import { supabaseUntyped as supabase } from '@/lib/supabase'
import { notificationService, type NotificationRecipient } from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import { punchListsApi } from '@/lib/api/services/punch-lists'
import { tasksApi } from '@/lib/api/services/tasks'
import { addDays } from 'date-fns'
import type {
  ChecklistExecution,
  ChecklistResponse,
  ChecklistTemplateItem,
  EscalationItemConfig,
  EscalateOnFail,
} from '@/types/checklists'

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
  // Whether to auto-create punch items/tasks for failed items
  autoCreateItems: boolean
}

const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  minFailedItems: 1,
  sendEmail: true,
  sendInApp: true,
  autoCreateItems: true,
}

interface AutoEscalationResult {
  punchItemsCreated: number
  tasksCreated: number
  createdItems: Array<{
    type: 'punch_item' | 'task'
    id: string
    title: string
    responseId: string
  }>
}

/**
 * Calculate severity level based on failure percentage
 */
function calculateSeverityLevel(failurePercentage: number): SeverityLevel {
  if (failurePercentage >= SEVERITY_THRESHOLDS.critical) {return 'critical'}
  if (failurePercentage >= SEVERITY_THRESHOLDS.high) {return 'high'}
  if (failurePercentage >= SEVERITY_THRESHOLDS.medium) {return 'medium'}
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
      .filter((tm: { user_id: string; role: string; users: unknown }) => tm.users)
      .map((tm: { user_id: string; role: string; users: unknown }) => {
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

    if (error || !data) {return 'Unknown Project'}
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
 * Get template items for an execution
 */
async function getTemplateItems(templateId: string): Promise<Map<string, ChecklistTemplateItem>> {
  try {
    const { data, error } = await supabase
      .from('checklist_template_items')
      .select('*')
      .eq('checklist_template_id', templateId)
      .is('deleted_at', null)

    if (error || !data) {
      logger.error('[Escalation] Failed to fetch template items:', error)
      return new Map()
    }

    return new Map(data.map((item: { id: string }) => [item.id, item as ChecklistTemplateItem]))
  } catch (error) {
    logger.error('[Escalation] Error getting template items:', error)
    return new Map()
  }
}

/**
 * Create punch item from failed checklist item
 */
async function createPunchItemFromFailed(
  execution: ChecklistExecution,
  response: ChecklistResponse,
  templateItem: ChecklistTemplateItem,
  createdBy?: string
): Promise<string | null> {
  try {
    const config = (templateItem.escalation_config || {}) as EscalationItemConfig
    const titlePrefix = config.title_prefix || 'Checklist Failed: '
    const title = `${titlePrefix}${response.item_label}`

    let description = `From checklist: ${execution.name}\n`
    description += `Location: ${execution.location || 'Not specified'}\n`

    if (config.include_notes && response.notes) {
      description += `\nNotes: ${response.notes}`
    }

    const dueDate = config.due_days
      ? addDays(new Date(), config.due_days).toISOString().split('T')[0]
      : undefined

    const punchItem = await punchListsApi.createPunchItem(
      {
        project_id: execution.project_id,
        title,
        description,
        location_notes: execution.location || null,
        trade: config.default_trade || 'General',
        priority: config.priority || 'normal',
        assigned_to: config.auto_assign_to_inspector ? execution.inspector_user_id : null,
        due_date: dueDate || null,
        status: 'open',
        building: null,
        floor: null,
        room: null,
        area: null,
        subcontractor_id: null,
        // Required fields for type compatibility
        number: null,
        created_by: createdBy || null,
        marked_complete_by: null,
        marked_complete_at: null,
        punch_list_id: null,
        completed_date: null,
        deleted_at: null,
        location: null,
        rejection_notes: null,
        verified_at: null,
        verified_by: null,
        verified_date: null,
      },
      { createdById: createdBy }
    )

    // Record the escalation link
    await recordEscalatedItem(
      execution.id,
      response.id,
      templateItem.id,
      'punch_item',
      punchItem.id,
      createdBy
    )

    return punchItem.id
  } catch (error) {
    logger.error('[Escalation] Failed to create punch item:', error)
    return null
  }
}

/**
 * Create task from failed checklist item
 */
async function createTaskFromFailed(
  execution: ChecklistExecution,
  response: ChecklistResponse,
  templateItem: ChecklistTemplateItem,
  createdBy?: string
): Promise<string | null> {
  try {
    const config = (templateItem.escalation_config || {}) as EscalationItemConfig
    const titlePrefix = config.title_prefix || 'Checklist Failed: '
    const title = `${titlePrefix}${response.item_label}`

    let description = `From checklist: ${execution.name}\n`
    description += `Location: ${execution.location || 'Not specified'}\n`

    if (config.include_notes && response.notes) {
      description += `\nNotes: ${response.notes}`
    }

    const dueDate = config.due_days
      ? addDays(new Date(), config.due_days).toISOString().split('T')[0]
      : undefined

    const task = await tasksApi.createTask(
      {
        project_id: execution.project_id,
        title,
        description,
        location: execution.location || null,
        priority: config.priority || 'normal',
        assigned_to_type: config.auto_assign_to_inspector ? 'user' : null,
        assigned_to_user_id: config.auto_assign_to_inspector ? execution.inspector_user_id : null,
        due_date: dueDate || null,
        status: 'pending',
        related_to_type: 'checklist',
        related_to_id: execution.id,
        // Required fields for type compatibility
        created_by: createdBy || null,
        assigned_to_subcontractor_id: null,
        parent_task_id: null,
        deleted_at: null,
        completed_date: null,
        start_date: null,
      },
      { createdById: createdBy }
    )

    // Record the escalation link
    await recordEscalatedItem(
      execution.id,
      response.id,
      templateItem.id,
      'task',
      task.id,
      createdBy
    )

    return task.id
  } catch (error) {
    logger.error('[Escalation] Failed to create task:', error)
    return null
  }
}

/**
 * Record an escalated item in the database
 */
async function recordEscalatedItem(
  checklistId: string,
  responseId: string,
  templateItemId: string,
  escalatedToType: 'punch_item' | 'task',
  escalatedToId: string,
  createdBy?: string
): Promise<void> {
  try {
    await supabase.from('checklist_escalated_items').insert({
      checklist_id: checklistId,
      checklist_response_id: responseId,
      checklist_template_item_id: templateItemId,
      escalated_to_type: escalatedToType,
      escalated_to_id: escalatedToId,
      created_by: createdBy,
    })
  } catch (error) {
    // Non-critical error, just log
    logger.warn('[Escalation] Failed to record escalated item:', error)
  }
}

/**
 * Auto-create punch items and tasks for failed items
 */
async function autoCreateItemsForFailedResponses(
  execution: ChecklistExecution,
  responses: ChecklistResponse[],
  templateItems: Map<string, ChecklistTemplateItem>,
  createdBy?: string
): Promise<AutoEscalationResult> {
  const result: AutoEscalationResult = {
    punchItemsCreated: 0,
    tasksCreated: 0,
    createdItems: [],
  }

  // Get failed responses
  const failedResponses = responses.filter((r) => r.score_value === 'fail')

  for (const response of failedResponses) {
    const templateItem = response.checklist_template_item_id
      ? templateItems.get(response.checklist_template_item_id)
      : undefined

    if (!templateItem) {continue}

    const escalateOnFail = templateItem.escalate_on_fail as EscalateOnFail

    if (!escalateOnFail || escalateOnFail === 'none') {continue}

    if (escalateOnFail === 'punch_item') {
      const punchItemId = await createPunchItemFromFailed(
        execution,
        response,
        templateItem,
        createdBy
      )
      if (punchItemId) {
        result.punchItemsCreated++
        result.createdItems.push({
          type: 'punch_item',
          id: punchItemId,
          title: response.item_label,
          responseId: response.id,
        })
      }
    } else if (escalateOnFail === 'task') {
      const taskId = await createTaskFromFailed(
        execution,
        response,
        templateItem,
        createdBy
      )
      if (taskId) {
        result.tasksCreated++
        result.createdItems.push({
          type: 'task',
          id: taskId,
          title: response.item_label,
          responseId: response.id,
        })
      }
    }
  }

  return result
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
    config: Partial<EscalationConfig> = {},
    createdBy?: string
  ): Promise<{
    triggered: boolean
    recipientCount: number
    severity: SeverityLevel
    autoCreated: AutoEscalationResult
  }> => {
    const mergedConfig = { ...DEFAULT_ESCALATION_CONFIG, ...config }
    const autoCreated: AutoEscalationResult = {
      punchItemsCreated: 0,
      tasksCreated: 0,
      createdItems: [],
    }

    // Check if escalation should be triggered
    const failedCount = execution.score_fail
    const totalCount = execution.score_total

    if (failedCount < mergedConfig.minFailedItems) {
      logger.info('[Escalation] No escalation needed - below threshold')
      return { triggered: false, recipientCount: 0, severity: 'low', autoCreated }
    }

    // Calculate severity
    const failurePercentage = totalCount > 0 ? (failedCount / totalCount) * 100 : 0
    const severity = calculateSeverityLevel(failurePercentage)

    // Auto-create punch items/tasks if enabled
    if (mergedConfig.autoCreateItems && execution.checklist_template_id) {
      const templateItems = await getTemplateItems(execution.checklist_template_id)
      const created = await autoCreateItemsForFailedResponses(
        execution,
        responses,
        templateItems,
        createdBy
      )
      Object.assign(autoCreated, created)

      if (created.punchItemsCreated > 0 || created.tasksCreated > 0) {
        logger.info(
          `[Escalation] Auto-created ${created.punchItemsCreated} punch item(s) and ${created.tasksCreated} task(s)`
        )
      }
    }

    // Get recipients
    const recipients = mergedConfig.customRecipients?.length
      ? await getCustomRecipients(mergedConfig.customRecipients)
      : await getEscalationRecipients(execution.project_id)

    if (recipients.length === 0) {
      logger.warn('[Escalation] No recipients found for escalation')
      return { triggered: false, recipientCount: 0, severity, autoCreated }
    }

    // Get project name
    const projectName = await getProjectName(execution.project_id)

    // Get failed items details
    const failedItems = getFailedItems(responses)

    // Build the app URL for viewing the checklist
    const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
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

      return { triggered: true, recipientCount: recipients.length, severity, autoCreated }
    } catch (error) {
      logger.error('[Escalation] Failed to send notifications:', error)
      return { triggered: false, recipientCount: 0, severity, autoCreated }
    }
  }, [])

  /**
   * Auto-escalate a single failed item (for real-time escalation during form fill)
   */
  const escalateSingleItem = useCallback(async (
    execution: ChecklistExecution,
    response: ChecklistResponse,
    templateItem: ChecklistTemplateItem,
    createdBy?: string
  ): Promise<{ created: boolean; type?: 'punch_item' | 'task'; id?: string }> => {
    const escalateOnFail = templateItem.escalate_on_fail as EscalateOnFail

    if (!escalateOnFail || escalateOnFail === 'none') {
      return { created: false }
    }

    if (escalateOnFail === 'punch_item') {
      const punchItemId = await createPunchItemFromFailed(
        execution,
        response,
        templateItem,
        createdBy
      )
      return punchItemId
        ? { created: true, type: 'punch_item', id: punchItemId }
        : { created: false }
    }

    if (escalateOnFail === 'task') {
      const taskId = await createTaskFromFailed(
        execution,
        response,
        templateItem,
        createdBy
      )
      return taskId
        ? { created: true, type: 'task', id: taskId }
        : { created: false }
    }

    return { created: false }
  }, [])

  return {
    triggerEscalation,
    escalateSingleItem,
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

    if (error || !users) {return []}

    return users.map((user: { id: string; email: string; first_name?: string; last_name?: string }) => ({
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
export type { SeverityLevel, EscalationConfig, AutoEscalationResult }
