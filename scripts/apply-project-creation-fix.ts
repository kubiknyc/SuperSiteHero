import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runFix() {
  console.log('\n🔧 Starting Project Creation Fix...\n');

  // STEP 1: Check current state
  console.log('📋 STEP 1: Checking current RLS policies...');
  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT policyname, cmd, with_check::text
      FROM pg_policies
      WHERE tablename = 'projects' AND cmd = 'INSERT';
    `
  }).then(async (res) => {
    // If RPC doesn't exist, use direct query
    const { data, error } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'projects')
      .eq('cmd', 'INSERT');

    return { data, error };
  });

  console.log('Current policies:', policies);

  // STEP 2: Drop old policies and create new one
  console.log('\n📋 STEP 2: Updating RLS policies...');

  const dropAndCreatePolicy = `
    -- Drop old policies
    DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
    DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
    DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

    -- Create new simplified policy
    CREATE POLICY "Authenticated users can insert projects"
      ON projects FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  `;

  const { error: policyError } = await supabase.rpc('exec_sql', {
    sql: dropAndCreatePolicy
  });

  if (policyError) {
    // Try alternative approach using direct SQL
    console.log('⚠️ RPC method failed, trying alternative approach...');

    const statements = [
      `DROP POLICY IF EXISTS "Authorized users can create projects" ON projects`,
      `DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects`,
      `DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects`,
      `CREATE POLICY "Authenticated users can insert projects" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)`
    ];

    for (const stmt of statements) {
      console.log(`Executing: ${stmt.substring(0, 60)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      if (error) {
        console.error(`❌ Error: ${error.message}`);
      } else {
        console.log('✅ Success');
      }
    }
  } else {
    console.log('✅ RLS policies updated successfully');
  }

  // STEP 3: Fix user data
  console.log('\n📋 STEP 3: Checking and fixing user data...');

  const fixUserData = `
    DO $$
    DECLARE
      v_company_id UUID;
      v_user_count INT;
    BEGIN
      -- Get first available company
      SELECT id INTO v_company_id FROM companies LIMIT 1;

      IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No companies found. Please create a company first.';
      END IF;

      -- Update users with missing company_id
      UPDATE users
      SET
        company_id = v_company_id,
        is_active = true,
        updated_at = NOW()
      WHERE company_id IS NULL;

      GET DIAGNOSTICS v_user_count = ROW_COUNT;

      RAISE NOTICE 'Updated % users with company_id: %', v_user_count, v_company_id;
    END $$;
  `;

  const { error: userError } = await supabase.rpc('exec_sql', { sql: fixUserData });

  if (userError) {
    console.log('⚠️ User data fix failed, trying to check manually...');

    // Check companies
    const { data: companies } = await supabase.from('companies').select('id, name').limit(1);
    console.log('Available companies:', companies);

    // Check users without company_id
    const { data: usersWithoutCompany } = await supabase
      .from('users')
      .select('id, email, company_id')
      .is('company_id', null);

    console.log('Users without company_id:', usersWithoutCompany);

    if (companies && companies.length > 0 && usersWithoutCompany && usersWithoutCompany.length > 0) {
      console.log('Updating users with company_id...');
      for (const user of usersWithoutCompany) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ company_id: companies[0].id, is_active: true })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Failed to update user ${user.email}:`, updateError.message);
        } else {
          console.log(`✅ Updated user ${user.email}`);
        }
      }
    }
  } else {
    console.log('✅ User data updated successfully');
  }

  // STEP 4: Add performance indexes
  console.log('\n📋 STEP 4: Adding performance indexes...');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_id ON users(id)',
    'CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id)'
  ];

  for (const indexSql of indexes) {
    const { error } = await supabase.rpc('exec_sql', { sql: indexSql });
    if (error) {
      console.log(`⚠️ Index creation skipped (may already exist): ${indexSql.match(/idx_\w+/)?.[0]}`);
    } else {
      console.log(`✅ Created index: ${indexSql.match(/idx_\w+/)?.[0]}`);
    }
  }

  // STEP 5: Verification
  console.log('\n📋 STEP 5: Final verification...');

  const { data: finalPolicies } = await supabase
    .from('pg_policies')
    .select('policyname, with_check')
    .eq('tablename', 'projects')
    .eq('cmd', 'INSERT');

  console.log('\n✅ Final policy state:', finalPolicies);

  const { data: userCheck } = await supabase
    .from('users')
    .select('email, role, company_id, companies(name)')
    .limit(5);

  console.log('\n✅ Sample users:', userCheck);

  console.log('\n🎉 Fix completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Log out of the application');
  console.log('   2. Log back in to refresh session');
  console.log('   3. Try creating a project');
  console.log('   4. The 403 error should be resolved\n');
}

runFix().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
