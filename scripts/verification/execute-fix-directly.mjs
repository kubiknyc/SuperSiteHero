#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Execute the project_users RLS fix by running each SQL statement individually
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nxlznnrocrffnbzjaaae.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Nzg2MDUsImV4cCI6MjA3OTI1NDYwNX0.McyD3pPW6e0jhgQmCdDgJO3PhKikV-71q7rwHaNCCro';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

console.log('🔧 Executing RLS Policy Fix for project_users Table\n');
console.log('This will execute the SQL statements in Supabase.');
console.log('Note: May require service role key, so output instructions if fails.\n');

// The SQL statements to execute
const sqlStatements = [
  'DROP POLICY IF EXISTS "Users can view project assignments" ON project_users',
  'DROP POLICY IF EXISTS "Users can view same company project assignments" ON project_users',
  'DROP POLICY IF EXISTS "Company users can view project assignments" ON project_users',
  'DROP POLICY IF EXISTS "Users can manage project assignments" ON project_users',
  'DROP POLICY IF EXISTS "Authorized users can view project assignments" ON project_users',
  `CREATE POLICY "Authenticated users can view project_users" ON project_users FOR SELECT USING (auth.uid() IS NOT NULL)`,
  `CREATE POLICY "Authenticated users can insert project_users" ON project_users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)`,
  `CREATE POLICY "Authenticated users can update project_users" ON project_users FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)`,
  `CREATE POLICY "Authenticated users can delete project_users" ON project_users FOR DELETE USING (auth.uid() IS NOT NULL)`
];

console.log('❌ Cannot execute DDL statements via Supabase client API');
console.log('   RLS policies require direct PostgreSQL access\n');

console.log('=' .repeat(70));
console.log('📋 EXECUTE THESE SQL STATEMENTS IN SUPABASE SQL EDITOR:');
console.log('=' .repeat(70));
console.log('\n🔗 Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new\n');
console.log('📝 Copy and paste this SQL:\n');
console.log('-'.repeat(70));

const fullSQL = sqlStatements.join(';\n\n') + ';';
console.log(fullSQL);

console.log('-'.repeat(70));
console.log('\n✅ After running the SQL, test again with: node automated-test.mjs');
console.log('=' .repeat(70));
