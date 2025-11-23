// File: /src/features/documents/hooks/useDocumentMutations.ts
// Document mutation hooks WITH notifications

import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { documentsApi } from '@/lib/api/services/documents'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Document, Folder } from '@/types/database'

/**
 * Create a new document with automatic success/error notifications
 */
export function useCreateDocumentWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    Document,
    Error,
    Omit<Document, 'id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: async (document) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return documentsApi.createDocument({
        ...document,
        created_by: userProfile.id,
      })
    },
    successMessage: (data) => `Document "${data.name}" uploaded successfully`,
    errorMessage: (error) => `Failed to upload document: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id] })
    },
  })
}

/**
 * Update a document with automatic success/error notifications
 */
export function useUpdateDocumentWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Document,
    Error,
    { id: string; data: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, data }) => {
      return documentsApi.updateDocument(id, data)
    },
    successMessage: (data) => `Document "${data.name}" updated successfully`,
    errorMessage: (error) => `Failed to update document: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.id] })
    },
  })
}

/**
 * Delete a document with automatic success/error notifications
 */
export function useDeleteDocumentWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (documentId) => {
      return documentsApi.deleteDocument(documentId)
    },
    successMessage: 'Document deleted successfully',
    errorMessage: (error) => `Failed to delete document: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

/**
 * Create a new folder with automatic notifications
 */
export function useCreateFolderWithNotification() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutationWithNotification<
    Folder,
    Error,
    Omit<Folder, 'id' | 'created_at' | 'updated_at'>
  >({
    mutationFn: async (folder) => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return documentsApi.createFolder({
        ...folder,
        created_by: userProfile.id,
      })
    },
    successMessage: (data) => `Folder "${data.name}" created successfully`,
    errorMessage: (error) => `Failed to create folder: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id] })
    },
  })
}

/**
 * Update a folder with automatic notifications
 */
export function useUpdateFolderWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Folder,
    Error,
    { id: string; data: Partial<Omit<Folder, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, data }) => {
      return documentsApi.updateFolder(id, data)
    },
    successMessage: (data) => `Folder "${data.name}" updated successfully`,
    errorMessage: (error) => `Failed to update folder: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id] })
    },
  })
}

/**
 * Delete a folder with automatic notifications
 */
export function useDeleteFolderWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (folderId) => {
      return documentsApi.deleteFolder(folderId)
    },
    successMessage: 'Folder deleted successfully',
    errorMessage: (error) => `Failed to delete folder: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}
