-- Migration: 032_performance_indexes.sql
-- Description: Add composite indexes for common query patterns to improve performance
-- Created: 2025-01-29

-- =============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =============================================

-- Index for workflow_items queries by project and type (RFIs, Submittals, etc.)
CREATE INDEX IF NOT EXISTS idx_workflow_items_project_type_status
  ON workflow_items(project_id, workflow_type_id, status)
  WHERE deleted_at IS NULL;

-- Index for workflow_items ordered by created_at (common list query)
CREATE INDEX IF NOT EXISTS idx_workflow_items_project_type_created
  ON workflow_items(project_id, workflow_type_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for punch items by project and status
CREATE INDEX IF NOT EXISTS idx_punch_items_project_status
  ON punch_items(project_id, status)
  WHERE deleted_at IS NULL;

-- Index for punch items ordered by created_at
CREATE INDEX IF NOT EXISTS idx_punch_items_project_created
  ON punch_items(project_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for documents by project and folder
CREATE INDEX IF NOT EXISTS idx_documents_project_folder
  ON documents(project_id, folder_id)
  WHERE deleted_at IS NULL;

-- Index for documents ordered by name (common listing query)
CREATE INDEX IF NOT EXISTS idx_documents_project_name
  ON documents(project_id, name)
  WHERE deleted_at IS NULL;

-- Index for projects by company (common company-scoped query)
CREATE INDEX IF NOT EXISTS idx_projects_company_status
  ON projects(company_id, status)
  WHERE deleted_at IS NULL;

-- Index for projects ordered by created_at
CREATE INDEX IF NOT EXISTS idx_projects_company_created
  ON projects(company_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- =============================================
-- TEXT SEARCH INDEXES (using pg_trgm extension)
-- =============================================

-- Note: pg_trgm extension should already be enabled
-- If not, uncomment the following:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for document name search
CREATE INDEX IF NOT EXISTS idx_documents_name_trgm
  ON documents USING gin(name gin_trgm_ops);

-- Trigram index for punch item title search
CREATE INDEX IF NOT EXISTS idx_punch_items_title_trgm
  ON punch_items USING gin(title gin_trgm_ops);

-- Trigram index for workflow item title search
CREATE INDEX IF NOT EXISTS idx_workflow_items_title_trgm
  ON workflow_items USING gin(title gin_trgm_ops);

-- =============================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =============================================

-- Index for workflow types by company (frequently cached)
CREATE INDEX IF NOT EXISTS idx_workflow_types_company
  ON workflow_types(company_id);

-- Index for project_users junction table
CREATE INDEX IF NOT EXISTS idx_project_users_user
  ON project_users(user_id);

CREATE INDEX IF NOT EXISTS idx_project_users_project
  ON project_users(project_id);

-- Index for daily reports by project and date
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date
  ON daily_reports(project_id, report_date DESC);

-- Index for tasks by project
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
  ON tasks(project_id, status)
  WHERE deleted_at IS NULL;

-- =============================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- =============================================

-- Update table statistics for query planner
ANALYZE workflow_items;
ANALYZE punch_items;
ANALYZE documents;
ANALYZE projects;
ANALYZE workflow_types;
ANALYZE project_users;
ANALYZE daily_reports;
ANALYZE tasks;
