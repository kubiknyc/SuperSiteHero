/**
 * Project Status Summary Tool
 * Generates comprehensive project status summaries
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface ProjectStatusInput {
  project_id: string
  include_financials?: boolean
  include_schedule?: boolean
  include_safety?: boolean
  include_quality?: boolean
  time_period_days?: number
}

interface ProjectStatusOutput {
  project: {
    name: string
    number: string
    status: string
    percent_complete: number
    health_score: number | null
  }
  schedule: {
    start_date: string | null
    end_date: string | null
    days_remaining: number | null
    variance_days: number
    status: 'ahead' | 'on_track' | 'behind' | 'critical'
    upcoming_milestones: Array<{ name: string; date: string; days_away: number }>
  }
  financials: {
    contract_value: number
    budget: number
    spent_to_date: number
    remaining: number
    percent_spent: number
    contingency_remaining: number
    status: 'under' | 'on_budget' | 'over' | 'critical'
  }
  open_items: {
    rfis: { total: number; overdue: number; avg_days_open: number }
    submittals: { total: number; overdue: number; pending_review: number }
    change_orders: { total: number; pending_amount: number; approved_amount: number }
    punch_items: { total: number; critical: number; completed: number }
  }
  safety: {
    days_since_incident: number | null
    incidents_this_month: number
    open_observations: number
  }
  recent_activity: {
    daily_reports: number
    photos_added: number
    documents_uploaded: number
  }
  risks: string[]
  highlights: string[]
}

export const projectStatusSummaryTool = createTool<ProjectStatusInput, ProjectStatusOutput>({
  name: 'get_project_status',
  description: 'Generates a comprehensive project status summary including schedule, financials, open items, safety, and recent activity. Use for status meetings or executive updates.',
  category: 'project',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to get status for'
      },
      include_financials: {
        type: 'boolean',
        description: 'Include financial details (default: true)'
      },
      include_schedule: {
        type: 'boolean',
        description: 'Include schedule details (default: true)'
      },
      include_safety: {
        type: 'boolean',
        description: 'Include safety metrics (default: true)'
      },
      include_quality: {
        type: 'boolean',
        description: 'Include quality/punch list metrics (default: true)'
      },
      time_period_days: {
        type: 'number',
        description: 'Number of days to look back for recent activity (default: 7)'
      }
    },
    required: ['project_id']
  },

  async execute(input: ProjectStatusInput, context: AgentContext): Promise<ProjectStatusOutput> {
    const {
      project_id,
      include_financials = true,
      include_schedule = true,
      include_safety = true,
      include_quality = true,
      time_period_days = 7
    } = input

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - time_period_days)

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (!project) {
      throw new Error('Project not found')
    }

    // Get RFI counts
    const { data: rfis } = await supabase
      .from('rfis')
      .select('id, status, date_required, created_at')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    const openRfis = rfis?.filter(r => !['closed', 'answered'].includes(r.status)) || []
    const overdueRfis = openRfis.filter(r => r.date_required && new Date(r.date_required) < new Date())
    const avgDaysOpen = openRfis.length > 0
      ? openRfis.reduce((sum, r) => {
          const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / openRfis.length
      : 0

    // Get submittal counts
    const { data: submittals } = await supabase
      .from('submittals')
      .select('id, review_status, date_required')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    const openSubmittals = submittals?.filter(s => !['approved', 'approved_as_noted', 'rejected'].includes(s.review_status)) || []
    const overdueSubmittals = openSubmittals.filter(s => s.date_required && new Date(s.date_required) < new Date())
    const pendingReview = submittals?.filter(s => s.review_status === 'under_review').length || 0

    // Get change order counts
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select('id, status, requested_amount, approved_amount')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    const pendingCOs = changeOrders?.filter(co => ['draft', 'pending', 'submitted'].includes(co.status)) || []
    const approvedCOs = changeOrders?.filter(co => co.status === 'approved') || []
    const pendingAmount = pendingCOs.reduce((sum, co) => sum + (co.requested_amount || 0), 0)
    const approvedAmount = approvedCOs.reduce((sum, co) => sum + (co.approved_amount || 0), 0)

    // Get punch item counts
    const { data: punchItems } = await supabase
      .from('punch_items')
      .select('id, status, priority')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    const openPunch = punchItems?.filter(p => !['completed', 'verified'].includes(p.status)) || []
    const criticalPunch = openPunch.filter(p => p.priority === 'critical')
    const completedPunch = punchItems?.filter(p => ['completed', 'verified'].includes(p.status)) || []

    // Get safety incidents
    const { data: incidents } = await supabase
      .from('safety_incidents')
      .select('id, incident_date')
      .eq('project_id', project_id)
      .is('deleted_at', null)
      .order('incident_date', { ascending: false })

    const lastIncident = incidents?.[0]
    const daysSinceIncident = lastIncident
      ? Math.floor((Date.now() - new Date(lastIncident.incident_date).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const incidentsThisMonth = incidents?.filter(i => {
      const date = new Date(i.incident_date)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length || 0

    // Get recent daily reports
    const { count: dailyReportCount } = await supabase
      .from('daily_reports')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id)
      .gte('report_date', cutoffDate.toISOString().split('T')[0])

    // Calculate schedule status
    const daysRemaining = project.end_date
      ? Math.floor((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    const varianceDays = project.schedule_variance_days || 0
    let scheduleStatus: 'ahead' | 'on_track' | 'behind' | 'critical' = 'on_track'
    if (varianceDays > 5) {scheduleStatus = 'ahead'}
    else if (varianceDays < -14) {scheduleStatus = 'critical'}
    else if (varianceDays < -5) {scheduleStatus = 'behind'}

    // Calculate financial status
    const budget = project.budget || 0
    const spent = project.spent_to_date || 0
    const percentSpent = budget > 0 ? (spent / budget) * 100 : 0
    const percentComplete = project.percent_complete || 0

    let financialStatus: 'under' | 'on_budget' | 'over' | 'critical' = 'on_budget'
    if (percentSpent > percentComplete + 15) {financialStatus = 'critical'}
    else if (percentSpent > percentComplete + 5) {financialStatus = 'over'}
    else if (percentSpent < percentComplete - 10) {financialStatus = 'under'}

    // Generate risks
    const risks: string[] = []
    if (overdueRfis.length > 3) {risks.push(`${overdueRfis.length} overdue RFIs may impact schedule`)}
    if (overdueSubmittals.length > 2) {risks.push(`${overdueSubmittals.length} overdue submittals need attention`)}
    if (scheduleStatus === 'critical') {risks.push('Project is significantly behind schedule')}
    if (financialStatus === 'critical') {risks.push('Spending significantly ahead of progress')}
    if (criticalPunch.length > 0) {risks.push(`${criticalPunch.length} critical punch items require immediate attention`)}
    if (pendingAmount > budget * 0.1) {risks.push('Pending change orders represent >10% of budget')}

    // Generate highlights
    const highlights: string[] = []
    if (daysSinceIncident && daysSinceIncident > 30) {highlights.push(`${daysSinceIncident} days without safety incident`)}
    if (scheduleStatus === 'ahead') {highlights.push('Project is ahead of schedule')}
    if (financialStatus === 'under') {highlights.push('Spending is under budget relative to progress')}
    if (completedPunch.length > 0 && openPunch.length < 10) {highlights.push('Punch list is well controlled')}

    return {
      project: {
        name: project.name,
        number: project.project_number || '',
        status: project.status,
        percent_complete: percentComplete,
        health_score: project.health_score
      },
      schedule: {
        start_date: project.start_date,
        end_date: project.end_date,
        days_remaining: daysRemaining,
        variance_days: varianceDays,
        status: scheduleStatus,
        upcoming_milestones: [] // Would need milestone table query
      },
      financials: {
        contract_value: project.contract_value || 0,
        budget: budget,
        spent_to_date: spent,
        remaining: Math.max(0, budget - spent),
        percent_spent: Math.round(percentSpent * 100) / 100,
        contingency_remaining: (project.contingency_amount || 0) - (project.contingency_used || 0),
        status: financialStatus
      },
      open_items: {
        rfis: {
          total: openRfis.length,
          overdue: overdueRfis.length,
          avg_days_open: Math.round(avgDaysOpen)
        },
        submittals: {
          total: openSubmittals.length,
          overdue: overdueSubmittals.length,
          pending_review: pendingReview
        },
        change_orders: {
          total: pendingCOs.length,
          pending_amount: pendingAmount,
          approved_amount: approvedAmount
        },
        punch_items: {
          total: openPunch.length,
          critical: criticalPunch.length,
          completed: completedPunch.length
        }
      },
      safety: {
        days_since_incident: daysSinceIncident,
        incidents_this_month: incidentsThisMonth,
        open_observations: 0 // Would need safety observations query
      },
      recent_activity: {
        daily_reports: dailyReportCount || 0,
        photos_added: 0, // Would need photos query
        documents_uploaded: 0 // Would need documents query
      },
      risks,
      highlights
    }
  }
})
