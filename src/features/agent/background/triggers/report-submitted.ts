/**
 * Report Submitted Trigger
 * Process daily report submissions: extract action items, flag issues, summarize
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

interface ReportSubmittedInput {
  report_id: string
  auto_summarize?: boolean
  extract_action_items?: boolean
  flag_issues?: boolean
}

interface ReportSummary {
  executive_summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  weather_impact: 'none' | 'minor' | 'moderate' | 'significant'
}

interface ActionItem {
  description: string
  priority: 'high' | 'medium' | 'low'
  assignee_suggestion: string | null
  due_date_suggestion: string | null
  source_text: string
  confidence: number
}

interface FlaggedIssue {
  issue_type: 'safety' | 'quality' | 'schedule' | 'resource' | 'weather' | 'coordination'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  recommended_action: string
  source_text: string
}

interface ReportMetrics {
  workers_on_site: number
  total_hours: number
  trade_breakdown: Array<{ trade: string; count: number; hours: number }>
  equipment_utilized: string[]
  safety_incidents: number
}

interface ReportProcessingOutput {
  report_id: string
  report_date: string
  summary: ReportSummary | null
  action_items: ActionItem[]
  flagged_issues: FlaggedIssue[]
  metrics: ReportMetrics
  processing_summary: string
}

// ============================================================================
// Prompts
// ============================================================================

const SUMMARIZATION_PROMPT = `You are an expert construction project manager reviewing a daily field report. Provide a clear, actionable summary.

Focus on:
- Key accomplishments and progress
- Issues that need attention
- Weather or site conditions affecting work
- Safety observations
- Coordination items

Respond with JSON:
{
  "executive_summary": "2-3 sentence overview for leadership",
  "highlights": ["Key accomplishments and positive progress"],
  "concerns": ["Issues, delays, or problems requiring attention"],
  "recommendations": ["Suggested actions for tomorrow/next steps"],
  "weather_impact": "none|minor|moderate|significant"
}`

const ACTION_ITEMS_PROMPT = `Extract actionable items from this daily report that require follow-up.

Look for:
- Explicit action items mentioned
- Issues that imply needed actions
- Coordination needs between trades
- Material or equipment requests
- Safety items needing attention

Respond with JSON array:
[{
  "description": "Clear action item description",
  "priority": "high|medium|low",
  "assignee_suggestion": "Who should handle this or null",
  "due_date_suggestion": "ISO date or null",
  "source_text": "The relevant text from the report",
  "confidence": 0-100
}]`

const ISSUE_FLAGGING_PROMPT = `Analyze this daily report for issues that should be flagged for management attention.

Issue types to look for:
- safety: Any safety concerns, near-misses, incidents
- quality: Quality issues, rework, defects
- schedule: Delays, schedule impacts, critical path items
- resource: Labor or equipment shortages
- weather: Weather-related impacts
- coordination: Coordination issues between trades

Respond with JSON array:
[{
  "issue_type": "safety|quality|schedule|resource|weather|coordination",
  "severity": "critical|high|medium|low",
  "description": "Clear description of the issue",
  "recommended_action": "What should be done",
  "source_text": "The relevant text from the report"
}]`

// ============================================================================
// Task Handler
// ============================================================================

const reportSubmittedHandler: TaskHandler<ReportSubmittedInput, ReportProcessingOutput> = {
  taskType: 'report_summarize',
  displayName: 'Process Daily Report',
  description: 'Summarize daily report, extract action items, and flag issues',

  async execute(
    task: AgentTask,
    context: TaskContext
  ): Promise<TaskResult<ReportProcessingOutput>> {
    const input = task.input_data as ReportSubmittedInput
    let totalTokens = 0

    try {
      // Fetch report with related data
      const { data: report, error: fetchError } = await supabase
        .from('daily_reports')
        .select(`
          id,
          report_date,
          summary,
          work_performed,
          weather_conditions,
          temperature_high,
          temperature_low,
          delays,
          issues,
          notes,
          total_workers,
          project_id,
          created_by
        `)
        .eq('id', input.report_id)
        .single()

      if (fetchError || !report) {
        return {
          success: false,
          error: `Daily report not found: ${input.report_id}`,
          errorCode: 'REPORT_NOT_FOUND',
          shouldRetry: false,
        }
      }

      // Fetch labor entries
      const { data: laborEntries } = await supabase
        .from('daily_report_labor')
        .select('trade, headcount, hours_worked')
        .eq('daily_report_id', input.report_id)

      // Fetch equipment entries
      const { data: equipmentEntries } = await supabase
        .from('daily_report_equipment')
        .select('equipment_name, hours_used, status')
        .eq('daily_report_id', input.report_id)

      // Compute metrics
      const metrics = computeMetrics(report, laborEntries || [], equipmentEntries || [])

      let summary: ReportSummary | null = null
      let actionItems: ActionItem[] = []
      let flaggedIssues: FlaggedIssue[] = []

      const reportContent = buildReportContent(report, laborEntries || [], equipmentEntries || [])

      // Step 1: Generate summary
      if (input.auto_summarize !== false) {
        const summaryResult = await generateSummary(reportContent, metrics)
        summary = summaryResult.summary
        totalTokens += summaryResult.tokens

        // Update report with summary
        await supabase
          .from('daily_reports')
          .update({
            agent_summary: summary.executive_summary,
            agent_summary_generated_at: new Date().toISOString(),
          })
          .eq('id', input.report_id)
      }

      // Step 2: Extract action items
      if (input.extract_action_items !== false) {
        const actionsResult = await extractActionItems(reportContent)
        actionItems = actionsResult.items
        totalTokens += actionsResult.tokens

        // Update report with action items
        if (actionItems.length > 0) {
          await supabase
            .from('daily_reports')
            .update({
              agent_action_items: actionItems,
            })
            .eq('id', input.report_id)

          // Create actual tasks for high-priority items
          for (const item of actionItems.filter((a) => a.priority === 'high' && a.confidence >= 70)) {
            await createTaskFromActionItem(report.project_id, item, task)
          }
        }
      }

      // Step 3: Flag issues
      if (input.flag_issues !== false) {
        const issuesResult = await flagIssues(reportContent)
        flaggedIssues = issuesResult.issues
        totalTokens += issuesResult.tokens

        // Send notifications for critical/high issues
        await notifyAboutIssues(task, report, flaggedIssues)
      }

      // Log action
      await logReportProcessing(context, input.report_id, {
        summarized: !!summary,
        action_items_count: actionItems.length,
        flagged_issues_count: flaggedIssues.length,
      })

      return {
        success: true,
        data: {
          report_id: input.report_id,
          report_date: report.report_date,
          summary,
          action_items: actionItems,
          flagged_issues: flaggedIssues,
          metrics,
          processing_summary: buildProcessingSummary(summary, actionItems, flaggedIssues),
        },
        metadata: {
          tokensUsed: totalTokens,
          costCents: Math.ceil(totalTokens * 0.00001 * 100),
        },
      }
    } catch (error) {
      logger.error('[ReportSubmitted] Processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        errorCode: 'PROCESSING_ERROR',
        shouldRetry: true,
      }
    }
  },

  validate(input: ReportSubmittedInput) {
    if (!input.report_id) {
      return {
        valid: false,
        errors: [{ field: 'report_id', message: 'Report ID is required' }],
      }
    }
    return { valid: true }
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

function computeMetrics(
  report: { total_workers: number | null },
  laborEntries: Array<{ trade: string | null; headcount: number | null; hours_worked: number | null }>,
  equipmentEntries: Array<{ equipment_name: string | null; hours_used: number | null; status: string | null }>
): ReportMetrics {
  const tradeBreakdown = laborEntries.map((l) => ({
    trade: l.trade || 'Unknown',
    count: l.headcount || 0,
    hours: l.hours_worked || 0,
  }))

  const totalWorkers = report.total_workers || tradeBreakdown.reduce((sum, t) => sum + t.count, 0)
  const totalHours = tradeBreakdown.reduce((sum, t) => sum + t.hours, 0)
  const equipmentList = equipmentEntries
    .filter((e) => e.status !== 'down')
    .map((e) => e.equipment_name || 'Unknown')

  return {
    workers_on_site: totalWorkers,
    total_hours: totalHours,
    trade_breakdown: tradeBreakdown,
    equipment_utilized: equipmentList,
    safety_incidents: 0, // Would need to check safety_incidents table
  }
}

function buildReportContent(
  report: {
    report_date: string
    summary: string | null
    work_performed: string | null
    weather_conditions: string | null
    temperature_high: number | null
    temperature_low: number | null
    delays: string | null
    issues: string | null
    notes: string | null
  },
  laborEntries: Array<{ trade: string | null; headcount: number | null; hours_worked: number | null }>,
  equipmentEntries: Array<{ equipment_name: string | null; hours_used: number | null; status: string | null }>
): string {
  const date = new Date(report.report_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let content = `DAILY FIELD REPORT - ${date}\n\n`

  content += `WEATHER: ${report.weather_conditions || 'Not recorded'}\n`
  if (report.temperature_high) {content += `High: ${report.temperature_high}F `}
  if (report.temperature_low) {content += `Low: ${report.temperature_low}F`}
  content += '\n\n'

  if (report.summary) {
    content += `SUMMARY:\n${report.summary}\n\n`
  }

  if (report.work_performed) {
    content += `WORK PERFORMED:\n${report.work_performed}\n\n`
  }

  if (laborEntries.length > 0) {
    content += `LABOR:\n`
    for (const l of laborEntries) {
      content += `- ${l.trade || 'Unknown'}: ${l.headcount || 0} workers, ${l.hours_worked || 0} hours\n`
    }
    content += '\n'
  }

  if (equipmentEntries.length > 0) {
    content += `EQUIPMENT:\n`
    for (const e of equipmentEntries) {
      content += `- ${e.equipment_name || 'Unknown'}: ${e.hours_used || 0} hours (${e.status || 'active'})\n`
    }
    content += '\n'
  }

  if (report.delays) {
    content += `DELAYS:\n${report.delays}\n\n`
  }

  if (report.issues) {
    content += `ISSUES:\n${report.issues}\n\n`
  }

  if (report.notes) {
    content += `NOTES:\n${report.notes}\n\n`
  }

  return content
}

async function generateSummary(
  reportContent: string,
  metrics: ReportMetrics
): Promise<{ summary: ReportSummary; tokens: number }> {
  const prompt = `Summarize this daily field report:

${reportContent}

Metrics:
- Workers on site: ${metrics.workers_on_site}
- Total hours: ${metrics.total_hours}
- Equipment: ${metrics.equipment_utilized.length} pieces`

  const result = await aiService.extractJSON<ReportSummary>(
    'daily_report_summary',
    prompt,
    {
      systemPrompt: SUMMARIZATION_PROMPT,
      temperature: 0.4,
      maxTokens: 1500,
    }
  )

  return {
    summary: result.data,
    tokens: result.tokens.total,
  }
}

async function extractActionItems(
  reportContent: string
): Promise<{ items: ActionItem[]; tokens: number }> {
  const prompt = `Extract action items from this daily report:\n\n${reportContent}`

  try {
    const result = await aiService.extractJSON<ActionItem[]>(
      'action_items_extraction',
      prompt,
      {
        systemPrompt: ACTION_ITEMS_PROMPT,
        temperature: 0.3,
        maxTokens: 1500,
      }
    )

    return {
      items: Array.isArray(result.data) ? result.data : [],
      tokens: result.tokens.total,
    }
  } catch {
    return { items: [], tokens: 0 }
  }
}

async function flagIssues(
  reportContent: string
): Promise<{ issues: FlaggedIssue[]; tokens: number }> {
  const prompt = `Analyze this daily report for issues requiring attention:\n\n${reportContent}`

  try {
    const result = await aiService.extractJSON<FlaggedIssue[]>(
      'issue_flagging',
      prompt,
      {
        systemPrompt: ISSUE_FLAGGING_PROMPT,
        temperature: 0.3,
        maxTokens: 1500,
      }
    )

    return {
      issues: Array.isArray(result.data) ? result.data : [],
      tokens: result.tokens.total,
    }
  } catch {
    return { issues: [], tokens: 0 }
  }
}

async function createTaskFromActionItem(
  projectId: string,
  item: ActionItem,
  parentTask: AgentTask
): Promise<void> {
  try {
    // Create a task in the project tasks table
    await supabase.from('tasks').insert({
      project_id: projectId,
      title: item.description,
      description: `Extracted from daily report: ${item.source_text}`,
      priority: item.priority,
      due_date: item.due_date_suggestion,
      status: 'pending',
      created_by: parentTask.created_by,
      is_agent_generated: true,
    })

    logger.info('[ReportSubmitted] Created task from action item:', item.description.slice(0, 50))
  } catch (error) {
    logger.warn('[ReportSubmitted] Could not create task:', error)
  }
}

async function notifyAboutIssues(
  task: AgentTask,
  report: { report_date: string; project_id: string },
  issues: FlaggedIssue[]
): Promise<void> {
  const criticalIssues = issues.filter((i) => i.severity === 'critical' || i.severity === 'high')
  if (criticalIssues.length === 0) {return}

  try {
    // Get project managers
    const { data: managers } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('project_id', report.project_id)
      .in('role', ['project_manager', 'superintendent', 'admin'])

    if (!managers || managers.length === 0) {return}

    const date = new Date(report.report_date).toLocaleDateString()
    const issueList = criticalIssues
      .slice(0, 3)
      .map((i) => `- [${i.severity.toUpperCase()}] ${i.issue_type}: ${i.description}`)
      .join('\n')

    for (const manager of managers) {
      await supabase.from('notifications').insert({
        user_id: manager.user_id,
        company_id: task.company_id,
        title: `Daily Report ${date} - Issues Flagged`,
        message: `${criticalIssues.length} issue(s) require attention:\n${issueList}`,
        type: criticalIssues.some((i) => i.severity === 'critical') ? 'critical' : 'warning',
        entity_type: 'daily_report',
        entity_id: task.target_entity_id,
        is_agent_generated: true,
        agent_task_id: task.id,
      })
    }
  } catch (error) {
    logger.warn('[ReportSubmitted] Could not send issue notifications:', error)
  }
}

function buildProcessingSummary(
  summary: ReportSummary | null,
  actionItems: ActionItem[],
  flaggedIssues: FlaggedIssue[]
): string {
  const parts: string[] = []

  if (summary) {
    parts.push(`Summary: ${summary.weather_impact} weather impact, ${summary.concerns.length} concern(s)`)
  }

  if (actionItems.length > 0) {
    const highPriority = actionItems.filter((a) => a.priority === 'high').length
    parts.push(`Action items: ${actionItems.length} (${highPriority} high priority)`)
  }

  if (flaggedIssues.length > 0) {
    const critical = flaggedIssues.filter((i) => i.severity === 'critical').length
    parts.push(`Issues: ${flaggedIssues.length} (${critical} critical)`)
  }

  return parts.join('. ') || 'No significant findings'
}

async function logReportProcessing(
  context: TaskContext,
  reportId: string,
  summary: { summarized: boolean; action_items_count: number; flagged_issues_count: number }
): Promise<void> {
  try {
    await supabase.from('agent_actions').insert({
      company_id: context.companyId,
      action_type: 'tool_call',
      tool_name: 'process_daily_report',
      target_entity_type: 'daily_report',
      target_entity_id: reportId,
      input_summary: `Process daily report ${reportId}`,
      output_summary: `Summarized: ${summary.summarized}, Actions: ${summary.action_items_count}, Issues: ${summary.flagged_issues_count}`,
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.warn('[ReportSubmitted] Could not log action:', error)
  }
}

// ============================================================================
// Subscribe to Report Submissions
// ============================================================================

/**
 * Set up realtime subscription for daily report submissions
 */
export function subscribeToReportSubmissions(companyId: string): () => void {
  const channel = supabase
    .channel(`report-submissions-${companyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'daily_reports',
      },
      async (payload) => {
        const report = payload.new as {
          id: string
          project_id: string
          status: string
          report_date: string
        }
        const oldReport = payload.old as { status: string }

        // Only trigger on status change to 'submitted' or 'approved'
        if (
          (report.status === 'submitted' || report.status === 'approved') &&
          oldReport.status !== report.status
        ) {
          logger.info('[ReportSubmitted] Report submitted:', report.id)

          try {
            await taskService.create({
              task_type: 'report_summarize',
              project_id: report.project_id,
              input_data: {
                report_id: report.id,
                auto_summarize: true,
                extract_action_items: true,
                flag_issues: true,
              },
              target_entity_type: 'daily_report',
              target_entity_id: report.id,
              priority: 70,
            })
          } catch (error) {
            logger.error('[ReportSubmitted] Failed to create task:', error)
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

registerTaskHandler(reportSubmittedHandler)

// ============================================================================
// Exports
// ============================================================================

export { reportSubmittedHandler }
export type { ReportSubmittedInput, ReportProcessingOutput }
