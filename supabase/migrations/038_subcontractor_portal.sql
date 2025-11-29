-- =============================================
-- Migration: 038_subcontractor_portal.sql
-- Description: Subcontractor Portal - Access control, RLS fixes, and compliance tracking
-- Date: 2025-11-29
-- =============================================

-- =============================================
-- 1. SUBCONTRACTOR PORTAL ACCESS TABLE
-- Tracks which subcontractor users have access to which projects
-- =============================================

CREATE TABLE IF NOT EXISTS subcontractor_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Granular permissions
  can_view_scope BOOLEAN DEFAULT true,
  can_view_documents BOOLEAN DEFAULT true,
  can_submit_bids BOOLEAN DEFAULT true,
  can_view_schedule BOOLEAN DEFAULT true,
  can_update_punch_items BOOLEAN DEFAULT true,
  can_update_tasks BOOLEAN DEFAULT true,
  can_upload_documents BOOLEAN DEFAULT false,

  -- Invitation tracking
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(subcontractor_id, user_id, project_id)
);

-- Enable RLS
ALTER TABLE subcontractor_portal_access ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_subcontractor_portal_access_user_id ON subcontractor_portal_access(user_id);
CREATE INDEX idx_subcontractor_portal_access_subcontractor_id ON subcontractor_portal_access(subcontractor_id);
CREATE INDEX idx_subcontractor_portal_access_project_id ON subcontractor_portal_access(project_id);
CREATE INDEX idx_subcontractor_portal_access_active ON subcontractor_portal_access(is_active) WHERE is_active = true;

-- =============================================
-- 2. SUBCONTRACTOR COMPLIANCE DOCUMENTS TABLE
-- Track insurance certificates, licenses, etc.
-- =============================================

CREATE TABLE IF NOT EXISTS subcontractor_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- NULL = company-wide document

  -- Document info
  document_type VARCHAR(50) NOT NULL, -- 'insurance_certificate', 'license', 'w9', 'bond', 'safety_cert', 'other'
  document_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- File storage
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Expiration tracking
  issue_date DATE,
  expiration_date DATE,
  -- Note: is_expired is computed at query time, not stored
  -- Use: expiration_date < CURRENT_DATE to check if expired
  expiration_warning_sent BOOLEAN DEFAULT false,

  -- Coverage details (for insurance)
  coverage_amount DECIMAL(15, 2),
  policy_number VARCHAR(100),
  provider_name VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_notes TEXT,

  -- Audit
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE subcontractor_compliance_documents ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_compliance_docs_subcontractor ON subcontractor_compliance_documents(subcontractor_id);
CREATE INDEX idx_compliance_docs_project ON subcontractor_compliance_documents(project_id);
CREATE INDEX idx_compliance_docs_type ON subcontractor_compliance_documents(document_type);
CREATE INDEX idx_compliance_docs_expiration ON subcontractor_compliance_documents(expiration_date)
  WHERE expiration_date IS NOT NULL;
-- Note: Partial index with CURRENT_DATE is not allowed (not immutable)
-- Query expiring documents using: WHERE expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'

-- =============================================
-- 3. SUBCONTRACTOR INVITATIONS TABLE
-- Track pending portal invitations
-- =============================================

CREATE TABLE IF NOT EXISTS subcontractor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Invitation details
  email VARCHAR(255) NOT NULL,
  token UUID DEFAULT gen_random_uuid(),

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'

  -- Timestamps
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subcontractor_invitations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_invitations_email ON subcontractor_invitations(email);
CREATE INDEX idx_invitations_token ON subcontractor_invitations(token);
CREATE INDEX idx_invitations_status ON subcontractor_invitations(status);
CREATE INDEX idx_invitations_subcontractor ON subcontractor_invitations(subcontractor_id);

-- =============================================
-- 4. FIX TASKS RLS FOR SUBCONTRACTORS
-- Add policy for subcontractors to view/update tasks assigned to them
-- =============================================

-- Drop existing policies if they exist (safe migration)
DROP POLICY IF EXISTS "Subcontractors can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Subcontractors can update assigned tasks" ON tasks;

-- Subcontractors can view tasks assigned to their company
CREATE POLICY "Subcontractors can view assigned tasks"
  ON tasks FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND assigned_to_subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- Subcontractors can update tasks assigned to them (status, completion)
CREATE POLICY "Subcontractors can update assigned tasks"
  ON tasks FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND assigned_to_subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- 5. ADD SUBCONTRACTOR UPDATE POLICY FOR PUNCH ITEMS
-- Allow subcontractors to update status on their assigned items
-- =============================================

DROP POLICY IF EXISTS "Subcontractors can update assigned punch items" ON punch_items;

CREATE POLICY "Subcontractors can update assigned punch items"
  ON punch_items FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- 6. RLS POLICIES FOR SUBCONTRACTOR PORTAL ACCESS TABLE
-- =============================================

-- GC users can view/manage portal access for their projects
CREATE POLICY "GC users can view portal access"
  ON subcontractor_portal_access FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "GC users can manage portal access"
  ON subcontractor_portal_access FOR ALL
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- Subcontractors can view their own access records
CREATE POLICY "Subcontractors can view own access"
  ON subcontractor_portal_access FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- =============================================
-- 7. RLS POLICIES FOR COMPLIANCE DOCUMENTS
-- =============================================

-- GC users can view all compliance documents for their projects
CREATE POLICY "GC users can view compliance documents"
  ON subcontractor_compliance_documents FOR SELECT
  USING (
    subcontractor_id IN (
      SELECT id FROM subcontractors WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- GC users can manage compliance documents
CREATE POLICY "GC users can manage compliance documents"
  ON subcontractor_compliance_documents FOR ALL
  USING (
    subcontractor_id IN (
      SELECT id FROM subcontractors WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
      )
    )
  );

-- Subcontractors can view their own compliance documents
CREATE POLICY "Subcontractors can view own compliance documents"
  ON subcontractor_compliance_documents FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- Subcontractors can upload their own compliance documents
CREATE POLICY "Subcontractors can upload compliance documents"
  ON subcontractor_compliance_documents FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
    AND uploaded_by = auth.uid()
  );

-- =============================================
-- 8. RLS POLICIES FOR INVITATIONS
-- =============================================

-- GC users can view/manage invitations for their projects
CREATE POLICY "GC users can view invitations"
  ON subcontractor_invitations FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "GC users can manage invitations"
  ON subcontractor_invitations FOR ALL
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- Allow public access for invitation token lookup (for accepting invitations)
CREATE POLICY "Anyone can lookup invitation by token"
  ON subcontractor_invitations FOR SELECT
  USING (
    status = 'pending' AND expires_at > NOW()
  );

-- =============================================
-- 9. ENHANCE CHANGE ORDER BIDS FOR SUBCONTRACTOR ACCESS
-- =============================================

-- Subcontractors can view bids for their company
DROP POLICY IF EXISTS "Subcontractors can view own bids" ON change_order_bids;

CREATE POLICY "Subcontractors can view own bids"
  ON change_order_bids FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- Subcontractors can submit/update their bids
DROP POLICY IF EXISTS "Subcontractors can submit bids" ON change_order_bids;

CREATE POLICY "Subcontractors can submit bids"
  ON change_order_bids FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
    AND bid_status IN ('pending', 'draft') -- Can only update pending/draft bids
  );

-- =============================================
-- 10. SUBCONTRACTORS CAN VIEW THEIR SCOPE OF WORK
-- =============================================

DROP POLICY IF EXISTS "Subcontractors can view own subcontractor record" ON subcontractors;

CREATE POLICY "Subcontractors can view own subcontractor record"
  ON subcontractors FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND contact_id IN (
      SELECT id FROM contacts WHERE email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- 11. SUBCONTRACTORS CAN VIEW PROJECT DOCUMENTS (LIMITED)
-- Only documents marked as visible to subcontractors
-- =============================================

-- Add column to documents table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'visible_to_subcontractors'
  ) THEN
    ALTER TABLE documents ADD COLUMN visible_to_subcontractors BOOLEAN DEFAULT false;
  END IF;
END $$;

DROP POLICY IF EXISTS "Subcontractors can view shared documents" ON documents;

CREATE POLICY "Subcontractors can view shared documents"
  ON documents FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND visible_to_subcontractors = true
    AND project_id IN (
      SELECT spa.project_id FROM subcontractor_portal_access spa
      WHERE spa.user_id = auth.uid() AND spa.is_active = true AND spa.can_view_documents = true
    )
  );

-- =============================================
-- 12. CREATE STORAGE BUCKET FOR COMPLIANCE DOCUMENTS
-- =============================================

-- Note: Storage bucket creation is done via Supabase dashboard or separate migration
-- This is just the RLS policy for the bucket

-- Create function to check if user can access compliance document
CREATE OR REPLACE FUNCTION can_access_compliance_document(bucket_id TEXT, file_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  subcontractor_uuid UUID;
BEGIN
  -- Extract subcontractor_id from file path (format: compliance/{subcontractor_id}/...)
  subcontractor_uuid := (regexp_match(file_path, '^compliance/([0-9a-f-]+)/'))[1]::UUID;

  IF subcontractor_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is GC with project access
  IF EXISTS (
    SELECT 1 FROM subcontractors s
    JOIN project_users pu ON s.project_id = pu.project_id
    WHERE s.id = subcontractor_uuid AND pu.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is the subcontractor
  IF EXISTS (
    SELECT 1 FROM subcontractors s
    JOIN contacts c ON s.contact_id = c.id
    WHERE s.id = subcontractor_uuid
    AND c.email = (SELECT email FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 13. HELPER FUNCTION: GET SUBCONTRACTOR FOR USER
-- =============================================

CREATE OR REPLACE FUNCTION get_subcontractors_for_user(user_uuid UUID)
RETURNS TABLE (subcontractor_id UUID, project_id UUID, company_name VARCHAR(255), trade VARCHAR(100)) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.project_id, s.company_name, s.trade
  FROM subcontractors s
  JOIN contacts c ON s.contact_id = c.id
  WHERE c.email = (SELECT email FROM users WHERE id = user_uuid)
  AND s.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 14. HELPER FUNCTION: CHECK DOCUMENT EXPIRATION
-- =============================================

CREATE OR REPLACE FUNCTION check_expiring_compliance_documents()
RETURNS TABLE (
  id UUID,
  subcontractor_id UUID,
  document_type VARCHAR(50),
  document_name VARCHAR(255),
  expiration_date DATE,
  days_until_expiration INTEGER,
  contact_email VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.id,
    cd.subcontractor_id,
    cd.document_type,
    cd.document_name,
    cd.expiration_date,
    (cd.expiration_date - CURRENT_DATE)::INTEGER as days_until_expiration,
    c.email as contact_email
  FROM subcontractor_compliance_documents cd
  JOIN subcontractors s ON cd.subcontractor_id = s.id
  JOIN contacts c ON s.contact_id = c.id
  WHERE cd.expiration_date IS NOT NULL
    AND cd.expiration_date > CURRENT_DATE
    AND cd.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
    AND cd.deleted_at IS NULL
    AND cd.status != 'expired'
  ORDER BY cd.expiration_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 15. UPDATED_AT TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subcontractor_portal_access_updated_at
  BEFORE UPDATE ON subcontractor_portal_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcontractor_compliance_documents_updated_at
  BEFORE UPDATE ON subcontractor_compliance_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcontractor_invitations_updated_at
  BEFORE UPDATE ON subcontractor_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 16. GRANT PERMISSIONS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON subcontractor_portal_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subcontractor_compliance_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subcontractor_invitations TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

COMMENT ON TABLE subcontractor_portal_access IS 'Tracks subcontractor user access to projects with granular permissions';
COMMENT ON TABLE subcontractor_compliance_documents IS 'Stores insurance certificates, licenses, and other compliance documents';
COMMENT ON TABLE subcontractor_invitations IS 'Tracks pending portal invitations for subcontractor users';
