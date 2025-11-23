-- Migration: 004_document_management.sql
-- Description: Create document management tables (folders, documents, document_markups)
-- Date: 2025-01-19

-- =============================================
-- TABLE: folders
-- =============================================
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,

  -- Folder Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_folders_project_id ON folders(project_id);
CREATE INDEX idx_folders_parent_folder_id ON folders(parent_folder_id);
CREATE INDEX idx_folders_deleted_at ON folders(deleted_at);

-- Trigger
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: documents
-- =============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

  -- Document Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(50) NOT NULL,
  discipline VARCHAR(100),

  -- File Info
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),

  -- Version Control
  version VARCHAR(50) DEFAULT '1.0',
  revision VARCHAR(50),
  is_latest_version BOOLEAN DEFAULT true,
  supersedes_document_id UUID REFERENCES documents(id),

  -- Additional Metadata
  drawing_number VARCHAR(100),
  specification_section VARCHAR(50),
  issue_date DATE,
  received_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'current',

  -- Flags
  is_pinned BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,

  -- Full-text search
  search_vector TSVECTOR,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_discipline ON documents(discipline);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX idx_documents_search_vector ON documents USING GIN(search_vector);

-- Full-text search trigger
CREATE TRIGGER documents_search_vector_update BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description, drawing_number);

-- Trigger
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: document_markups
-- =============================================
CREATE TABLE document_markups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Markup Data
  markup_type VARCHAR(50) NOT NULL,
  markup_data JSONB NOT NULL,

  -- Page
  page_number INTEGER DEFAULT 1,

  -- Context
  related_to_type VARCHAR(50),
  related_to_id UUID,

  -- Visibility
  is_shared BOOLEAN DEFAULT true,
  shared_with_roles VARCHAR[] DEFAULT ARRAY['superintendent', 'project_manager'],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_document_markups_document_id ON document_markups(document_id);
CREATE INDEX idx_document_markups_project_id ON document_markups(project_id);
CREATE INDEX idx_document_markups_related_to ON document_markups(related_to_type, related_to_id);
CREATE INDEX idx_document_markups_deleted_at ON document_markups(deleted_at);

-- Trigger
CREATE TRIGGER update_document_markups_updated_at BEFORE UPDATE ON document_markups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE document_markups ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 004_document_management completed successfully';
END $$;