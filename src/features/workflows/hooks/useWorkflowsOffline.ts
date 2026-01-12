// File: /src/features/workflows/hooks/useWorkflowsOffline.ts
// Offline-enabled workflow hooks that combine React Query with offline sync
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { useWorkflowSync } from './useWorkflowSync'
import {
  useOfflineWorkflowStore,
  type DraftWorkflowItem,
  type CachedWorkflowItem,
} from '../store/offlineWorkflowStore'
import { useEffect } from 'react'

export interface WorkflowFilters {
  project_id?: string
  workflow_type_id?: string
  status?: string
  priority?: string
}

type WorkflowItem = DraftWorkflowItem | CachedWorkflowItem

/**
 * Offline-enabled hook for fetching workflow items
 * Falls back to cached data when offline
 */
export function useWorkflowItemsOffline(filters: WorkflowFilters = {}) {
  const {
    fetchAndCache,
    getItemsByProject,
    getItemsByType,
    getItemsByStatus,
    allItems,
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  } = useWorkflowSync()
  const store = useOfflineWorkflowStore()

  // Initial fetch and cache
  useEffect(() => {
    if (navigator.onLine) {
      fetchAndCache(filters.project_id, filters.workflow_type_id)
    }
  }, [filters.project_id, filters.workflow_type_id, fetchAndCache])

  const query = useQuery({
    queryKey: ['workflow-items-offline', filters],
    queryFn: async () => {
      if (navigator.onLine) {
        return await fetchAndCache(filters.project_id, filters.workflow_type_id)
      }

      // Offline filtering
      let items = filters.project_id
        ? getItemsByProject(filters.project_id)
        : filters.workflow_type_id
          ? getItemsByType(filters.workflow_type_id)
          : allItems

      if (filters.status) {
        items = items.filter((i) => i.status === filters.status)
      }

      if (filters.priority) {
        items = items.filter((i) => i.priority === filters.priority)
      }

      return items
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    placeholderData: () => {
      const cached = filters.project_id
        ? store.getItemsByProject(filters.project_id)
        : filters.workflow_type_id
          ? store.getItemsByType(filters.workflow_type_id)
          : store.getAllItems()
      return cached.length > 0 ? cached : undefined
    },
  })

  return {
    data: query.data as WorkflowItem[] | undefined,
    isLoading: query.isLoading && !store.cachedItems.length,
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

    // Draft items
    draftItems: filters.project_id
      ? store.draftItems.filter((i) => i.project_id === filters.project_id)
      : store.draftItems,
  }
}

/**
 * Offline-enabled hook for fetching a single workflow item
 */
export function useWorkflowItemOffline(itemId: string | undefined) {
  const { getItemById, fetchAndCache, isOnline } = useWorkflowSync()
  const store = useOfflineWorkflowStore()

  useEffect(() => {
    if (itemId && navigator.onLine) {
      fetchAndCache()
    }
  }, [itemId, fetchAndCache])

  const query = useQuery({
    queryKey: ['workflow-item-offline', itemId],
    queryFn: async () => {
      if (!itemId) {throw new Error('Item ID required')}

      const localItem = getItemById(itemId)
      if (localItem) {
        return localItem as WorkflowItem
      }

      if (navigator.onLine) {
        throw new Error('Workflow item not found')
      }

      return null
    },
    enabled: !!itemId,
    placeholderData: () => {
      if (!itemId) {return undefined}
      return store.getItemById(itemId) as WorkflowItem | undefined
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
 * Offline-enabled hook for fetching RFIs
 */
export function useRFIsOffline(projectId?: string) {
  const { rfis, fetchAndCache, isOnline, syncStatus, manualSync } = useWorkflowSync()
  const store = useOfflineWorkflowStore()

  useEffect(() => {
    if (navigator.onLine) {
      fetchAndCache(projectId)
    }
  }, [projectId, fetchAndCache])

  const query = useQuery({
    queryKey: ['rfis-offline', projectId],
    queryFn: async () => {
      if (navigator.onLine) {
        await fetchAndCache(projectId)
      }
      let items = rfis
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: () => {
      let items = store.getRFIs()
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items.length > 0 ? items : undefined
    },
  })

  return {
    data: query.data as WorkflowItem[] | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    count: query.data?.length ?? 0,
    isOnline,
    syncStatus,
    manualSync,
  }
}

/**
 * Offline-enabled hook for fetching Submittals
 */
export function useSubmittalsOffline(projectId?: string) {
  const { submittals, fetchAndCache, isOnline, syncStatus, manualSync } = useWorkflowSync()
  const store = useOfflineWorkflowStore()

  useEffect(() => {
    if (navigator.onLine) {
      fetchAndCache(projectId)
    }
  }, [projectId, fetchAndCache])

  const query = useQuery({
    queryKey: ['submittals-offline', projectId],
    queryFn: async () => {
      if (navigator.onLine) {
        await fetchAndCache(projectId)
      }
      let items = submittals
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: () => {
      let items = store.getSubmittals()
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items.length > 0 ? items : undefined
    },
  })

  return {
    data: query.data as WorkflowItem[] | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    count: query.data?.length ?? 0,
    isOnline,
    syncStatus,
    manualSync,
  }
}

/**
 * Offline-enabled hook for fetching Change Orders
 */
export function useChangeOrdersOffline(projectId?: string) {
  const { changeOrders, fetchAndCache, isOnline, syncStatus, manualSync } = useWorkflowSync()
  const store = useOfflineWorkflowStore()

  useEffect(() => {
    if (navigator.onLine) {
      fetchAndCache(projectId)
    }
  }, [projectId, fetchAndCache])

  const query = useQuery({
    queryKey: ['change-orders-offline', projectId],
    queryFn: async () => {
      if (navigator.onLine) {
        await fetchAndCache(projectId)
      }
      let items = changeOrders
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: () => {
      let items = store.getChangeOrders()
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items.length > 0 ? items : undefined
    },
  })

  return {
    data: query.data as WorkflowItem[] | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    count: query.data?.length ?? 0,
    isOnline,
    syncStatus,
    manualSync,
  }
}

/**
 * Offline-enabled hook for creating workflow items
 * Works offline - items are stored locally and synced when online
 */
export function useCreateWorkflowItemOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addDraftItem, manualSync, isOnline } = useWorkflowSync()

  return useMutation({
    mutationFn: async (
      item: Omit<
        DraftWorkflowItem,
        'id' | 'created_at' | 'synced' | 'offline_attachments' | 'offline_responses'
      >
    ) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const localId = addDraftItem({
        ...item,
        raised_by: item.raised_by || userProfile.id,
        status: item.status || 'open',
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: localId, ...item } as WorkflowItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['rfis-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['submittals-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['change-orders-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating workflow items
 */
export function useUpdateWorkflowItemOffline() {
  const queryClient = useQueryClient()
  const { updateDraftItem, getItemById, manualSync, isOnline } = useWorkflowSync()
  const store = useOfflineWorkflowStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowItem> & { id: string }) => {
      const item = getItemById(id)
      if (!item) {
        throw new Error('Workflow item not found')
      }

      const isDraft = 'synced' in item

      if (isDraft) {
        updateDraftItem(id, updates)
      } else {
        store.updateCachedItem(id, updates)
        store.addToSyncQueue({
          workflowItemId: id,
          action: 'update',
        })
      }

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { ...item, ...updates } as WorkflowItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-item-offline', data.id], exact: false })
      queryClient.invalidateQueries({ queryKey: ['rfis-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['submittals-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['change-orders-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating workflow item status
 */
export function useUpdateWorkflowStatusOffline() {
  const queryClient = useQueryClient()
  const { updateStatus, manualSync, isOnline } = useWorkflowSync()

  return useMutation({
    mutationFn: async ({
      itemId,
      status,
      resolution,
    }: {
      itemId: string
      status: string
      resolution?: string
    }) => {
      updateStatus(itemId, status, resolution)

      if (isOnline) {
        manualSync()
      }

      return { id: itemId, status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['rfis-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['submittals-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['change-orders-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for adding attachments to workflow items
 */
export function useAddWorkflowAttachmentOffline() {
  const queryClient = useQueryClient()
  const { addAttachment, manualSync, isOnline } = useWorkflowSync()

  return useMutation({
    mutationFn: async ({
      itemId,
      file,
    }: {
      itemId: string
      file: File
    }) => {
      const attachmentId = crypto.randomUUID()
      addAttachment(itemId, {
        id: attachmentId,
        localUrl: URL.createObjectURL(file),
        file,
        fileName: file.name,
        fileType: file.type,
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 500) // Slight delay to batch uploads
      }

      return { id: attachmentId, itemId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-item-offline', data.itemId],
        exact: false,
      })
    },
  })
}

/**
 * Offline-enabled hook for adding responses to workflow items
 */
export function useAddWorkflowResponseOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addResponse, manualSync, isOnline } = useWorkflowSync()

  return useMutation({
    mutationFn: async ({
      itemId,
      content,
    }: {
      itemId: string
      content: string
    }) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const responseId = crypto.randomUUID()
      addResponse(itemId, {
        id: responseId,
        content,
        respondedBy: userProfile.id,
        respondedAt: new Date().toISOString(),
        attachments: [],
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: responseId, itemId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-item-offline', data.itemId],
        exact: false,
      })
    },
  })
}

/**
 * Offline-enabled hook for deleting workflow items
 */
export function useDeleteWorkflowItemOffline() {
  const queryClient = useQueryClient()
  const { queueDeletion, manualSync, isOnline } = useWorkflowSync()
  const store = useOfflineWorkflowStore()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const item = store.getItemById(itemId)

      if (item && 'synced' in item && !item.synced) {
        store.removeDraftItem(itemId)
        return
      }

      queueDeletion(itemId)

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-items-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['workflow-items'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['rfis-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['submittals-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['change-orders-offline'], exact: false })
    },
  })
}

/**
 * Hook for open workflow items that need attention
 */
export function useOpenWorkflowItemsOffline(projectId?: string) {
  const { getItemsByStatus, isOnline, syncStatus } = useWorkflowSync()

  const query = useQuery({
    queryKey: ['open-workflow-items-offline', projectId],
    queryFn: () => {
      let items = getItemsByStatus('open')
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items
    },
    staleTime: 1000 * 60, // 1 minute
  })

  return {
    data: query.data as WorkflowItem[] | undefined,
    isLoading: query.isLoading,
    count: query.data?.length ?? 0,
    isOnline,
    syncStatus,
  }
}

/**
 * Hook for overdue workflow items
 */
export function useOverdueWorkflowItemsOffline(projectId?: string) {
  const { allItems, isOnline, syncStatus } = useWorkflowSync()

  const query = useQuery({
    queryKey: ['overdue-workflow-items-offline', projectId],
    queryFn: () => {
      const now = new Date()
      let items = allItems.filter((item) => {
        if (item.status === 'closed' || !item.due_date) {return false}
        return new Date(item.due_date) < now
      })
      if (projectId) {
        items = items.filter((i) => i.project_id === projectId)
      }
      return items
    },
    staleTime: 1000 * 60, // 1 minute
  })

  return {
    data: query.data as WorkflowItem[] | undefined,
    isLoading: query.isLoading,
    count: query.data?.length ?? 0,
    isOnline,
    syncStatus,
  }
}
