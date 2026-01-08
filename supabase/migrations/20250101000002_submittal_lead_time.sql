-- Migration: 061_submittal_lead_time.sql
-- Description: Enhanced submittal tracking with lead times and automatic due date calculation
-- Date: 2025-01-01

-- =============================================
-- ENHANCED SUBMITTAL LEAD TIME FIELDS
-- =============================================

-- Add lead time tracking fields
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS required_on_site_date DATE;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS fabrication_lead_time_weeks INTEGER DEFAULT 0;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS review_cycle_days INTEGER DEFAULT 14;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS calculated_submit_by_date DATE;

-- Add revision tracking
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS current_revision VARCHAR(10) DEFAULT '0';
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS previous_revision_id UUID REFERENCES submittals(id);

-- Add spec section reference
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS spec_section VARCHAR(20); -- CSI format: 03 30 00
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS spec_section_title VARCHAR(255);

-- Add reviewer tracking
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id);
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS reviewer_firm VARCHAR(255);
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS date_sent_for_review DATE;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS date_review_complete DATE;

-- Add contractor tracking
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS date_received_from_sub DATE;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS date_returned_to_sub DATE;

-- Add stamp result (more granular than status)
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS stamp_result VARCHAR(50); -- approved, approved_as_noted, revise_and_resubmit, rejected, no_exceptions_taken

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_submittals_required_on_site ON submittals(required_on_site_date);
CREATE INDEX IF NOT EXISTS idx_submittals_submit_by ON submittals(calculated_submit_by_date);
CREATE INDEX IF NOT EXISTS idx_submittals_spec_section ON submittals(spec_section);
CREATE INDEX IF NOT EXISTS idx_submittals_reviewer_id ON submittals(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_submittals_revision ON submittals(previous_revision_id);

-- =============================================
-- FUNCTION: calculate_submittal_due_date
-- Auto-calculate submit-by date from required on-site date
-- =============================================
CREATE OR REPLACE FUNCTION calculate_submittal_due_date(
  p_required_on_site DATE,
  p_lead_time_weeks INTEGER,
  p_review_cycle_days INTEGER DEFAULT 14
)
RETURNS DATE AS $$
BEGIN
  IF p_required_on_site IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate: Required date - lead time (weeks) - review cycle (days)
  RETURN p_required_on_site - (p_lead_time_weeks * 7) - p_review_cycle_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- TRIGGER: Auto-calculate submit-by date
-- =============================================
CREATE OR REPLACE FUNCTION trigger_calculate_submittal_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if we have the required data
  IF NEW.required_on_site_date IS NOT NULL AND NEW.fabrication_lead_time_weeks IS NOT NULL THEN
    NEW.calculated_submit_by_date := calculate_submittal_due_date(
      NEW.required_on_site_date,
      COALESCE(NEW.fabrication_lead_time_weeks, 0),
      COALESCE(NEW.review_cycle_days, 14)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_submittal_due_date ON submittals;
CREATE TRIGGER trigger_submittal_due_date
  BEFORE INSERT OR UPDATE OF required_on_site_date, fabrication_lead_time_weeks, review_cycle_days
  ON submittals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_submittal_due();

-- =============================================
-- VIEW: submittal_register
-- AIA G810 style submittal log
-- =============================================
DROP VIEW IF EXISTS submittal_register CASCADE;
CREATE OR REPLACE VIEW submittal_register AS
SELECT
  s.id,
  s.project_id,
  s.submittal_number,
  s.spec_section,
  s.spec_section_title,
  s.title,
  s.description,
  s.review_status,
  s.stamp_result,
  s.current_revision,
  s.revision_number,
  -- Dates
  s.created_at AS date_initiated,
  s.date_received_from_sub,
  s.date_sent_for_review,
  s.date_review_complete,
  s.date_returned_to_sub,
  s.required_on_site_date,
  s.calculated_submit_by_date,
  -- Lead time info
  s.fabrication_lead_time_weeks,
  s.review_cycle_days,
  -- Calculated fields
  CASE
    WHEN s.calculated_submit_by_date IS NOT NULL AND s.review_status NOT IN ('approved', 'approved_as_noted', 'rejected') THEN
      EXTRACT(DAY FROM (s.calculated_submit_by_date::timestamp - CURRENT_DATE::timestamp))::INTEGER
    ELSE NULL
  END AS days_until_submit_deadline,
  CASE
    WHEN s.calculated_submit_by_date IS NOT NULL AND CURRENT_DATE > s.calculated_submit_by_date AND s.review_status NOT IN ('approved', 'approved_as_noted', 'rejected') THEN
      true
    ELSE false
  END AS is_overdue_to_submit,
  CASE
    WHEN s.required_on_site_date IS NOT NULL AND CURRENT_DATE > s.required_on_site_date AND s.review_status NOT IN ('approved', 'approved_as_noted') THEN
      true
    ELSE false
  END AS is_overdue_on_site,
  -- Reviewer info
  s.reviewer_id,
  s.reviewer_firm,
  r.full_name AS reviewer_name,
  -- Subcontractor
  s.subcontractor_id,
  sub.company_name AS subcontractor_name,
  -- Project
  p.name AS project_name,
  p.project_number
FROM submittals s
LEFT JOIN users r ON s.reviewer_id = r.id
LEFT JOIN subcontractors sub ON s.subcontractor_id = sub.id
LEFT JOIN projects p ON s.project_id = p.id
WHERE s.deleted_at IS NULL;

-- =============================================
-- TABLE: submittal_revisions
-- Track revision history for a submittal
-- =============================================
CREATE TABLE IF NOT EXISTS submittal_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  revision_letter VARCHAR(5),

  -- Revision info
  status VARCHAR(50),
  stamp_result VARCHAR(50),
  comments TEXT,

  -- Files
  file_url TEXT,
  file_name VARCHAR(255),

  -- Dates
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  -- Reviewer
  reviewed_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_submittal_revisions_submittal_id ON submittal_revisions(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_revisions_number ON submittal_revisions(revision_number);

-- Enable RLS
ALTER TABLE submittal_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can view submittal revisions" ON submittal_revisions;
CREATE POLICY "Users can view submittal revisions" ON submittal_revisions
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

DROP POLICY IF EXISTS "Users can insert submittal revisions" ON submittal_revisions;
CREATE POLICY "Users can insert submittal revisions" ON submittal_revisions
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
-- CSI SPEC SECTIONS REFERENCE
-- Common spec divisions for easy lookup
-- =============================================
CREATE TABLE IF NOT EXISTS spec_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division VARCHAR(2) NOT NULL,
  section VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  UNIQUE(section)
);

-- Insert common CSI MasterFormat spec sections
INSERT INTO spec_sections (division, section, title) VALUES
-- Division 03 - Concrete
('03', '03 10 00', 'Concrete Forming and Accessories'),
('03', '03 20 00', 'Concrete Reinforcing'),
('03', '03 30 00', 'Cast-in-Place Concrete'),
('03', '03 40 00', 'Precast Concrete'),
-- Division 04 - Masonry
('04', '04 20 00', 'Unit Masonry'),
-- Division 05 - Metals
('05', '05 10 00', 'Structural Metal Framing'),
('05', '05 12 00', 'Structural Steel'),
('05', '05 21 00', 'Steel Joist Framing'),
('05', '05 30 00', 'Metal Decking'),
('05', '05 50 00', 'Metal Fabrications'),
-- Division 06 - Wood, Plastics, Composites
('06', '06 10 00', 'Rough Carpentry'),
('06', '06 20 00', 'Finish Carpentry'),
('06', '06 40 00', 'Architectural Woodwork'),
-- Division 07 - Thermal & Moisture Protection
('07', '07 10 00', 'Dampproofing and Waterproofing'),
('07', '07 20 00', 'Thermal Protection'),
('07', '07 40 00', 'Roofing and Siding Panels'),
('07', '07 50 00', 'Membrane Roofing'),
('07', '07 60 00', 'Flashing and Sheet Metal'),
('07', '07 92 00', 'Joint Sealants'),
-- Division 08 - Openings
('08', '08 10 00', 'Doors and Frames'),
('08', '08 11 00', 'Metal Doors and Frames'),
('08', '08 14 00', 'Wood Doors'),
('08', '08 31 00', 'Access Doors and Panels'),
('08', '08 41 00', 'Entrances and Storefronts'),
('08', '08 50 00', 'Windows'),
('08', '08 71 00', 'Door Hardware'),
('08', '08 80 00', 'Glazing'),
-- Division 09 - Finishes
('09', '09 21 00', 'Plaster and Gypsum Board'),
('09', '09 30 00', 'Tiling'),
('09', '09 51 00', 'Acoustical Ceilings'),
('09', '09 65 00', 'Resilient Flooring'),
('09', '09 68 00', 'Carpeting'),
('09', '09 90 00', 'Painting and Coating'),
-- Division 10 - Specialties
('10', '10 14 00', 'Signage'),
('10', '10 21 00', 'Compartments and Cubicles'),
('10', '10 28 00', 'Toilet, Bath, and Laundry Accessories'),
-- Division 21 - Fire Suppression
('21', '21 10 00', 'Water-Based Fire-Suppression Systems'),
-- Division 22 - Plumbing
('22', '22 00 00', 'Plumbing'),
('22', '22 40 00', 'Plumbing Fixtures'),
-- Division 23 - HVAC
('23', '23 00 00', 'Heating, Ventilating, and Air Conditioning'),
('23', '23 05 00', 'Common Work Results for HVAC'),
('23', '23 30 00', 'HVAC Air Distribution'),
('23', '23 70 00', 'Central HVAC Equipment'),
-- Division 26 - Electrical
('26', '26 00 00', 'Electrical'),
('26', '26 05 00', 'Common Work Results for Electrical'),
('26', '26 20 00', 'Low-Voltage Electrical Transmission'),
('26', '26 50 00', 'Lighting'),
-- Division 27 - Communications
('27', '27 00 00', 'Communications'),
('27', '27 10 00', 'Structured Cabling'),
-- Division 28 - Electronic Safety and Security
('28', '28 10 00', 'Electronic Access Control and Intrusion Detection'),
('28', '28 30 00', 'Electronic Detection and Alarm'),
-- Division 31 - Earthwork
('31', '31 20 00', 'Earth Moving'),
('31', '31 60 00', 'Special Foundations and Load-Bearing Elements'),
-- Division 32 - Exterior Improvements
('32', '32 10 00', 'Bases, Ballasts, and Paving'),
('32', '32 90 00', 'Planting')
ON CONFLICT (section) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_spec_sections_division ON spec_sections(division);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 061_submittal_lead_time completed successfully';
END $$;
