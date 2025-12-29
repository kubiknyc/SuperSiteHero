/**
 * Permits React Query Hooks
 *
 * React Query hooks for the Permits Tracking system
 * Building permits tracking with status workflow and renewal management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permitsApi } from '@/lib/api/services/permits'
import type {
  CreatePermitDTO,
  UpdatePermitDTO,
  PermitFilters,
  PermitStatus,
  PermitType,
} from '@/types/permits'

// =============================================================================
// QUERY KEYS
// =============================================================================

export const permitKeys = {
  all: ['permits'] as const,
  lists: () => [...permitKeys.all, 'list'] as const,
  list: (filters: PermitFilters) => [...permitKeys.lists(), filters] as const,
  details: () => [...permitKeys.all, 'detail'] as const,
  detail: (id: string) => [...permitKeys.details(), id] as const,
  project: (projectId: string) => [...permitKeys.all, 'project', projectId] as const,
  expiring: (projectId: string | undefined, days: number) =>
    [...permitKeys.all, 'expiring', projectId, days] as const,
  expired: (projectId: string | undefined) => [...permitKeys.all, 'expired', projectId] as const,
  critical: (projectId: string) => [...permitKeys.all, 'critical', projectId] as const,
  requiresInspections: (projectId: string) =>
    [...permitKeys.all, 'requires-inspections', projectId] as const,
  statistics: (projectId: string) => [...permitKeys.all, 'statistics', projectId] as const,
  byStatus: (projectId: string, status: string) =>
    [...permitKeys.all, 'by-status', projectId, status] as const,
  byType: (projectId: string, type: string) =>
    [...permitKeys.all, 'by-type', projectId, type] as const,
  needingReminder: () => [...permitKeys.all, 'needing-reminder'] as const,
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Hook to fetch permits with filters
 */
export function usePermits(filters: PermitFilters = {}) {
  return useQuery({
    queryKey: permitKeys.list(filters),
    queryFn: () => permitsApi.getPermits(filters),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch a single permit by ID
 */
export function usePermit(id: string | undefined) {
  return useQuery({
    queryKey: permitKeys.detail(id || ''),
    queryFn: () => permitsApi.getPermitById(id!),
    enabled: !!id,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch permits for a project
 */
export function useProjectPermits(projectId: string | undefined) {
  return useQuery({
    queryKey: permitKeys.project(projectId || ''),
    queryFn: () => permitsApi.getProjectPermits(projectId!),
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch expiring permits
 */
export function useExpiringPermits(projectId: string | undefined, withinDays: number = 30) {
  return useQuery({
    queryKey: permitKeys.expiring(projectId, withinDays),
    queryFn: () => permitsApi.getExpiringPermits(projectId, withinDays),
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to fetch expired permits
 */
export function useExpiredPermits(projectId?: string) {
  return useQuery({
    queryKey: permitKeys.expired(projectId),
    queryFn: () => permitsApi.getExpiredPermits(projectId),
    staleTime: 60000,
  })
}

/**
 * Hook to fetch critical permits
 */
export function useCriticalPermits(projectId: string | undefined) {
  return useQuery({
    queryKey: permitKeys.critical(projectId || ''),
    queryFn: () => permitsApi.getCriticalPermits(projectId!),
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch permits requiring inspections
 */
export function usePermitsRequiringInspections(projectId: string | undefined) {
  return useQuery({
    queryKey: permitKeys.requiresInspections(projectId || ''),
    queryFn: () => permitsApi.getPermitsRequiringInspections(projectId!),
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch permit statistics
 */
export function usePermitStatistics(projectId: string | undefined) {
  return useQuery({
    queryKey: permitKeys.statistics(projectId || ''),
    queryFn: () => permitsApi.getPermitStatistics(projectId!),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to fetch permits by status
 */
export function usePermitsByStatus(projectId: string | undefined, status: PermitStatus | string) {
  return useQuery({
    queryKey: permitKeys.byStatus(projectId || '', status),
    queryFn: () => permitsApi.getPermitsByStatus(projectId!, status),
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch permits by type
 */
export function usePermitsByType(projectId: string | undefined, permitType: PermitType | string) {
  return useQuery({
    queryKey: permitKeys.byType(projectId || '', permitType),
    queryFn: () => permitsApi.getPermitsByType(projectId!, permitType),
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch permits needing renewal reminder
 */
export function usePermitsNeedingRenewalReminder() {
  return useQuery({
    queryKey: permitKeys.needingReminder(),
    queryFn: () => permitsApi.getPermitsNeedingRenewalReminder(),
    staleTime: 300000, // 5 minutes
  })
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook to create a new permit
 */
export function useCreatePermit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreatePermitDTO) => permitsApi.createPermit(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: permitKeys.lists() })
      queryClient.invalidateQueries({ queryKey: permitKeys.project(data.project_id) })
      queryClient.invalidateQueries({ queryKey: permitKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Hook to update a permit
 */
export function useUpdatePermit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdatePermitDTO) =>
      permitsApi.updatePermit(id, dto),
    onSuccess: (data) => {
      queryClient.setQueryData(permitKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: permitKeys.lists() })
      queryClient.invalidateQueries({ queryKey: permitKeys.project(data.project_id) })
      queryClient.invalidateQueries({ queryKey: permitKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Hook to update permit status
 */
export function useUpdatePermitStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PermitStatus | string }) =>
      permitsApi.updatePermitStatus(id, status),
    onSuccess: (data) => {
      queryClient.setQueryData(permitKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: permitKeys.lists() })
      queryClient.invalidateQueries({ queryKey: permitKeys.project(data.project_id) })
      queryClient.invalidateQueries({ queryKey: permitKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Hook to delete a permit
 */
export function useDeletePermit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => permitsApi.deletePermit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: permitKeys.lists() })
      queryClient.removeQueries({ queryKey: permitKeys.detail(id) })
    },
  })
}

/**
 * Hook to mark renewal reminder as sent
 */
export function useMarkRenewalReminderSent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => permitsApi.markRenewalReminderSent(id),
    onSuccess: (data) => {
      queryClient.setQueryData(permitKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: permitKeys.needingReminder() })
    },
  })
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  // Query keys
  keys: permitKeys,

  // Query hooks
  usePermits,
  usePermit,
  useProjectPermits,
  useExpiringPermits,
  useExpiredPermits,
  useCriticalPermits,
  usePermitsRequiringInspections,
  usePermitStatistics,
  usePermitsByStatus,
  usePermitsByType,
  usePermitsNeedingRenewalReminder,

  // Mutation hooks
  useCreatePermit,
  useUpdatePermit,
  useUpdatePermitStatus,
  useDeletePermit,
  useMarkRenewalReminderSent,
}
