/**
 * Smart Summaries Service
 * AI-generated summaries for daily reports, meetings, weekly status, and change orders
 */

import { supabase } from '@/lib/supabase'
import { aiService } from './ai-provider'
import type {
  AISummary,
  AISummaryType,
  AIExtractedActionItem,
  GenerateSummaryDTO,
  DailyReportSummaryResponse,
  MeetingActionItemsResponse,
  WeeklyStatusResponse,
  SummaryMetrics,
  TrendIndicator,
} from '@/types/ai'

// System prompts for different summary types
const SYSTEM_PROMPTS = {
  daily_report: `You are an expert construction project coordinator analyzing daily reports.
Extract key information and provide a concise executive summary.
Focus on: accomplishments, issues/concerns, and priorities for tomorrow.
Be factual and specific, mentioning quantities and details where available.`,

  meeting_minutes: `You are an expert meeting analyst for construction projects.
Extract action items from meeting notes with assignees and due dates when mentioned.
Also identify key decisions made and topics for follow-up.
Be specific about who is responsible for what.`,

  weekly_status: `You are a construction project manager creating weekly status reports.
Summarize the week's progress, challenges, and upcoming priorities.
Include relevant metrics and identify trends.
Write in a professional tone suitable for stakeholder communication.`,

  change_order_impact: `You are a construction cost analyst.
Analyze change orders and summarize their cumulative impact on cost and schedule.
Identify patterns and provide insights on change order trends.`,
}

export const smartSummariesApi = {
  /**
   * Generate or retrieve a daily report summary
   */
  async generateDailyReportSummary(
    reportId: string,
    forceRegenerate = false
  ): Promise<DailyReportSummaryResponse> {
    // Check for existing summary
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('ai_summaries')
        .select('*')
        .eq('source_type', 'daily_report')
        .eq('source_id', reportId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        return this.formatDailyReportResponse(existing)
      }
    }

    // Fetch the daily report
    const { data: report, error: reportError } = await supabase
      .from('daily_reports')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      throw new Error('Daily report not found')
    }

    // Build prompt
    const prompt = `Analyze this daily construction report and provide a summary:

Project: ${report.project?.name || 'Unknown'}
Date: ${report.report_date}
Weather: ${report.weather_conditions || 'Not recorded'}

Work Completed:
${report.work_completed || 'No work recorded'}

Materials Used:
${report.materials_used || 'None recorded'}

Equipment Used:
${report.equipment_used || 'None recorded'}

Safety Observations:
${report.safety_observations || 'None recorded'}

Issues/Delays:
${report.issues_delays || 'None recorded'}

Provide a JSON response with:
{
  "executiveSummary": "2-3 sentence summary of the day",
  "highlights": ["accomplishment1", "accomplishment2", ...],
  "concerns": ["concern1", "concern2", ...],
  "tomorrowFocus": ["priority1", "priority2", ...],
  "metrics": {
    "workersOnSite": number or null,
    "hoursWorked": number or null,
    "safetyIncidents": number or null
  }
}`

    interface DailyReportAIResult {
      executiveSummary: string
      highlights: string[]
      concerns: string[]
      tomorrowFocus: string[]
      metrics: {
        workersOnSite?: number
        hoursWorked?: number
        safetyIncidents?: number
      }
    }

    const { data: aiResult, tokens } = await aiService.extractJSON<DailyReportAIResult>(
      'daily_report_summary',
      prompt,
      { systemPrompt: SYSTEM_PROMPTS.daily_report }
    )

    // Save summary
    const { data: summary, error } = await supabase
      .from('ai_summaries')
      .insert({
        project_id: report.project_id,
        summary_type: 'daily_report' as AISummaryType,
        source_type: 'daily_report',
        source_id: reportId,
        summary_content: aiResult.executiveSummary,
        key_points: [...aiResult.highlights, ...aiResult.concerns],
        metrics: aiResult.metrics,
        tokens_used: tokens.total,
        model_used: 'ai',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single()

    if (error) throw error

    return {
      summary,
      highlights: aiResult.highlights,
      concerns: aiResult.concerns,
      tomorrowFocus: aiResult.tomorrowFocus,
    }
  },

  /**
   * Extract action items from meeting notes
   */
  async extractMeetingActionItems(
    meetingId: string,
    forceRegenerate = false
  ): Promise<MeetingActionItemsResponse> {
    // Check for existing
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('ai_summaries')
        .select('*, action_items:ai_extracted_action_items(*)')
        .eq('source_type', 'meeting')
        .eq('source_id', meetingId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        return this.formatMeetingResponse(existing)
      }
    }

    // Fetch meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      throw new Error('Meeting not found')
    }

    const prompt = `Analyze these meeting notes and extract action items:

Meeting: ${meeting.title}
Project: ${meeting.project?.name || 'Unknown'}
Date: ${meeting.meeting_date}
Attendees: ${meeting.attendees?.join(', ') || 'Not recorded'}

Notes:
${meeting.notes || 'No notes recorded'}

Provide a JSON response:
{
  "summary": "Brief meeting summary",
  "actionItems": [
    {
      "description": "What needs to be done",
      "assignee": "Person responsible (if mentioned)",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "high|medium|low",
      "sourceText": "Quote from notes where this was discussed"
    }
  ],
  "decisions": ["Decision 1", "Decision 2"],
  "nextMeetingTopics": ["Topic 1", "Topic 2"]
}`

    interface MeetingAIResult {
      summary: string
      actionItems: Array<{
        description: string
        assignee?: string
        dueDate?: string
        priority: 'high' | 'medium' | 'low'
        sourceText?: string
      }>
      decisions: string[]
      nextMeetingTopics: string[]
    }

    const { data: aiResult, tokens } = await aiService.extractJSON<MeetingAIResult>(
      'meeting_action_items',
      prompt,
      { systemPrompt: SYSTEM_PROMPTS.meeting_minutes }
    )

    // Save summary
    const { data: summary, error } = await supabase
      .from('ai_summaries')
      .insert({
        project_id: meeting.project_id,
        summary_type: 'meeting_minutes' as AISummaryType,
        source_type: 'meeting',
        source_id: meetingId,
        summary_content: aiResult.summary,
        key_points: aiResult.decisions,
        metrics: {
          attendeeCount: meeting.attendees?.length || 0,
          actionItemCount: aiResult.actionItems.length,
          decisionsCount: aiResult.decisions.length,
        },
        tokens_used: tokens.total,
        model_used: 'ai',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single()

    if (error) throw error

    // Save action items
    const actionItemsToInsert = aiResult.actionItems.map((item, index) => ({
      summary_id: summary.id,
      action_description: item.description,
      assignee_name: item.assignee,
      due_date: item.dueDate,
      priority: item.priority,
      source_text: item.sourceText,
      confidence: 0.8 - index * 0.05, // Decrease confidence for later items
      status: 'extracted' as const,
    }))

    const { data: actionItems } = await supabase
      .from('ai_extracted_action_items')
      .insert(actionItemsToInsert)
      .select()

    return {
      summary,
      actionItems: actionItems || [],
      decisions: aiResult.decisions,
      nextMeetingTopics: aiResult.nextMeetingTopics,
    }
  },

  /**
   * Generate weekly status summary
   */
  async generateWeeklyStatus(
    projectId: string,
    weekOf: string,
    forceRegenerate = false
  ): Promise<WeeklyStatusResponse> {
    // Check for existing
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from('ai_summaries')
        .select('*')
        .eq('project_id', projectId)
        .eq('summary_type', 'weekly_status')
        .gte('generated_at', weekOf)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        return this.formatWeeklyStatusResponse(existing)
      }
    }

    // Fetch project and weekly data
    const { data: project } = await supabase
      .from('projects')
      .select('name, status')
      .eq('id', projectId)
      .single()

    const weekStart = new Date(weekOf)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Get daily reports for the week
    const { data: dailyReports } = await supabase
      .from('daily_reports')
      .select('report_date, work_completed, issues_delays, weather_conditions')
      .eq('project_id', projectId)
      .gte('report_date', weekOf)
      .lt('report_date', weekEnd.toISOString().split('T')[0])
      .order('report_date')

    // Get RFIs
    const { data: rfis } = await supabase
      .from('rfis')
      .select('id, status, created_at')
      .eq('project_id', projectId)
      .gte('created_at', weekOf)
      .lt('created_at', weekEnd.toISOString())

    // Get Change Orders
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select('id, status, amount, created_at')
      .eq('project_id', projectId)
      .gte('created_at', weekOf)
      .lt('created_at', weekEnd.toISOString())

    const prompt = `Generate a weekly status report for this construction project:

Project: ${project?.name || 'Unknown'}
Week of: ${weekOf}

Daily Reports Summary:
${dailyReports?.map(r => `${r.report_date}: ${r.work_completed || 'No work recorded'}`).join('\n') || 'No daily reports'}

Weather Conditions:
${dailyReports?.map(r => `${r.report_date}: ${r.weather_conditions || 'Not recorded'}`).join('\n') || 'Not recorded'}

Issues Reported:
${dailyReports?.filter(r => r.issues_delays).map(r => `${r.report_date}: ${r.issues_delays}`).join('\n') || 'No issues reported'}

RFIs This Week: ${rfis?.length || 0} (${rfis?.filter(r => r.status === 'closed').length || 0} closed)
Change Orders This Week: ${changeOrders?.length || 0}

Provide a JSON response:
{
  "weeklyNarrative": "3-4 paragraph professional summary suitable for stakeholders",
  "accomplishments": ["Major accomplishment 1", "Major accomplishment 2"],
  "challenges": ["Challenge 1", "Challenge 2"],
  "nextWeekPriorities": ["Priority 1", "Priority 2"],
  "metrics": {
    "tasksCompleted": number,
    "issuesResolved": number,
    "issuesOpen": number
  }
}`

    interface WeeklyAIResult {
      weeklyNarrative: string
      accomplishments: string[]
      challenges: string[]
      nextWeekPriorities: string[]
      metrics: {
        tasksCompleted: number
        issuesResolved: number
        issuesOpen: number
      }
    }

    const { data: aiResult, tokens } = await aiService.extractJSON<WeeklyAIResult>(
      'weekly_status',
      prompt,
      { systemPrompt: SYSTEM_PROMPTS.weekly_status }
    )

    // Save summary
    const { data: summary, error } = await supabase
      .from('ai_summaries')
      .insert({
        project_id: projectId,
        summary_type: 'weekly_status' as AISummaryType,
        source_type: 'weekly_aggregation',
        source_id: weekOf,
        summary_content: aiResult.weeklyNarrative,
        key_points: [...aiResult.accomplishments, ...aiResult.challenges],
        metrics: {
          ...aiResult.metrics,
          dailyReportCount: dailyReports?.length || 0,
          rfiCount: rfis?.length || 0,
          changeOrderCount: changeOrders?.length || 0,
        },
        tokens_used: tokens.total,
        model_used: 'ai',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single()

    if (error) throw error

    return {
      summary,
      weeklyNarrative: aiResult.weeklyNarrative,
      accomplishments: aiResult.accomplishments,
      challenges: aiResult.challenges,
      nextWeekPriorities: aiResult.nextWeekPriorities,
      trendIndicators: [], // Would calculate from historical data
    }
  },

  /**
   * Generate change order impact summary
   */
  async generateCOImpactSummary(
    projectId: string,
    changeOrderIds?: string[]
  ): Promise<AISummary> {
    // Fetch change orders
    let query = supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', projectId)

    if (changeOrderIds?.length) {
      query = query.in('id', changeOrderIds)
    }

    const { data: changeOrders } = await query.order('created_at')

    if (!changeOrders?.length) {
      throw new Error('No change orders found')
    }

    const totalCost = changeOrders.reduce((sum, co) => sum + (co.amount || 0), 0)
    const approvedCOs = changeOrders.filter(co => co.status === 'approved')
    const pendingCOs = changeOrders.filter(co => co.status === 'pending')

    const prompt = `Analyze these construction change orders and summarize their impact:

Total Change Orders: ${changeOrders.length}
Total Cost Impact: $${totalCost.toLocaleString()}
Approved: ${approvedCOs.length} ($${approvedCOs.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString()})
Pending: ${pendingCOs.length} ($${pendingCOs.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString()})

Change Order Details:
${changeOrders.map(co => `- ${co.title}: $${(co.amount || 0).toLocaleString()} (${co.status}) - ${co.reason || 'No reason'}`).join('\n')}

Provide a JSON response:
{
  "summary": "Executive summary of change order impact",
  "keyInsights": ["Insight 1", "Insight 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`

    interface COAIResult {
      summary: string
      keyInsights: string[]
      recommendations: string[]
    }

    const { data: aiResult, tokens } = await aiService.extractJSON<COAIResult>(
      'change_order_impact',
      prompt,
      { systemPrompt: SYSTEM_PROMPTS.change_order_impact }
    )

    // Save summary
    const { data: summary, error } = await supabase
      .from('ai_summaries')
      .insert({
        project_id: projectId,
        summary_type: 'change_order_impact' as AISummaryType,
        source_type: 'change_order_aggregation',
        source_id: projectId,
        summary_content: aiResult.summary,
        key_points: [...aiResult.keyInsights, ...aiResult.recommendations],
        metrics: {
          totalCostImpact: totalCost,
          approvedCount: approvedCOs.length,
          pendingCount: pendingCOs.length,
        },
        tokens_used: tokens.total,
        model_used: 'ai',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return summary
  },

  /**
   * Get existing summary by ID
   */
  async getSummary(summaryId: string): Promise<AISummary | null> {
    const { data } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('id', summaryId)
      .single()

    return data
  },

  /**
   * Update action item status
   */
  async updateActionItemStatus(
    actionItemId: string,
    status: 'extracted' | 'confirmed' | 'rejected' | 'completed',
    assigneeId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_extracted_action_items')
      .update({
        status,
        assignee_id: assigneeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionItemId)

    if (error) throw error
  },

  // Helper functions
  formatDailyReportResponse(summary: AISummary): DailyReportSummaryResponse {
    const keyPoints = summary.key_points || []
    const midpoint = Math.ceil(keyPoints.length / 2)

    return {
      summary,
      highlights: keyPoints.slice(0, midpoint),
      concerns: keyPoints.slice(midpoint),
      tomorrowFocus: [], // Would need separate storage
    }
  },

  formatMeetingResponse(summary: AISummary & { action_items?: AIExtractedActionItem[] }): MeetingActionItemsResponse {
    return {
      summary,
      actionItems: summary.action_items || [],
      decisions: summary.key_points || [],
      nextMeetingTopics: [],
    }
  },

  formatWeeklyStatusResponse(summary: AISummary): WeeklyStatusResponse {
    const keyPoints = summary.key_points || []
    const midpoint = Math.ceil(keyPoints.length / 2)

    return {
      summary,
      weeklyNarrative: summary.summary_content,
      accomplishments: keyPoints.slice(0, midpoint),
      challenges: keyPoints.slice(midpoint),
      nextWeekPriorities: [],
      trendIndicators: [],
    }
  },
}
