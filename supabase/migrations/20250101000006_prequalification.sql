-- Migration: 073_prequalification.sql
-- Description: Subcontractor pre-qualification workflow
-- Date: 2025-01-02

-- =============================================
-- TABLE: prequalification_questionnaires
-- Pre-qualification questionnaire templates
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Settings
  expires_in_days INTEGER DEFAULT 365, -- How long pre-qual is valid
  min_passing_score INTEGER, -- Minimum score to pass (if scoring enabled)
  requires_financial BOOLEAN DEFAULT true,
  requires_safety BOOLEAN DEFAULT true,
  requires_references BOOLEAN DEFAULT true,
  min_references INTEGER DEFAULT 3,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prequal_questionnaires_company ON prequalification_questionnaires(company_id);
CREATE INDEX idx_prequal_questionnaires_active ON prequalification_questionnaires(is_active) WHERE is_active = true;

-- Trigger
CREATE TRIGGER update_prequal_questionnaires_updated_at
  BEFORE UPDATE ON prequalification_questionnaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE prequalification_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage questionnaires for their company"
  ON prequalification_questionnaires FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: prequalification_sections
-- Sections within a questionnaire
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES prequalification_questionnaires(id) ON DELETE CASCADE,

  -- Section info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prequal_sections_questionnaire ON prequalification_sections(questionnaire_id);

-- Enable RLS
ALTER TABLE prequalification_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections for their questionnaires"
  ON prequalification_sections FOR ALL
  USING (
    questionnaire_id IN (
      SELECT id FROM prequalification_questionnaires
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- TABLE: prequalification_questions
-- Individual questions in a section
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES prequalification_sections(id) ON DELETE CASCADE,

  -- Question content
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'text',
  -- text, textarea, number, select, multiselect, boolean, file, date
  options JSONB, -- For select/multiselect types
  is_required BOOLEAN DEFAULT true,
  validation_rules JSONB, -- min, max, pattern, etc.
  help_text TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Scoring
  weight INTEGER DEFAULT 1, -- Weight for scoring
  passing_criteria TEXT, -- Description of what passes
  passing_value JSONB, -- Value(s) that are considered passing

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prequal_questions_section ON prequalification_questions(section_id);

-- Enable RLS
ALTER TABLE prequalification_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage questions for their questionnaires"
  ON prequalification_questions FOR ALL
  USING (
    section_id IN (
      SELECT s.id FROM prequalification_sections s
      JOIN prequalification_questionnaires q ON s.questionnaire_id = q.id
      WHERE q.company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- TABLE: prequalification_submissions
-- Submitted pre-qualification forms
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL REFERENCES prequalification_questionnaires(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) DEFAULT 'pending_review',
  -- not_submitted, pending_review, approved, conditionally_approved, rejected, expired

  -- Scoring
  score INTEGER,
  max_score INTEGER,
  score_percent DECIMAL(5, 2),

  -- Review
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  conditions TEXT, -- For conditional approvals

  -- Validity
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Tier assignment
  tier VARCHAR(50), -- preferred, approved, conditional

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (questionnaire_id, subcontractor_id)
);

-- Indexes
CREATE INDEX idx_prequal_submissions_company ON prequalification_submissions(company_id);
CREATE INDEX idx_prequal_submissions_subcontractor ON prequalification_submissions(subcontractor_id);
CREATE INDEX idx_prequal_submissions_questionnaire ON prequalification_submissions(questionnaire_id);
CREATE INDEX idx_prequal_submissions_status ON prequalification_submissions(status);
CREATE INDEX idx_prequal_submissions_expires ON prequalification_submissions(expires_at);

-- Trigger
CREATE TRIGGER update_prequal_submissions_updated_at
  BEFORE UPDATE ON prequalification_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE prequalification_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submissions for their company"
  ON prequalification_submissions FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create submissions for their company"
  ON prequalification_submissions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update submissions for their company"
  ON prequalification_submissions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: prequalification_answers
-- Answers to pre-qualification questions
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES prequalification_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES prequalification_questions(id) ON DELETE CASCADE,

  -- Answer
  answer_value JSONB NOT NULL, -- Flexible to handle different types
  answer_text TEXT, -- Plain text version for searching

  -- Scoring
  score INTEGER,
  reviewer_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (submission_id, question_id)
);

-- Indexes
CREATE INDEX idx_prequal_answers_submission ON prequalification_answers(submission_id);
CREATE INDEX idx_prequal_answers_question ON prequalification_answers(question_id);

-- Trigger
CREATE TRIGGER update_prequal_answers_updated_at
  BEFORE UPDATE ON prequalification_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE prequalification_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage answers for their submissions"
  ON prequalification_answers FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM prequalification_submissions
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- TABLE: prequalification_safety_records
-- Safety record data for pre-qualification
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_safety_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES prequalification_submissions(id) ON DELETE CASCADE,

  -- EMR (Experience Modification Rate)
  emr_current DECIMAL(5, 3),
  emr_prior_year DECIMAL(5, 3),
  emr_two_years_ago DECIMAL(5, 3),

  -- OSHA Rates
  osha_300_log_provided BOOLEAN DEFAULT false,
  osha_recordable_rate DECIMAL(10, 4),
  dart_rate DECIMAL(10, 4), -- Days Away, Restricted, or Transfer

  -- Incidents
  fatalities_last_5_years INTEGER DEFAULT 0,
  serious_violations_last_3_years INTEGER DEFAULT 0,
  osha_citations_last_3_years INTEGER DEFAULT 0,

  -- Safety Programs
  has_written_safety_program BOOLEAN DEFAULT false,
  has_safety_director BOOLEAN DEFAULT false,
  safety_training_frequency VARCHAR(50), -- weekly, monthly, quarterly
  ppe_policy BOOLEAN DEFAULT false,
  substance_abuse_policy BOOLEAN DEFAULT false,
  jsa_hazard_analysis BOOLEAN DEFAULT false,

  -- Certifications
  osha_10_percent DECIMAL(5, 2), -- % of workforce with OSHA 10
  osha_30_percent DECIMAL(5, 2), -- % of workforce with OSHA 30

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (submission_id)
);

-- Indexes
CREATE INDEX idx_prequal_safety_submission ON prequalification_safety_records(submission_id);

-- Trigger
CREATE TRIGGER update_prequal_safety_updated_at
  BEFORE UPDATE ON prequalification_safety_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE prequalification_safety_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage safety records for their submissions"
  ON prequalification_safety_records FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM prequalification_submissions
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- TABLE: prequalification_financials
-- Financial data for pre-qualification
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES prequalification_submissions(id) ON DELETE CASCADE,

  -- Company Info
  years_in_business INTEGER,
  year_established INTEGER,

  -- Revenue
  annual_revenue_current DECIMAL(15, 2),
  annual_revenue_prior_year DECIMAL(15, 2),
  annual_revenue_two_years_ago DECIMAL(15, 2),

  -- Bonding
  bonding_capacity DECIMAL(15, 2),
  current_bonding_used DECIMAL(15, 2),
  single_project_limit DECIMAL(15, 2),
  bonding_company VARCHAR(255),
  bonding_agent_contact VARCHAR(255),

  -- Financial Health
  credit_rating VARCHAR(50),
  duns_number VARCHAR(50),
  financial_statements_provided BOOLEAN DEFAULT false,
  financial_statement_date DATE,
  audited_statements BOOLEAN DEFAULT false,

  -- Banking
  bank_name VARCHAR(255),
  bank_reference_contact VARCHAR(255),
  bank_reference_phone VARCHAR(50),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (submission_id)
);

-- Indexes
CREATE INDEX idx_prequal_financials_submission ON prequalification_financials(submission_id);

-- Trigger
CREATE TRIGGER update_prequal_financials_updated_at
  BEFORE UPDATE ON prequalification_financials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE prequalification_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage financials for their submissions"
  ON prequalification_financials FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM prequalification_submissions
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- TABLE: prequalification_references
-- Reference information for pre-qualification
-- =============================================

CREATE TABLE IF NOT EXISTS prequalification_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES prequalification_submissions(id) ON DELETE CASCADE,

  -- Reference Company
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_title VARCHAR(100),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),

  -- Project Info
  project_name VARCHAR(255) NOT NULL,
  project_value DECIMAL(15, 2),
  project_location VARCHAR(255),
  scope_of_work TEXT,
  project_start_date DATE,
  project_completion_date DATE,

  -- Evaluation (filled in by GC after contacting reference)
  was_contacted BOOLEAN DEFAULT false,
  contacted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  contacted_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  would_work_again BOOLEAN,
  reference_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prequal_references_submission ON prequalification_references(submission_id);

-- Trigger
CREATE TRIGGER update_prequal_references_updated_at
  BEFORE UPDATE ON prequalification_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE prequalification_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage references for their submissions"
  ON prequalification_references FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM prequalification_submissions
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- VIEW: prequalified_vendors
-- List of pre-qualified vendors with status
-- =============================================

CREATE OR REPLACE VIEW prequalified_vendors AS
SELECT
  ps.id AS submission_id,
  ps.company_id,
  ps.subcontractor_id,
  s.company_name,
  s.contact_name,
  s.email,
  s.phone,
  s.trades,
  ps.status,
  ps.tier,
  ps.score,
  ps.max_score,
  ps.score_percent,
  ps.approved_at,
  ps.expires_at,
  CASE
    WHEN ps.expires_at IS NOT NULL AND ps.expires_at < NOW() THEN 'expired'
    WHEN ps.expires_at IS NOT NULL AND ps.expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE ps.status
  END AS current_status,
  pf.bonding_capacity,
  psr.emr_current,
  (
    SELECT COUNT(*) FROM prequalification_references pr
    WHERE pr.submission_id = ps.id
  ) AS reference_count,
  (
    SELECT AVG(pr.rating)::DECIMAL(3,2) FROM prequalification_references pr
    WHERE pr.submission_id = ps.id AND pr.rating IS NOT NULL
  ) AS avg_reference_rating
FROM prequalification_submissions ps
JOIN subcontractors s ON ps.subcontractor_id = s.id
LEFT JOIN prequalification_financials pf ON ps.id = pf.submission_id
LEFT JOIN prequalification_safety_records psr ON ps.id = psr.submission_id
WHERE ps.status IN ('approved', 'conditionally_approved');

-- =============================================
-- FUNCTION: calculate_prequal_score
-- Calculate score for a submission
-- =============================================

CREATE OR REPLACE FUNCTION calculate_prequal_score(p_submission_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_max_score INTEGER := 0;
  v_answer RECORD;
BEGIN
  FOR v_answer IN
    SELECT pa.answer_value, pa.score, pq.weight, pq.passing_value
    FROM prequalification_answers pa
    JOIN prequalification_questions pq ON pa.question_id = pq.id
    WHERE pa.submission_id = p_submission_id
  LOOP
    v_max_score := v_max_score + v_answer.weight;
    IF v_answer.score IS NOT NULL THEN
      v_score := v_score + v_answer.score;
    ELSIF v_answer.passing_value IS NOT NULL AND v_answer.answer_value @> v_answer.passing_value THEN
      v_score := v_score + v_answer.weight;
    END IF;
  END LOOP;

  -- Update submission with scores
  UPDATE prequalification_submissions
  SET
    score = v_score,
    max_score = v_max_score,
    score_percent = CASE WHEN v_max_score > 0 THEN (v_score::DECIMAL / v_max_score * 100) ELSE 0 END
  WHERE id = p_submission_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_prequal_score(UUID) TO authenticated;

-- =============================================
-- FUNCTION: get_prequalification_dashboard
-- Get pre-qualification statistics
-- =============================================

CREATE OR REPLACE FUNCTION get_prequalification_dashboard(p_company_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'totalSubmissions', COUNT(*),
      'pendingReview', COUNT(*) FILTER (WHERE status = 'pending_review'),
      'approved', COUNT(*) FILTER (WHERE status = 'approved'),
      'conditionallyApproved', COUNT(*) FILTER (WHERE status = 'conditionally_approved'),
      'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
      'expired', COUNT(*) FILTER (
        WHERE status IN ('approved', 'conditionally_approved')
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      ),
      'expiringSoon', COUNT(*) FILTER (
        WHERE status IN ('approved', 'conditionally_approved')
        AND expires_at IS NOT NULL
        AND expires_at >= NOW()
        AND expires_at < NOW() + INTERVAL '30 days'
      ),
      'averageScore', ROUND(AVG(score_percent)::numeric, 1),
      'byTier', jsonb_build_object(
        'preferred', COUNT(*) FILTER (WHERE tier = 'preferred'),
        'approved', COUNT(*) FILTER (WHERE tier = 'approved'),
        'conditional', COUNT(*) FILTER (WHERE tier = 'conditional')
      )
    )
    FROM prequalification_submissions
    WHERE company_id = p_company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_prequalification_dashboard(UUID) TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE prequalification_questionnaires IS 'Pre-qualification questionnaire templates';
COMMENT ON TABLE prequalification_sections IS 'Sections within a pre-qualification questionnaire';
COMMENT ON TABLE prequalification_questions IS 'Questions in a pre-qualification section';
COMMENT ON TABLE prequalification_submissions IS 'Submitted pre-qualification forms';
COMMENT ON TABLE prequalification_answers IS 'Answers to pre-qualification questions';
COMMENT ON TABLE prequalification_safety_records IS 'Safety record data for pre-qualification';
COMMENT ON TABLE prequalification_financials IS 'Financial data for pre-qualification';
COMMENT ON TABLE prequalification_references IS 'Reference information for pre-qualification';
COMMENT ON VIEW prequalified_vendors IS 'List of pre-qualified vendors with current status';
