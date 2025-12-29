// File: /src/lib/api/services/document-ai.ts
// Document AI API service - OCR, Categorization, Metadata Extraction

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  DocumentOcrResult,
  DocumentCategory,
  DocumentExtractedMetadata,
  DocumentProcessingQueue,
  DocumentCategoryType,
  ContentSearchResult,
  SimilarDocument,
  DocumentProcessingStatus,
  DocumentAiStatus,
  ProcessingQueueStats,
  TriggerOcrRequest,
  UpdateCategoryRequest,
  ApplyMetadataRequest,
  ContentSearchRequest,
} from '@/types/document-ai'

// Use 'any' for tables not in generated Supabase types
const db = supabase as any

export const documentAiApi = {
  // ============================================================================
  // OCR OPERATIONS
  // ============================================================================

  /**
   * Get OCR result for a document
   */
  async getOcrResult(documentId: string): Promise<DocumentOcrResult | null> {
    try {
      const { data, error } = await db
        .from('document_ocr_results')
        .select('*')
        .eq('document_id', documentId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_OCR_ERROR',
            message: 'Failed to fetch OCR result',
          })
    }
  },

  /**
   * Trigger OCR processing for a document
   */
  async triggerOcrProcessing(request: TriggerOcrRequest): Promise<DocumentProcessingQueue> {
    try {
      // Get document to verify it exists and get project_id
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, project_id, file_type')
        .eq('id', request.document_id)
        .single()

      if (docError || !document) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        })
      }

      // Check if file type is processable
      const processableTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'image/gif',
        'image/webp',
      ]

      if (document.file_type && !processableTypes.includes(document.file_type)) {
        throw new ApiErrorClass({
          code: 'UNSUPPORTED_FILE_TYPE',
          message: 'This file type cannot be processed for OCR',
        })
      }

      // Create or update queue item
      const { data, error } = await db
        .from('document_processing_queue')
        .upsert(
          {
            document_id: request.document_id,
            project_id: document.project_id,
            status: 'pending',
            priority: request.priority || 100,
            process_ocr: true,
            process_categorization: true,
            process_metadata_extraction: true,
            process_similarity: true,
            scheduled_at: new Date().toISOString(),
          },
          {
            onConflict: 'document_id',
          }
        )
        .select()
        .single()

      if (error) {throw error}

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'TRIGGER_OCR_ERROR',
            message: 'Failed to trigger OCR processing',
          })
    }
  },

  /**
   * Reprocess OCR for a document
   */
  async reprocessOcr(documentId: string): Promise<void> {
    try {
      // Reset OCR result status
      await db
        .from('document_ocr_results')
        .update({
          status: 'pending',
          error_message: null,
          retry_count: 0,
        })
        .eq('document_id', documentId)

      // Update queue status
      await db
        .from('document_processing_queue')
        .update({
          status: 'pending',
          ocr_completed: false,
          last_error: null,
        })
        .eq('document_id', documentId)
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'REPROCESS_OCR_ERROR',
        message: 'Failed to reprocess OCR',
      })
    }
  },

  // ============================================================================
  // CATEGORIZATION OPERATIONS
  // ============================================================================

  /**
   * Get category for a document
   */
  async getDocumentCategory(documentId: string): Promise<DocumentCategory | null> {
    try {
      const { data, error } = await db
        .from('document_categories')
        .select('*')
        .eq('document_id', documentId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CATEGORY_ERROR',
            message: 'Failed to fetch document category',
          })
    }
  },

  /**
   * Update document category (manual override)
   */
  async updateDocumentCategory(request: UpdateCategoryRequest): Promise<DocumentCategory> {
    try {
      const { data: user } = await supabase.auth.getUser()

      // Get document for project_id
      const { data: document } = await supabase
        .from('documents')
        .select('project_id')
        .eq('id', request.document_id)
        .single()

      if (!document) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        })
      }

      const { data, error } = await db
        .from('document_categories')
        .upsert(
          {
            document_id: request.document_id,
            project_id: document.project_id,
            primary_category: request.primary_category,
            sub_category: request.sub_category,
            is_manually_set: request.is_manually_set ?? true,
            manually_set_by: user?.user?.id,
            manually_set_at: new Date().toISOString(),
            confidence_score: 100, // Manual = 100% confidence
          },
          { onConflict: 'document_id' }
        )
        .select()
        .single()

      if (error) {throw error}

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_CATEGORY_ERROR',
            message: 'Failed to update document category',
          })
    }
  },

  /**
   * Get suggested categories for a document
   */
  async getSuggestedCategories(
    documentId: string
  ): Promise<{ category: DocumentCategoryType; confidence: number }[]> {
    try {
      const { data, error } = await db
        .from('document_categories')
        .select('suggested_categories')
        .eq('document_id', documentId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data?.suggested_categories || []
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'FETCH_SUGGESTIONS_ERROR',
        message: 'Failed to fetch category suggestions',
      })
    }
  },

  // ============================================================================
  // METADATA EXTRACTION OPERATIONS
  // ============================================================================

  /**
   * Get extracted metadata for a document
   */
  async getExtractedMetadata(documentId: string): Promise<DocumentExtractedMetadata | null> {
    try {
      const { data, error } = await db
        .from('document_extracted_metadata')
        .select('*')
        .eq('document_id', documentId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_METADATA_ERROR',
            message: 'Failed to fetch extracted metadata',
          })
    }
  },

  /**
   * Apply extracted metadata fields to the document
   */
  async applyExtractedMetadata(request: ApplyMetadataRequest): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser()

      // Get extracted metadata
      const metadata = await this.getExtractedMetadata(request.document_id)

      if (!metadata) {
        throw new ApiErrorClass({
          code: 'NO_METADATA',
          message: 'No extracted metadata available for this document',
        })
      }

      // Build update object based on fields_to_apply
      const documentUpdates: Record<string, unknown> = {}

      if (request.fields_to_apply.includes('drawing_number') && metadata.extracted_numbers?.drawing_number) {
        documentUpdates.drawing_number = metadata.extracted_numbers.drawing_number
      }

      if (request.fields_to_apply.includes('revision') && metadata.extracted_numbers?.revision) {
        documentUpdates.revision = metadata.extracted_numbers.revision
      }

      if (request.fields_to_apply.includes('specification_section') && metadata.extracted_numbers?.specification_section) {
        documentUpdates.specification_section = metadata.extracted_numbers.specification_section
      }

      // Apply dates
      if (request.fields_to_apply.includes('issue_date') && metadata.extracted_dates) {
        const issueDate = metadata.extracted_dates.find((d) => d.type === 'issue_date')
        if (issueDate) {
          documentUpdates.issue_date = issueDate.value
        }
      }

      if (request.fields_to_apply.includes('received_date') && metadata.extracted_dates) {
        const receivedDate = metadata.extracted_dates.find((d) => d.type === 'received_date')
        if (receivedDate) {
          documentUpdates.received_date = receivedDate.value
        }
      }

      // Update document
      if (Object.keys(documentUpdates).length > 0) {
        const { error: docError } = await supabase
          .from('documents')
          .update(documentUpdates)
          .eq('id', request.document_id)

        if (docError) {throw docError}
      }

      // Update metadata record to track applied fields
      const appliedFields = request.fields_to_apply.reduce((acc, field) => {
        acc[field] = true
        return acc
      }, {} as Record<string, boolean>)

      await db
        .from('document_extracted_metadata')
        .update({
          applied_fields: appliedFields,
          applied_at: new Date().toISOString(),
          applied_by: user?.user?.id,
        })
        .eq('document_id', request.document_id)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'APPLY_METADATA_ERROR',
            message: 'Failed to apply extracted metadata',
          })
    }
  },

  // ============================================================================
  // SIMILARITY OPERATIONS
  // ============================================================================

  /**
   * Get similar documents for a document
   */
  async getSimilarDocuments(
    documentId: string,
    threshold: number = 0.5
  ): Promise<SimilarDocument[]> {
    try {
      const { data, error } = await db
        .from('document_similarity')
        .select(
          `
          similar_document_id,
          overall_similarity_score,
          similarity_type,
          matching_keywords,
          similar_document:documents!document_similarity_similar_document_id_fkey (
            id,
            name,
            file_url,
            file_type
          )
        `
        )
        .eq('document_id', documentId)
        .gte('overall_similarity_score', threshold)
        .order('overall_similarity_score', { ascending: false })

      if (error) {throw error}

      return (data || []).map((item: any) => ({
        document_id: item.similar_document_id,
        document_name: item.similar_document?.name || 'Unknown',
        similarity_score: item.overall_similarity_score,
        similarity_type: item.similarity_type,
        matching_keywords: item.matching_keywords || [],
        file_url: item.similar_document?.file_url,
        file_type: item.similar_document?.file_type,
      }))
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SIMILAR_ERROR',
            message: 'Failed to fetch similar documents',
          })
    }
  },

  /**
   * Find potential duplicates in a project
   */
  async findDuplicates(
    projectId: string,
    threshold: number = 0.9
  ): Promise<{ document_id: string; duplicates: SimilarDocument[] }[]> {
    try {
      const { data, error } = await db
        .from('document_similarity')
        .select(
          `
          document_id,
          similar_document_id,
          overall_similarity_score,
          similarity_type,
          matching_keywords
        `
        )
        .eq('project_id', projectId)
        .gte('overall_similarity_score', threshold)
        .order('overall_similarity_score', { ascending: false })

      if (error) {throw error}

      // Group by document_id
      const grouped = (data || []).reduce((acc: Record<string, any[]>, item: any) => {
        if (!acc[item.document_id]) {
          acc[item.document_id] = []
        }
        acc[item.document_id].push({
          document_id: item.similar_document_id,
          document_name: 'Unknown', // Would need to join to get name
          similarity_score: item.overall_similarity_score,
          similarity_type: item.similarity_type,
          matching_keywords: item.matching_keywords || [],
          file_url: null,
          file_type: null,
        })
        return acc
      }, {})

      return Object.entries(grouped).map(([document_id, duplicates]) => ({
        document_id,
        duplicates: duplicates as SimilarDocument[],
      }))
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'FIND_DUPLICATES_ERROR',
        message: 'Failed to find duplicate documents',
      })
    }
  },

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  /**
   * Search document content using full-text search
   */
  async searchDocumentContent(request: ContentSearchRequest): Promise<ContentSearchResult[]> {
    try {
      // Call the database function for full-text search
      const { data, error } = await db.rpc('search_documents_full_text', {
        p_project_id: request.project_id,
        p_search_query: request.query,
        p_include_content: request.include_content ?? true,
        p_limit: request.limit ?? 50,
      })

      if (error) {throw error}

      // Apply additional filters if specified
      let results = data || []

      if (request.filters?.categories?.length) {
        // Need to join with categories table
        const docIds = results.map((r: any) => r.document_id)

        const { data: categories } = await db
          .from('document_categories')
          .select('document_id, primary_category')
          .in('document_id', docIds)

        const categoryMap = new Map(categories?.map((c: any) => [c.document_id, c.primary_category]))

        results = results.filter((r: any) => {
          const category = categoryMap.get(r.document_id) as DocumentCategoryType | undefined
          return category && categoryMap.has(r.document_id) && request.filters!.categories!.includes(category)
        })
      }

      return results.map((item: any) => ({
        document_id: item.document_id,
        document_name: item.document_name,
        match_type: item.match_type,
        rank: item.rank,
        snippet: item.snippet,
      }))
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_ERROR',
            message: 'Failed to search documents',
          })
    }
  },

  // ============================================================================
  // PROCESSING QUEUE OPERATIONS
  // ============================================================================

  /**
   * Get processing status for a document
   */
  async getProcessingStatus(documentId: string): Promise<DocumentProcessingStatus> {
    try {
      const [queueResult, ocrResult, categoryResult, metadataResult] = await Promise.all([
        db
          .from('document_processing_queue')
          .select('*')
          .eq('document_id', documentId)
          .single(),
        db
          .from('document_ocr_results')
          .select('status')
          .eq('document_id', documentId)
          .single(),
        db
          .from('document_categories')
          .select('primary_category')
          .eq('document_id', documentId)
          .single(),
        db
          .from('document_extracted_metadata')
          .select('id')
          .eq('document_id', documentId)
          .single(),
      ])

      const queue = queueResult.data
      const ocr = ocrResult.data
      const category = categoryResult.data
      const metadata = metadataResult.data

      // Calculate progress
      let progress = 0
      let completedSteps = 0
      const totalSteps = 4

      if (queue?.ocr_completed) {completedSteps++}
      if (queue?.categorization_completed) {completedSteps++}
      if (queue?.metadata_completed) {completedSteps++}
      if (queue?.similarity_completed) {completedSteps++}

      progress = Math.round((completedSteps / totalSteps) * 100)

      return {
        document_id: documentId,
        is_queued: !!queue,
        is_processing: queue?.status === 'processing',
        is_completed: queue?.status === 'completed',
        ocr_status: ocr?.status || null,
        category: category?.primary_category || null,
        has_extracted_metadata: !!metadata,
        processing_progress: progress,
        error_message: queue?.last_error || null,
      }
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'FETCH_STATUS_ERROR',
        message: 'Failed to fetch processing status',
      })
    }
  },

  /**
   * Get queued documents for a project
   */
  async getQueuedDocuments(projectId: string): Promise<DocumentProcessingQueue[]> {
    try {
      const { data, error } = await db
        .from('document_processing_queue')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['pending', 'processing'])
        .order('priority', { ascending: true })
        .order('scheduled_at', { ascending: true })

      if (error) {throw error}

      return data || []
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'FETCH_QUEUE_ERROR',
        message: 'Failed to fetch processing queue',
      })
    }
  },

  /**
   * Cancel processing for a document
   */
  async cancelProcessing(documentId: string): Promise<void> {
    try {
      const { error } = await db
        .from('document_processing_queue')
        .update({ status: 'cancelled' })
        .eq('document_id', documentId)
        .in('status', ['pending', 'processing'])

      if (error) {throw error}
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'CANCEL_PROCESSING_ERROR',
        message: 'Failed to cancel processing',
      })
    }
  },

  /**
   * Get processing queue statistics for a project
   */
  async getProcessingStats(projectId: string): Promise<ProcessingQueueStats> {
    try {
      const { data, error } = await db
        .from('document_processing_stats')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return (
        data || {
          project_id: projectId,
          total_documents: 0,
          pending_count: 0,
          processing_count: 0,
          completed_count: 0,
          failed_count: 0,
          avg_processing_time_ms: null,
        }
      )
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'FETCH_STATS_ERROR',
        message: 'Failed to fetch processing statistics',
      })
    }
  },

  // ============================================================================
  // AGGREGATED VIEWS
  // ============================================================================

  /**
   * Get AI status for all documents in a project
   */
  async getProjectDocumentsAiStatus(projectId: string): Promise<DocumentAiStatus[]> {
    try {
      const { data, error } = await db
        .from('document_ai_status')
        .select('*')
        .eq('project_id', projectId)
        .order('document_name', { ascending: true })

      if (error) {throw error}

      return data || []
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'FETCH_AI_STATUS_ERROR',
        message: 'Failed to fetch AI status',
      })
    }
  },

  /**
   * Get category distribution for a project
   */
  async getCategoryDistribution(
    projectId: string
  ): Promise<{ category: DocumentCategoryType; count: number }[]> {
    try {
      const { data, error } = await db
        .from('document_categories')
        .select('primary_category')
        .eq('project_id', projectId)

      if (error) {throw error}

      // Count categories
      const counts: Record<string, number> = {}
      for (const item of data || []) {
        counts[item.primary_category] = (counts[item.primary_category] || 0) + 1
      }

      return Object.entries(counts)
        .map(([category, count]) => ({
          category: category as DocumentCategoryType,
          count,
        }))
        .sort((a, b) => b.count - a.count)
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'FETCH_DISTRIBUTION_ERROR',
        message: 'Failed to fetch category distribution',
      })
    }
  },
}
