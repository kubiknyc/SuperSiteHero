// File: /src/features/documents/hooks/useDocumentFilters.ts
// Hook for advanced document filtering with multiple criteria

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Document, DocumentType, DocumentStatus } from '@/types/database'
import { logger } from '../../../lib/utils/logger';


export interface DocumentFiltersInput {
  projectId: string
  folderId?: string | null
  documentType?: DocumentType
  discipline?: string
  status?: DocumentStatus
  dateFrom?: Date
  dateTo?: Date
  hasPinned?: boolean
}

/**
 * useDocumentFilters Hook
 *
 * Advanced filtering of documents with multiple criteria support.
 *
 * Features:
 * - Filter by document type (drawing, specification, submittal, etc.)
 * - Filter by discipline (MEP, structural, architectural, etc.)
 * - Filter by status (current, superseded, archived, void)
 * - Filter by date range (created/modified date)
 * - Filter by pinned status
 * - Combine multiple filters
 * - Optional folder filtering
 *
 * @param filters - Filter criteria
 * @param options - Query options
 *
 * Usage:
 * ```tsx
 * const filters = {
 *   projectId,
 *   documentType: 'drawing',
 *   status: 'current',
 *   dateFrom: new Date('2024-01-01')
 * }
 * const { data: documents } = useDocumentFilters(filters)
 * ```
 */
export function useDocumentFilters(
  filters: DocumentFiltersInput,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {}

  return useQuery<Document[]>({
    queryKey: ['documents', 'filtered', filters],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)

      // Folder filter
      if (filters.folderId !== undefined) {
        if (filters.folderId === null) {
          query = query.is('folder_id', null)
        } else {
          query = query.eq('folder_id', filters.folderId)
        }
      }

      // Document type filter
      if (filters.documentType) {
        query = query.eq('document_type', filters.documentType)
      }

      // Discipline filter
      if (filters.discipline) {
        query = query.eq('discipline', filters.discipline)
      }

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Pinned filter
      if (filters.hasPinned !== undefined) {
        query = query.eq('is_pinned', filters.hasPinned)
      }

      // Date range filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString())
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString())
      }

      // Execute query
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        logger.error('Filter error:', error)
        throw error
      }

      return data as Document[]
    },
    enabled: enabled && !!filters.projectId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get available disciplines from documents
 */
export function useAvailableDisciplines(projectId: string) {
  return useQuery<string[]>({
    queryKey: ['documents', 'disciplines', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('discipline')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .not('discipline', 'is', null)
        .order('discipline', { ascending: true })

      if (error) {throw error}

      // Get unique disciplines
      const disciplines = new Set<string>()
      data?.forEach(doc => {
        if (doc.discipline) {
          disciplines.add(doc.discipline)
        }
      })

      return Array.from(disciplines)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 30,
  })
}

/**
 * Get document statistics for a project
 */
export interface DocumentStats {
  totalDocuments: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  pinnedCount: number
}

export function useDocumentStats(projectId: string) {
  return useQuery<DocumentStats>({
    queryKey: ['documents', 'stats', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('document_type, status, is_pinned')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (error) {throw error}

      const stats: DocumentStats = {
        totalDocuments: data?.length || 0,
        byType: {
          drawing: 0,
          specification: 0,
          submittal: 0,
          shop_drawing: 0,
          scope: 0,
          general: 0,
          photo: 0,
          other: 0,
        },
        byStatus: {
          current: 0,
          superseded: 0,
          archived: 0,
          void: 0,
        },
        pinnedCount: 0,
      }

      data?.forEach(doc => {
        const type = doc.document_type as DocumentType | null
        const status = doc.status as DocumentStatus | null

        if (type && type in stats.byType) {
          stats.byType[type]++
        }

        if (status && status in stats.byStatus) {
          stats.byStatus[status]++
        }

        if (doc.is_pinned) {
          stats.pinnedCount++
        }
      })

      return stats
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
  })
}
