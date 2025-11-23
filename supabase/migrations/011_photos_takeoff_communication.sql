-- Migration: 011_photos_takeoff_communication.sql
-- Description: Create photos, takeoff, assemblies, notifications, and messages tables
-- Date: 2025-01-19

-- =============================================
-- TABLE: photos
-- =============================================
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File Info
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,

  -- Image Metadata
  width INTEGER,
  height INTEGER,
  is_360 BOOLEAN DEFAULT false,

  -- Automatic Metadata
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- User-Added Metadata
  caption TEXT,
  description TEXT,

  -- Location Tagging
  building VARCHAR(100),
  floor VARCHAR(100),
  area VARCHAR(100),
  grid VARCHAR(100),
  location_notes TEXT,

  -- Categorization
  photo_category VARCHAR(100),
  tags VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],

  -- Project Phase
  project_phase VARCHAR(100),

  -- Linked Items
  linked_items JSONB DEFAULT '[]'::jsonb,

  -- Before/After Pairing
  is_before_photo BOOLEAN DEFAULT false,
  is_after_photo BOOLEAN DEFAULT false,
  paired_photo_id UUID REFERENCES photos(id),

  -- Visibility
  is_pinned BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_photos_project_id ON photos(project_id);
CREATE INDEX idx_photos_captured_at ON photos(captured_at);
CREATE INDEX idx_photos_location ON photos(building, floor, area, grid);
CREATE INDEX idx_photos_photo_category ON photos(photo_category);
CREATE INDEX idx_photos_tags ON photos USING GIN(tags);
CREATE INDEX idx_photos_deleted_at ON photos(deleted_at);

-- Trigger
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: assemblies
-- =============================================
CREATE TABLE assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Assembly Info
  name VARCHAR(255) NOT NULL,
  assembly_number VARCHAR(100),
  description TEXT,
  category VARCHAR(100),
  trade VARCHAR(100),

  -- Assembly Level
  assembly_level VARCHAR(50) NOT NULL,

  -- Unit of Measure
  unit_of_measure VARCHAR(20) NOT NULL,

  -- Items in Assembly
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Variables
  variables JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_assemblies_company_id ON assemblies(company_id);
CREATE INDEX idx_assemblies_category ON assemblies(category);
CREATE INDEX idx_assemblies_assembly_level ON assemblies(assembly_level);
CREATE INDEX idx_assemblies_deleted_at ON assemblies(deleted_at);

-- Trigger
CREATE TRIGGER update_assemblies_updated_at BEFORE UPDATE ON assemblies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: takeoff_items
-- =============================================
CREATE TABLE takeoff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Takeoff Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Measurement Type
  measurement_type VARCHAR(50) NOT NULL,

  -- Measurement Data
  measurement_data JSONB NOT NULL,

  -- Page
  page_number INTEGER DEFAULT 1,

  -- Quantities
  quantity DECIMAL(15, 4),
  unit VARCHAR(20),
  multiplier DECIMAL(10, 2) DEFAULT 1.00,
  waste_factor DECIMAL(5, 2) DEFAULT 0.00,
  final_quantity DECIMAL(15, 4),

  -- Visual Styling
  color VARCHAR(7) DEFAULT '#0000FF',
  line_width INTEGER DEFAULT 2,

  -- Organization
  takeoff_tags JSONB DEFAULT '[]'::jsonb,
  layer VARCHAR(100),
  is_visible BOOLEAN DEFAULT true,

  -- Assembly Link
  assembly_id UUID REFERENCES assemblies(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_takeoff_items_project_id ON takeoff_items(project_id);
CREATE INDEX idx_takeoff_items_document_id ON takeoff_items(document_id);
CREATE INDEX idx_takeoff_items_measurement_type ON takeoff_items(measurement_type);
CREATE INDEX idx_takeoff_items_assembly_id ON takeoff_items(assembly_id);
CREATE INDEX idx_takeoff_items_deleted_at ON takeoff_items(deleted_at);

-- Trigger
CREATE TRIGGER update_takeoff_items_updated_at BEFORE UPDATE ON takeoff_items
