// File: /src/features/documents/hooks/useDocumentAi.ts
// React Query hooks for Document AI features (OCR, Categorization, Metadata, Similarity)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { documentAiApi } from '@/lib/api/services/document-ai'
import type {
  TriggerOcrRequest,
  UpdateCategoryRequest,
  ApplyMetadataRequest,
} from '@/types/document-ai'

// =============================================
// Query Keys
// =============================================

export const documentAiKeys = {
  all: ['document-ai'] as const,
  ocr: (documentId: string) => [...documentAiKeys.all, 'ocr', documentId] as const,
  category: (documentId: string) => [...documentAiKeys.all, 'category', documentId] as const,
  metadata: (documentId: string) => [...documentAiKeys.all, 'metadata', documentId] as const,
  similar: (documentId: string) => [...documentAiKeys.all, 'similar', documentId] as const,
  status: (documentId: string) => [...documentAiKeys.all, 'status', documentId] as const,
  search: (projectId: string, query: string) =>
    [...documentAiKeys.all, 'search', projectId, query] as const,
  queue: (projectId: string) => [...documentAiKeys.all, 'queue', projectId] as const,
  stats: (projectId: string) => [...documentAiKeys.all, 'stats', projectId] as const,
  projectStatus: (projectId: string) =>
    [...documentAiKeys.all, 'project-status', projectId] as const,
  categoryDistribution: (projectId: string) =>
    [...documentAiKeys.all, 'category-distribution', projectId] as const,
}

// =============================================
// OCR Queries and Mutations
// =============================================

/**
 * Get OCR result for a document
 */
export function useDocumentOcr(documentId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.ocr(documentId || ''),
    queryFn: () => documentAiApi.getOcrResult(documentId!),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Trigger OCR processing for a document
 */
export function useTriggerOcrProcessing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TriggerOcrRequest) => documentAiApi.triggerOcrProcessing(request),
    onSuccess: (data, variables) => {
      toast.success('OCR processing started')
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: documentAiKeys.status(variables.document_id),
      })
      queryClient.invalidateQueries({
        queryKey: documentAiKeys.ocr(variables.document_id),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start OCR processing')
    },
  })
}

/**
 * Reprocess OCR for a document
 */
export function useReprocessOcr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => documentAiApi.reprocessOcr(documentId),
    onSuccess: (_, documentId) => {
      toast.success('OCR reprocessing started')
      queryClient.invalidateQueries({
        queryKey: documentAiKeys.ocr(documentId),
      })
      queryClient.invalidateQueries({
        queryKey: documentAiKeys.status(documentId),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reprocess OCR')
    },
  })
}

// =============================================
// Category Queries and Mutations
// =============================================

/**
 * Get category for a document
 */
export function useDocumentCategory(documentId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.category(documentId || ''),
    queryFn: () => documentAiApi.getDocumentCategory(documentId!),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Update document category (manual override)
 */
export function useUpdateDocumentCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateCategoryRequest) => documentAiApi.updateDocumentCategory(request),
    onSuccess: (data, variables) => {
      toast.success('Category updated')
      queryClient.invalidateQueries({
        queryKey: documentAiKeys.category(variables.document_id),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category')
    },
  })
}

/**
 * Get suggested categories for a document
 */
export function useSuggestedCategories(documentId: string | undefined) {
  return useQuery({
    queryKey: [...documentAiKeys.category(documentId || ''), 'suggestions'],
    queryFn: () => documentAiApi.getSuggestedCategories(documentId!),
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000,
  })
}

// =============================================
// Metadata Queries and Mutations
// =============================================

/**
 * Get extracted metadata for a document
 */
export function useExtractedMetadata(documentId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.metadata(documentId || ''),
    queryFn: () => documentAiApi.getExtractedMetadata(documentId!),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Apply extracted metadata to document
 */
export function useApplyExtractedMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ApplyMetadataRequest) => documentAiApi.applyExtractedMetadata(request),
    onSuccess: (_, variables) => {
      toast.success('Metadata applied to document')
      // Invalidate document queries to show updated fields
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.document_id],
      })
      queryClient.invalidateQueries({
        queryKey: documentAiKeys.metadata(variables.document_id),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply metadata')
    },
  })
}

// =============================================
// Similarity Queries
// =============================================

/**
 * Get similar documents
 */
export function useSimilarDocuments(documentId: string | undefined, threshold: number = 0.5) {
  return useQuery({
    queryKey: [...documentAiKeys.similar(documentId || ''), threshold],
    queryFn: () => documentAiApi.getSimilarDocuments(documentId!, threshold),
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Find duplicate documents in a project
 */
export function useDuplicateDocuments(projectId: string | undefined, threshold: number = 0.9) {
  return useQuery({
    queryKey: [...documentAiKeys.all, 'duplicates', projectId, threshold],
    queryFn: () => documentAiApi.findDuplicates(projectId!, threshold),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

// =============================================
// Search Queries
// =============================================

/**
 * Search document content (full-text search including OCR)
 */
export function useDocumentContentSearch(
  projectId: string | undefined,
  query: string,
  options?: {
    includeContent?: boolean
    limit?: number
    enabled?: boolean
  }
) {
  const searchQuery = query.trim()

  return useQuery({
    queryKey: documentAiKeys.search(projectId || '', searchQuery),
    queryFn: () =>
      documentAiApi.searchDocumentContent({
        project_id: projectId!,
        query: searchQuery,
        include_content: options?.includeContent ?? true,
        limit: options?.limit ?? 50,
      }),
    enabled: !!projectId && searchQuery.length >= 2 && (options?.enabled ?? true),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// =============================================
// Processing Queue Queries and Mutations
// =============================================

/**
 * Get processing status for a document
 */
export function useDocumentProcessingStatus(documentId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.status(documentId || ''),
    queryFn: () => documentAiApi.getProcessingStatus(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => {
      // Poll more frequently while processing
      if (query.state.data?.is_processing) {
        return 3000 // 3 seconds
      }
      return false
    },
  })
}

/**
 * Get queued documents for a project
 */
export function useProcessingQueue(projectId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.queue(projectId || ''),
    queryFn: () => documentAiApi.getQueuedDocuments(projectId!),
    enabled: !!projectId,
    refetchInterval: 10000, // 10 seconds
  })
}

/**
 * Cancel document processing
 */
export function useCancelProcessing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => documentAiApi.cancelProcessing(documentId),
    onSuccess: (_, documentId) => {
      toast.success('Processing cancelled')
      queryClient.invalidateQueries({
        queryKey: documentAiKeys.status(documentId),
      })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel processing')
    },
  })
}

/**
 * Get processing queue statistics
 */
export function useProcessingStats(projectId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.stats(projectId || ''),
    queryFn: () => documentAiApi.getProcessingStats(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  })
}

// =============================================
// Project-Level Queries
// =============================================

/**
 * Get AI status for all documents in a project
 */
export function useProjectDocumentsAiStatus(projectId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.projectStatus(projectId || ''),
    queryFn: () => documentAiApi.getProjectDocumentsAiStatus(projectId!),
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Get category distribution for a project
 */
export function useCategoryDistribution(projectId: string | undefined) {
  return useQuery({
    queryKey: documentAiKeys.categoryDistribution(projectId || ''),
    queryFn: () => documentAiApi.getCategoryDistribution(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

// =============================================
// Utility Hooks
// =============================================

/**
 * Combined hook for document AI data
 * Returns OCR, category, metadata, and status in one query
 */
export function useDocumentAiData(documentId: string | undefined) {
  const ocr = useDocumentOcr(documentId)
  const category = useDocumentCategory(documentId)
  const metadata = useExtractedMetadata(documentId)
  const status = useDocumentProcessingStatus(documentId)

  return {
    ocr: ocr.data,
    category: category.data,
    metadata: metadata.data,
    status: status.data,
    isLoading: ocr.isLoading || category.isLoading || metadata.isLoading || status.isLoading,
    isError: ocr.isError || category.isError || metadata.isError || status.isError,
    error: ocr.error || category.error || metadata.error || status.error,
  }
}
