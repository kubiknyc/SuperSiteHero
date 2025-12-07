/**
 * Look-Ahead Planning React Query Hooks
 * Hooks for 3-week rolling schedule management
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
  LookAheadConstraint,
  LookAheadConstraintWithDetails,
  LookAheadSnapshot,
  LookAheadTemplate,
  CreateLookAheadActivityDTO,
  UpdateLookAheadActivityDTO,
  CreateLookAheadConstraintDTO,
  UpdateLookAheadConstraintDTO,
  CreateLookAheadSnapshotDTO,
  LookAheadActivityFilters,
  LookAheadActivityStatus,
  PPCMetrics,
  WeekRange,
} from '@/types/look-ahead'

// =============================================
// Query Keys
// =============================================

export const lookAheadKeys = {
  all: ['look-ahead'] as const,
  activities: (projectId: string) => [...lookAheadKeys.all, 'activities', projectId] as const,
  activitiesFiltered: (projectId: string, filters: LookAheadActivityFilters) =>
    [...lookAheadKeys.activities(projectId), filters] as const,
  activity: (activityId: string) => [...lookAheadKeys.all, 'activity', activityId] as const,
  weekActivities: (projectId: string, weekStart: string) =>
    [...lookAheadKeys.all, 'week', projectId, weekStart] as const,
  byWeek: (projectId: string, baseDate?: string) =>
    [...lookAheadKeys.all, 'by-week', projectId, baseDate] as const,
  constraints: (activityId: string) =>
    [...lookAheadKeys.all, 'constraints', activityId] as const,
  openConstraints: (projectId: string) =>
    [...lookAheadKeys.all, 'open-constraints', projectId] as const,
  snapshots: (projectId: string) => [...lookAheadKeys.all, 'snapshots', projectId] as const,
  ppcMetrics: (projectId: string) => [...lookAheadKeys.all, 'ppc', projectId] as const,
  templates: (companyId: string, trade?: string) =>
    [...lookAheadKeys.all, 'templates', companyId, trade] as const,
  dashboardStats: (projectId: string) =>
    [...lookAheadKeys.all, 'dashboard', projectId] as const,
}

// =============================================
// Activity Hooks
// =============================================

/**
 * Get all activities for a project
 */
export function useLookAheadActivities(
  projectId: string | undefined,
  filters?: LookAheadActivityFilters
) {
  return useQuery({
    queryKey: filters
      ? lookAheadKeys.activitiesFiltered(projectId!, filters)
      : lookAheadKeys.activities(projectId!),
    queryFn: () => getLookAheadActivities(projectId!, filters),
    enabled: !!projectId,
  })
}

/**
 * Get activities for a specific week
 */
export function useWeekActivities(projectId: string | undefined, weekStartDate: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.weekActivities(projectId!, weekStartDate!),
    queryFn: () => getActivitiesForWeek(projectId!, weekStartDate!),
    enabled: !!projectId && !!weekStartDate,
  })
}

/**
 * Get activities grouped by week (3-week view)
 */
export function useLookAheadByWeek(projectId: string | undefined, baseDate?: Date) {
  return useQuery({
    queryKey: lookAheadKeys.byWeek(projectId!, baseDate?.toISOString()),
    queryFn: () => getActivitiesByWeek(projectId!, baseDate),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Get a single activity
 */
export function useLookAheadActivity(activityId: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.activity(activityId!),
    queryFn: () => getLookAheadActivity(activityId!),
    enabled: !!activityId,
  })
}

/**
 * Create a new activity
 */
export function useCreateLookAheadActivity() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateLookAheadActivityDTO) =>
      createLookAheadActivity(dto, user!.company_id!, user!.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.dashboardStats(variables.project_id),
      })
    },
  })
}

/**
 * Update an activity
 */
export function useUpdateLookAheadActivity() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      dto,
    }: {
      activityId: string
      dto: UpdateLookAheadActivityDTO
      projectId: string
    }) => updateLookAheadActivity(activityId, dto, user!.id),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(lookAheadKeys.activity(variables.activityId), data)
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
    },
  })
}

/**
 * Move activity to a different week
 */
export function useMoveActivityToWeek() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      weekNumber,
      weekStartDate,
    }: {
      activityId: string
      weekNumber: number
      weekStartDate: string
      projectId: string
    }) => moveActivityToWeek(activityId, weekNumber, weekStartDate, user!.id),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(lookAheadKeys.activity(variables.activityId), data)
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
    },
  })
}

/**
 * Update activity status
 */
export function useUpdateActivityStatus() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
      status,
      percentComplete,
    }: {
      activityId: string
      status: LookAheadActivityStatus
      percentComplete?: number
      projectId: string
    }) => updateActivityStatus(activityId, status, percentComplete, user?.id),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(lookAheadKeys.activity(variables.activityId), data)
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.ppcMetrics(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.dashboardStats(variables.projectId),
      })
    },
  })
}

/**
 * Delete an activity
 */
export function useDeleteLookAheadActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      activityId,
    }: {
      activityId: string
      projectId: string
    }) => deleteLookAheadActivity(activityId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({
        queryKey: lookAheadKeys.activity(variables.activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.dashboardStats(variables.projectId),
      })
    },
  })
}

// =============================================
// Constraint Hooks
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
    queryKey: lookAheadKeys.openConstraints(projectId!),
    queryFn: () => getProjectOpenConstraints(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Create a constraint
 */
export function useCreateLookAheadConstraint() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      dto,
      projectId,
    }: {
      dto: CreateLookAheadConstraintDTO
      projectId: string
    }) => createLookAheadConstraint(dto, projectId, user!.company_id!, user!.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.constraints(variables.dto.activity_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activity(variables.dto.activity_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.openConstraints(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
    },
  })
}

/**
 * Update a constraint
 */
export function useUpdateLookAheadConstraint() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      constraintId,
      dto,
    }: {
      constraintId: string
      dto: UpdateLookAheadConstraintDTO
      activityId: string
      projectId: string
    }) => updateLookAheadConstraint(constraintId, dto, user?.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.constraints(variables.activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activity(variables.activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.openConstraints(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
    },
  })
}

/**
 * Delete a constraint
 */
export function useDeleteLookAheadConstraint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      constraintId,
    }: {
      constraintId: string
      activityId: string
      projectId: string
    }) => deleteLookAheadConstraint(constraintId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.constraints(variables.activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activity(variables.activityId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.openConstraints(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
    },
  })
}

// =============================================
// Snapshot & PPC Hooks
// =============================================

/**
 * Get snapshots for a project
 */
export function useLookAheadSnapshots(projectId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: lookAheadKeys.snapshots(projectId!),
    queryFn: () => getLookAheadSnapshots(projectId!, limit),
    enabled: !!projectId,
  })
}

/**
 * Create a weekly snapshot
 */
export function useCreateLookAheadSnapshot() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateLookAheadSnapshotDTO) =>
      createLookAheadSnapshot(dto, user!.company_id!, user!.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.snapshots(variables.project_id),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.ppcMetrics(variables.project_id),
      })
    },
  })
}

/**
 * Get PPC metrics
 */
export function usePPCMetrics(projectId: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.ppcMetrics(projectId!),
    queryFn: () => getPPCMetrics(projectId!),
    enabled: !!projectId,
  })
}

// =============================================
// Template Hooks
// =============================================

/**
 * Get templates for a company
 */
export function useLookAheadTemplates(trade?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: lookAheadKeys.templates(user?.company_id!, trade),
    queryFn: () => getLookAheadTemplates(user!.company_id!, trade),
    enabled: !!user?.company_id,
  })
}

/**
 * Create activity from template
 */
export function useCreateActivityFromTemplate() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      projectId,
      overrides,
    }: {
      templateId: string
      projectId: string
      overrides?: Partial<CreateLookAheadActivityDTO>
    }) =>
      createActivityFromTemplate(
        templateId,
        projectId,
        user!.company_id!,
        user!.id,
        overrides
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.activities(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: lookAheadKeys.byWeek(variables.projectId),
      })
    },
  })
}

// =============================================
// Dashboard Hook
// =============================================

/**
 * Get dashboard stats for a project
 */
export function useLookAheadDashboardStats(projectId: string | undefined) {
  return useQuery({
    queryKey: lookAheadKeys.dashboardStats(projectId!),
    queryFn: () => getLookAheadDashboardStats(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// =============================================
// Export all hooks
// =============================================

export {
  // Re-export types for convenience
  type LookAheadActivity,
  type LookAheadActivityWithDetails,
  type LookAheadConstraint,
  type LookAheadConstraintWithDetails,
  type LookAheadSnapshot,
  type LookAheadTemplate,
  type LookAheadActivityFilters,
  type PPCMetrics,
  type WeekRange,
}
