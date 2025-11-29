/**
 * Subcontractor Items Hooks
 * React Query hooks for punch items and tasks assigned to subcontractor
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import { useToast } from '@/components/ui/use-toast'
import type {
  SubcontractorPunchItem,
  SubcontractorTask,
  SubcontractorItemsFilter,
  UpdateItemStatusDTO,
  PunchItemStatus,
  TaskStatus,
} from '@/types/subcontractor-portal'

// Query keys
export const itemKeys = {
  all: ['subcontractor', 'items'] as const,
  punchItems: (filter?: SubcontractorItemsFilter) =>
    [...itemKeys.all, 'punch-items', filter] as const,
  punchItem: (id: string) => [...itemKeys.all, 'punch-item', id] as const,
  tasks: (filter?: SubcontractorItemsFilter) => [...itemKeys.all, 'tasks', filter] as const,
  task: (id: string) => [...itemKeys.all, 'task', id] as const,
}

// =============================================
// PUNCH ITEMS
// =============================================

/**
 * Fetch punch items assigned to the subcontractor
 */
export function useSubcontractorPunchItems(filter?: SubcontractorItemsFilter) {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorPunchItem[]>({
    queryKey: itemKeys.punchItems(filter),
    queryFn: () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      return subcontractorPortalApi.getPunchItems(userProfile.id, filter)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Fetch open punch items only
 */
export function useOpenPunchItems(projectId?: string) {
  return useSubcontractorPunchItems({
    project_id: projectId,
    status: ['open', 'in_progress', 'ready_for_review'],
  })
}

/**
 * Update punch item status
 */
export function useUpdatePunchItemStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      punchItemId,
      status,
      notes,
    }: {
      punchItemId: string
      status: PunchItemStatus
      notes?: string
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      return subcontractorPortalApi.updatePunchItemStatus(punchItemId, userProfile.id, {
        status,
        notes,
      })
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: itemKeys.punchItems() })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'dashboard'] })

      const statusMessages: Record<PunchItemStatus, string> = {
        open: 'Punch item reopened',
        in_progress: 'Punch item marked as in progress',
        ready_for_review: 'Punch item marked as ready for review',
        completed: 'Punch item marked as completed',
        verified: 'Punch item verified',
        rejected: 'Punch item rejected',
      }

      toast({
        title: 'Status Updated',
        description: statusMessages[data.status as PunchItemStatus] || 'Status updated',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      })
    },
  })
}

// =============================================
// TASKS
// =============================================

/**
 * Fetch tasks assigned to the subcontractor
 */
export function useSubcontractorTasks(filter?: SubcontractorItemsFilter) {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorTask[]>({
    queryKey: itemKeys.tasks(filter),
    queryFn: () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      return subcontractorPortalApi.getTasks(userProfile.id, filter)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Fetch open tasks only
 */
export function useOpenTasks(projectId?: string) {
  return useSubcontractorTasks({
    project_id: projectId,
    status: ['pending', 'in_progress'],
  })
}

/**
 * Update task status
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      taskId,
      status,
      notes,
    }: {
      taskId: string
      status: TaskStatus
      notes?: string
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      return subcontractorPortalApi.updateTaskStatus(taskId, userProfile.id, { status, notes })
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: itemKeys.tasks() })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'dashboard'] })

      const statusMessages: Record<TaskStatus, string> = {
        pending: 'Task moved to pending',
        in_progress: 'Task marked as in progress',
        completed: 'Task marked as completed',
        cancelled: 'Task cancelled',
      }

      toast({
        title: 'Status Updated',
        description: statusMessages[data.status as TaskStatus] || 'Status updated',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      })
    },
  })
}

// =============================================
// COMBINED ITEMS
// =============================================

/**
 * Fetch both punch items and tasks for a project
 */
export function useSubcontractorWorkItems(projectId?: string) {
  const punchItemsQuery = useSubcontractorPunchItems({ project_id: projectId })
  const tasksQuery = useSubcontractorTasks({ project_id: projectId })

  return {
    punchItems: punchItemsQuery.data || [],
    tasks: tasksQuery.data || [],
    isLoading: punchItemsQuery.isLoading || tasksQuery.isLoading,
    isError: punchItemsQuery.isError || tasksQuery.isError,
    error: punchItemsQuery.error || tasksQuery.error,
    refetch: () => {
      punchItemsQuery.refetch()
      tasksQuery.refetch()
    },
  }
}
