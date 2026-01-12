// File: /src/features/checklists/hooks/useChecklistsOffline.ts
// Offline-enabled checklist hooks that combine React Query with offline sync
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { useChecklistSync } from './useChecklistSync'
import { useOfflineChecklistStore } from '../store/offlineChecklistStore'
import type {
  ChecklistExecution,
  ChecklistTemplate,
  ChecklistFilters,
  ChecklistStatus,
  CreateChecklistExecutionDTO,
} from '@/types/checklists'
import { useEffect } from 'react'

/**
 * Offline-enabled hook for fetching checklist executions
 * Falls back to cached data when offline
 */
export function useExecutionsOffline(filters?: ChecklistFilters) {
  const {
    fetchAndCacheExecutions,
    getExecutionsByProject,
    getExecutionsByStatus,
    allExecutions,
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  } = useChecklistSync()
  const store = useOfflineChecklistStore()

  // Initial fetch and cache
  useEffect(() => {
    if (navigator.onLine) {
      fetchAndCacheExecutions(filters)
    }
  }, [filters?.project_id, filters?.status, fetchAndCacheExecutions])

  const query = useQuery({
    queryKey: ['checklist-executions-offline', filters],
    queryFn: async () => {
      if (navigator.onLine) {
        return await fetchAndCacheExecutions(filters)
      }

      // Offline filtering
      let executions = filters?.project_id
        ? getExecutionsByProject(filters.project_id)
        : allExecutions

      if (filters?.status) {
        executions = getExecutionsByStatus(filters.status)
      }

      return executions
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    placeholderData: () => {
      const cached = filters?.project_id
        ? store.getExecutionsByProject(filters.project_id)
        : store.getAllExecutions()
      return cached.length > 0 ? cached : undefined
    },
  })

  return {
    data: query.data as ChecklistExecution[] | undefined,
    isLoading: query.isLoading && !store.cachedExecutions.length,
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

    // Draft executions
    draftExecutions: filters?.project_id
      ? store.draftExecutions.filter((e) => e.project_id === filters.project_id)
      : store.draftExecutions,
  }
}

/**
 * Offline-enabled hook for fetching a single execution
 */
export function useExecutionOffline(executionId: string | undefined) {
  const { getExecutionById, fetchAndCacheExecutions, isOnline } = useChecklistSync()
  const store = useOfflineChecklistStore()

  useEffect(() => {
    if (executionId && navigator.onLine) {
      fetchAndCacheExecutions()
    }
  }, [executionId, fetchAndCacheExecutions])

  const query = useQuery({
    queryKey: ['checklist-execution-offline', executionId],
    queryFn: async () => {
      if (!executionId) {throw new Error('Execution ID required')}

      const localExecution = getExecutionById(executionId)
      if (localExecution) {
        return localExecution as ChecklistExecution
      }

      if (navigator.onLine) {
        throw new Error('Execution not found')
      }

      return null
    },
    enabled: !!executionId,
    placeholderData: () => {
      if (!executionId) {return undefined}
      return store.getExecutionById(executionId) as ChecklistExecution | undefined
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
 * Offline-enabled hook for fetching in-progress executions
 * Important for field workers to see their active checklists
 */
export function useInProgressExecutionsOffline(projectId?: string) {
  const { getInProgressExecutions, isOnline, syncStatus } = useChecklistSync()

  const query = useQuery({
    queryKey: ['in-progress-executions-offline', projectId],
    queryFn: () => getInProgressExecutions(projectId),
    staleTime: 1000 * 60, // 1 minute
  })

  return {
    data: query.data as ChecklistExecution[] | undefined,
    isLoading: query.isLoading,
    count: query.data?.length ?? 0,
    isOnline,
    syncStatus,
  }
}

/**
 * Offline-enabled hook for fetching templates
 * Templates are cached for offline use so inspections can be started
 */
export function useTemplatesOffline(companyId?: string) {
  const { fetchAndCacheTemplates, cachedTemplates, isOnline } = useChecklistSync()
  const store = useOfflineChecklistStore()

  useEffect(() => {
    if (navigator.onLine) {
      fetchAndCacheTemplates(companyId)
    }
  }, [companyId, fetchAndCacheTemplates])

  const query = useQuery({
    queryKey: ['checklist-templates-offline', companyId],
    queryFn: async () => {
      if (navigator.onLine) {
        return await fetchAndCacheTemplates(companyId)
      }
      return cachedTemplates
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - templates change less frequently
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    placeholderData: () => {
      return store.cachedTemplates.length > 0 ? store.cachedTemplates : undefined
    },
  })

  return {
    data: query.data as ChecklistTemplate[] | undefined,
    isLoading: query.isLoading,
    error: query.error,
    isOnline,
  }
}

/**
 * Offline-enabled hook for fetching template items
 */
export function useTemplateItemsOffline(templateId: string | undefined) {
  const { fetchAndCacheTemplateItems, getTemplateItems, isOnline } = useChecklistSync()
  const store = useOfflineChecklistStore()

  useEffect(() => {
    if (templateId && navigator.onLine) {
      fetchAndCacheTemplateItems(templateId)
    }
  }, [templateId, fetchAndCacheTemplateItems])

  const query = useQuery({
    queryKey: ['checklist-template-items-offline', templateId],
    queryFn: async () => {
      if (!templateId) {return []}

      if (navigator.onLine) {
        return await fetchAndCacheTemplateItems(templateId)
      }
      return getTemplateItems(templateId)
    },
    enabled: !!templateId,
    placeholderData: () => {
      if (!templateId) {return undefined}
      return store.getTemplateItems(templateId)
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isOnline,
  }
}

/**
 * Offline-enabled hook for creating checklist executions
 * Works offline - inspections can be started without network
 */
export function useCreateExecutionOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addDraftExecution, manualSync, isOnline } = useChecklistSync()

  return useMutation({
    mutationFn: async (data: CreateChecklistExecutionDTO) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const localId = addDraftExecution({
        ...data,
        inspector_user_id: data.inspector_user_id || userProfile.id,
        status: 'in_progress',
        is_completed: false,
        pause_count: 0,
        paused_duration_minutes: 0,
        score_pass: 0,
        score_fail: 0,
        score_na: 0,
        score_total: 0,
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: localId, ...data } as ChecklistExecution
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-executions'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['in-progress-executions-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating checklist executions
 */
export function useUpdateExecutionOffline() {
  const queryClient = useQueryClient()
  const { updateDraftExecution, getExecutionById, manualSync, isOnline } = useChecklistSync()
  const store = useOfflineChecklistStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChecklistExecution> & { id: string }) => {
      const execution = getExecutionById(id)
      if (!execution) {
        throw new Error('Execution not found')
      }

      const isDraft = 'synced' in execution

      if (isDraft) {
        updateDraftExecution(id, updates)
      } else {
        store.updateCachedExecution(id, updates)
        store.addToSyncQueue({
          entityType: 'execution',
          entityId: id,
          action: 'update',
        })
      }

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { ...execution, ...updates } as ChecklistExecution
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution-offline', data.id], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for submitting checklist executions
 */
export function useSubmitExecutionOffline() {
  const queryClient = useQueryClient()
  const { submitExecution, manualSync, isOnline } = useChecklistSync()

  return useMutation({
    mutationFn: async (executionId: string) => {
      submitExecution(executionId)

      if (isOnline) {
        manualSync()
      }

      return { id: executionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['checklist-execution-offline', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['in-progress-executions-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for adding responses to executions
 */
export function useAddResponseOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addResponse, manualSync, isOnline } = useChecklistSync()

  return useMutation({
    mutationFn: async ({
      executionId,
      response,
    }: {
      executionId: string
      response: Parameters<typeof addResponse>[1]
    }) => {
      const responseId = addResponse(executionId, {
        ...response,
        responded_by: response.responded_by || userProfile?.id,
      })

      // Don't sync immediately for responses - batch them
      return { id: responseId, executionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['checklist-execution-offline', data.executionId],
        exact: false,
      })
    },
  })
}

/**
 * Offline-enabled hook for adding photos to responses
 */
export function useAddChecklistPhotoOffline() {
  const queryClient = useQueryClient()
  const { addPhoto, manualSync, isOnline } = useChecklistSync()

  return useMutation({
    mutationFn: async ({
      executionId,
      responseId,
      file,
    }: {
      executionId: string
      responseId: string
      file: File
    }) => {
      const photoId = addPhoto(executionId, responseId, {
        file,
        localUrl: URL.createObjectURL(file),
        fileName: file.name,
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 500) // Slight delay to batch photos
      }

      return { id: photoId, executionId, responseId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['checklist-execution-offline', data.executionId],
        exact: false,
      })
    },
  })
}

/**
 * Offline-enabled hook for deleting executions
 */
export function useDeleteExecutionOffline() {
  const queryClient = useQueryClient()
  const { queueDeletion, manualSync, isOnline } = useChecklistSync()
  const store = useOfflineChecklistStore()

  return useMutation({
    mutationFn: async (executionId: string) => {
      const execution = store.getExecutionById(executionId)

      if (execution && 'synced' in execution && !execution.synced) {
        store.removeDraftExecution(executionId)
        return
      }

      queueDeletion(executionId)

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-executions-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['in-progress-executions-offline'], exact: false })
    },
  })
}
