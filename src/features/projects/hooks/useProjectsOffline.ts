// File: /src/features/projects/hooks/useProjectsOffline.ts
// Offline-enabled project hooks that combine React Query with offline sync
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { useProjectSync } from './useProjectSync'
import { useOfflineProjectStore } from '../store/offlineProjectStore'
import type { Project, CreateInput } from '@/types/database'
import { useEffect } from 'react'

/**
 * Offline-enabled hook for fetching projects assigned to current user
 * Falls back to cached data when offline
 */
export function useMyProjectsOffline() {
  const { userProfile } = useAuth()
  const {
    fetchAndCache,
    allProjects,
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  } = useProjectSync()
  const store = useOfflineProjectStore()

  // Initial fetch and cache
  useEffect(() => {
    if (userProfile?.id && navigator.onLine) {
      fetchAndCache()
    }
  }, [userProfile?.id, fetchAndCache])

  const query = useQuery({
    queryKey: ['my-projects-offline', userProfile?.id],
    queryFn: async () => {
      // If online, fetch fresh data and cache it
      if (navigator.onLine) {
        return await fetchAndCache()
      }
      // If offline, return cached data
      return allProjects
    },
    enabled: !!userProfile?.id,
    // Use cached data while revalidating
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
    // Return cached projects immediately if available
    placeholderData: () => {
      const cached = store.getAllProjects()
      return cached.length > 0 ? cached : undefined
    },
  })

  return {
    // Standard React Query returns
    data: query.data as Project[] | undefined,
    isLoading: query.isLoading && !store.cachedProjects.length,
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

    // Draft projects (created offline, not yet synced)
    draftProjects: store.draftProjects,
  }
}

/**
 * Offline-enabled hook for creating projects
 * Works offline by creating draft and queuing for sync
 */
export function useCreateProjectOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addDraftProject, manualSync, isOnline } = useProjectSync()

  return useMutation({
    mutationFn: async (project: CreateInput<'projects'>) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found')
      }

      // Create draft project (will be synced when online)
      const localId = addDraftProject({
        ...project,
        company_id: userProfile.company_id,
      })

      // If online, trigger immediate sync
      if (isOnline) {
        // Small delay to let state update
        setTimeout(() => manualSync(), 100)
      }

      return { id: localId, ...project } as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-projects-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating projects
 * Works offline by updating local cache and queuing for sync
 */
export function useUpdateProjectOffline() {
  const queryClient = useQueryClient()
  const { updateDraftProject, updateCachedProject, getProjectById, manualSync, isOnline } = useProjectSync()
  const store = useOfflineProjectStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const project = getProjectById(id)
      if (!project) {
        throw new Error('Project not found')
      }

      // Check if it's a draft (offline-created) or cached (from server)
      const isDraft = 'synced' in project

      if (isDraft) {
        updateDraftProject(id, updates)
      } else {
        updateCachedProject(id, updates)
        // Add to sync queue
        store.addToSyncQueue({
          projectId: id,
          action: 'update',
        })
      }

      // If online, trigger sync
      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { ...project, ...updates } as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-projects-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for deleting projects
 * Works offline by marking for deletion and queuing for sync
 */
export function useDeleteProjectOffline() {
  const queryClient = useQueryClient()
  const { queueDeletion, manualSync, isOnline } = useProjectSync()
  const store = useOfflineProjectStore()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const project = store.getProjectById(projectId)

      // If it's a draft that was never synced, just remove it locally
      if (project && 'synced' in project && !project.synced) {
        store.removeDraftProject(projectId)
        return
      }

      // Queue for deletion (will soft-delete on server when synced)
      queueDeletion(projectId)

      // If online, trigger sync
      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-projects-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: false })
    },
  })
}

/**
 * Hook to get a single project with offline support
 */
export function useProjectOffline(projectId: string | undefined) {
  const { getProjectById, fetchAndCache, isOnline } = useProjectSync()
  const store = useOfflineProjectStore()

  // Try to fetch fresh data if online
  useEffect(() => {
    if (projectId && navigator.onLine) {
      fetchAndCache()
    }
  }, [projectId, fetchAndCache])

  const query = useQuery({
    queryKey: ['project-offline', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      // First check local store
      const localProject = getProjectById(projectId)
      if (localProject) {
        return localProject as Project
      }

      // If online and not in cache, this is an error
      if (navigator.onLine) {
        throw new Error('Project not found')
      }

      return null
    },
    enabled: !!projectId,
    placeholderData: () => {
      if (!projectId) {return undefined}
      return store.getProjectById(projectId) as Project | undefined
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isOfflineData: !isOnline && !!query.data,
  }
}
