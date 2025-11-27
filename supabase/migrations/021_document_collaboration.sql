-- Migration: 021_document_collaboration.sql
-- Description: Create collaboration tables for documents (comments, access logs)
-- Date: 2025-01-23

-- =============================================
-- TABLE: document_comments
-- =============================================
CREATE TABLE document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Comment Hierarchy (for threading)
  parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,

  -- Content
  comment_text TEXT NOT NULL,

  -- User Info
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX idx_document_comments_parent_comment_id ON document_comments(parent_comment_id);
CREATE INDEX idx_document_comments_project_id ON document_comments(project_id);
CREATE INDEX idx_document_comments_created_by ON document_comments(created_by);
CREATE INDEX idx_document_comments_deleted_at ON document_comments(deleted_at);
CREATE INDEX idx_document_comments_created_at ON document_comments(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_document_comments_updated_at BEFORE UPDATE ON document_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: document_access_log
-- =============================================
CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- User Info
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Action Type
  action VARCHAR(50) NOT NULL,
  -- Possible values: view, download, comment, share, version_update

  -- Additional Context
  details JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_project_id ON document_access_log(project_id);
CREATE INDEX idx_document_access_log_user_id ON document_access_log(user_id);
CREATE INDEX idx_document_access_log_action ON document_access_log(action);
CREATE INDEX idx_document_access_log_created_at ON document_access_log(created_at DESC);
CREATE INDEX idx_document_access_log_user_date ON document_access_log(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: document_shares
-- =============================================
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Recipient Info (can be user or role)
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_role VARCHAR(100),

  -- Permissions
  permission_level VARCHAR(50) NOT NULL,
  -- Possible values: viewer, commenter, editor

  -- Share Details
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  shared_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX idx_document_shares_project_id ON document_shares(project_id);
CREATE INDEX idx_document_shares_recipient_user_id ON document_shares(recipient_user_id);
CREATE INDEX idx_document_shares_recipient_role ON document_shares(recipient_role);
CREATE INDEX idx_document_shares_shared_by ON document_shares(shared_by);

-- Unique constraint: one share per user per document
CREATE UNIQUE INDEX idx_document_shares_unique_user ON document_shares(document_id, recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

-- Trigger
CREATE TRIGGER update_document_shares_updated_at BEFORE UPDATE ON document_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 021_document_collaboration completed successfully';
END $$;
