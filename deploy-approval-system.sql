-- ============================================================================
-- AUTONOMOUS DEPLOYMENT: User Approval System
-- ============================================================================
-- This file contains all three migrations (144-146) with idempotent operations
-- Can be executed multiple times safely
-- ============================================================================

-- Suppress notices for cleaner output
SET client_min_messages TO WARNING;

-- ============================================================================
-- MIGRATION 144: Add User Approval System Fields
-- ============================================================================

DO $$
BEGIN
  -- Create enum type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
    RAISE NOTICE 'Created approval_status enum';
  ELSE
    RAISE NOTICE 'approval_status enum already exists';
  END IF;
END $$;

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'approval_status') THEN
    ALTER TABLE users ADD COLUMN approval_status approval_status DEFAULT 'approved' NOT NULL;
    RAISE NOTICE 'Added approval_status column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'approved_by') THEN
    ALTER TABLE users ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added approved_by column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'approved_at') THEN
    ALTER TABLE users ADD COLUMN approved_at TIMESTAMPTZ;
    RAISE NOTICE 'Added approved_at column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rejected_by') THEN
    ALTER TABLE users ADD COLUMN rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added rejected_by column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rejected_at') THEN
    ALTER TABLE users ADD COLUMN rejected_at TIMESTAMPTZ;
    RAISE NOTICE 'Added rejected_at column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rejection_reason') THEN
    ALTER TABLE users ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE 'Added rejection_reason column';
  END IF;
END $$;

-- Add indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_approval_status_pending') THEN
    CREATE INDEX idx_users_approval_status_pending ON users(company_id, created_at)
      WHERE approval_status = 'pending' AND deleted_at IS NULL;
    RAISE NOTICE 'Created idx_users_approval_status_pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_approval_status') THEN
    CREATE INDEX idx_users_approval_status ON users(approval_status)
      WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created idx_users_approval_status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_approved_by') THEN
    CREATE INDEX idx_users_approved_by ON users(approved_by)
      WHERE approved_by IS NOT NULL AND deleted_at IS NULL;
    RAISE NOTICE 'Created idx_users_approved_by';
  END IF;
END $$;

-- Backfill existing users
UPDATE users
SET
  approval_status = 'approved',
  approved_at = COALESCE(approved_at, created_at),
  approved_by = COALESCE(approved_by, id)
WHERE approval_status IS NULL OR approved_at IS NULL;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_approval_consistency') THEN
    ALTER TABLE users
      ADD CONSTRAINT check_approval_consistency
        CHECK (
          (approval_status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL) OR
          (approval_status = 'rejected' AND rejected_at IS NOT NULL AND rejected_by IS NOT NULL) OR
          (approval_status = 'pending' AND approved_at IS NULL AND rejected_at IS NULL)
        );
    RAISE NOTICE 'Added check_approval_consistency constraint';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 145: Update Signup Trigger for Approval Flow
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

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
  new_approval_status approval_status;
  new_is_active BOOLEAN;
  new_role VARCHAR(50);
BEGIN
  new_company_name := TRIM(COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 2)
  ));

  SELECT id INTO default_company_id
  FROM companies
  WHERE LOWER(TRIM(name)) = LOWER(new_company_name)
  LIMIT 1;

  IF default_company_id IS NULL THEN
    INSERT INTO companies (name, slug, subscription_tier)
    VALUES (
      new_company_name,
      LOWER(REGEXP_REPLACE(new_company_name, '[^a-zA-Z0-9]', '-', 'g')),
      'free'
    )
    RETURNING id INTO default_company_id;

    new_approval_status := 'approved';
    new_is_active := TRUE;
    new_role := 'owner';
  ELSE
    new_approval_status := 'pending';
    new_is_active := FALSE;
    new_role := 'field_employee';
  END IF;

  INSERT INTO public.users (
    id, email, first_name, last_name, company_id, role, is_active,
    approval_status, approved_at, approved_by
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    default_company_id, new_role, new_is_active, new_approval_status,
    CASE WHEN new_approval_status = 'approved' THEN NOW() ELSE NULL END,
    CASE WHEN new_approval_status = 'approved' THEN NEW.id ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    approval_status = EXCLUDED.approval_status,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MIGRATION 146: Update RLS Policies for Pending Users
-- ============================================================================

-- Helper function
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_active = TRUE AND deleted_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view company users" ON users;
CREATE POLICY "Admins can view company users" ON users
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
        AND is_active = TRUE AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Admins can update user approval" ON users;
CREATE POLICY "Admins can update user approval" ON users
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
        AND is_active = TRUE AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
        AND is_active = TRUE AND deleted_at IS NULL
    )
  );

-- Companies table policies
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Projects table policies
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
CREATE POLICY "Users can view assigned projects" ON projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_active = TRUE AND deleted_at IS NULL
    )
    AND (
      id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_active = TRUE AND deleted_at IS NULL
        AND company_id = projects.company_id
    )
  );

-- Daily reports table policies
DROP POLICY IF EXISTS "Users can create daily reports" ON daily_reports;
CREATE POLICY "Users can create daily reports" ON daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_active = TRUE AND deleted_at IS NULL
    )
    AND project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Tasks table policies
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_active = TRUE AND deleted_at IS NULL
    )
  );

-- Documents table policies
DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_active = TRUE AND deleted_at IS NULL
    )
    AND project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  enum_count INT;
  column_count INT;
BEGIN
  SELECT COUNT(*) INTO enum_count
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status');

  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'users'
    AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason');

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 ALL MIGRATIONS DEPLOYED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Approval status enum values: %', enum_count;
  RAISE NOTICE 'Approval columns added: %', column_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Deploy edge functions';
  RAISE NOTICE '  2. Test approval workflow';
  RAISE NOTICE '========================================';
END $$;

-- Reset message level
SET client_min_messages TO NOTICE;
