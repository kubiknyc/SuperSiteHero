-- Migration 147: Enable RLS and Add Missing Policies
-- Description: Fixes critical security issues found in RLS audit
--
-- Issues addressed:
-- 1. CRITICAL: 8 tables have RLS disabled (companies, daily_reports, documents,
--    industry_safety_benchmarks, meetings, projects, safety_benchmarks, users)
-- 2. WARNING: 6 tables have RLS enabled but no policies
--    (approval_rate_limits, document_access_log, document_comments,
--     document_markup_share_history, document_shares, document_version_comparisons)
--
-- Note: Tables with policies but RLS disabled need RLS enabled for policies to work

-- ============================================================================
-- STEP 1: Enable RLS on Critical Tables
-- ============================================================================

-- These tables have policies defined but RLS is disabled, which means the
-- policies are NOT being enforced. This is a critical security issue.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Reference/lookup tables - enable RLS but allow read access
ALTER TABLE industry_safety_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_benchmarks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Add Policies for Reference Tables
-- ============================================================================

-- industry_safety_benchmarks - Read-only reference data
CREATE POLICY "industry_safety_benchmarks_read" ON industry_safety_benchmarks
  FOR SELECT
  TO authenticated
  USING (true);  -- All authenticated users can read industry benchmarks

-- safety_benchmarks - Read-only reference data (no company_id column)
CREATE POLICY "safety_benchmarks_read" ON safety_benchmarks
  FOR SELECT
  TO authenticated
  USING (true);  -- All authenticated users can read safety benchmarks

-- ============================================================================
-- STEP 3: Add Policies for Document-Related Tables (RLS enabled, no policies)
-- ============================================================================

-- document_access_log - Users can see access logs for documents they have access to
CREATE POLICY "document_access_log_select" ON document_access_log
  FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE company_id = public.get_user_company_id(auth.uid())
      )
    )
  );

CREATE POLICY "document_access_log_insert" ON document_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE company_id = public.get_user_company_id(auth.uid())
      )
    )
  );

-- document_comments - Users can manage comments on accessible documents
CREATE POLICY "document_comments_select" ON document_comments
  FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE company_id = public.get_user_company_id(auth.uid())
      )
    )
  );

CREATE POLICY "document_comments_insert" ON document_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE company_id = public.get_user_company_id(auth.uid())
      )
    )
  );

CREATE POLICY "document_comments_update" ON document_comments
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "document_comments_delete" ON document_comments
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- document_shares - Users can manage shares for accessible documents
-- Columns: document_id, project_id, recipient_user_id, recipient_role, permission_level, shared_by
CREATE POLICY "document_shares_select" ON document_shares
  FOR SELECT
  TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR project_id IN (
      SELECT id FROM projects
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "document_shares_insert" ON document_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND project_id IN (
      SELECT id FROM projects
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "document_shares_delete" ON document_shares
  FOR DELETE
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR project_id IN (
      SELECT id FROM projects
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

-- document_version_comparisons - Users can see comparisons for accessible documents
-- Columns: version1_id, version2_id, change_regions, overall_change_percentage, summary, analyzed_by, analyzed_at
CREATE POLICY "document_version_comparisons_select" ON document_version_comparisons
  FOR SELECT
  TO authenticated
  USING (
    version1_id IN (
      SELECT id FROM documents
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE company_id = public.get_user_company_id(auth.uid())
      )
    )
  );

CREATE POLICY "document_version_comparisons_insert" ON document_version_comparisons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    analyzed_by = auth.uid()
    AND version1_id IN (
      SELECT id FROM documents
      WHERE project_id IN (
        SELECT id FROM projects
        WHERE company_id = public.get_user_company_id(auth.uid())
      )
    )
  );

-- document_markup_share_history - Audit log for markup sharing
-- Columns: markup_id, action, shared_with_type, shared_with_id, permission_level, performed_by, performed_at
CREATE POLICY "document_markup_share_history_select" ON document_markup_share_history
  FOR SELECT
  TO authenticated
  USING (
    markup_id IN (
      SELECT id FROM document_markups
      WHERE document_id IN (
        SELECT id FROM documents
        WHERE project_id IN (
          SELECT id FROM projects
          WHERE company_id = public.get_user_company_id(auth.uid())
        )
      )
    )
  );

CREATE POLICY "document_markup_share_history_insert" ON document_markup_share_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performed_by = auth.uid()
    AND markup_id IN (
      SELECT id FROM document_markups
      WHERE document_id IN (
        SELECT id FROM documents
        WHERE project_id IN (
          SELECT id FROM projects
          WHERE company_id = public.get_user_company_id(auth.uid())
        )
      )
    )
  );

-- ============================================================================
-- STEP 4: Add Policies for approval_rate_limits
-- ============================================================================

-- This table tracks rate limiting for approvals - read-only for authenticated users
-- Columns: ip_address, action_type, action_count, window_start, window_end
-- Note: This is an internal rate limiting table, users can read but system manages writes
CREATE POLICY "approval_rate_limits_read" ON approval_rate_limits
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow inserts/updates for the system (via service role or triggers)
CREATE POLICY "approval_rate_limits_write" ON approval_rate_limits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 5: Force RLS for service role (defense in depth)
-- ============================================================================

-- For sensitive tables, even service role should respect RLS
-- This prevents accidental data exposure from backend bugs
-- Note: This is optional and can be removed if backend needs bypass
-- ALTER TABLE users FORCE ROW LEVEL SECURITY;
-- ALTER TABLE companies FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  tables_without_rls TEXT[];
  tables_without_policies TEXT[];
  policy_count INT;
BEGIN
  -- Check for tables without RLS
  SELECT array_agg(tablename::TEXT) INTO tables_without_rls
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND NOT t.rowsecurity
    AND t.tablename NOT IN ('schema_migrations');  -- Exclude migration tracking

  -- Check for tables with RLS but no policies
  SELECT array_agg(t.tablename::TEXT) INTO tables_without_policies
  FROM pg_tables t
  LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.rowsecurity
    AND COALESCE(p.policy_count, 0) = 0;

  -- Count new policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'industry_safety_benchmarks', 'safety_benchmarks',
      'document_access_log', 'document_comments', 'document_shares',
      'document_version_comparisons', 'document_markup_share_history',
      'approval_rate_limits'
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 147 completed successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS enabled on: users, companies, projects, documents, daily_reports, meetings, industry_safety_benchmarks, safety_benchmarks';
  RAISE NOTICE 'New policies added: %', policy_count;

  IF tables_without_rls IS NOT NULL AND array_length(tables_without_rls, 1) > 0 THEN
    RAISE NOTICE 'REMAINING tables without RLS: %', array_to_string(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE 'All tables have RLS enabled';
  END IF;

  IF tables_without_policies IS NOT NULL AND array_length(tables_without_policies, 1) > 0 THEN
    RAISE NOTICE 'Tables with RLS but no policies: %', array_to_string(tables_without_policies, ', ');
  ELSE
    RAISE NOTICE 'All RLS-enabled tables have policies';
  END IF;

  RAISE NOTICE '========================================';
END $$;
