// Diagnostic utility to check auth state and user profile
// Run this in browser console: import('/src/utils/diagnose-auth.ts').then(m => m.diagnoseAuth())

import { supabase } from '@/lib/supabase';

export async function diagnoseAuth() {
  console.log('\n🔍 AUTH DIAGNOSTICS\n');

  // 1. Check session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('❌ Session error:', sessionError);
    return;
  }

  if (!session) {
    console.log('❌ No active session');
    return;
  }

  console.log('✅ Session active');
  console.log('   User ID:', session.user.id);
  console.log('   Email:', session.user.email);
  console.log('   Token expires:', new Date(session.expires_at! * 1000).toLocaleString());

  // 2. Check user record
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, role, company_id, is_active')
    .eq('id', session.user.id)
    .single();

  if (userError) {
    console.error('❌ User record error:', userError);
    return;
  }

  if (!user) {
    console.log('❌ No user record found in users table');
    return;
  }

  console.log('\n✅ User record:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   Company ID:', user.company_id || '❌ NULL');
  console.log('   Active:', user.is_active);

  // 3. Check company
  if (user.company_id) {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, slug, subscription_status')
      .eq('id', user.company_id)
      .single();

    if (companyError) {
      console.error('❌ Company error:', companyError);
    } else if (!company) {
      console.log('❌ Company not found - invalid company_id!');
    } else {
      console.log('\n✅ Company:');
      console.log('   ID:', company.id);
      console.log('   Name:', company.name);
      console.log('   Status:', company.subscription_status || 'active');
    }
  } else {
    console.log('\n❌ User has NULL company_id!');
  }

  // 4. Test project creation
  if (user.company_id) {
    console.log('\n📋 Testing project creation...');

    const testProject = {
      company_id: user.company_id,
      name: 'TEST - DIAGNOSTIC - DELETE ME',
      project_number: 'DIAG-' + Date.now(),
      status: 'planning',
      weather_units: 'imperial',
      features_enabled: { daily_reports: true },
      created_by: user.id,
    };

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();

    if (projectError) {
      console.error('❌ Project creation failed:');
      console.error('   Message:', projectError.message);
      console.error('   Code:', projectError.code);
      console.error('   Details:', projectError.details);
      console.error('   Hint:', projectError.hint);

      if (projectError.code === '42501') {
        console.log('\n⚠️ RLS POLICY BLOCKING INSERT');
        console.log('The RLS policy is rejecting your INSERT');
        console.log('Run this SQL in Supabase:');
        console.log(`
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;

CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
        `);
      }
    } else {
      console.log('✅ Project created successfully!');
      console.log('   ID:', project.id);
      console.log('   Name:', project.name);

      // Clean up
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (deleteError) {
        console.log('⚠️ Failed to clean up test project');
      } else {
        console.log('✅ Test project cleaned up');
      }
    }
  }

  console.log('\n✅ DIAGNOSTIC COMPLETE\n');
}

// Auto-run if imported directly
if (typeof window !== 'undefined') {
  (window as any).diagnoseAuth = diagnoseAuth;
  console.log('🔧 Diagnostic loaded! Run: diagnoseAuth()');
}
