// Hooks for document and folder queries and mutations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Document, Folder } from '@/types/database'

// =============================================
// Document Queries
// =============================================

/**
 * Fetch all documents for a project, optionally filtered by folder
 * @param projectId - Required project ID
 * @param folderId - Optional folder ID to filter documents
 */
export function useDocuments(projectId: string | undefined, folderId?: string | null) {
  return useQuery({
    queryKey: ['documents', projectId, folderId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      let query = supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      // Filter by folder if provided (null means root level)
      if (folderId !== undefined) {
        if (folderId === null) {
          query = query.is('folder_id', null)
        } else {
          query = query.eq('folder_id', folderId)
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as Document[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch single document by ID
 */
export function useDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ['documents', documentId],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) throw error
      return data as Document
    },
    enabled: !!documentId,
  })
}

/**
 * Fetch all versions of a document (documents that supersede each other)
 * Includes the current document and all versions it supersedes
 */
export function useDocumentVersions(documentId: string | undefined) {
  return useQuery({
    queryKey: ['documents', documentId, 'versions'],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      // Find all documents in this version chain
      // This includes documents that supersede this one, and documents this supersedes
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .or(`id.eq.${documentId},supersedes_document_id.eq.${documentId}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Document[]
    },
    enabled: !!documentId,
  })
}

// =============================================
// Folder Queries
// =============================================

/**
 * Fetch all folders for a project, optionally filtered by parent folder
 * @param projectId - Required project ID
 * @param parentFolderId - Optional parent folder ID to filter child folders
 */
export function useFolders(projectId: string | undefined, parentFolderId?: string | null) {
  return useQuery({
    queryKey: ['folders', projectId, parentFolderId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      let query = supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      // Filter by parent folder if provided (null means root level)
      if (parentFolderId !== undefined) {
        if (parentFolderId === null) {
          query = query.is('parent_folder_id', null)
        } else {
          query = query.eq('parent_folder_id', parentFolderId)
        }
      }

      const { data, error } = await query.order('sort_order', { ascending: true })

      if (error) throw error
      return data as Folder[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch single folder by ID
 */
export function useFolder(folderId: string | undefined) {
  return useQuery({
    queryKey: ['folders', folderId],
    queryFn: async () => {
      if (!folderId) throw new Error('Folder ID required')

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single()

      if (error) throw error
      return data as Folder
    },
    enabled: !!folderId,
  })
}

// =============================================
// Document Mutations
// =============================================

/**
 * Create new document mutation
 */
export function useCreateDocument() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (document: Omit<Document, 'id' | 'created_at' | 'updated_at'>) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
          created_by: userProfile.id,
        } as any)
        .select()
        .single()

      if (error) throw error
      return data as Document
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.project_id, data.folder_id] })
    },
  })
}

/**
 * Update document mutation
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Document> & { id: string }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Document
    },
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
 * Delete document mutation (soft delete)
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', documentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// =============================================
// Folder Mutations
// =============================================

/**
 * Create new folder mutation
 */
export function useCreateFolder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (folder: Omit<Folder, 'id' | 'created_at' | 'updated_at'>) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('folders')
        .insert({
          ...folder,
          created_by: userProfile.id,
        } as any)
        .select()
        .single()

      if (error) throw error
      return data as Folder
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id, data.parent_folder_id] })
    },
  })
}

/**
 * Update folder mutation
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Folder> & { id: string }) => {
      const { data, error } = await supabase
        .from('folders')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Folder
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.id] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id, data.parent_folder_id] })
    },
  })
}

/**
 * Delete folder mutation (soft delete)
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('folders')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', folderId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}
