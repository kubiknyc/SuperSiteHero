-- ============================================================================
-- COMBINED USER APPROVAL SYSTEM MIGRATIONS
-- ============================================================================
-- This file combines migrations 144, 145, and 146 for easy manual application
-- Execute this entire script in Supabase SQL Editor to apply all changes at once
-- ============================================================================

-- ============================================================================
-- MIGRATION 144: Add User Approval System
-- ============================================================================
-- Description: Adds approval_status enum and related fields to users table

-- Add approval status enum type
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval-related columns to users table
ALTER TABLE users
  ADD COLUMN approval_status approval_status DEFAULT 'approved' NOT NULL,
  ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN rejected_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT;

-- Add comment to approval_status column
COMMENT ON COLUMN users.approval_status IS 'User approval status: pending (awaiting admin approval), approved (full access granted), rejected (access denied)';

-- Add indexes for performance
CREATE INDEX idx_users_approval_status_pending ON users(company_id, created_at)
  WHERE approval_status = 'pending' AND deleted_at IS NULL;

CREATE INDEX idx_users_approval_status ON users(approval_status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_users_approved_by ON users(approved_by)
  WHERE approved_by IS NOT NULL AND deleted_at IS NULL;

-- Update existing users to have 'approved' status (backward compatibility)
UPDATE users
SET
  approval_status = 'approved',
  approved_at = created_at,
  approved_by = id -- Self-approved for existing users
WHERE approval_status IS NULL OR approved_at IS NULL;

-- Add check constraint for data consistency
ALTER TABLE users
  ADD CONSTRAINT check_approval_consistency
    CHECK (
      (approval_status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL) OR
      (approval_status = 'rejected' AND rejected_at IS NOT NULL AND rejected_by IS NOT NULL) OR
      (approval_status = 'pending' AND approved_at IS NULL AND rejected_at IS NULL)
    );

COMMENT ON CONSTRAINT check_approval_consistency ON users IS 'Ensures approval/rejection fields are set consistently with approval_status';

RAISE NOTICE 'Migration 144 completed: Added approval system fields';

-- ============================================================================
-- MIGRATION 145: Update Signup Trigger for Approval Flow
-- ============================================================================
-- Description: Modifies handle_new_user() trigger to implement approval workflow

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with approval workflow logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_company_id UUID;
  new_company_name TEXT;
  company_exists BOOLEAN := FALSE;
  is_first_user BOOLEAN := FALSE;
  new_approval_status approval_status;
  new_is_active BOOLEAN;
  new_role VARCHAR(50);
BEGIN
  -- Extract company name from metadata or use email domain
  new_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 2)
  );

  -- Trim whitespace for consistent matching
  new_company_name := TRIM(new_company_name);

  -- Check if company exists (case-insensitive, trimmed)
  SELECT id INTO default_company_id
  FROM companies
  WHERE LOWER(TRIM(name)) = LOWER(new_company_name)
  LIMIT 1;

  IF default_company_id IS NULL THEN
    -- Company doesn't exist - create it
    company_exists := FALSE;
    INSERT INTO companies (name, slug, subscription_tier)
    VALUES (
      new_company_name,
      LOWER(REGEXP_REPLACE(new_company_name, '[^a-zA-Z0-9]', '-', 'g')),
      'free'
    )
    RETURNING id INTO default_company_id;

    is_first_user := TRUE;
    RAISE NOTICE 'Created new company: % (id: %)', new_company_name, default_company_id;
  ELSE
    -- Company exists
    company_exists := TRUE;
    is_first_user := FALSE;
    RAISE NOTICE 'User joining existing company: % (id: %)', new_company_name, default_company_id;
  END IF;

  -- Determine approval status, is_active, and role based on whether company is new
  IF company_exists THEN
    -- Existing company - requires admin approval
    new_approval_status := 'pending';
    new_is_active := FALSE;
    new_role := 'field_employee';
    RAISE NOTICE 'User % requires approval (existing company)', NEW.email;
  ELSE
    -- New company - immediate access as owner/admin
    new_approval_status := 'approved';
    new_is_active := TRUE;
    new_role := 'owner';
    RAISE NOTICE 'User % approved automatically (new company owner)', NEW.email;
  END IF;

  -- Insert user profile with approval workflow fields
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    company_id,
    role,
    is_active,
    approval_status,
    approved_at,
    approved_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    default_company_id,
    new_role,
    new_is_active,
    new_approval_status,
    CASE WHEN new_approval_status = 'approved' THEN NOW() ELSE NULL END,
    CASE WHEN new_approval_status = 'approved' THEN NEW.id ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
    company_id = COALESCE(EXCLUDED.company_id, users.company_id),
    approval_status = EXCLUDED.approval_status,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RAISE NOTICE 'Created user profile for: % (company: %, status: %, active: %)',
    NEW.email, default_company_id, new_approval_status, new_is_active;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE 'Migration 145 completed: Updated signup trigger with approval workflow';

-- ============================================================================
-- MIGRATION 146: Update RLS Policies for Pending Users
-- ============================================================================
-- Description: Updates RLS policies to handle pending users appropriately

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view company users" ON users;
CREATE POLICY "Admins can view company users" ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Admins can update user approval" ON users;
CREATE POLICY "Admins can update user approval" ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
  );

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND deleted_at IS NULL
    )
  );

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
CREATE POLICY "Users can view assigned projects" ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
    AND (
      id IN (
        SELECT project_id FROM project_users
        WHERE user_id = auth.uid()
      )
      OR
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE
        AND deleted_at IS NULL
        AND company_id = projects.company_id
    )
  );

-- ============================================================================
-- DAILY REPORTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can create daily reports" ON daily_reports;
CREATE POLICY "Users can create daily reports" ON daily_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
    AND
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TASKS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
  );

-- ============================================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents" ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
    AND
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- CREATE HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND is_active = TRUE
      AND deleted_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

COMMENT ON FUNCTION public.is_active_user() IS 'Returns true if the current authenticated user is active (approved and not deleted)';

RAISE NOTICE 'Migration 146 completed: Updated RLS policies for pending users';

-- ============================================================================
-- MARK MIGRATIONS AS APPLIED
-- ============================================================================

INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES
  ('144', '144_add_user_approval_system.sql', ARRAY[]::text[]),
  ('145', '145_update_signup_trigger_for_approval.sql', ARRAY[]::text[]),
  ('146', '146_update_rls_for_pending_users.sql', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  enum_count INT;
  column_count INT;
  policy_count INT;
BEGIN
  -- Count approval_status enum values
  SELECT COUNT(*) INTO enum_count
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status');

  -- Count approval columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'users'
    AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason');

  -- Count updated policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('users', 'companies', 'projects', 'daily_reports', 'tasks', 'documents');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL MIGRATIONS COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Approval status enum values: %', enum_count;
  RAISE NOTICE 'Approval columns added: %', column_count;
  RAISE NOTICE 'RLS policies updated: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'System Status:';
  RAISE NOTICE '  ✓ Migration 144: Approval fields added';
  RAISE NOTICE '  ✓ Migration 145: Signup trigger updated';
  RAISE NOTICE '  ✓ Migration 146: RLS policies updated';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Deploy edge functions';
  RAISE NOTICE '  2. Test new company registration';
  RAISE NOTICE '  3. Test existing company registration';
  RAISE NOTICE '========================================';
END $$;
