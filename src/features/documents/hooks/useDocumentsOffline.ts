// File: /src/features/documents/hooks/useDocumentsOffline.ts
// Offline-enabled document hooks that combine React Query with offline sync
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { useDocumentSync } from './useDocumentSync'
import { useOfflineDocumentStore } from '../store/offlineDocumentStore'
import type { Document, CreateInput } from '@/types/database'
import { useEffect } from 'react'

/**
 * Offline-enabled hook for fetching documents for a project
 * Falls back to cached data when offline
 */
export function useDocumentsOffline(projectId: string | undefined, folderId?: string | null) {
  const {
    fetchAndCache,
    getDocumentsByProject,
    getDocumentsByFolder,
    syncStatus,
    syncError,
    hasPendingChanges,
    isOnline,
    lastSyncAt,
    manualSync,
  } = useDocumentSync()
  const store = useOfflineDocumentStore()

  // Initial fetch and cache
  useEffect(() => {
    if (projectId && navigator.onLine) {
      fetchAndCache(projectId, folderId)
    }
  }, [projectId, folderId, fetchAndCache])

  const query = useQuery({
    queryKey: ['documents-offline', projectId, folderId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      if (navigator.onLine) {
        return await fetchAndCache(projectId, folderId)
      }

      // Offline: return cached data with folder filtering
      if (folderId !== undefined) {
        return getDocumentsByFolder(folderId)
      }
      return getDocumentsByProject(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    placeholderData: () => {
      if (!projectId) {return undefined}
      const cached = folderId !== undefined
        ? store.getDocumentsByFolder(folderId)
        : store.getDocumentsByProject(projectId)
      return cached.length > 0 ? cached : undefined
    },
  })

  return {
    data: query.data as Document[] | undefined,
    isLoading: query.isLoading && !store.cachedDocuments.length,
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

    // Draft documents
    draftDocuments: projectId
      ? store.draftDocuments.filter((d) => d.project_id === projectId)
      : store.draftDocuments,
  }
}

/**
 * Offline-enabled hook for fetching a single document
 */
export function useDocumentOffline(documentId: string | undefined) {
  const { getDocumentById, fetchAndCache, isOnline } = useDocumentSync()
  const store = useOfflineDocumentStore()

  useEffect(() => {
    if (documentId && navigator.onLine) {
      fetchAndCache()
    }
  }, [documentId, fetchAndCache])

  const query = useQuery({
    queryKey: ['document-offline', documentId],
    queryFn: async () => {
      if (!documentId) {throw new Error('Document ID required')}

      const localDocument = getDocumentById(documentId)
      if (localDocument) {
        return localDocument as Document
      }

      if (navigator.onLine) {
        throw new Error('Document not found')
      }

      return null
    },
    enabled: !!documentId,
    placeholderData: () => {
      if (!documentId) {return undefined}
      return store.getDocumentById(documentId) as Document | undefined
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
 * Offline-enabled hook for fetching pinned documents
 */
export function usePinnedDocumentsOffline(projectId: string | undefined) {
  const { getPinnedDocuments, isOnline } = useDocumentSync()

  const query = useQuery({
    queryKey: ['pinned-documents-offline', projectId],
    queryFn: () => {
      if (!projectId) {return []}
      return getPinnedDocuments(projectId)
    },
    enabled: !!projectId,
  })

  return {
    data: query.data as Document[] | undefined,
    isLoading: query.isLoading,
    isOnline,
  }
}

/**
 * Offline-enabled hook for creating documents
 */
export function useCreateDocumentOffline() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addDraftDocument, manualSync, isOnline } = useDocumentSync()

  return useMutation({
    mutationFn: async (
      document: Omit<CreateInput<'documents'>, 'created_by'> & {
        project_id: string
        file_name: string
        file_url: string
        document_type: string
        name: string
        offline_file?: File
      }
    ) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }

      const localId = addDraftDocument({
        ...document,
        offline_file: document.offline_file || null,
      })

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: localId, ...document } as Document
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['documents'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for updating documents
 */
export function useUpdateDocumentOffline() {
  const queryClient = useQueryClient()
  const { updateDraftDocument, getDocumentById, manualSync, isOnline } = useDocumentSync()
  const store = useOfflineDocumentStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Document> & { id: string }) => {
      const document = getDocumentById(id)
      if (!document) {
        throw new Error('Document not found')
      }

      const isDraft = 'synced' in document

      if (isDraft) {
        updateDraftDocument(id, updates)
      } else {
        store.updateCachedDocument(id, updates)
        store.addToSyncQueue({
          documentId: id,
          action: 'update',
        })
      }

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { ...document, ...updates } as Document
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['documents'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['document-offline', data.id], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for toggling document pinned status
 */
export function useToggleDocumentPinnedOffline() {
  const queryClient = useQueryClient()
  const { togglePinned, manualSync, isOnline } = useDocumentSync()

  return useMutation({
    mutationFn: async (documentId: string) => {
      togglePinned(documentId)

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: documentId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['pinned-documents-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for moving documents to folders
 */
export function useMoveDocumentOffline() {
  const queryClient = useQueryClient()
  const { moveToFolder, manualSync, isOnline } = useDocumentSync()

  return useMutation({
    mutationFn: async ({
      documentId,
      folderId,
    }: {
      documentId: string
      folderId: string | null
    }) => {
      moveToFolder(documentId, folderId)

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }

      return { id: documentId, folderId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-offline'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for deleting documents
 */
export function useDeleteDocumentOffline() {
  const queryClient = useQueryClient()
  const { queueDeletion, manualSync, isOnline } = useDocumentSync()
  const store = useOfflineDocumentStore()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const document = store.getDocumentById(documentId)

      if (document && 'synced' in document && !document.synced) {
        store.removeDraftDocument(documentId)
        return
      }

      queueDeletion(documentId)

      if (isOnline) {
        setTimeout(() => manualSync(), 100)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-offline'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['documents'], exact: false })
    },
  })
}

/**
 * Offline-enabled hook for fetching documents by type
 */
export function useDocumentsByTypeOffline(projectId: string | undefined, documentType: string) {
  const { getDocumentsByType, fetchAndCache, isOnline } = useDocumentSync()
  const store = useOfflineDocumentStore()

  useEffect(() => {
    if (projectId && navigator.onLine) {
      fetchAndCache(projectId)
    }
  }, [projectId, fetchAndCache])

  const query = useQuery({
    queryKey: ['documents-by-type-offline', projectId, documentType],
    queryFn: () => {
      const docs = getDocumentsByType(documentType)
      // Filter by project if provided
      if (projectId) {
        return docs.filter((d) => d.project_id === projectId)
      }
      return docs
    },
    enabled: !!documentType,
  })

  return {
    data: query.data as Document[] | undefined,
    isLoading: query.isLoading,
    isOnline,
  }
}
