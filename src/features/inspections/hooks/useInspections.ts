/**
 * Inspections Hooks
 *
 * React Query hooks for inspections CRUD operations and related functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionsApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/api/errors'
import { logger } from '@/lib/utils/logger'
import type {
  Inspection,
  InspectionFilters,
  CreateInspectionInput,
  UpdateInspectionInput,
  RecordInspectionResultInput,
  InspectionWithRelations,
  InspectionStats,
} from '../types'

// Query key factory
export const inspectionKeys = {
  all: ['inspections'] as const,
  lists: () => [...inspectionKeys.all, 'list'] as const,
  list: (projectId: string, filters?: InspectionFilters) =>
    [...inspectionKeys.lists(), projectId, filters] as const,
  details: () => [...inspectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...inspectionKeys.details(), id] as const,
  stats: (projectId: string) => [...inspectionKeys.all, 'stats', projectId] as const,
  upcoming: (projectId: string) => [...inspectionKeys.all, 'upcoming', projectId] as const,
}

/**
 * Fetch all inspections for a project
 */
export function useInspections(projectId: string | undefined, filters?: InspectionFilters) {
  return useQuery({
    queryKey: inspectionKeys.list(projectId || '', filters),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      return inspectionsApi.getProjectInspections(projectId, filters)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single inspection by ID
 */
export function useInspection(id: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Inspection ID required')
      return inspectionsApi.getInspection(id)
    },
    enabled: !!id,
  })
}

/**
 * Fetch inspection statistics for a project
 */
export function useInspectionStats(projectId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.stats(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      return inspectionsApi.getInspectionStats(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch upcoming inspections (next 7 days)
 */
export function useUpcomingInspections(projectId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.upcoming(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')
      return inspectionsApi.getUpcomingInspections(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Create a new inspection
 */
export function useCreateInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateInspectionInput) => {
      return inspectionsApi.createInspection(data)
    },
    onSuccess: (data) => {
      // Invalidate all inspection lists for this project
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.list(data.project_id),
      })
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.stats(data.project_id),
      })
      // Invalidate upcoming
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.upcoming(data.project_id),
      })
    },
    onError: (error) => {
      logger.error('Error creating inspection:', getErrorMessage(error))
    },
  })
}

/**
 * Update an existing inspection
 */
export function useUpdateInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: UpdateInspectionInput & { id: string }) => {
      return inspectionsApi.updateInspection(id, updates)
    },
    onSuccess: (data) => {
      // Invalidate the specific inspection
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.detail(data.id),
      })
      // Invalidate all inspection lists for this project
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.list(data.project_id),
      })
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.stats(data.project_id),
      })
    },
    onError: (error) => {
      logger.error('Error updating inspection:', getErrorMessage(error))
    },
  })
}

/**
 * Delete an inspection (soft delete)
 */
export function useDeleteInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await inspectionsApi.deleteInspection(id)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      // Invalidate all inspection queries
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.all,
      })
    },
    onError: (error) => {
      logger.error('Error deleting inspection:', getErrorMessage(error))
    },
  })
}

/**
 * Record inspection result (pass/fail/conditional)
 */
export function useRecordInspectionResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RecordInspectionResultInput) => {
      return inspectionsApi.recordResult(input)
    },
    onSuccess: (data) => {
      // Invalidate the specific inspection
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.detail(data.id),
      })
      // Invalidate all inspection lists
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.list(data.project_id),
      })
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.stats(data.project_id),
      })
    },
    onError: (error) => {
      logger.error('Error recording inspection result:', getErrorMessage(error))
    },
  })
}

/**
 * Schedule reinspection for a failed inspection
 */
export function useScheduleReinspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      scheduledDate,
      scheduledTime,
    }: {
      id: string
      scheduledDate: string
      scheduledTime?: string
    }) => {
      return inspectionsApi.scheduleReinspection(id, scheduledDate, scheduledTime)
    },
    onSuccess: (data) => {
      // Invalidate the specific inspection
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.detail(data.id),
      })
      // Invalidate all inspection lists
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.list(data.project_id),
      })
      // Invalidate upcoming
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.upcoming(data.project_id),
      })
    },
    onError: (error) => {
      logger.error('Error scheduling reinspection:', getErrorMessage(error))
    },
  })
}

/**
 * Cancel an inspection
 */
export function useCancelInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return inspectionsApi.cancelInspection(id)
    },
    onSuccess: (data) => {
      // Invalidate the specific inspection
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.detail(data.id),
      })
      // Invalidate all inspection lists
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.list(data.project_id),
      })
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.stats(data.project_id),
      })
    },
    onError: (error) => {
      logger.error('Error cancelling inspection:', getErrorMessage(error))
    },
  })
}
