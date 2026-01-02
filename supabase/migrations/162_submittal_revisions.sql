-- Migration: Submittal Revisions and Substitution Requests
-- Adds revision tracking, substitution workflow, and enhanced submittal features

-- =============================================
-- SUBMITTAL REVISIONS TABLE
-- Tracks all revisions of a submittal
-- =============================================

CREATE TABLE IF NOT EXISTS submittal_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,

  -- Revision Identification
  revision_number INTEGER NOT NULL DEFAULT 0,
  revision_letter VARCHAR(2), -- A, B, C, AA, etc.
  revision_label TEXT GENERATED ALWAYS AS (
    CASE
      WHEN revision_letter IS NOT NULL THEN revision_letter
      ELSE 'Rev ' || revision_number::TEXT
    END
  ) STORED,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'superseded', 'void')),
  is_current BOOLEAN NOT NULL DEFAULT true,

  -- Submission Details
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),

  -- Review Details
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewer_name TEXT,
  review_status VARCHAR(30),
  review_comments TEXT,
  approval_code VARCHAR(1), -- A, B, C, D

  -- File References (snapshot at time of revision)
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment metadata

  -- Change Description
  change_description TEXT,
  reason_for_resubmission TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_submittal_revision UNIQUE (submittal_id, revision_number)
);

-- Index for quick revision lookups
CREATE INDEX IF NOT EXISTS idx_submittal_revisions_submittal ON submittal_revisions(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_revisions_current ON submittal_revisions(submittal_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_submittal_revisions_status ON submittal_revisions(submittal_id, status);

-- Enable RLS
ALTER TABLE submittal_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view submittal revisions for accessible submittals"
  ON submittal_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submittals s
      WHERE s.id = submittal_revisions.submittal_id
      AND s.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create submittal revisions"
  ON submittal_revisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM submittals s
      WHERE s.id = submittal_id
      AND s.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update submittal revisions"
  ON submittal_revisions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM submittals s
      WHERE s.id = submittal_revisions.submittal_id
      AND s.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- SUBSTITUTION REQUESTS TABLE
-- Handles product substitution workflow
-- =============================================

CREATE TABLE IF NOT EXISTS submittal_substitution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Request Identification
  request_number TEXT NOT NULL,

  -- Original Specified Product
  original_manufacturer TEXT NOT NULL,
  original_product TEXT NOT NULL,
  original_model TEXT,
  original_spec_section TEXT,
  original_cost_per_unit DECIMAL(12, 2),
  original_lead_time_weeks INTEGER,

  -- Proposed Substitute Product
  proposed_manufacturer TEXT NOT NULL,
  proposed_product TEXT NOT NULL,
  proposed_model TEXT,
  proposed_cost_per_unit DECIMAL(12, 2),
  proposed_lead_time_weeks INTEGER,

  -- Cost Analysis
  cost_difference DECIMAL(12, 2) GENERATED ALWAYS AS (
    COALESCE(proposed_cost_per_unit, 0) - COALESCE(original_cost_per_unit, 0)
  ) STORED,
  total_quantity DECIMAL(12, 2),
  total_cost_impact DECIMAL(12, 2),

  -- Justification
  justification_reason TEXT NOT NULL,
  justification_type VARCHAR(30) CHECK (justification_type IN (
    'cost_savings', 'lead_time', 'availability', 'performance',
    'sustainability', 'local_preference', 'voc_compliance', 'other'
  )),
  performance_comparison TEXT,
  warranty_comparison TEXT,
  installation_differences TEXT,
  maintenance_differences TEXT,

  -- Supporting Documentation
  product_data_url TEXT,
  comparison_matrix_url TEXT,
  sample_reference TEXT,

  -- Approval Workflow
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'draft', 'pending', 'under_review', 'approved',
    'approved_with_conditions', 'rejected', 'withdrawn'
  )),
  approval_conditions TEXT,
  rejection_reason TEXT,

  -- Review Tracking
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewer_name TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_substitution_request UNIQUE (project_id, request_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_substitution_requests_submittal ON submittal_substitution_requests(submittal_id);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_project ON submittal_substitution_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_status ON submittal_substitution_requests(status);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_company ON submittal_substitution_requests(company_id);

-- Enable RLS
ALTER TABLE submittal_substitution_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view substitution requests in their company"
  ON submittal_substitution_requests FOR SELECT
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create substitution requests"
  ON submittal_substitution_requests FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update substitution requests"
  ON submittal_substitution_requests FOR UPDATE
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to create a new revision and supersede old ones
CREATE OR REPLACE FUNCTION create_submittal_revision(
  p_submittal_id UUID,
  p_change_description TEXT DEFAULT NULL,
  p_reason_for_resubmission TEXT DEFAULT NULL,
  p_use_letters BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_revision_id UUID;
  v_next_number INTEGER;
  v_next_letter TEXT;
  v_current_letter TEXT;
BEGIN
  -- Mark all existing revisions as superseded
  UPDATE submittal_revisions
  SET status = 'superseded', is_current = false
  WHERE submittal_id = p_submittal_id AND is_current = true;

  -- Get next revision number
  SELECT COALESCE(MAX(revision_number), -1) + 1
  INTO v_next_number
  FROM submittal_revisions
  WHERE submittal_id = p_submittal_id;

  -- Calculate next letter if using letters
  IF p_use_letters THEN
    SELECT revision_letter INTO v_current_letter
    FROM submittal_revisions
    WHERE submittal_id = p_submittal_id
    ORDER BY revision_number DESC
    LIMIT 1;

    IF v_current_letter IS NULL THEN
      v_next_letter := 'A';
    ELSIF v_current_letter = 'Z' THEN
      v_next_letter := 'AA';
    ELSIF LENGTH(v_current_letter) = 1 THEN
      v_next_letter := CHR(ASCII(v_current_letter) + 1);
    ELSE
      v_next_letter := v_current_letter || 'A'; -- Handle beyond Z
    END IF;
  END IF;

  -- Create new revision
  INSERT INTO submittal_revisions (
    submittal_id,
    revision_number,
    revision_letter,
    status,
    is_current,
    change_description,
    reason_for_resubmission,
    created_by
  ) VALUES (
    p_submittal_id,
    v_next_number,
    v_next_letter,
    'current',
    true,
    p_change_description,
    p_reason_for_resubmission,
    auth.uid()
  ) RETURNING id INTO v_revision_id;

  -- Update submittal's revision_number
  UPDATE submittals
  SET revision_number = v_next_number,
      review_status = 'not_submitted',
      date_submitted = NULL,
      date_returned = NULL,
      updated_at = now()
  WHERE id = p_submittal_id;

  RETURN v_revision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next substitution request number
CREATE OR REPLACE FUNCTION get_next_substitution_request_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_project_code TEXT;
BEGIN
  -- Get project code (first 3 chars of project name or number)
  SELECT UPPER(LEFT(COALESCE(project_number, name), 3))
  INTO v_project_code
  FROM projects
  WHERE id = p_project_id;

  -- Count existing substitution requests
  SELECT COUNT(*) + 1
  INTO v_count
  FROM submittal_substitution_requests
  WHERE project_id = p_project_id
  AND deleted_at IS NULL;

  RETURN v_project_code || '-SUB-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to compare revisions
CREATE OR REPLACE FUNCTION compare_submittal_revisions(
  p_revision_id_1 UUID,
  p_revision_id_2 UUID
)
RETURNS TABLE (
  field_name TEXT,
  revision_1_value TEXT,
  revision_2_value TEXT,
  is_different BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.field_name,
    CASE f.field_name
      WHEN 'revision_number' THEN r1.revision_number::TEXT
      WHEN 'status' THEN r1.status
      WHEN 'review_status' THEN r1.review_status
      WHEN 'review_comments' THEN r1.review_comments
      WHEN 'approval_code' THEN r1.approval_code
      WHEN 'submitted_at' THEN r1.submitted_at::TEXT
      WHEN 'reviewed_at' THEN r1.reviewed_at::TEXT
      WHEN 'change_description' THEN r1.change_description
    END AS revision_1_value,
    CASE f.field_name
      WHEN 'revision_number' THEN r2.revision_number::TEXT
      WHEN 'status' THEN r2.status
      WHEN 'review_status' THEN r2.review_status
      WHEN 'review_comments' THEN r2.review_comments
      WHEN 'approval_code' THEN r2.approval_code
      WHEN 'submitted_at' THEN r2.submitted_at::TEXT
      WHEN 'reviewed_at' THEN r2.reviewed_at::TEXT
      WHEN 'change_description' THEN r2.change_description
    END AS revision_2_value,
    CASE f.field_name
      WHEN 'revision_number' THEN r1.revision_number IS DISTINCT FROM r2.revision_number
      WHEN 'status' THEN r1.status IS DISTINCT FROM r2.status
      WHEN 'review_status' THEN r1.review_status IS DISTINCT FROM r2.review_status
      WHEN 'review_comments' THEN r1.review_comments IS DISTINCT FROM r2.review_comments
      WHEN 'approval_code' THEN r1.approval_code IS DISTINCT FROM r2.approval_code
      WHEN 'submitted_at' THEN r1.submitted_at IS DISTINCT FROM r2.submitted_at
      WHEN 'reviewed_at' THEN r1.reviewed_at IS DISTINCT FROM r2.reviewed_at
      WHEN 'change_description' THEN r1.change_description IS DISTINCT FROM r2.change_description
    END AS is_different
  FROM submittal_revisions r1
  CROSS JOIN submittal_revisions r2
  CROSS JOIN (
    VALUES
      ('revision_number'),
      ('status'),
      ('review_status'),
      ('review_comments'),
      ('approval_code'),
      ('submitted_at'),
      ('reviewed_at'),
      ('change_description')
  ) AS f(field_name)
  WHERE r1.id = p_revision_id_1
  AND r2.id = p_revision_id_2;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UPDATED AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_submittal_substitution_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_submittal_substitution_requests_updated_at
  BEFORE UPDATE ON submittal_substitution_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_submittal_substitution_requests_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON submittal_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON submittal_substitution_requests TO authenticated;
GRANT EXECUTE ON FUNCTION create_submittal_revision TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_substitution_request_number TO authenticated;
GRANT EXECUTE ON FUNCTION compare_submittal_revisions TO authenticated;
