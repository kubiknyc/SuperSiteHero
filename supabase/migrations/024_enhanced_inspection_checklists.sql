-- Migration: 024_enhanced_inspection_checklists.sql
-- Description: Enhance checklist system for full inspection checklists feature
-- Date: 2025-11-26
-- Phase: 1.1 - Database Schema Design

-- =============================================
-- ENHANCEMENTS TO checklist_templates
-- =============================================
-- Add columns for enhanced functionality
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS scoring_enabled BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN checklist_templates.is_system_template IS 'Pre-built templates (pre-pour, framing, MEP, etc.)';
COMMENT ON COLUMN checklist_templates.tags IS 'Searchable tags for categorization';
COMMENT ON COLUMN checklist_templates.instructions IS 'Instructions for inspector';
COMMENT ON COLUMN checklist_templates.estimated_duration_minutes IS 'Expected time to complete';
COMMENT ON COLUMN checklist_templates.scoring_enabled IS 'Enable pass/fail/NA scoring';

-- =============================================
-- TABLE: checklist_template_items
-- =============================================
-- Separate table for template items (better than JSONB for complex queries)
CREATE TABLE IF NOT EXISTS checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,

  -- Item Configuration
  item_type VARCHAR(50) NOT NULL, -- checkbox, text, number, photo, signature
  label VARCHAR(500) NOT NULL,
  description TEXT,

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  section VARCHAR(255), -- Optional section grouping

  -- Validation Rules
  is_required BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb, -- Type-specific config

  -- For checkbox type: { "scoring": true, "default_value": null }
  -- For text type: { "placeholder": "Enter notes", "max_length": 500, "multiline": true }
  -- For number type: { "min": 0, "max": 100, "units": "psi", "decimal_places": 2 }
  -- For photo type: { "min_photos": 1, "max_photos": 5, "required_if_fail": true }
  -- For signature type: { "role": "inspector", "title": "Inspector Signature" }

  -- Scoring (for checkbox items)
  scoring_enabled BOOLEAN DEFAULT false,
  pass_fail_na_scoring BOOLEAN DEFAULT false,

  -- Photo Requirements
  requires_photo BOOLEAN DEFAULT false,
  min_photos INTEGER DEFAULT 0,
  max_photos INTEGER DEFAULT 5,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_item_type CHECK (item_type IN ('checkbox', 'text', 'number', 'photo', 'signature'))
);

-- Indexes for checklist_template_items
CREATE INDEX idx_checklist_template_items_template_id ON checklist_template_items(checklist_template_id);
CREATE INDEX idx_checklist_template_items_sort_order ON checklist_template_items(sort_order);
CREATE INDEX idx_checklist_template_items_item_type ON checklist_template_items(item_type);
CREATE INDEX idx_checklist_template_items_deleted_at ON checklist_template_items(deleted_at);

-- Trigger for updated_at
CREATE TRIGGER update_checklist_template_items_updated_at
  BEFORE UPDATE ON checklist_template_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ENHANCEMENTS TO checklists (executions)
-- =============================================
-- Rename for clarity (checklists -> checklist_executions)
-- Add columns for enhanced execution tracking
ALTER TABLE checklists
  ADD COLUMN IF NOT EXISTS inspector_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS inspector_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS weather_conditions VARCHAR(255),
  ADD COLUMN IF NOT EXISTS temperature DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS score_pass INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_fail INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_na INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_percentage DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add comments
COMMENT ON COLUMN checklists.inspector_user_id IS 'User performing the inspection';
COMMENT ON COLUMN checklists.status IS 'draft, in_progress, submitted, approved, rejected';
COMMENT ON COLUMN checklists.score_pass IS 'Number of items marked as pass';
COMMENT ON COLUMN checklists.score_fail IS 'Number of items marked as fail';
COMMENT ON COLUMN checklists.score_na IS 'Number of items marked as N/A';
COMMENT ON COLUMN checklists.score_percentage IS 'Pass percentage (pass / (pass + fail))';

-- Add index for status and inspector
CREATE INDEX IF NOT EXISTS idx_checklists_status ON checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_inspector_user_id ON checklists(inspector_user_id);
CREATE INDEX IF NOT EXISTS idx_checklists_submitted_at ON checklists(submitted_at);

-- =============================================
-- TABLE: checklist_responses
-- =============================================
-- Individual item responses with typed data
CREATE TABLE IF NOT EXISTS checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  checklist_template_item_id UUID REFERENCES checklist_template_items(id) ON DELETE SET NULL,

  -- Item Info (denormalized for historical record)
  item_type VARCHAR(50) NOT NULL,
  item_label VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,

  -- Response Data (typed by item_type)
  -- For checkbox: { "value": "pass" | "fail" | "na" | "checked" | "unchecked" }
  -- For text: { "value": "text content" }
  -- For number: { "value": 123.45, "units": "psi" }
  -- For photo: { "photo_urls": ["url1", "url2"], "captions": ["caption1", "caption2"] }
  -- For signature: { "signature_url": "url", "signed_by": "Name", "signed_at": "timestamp" }
  response_data JSONB DEFAULT '{}'::jsonb,

  -- Scoring (for checkbox items)
  score_value VARCHAR(50), -- pass, fail, na

  -- Notes
  notes TEXT,

  -- Photos (array of URLs from Supabase Storage)
  photo_urls TEXT[] DEFAULT '{}',

  -- Signature (URL from Supabase Storage)
  signature_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  responded_by UUID REFERENCES users(id),

  CONSTRAINT valid_item_type_response CHECK (item_type IN ('checkbox', 'text', 'number', 'photo', 'signature')),
  CONSTRAINT valid_score_value CHECK (score_value IS NULL OR score_value IN ('pass', 'fail', 'na'))
);

-- Indexes for checklist_responses
CREATE INDEX idx_checklist_responses_checklist_id ON checklist_responses(checklist_id);
CREATE INDEX idx_checklist_responses_template_item_id ON checklist_responses(checklist_template_item_id);
CREATE INDEX idx_checklist_responses_score_value ON checklist_responses(score_value);
CREATE INDEX idx_checklist_responses_item_type ON checklist_responses(item_type);

-- Trigger for updated_at
CREATE TRIGGER update_checklist_responses_updated_at
  BEFORE UPDATE ON checklist_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE checklist_responses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- checklist_template_items policies
DROP POLICY IF EXISTS "Users can view checklist template items for their company" ON checklist_template_items;
CREATE POLICY "Users can view checklist template items for their company"
  ON checklist_template_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklist_templates ct
      WHERE ct.id = checklist_template_items.checklist_template_id
      AND (
        ct.company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
        OR ct.is_system_template = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert checklist template items for their company" ON checklist_template_items;
CREATE POLICY "Users can insert checklist template items for their company"
  ON checklist_template_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklist_templates ct
      WHERE ct.id = checklist_template_items.checklist_template_id
      AND ct.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update checklist template items for their company" ON checklist_template_items;
CREATE POLICY "Users can update checklist template items for their company"
  ON checklist_template_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM checklist_templates ct
      WHERE ct.id = checklist_template_items.checklist_template_id
      AND ct.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete checklist template items for their company" ON checklist_template_items;
CREATE POLICY "Users can delete checklist template items for their company"
  ON checklist_template_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM checklist_templates ct
      WHERE ct.id = checklist_template_items.checklist_template_id
      AND ct.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- checklist_responses policies
DROP POLICY IF EXISTS "Users can view checklist responses for their projects" ON checklist_responses;
CREATE POLICY "Users can view checklist responses for their projects"
  ON checklist_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN project_users pu ON pu.project_id = c.project_id
      WHERE c.id = checklist_responses.checklist_id
      AND pu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert checklist responses for their projects" ON checklist_responses;
CREATE POLICY "Users can insert checklist responses for their projects"
  ON checklist_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN project_users pu ON pu.project_id = c.project_id
      WHERE c.id = checklist_responses.checklist_id
      AND pu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update checklist responses for their projects" ON checklist_responses;
CREATE POLICY "Users can update checklist responses for their projects"
  ON checklist_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN project_users pu ON pu.project_id = c.project_id
      WHERE c.id = checklist_responses.checklist_id
      AND pu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete checklist responses for their projects" ON checklist_responses;
CREATE POLICY "Users can delete checklist responses for their projects"
  ON checklist_responses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN project_users pu ON pu.project_id = c.project_id
      WHERE c.id = checklist_responses.checklist_id
      AND pu.user_id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate checklist scores
CREATE OR REPLACE FUNCTION calculate_checklist_score(checklist_uuid UUID)
RETURNS TABLE (
  pass_count INTEGER,
  fail_count INTEGER,
  na_count INTEGER,
  total_count INTEGER,
  pass_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE score_value = 'pass')::INTEGER AS pass_count,
    COUNT(*) FILTER (WHERE score_value = 'fail')::INTEGER AS fail_count,
    COUNT(*) FILTER (WHERE score_value = 'na')::INTEGER AS na_count,
    COUNT(*)::INTEGER AS total_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE score_value IN ('pass', 'fail')) = 0 THEN 0.00
      ELSE ROUND(
        (COUNT(*) FILTER (WHERE score_value = 'pass')::DECIMAL /
         NULLIF(COUNT(*) FILTER (WHERE score_value IN ('pass', 'fail')), 0)) * 100,
        2
      )
    END AS pass_percentage
  FROM checklist_responses
  WHERE checklist_id = checklist_uuid
  AND score_value IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update checklist scores (trigger)
CREATE OR REPLACE FUNCTION update_checklist_scores()
RETURNS TRIGGER AS $$
DECLARE
  scores RECORD;
BEGIN
  -- Calculate scores for the checklist
  SELECT * INTO scores FROM calculate_checklist_score(NEW.checklist_id);

  -- Update the checklist with calculated scores
  UPDATE checklists
  SET
    score_pass = scores.pass_count,
    score_fail = scores.fail_count,
    score_na = scores.na_count,
    score_total = scores.total_count,
    score_percentage = scores.pass_percentage,
    updated_at = NOW()
  WHERE id = NEW.checklist_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update checklist scores when responses change
DROP TRIGGER IF EXISTS trigger_update_checklist_scores ON checklist_responses;
CREATE TRIGGER trigger_update_checklist_scores
  AFTER INSERT OR UPDATE OR DELETE ON checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_scores();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 024_enhanced_inspection_checklists completed successfully';
  RAISE NOTICE 'Created checklist_template_items table';
  RAISE NOTICE 'Created checklist_responses table';
  RAISE NOTICE 'Enhanced checklist_templates and checklists tables';
  RAISE NOTICE 'Added RLS policies and helper functions';
END $$;
