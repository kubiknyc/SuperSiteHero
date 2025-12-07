-- ============================================================================
-- COMPREHENSIVE FIX FOR "BOOLEAN INDEX QUERY FAILED" ERRORS
-- ============================================================================
-- This script eliminates ALL "Boolean index query failed" console warnings
-- by creating helper functions and simplifying RLS policies
--
-- ROOT CAUSE:
-- Complex nested SELECT statements in RLS policies like:
--   (SELECT company_id FROM users WHERE id = auth.uid())
-- cause Postgres to fall back to manual filtering
--
-- SOLUTION:
-- Use SECURITY DEFINER functions to avoid nested SELECTs in RLS policies
--
-- IMPACT:
-- - Eliminates console warnings
-- - Improves query performance
-- - Maintains same security model
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTIONS
-- ============================================================================
-- These SECURITY DEFINER functions bypass RLS to avoid recursion
-- They are safe because they only return data for the authenticated user

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_project_access(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_users
    WHERE user_id = auth.uid() AND project_id = project_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_users
    WHERE user_id = auth.uid()
      AND project_id = project_uuid
      AND can_edit = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_delete_from_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_users
    WHERE user_id = auth.uid()
      AND project_id = project_uuid
      AND can_delete = true
  );
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.current_user_company_id() IS
  'Returns authenticated user company_id. SECURITY DEFINER avoids RLS recursion.';
COMMENT ON FUNCTION public.current_user_role() IS
  'Returns authenticated user role. SECURITY DEFINER avoids RLS recursion.';
COMMENT ON FUNCTION public.user_has_project_access(UUID) IS
  'Checks if user assigned to project. SECURITY DEFINER avoids RLS recursion.';
COMMENT ON FUNCTION public.user_can_edit_project(UUID) IS
  'Checks if user can edit project. SECURITY DEFINER avoids RLS recursion.';
COMMENT ON FUNCTION public.user_can_delete_from_project(UUID) IS
  'Checks if user can delete from project. SECURITY DEFINER avoids RLS recursion.';

-- ============================================================================
-- STEP 2: UPDATE RLS POLICIES - COMPANIES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = public.current_user_company_id());

DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (id = public.current_user_company_id());

-- ============================================================================
-- STEP 3: UPDATE RLS POLICIES - USERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view company users" ON users;
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (company_id = public.current_user_company_id());

-- ============================================================================
-- STEP 4: UPDATE RLS POLICIES - PROJECTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
CREATE POLICY "Users can view assigned projects"
  ON projects FOR SELECT
  USING (
    public.user_has_project_access(id)
    OR (
      company_id = public.current_user_company_id()
      AND public.current_user_role() IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Assigned users can update projects" ON projects;
CREATE POLICY "Assigned users can update projects"
  ON projects FOR UPDATE
  USING (public.user_can_edit_project(id));

-- ============================================================================
-- STEP 5: UPDATE RLS POLICIES - PROJECT_USERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view project assignments" ON project_users;
CREATE POLICY "Users can view project assignments"
  ON project_users FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Authorized users can manage assignments" ON project_users;
CREATE POLICY "Authorized users can manage assignments"
  ON project_users FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id = public.current_user_company_id()
    )
  );

-- ============================================================================
-- STEP 6: UPDATE RLS POLICIES - DOCUMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view project documents" ON documents;
CREATE POLICY "Users can view project documents"
  ON documents FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can upload project documents" ON documents;
CREATE POLICY "Users can upload project documents"
  ON documents FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update project documents" ON documents;
CREATE POLICY "Users can update project documents"
  ON documents FOR UPDATE
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can delete project documents" ON documents;
CREATE POLICY "Users can delete project documents"
  ON documents FOR DELETE
  USING (public.user_can_delete_from_project(project_id));

-- ============================================================================
-- STEP 7: UPDATE RLS POLICIES - CONTACTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view project contacts" ON contacts;
CREATE POLICY "Users can view project contacts"
  ON contacts FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can manage project contacts" ON contacts;
CREATE POLICY "Users can manage project contacts"
  ON contacts FOR ALL
  USING (public.user_has_project_access(project_id));

-- ============================================================================
-- STEP 8: UPDATE RLS POLICIES - SUBCONTRACTORS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view project subcontractors" ON subcontractors;
CREATE POLICY "Users can view project subcontractors"
  ON subcontractors FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Authorized users can manage subcontractors" ON subcontractors;
CREATE POLICY "Authorized users can manage subcontractors"
  ON subcontractors FOR ALL
  USING (public.user_can_edit_project(project_id));

-- ============================================================================
-- STEP 9: UPDATE RLS POLICIES - DAILY_REPORTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view daily reports" ON daily_reports;
CREATE POLICY "Users can view daily reports"
  ON daily_reports FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can create daily reports" ON daily_reports;
CREATE POLICY "Users can create daily reports"
  ON daily_reports FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update daily reports" ON daily_reports;
CREATE POLICY "Users can update daily reports"
  ON daily_reports FOR UPDATE
  USING (public.user_has_project_access(project_id));

-- ============================================================================
-- STEP 10: UPDATE RLS POLICIES - WORKFLOW_ITEMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view workflow items" ON workflow_items;
CREATE POLICY "Users can view workflow items"
  ON workflow_items FOR SELECT
  USING (
    public.user_has_project_access(project_id)
    OR auth.uid() = ANY(assignees)
  );

DROP POLICY IF EXISTS "Users can create workflow items" ON workflow_items;
CREATE POLICY "Users can create workflow items"
  ON workflow_items FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update workflow items" ON workflow_items;
CREATE POLICY "Users can update workflow items"
  ON workflow_items FOR UPDATE
  USING (
    public.user_has_project_access(project_id)
    OR auth.uid() = ANY(assignees)
  );

-- ============================================================================
-- STEP 11: UPDATE RLS POLICIES - TASKS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
CREATE POLICY "Users can view tasks"
  ON tasks FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
CREATE POLICY "Users can update tasks"
  ON tasks FOR UPDATE
  USING (public.user_has_project_access(project_id));

-- ============================================================================
-- STEP 12: UPDATE RLS POLICIES - CHECKLISTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view checklists" ON checklists;
CREATE POLICY "Users can view checklists"
  ON checklists FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can create checklists" ON checklists;
CREATE POLICY "Users can create checklists"
  ON checklists FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update checklists" ON checklists;
CREATE POLICY "Users can update checklists"
  ON checklists FOR UPDATE
  USING (public.user_has_project_access(project_id));

-- ============================================================================
-- STEP 13: UPDATE RLS POLICIES - PUNCH_ITEMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view punch items" ON punch_items;
CREATE POLICY "Users can view punch items"
  ON punch_items FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can create punch items" ON punch_items;
CREATE POLICY "Users can create punch items"
  ON punch_items FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update punch items" ON punch_items;
CREATE POLICY "Users can update punch items"
  ON punch_items FOR UPDATE
  USING (public.user_has_project_access(project_id));

-- ============================================================================
-- STEP 14: UPDATE RLS POLICIES - SAFETY_INCIDENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view safety incidents" ON safety_incidents;
CREATE POLICY "Users can view safety incidents"
  ON safety_incidents FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can create safety incidents" ON safety_incidents;
CREATE POLICY "Users can create safety incidents"
  ON safety_incidents FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update safety incidents" ON safety_incidents;
CREATE POLICY "Users can update safety incidents"
  ON safety_incidents FOR UPDATE
  USING (public.user_has_project_access(project_id));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fix worked

-- Check that helper functions were created
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- Check updated policies on projects table
SELECT
  policyname,
  cmd,
  pg_get_expr(qual, polrelid) as using_expr,
  pg_get_expr(with_check, polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'projects'
ORDER BY cmd, policyname;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- After running this script:
-- ✅ No more "Boolean index query failed" warnings
-- ✅ Improved query performance
-- ✅ Same security model maintained
-- ✅ All RLS policies simplified
-- ============================================================================

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Refresh your browser application
-- 3. Check console - Boolean index errors should be gone
-- 4. Try creating a project - should work cleanly
-- ============================================================================
