// Document mutations with automatic toast notifications
import { useQueryClient } from '@tanstack/react-query'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Document, Folder } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { documentAiApi } from '@/lib/api/services/document-ai'
import { logger } from '../../../lib/utils/logger';


// File types that can be processed by AI
const PROCESSABLE_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/gif',
  'image/webp',
]

// =============================================
// Document Mutations with Notifications
// =============================================

/**
 * Create new document with automatic success/error toast notifications
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
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
          created_by: userProfile.id,
        } as any)
        .select()
        .single()

      if (error) {throw error}
      return data as Document
    },
    successMessage: (data) => `Document "${data.name}" uploaded successfully`,
    errorMessage: (error) => `Failed to upload document: ${error.message}`,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id, data.folder_id] })

      // Trigger AI processing for processable file types
      if (data.file_type && PROCESSABLE_FILE_TYPES.includes(data.file_type)) {
        try {
          await documentAiApi.triggerOcrProcessing({
            document_id: data.id,
            priority: 100,
          })
          logger.log(`AI processing triggered for document ${data.id}`)
        } catch (error) {
          // Don't fail the upload if AI processing trigger fails
          logger.error('Failed to trigger AI processing:', error)
        }
      }
    },
  })
}

/**
 * Update document with automatic success/error toast notifications
 */
export function useUpdateDocumentWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Document,
    Error,
    { id: string; updates: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates as any as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Document
    },
    successMessage: (data) => `Document "${data.name}" updated successfully`,
    errorMessage: (error) => `Failed to update document: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id, data.folder_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.id, 'versions'] })
    },
  })
}

/**
 * Delete document with automatic success/error toast notifications (soft delete)
 */
export function useDeleteDocumentWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (documentId) => {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', documentId)

      if (error) {throw error}
    },
    successMessage: 'Document deleted successfully',
    errorMessage: (error) => `Failed to delete document: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// =============================================
// Folder Mutations with Notifications
// =============================================

/**
 * Create new folder with automatic success/error toast notifications
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
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      const { data, error } = await supabase
        .from('folders')
        .insert({
          ...folder,
          created_by: userProfile.id,
        } as any)
        .select()
        .single()

      if (error) {throw error}
      return data as Folder
    },
    successMessage: (data) => `Folder "${data.name}" created successfully`,
    errorMessage: (error) => `Failed to create folder: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id, data.parent_folder_id] })
    },
  })
}

/**
 * Update folder with automatic success/error toast notifications
 */
export function useUpdateFolderWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<
    Folder,
    Error,
    { id: string; updates: Partial<Omit<Folder, 'id' | 'created_at' | 'updated_at'>> }
  >({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('folders')
        .update(updates as any as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Folder
    },
    successMessage: (data) => `Folder "${data.name}" updated successfully`,
    errorMessage: (error) => `Failed to update folder: ${error.message}`,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id, data.parent_folder_id] })
    },
  })
}

/**
 * Delete folder with automatic success/error toast notifications (soft delete)
 */
export function useDeleteFolderWithNotification() {
  const queryClient = useQueryClient()

  return useMutationWithNotification<void, Error, string>({
    mutationFn: async (folderId) => {
      const { error } = await supabase
        .from('folders')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', folderId)

      if (error) {throw error}
    },
    successMessage: 'Folder deleted successfully',
    errorMessage: (error) => `Failed to delete folder: ${error.message}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}
