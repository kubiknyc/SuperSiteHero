// File: /src/lib/api/services/reports.ts
// Report data aggregation and generation service

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'

/**
 * Report data types
 */
export interface ProjectHealthReport {
  projectId: string
  projectName: string
  status: string
  startDate: string
  estimatedEndDate: string
  contractValue: number | null
  budget: number | null
  scheduleVariance: number | null // days
  budgetVariance: number | null // percentage
  openItems: {
    rfis: number
    changeOrders: number
    submittals: number
    punchListItems: number
  }
  completionPercentage: number
}

export interface DailyReportAnalytics {
  projectId: string
  dateRange: {
    startDate: string
    endDate: string
  }
  totalReports: number
  submittedReports: number
  approvedReports: number
  submissionRate: number // percentage
  averageWorkersPerDay: number
  totalHoursWorked: number
  dominantTrades: Array<{ trade: string; count: number }>
  equipmentUtilization: Array<{ type: string; hoursUsed: number }>
  safetyIssuesReported: number
}

export interface WorkflowSummary {
  projectId: string
  workflowType: string // 'RFI', 'ChangeOrder', 'Submittal'
  totalCount: number
  byStatus: Record<string, number>
  averageResponseTime: number // days
  totalCostImpact: number | null
  totalScheduleImpact: number | null
  overdueCounts: number
}

export interface PunchListReport {
  projectId: string
  totalItems: number
  byStatus: Record<string, number>
  byTrade: Array<{ trade: string; count: number; completionRate: number }>
  byLocation: Array<{ location: string; count: number }>
  averageDaysOpen: number
  itemsOverdue: number
  rejectionRate: number // percentage
}

export interface SafetyIncidentReport {
  projectId: string
  dateRange: {
    startDate: string
    endDate: string
  }
  totalIncidents: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  oSHAReportable: number
  averageResolutionTime: number // days
  openIncidents: number
}

export interface FinancialSummary {
  projectId: string
  contractValue: number | null
  budget: number | null
  changeOrdersImpact: number // total cost impact
  percentageOverBudget: number
  forecastedTotal: number
  subcontractorCosts: number
  retainageHeld: number
}

export interface DocumentSummary {
  projectId: string
  totalDocuments: number
  byType: Record<string, number>
  outstandingApprovals: number
  supersededCount: number
  byDiscipline: Array<{ discipline: string; count: number }>
}

/**
 * Fetch project health report data
 */
export async function getProjectHealthReport(projectId: string): Promise<ProjectHealthReport> {
  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status, start_date, end_date, contract_value, budget')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError
    if (!project) throw new Error('Project not found')

    // Get workflow items (RFIs, Change Orders, Submittals)
    const { data: workflowItems } = await supabase
      .from('workflow_items')
      .select('workflow_type_id, status')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    // Get punch items
    const { data: punchItems } = await supabase
      .from('punch_items')
      .select('status')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    // Count items by type and status
    const openItems = {
      rfis: workflowItems?.filter(w => w.status !== 'closed' && w.status !== 'approved').length || 0,
      changeOrders: workflowItems?.filter(w => w.status !== 'closed' && w.status !== 'awarded').length || 0,
      submittals: workflowItems?.filter(w => w.status !== 'approved' && w.status !== 'rejected').length || 0,
      punchListItems: punchItems?.filter(p => p.status !== 'verified' && p.status !== 'completed').length || 0,
    }

    return {
      projectId,
      projectName: project.name,
      status: project.status ?? 'unknown',
      startDate: project.start_date ?? '',
      estimatedEndDate: project.end_date ?? '',
      contractValue: project.contract_value,
      budget: project.budget,
      scheduleVariance: null, // Would need schedule data
      budgetVariance: project.budget && project.contract_value
        ? ((project.contract_value - project.budget) / project.budget) * 100
        : null,
      openItems,
      completionPercentage: 0, // Would need schedule completion data
    }
  } catch (error) {
    throw error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'PROJECT_HEALTH_REPORT_ERROR',
          message: 'Failed to generate project health report',
        })
  }
}

/**
 * Fetch daily report analytics for a date range
 */
export async function getDailyReportAnalytics(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<DailyReportAnalytics> {
  try {
    const { data: reports } = await supabase
      .from('daily_reports')
      .select('id, status, report_date')
      .eq('project_id', projectId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .is('deleted_at', null)

    const { data: workforce } = await supabase
      .from('daily_report_workforce')
      .select('worker_count, trade')
      .in('daily_report_id', reports?.map(r => r.id) || [])
      .is('deleted_at', null)

    const { data: equipment } = await supabase
      .from('daily_report_equipment')
      .select('equipment_type, hours_used')
      .in('daily_report_id', reports?.map(r => r.id) || [])
      .is('deleted_at', null)

    const { data: safetyIncidents } = await supabase
      .from('daily_report_safety_incidents')
      .select('id')
      .in('daily_report_id', reports?.map(r => r.id) || [])
      .is('deleted_at', null)

    // Calculate aggregates
    const totalWorkers = workforce?.reduce((sum, w) => sum + (w.worker_count || 0), 0) || 0
    const reportDays = new Set(reports?.map(r => r.report_date)).size
    const averageWorkersPerDay = reportDays > 0 ? totalWorkers / reportDays : 0

    // Group trades
    const tradeMap = new Map<string, number>()
    workforce?.forEach(w => {
      if (w.trade) {
        tradeMap.set(w.trade, (tradeMap.get(w.trade) || 0) + 1)
      }
    })

    // Group equipment
    const equipmentMap = new Map<string, number>()
    equipment?.forEach(e => {
      if (e.equipment_type) {
        equipmentMap.set(e.equipment_type, (equipmentMap.get(e.equipment_type) || 0) + (e.hours_used || 0))
      }
    })

    return {
      projectId,
      dateRange: { startDate, endDate },
      totalReports: reports?.length || 0,
      submittedReports: reports?.filter(r => r.status === 'submitted' || r.status === 'approved').length || 0,
      approvedReports: reports?.filter(r => r.status === 'approved').length || 0,
      submissionRate:
        reports && reports.length > 0
          ? ((reports.filter(r => r.status === 'submitted' || r.status === 'approved').length / reports.length) * 100)
          : 0,
      averageWorkersPerDay,
      totalHoursWorked: workforce?.reduce((sum, w) => sum + (w.worker_count || 0), 0) || 0,
      dominantTrades: Array.from(tradeMap.entries())
        .map(([trade, count]) => ({ trade, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      equipmentUtilization: Array.from(equipmentMap.entries())
        .map(([type, hoursUsed]) => ({ type, hoursUsed }))
        .sort((a, b) => b.hoursUsed - a.hoursUsed),
      safetyIssuesReported: safetyIncidents?.length || 0,
    }
  } catch (error) {
    throw error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'DAILY_REPORT_ANALYTICS_ERROR',
          message: 'Failed to generate daily report analytics',
        })
  }
}

/**
 * Fetch workflow (RFI, Change Order, Submittal) summary
 */
export async function getWorkflowSummary(
  projectId: string,
  workflowType: string
): Promise<WorkflowSummary> {
  try {
    const { data: items } = await supabase
      .from('workflow_items')
      .select('id, status, opened_date, closed_date, cost_impact, schedule_impact')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    // Group by status
    const byStatus: Record<string, number> = {}
    let totalCostImpact = 0
    let totalScheduleImpact = 0
    let responseTimes: number[] = []

    items?.forEach(item => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1

      if (item.cost_impact) {
        totalCostImpact += Number(item.cost_impact) || 0
      }

      if (item.schedule_impact) {
        totalScheduleImpact += Number(item.schedule_impact) || 0
      }

      if (item.opened_date && item.closed_date) {
        const time = new Date(item.closed_date).getTime() - new Date(item.opened_date).getTime()
        responseTimes.push(time / (1000 * 60 * 60 * 24)) // Convert to days
      }
    })

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b) / responseTimes.length
      : 0

    return {
      projectId,
      workflowType,
      totalCount: items?.length || 0,
      byStatus,
      averageResponseTime,
      totalCostImpact,
      totalScheduleImpact,
      overdueCounts: 0, // Would need due_date comparison
    }
  } catch (error) {
    throw error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'WORKFLOW_SUMMARY_ERROR',
          message: 'Failed to generate workflow summary',
        })
  }
}

/**
 * Fetch punch list report
 */
export async function getPunchListReport(projectId: string): Promise<PunchListReport> {
  try {
    const { data: items } = await supabase
      .from('punch_items')
      .select('id, status, trade, created_at, completed_date, priority, building, floor, room')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    // Group by status
    const byStatus: Record<string, number> = {}
    const byTrade = new Map<string, { count: number; completed: number }>()
    const byLocation = new Map<string, number>()
    let totalDaysOpen = 0
    let itemsOverdue = 0
    let rejections = 0

    items?.forEach(item => {
      const status = item.status ?? 'unknown'
      byStatus[status] = (byStatus[status] || 0) + 1

      // Track by trade
      if (item.trade) {
        const trade = byTrade.get(item.trade) || { count: 0, completed: 0 }
        trade.count++
        if (item.status === 'verified' || item.status === 'completed') {
          trade.completed++
        }
        byTrade.set(item.trade, trade)
      }

      // Track by location
      const location = [item.building, item.floor, item.room].filter(Boolean).join(' / ') || 'Unknown'
      byLocation.set(location, (byLocation.get(location) || 0) + 1)

      // Calculate days open
      if (item.created_at) {
        const daysOpen = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
        totalDaysOpen += daysOpen
      }

      // Count rejections
      if (item.status === 'rejected') {
        rejections++
      }
    })

    const totalItems = items?.length || 0

    return {
      projectId,
      totalItems,
      byStatus,
      byTrade: Array.from(byTrade.entries()).map(([trade, data]) => ({
        trade,
        count: data.count,
        completionRate: data.count > 0 ? (data.completed / data.count) * 100 : 0,
      })),
      byLocation: Array.from(byLocation.entries()).map(([location, count]) => ({ location, count })),
      averageDaysOpen: totalItems > 0 ? totalDaysOpen / totalItems : 0,
      itemsOverdue,
      rejectionRate: totalItems > 0 ? (rejections / totalItems) * 100 : 0,
    }
  } catch (error) {
    throw error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'PUNCH_LIST_REPORT_ERROR',
          message: 'Failed to generate punch list report',
        })
  }
}

/**
 * Fetch safety incident report
 */
export async function getSafetyIncidentReport(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<SafetyIncidentReport> {
  try {
    const { data: incidents } = await supabase
      .from('safety_incidents')
      .select('id, incident_type, severity, incident_date, status, created_at')
      .eq('project_id', projectId)
      .gte('incident_date', startDate)
      .lte('incident_date', endDate)
      .is('deleted_at', null)

    // Aggregate incidents
    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    let resolutionTimes: number[] = []

    incidents?.forEach(incident => {
      const incidentType = incident.incident_type ?? 'unknown'
      const severity = incident.severity ?? 'unknown'
      byType[incidentType] = (byType[incidentType] || 0) + 1
      bySeverity[severity] = (bySeverity[severity] || 0) + 1

      if (incident.status === 'closed' && incident.created_at) {
        const time = new Date(incident.incident_date).getTime() - new Date(incident.created_at).getTime()
        resolutionTimes.push(time / (1000 * 60 * 60 * 24))
      }
    })

    return {
      projectId,
      dateRange: { startDate, endDate },
      totalIncidents: incidents?.length || 0,
      byType,
      bySeverity,
      oSHAReportable: 0, // Would need OSHA logic
      averageResolutionTime: resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b) / resolutionTimes.length
        : 0,
      openIncidents: incidents?.filter(i => i.status !== 'closed').length || 0,
    }
  } catch (error) {
    throw error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'SAFETY_INCIDENT_REPORT_ERROR',
          message: 'Failed to generate safety incident report',
        })
  }
}

/**
 * Fetch financial summary
 */
export async function getFinancialSummary(projectId: string): Promise<FinancialSummary> {
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('contract_value, budget')
      .eq('id', projectId)
      .single()

    const { data: changeOrders } = await supabase
      .from('workflow_items')
      .select('cost_impact, status')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    let changeOrderCostImpact = 0
    changeOrders?.forEach(co => {
      if (co.cost_impact) {
        changeOrderCostImpact += Number(co.cost_impact) || 0
      }
    })

    const contractValue = project?.contract_value || 0
    const budget = project?.budget || 0
    const forecastedTotal = contractValue + changeOrderCostImpact

    return {
      projectId,
      contractValue,
      budget,
      changeOrdersImpact: changeOrderCostImpact,
      percentageOverBudget: budget > 0 ? ((forecastedTotal - budget) / budget) * 100 : 0,
      forecastedTotal,
      subcontractorCosts: 0, // Would need subcontractor data
      retainageHeld: 0, // Would need payment data
    }
  } catch (error) {
    throw error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'FINANCIAL_SUMMARY_ERROR',
          message: 'Failed to generate financial summary',
        })
  }
}

/**
 * Fetch document summary
 */
export async function getDocumentSummary(projectId: string): Promise<DocumentSummary> {
  try {
    const { data: documents } = await supabase
      .from('documents')
      .select('document_type, discipline, status, requires_approval')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    const byType: Record<string, number> = {}
    const byDiscipline = new Map<string, number>()
    let outstandingApprovals = 0
    let supersededCount = 0

    documents?.forEach(doc => {
      byType[doc.document_type] = (byType[doc.document_type] || 0) + 1

      if (doc.discipline) {
        byDiscipline.set(doc.discipline, (byDiscipline.get(doc.discipline) || 0) + 1)
      }

      if (doc.requires_approval) {
        outstandingApprovals++
      }

      if (doc.status === 'superseded') {
        supersededCount++
      }
    })

    return {
      projectId,
      totalDocuments: documents?.length || 0,
      byType,
      outstandingApprovals,
      supersededCount,
      byDiscipline: Array.from(byDiscipline.entries()).map(([discipline, count]) => ({ discipline, count })),
    }
  } catch (error) {
    throw error instanceof ApiErrorClass
      ? error
      : new ApiErrorClass({
          code: 'DOCUMENT_SUMMARY_ERROR',
          message: 'Failed to generate document summary',
        })
  }
}
