// File: /src/features/dashboard/hooks/useDashboardStats.ts
// Dashboard statistics hooks - fetches real data from all modules

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { isPast, differenceInDays, subDays } from 'date-fns'

// Types for dashboard statistics
export interface DashboardStats {
  tasks: {
    pending: number
    inProgress: number
    completed: number
    overdue: number
    total: number
    trend: number[] // Last 5 data points
  }
  rfis: {
    open: number
    pendingResponse: number
    responded: number
    overdue: number
    total: number
    trend: number[]
  }
  punchItems: {
    open: number
    inProgress: number
    completed: number
    verified: number
    total: number
    trend: number[]
  }
  safety: {
    daysSinceIncident: number
    totalIncidents: number
    openIncidents: number
    oshaRecordable: number
    trend: number[]
  }
  changeOrders: {
    pending: number
    approved: number
    rejected: number
    totalValue: number
    trend: number[]
  }
  submittals: {
    pending: number
    approved: number
    rejected: number
    overdue: number
    total: number
    trend: number[]
  }
}

export interface ActionItem {
  id: string
  type: 'task' | 'rfi' | 'punch_item' | 'change_order' | 'submittal' | 'safety'
  title: string
  description: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  dueDate: string | null
  isOverdue: boolean
  projectId: string
  projectName: string
  link: string
  assignedTo?: string
  ballInCourt?: string
}

/**
 * Fetch comprehensive dashboard statistics for the current user
 */
export function useDashboardStats(projectId?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['dashboard-stats', projectId, userProfile?.company_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }

      const now = new Date()
      const companyId = userProfile.company_id

      // Fetch all data in parallel for performance
      const [
        tasksResult,
        rfisResult,
        punchItemsResult,
        incidentsResult,
        changeOrdersResult,
        submittalsResult,
      ] = await Promise.all([
        // Tasks
        supabase
          .from('tasks')
          .select('id, status, due_date, created_at')
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // RFIs
        supabase
          .from('rfis')
          .select('id, status, date_required, created_at')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Punch Items
        supabase
          .from('punch_items')
          .select('id, status, created_at')
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Safety Incidents
        supabase
          .from('safety_incidents')
          .select('id, status, incident_date, is_osha_recordable, created_at')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Change Orders
        supabase
          .from('change_orders')
          .select('id, status, proposed_amount, approved_amount, created_at')
          .is('deleted_at', null)
          .then(({ data }) => data || []),

        // Submittals
        supabase
          .from('submittals')
          .select('id, status, required_date, created_at')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .then(({ data }) => data || []),
      ])

      // Calculate task stats
      const taskStats = {
        pending: tasksResult.filter((t) => t.status === 'pending').length,
        inProgress: tasksResult.filter((t) => t.status === 'in_progress').length,
        completed: tasksResult.filter((t) => t.status === 'completed').length,
        overdue: tasksResult.filter(
          (t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed'
        ).length,
        total: tasksResult.length,
        trend: calculateTrend(tasksResult, 'pending'),
      }

      // Calculate RFI stats
      const rfiStats = {
        open: rfisResult.filter((r) => ['draft', 'open'].includes(r.status)).length,
        pendingResponse: rfisResult.filter((r) => r.status === 'pending_response').length,
        responded: rfisResult.filter((r) => r.status === 'responded').length,
        overdue: rfisResult.filter(
          (r) => r.date_required && isPast(new Date(r.date_required)) && !['closed', 'void'].includes(r.status)
        ).length,
        total: rfisResult.length,
        trend: calculateTrend(rfisResult, 'open'),
      }

      // Calculate punch item stats
      const punchStats = {
        open: punchItemsResult.filter((p) => p.status === 'open').length,
        inProgress: punchItemsResult.filter((p) => ['in_progress', 'ready_for_review'].includes(p.status)).length,
        completed: punchItemsResult.filter((p) => p.status === 'completed').length,
        verified: punchItemsResult.filter((p) => p.status === 'verified').length,
        total: punchItemsResult.length,
        trend: calculateTrend(punchItemsResult, 'open'),
      }

      // Calculate safety stats
      const lastIncident = incidentsResult
        .filter((i) => i.incident_date)
        .sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())[0]

      const daysSince = lastIncident
        ? differenceInDays(now, new Date(lastIncident.incident_date))
        : 365 // Default to 365 if no incidents

      const safetyStats = {
        daysSinceIncident: daysSince,
        totalIncidents: incidentsResult.length,
        openIncidents: incidentsResult.filter((i) => i.status === 'open' || i.status === 'under_investigation').length,
        oshaRecordable: incidentsResult.filter((i) => i.is_osha_recordable).length,
        trend: Array.from({ length: 5 }, (_, i) => daysSince - (4 - i)), // Incrementing days
      }

      // Calculate change order stats
      const coStats = {
        pending: changeOrdersResult.filter((c) => ['draft', 'pending', 'submitted'].includes(c.status)).length,
        approved: changeOrdersResult.filter((c) => c.status === 'approved').length,
        rejected: changeOrdersResult.filter((c) => c.status === 'rejected').length,
        totalValue: changeOrdersResult
          .filter((c) => c.status === 'approved')
          .reduce((sum, c) => sum + (c.approved_amount || 0), 0),
        trend: calculateTrend(changeOrdersResult, 'pending'),
      }

      // Calculate submittal stats
      const submittalStats = {
        pending: submittalsResult.filter((s) => ['draft', 'pending', 'submitted', 'under_review'].includes(s.status)).length,
        approved: submittalsResult.filter((s) => ['approved', 'approved_as_noted'].includes(s.status)).length,
        rejected: submittalsResult.filter((s) => ['rejected', 'revise_and_resubmit'].includes(s.status)).length,
        overdue: submittalsResult.filter(
          (s) => s.required_date && isPast(new Date(s.required_date)) && !['approved', 'approved_as_noted', 'rejected'].includes(s.status)
        ).length,
        total: submittalsResult.length,
        trend: calculateTrend(submittalsResult, 'pending'),
      }

      return {
        tasks: taskStats,
        rfis: rfiStats,
        punchItems: punchStats,
        safety: safetyStats,
        changeOrders: coStats,
        submittals: submittalStats,
      }
    },
    enabled: !!userProfile?.company_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

/**
 * Fetch action items requiring user attention
 */
export function useActionItems(projectId?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['action-items', projectId, userProfile?.id],
    queryFn: async (): Promise<ActionItem[]> => {
      if (!userProfile?.id) {
        throw new Error('No user ID found')
      }

      const now = new Date()
      const actionItems: ActionItem[] = []

      // Fetch overdue tasks assigned to user
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select(`
          id, title, description, priority, due_date, project_id,
          project:projects(name)
        `)
        .eq('assigned_to_user_id', userProfile.id)
        .lt('due_date', now.toISOString())
        .neq('status', 'completed')
        .is('deleted_at', null)
        .limit(10)

      overdueTasks?.forEach((task) => {
        actionItems.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: task.description || 'Overdue task requires attention',
          priority: task.priority || 'normal',
          dueDate: task.due_date,
          isOverdue: true,
          projectId: task.project_id,
          projectName: (task.project as any)?.name || 'Unknown Project',
          link: `/tasks/${task.id}`,
        })
      })

      // Fetch RFIs with ball in court = user
      const { data: userRFIs } = await supabase
        .from('rfis')
        .select(`
          id, subject, question, priority, date_required, project_id,
          project:projects(name)
        `)
        .eq('ball_in_court', userProfile.id)
        .not('status', 'in', '("closed","void")')
        .is('deleted_at', null)
        .limit(10)

      userRFIs?.forEach((rfi) => {
        const isOverdue = rfi.date_required && isPast(new Date(rfi.date_required))
        actionItems.push({
          id: rfi.id,
          type: 'rfi',
          title: `RFI: ${rfi.subject}`,
          description: rfi.question?.substring(0, 100) + '...' || 'RFI requires response',
          priority: rfi.priority || 'normal',
          dueDate: rfi.date_required,
          isOverdue: !!isOverdue,
          projectId: rfi.project_id,
          projectName: (rfi.project as any)?.name || 'Unknown Project',
          link: `/rfis/${rfi.id}`,
          ballInCourt: 'You',
        })
      })

      // Fetch punch items awaiting verification
      const { data: awaitingVerification } = await supabase
        .from('punch_items')
        .select(`
          id, title, description, priority, due_date, project_id,
          project:projects(name)
        `)
        .eq('status', 'ready_for_review')
        .is('deleted_at', null)
        .limit(10)

      awaitingVerification?.forEach((punch) => {
        actionItems.push({
          id: punch.id,
          type: 'punch_item',
          title: `Verify: ${punch.title}`,
          description: punch.description || 'Punch item ready for verification',
          priority: punch.priority || 'normal',
          dueDate: punch.due_date,
          isOverdue: punch.due_date ? isPast(new Date(punch.due_date)) : false,
          projectId: punch.project_id,
          projectName: (punch.project as any)?.name || 'Unknown Project',
          link: `/punch-lists/${punch.id}`,
        })
      })

      // Fetch pending change order approvals
      const { data: pendingCOs } = await supabase
        .from('change_orders')
        .select(`
          id, title, description, proposed_amount, project_id,
          project:projects(name)
        `)
        .eq('status', 'pending_approval')
        .is('deleted_at', null)
        .limit(5)

      pendingCOs?.forEach((co) => {
        actionItems.push({
          id: co.id,
          type: 'change_order',
          title: `Approve CO: ${co.title}`,
          description: `$${co.proposed_amount?.toLocaleString() || '0'} - ${co.description?.substring(0, 50) || 'Pending approval'}`,
          priority: 'high',
          dueDate: null,
          isOverdue: false,
          projectId: co.project_id,
          projectName: (co.project as any)?.name || 'Unknown Project',
          link: `/change-orders/${co.id}`,
        })
      })

      // Sort by priority and overdue status
      return actionItems.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
    },
    enabled: !!userProfile?.id,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  })
}

/**
 * Calculate a simple trend for the last 5 periods
 * This creates a mock trend based on count distribution over time
 */
function calculateTrend(
  items: Array<{ created_at: string; status: string }>,
  statusToTrack: string
): number[] {
  const now = new Date()
  const periods = 5

  // Count items by period (5 days)
  return Array.from({ length: periods }, (_, i) => {
    const periodEnd = subDays(now, (periods - 1 - i) * 2)
    const periodStart = subDays(periodEnd, 2)

    return items.filter((item) => {
      const createdAt = new Date(item.created_at)
      return createdAt <= periodEnd && item.status === statusToTrack
    }).length
  })
}

/**
 * Get project-specific statistics
 */
export function useProjectStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const [
        { count: taskCount },
        { count: rfiCount },
        { count: punchCount },
        { count: dailyReportCount },
      ] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('rfis').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('punch_items').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
      ])

      return {
        tasks: taskCount || 0,
        rfis: rfiCount || 0,
        punchItems: punchCount || 0,
        dailyReports: dailyReportCount || 0,
      }
    },
    enabled: !!projectId,
  })
}
