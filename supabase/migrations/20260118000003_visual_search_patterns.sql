-- Migration: 20260118000003_visual_search_patterns.sql
-- Description: Create visual_search_patterns table for saved lasso selections
-- Date: 2026-01-18
-- Part of: AI-Powered Drawing Management System

-- =============================================
-- TABLE: visual_search_patterns
-- =============================================
-- Stores lasso-selected patterns from drawings for AI visual search.
-- Users can save patterns for reuse across projects (e.g., "duplex outlet symbol").

CREATE TABLE visual_search_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Pattern details
  name TEXT NOT NULL,
  description TEXT,
  pattern_image_url TEXT NOT NULL,  -- Cropped image of the selected region
  pattern_description TEXT,  -- AI-generated description for matching
  pattern_hash TEXT,  -- Hash for deduplication

  -- Search settings
  match_tolerance DECIMAL(3,2) DEFAULT 0.80,  -- 0.00-1.00 (80% default)
  default_assembly_id UUID,  -- Default assembly to assign matches to

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES
-- =============================================

-- Primary lookup patterns
CREATE INDEX idx_visual_search_patterns_project ON visual_search_patterns(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_visual_search_patterns_company ON visual_search_patterns(company_id) WHERE deleted_at IS NULL;

-- Deduplication lookup
CREATE INDEX idx_visual_search_patterns_hash ON visual_search_patterns(pattern_hash) WHERE deleted_at IS NULL;

-- Popular patterns (for suggestions)
CREATE INDEX idx_visual_search_patterns_usage ON visual_search_patterns(company_id, usage_count DESC)
  WHERE deleted_at IS NULL;

-- =============================================
-- TRIGGER: updated_at
-- =============================================
CREATE TRIGGER update_visual_search_patterns_updated_at
  BEFORE UPDATE ON visual_search_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE visual_search_patterns ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view patterns in their company
CREATE POLICY "Users can view patterns in their company"
  ON visual_search_patterns FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- INSERT: Users can create patterns in their company
CREATE POLICY "Users can insert patterns in their company"
  ON visual_search_patterns FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- UPDATE: Users can update patterns in their company
CREATE POLICY "Users can update patterns in their company"
  ON visual_search_patterns FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- DELETE: Users can delete patterns in their company
CREATE POLICY "Users can delete patterns in their company"
  ON visual_search_patterns FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE visual_search_patterns IS 'Saved lasso selections for AI visual search in drawing takeoffs';
COMMENT ON COLUMN visual_search_patterns.pattern_image_url IS 'URL to the cropped image of the selected region';
COMMENT ON COLUMN visual_search_patterns.pattern_description IS 'AI-generated description of the pattern for matching';
COMMENT ON COLUMN visual_search_patterns.match_tolerance IS 'Matching strictness: 1.00=exact match, 0.50=fuzzy match';
COMMENT ON COLUMN visual_search_patterns.default_assembly_id IS 'Assembly to auto-assign when this pattern is matched';
COMMENT ON COLUMN visual_search_patterns.usage_count IS 'Number of times this pattern has been searched';
