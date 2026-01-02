/**
 * Morning Briefing Hook
 * Fetches and aggregates data for the "My Work Today" morning briefing widget
 * Designed for field workers to quickly see their day at a glance
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { isToday, isPast, isFuture, differenceInDays, startOfDay, endOfDay } from 'date-fns'

// ============================================================================
// Types
// ============================================================================

export interface TodayTask {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: string
  dueDate: string | null
  projectId: string
  projectName: string
  location: string | null
  estimatedHours: number | null
  isOverdue: boolean
}

export interface PendingApproval {
  id: string
  type: 'change_order' | 'submittal' | 'rfi' | 'punch_item' | 'daily_report'
  title: string
  description: string | null
  submittedBy: string
  submittedAt: string
  projectId: string
  projectName: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  value?: number // For change orders
}

export interface DueItem {
  id: string
  type: 'rfi' | 'submittal' | 'task' | 'punch_item'
  title: string
  dueDate: string
  projectId: string
  projectName: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: string
  daysUntilDue: number
  isOverdue: boolean
}

export interface ActiveRFI {
  id: string
  number: string
  subject: string
  status: string
  dateRequired: string | null
  ballInCourt: string | null
  projectId: string
  projectName: string
  isOverdue: boolean
  daysOpen: number
}

export interface ActiveSubmittal {
  id: string
  number: string
  title: string
  status: string
  requiredDate: string | null
  projectId: string
  projectName: string
  isOverdue: boolean
  specSection: string | null
}

export interface WeatherCondition {
  temperature: number
  condition: string
  icon: string
  windSpeed: number
  humidity: number
  precipitation: number
  alerts: string[]
}

export interface MorningBriefingData {
  todaysTasks: TodayTask[]
  pendingApprovals: PendingApproval[]
  itemsDueToday: DueItem[]
  itemsDueSoon: DueItem[] // Due in next 3 days
  activeRFIs: ActiveRFI[]
  activeSubmittals: ActiveSubmittal[]
  weather: WeatherCondition | null
  summary: {
    totalTasks: number
    overdueItems: number
    pendingApprovalCount: number
    criticalItems: number
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMorningBriefing(projectId?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['morning-briefing', userProfile?.id, projectId],
    queryFn: async (): Promise<MorningBriefingData> => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date()
      const todayStart = startOfDay(now).toISOString()
      const todayEnd = endOfDay(now).toISOString()
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()

      // Fetch all data in parallel
      const [
        tasksResult,
        approvalsResult,
        rfisResult,
        submittalsResult,
        punchItemsResult,
      ] = await Promise.all([
        // Today's tasks assigned to user
        supabase
          .from('tasks')
          .select(`
            id, title, description, priority, status, due_date,
            estimated_hours, location,
            project_id, project:projects(name)
          `)
          .eq('assigned_to_user_id', userProfile.id)
          .neq('status', 'completed')
          .is('deleted_at', null)
          .or(`due_date.lte.${todayEnd},due_date.is.null`)
          .order('priority', { ascending: false })
          .order('due_date', { ascending: true })
          .limit(20),

        // Pending approvals (change orders, submittals requiring action)
        Promise.all([
          supabase
            .from('change_orders')
            .select(`
              id, title, description, proposed_amount, status, created_at,
              project_id, project:projects(name),
              created_by_user:users!change_orders_created_by_fkey(first_name, last_name)
            `)
            .eq('status', 'pending_approval')
            .is('deleted_at', null)
            .limit(10),
          supabase
            .from('submittals')
            .select(`
              id, title, description, status, created_at,
              project_id, project:projects(name),
              submitted_by_user:users!submittals_submitted_by_fkey(first_name, last_name)
            `)
            .eq('status', 'submitted')
            .is('deleted_at', null)
            .limit(10),
        ]),

        // Active RFIs requiring response
        supabase
          .from('rfis')
          .select(`
            id, rfi_number, subject, status, date_required, created_at,
            ball_in_court,
            project_id, project:projects(name)
          `)
          .eq('ball_in_court', userProfile.id)
          .not('status', 'in', '("closed","void")')
          .is('deleted_at', null)
          .order('date_required', { ascending: true })
          .limit(15),

        // Active submittals
        supabase
          .from('submittals')
          .select(`
            id, submittal_number, title, status, required_date,
            spec_section,
            project_id, project:projects(name)
          `)
          .in('status', ['submitted', 'under_review', 'pending'])
          .is('deleted_at', null)
          .order('required_date', { ascending: true })
          .limit(15),

        // Punch items due today
        supabase
          .from('punch_items')
          .select(`
            id, title, priority, status, due_date,
            project_id, project:projects(name)
          `)
          .eq('assigned_to', userProfile.id)
          .not('status', 'in', '("completed","verified")')
          .lte('due_date', threeDaysFromNow)
          .is('deleted_at', null)
          .order('due_date', { ascending: true })
          .limit(15),
      ])

      // Process tasks
      const todaysTasks: TodayTask[] = (tasksResult.data || []).map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority || 'normal',
        status: task.status,
        dueDate: task.due_date,
        projectId: task.project_id,
        projectName: (task.project as any)?.name || 'Unknown Project',
        location: task.location,
        estimatedHours: task.estimated_hours,
        isOverdue: task.due_date ? isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) : false,
      }))

      // Process approvals
      const [changeOrdersResult, submittalsApprovalResult] = approvalsResult
      const pendingApprovals: PendingApproval[] = [
        ...(changeOrdersResult.data || []).map((co) => ({
          id: co.id,
          type: 'change_order' as const,
          title: co.title,
          description: co.description,
          submittedBy: co.created_by_user
            ? `${(co.created_by_user as any).first_name} ${(co.created_by_user as any).last_name}`
            : 'Unknown',
          submittedAt: co.created_at,
          projectId: co.project_id,
          projectName: (co.project as any)?.name || 'Unknown Project',
          priority: 'high' as const,
          value: co.proposed_amount,
        })),
        ...(submittalsApprovalResult.data || []).map((sub) => ({
          id: sub.id,
          type: 'submittal' as const,
          title: sub.title,
          description: sub.description,
          submittedBy: sub.submitted_by_user
            ? `${(sub.submitted_by_user as any).first_name} ${(sub.submitted_by_user as any).last_name}`
            : 'Unknown',
          submittedAt: sub.created_at,
          projectId: sub.project_id,
          projectName: (sub.project as any)?.name || 'Unknown Project',
          priority: 'normal' as const,
        })),
      ]

      // Process RFIs
      const activeRFIs: ActiveRFI[] = (rfisResult.data || []).map((rfi) => {
        const createdAt = new Date(rfi.created_at)
        const daysOpen = differenceInDays(now, createdAt)
        const isOverdue = rfi.date_required ? isPast(new Date(rfi.date_required)) : false

        return {
          id: rfi.id,
          number: rfi.rfi_number,
          subject: rfi.subject,
          status: rfi.status,
          dateRequired: rfi.date_required,
          ballInCourt: rfi.ball_in_court,
          projectId: rfi.project_id,
          projectName: (rfi.project as any)?.name || 'Unknown Project',
          isOverdue,
          daysOpen,
        }
      })

      // Process submittals
      const activeSubmittals: ActiveSubmittal[] = (submittalsResult.data || []).map((sub) => ({
        id: sub.id,
        number: sub.submittal_number,
        title: sub.title,
        status: sub.status,
        requiredDate: sub.required_date,
        projectId: sub.project_id,
        projectName: (sub.project as any)?.name || 'Unknown Project',
        isOverdue: sub.required_date ? isPast(new Date(sub.required_date)) : false,
        specSection: sub.spec_section,
      }))

      // Process items due today/soon
      const allDueItems: DueItem[] = []

      // Add tasks with due dates
      todaysTasks.forEach((task) => {
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate)
          const daysUntilDue = differenceInDays(dueDate, now)
          allDueItems.push({
            id: task.id,
            type: 'task',
            title: task.title,
            dueDate: task.dueDate,
            projectId: task.projectId,
            projectName: task.projectName,
            priority: task.priority,
            status: task.status,
            daysUntilDue,
            isOverdue: task.isOverdue,
          })
        }
      })

      // Add punch items
      ;(punchItemsResult.data || []).forEach((punch) => {
        if (punch.due_date) {
          const dueDate = new Date(punch.due_date)
          const daysUntilDue = differenceInDays(dueDate, now)
          allDueItems.push({
            id: punch.id,
            type: 'punch_item',
            title: punch.title,
            dueDate: punch.due_date,
            projectId: punch.project_id,
            projectName: (punch.project as any)?.name || 'Unknown Project',
            priority: punch.priority || 'normal',
            status: punch.status,
            daysUntilDue,
            isOverdue: isPast(dueDate) && !isToday(dueDate),
          })
        }
      })

      // Add RFIs with required dates
      activeRFIs.forEach((rfi) => {
        if (rfi.dateRequired) {
          const dueDate = new Date(rfi.dateRequired)
          const daysUntilDue = differenceInDays(dueDate, now)
          if (daysUntilDue <= 3) {
            allDueItems.push({
              id: rfi.id,
              type: 'rfi',
              title: `RFI ${rfi.number}: ${rfi.subject}`,
              dueDate: rfi.dateRequired,
              projectId: rfi.projectId,
              projectName: rfi.projectName,
              priority: rfi.isOverdue ? 'urgent' : 'high',
              status: rfi.status,
              daysUntilDue,
              isOverdue: rfi.isOverdue,
            })
          }
        }
      })

      // Split into due today vs due soon
      const itemsDueToday = allDueItems.filter((item) => {
        const dueDate = new Date(item.dueDate)
        return isToday(dueDate) || item.isOverdue
      })

      const itemsDueSoon = allDueItems.filter((item) => {
        const dueDate = new Date(item.dueDate)
        return !isToday(dueDate) && !item.isOverdue && isFuture(dueDate)
      })

      // Calculate summary
      const overdueItems = allDueItems.filter((item) => item.isOverdue).length
      const criticalItems = allDueItems.filter(
        (item) => item.priority === 'urgent' || item.priority === 'high' || item.isOverdue
      ).length

      return {
        todaysTasks,
        pendingApprovals,
        itemsDueToday,
        itemsDueSoon,
        activeRFIs,
        activeSubmittals,
        weather: null, // Weather fetched separately
        summary: {
          totalTasks: todaysTasks.length,
          overdueItems,
          pendingApprovalCount: pendingApprovals.length,
          criticalItems,
        },
      }
    },
    enabled: !!userProfile?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    refetchOnWindowFocus: true,
  })
}

/**
 * Get greeting based on time of day
 */
export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  } else if (hour < 17) {
    return 'Good afternoon'
  } else {
    return 'Good evening'
  }
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'normal':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export default useMorningBriefing
