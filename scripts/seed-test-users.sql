-- ===========================================
-- Test Users Seeding Script
-- ===========================================
--
-- This script creates test user profiles for different roles.
-- NOTE: Auth users must be created FIRST in Supabase Auth dashboard.
--
-- Steps:
-- 1. Create users in Supabase Auth dashboard (Authentication > Users > Add user)
-- 2. Copy the UUIDs from the created users
-- 3. Replace the placeholder UUIDs below with actual UUIDs
-- 4. Run this script in SQL Editor
--
-- Test User Emails and Passwords:
-- --------------------------------
-- superintendent@test.supersitehero.com  / TestSuper123!
-- pm@test.supersitehero.com              / TestPM123!
-- admin@test.supersitehero.com           / TestAdmin123!
-- field@test.supersitehero.com           / TestField123!
-- subcontractor@test.supersitehero.com   / TestSub123!
-- architect@test.supersitehero.com       / TestArch123!
-- client@test.supersitehero.com          / TestClient123!
-- owner@test.supersitehero.com           / TestOwner123!
-- ===========================================

-- Step 1: Create test company (if not exists)
INSERT INTO companies (id, name, slug, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Test Construction Co',
  'test-company',
  '{"timezone": "America/New_York", "currency": "USD", "date_format": "MM/DD/YYYY"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id;

-- Get the company ID for use below
-- If you already have a company, replace this with your company_id
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE slug = 'test-company' LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company not found. Please create the company first.';
  END IF;

  RAISE NOTICE 'Using company_id: %', v_company_id;
END $$;

-- ===========================================
-- IMPORTANT: Replace these placeholder UUIDs with actual UUIDs
-- from auth.users AFTER creating users in Supabase Auth dashboard
-- ===========================================

-- To get user IDs after creating auth users, run:
-- SELECT id, email FROM auth.users WHERE email LIKE '%@test.supersitehero.com';

-- Step 2: Insert user profiles
-- Replace 'PUT-UUID-HERE' with actual UUIDs from auth.users

/*
-- Uncomment and update these after creating auth users:

-- Superintendent (Full access)
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'superintendent@test.supersitehero.com',
  'Sarah',
  'Superintendent',
  'superintendent',
  '555-001-0001',
  true
FROM auth.users WHERE email = 'superintendent@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'superintendent';

-- Project Manager
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'pm@test.supersitehero.com',
  'Paul',
  'ProjectManager',
  'project_manager',
  '555-001-0002',
  true
FROM auth.users WHERE email = 'pm@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'project_manager';

-- Office Admin
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'admin@test.supersitehero.com',
  'Amy',
  'OfficeAdmin',
  'office_admin',
  '555-001-0003',
  true
FROM auth.users WHERE email = 'admin@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'office_admin';

-- Field Employee
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'field@test.supersitehero.com',
  'Frank',
  'FieldEmployee',
  'field_employee',
  '555-001-0004',
  true
FROM auth.users WHERE email = 'field@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'field_employee';

-- Subcontractor
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'subcontractor@test.supersitehero.com',
  'Steve',
  'Subcontractor',
  'subcontractor',
  '555-001-0005',
  true
FROM auth.users WHERE email = 'subcontractor@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'subcontractor';

-- Architect
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'architect@test.supersitehero.com',
  'Alice',
  'Architect',
  'architect',
  '555-001-0006',
  true
FROM auth.users WHERE email = 'architect@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'architect';

-- Client (Owner/Client Portal Access)
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'client@test.supersitehero.com',
  'Charlie',
  'Client',
  'client',
  '555-001-0007',
  true
FROM auth.users WHERE email = 'client@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'client';

-- Owner (using client role for portal access)
INSERT INTO users (id, company_id, email, first_name, last_name, role, phone, is_active)
SELECT
  id,
  (SELECT id FROM companies WHERE slug = 'test-company'),
  'owner@test.supersitehero.com',
  'Oliver',
  'Owner',
  'client',
  '555-001-0008',
  true
FROM auth.users WHERE email = 'owner@test.supersitehero.com'
ON CONFLICT (id) DO UPDATE SET role = 'client';

*/

-- ===========================================
-- Step 3: Assign users to projects
-- Run this AFTER creating user profiles
-- ===========================================

/*
-- Assign all test users to all company projects with role-appropriate permissions
INSERT INTO project_users (project_id, user_id, project_role, can_edit, can_delete, can_approve)
SELECT
  p.id as project_id,
  u.id as user_id,
  u.role as project_role,
  CASE
    WHEN u.role IN ('superintendent', 'project_manager', 'office_admin', 'field_employee', 'architect') THEN true
    ELSE false
  END as can_edit,
  CASE
    WHEN u.role IN ('superintendent', 'project_manager', 'office_admin') THEN true
    ELSE false
  END as can_delete,
  CASE
    WHEN u.role IN ('superintendent', 'project_manager', 'architect') THEN true
    ELSE false
  END as can_approve
FROM projects p
CROSS JOIN users u
WHERE p.company_id = (SELECT id FROM companies WHERE slug = 'test-company')
  AND u.company_id = (SELECT id FROM companies WHERE slug = 'test-company')
  AND u.email LIKE '%@test.supersitehero.com'
ON CONFLICT (project_id, user_id) DO NOTHING;
*/

-- ===========================================
-- Verification Queries
-- ===========================================

-- Check all test users
SELECT
  u.id,
  u.email,
  u.first_name || ' ' || u.last_name as full_name,
  u.role,
  u.is_active,
  c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email LIKE '%@test.supersitehero.com'
ORDER BY u.role;

-- Check user project assignments
SELECT
  u.email,
  u.role,
  COUNT(pu.project_id) as project_count
FROM users u
LEFT JOIN project_users pu ON u.id = pu.user_id
WHERE u.email LIKE '%@test.supersitehero.com'
GROUP BY u.id, u.email, u.role
ORDER BY u.role;

-- Summary of roles
SELECT
  role,
  COUNT(*) as count
FROM users
WHERE email LIKE '%@test.supersitehero.com'
GROUP BY role
ORDER BY role;
