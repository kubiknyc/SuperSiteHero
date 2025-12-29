// File: src/features/gantt/hooks/useScheduleItems.ts
// React Query hooks for Gantt Charts & Scheduling

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi } from '@/lib/api/services/schedule'
import type {
  CreateScheduleItemDTO,
  UpdateScheduleItemDTO,
  CreateDependencyDTO,
  ScheduleFilters,
} from '@/types/schedule'
import toast from 'react-hot-toast'
import { logger } from '../../../lib/utils/logger';


// =============================================
// SCHEDULE ITEMS HOOKS
// =============================================

/**
 * Fetch schedule items for a project
 */
export function useScheduleItems(projectId: string | undefined, filters?: Partial<ScheduleFilters>) {
  return useQuery({
    queryKey: ['schedule-items', projectId, filters],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID is required')}
      return scheduleApi.getScheduleItems({ project_id: projectId, ...filters })
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch a single schedule item
 */
export function useScheduleItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-item', itemId],
    queryFn: async () => {
      if (!itemId) {throw new Error('Item ID is required')}
      return scheduleApi.getScheduleItem(itemId)
    },
    enabled: !!itemId,
  })
}

/**
 * Create a new schedule item
 */
export function useCreateScheduleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateScheduleItemDTO) => scheduleApi.createScheduleItem(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-items', data.project_id],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-stats', data.project_id],
        exact: false,
      })
    },
    onError: (error: Error) => {
      logger.error('Failed to create schedule item:', error)
    },
  })
}

/**
 * Create schedule item with toast notifications
 */
export function useCreateScheduleItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateScheduleItemDTO) => scheduleApi.createScheduleItem(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-items', data.project_id],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-stats', data.project_id],
        exact: false,
      })
      toast.success('Task added to schedule')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create task')
    },
  })
}

/**
 * Update a schedule item
 */
export function useUpdateScheduleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: UpdateScheduleItemDTO }) =>
      scheduleApi.updateScheduleItem(itemId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-items', data.project_id],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-item', data.id],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-stats', data.project_id],
        exact: false,
      })
    },
    onError: (error: Error) => {
      logger.error('Failed to update schedule item:', error)
    },
  })
}

/**
 * Update schedule item with toast notifications
 */
export function useUpdateScheduleItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: UpdateScheduleItemDTO }) =>
      scheduleApi.updateScheduleItem(itemId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-items', data.project_id],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-item', data.id],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-stats', data.project_id],
        exact: false,
      })
      toast.success('Task updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task')
    },
  })
}

/**
 * Delete a schedule item
 */
export function useDeleteScheduleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, projectId }: { itemId: string; projectId: string }) =>
      scheduleApi.deleteScheduleItem(itemId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-items', projectId],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-stats', projectId],
        exact: false,
      })
    },
    onError: (error: Error) => {
      logger.error('Failed to delete schedule item:', error)
    },
  })
}

/**
 * Delete schedule item with toast notifications
 */
export function useDeleteScheduleItemWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, projectId }: { itemId: string; projectId: string }) =>
      scheduleApi.deleteScheduleItem(itemId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-items', projectId],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-stats', projectId],
        exact: false,
      })
      toast.success('Task removed from schedule')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete task')
    },
  })
}

/**
 * Update task progress
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, percentComplete }: { itemId: string; percentComplete: number }) =>
      scheduleApi.updateProgress(itemId, percentComplete),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-items', data.project_id],
        exact: false,
      })
      queryClient.invalidateQueries({
        queryKey: ['schedule-stats', data.project_id],
        exact: false,
      })
    },
  })
}

// =============================================
// DEPENDENCIES HOOKS
// =============================================

/**
 * Fetch dependencies for a project
 */
export function useDependencies(projectId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-dependencies', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID is required')}
      return scheduleApi.getDependencies(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Create a dependency
 */
export function useCreateDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDependencyDTO) => scheduleApi.createDependency(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-dependencies', data.project_id],
        exact: false,
      })
    },
    onError: (error: Error) => {
      logger.error('Failed to create dependency:', error)
    },
  })
}

/**
 * Create dependency with toast notifications
 */
export function useCreateDependencyWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDependencyDTO) => scheduleApi.createDependency(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-dependencies', data.project_id],
        exact: false,
      })
      toast.success('Dependency created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create dependency')
    },
  })
}

/**
 * Delete a dependency
 */
export function useDeleteDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dependencyId, projectId }: { dependencyId: string; projectId: string }) =>
      scheduleApi.deleteDependency(dependencyId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({
        queryKey: ['schedule-dependencies', projectId],
        exact: false,
      })
    },
    onError: (error: Error) => {
      logger.error('Failed to delete dependency:', error)
    },
  })
}

// =============================================
// STATISTICS HOOKS
// =============================================

/**
 * Fetch schedule statistics
 */
export function useScheduleStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-stats', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID is required')}
      return scheduleApi.getScheduleStats(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Fetch schedule date range
 */
export function useScheduleDateRange(projectId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-date-range', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID is required')}
      return scheduleApi.getScheduleDateRange(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// COMBINED DATA HOOK
// =============================================

/**
 * Fetch schedule items with dependencies (combined for Gantt chart)
 */
export function useGanttData(projectId: string | undefined) {
  const itemsQuery = useScheduleItems(projectId)
  const dependenciesQuery = useDependencies(projectId)
  const statsQuery = useScheduleStats(projectId)
  const dateRangeQuery = useScheduleDateRange(projectId)

  return {
    items: itemsQuery.data || [],
    dependencies: dependenciesQuery.data || [],
    stats: statsQuery.data,
    dateRange: dateRangeQuery.data,
    isLoading:
      itemsQuery.isLoading ||
      dependenciesQuery.isLoading ||
      statsQuery.isLoading ||
      dateRangeQuery.isLoading,
    isError:
      itemsQuery.isError ||
      dependenciesQuery.isError ||
      statsQuery.isError ||
      dateRangeQuery.isError,
    error: itemsQuery.error || dependenciesQuery.error || statsQuery.error || dateRangeQuery.error,
    refetch: () => {
      itemsQuery.refetch()
      dependenciesQuery.refetch()
      statsQuery.refetch()
      dateRangeQuery.refetch()
    },
  }
}
