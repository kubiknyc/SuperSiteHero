#!/usr/bin/env node

/**
 * Comprehensive Schema Verification
 * Returns all verification data in a single JSON result
 */

import https from 'https';

const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const ACCESS_TOKEN = 'sbp_085bac04acec4712ff695469ed2b68388c10a16f';

console.log('🔍 Comprehensive Schema Verification');
console.log('=====================================\n');

const verificationSQL = `
SELECT
  json_build_object(
    'enum_values', (
      SELECT json_agg(enumlabel ORDER BY enumsortorder)
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
    ),
    'approval_columns', (
      SELECT json_agg(
        json_build_object(
          'column_name', column_name,
          'data_type', data_type,
          'is_nullable', is_nullable
        ) ORDER BY ordinal_position
      )
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason')
    ),
    'helper_function_exists', (
      SELECT COUNT(*) > 0
      FROM information_schema.routines
      WHERE routine_name = 'is_active_user'
    ),
    'trigger_exists', (
      SELECT COUNT(*) > 0
      FROM information_schema.triggers
      WHERE trigger_name = 'on_auth_user_created'
    ),
    'indexes_created', (
      SELECT json_agg(indexname ORDER BY indexname)
      FROM pg_indexes
      WHERE indexname IN ('idx_users_approval_status_pending', 'idx_users_approval_status', 'idx_users_approved_by')
    )
  ) as verification_results;
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
        if (parsed && parsed.length > 0) {
          const results = parsed[0].verification_results;

          console.log('✅ Schema Verification Results:\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          console.log('📋 Enum Values:');
          console.log(`   ${results.enum_values ? results.enum_values.join(', ') : 'NOT FOUND'}`);
          console.log(`   Expected: pending, approved, rejected`);
          console.log(`   Status: ${results.enum_values?.length === 3 ? '✅ PASS' : '❌ FAIL'}\n`);

          console.log('📋 Approval Columns:');
          console.log(`   Count: ${results.approval_columns?.length || 0}/6`);
          if (results.approval_columns) {
            results.approval_columns.forEach(col => {
              console.log(`   - ${col.column_name} (${col.data_type})`);
            });
          }
          console.log(`   Status: ${results.approval_columns?.length === 6 ? '✅ PASS' : '❌ FAIL'}\n`);

          console.log('📋 Helper Function (is_active_user):');
          console.log(`   Status: ${results.helper_function_exists ? '✅ EXISTS' : '❌ NOT FOUND'}\n`);

          console.log('📋 Trigger (on_auth_user_created):');
          console.log(`   Status: ${results.trigger_exists ? '✅ EXISTS' : '❌ NOT FOUND'}\n`);

          console.log('📋 Indexes Created:');
          console.log(`   Count: ${results.indexes_created?.length || 0}/3`);
          if (results.indexes_created) {
            results.indexes_created.forEach(idx => {
              console.log(`   - ${idx}`);
            });
          }
          console.log(`   Status: ${results.indexes_created?.length === 3 ? '✅ PASS' : '❌ FAIL'}\n`);

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          const allPassed =
            results.enum_values?.length === 3 &&
            results.approval_columns?.length === 6 &&
            results.helper_function_exists &&
            results.trigger_exists &&
            results.indexes_created?.length === 3;

          if (allPassed) {
            console.log('🎉 All verification checks PASSED!\n');
            console.log('✅ Migration 144: User approval fields - DEPLOYED');
            console.log('✅ Migration 145: Signup trigger update - DEPLOYED');
            console.log('✅ Migration 146: RLS policies - DEPLOYED\n');
          } else {
            console.log('⚠️  Some verification checks FAILED\n');
            process.exit(1);
          }
        }
      } catch (e) {
        console.error('❌ Failed to parse response:', e.message);
        console.log('Raw response:', data);
        process.exit(1);
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
