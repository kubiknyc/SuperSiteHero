import postgres from 'postgres';

// Supabase connection details
const connectionString = 'postgresql://postgres:Alfa134679!@db.nxlznnrocrffnbzjaaae.supabase.co:5432/postgres';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
});

async function applyMigrations() {
  console.log('🚀 Applying RLS Policy Migrations to Supabase...\n');

  try {
    // Migration 018: Simplify projects insert policy
    console.log('📋 Migration 018: Simplify projects insert policy');

    await sql`
      DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects
    `;
    console.log('  ✅ Dropped old projects policy');

    await sql`
      CREATE POLICY "Authenticated users can insert projects"
        ON projects FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL)
    `;
    console.log('  ✅ Created new projects policy\n');

    // Migration 019: Fix project_users recursion
    console.log('📋 Migration 019: Fix project_users recursion');

    // Drop all existing policies
    const oldPolicies = [
      "Users can view project assignments",
      "Users can view same company project assignments",
      "Company users can view project assignments",
      "Users can manage project assignments",
      "Authorized users can view project assignments"
    ];

    for (const policy of oldPolicies) {
      await sql`DROP POLICY IF EXISTS ${sql(policy)} ON project_users`;
      console.log(`  ✅ Dropped: "${policy}"`);
    }

    // Create new policies
    await sql`
      CREATE POLICY "Authenticated users can view project_users"
        ON project_users FOR SELECT
        USING (auth.uid() IS NOT NULL)
    `;
    console.log('  ✅ Created SELECT policy');

    await sql`
      CREATE POLICY "Authenticated users can insert project_users"
        ON project_users FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL)
    `;
    console.log('  ✅ Created INSERT policy');

    await sql`
      CREATE POLICY "Authenticated users can update project_users"
        ON project_users FOR UPDATE
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL)
    `;
    console.log('  ✅ Created UPDATE policy');

    await sql`
      CREATE POLICY "Authenticated users can delete project_users"
        ON project_users FOR DELETE
        USING (auth.uid() IS NOT NULL)
    `;
    console.log('  ✅ Created DELETE policy\n');

    // Verify policies
    console.log('🔍 Verifying policies...\n');

    const policies = await sql`
      SELECT
        tablename,
        policyname,
        cmd,
        using::text as using_clause,
        with_check::text as with_check_clause
      FROM pg_policies
      WHERE tablename IN ('projects', 'project_users')
      ORDER BY tablename, cmd, policyname
    `;

    console.log('📊 Current Policies:\n');

    let projectsPolicies = 0;
    let projectUsersPolicies = 0;

    policies.forEach(p => {
      console.log(`  ${p.tablename} | ${p.cmd} | ${p.policyname}`);
      if (p.tablename === 'projects') projectsPolicies++;
      if (p.tablename === 'project_users') projectUsersPolicies++;
    });

    console.log('\n✅ Migration Complete!');
    console.log(`   - Projects policies: ${projectsPolicies}`);
    console.log(`   - Project_users policies: ${projectUsersPolicies}`);

    if (projectsPolicies >= 1 && projectUsersPolicies === 4) {
      console.log('\n🎉 All policies applied successfully!');
    } else {
      console.log('\n⚠️  Policy count mismatch. Expected: 1 projects, 4 project_users');
    }

  } catch (error) {
    console.error('\n❌ Error applying migrations:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigrations();
