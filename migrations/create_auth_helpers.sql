-- =====================================================
-- Auth Helper Functions (Public Schema)
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
-- These functions help with auth operations without touching auth schema

-- Function to get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT company_id
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Function to check if user has access to project
CREATE OR REPLACE FUNCTION public.user_has_project_access(project_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.project_assignments
    WHERE user_id = auth.uid()
    AND project_id = project_id_input
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_project_access(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_company_id() IS 'Returns company_id for current authenticated user';
COMMENT ON FUNCTION public.get_user_role() IS 'Returns role for current authenticated user';
COMMENT ON FUNCTION public.user_has_project_access(uuid) IS 'Checks if current user has access to specified project';
