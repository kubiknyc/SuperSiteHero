/**
 * Safety Incidents React Query Hooks
 *
 * Provides data fetching and mutation hooks for safety incident management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/notifications/ToastContext'
import { safetyIncidentsApi } from '@/lib/api/services/safety-incidents'
import type {
  SafetyIncident,
  SafetyIncidentWithDetails,
  IncidentPerson,
  IncidentPhoto,
  IncidentCorrectiveAction,
  CreateIncidentDTO,
  UpdateIncidentDTO,
  CreateIncidentPersonDTO,
  CreateIncidentPhotoDTO,
  CreateCorrectiveActionDTO,
  UpdateCorrectiveActionDTO,
  IncidentFilters,
  CorrectiveActionFilters,
  IncidentStats,
  CorrectiveActionStats,
} from '@/types/safety-incidents'

// ============================================================================
// Query Keys
// ============================================================================

export const incidentKeys = {
  all: ['incidents'] as const,
  lists: () => [...incidentKeys.all, 'list'] as const,
  list: (filters: IncidentFilters) => [...incidentKeys.lists(), filters] as const,
  details: () => [...incidentKeys.all, 'detail'] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  stats: (projectId?: string) => [...incidentKeys.all, 'stats', projectId] as const,
  recent: (projectId: string) => [...incidentKeys.all, 'recent', projectId] as const,
  people: (incidentId: string) => [...incidentKeys.all, 'people', incidentId] as const,
  photos: (incidentId: string) => [...incidentKeys.all, 'photos', incidentId] as const,
  actions: (filters?: CorrectiveActionFilters) => [...incidentKeys.all, 'actions', filters] as const,
  actionStats: (incidentId?: string) => [...incidentKeys.all, 'actionStats', incidentId] as const,
  // OSHA 300 Log keys
  osha300Summary: (year: number, projectId?: string) => [...incidentKeys.all, 'osha300Summary', year, projectId] as const,
  oshaRates: (year: number, hoursWorked: number, projectId?: string) => [...incidentKeys.all, 'oshaRates', year, hoursWorked, projectId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch incidents with optional filters
 */
export function useIncidents(filters: IncidentFilters = {}) {
  return useQuery({
    queryKey: incidentKeys.list(filters),
    queryFn: () => safetyIncidentsApi.getIncidents(filters),
  })
}

/**
 * Fetch a single incident
 */
export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => safetyIncidentsApi.getIncident(id),
    enabled: !!id,
  })
}

/**
 * Fetch incident with all related data
 */
export function useIncidentWithDetails(id: string) {
  return useQuery({
    queryKey: [...incidentKeys.detail(id), 'details'],
    queryFn: () => safetyIncidentsApi.getIncidentWithDetails(id),
    enabled: !!id,
  })
}

/**
 * Fetch incident statistics
 */
export function useIncidentStats(projectId?: string, companyId?: string) {
  return useQuery({
    queryKey: incidentKeys.stats(projectId),
    queryFn: () => safetyIncidentsApi.getStats(projectId, companyId),
  })
}

/**
 * Fetch recent incidents for a project
 */
export function useRecentIncidents(projectId: string, limit = 5) {
  return useQuery({
    queryKey: incidentKeys.recent(projectId),
    queryFn: () => safetyIncidentsApi.getRecentIncidents(projectId, limit),
    enabled: !!projectId,
  })
}

/**
 * Fetch people for an incident
 */
export function useIncidentPeople(incidentId: string) {
  return useQuery({
    queryKey: incidentKeys.people(incidentId),
    queryFn: () => safetyIncidentsApi.getIncidentPeople(incidentId),
    enabled: !!incidentId,
  })
}

/**
 * Fetch photos for an incident
 */
export function useIncidentPhotos(incidentId: string) {
  return useQuery({
    queryKey: incidentKeys.photos(incidentId),
    queryFn: () => safetyIncidentsApi.getIncidentPhotos(incidentId),
    enabled: !!incidentId,
  })
}

/**
 * Fetch corrective actions
 */
export function useCorrectiveActions(filters: CorrectiveActionFilters = {}) {
  return useQuery({
    queryKey: incidentKeys.actions(filters),
    queryFn: () => safetyIncidentsApi.getCorrectiveActions(filters),
  })
}

/**
 * Fetch corrective action statistics
 */
export function useCorrectiveActionStats(incidentId?: string) {
  return useQuery({
    queryKey: incidentKeys.actionStats(incidentId),
    queryFn: () => safetyIncidentsApi.getCorrectiveActionStats(incidentId),
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new incident
 */
export function useCreateIncident() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateIncidentDTO) => safetyIncidentsApi.createIncident(data),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: incidentKeys.stats(incident.project_id) })
      showToast({
        type: 'success',
        title: 'Incident Reported',
        message: `Incident ${incident.incident_number} has been reported successfully.`,
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to report incident',
      })
    },
  })
}

/**
 * Update an incident
 */
export function useUpdateIncident() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIncidentDTO }) =>
      safetyIncidentsApi.updateIncident(id, data),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incident.id) })
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() })
      showToast({
        type: 'success',
        title: 'Incident Updated',
        message: 'The incident has been updated successfully.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update incident',
      })
    },
  })
}

/**
 * Delete an incident
 */
export function useDeleteIncident() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyIncidentsApi.deleteIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() })
      showToast({
        type: 'success',
        title: 'Incident Deleted',
        message: 'The incident has been deleted.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete incident',
      })
    },
  })
}

/**
 * Close an incident
 */
export function useCloseIncident() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyIncidentsApi.closeIncident(id),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incident.id) })
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() })
      showToast({
        type: 'success',
        title: 'Incident Closed',
        message: `Incident ${incident.incident_number} has been closed.`,
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to close incident',
      })
    },
  })
}

/**
 * Start investigation on an incident
 */
export function useStartInvestigation() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyIncidentsApi.startInvestigation(id),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incident.id) })
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() })
      showToast({
        type: 'success',
        title: 'Investigation Started',
        message: `Investigation started for incident ${incident.incident_number}.`,
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to start investigation',
      })
    },
  })
}

// ============================================================================
// People Mutation Hooks
// ============================================================================

/**
 * Add a person to an incident
 */
export function useAddPerson() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateIncidentPersonDTO) => safetyIncidentsApi.addPerson(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.people(variables.incident_id) })
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(variables.incident_id) })
      showToast({
        type: 'success',
        title: 'Person Added',
        message: 'Person has been added to the incident.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add person',
      })
    },
  })
}

/**
 * Remove a person from an incident
 */
export function useRemovePerson(incidentId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (personId: string) => safetyIncidentsApi.removePerson(personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.people(incidentId) })
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) })
      showToast({
        type: 'success',
        title: 'Person Removed',
        message: 'Person has been removed from the incident.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to remove person',
      })
    },
  })
}

// ============================================================================
// Photo Mutation Hooks
// ============================================================================

/**
 * Add a photo to an incident
 */
export function useAddPhoto() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateIncidentPhotoDTO) => safetyIncidentsApi.addPhoto(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.photos(variables.incident_id) })
      showToast({
        type: 'success',
        title: 'Photo Added',
        message: 'Photo has been added to the incident.',
      })
    },
    onError: (error: any) => {
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
export function useUploadPhoto() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ incidentId, file, caption }: { incidentId: string; file: File; caption?: string }) =>
      safetyIncidentsApi.uploadPhoto(incidentId, file, caption),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.photos(photo.incident_id) })
      showToast({
        type: 'success',
        title: 'Photo Uploaded',
        message: 'Photo has been uploaded successfully.',
      })
    },
    onError: (error: any) => {
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
export function useRemovePhoto(incidentId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (photoId: string) => safetyIncidentsApi.removePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.photos(incidentId) })
      showToast({
        type: 'success',
        title: 'Photo Removed',
        message: 'Photo has been removed.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to remove photo',
      })
    },
  })
}

// ============================================================================
// Corrective Action Mutation Hooks
// ============================================================================

/**
 * Create a corrective action
 */
export function useCreateCorrectiveAction() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateCorrectiveActionDTO) => safetyIncidentsApi.createCorrectiveAction(data),
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.actions() })
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(action.incident_id) })
      showToast({
        type: 'success',
        title: 'Action Created',
        message: 'Corrective action has been created.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create corrective action',
      })
    },
  })
}

/**
 * Update a corrective action
 */
export function useUpdateCorrectiveAction() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCorrectiveActionDTO }) =>
      safetyIncidentsApi.updateCorrectiveAction(id, data),
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.actions() })
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(action.incident_id) })
      showToast({
        type: 'success',
        title: 'Action Updated',
        message: 'Corrective action has been updated.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update corrective action',
      })
    },
  })
}

/**
 * Complete a corrective action
 */
export function useCompleteCorrectiveAction() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      safetyIncidentsApi.completeCorrectiveAction(id, notes),
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.actions() })
      queryClient.invalidateQueries({ queryKey: incidentKeys.actionStats() })
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(action.incident_id) })
      showToast({
        type: 'success',
        title: 'Action Completed',
        message: 'Corrective action has been marked as completed.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to complete corrective action',
      })
    },
  })
}

/**
 * Delete a corrective action
 */
export function useDeleteCorrectiveAction() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => safetyIncidentsApi.deleteCorrectiveAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.actions() })
      queryClient.invalidateQueries({ queryKey: incidentKeys.actionStats() })
      showToast({
        type: 'success',
        title: 'Action Deleted',
        message: 'Corrective action has been deleted.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete corrective action',
      })
    },
  })
}

/**
 * Link corrective action to a task
 */
export function useLinkActionToTask() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ actionId, taskId }: { actionId: string; taskId: string }) =>
      safetyIncidentsApi.linkToTask(actionId, taskId),
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.actions() })
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(action.incident_id) })
      showToast({
        type: 'success',
        title: 'Action Linked',
        message: 'Corrective action has been linked to the task.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to link action to task',
      })
    },
  })
}

// ============================================================================
// OSHA 300 Log Hooks
// ============================================================================

/**
 * Fetch OSHA 300A Annual Summary
 */
export function useOSHA300ASummary(year: number, projectId?: string) {
  return useQuery({
    queryKey: incidentKeys.osha300Summary(year, projectId),
    queryFn: () => safetyIncidentsApi.getOSHA300ASummary(year, projectId),
  })
}

/**
 * Fetch OSHA incidence rates
 */
export function useOSHAIncidenceRates(year: number, hoursWorked: number, projectId?: string) {
  return useQuery({
    queryKey: incidentKeys.oshaRates(year, hoursWorked, projectId),
    queryFn: () => safetyIncidentsApi.getOSHAIncidenceRates(year, hoursWorked, projectId),
    enabled: hoursWorked > 0,
  })
}

/**
 * Generate next OSHA case number
 */
export function useGenerateCaseNumber() {
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ projectId, year }: { projectId: string; year?: number }) =>
      safetyIncidentsApi.getNextCaseNumber(projectId, year),
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to generate case number',
      })
    },
  })
}
