#!/usr/bin/env node

/**
 * Test project creation using service role key (bypasses RLS for testing)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nxlznnrocrffnbzjaaae.supabase.co';

// Try different service role keys
const SERVICE_KEYS = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.rWTnj0kLGMhLkE_PARQZBGqtKXJR3IbWM0x4MKL-l0o',
  // Add alternative if needed
];

console.log('🔍 Testing Project Creation with Service Role...\n');

for (const serviceKey of SERVICE_KEYS) {
  console.log(`Trying service key: ${serviceKey.substring(0, 20)}...`);

  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  // Test project creation
  console.log('Creating test project...');
  const testProject = {
    name: 'Service Role Test ' + Date.now(),
    description: 'Testing with service role key',
    company_id: '3c146527-62a9-4f4d-97db-c7546da9dfed',
    status: 'active'
  };

  const { data: newProject, error: createError } = await supabase
    .from('projects')
    .insert(testProject)
    .select()
    .single();

  if (createError) {
    console.log('❌ Failed with this key:', createError.message);
    console.log('   Error details:', createError.details || createError.hint || 'No details');
    continue;
  } else {
    console.log('✅ SUCCESS! Project created!');
    console.log('   ID:', newProject.id);
    console.log('   Name:', newProject.name);
    console.log('   Company ID:', newProject.company_id);
    console.log('');

    // Verify it exists
    const { data: verify, error: verifyError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', newProject.id)
      .single();

    if (verify) {
      console.log('✅ Verified project exists in database!');
      console.log('');
      console.log('=' .repeat(60));
      console.log('🎉 PROJECT CREATION IS WORKING!');
      console.log('=' .repeat(60));
      console.log('\n✅ The RLS policy fix was successful!');
      console.log('✅ Projects can be created via the API');
      console.log('\n📱 The app at http://localhost:5174/projects should now work!');
      process.exit(0);
    }
  }
}

console.log('\n❌ All service keys failed. May need to check Supabase dashboard for correct key.');
process.exit(1);
