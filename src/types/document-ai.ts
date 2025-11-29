// File: /src/types/document-ai.ts
// TypeScript types for AI Document Processing (OCR, Categorization, Metadata Extraction)

import type { OcrResult } from './ocr'

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

/**
 * OCR processing status
 */
export type OcrProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

/**
 * Simple processing status type (alias for OcrProcessingStatus)
 * Used by UI components for status indicators
 */
export type ProcessingStatusType = OcrProcessingStatus

/**
 * Document category types (construction-specific)
 */
export type DocumentCategoryType =
  | 'drawing'
  | 'specification'
  | 'submittal'
  | 'contract'
  | 'rfi'
  | 'change_order'
  | 'meeting_minutes'
  | 'schedule'
  | 'safety_report'
  | 'permit'
  | 'inspection'
  | 'correspondence'
  | 'photo'
  | 'report'
  | 'invoice'
  | 'insurance'
  | 'other'

/**
 * AI processor type
 */
export type AiProcessorType = 'cloud_vision' | 'tesseract' | 'textract' | 'manual'

/**
 * Similarity type classification
 */
export type SimilarityType = 'duplicate' | 'revision' | 'related' | 'superseded'

/**
 * Processing queue status
 */
export type ProcessingQueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Document OCR result stored in database
 */
export interface DocumentOcrResult {
  id: string
  document_id: string
  project_id: string
  status: OcrProcessingStatus
  extracted_text: string | null
  confidence_score: number | null
  word_count: number | null
  page_count: number | null
  raw_response: Record<string, unknown> | null
  words_data: OcrWordData[] | null
  blocks_data: OcrBlockData[] | null
  text_blocks?: OcrTextBlock[] | null // Alias for UI components
  processor_type: AiProcessorType
  provider?: string | null // Alias for processor_type display
  processing_started_at: string | null
  processing_completed_at: string | null
  processed_at?: string | null // Alias for processing_completed_at
  processing_duration_ms: number | null
  detected_language: string
  language_detected?: string | null // Alias for detected_language
  error_message: string | null
  retry_count: number
  last_retry_at: string | null
  created_at: string
  updated_at: string
}

/**
 * OCR text block for UI display
 */
export interface OcrTextBlock {
  description: string
  confidence?: number
  bounding_box?: {
    vertices: Array<{ x: number; y: number }>
  }
}

/**
 * Word-level OCR data with bounding box
 */
export interface OcrWordData {
  text: string
  confidence: number
  bounding_box: {
    vertices: Array<{ x: number; y: number }>
  }
}

/**
 * Block-level OCR data
 */
export interface OcrBlockData {
  text: string
  confidence: number
  block_type: string
  bounding_box: {
    vertices: Array<{ x: number; y: number }>
  }
}

/**
 * Document category assigned by AI
 */
export interface DocumentCategory {
  id: string
  document_id: string
  project_id: string
  primary_category: DocumentCategoryType
  sub_category: string | null
  confidence_score: number | null
  suggested_categories: SuggestedCategory[] | null
  detected_keywords: string[] | null
  is_manually_set: boolean
  manually_set_by: string | null
  manually_set_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Suggested category with confidence
 */
export interface SuggestedCategory {
  category: DocumentCategoryType
  confidence: number
}

/**
 * Extracted metadata from document content
 */
export interface DocumentExtractedMetadata {
  id: string
  document_id: string
  project_id: string
  extracted_dates: ExtractedDate[] | null
  extracted_numbers: ExtractedNumbers | null
  extracted_entities: ExtractedEntity[] | null
  extracted_contacts: ExtractedContact[] | null
  extracted_fields: MetadataField[] // Flattened fields for UI display
  extracted_at: string // When the extraction was performed
  extraction_method?: string | null // e.g., 'ai', 'ocr', 'manual'
  auto_tags: string[] | null
  applied_fields: Record<string, boolean> | null
  applied_at: string | null
  applied_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Flattened metadata field for UI display
 */
export interface MetadataField {
  field_name: string
  value: string
  confidence: number
  applied_to_document: boolean
}

/**
 * Extracted date with context
 */
export interface ExtractedDate {
  type: 'issue_date' | 'revision_date' | 'due_date' | 'approval_date' | 'received_date' | 'other'
  value: string // ISO date string
  confidence: number
  context: string // Surrounding text that contained the date
}

/**
 * Extracted document numbers/identifiers
 */
export interface ExtractedNumbers {
  project_number?: string
  revision?: string
  drawing_number?: string
  sheet_number?: string
  specification_section?: string
  contract_number?: string
  po_number?: string
  [key: string]: string | undefined
}

/**
 * Extracted entity (company, person, etc.)
 */
export interface ExtractedEntity {
  type: 'company' | 'person' | 'address' | 'project' | 'trade'
  value: string
  confidence: number
}

/**
 * Extracted contact information
 */
export interface ExtractedContact {
  type: 'email' | 'phone' | 'fax' | 'website'
  value: string
}

/**
 * Document processing queue item
 */
export interface DocumentProcessingQueue {
  id: string
  document_id: string
  project_id: string
  status: ProcessingQueueStatus
  process_ocr: boolean
  process_categorization: boolean
  process_metadata_extraction: boolean
  process_similarity: boolean
  priority: number
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  retry_count: number
  max_retries: number
  last_error: string | null
  ocr_completed: boolean
  categorization_completed: boolean
  metadata_completed: boolean
  similarity_completed: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Document similarity record
 */
export interface DocumentSimilarity {
  id: string
  document_id: string
  similar_document_id: string
  project_id: string
  text_similarity_score: number | null
  visual_similarity_score: number | null
  overall_similarity_score: number | null
  similarity_type: SimilarityType | null
  matching_keywords: string[] | null
  similarity_details: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Request to trigger OCR processing
 */
export interface TriggerOcrRequest {
  document_id: string
  processor_type?: AiProcessorType
  priority?: number
  force_reprocess?: boolean
}

/**
 * Request to update document category
 */
export interface UpdateCategoryRequest {
  document_id: string
  primary_category: DocumentCategoryType
  sub_category?: string
  is_manually_set?: boolean
}

/**
 * Request to apply extracted metadata to document
 */
export interface ApplyMetadataRequest {
  document_id: string
  metadata_id?: string
  fields_to_apply: string[]
}

/**
 * Document search request with content
 */
export interface ContentSearchRequest {
  project_id: string
  query: string
  include_content?: boolean
  limit?: number
  filters?: ContentSearchFilters
}

/**
 * Filters for content search
 */
export interface ContentSearchFilters {
  categories?: DocumentCategoryType[]
  file_types?: string[]
  date_from?: string
  date_to?: string
  ai_processed_only?: boolean
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Search result with match details
 */
export interface ContentSearchResult {
  document_id: string
  document_name: string
  document_number?: string | null
  match_type: 'metadata' | 'content' | 'partial'
  rank: number
  snippet: string | null
  content_excerpt?: string | null
  match_locations?: Array<{ source: string; page?: number }> | null
  category?: DocumentCategoryType
  file_type?: string
  file_url?: string
}

/**
 * Similar document with details
 */
export interface SimilarDocument {
  document_id: string
  document_name: string
  similarity_score: number
  similarity_type: SimilarityType | null
  matching_keywords: string[]
  file_url: string | null
  file_type: string | null
  category?: DocumentCategoryType | null
  document_number?: string | null
}

/**
 * Processing status for a document
 */
export interface DocumentProcessingStatus {
  document_id: string
  is_queued: boolean
  is_processing: boolean
  is_completed: boolean
  ocr_status: OcrProcessingStatus | null
  categorization_status?: OcrProcessingStatus | null
  metadata_status?: OcrProcessingStatus | null
  embedding_status?: OcrProcessingStatus | null
  ocr_error?: string | null
  categorization_error?: string | null
  metadata_error?: string | null
  embedding_error?: string | null
  started_at?: string | null
  completed_at?: string | null
  category: DocumentCategoryType | null
  has_extracted_metadata: boolean
  processing_progress: number // 0-100
  error_message: string | null
}

/**
 * Document AI status view (aggregated)
 */
export interface DocumentAiStatus {
  document_id: string
  document_name: string
  project_id: string
  file_type: string | null
  ai_processed: boolean
  ai_processed_at: string | null
  ocr_status: OcrProcessingStatus | null
  ocr_confidence: number | null
  word_count: number | null
  primary_category: DocumentCategoryType | null
  category_confidence: number | null
  category_manual: boolean
  auto_tags: string[] | null
  queue_status: ProcessingQueueStatus | null
  queue_priority: number | null
}

/**
 * Processing queue statistics
 */
export interface ProcessingQueueStats {
  project_id: string
  total_documents: number
  pending_count: number
  processing_count: number
  completed_count: number
  failed_count: number
  avg_processing_time_ms: number | null
}

// ============================================================================
// GOOGLE CLOUD VISION TYPES
// ============================================================================

/**
 * Cloud Vision API request
 */
export interface CloudVisionRequest {
  requests: CloudVisionAnnotateRequest[]
}

/**
 * Single annotation request
 */
export interface CloudVisionAnnotateRequest {
  image: {
    content?: string // Base64 encoded
    source?: {
      imageUri?: string
      gcsImageUri?: string
    }
  }
  features: CloudVisionFeature[]
  imageContext?: {
    languageHints?: string[]
  }
}

/**
 * Feature to detect
 */
export interface CloudVisionFeature {
  type:
    | 'TEXT_DETECTION'
    | 'DOCUMENT_TEXT_DETECTION'
    | 'LABEL_DETECTION'
    | 'LOGO_DETECTION'
    | 'FACE_DETECTION'
  maxResults?: number
}

/**
 * Cloud Vision API response
 */
export interface CloudVisionResponse {
  responses: CloudVisionAnnotateResponse[]
}

/**
 * Single annotation response
 */
export interface CloudVisionAnnotateResponse {
  textAnnotations?: CloudVisionTextAnnotation[]
  fullTextAnnotation?: CloudVisionFullTextAnnotation
  labelAnnotations?: CloudVisionEntityAnnotation[]
  logoAnnotations?: CloudVisionEntityAnnotation[]
  error?: {
    code: number
    message: string
  }
}

/**
 * Text annotation from Cloud Vision
 */
export interface CloudVisionTextAnnotation {
  description: string
  locale?: string
  boundingPoly?: CloudVisionBoundingPoly
}

/**
 * Full text annotation with structure
 */
export interface CloudVisionFullTextAnnotation {
  text: string
  pages: CloudVisionPage[]
}

/**
 * Page in full text annotation
 */
export interface CloudVisionPage {
  width: number
  height: number
  blocks: CloudVisionBlock[]
  confidence: number
}

/**
 * Block in page
 */
export interface CloudVisionBlock {
  paragraphs: CloudVisionParagraph[]
  blockType: string
  confidence: number
  boundingBox?: CloudVisionBoundingPoly
}

/**
 * Paragraph in block
 */
export interface CloudVisionParagraph {
  words: CloudVisionWord[]
  confidence: number
  boundingBox?: CloudVisionBoundingPoly
}

/**
 * Word in paragraph
 */
export interface CloudVisionWord {
  symbols: CloudVisionSymbol[]
  confidence: number
  boundingBox?: CloudVisionBoundingPoly
}

/**
 * Symbol (character) in word
 */
export interface CloudVisionSymbol {
  text: string
  confidence: number
  boundingBox?: CloudVisionBoundingPoly
}

/**
 * Entity annotation (labels, logos)
 */
export interface CloudVisionEntityAnnotation {
  mid?: string
  description: string
  score: number
  topicality?: number
  boundingPoly?: CloudVisionBoundingPoly
}

/**
 * Bounding polygon
 */
export interface CloudVisionBoundingPoly {
  vertices: Array<{ x: number; y: number }>
  normalizedVertices?: Array<{ x: number; y: number }>
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Document with AI enrichment
 */
export interface DocumentWithAi {
  id: string
  name: string
  file_url: string | null
  file_type: string | null
  project_id: string
  ai_processed: boolean
  ocr_result?: DocumentOcrResult
  category?: DocumentCategory
  extracted_metadata?: DocumentExtractedMetadata
  similar_documents?: SimilarDocument[]
}

/**
 * Category statistics for a project
 */
export interface CategoryStats {
  category: DocumentCategoryType
  count: number
  percentage: number
}

/**
 * OCR quality metrics
 */
export interface OcrQualityMetrics {
  average_confidence: number
  total_words: number
  total_pages: number
  processing_time_ms: number
  language: string
}
