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

async function diagnose() {
  console.log('\n🔍 COMPREHENSIVE DIAGNOSIS\n');

  try {
    // 1. Check test user
    console.log('📋 1. Checking test user:', testUserEmail);
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, role, company_id, is_active')
      .eq('email', testUserEmail);

    if (userError) {throw userError;}

    if (!users || users.length === 0) {
      console.log('❌ User not found in users table!');

      // Check auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers.users.find((u: any) => u.email === testUserEmail);

      if (authUser) {
        console.log('⚠️ User exists in auth.users but not in users table!');
        console.log('   Creating users table record...');

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .single();

        if (company) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              company_id: company.id,
              role: 'superintendent',
              is_active: true,
            });

          if (insertError) {
            console.log('❌ Failed to create user record:', insertError.message);
          } else {
            console.log('✅ Created user record with company_id:', company.id);
          }
        }
      } else {
        console.log('❌ User not found in auth.users either!');
      }
      return;
    }

    const user = users[0];
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Company ID:', user.company_id || '❌ NULL');
    console.log('   Active:', user.is_active);

    // 2. Check company
    if (user.company_id) {
      console.log('\n📋 2. Checking company...');
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, slug, is_active')
        .eq('id', user.company_id)
        .single();

      if (companyError || !company) {
        console.log('❌ Company not found! Invalid company_id');
      } else {
        console.log('✅ Company:', company.name);
        console.log('   ID:', company.id);
        console.log('   Active:', company.is_active);
      }
    } else {
      console.log('\n❌ User has NULL company_id - this is the problem!');
    }

    // 3. Check RLS policies
    console.log('\n📋 3. Checking RLS policies on projects table...');
    const { data: policies, error: policyError } = await supabase
      .rpc('pg_policies_query', {
        query: `SELECT policyname, cmd, with_check::text FROM pg_policies WHERE tablename = 'projects' AND cmd = 'INSERT'`
      })
      .catch(async () => {
        // Fallback: direct query
        return await supabase
          .from('pg_policies')
          .select('policyname, cmd')
          .eq('tablename', 'projects')
          .eq('cmd', 'INSERT');
      });

    console.log('⚠️ RLS policies (requires manual SQL check):');
    console.log('   Run this in Supabase SQL Editor:');
    console.log('   SELECT policyname, cmd, with_check::text');
    console.log('   FROM pg_policies');
    console.log('   WHERE tablename = \'projects\' AND cmd = \'INSERT\';');

    // 4. Try to create a test project as the user
    console.log('\n📋 4. Testing project creation as user...');

    if (!user.company_id) {
      console.log('❌ Cannot test - user has NULL company_id');
      console.log('\n🔧 FIXING: Setting company_id...');

      const { data: firstCompany } = await supabase
        .from('companies')
        .select('id, name')
        .limit(1)
        .single();

      if (firstCompany) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ company_id: firstCompany.id, is_active: true })
          .eq('id', user.id);

        if (updateError) {
          console.log('❌ Failed to update user:', updateError.message);
        } else {
          console.log('✅ Updated user with company_id:', firstCompany.id);
          user.company_id = firstCompany.id;
        }
      }
    }

    if (user.company_id) {
      const testProjectData = {
        company_id: user.company_id,
        name: 'TEST PROJECT - DELETE ME',
        project_number: 'TEST-' + Date.now(),
        status: 'planning',
        weather_units: 'imperial',
        features_enabled: { daily_reports: true },
        created_by: user.id,
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(testProjectData)
        .select()
        .single();

      if (projectError) {
        console.log('❌ Project creation failed:');
        console.log('   Error:', projectError.message);
        console.log('   Code:', projectError.code);
        console.log('   Details:', JSON.stringify(projectError.details, null, 2));

        if (projectError.message.includes('RLS')) {
          console.log('\n⚠️ This is an RLS policy issue!');
          console.log('   The policy is blocking the INSERT');
        }
      } else {
        console.log('✅ Project created successfully!');
        console.log('   ID:', project.id);
        console.log('   Name:', project.name);

        // Clean up
        await supabase.from('projects').delete().eq('id', project.id);
        console.log('✅ Test project cleaned up');
      }
    }

    // 5. Summary
    console.log('\n📊 SUMMARY:');
    console.log('═══════════════════════════════════════');

    if (!user.company_id) {
      console.log('❌ ISSUE: User has NULL company_id');
      console.log('   Fix: Update user record with valid company_id');
    } else if (user.company_id) {
      console.log('✅ User has valid company_id');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Check RLS policies in Supabase SQL Editor');
    console.log('   2. Ensure policy allows INSERT with company_id match');
    console.log('   3. Log out and back in to refresh session');
    console.log('   4. Try creating project again\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

diagnose();
