-- Migration 121: Unified Photo Evidence Hub
-- Phase 2.1: Cross-Feature Integration - Photo Entity Linking System
-- Enables photos to be linked to multiple entities across features

-- =============================================================================
-- PHOTO ENTITY LINKS TABLE
-- =============================================================================

-- Central table for linking photos to any entity type
CREATE TABLE IF NOT EXISTS photo_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by UUID REFERENCES users(id),
  is_primary BOOLEAN DEFAULT false,
  context_note TEXT,
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Ensure unique link per photo-entity combination
  CONSTRAINT unique_photo_entity_link UNIQUE(photo_id, entity_type, entity_id),

  -- Entity type must be valid
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'daily_report',
    'punch_item',
    'rfi',
    'submittal',
    'inspection',
    'checklist',
    'change_order',
    'safety_incident',
    'safety_observation',
    'equipment',
    'equipment_inspection',
    'task',
    'meeting',
    'workflow_item',
    'near_miss'
  ))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_photo_links_entity ON photo_entity_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_photo_links_photo ON photo_entity_links(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_links_company ON photo_entity_links(company_id);
CREATE INDEX IF NOT EXISTS idx_photo_links_linked_at ON photo_entity_links(linked_at DESC);

-- =============================================================================
-- PHOTO DEDUPLICATION TABLE
-- =============================================================================

-- Store perceptual hashes for deduplication
CREATE TABLE IF NOT EXISTS photo_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  phash TEXT NOT NULL, -- Perceptual hash (64-bit hex string)
  dhash TEXT, -- Difference hash for faster comparison
  ahash TEXT, -- Average hash
  file_hash TEXT, -- MD5 of original file
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_photo_hash UNIQUE(photo_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_hashes_phash ON photo_hashes(phash);
CREATE INDEX IF NOT EXISTS idx_photo_hashes_dhash ON photo_hashes(dhash);
CREATE INDEX IF NOT EXISTS idx_photo_hashes_file_hash ON photo_hashes(file_hash);

-- =============================================================================
-- PHOTO BULK UPLOAD BATCHES
-- =============================================================================

-- Track bulk upload batches for progress reporting
CREATE TABLE IF NOT EXISTS photo_upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  uploaded_by UUID REFERENCES users(id),

  -- Batch metadata
  batch_name TEXT,
  total_photos INTEGER NOT NULL DEFAULT 0,
  processed_photos INTEGER NOT NULL DEFAULT 0,
  failed_photos INTEGER NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),

  -- Default entity to link all photos to
  default_entity_type TEXT,
  default_entity_id UUID,

  -- Error tracking
  error_message TEXT,
  errors JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_photo_batches_project ON photo_upload_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_photo_batches_status ON photo_upload_batches(status);

-- =============================================================================
-- FUNCTIONS FOR PHOTO LINKING
-- =============================================================================

-- Function to get all photos for an entity
CREATE OR REPLACE FUNCTION get_entity_photos(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  photo_id UUID,
  file_url TEXT,
  thumbnail_url TEXT,
  file_name TEXT,
  caption TEXT,
  is_primary BOOLEAN,
  context_note TEXT,
  linked_at TIMESTAMPTZ,
  linked_by UUID,
  captured_at TIMESTAMPTZ,
  building TEXT,
  floor TEXT,
  area TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as photo_id,
    p.file_url,
    p.thumbnail_url,
    p.file_name,
    p.caption,
    pel.is_primary,
    pel.context_note,
    pel.linked_at,
    pel.linked_by,
    p.captured_at,
    p.building,
    p.floor,
    p.area
  FROM photos p
  INNER JOIN photo_entity_links pel ON p.id = pel.photo_id
  WHERE pel.entity_type = p_entity_type
    AND pel.entity_id = p_entity_id
    AND p.deleted_at IS NULL
  ORDER BY pel.is_primary DESC, pel.linked_at DESC;
END;
$$;

-- Function to link photos in bulk
CREATE OR REPLACE FUNCTION bulk_link_photos(
  p_photo_ids UUID[],
  p_entity_type TEXT,
  p_entity_id UUID,
  p_linked_by UUID,
  p_company_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO photo_entity_links (photo_id, entity_type, entity_id, linked_by, company_id)
  SELECT
    unnest(p_photo_ids),
    p_entity_type,
    p_entity_id,
    p_linked_by,
    p_company_id
  ON CONFLICT (photo_id, entity_type, entity_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to find duplicate photos by hash
CREATE OR REPLACE FUNCTION find_duplicate_photos(
  p_project_id UUID,
  p_phash TEXT,
  p_threshold INTEGER DEFAULT 5
)
RETURNS TABLE (
  photo_id UUID,
  similarity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ph.photo_id,
    -- Calculate hamming distance (lower is more similar)
    (
      SELECT COUNT(*)::INTEGER
      FROM unnest(
        string_to_array(
          (SELECT phash FROM photo_hashes WHERE photo_id = ph.photo_id),
          NULL
        )::TEXT[],
        string_to_array(p_phash, NULL)::TEXT[]
      ) AS t(a, b)
      WHERE a != b
    ) as similarity
  FROM photo_hashes ph
  INNER JOIN photos p ON ph.photo_id = p.id
  WHERE p.project_id = p_project_id
    AND p.deleted_at IS NULL
  HAVING (
    SELECT COUNT(*)::INTEGER
    FROM unnest(
      string_to_array(ph.phash, NULL)::TEXT[],
      string_to_array(p_phash, NULL)::TEXT[]
    ) AS t(a, b)
    WHERE a != b
  ) <= p_threshold
  ORDER BY similarity ASC
  LIMIT 10;
END;
$$;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE photo_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_upload_batches ENABLE ROW LEVEL SECURITY;

-- Photo entity links policies
CREATE POLICY "photo_entity_links_select" ON photo_entity_links
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "photo_entity_links_insert" ON photo_entity_links
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "photo_entity_links_update" ON photo_entity_links
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "photo_entity_links_delete" ON photo_entity_links
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Photo hashes policies
CREATE POLICY "photo_hashes_select" ON photo_hashes
  FOR SELECT USING (
    photo_id IN (
      SELECT id FROM photos WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "photo_hashes_insert" ON photo_hashes
  FOR INSERT WITH CHECK (
    photo_id IN (
      SELECT id FROM photos WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Photo upload batches policies
CREATE POLICY "photo_upload_batches_select" ON photo_upload_batches
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "photo_upload_batches_insert" ON photo_upload_batches
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "photo_upload_batches_update" ON photo_upload_batches
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE photo_entity_links IS 'Central table for linking photos to multiple entities across features';
COMMENT ON TABLE photo_hashes IS 'Perceptual hashes for photo deduplication';
COMMENT ON TABLE photo_upload_batches IS 'Track bulk photo upload progress';
COMMENT ON FUNCTION get_entity_photos IS 'Get all photos linked to a specific entity';
COMMENT ON FUNCTION bulk_link_photos IS 'Link multiple photos to an entity in one operation';
COMMENT ON FUNCTION find_duplicate_photos IS 'Find potentially duplicate photos using perceptual hash similarity';
