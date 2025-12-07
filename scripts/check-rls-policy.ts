import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('\n🔍 CHECKING RLS POLICIES\n');

  try {
    // Query pg_policies directly
    const { data: policies, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT
            policyname,
            cmd,
            permissive,
            qual::text as using_clause,
            with_check::text as with_check_clause
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'projects'
            AND cmd = 'INSERT'
          ORDER BY policyname;
        `
      })
      .catch(async () => {
        // Fallback: try direct query without RPC
        const result = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_policies_info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            table_name: 'projects',
            command_type: 'INSERT'
          })
        });

        if (!result.ok) {
          throw new Error('Failed to fetch policies');
        }

        return { data: await result.json(), error: null };
      });

    if (error) {
      console.log('⚠️ Could not query pg_policies directly');
      console.log('Error:', error.message);
      console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
      console.log(`
SELECT
  policyname,
  cmd,
  permissive,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;
      `);
      return;
    }

    if (!policies || policies.length === 0) {
      console.log('❌ NO INSERT POLICIES FOUND!');
      console.log('This is why project creation is failing.');
      console.log('\nApplying fix...\n');

      await applyRLSFix();
      return;
    }

    console.log('📋 Current INSERT policies on projects table:\n');
    console.log(JSON.stringify(policies, null, 2));

    // Check if the correct policy exists
    const correctPolicy = policies.find((p: any) =>
      p.policyname === 'Authenticated users can create projects in their company'
    );

    if (!correctPolicy) {
      console.log('\n❌ WRONG POLICY!');
      console.log('Expected: "Authenticated users can create projects in their company"');
      console.log('Found:', policies.map((p: any) => p.policyname).join(', '));
      console.log('\nApplying fix...\n');

      await applyRLSFix();
    } else {
      console.log('\n✅ Correct policy exists!');
      console.log('Policy name:', correctPolicy.policyname);
      console.log('WITH CHECK clause:', correctPolicy.with_check_clause);

      console.log('\n⚠️ If project creation still fails, the issue is elsewhere.');
      console.log('Possible causes:');
      console.log('1. Frontend using wrong user session');
      console.log('2. User company_id mismatch');
      console.log('3. Browser cache issue');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

async function applyRLSFix() {
  console.log('🔧 Applying RLS policy fix...\n');

  const fixSQL = `
    DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
    DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
    DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

    CREATE POLICY "Authenticated users can create projects in their company"
      ON projects FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      );
  `;

  console.log('⚠️ Cannot apply SQL via API - RPC function not available');
  console.log('\nPlease run this SQL in Supabase SQL Editor:');
  console.log(fixSQL);
  console.log('\nAfter running the SQL:');
  console.log('1. Log out of the application');
  console.log('2. Log back in');
  console.log('3. Try creating a project\n');
}

checkRLSPolicies();
