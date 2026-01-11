// File: /src/features/reports/hooks/useReports.ts
// React Query hooks for report generation

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  format,
  startOfWeek,
  endOfWeek,
  differenceInDays,
} from 'date-fns'
import {
  getProjectHealthReport,
  getDailyReportAnalytics,
  getWorkflowSummary,
  getPunchListReport,
  getSafetyIncidentReport,
  getFinancialSummary,
  getDocumentSummary,
} from '@/lib/api/services/reports'

// ============================================================================
// Executive Summary Types
// ============================================================================

export interface ExecutiveSummary {
  reportDate: Date
  dateRange: { start: Date; end: Date }
  projectCount: number
  activeProjects: number
  overallProgress: number
  budgetSummary: {
    totalBudget: number
    totalSpent: number
    variance: number
    percentUsed: number
  }
  scheduleSummary: {
    onTrack: number
    atRisk: number
    behind: number
    ahead: number
  }
  keyMetrics: {
    openRFIs: number
    overdueRFIs: number
    openSubmittals: number
    overdueSubmittals: number
    openChangeOrders: number
    totalCOValue: number
    openPunchItems: number
    safetyIncidents: number
    daysSinceLastIncident: number
  }
  highlights: ReportHighlight[]
  concerns: ReportConcern[]
  weeklyComparison: {
    rfisClosed: number
    submittalsClosed: number
    tasksCompleted: number
    punchItemsResolved: number
  }
}

export interface ReportHighlight {
  type: 'milestone' | 'achievement' | 'improvement'
  title: string
  description: string
  projectName?: string
  date?: Date
}

export interface ReportConcern {
  type: 'overdue' | 'budget' | 'safety' | 'schedule' | 'quality'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  projectName?: string
  recommendation?: string
}

// ============================================================================
// Executive Summary Hook
// ============================================================================

/**
 * Fetch comprehensive executive summary across all projects
 */
export function useExecutiveSummary() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['executive-summary', userProfile?.company_id],
    queryFn: async (): Promise<ExecutiveSummary> => {
      if (!userProfile?.company_id) {throw new Error('No company ID')}

      const now = new Date()
      const weekStart = startOfWeek(now)

      // Fetch all data in parallel
      const [
        projectsData,
        tasksData,
        rfisData,
        submittalsData,
        changeOrdersData,
        punchItemsData,
        safetyData,
        lastWeekTasks,
        lastWeekRfis,
        lastWeekSubmittals,
        lastWeekPunch,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, status, budget, start_date, target_end_date')
          .eq('company_id', userProfile.company_id)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        supabase
          .from('tasks')
          .select('id, status, due_date, completed_at')
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        supabase
          .from('rfis')
          .select('id, status, date_required, created_at, closed_at')
          .eq('company_id', userProfile.company_id)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        supabase
          .from('submittals')
          .select('id, status, required_date, created_at')
          .eq('company_id', userProfile.company_id)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        supabase
          .from('change_orders')
          .select('id, status, proposed_amount, approved_amount')
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        supabase
          .from('punch_items')
          .select('id, status, completed_at')
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        supabase
          .from('safety_incidents')
          .select('id, status, incident_date, is_osha_recordable')
          .eq('company_id', userProfile.company_id)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        supabase
          .from('tasks')
          .select('id')
          .eq('status', 'completed')
          .gte('completed_at', weekStart.toISOString())
          .lte('completed_at', now.toISOString())
          .then(({ data }) => data || []),

        supabase
          .from('rfis')
          .select('id')
          .eq('status', 'closed')
          .gte('closed_at', weekStart.toISOString())
          .lte('closed_at', now.toISOString())
          .then(({ data }) => data || []),

        supabase
          .from('submittals')
          .select('id')
          .in('status', ['approved', 'approved_as_noted'])
          .gte('updated_at', weekStart.toISOString())
          .lte('updated_at', now.toISOString())
          .then(({ data }) => data || []),

        supabase
          .from('punch_items')
          .select('id')
          .in('status', ['completed', 'verified'])
          .gte('completed_at', weekStart.toISOString())
          .lte('completed_at', now.toISOString())
          .then(({ data }) => data || []),
      ])

      const activeProjects = projectsData.filter((p) => p.status === 'active')
      const totalBudget = projectsData.reduce((sum, p) => sum + (p.budget || 0), 0)

      const completedTasks = tasksData.filter((t) => t.status === 'completed').length
      const totalTasks = tasksData.length
      const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      const openRFIs = rfisData.filter((r) => !['closed', 'void'].includes(r.status)).length
      const overdueRFIs = rfisData.filter(
        (r) => r.date_required && new Date(r.date_required) < now && !['closed', 'void'].includes(r.status)
      ).length

      const openSubmittals = submittalsData.filter(
        (s) => !['approved', 'approved_as_noted', 'rejected'].includes(s.status)
      ).length
      const overdueSubmittals = submittalsData.filter(
        (s) => s.required_date && new Date(s.required_date) < now && !['approved', 'approved_as_noted', 'rejected'].includes(s.status)
      ).length

      const openChangeOrders = changeOrdersData.filter((c) => !['approved', 'rejected'].includes(c.status)).length
      const totalCOValue = changeOrdersData.filter((c) => c.status === 'approved').reduce((sum, c) => sum + (c.approved_amount || 0), 0)

      const openPunchItems = punchItemsData.filter((p) => !['completed', 'verified'].includes(p.status)).length

      const safetyIncidents = safetyData.length
      const lastIncident = safetyData.filter((s) => s.incident_date).sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())[0]
      const daysSinceLastIncident = lastIncident ? differenceInDays(now, new Date(lastIncident.incident_date)) : 365

      const scheduleStatus = { onTrack: 0, atRisk: 0, behind: 0, ahead: 0 }
      for (const project of activeProjects) {
        if (!project.target_end_date) {continue}
        const daysToEnd = differenceInDays(new Date(project.target_end_date), now)
        if (daysToEnd < -7) {scheduleStatus.behind++}
        else if (daysToEnd < 7) {scheduleStatus.atRisk++}
        else if (daysToEnd > 30) {scheduleStatus.ahead++}
        else {scheduleStatus.onTrack++}
      }

      const highlights: ReportHighlight[] = []
      if (daysSinceLastIncident >= 30) {
        highlights.push({ type: 'achievement', title: `${daysSinceLastIncident} Days Without Incident`, description: 'Excellent safety record.' })
      }
      if (lastWeekTasks.length >= 10) {
        highlights.push({ type: 'achievement', title: `${lastWeekTasks.length} Tasks Completed This Week`, description: 'Strong productivity.' })
      }

      const concerns: ReportConcern[] = []
      if (overdueRFIs > 5) {
        concerns.push({ type: 'overdue', severity: overdueRFIs > 10 ? 'high' : 'medium', title: `${overdueRFIs} Overdue RFIs`, description: 'RFIs past response date.', recommendation: 'Prioritize RFI responses.' })
      }
      if (overdueSubmittals > 3) {
        concerns.push({ type: 'overdue', severity: overdueSubmittals > 8 ? 'high' : 'medium', title: `${overdueSubmittals} Overdue Submittals`, description: 'Submittals past required date.', recommendation: 'Expedite critical items.' })
      }
      if (scheduleStatus.behind > 0) {
        concerns.push({ type: 'schedule', severity: 'high', title: `${scheduleStatus.behind} Project(s) Behind`, description: 'Projects past planned completion.', recommendation: 'Develop recovery plans.' })
      }

      return {
        reportDate: now,
        dateRange: { start: weekStart, end: now },
        projectCount: projectsData.length,
        activeProjects: activeProjects.length,
        overallProgress,
        budgetSummary: { totalBudget, totalSpent: 0, variance: 0, percentUsed: 0 },
        scheduleSummary: scheduleStatus,
        keyMetrics: { openRFIs, overdueRFIs, openSubmittals, overdueSubmittals, openChangeOrders, totalCOValue, openPunchItems, safetyIncidents, daysSinceLastIncident },
        highlights,
        concerns,
        weeklyComparison: { rfisClosed: lastWeekRfis.length, submittalsClosed: lastWeekSubmittals.length, tasksCompleted: lastWeekTasks.length, punchItemsResolved: lastWeekPunch.length },
      }
    },
    enabled: !!userProfile?.company_id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch project health report
 */
export function useProjectHealthReport(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'project-health', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      return getProjectHealthReport(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch daily report analytics for a date range
 */
export function useDailyReportAnalytics(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: ['reports', 'daily-analytics', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId || !startDate || !endDate) {
        throw new Error('Project ID and date range required')
      }
      return getDailyReportAnalytics(projectId, startDate, endDate)
    },
    enabled: !!projectId && !!startDate && !!endDate,
  })
}

/**
 * Fetch workflow (RFI, Change Order, Submittal) summary
 */
export function useWorkflowSummary(projectId: string | undefined, workflowType: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'workflow-summary', projectId, workflowType],
    queryFn: async () => {
      if (!projectId || !workflowType) {
        throw new Error('Project ID and workflow type required')
      }
      return getWorkflowSummary(projectId, workflowType)
    },
    enabled: !!projectId && !!workflowType,
  })
}

/**
 * Fetch punch list report
 */
export function usePunchListReport(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'punch-list', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      return getPunchListReport(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch safety incident report
 */
export function useSafetyIncidentReport(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: ['reports', 'safety-incidents', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId || !startDate || !endDate) {
        throw new Error('Project ID and date range required')
      }
      return getSafetyIncidentReport(projectId, startDate, endDate)
    },
    enabled: !!projectId && !!startDate && !!endDate,
  })
}

/**
 * Fetch financial summary
 */
export function useFinancialSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'financial', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      return getFinancialSummary(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch document summary
 */
export function useDocumentSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'documents', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      return getDocumentSummary(projectId)
    },
    enabled: !!projectId,
  })
}
