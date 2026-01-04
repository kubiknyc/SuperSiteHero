-- ============================================================
-- Field-Focused Markup Features Migration
-- ============================================================
-- This migration adds tables for:
-- 1. Drawing Photo Pins
-- 2. Voice Notes
-- 3. Drawing QR Codes
-- 4. Geo-References for GPS Overlay
-- ============================================================

-- ============================================================
-- Drawing Photo Pins
-- ============================================================
-- Links photos to specific locations on drawings

CREATE TABLE IF NOT EXISTS drawing_photo_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL DEFAULT 1,
  position_x DECIMAL(10, 8) NOT NULL, -- Normalized 0-1
  position_y DECIMAL(10, 8) NOT NULL, -- Normalized 0-1
  label TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_position_x CHECK (position_x >= 0 AND position_x <= 1),
  CONSTRAINT valid_position_y CHECK (position_y >= 0 AND position_y <= 1)
);

-- Junction table for pin to photo relationships
CREATE TABLE IF NOT EXISTS drawing_photo_pin_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES drawing_photo_pins(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pin_id, photo_id)
);

CREATE INDEX idx_drawing_photo_pins_document ON drawing_photo_pins(document_id);
CREATE INDEX idx_drawing_photo_pins_created_by ON drawing_photo_pins(created_by);
CREATE INDEX idx_drawing_photo_pin_photos_pin ON drawing_photo_pin_photos(pin_id);
CREATE INDEX idx_drawing_photo_pin_photos_photo ON drawing_photo_pin_photos(photo_id);

-- ============================================================
-- Voice Notes
-- ============================================================
-- Audio annotations attached to markups

CREATE TABLE IF NOT EXISTS voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  markup_id UUID NOT NULL, -- References the markup annotation ID
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'audio/webm',
  duration DECIMAL(10, 2) NOT NULL, -- Duration in seconds
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_notes_markup ON voice_notes(markup_id);
CREATE INDEX idx_voice_notes_document ON voice_notes(document_id);
CREATE INDEX idx_voice_notes_created_by ON voice_notes(created_by);

-- ============================================================
-- Drawing QR Codes
-- ============================================================
-- QR codes that link to specific drawing locations

CREATE TABLE IF NOT EXISTS drawing_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL DEFAULT 1,
  viewport_x DECIMAL(10, 6),
  viewport_y DECIMAL(10, 6),
  viewport_zoom INTEGER,
  label TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drawing_qr_codes_document ON drawing_qr_codes(document_id);
CREATE INDEX idx_drawing_qr_codes_page ON drawing_qr_codes(document_id, page);

-- ============================================================
-- Geo-References
-- ============================================================
-- Calibration data for GPS overlay on site plans

CREATE TABLE IF NOT EXISTS geo_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL DEFAULT 1,
  reference_points JSONB NOT NULL, -- Array of {pixelX, pixelY, lat, lng}
  accuracy DECIMAL(10, 2), -- Estimated accuracy in meters
  calibrated_by UUID REFERENCES profiles(id),
  calibrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, page)
);

CREATE INDEX idx_geo_references_document ON geo_references(document_id);

-- ============================================================
-- Offline Markup Queue (for tracking offline changes)
-- ============================================================
-- This table helps track markups created offline for sync purposes

CREATE TABLE IF NOT EXISTS offline_markup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL DEFAULT 1,
  markup_data JSONB NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  sync_error TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  server_version INTEGER,
  last_sync_attempt TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, local_id)
);

CREATE INDEX idx_offline_markup_queue_document ON offline_markup_queue(document_id);
CREATE INDEX idx_offline_markup_queue_status ON offline_markup_queue(sync_status);
CREATE INDEX idx_offline_markup_queue_user ON offline_markup_queue(created_by);

-- ============================================================
-- Markup Sync Conflicts
-- ============================================================
-- Tracks conflicts between local and server versions

CREATE TABLE IF NOT EXISTS markup_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offline_markup_id UUID NOT NULL REFERENCES offline_markup_queue(id) ON DELETE CASCADE,
  local_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('modified', 'deleted', 'concurrent')),
  resolution TEXT CHECK (resolution IN ('local', 'server', 'merged', 'pending')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_markup_sync_conflicts_offline ON markup_sync_conflicts(offline_markup_id);
CREATE INDEX idx_markup_sync_conflicts_resolution ON markup_sync_conflicts(resolution);

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Drawing Photo Pins RLS
ALTER TABLE drawing_photo_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photo pins in their projects" ON drawing_photo_pins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = drawing_photo_pins.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create photo pins in their projects" ON drawing_photo_pins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = drawing_photo_pins.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own photo pins" ON drawing_photo_pins
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own photo pins" ON drawing_photo_pins
  FOR DELETE USING (created_by = auth.uid());

-- Voice Notes RLS
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view voice notes in their projects" ON voice_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = voice_notes.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create voice notes in their projects" ON voice_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = voice_notes.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own voice notes" ON voice_notes
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own voice notes" ON voice_notes
  FOR DELETE USING (created_by = auth.uid());

-- Drawing QR Codes RLS
ALTER TABLE drawing_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view QR codes in their projects" ON drawing_qr_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = drawing_qr_codes.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create QR codes in their projects" ON drawing_qr_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = drawing_qr_codes.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own QR codes" ON drawing_qr_codes
  FOR DELETE USING (created_by = auth.uid());

-- Geo-References RLS
ALTER TABLE geo_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view geo-references in their projects" ON geo_references
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = geo_references.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create/update geo-references in their projects" ON geo_references
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN project_members pm ON pm.project_id = d.project_id
      WHERE d.id = geo_references.document_id
      AND pm.user_id = auth.uid()
    )
  );

-- Offline Markup Queue RLS
ALTER TABLE offline_markup_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own offline markups" ON offline_markup_queue
  FOR ALL USING (created_by = auth.uid());

-- Markup Sync Conflicts RLS
ALTER TABLE markup_sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync conflicts" ON markup_sync_conflicts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM offline_markup_queue omq
      WHERE omq.id = markup_sync_conflicts.offline_markup_id
      AND omq.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can resolve their own sync conflicts" ON markup_sync_conflicts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM offline_markup_queue omq
      WHERE omq.id = markup_sync_conflicts.offline_markup_id
      AND omq.created_by = auth.uid()
    )
  );

-- ============================================================
-- Updated_at Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drawing_photo_pins_updated_at
  BEFORE UPDATE ON drawing_photo_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER voice_notes_updated_at
  BEFORE UPDATE ON voice_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER offline_markup_queue_updated_at
  BEFORE UPDATE ON offline_markup_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Storage Buckets for Voice Notes
-- ============================================================
-- Create storage bucket for voice notes if it doesn't exist

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('voice-notes', 'voice-notes', false, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- Voice notes storage policies
CREATE POLICY "Users can upload voice notes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-notes' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view voice notes in their projects" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-notes' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own voice notes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-notes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
