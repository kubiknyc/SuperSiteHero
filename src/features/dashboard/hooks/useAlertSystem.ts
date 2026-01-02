/**
 * Alert System Hook
 * Aggregates and prioritizes alerts from multiple sources:
 * - Overdue items (RFIs, submittals, tasks)
 * - Expiring insurance/certifications
 * - Budget warnings
 * - Safety incidents
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { isPast, differenceInDays, addDays } from 'date-fns'

// ============================================================================
// Types
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertCategory =
  | 'overdue'
  | 'expiring'
  | 'budget'
  | 'safety'
  | 'compliance'
  | 'schedule'
  | 'weather'

export interface SystemAlert {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  message: string
  itemType?: string
  itemId?: string
  projectId?: string
  projectName?: string
  link?: string
  dueDate?: Date
  daysOverdue?: number
  daysUntilDue?: number
  value?: number
  createdAt: Date
}

export interface AlertSummary {
  total: number
  critical: number
  warning: number
  info: number
  byCategory: Record<AlertCategory, number>
}

export interface AlertSystemData {
  alerts: SystemAlert[]
  summary: AlertSummary
}

// ============================================================================
// Alert Generation Functions
// ============================================================================

async function fetchOverdueAlerts(
  companyId: string,
  userId: string
): Promise<SystemAlert[]> {
  const alerts: SystemAlert[] = []
  const now = new Date()

  // Overdue RFIs
  const { data: overdueRFIs } = await supabase
    .from('rfis')
    .select(`
      id, rfi_number, subject, date_required, project_id,
      project:projects(name)
    `)
    .eq('company_id', companyId)
    .lt('date_required', now.toISOString())
    .not('status', 'in', '("closed","void")')
    .is('deleted_at', null)
    .limit(10)

  overdueRFIs?.forEach((rfi) => {
    const daysOverdue = differenceInDays(now, new Date(rfi.date_required))
    alerts.push({
      id: `rfi-overdue-${rfi.id}`,
      category: 'overdue',
      severity: daysOverdue > 7 ? 'critical' : 'warning',
      title: `RFI ${rfi.rfi_number} Overdue`,
      message: `"${rfi.subject}" is ${daysOverdue} days overdue`,
      itemType: 'rfi',
      itemId: rfi.id,
      projectId: rfi.project_id,
      projectName: (rfi.project as any)?.name,
      link: `/rfis/${rfi.id}`,
      dueDate: new Date(rfi.date_required),
      daysOverdue,
      createdAt: now,
    })
  })

  // Overdue Submittals
  const { data: overdueSubmittals } = await supabase
    .from('submittals')
    .select(`
      id, submittal_number, title, required_date, project_id,
      project:projects(name)
    `)
    .eq('company_id', companyId)
    .lt('required_date', now.toISOString())
    .not('status', 'in', '("approved","approved_as_noted","rejected")')
    .is('deleted_at', null)
    .limit(10)

  overdueSubmittals?.forEach((sub) => {
    const daysOverdue = differenceInDays(now, new Date(sub.required_date))
    alerts.push({
      id: `submittal-overdue-${sub.id}`,
      category: 'overdue',
      severity: daysOverdue > 14 ? 'critical' : 'warning',
      title: `Submittal ${sub.submittal_number} Overdue`,
      message: `"${sub.title}" is ${daysOverdue} days overdue`,
      itemType: 'submittal',
      itemId: sub.id,
      projectId: sub.project_id,
      projectName: (sub.project as any)?.name,
      link: `/submittals/${sub.id}`,
      dueDate: new Date(sub.required_date),
      daysOverdue,
      createdAt: now,
    })
  })

  // Overdue Tasks assigned to user
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select(`
      id, title, due_date, project_id,
      project:projects(name)
    `)
    .eq('assigned_to_user_id', userId)
    .lt('due_date', now.toISOString())
    .neq('status', 'completed')
    .is('deleted_at', null)
    .limit(10)

  overdueTasks?.forEach((task) => {
    const daysOverdue = differenceInDays(now, new Date(task.due_date))
    alerts.push({
      id: `task-overdue-${task.id}`,
      category: 'overdue',
      severity: daysOverdue > 3 ? 'critical' : 'warning',
      title: 'Task Overdue',
      message: `"${task.title}" is ${daysOverdue} days overdue`,
      itemType: 'task',
      itemId: task.id,
      projectId: task.project_id,
      projectName: (task.project as any)?.name,
      link: `/tasks/${task.id}`,
      dueDate: new Date(task.due_date),
      daysOverdue,
      createdAt: now,
    })
  })

  return alerts
}

async function fetchExpiringCertifications(
  companyId: string
): Promise<SystemAlert[]> {
  const alerts: SystemAlert[] = []
  const now = new Date()
  const thirtyDaysFromNow = addDays(now, 30)
  const sevenDaysFromNow = addDays(now, 7)

  // Check for expiring insurance/certifications
  // This assumes a 'company_certifications' or 'insurance_policies' table
  // For now, we'll query from a generic certifications table if it exists
  try {
    const { data: expiringCerts } = await supabase
      .from('certifications')
      .select('id, name, type, expiration_date, holder_name')
      .eq('company_id', companyId)
      .lte('expiration_date', thirtyDaysFromNow.toISOString())
      .gte('expiration_date', now.toISOString())
      .is('deleted_at', null)
      .limit(10)

    expiringCerts?.forEach((cert) => {
      const daysUntilExpiry = differenceInDays(new Date(cert.expiration_date), now)
      alerts.push({
        id: `cert-expiring-${cert.id}`,
        category: 'expiring',
        severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
        title: `${cert.type} Expiring Soon`,
        message: `${cert.name} expires in ${daysUntilExpiry} days`,
        itemType: 'certification',
        itemId: cert.id,
        link: `/settings/certifications/${cert.id}`,
        daysUntilDue: daysUntilExpiry,
        createdAt: now,
      })
    })
  } catch {
    // Table might not exist, skip
  }

  // Check subcontractor insurance
  try {
    const { data: expiringInsurance } = await supabase
      .from('subcontractor_insurance')
      .select(`
        id, policy_type, expiration_date,
        subcontractor:contacts(company_name)
      `)
      .lte('expiration_date', thirtyDaysFromNow.toISOString())
      .gte('expiration_date', now.toISOString())
      .limit(10)

    expiringInsurance?.forEach((ins) => {
      const daysUntilExpiry = differenceInDays(new Date(ins.expiration_date), now)
      alerts.push({
        id: `insurance-expiring-${ins.id}`,
        category: 'expiring',
        severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
        title: 'Subcontractor Insurance Expiring',
        message: `${(ins.subcontractor as any)?.company_name || 'Unknown'} - ${ins.policy_type} expires in ${daysUntilExpiry} days`,
        itemType: 'insurance',
        itemId: ins.id,
        link: '/contacts',
        daysUntilDue: daysUntilExpiry,
        createdAt: now,
      })
    })
  } catch {
    // Table might not exist, skip
  }

  return alerts
}

async function fetchBudgetAlerts(companyId: string): Promise<SystemAlert[]> {
  const alerts: SystemAlert[] = []
  const now = new Date()

  // Check project budgets
  try {
    const { data: projectBudgets } = await supabase
      .from('project_budgets')
      .select(`
        project_id, original_budget, current_budget, spent_amount,
        project:projects(name)
      `)
      .limit(20)

    projectBudgets?.forEach((budget) => {
      if (!budget.current_budget || budget.current_budget === 0) return

      const percentUsed = (budget.spent_amount / budget.current_budget) * 100

      if (percentUsed > 100) {
        alerts.push({
          id: `budget-over-${budget.project_id}`,
          category: 'budget',
          severity: 'critical',
          title: 'Budget Exceeded',
          message: `${(budget.project as any)?.name || 'Project'} is ${Math.round(percentUsed - 100)}% over budget`,
          itemType: 'budget',
          projectId: budget.project_id,
          projectName: (budget.project as any)?.name,
          link: `/projects/${budget.project_id}/budget`,
          value: budget.spent_amount - budget.current_budget,
          createdAt: now,
        })
      } else if (percentUsed > 90) {
        alerts.push({
          id: `budget-warning-${budget.project_id}`,
          category: 'budget',
          severity: 'warning',
          title: 'Budget Warning',
          message: `${(budget.project as any)?.name || 'Project'} has used ${Math.round(percentUsed)}% of budget`,
          itemType: 'budget',
          projectId: budget.project_id,
          projectName: (budget.project as any)?.name,
          link: `/projects/${budget.project_id}/budget`,
          value: budget.current_budget - budget.spent_amount,
          createdAt: now,
        })
      }
    })
  } catch {
    // Table might not exist, skip
  }

  return alerts
}

async function fetchSafetyAlerts(companyId: string): Promise<SystemAlert[]> {
  const alerts: SystemAlert[] = []
  const now = new Date()
  const thirtyDaysAgo = addDays(now, -30)

  // Recent safety incidents
  const { data: recentIncidents } = await supabase
    .from('safety_incidents')
    .select(`
      id, incident_number, title, severity, status, incident_date,
      is_osha_recordable, project_id,
      project:projects(name)
    `)
    .eq('company_id', companyId)
    .gte('incident_date', thirtyDaysAgo.toISOString())
    .in('status', ['open', 'under_investigation'])
    .is('deleted_at', null)
    .limit(10)

  recentIncidents?.forEach((incident) => {
    const isRecent = differenceInDays(now, new Date(incident.incident_date)) <= 7
    alerts.push({
      id: `safety-${incident.id}`,
      category: 'safety',
      severity: incident.is_osha_recordable || incident.severity === 'severe' ? 'critical' : 'warning',
      title: incident.is_osha_recordable ? 'OSHA Recordable Incident' : 'Safety Incident',
      message: `${incident.title || `Incident ${incident.incident_number}`} - ${incident.status}`,
      itemType: 'safety_incident',
      itemId: incident.id,
      projectId: incident.project_id,
      projectName: (incident.project as any)?.name,
      link: `/safety/incidents/${incident.id}`,
      createdAt: new Date(incident.incident_date),
    })
  })

  return alerts
}

// ============================================================================
// Main Hook
// ============================================================================

export function useAlertSystem(projectId?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['alert-system', userProfile?.company_id, userProfile?.id, projectId],
    queryFn: async (): Promise<AlertSystemData> => {
      if (!userProfile?.company_id || !userProfile?.id) {
        throw new Error('User not authenticated')
      }

      // Fetch all alerts in parallel
      const [overdueAlerts, expiringAlerts, budgetAlerts, safetyAlerts] = await Promise.all([
        fetchOverdueAlerts(userProfile.company_id, userProfile.id),
        fetchExpiringCertifications(userProfile.company_id),
        fetchBudgetAlerts(userProfile.company_id),
        fetchSafetyAlerts(userProfile.company_id),
      ])

      // Combine and sort by severity, then date
      let allAlerts = [
        ...overdueAlerts,
        ...expiringAlerts,
        ...budgetAlerts,
        ...safetyAlerts,
      ]

      // Filter by project if specified
      if (projectId) {
        allAlerts = allAlerts.filter(
          (alert) => !alert.projectId || alert.projectId === projectId
        )
      }

      // Sort: critical first, then warning, then info; within same severity, by date
      const severityOrder: Record<AlertSeverity, number> = {
        critical: 0,
        warning: 1,
        info: 2,
      }

      allAlerts.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
        if (severityDiff !== 0) return severityDiff
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

      // Calculate summary
      const summary: AlertSummary = {
        total: allAlerts.length,
        critical: allAlerts.filter((a) => a.severity === 'critical').length,
        warning: allAlerts.filter((a) => a.severity === 'warning').length,
        info: allAlerts.filter((a) => a.severity === 'info').length,
        byCategory: {
          overdue: allAlerts.filter((a) => a.category === 'overdue').length,
          expiring: allAlerts.filter((a) => a.category === 'expiring').length,
          budget: allAlerts.filter((a) => a.category === 'budget').length,
          safety: allAlerts.filter((a) => a.category === 'safety').length,
          compliance: allAlerts.filter((a) => a.category === 'compliance').length,
          schedule: allAlerts.filter((a) => a.category === 'schedule').length,
          weather: allAlerts.filter((a) => a.category === 'weather').length,
        },
      }

      return {
        alerts: allAlerts,
        summary,
      }
    },
    enabled: !!userProfile?.company_id && !!userProfile?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  })
}

export default useAlertSystem
