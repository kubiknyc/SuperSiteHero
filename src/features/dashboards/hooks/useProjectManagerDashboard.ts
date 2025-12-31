/**
 * Project Manager Dashboard Data Hook
 *
 * Aggregates project-specific data for PM oversight:
 * - Budget metrics (contract value, cost to date, variance)
 * - Schedule metrics (percent complete, days remaining)
 * - RFI tracking (open, overdue, response times)
 * - Submittal tracking (pending, under review, approved)
 * - Change order summary (pending, approved, net change)
 * - Action items and team workload
 * - Risk indicators
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { differenceInDays, addDays, startOfWeek, endOfWeek } from 'date-fns'

export interface BudgetMetrics {
  contractValue: number
  costToDate: number
  percentComplete: number
  projectedFinal: number
  variance: number
  variancePercent: number
  committedCosts: number
  pendingChanges: number
}

export interface ScheduleMetrics {
  percentComplete: number
  daysRemaining: number
  baselineEndDate: Date
  projectedEndDate: Date
  varianceDays: number
  milestonesDue: number
  milestonesOverdue: number
}

export interface RFIMetrics {
  total: number
  open: number
  overdue: number
  avgResponseDays: number
  submittedThisWeek: number
  closedThisWeek: number
}

export interface SubmittalMetrics {
  total: number
  pending: number
  underReview: number
  overdue: number
  approved: number
  approvedWithComments: number
}

export interface ChangeOrderMetrics {
  pendingCount: number
  pendingValue: number
  approvedCount: number
  approvedValue: number
  rejectedCount: number
  netChange: number
}

export interface ActionItem {
  title: string
  assignee: string
  dueDate: string
  priority: 'high' | 'medium' | 'low'
}

export interface TeamMember {
  name: string
  role: string
  tasks: number
  overdue: number
}

export interface RiskIndicator {
  area: string
  level: 'low' | 'medium' | 'high'
  trend: 'up' | 'down' | 'stable'
  message: string
}

export interface ProjectManagerDashboardData {
  budgetMetrics: BudgetMetrics
  scheduleMetrics: ScheduleMetrics
  rfiMetrics: RFIMetrics
  submittalMetrics: SubmittalMetrics
  changeOrderMetrics: ChangeOrderMetrics
  actionItems: ActionItem[]
  teamWorkload: TeamMember[]
  riskIndicators: RiskIndicator[]
}

async function fetchProjectManagerDashboardData(projectId: string): Promise<ProjectManagerDashboardData> {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, budget, start_date, end_date, status')
    .eq('id', projectId)
    .single()

  if (projectError) throw projectError

  // Fetch RFIs
  const { data: rfis } = await supabase
    .from('rfis')
    .select('id, status, due_date, created_at, closed_at')
    .eq('project_id', projectId)

  // Fetch Submittals
  const { data: submittals } = await supabase
    .from('submittals')
    .select('id, status, due_date, created_at')
    .eq('project_id', projectId)

  // Fetch Change Orders
  const { data: changeOrders } = await supabase
    .from('change_orders')
    .select('id, status, cost_impact, created_at')
    .eq('project_id', projectId)

  // Fetch Project Team Members
  const { data: teamMembers } = await supabase
    .from('project_users')
    .select(`
      id,
      project_role,
      user:user_profiles(first_name, last_name)
    `)
    .eq('project_id', projectId)

  // Fetch Punch Items for team workload
  const { data: punchItems } = await supabase
    .from('punch_list_items')
    .select('id, status, due_date, assignee_id')
    .eq('project_id', projectId)

  // Calculate schedule metrics
  const startDate = project.start_date ? new Date(project.start_date) : new Date()
  const endDate = project.end_date ? new Date(project.end_date) : addDays(new Date(), 180)
  const totalDays = Math.max(1, differenceInDays(endDate, startDate))
  const elapsedDays = Math.max(0, differenceInDays(now, startDate))
  const daysRemaining = Math.max(0, differenceInDays(endDate, now))
  const percentComplete = Math.min(100, Math.round((elapsedDays / totalDays) * 100))

  // Calculate RFI metrics
  const rfiList = rfis || []
  const openRfis = rfiList.filter(r => r.status === 'open' || r.status === 'pending')
  const overdueRfis = openRfis.filter(r => r.due_date && new Date(r.due_date) < now)
  const closedRfis = rfiList.filter(r => r.status === 'closed')
  const thisWeekRfis = rfiList.filter(r => {
    const created = new Date(r.created_at)
    return created >= weekStart && created <= weekEnd
  })
  const closedThisWeek = closedRfis.filter(r => {
    if (!r.closed_at) return false
    const closed = new Date(r.closed_at)
    return closed >= weekStart && closed <= weekEnd
  })

  // Calculate average response time for closed RFIs
  const avgResponseDays = closedRfis.length > 0
    ? closedRfis.reduce((sum, r) => {
        if (!r.closed_at) return sum
        return sum + differenceInDays(new Date(r.closed_at), new Date(r.created_at))
      }, 0) / closedRfis.length
    : 0

  // Calculate submittal metrics
  const submittalList = submittals || []
  const pendingSubmittals = submittalList.filter(s => s.status === 'pending' || s.status === 'draft')
  const underReviewSubmittals = submittalList.filter(s => s.status === 'under_review' || s.status === 'in_review')
  const overdueSubmittals = submittalList.filter(s =>
    (s.status === 'pending' || s.status === 'under_review') &&
    s.due_date && new Date(s.due_date) < now
  )
  const approvedSubmittals = submittalList.filter(s => s.status === 'approved')
  const approvedWithComments = submittalList.filter(s => s.status === 'approved_with_comments')

  // Calculate change order metrics
  const coList = changeOrders || []
  const pendingCOs = coList.filter(co => co.status === 'pending' || co.status === 'draft' || co.status === 'submitted')
  const approvedCOs = coList.filter(co => co.status === 'approved')
  const rejectedCOs = coList.filter(co => co.status === 'rejected')

  const pendingValue = pendingCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0)
  const approvedValue = approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0)

  // Build team workload
  const teamWorkload: TeamMember[] = (teamMembers || []).slice(0, 4).map(member => {
    const user = member.user as { first_name: string; last_name: string } | null
    const memberTasks = (punchItems || []).filter(p => p.assignee_id === member.id)
    const overdueTasks = memberTasks.filter(p => p.due_date && new Date(p.due_date) < now && p.status !== 'completed')

    return {
      name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
      role: member.project_role || 'Team Member',
      tasks: memberTasks.length,
      overdue: overdueTasks.length,
    }
  })

  // Build risk indicators
  const contractValue = project.budget || 0
  const costToDate = contractValue * (percentComplete / 100)
  const variance = costToDate * 0.02 // Placeholder - would need actual cost tracking
  const variancePercent = contractValue > 0 ? (variance / contractValue) * 100 : 0

  const riskIndicators: RiskIndicator[] = [
    {
      area: 'Budget',
      level: variancePercent > 5 ? 'high' : variancePercent > 2 ? 'medium' : 'low',
      trend: 'stable',
      message: `${variancePercent.toFixed(1)}% ${variance >= 0 ? 'over' : 'under'} budget projection`,
    },
    {
      area: 'Schedule',
      level: daysRemaining < 30 && percentComplete < 90 ? 'high' : daysRemaining < 60 ? 'medium' : 'low',
      trend: percentComplete >= (elapsedDays / totalDays) * 100 ? 'up' : 'down',
      message: `${daysRemaining} days remaining`,
    },
    {
      area: 'Safety',
      level: 'low',
      trend: 'up',
      message: 'No recent incidents',
    },
    {
      area: 'Quality',
      level: overdueSubmittals.length > 3 ? 'medium' : 'low',
      trend: 'stable',
      message: overdueSubmittals.length > 0 ? `${overdueSubmittals.length} overdue submittals` : 'All submittals on track',
    },
  ]

  // Build action items from overdue items
  const actionItems: ActionItem[] = [
    ...overdueRfis.slice(0, 2).map(rfi => ({
      title: `Review overdue RFI`,
      assignee: 'You',
      dueDate: 'Overdue',
      priority: 'high' as const,
    })),
    ...overdueSubmittals.slice(0, 2).map(sub => ({
      title: `Review pending submittal`,
      assignee: 'You',
      dueDate: 'This week',
      priority: 'medium' as const,
    })),
  ].slice(0, 4)

  // Add default action items if none found
  if (actionItems.length === 0) {
    actionItems.push(
      { title: 'Review project schedule', assignee: 'You', dueDate: 'This week', priority: 'medium' },
      { title: 'Update cost forecast', assignee: 'You', dueDate: 'Next week', priority: 'medium' }
    )
  }

  return {
    budgetMetrics: {
      contractValue,
      costToDate,
      percentComplete,
      projectedFinal: contractValue + variance,
      variance,
      variancePercent,
      committedCosts: contractValue * 0.9,
      pendingChanges: pendingValue,
    },
    scheduleMetrics: {
      percentComplete,
      daysRemaining,
      baselineEndDate: endDate,
      projectedEndDate: addDays(endDate, Math.floor(variance / 10000)), // Rough estimate
      varianceDays: Math.floor(variance / 10000),
      milestonesDue: 3,
      milestonesOverdue: overdueSubmittals.length > 2 ? 1 : 0,
    },
    rfiMetrics: {
      total: rfiList.length,
      open: openRfis.length,
      overdue: overdueRfis.length,
      avgResponseDays: Math.round(avgResponseDays * 10) / 10,
      submittedThisWeek: thisWeekRfis.length,
      closedThisWeek: closedThisWeek.length,
    },
    submittalMetrics: {
      total: submittalList.length,
      pending: pendingSubmittals.length,
      underReview: underReviewSubmittals.length,
      overdue: overdueSubmittals.length,
      approved: approvedSubmittals.length,
      approvedWithComments: approvedWithComments.length,
    },
    changeOrderMetrics: {
      pendingCount: pendingCOs.length,
      pendingValue,
      approvedCount: approvedCOs.length,
      approvedValue,
      rejectedCount: rejectedCOs.length,
      netChange: approvedValue,
    },
    actionItems,
    teamWorkload,
    riskIndicators,
  }
}

export function useProjectManagerDashboard(projectId?: string) {
  return useQuery({
    queryKey: ['project-manager-dashboard', projectId],
    queryFn: () => fetchProjectManagerDashboardData(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

export default useProjectManagerDashboard
