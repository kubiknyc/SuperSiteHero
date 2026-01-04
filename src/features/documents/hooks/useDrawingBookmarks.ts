// File: /src/features/documents/hooks/useDrawingBookmarks.ts
// Hook for managing drawing bookmarks with Supabase and React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  DrawingBookmark,
  CreateBookmarkInput,
  UpdateBookmarkInput,
  BookmarkFilters,
} from '../types/navigation'

// ============================================================
// QUERY KEYS
// ============================================================

export const drawingBookmarkKeys = {
  all: ['drawing-bookmarks'] as const,
  lists: () => [...drawingBookmarkKeys.all, 'list'] as const,
  list: (filters: BookmarkFilters) =>
    [...drawingBookmarkKeys.lists(), filters] as const,
  byProject: (projectId: string) =>
    [...drawingBookmarkKeys.all, 'project', projectId] as const,
  byDocument: (documentId: string) =>
    [...drawingBookmarkKeys.all, 'document', documentId] as const,
  detail: (id: string) => [...drawingBookmarkKeys.all, 'detail', id] as const,
  folders: (projectId: string) =>
    [...drawingBookmarkKeys.all, 'folders', projectId] as const,
}

// ============================================================
// DATABASE HELPER
// ============================================================

// Type assertion for accessing tables that may not be in the generated types
const db = supabase as any

// ============================================================
// FETCH HOOKS
// ============================================================

/**
 * Fetch drawing bookmarks with optional filtering
 *
 * @example
 * ```tsx
 * const { data: bookmarks, isLoading } = useDrawingBookmarks({
 *   projectId: 'proj-123',
 *   sharedOnly: false,
 * })
 * ```
 */
export function useDrawingBookmarks(filters: BookmarkFilters = {}) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: drawingBookmarkKeys.list(filters),
    queryFn: async () => {
      if (!userProfile?.id) {
        return []
      }

      let query = db
        .from('drawing_bookmarks')
        .select(`
          *,
          document:documents!drawing_bookmarks_document_id_fkey(
            id, name, drawing_number
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.documentId) {
        query = query.eq('document_id', filters.documentId)
      }

      if (filters.folder) {
        query = query.eq('folder', filters.folder)
      }

      // Filter by ownership or shared status
      if (filters.sharedOnly) {
        query = query.eq('shared', true)
      } else {
        // Show own bookmarks and shared ones
        query = query.or(`user_id.eq.${userProfile.id},shared.eq.true`)
      }

      if (filters.searchQuery) {
        query = query.ilike('name', `%${filters.searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(mapBookmarkFromDb) as DrawingBookmark[]
    },
    enabled: !!userProfile?.id,
  })
}

/**
 * Fetch a single bookmark by ID
 */
export function useDrawingBookmark(bookmarkId: string | undefined) {
  return useQuery({
    queryKey: drawingBookmarkKeys.detail(bookmarkId || ''),
    queryFn: async () => {
      if (!bookmarkId) throw new Error('Bookmark ID required')

      const { data, error } = await db
        .from('drawing_bookmarks')
        .select(`
          *,
          document:documents!drawing_bookmarks_document_id_fkey(
            id, name, drawing_number
          )
        `)
        .eq('id', bookmarkId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return mapBookmarkFromDb(data) as DrawingBookmark
    },
    enabled: !!bookmarkId,
  })
}

/**
 * Fetch available bookmark folders for a project
 */
export function useBookmarkFolders(projectId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: drawingBookmarkKeys.folders(projectId || ''),
    queryFn: async () => {
      if (!projectId || !userProfile?.id) return []

      const { data, error } = await db
        .from('drawing_bookmarks')
        .select('folder')
        .eq('project_id', projectId)
        .or(`user_id.eq.${userProfile.id},shared.eq.true`)
        .is('deleted_at', null)
        .not('folder', 'is', null)

      if (error) throw error

      // Get unique folder names
      const folderSet = new Set((data || []).map((d: any) => d.folder))
      const folders = Array.from(folderSet)
      return folders.filter(Boolean).sort() as string[]
    },
    enabled: !!projectId && !!userProfile?.id,
  })
}

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Create a new drawing bookmark
 *
 * @example
 * ```tsx
 * const createBookmark = useCreateDrawingBookmark()
 *
 * await createBookmark.mutateAsync({
 *   projectId: 'proj-123',
 *   documentId: 'doc-456',
 *   pageNumber: 1,
 *   viewport: { x: 100, y: 200, zoom: 1.5 },
 *   name: 'Foundation Detail',
 *   shared: false,
 * })
 * ```
 */
export function useCreateDrawingBookmark() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateBookmarkInput) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await db
        .from('drawing_bookmarks')
        .insert({
          project_id: input.projectId,
          user_id: userProfile.id,
          document_id: input.documentId,
          page_number: input.pageNumber,
          viewport: input.viewport,
          name: input.name,
          folder: input.folder || null,
          shared: input.shared || false,
        })
        .select()
        .single()

      if (error) throw error
      return mapBookmarkFromDb(data) as DrawingBookmark
    },
    onMutate: async (newBookmark) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: drawingBookmarkKeys.all })

      // Snapshot previous value for rollback
      const previousBookmarks = queryClient.getQueryData(
        drawingBookmarkKeys.byProject(newBookmark.projectId)
      )

      // Optimistically add the new bookmark
      const optimisticBookmark: DrawingBookmark = {
        id: `temp-${Date.now()}`,
        projectId: newBookmark.projectId,
        userId: userProfile?.id || '',
        documentId: newBookmark.documentId,
        pageNumber: newBookmark.pageNumber,
        viewport: newBookmark.viewport,
        name: newBookmark.name,
        folder: newBookmark.folder,
        shared: newBookmark.shared || false,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData(
        drawingBookmarkKeys.byProject(newBookmark.projectId),
        (old: DrawingBookmark[] | undefined) => [optimisticBookmark, ...(old || [])]
      )

      return { previousBookmarks }
    },
    onError: (_err, newBookmark, context) => {
      // Rollback on error
      if (context?.previousBookmarks) {
        queryClient.setQueryData(
          drawingBookmarkKeys.byProject(newBookmark.projectId),
          context.previousBookmarks
        )
      }
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: drawingBookmarkKeys.byProject(variables.projectId),
      })
      queryClient.invalidateQueries({
        queryKey: drawingBookmarkKeys.byDocument(variables.documentId),
      })
      queryClient.invalidateQueries({
        queryKey: drawingBookmarkKeys.folders(variables.projectId),
      })
    },
  })
}

/**
 * Update an existing bookmark
 */
export function useUpdateDrawingBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateBookmarkInput) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (input.name !== undefined) updateData.name = input.name
      if (input.folder !== undefined) updateData.folder = input.folder
      if (input.shared !== undefined) updateData.shared = input.shared
      if (input.viewport !== undefined) updateData.viewport = input.viewport

      const { data, error } = await db
        .from('drawing_bookmarks')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return mapBookmarkFromDb(data) as DrawingBookmark
    },
    onMutate: async (updatedBookmark) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: drawingBookmarkKeys.detail(updatedBookmark.id),
      })

      // Snapshot previous value
      const previousBookmark = queryClient.getQueryData(
        drawingBookmarkKeys.detail(updatedBookmark.id)
      )

      // Optimistically update
      queryClient.setQueryData(
        drawingBookmarkKeys.detail(updatedBookmark.id),
        (old: DrawingBookmark | undefined) =>
          old
            ? {
                ...old,
                ...updatedBookmark,
                updatedAt: new Date().toISOString(),
              }
            : old
      )

      return { previousBookmark }
    },
    onError: (_err, updatedBookmark, context) => {
      // Rollback on error
      if (context?.previousBookmark) {
        queryClient.setQueryData(
          drawingBookmarkKeys.detail(updatedBookmark.id),
          context.previousBookmark
        )
      }
    },
    onSettled: () => {
      // Invalidate all bookmark queries
      queryClient.invalidateQueries({ queryKey: drawingBookmarkKeys.all })
    },
  })
}

/**
 * Delete a bookmark (soft delete)
 */
export function useDeleteDrawingBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await db
        .from('drawing_bookmarks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', bookmarkId)

      if (error) throw error
    },
    onMutate: async (bookmarkId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: drawingBookmarkKeys.all })

      // Get all list queries and remove the bookmark optimistically
      const queryCache = queryClient.getQueryCache()
      const listQueries = queryCache.findAll({
        queryKey: drawingBookmarkKeys.lists(),
      })

      const previousData: Map<string, DrawingBookmark[]> = new Map()

      listQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey)
        const data = query.state.data as DrawingBookmark[] | undefined
        if (data) {
          previousData.set(key, data)
          queryClient.setQueryData(
            query.queryKey,
            data.filter((b) => b.id !== bookmarkId)
          )
        }
      })

      return { previousData }
    },
    onError: (_err, _bookmarkId, context) => {
      // Rollback on error
      context?.previousData.forEach((data, key) => {
        queryClient.setQueryData(JSON.parse(key), data)
      })
    },
    onSettled: () => {
      // Invalidate all bookmark queries
      queryClient.invalidateQueries({ queryKey: drawingBookmarkKeys.all })
    },
  })
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Map database record to DrawingBookmark type
 */
function mapBookmarkFromDb(record: any): DrawingBookmark {
  return {
    id: record.id,
    projectId: record.project_id,
    userId: record.user_id,
    documentId: record.document_id,
    pageNumber: record.page_number || 1,
    viewport: record.viewport || { x: 0, y: 0, zoom: 1 },
    name: record.name,
    folder: record.folder || undefined,
    shared: record.shared || false,
    createdAt: record.created_at,
    updatedAt: record.updated_at || undefined,
  }
}

/**
 * Custom hook that combines bookmarks with filtering and grouping utilities
 */
export function useDrawingBookmarksWithUtilities(projectId: string) {
  const { data: bookmarks = [], isLoading, error } = useDrawingBookmarks({ projectId })
  const { data: folders = [] } = useBookmarkFolders(projectId)

  const bookmarksByFolder = useMemo(() => {
    const grouped: Record<string, DrawingBookmark[]> = {
      unfiled: [],
    }

    bookmarks.forEach((bookmark) => {
      const folder = bookmark.folder || 'unfiled'
      if (!grouped[folder]) {
        grouped[folder] = []
      }
      grouped[folder].push(bookmark)
    })

    return grouped
  }, [bookmarks])

  const bookmarksByDocument = useMemo(() => {
    const grouped: Record<string, DrawingBookmark[]> = {}

    bookmarks.forEach((bookmark) => {
      if (!grouped[bookmark.documentId]) {
        grouped[bookmark.documentId] = []
      }
      grouped[bookmark.documentId].push(bookmark)
    })

    return grouped
  }, [bookmarks])

  const searchBookmarks = useCallback(
    (query: string): DrawingBookmark[] => {
      if (!query.trim()) return bookmarks

      const lowerQuery = query.toLowerCase()
      return bookmarks.filter(
        (bookmark) =>
          bookmark.name.toLowerCase().includes(lowerQuery) ||
          bookmark.folder?.toLowerCase().includes(lowerQuery)
      )
    },
    [bookmarks]
  )

  return {
    bookmarks,
    folders,
    bookmarksByFolder,
    bookmarksByDocument,
    searchBookmarks,
    isLoading,
    error,
  }
}

// ============================================================
// TYPE EXPORTS
// ============================================================

export type DrawingBookmarksHook = ReturnType<typeof useDrawingBookmarks>
export type DrawingBookmarksWithUtilitiesHook = ReturnType<
  typeof useDrawingBookmarksWithUtilities
>
