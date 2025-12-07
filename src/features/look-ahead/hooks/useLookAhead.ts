/**
 * Look-Ahead Planning React Query Hooks
 * Hooks for 3-week rolling schedule and PPC tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import {
  getLookAheadActivities,
  getActivitiesForWeek,
  getActivitiesByWeek,
  getLookAheadActivity,
  createLookAheadActivity,
  updateLookAheadActivity,
  moveActivityToWeek,
  updateActivityStatus,
  deleteLookAheadActivity,
  getActivityConstraints,
  getProjectOpenConstraints,
  createLookAheadConstraint,
  updateLookAheadConstraint,
  deleteLookAheadConstraint,
  getLookAheadSnapshots,
  createLookAheadSnapshot,
  getPPCMetrics,
  getLookAheadTemplates,
  createActivityFromTemplate,
  getLookAheadDashboardStats,
} from '@/lib/api/services/look-ahead'
import type {
  LookAheadActivity,
  LookAheadActivityWithDetails,
  LookAheadActivityFilters,
  LookAheadConstraint,
  LookAheadSnapshot,
  CreateLookAheadActivityDTO,
  UpdateLookAheadActivityDTO,
  CreateLookAheadConstraintDTO,
  UpdateLookAheadConstraintDTO,
  CreateLookAheadSnapshotDTO,
  PPCMetrics,
  WeekRange,
  LookAheadActivityStatus,
} from '@/types/look-ahead'

// Query Keys
export const lookAheadKeys = {
  all: ['look-ahead'] as const,
  activities: (projectId: string) => [...lookAheadKeys.all, 'activities', projectId] as const,
  activitiesWithFilters: (projectId: string, filters?: LookAheadActivityFilters) =>
    [...lookAheadKeys.activities(projectId), filters] as const,
  activitiesForWeek: (projectId: string, weekStartDate: string) =>
    [...lookAheadKeys.activities(projectId), 'week', weekStartDate] as const,
  activitiesByWeek: (projectId: string, baseDate?: Date) =>
    [...lookAheadKeys.activities(projectId), 'by-week', baseDate?.toISOString()] as const,
  activity: (activityId: string) => [...lookAheadKeys.all, 'activity', activityId] as const,
  constraints: (activityId: string) => [...lookAheadKeys.all, 'constraints', activityId] as const,
  projectConstraints: (projectId: string) =>
    [...lookAheadKeys.all, 'project-constraints', projectId] as const,
  snapshots: (projectId: string) => [...lookAheadKeys.all, 'snapshots', projectId] as const,
  ppc: (projectId: string) => [...lookAheadKeys.all, 'ppc', projectId] as const,
  templates: (companyId: string, trade?: string) =>
    [...lookAheadKeys.all, 'templates', companyId, trade] as const,
  dashboardStats: (projectId: string) =>
    [...lookAheadKeys.all, 'dashboard', projectId] as const,
}

// =============================================
// Activity Queries
// =============================================

/**
 * Get all activities for a project with optional filters
 */
export function useLookAheadActivities(
  projectId: string | undefined,
  filters?: LookAheadActivityFilters
) {
  return useQuery({
    queryKey: lookAheadKeys.activitiesWithFilters(projectId!, filters),
    queryFn: () => getLookAheadActivities(projectId!, filters),
    enabled: !!projectId,
  })
}

/**
 * Get activities for a specific week
 */
export function useActivitiesForWeek(
  projectId: string | undefined,
  weekStartDate: string | undefined
) {
  return useQuery({
    queryKey: lookAheadKeys.activitiesForWeek(projectId!, weekStartDate!),
    queryFn: () => getActivitiesForWeek(projectId!, weekStartDate!),
    enabled: !!projectId && !!weekStartDate,
  })
}

/**
 * Get activities grouped by week for 3-week view
 */
export function useActivitiesByWeek(projectId: string | undefined, baseDate?: Date) {
  return useQuery<{
    weeks: WeekRange[]
    activities: Record<number, LookAheadActivityWithDetails[]>
  }>({
    queryKey: lookAheadKeys.activitiesByWeek(projectId!, baseDate),
    queryFn: () => getActivitiesByWeek(projectId!, baseDate),
    enabled: !!projectId,
  })
}

/**
 * Get a single activity by ID
 */
export function useLookAheadActivity(activityId: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.activity(activityId!),
    queryFn: () => getLookAheadActivity(activityId!),
    enabled: !!activityId,
  })
}

// =============================================
// Activity Mutations
// =============================================

/**
 * Create a new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient()
  const { user, companyId } = useAuth()

  return useMutation<LookAheadActivity, Error, CreateLookAheadActivityDTO>({
    mutationFn: (dto) => createLookAheadActivity(dto, companyId!, user!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activities(data.project_id) })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.dashboardStats(data.project_id),
      })
    },
  })
}

/**
 * Update an activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<
    LookAheadActivity,
    Error,
    { activityId: string; dto: UpdateLookAheadActivityDTO }
  >({
    mutationFn: ({ activityId, dto }) => updateLookAheadActivity(activityId, dto, user!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activity(data.id) })
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activities(data.project_id) })
    },
  })
}

/**
 * Move activity to a different week
 */
export function useMoveActivityToWeek() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<
    LookAheadActivity,
    Error,
    { activityId: string; weekNumber: number; weekStartDate: string }
  >({
    mutationFn: ({ activityId, weekNumber, weekStartDate }) =>
      moveActivityToWeek(activityId, weekNumber, weekStartDate, user!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activity(data.id) })
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activities(data.project_id) })
    },
  })
}

/**
 * Update activity status
 */
export function useUpdateActivityStatus() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<
    LookAheadActivity,
    Error,
    { activityId: string; status: LookAheadActivityStatus; percentComplete?: number }
  >({
    mutationFn: ({ activityId, status, percentComplete }) =>
      updateActivityStatus(activityId, status, percentComplete, user?.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activity(data.id) })
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activities(data.project_id) })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.dashboardStats(data.project_id),
      })
    },
  })
}

/**
 * Delete an activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient()

  return useMutation<string, Error, { activityId: string; projectId: string }>({
    mutationFn: ({ activityId, projectId }) =>
      deleteLookAheadActivity(activityId).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.activities(projectId) })
      queryClient.invalidateQueries({ queryKey: lookAheadKeys.dashboardStats(projectId) })
    },
  })
}

// =============================================
// Constraint Queries
// =============================================

/**
 * Get constraints for an activity
 */
export function useActivityConstraints(activityId: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.constraints(activityId!),
    queryFn: () => getActivityConstraints(activityId!),
    enabled: !!activityId,
  })
}

/**
 * Get all open constraints for a project
 */
export function useProjectOpenConstraints(projectId: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.projectConstraints(projectId!),
    queryFn: () => getProjectOpenConstraints(projectId!),
    enabled: !!projectId,
  })
}

// =============================================
// Constraint Mutations
// =============================================

/**
 * Create a constraint
 */
export function useCreateConstraint() {
  const queryClient = useQueryClient()
  const { user, companyId } = useAuth()

  return useMutation<
    LookAheadConstraint,
    Error,
    { dto: CreateLookAheadConstraintDTO; projectId: string }
  >({
    mutationFn: ({ dto, projectId }) =>
      createLookAheadConstraint(dto, projectId, companyId!, user!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.constraints(data.activity_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activity(data.activity_id),
      })
      // Also invalidate project activities since blocked status might change
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.all,
      })
    },
  })
}

/**
 * Update a constraint
 */
export function useUpdateConstraint() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<
    LookAheadConstraint,
    Error,
    { constraintId: string; dto: UpdateLookAheadConstraintDTO; activityId: string }
  >({
    mutationFn: ({ constraintId, dto }) => updateLookAheadConstraint(constraintId, dto, user?.id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.constraints(variables.activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activity(variables.activityId),
      })
      // Invalidate all because blocked status might change
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.all,
      })
    },
  })
}

/**
 * Delete a constraint
 */
export function useDeleteConstraint() {
  const queryClient = useQueryClient()

  return useMutation<string, Error, { constraintId: string; activityId: string }>({
    mutationFn: ({ constraintId, activityId }) =>
      deleteLookAheadConstraint(constraintId).then(() => activityId),
    onSuccess: (activityId) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.constraints(activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activity(activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.all,
      })
    },
  })
}

// =============================================
// Snapshot & PPC Queries
// =============================================

/**
 * Get snapshots for a project
 */
export function useLookAheadSnapshots(projectId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: [...lookAheadKeys.snapshots(projectId!), limit],
    queryFn: () => getLookAheadSnapshots(projectId!, limit),
    enabled: !!projectId,
  })
}

/**
 * Get PPC metrics for a project
 */
export function usePPCMetrics(projectId: string | undefined) {
  return useQuery<PPCMetrics>({
    queryKey: lookAheadKeys.ppc(projectId!),
    queryFn: () => getPPCMetrics(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Create a weekly snapshot
 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient()
  const { user, companyId } = useAuth()

  return useMutation<LookAheadSnapshot, Error, CreateLookAheadSnapshotDTO>({
    mutationFn: (dto) => createLookAheadSnapshot(dto, companyId!, user!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.snapshots(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.ppc(data.project_id),
      })
    },
  })
}

// =============================================
// Template Queries
// =============================================

/**
 * Get templates for a company
 */
export function useLookAheadTemplates(trade?: string) {
  const { companyId } = useAuth()

  return useQuery({
    queryKey: lookAheadKeys.templates(companyId!, trade),
    queryFn: () => getLookAheadTemplates(companyId!, trade),
    enabled: !!companyId,
  })
}

/**
 * Create activity from template
 */
export function useCreateActivityFromTemplate() {
  const queryClient = useQueryClient()
  const { user, companyId } = useAuth()

  return useMutation<
    LookAheadActivity,
    Error,
    { templateId: string; projectId: string; overrides?: Partial<CreateLookAheadActivityDTO> }
  >({
    mutationFn: ({ templateId, projectId, overrides }) =>
      createActivityFromTemplate(templateId, projectId, companyId!, user!.id, overrides),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(data.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.dashboardStats(data.project_id),
      })
    },
  })
}

// =============================================
// Dashboard Query
// =============================================

/**
 * Get dashboard stats for a project
 */
export function useLookAheadDashboardStats(projectId: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.dashboardStats(projectId!),
    queryFn: () => getLookAheadDashboardStats(projectId!),
    enabled: !!projectId,
  })
}
