import postgres from 'postgres';

const connectionString = 'postgresql://postgres:Alfa134679!@db.nxlznnrocrffnbzjaaae.supabase.co:5432/postgres';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
});

async function cleanupPolicies() {
  console.log('🧹 Cleaning up recursive RLS policies...\n');

  try {
    // Step 1: Remove ALL existing policies on both tables
    console.log('Step 1: Removing all existing policies...\n');

    // Get all policies
    const allPolicies = await sql`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename IN ('projects', 'project_users')
    `;

    for (const policy of allPolicies) {
      console.log(`  Dropping: ${policy.tablename}.${policy.policyname}`);
      await sql`DROP POLICY IF EXISTS ${sql(policy.policyname)} ON ${sql(policy.tablename)}`;
    }

    console.log('\n✅ All old policies removed\n');

    // Step 2: Create clean, non-recursive policies
    console.log('Step 2: Creating clean policies...\n');

    // PROJECTS table policies
    console.log('  Creating PROJECTS policies:');

    await sql`
      CREATE POLICY "Authenticated users can insert projects"
        ON projects FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ INSERT policy created');

    await sql`
      CREATE POLICY "Authenticated users can select projects"
        ON projects FOR SELECT
        USING (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ SELECT policy created');

    await sql`
      CREATE POLICY "Authenticated users can update projects"
        ON projects FOR UPDATE
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ UPDATE policy created');

    await sql`
      CREATE POLICY "Authenticated users can delete projects"
        ON projects FOR DELETE
        USING (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ DELETE policy created\n');

    // PROJECT_USERS table policies
    console.log('  Creating PROJECT_USERS policies:');

    await sql`
      CREATE POLICY "Authenticated users can view project_users"
        ON project_users FOR SELECT
        USING (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ SELECT policy created');

    await sql`
      CREATE POLICY "Authenticated users can insert project_users"
        ON project_users FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ INSERT policy created');

    await sql`
      CREATE POLICY "Authenticated users can update project_users"
        ON project_users FOR UPDATE
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ UPDATE policy created');

    await sql`
      CREATE POLICY "Authenticated users can delete project_users"
        ON project_users FOR DELETE
        USING (auth.uid() IS NOT NULL)
    `;
    console.log('    ✅ DELETE policy created\n');

    // Step 3: Verify
    console.log('Step 3: Verifying new policies...\n');

    const newPolicies = await sql`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE tablename IN ('projects', 'project_users')
      ORDER BY tablename, cmd
    `;

    console.log('📊 Current policies:\n');
    let currentTable = '';
    newPolicies.forEach(p => {
      if (p.tablename !== currentTable) {
        console.log(`\n  ${p.tablename}:`);
        currentTable = p.tablename;
      }
      console.log(`    [${p.cmd}] ${p.policyname}`);
    });

    const projectsCount = newPolicies.filter(p => p.tablename === 'projects').length;
    const projectUsersCount = newPolicies.filter(p => p.tablename === 'project_users').length;

    console.log(`\n\n📈 Summary:`);
    console.log(`  - Projects: ${projectsCount} policies (expected: 4)`);
    console.log(`  - Project_users: ${projectUsersCount} policies (expected: 4)\n`);

    if (projectsCount === 4 && projectUsersCount === 4) {
      console.log('🎉 SUCCESS! All policies created correctly!');
      console.log('   - No recursive dependencies');
      console.log('   - Simple auth.uid() checks only');
      console.log('   - Application-level authorization will handle company/role logic\n');
    } else {
      console.log('⚠️  Policy count mismatch - please verify manually\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

cleanupPolicies();
