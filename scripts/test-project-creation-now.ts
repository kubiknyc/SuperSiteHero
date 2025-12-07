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

async function testProjectCreation() {
  console.log('\n🧪 TESTING PROJECT CREATION\n');

  try {
    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, email, company_id, role')
      .eq('email', testUserEmail)
      .single();

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('User:', user.email);
    console.log('Role:', user.role);
    console.log('Company ID:', user.company_id);

    // Try to create project
    console.log('\n📋 Attempting to create project...');

    const projectData = {
      company_id: user.company_id,
      name: 'Hunt Residence',
      project_number: '2024-001',
      address: '15 East 93rd Street',
      city: 'New York',
      state: 'NY',
      zip: '10128',
      status: 'planning',
      weather_units: 'imperial',
      features_enabled: { daily_reports: true, documents: true, workflows: true },
      created_by: user.id,
    };

    console.log('Project data:', JSON.stringify(projectData, null, 2));

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectError) {
      console.log('\n❌ PROJECT CREATION FAILED');
      console.log('Error message:', projectError.message);
      console.log('Error code:', projectError.code);
      console.log('Error details:', JSON.stringify(projectError.details, null, 2));
      console.log('Error hint:', projectError.hint);

      if (projectError.code === '42501') {
        console.log('\n⚠️ ERROR 42501 = RLS POLICY BLOCKING INSERT');
        console.log('The RLS policy on projects table is rejecting the INSERT');
        console.log('\nRun this SQL to fix:');
        console.log(`
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
        `);
      } else if (projectError.code === '23503') {
        console.log('\n⚠️ ERROR 23503 = FOREIGN KEY VIOLATION');
        console.log('The company_id does not exist in companies table');
      } else if (projectError.code === '23502') {
        console.log('\n⚠️ ERROR 23502 = NOT NULL VIOLATION');
        console.log('A required field is NULL');
      }
    } else {
      console.log('\n✅ PROJECT CREATED SUCCESSFULLY!');
      console.log('Project ID:', project.id);
      console.log('Project Name:', project.name);
      console.log('Project Number:', project.project_number);
      console.log('Company ID:', project.company_id);

      console.log('\n📋 The database is working correctly!');
      console.log('The issue must be in the frontend code or session.');
      console.log('\nPlease:');
      console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('2. Close ALL browser tabs');
      console.log('3. Reopen browser and go to localhost:5174');
      console.log('4. Log in fresh');
      console.log('5. Try creating project');

      // Don't delete - leave it so user can see it in the UI
      console.log('\n✅ Project left in database for you to verify');
    }

  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

testProjectCreation();
