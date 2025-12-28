/* eslint-disable @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://nxlznnrocrffnbzjaaae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.5pqQkEMH2hnSbmPzwx-pRzlkG-7JBElKQJcYssPE4JI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('🚀 Applying RLS policy migrations...\n');

  const sql = `
-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

-- Create a simpler policy that avoids RLS recursion
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Drop all existing policies on project_users
DROP POLICY IF EXISTS "Users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can view same company project assignments" ON project_users;
DROP POLICY IF EXISTS "Company users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can manage project assignments" ON project_users;
DROP POLICY IF EXISTS "Authorized users can view project assignments" ON project_users;

-- SELECT policy - allow authenticated users to see project assignments
CREATE POLICY "Authenticated users can view project_users"
  ON project_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT policy - allow authenticated users to create assignments
CREATE POLICY "Authenticated users can insert project_users"
  ON project_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy - allow authenticated users to update assignments
CREATE POLICY "Authenticated users can update project_users"
  ON project_users FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE policy - allow authenticated users to delete assignments
CREATE POLICY "Authenticated users can delete project_users"
  ON project_users FOR DELETE
  USING (auth.uid() IS NOT NULL);
  `;

  try {
    const { data: _data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try alternative approach - split into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      console.log(`Executing ${statements.length} SQL statements...\n`);

      for (const statement of statements) {
        if (!statement) continue;

        console.log(`Executing: ${statement.substring(0, 80)}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql_string: statement });

        if (stmtError) {
          console.error(`❌ Error: ${stmtError.message}`);
        } else {
          console.log('✅ Success');
        }
      }
    } else {
      console.log('✅ All migrations applied successfully!');
    }

    // Verify policies
    console.log('\n📋 Verifying policies...\n');

    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .in('tablename', ['projects', 'project_users']);

    if (policyError) {
      console.error('Error fetching policies:', policyError);
    } else {
      console.log(`Found ${policies?.length || 0} policies`);
      policies?.forEach(p => {
        console.log(`  - ${p.tablename}: ${p.policyname} (${p.cmd})`);
      });
    }

  } catch (err) {
    console.error('❌ Error applying migrations:', err.message);
  }
}

applyMigrations();
