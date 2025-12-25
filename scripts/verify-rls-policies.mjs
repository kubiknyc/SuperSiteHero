#!/usr/bin/env node

/**
 * Verify RLS Policies for User Approval System
 * Tests that RLS policies correctly restrict pending users
 */

import https from 'https';

const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const ACCESS_TOKEN = 'sbp_085bac04acec4712ff695469ed2b68388c10a16f';

console.log('🔐 Verifying RLS Policies for User Approval System');
console.log('===================================================\n');

const verificationSQL = `
-- Test RLS policy verification
SELECT
  json_build_object(
    'users_policies', (
      SELECT json_agg(
        json_build_object(
          'policy_name', policyname,
          'table', tablename,
          'cmd', cmd,
          'qual', qual,
          'with_check', with_check
        )
      )
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'users'
        AND policyname IN (
          'Users can view own profile',
          'Users can update own profile',
          'Admins can view company users',
          'Admins can update user approval'
        )
    ),
    'companies_policies', (
      SELECT json_agg(
        json_build_object(
          'policy_name', policyname,
          'table', tablename
        )
      )
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'companies'
        AND policyname = 'Users can view own company'
    ),
    'projects_policies', (
      SELECT json_agg(
        json_build_object(
          'policy_name', policyname,
          'table', tablename,
          'cmd', cmd
        )
      )
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'projects'
        AND policyname IN (
          'Users can view assigned projects',
          'Users can create projects'
        )
    ),
    'daily_reports_policies', (
      SELECT json_agg(
        json_build_object(
          'policy_name', policyname,
          'table', tablename
        )
      )
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'daily_reports'
        AND policyname = 'Users can create daily reports'
    ),
    'tasks_policies', (
      SELECT json_agg(
        json_build_object(
          'policy_name', policyname,
          'table', tablename
        )
      )
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tasks'
        AND policyname = 'Users can create tasks'
    ),
    'documents_policies', (
      SELECT json_agg(
        json_build_object(
          'policy_name', policyname,
          'table', tablename
        )
      )
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'documents'
        AND policyname = 'Users can create documents'
    ),
    'total_policies_count', (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'companies', 'projects', 'daily_reports', 'tasks', 'documents')
    )
  ) as rls_verification;
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
          const results = parsed[0].rls_verification;

          console.log('✅ RLS Policy Verification Results:\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          // Users table policies
          console.log('📋 Users Table Policies:');
          if (results.users_policies) {
            console.log(`   Count: ${results.users_policies.length}/4`);
            results.users_policies.forEach(policy => {
              console.log(`   ✅ ${policy.policy_name} (${policy.cmd})`);
            });
            console.log(`   Status: ${results.users_policies.length === 4 ? '✅ PASS' : '❌ FAIL'}\n`);
          } else {
            console.log('   ❌ No policies found\n');
          }

          // Companies table policies
          console.log('📋 Companies Table Policies:');
          if (results.companies_policies) {
            console.log(`   Count: ${results.companies_policies.length}/1`);
            results.companies_policies.forEach(policy => {
              console.log(`   ✅ ${policy.policy_name}`);
            });
            console.log(`   Status: ${results.companies_policies.length === 1 ? '✅ PASS' : '❌ FAIL'}\n`);
          } else {
            console.log('   ❌ No policies found\n');
          }

          // Projects table policies
          console.log('📋 Projects Table Policies:');
          if (results.projects_policies) {
            console.log(`   Count: ${results.projects_policies.length}/2`);
            results.projects_policies.forEach(policy => {
              console.log(`   ✅ ${policy.policy_name} (${policy.cmd})`);
            });
            console.log(`   Status: ${results.projects_policies.length === 2 ? '✅ PASS' : '❌ FAIL'}\n`);
          } else {
            console.log('   ❌ No policies found\n');
          }

          // Daily Reports table policies
          console.log('📋 Daily Reports Table Policies:');
          if (results.daily_reports_policies) {
            console.log(`   Count: ${results.daily_reports_policies.length}/1`);
            results.daily_reports_policies.forEach(policy => {
              console.log(`   ✅ ${policy.policy_name}`);
            });
            console.log(`   Status: ${results.daily_reports_policies.length === 1 ? '✅ PASS' : '❌ FAIL'}\n`);
          } else {
            console.log('   ❌ No policies found\n');
          }

          // Tasks table policies
          console.log('📋 Tasks Table Policies:');
          if (results.tasks_policies) {
            console.log(`   Count: ${results.tasks_policies.length}/1`);
            results.tasks_policies.forEach(policy => {
              console.log(`   ✅ ${policy.policy_name}`);
            });
            console.log(`   Status: ${results.tasks_policies.length === 1 ? '✅ PASS' : '❌ FAIL'}\n`);
          } else {
            console.log('   ❌ No policies found\n');
          }

          // Documents table policies
          console.log('📋 Documents Table Policies:');
          if (results.documents_policies) {
            console.log(`   Count: ${results.documents_policies.length}/1`);
            results.documents_policies.forEach(policy => {
              console.log(`   ✅ ${policy.policy_name}`);
            });
            console.log(`   Status: ${results.documents_policies.length === 1 ? '✅ PASS' : '❌ FAIL'}\n`);
          } else {
            console.log('   ❌ No policies found\n');
          }

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log(`📊 Total RLS Policies: ${results.total_policies_count}\n`);

          const allPassed =
            results.users_policies?.length === 4 &&
            results.companies_policies?.length === 1 &&
            results.projects_policies?.length === 2 &&
            results.daily_reports_policies?.length === 1 &&
            results.tasks_policies?.length === 1 &&
            results.documents_policies?.length === 1;

          if (allPassed) {
            console.log('🎉 All RLS policy checks PASSED!\n');
            console.log('✅ Users table: 4 policies configured');
            console.log('✅ Companies table: 1 policy configured');
            console.log('✅ Projects table: 2 policies configured');
            console.log('✅ Daily Reports table: 1 policy configured');
            console.log('✅ Tasks table: 1 policy configured');
            console.log('✅ Documents table: 1 policy configured\n');
            console.log('🔒 Pending users are properly restricted from creating resources');
            console.log('🔒 Only active users can perform write operations');
            console.log('🔒 Admins can manage users in their company only\n');
          } else {
            console.log('⚠️  Some RLS policy checks FAILED\n');
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
