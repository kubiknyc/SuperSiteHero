// File: /src/features/rfis/hooks/useRFIAttachments.ts
// Hook for managing RFI file attachments using Supabase storage

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  uploadFile,
  deleteFile,
  getSignedDownloadUrl,
  formatFileSize,
  getFileExtension,
} from '@/features/documents/utils/fileUtils'

// =============================================
// Type Definitions
// =============================================

export interface RFIAttachment {
  id: string
  rfi_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  description?: string
  uploaded_by: string
  uploaded_at: string
}

export interface RFIAttachmentUploadInput {
  rfiId: string
  projectId: string
  file: File
  description?: string
}

// =============================================
// Storage Bucket Configuration
// =============================================

// RFI documents are stored in the 'documents' bucket under an 'rfis' subdirectory
const STORAGE_BUCKET = 'documents'

/**
 * Generate storage path for RFI attachment
 */
function generateRFIStoragePath(projectId: string, rfiId: string, fileName: string): string {
  const timestamp = Date.now()
  const ext = getFileExtension(fileName)
  const cleanName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50)

  return `${projectId}/rfis/${rfiId}/${timestamp}-${cleanName}.${ext}`
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all attachments for an RFI
 *
 * Note: Since there's no join table, we identify RFI documents by:
 * - document_type = 'rfi'
 * - name contains RFI ID pattern
 *
 * Usage:
 * const { data: attachments, isLoading } = useRFIAttachments(rfiId, projectId)
 */
export function useRFIAttachments(rfiId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: ['rfis', rfiId, 'attachments'],
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID is required')}

      // Query documents linked to this RFI via naming convention
      // Documents are identified by document_type='rfi' and name pattern
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'rfi')
        .ilike('name', `%${rfiId}%`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      // Transform to attachment format
      return (data || []).map((doc) => ({
        id: doc.id,
        rfi_id: rfiId,
        file_name: doc.file_name || doc.name,
        file_path: doc.file_url || '',
        file_size: doc.file_size || 0,
        file_type: doc.file_type || '',
        description: doc.description,
        uploaded_by: doc.created_by || '',
        uploaded_at: doc.created_at,
      })) as RFIAttachment[]
    },
    enabled: !!rfiId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Upload attachment to RFI
 *
 * Uploads file to storage and creates document record linked to RFI
 *
 * Usage:
 * const uploadAttachment = useUploadRFIAttachment()
 * await uploadAttachment.mutateAsync({
 *   rfiId,
 *   projectId,
 *   file: selectedFile,
 *   description: 'Site condition photo'
 * })
 */
export function useUploadRFIAttachment() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ rfiId, projectId, file, description }: RFIAttachmentUploadInput) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated to upload attachments')
      }

      if (!rfiId || !projectId) {
        throw new Error('RFI ID and Project ID are required')
      }

      // Upload file to storage
      const { path, publicUrl } = await uploadFile(file, projectId, STORAGE_BUCKET)

      // Create document record linked to RFI
      // Store RFI ID in name for identification
      const documentName = `RFI-${rfiId}-${file.name}`

      const { data: document, error } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: documentName,
          file_name: file.name,
          document_type: 'rfi',
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          description: description || null,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {
        // Clean up uploaded file on error
        try {
          await deleteFile(path, STORAGE_BUCKET)
        } catch {
          // Ignore cleanup errors
        }
        throw error
      }

      return {
        id: document.id,
        rfi_id: rfiId,
        file_name: document.file_name || document.name,
        file_path: document.file_url || '',
        file_size: document.file_size || 0,
        file_type: document.file_type || '',
        description: document.description,
        uploaded_by: document.created_by || '',
        uploaded_at: document.created_at || '',
      } as RFIAttachment
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfis', variables.rfiId, 'attachments'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', variables.rfiId] })
    },
  })
}

/**
 * Delete attachment from RFI
 *
 * Removes document record and deletes file from storage
 *
 * Usage:
 * const deleteAttachment = useDeleteRFIAttachment()
 * await deleteAttachment.mutateAsync({ attachmentId, rfiId })
 */
export function useDeleteRFIAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ attachmentId, rfiId }: { attachmentId: string; rfiId: string }) => {
      if (!attachmentId) {throw new Error('Attachment ID is required')}

      // Get document to find file URL
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', attachmentId)
        .single()

      if (fetchError) {throw fetchError}

      // Soft delete document record
      const { error: deleteError } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', attachmentId)

      if (deleteError) {throw deleteError}

      // Delete file from storage
      // Extract storage path from file_url if needed
      if (document?.file_url) {
        try {
          // The file_url might be a full URL, extract the path
          const urlObj = new URL(document.file_url)
          const storagePath = urlObj.pathname.split('/').slice(-2).join('/')
          await deleteFile(storagePath, STORAGE_BUCKET)
        } catch {
          // Log but don't fail - record is already deleted
          console.warn('Failed to delete file from storage:', document.file_url)
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rfis', variables.rfiId, 'attachments'] })
    },
  })
}

/**
 * Get download URL for attachment
 *
 * Generates a signed URL for downloading the attachment
 *
 * Usage:
 * const { mutateAsync: getDownloadUrl } = useGetRFIAttachmentUrl()
 * const url = await getDownloadUrl(attachmentId)
 * window.open(url, '_blank')
 */
export function useGetRFIAttachmentUrl() {
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!attachmentId) {throw new Error('Attachment ID is required')}

      // Get document to find file URL
      const { data: document, error } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', attachmentId)
        .single()

      if (error) {throw error}
      if (!document?.file_url) {throw new Error('Attachment not found')}

      // Extract storage path from file_url
      const urlObj = new URL(document.file_url)
      const storagePath = urlObj.pathname.split('/').slice(-2).join('/')

      // Generate signed URL
      const signedUrl = await getSignedDownloadUrl(storagePath, STORAGE_BUCKET)
      return signedUrl
    },
  })
}

// =============================================
// Utility Exports
// =============================================

export { formatFileSize, getFileExtension }
