-- Migration: Material Receiving Tracker
-- Description: Track material deliveries with photos, tickets, and storage locations
-- Author: System
-- Date: 2025-12-03

-- =====================================================
-- MATERIAL RECEIVING TABLES
-- =====================================================

-- Main material_deliveries table
CREATE TABLE IF NOT EXISTS material_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Delivery Information
  delivery_date DATE NOT NULL,
  delivery_time TIME,
  delivery_ticket_number VARCHAR(100),

  -- Vendor Information
  vendor_name VARCHAR(255) NOT NULL,
  vendor_contact_name VARCHAR(255),
  vendor_contact_phone VARCHAR(50),
  vendor_contact_email VARCHAR(255),

  -- Material Information
  material_name VARCHAR(255) NOT NULL,
  material_description TEXT,
  material_category VARCHAR(100), -- lumber, concrete, steel, drywall, plumbing, electrical, etc.

  -- Quantity & Units
  quantity_ordered DECIMAL(10, 2),
  quantity_delivered DECIMAL(10, 2) NOT NULL,
  quantity_rejected DECIMAL(10, 2) DEFAULT 0,
  unit_of_measure VARCHAR(50) NOT NULL, -- LF, SF, EA, CY, TON, etc.

  -- Storage & Location
  storage_location VARCHAR(255), -- "North yard", "Floor 2 - East", "Trailer 3", etc.
  storage_notes TEXT,

  -- Status & Condition
  delivery_status VARCHAR(50) DEFAULT 'received' CHECK (delivery_status IN (
    'scheduled',
    'received',
    'partially_received',
    'rejected',
    'back_ordered'
  )),
  condition_status VARCHAR(50) DEFAULT 'good' CHECK (condition_status IN (
    'good',
    'damaged',
    'defective',
    'incorrect'
  )),
  condition_notes TEXT,

  -- Receiving Information
  received_by_user_id UUID REFERENCES users(id),
  received_by_name VARCHAR(255),
  inspector_notes TEXT,

  -- Integration Links
  submittal_id UUID REFERENCES workflow_items(id), -- Link to related submittal
  daily_report_id UUID REFERENCES daily_reports(id), -- Link to daily report
  purchase_order_number VARCHAR(100),

  -- Cost Tracking (optional)
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(12, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT positive_quantities CHECK (
    quantity_delivered >= 0 AND
    quantity_rejected >= 0 AND
    (quantity_ordered IS NULL OR quantity_ordered >= 0)
  )
);

-- Delivery photos table
CREATE TABLE IF NOT EXISTS material_delivery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES material_deliveries(id) ON DELETE CASCADE,

  -- Photo Information
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(50) CHECK (photo_type IN (
    'delivery_ticket',
    'material_condition',
    'storage_location',
    'damage',
    'packaging',
    'other'
  )),

  -- Metadata
  caption TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),

  CONSTRAINT valid_photo_url CHECK (photo_url != '')
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_material_deliveries_project ON material_deliveries(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_company ON material_deliveries(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_date ON material_deliveries(delivery_date DESC) WHERE deleted_at IS NULL;

-- Search indexes
CREATE INDEX idx_material_deliveries_vendor ON material_deliveries(vendor_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_material ON material_deliveries(material_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_category ON material_deliveries(material_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_ticket ON material_deliveries(delivery_ticket_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_storage ON material_deliveries(storage_location) WHERE deleted_at IS NULL;

-- Status indexes
CREATE INDEX idx_material_deliveries_status ON material_deliveries(delivery_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_condition ON material_deliveries(condition_status) WHERE deleted_at IS NULL;

-- Integration indexes
CREATE INDEX idx_material_deliveries_submittal ON material_deliveries(submittal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_deliveries_daily_report ON material_deliveries(daily_report_id) WHERE deleted_at IS NULL;

-- Photos indexes
CREATE INDEX idx_material_delivery_photos_delivery ON material_delivery_photos(delivery_id);
CREATE INDEX idx_material_delivery_photos_type ON material_delivery_photos(photo_type);

-- Full-text search index for material search
CREATE INDEX idx_material_deliveries_search ON material_deliveries
  USING gin(to_tsvector('english',
    coalesce(material_name, '') || ' ' ||
    coalesce(material_description, '') || ' ' ||
    coalesce(vendor_name, '')
  )) WHERE deleted_at IS NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE material_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_delivery_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view deliveries in their company
CREATE POLICY material_deliveries_select_policy ON material_deliveries
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert deliveries in their company's projects
CREATE POLICY material_deliveries_insert_policy ON material_deliveries
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update deliveries in their company's projects
CREATE POLICY material_deliveries_update_policy ON material_deliveries
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete (soft delete) deliveries in their company's projects
CREATE POLICY material_deliveries_delete_policy ON material_deliveries
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Photos policies (inherit from parent delivery)
CREATE POLICY material_delivery_photos_select_policy ON material_delivery_photos
  FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM material_deliveries
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY material_delivery_photos_insert_policy ON material_delivery_photos
  FOR INSERT
  WITH CHECK (
    delivery_id IN (
      SELECT id FROM material_deliveries
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY material_delivery_photos_update_policy ON material_delivery_photos
  FOR UPDATE
  USING (
    delivery_id IN (
      SELECT id FROM material_deliveries
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY material_delivery_photos_delete_policy ON material_delivery_photos
  FOR DELETE
  USING (
    delivery_id IN (
      SELECT id FROM material_deliveries
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- STORAGE BUCKET FOR DELIVERY PHOTOS
-- =====================================================

-- Create storage bucket for material delivery photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('material-delivery-photos', 'material-delivery-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Users can upload photos for their company's deliveries
CREATE POLICY material_delivery_photos_upload_policy ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'material-delivery-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY material_delivery_photos_read_policy ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'material-delivery-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY material_delivery_photos_update_policy ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'material-delivery-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY material_delivery_photos_delete_policy ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'material-delivery-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_material_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at
CREATE TRIGGER trigger_material_deliveries_updated_at
  BEFORE UPDATE ON material_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_material_deliveries_updated_at();

-- Function: Get delivery statistics by project
CREATE OR REPLACE FUNCTION get_delivery_stats_by_project(p_project_id UUID)
RETURNS TABLE (
  total_deliveries BIGINT,
  total_items_received DECIMAL,
  total_items_rejected DECIMAL,
  deliveries_this_week BIGINT,
  deliveries_this_month BIGINT,
  unique_vendors INT,
  unique_categories INT,
  damaged_deliveries BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_deliveries,
    COALESCE(SUM(quantity_delivered), 0) as total_items_received,
    COALESCE(SUM(quantity_rejected), 0) as total_items_rejected,
    COUNT(CASE WHEN delivery_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::BIGINT as deliveries_this_week,
    COUNT(CASE WHEN delivery_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::BIGINT as deliveries_this_month,
    COUNT(DISTINCT vendor_name) as unique_vendors,
    COUNT(DISTINCT material_category) as unique_categories,
    COUNT(CASE WHEN condition_status != 'good' THEN 1 END)::BIGINT as damaged_deliveries
  FROM material_deliveries
  WHERE project_id = p_project_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Search deliveries by material or vendor
CREATE OR REPLACE FUNCTION search_material_deliveries(
  p_project_id UUID,
  p_search_term TEXT
)
RETURNS SETOF material_deliveries AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM material_deliveries
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND (
      material_name ILIKE '%' || p_search_term || '%'
      OR material_description ILIKE '%' || p_search_term || '%'
      OR vendor_name ILIKE '%' || p_search_term || '%'
      OR delivery_ticket_number ILIKE '%' || p_search_term || '%'
      OR storage_location ILIKE '%' || p_search_term || '%'
    )
  ORDER BY delivery_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE material_deliveries IS 'Track material deliveries to construction projects with vendor, quantity, and storage information';
COMMENT ON TABLE material_delivery_photos IS 'Photos documenting material deliveries, conditions, and delivery tickets';

COMMENT ON COLUMN material_deliveries.delivery_status IS 'Current status of delivery: scheduled, received, partially_received, rejected, back_ordered';
COMMENT ON COLUMN material_deliveries.condition_status IS 'Condition of delivered materials: good, damaged, defective, incorrect';
COMMENT ON COLUMN material_deliveries.storage_location IS 'Physical location where materials are stored on site';
COMMENT ON COLUMN material_deliveries.submittal_id IS 'Link to related submittal approval';
COMMENT ON COLUMN material_deliveries.daily_report_id IS 'Link to daily report where delivery was logged';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON material_deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON material_delivery_photos TO authenticated;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 043_material_receiving.sql completed successfully';
  RAISE NOTICE 'Created tables: material_deliveries, material_delivery_photos';
  RAISE NOTICE 'Created storage bucket: material-delivery-photos';
  RAISE NOTICE 'Created helper functions: get_delivery_stats_by_project, search_material_deliveries';
END $$;
