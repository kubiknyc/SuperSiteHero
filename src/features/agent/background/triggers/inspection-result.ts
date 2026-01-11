/**
 * Inspection Result Trigger
 * Process inspection results: generate follow-up tasks for failures, update compliance tracking
 */

import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/api/services/ai-provider'
import { logger } from '@/lib/utils/logger'
import { taskService } from '../../services/task-service'
import { registerTaskHandler } from '../processor'
import type { AgentTask, TaskContext, TaskResult, TaskHandler } from '../../types/tasks'

// ============================================================================
// Types
// ============================================================================

interface InspectionResultInput {
  inspection_id: string
  auto_generate_tasks?: boolean
  update_compliance?: boolean
  notify_stakeholders?: boolean
}

interface InspectionDetails {
  id: string
  inspection_number: string
  inspection_type: string
  result: 'pass' | 'fail' | 'conditional' | 'pending'
  project_id: string
  location: string | null
  inspector_name: string | null
  inspection_date: string
  notes: string | null
  items: InspectionItem[]
}

interface InspectionItem {
  id: string
  description: string
  result: 'pass' | 'fail' | 'not_applicable'
  notes: string | null
  photo_urls: string[]
}

interface FollowUpTask {
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  due_date: string
  category: 'reinspection' | 'corrective_action' | 'documentation' | 'coordination'
  related_item_id: string | null
  assignee_suggestion: string | null
}

interface ComplianceUpdate {
  compliance_status: 'compliant' | 'non_compliant' | 'pending' | 'conditional'
  items_passed: number
  items_failed: number
  items_na: number
  critical_failures: string[]
  required_actions: string[]
  next_inspection_date: string | null
}

interface InspectionProcessingOutput {
  inspection_id: string
  inspection_type: string
  overall_result: string
  follow_up_tasks: FollowUpTask[]
  compliance_update: ComplianceUpdate
  notification_sent: boolean
  processing_summary: string
}

// ============================================================================
// Prompts
// ============================================================================

const FOLLOW_UP_PROMPT = `You are a construction quality control expert analyzing inspection results. Generate follow-up tasks for failed items.

For each failed inspection item, create appropriate follow-up tasks:
- Corrective actions needed
- Reinspection scheduling
- Documentation requirements
- Coordination needs

Respond with JSON array:
[{
  "title": "Clear task title",
  "description": "Detailed description of what needs to be done",
  "priority": "urgent|high|medium|low",
  "due_date": "ISO date (reasonable timeframe based on severity)",
  "category": "reinspection|corrective_action|documentation|coordination",
  "related_item_id": "ID of the failed item or null",
  "assignee_suggestion": "Suggested role or null"
}]

Priority guidelines:
- urgent: Safety issues, code violations, critical path items
- high: Quality defects that must be fixed before next phase
- medium: Minor defects, documentation gaps
- low: Nice-to-have improvements, optional items`

const COMPLIANCE_PROMPT = `Analyze this inspection and provide a compliance assessment.

Respond with JSON:
{
  "compliance_status": "compliant|non_compliant|pending|conditional",
  "items_passed": number,
  "items_failed": number,
  "items_na": number,
  "critical_failures": ["List of critical/safety-related failures"],
  "required_actions": ["Actions required before compliance can be achieved"],
  "next_inspection_date": "ISO date suggestion or null"
}`

// ============================================================================
// Task Handler
// ============================================================================

const inspectionResultHandler: TaskHandler<InspectionResultInput, InspectionProcessingOutput> = {
  taskType: 'report_extract_actions', // Reusing an existing task type for inspection processing
  displayName: 'Process Inspection Result',
  description: 'Generate follow-up tasks for failures and update compliance tracking',

  async execute(
    task: AgentTask,
    context: TaskContext
  ): Promise<TaskResult<InspectionProcessingOutput>> {
    const input = task.input_data as InspectionResultInput
    let totalTokens = 0

    try {
      // Fetch inspection details
      const inspection = await fetchInspectionDetails(input.inspection_id)

      if (!inspection) {
        return {
          success: false,
          error: `Inspection not found: ${input.inspection_id}`,
          errorCode: 'INSPECTION_NOT_FOUND',
          shouldRetry: false,
        }
      }

      let followUpTasks: FollowUpTask[] = []
      let complianceUpdate: ComplianceUpdate = {
        compliance_status: 'pending',
        items_passed: 0,
        items_failed: 0,
        items_na: 0,
        critical_failures: [],
        required_actions: [],
        next_inspection_date: null,
      }
      let notificationSent = false

      // Calculate basic metrics
      const passedItems = inspection.items.filter((i) => i.result === 'pass')
      const failedItems = inspection.items.filter((i) => i.result === 'fail')
      const naItems = inspection.items.filter((i) => i.result === 'not_applicable')

      // Step 1: Generate follow-up tasks for failures
      if (input.auto_generate_tasks !== false && failedItems.length > 0) {
        const tasksResult = await generateFollowUpTasks(inspection, failedItems)
        followUpTasks = tasksResult.tasks
        totalTokens += tasksResult.tokens

        // Create actual tasks in the system
        for (const followUp of followUpTasks) {
          await createFollowUpTask(inspection.project_id, followUp, task, input.inspection_id)
        }
      }

      // Step 2: Update compliance status
      if (input.update_compliance !== false) {
        const complianceResult = await assessCompliance(inspection, failedItems)
        complianceUpdate = {
          ...complianceResult.assessment,
          items_passed: passedItems.length,
          items_failed: failedItems.length,
          items_na: naItems.length,
        }
        totalTokens += complianceResult.tokens

        // Update inspection record
        await updateInspectionCompliance(input.inspection_id, complianceUpdate)
      }

      // Step 3: Send notifications
      if (input.notify_stakeholders !== false) {
        notificationSent = await sendInspectionNotifications(
          task,
          inspection,
          followUpTasks,
          complianceUpdate
        )
      }

      // Log action
      await logInspectionProcessing(context, input.inspection_id, {
        tasks_created: followUpTasks.length,
        compliance_status: complianceUpdate.compliance_status,
        notifications_sent: notificationSent,
      })

      return {
        success: true,
        data: {
          inspection_id: input.inspection_id,
          inspection_type: inspection.inspection_type,
          overall_result: inspection.result,
          follow_up_tasks: followUpTasks,
          compliance_update: complianceUpdate,
          notification_sent: notificationSent,
          processing_summary: buildProcessingSummary(inspection, followUpTasks, complianceUpdate),
        },
        metadata: {
          tokensUsed: totalTokens,
          costCents: Math.ceil(totalTokens * 0.00001 * 100),
        },
      }
    } catch (error) {
      logger.error('[InspectionResult] Processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        errorCode: 'PROCESSING_ERROR',
        shouldRetry: true,
      }
    }
  },

  validate(input: InspectionResultInput) {
    if (!input.inspection_id) {
      return {
        valid: false,
        errors: [{ field: 'inspection_id', message: 'Inspection ID is required' }],
      }
    }
    return { valid: true }
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchInspectionDetails(inspectionId: string): Promise<InspectionDetails | null> {
  // Try inspections table first
  const { data: inspection, error } = await supabase
    .from('inspections')
    .select(`
      id,
      inspection_number,
      inspection_type,
      result,
      project_id,
      location,
      inspector_name,
      inspection_date,
      notes
    `)
    .eq('id', inspectionId)
    .single()

  if (error || !inspection) {
    logger.warn('[InspectionResult] Inspection not found:', inspectionId)
    return null
  }

  // Fetch inspection items/checklist results
  const { data: items } = await supabase
    .from('inspection_items')
    .select(`
      id,
      description,
      result,
      notes,
      photo_urls
    `)
    .eq('inspection_id', inspectionId)

  return {
    ...inspection,
    items: (items || []).map((item) => ({
      ...item,
      photo_urls: item.photo_urls || [],
    })),
  } as InspectionDetails
}

async function generateFollowUpTasks(
  inspection: InspectionDetails,
  failedItems: InspectionItem[]
): Promise<{ tasks: FollowUpTask[]; tokens: number }> {
  const prompt = `Generate follow-up tasks for this failed inspection:

Inspection: ${inspection.inspection_number}
Type: ${inspection.inspection_type}
Date: ${inspection.inspection_date}
Location: ${inspection.location || 'Not specified'}
Inspector: ${inspection.inspector_name || 'Not specified'}

Failed Items:
${failedItems.map((item, i) => `
${i + 1}. [ID: ${item.id}]
   Description: ${item.description}
   Notes: ${item.notes || 'None'}
   Has Photos: ${item.photo_urls.length > 0 ? 'Yes' : 'No'}
`).join('\n')}

Inspector Notes: ${inspection.notes || 'None'}

Generate appropriate follow-up tasks for each failure.`

  try {
    const result = await aiService.extractJSON<FollowUpTask[]>(
      'inspection_follow_up',
      prompt,
      {
        systemPrompt: FOLLOW_UP_PROMPT,
        temperature: 0.3,
        maxTokens: 2000,
      }
    )

    return {
      tasks: Array.isArray(result.data) ? result.data : [],
      tokens: result.tokens.total,
    }
  } catch {
    // Generate basic tasks without AI
    return {
      tasks: failedItems.map((item) => ({
        title: `Correct: ${item.description.slice(0, 50)}`,
        description: `Follow-up required for failed inspection item: ${item.description}. ${item.notes || ''}`,
        priority: 'high' as const,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'corrective_action' as const,
        related_item_id: item.id,
        assignee_suggestion: null,
      })),
      tokens: 0,
    }
  }
}

async function assessCompliance(
  inspection: InspectionDetails,
  failedItems: InspectionItem[]
): Promise<{ assessment: Omit<ComplianceUpdate, 'items_passed' | 'items_failed' | 'items_na'>; tokens: number }> {
  const prompt = `Assess compliance status for this inspection:

Inspection Type: ${inspection.inspection_type}
Overall Result: ${inspection.result}
Total Items: ${inspection.items.length}
Failed Items: ${failedItems.length}

Failed Item Details:
${failedItems.map((item) => `- ${item.description}: ${item.notes || 'No notes'}`).join('\n')}

Inspector Notes: ${inspection.notes || 'None'}

Provide a compliance assessment.`

  try {
    const result = await aiService.extractJSON<Omit<ComplianceUpdate, 'items_passed' | 'items_failed' | 'items_na'>>(
      'compliance_assessment',
      prompt,
      {
        systemPrompt: COMPLIANCE_PROMPT,
        temperature: 0.2,
        maxTokens: 1000,
      }
    )

    return {
      assessment: result.data,
      tokens: result.tokens.total,
    }
  } catch {
    // Provide basic assessment without AI
    const hasCriticalFailures = failedItems.length > 0
    return {
      assessment: {
        compliance_status: hasCriticalFailures ? 'non_compliant' : 'compliant',
        critical_failures: failedItems.slice(0, 3).map((i) => i.description),
        required_actions: hasCriticalFailures ? ['Address all failed items', 'Schedule reinspection'] : [],
        next_inspection_date: hasCriticalFailures
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null,
      },
      tokens: 0,
    }
  }
}

async function createFollowUpTask(
  projectId: string,
  followUp: FollowUpTask,
  parentTask: AgentTask,
  inspectionId: string
): Promise<void> {
  try {
    await supabase.from('tasks').insert({
      project_id: projectId,
      title: followUp.title,
      description: followUp.description,
      priority: followUp.priority === 'urgent' ? 'high' : followUp.priority,
      due_date: followUp.due_date,
      status: 'pending',
      category: followUp.category,
      related_entity_type: 'inspection',
      related_entity_id: inspectionId,
      created_by: parentTask.created_by,
      is_agent_generated: true,
    })

    logger.debug('[InspectionResult] Created follow-up task:', followUp.title.slice(0, 50))
  } catch (error) {
    logger.warn('[InspectionResult] Could not create follow-up task:', error)
  }
}

async function updateInspectionCompliance(
  inspectionId: string,
  compliance: ComplianceUpdate
): Promise<void> {
  try {
    await supabase
      .from('inspections')
      .update({
        compliance_status: compliance.compliance_status,
        agent_compliance_assessment: compliance,
        agent_processed_at: new Date().toISOString(),
      })
      .eq('id', inspectionId)
  } catch (error) {
    logger.warn('[InspectionResult] Could not update compliance:', error)
  }
}

async function sendInspectionNotifications(
  task: AgentTask,
  inspection: InspectionDetails,
  followUpTasks: FollowUpTask[],
  compliance: ComplianceUpdate
): Promise<boolean> {
  try {
    // Get relevant users to notify
    const { data: projectUsers } = await supabase
      .from('project_users')
      .select('user_id, role')
      .eq('project_id', inspection.project_id)
      .in('role', ['project_manager', 'superintendent', 'quality_manager', 'admin'])

    if (!projectUsers || projectUsers.length === 0) {return false}

    const isFailure = inspection.result === 'fail' || compliance.compliance_status === 'non_compliant'
    const urgentTasks = followUpTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high')

    let title: string
    let message: string
    let notificationType: string

    if (isFailure) {
      title = `Inspection ${inspection.inspection_number} FAILED`
      message = `${inspection.inspection_type} inspection at ${inspection.location || 'site'} failed with ${compliance.items_failed} item(s). ${urgentTasks.length} follow-up task(s) created.`
      notificationType = compliance.critical_failures.length > 0 ? 'critical' : 'warning'
    } else {
      title = `Inspection ${inspection.inspection_number} Complete`
      message = `${inspection.inspection_type} inspection passed. ${compliance.items_passed}/${inspection.items.length} items passed.`
      notificationType = 'success'
    }

    for (const user of projectUsers) {
      await supabase.from('notifications').insert({
        user_id: user.user_id,
        company_id: task.company_id,
        title,
        message,
        type: notificationType,
        entity_type: 'inspection',
        entity_id: inspection.id,
        is_agent_generated: true,
        agent_task_id: task.id,
      })
    }

    return true
  } catch (error) {
    logger.warn('[InspectionResult] Could not send notifications:', error)
    return false
  }
}

function buildProcessingSummary(
  inspection: InspectionDetails,
  followUpTasks: FollowUpTask[],
  compliance: ComplianceUpdate
): string {
  const parts: string[] = [
    `${inspection.inspection_type} inspection: ${inspection.result.toUpperCase()}`,
    `Compliance: ${compliance.compliance_status}`,
    `Items: ${compliance.items_passed}/${inspection.items.length} passed`,
  ]

  if (followUpTasks.length > 0) {
    const urgent = followUpTasks.filter((t) => t.priority === 'urgent').length
    parts.push(`Follow-up tasks: ${followUpTasks.length} (${urgent} urgent)`)
  }

  if (compliance.next_inspection_date) {
    parts.push(`Next inspection: ${compliance.next_inspection_date}`)
  }

  return parts.join('. ')
}

async function logInspectionProcessing(
  context: TaskContext,
  inspectionId: string,
  summary: { tasks_created: number; compliance_status: string; notifications_sent: boolean }
): Promise<void> {
  try {
    await supabase.from('agent_actions').insert({
      company_id: context.companyId,
      action_type: 'tool_call',
      tool_name: 'process_inspection',
      target_entity_type: 'inspection',
      target_entity_id: inspectionId,
      input_summary: `Process inspection ${inspectionId}`,
      output_summary: `Tasks: ${summary.tasks_created}, Status: ${summary.compliance_status}, Notified: ${summary.notifications_sent}`,
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.warn('[InspectionResult] Could not log action:', error)
  }
}

// ============================================================================
// Subscribe to Inspection Results
// ============================================================================

/**
 * Set up realtime subscription for inspection result updates
 */
export function subscribeToInspectionResults(companyId: string): () => void {
  const channel = supabase
    .channel(`inspection-results-${companyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'inspections',
      },
      async (payload) => {
        const inspection = payload.new as {
          id: string
          project_id: string
          result: string
          inspection_number: string
        }
        const oldInspection = payload.old as { result: string }

        // Only trigger when result changes to pass, fail, or conditional
        if (
          ['pass', 'fail', 'conditional'].includes(inspection.result) &&
          oldInspection.result !== inspection.result
        ) {
          logger.info('[InspectionResult] Inspection result updated:', inspection.inspection_number)

          try {
            await taskService.create({
              task_type: 'report_extract_actions', // Reusing for inspection processing
              project_id: inspection.project_id,
              input_data: {
                inspection_id: inspection.id,
                auto_generate_tasks: true,
                update_compliance: true,
                notify_stakeholders: true,
              },
              target_entity_type: 'inspection',
              target_entity_id: inspection.id,
              priority: inspection.result === 'fail' ? 60 : 90, // Higher priority for failures
            })
          } catch (error) {
            logger.error('[InspectionResult] Failed to create task:', error)
          }
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================================================
// Register Handler
// ============================================================================

registerTaskHandler(inspectionResultHandler)

// ============================================================================
// Exports
// ============================================================================

export { inspectionResultHandler }
export type { InspectionResultInput, InspectionProcessingOutput }
