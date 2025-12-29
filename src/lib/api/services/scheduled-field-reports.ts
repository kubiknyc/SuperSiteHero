/**
 * Scheduled Field Reports API Service
 * Phase 5: Field Workflow Automation - Milestone 5.3
 *
 * Provides API methods for:
 * - Scheduled report configuration
 * - Report generation
 * - Report history
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type {
  ScheduledFieldReport,
  ScheduledFieldReportWithDetails,
  GeneratedFieldReport,
  GeneratedFieldReportWithDetails,
  CreateScheduledFieldReportInput,
  UpdateScheduledFieldReportInput,
  DailySummaryData,
  WeeklyProgressData,
  FieldReportType,
  ReportContentConfig,
} from '@/types/workflow-automation'

// ============================================================================
// Scheduled Reports API
// ============================================================================

export const scheduledFieldReportsApi = {
  /**
   * Get scheduled reports for a project
   */
  async getReports(projectId: string): Promise<ScheduledFieldReportWithDetails[]> {
    const { data, error } = await supabase
      .from('scheduled_field_reports')
      .select(`
        *,
        project:projects(id, name, number),
        distribution_list:distribution_lists(id, name),
        created_by_user:profiles!scheduled_field_reports_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .order('name', { ascending: true })

    if (error) {
      logger.error('[ScheduledReports] Error fetching reports:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get all scheduled reports for a company
   */
  async getCompanyReports(companyId: string): Promise<ScheduledFieldReportWithDetails[]> {
    const { data, error } = await supabase
      .from('scheduled_field_reports')
      .select(`
        *,
        project:projects(id, name, number),
        distribution_list:distribution_lists(id, name),
        created_by_user:profiles!scheduled_field_reports_created_by_fkey(id, full_name, email)
      `)
      .eq('company_id', companyId)
      .order('name', { ascending: true })

    if (error) {
      logger.error('[ScheduledReports] Error fetching company reports:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get active scheduled reports that are due to run
   */
  async getDueReports(): Promise<ScheduledFieldReport[]> {
    const { data, error } = await supabase
      .from('scheduled_field_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_scheduled_at', new Date().toISOString())
      .order('next_scheduled_at', { ascending: true })

    if (error) {
      logger.error('[ScheduledReports] Error fetching due reports:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get a single scheduled report
   */
  async getReport(reportId: string): Promise<ScheduledFieldReportWithDetails> {
    const { data, error } = await supabase
      .from('scheduled_field_reports')
      .select(`
        *,
        project:projects(id, name, number),
        distribution_list:distribution_lists(id, name),
        created_by_user:profiles!scheduled_field_reports_created_by_fkey(id, full_name, email)
      `)
      .eq('id', reportId)
      .single()

    if (error) {
      logger.error('[ScheduledReports] Error fetching report:', error)
      throw error
    }

    return data
  },

  /**
   * Create a new scheduled report
   */
  async createReport(input: CreateScheduledFieldReportInput): Promise<ScheduledFieldReport> {
    const { data: user } = await supabase.auth.getUser()

    const reportData = {
      project_id: input.project_id || null,
      company_id: input.company_id || null,
      name: input.name,
      description: input.description || null,
      report_type: input.report_type,
      frequency: input.frequency,
      day_of_week: input.day_of_week || null,
      day_of_month: input.day_of_month || null,
      time_of_day: input.time_of_day || '18:00',
      timezone: input.timezone || 'America/New_York',
      content_config: input.content_config || {
        sections: ['summary', 'safety', 'quality', 'schedule', 'photos'],
        include_charts: true,
        date_range: 'period',
      },
      distribution_list_id: input.distribution_list_id || null,
      recipient_emails: input.recipient_emails || null,
      recipient_user_ids: input.recipient_user_ids || null,
      email_subject_template: input.email_subject_template || null,
      email_body_template: input.email_body_template || null,
      include_pdf_attachment: input.include_pdf_attachment ?? true,
      output_format: input.output_format || 'pdf',
      is_active: true,
      created_by: user?.user?.id || null,
    }

    const { data, error } = await supabase
      .from('scheduled_field_reports')
      .insert(reportData)
      .select()
      .single()

    if (error) {
      logger.error('[ScheduledReports] Error creating report:', error)
      throw error
    }

    logger.info('[ScheduledReports] Created scheduled report:', data.id)
    return data
  },

  /**
   * Update a scheduled report
   */
  async updateReport(
    reportId: string,
    updates: UpdateScheduledFieldReportInput
  ): Promise<ScheduledFieldReport> {
    const { data, error } = await supabase
      .from('scheduled_field_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      logger.error('[ScheduledReports] Error updating report:', error)
      throw error
    }

    return data
  },

  /**
   * Toggle report active status
   */
  async toggleReport(reportId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('scheduled_field_reports')
      .update({ is_active: isActive })
      .eq('id', reportId)

    if (error) {
      logger.error('[ScheduledReports] Error toggling report:', error)
      throw error
    }
  },

  /**
   * Delete a scheduled report
   */
  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from('scheduled_field_reports')
      .delete()
      .eq('id', reportId)

    if (error) {
      logger.error('[ScheduledReports] Error deleting report:', error)
      throw error
    }
  },

  /**
   * Update last/next run times after generation
   */
  async updateRunTimes(reportId: string): Promise<void> {
    // The trigger should handle next_scheduled_at, but we update last_generated_at
    const { error } = await supabase
      .from('scheduled_field_reports')
      .update({ last_generated_at: new Date().toISOString() })
      .eq('id', reportId)

    if (error) {
      logger.error('[ScheduledReports] Error updating run times:', error)
    }
  },
}

// ============================================================================
// Generated Reports API
// ============================================================================

export const generatedReportsApi = {
  /**
   * Get generated reports for a project
   */
  async getReports(projectId: string, limit = 50): Promise<GeneratedFieldReportWithDetails[]> {
    const { data, error } = await supabase
      .from('generated_field_reports')
      .select(`
        *,
        scheduled_report:scheduled_field_reports(id, name),
        project:projects(id, name, number)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('[GeneratedReports] Error fetching reports:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get a single generated report
   */
  async getReport(reportId: string): Promise<GeneratedFieldReportWithDetails> {
    const { data, error } = await supabase
      .from('generated_field_reports')
      .select(`
        *,
        scheduled_report:scheduled_field_reports(id, name),
        project:projects(id, name, number)
      `)
      .eq('id', reportId)
      .single()

    if (error) {
      logger.error('[GeneratedReports] Error fetching report:', error)
      throw error
    }

    return data
  },

  /**
   * Create a generated report record
   */
  async createReport(params: {
    scheduled_report_id?: string | null;
    project_id: string;
    report_name: string;
    report_type: string;
    period_start?: string;
    period_end?: string;
    generated_by?: string;
  }): Promise<GeneratedFieldReport> {
    const { data, error } = await supabase
      .from('generated_field_reports')
      .insert({
        ...params,
        status: 'generating',
      })
      .select()
      .single()

    if (error) {
      logger.error('[GeneratedReports] Error creating report record:', error)
      throw error
    }

    return data
  },

  /**
   * Update generated report with data and file
   */
  async updateReport(
    reportId: string,
    updates: Partial<GeneratedFieldReport>
  ): Promise<void> {
    const { error } = await supabase
      .from('generated_field_reports')
      .update(updates)
      .eq('id', reportId)

    if (error) {
      logger.error('[GeneratedReports] Error updating report:', error)
      throw error
    }
  },

  /**
   * Mark report as sent
   */
  async markAsSent(reportId: string, recipients: string[]): Promise<void> {
    const { error } = await supabase
      .from('generated_field_reports')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipients_sent: recipients,
      })
      .eq('id', reportId)

    if (error) {
      logger.error('[GeneratedReports] Error marking report as sent:', error)
      throw error
    }
  },

  /**
   * Mark report as failed
   */
  async markAsFailed(reportId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
      .from('generated_field_reports')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', reportId)

    if (error) {
      logger.error('[GeneratedReports] Error marking report as failed:', error)
    }
  },
}

// ============================================================================
// Report Data Compilation Service
// ============================================================================

export const reportDataService = {
  /**
   * Compile daily summary data for a project
   */
  async compileDailySummary(
    projectId: string,
    date: string
  ): Promise<DailySummaryData> {
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    // Fetch all data in parallel
    const [
      weatherData,
      dailyReportData,
      safetyData,
      inspectionData,
      punchData,
      equipmentData,
      photosData,
    ] = await Promise.all([
      // Weather
      supabase
        .from('weather_logs')
        .select('*')
        .eq('project_id', projectId)
        .eq('log_date', date)
        .single(),

      // Daily report manpower
      supabase
        .from('daily_reports')
        .select('total_workers, labor_entries')
        .eq('project_id', projectId)
        .eq('report_date', date)
        .single(),

      // Safety incidents and observations
      supabase
        .from('safety_incidents')
        .select('id, incident_type')
        .eq('project_id', projectId)
        .gte('incident_date', startOfDay)
        .lte('incident_date', endOfDay),

      // Inspections
      supabase
        .from('inspections')
        .select('id, status')
        .eq('project_id', projectId)
        .gte('inspection_date', startOfDay)
        .lte('inspection_date', endOfDay),

      // Punch items
      supabase
        .from('punch_items')
        .select('id, status, created_at')
        .eq('project_id', projectId)
        .or(`created_at.gte.${startOfDay},status.eq.completed`),

      // Equipment usage
      supabase
        .from('equipment_logs')
        .select('hours_used, equipment_id')
        .eq('project_id', projectId)
        .eq('log_date', date),

      // Photos
      supabase
        .from('photos')
        .select('file_url, caption, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .limit(20),
    ])

    // Parse labor entries for by_trade breakdown
    const byTrade: Record<string, number> = {}
    if (dailyReportData.data?.labor_entries) {
      const entries = dailyReportData.data.labor_entries as any[]
      for (const entry of entries) {
        const trade = entry.trade || 'General'
        byTrade[trade] = (byTrade[trade] || 0) + (entry.workers || 0)
      }
    }

    // Calculate punch items
    const punchCreatedToday = (punchData.data || []).filter(
      (p: any) => p.created_at >= startOfDay && p.created_at <= endOfDay
    ).length
    const punchCompletedToday = (punchData.data || []).filter(
      (p: any) => p.status === 'completed'
    ).length

    return {
      date,
      weather: weatherData.data
        ? {
            high_temp: weatherData.data.high_temperature,
            low_temp: weatherData.data.low_temperature,
            conditions: weatherData.data.conditions,
            precipitation: weatherData.data.precipitation_inches,
          }
        : null,
      manpower: {
        total_workers: dailyReportData.data?.total_workers || 0,
        by_trade: byTrade,
      },
      safety: {
        incidents_count: (safetyData.data || []).filter(
          (s: any) => s.incident_type === 'incident'
        ).length,
        near_misses_count: (safetyData.data || []).filter(
          (s: any) => s.incident_type === 'near_miss'
        ).length,
        observations_count: (safetyData.data || []).filter(
          (s: any) => s.incident_type === 'observation'
        ).length,
      },
      quality: {
        inspections_passed: (inspectionData.data || []).filter(
          (i: any) => i.status === 'passed'
        ).length,
        inspections_failed: (inspectionData.data || []).filter(
          (i: any) => i.status === 'failed'
        ).length,
        punch_items_created: punchCreatedToday,
        punch_items_completed: punchCompletedToday,
      },
      schedule: {
        activities_in_progress: 0, // Would need schedule_activities table
        activities_completed: 0,
        variance_days: null,
      },
      equipment: {
        total_hours_used: (equipmentData.data || []).reduce(
          (sum: number, log: any) => sum + (log.hours_used || 0),
          0
        ),
        equipment_in_use: new Set((equipmentData.data || []).map((l: any) => l.equipment_id)).size,
      },
      photos: (photosData.data || []).map((p: any) => ({
        url: p.file_url,
        caption: p.caption,
        taken_at: p.created_at,
      })),
    }
  },

  /**
   * Compile weekly progress data for a project
   */
  async compileWeeklyProgress(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<WeeklyProgressData> {
    // Get daily summaries for each day
    const dailySummaries: DailySummaryData[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      try {
        const summary = await this.compileDailySummary(projectId, dateStr)
        dailySummaries.push(summary)
      } catch (_error) {
        logger.warn('[ReportData] Error compiling daily summary for', dateStr)
      }
      current.setDate(current.getDate() + 1)
    }

    // Get schedule data
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('percent_complete, planned_percent_complete')
      .eq('project_id', projectId)

    const avgComplete = activities?.length
      ? activities.reduce((sum: number, a: any) => sum + (a.percent_complete || 0), 0) /
        activities.length
      : 0
    const avgPlanned = activities?.length
      ? activities.reduce((sum: number, a: any) => sum + (a.planned_percent_complete || 0), 0) /
        activities.length
      : 0

    // Get milestones
    const { data: milestones } = await supabase
      .from('schedule_activities')
      .select('name, end_date, status')
      .eq('project_id', projectId)
      .eq('is_milestone', true)
      .gte('end_date', startDate)
      .lte('end_date', new Date(new Date(endDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('end_date', { ascending: true })
      .limit(5)

    return {
      period_start: startDate,
      period_end: endDate,
      daily_summaries: dailySummaries,
      schedule_progress: {
        percent_complete: Math.round(avgComplete * 100) / 100,
        planned_percent: Math.round(avgPlanned * 100) / 100,
        variance: Math.round((avgComplete - avgPlanned) * 100) / 100,
      },
      cost_progress: null, // Would need cost tracking data
      highlights: [], // Would need to extract from daily reports
      concerns: [],
      upcoming_milestones: (milestones || []).map((m: any) => ({
        name: m.name,
        date: m.end_date,
        status: m.status,
      })),
    }
  },

  /**
   * Generate report data based on type and config
   */
  async generateReportData(
    projectId: string,
    reportType: FieldReportType,
    periodStart: string,
    periodEnd: string,
    config?: ReportContentConfig
  ): Promise<Record<string, unknown>> {
    switch (reportType) {
      case 'daily_summary':
        return await this.compileDailySummary(projectId, periodStart)

      case 'weekly_progress':
        return await this.compileWeeklyProgress(projectId, periodStart, periodEnd)

      case 'safety_summary':
        return await this.compileSafetySummary(projectId, periodStart, periodEnd)

      case 'quality_metrics':
        return await this.compileQualityMetrics(projectId, periodStart, periodEnd)

      case 'equipment_status':
        return await this.compileEquipmentStatus(projectId)

      case 'client_report':
        return await this.compileClientReport(projectId, periodStart, periodEnd, config)

      default:
        return await this.compileWeeklyProgress(projectId, periodStart, periodEnd)
    }
  },

  /**
   * Compile safety summary
   */
  async compileSafetySummary(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, unknown>> {
    const { data: incidents } = await supabase
      .from('safety_incidents')
      .select('*')
      .eq('project_id', projectId)
      .gte('incident_date', startDate)
      .lte('incident_date', endDate)
      .order('incident_date', { ascending: false })

    const { data: toolboxTalks } = await supabase
      .from('toolbox_talks')
      .select('id, topic, attendee_count')
      .eq('project_id', projectId)
      .gte('talk_date', startDate)
      .lte('talk_date', endDate)

    return {
      period_start: startDate,
      period_end: endDate,
      incidents: incidents || [],
      incident_count: (incidents || []).filter((i: any) => i.incident_type === 'incident').length,
      near_miss_count: (incidents || []).filter((i: any) => i.incident_type === 'near_miss').length,
      observation_count: (incidents || []).filter((i: any) => i.incident_type === 'observation').length,
      toolbox_talks: toolboxTalks || [],
      toolbox_talk_count: (toolboxTalks || []).length,
      total_attendees: (toolboxTalks || []).reduce((sum: number, t: any) => sum + (t.attendee_count || 0), 0),
    }
  },

  /**
   * Compile quality metrics
   */
  async compileQualityMetrics(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, unknown>> {
    const [inspections, punchItems, checklists] = await Promise.all([
      supabase
        .from('inspections')
        .select('id, status, inspection_type')
        .eq('project_id', projectId)
        .gte('inspection_date', startDate)
        .lte('inspection_date', endDate),

      supabase
        .from('punch_items')
        .select('id, status, priority, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startDate)
        .lte('created_at', endDate),

      supabase
        .from('checklist_executions')
        .select('id, status, score_pass, score_fail')
        .eq('project_id', projectId)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
    ])

    const inspData = inspections.data || []
    const punchData = punchItems.data || []
    const checkData = checklists.data || []

    return {
      period_start: startDate,
      period_end: endDate,
      inspections: {
        total: inspData.length,
        passed: inspData.filter((i: any) => i.status === 'passed').length,
        failed: inspData.filter((i: any) => i.status === 'failed').length,
        pass_rate: inspData.length > 0
          ? Math.round(
              (inspData.filter((i: any) => i.status === 'passed').length / inspData.length) * 100
            )
          : 0,
      },
      punch_items: {
        total_created: punchData.length,
        open: punchData.filter((p: any) => p.status === 'open').length,
        completed: punchData.filter((p: any) => p.status === 'completed').length,
        by_priority: {
          urgent: punchData.filter((p: any) => p.priority === 'urgent').length,
          high: punchData.filter((p: any) => p.priority === 'high').length,
          normal: punchData.filter((p: any) => p.priority === 'normal').length,
          low: punchData.filter((p: any) => p.priority === 'low').length,
        },
      },
      checklists: {
        total: checkData.length,
        total_pass: checkData.reduce((sum: number, c: any) => sum + (c.score_pass || 0), 0),
        total_fail: checkData.reduce((sum: number, c: any) => sum + (c.score_fail || 0), 0),
      },
    }
  },

  /**
   * Compile equipment status
   */
  async compileEquipmentStatus(projectId: string): Promise<Record<string, unknown>> {
    const { data: assignments } = await supabase
      .from('equipment_assignments')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name, status, current_hours)
      `)
      .eq('project_id', projectId)
      .eq('status', 'active')

    const { data: logs } = await supabase
      .from('equipment_logs')
      .select('*')
      .eq('project_id', projectId)
      .gte('log_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    return {
      as_of: new Date().toISOString(),
      assigned_equipment: (assignments || []).map((a: any) => ({
        equipment_number: a.equipment?.equipment_number,
        name: a.equipment?.name,
        status: a.equipment?.status,
        hours: a.equipment?.current_hours,
        assigned_date: a.assigned_date,
      })),
      equipment_count: (assignments || []).length,
      total_hours_this_week: (logs || []).reduce(
        (sum: number, l: any) => sum + (l.hours_used || 0),
        0
      ),
      utilization: {
        in_use: (assignments || []).filter(
          (a: any) => a.equipment?.status === 'in_use'
        ).length,
        available: (assignments || []).filter(
          (a: any) => a.equipment?.status === 'available'
        ).length,
        maintenance: (assignments || []).filter(
          (a: any) => a.equipment?.status === 'maintenance'
        ).length,
      },
    }
  },

  /**
   * Compile client report (filtered view)
   */
  async compileClientReport(
    projectId: string,
    startDate: string,
    endDate: string,
    config?: ReportContentConfig
  ): Promise<Record<string, unknown>> {
    // Base weekly progress
    const weeklyData = await this.compileWeeklyProgress(projectId, startDate, endDate)

    // Filter to include only client-relevant sections
    return {
      ...weeklyData,
      // Remove internal details
      daily_summaries: weeklyData.daily_summaries.map((d) => ({
        date: d.date,
        weather: d.weather,
        manpower: { total_workers: d.manpower.total_workers },
        quality: {
          inspections_passed: d.quality.inspections_passed,
          punch_items_completed: d.quality.punch_items_completed,
        },
        photos: config?.include_photos !== false
          ? d.photos.slice(0, config?.max_photos || 5)
          : [],
      })),
    }
  },
}

// Combined export
export const scheduledFieldReportApi = {
  scheduled: scheduledFieldReportsApi,
  generated: generatedReportsApi,
  data: reportDataService,
}
