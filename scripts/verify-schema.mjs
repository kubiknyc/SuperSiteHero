#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Verify User Approval System Schema
 * Executes verification queries via Supabase Management API
 */

import https from 'https';

const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const ACCESS_TOKEN = 'sbp_085bac04acec4712ff695469ed2b68388c10a16f';

console.log('🔍 Verifying User Approval System Schema');
console.log('==========================================\n');

const verificationSQL = `
-- Check enum type exists and has correct values
SELECT enumlabel as approval_status_values
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
ORDER BY enumsortorder;

-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason')
ORDER BY ordinal_position;

-- Check helper function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'is_active_user';

-- Check trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check indexes exist
SELECT indexname
FROM pg_indexes
WHERE indexname IN ('idx_users_approval_status_pending', 'idx_users_approval_status', 'idx_users_approved_by')
ORDER BY indexname;
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

const requestBody = JSON.stringify({ query: verificationSQL });

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
        console.log('✅ Verification Results:\n');
        console.log(JSON.stringify(parsed, null, 2));
        console.log('\n🎉 Schema verification completed successfully!\n');
      } catch (_e) {
        console.log('Response:', data);
      }
    } else {
      console.error('❌ Verification failed');
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
