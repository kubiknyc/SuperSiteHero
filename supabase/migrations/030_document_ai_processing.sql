-- Migration: 030_document_ai_processing.sql
-- Description: AI Document Processing System (OCR, Categorization, Metadata Extraction)
-- Created: 2025-11-29
--
-- This migration creates the AI document processing infrastructure:
-- - document_ocr_results: OCR extracted text and metadata
-- - document_categories: AI-powered document categorization
-- - document_extracted_metadata: Auto-extracted metadata (dates, numbers, entities)
-- - document_processing_queue: Async processing job queue
-- - document_similarity: Document similarity detection

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- OCR processing status
DO $$ BEGIN
  CREATE TYPE ocr_status AS ENUM (
    'pending',      -- Queued for processing
    'processing',   -- Currently being processed
    'completed',    -- Successfully processed
    'failed',       -- Processing failed
    'skipped'       -- Skipped (unsupported file type)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Document category types (construction-specific)
DO $$ BEGIN
  CREATE TYPE document_category_type AS ENUM (
    'drawing',           -- Architectural/Engineering drawings
    'specification',     -- Project specifications
    'submittal',         -- Submittal documents
    'contract',          -- Contracts and agreements
    'rfi',               -- Request for Information
    'change_order',      -- Change order documents
    'meeting_minutes',   -- Meeting notes and minutes
    'schedule',          -- Project schedules
    'safety_report',     -- Safety documentation
    'permit',            -- Permits and approvals
    'inspection',        -- Inspection reports
    'correspondence',    -- Letters and emails
    'photo',             -- Photo documentation
    'report',            -- General reports
    'invoice',           -- Invoices and billing
    'insurance',         -- Insurance certificates
    'other'              -- Other document types
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Processor type (which AI processed the document)
DO $$ BEGIN
  CREATE TYPE ai_processor_type AS ENUM (
    'cloud_vision',     -- Google Cloud Vision
    'tesseract',        -- Tesseract.js (client-side)
    'textract',         -- AWS Textract
    'manual'            -- Manually entered
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Similarity type classification
DO $$ BEGIN
  CREATE TYPE similarity_type AS ENUM (
    'duplicate',        -- Exact or near-duplicate
    'revision',         -- Different version of same document
    'related',          -- Related content
    'superseded'        -- Older version superseded by newer
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Document OCR Results - Extracted text and processing metadata
CREATE TABLE IF NOT EXISTS document_ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- OCR Status
  status ocr_status NOT NULL DEFAULT 'pending',

  -- Extracted Content
  extracted_text TEXT,
  full_text_search TSVECTOR,

  -- Confidence Metrics
  confidence_score DECIMAL(5,2), -- 0-100
  word_count INTEGER,
  page_count INTEGER,

  -- Structured Data (Cloud Vision response)
  raw_response JSONB,
  words_data JSONB, -- Word-level details with bounding boxes
  blocks_data JSONB, -- Text block structure

  -- Processing Info
  processor_type ai_processor_type DEFAULT 'cloud_vision',
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,

  -- Language Detection
  detected_language VARCHAR(10) DEFAULT 'en',

  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint (one OCR result per document)
  CONSTRAINT unique_document_ocr UNIQUE (document_id)
);

-- Document Categories - AI-assigned document classification
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Primary Category
  primary_category document_category_type NOT NULL,

  -- Sub-category (freeform for specificity)
  sub_category VARCHAR(100),

  -- Confidence Score
  confidence_score DECIMAL(5,2), -- 0-100

  -- AI Suggestions (array of possible categories with scores)
  suggested_categories JSONB,
  -- Format: [{"category": "drawing", "confidence": 95.5}, {"category": "specification", "confidence": 12.3}]

  -- Keywords detected that influenced categorization
  detected_keywords TEXT[],

  -- Manual Override
  is_manually_set BOOLEAN DEFAULT FALSE,
  manually_set_by UUID REFERENCES auth.users(id),
  manually_set_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint (one category per document)
  CONSTRAINT unique_document_category UNIQUE (document_id)
);

-- Document Extracted Metadata - Auto-extracted metadata from content
CREATE TABLE IF NOT EXISTS document_extracted_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Extracted Dates
  extracted_dates JSONB,
  -- Format: [{"type": "issue_date", "value": "2024-01-15", "confidence": 90, "context": "Issue Date: Jan 15, 2024"}]

  -- Extracted Numbers/Identifiers
  extracted_numbers JSONB,
  -- Format: {"project_number": "P-2024-001", "revision": "Rev 3", "drawing_number": "A-101", "sheet_number": "S-05"}

  -- Extracted Names/Companies
  extracted_entities JSONB,
  -- Format: [{"type": "company", "value": "ABC Architects", "confidence": 85}, {"type": "person", "value": "John Smith", "confidence": 78}]

  -- Extracted Contact Info
  extracted_contacts JSONB,
  -- Format: [{"type": "email", "value": "info@company.com"}, {"type": "phone", "value": "555-1234"}]

  -- Auto-generated Tags/Keywords
  auto_tags TEXT[],

  -- Applied to Document (which fields were applied)
  applied_fields JSONB,
  -- Format: {"drawing_number": true, "issue_date": true}
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint (one metadata record per document)
  CONSTRAINT unique_document_metadata UNIQUE (document_id)
);

-- Document Processing Queue - Async processing job queue
CREATE TABLE IF NOT EXISTS document_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Queue Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Processing Types (which operations to perform)
  process_ocr BOOLEAN DEFAULT TRUE,
  process_categorization BOOLEAN DEFAULT TRUE,
  process_metadata_extraction BOOLEAN DEFAULT TRUE,
  process_similarity BOOLEAN DEFAULT TRUE,

  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 100,

  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Retry Logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,

  -- Processing Results
  ocr_completed BOOLEAN DEFAULT FALSE,
  categorization_completed BOOLEAN DEFAULT FALSE,
  metadata_completed BOOLEAN DEFAULT FALSE,
  similarity_completed BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Document Similarity - Document similarity detection
CREATE TABLE IF NOT EXISTS document_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  similar_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Similarity Metrics (0.0000 to 1.0000)
  text_similarity_score DECIMAL(5,4),
  visual_similarity_score DECIMAL(5,4),
  overall_similarity_score DECIMAL(5,4),

  -- Similarity Classification
  similarity_type similarity_type,

  -- Details
  matching_keywords TEXT[],
  similarity_details JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_document_pair UNIQUE (document_id, similar_document_id),
  CONSTRAINT no_self_similarity CHECK (document_id != similar_document_id)
);

-- ============================================================================
-- EXTEND DOCUMENTS TABLE
-- ============================================================================

-- Add content search vector for OCR text searching
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'content_search_vector'
  ) THEN
    ALTER TABLE documents ADD COLUMN content_search_vector TSVECTOR;
  END IF;
END $$;

-- Add AI processing status columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_processed'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_processed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_processed_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_processed_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update OCR search vector from extracted text
CREATE OR REPLACE FUNCTION update_ocr_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_text_search := to_tsvector('english', COALESCE(NEW.extracted_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync OCR text to document content_search_vector
CREATE OR REPLACE FUNCTION sync_document_content_search()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.full_text_search IS NOT NULL THEN
    UPDATE documents
    SET
      content_search_vector = NEW.full_text_search,
      ai_processed = TRUE,
      ai_processed_at = NOW()
    WHERE id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-queue document for processing on insert
CREATE OR REPLACE FUNCTION queue_document_for_ai_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue processable file types
  IF NEW.file_type IN (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/gif',
    'image/webp'
  ) THEN
    INSERT INTO document_processing_queue (
      document_id,
      project_id,
      priority,
      created_by
    ) VALUES (
      NEW.id,
      NEW.project_id,
      CASE
        WHEN NEW.document_type = 'drawing' THEN 50
        WHEN NEW.document_type = 'specification' THEN 60
        ELSE 100
      END,
      NEW.created_by
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Full-text search function for documents (metadata + content)
CREATE OR REPLACE FUNCTION search_documents_full_text(
  p_project_id UUID,
  p_search_query TEXT,
  p_include_content BOOLEAN DEFAULT TRUE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  document_id UUID,
  document_name VARCHAR,
  match_type VARCHAR,
  rank REAL,
  snippet TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH search_ts AS (
    SELECT plainto_tsquery('english', p_search_query) AS query
  )
  SELECT DISTINCT ON (d.id)
    d.id AS document_id,
    d.name AS document_name,
    CASE
      WHEN d.search_vector @@ (SELECT query FROM search_ts) THEN 'metadata'
      WHEN d.content_search_vector @@ (SELECT query FROM search_ts) THEN 'content'
      ELSE 'partial'
    END::VARCHAR AS match_type,
    GREATEST(
      ts_rank(d.search_vector, (SELECT query FROM search_ts)),
      CASE WHEN p_include_content
           THEN COALESCE(ts_rank(d.content_search_vector, (SELECT query FROM search_ts)), 0)
           ELSE 0 END
    ) AS rank,
    CASE
      WHEN d.content_search_vector @@ (SELECT query FROM search_ts) THEN
        ts_headline('english', COALESCE(ocr.extracted_text, ''), (SELECT query FROM search_ts), 'MaxWords=30, MinWords=15')
      ELSE NULL
    END AS snippet
  FROM documents d
  LEFT JOIN document_ocr_results ocr ON ocr.document_id = d.id
  WHERE d.project_id = p_project_id
    AND d.deleted_at IS NULL
    AND (
      d.search_vector @@ (SELECT query FROM search_ts)
      OR (p_include_content AND d.content_search_vector @@ (SELECT query FROM search_ts))
    )
  ORDER BY d.id, rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_document_ai_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- OCR search vector trigger
DROP TRIGGER IF EXISTS trigger_ocr_search_vector ON document_ocr_results;
CREATE TRIGGER trigger_ocr_search_vector
  BEFORE INSERT OR UPDATE OF extracted_text ON document_ocr_results
  FOR EACH ROW
  EXECUTE FUNCTION update_ocr_search_vector();

-- Sync content search trigger
DROP TRIGGER IF EXISTS trigger_sync_document_content_search ON document_ocr_results;
CREATE TRIGGER trigger_sync_document_content_search
  AFTER INSERT OR UPDATE OF status, full_text_search ON document_ocr_results
  FOR EACH ROW
  EXECUTE FUNCTION sync_document_content_search();

-- Auto-queue document for processing (commented out - enable when ready)
-- DROP TRIGGER IF EXISTS trigger_queue_document_ai ON documents;
-- CREATE TRIGGER trigger_queue_document_ai
--   AFTER INSERT ON documents
--   FOR EACH ROW
--   EXECUTE FUNCTION queue_document_for_ai_processing();

-- Update timestamp triggers
DROP TRIGGER IF EXISTS trigger_update_ocr_timestamp ON document_ocr_results;
CREATE TRIGGER trigger_update_ocr_timestamp
  BEFORE UPDATE ON document_ocr_results
  FOR EACH ROW
  EXECUTE FUNCTION update_document_ai_timestamp();

DROP TRIGGER IF EXISTS trigger_update_category_timestamp ON document_categories;
CREATE TRIGGER trigger_update_category_timestamp
  BEFORE UPDATE ON document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_document_ai_timestamp();

DROP TRIGGER IF EXISTS trigger_update_metadata_timestamp ON document_extracted_metadata;
CREATE TRIGGER trigger_update_metadata_timestamp
  BEFORE UPDATE ON document_extracted_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_document_ai_timestamp();

DROP TRIGGER IF EXISTS trigger_update_queue_timestamp ON document_processing_queue;
CREATE TRIGGER trigger_update_queue_timestamp
  BEFORE UPDATE ON document_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_document_ai_timestamp();

DROP TRIGGER IF EXISTS trigger_update_similarity_timestamp ON document_similarity;
CREATE TRIGGER trigger_update_similarity_timestamp
  BEFORE UPDATE ON document_similarity
  FOR EACH ROW
  EXECUTE FUNCTION update_document_ai_timestamp();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- OCR Results indexes
CREATE INDEX IF NOT EXISTS idx_ocr_document_id ON document_ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_project_id ON document_ocr_results(project_id);
CREATE INDEX IF NOT EXISTS idx_ocr_status ON document_ocr_results(status);
CREATE INDEX IF NOT EXISTS idx_ocr_full_text_search ON document_ocr_results USING GIN(full_text_search);
CREATE INDEX IF NOT EXISTS idx_ocr_processor ON document_ocr_results(processor_type);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_category_document_id ON document_categories(document_id);
CREATE INDEX IF NOT EXISTS idx_category_project_id ON document_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_category_primary ON document_categories(primary_category);
CREATE INDEX IF NOT EXISTS idx_category_manual ON document_categories(is_manually_set) WHERE is_manually_set = TRUE;

-- Metadata indexes
CREATE INDEX IF NOT EXISTS idx_metadata_document_id ON document_extracted_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_metadata_project_id ON document_extracted_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_metadata_tags ON document_extracted_metadata USING GIN(auto_tags);

-- Processing Queue indexes
CREATE INDEX IF NOT EXISTS idx_queue_document_id ON document_processing_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_queue_project_id ON document_processing_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON document_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_pending ON document_processing_queue(priority, scheduled_at)
  WHERE status = 'pending';

-- Similarity indexes
CREATE INDEX IF NOT EXISTS idx_similarity_document_id ON document_similarity(document_id);
CREATE INDEX IF NOT EXISTS idx_similarity_similar_id ON document_similarity(similar_document_id);
CREATE INDEX IF NOT EXISTS idx_similarity_project_id ON document_similarity(project_id);
CREATE INDEX IF NOT EXISTS idx_similarity_score ON document_similarity(overall_similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_similarity_type ON document_similarity(similarity_type);

-- Documents table - content search
CREATE INDEX IF NOT EXISTS idx_documents_content_search ON documents USING GIN(content_search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_ai_processed ON documents(ai_processed) WHERE ai_processed = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE document_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extracted_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_similarity ENABLE ROW LEVEL SECURITY;

-- OCR Results policies
CREATE POLICY "Users can view OCR results for their projects"
  ON document_ocr_results FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage OCR results in their projects"
  ON document_ocr_results FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Categories policies
CREATE POLICY "Users can view categories for their projects"
  ON document_categories FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories in their projects"
  ON document_categories FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Metadata policies
CREATE POLICY "Users can view metadata for their projects"
  ON document_extracted_metadata FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage metadata in their projects"
  ON document_extracted_metadata FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Processing Queue policies
CREATE POLICY "Users can view queue for their projects"
  ON document_processing_queue FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage queue in their projects"
  ON document_processing_queue FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Similarity policies
CREATE POLICY "Users can view similarity for their projects"
  ON document_similarity FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage similarity in their projects"
  ON document_similarity FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Document AI Processing Status View
CREATE OR REPLACE VIEW document_ai_status AS
SELECT
  d.id AS document_id,
  d.name AS document_name,
  d.project_id,
  d.file_type,
  d.ai_processed,
  d.ai_processed_at,
  ocr.status AS ocr_status,
  ocr.confidence_score AS ocr_confidence,
  ocr.word_count,
  cat.primary_category,
  cat.confidence_score AS category_confidence,
  cat.is_manually_set AS category_manual,
  meta.auto_tags,
  queue.status AS queue_status,
  queue.priority AS queue_priority
FROM documents d
LEFT JOIN document_ocr_results ocr ON ocr.document_id = d.id
LEFT JOIN document_categories cat ON cat.document_id = d.id
LEFT JOIN document_extracted_metadata meta ON meta.document_id = d.id
LEFT JOIN document_processing_queue queue ON queue.document_id = d.id
WHERE d.deleted_at IS NULL;

-- Processing Queue Stats View
CREATE OR REPLACE VIEW document_processing_stats AS
SELECT
  project_id,
  COUNT(*) AS total_documents,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
    FILTER (WHERE status = 'completed') AS avg_processing_time_ms
FROM document_processing_queue
GROUP BY project_id;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON document_ocr_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_extracted_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_processing_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_similarity TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents_full_text TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE document_ocr_results IS 'Stores OCR-extracted text and processing metadata for documents';
COMMENT ON TABLE document_categories IS 'AI-assigned document categories with confidence scores';
COMMENT ON TABLE document_extracted_metadata IS 'Auto-extracted metadata (dates, numbers, entities) from document content';
COMMENT ON TABLE document_processing_queue IS 'Async job queue for document AI processing';
COMMENT ON TABLE document_similarity IS 'Document similarity scores for duplicate/related document detection';

COMMENT ON COLUMN document_ocr_results.confidence_score IS 'Overall OCR confidence (0-100)';
COMMENT ON COLUMN document_ocr_results.processor_type IS 'Which AI service processed the document';
COMMENT ON COLUMN document_categories.suggested_categories IS 'Array of all detected categories with scores';
COMMENT ON COLUMN document_processing_queue.priority IS 'Lower number = higher priority';
COMMENT ON COLUMN document_similarity.overall_similarity_score IS 'Combined similarity score (0-1)';
