/**
 * usePunchListCloseout Hook
 *
 * Fetches punch list statistics for closeout readiness assessment.
 * Provides summary of punch list completion status for a project.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PunchListCloseoutStatus {
  // Counts
  total: number
  open: number
  inProgress: number
  completed: number
  verified: number

  // By priority
  criticalOpen: number
  highOpen: number
  mediumOpen: number
  lowOpen: number

  // Calculated
  completionPercent: number
  verificationPercent: number
  isReadyForCloseout: boolean

  // Outstanding items by assignee
  byAssignee: {
    assigneeId: string | null
    assigneeName: string
    assigneeType: 'user' | 'subcontractor' | null
    openCount: number
    inProgressCount: number
  }[]

  // Outstanding items by location
  byLocation: {
    location: string
    openCount: number
    completedCount: number
  }[]
}

async function fetchPunchListCloseoutStatus(projectId: string): Promise<PunchListCloseoutStatus> {
  // Fetch all punch items for the project
  const { data: items, error } = await supabase
    .from('punch_items')
    .select(`
      id,
      status,
      priority,
      location,
      assigned_to_user_id,
      assigned_to_subcontractor_id,
      users:assigned_to_user_id(id, first_name, last_name),
      subcontractors:assigned_to_subcontractor_id(id, company_name)
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (error) throw error

  const punchItems = items || []

  // Calculate status counts
  const statusCounts = {
    open: 0,
    in_progress: 0,
    completed: 0,
    verified: 0,
  }

  const priorityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  // Group by assignee
  const assigneeMap = new Map<string, {
    assigneeId: string | null
    assigneeName: string
    assigneeType: 'user' | 'subcontractor' | null
    openCount: number
    inProgressCount: number
  }>()

  // Group by location
  const locationMap = new Map<string, {
    location: string
    openCount: number
    completedCount: number
  }>()

  for (const item of punchItems) {
    // Status counts
    const status = item.status as keyof typeof statusCounts
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++
    }

    // Priority counts (only for open/in_progress items)
    if (item.status === 'open' || item.status === 'in_progress') {
      const priority = (item.priority || 'medium') as keyof typeof priorityCounts
      if (priorityCounts[priority] !== undefined) {
        priorityCounts[priority]++
      }
    }

    // Assignee grouping
    let assigneeKey = 'unassigned'
    let assigneeName = 'Unassigned'
    let assigneeType: 'user' | 'subcontractor' | null = null
    let assigneeId: string | null = null

    if (item.assigned_to_user_id && item.users) {
      const user = item.users as any
      assigneeKey = `user:${item.assigned_to_user_id}`
      assigneeName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown User'
      assigneeType = 'user'
      assigneeId = item.assigned_to_user_id
    } else if (item.assigned_to_subcontractor_id && item.subcontractors) {
      const sub = item.subcontractors as any
      assigneeKey = `sub:${item.assigned_to_subcontractor_id}`
      assigneeName = sub.company_name || 'Unknown Subcontractor'
      assigneeType = 'subcontractor'
      assigneeId = item.assigned_to_subcontractor_id
    }

    if (!assigneeMap.has(assigneeKey)) {
      assigneeMap.set(assigneeKey, {
        assigneeId,
        assigneeName,
        assigneeType,
        openCount: 0,
        inProgressCount: 0,
      })
    }

    const assigneeData = assigneeMap.get(assigneeKey)!
    if (item.status === 'open') assigneeData.openCount++
    if (item.status === 'in_progress') assigneeData.inProgressCount++

    // Location grouping
    const location = item.location || 'Unknown Location'
    if (!locationMap.has(location)) {
      locationMap.set(location, {
        location,
        openCount: 0,
        completedCount: 0,
      })
    }

    const locationData = locationMap.get(location)!
    if (item.status === 'open' || item.status === 'in_progress') locationData.openCount++
    if (item.status === 'completed' || item.status === 'verified') locationData.completedCount++
  }

  const total = punchItems.length
  const completedOrVerified = statusCounts.completed + statusCounts.verified
  const completionPercent = total > 0 ? Math.round((completedOrVerified / total) * 100) : 100
  const verificationPercent = total > 0 ? Math.round((statusCounts.verified / total) * 100) : 100

  // Ready for closeout: all items verified OR no items at all
  const isReadyForCloseout = total === 0 || statusCounts.verified === total

  return {
    total,
    open: statusCounts.open,
    inProgress: statusCounts.in_progress,
    completed: statusCounts.completed,
    verified: statusCounts.verified,
    criticalOpen: priorityCounts.critical,
    highOpen: priorityCounts.high,
    mediumOpen: priorityCounts.medium,
    lowOpen: priorityCounts.low,
    completionPercent,
    verificationPercent,
    isReadyForCloseout,
    byAssignee: Array.from(assigneeMap.values())
      .filter(a => a.openCount > 0 || a.inProgressCount > 0)
      .sort((a, b) => (b.openCount + b.inProgressCount) - (a.openCount + a.inProgressCount)),
    byLocation: Array.from(locationMap.values())
      .filter(l => l.openCount > 0)
      .sort((a, b) => b.openCount - a.openCount),
  }
}

export function usePunchListCloseout(projectId: string | undefined) {
  return useQuery({
    queryKey: ['closeout', 'punch-list-status', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID required')
      return fetchPunchListCloseoutStatus(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}
