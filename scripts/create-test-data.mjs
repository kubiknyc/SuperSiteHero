#!/usr/bin/env node

/**
 * Create Test Data for User Approval System
 * Sets up test companies and users with different approval statuses
 */

import https from 'https';

const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const ACCESS_TOKEN = 'sbp_085bac04acec4712ff695469ed2b68388c10a16f';

console.log('🧪 Creating Test Data for User Approval System');
console.log('================================================\n');

const testDataSQL = `
-- Create test data for user approval workflow
DO $$
DECLARE
  test_company_id UUID;
  admin_user_id UUID;
  pending_user_id UUID;
  rejected_user_id UUID;
BEGIN
  -- Check if test company already exists
  SELECT id INTO test_company_id
  FROM companies
  WHERE name = 'Test Company - Approval System'
  LIMIT 1;

  -- Create test company if it doesn't exist
  IF test_company_id IS NULL THEN
    INSERT INTO companies (name, slug, subscription_tier)
    VALUES (
      'Test Company - Approval System',
      'test-company-approval-system',
      'free'
    )
    RETURNING id INTO test_company_id;

    RAISE NOTICE 'Created test company: %', test_company_id;
  ELSE
    RAISE NOTICE 'Test company already exists: %', test_company_id;
  END IF;

  -- Create admin user (approved, active, owner)
  SELECT id INTO admin_user_id
  FROM users
  WHERE email = 'admin-test@approvaltest.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    INSERT INTO users (
      email, first_name, last_name, company_id, role, is_active,
      approval_status, approved_at, approved_by
    )
    VALUES (
      'admin-test@approvaltest.com',
      'Admin',
      'User',
      test_company_id,
      'owner',
      true,
      'approved',
      NOW(),
      gen_random_uuid() -- Self-approved
    )
    RETURNING id INTO admin_user_id;

    -- Update approved_by to self
    UPDATE users SET approved_by = id WHERE id = admin_user_id;

    RAISE NOTICE 'Created admin user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user already exists: %', admin_user_id;
  END IF;

  -- Create pending user (pending approval)
  SELECT id INTO pending_user_id
  FROM users
  WHERE email = 'pending-test@approvaltest.com'
  LIMIT 1;

  IF pending_user_id IS NULL THEN
    INSERT INTO users (
      email, first_name, last_name, company_id, role, is_active,
      approval_status, approved_at, approved_by
    )
    VALUES (
      'pending-test@approvaltest.com',
      'Pending',
      'User',
      test_company_id,
      'field_employee',
      false,
      'pending',
      NULL,
      NULL
    )
    RETURNING id INTO pending_user_id;

    RAISE NOTICE 'Created pending user: %', pending_user_id;
  ELSE
    RAISE NOTICE 'Pending user already exists: %', pending_user_id;
  END IF;

  -- Create rejected user (for testing rejection workflow)
  SELECT id INTO rejected_user_id
  FROM users
  WHERE email = 'rejected-test@approvaltest.com'
  LIMIT 1;

  IF rejected_user_id IS NULL THEN
    INSERT INTO users (
      email, first_name, last_name, company_id, role, is_active,
      approval_status, rejected_at, rejected_by, rejection_reason
    )
    VALUES (
      'rejected-test@approvaltest.com',
      'Rejected',
      'User',
      test_company_id,
      'field_employee',
      false,
      'rejected',
      NOW(),
      admin_user_id,
      'Test rejection - User did not meet requirements'
    )
    RETURNING id INTO rejected_user_id;

    RAISE NOTICE 'Created rejected user: %', rejected_user_id;
  ELSE
    RAISE NOTICE 'Rejected user already exists: %', rejected_user_id;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Test Data Created Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Company ID: %', test_company_id;
  RAISE NOTICE 'Admin User ID: %', admin_user_id;
  RAISE NOTICE 'Pending User ID: %', pending_user_id;
  RAISE NOTICE 'Rejected User ID: %', rejected_user_id;
  RAISE NOTICE '========================================';
END $$;

-- Query and display test data
SELECT
  u.id,
  u.email,
  u.first_name || ' ' || u.last_name as full_name,
  u.role,
  u.is_active,
  u.approval_status,
  u.approved_at,
  u.rejected_at,
  u.rejection_reason,
  c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE c.name = 'Test Company - Approval System'
ORDER BY
  CASE u.approval_status
    WHEN 'approved' THEN 1
    WHEN 'pending' THEN 2
    WHEN 'rejected' THEN 3
  END,
  u.created_at;
`;

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'apikey': ACCESS_TOKEN
  }
};

const requestBody = JSON.stringify({ query: testDataSQL });

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const parsed = JSON.parse(data);

        console.log('✅ Test Data Creation Results:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (parsed && parsed.length > 0) {
          console.log('📋 Test Users Created:\n');
          console.table(parsed.map(user => ({
            'Email': user.email,
            'Name': user.full_name,
            'Role': user.role,
            'Active': user.is_active,
            'Status': user.approval_status,
            'Approved': user.approved_at ? '✅' : '❌',
            'Rejected': user.rejected_at ? '✅' : '❌'
          })));
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎉 Test data setup complete!\n');
        console.log('Test Scenarios Available:');
        console.log('  1. ✅ Admin User (approved, owner, active)');
        console.log('  2. ⏳ Pending User (pending approval, field_employee, inactive)');
        console.log('  3. ❌ Rejected User (rejected, field_employee, inactive)\n');
        console.log('Company: Test Company - Approval System\n');
        console.log('You can now test:');
        console.log('  - Pending user approval workflow');
        console.log('  - Admin approval/rejection actions');
        console.log('  - RLS policy restrictions');
        console.log('  - Email notifications (when configured)\n');

      } catch (e) {
        console.error('❌ Failed to parse response:', e.message);
        console.log('Raw response:', data.substring(0, 500));
      }
    } else {
      console.error('❌ Test data creation failed');
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(requestBody);
req.end();
