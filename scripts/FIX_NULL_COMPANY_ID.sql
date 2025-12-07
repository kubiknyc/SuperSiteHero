-- =============================================
-- FIX NULL COMPANY_ID - THE REAL ISSUE
-- =============================================
-- The error shows: null value in column "company_id"
-- This means your user record has company_id = NULL
-- =============================================

-- STEP 1: Check current user state
SELECT
  '=== CURRENT USER STATE ===' as info,
  id,
  email,
  role,
  company_id,
  is_active
FROM users
WHERE id = auth.uid();

-- STEP 2: Check available companies
SELECT
  '=== AVAILABLE COMPANIES ===' as info,
  id,
  name,
  slug,
  is_active
FROM companies
ORDER BY created_at ASC;

-- STEP 3: Fix your user record
-- Update your user to use the first available company
UPDATE users
SET
  company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1),
  is_active = true,
  updated_at = NOW()
WHERE id = auth.uid()
RETURNING id, email, role, company_id, is_active;

-- STEP 4: Verify fix
SELECT
  '=== AFTER FIX ===' as info,
  u.id,
  u.email,
  u.role,
  u.company_id,
  c.name as company_name,
  u.is_active
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();

-- STEP 5: Now test project creation
INSERT INTO projects (
  company_id,
  name,
  project_number,
  status,
  weather_units,
  features_enabled,
  created_by
) VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'TEST - DELETE ME',
  'TEST-001',
  'planning',
  'imperial',
  '{"daily_reports": true}'::jsonb,
  auth.uid()
) RETURNING id, name, project_number, company_id;

-- STEP 6: Clean up test project
DELETE FROM projects WHERE name = 'TEST - DELETE ME';

-- STEP 7: Final verification
SELECT '=== SUCCESS! User company_id is fixed ===' as result;
SELECT 'Now refresh your browser (F5) and try creating a project' as next_step;
