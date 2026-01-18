/**
 * Summarize Daily Report Tool
 * Generate an AI summary of a daily field report
 */

import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/api/services/ai-provider'
import { createTool } from '../registry'
import type { ToolContext, ToolResult, JSONSchema } from '../../types/tools'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface SummarizeDailyReportInput {
  report_id: string
  include_recommendations?: boolean
}

interface SummarizeDailyReportOutput {
  report_id: string
  report_date: string
  summary: string
  executive_summary: string // Owner-ready brief summary
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  next_day_actions: string[] // Critical items for tomorrow
  metrics: {
    workers_on_site: number
    hours_worked: number
    safety_incidents: number
    weather_impact: string
    overall_progress?: string // e.g., "On Schedule", "1 Day Behind"
    percent_complete_change?: number // Change in % complete today
  }
  critical_path_impact?: {
    affected_activities: string[]
    impact_description: string
    mitigation_needed: boolean
  }
}

// ============================================================================
// Tool Definition
// ============================================================================

const parameters: JSONSchema = {
  type: 'object',
  properties: {
    report_id: {
      type: 'string',
      description: 'UUID of the daily report to summarize',
    },
    include_recommendations: {
      type: 'boolean',
      description: 'Include AI recommendations for next steps',
      default: true,
    },
  },
  required: ['report_id'],
}

async function execute(
  input: SummarizeDailyReportInput,
  context: ToolContext
): Promise<ToolResult<SummarizeDailyReportOutput>> {
  const startTime = Date.now()
  const includeRecommendations = input.include_recommendations !== false

  try {
    // Fetch daily report with related data
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
        created_at
      `)
      .eq('id', input.report_id)
      .single()

    if (fetchError || !report) {
      return {
        success: false,
        error: `Daily report not found: ${input.report_id}`,
        errorCode: 'REPORT_NOT_FOUND',
      }
    }

    // Fetch labor entries for this report
    const { data: laborEntries } = await supabase
      .from('daily_report_labor')
      .select('trade, headcount, hours_worked')
      .eq('daily_report_id', input.report_id)

    // Fetch equipment entries
    const { data: equipmentEntries } = await supabase
      .from('daily_report_equipment')
      .select('equipment_name, hours_used, status')
      .eq('daily_report_id', input.report_id)

    // Build summarization prompt
    const prompt = buildSummarizationPrompt(report, laborEntries || [], equipmentEntries || [], includeRecommendations)

    // Call AI service
    const result = await aiService.extractJSON<SummaryResult>(
      'daily_report_summary',
      prompt,
      {
        systemPrompt: SUMMARIZATION_SYSTEM_PROMPT,
        temperature: 0.4,
        maxTokens: 1500,
      }
    )

    const summaryData = result.data

    // Calculate metrics
    const totalWorkers = report.total_workers || laborEntries?.reduce((sum, l) => sum + (l.headcount || 0), 0) || 0
    const totalHours = laborEntries?.reduce((sum, l) => sum + (l.hours_worked || 0), 0) || 0

    // Update report with AI summary
    await supabase
      .from('daily_reports')
      .update({
        agent_summary: summaryData.summary,
        agent_summary_generated_at: new Date().toISOString(),
        agent_action_items: summaryData.action_items || [],
      })
      .eq('id', input.report_id)

    // Log action
    await logAction(context, input, summaryData)

    return {
      success: true,
      data: {
        report_id: input.report_id,
        report_date: report.report_date,
        summary: summaryData.summary,
        executive_summary: summaryData.executive_summary || summaryData.summary.split('.')[0] + '.',
        highlights: summaryData.highlights,
        concerns: summaryData.concerns,
        recommendations: includeRecommendations ? summaryData.recommendations : [],
        next_day_actions: summaryData.next_day_actions || summaryData.action_items || [],
        metrics: {
          workers_on_site: totalWorkers,
          hours_worked: totalHours,
          safety_incidents: summaryData.safety_incidents_count || 0,
          weather_impact: summaryData.weather_impact || 'none',
          overall_progress: summaryData.overall_progress,
          percent_complete_change: summaryData.percent_complete_change,
        },
        critical_path_impact: summaryData.critical_path_impact,
      },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        tokensUsed: result.tokens.total,
      },
    }
  } catch (error) {
    logger.error('[SummarizeDailyReport] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Summarization failed',
      errorCode: 'SUMMARIZATION_ERROR',
      metadata: {
        executionTimeMs: Date.now() - startTime,
      },
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface SummaryResult {
  summary: string
  executive_summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
  action_items?: string[]
  next_day_actions: string[]
  safety_incidents_count?: number
  weather_impact?: string
  overall_progress?: string
  percent_complete_change?: number
  critical_path_impact?: {
    affected_activities: string[]
    impact_description: string
    mitigation_needed: boolean
  }
}

const SUMMARIZATION_SYSTEM_PROMPT = `You are an expert construction daily report analyst with deep knowledge of field operations. Your job is to summarize daily field reports for superintendents, project managers, and owners.

You must respond with valid JSON matching this schema:
{
  "summary": "string - 2-3 sentence detailed summary for the superintendent",
  "executive_summary": "string - 1 sentence high-level summary suitable for owner reporting",
  "highlights": ["array of key accomplishments and progress"],
  "concerns": ["array of issues, delays, or problems to watch"],
  "recommendations": ["array of suggested next steps or actions"],
  "action_items": ["specific tasks that need follow-up"],
  "next_day_actions": ["critical items that MUST happen tomorrow"],
  "safety_incidents_count": number,
  "weather_impact": "none | minor | moderate | significant",
  "overall_progress": "Ahead of Schedule | On Schedule | 1-2 Days Behind | Significantly Behind",
  "percent_complete_change": number (e.g., 0.5 for 0.5% progress today),
  "critical_path_impact": {
    "affected_activities": ["activities on critical path affected"],
    "impact_description": "brief description of schedule impact",
    "mitigation_needed": boolean
  }
}

Guidelines:
- **Executive Summary**: Write as if for an owner's monthly report - professional, brief, positive where warranted
- **Highlights**: Focus on tangible progress (quantities installed, milestones reached)
- **Concerns**: Prioritize by impact - schedule-affecting issues first, then cost, then quality
- **Recommendations**: Be specific and actionable - who needs to do what
- **Next Day Actions**: Only items that are genuinely critical for tomorrow
- **Weather Impact**: Consider trade-specific impacts (concrete, roofing, painting sensitive)
- **Critical Path**: Identify if any delays affect the project end date
- **Safety First**: Any safety incident or near-miss should be flagged prominently
- **Coordination**: Note any trade stacking issues or coordination problems
- **Documentation**: Flag if delays need to be documented for potential claims
- Use construction industry terminology appropriately
- Reference CSI divisions when relevant for trade work`

function buildSummarizationPrompt(
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
    total_workers: number | null
  },
  laborEntries: Array<{ trade: string | null; headcount: number | null; hours_worked: number | null }>,
  equipmentEntries: Array<{ equipment_name: string | null; hours_used: number | null; status: string | null }>,
  includeRecommendations: boolean
): string {
  const reportDate = new Date(report.report_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let prompt = `Summarize this construction daily report:

Date: ${reportDate}

Weather: ${report.weather_conditions || 'Not recorded'}
${report.temperature_high ? `High: ${report.temperature_high}°F` : ''}
${report.temperature_low ? `Low: ${report.temperature_low}°F` : ''}

${report.summary ? `Summary: ${report.summary}` : ''}

Work Performed:
${report.work_performed || 'No work details recorded'}

${report.delays ? `Delays:\n${report.delays}` : ''}

${report.issues ? `Issues:\n${report.issues}` : ''}

${report.notes ? `Notes:\n${report.notes}` : ''}`

  if (laborEntries.length > 0) {
    prompt += `\n\nLabor:
${laborEntries.map((l) => `- ${l.trade || 'Unknown'}: ${l.headcount || 0} workers, ${l.hours_worked || 0} hours`).join('\n')}`
  }

  if (equipmentEntries.length > 0) {
    prompt += `\n\nEquipment:
${equipmentEntries.map((e) => `- ${e.equipment_name || 'Unknown'}: ${e.hours_used || 0} hours (${e.status || 'Unknown status'})`).join('\n')}`
  }

  prompt += `\n\nProvide a summary with highlights, concerns, and ${includeRecommendations ? 'recommendations' : 'no recommendations needed'}.`

  return prompt
}

async function logAction(
  context: ToolContext,
  input: SummarizeDailyReportInput,
  output: SummaryResult
): Promise<void> {
  try {
    await supabase.from('agent_actions').insert({
      company_id: context.companyId,
      session_id: context.sessionId,
      message_id: context.messageId,
      action_type: 'tool_call',
      tool_name: 'summarize_daily_report',
      target_entity_type: 'daily_report',
      target_entity_id: input.report_id,
      input_summary: `Summarize daily report ${input.report_id}`,
      output_summary: `Generated summary with ${output.highlights.length} highlights and ${output.concerns.length} concerns`,
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[SummarizeDailyReport] Error logging action:', error)
  }
}

// ============================================================================
// Register Tool
// ============================================================================

export const summarizeDailyReportTool = createTool({
  name: 'summarize_daily_report',
  displayName: 'Summarize Daily Report',
  description:
    'Generate an AI summary of a daily field report including highlights, concerns, metrics, and recommendations',
  category: 'report',
  parameters,
  requiresConfirmation: false,
  estimatedTokens: 800,
  execute,
  formatOutput: (output: SummarizeDailyReportOutput) => ({
    title: `Daily Report Summary - ${new Date(output.report_date).toLocaleDateString()}`,
    summary: output.executive_summary,
    icon: 'FileText',
    status: output.critical_path_impact?.mitigation_needed
      ? 'error'
      : output.concerns.length === 0
        ? 'success'
        : output.concerns.length <= 2
          ? 'warning'
          : 'info',
    details: [
      { label: 'Workers', value: output.metrics.workers_on_site, type: 'text' },
      { label: 'Hours', value: output.metrics.hours_worked, type: 'text' },
      { label: 'Weather Impact', value: output.metrics.weather_impact, type: 'badge' },
      ...(output.metrics.overall_progress
        ? [{ label: 'Schedule', value: output.metrics.overall_progress, type: 'badge' as const }]
        : []),
      ...(output.metrics.percent_complete_change !== undefined
        ? [{ label: 'Progress Today', value: `+${output.metrics.percent_complete_change}%`, type: 'text' as const }]
        : []),
      ...(output.metrics.safety_incidents > 0
        ? [{ label: 'Safety Incidents', value: output.metrics.safety_incidents, type: 'badge' as const }]
        : []),
      ...(output.critical_path_impact?.mitigation_needed
        ? [{ label: 'Critical Path', value: 'IMPACTED', type: 'badge' as const }]
        : []),
    ],
    expandedContent: {
      executive_summary: output.executive_summary,
      full_summary: output.summary,
      highlights: output.highlights,
      concerns: output.concerns,
      recommendations: output.recommendations,
      next_day_actions: output.next_day_actions,
      critical_path_impact: output.critical_path_impact,
    },
  }),
})
