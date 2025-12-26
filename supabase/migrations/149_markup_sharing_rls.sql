-- Migration: Markup Sharing RLS Policies
-- Description: Adds RLS policies for shared markup visibility based on sharing settings

-- =============================================
-- UPDATE DOCUMENT MARKUPS SELECT POLICY
-- Users can see markups if:
-- 1. They have access to the project (existing policy)
-- 2. OR the markup is shared with them specifically
-- 3. OR the markup is shared with their role
-- =============================================

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view document markups" ON document_markups;

-- Create new select policy that includes sharing logic
CREATE POLICY "Users can view document markups"
  ON document_markups FOR SELECT
  USING (
    -- User has project access
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
    -- OR markup is explicitly shared with user
    OR (
      is_shared = true
      AND auth.uid() = ANY(shared_with_users)
    )
    -- OR markup is shared with user's role
    OR (
      is_shared = true
      AND EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.user_id = auth.uid()
          AND pu.project_role = ANY(shared_with_roles)
          AND pu.project_id IN (
            SELECT project_id FROM documents WHERE id = document_markups.document_id
          )
      )
    )
  );

-- =============================================
-- ADD UPDATE POLICY FOR MARKUPS
-- Users can update markups if:
-- 1. They created the markup
-- 2. OR they have edit permission on a shared markup
-- =============================================

DROP POLICY IF EXISTS "Users can update own markups" ON document_markups;

CREATE POLICY "Users can update own markups"
  ON document_markups FOR UPDATE
  USING (
    -- User created the markup
    created_by = auth.uid()
    -- OR user has edit/admin permission on shared markup
    OR (
      is_shared = true
      AND permission_level IN ('edit', 'admin')
      AND (
        auth.uid() = ANY(shared_with_users)
        OR EXISTS (
          SELECT 1 FROM project_users pu
          WHERE pu.user_id = auth.uid()
            AND pu.project_role = ANY(shared_with_roles)
            AND pu.project_id IN (
              SELECT project_id FROM documents WHERE id = document_markups.document_id
            )
        )
      )
    )
  )
  WITH CHECK (
    -- Same conditions for the updated row
    created_by = auth.uid()
    OR (
      is_shared = true
      AND permission_level IN ('edit', 'admin')
      AND (
        auth.uid() = ANY(shared_with_users)
        OR EXISTS (
          SELECT 1 FROM project_users pu
          WHERE pu.user_id = auth.uid()
            AND pu.project_role = ANY(shared_with_roles)
            AND pu.project_id IN (
              SELECT project_id FROM documents WHERE id = document_markups.document_id
            )
        )
      )
    )
  );

-- =============================================
-- ADD DELETE POLICY FOR MARKUPS
-- Only the creator can delete a markup
-- =============================================

DROP POLICY IF EXISTS "Users can delete own markups" ON document_markups;

CREATE POLICY "Users can delete own markups"
  ON document_markups FOR DELETE
  USING (
    created_by = auth.uid()
  );

-- =============================================
-- INDEX FOR SHARING PERFORMANCE
-- =============================================

-- Index for checking shared_with_users array containment
CREATE INDEX IF NOT EXISTS idx_document_markups_shared_users
  ON document_markups USING GIN (shared_with_users);

-- Index for checking shared_with_roles array containment
CREATE INDEX IF NOT EXISTS idx_document_markups_shared_roles
  ON document_markups USING GIN (shared_with_roles);

-- Composite index for sharing queries
CREATE INDEX IF NOT EXISTS idx_document_markups_sharing
  ON document_markups (is_shared, permission_level)
  WHERE is_shared = true;
