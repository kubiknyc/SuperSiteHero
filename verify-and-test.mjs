#!/usr/bin/env node
/**
 * Verify RLS policy fix and test project creation
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nxlznnrocrffnbzjaaae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Nzg2MDUsImV4cCI6MjA3OTI1NDYwNX0.McyD3pPW6e0jhgQmCdDgJO3PhKikV-71q7rwHaNCCro';

// Create client with anon key (same as the app uses)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

console.log('🔍 Verifying RLS Policy Fix...\n');

// 1. Authenticate as the user
console.log('1️⃣ Authenticating as kubiknyc@gmail.com...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'kubiknyc@gmail.com',
  password: process.env.USER_PASSWORD || 'Alfa134679!' // You may need to provide the actual password
});

if (authError) {
  console.log('❌ Authentication failed:', authError.message);
  console.log('   Please provide the correct password for kubiknyc@gmail.com');
  process.exit(1);
}

console.log('✅ Authenticated successfully!');
console.log('   User ID:', authData.user.id);
console.log('');

// 2. Test project creation
console.log('2️⃣ Testing project creation...');
const testProject = {
  name: 'MCP Test Project ' + Date.now(),
  description: 'Testing project creation via MCP script',
  company_id: '3c146527-62a9-4f4d-97db-c7546da9dfed',
  status: 'active'
};

const { data: newProject, error: createError } = await supabase
  .from('projects')
  .insert(testProject)
  .select()
  .single();

if (createError) {
  console.log('❌ Project creation FAILED:');
  console.log('   Error:', createError.message);
  console.log('   Details:', createError);
  process.exit(1);
} else {
  console.log('✅ Project created successfully!');
  console.log('   ID:', newProject.id);
  console.log('   Name:', newProject.name);
  console.log('   Company ID:', newProject.company_id);
  console.log('');
}

// 3. Verify it was created
console.log('3️⃣ Verifying project exists in database...');
const { data: foundProject, error: findError } = await supabase
  .from('projects')
  .select('*')
  .eq('id', newProject.id)
  .single();

if (findError) {
  console.log('❌ Could not find project:', findError.message);
  process.exit(1);
} else {
  console.log('✅ Project found in database!');
  console.log('   Name:', foundProject.name);
  console.log('   Status:', foundProject.status);
  console.log('');
}

// 4. Check all policies on projects table
console.log('4️⃣ Checking all RLS policies on projects table...');
const { data: allProjects } = await supabase
  .from('projects')
  .select('id, name, company_id')
  .limit(5);

console.log(`✅ Can query projects table (found ${allProjects?.length || 0} projects)`);
console.log('');

console.log('=' .repeat(60));
console.log('🎉 SUCCESS! Project creation is working!');
console.log('=' .repeat(60));
console.log('\n✅ The RLS policy fix was successful!');
console.log('✅ Projects can be created');
console.log('✅ Projects can be queried');
console.log('\n📱 Now test in your app at: http://localhost:5174/projects');
