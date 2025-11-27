// File: /src/features/documents/hooks/useMarkups.ts
// React Query hooks for document markup operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { markupsApi, type DocumentMarkup } from '@/lib/api/services/markups'

/**
 * Fetch all markups for a document
 * @param documentId - Document ID
 * @param pageNumber - Optional page number for PDF documents
 */
export function useDocumentMarkups(
  documentId: string | undefined,
  pageNumber?: number | null
) {
  return useQuery({
    queryKey: ['markups', documentId, pageNumber],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')
      return await markupsApi.getDocumentMarkups(documentId, pageNumber)
    },
    enabled: !!documentId,
  })
}

/**
 * Fetch a single markup by ID
 */
export function useMarkup(markupId: string | undefined) {
  return useQuery({
    queryKey: ['markups', markupId],
    queryFn: async () => {
      if (!markupId) throw new Error('Markup ID required')
      return await markupsApi.getMarkup(markupId)
    },
    enabled: !!markupId,
  })
}

/**
 * Create a new markup annotation
 */
export function useCreateMarkup() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (
      markup: Omit<DocumentMarkup, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'>
    ) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      return await markupsApi.createMarkup({
        ...markup,
        created_by: userProfile.id,
      })
    },
    onSuccess: (data) => {
      // Invalidate all markup queries for this document
      queryClient.invalidateQueries({
        queryKey: ['markups', data.document_id],
        exact: false
      })
      // Invalidate the specific page queries
      queryClient.invalidateQueries({
        queryKey: ['markups', data.document_id, data.page_number],
        exact: false
      })
    },
  })
}

/**
 * Update an existing markup
 */
export function useUpdateMarkup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DocumentMarkup> & { id: string }) => {
      return await markupsApi.updateMarkup(id, updates)
    },
    onSuccess: (data) => {
      // Invalidate markup queries
      queryClient.invalidateQueries({
        queryKey: ['markups', data.document_id],
        exact: false
      })
      queryClient.invalidateQueries({
        queryKey: ['markups', data.id]
      })
    },
  })
}

/**
 * Delete a markup
 */
export function useDeleteMarkup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (markupId: string) => {
      await markupsApi.deleteMarkup(markupId)
      return markupId
    },
    onSuccess: () => {
      // Invalidate all markup queries
      queryClient.invalidateQueries({
        queryKey: ['markups'],
        exact: false
      })
    },
  })
}

/**
 * Batch create multiple markups
 * Useful for saving all annotations at once
 */
export function useBatchCreateMarkups() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (
      markups: Omit<DocumentMarkup, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'>[]
    ) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const markupsWithCreator = markups.map(markup => ({
        ...markup,
        created_by: userProfile.id,
      }))

      return await markupsApi.batchCreateMarkups(markupsWithCreator)
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        // Invalidate queries for the document
        queryClient.invalidateQueries({
          queryKey: ['markups', data[0].document_id],
          exact: false
        })
      }
    },
  })
}

/**
 * Batch delete multiple markups
 * Useful for clearing all annotations
 */
export function useBatchDeleteMarkups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (markupIds: string[]) => {
      await markupsApi.batchDeleteMarkups(markupIds)
      return markupIds
    },
    onSuccess: () => {
      // Invalidate all markup queries
      queryClient.invalidateQueries({
        queryKey: ['markups'],
        exact: false
      })
    },
  })
}
