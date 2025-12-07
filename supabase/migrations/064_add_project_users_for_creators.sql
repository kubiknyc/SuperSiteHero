-- Migration: Auto-add project creators to project_users table
-- This ensures users can access projects they create

-- Add trigger to automatically add project creator to project_users
CREATE OR REPLACE FUNCTION public.add_project_creator_to_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator to project_users if not already there
  INSERT INTO public.project_users (
    project_id,
    user_id,
    project_role,
    can_edit,
    can_delete,
    can_approve
  )
  VALUES (
    NEW.id,
    NEW.created_by,
    'admin',
    true,
    true,
    true
  )
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't block project creation
    RAISE WARNING 'Failed to add project creator to project_users: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_project_created_add_user ON projects;
CREATE TRIGGER on_project_created_add_user
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION public.add_project_creator_to_users();

-- Backfill: Add existing project creators to project_users
INSERT INTO project_users (project_id, user_id, project_role, can_edit, can_delete, can_approve)
SELECT
  p.id,
  p.created_by,
  'admin',
  true,
  true,
  true
FROM projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id = p.id AND pu.user_id = p.created_by
  );

-- Also fix RLS for subcontractors table (punch_items references it)
DROP POLICY IF EXISTS "Users can view subcontractors for their projects" ON subcontractors;
CREATE POLICY "Users can view subcontractors for their projects" ON subcontractors
    FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage subcontractors for their projects" ON subcontractors;
CREATE POLICY "Users can manage subcontractors for their projects" ON subcontractors
    FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );
