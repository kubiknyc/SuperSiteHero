/**
 * Test Data Verification Utility
 *
 * Verifies that required test data exists in Supabase before E2E tests run.
 * This helps prevent conditional skips due to missing data.
 *
 * Usage:
 *   import { verifyTestData } from './utils/test-data-verification';
 *   await verifyTestData({ verbose: true });
 */

import { getSupabaseAdmin, withRetry } from './supabase-admin.js';

export interface TestDataStatus {
  hasProjects: boolean;
  hasRfis: boolean;
  hasSubmittals: boolean;
  hasTasks: boolean;
  hasPunchItems: boolean;
  hasDailyReports: boolean;
  hasBidPackages: boolean;
  hasContacts: boolean;
  hasSubcontractors: boolean;
  hasMeetings: boolean;
  overall: 'complete' | 'partial' | 'empty';
  counts: Record<string, number>;
}

/**
 * Verify that essential test data exists in the database
 */
export async function verifyTestData(options: {
  verbose?: boolean;
} = {}): Promise<TestDataStatus> {
  const { verbose = false } = options;
  const supabase = getSupabaseAdmin();

  const log = (msg: string) => verbose && console.log(`   ${msg}`);

  log('Checking test data availability...');

  const counts: Record<string, number> = {};

  // Check projects
  const { count: projectCount } = await withRetry(() =>
    supabase.from('projects').select('*', { count: 'exact', head: true })
  );
  counts.projects = projectCount || 0;
  log(`Projects: ${counts.projects}`);

  // Check RFIs (workflow_items with item_type = 'rfi')
  const { count: rfiCount } = await withRetry(() =>
    supabase
      .from('workflow_items')
      .select('*', { count: 'exact', head: true })
      .eq('item_type', 'rfi')
  );
  counts.rfis = rfiCount || 0;
  log(`RFIs: ${counts.rfis}`);

  // Check Submittals
  const { count: submittalCount } = await withRetry(() =>
    supabase
      .from('workflow_items')
      .select('*', { count: 'exact', head: true })
      .eq('item_type', 'submittal')
  );
  counts.submittals = submittalCount || 0;
  log(`Submittals: ${counts.submittals}`);

  // Check Tasks
  const { count: taskCount } = await withRetry(() =>
    supabase.from('tasks').select('*', { count: 'exact', head: true })
  );
  counts.tasks = taskCount || 0;
  log(`Tasks: ${counts.tasks}`);

  // Check Punch Items
  const { count: punchCount } = await withRetry(() =>
    supabase.from('punch_items').select('*', { count: 'exact', head: true })
  );
  counts.punchItems = punchCount || 0;
  log(`Punch Items: ${counts.punchItems}`);

  // Check Daily Reports
  const { count: reportCount } = await withRetry(() =>
    supabase.from('daily_reports').select('*', { count: 'exact', head: true })
  );
  counts.dailyReports = reportCount || 0;
  log(`Daily Reports: ${counts.dailyReports}`);

  // Check Bid Packages
  const { count: bidCount } = await withRetry(() =>
    supabase.from('bid_packages').select('*', { count: 'exact', head: true })
  );
  counts.bidPackages = bidCount || 0;
  log(`Bid Packages: ${counts.bidPackages}`);

  // Check Contacts
  const { count: contactCount } = await withRetry(() =>
    supabase.from('contacts').select('*', { count: 'exact', head: true })
  );
  counts.contacts = contactCount || 0;
  log(`Contacts: ${counts.contacts}`);

  // Check Subcontractors
  const { count: subCount } = await withRetry(() =>
    supabase.from('subcontractors').select('*', { count: 'exact', head: true })
  );
  counts.subcontractors = subCount || 0;
  log(`Subcontractors: ${counts.subcontractors}`);

  // Check Meetings
  const { count: meetingCount } = await withRetry(() =>
    supabase.from('meetings').select('*', { count: 'exact', head: true })
  );
  counts.meetings = meetingCount || 0;
  log(`Meetings: ${counts.meetings}`);

  // Determine overall status
  const status: TestDataStatus = {
    hasProjects: counts.projects > 0,
    hasRfis: counts.rfis > 0,
    hasSubmittals: counts.submittals > 0,
    hasTasks: counts.tasks > 0,
    hasPunchItems: counts.punchItems > 0,
    hasDailyReports: counts.dailyReports > 0,
    hasBidPackages: counts.bidPackages > 0,
    hasContacts: counts.contacts > 0,
    hasSubcontractors: counts.subcontractors > 0,
    hasMeetings: counts.meetings > 0,
    overall: 'empty',
    counts,
  };

  // Calculate overall status
  const requiredFields = [
    status.hasProjects,
    status.hasRfis,
    status.hasSubmittals,
    status.hasTasks,
    status.hasPunchItems,
    status.hasDailyReports,
  ];

  const trueCount = requiredFields.filter(Boolean).length;

  if (trueCount === requiredFields.length) {
    status.overall = 'complete';
  } else if (trueCount > 0) {
    status.overall = 'partial';
  } else {
    status.overall = 'empty';
  }

  return status;
}

/**
 * Print a summary of test data status
 */
export function printTestDataSummary(status: TestDataStatus): void {
  console.log('\n📊 Test Data Status:');
  console.log('─'.repeat(40));

  const items = [
    { name: 'Projects', has: status.hasProjects, count: status.counts.projects },
    { name: 'RFIs', has: status.hasRfis, count: status.counts.rfis },
    { name: 'Submittals', has: status.hasSubmittals, count: status.counts.submittals },
    { name: 'Tasks', has: status.hasTasks, count: status.counts.tasks },
    { name: 'Punch Items', has: status.hasPunchItems, count: status.counts.punchItems },
    { name: 'Daily Reports', has: status.hasDailyReports, count: status.counts.dailyReports },
    { name: 'Bid Packages', has: status.hasBidPackages, count: status.counts.bidPackages },
    { name: 'Contacts', has: status.hasContacts, count: status.counts.contacts },
    { name: 'Subcontractors', has: status.hasSubcontractors, count: status.counts.subcontractors },
    { name: 'Meetings', has: status.hasMeetings, count: status.counts.meetings },
  ];

  for (const item of items) {
    const icon = item.has ? '✅' : '⚠️ ';
    const countStr = item.count.toString().padStart(3);
    console.log(`  ${icon} ${item.name.padEnd(15)} ${countStr} records`);
  }

  console.log('─'.repeat(40));

  const overallIcon =
    status.overall === 'complete' ? '✅' :
    status.overall === 'partial' ? '⚠️ ' : '❌';

  console.log(`  ${overallIcon} Overall: ${status.overall.toUpperCase()}`);

  if (status.overall !== 'complete') {
    console.log('\n  💡 Run "npm run seed:test" to seed test data');
    console.log('     Or "npm run test:e2e:seed" to seed and run tests');
  }

  console.log('');
}

/**
 * Get the ID of the first available project (for tests that need a project)
 */
export async function getFirstProjectId(): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await withRetry(() =>
    supabase.from('projects').select('id').limit(1).single()
  );

  if (error || !data) {
    return null;
  }

  return data.id;
}

/**
 * Get test user ID by email
 */
export async function getTestUserId(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error || !data?.users) {
    return null;
  }

  const user = data.users.find(u => u.email === email);
  return user?.id || null;
}
