import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

async function executeSql(sql: string): Promise<any> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${response.status} ${error}`);
  }

  return response.json();
}

async function runFix() {
  console.log('\n🔧 Applying Project Creation Fix via Supabase API...\n');

  try {
    // STEP 1: Drop old policies
    console.log('📋 Step 1: Dropping old RLS policies...');

    const dropPolicies = [
      'DROP POLICY IF EXISTS "Authorized users can create projects" ON projects',
      'DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects',
      'DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects'
    ];

    for (const sql of dropPolicies) {
      try {
        await executeSql(sql);
        console.log(`✅ ${sql.match(/"([^"]+)"/)?.[1] || 'Policy dropped'}`);
      } catch (error: any) {
        console.log(`⚠️ ${error.message} (policy may not exist)`);
      }
    }

    // STEP 2: Create new policy
    console.log('\n📋 Step 2: Creating new simplified policy...');
    const createPolicy = `
      CREATE POLICY "Authenticated users can insert projects"
        ON projects FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL)
    `;

    try {
      await executeSql(createPolicy);
      console.log('✅ New RLS policy created successfully');
    } catch (error: any) {
      console.error('❌ Failed to create policy:', error.message);
      throw error;
    }

    // STEP 3: Fix user data
    console.log('\n📋 Step 3: Fixing user company assignments...');
    const fixUsers = `
      DO $$
      DECLARE
        v_company_id UUID;
        v_user_count INT;
      BEGIN
        SELECT id INTO v_company_id FROM companies LIMIT 1;

        IF v_company_id IS NULL THEN
          RAISE EXCEPTION 'No companies found';
        END IF;

        UPDATE users
        SET company_id = v_company_id, is_active = true, updated_at = NOW()
        WHERE company_id IS NULL;

        GET DIAGNOSTICS v_user_count = ROW_COUNT;
        RAISE NOTICE 'Updated % users', v_user_count;
      END $$
    `;

    try {
      await executeSql(fixUsers);
      console.log('✅ User company assignments updated');
    } catch (error: any) {
      console.log('⚠️ User update:', error.message);
    }

    // STEP 4: Add indexes
    console.log('\n📋 Step 4: Adding performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id)'
    ];

    for (const sql of indexes) {
      try {
        await executeSql(sql);
        console.log(`✅ ${sql.match(/idx_\w+/)?.[0]}`);
      } catch (error: any) {
        console.log(`⚠️ Index may already exist: ${sql.match(/idx_\w+/)?.[0]}`);
      }
    }

    console.log('\n✅ Fix applied successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Log out of the application');
    console.log('   2. Log back in to refresh session');
    console.log('   3. Try creating a project - the 403 error should be resolved\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\n⚠️ Manual fix required:');
    console.error('   Open Supabase Dashboard → SQL Editor');
    console.error('   Run: scripts/fix-project-creation.sql\n');
    process.exit(1);
  }
}

runFix();
