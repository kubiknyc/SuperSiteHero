/**
 * Document AI API Service Tests
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)

// Use vi.hoisted to define mocks that will be used in vi.mock (which is hoisted)
const { mockSupabaseChain, mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    }),
  }

  const mockSupabaseChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    rpc: vi.fn(),
    then: vi.fn(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    }),
  }

  return { mockSupabaseChain, mockAuth }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    auth: mockAuth,
    rpc: vi.fn(),
  },
}))

import { documentAiApi } from './document-ai'

describe('documentAiApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Supabase mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.upsert.mockReturnThis()
    mockSupabaseChain.delete.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.neq.mockReturnThis()
    mockSupabaseChain.in.mockReturnThis()
    mockSupabaseChain.is.mockReturnThis()
    mockSupabaseChain.gte.mockReturnThis()
    mockSupabaseChain.lte.mockReturnThis()
    mockSupabaseChain.or.mockReturnThis()
    mockSupabaseChain.order.mockReturnThis()
    mockSupabaseChain.limit.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.then.mockImplementation(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
  })

  // ============================================================================
  // OCR OPERATIONS TESTS
  // ============================================================================

  describe('getOcrResult', () => {
    const mockOcrResult = {
      id: 'ocr-1',
      document_id: 'doc-1',
      project_id: 'project-1',
      status: 'completed',
      extracted_text: 'Sample extracted text from document',
      confidence_score: 95.5,
      word_count: 100,
      page_count: 2,
      processor_type: 'cloud_vision',
      detected_language: 'en',
    }

    it('should fetch OCR result for a document', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: mockOcrResult, error: null })

      const result = await documentAiApi.getOcrResult('doc-1')

      expect(result).toEqual(mockOcrResult)
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('document_id', 'doc-1')
    })

    it('should return null when OCR result not found', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const result = await documentAiApi.getOcrResult('doc-nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error on database failure', async () => {
      mockSupabaseChain.single.mockResolvedValue({
        data: null,
        error: { code: 'INTERNAL', message: 'Database error' },
      })

      await expect(documentAiApi.getOcrResult('doc-1')).rejects.toThrow()
    })
  })

  describe('triggerOcrProcessing', () => {
    const mockDocument = {
      id: 'doc-1',
      project_id: 'project-1',
      file_type: 'application/pdf',
    }

    const mockQueueItem = {
      id: 'queue-1',
      document_id: 'doc-1',
      project_id: 'project-1',
      status: 'pending',
      priority: 100,
    }

    it('should create queue item for processable document', async () => {
      // Mock document fetch
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: mockDocument, error: null })
        .mockResolvedValueOnce({ data: mockQueueItem, error: null })

      const result = await documentAiApi.triggerOcrProcessing({
        document_id: 'doc-1',
        priority: 100,
      })

      expect(result).toEqual(mockQueueItem)
    })

    it('should throw error for non-existent document', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await expect(
        documentAiApi.triggerOcrProcessing({ document_id: 'doc-nonexistent' })
      ).rejects.toThrow('Document not found')
    })

    it('should throw error for unsupported file type', async () => {
      mockSupabaseChain.single.mockResolvedValue({
        data: { ...mockDocument, file_type: 'text/plain' },
        error: null,
      })

      await expect(
        documentAiApi.triggerOcrProcessing({ document_id: 'doc-1' })
      ).rejects.toThrow('This file type cannot be processed for OCR')
    })
  })

  describe('reprocessOcr', () => {
    it('should reset OCR status and update queue', async () => {
      mockSupabaseChain.eq.mockReturnThis()
      mockSupabaseChain.update.mockReturnThis()
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await documentAiApi.reprocessOcr('doc-1')

      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('document_id', 'doc-1')
    })
  })

  // ============================================================================
  // CATEGORIZATION TESTS
  // ============================================================================

  describe('getDocumentCategory', () => {
    const mockCategory = {
      id: 'cat-1',
      document_id: 'doc-1',
      project_id: 'project-1',
      primary_category: 'drawing',
      sub_category: 'architectural',
      confidence_score: 92.5,
      is_manually_set: false,
    }

    it('should fetch category for a document', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: mockCategory, error: null })

      const result = await documentAiApi.getDocumentCategory('doc-1')

      expect(result).toEqual(mockCategory)
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('document_id', 'doc-1')
    })

    it('should return null when category not found', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const result = await documentAiApi.getDocumentCategory('doc-1')

      expect(result).toBeNull()
    })
  })

  describe('updateDocumentCategory', () => {
    const mockCategory = {
      id: 'cat-1',
      document_id: 'doc-1',
      project_id: 'project-1',
      primary_category: 'submittal',
      is_manually_set: true,
    }

    it('should update category with manual override', async () => {
      // Mock document fetch
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { project_id: 'project-1' }, error: null })
        .mockResolvedValueOnce({ data: mockCategory, error: null })

      const result = await documentAiApi.updateDocumentCategory({
        document_id: 'doc-1',
        primary_category: 'submittal',
        is_manually_set: true,
      })

      expect(result).toEqual(mockCategory)
      expect(mockSupabaseChain.upsert).toHaveBeenCalled()
    })

    it('should throw error when document not found', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: null })

      await expect(
        documentAiApi.updateDocumentCategory({
          document_id: 'doc-nonexistent',
          primary_category: 'drawing',
        })
      ).rejects.toThrow('Document not found')
    })
  })

  describe('getSuggestedCategories', () => {
    it('should return suggested categories', async () => {
      const suggestions = [
        { category: 'drawing', confidence: 85 },
        { category: 'specification', confidence: 10 },
      ]
      mockSupabaseChain.single.mockResolvedValue({
        data: { suggested_categories: suggestions },
        error: null,
      })

      const result = await documentAiApi.getSuggestedCategories('doc-1')

      expect(result).toEqual(suggestions)
    })

    it('should return empty array when no suggestions', async () => {
      mockSupabaseChain.single.mockResolvedValue({
        data: { suggested_categories: null },
        error: null,
      })

      const result = await documentAiApi.getSuggestedCategories('doc-1')

      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // METADATA EXTRACTION TESTS
  // ============================================================================

  describe('getExtractedMetadata', () => {
    const mockMetadata = {
      id: 'meta-1',
      document_id: 'doc-1',
      project_id: 'project-1',
      extracted_dates: [{ type: 'issue_date', value: '2025-01-15', confidence: 90 }],
      extracted_numbers: { drawing_number: 'A-101', revision: 'Rev 2' },
      auto_tags: ['construction', 'architectural'],
    }

    it('should fetch extracted metadata', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: mockMetadata, error: null })

      const result = await documentAiApi.getExtractedMetadata('doc-1')

      expect(result).toEqual(mockMetadata)
    })

    it('should return null when no metadata', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const result = await documentAiApi.getExtractedMetadata('doc-1')

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // SIMILARITY TESTS
  // ============================================================================

  describe('getSimilarDocuments', () => {
    const mockSimilarDocs = [
      {
        similar_document_id: 'doc-2',
        overall_similarity_score: 0.85,
        similarity_type: 'revision',
        matching_keywords: ['drawing', 'floor plan'],
        similar_document: { id: 'doc-2', name: 'Floor Plan Rev 2', file_url: 'url', file_type: 'pdf' },
      },
    ]

    it('should fetch similar documents above threshold', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockSimilarDocs, error: null }).then(onFulfilled)
      )

      const result = await documentAiApi.getSimilarDocuments('doc-1', 0.5)

      expect(result).toHaveLength(1)
      expect(result[0].similarity_score).toBe(0.85)
      expect(mockSupabaseChain.gte).toHaveBeenCalledWith('overall_similarity_score', 0.5)
    })

    it('should return empty array when no similar documents', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await documentAiApi.getSimilarDocuments('doc-1')

      expect(result).toEqual([])
    })
  })

  describe('findDuplicates', () => {
    it('should find duplicate documents in project', async () => {
      const mockDuplicates = [
        {
          document_id: 'doc-1',
          similar_document_id: 'doc-2',
          overall_similarity_score: 0.95,
          similarity_type: 'duplicate',
          matching_keywords: ['floor plan'],
        },
      ]

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockDuplicates, error: null }).then(onFulfilled)
      )

      const result = await documentAiApi.findDuplicates('project-1', 0.9)

      expect(result).toHaveLength(1)
      expect(result[0].document_id).toBe('doc-1')
      expect(mockSupabaseChain.gte).toHaveBeenCalledWith('overall_similarity_score', 0.9)
    })
  })

  // ============================================================================
  // PROCESSING QUEUE TESTS
  // ============================================================================

  describe('getProcessingStatus', () => {
    it('should return processing status for document', async () => {
      const mockQueue = {
        status: 'processing',
        ocr_completed: true,
        categorization_completed: false,
        metadata_completed: false,
        similarity_completed: false,
      }

      // Mock parallel queries
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: mockQueue, error: null })
        .mockResolvedValueOnce({ data: { status: 'completed' }, error: null })
        .mockResolvedValueOnce({ data: { primary_category: 'drawing' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'meta-1' }, error: null })

      const result = await documentAiApi.getProcessingStatus('doc-1')

      expect(result.is_processing).toBe(true)
      expect(result.processing_progress).toBe(25) // 1/4 completed
    })

    it('should return not queued status when no queue item', async () => {
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      const result = await documentAiApi.getProcessingStatus('doc-1')

      expect(result.is_queued).toBe(false)
      expect(result.processing_progress).toBe(0)
    })
  })

  describe('getQueuedDocuments', () => {
    it('should fetch pending and processing documents', async () => {
      const mockQueue = [
        { id: 'q-1', document_id: 'doc-1', status: 'pending', priority: 100 },
        { id: 'q-2', document_id: 'doc-2', status: 'processing', priority: 50 },
      ]

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockQueue, error: null }).then(onFulfilled)
      )

      const result = await documentAiApi.getQueuedDocuments('project-1')

      expect(result).toHaveLength(2)
      expect(mockSupabaseChain.in).toHaveBeenCalledWith('status', ['pending', 'processing'])
    })
  })

  describe('cancelProcessing', () => {
    it('should cancel processing for document', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await documentAiApi.cancelProcessing('doc-1')

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ status: 'cancelled' })
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('document_id', 'doc-1')
    })
  })

  describe('getProcessingStats', () => {
    const mockStats = {
      project_id: 'project-1',
      total_documents: 100,
      pending_count: 10,
      processing_count: 2,
      completed_count: 85,
      failed_count: 3,
      avg_processing_time_ms: 2500,
    }

    it('should fetch processing statistics', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: mockStats, error: null })

      const result = await documentAiApi.getProcessingStats('project-1')

      expect(result).toEqual(mockStats)
    })

    it('should return default stats when none exist', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const result = await documentAiApi.getProcessingStats('project-1')

      expect(result.total_documents).toBe(0)
      expect(result.pending_count).toBe(0)
    })
  })

  // ============================================================================
  // AGGREGATED VIEWS TESTS
  // ============================================================================

  describe('getProjectDocumentsAiStatus', () => {
    const mockStatus = [
      {
        document_id: 'doc-1',
        document_name: 'Floor Plan',
        ai_processed: true,
        ocr_status: 'completed',
        primary_category: 'drawing',
      },
      {
        document_id: 'doc-2',
        document_name: 'Specification',
        ai_processed: false,
        ocr_status: 'pending',
        primary_category: null,
      },
    ]

    it('should fetch AI status for all project documents', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockStatus, error: null }).then(onFulfilled)
      )

      const result = await documentAiApi.getProjectDocumentsAiStatus('project-1')

      expect(result).toHaveLength(2)
      expect(result[0].ai_processed).toBe(true)
    })
  })

  describe('getCategoryDistribution', () => {
    it('should return category counts', async () => {
      const mockCategories = [
        { primary_category: 'drawing' },
        { primary_category: 'drawing' },
        { primary_category: 'drawing' },
        { primary_category: 'specification' },
        { primary_category: 'submittal' },
      ]

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockCategories, error: null }).then(onFulfilled)
      )

      const result = await documentAiApi.getCategoryDistribution('project-1')

      expect(result).toHaveLength(3)
      expect(result[0].category).toBe('drawing')
      expect(result[0].count).toBe(3)
    })

    it('should return empty array when no documents', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await documentAiApi.getCategoryDistribution('project-1')

      expect(result).toEqual([])
    })
  })
})
