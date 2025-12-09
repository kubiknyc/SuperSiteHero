/**
 * Schedule Activities React Query Hooks
 * Hooks for the schedule_activities schema with caching and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { scheduleActivitiesApi } from '@/lib/api/services/schedule-activities'
import { useAuth } from '@/hooks/useAuth'
import type {
  ScheduleActivity,
  ScheduleActivityWithDetails,
  ScheduleDependency,
  ScheduleBaseline,
  ScheduleCalendar,
  ScheduleResource,
  ScheduleImportLog,
  ScheduleStats,
  CreateScheduleActivityDTO,
  UpdateScheduleActivityDTO,
  CreateScheduleDependencyDTO,
  CreateScheduleBaselineDTO,
  CreateScheduleCalendarDTO,
  CreateScheduleResourceDTO,
  ScheduleActivityFilters,
  ActivityStatus,
} from '@/types/schedule-activities'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const scheduleKeys = {
  all: ['schedule-activities'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (projectId: string, filters?: Partial<ScheduleActivityFilters>) =>
    [...scheduleKeys.lists(), projectId, filters] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
  dependencies: (projectId: string) =>
    [...scheduleKeys.all, 'dependencies', projectId] as const,
  baselines: (projectId: string) =>
    [...scheduleKeys.all, 'baselines', projectId] as const,
  calendars: (companyId: string, projectId?: string) =>
    [...scheduleKeys.all, 'calendars', companyId, projectId] as const,
  resources: (companyId: string, projectId?: string) =>
    [...scheduleKeys.all, 'resources', companyId, projectId] as const,
  stats: (projectId: string) => [...scheduleKeys.all, 'stats', projectId] as const,
  importLogs: (projectId: string) =>
    [...scheduleKeys.all, 'import-logs', projectId] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch schedule activities for a project
 */
export function useScheduleActivities(
  projectId: string | undefined,
  filters?: Partial<ScheduleActivityFilters>
) {
  return useQuery({
    queryKey: scheduleKeys.list(projectId || '', filters),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      return scheduleActivitiesApi.getActivities({ project_id: projectId, ...filters })
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch activities with related details
 */
export function useScheduleActivitiesWithDetails(projectId: string | undefined) {
  return useQuery({
    queryKey: [...scheduleKeys.list(projectId || ''), 'with-details'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      return scheduleActivitiesApi.getActivitiesWithDetails(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch a single schedule activity
 */
export function useScheduleActivity(activityId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.detail(activityId || ''),
    queryFn: async () => {
      if (!activityId) throw new Error('Activity ID is required')
      return scheduleActivitiesApi.getActivity(activityId)
    },
    enabled: !!activityId,
  })
}

/**
 * Fetch dependencies for a project
 */
export function useScheduleDependencies(projectId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.dependencies(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      return scheduleActivitiesApi.getDependencies(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch baselines for a project
 */
export function useScheduleBaselines(projectId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.baselines(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      return scheduleActivitiesApi.getBaselines(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Fetch calendars for a company/project
 */
export function useScheduleCalendars(
  companyId: string | undefined,
  projectId?: string
) {
  return useQuery({
    queryKey: scheduleKeys.calendars(companyId || '', projectId),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      return scheduleActivitiesApi.getCalendars(companyId, projectId)
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 30,
  })
}

/**
 * Fetch resources for a company/project
 */
export function useScheduleResources(
  companyId: string | undefined,
  projectId?: string
) {
  return useQuery({
    queryKey: scheduleKeys.resources(companyId || '', projectId),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      return scheduleActivitiesApi.getResources(companyId, projectId)
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 15,
  })
}

/**
 * Fetch schedule statistics
 */
export function useScheduleStats(projectId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.stats(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      return scheduleActivitiesApi.getScheduleStats(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Fetch import logs for a project
 */
export function useScheduleImportLogs(projectId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.importLogs(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      return scheduleActivitiesApi.getImportLogs(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================================================
// COMBINED DATA HOOK (for Master Schedule page)
// ============================================================================

/**
 * Fetch all data needed for the Master Schedule page
 */
export function useMasterScheduleData(projectId: string | undefined) {
  const activitiesQuery = useScheduleActivities(projectId)
  const dependenciesQuery = useScheduleDependencies(projectId)
  const statsQuery = useScheduleStats(projectId)
  const baselinesQuery = useScheduleBaselines(projectId)

  const hasBaseline =
    activitiesQuery.data?.some((a) => a.baseline_start !== null) ?? false
  const activeBaseline = baselinesQuery.data?.find((b) => b.is_active) ?? null

  return {
    activities: activitiesQuery.data || [],
    dependencies: dependenciesQuery.data || [],
    stats: statsQuery.data,
    baselines: baselinesQuery.data || [],
    hasBaseline,
    activeBaseline,
    isLoading:
      activitiesQuery.isLoading ||
      dependenciesQuery.isLoading ||
      statsQuery.isLoading,
    isError:
      activitiesQuery.isError || dependenciesQuery.isError || statsQuery.isError,
    error:
      activitiesQuery.error || dependenciesQuery.error || statsQuery.error,
    refetch: () => {
      activitiesQuery.refetch()
      dependenciesQuery.refetch()
      statsQuery.refetch()
      baselinesQuery.refetch()
    },
  }
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a schedule activity
 */
export function useCreateScheduleActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleActivityDTO) =>
      scheduleActivitiesApi.createActivity(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(data.project_id),
      })
    },
  })
}

/**
 * Create activity with toast notifications
 */
export function useCreateScheduleActivityWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleActivityDTO) =>
      scheduleActivitiesApi.createActivity(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(data.project_id),
      })
      toast.success('Activity created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create activity')
    },
  })
}

/**
 * Update a schedule activity
 */
export function useUpdateScheduleActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      updates,
    }: {
      activityId: string
      updates: UpdateScheduleActivityDTO
    }) => scheduleActivitiesApi.updateActivity(activityId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.detail(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(data.project_id),
      })
    },
  })
}

/**
 * Update activity with toast notifications
 */
export function useUpdateScheduleActivityWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      updates,
    }: {
      activityId: string
      updates: UpdateScheduleActivityDTO
    }) => scheduleActivitiesApi.updateActivity(activityId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.detail(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(data.project_id),
      })
      toast.success('Activity updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update activity')
    },
  })
}

/**
 * Bulk update activities (for drag-drop)
 */
export function useBulkUpdateActivities() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      updates: Array<{ id: string; updates: UpdateScheduleActivityDTO }>
    ) => scheduleActivitiesApi.bulkUpdateActivities(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
    },
  })
}

/**
 * Delete a schedule activity
 */
export function useDeleteScheduleActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      projectId,
    }: {
      activityId: string
      projectId: string
    }) => scheduleActivitiesApi.deleteActivity(activityId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(projectId),
      })
    },
  })
}

/**
 * Delete activity with toast notifications
 */
export function useDeleteScheduleActivityWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      projectId,
    }: {
      activityId: string
      projectId: string
    }) => scheduleActivitiesApi.deleteActivity(activityId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(projectId),
      })
      toast.success('Activity deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete activity')
    },
  })
}

/**
 * Update activity status
 */
export function useUpdateActivityStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      status,
      percentComplete,
    }: {
      activityId: string
      status: ActivityStatus
      percentComplete?: number
    }) =>
      scheduleActivitiesApi.updateActivity(activityId, {
        status,
        percent_complete: percentComplete,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(data.project_id),
      })
      toast.success(`Activity marked as ${data.status.replace('_', ' ')}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status')
    },
  })
}

// ============================================================================
// DEPENDENCY MUTATIONS
// ============================================================================

/**
 * Create a dependency
 */
export function useCreateDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleDependencyDTO) =>
      scheduleActivitiesApi.createDependency(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.dependencies(data.project_id),
      })
    },
  })
}

/**
 * Create dependency with notification
 */
export function useCreateDependencyWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleDependencyDTO) =>
      scheduleActivitiesApi.createDependency(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.dependencies(data.project_id),
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
    mutationFn: ({
      dependencyId,
      projectId,
    }: {
      dependencyId: string
      projectId: string
    }) =>
      scheduleActivitiesApi.deleteDependency(dependencyId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.dependencies(projectId),
      })
      toast.success('Dependency removed')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete dependency')
    },
  })
}

// ============================================================================
// BASELINE MUTATIONS
// ============================================================================

/**
 * Create a baseline
 */
export function useCreateBaseline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleBaselineDTO) =>
      scheduleActivitiesApi.createBaseline(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.baselines(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
    },
  })
}

/**
 * Create baseline with notification
 */
export function useCreateBaselineWithNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleBaselineDTO) =>
      scheduleActivitiesApi.createBaseline(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.baselines(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      toast.success(`Baseline "${data.name}" saved`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save baseline')
    },
  })
}

/**
 * Set active baseline
 */
export function useSetActiveBaseline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      baselineId,
      projectId,
    }: {
      baselineId: string
      projectId: string
    }) => scheduleActivitiesApi.setActiveBaseline(baselineId, projectId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.baselines(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      toast.success('Baseline activated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set baseline')
    },
  })
}

// ============================================================================
// IMPORT MUTATION
// ============================================================================

/**
 * Import schedule activities
 */
export function useImportScheduleActivities() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      projectId,
      companyId,
      activities,
      fileName,
      fileType,
      sourceSystem,
      clearExisting,
    }: {
      projectId: string
      companyId: string
      activities: Array<
        Omit<CreateScheduleActivityDTO, 'project_id' | 'company_id'>
      >
      fileName: string
      fileType: string
      sourceSystem: string
      clearExisting?: boolean
    }) => {
      // Create import log
      const importLog = await scheduleActivitiesApi.createImportLog(
        projectId,
        fileName,
        fileType,
        sourceSystem,
        userProfile?.id
      )

      try {
        // Update status to processing
        await scheduleActivitiesApi.updateImportLog(importLog.id, {
          status: 'processing',
        })

        // Import activities
        const result = await scheduleActivitiesApi.importActivities(
          projectId,
          companyId,
          activities,
          clearExisting
        )

        // Update import log with results
        await scheduleActivitiesApi.updateImportLog(importLog.id, {
          status: result.errors.length > 0 ? 'completed' : 'completed',
          activities_imported: result.imported,
          errors: result.errors.length > 0 ? result.errors : undefined,
        })

        return result
      } catch (error) {
        // Update import log as failed
        await scheduleActivitiesApi.updateImportLog(importLog.id, {
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        })
        throw error
      }
    },
    onSuccess: (result, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.importLogs(projectId),
      })

      if (result.errors.length > 0) {
        toast.warning(
          `Imported ${result.imported} activities with ${result.errors.length} errors`
        )
      } else {
        toast.success(`Successfully imported ${result.imported} activities`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import schedule')
    },
  })
}

// ============================================================================
// CALENDAR & RESOURCE MUTATIONS
// ============================================================================

/**
 * Create a calendar
 */
export function useCreateCalendar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleCalendarDTO) =>
      scheduleActivitiesApi.createCalendar(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.calendars(data.company_id, data.project_id || undefined),
      })
      toast.success('Calendar created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create calendar')
    },
  })
}

/**
 * Create a resource
 */
export function useCreateResource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateScheduleResourceDTO) =>
      scheduleActivitiesApi.createResource(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.resources(data.company_id, data.project_id || undefined),
      })
      toast.success('Resource created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create resource')
    },
  })
}

// ============================================================================
// CALENDAR MUTATIONS
// ============================================================================

/**
 * Update a calendar
 */
export function useUpdateCalendar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      calendarId,
      updates,
    }: {
      calendarId: string
      updates: Partial<CreateScheduleCalendarDTO>
    }) => scheduleActivitiesApi.updateCalendar(calendarId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.calendars(data.company_id, data.project_id || undefined),
      })
      toast.success('Calendar updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update calendar')
    },
  })
}

/**
 * Delete a calendar
 */
export function useDeleteCalendar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      calendarId,
      companyId,
      projectId,
    }: {
      calendarId: string
      companyId: string
      projectId?: string
    }) => scheduleActivitiesApi.deleteCalendar(calendarId).then(() => ({ companyId, projectId })),
    onSuccess: ({ companyId, projectId }) => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.calendars(companyId, projectId),
      })
      toast.success('Calendar deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete calendar')
    },
  })
}

/**
 * Fetch a single calendar
 */
export function useScheduleCalendar(calendarId: string | undefined) {
  return useQuery({
    queryKey: [...scheduleKeys.all, 'calendar', calendarId],
    queryFn: async () => {
      if (!calendarId) throw new Error('Calendar ID is required')
      return scheduleActivitiesApi.getCalendar(calendarId)
    },
    enabled: !!calendarId,
    staleTime: 1000 * 60 * 30,
  })
}
