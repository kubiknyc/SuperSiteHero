/**
 * Safety Observations React Query Hooks
 *
 * Provides data fetching and mutation hooks for safety observation management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/notifications/ToastContext'
import { safetyObservationsApi } from '@/lib/api/services/safety-observations'
import type {
  SafetyObservation,
  SafetyObservationWithDetails,
  ObservationPhoto,
  ObservationComment,
  ObserverPoints,
  LeaderboardEntry,
  CreateObservationDTO,
  UpdateObservationDTO,
  CreateObservationPhotoDTO,
  CreateObservationCommentDTO,
  ObservationFilters,
  LeaderboardFilters,
  ObservationStats,
  LeadingIndicators,
} from '@/types/safety-observations'

// ============================================================================
// Query Keys
// ============================================================================

export const observationKeys = {
  all: ['observations'] as const,
  lists: () => [...observationKeys.all, 'list'] as const,
  list: (filters: ObservationFilters) => [...observationKeys.lists(), filters] as const,
  details: () => [...observationKeys.all, 'detail'] as const,
  detail: (id: string) => [...observationKeys.details(), id] as const,
  stats: (projectId?: string, companyId?: string) =>
    [...observationKeys.all, 'stats', projectId, companyId] as const,
  indicators: (projectId?: string, companyId?: string) =>
    [...observationKeys.all, 'indicators', projectId, companyId] as const,
  recent: (projectId: string) => [...observationKeys.all, 'recent', projectId] as const,
  photos: (observationId: string) => [...observationKeys.all, 'photos', observationId] as const,
  comments: (observationId: string) => [...observationKeys.all, 'comments', observationId] as const,
  leaderboard: (filters: LeaderboardFilters) =>
    [...observationKeys.all, 'leaderboard', filters] as const,
  myPoints: (projectId?: string) => [...observationKeys.all, 'myPoints', projectId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch observations with optional filters
 */
export function useObservations(filters: ObservationFilters = {}) {
  return useQuery({
    queryKey: observationKeys.list(filters),
    queryFn: () => safetyObservationsApi.getObservations(filters),
  })
}

/**
 * Fetch a single observation
 */
export function useObservation(id: string) {
  return useQuery({
    queryKey: observationKeys.detail(id),
    queryFn: () => safetyObservationsApi.getObservation(id),
    enabled: !!id,
  })
}

/**
 * Fetch observation with all related data
 */
export function useObservationWithDetails(id: string) {
  return useQuery({
    queryKey: [...observationKeys.detail(id), 'details'],
    queryFn: () => safetyObservationsApi.getObservationWithDetails(id),
    enabled: !!id,
  })
}

/**
 * Fetch observation statistics
 */
export function useObservationStats(projectId?: string, companyId?: string) {
  return useQuery({
    queryKey: observationKeys.stats(projectId, companyId),
    queryFn: () => safetyObservationsApi.getStats(projectId, companyId),
  })
}

/**
 * Fetch leading indicators
 */
export function useLeadingIndicators(projectId?: string, companyId?: string) {
  return useQuery({
    queryKey: observationKeys.indicators(projectId, companyId),
    queryFn: () => safetyObservationsApi.getLeadingIndicators(projectId, companyId),
  })
}

/**
 * Fetch recent observations for a project
 */
export function useRecentObservations(projectId: string, limit = 5) {
  return useQuery({
    queryKey: observationKeys.recent(projectId),
    queryFn: () => safetyObservationsApi.getRecentObservations(projectId, limit),
    enabled: !!projectId,
  })
}

/**
 * Fetch photos for an observation
 */
export function useObservationPhotos(observationId: string) {
  return useQuery({
    queryKey: observationKeys.photos(observationId),
    queryFn: () => safetyObservationsApi.getObservationPhotos(observationId),
    enabled: !!observationId,
  })
}

/**
 * Fetch comments for an observation
 */
export function useObservationComments(observationId: string) {
  return useQuery({
    queryKey: observationKeys.comments(observationId),
    queryFn: () => safetyObservationsApi.getObservationComments(observationId),
    enabled: !!observationId,
  })
}

/**
 * Fetch leaderboard
 */
export function useLeaderboard(filters: LeaderboardFilters = {}) {
  return useQuery({
    queryKey: observationKeys.leaderboard(filters),
    queryFn: () => safetyObservationsApi.getLeaderboard(filters),
  })
}

/**
 * Fetch current user's points
 */
export function useMyPoints(projectId?: string) {
  return useQuery({
    queryKey: observationKeys.myPoints(projectId),
    queryFn: () => safetyObservationsApi.getMyPoints(projectId),
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new observation
 */
export function useCreateObservation() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateObservationDTO) => safetyObservationsApi.createObservation(data),
    onSuccess: (observation: SafetyObservation) => {
      queryClient.invalidateQueries({ queryKey: observationKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: observationKeys.stats(observation.project_id),
      })
      queryClient.invalidateQueries({ queryKey: observationKeys.leaderboard({}) })
      queryClient.invalidateQueries({ queryKey: observationKeys.myPoints() })
      showToast({
        type: 'success',
        title: 'Observation Submitted',
        message: `Observation ${observation.observation_number} has been submitted successfully. You earned ${observation.points_awarded} points!`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to submit observation',
      })
    },
  })
}

/**
 * Update an observation
 */
export function useUpdateObservation() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateObservationDTO }) =>
      safetyObservationsApi.updateObservation(id, data),
    onSuccess: (observation: SafetyObservation) => {
      queryClient.invalidateQueries({ queryKey: observationKeys.detail(observation.id) })
      queryClient.invalidateQueries({ queryKey: observationKeys.lists() })
      showToast({
        type: 'success',
        title: 'Observation Updated',
        message: 'The observation has been updated successfully.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update observation',
      })
    },
  })
}

/**
 * Delete an observation
 */
export function useDeleteObservation() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyObservationsApi.deleteObservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: observationKeys.lists() })
      showToast({
        type: 'success',
        title: 'Observation Deleted',
        message: 'The observation has been deleted.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete observation',
      })
    },
  })
}

/**
 * Acknowledge an observation
 */
export function useAcknowledgeObservation() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyObservationsApi.acknowledgeObservation(id),
    onSuccess: (observation: SafetyObservation) => {
      queryClient.invalidateQueries({ queryKey: observationKeys.detail(observation.id) })
      queryClient.invalidateQueries({ queryKey: observationKeys.lists() })
      showToast({
        type: 'success',
        title: 'Observation Acknowledged',
        message: `Observation ${observation.observation_number} has been acknowledged.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to acknowledge observation',
      })
    },
  })
}

/**
 * Mark observation as requiring action
 */
export function useRequireAction() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      assignedTo,
      dueDate,
      correctiveAction,
    }: {
      id: string
      assignedTo: string
      dueDate?: string
      correctiveAction?: string
    }) => safetyObservationsApi.requireAction(id, assignedTo, dueDate, correctiveAction),
    onSuccess: (observation: SafetyObservation) => {
      queryClient.invalidateQueries({ queryKey: observationKeys.detail(observation.id) })
      queryClient.invalidateQueries({ queryKey: observationKeys.lists() })
      showToast({
        type: 'success',
        title: 'Action Required',
        message: 'Corrective action has been assigned.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to assign action',
      })
    },
  })
}

/**
 * Resolve an observation
 */
export function useResolveObservation() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, resolutionNotes }: { id: string; resolutionNotes: string }) =>
      safetyObservationsApi.resolveObservation(id, resolutionNotes),
    onSuccess: (observation: SafetyObservation) => {
      queryClient.invalidateQueries({ queryKey: observationKeys.detail(observation.id) })
      queryClient.invalidateQueries({ queryKey: observationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: observationKeys.stats() })
      showToast({
        type: 'success',
        title: 'Observation Resolved',
        message: `Observation ${observation.observation_number} has been resolved.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to resolve observation',
      })
    },
  })
}

/**
 * Close an observation
 */
export function useCloseObservation() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyObservationsApi.closeObservation(id),
    onSuccess: (observation: SafetyObservation) => {
      queryClient.invalidateQueries({ queryKey: observationKeys.detail(observation.id) })
      queryClient.invalidateQueries({ queryKey: observationKeys.lists() })
      showToast({
        type: 'success',
        title: 'Observation Closed',
        message: `Observation ${observation.observation_number} has been closed.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to close observation',
      })
    },
  })
}

// ============================================================================
// Photo Mutation Hooks
// ============================================================================

/**
 * Add a photo to an observation
 */
export function useAddObservationPhoto() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateObservationPhotoDTO) => safetyObservationsApi.addPhoto(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: observationKeys.photos(variables.observation_id),
      })
      queryClient.invalidateQueries({
        queryKey: observationKeys.detail(variables.observation_id),
      })
      showToast({
        type: 'success',
        title: 'Photo Added',
        message: 'Photo has been added to the observation.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add photo',
      })
    },
  })
}

/**
 * Upload and add a photo
 */
export function useUploadObservationPhoto() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({
      observationId,
      file,
      caption,
    }: {
      observationId: string
      file: File
      caption?: string
    }) => safetyObservationsApi.uploadPhoto(observationId, file, caption),
    onSuccess: (photo: ObservationPhoto) => {
      queryClient.invalidateQueries({
        queryKey: observationKeys.photos(photo.observation_id),
      })
      queryClient.invalidateQueries({
        queryKey: observationKeys.detail(photo.observation_id),
      })
      showToast({
        type: 'success',
        title: 'Photo Uploaded',
        message: 'Photo has been uploaded successfully.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to upload photo',
      })
    },
  })
}

/**
 * Remove a photo
 */
export function useRemoveObservationPhoto(observationId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (photoId: string) => safetyObservationsApi.removePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: observationKeys.photos(observationId) })
      queryClient.invalidateQueries({ queryKey: observationKeys.detail(observationId) })
      showToast({
        type: 'success',
        title: 'Photo Removed',
        message: 'Photo has been removed.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to remove photo',
      })
    },
  })
}

// ============================================================================
// Comment Mutation Hooks
// ============================================================================

/**
 * Add a comment to an observation
 */
export function useAddObservationComment() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateObservationCommentDTO) => safetyObservationsApi.addComment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: observationKeys.comments(variables.observation_id),
      })
      queryClient.invalidateQueries({
        queryKey: observationKeys.detail(variables.observation_id),
      })
      showToast({
        type: 'success',
        title: 'Comment Added',
        message: 'Your comment has been added.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add comment',
      })
    },
  })
}
