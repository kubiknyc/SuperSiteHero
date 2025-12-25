#!/usr/bin/env node
/**
 * Complete Database Wipe Script
 * Deletes all users from authentication and all data from the database
 * WARNING: This is irreversible!
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('\nPlease set these environment variables and try again.');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚨 COMPLETE DATABASE WIPE STARTING...\n');

async function deleteAllUsers() {
  console.log('📋 Step 1: Fetching all users from auth...');

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error fetching users:', listError);
    return;
  }

  console.log(`📊 Found ${users.length} users to delete\n`);

  if (users.length === 0) {
    console.log('✅ No users to delete from authentication');
    return;
  }

  console.log('🗑️  Step 2: Deleting users from authentication...');
  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`   ❌ Failed to delete ${user.email}:`, error.message);
        errorCount++;
      } else {
        console.log(`   ✓ Deleted: ${user.email}`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error deleting ${user.email}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Auth deletion summary:`);
  console.log(`   ✅ Successfully deleted: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
}

async function truncateAllTables() {
  console.log('\n🗑️  Step 3: Truncating all database tables...');

  const tables = [
    // Core tables
    'users',
    'companies',
    'projects',

    // Feature tables
    'daily_reports',
    'tasks',
    'rfis',
    'submittals',
    'punch_lists',
    'safety_incidents',
    'documents',
    'meetings',
    'change_orders',
    'inspections',
    'equipment',
    'weather_logs',
    'toolbox_talks',
    'site_instructions',
    'workflows',
    'notices',
    'permits',
    'material_receiving',
    'lien_waivers',
    'payment_applications',
    'transmittals',
    'bid_packages',
    'cost_estimates',
    'schedules',
    'schedule_activities',
    'checklists',
    'checklist_templates',
    'checklist_executions',

    // Related data
    'photos',
    'videos',
    'attachments',
    'comments',
    'notifications',
    'audit_logs',

    // Settings and config
    'user_settings',
    'project_settings',
    'company_settings',
    'roles',
    'permissions',
    'distribution_lists',
    'approval_workflows',
    'report_templates'
  ];

  console.log(`   Found ${tables.length} tables to truncate\n`);

  for (const table of tables) {
    try {
      // Delete all records from the table
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

      if (error && !error.message.includes('does not exist')) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else if (error && error.message.includes('does not exist')) {
        // Table doesn't exist, skip silently
      } else {
        console.log(`   ✓ ${table}: cleared`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${table}: ${err.message}`);
    }
  }
}

async function executeRawSQL() {
  console.log('\n🗑️  Step 4: Running raw SQL cleanup...');

  const sql = `
    -- Delete from auth tables
    DELETE FROM auth.users;
    DELETE FROM auth.sessions;
    DELETE FROM auth.refresh_tokens;

    -- Delete from storage
    DELETE FROM storage.objects;
    DELETE FROM storage.buckets WHERE id NOT IN ('avatars');

    -- Truncate all public tables (this handles foreign keys properly)
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename != 'schema_migrations'
      ) LOOP
        BEGIN
          EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Could not truncate %', r.tablename;
        END;
      END LOOP;
    END $$;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.log('   ⚠️  SQL execution may require manual run in SQL editor');
      console.log('   Error:', error.message);
    } else {
      console.log('   ✓ Raw SQL cleanup completed');
    }
  } catch (err) {
    console.log('   ⚠️  SQL execution requires service role access');
  }
}

async function verifyDeletion() {
  console.log('\n📊 Step 5: Verifying deletion...\n');

  // Check auth users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  console.log(`   Auth users remaining: ${users?.length || 0}`);

  // Check public.users
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  console.log(`   Database users remaining: ${userCount || 0}`);

  // Check companies
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  console.log(`   Companies remaining: ${companyCount || 0}`);

  // Check projects
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  console.log(`   Projects remaining: ${projectCount || 0}`);
}

async function main() {
  try {
    await deleteAllUsers();
    await truncateAllTables();
    await verifyDeletion();

    console.log('\n✅ DATABASE WIPE COMPLETED!\n');
    console.log('⚠️  Note: If any records remain, run the SQL script in Supabase SQL Editor:');
    console.log('   File: delete-all-users-and-data.sql\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
