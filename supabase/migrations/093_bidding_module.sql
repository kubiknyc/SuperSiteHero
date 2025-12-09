-- Migration: Bidding Module
-- Complete bid management system with bid packages, invitations, submissions, and leveling
-- Supports public/private bids, pre-qualification, and comparison analysis

-- ============================================================================
-- BID PACKAGES (The scope being bid)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Package identification
  package_number VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scope
  scope_of_work TEXT,
  division VARCHAR(10), -- CSI division e.g., "03" for Concrete
  spec_sections TEXT[], -- Array of spec sections included

  -- Budget
  estimated_value DECIMAL(15,2),
  budget_low DECIMAL(15,2),
  budget_high DECIMAL(15,2),

  -- Dates
  issue_date DATE,
  pre_bid_meeting_date TIMESTAMPTZ,
  pre_bid_meeting_location TEXT,
  questions_due_date TIMESTAMPTZ,
  bid_due_date TIMESTAMPTZ NOT NULL,
  bid_due_time TIME DEFAULT '14:00',
  award_date DATE,
  contract_start_date DATE,

  -- Bid type
  bid_type VARCHAR(30) DEFAULT 'lump_sum'
    CHECK (bid_type IN ('lump_sum', 'unit_price', 'cost_plus', 'gmp', 'time_and_material')),
  is_public BOOLEAN DEFAULT false, -- Public bid vs invited only

  -- Status
  status VARCHAR(30) DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'questions_period', 'bids_due',
           'under_review', 'awarded', 'cancelled', 'rebid')),

  -- Pre-qualification
  requires_prequalification BOOLEAN DEFAULT false,
  prequalification_criteria TEXT,
  min_years_experience INTEGER,
  min_similar_projects INTEGER,
  min_bond_capacity DECIMAL(15,2),
  required_licenses TEXT[],
  required_certifications TEXT[],

  -- Bid requirements
  requires_bid_bond BOOLEAN DEFAULT false,
  bid_bond_percent DECIMAL(5,2) DEFAULT 5.0,
  requires_performance_bond BOOLEAN DEFAULT false,
  requires_payment_bond BOOLEAN DEFAULT false,
  requires_insurance_cert BOOLEAN DEFAULT false,
  min_insurance_limits JSONB,

  -- Documents
  bid_form_url TEXT,
  plans_url TEXT,
  specs_url TEXT,
  addenda_urls TEXT[],

  -- Award info
  awarded_to_bid_id UUID, -- References bid_submissions
  award_amount DECIMAL(15,2),
  award_notes TEXT,

  -- Contact
  contact_name VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, package_number)
);

-- ============================================================================
-- BID PACKAGE ITEMS (Line items within a bid package)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,

  -- Item details
  item_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(30), -- EA, SF, LF, CY, LS, etc.
  quantity DECIMAL(15,4),

  -- For unit price bids
  is_required BOOLEAN DEFAULT true, -- Required vs optional item
  is_alternate BOOLEAN DEFAULT false,
  alternate_number VARCHAR(20), -- e.g., "ALT-1"
  alternate_description TEXT,

  -- Estimate (hidden from bidders)
  estimated_unit_price DECIMAL(15,4),
  estimated_total DECIMAL(15,2),

  -- Sort
  sort_order INTEGER DEFAULT 0,
  category VARCHAR(100), -- Group items by category

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BID INVITATIONS (Invites sent to subcontractors)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,

  -- Invitee
  subcontractor_id UUID REFERENCES subcontractors(id),
  company_name VARCHAR(255), -- For non-registered subs
  contact_name VARCHAR(100),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),

  -- Invitation tracking
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  invitation_method VARCHAR(20) DEFAULT 'email'
    CHECK (invitation_method IN ('email', 'portal', 'fax', 'mail', 'phone')),

  -- Response tracking
  response_status VARCHAR(20) DEFAULT 'pending'
    CHECK (response_status IN ('pending', 'accepted', 'declined', 'no_response', 'disqualified')),
  responded_at TIMESTAMPTZ,
  decline_reason TEXT,

  -- Portal access
  portal_access_token VARCHAR(255) UNIQUE,
  portal_token_expires_at TIMESTAMPTZ,
  last_portal_access TIMESTAMPTZ,
  documents_downloaded_at TIMESTAMPTZ,

  -- Pre-qualification
  prequalification_status VARCHAR(20) DEFAULT 'pending'
    CHECK (prequalification_status IN ('pending', 'approved', 'rejected', 'conditional', 'not_required')),
  prequalification_notes TEXT,
  prequalification_reviewed_by UUID REFERENCES users(id),
  prequalification_reviewed_at TIMESTAMPTZ,

  -- Notes
  internal_notes TEXT,

  UNIQUE(bid_package_id, contact_email)
);

-- ============================================================================
-- BID QUESTIONS (RFIs during bidding)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES bid_invitations(id),

  -- Question
  question_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  reference_document VARCHAR(255), -- "Drawing A-101" or "Spec Section 03300"
  reference_page VARCHAR(50),

  -- Submitter info
  submitted_by_name VARCHAR(100),
  submitted_by_email VARCHAR(255),
  submitted_by_company VARCHAR(255),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Answer
  answer TEXT,
  answered_by UUID REFERENCES users(id),
  answered_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false, -- Published to all bidders

  -- Attachments
  question_attachments TEXT[],
  answer_attachments TEXT[],

  -- Status
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'answered', 'rejected', 'withdrawn'))
);

-- ============================================================================
-- BID ADDENDA (Changes/clarifications issued)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_addenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,

  -- Addendum info
  addendum_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Content
  changes_summary TEXT,
  affected_documents TEXT[], -- List of modified drawings/specs
  extends_bid_date BOOLEAN DEFAULT false,
  new_bid_due_date TIMESTAMPTZ,

  -- Documents
  document_url TEXT,
  attachment_urls TEXT[],

  -- Tracking
  issued_by UUID REFERENCES users(id),
  acknowledgment_required BOOLEAN DEFAULT true,

  UNIQUE(bid_package_id, addendum_number)
);

-- ============================================================================
-- ADDENDA ACKNOWLEDGMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS addenda_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addendum_id UUID NOT NULL REFERENCES bid_addenda(id) ON DELETE CASCADE,
  invitation_id UUID NOT NULL REFERENCES bid_invitations(id) ON DELETE CASCADE,

  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by_name VARCHAR(100),
  acknowledged_by_email VARCHAR(255),

  UNIQUE(addendum_id, invitation_id)
);

-- ============================================================================
-- BID SUBMISSIONS (Actual bids received)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES bid_invitations(id),

  -- Bidder info
  subcontractor_id UUID REFERENCES subcontractors(id),
  bidder_company_name VARCHAR(255) NOT NULL,
  bidder_contact_name VARCHAR(100),
  bidder_email VARCHAR(255),
  bidder_phone VARCHAR(20),
  bidder_address TEXT,

  -- Bid amounts
  base_bid_amount DECIMAL(15,2) NOT NULL,
  alternates_total DECIMAL(15,2) DEFAULT 0,
  total_bid_amount DECIMAL(15,2), -- base + selected alternates

  -- For unit price bids
  unit_prices JSONB, -- {item_id: {unit_price, total}}

  -- Submission info
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submission_method VARCHAR(20) DEFAULT 'portal'
    CHECK (submission_method IN ('portal', 'email', 'fax', 'hand_delivered', 'mail')),
  is_late BOOLEAN DEFAULT false,

  -- Bonds and insurance
  bid_bond_included BOOLEAN DEFAULT false,
  bid_bond_amount DECIMAL(15,2),
  bid_bond_company VARCHAR(255),
  bid_bond_number VARCHAR(100),
  insurance_cert_included BOOLEAN DEFAULT false,

  -- Qualifications
  years_in_business INTEGER,
  similar_projects_completed INTEGER,
  current_workload_percent INTEGER, -- 0-100
  proposed_start_date DATE,
  proposed_duration_days INTEGER,
  key_personnel JSONB, -- [{name, role, experience}]

  -- Exclusions and clarifications
  exclusions TEXT,
  clarifications TEXT,
  assumptions TEXT,
  value_engineering_suggestions TEXT,

  -- Documents
  bid_form_url TEXT,
  attachment_urls TEXT[],

  -- Status
  status VARCHAR(20) DEFAULT 'received'
    CHECK (status IN ('received', 'under_review', 'qualified', 'disqualified',
           'shortlisted', 'awarded', 'not_awarded', 'withdrawn')),
  disqualification_reason TEXT,

  -- Evaluation
  technical_score DECIMAL(5,2),
  price_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  evaluation_notes TEXT,
  evaluated_by UUID REFERENCES users(id),
  evaluated_at TIMESTAMPTZ,

  -- Award
  is_awarded BOOLEAN DEFAULT false,
  award_amount DECIMAL(15,2),
  award_date DATE,
  contract_sent_at TIMESTAMPTZ,
  contract_signed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BID SUBMISSION ITEMS (Line item pricing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_submission_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES bid_submissions(id) ON DELETE CASCADE,
  package_item_id UUID NOT NULL REFERENCES bid_package_items(id) ON DELETE CASCADE,

  -- Pricing
  unit_price DECIMAL(15,4),
  quantity DECIMAL(15,4), -- May differ from estimate for optional items
  total_price DECIMAL(15,2),

  -- For alternates
  is_included BOOLEAN DEFAULT true, -- Bidder may opt out of optional items

  -- Notes
  notes TEXT,

  UNIQUE(submission_id, package_item_id)
);

-- ============================================================================
-- BID COMPARISONS (Bid leveling/analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,

  -- Comparison info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  comparison_date DATE DEFAULT CURRENT_DATE,

  -- Included bids
  submission_ids UUID[] NOT NULL,

  -- Analysis results
  low_bid_id UUID REFERENCES bid_submissions(id),
  low_bid_amount DECIMAL(15,2),
  high_bid_amount DECIMAL(15,2),
  average_bid_amount DECIMAL(15,2),
  bid_spread_percent DECIMAL(5,2),

  -- Recommendation
  recommended_bid_id UUID REFERENCES bid_submissions(id),
  recommendation_notes TEXT,

  -- Created by
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BID EVALUATION CRITERIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,

  -- Criteria
  name VARCHAR(100) NOT NULL,
  description TEXT,
  weight DECIMAL(5,2) DEFAULT 1.0, -- Relative weight
  max_score INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,

  -- Type
  criteria_type VARCHAR(30) DEFAULT 'qualitative'
    CHECK (criteria_type IN ('qualitative', 'quantitative', 'pass_fail'))
);

-- ============================================================================
-- BID EVALUATION SCORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES bid_submissions(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES bid_evaluation_criteria(id) ON DELETE CASCADE,

  -- Score
  score DECIMAL(5,2),
  weighted_score DECIMAL(5,2),
  notes TEXT,

  -- Evaluator
  evaluated_by UUID REFERENCES users(id),
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(submission_id, criteria_id, evaluated_by)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bid_packages_project ON bid_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_bid_packages_status ON bid_packages(status);
CREATE INDEX IF NOT EXISTS idx_bid_packages_due_date ON bid_packages(bid_due_date);
CREATE INDEX IF NOT EXISTS idx_bid_package_items_package ON bid_package_items(bid_package_id);
CREATE INDEX IF NOT EXISTS idx_bid_invitations_package ON bid_invitations(bid_package_id);
CREATE INDEX IF NOT EXISTS idx_bid_invitations_email ON bid_invitations(contact_email);
CREATE INDEX IF NOT EXISTS idx_bid_invitations_token ON bid_invitations(portal_access_token);
CREATE INDEX IF NOT EXISTS idx_bid_submissions_package ON bid_submissions(bid_package_id);
CREATE INDEX IF NOT EXISTS idx_bid_submissions_status ON bid_submissions(status);
CREATE INDEX IF NOT EXISTS idx_bid_questions_package ON bid_questions(bid_package_id);
CREATE INDEX IF NOT EXISTS idx_bid_addenda_package ON bid_addenda(bid_package_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bid_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bid_packages_updated_at
  BEFORE UPDATE ON bid_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_bid_packages_updated_at();

CREATE TRIGGER bid_submissions_updated_at
  BEFORE UPDATE ON bid_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_bid_packages_updated_at();

-- Auto-calculate total bid amount
CREATE OR REPLACE FUNCTION calculate_bid_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_bid_amount := NEW.base_bid_amount + COALESCE(NEW.alternates_total, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bid_submissions_calculate_total
  BEFORE INSERT OR UPDATE ON bid_submissions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bid_total();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_addenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE addenda_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_submission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_evaluation_scores ENABLE ROW LEVEL SECURITY;

-- Company members can manage bid packages
CREATE POLICY bid_packages_all ON bid_packages
  FOR ALL USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY bid_package_items_all ON bid_package_items
  FOR ALL USING (
    bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY bid_invitations_all ON bid_invitations
  FOR ALL USING (
    bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY bid_questions_all ON bid_questions
  FOR ALL USING (
    bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY bid_addenda_all ON bid_addenda
  FOR ALL USING (
    bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY addenda_acknowledgments_all ON addenda_acknowledgments
  FOR ALL USING (
    addendum_id IN (SELECT id FROM bid_addenda WHERE bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())))
  );

CREATE POLICY bid_submissions_all ON bid_submissions
  FOR ALL USING (
    bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY bid_submission_items_all ON bid_submission_items
  FOR ALL USING (
    submission_id IN (SELECT id FROM bid_submissions WHERE bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())))
  );

CREATE POLICY bid_comparisons_all ON bid_comparisons
  FOR ALL USING (
    bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY bid_evaluation_criteria_all ON bid_evaluation_criteria
  FOR ALL USING (
    bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY bid_evaluation_scores_all ON bid_evaluation_scores
  FOR ALL USING (
    submission_id IN (SELECT id FROM bid_submissions WHERE bid_package_id IN (SELECT id FROM bid_packages WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())))
  );

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW bid_package_summary AS
SELECT
  bp.*,
  p.name AS project_name,
  p.project_number,
  COUNT(DISTINCT bi.id) AS invitations_count,
  COUNT(DISTINCT bi.id) FILTER (WHERE bi.response_status = 'accepted') AS accepted_count,
  COUNT(DISTINCT bi.id) FILTER (WHERE bi.response_status = 'declined') AS declined_count,
  COUNT(DISTINCT bs.id) AS submissions_count,
  MIN(bs.base_bid_amount) AS low_bid,
  MAX(bs.base_bid_amount) AS high_bid,
  AVG(bs.base_bid_amount) AS average_bid,
  COUNT(DISTINCT bq.id) FILTER (WHERE bq.status = 'pending') AS pending_questions,
  COUNT(DISTINCT ba.id) AS addenda_count
FROM bid_packages bp
LEFT JOIN projects p ON bp.project_id = p.id
LEFT JOIN bid_invitations bi ON bp.id = bi.bid_package_id
LEFT JOIN bid_submissions bs ON bp.id = bs.bid_package_id
LEFT JOIN bid_questions bq ON bp.id = bq.bid_package_id
LEFT JOIN bid_addenda ba ON bp.id = ba.bid_package_id
WHERE bp.deleted_at IS NULL
GROUP BY bp.id, p.name, p.project_number;

CREATE OR REPLACE VIEW bid_submission_comparison AS
SELECT
  bs.*,
  bp.name AS package_name,
  bp.package_number,
  bp.estimated_value,
  bp.budget_low,
  bp.budget_high,
  CASE
    WHEN bp.estimated_value > 0 THEN
      ROUND(((bs.base_bid_amount - bp.estimated_value) / bp.estimated_value * 100)::numeric, 2)
    ELSE NULL
  END AS variance_from_estimate_percent,
  RANK() OVER (PARTITION BY bs.bid_package_id ORDER BY bs.base_bid_amount ASC) AS price_rank,
  bi.prequalification_status
FROM bid_submissions bs
JOIN bid_packages bp ON bs.bid_package_id = bp.id
LEFT JOIN bid_invitations bi ON bs.invitation_id = bi.id
WHERE bs.status NOT IN ('withdrawn', 'disqualified');

-- Grant access to views
GRANT SELECT ON bid_package_summary TO authenticated;
GRANT SELECT ON bid_submission_comparison TO authenticated;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get bid package statistics
CREATE OR REPLACE FUNCTION get_bid_package_stats(p_package_id UUID)
RETURNS TABLE(
  total_invitations INTEGER,
  responses_received INTEGER,
  bids_received INTEGER,
  low_bid DECIMAL,
  high_bid DECIMAL,
  average_bid DECIMAL,
  spread_percent DECIMAL,
  days_until_due INTEGER,
  pending_questions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT bi.id)::INTEGER AS total_invitations,
    COUNT(DISTINCT bi.id) FILTER (WHERE bi.response_status != 'pending')::INTEGER AS responses_received,
    COUNT(DISTINCT bs.id)::INTEGER AS bids_received,
    MIN(bs.base_bid_amount) AS low_bid,
    MAX(bs.base_bid_amount) AS high_bid,
    AVG(bs.base_bid_amount) AS average_bid,
    CASE
      WHEN MIN(bs.base_bid_amount) > 0 THEN
        ROUND(((MAX(bs.base_bid_amount) - MIN(bs.base_bid_amount)) / MIN(bs.base_bid_amount) * 100)::numeric, 2)
      ELSE 0
    END AS spread_percent,
    (bp.bid_due_date::DATE - CURRENT_DATE)::INTEGER AS days_until_due,
    COUNT(DISTINCT bq.id) FILTER (WHERE bq.status = 'pending')::INTEGER AS pending_questions
  FROM bid_packages bp
  LEFT JOIN bid_invitations bi ON bp.id = bi.bid_package_id
  LEFT JOIN bid_submissions bs ON bp.id = bs.bid_package_id AND bs.status NOT IN ('withdrawn', 'disqualified')
  LEFT JOIN bid_questions bq ON bp.id = bq.bid_package_id
  WHERE bp.id = p_package_id
  GROUP BY bp.id, bp.bid_due_date;
END;
$$ LANGUAGE plpgsql;

-- Generate bid comparison report
CREATE OR REPLACE FUNCTION generate_bid_comparison(p_package_id UUID)
RETURNS TABLE(
  bidder_name VARCHAR,
  base_bid DECIMAL,
  alternates DECIMAL,
  total_bid DECIMAL,
  variance_from_low DECIMAL,
  variance_percent DECIMAL,
  rank INTEGER,
  status VARCHAR,
  prequalified BOOLEAN
) AS $$
DECLARE
  v_low_bid DECIMAL;
BEGIN
  -- Get low bid
  SELECT MIN(base_bid_amount) INTO v_low_bid
  FROM bid_submissions
  WHERE bid_package_id = p_package_id
    AND status NOT IN ('withdrawn', 'disqualified');

  RETURN QUERY
  SELECT
    bs.bidder_company_name,
    bs.base_bid_amount,
    bs.alternates_total,
    bs.total_bid_amount,
    (bs.base_bid_amount - v_low_bid),
    CASE WHEN v_low_bid > 0 THEN
      ROUND(((bs.base_bid_amount - v_low_bid) / v_low_bid * 100)::numeric, 2)
    ELSE 0 END,
    ROW_NUMBER() OVER (ORDER BY bs.base_bid_amount ASC)::INTEGER,
    bs.status,
    COALESCE(bi.prequalification_status = 'approved', true)
  FROM bid_submissions bs
  LEFT JOIN bid_invitations bi ON bs.invitation_id = bi.id
  WHERE bs.bid_package_id = p_package_id
    AND bs.status NOT IN ('withdrawn', 'disqualified')
  ORDER BY bs.base_bid_amount ASC;
END;
$$ LANGUAGE plpgsql;
