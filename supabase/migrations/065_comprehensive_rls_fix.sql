-- Migration: 065_comprehensive_rls_fix.sql
-- Comprehensive fix for RLS policies using SECURITY DEFINER functions to avoid recursion
-- This fixes punch_items, workflow_types, approval_requests, and other tables

-- =============================================
-- STEP 1: Create helper functions (SECURITY DEFINER to bypass RLS)
-- =============================================

-- Function to get user's company_id without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to get user's project IDs without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_project_ids(user_uuid UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(project_id), ARRAY[]::UUID[])
  FROM public.project_users
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to check if user has access to a project
CREATE OR REPLACE FUNCTION public.user_has_project_access(user_uuid UUID, proj_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_company UUID;
  project_company UUID;
BEGIN
  -- Check direct project_users membership
  IF EXISTS (SELECT 1 FROM public.project_users WHERE user_id = user_uuid AND project_id = proj_id) THEN
    RETURN TRUE;
  END IF;

  -- Check company-level access
  SELECT company_id INTO user_company FROM public.users WHERE id = user_uuid;
  SELECT company_id INTO project_company FROM public.projects WHERE id = proj_id;

  RETURN user_company IS NOT NULL AND user_company = project_company;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- STEP 2: Fix punch_items RLS policies
-- =============================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view punch items for their projects" ON punch_items;
DROP POLICY IF EXISTS "Users can create punch items for their projects" ON punch_items;
DROP POLICY IF EXISTS "Users can update punch items for their projects" ON punch_items;
DROP POLICY IF EXISTS "Users can delete punch items for their projects" ON punch_items;
DROP POLICY IF EXISTS "punch_items_select_policy" ON punch_items;
DROP POLICY IF EXISTS "punch_items_insert_policy" ON punch_items;
DROP POLICY IF EXISTS "punch_items_update_policy" ON punch_items;
DROP POLICY IF EXISTS "punch_items_delete_policy" ON punch_items;

-- Create simplified policies using helper function
CREATE POLICY "punch_items_select" ON punch_items
    FOR SELECT USING (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "punch_items_insert" ON punch_items
    FOR INSERT WITH CHECK (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "punch_items_update" ON punch_items
    FOR UPDATE USING (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "punch_items_delete" ON punch_items
    FOR DELETE USING (public.user_has_project_access(auth.uid(), project_id));

-- =============================================
-- STEP 3: Fix workflow_types RLS policies
-- =============================================

DROP POLICY IF EXISTS "Users can view workflow types for their company" ON workflow_types;
DROP POLICY IF EXISTS "Admins can manage workflow types" ON workflow_types;
DROP POLICY IF EXISTS "workflow_types_select_policy" ON workflow_types;
DROP POLICY IF EXISTS "workflow_types_all_policy" ON workflow_types;

CREATE POLICY "workflow_types_select" ON workflow_types
    FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "workflow_types_all" ON workflow_types
    FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));

-- =============================================
-- STEP 4: Fix workflow_items RLS policies
-- =============================================

DROP POLICY IF EXISTS "Users can view workflow items for their projects" ON workflow_items;
DROP POLICY IF EXISTS "Users can manage workflow items for their projects" ON workflow_items;
DROP POLICY IF EXISTS "workflow_items_select_policy" ON workflow_items;
DROP POLICY IF EXISTS "workflow_items_all_policy" ON workflow_items;

CREATE POLICY "workflow_items_select" ON workflow_items
    FOR SELECT USING (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "workflow_items_all" ON workflow_items
    FOR ALL USING (public.user_has_project_access(auth.uid(), project_id));

-- =============================================
-- STEP 5: Fix daily_reports RLS policies
-- =============================================

DROP POLICY IF EXISTS "Users can view daily reports for their projects" ON daily_reports;
DROP POLICY IF EXISTS "Users can create daily reports for their projects" ON daily_reports;
DROP POLICY IF EXISTS "Users can update daily reports for their projects" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_select_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_update_policy" ON daily_reports;

CREATE POLICY "daily_reports_select" ON daily_reports
    FOR SELECT USING (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "daily_reports_insert" ON daily_reports
    FOR INSERT WITH CHECK (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "daily_reports_update" ON daily_reports
    FOR UPDATE USING (public.user_has_project_access(auth.uid(), project_id));

-- =============================================
-- STEP 6: Fix subcontractors RLS policies
-- =============================================

DROP POLICY IF EXISTS "Users can view subcontractors for their projects" ON subcontractors;
DROP POLICY IF EXISTS "Users can manage subcontractors for their projects" ON subcontractors;
DROP POLICY IF EXISTS "subcontractors_select_policy" ON subcontractors;
DROP POLICY IF EXISTS "subcontractors_all_policy" ON subcontractors;

CREATE POLICY "subcontractors_select" ON subcontractors
    FOR SELECT USING (public.user_has_project_access(auth.uid(), project_id));

CREATE POLICY "subcontractors_all" ON subcontractors
    FOR ALL USING (public.user_has_project_access(auth.uid(), project_id));

-- =============================================
-- STEP 7: Fix approval_requests and related tables
-- =============================================

-- approval_workflows
DROP POLICY IF EXISTS "approval_workflows_select" ON approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_all" ON approval_workflows;

CREATE POLICY "approval_workflows_select" ON approval_workflows
    FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "approval_workflows_all" ON approval_workflows
    FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));

-- approval_requests
DROP POLICY IF EXISTS "approval_requests_select" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_all" ON approval_requests;

CREATE POLICY "approval_requests_select" ON approval_requests
    FOR SELECT USING (
        initiated_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM approval_workflows aw
            WHERE aw.id = approval_requests.workflow_id
            AND aw.company_id = public.get_user_company_id(auth.uid())
        )
    );

CREATE POLICY "approval_requests_all" ON approval_requests
    FOR ALL USING (
        initiated_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM approval_workflows aw
            WHERE aw.id = approval_requests.workflow_id
            AND aw.company_id = public.get_user_company_id(auth.uid())
        )
    );

-- approval_steps
DROP POLICY IF EXISTS "approval_steps_select" ON approval_steps;
DROP POLICY IF EXISTS "approval_steps_all" ON approval_steps;

CREATE POLICY "approval_steps_select" ON approval_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM approval_workflows aw
            WHERE aw.id = approval_steps.workflow_id
            AND aw.company_id = public.get_user_company_id(auth.uid())
        )
    );

-- =============================================
-- STEP 8: Ensure project has company_id set properly
-- =============================================

-- Update projects without company_id to use the creator's company
UPDATE projects p
SET company_id = (SELECT company_id FROM users WHERE id = p.created_by)
WHERE p.company_id IS NULL AND p.created_by IS NOT NULL;

-- =============================================
-- STEP 9: Seed default workflow_types if missing
-- =============================================

-- Ensure each company has default workflow types
INSERT INTO workflow_types (company_id, name_singular, name_plural, prefix, is_default, has_cost_impact, has_schedule_impact, requires_approval, statuses)
SELECT
    c.id,
    'RFI',
    'RFIs',
    'RFI',
    true,
    true,
    true,
    false,
    '[{"name": "Draft", "color": "#gray"}, {"name": "Submitted", "color": "#blue"}, {"name": "Answered", "color": "#green"}, {"name": "Closed", "color": "#gray"}]'::jsonb
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_types wt
    WHERE wt.company_id = c.id AND wt.name_singular = 'RFI'
)
ON CONFLICT DO NOTHING;

INSERT INTO workflow_types (company_id, name_singular, name_plural, prefix, is_default, has_cost_impact, has_schedule_impact, requires_approval, statuses)
SELECT
    c.id,
    'Submittal',
    'Submittals',
    'SUB',
    true,
    false,
    true,
    true,
    '[{"name": "Draft", "color": "#gray"}, {"name": "Submitted", "color": "#blue"}, {"name": "Under Review", "color": "#yellow"}, {"name": "Approved", "color": "#green"}, {"name": "Rejected", "color": "#red"}]'::jsonb
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_types wt
    WHERE wt.company_id = c.id AND wt.name_singular = 'Submittal'
)
ON CONFLICT DO NOTHING;

INSERT INTO workflow_types (company_id, name_singular, name_plural, prefix, is_default, has_cost_impact, has_schedule_impact, requires_approval, statuses)
SELECT
    c.id,
    'Change Order',
    'Change Orders',
    'CO',
    true,
    true,
    true,
    true,
    '[{"name": "Draft", "color": "#gray"}, {"name": "Pending", "color": "#yellow"}, {"name": "Approved", "color": "#green"}, {"name": "Rejected", "color": "#red"}]'::jsonb
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_types wt
    WHERE wt.company_id = c.id AND wt.name_singular = 'Change Order'
)
ON CONFLICT DO NOTHING;

-- =============================================
-- STEP 10: Grant execute permissions on helper functions
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_project_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_project_access(UUID, UUID) TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 065 completed successfully';
    RAISE NOTICE 'Created helper functions: get_user_company_id, get_user_project_ids, user_has_project_access';
    RAISE NOTICE 'Fixed RLS policies for: punch_items, workflow_types, workflow_items, daily_reports, subcontractors, approval_requests';
END $$;
