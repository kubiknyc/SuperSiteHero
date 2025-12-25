-- ============================================================================
-- APPROVAL WORKFLOW TEST SETUP
-- ============================================================================
-- This script creates a complete test scenario for the user approval workflow
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create Test Company
-- ============================================================================

INSERT INTO companies (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Company ABC',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Verify company created
SELECT 'Company created:' as step, id, name FROM companies 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- STEP 2: Create Owner/Admin User (Auto-Approved)
-- ============================================================================

-- First, create auth user for admin
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'admin@testcompany.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Admin","last_name":"User"}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Create profile for admin (approved)
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  company_id,
  role,
  is_active,
  approval_status,
  approved_at,
  approved_by,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'admin@testcompany.com',
  'Admin',
  'User',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  true,
  'approved',
  now(),
  '00000000-0000-0000-0000-000000000010',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  is_active = true,
  approval_status = 'approved';

-- Verify admin created
SELECT 'Admin user created:' as step, id, email, role, approval_status 
FROM users WHERE id = '00000000-0000-0000-0000-000000000010';

-- ============================================================================
-- STEP 3: Create Pending User (Needs Approval)
-- ============================================================================

-- First, create auth user for pending user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000000',
  'pending@testcompany.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Pending","last_name":"User"}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Create profile for pending user (not approved)
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  company_id,
  role,
  is_active,
  approval_status,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  'pending@testcompany.com',
  'Pending',
  'User',
  '00000000-0000-0000-0000-000000000001',
  'field_employee',
  false,
  'pending',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  is_active = false,
  approval_status = 'pending',
  approved_at = NULL,
  approved_by = NULL;

-- Verify pending user created
SELECT 'Pending user created:' as step, id, email, role, approval_status, is_active
FROM users WHERE id = '00000000-0000-0000-0000-000000000020';

-- ============================================================================
-- VERIFICATION: Check Complete Setup
-- ============================================================================

SELECT 
  '=== TEST SETUP COMPLETE ===' as status,
  (SELECT COUNT(*) FROM companies WHERE id = '00000000-0000-0000-0000-000000000001') as company_count,
  (SELECT COUNT(*) FROM users WHERE id = '00000000-0000-0000-0000-000000000010' AND approval_status = 'approved') as admin_count,
  (SELECT COUNT(*) FROM users WHERE id = '00000000-0000-0000-0000-000000000020' AND approval_status = 'pending') as pending_count;

-- Show summary
SELECT 
  c.name as company,
  u.email,
  u.first_name || ' ' || u.last_name as name,
  u.role,
  u.approval_status,
  u.is_active
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.id IN ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020')
ORDER BY u.created_at;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- After running this script, you can:
-- 1. Test the approve-user function with pending user ID: 00000000-0000-0000-0000-000000000020
-- 2. Admin user ID for approval: 00000000-0000-0000-0000-000000000010
-- 3. Use the PowerShell script to test approval
-- ============================================================================
