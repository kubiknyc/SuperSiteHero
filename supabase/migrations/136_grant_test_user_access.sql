-- ============================================
-- GRANT TEST USER ACCESS TO SEEDED DATA
-- Migration: 136_grant_test_user_access.sql
-- Purpose: Allow test user to access seeded test data
-- ============================================
--
-- This migration:
-- 1. Associates test user with the seeded company
-- 2. Adds test user to all projects in the seeded company
-- 3. Enables test user to view/edit all seeded data via existing RLS policies
--
-- The seeded company ID is: 3c146527-62a9-4f4d-97db-c7546da9dfed
-- The test user email is: test@example.com
-- ============================================

-- =============================================
-- STEP 1: Update test user's company_id
-- =============================================
DO $$
DECLARE
  v_test_user_id UUID;
  v_company_id UUID := '3c146527-62a9-4f4d-97db-c7546da9dfed';
BEGIN
  -- Get test user ID
  SELECT id INTO v_test_user_id
  FROM users
  WHERE email = 'test@example.com'
  LIMIT 1;

  IF v_test_user_id IS NOT NULL THEN
    -- Update test user to belong to seeded company
    UPDATE users
    SET company_id = v_company_id,
        updated_at = NOW()
    WHERE id = v_test_user_id;

    RAISE NOTICE 'Updated test user % to company %', v_test_user_id, v_company_id;
  ELSE
    RAISE NOTICE 'Test user with email test@example.com not found';
  END IF;
END $$;

-- =============================================
-- STEP 2: Add test user to all seeded projects
-- =============================================
DO $$
DECLARE
  v_test_user_id UUID;
  v_company_id UUID := '3c146527-62a9-4f4d-97db-c7546da9dfed';
  v_project RECORD;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Get test user ID
  SELECT id INTO v_test_user_id
  FROM users
  WHERE email = 'test@example.com'
  LIMIT 1;

  IF v_test_user_id IS NOT NULL THEN
    -- Add test user to all projects in the seeded company
    FOR v_project IN
      SELECT id FROM projects WHERE company_id = v_company_id
    LOOP
      -- Insert into project_users if not already exists
      INSERT INTO project_users (project_id, user_id, role, can_edit, can_delete)
      VALUES (v_project.id, v_test_user_id, 'superintendent', true, true)
      ON CONFLICT (project_id, user_id) DO NOTHING;

      v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RAISE NOTICE 'Added test user to % projects', v_inserted_count;
  ELSE
    RAISE NOTICE 'Test user with email test@example.com not found';
  END IF;
END $$;

-- =============================================
-- VERIFICATION QUERIES (commented out)
-- =============================================
-- To verify the migration worked, run these queries:
--
-- -- Check test user's company:
-- SELECT id, email, company_id FROM users WHERE email = 'test@example.com';
--
-- -- Check test user's project assignments:
-- SELECT pu.project_id, p.name, pu.role, pu.can_edit
-- FROM project_users pu
-- JOIN projects p ON p.id = pu.project_id
-- JOIN users u ON u.id = pu.user_id
-- WHERE u.email = 'test@example.com';
--
-- -- Check accessible RFIs:
-- SELECT COUNT(*) FROM workflow_items
-- WHERE project_id IN (
--   SELECT project_id FROM project_users
--   WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
-- );
-- ============================================
