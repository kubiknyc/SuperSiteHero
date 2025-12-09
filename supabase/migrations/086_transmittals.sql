-- =============================================
-- Migration: Transmittals
-- Description: Document transmittals for RFIs, Submittals, Drawings, and other documents
-- =============================================

-- Transmittals table
CREATE TABLE IF NOT EXISTS transmittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Transmittal identification
  transmittal_number VARCHAR(50) NOT NULL, -- T-YYYY-NNNN format
  revision_number INTEGER DEFAULT 0,

  -- Date tracking
  date_sent DATE,
  date_due DATE,

  -- Sender information
  from_company VARCHAR(200) NOT NULL,
  from_contact VARCHAR(200),
  from_email VARCHAR(255),
  from_phone VARCHAR(50),

  -- Recipient information
  to_company VARCHAR(200) NOT NULL,
  to_contact VARCHAR(200),
  to_email VARCHAR(255),
  to_phone VARCHAR(50),

  -- Content
  subject VARCHAR(500) NOT NULL,
  remarks TEXT,
  cover_letter TEXT,

  -- Transmission method
  transmission_method VARCHAR(50) DEFAULT 'email', -- email, mail, hand_delivery, courier, pickup
  tracking_number VARCHAR(100), -- for courier/mail

  -- Distribution
  distribution_list_id UUID REFERENCES distribution_lists(id),
  cc_list UUID[], -- Array of profile IDs
  cc_external JSONB, -- Array of {email, name, company}

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, received, acknowledged, void
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,

  -- Receipt acknowledgment
  received_by VARCHAR(200),
  received_date DATE,
  acknowledgment_notes TEXT,
  acknowledgment_signature TEXT, -- base64 encoded signature

  -- Response required
  response_required BOOLEAN DEFAULT FALSE,
  response_due_date DATE,
  response_received BOOLEAN DEFAULT FALSE,
  response_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_transmittal_number UNIQUE (company_id, project_id, transmittal_number)
);

-- Transmittal Items table
CREATE TABLE IF NOT EXISTS transmittal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmittal_id UUID NOT NULL REFERENCES transmittals(id) ON DELETE CASCADE,

  -- Item identification
  item_number INTEGER NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- document, rfi, submittal, drawing, shop_drawing, specification, report, other

  -- Reference to source item (optional - for linked items)
  reference_id UUID, -- FK varies by type
  reference_number VARCHAR(100), -- e.g., RFI-001, SUB-002

  -- Item details
  description TEXT NOT NULL,
  specification_section VARCHAR(50),
  drawing_number VARCHAR(50),

  -- Copies and format
  copies INTEGER DEFAULT 1,
  format VARCHAR(50) DEFAULT 'pdf', -- pdf, hard_copy, both, original, copy

  -- Action required
  action_required VARCHAR(50) DEFAULT 'for_information', -- for_approval, for_review, for_information, for_record, as_requested, for_signature

  -- Item status
  status VARCHAR(50) DEFAULT 'included', -- included, pending, returned, missing

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Constraints
  CONSTRAINT unique_item_per_transmittal UNIQUE (transmittal_id, item_number)
);

-- Transmittal Attachments table
CREATE TABLE IF NOT EXISTS transmittal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmittal_id UUID NOT NULL REFERENCES transmittals(id) ON DELETE CASCADE,
  item_id UUID REFERENCES transmittal_items(id) ON DELETE SET NULL,

  -- File information
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),

  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_transmittals_company
  ON transmittals(company_id);

CREATE INDEX IF NOT EXISTS idx_transmittals_project
  ON transmittals(project_id);

CREATE INDEX IF NOT EXISTS idx_transmittals_number
  ON transmittals(transmittal_number);

CREATE INDEX IF NOT EXISTS idx_transmittals_status
  ON transmittals(status);

CREATE INDEX IF NOT EXISTS idx_transmittals_date_sent
  ON transmittals(date_sent);

CREATE INDEX IF NOT EXISTS idx_transmittals_to_company
  ON transmittals(to_company);

CREATE INDEX IF NOT EXISTS idx_transmittal_items_transmittal
  ON transmittal_items(transmittal_id);

CREATE INDEX IF NOT EXISTS idx_transmittal_items_type
  ON transmittal_items(item_type);

CREATE INDEX IF NOT EXISTS idx_transmittal_attachments_transmittal
  ON transmittal_attachments(transmittal_id);

-- =============================================
-- Triggers
-- =============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_transmittals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transmittals_updated ON transmittals;
CREATE TRIGGER trg_transmittals_updated
  BEFORE UPDATE ON transmittals
  FOR EACH ROW
  EXECUTE FUNCTION update_transmittals_timestamp();

-- Auto-generate transmittal number
CREATE OR REPLACE FUNCTION generate_transmittal_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  next_number INTEGER;
BEGIN
  IF NEW.transmittal_number IS NULL OR NEW.transmittal_number = '' THEN
    year_prefix := to_char(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
      CAST(NULLIF(regexp_replace(transmittal_number, '^T-' || year_prefix || '-', ''), '') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM transmittals
    WHERE company_id = NEW.company_id
      AND project_id = NEW.project_id
      AND transmittal_number LIKE 'T-' || year_prefix || '-%';

    NEW.transmittal_number := 'T-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transmittal_number ON transmittals;
CREATE TRIGGER trg_transmittal_number
  BEFORE INSERT ON transmittals
  FOR EACH ROW
  EXECUTE FUNCTION generate_transmittal_number();

-- Auto-number transmittal items
CREATE OR REPLACE FUNCTION set_transmittal_item_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_number IS NULL OR NEW.item_number = 0 THEN
    SELECT COALESCE(MAX(item_number), 0) + 1
    INTO NEW.item_number
    FROM transmittal_items
    WHERE transmittal_id = NEW.transmittal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transmittal_item_number ON transmittal_items;
CREATE TRIGGER trg_transmittal_item_number
  BEFORE INSERT ON transmittal_items
  FOR EACH ROW
  EXECUTE FUNCTION set_transmittal_item_number();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmittal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmittal_attachments ENABLE ROW LEVEL SECURITY;

-- Transmittals: Users can see transmittals for their projects
CREATE POLICY transmittals_select ON transmittals
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Transmittals: Users can create transmittals for their projects
CREATE POLICY transmittals_insert ON transmittals
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Transmittals: Users can update transmittals they created or are project members
CREATE POLICY transmittals_update ON transmittals
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Transmittals: Users can delete draft transmittals they created
CREATE POLICY transmittals_delete ON transmittals
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'draft'
  );

-- Transmittal Items: Users can see items for transmittals they can see
CREATE POLICY transmittal_items_select ON transmittal_items
  FOR SELECT USING (
    transmittal_id IN (
      SELECT id FROM transmittals
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Transmittal Items: Users can manage items for transmittals they can manage
CREATE POLICY transmittal_items_insert ON transmittal_items
  FOR INSERT WITH CHECK (
    transmittal_id IN (
      SELECT id FROM transmittals
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY transmittal_items_update ON transmittal_items
  FOR UPDATE USING (
    transmittal_id IN (
      SELECT id FROM transmittals
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY transmittal_items_delete ON transmittal_items
  FOR DELETE USING (
    transmittal_id IN (
      SELECT id FROM transmittals
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
      AND status = 'draft'
    )
  );

-- Transmittal Attachments: Same pattern as items
CREATE POLICY transmittal_attachments_select ON transmittal_attachments
  FOR SELECT USING (
    transmittal_id IN (
      SELECT id FROM transmittals
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY transmittal_attachments_insert ON transmittal_attachments
  FOR INSERT WITH CHECK (
    transmittal_id IN (
      SELECT id FROM transmittals
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY transmittal_attachments_delete ON transmittal_attachments
  FOR DELETE USING (
    transmittal_id IN (
      SELECT id FROM transmittals
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- Helper Functions
-- =============================================

-- Get transmittal with all related data
CREATE OR REPLACE FUNCTION get_transmittal_full(p_transmittal_id UUID)
RETURNS TABLE (
  transmittal JSONB,
  items JSONB,
  attachments JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(t.*) AS transmittal,
    COALESCE(
      jsonb_agg(DISTINCT ti.*) FILTER (WHERE ti.id IS NOT NULL),
      '[]'::jsonb
    ) AS items,
    COALESCE(
      jsonb_agg(DISTINCT ta.*) FILTER (WHERE ta.id IS NOT NULL),
      '[]'::jsonb
    ) AS attachments
  FROM transmittals t
  LEFT JOIN transmittal_items ti ON ti.transmittal_id = t.id
  LEFT JOIN transmittal_attachments ta ON ta.transmittal_id = t.id
  WHERE t.id = p_transmittal_id
  GROUP BY t.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get next transmittal number (for preview)
CREATE OR REPLACE FUNCTION get_next_transmittal_number(
  p_company_id UUID,
  p_project_id UUID
)
RETURNS VARCHAR(50) AS $$
DECLARE
  year_prefix VARCHAR(4);
  next_number INTEGER;
BEGIN
  year_prefix := to_char(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(transmittal_number, '^T-' || year_prefix || '-', ''), '') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM transmittals
  WHERE company_id = p_company_id
    AND project_id = p_project_id
    AND transmittal_number LIKE 'T-' || year_prefix || '-%';

  RETURN 'T-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE transmittals IS 'Document transmittals for tracking formal document transfers';
COMMENT ON TABLE transmittal_items IS 'Individual items included in a transmittal';
COMMENT ON TABLE transmittal_attachments IS 'Files attached to transmittals';
COMMENT ON COLUMN transmittals.transmittal_number IS 'Auto-generated in T-YYYY-NNNN format';
COMMENT ON COLUMN transmittals.transmission_method IS 'How the transmittal was/will be sent';
COMMENT ON COLUMN transmittal_items.action_required IS 'What action recipient should take';
COMMENT ON COLUMN transmittal_items.format IS 'Format of the item being transmitted';
