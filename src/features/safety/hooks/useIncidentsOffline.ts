// File: /src/features/safety/hooks/useIncidentsOffline.ts
// Offline-enabled safety incident hooks that combine React Query with offline sync
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { useSafetySync } from './useSafetySync'
import { useOfflineSafetyStore } from '../store/offlineSafetyStore'
import type { SafetyIncident, CreateInput } from '@/types/database'
import { useEffect } from 'react'
import type { IncidentFilters } from '@/types/safety-incidents'

/**
 * Offline-enabled hook for fetching safety incidents
 * Falls back to cached data when offline
 */
export function useIncidentsOffline(filters: IncidentFilters = {}) {
  const {
    fetchAndCache,
    getIncidentsByProject,
    getIncidentsBySeverity,
    allIncidents,
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  } = useSafetySync()
  const store = useOfflineSafetyStore()

  // Initial fetch and cache
  useEffect(() => {
    if (navigator.onLine) {
      fetchAndCache(filters.project_id)
    }
  }, [filters.project_id, fetchAndCache])

  const query = useQuery({
    queryKey: ['incidents-offline', filters],
    queryFn: async () => {
      if (navigator.onLine) {
        return await fetchAndCache(filters.project_id)
      }

      // Offline filtering
      let incidents = filters.project_id
        ? getIncidentsByProject(filters.project_id)
        : allIncidents

      // Apply severity filter
      if (filters.severity) {
        incidents = incidents.filter((i) => i.severity === filters.severity)
      }

      // Apply status filter
      if (filters.status) {
        incidents = incidents.filter((i) => i.status === filters.status)
      }

      return incidents
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    placeholderData: () => {
      const cached = filters.project_id
        ? store.getIncidentsByProject(filters.project_id)
        : store.getAllIncidents()
      return cached.length > 0 ? cached : undefined
    },
  })

  return {
    data: query.data as SafetyIncident[] | undefined,
    isLoading: query.isLoading && !store.cachedIncidents.length,
    error: query.error,
    refetch: query.refetch,

    // Offline sync state
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,

    // Actions
    manualSync,

    // Draft incidents
    draftIncidents: filters.project_id
      ? store.draftIncidents.filter((i) => i.project_id === filters.project_id)
      : store.draftIncidents,
  }
}

/**
 * Offline-enabled hook for fetching a single incident
 */
export function useIncidentOffline(incidentId: string | undefined) {
  const { getIncidentById, fetchAndCache, isOnline } = useSafetySync()
  const store = useOfflineSafetyStore()

  useEffect(() => {
    if (incidentId && navigator.onLine) {
      fetchAndCache()
    }
  }, [incidentId, fetchAndCache])

  const query = useQuery({
    queryKey: ['incident-offline', incidentId],
    queryFn: async () => {
      if (!incidentId) {throw new Error('Incident ID required')}

      const localIncident = getIncidentById(incidentId)
      if (localIncident) {
        return localIncident as SafetyIncident
      }

      if (navigator.onLine) {
        throw new Error('Incident not found')
      }

      return null
    },
    enabled: !!incidentId,
    placeholderData: () => {
      if (!incidentId) {return undefined}
      return store.getIncidentById(incidentId) as SafetyIncident | undefined
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isOfflineData: !isOnline && !!query.data,
  }
}

/**
 * Offline-enabled hook for creating safety incidents
 * Works offline - critical safety data is stored locally with high priority sync
 */
export function useCreateIncidentOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addDraftIncident, manualSync, isOnline } = useSafetySync()

  return useMutation({
    mutationFn: async (
      incident: Omit<CreateInput<'safety_incidents'>, 'reported_by'> & {
        project_id: string
        is_high_priority?: boolean
      }
    ) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const localId = addDraftIncident({
        ...incident,
        reported_by: userProfile.id,
        is_high_priority: incident.is_high_priority,
      })

      // Safety incidents sync immediately when online due to compliance needs
      if (isOnline) {
        manualSync()
      }

      return { id: localId, ...incident } as SafetyIncident
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['incidents'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating safety incidents
 */
export function useUpdateIncidentOffline() {
  const queryClient = useQueryClient()
  const { updateDraftIncident, getIncidentById, manualSync, isOnline } = useSafetySync()
  const store = useOfflineSafetyStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyIncident> & { id: string }) => {
      const incident = getIncidentById(id)
      if (!incident) {
        throw new Error('Incident not found')
      }

      const isDraft = 'synced' in incident

      if (isDraft) {
        updateDraftIncident(id, updates)
      } else {
        store.updateCachedIncident(id, updates)
        store.addToSyncQueue({
          incidentId: id,
          action: 'update',
        })
      }

      // Safety updates sync immediately
      if (isOnline) {
        manualSync()
      }

      return { ...incident, ...updates } as SafetyIncident
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['incidents'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['incident-offline', data.id], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating incident status
 */
export function useUpdateIncidentStatusOffline() {
  const queryClient = useQueryClient()
  const { updateStatus, manualSync, isOnline } = useSafetySync()

  return useMutation({
    mutationFn: async ({
      incidentId,
      status,
      resolution,
    }: {
      incidentId: string
      status: string
      resolution?: string
    }) => {
      updateStatus(incidentId, status, resolution)

      if (isOnline) {
        manualSync()
      }

      return { id: incidentId, status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['incidents'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for adding photos to incidents
 */
export function useAddIncidentPhotoOffline() {
  const queryClient = useQueryClient()
  const { addPhoto, manualSync, isOnline } = useSafetySync()

  return useMutation({
    mutationFn: async ({
      incidentId,
      file,
      caption,
    }: {
      incidentId: string
      file: File
      caption?: string
    }) => {
      const photoId = addPhoto(incidentId, {
        file,
        localUrl: URL.createObjectURL(file),
        fileName: file.name,
        caption,
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: photoId, incidentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['incident-offline', data.incidentId], exact: false })
    },
  })
}

/**
 * Hook for high priority incidents that need immediate attention
 * These are synced with highest priority when online
 */
export function useHighPriorityIncidentsOffline(projectId?: string) {
  const { getHighPriorityIncidents, isOnline, syncStatus } = useSafetySync()

  const query = useQuery({
    queryKey: ['high-priority-incidents-offline', projectId],
    queryFn: () => getHighPriorityIncidents(projectId),
    staleTime: 1000 * 30, // 30 seconds - check more frequently
    refetchInterval: isOnline ? 1000 * 60 : false, // Poll every minute when online
  })

  return {
    data: query.data as SafetyIncident[] | undefined,
    isLoading: query.isLoading,
    count: query.data?.length ?? 0,
    syncStatus,
  }
}
