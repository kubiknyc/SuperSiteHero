-- Migration: 050_dedicated_submittals.sql
-- Description: Dedicated Submittals table with spec-based numbering and approval workflow
-- Date: 2025-12-05

-- =============================================
-- TABLE: submittals
-- Dedicated submittal tracking with construction-specific fields
-- =============================================
CREATE TABLE IF NOT EXISTS submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Submittal Identification (spec-section based: 03 30 00-1)
  submittal_number VARCHAR(50) NOT NULL,
  revision_number INTEGER DEFAULT 0,

  -- Core Fields
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Specification Reference
  spec_section VARCHAR(20) NOT NULL,  -- e.g., "03 30 00"
  spec_section_title VARCHAR(255),

  -- Submittal Type
  submittal_type VARCHAR(50) NOT NULL,  -- product_data, shop_drawing, sample, mix_design, etc.

  -- Dates
  date_required DATE,
  date_submitted TIMESTAMPTZ,
  date_received TIMESTAMPTZ,
  date_returned TIMESTAMPTZ,

  -- Review Status
  review_status VARCHAR(50) NOT NULL DEFAULT 'not_submitted',
  review_comments TEXT,

  -- Ball-in-Court
  ball_in_court UUID REFERENCES users(id),
  ball_in_court_entity VARCHAR(50),  -- 'subcontractor', 'gc', 'architect', 'owner'

  -- Assignment
  submitted_by_company UUID REFERENCES companies(id),
  submitted_by_user UUID REFERENCES users(id),
  reviewer_id UUID REFERENCES users(id),

  -- Subcontractor
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Review Tracking
  days_for_review INTEGER DEFAULT 14,  -- Standard review period
  review_due_date DATE,

  -- Related Items
  related_rfi_id UUID REFERENCES rfis(id),

  -- Discipline
  discipline VARCHAR(100),

  -- Workflow tracking from legacy system
  legacy_workflow_item_id UUID REFERENCES workflow_items(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, submittal_number, revision_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submittals_project_id ON submittals(project_id);
CREATE INDEX IF NOT EXISTS idx_submittals_company_id ON submittals(company_id);
CREATE INDEX IF NOT EXISTS idx_submittals_spec_section ON submittals(spec_section);
CREATE INDEX IF NOT EXISTS idx_submittals_review_status ON submittals(review_status);
CREATE INDEX IF NOT EXISTS idx_submittals_submittal_type ON submittals(submittal_type);
CREATE INDEX IF NOT EXISTS idx_submittals_ball_in_court ON submittals(ball_in_court);
CREATE INDEX IF NOT EXISTS idx_submittals_subcontractor_id ON submittals(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_submittals_date_required ON submittals(date_required);
CREATE INDEX IF NOT EXISTS idx_submittals_deleted_at ON submittals(deleted_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_submittals_updated_at ON submittals;
CREATE TRIGGER update_submittals_updated_at BEFORE UPDATE ON submittals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE submittals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view submittals for their company projects" ON submittals;
CREATE POLICY "Users can view submittals for their company projects" ON submittals
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert submittals for their company projects" ON submittals;
CREATE POLICY "Users can insert submittals for their company projects" ON submittals
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update submittals for their company projects" ON submittals;
CREATE POLICY "Users can update submittals for their company projects" ON submittals
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: submittal_items
-- Individual items within a submittal package
-- =============================================
CREATE TABLE IF NOT EXISTS submittal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,

  -- Item details
  item_number INTEGER NOT NULL,
  description VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  model_number VARCHAR(100),
  quantity INTEGER,
  unit VARCHAR(20),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submittal_items_submittal_id ON submittal_items(submittal_id);

-- Enable RLS
ALTER TABLE submittal_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from parent submittal)
DROP POLICY IF EXISTS "Users can view submittal items for their projects" ON submittal_items;
CREATE POLICY "Users can view submittal items for their projects" ON submittal_items
  FOR SELECT
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert submittal items" ON submittal_items;
CREATE POLICY "Users can insert submittal items" ON submittal_items
  FOR INSERT
  WITH CHECK (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update submittal items" ON submittal_items;
CREATE POLICY "Users can update submittal items" ON submittal_items
  FOR UPDATE
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete submittal items" ON submittal_items;
CREATE POLICY "Users can delete submittal items" ON submittal_items
  FOR DELETE
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: submittal_attachments
-- Files attached to submittals
-- =============================================
CREATE TABLE IF NOT EXISTS submittal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,

  -- Document or file
  document_id UUID REFERENCES documents(id),
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),  -- 'product_data', 'shop_drawing', 'sample_photo', 'cut_sheet', etc.
  file_size INTEGER,

  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submittal_attachments_submittal_id ON submittal_attachments(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_attachments_document_id ON submittal_attachments(document_id);

-- Enable RLS
ALTER TABLE submittal_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view submittal attachments" ON submittal_attachments;
CREATE POLICY "Users can view submittal attachments" ON submittal_attachments
  FOR SELECT
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert submittal attachments" ON submittal_attachments;
CREATE POLICY "Users can insert submittal attachments" ON submittal_attachments
  FOR INSERT
  WITH CHECK (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete submittal attachments" ON submittal_attachments;
CREATE POLICY "Users can delete submittal attachments" ON submittal_attachments
  FOR DELETE
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: submittal_reviews
-- Review history for submittals
-- =============================================
CREATE TABLE IF NOT EXISTS submittal_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,

  -- Review Info
  review_status VARCHAR(50) NOT NULL,  -- approved, approved_as_noted, revise_resubmit, rejected
  comments TEXT,

  -- Reviewer
  reviewed_by UUID REFERENCES users(id),
  reviewer_name VARCHAR(255),
  reviewer_company VARCHAR(255),

  -- Dates
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Attachments (marked up drawings, etc.)
  review_attachments JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submittal_reviews_submittal_id ON submittal_reviews(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_reviews_reviewed_at ON submittal_reviews(reviewed_at);

-- Enable RLS
ALTER TABLE submittal_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view submittal reviews" ON submittal_reviews;
CREATE POLICY "Users can view submittal reviews" ON submittal_reviews
  FOR SELECT
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert submittal reviews" ON submittal_reviews;
CREATE POLICY "Users can insert submittal reviews" ON submittal_reviews
  FOR INSERT
  WITH CHECK (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: submittal_history
-- Track all changes to submittals
-- =============================================
CREATE TABLE IF NOT EXISTS submittal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,

  -- Change Info
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submittal_history_submittal_id ON submittal_history(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_history_changed_at ON submittal_history(changed_at);

-- Enable RLS
ALTER TABLE submittal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view submittal history" ON submittal_history;
CREATE POLICY "Users can view submittal history" ON submittal_history
  FOR SELECT
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- FUNCTION: generate_submittal_number
-- Generate spec-based submittal number
-- =============================================
CREATE OR REPLACE FUNCTION generate_submittal_number(p_project_id UUID, p_spec_section VARCHAR(20))
RETURNS VARCHAR(50) AS $$
DECLARE
  v_count INTEGER;
  v_number VARCHAR(50);
BEGIN
  -- Count existing submittals for this spec section in this project
  SELECT COUNT(*) + 1 INTO v_count
  FROM submittals
  WHERE project_id = p_project_id
    AND spec_section = p_spec_section
    AND deleted_at IS NULL;

  -- Format: "03 30 00-1", "03 30 00-2", etc.
  v_number := p_spec_section || '-' || v_count::TEXT;

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: track_submittal_changes
-- Automatically track changes to submittals
-- =============================================
CREATE OR REPLACE FUNCTION track_submittal_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO submittal_history (submittal_id, action, changed_by)
    VALUES (NEW.id, 'created', v_user_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.review_status IS DISTINCT FROM NEW.review_status THEN
      INSERT INTO submittal_history (submittal_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_changed', 'review_status', OLD.review_status, NEW.review_status, v_user_id);
    END IF;

    -- Track ball-in-court changes
    IF OLD.ball_in_court IS DISTINCT FROM NEW.ball_in_court THEN
      INSERT INTO submittal_history (submittal_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'ball_in_court_changed', 'ball_in_court', OLD.ball_in_court::text, NEW.ball_in_court::text, v_user_id);
    END IF;

    -- Track submission
    IF OLD.date_submitted IS NULL AND NEW.date_submitted IS NOT NULL THEN
      INSERT INTO submittal_history (submittal_id, action, changed_by)
      VALUES (NEW.id, 'submitted', v_user_id);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_submittal_changes ON submittals;
CREATE TRIGGER trigger_track_submittal_changes
  AFTER INSERT OR UPDATE ON submittals
  FOR EACH ROW EXECUTE FUNCTION track_submittal_changes();

-- =============================================
-- VIEW: submittal_register
-- Submittal register view with computed fields
-- =============================================
CREATE OR REPLACE VIEW submittal_register AS
SELECT
  s.*,
  -- Days calculations (date subtraction returns integer directly in PostgreSQL)
  CASE
    WHEN s.date_required IS NOT NULL AND s.review_status NOT IN ('approved', 'approved_as_noted')
    THEN (s.date_required::date - CURRENT_DATE)::INTEGER
    ELSE NULL
  END as days_until_required,
  CASE
    WHEN s.date_submitted IS NOT NULL AND s.date_returned IS NULL
    THEN (CURRENT_DATE - s.date_submitted::date)::INTEGER
    ELSE NULL
  END as days_in_review,
  CASE
    WHEN s.date_required IS NOT NULL AND s.date_required < CURRENT_DATE AND s.review_status NOT IN ('approved', 'approved_as_noted')
    THEN true
    ELSE false
  END as is_overdue,
  -- Item count
  (SELECT COUNT(*) FROM submittal_items si WHERE si.submittal_id = s.id) as item_count,
  -- Attachment count
  (SELECT COUNT(*) FROM submittal_attachments sa WHERE sa.submittal_id = s.id) as attachment_count
FROM submittals s
WHERE s.deleted_at IS NULL;

-- Now add FK constraint from rfis to submittals (deferred)
ALTER TABLE rfis
  DROP CONSTRAINT IF EXISTS rfis_related_submittal_id_fkey;
ALTER TABLE rfis
  ADD CONSTRAINT rfis_related_submittal_id_fkey
  FOREIGN KEY (related_submittal_id) REFERENCES submittals(id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 050_dedicated_submittals completed successfully';
END $$;
