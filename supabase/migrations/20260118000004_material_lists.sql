-- Migration: 20260118000004_material_lists.sql
-- Description: Create material_lists table for procurement lists from takeoffs
-- Date: 2026-01-18
-- Part of: AI-Powered Drawing Management System

-- =============================================
-- TABLE: material_lists
-- =============================================
-- Stores material/procurement lists generated from takeoffs.
-- Aggregates quantities, applies waste factors, and tracks exports.

CREATE TABLE material_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- List details
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'finalized', 'exported', 'ordered'
  )),

  -- Source
  takeoff_id UUID,  -- Reference to takeoffs table if linked

  -- Content (JSONB for flexibility)
  items JSONB NOT NULL DEFAULT '[]',
  /*
    items: [
      {
        "id": "uuid",
        "name": "2x4x8 Lumber",
        "quantity": 150,
        "unit": "EA",
        "waste_factor": 0.10,
        "order_quantity": 165,
        "category": "Framing",
        "source_takeoff_items": ["uuid1", "uuid2"]
      }
    ]
  */

  -- Waste factors by category
  waste_factors JSONB DEFAULT '{}',
  /*
    waste_factors: {
      "Framing": 0.10,
      "Drywall": 0.15,
      "Electrical": 0.05
    }
  */

  -- Calculated totals
  totals JSONB DEFAULT '{}',
  /*
    totals: {
      "by_category": {"Framing": 25000, "Drywall": 12000},
      "total_items": 47,
      "total_line_items": 156
    }
  */

  -- Export history
  export_history JSONB DEFAULT '[]',
  /*
    export_history: [
      {
        "format": "pdf",
        "exported_at": "2026-01-18T10:30:00Z",
        "exported_by": "uuid",
        "recipient": "supplier@example.com"
      }
    ]
  */

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
CREATE INDEX idx_material_lists_project ON material_lists(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_lists_company ON material_lists(company_id) WHERE deleted_at IS NULL;

-- Status filtering
CREATE INDEX idx_material_lists_status ON material_lists(status) WHERE deleted_at IS NULL;

-- Source takeoff lookup
CREATE INDEX idx_material_lists_takeoff ON material_lists(takeoff_id) WHERE deleted_at IS NULL;

-- =============================================
-- TRIGGER: updated_at
-- =============================================
CREATE TRIGGER update_material_lists_updated_at
  BEFORE UPDATE ON material_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE material_lists ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view material lists in projects they have access to
CREATE POLICY "Users can view material lists in their company projects"
  ON material_lists FOR SELECT
  USING (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- INSERT: Users can create material lists in projects they have access to
CREATE POLICY "Users can insert material lists in their company projects"
  ON material_lists FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update material lists in projects they have access to
CREATE POLICY "Users can update material lists in their company projects"
  ON material_lists FOR UPDATE
  USING (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete material lists in projects they have access to
CREATE POLICY "Users can delete material lists in their company projects"
  ON material_lists FOR DELETE
  USING (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE material_lists IS 'Procurement/material lists generated from takeoffs with waste factors';
COMMENT ON COLUMN material_lists.status IS 'List status: draft, finalized, exported, ordered';
COMMENT ON COLUMN material_lists.items IS 'JSON array of material items with quantities and waste factors';
COMMENT ON COLUMN material_lists.waste_factors IS 'Waste factor percentages by category (e.g., {"Framing": 0.10})';
COMMENT ON COLUMN material_lists.totals IS 'Calculated totals by category and overall';
COMMENT ON COLUMN material_lists.export_history IS 'History of exports (PDF, Excel, email) with timestamps';
