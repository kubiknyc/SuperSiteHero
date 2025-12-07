import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixCompanyId() {
  console.log('\n🔧 Fixing NULL company_id issue...\n');

  try {
    // STEP 1: Get the first available company
    console.log('📋 Step 1: Finding available companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, slug')
      .order('created_at', { ascending: true })
      .limit(1);

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    if (!companies || companies.length === 0) {
      console.log('⚠️ No companies found. Creating a default company...');

      // Create a default company
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'Default Company',
          slug: 'default-company',
          email: 'admin@example.com',
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create company: ${createError.message}`);
      }

      console.log(`✅ Created company: ${newCompany.name} (${newCompany.id})`);
      companies.push(newCompany);
    }

    const company = companies[0];
    console.log(`✅ Using company: ${company.name} (${company.id})`);

    // STEP 2: Find users with NULL company_id
    console.log('\n📋 Step 2: Finding users with NULL company_id...');
    const { data: usersWithoutCompany, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .is('company_id', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!usersWithoutCompany || usersWithoutCompany.length === 0) {
      console.log('✅ All users have company_id assigned!');
      return;
    }

    console.log(`Found ${usersWithoutCompany.length} users without company_id:`);
    usersWithoutCompany.forEach(u => console.log(`  - ${u.email} (${u.role})`));

    // STEP 3: Update users with company_id
    console.log('\n📋 Step 3: Updating users...');
    for (const user of usersWithoutCompany) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          company_id: company.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Failed to update ${user.email}: ${updateError.message}`);
      } else {
        console.log(`✅ Updated ${user.email} with company_id`);
      }
    }

    // STEP 4: Verify fix
    console.log('\n📋 Step 4: Verifying fix...');
    const { data: verifyUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, email, company_id, is_active')
      .is('company_id', null);

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }

    if (!verifyUsers || verifyUsers.length === 0) {
      console.log('✅ All users now have company_id assigned!');
    } else {
      console.log(`⚠️ ${verifyUsers.length} users still have NULL company_id`);
    }

    // STEP 5: Apply RLS policy fix
    console.log('\n📋 Step 5: Ensuring correct RLS policy...');
    console.log('⚠️ Note: RLS policies must be updated manually in Supabase SQL Editor');
    console.log('Run this SQL:');
    console.log(`
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
    `);

    console.log('\n🎉 Fix completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Apply the RLS policy SQL above in Supabase SQL Editor');
    console.log('   2. Log out of the application');
    console.log('   3. Log back in to refresh session');
    console.log('   4. Try creating a project - should work now!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

fixCompanyId();
