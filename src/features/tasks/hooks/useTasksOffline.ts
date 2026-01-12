// File: /src/features/tasks/hooks/useTasksOffline.ts
// Offline-enabled task hooks that combine React Query with offline sync
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { useTaskSync } from './useTaskSync'
import { useOfflineTaskStore } from '../store/offlineTaskStore'
import type { Task, CreateInput } from '@/types/database'
import { useEffect } from 'react'

/**
 * Offline-enabled hook for fetching tasks for a project
 * Falls back to cached data when offline
 */
export function useTasksOffline(projectId: string | undefined) {
  const {
    fetchAndCache,
    getTasksByProject,
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  } = useTaskSync()
  const store = useOfflineTaskStore()

  // Initial fetch and cache
  useEffect(() => {
    if (projectId && navigator.onLine) {
      fetchAndCache(projectId)
    }
  }, [projectId, fetchAndCache])

  const query = useQuery({
    queryKey: ['tasks-offline', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      // If online, fetch fresh data and cache it
      if (navigator.onLine) {
        return await fetchAndCache(projectId)
      }
      // If offline, return cached data
      return getTasksByProject(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    placeholderData: () => {
      if (!projectId) {return undefined}
      const cached = store.getTasksByProject(projectId)
      return cached.length > 0 ? cached : undefined
    },
  })

  return {
    data: query.data as Task[] | undefined,
    isLoading: query.isLoading && !store.cachedTasks.length,
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

    // Draft tasks
    draftTasks: store.draftTasks.filter((t) => t.project_id === projectId),
  }
}

/**
 * Offline-enabled hook for fetching tasks assigned to current user
 */
export function useMyTasksOffline(projectId?: string) {
  const { userProfile } = useAuth()
  const {
    fetchAndCache,
    allTasks,
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  } = useTaskSync()
  const store = useOfflineTaskStore()

  useEffect(() => {
    if (userProfile?.id && navigator.onLine) {
      fetchAndCache(projectId)
    }
  }, [userProfile?.id, projectId, fetchAndCache])

  const query = useQuery({
    queryKey: ['my-tasks-offline', projectId, userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) {throw new Error('User ID required')}

      if (navigator.onLine) {
        const tasks = await fetchAndCache(projectId)
        // Filter to user's tasks
        return tasks.filter((t) => {
          const task = t as Task
          return task.assigned_to_user_id === userProfile.id
        })
      }

      // Offline: filter cached tasks
      const allCached = projectId
        ? store.getTasksByProject(projectId)
        : store.getAllTasks()
      return allCached.filter((t) => {
        const task = t as Task
        return task.assigned_to_user_id === userProfile.id
      })
    },
    enabled: !!userProfile?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  })

  return {
    data: query.data as Task[] | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  }
}

/**
 * Offline-enabled hook for creating tasks
 */
export function useCreateTaskOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addDraftTask, manualSync, isOnline } = useTaskSync()

  return useMutation({
    mutationFn: async (task: CreateInput<'tasks'> & { project_id: string }) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const localId = addDraftTask({
        ...task,
        project_id: task.project_id,
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: localId, ...task } as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['my-tasks-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating tasks
 */
export function useUpdateTaskOffline() {
  const queryClient = useQueryClient()
  const { updateDraftTask, getTaskById, manualSync, isOnline } = useTaskSync()
  const store = useOfflineTaskStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const task = getTaskById(id)
      if (!task) {
        throw new Error('Task not found')
      }

      const isDraft = 'synced' in task

      if (isDraft) {
        updateDraftTask(id, updates)
      } else {
        store.updateCachedTask(id, updates)
        store.addToSyncQueue({
          taskId: id,
          action: 'update',
        })
      }

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { ...task, ...updates } as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['my-tasks-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating task status
 */
export function useUpdateTaskStatusOffline() {
  const queryClient = useQueryClient()
  const { updateStatus, manualSync, isOnline } = useTaskSync()

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      updateStatus(taskId, status)

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: taskId, status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['my-tasks-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for deleting tasks
 */
export function useDeleteTaskOffline() {
  const queryClient = useQueryClient()
  const { queueDeletion, manualSync, isOnline } = useTaskSync()
  const store = useOfflineTaskStore()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const task = store.getTaskById(taskId)

      if (task && 'synced' in task && !task.synced) {
        store.removeDraftTask(taskId)
        return
      }

      queueDeletion(taskId)

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['my-tasks-offline'], exact: false })
    },
  })
}

/**
 * Hook to get a single task with offline support
 */
export function useTaskOffline(taskId: string | undefined) {
  const { getTaskById, fetchAndCache, isOnline } = useTaskSync()
  const store = useOfflineTaskStore()

  useEffect(() => {
    if (taskId && navigator.onLine) {
      fetchAndCache()
    }
  }, [taskId, fetchAndCache])

  const query = useQuery({
    queryKey: ['task-offline', taskId],
    queryFn: async () => {
      if (!taskId) {throw new Error('Task ID required')}

      const localTask = getTaskById(taskId)
      if (localTask) {
        return localTask as Task
      }

      if (navigator.onLine) {
        throw new Error('Task not found')
      }

      return null
    },
    enabled: !!taskId,
    placeholderData: () => {
      if (!taskId) {return undefined}
      return store.getTaskById(taskId) as Task | undefined
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isOfflineData: !isOnline && !!query.data,
  }
}
