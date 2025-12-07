import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use service role key for full admin access (bypasses RLS)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteUserDailyReports() {
  console.log('Using service role key for admin access...\n');

  // First, list all users in public.users table
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .limit(50);

  if (userError) {
    console.error('Error finding users:', userError.message);
  } else {
    console.log('Users in public.users table:', users?.length || 0);
    users?.forEach(u => console.log(`  - ${u.email} (${u.full_name})`));
  }

  // Check auth.users table
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('\nError listing auth users:', authError.message);
  } else {
    console.log('\nAuth users:', authUsers?.users?.length || 0);
    authUsers?.users?.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
  }

  // List all daily reports
  const { data: reports, error: reportsError } = await supabase
    .from('daily_reports')
    .select('id, report_date, created_by, project_id')
    .limit(50);

  if (reportsError) {
    console.error('\nError finding reports:', reportsError.message);
  } else {
    console.log('\nDaily reports:', reports?.length || 0);
    reports?.forEach(r => console.log(`  - ${r.report_date} (created_by: ${r.created_by})`));
  }

  // Find the specific user
  const targetEmail = 'kubiknyc@gmail.com';
  const targetUser = authUsers?.users?.find(u => u.email === targetEmail);

  if (targetUser) {
    console.log(`\nFound target user: ${targetEmail} (ID: ${targetUser.id})`);

    // Delete daily reports by this user
    const { data: deleted, error: deleteError } = await supabase
      .from('daily_reports')
      .delete()
      .eq('created_by', targetUser.id)
      .select();

    if (deleteError) {
      console.error('Error deleting reports:', deleteError.message);
    } else {
      console.log(`Deleted ${deleted?.length || 0} daily reports for ${targetEmail}`);
    }
  } else {
    console.log(`\nUser ${targetEmail} not found in auth.users`);
  }
}

deleteUserDailyReports();
