-- =============================================
-- Migration: 043_material_receiving_enhancements
-- Description: Enhance material receiving with photos, search improvements, and status workflow
-- Date: 2025-11-29
-- =============================================

-- =============================================
-- TABLE: material_received_photos
-- Description: Photo documentation for material deliveries
-- =============================================
CREATE TABLE IF NOT EXISTS material_received_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_received_id UUID NOT NULL REFERENCES material_received(id) ON DELETE CASCADE,

  -- Photo Info
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  photo_type VARCHAR(50) DEFAULT 'delivery', -- delivery, ticket, damage, storage, other

  -- Metadata
  taken_at TIMESTAMPTZ,
  taken_by UUID REFERENCES users(id),

  -- GPS Location (if captured)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Standard fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_material_received_photos_material_id ON material_received_photos(material_received_id);
CREATE INDEX idx_material_received_photos_photo_type ON material_received_photos(photo_type);
CREATE INDEX idx_material_received_photos_deleted_at ON material_received_photos(deleted_at);

-- Enable RLS
ALTER TABLE material_received_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for material_received_photos
CREATE POLICY "Users can view material photos for their projects"
  ON material_received_photos FOR SELECT
  USING (
    material_received_id IN (
      SELECT mr.id FROM material_received mr
      WHERE mr.project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create material photos for their projects"
  ON material_received_photos FOR INSERT
  WITH CHECK (
    material_received_id IN (
      SELECT mr.id FROM material_received mr
      WHERE mr.project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update material photos for their projects"
  ON material_received_photos FOR UPDATE
  USING (
    material_received_id IN (
      SELECT mr.id FROM material_received mr
      WHERE mr.project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete material photos for their projects"
  ON material_received_photos FOR DELETE
  USING (
    material_received_id IN (
      SELECT mr.id FROM material_received mr
      WHERE mr.project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- Add status column to material_received if not exists
-- =============================================
DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_received' AND column_name = 'status'
  ) THEN
    ALTER TABLE material_received ADD COLUMN status VARCHAR(50) DEFAULT 'received';
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_received' AND column_name = 'notes'
  ) THEN
    ALTER TABLE material_received ADD COLUMN notes TEXT;
  END IF;

  -- Add unit column for quantity measurement
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_received' AND column_name = 'unit'
  ) THEN
    ALTER TABLE material_received ADD COLUMN unit VARCHAR(50);
  END IF;

  -- Add po_number column for purchase order tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_received' AND column_name = 'po_number'
  ) THEN
    ALTER TABLE material_received ADD COLUMN po_number VARCHAR(100);
  END IF;

  -- Add inspected_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_received' AND column_name = 'inspected_by'
  ) THEN
    ALTER TABLE material_received ADD COLUMN inspected_by UUID REFERENCES users(id);
  END IF;

  -- Add inspected_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_received' AND column_name = 'inspected_at'
  ) THEN
    ALTER TABLE material_received ADD COLUMN inspected_at TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================
-- Create status index for filtering
-- =============================================
CREATE INDEX IF NOT EXISTS idx_material_received_status ON material_received(status);
CREATE INDEX IF NOT EXISTS idx_material_received_vendor ON material_received(vendor);
CREATE INDEX IF NOT EXISTS idx_material_received_po_number ON material_received(po_number);

-- =============================================
-- Storage bucket for material receiving photos
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'material-receiving-photos',
  'material-receiving-photos',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for material receiving photos bucket
CREATE POLICY "Users can upload material photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'material-receiving-photos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view material photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'material-receiving-photos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own material photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'material-receiving-photos' AND
    auth.uid() IS NOT NULL
  );

-- =============================================
-- View: material_received_with_details
-- Description: Comprehensive view with photos, submittals, and daily reports
-- =============================================
CREATE OR REPLACE VIEW material_received_with_details AS
SELECT
  mr.*,
  u_received.full_name AS received_by_name,
  u_received.email AS received_by_email,
  u_inspected.full_name AS inspected_by_name,
  u_inspected.email AS inspected_by_email,
  u_created.full_name AS created_by_name,
  p.name AS project_name,
  p.number AS project_number,
  sp.id AS submittal_id,
  wi.number AS submittal_number,
  wi.title AS submittal_title,
  drd.id AS daily_report_delivery_id,
  dr.id AS daily_report_id,
  dr.report_date AS daily_report_date,
  (
    SELECT COUNT(*)
    FROM material_received_photos mrp
    WHERE mrp.material_received_id = mr.id
    AND mrp.deleted_at IS NULL
  ) AS photo_count
FROM material_received mr
LEFT JOIN users u_received ON mr.received_by = u_received.id
LEFT JOIN users u_inspected ON mr.inspected_by = u_inspected.id
LEFT JOIN users u_created ON mr.created_by = u_created.id
LEFT JOIN projects p ON mr.project_id = p.id
LEFT JOIN submittal_procurement sp ON mr.submittal_procurement_id = sp.id
LEFT JOIN workflow_items wi ON sp.workflow_item_id = wi.id
LEFT JOIN daily_report_deliveries drd ON mr.daily_report_delivery_id = drd.id
LEFT JOIN daily_reports dr ON drd.daily_report_id = dr.id
WHERE mr.deleted_at IS NULL;

-- =============================================
-- Function: get_material_receiving_stats
-- Description: Get statistics for material receiving dashboard
-- =============================================
CREATE OR REPLACE FUNCTION get_material_receiving_stats(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_deliveries', COUNT(*),
    'this_week', COUNT(*) FILTER (WHERE delivery_date >= CURRENT_DATE - INTERVAL '7 days'),
    'this_month', COUNT(*) FILTER (WHERE delivery_date >= DATE_TRUNC('month', CURRENT_DATE)),
    'pending_inspection', COUNT(*) FILTER (WHERE status = 'received' AND inspected_at IS NULL),
    'with_issues', COUNT(*) FILTER (WHERE condition IN ('damaged', 'partial', 'rejected')),
    'by_status', json_build_object(
      'received', COUNT(*) FILTER (WHERE status = 'received'),
      'inspected', COUNT(*) FILTER (WHERE status = 'inspected'),
      'stored', COUNT(*) FILTER (WHERE status = 'stored'),
      'issued', COUNT(*) FILTER (WHERE status = 'issued'),
      'returned', COUNT(*) FILTER (WHERE status = 'returned')
    ),
    'by_condition', json_build_object(
      'good', COUNT(*) FILTER (WHERE condition = 'good'),
      'damaged', COUNT(*) FILTER (WHERE condition = 'damaged'),
      'partial', COUNT(*) FILTER (WHERE condition = 'partial'),
      'rejected', COUNT(*) FILTER (WHERE condition = 'rejected')
    ),
    'unique_vendors', COUNT(DISTINCT vendor)
  ) INTO result
  FROM material_received
  WHERE project_id = p_project_id
  AND deleted_at IS NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_material_receiving_stats(UUID) TO authenticated;

-- =============================================
-- Comments for documentation
-- =============================================
COMMENT ON TABLE material_received_photos IS 'Photo documentation for material deliveries including delivery tickets, damage photos, and storage location photos';
COMMENT ON COLUMN material_received.status IS 'Status workflow: received -> inspected -> stored -> issued -> returned';
COMMENT ON COLUMN material_received.condition IS 'Material condition: good, damaged, partial, rejected';
COMMENT ON COLUMN material_received_photos.photo_type IS 'Type of photo: delivery, ticket, damage, storage, other';
