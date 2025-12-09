/**
 * Document AI Enhanced Hooks
 * React Query hooks for enhanced document AI features
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentEntityLinkingApi } from '@/lib/api/services/document-entity-linking'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type {
  EnhanceDocumentRequest,
  EnhanceDocumentResponse,
  DocumentLLMResult,
  DocumentEntityLink,
} from '@/types/ai'
import { toast } from 'sonner'

// Query keys
export const documentAiQueryKeys = {
  all: ['document-ai'] as const,
  llmResult: (documentId: string) => [...documentAiQueryKeys.all, 'llm-result', documentId] as const,
  entityLinks: (documentId: string) => [...documentAiQueryKeys.all, 'entity-links', documentId] as const,
}

/**
 * Hook to get LLM classification result for a document
 */
export function useDocumentLLMResult(documentId: string | undefined) {
  const { isEnabled } = useAIFeatureEnabled('document_enhancement')

  return useQuery({
    queryKey: documentAiQueryKeys.llmResult(documentId || ''),
    queryFn: () => documentEntityLinkingApi.getLLMResult(documentId!),
    enabled: isEnabled && !!documentId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook to get entity links for a document
 */
export function useDocumentEntityLinks(documentId: string | undefined) {
  const { isEnabled } = useAIFeatureEnabled('document_enhancement')

  return useQuery({
    queryKey: documentAiQueryKeys.entityLinks(documentId || ''),
    queryFn: () => documentEntityLinkingApi.getEntityLinks(documentId!),
    enabled: isEnabled && !!documentId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to enhance a document with AI
 */
export function useEnhanceDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: EnhanceDocumentRequest) =>
      documentEntityLinkingApi.enhanceDocument(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        documentAiQueryKeys.llmResult(variables.document_id),
        data.llmResult
      )
      queryClient.setQueryData(
        documentAiQueryKeys.entityLinks(variables.document_id),
        data.entityLinks
      )
      toast.success('Document enhanced successfully')
    },
    onError: (error) => {
      toast.error(`Enhancement failed: ${error.message}`)
    },
  })
}

/**
 * Hook to verify an entity link
 */
export function useVerifyEntityLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      linkId,
      userId,
      isCorrect,
    }: {
      linkId: string
      userId: string
      isCorrect: boolean
    }) => documentEntityLinkingApi.verifyLink(linkId, userId, isCorrect),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentAiQueryKeys.all })
      toast.success('Link verified')
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`)
    },
  })
}

/**
 * Hook to batch enhance documents
 */
export function useBatchEnhanceDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      options,
    }: {
      projectId: string
      options?: {
        limit?: number
        category?: string
        lowConfidenceOnly?: boolean
      }
    }) => documentEntityLinkingApi.batchEnhanceDocuments(projectId, options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentAiQueryKeys.all })
      toast.success(`Processed ${data.processed} documents (${data.enhanced} enhanced, ${data.errors} errors)`)
    },
    onError: (error) => {
      toast.error(`Batch processing failed: ${error.message}`)
    },
  })
}

/**
 * Combined hook for document AI workflow
 */
export function useDocumentAiWorkflow(documentId: string | undefined) {
  const llmResult = useDocumentLLMResult(documentId)
  const entityLinks = useDocumentEntityLinks(documentId)
  const enhance = useEnhanceDocument()
  const verifyLink = useVerifyEntityLink()

  const hasEnhancedResult = !!llmResult.data?.llm_category
  const needsEnhancement = !hasEnhancedResult || (llmResult.data?.llm_confidence || 0) < 75
  const unverifiedLinks = entityLinks.data?.filter(l => !l.is_verified) || []

  return {
    // Data
    llmResult: llmResult.data,
    entityLinks: entityLinks.data || [],
    unverifiedLinks,

    // Status
    hasEnhancedResult,
    needsEnhancement,
    isLoading: llmResult.isLoading || entityLinks.isLoading,
    isEnhancing: enhance.isPending,

    // Actions
    enhance: (options?: Omit<EnhanceDocumentRequest, 'document_id'>) => {
      if (!documentId) return
      enhance.mutate({
        document_id: documentId,
        force_llm: true,
        extract_metadata: true,
        generate_summary: true,
        find_entity_links: true,
        ...options,
      })
    },
    verifyLink: (linkId: string, userId: string, isCorrect: boolean) => {
      verifyLink.mutate({ linkId, userId, isCorrect })
    },
    refresh: () => {
      if (!documentId) return
      llmResult.refetch()
      entityLinks.refetch()
    },
  }
}
