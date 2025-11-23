import postgres from 'postgres';

const connectionString = 'postgresql://postgres:Alfa134679!@db.nxlznnrocrffnbzjaaae.supabase.co:5432/postgres';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
});

async function verifyPolicies() {
  console.log('🔍 Verifying RLS Policies...\n');

  try {
    const policies = await sql`
      SELECT
        tablename,
        policyname,
        cmd,
        qual::text as using_clause,
        with_check::text as with_check_clause
      FROM pg_policies
      WHERE tablename IN ('projects', 'project_users')
      ORDER BY tablename, cmd, policyname
    `;

    console.log('📊 Current RLS Policies:\n');

    let currentTable = '';
    let projectsPolicies = 0;
    let projectUsersPolicies = 0;

    policies.forEach(p => {
      if (p.tablename !== currentTable) {
        console.log(`\n=== ${p.tablename.toUpperCase()} ===`);
        currentTable = p.tablename;
      }

      console.log(`  [${p.cmd}] ${p.policyname}`);
      console.log(`    USING: ${p.using_clause || '(none)'}`);
      console.log(`    CHECK: ${p.with_check_clause || '(none)'}\n`);

      if (p.tablename === 'projects') projectsPolicies++;
      if (p.tablename === 'project_users') projectUsersPolicies++;
    });

    console.log('\n📈 Policy Count Summary:');
    console.log(`  - Projects table: ${projectsPolicies} policies`);
    console.log(`  - Project_users table: ${projectUsersPolicies} policies\n`);

    // Check for expected policies
    const expectedPolicies = {
      'projects': ['Authenticated users can insert projects'],
      'project_users': [
        'Authenticated users can view project_users',
        'Authenticated users can insert project_users',
        'Authenticated users can update project_users',
        'Authenticated users can delete project_users'
      ]
    };

    let allPresent = true;

    console.log('✅ Validation:');

    for (const [table, policyNames] of Object.entries(expectedPolicies)) {
      console.log(`\n  ${table}:`);
      const tablePolicies = policies.filter(p => p.tablename === table);

      for (const policyName of policyNames) {
        const found = tablePolicies.find(p => p.policyname === policyName);
        if (found) {
          console.log(`    ✅ ${policyName}`);
        } else {
          console.log(`    ❌ MISSING: ${policyName}`);
          allPresent = false;
        }
      }
    }

    // Check for unwanted recursive policies
    console.log('\n\n🔍 Checking for recursive policies...');

    const recursivePolicies = policies.filter(p => {
      const clause = (p.using_clause || '') + (p.with_check_clause || '');
      return clause.includes('projects') && p.tablename === 'project_users' ||
             clause.includes('project_users') && p.tablename === 'projects';
    });

    if (recursivePolicies.length > 0) {
      console.log('  ⚠️  Found potential recursive policies:');
      recursivePolicies.forEach(p => {
        console.log(`    - ${p.tablename}.${p.policyname}`);
      });
    } else {
      console.log('  ✅ No recursive policies detected');
    }

    console.log('\n' + '='.repeat(60));

    if (allPresent && recursivePolicies.length === 0) {
      console.log('🎉 RLS POLICIES ARE CORRECTLY CONFIGURED!');
      console.log('   - All expected policies present');
      console.log('   - No recursive dependencies');
      console.log('   - Ready for production use');
    } else {
      console.log('⚠️  POLICY CONFIGURATION NEEDS ATTENTION');
      if (!allPresent) {
        console.log('   - Some expected policies are missing');
      }
      if (recursivePolicies.length > 0) {
        console.log('   - Recursive policies detected');
      }
    }

    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error verifying policies:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifyPolicies();
