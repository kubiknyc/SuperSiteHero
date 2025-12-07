import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const testUserEmail = process.env.TEST_USER_EMAIL!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fixInvalidCompany() {
  console.log('\n🔧 FIXING INVALID COMPANY_ID\n');

  try {
    // 1. Get the user
    const { data: users } = await supabase
      .from('users')
      .select('id, email, company_id')
      .eq('email', testUserEmail);

    if (!users || users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users[0];
    console.log('User:', user.email);
    console.log('Current company_id:', user.company_id);

    // 2. Check if company exists
    if (user.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', user.company_id)
        .single();

      if (company) {
        console.log('✅ Company exists:', company.name);
        console.log('No fix needed!');
        return;
      } else {
        console.log('❌ Company does not exist! This is the problem.');
      }
    }

    // 3. Find or create a valid company
    console.log('\n📋 Finding valid company...');
    let { data: companies } = await supabase
      .from('companies')
      .select('id, name, slug')
      .limit(1);

    if (!companies || companies.length === 0) {
      console.log('⚠️ No companies exist. Creating one...');

      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'My Construction Company',
          slug: 'my-construction-company',
          email: testUserEmail,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Failed to create company:', createError.message);
        return;
      }

      companies = [newCompany];
      console.log('✅ Created company:', newCompany.name);
    }

    const validCompany = companies[0];
    console.log('✅ Using company:', validCompany.name, `(${validCompany.id})`);

    // 4. Update user with valid company_id
    console.log('\n📋 Updating user...');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        company_id: validCompany.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.log('❌ Failed to update user:', updateError.message);
      return;
    }

    console.log('✅ Updated user with valid company_id');

    // 5. Test project creation
    console.log('\n📋 Testing project creation...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        company_id: validCompany.id,
        name: 'TEST - DELETE ME',
        project_number: 'TEST-' + Date.now(),
        status: 'planning',
        weather_units: 'imperial',
        features_enabled: { daily_reports: true },
        created_by: user.id,
      })
      .select()
      .single();

    if (projectError) {
      console.log('❌ Project creation failed:', projectError.message);
      console.log('   This is likely an RLS policy issue');
      console.log('\n📋 Checking RLS policies...');
      console.log('   Run this SQL in Supabase:');
      console.log(`
SELECT policyname, cmd, with_check::text
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';
      `);
    } else {
      console.log('✅ Project created successfully!');
      console.log('   ID:', project.id);
      console.log('   Name:', project.name);

      // Clean up
      await supabase.from('projects').delete().eq('id', project.id);
      console.log('✅ Test project cleaned up');
    }

    console.log('\n🎉 FIX COMPLETE!');
    console.log('\n📝 Next steps:');
    console.log('   1. Log out of the application');
    console.log('   2. Log back in (to refresh cached user profile)');
    console.log('   3. Try creating a project');
    console.log('   4. If still failing, check RLS policies with SQL above\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

fixInvalidCompany();
