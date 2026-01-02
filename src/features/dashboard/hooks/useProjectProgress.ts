// File: /src/features/dashboard/hooks/useProjectProgress.ts
// Calculate real project progress from multiple data sources

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

export interface ProjectProgressMetrics {
  overall: number // 0-100 percentage
  byCategory: {
    tasks: { completed: number; total: number; percentage: number }
    milestones: { completed: number; total: number; percentage: number }
    submittals: { approved: number; total: number; percentage: number }
    punchItems: { resolved: number; total: number; percentage: number }
  }
  budget: {
    spent: number
    total: number
    percentage: number
    variance: number // positive = under budget, negative = over budget
  }
  schedule: {
    plannedCompletion: Date | null
    projectedCompletion: Date | null
    daysVariance: number // positive = ahead, negative = behind
    status: 'on-track' | 'at-risk' | 'behind' | 'ahead'
  }
  healthScore: {
    value: number // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    factors: HealthFactor[]
  }
}

export interface HealthFactor {
  name: string
  score: number
  weight: number
  status: 'positive' | 'neutral' | 'negative'
  message: string
}

export interface ProjectProgressSummary {
  projectId: string
  projectName: string
  progress: number
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  tasksCompleted: number
  tasksTotal: number
  openIssues: number
  daysRemaining: number | null
}

// ============================================================================
// Progress Calculation Logic
// ============================================================================

function calculateHealthScore(metrics: {
  taskCompletionRate: number
  overdueItemCount: number
  budgetVariance: number
  scheduleVariance: number
  openRFIs: number
  openPunchItems: number
}): { value: number; status: ProjectProgressMetrics['healthScore']['status']; factors: HealthFactor[] } {
  const factors: HealthFactor[] = []

  // Task completion factor (weight: 30%)
  const taskScore = metrics.taskCompletionRate * 100
  factors.push({
    name: 'Task Completion',
    score: taskScore,
    weight: 0.3,
    status: taskScore >= 70 ? 'positive' : taskScore >= 40 ? 'neutral' : 'negative',
    message: taskScore >= 70 ? 'Tasks progressing well' : taskScore >= 40 ? 'Task completion needs attention' : 'Significant task backlog',
  })

  // Overdue items factor (weight: 25%)
  const overdueScore = Math.max(0, 100 - metrics.overdueItemCount * 10)
  factors.push({
    name: 'Overdue Items',
    score: overdueScore,
    weight: 0.25,
    status: overdueScore >= 80 ? 'positive' : overdueScore >= 50 ? 'neutral' : 'negative',
    message: overdueScore >= 80 ? 'Few overdue items' : overdueScore >= 50 ? 'Some items overdue' : 'Many overdue items need attention',
  })

  // Budget factor (weight: 20%)
  const budgetScore = metrics.budgetVariance >= 0 ? 100 : Math.max(0, 100 + metrics.budgetVariance * 2)
  factors.push({
    name: 'Budget Health',
    score: budgetScore,
    weight: 0.2,
    status: budgetScore >= 80 ? 'positive' : budgetScore >= 50 ? 'neutral' : 'negative',
    message: budgetScore >= 80 ? 'Within budget' : budgetScore >= 50 ? 'Budget variance detected' : 'Over budget',
  })

  // Schedule factor (weight: 15%)
  const scheduleScore = metrics.scheduleVariance >= 0 ? 100 : Math.max(0, 100 + metrics.scheduleVariance * 5)
  factors.push({
    name: 'Schedule',
    score: scheduleScore,
    weight: 0.15,
    status: scheduleScore >= 80 ? 'positive' : scheduleScore >= 50 ? 'neutral' : 'negative',
    message: scheduleScore >= 80 ? 'On schedule' : scheduleScore >= 50 ? 'Schedule at risk' : 'Behind schedule',
  })

  // Open issues factor (weight: 10%)
  const issueCount = metrics.openRFIs + metrics.openPunchItems
  const issueScore = Math.max(0, 100 - issueCount * 2)
  factors.push({
    name: 'Open Issues',
    score: issueScore,
    weight: 0.1,
    status: issueScore >= 80 ? 'positive' : issueScore >= 50 ? 'neutral' : 'negative',
    message: issueScore >= 80 ? 'Low issue count' : issueScore >= 50 ? 'Moderate issues' : 'High issue count',
  })

  // Calculate weighted score
  const weightedScore = factors.reduce((acc, f) => acc + f.score * f.weight, 0)

  // Determine status
  let status: ProjectProgressMetrics['healthScore']['status']
  if (weightedScore >= 85) status = 'excellent'
  else if (weightedScore >= 70) status = 'good'
  else if (weightedScore >= 50) status = 'fair'
  else if (weightedScore >= 30) status = 'poor'
  else status = 'critical'

  return { value: Math.round(weightedScore), status, factors }
}

function calculateScheduleStatus(
  daysVariance: number
): ProjectProgressMetrics['schedule']['status'] {
  if (daysVariance > 7) return 'ahead'
  if (daysVariance >= -7) return 'on-track'
  if (daysVariance >= -30) return 'at-risk'
  return 'behind'
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Calculate comprehensive project progress metrics
 */
export function useProjectProgress(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: async (): Promise<ProjectProgressMetrics> => {
      if (!projectId) throw new Error('Project ID required')

      // Fetch all relevant data in parallel
      const [
        projectData,
        tasksData,
        milestonesData,
        submittalsData,
        punchItemsData,
        rfisData,
        changeOrdersData,
        budgetData,
      ] = await Promise.all([
        // Project details
        supabase
          .from('projects')
          .select('id, name, start_date, target_end_date, actual_end_date, budget, status')
          .eq('id', projectId)
          .single()
          .then(({ data }) => data),

        // Tasks
        supabase
          .from('tasks')
          .select('id, status, due_date')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Milestones (tasks with is_milestone flag or separate milestones table)
        supabase
          .from('tasks')
          .select('id, status, due_date')
          .eq('project_id', projectId)
          .eq('is_milestone', true)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Submittals
        supabase
          .from('submittals')
          .select('id, status')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Punch items
        supabase
          .from('punch_items')
          .select('id, status')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // RFIs
        supabase
          .from('rfis')
          .select('id, status')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Change Orders for budget impact
        supabase
          .from('change_orders')
          .select('id, status, approved_amount')
          .eq('project_id', projectId)
          .eq('status', 'approved')
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Budget tracking (if exists)
        supabase
          .from('project_budgets')
          .select('original_budget, current_budget, spent_amount')
          .eq('project_id', projectId)
          .single()
          .then(({ data }) => data),
      ])

      // Calculate task progress
      const completedTasks = tasksData.filter((t) => t.status === 'completed').length
      const totalTasks = tasksData.length
      const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Calculate milestone progress
      const completedMilestones = milestonesData.filter((m) => m.status === 'completed').length
      const totalMilestones = milestonesData.length
      const milestonePercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 100

      // Calculate submittal progress
      const approvedSubmittals = submittalsData.filter((s) =>
        ['approved', 'approved_as_noted'].includes(s.status)
      ).length
      const totalSubmittals = submittalsData.length
      const submittalPercentage = totalSubmittals > 0 ? Math.round((approvedSubmittals / totalSubmittals) * 100) : 100

      // Calculate punch item progress
      const resolvedPunchItems = punchItemsData.filter((p) =>
        ['completed', 'verified'].includes(p.status)
      ).length
      const totalPunchItems = punchItemsData.length
      const punchPercentage = totalPunchItems > 0 ? Math.round((resolvedPunchItems / totalPunchItems) * 100) : 100

      // Calculate overall progress (weighted average)
      // Tasks: 50%, Milestones: 25%, Submittals: 15%, Punch Items: 10%
      const overallProgress = Math.round(
        taskPercentage * 0.5 +
          milestonePercentage * 0.25 +
          submittalPercentage * 0.15 +
          punchPercentage * 0.1
      )

      // Calculate budget metrics
      const originalBudget = budgetData?.original_budget || projectData?.budget || 0
      const approvedCOs = changeOrdersData.reduce((sum, co) => sum + (co.approved_amount || 0), 0)
      const currentBudget = originalBudget + approvedCOs
      const spentAmount = budgetData?.spent_amount || 0
      const budgetPercentage = currentBudget > 0 ? Math.round((spentAmount / currentBudget) * 100) : 0
      const budgetVariance = currentBudget - spentAmount

      // Calculate schedule metrics
      const now = new Date()
      const plannedCompletion = projectData?.target_end_date
        ? new Date(projectData.target_end_date)
        : null

      // Estimate projected completion based on progress rate
      let projectedCompletion: Date | null = null
      let daysVariance = 0

      if (plannedCompletion && totalTasks > 0) {
        const startDate = projectData?.start_date ? new Date(projectData.start_date) : now
        const elapsedDays = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        const progressRate = overallProgress / elapsedDays

        if (progressRate > 0) {
          const daysRemaining = Math.ceil((100 - overallProgress) / progressRate)
          projectedCompletion = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
          daysVariance = Math.floor((plannedCompletion.getTime() - projectedCompletion.getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      // Count overdue items
      const overdueItemCount =
        tasksData.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length +
        punchItemsData.filter((p) => !['completed', 'verified'].includes(p.status)).length

      // Count open RFIs and punch items
      const openRFIs = rfisData.filter((r) => !['closed', 'void'].includes(r.status)).length
      const openPunchItems = punchItemsData.filter((p) => !['completed', 'verified'].includes(p.status)).length

      // Calculate health score
      const healthScore = calculateHealthScore({
        taskCompletionRate: totalTasks > 0 ? completedTasks / totalTasks : 1,
        overdueItemCount,
        budgetVariance: originalBudget > 0 ? (budgetVariance / originalBudget) * 100 : 0,
        scheduleVariance: daysVariance,
        openRFIs,
        openPunchItems,
      })

      return {
        overall: overallProgress,
        byCategory: {
          tasks: {
            completed: completedTasks,
            total: totalTasks,
            percentage: taskPercentage,
          },
          milestones: {
            completed: completedMilestones,
            total: totalMilestones,
            percentage: milestonePercentage,
          },
          submittals: {
            approved: approvedSubmittals,
            total: totalSubmittals,
            percentage: submittalPercentage,
          },
          punchItems: {
            resolved: resolvedPunchItems,
            total: totalPunchItems,
            percentage: punchPercentage,
          },
        },
        budget: {
          spent: spentAmount,
          total: currentBudget,
          percentage: budgetPercentage,
          variance: budgetVariance,
        },
        schedule: {
          plannedCompletion,
          projectedCompletion,
          daysVariance,
          status: calculateScheduleStatus(daysVariance),
        },
        healthScore,
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Get progress summaries for multiple projects (for dashboard)
 */
export function useProjectsProgress(projectIds: string[]) {
  return useQuery({
    queryKey: ['projects-progress', projectIds],
    queryFn: async (): Promise<ProjectProgressSummary[]> => {
      if (projectIds.length === 0) return []

      const summaries: ProjectProgressSummary[] = []

      // Fetch data for all projects in parallel
      const [projectsData, tasksData, issuesData] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, target_end_date')
          .in('id', projectIds)
          .then(({ data }) => data || []),

        supabase
          .from('tasks')
          .select('id, status, project_id')
          .in('project_id', projectIds)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Count open RFIs, punch items, submittals
        Promise.all([
          supabase
            .from('rfis')
            .select('id, project_id')
            .in('project_id', projectIds)
            .not('status', 'in', '("closed","void")')
            .then(({ data }) => data || []),
          supabase
            .from('punch_items')
            .select('id, project_id')
            .in('project_id', projectIds)
            .not('status', 'in', '("completed","verified")')
            .then(({ data }) => data || []),
        ]),
      ])

      const [rfisData, punchData] = issuesData

      // Calculate progress for each project
      for (const project of projectsData) {
        const projectTasks = tasksData.filter((t) => t.project_id === project.id)
        const completedTasks = projectTasks.filter((t) => t.status === 'completed').length
        const totalTasks = projectTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        const openIssues =
          rfisData.filter((r) => r.project_id === project.id).length +
          punchData.filter((p) => p.project_id === project.id).length

        // Calculate days remaining
        let daysRemaining: number | null = null
        if (project.target_end_date) {
          const endDate = new Date(project.target_end_date)
          const now = new Date()
          daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }

        // Determine health status based on progress and issues
        let healthStatus: ProjectProgressSummary['healthStatus']
        if (progress >= 80 && openIssues < 5) healthStatus = 'excellent'
        else if (progress >= 60 && openIssues < 15) healthStatus = 'good'
        else if (progress >= 40 && openIssues < 30) healthStatus = 'fair'
        else if (progress >= 20) healthStatus = 'poor'
        else healthStatus = 'critical'

        summaries.push({
          projectId: project.id,
          projectName: project.name,
          progress,
          healthStatus,
          tasksCompleted: completedTasks,
          tasksTotal: totalTasks,
          openIssues,
          daysRemaining,
        })
      }

      return summaries
    },
    enabled: projectIds.length > 0,
    staleTime: 1000 * 60 * 2,
  })
}

export default useProjectProgress
