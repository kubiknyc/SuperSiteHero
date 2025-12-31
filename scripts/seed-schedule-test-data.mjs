/**
 * Script to seed test schedule data for E2E testing
 * Run with: node scripts/seed-schedule-test-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key to bypass RLS for seeding
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('Using service role:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to add days to a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

// Get today's date as base
const today = new Date();
const startDate = addDays(today, -10); // Start 10 days ago

async function seedScheduleData() {
  console.log('🌱 Seeding schedule test data...\n');

  // First, get a project that the test user can access
  // We look for "Downtown Office Building" which is accessible to test@supersitehero.local
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name, company_id')
    .eq('name', 'Downtown Office Building')
    .limit(1);

  if (projectError) {
    console.error('Error fetching projects:', projectError);
    process.exit(1);
  }

  if (!projects || projects.length === 0) {
    console.error('No projects found. Please create a project first.');
    process.exit(1);
  }

  const project = projects[0];
  console.log(`📁 Using project: ${project.name} (${project.id})\n`);

  // Check for existing schedule activities
  const { data: existingActivities } = await supabase
    .from('schedule_activities')
    .select('id')
    .eq('project_id', project.id)
    .limit(1);

  if (existingActivities && existingActivities.length > 0) {
    console.log('⚠️  Schedule activities already exist for this project.');
    console.log('   Deleting existing activities...');

    // Delete existing dependencies first (foreign key constraint)
    await supabase
      .from('schedule_dependencies')
      .delete()
      .eq('project_id', project.id);

    // Delete existing activities
    await supabase
      .from('schedule_activities')
      .delete()
      .eq('project_id', project.id);

    console.log('   ✅ Existing data deleted.\n');
  }

  // Create sample schedule activities
  const activities = [
    // Phase 1: Foundation (WBS 1.0)
    {
      activity_id: '1.0',
      name: 'Foundation Phase',
      wbs_code: '1.0',
      wbs_level: 1,
      planned_start: startDate,
      planned_finish: addDays(startDate, 20),
      planned_duration: 20,
      percent_complete: 100,
      status: 'completed',
      activity_type: 'summary',
      is_critical: true,
      is_milestone: false,
      bar_color: '#3b82f6',
    },
    {
      activity_id: '1.1',
      name: 'Site Survey',
      wbs_code: '1.1',
      wbs_level: 2,
      planned_start: startDate,
      planned_finish: addDays(startDate, 3),
      planned_duration: 3,
      percent_complete: 100,
      status: 'completed',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },
    {
      activity_id: '1.2',
      name: 'Excavation',
      wbs_code: '1.2',
      wbs_level: 2,
      planned_start: addDays(startDate, 4),
      planned_finish: addDays(startDate, 8),
      planned_duration: 4,
      percent_complete: 100,
      status: 'completed',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },
    {
      activity_id: '1.3',
      name: 'Pour Foundation',
      wbs_code: '1.3',
      wbs_level: 2,
      planned_start: addDays(startDate, 9),
      planned_finish: addDays(startDate, 14),
      planned_duration: 5,
      percent_complete: 100,
      status: 'completed',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },
    {
      activity_id: '1.4',
      name: 'Foundation Complete',
      wbs_code: '1.4',
      wbs_level: 2,
      planned_start: addDays(startDate, 20),
      planned_finish: addDays(startDate, 20),
      planned_duration: 0,
      percent_complete: 100,
      status: 'completed',
      activity_type: 'milestone',
      is_critical: true,
      is_milestone: true,
      bar_color: '#8b5cf6',
    },

    // Phase 2: Framing (WBS 2.0)
    {
      activity_id: '2.0',
      name: 'Framing Phase',
      wbs_code: '2.0',
      wbs_level: 1,
      planned_start: addDays(startDate, 15),
      planned_finish: addDays(startDate, 35),
      planned_duration: 20,
      percent_complete: 75,
      status: 'in_progress',
      activity_type: 'summary',
      is_critical: true,
      is_milestone: false,
      bar_color: '#10b981',
    },
    {
      activity_id: '2.1',
      name: 'First Floor Framing',
      wbs_code: '2.1',
      wbs_level: 2,
      planned_start: addDays(startDate, 15),
      planned_finish: addDays(startDate, 22),
      planned_duration: 7,
      percent_complete: 100,
      status: 'completed',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },
    {
      activity_id: '2.2',
      name: 'Second Floor Framing',
      wbs_code: '2.2',
      wbs_level: 2,
      planned_start: addDays(startDate, 23),
      planned_finish: addDays(startDate, 30),
      planned_duration: 7,
      percent_complete: 60,
      status: 'in_progress',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },
    {
      activity_id: '2.3',
      name: 'Roof Framing',
      wbs_code: '2.3',
      wbs_level: 2,
      planned_start: addDays(startDate, 31),
      planned_finish: addDays(startDate, 35),
      planned_duration: 4,
      percent_complete: 0,
      status: 'not_started',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },

    // Phase 3: MEP (WBS 3.0) - Not on critical path
    {
      activity_id: '3.0',
      name: 'MEP Rough-In',
      wbs_code: '3.0',
      wbs_level: 1,
      planned_start: addDays(startDate, 25),
      planned_finish: addDays(startDate, 45),
      planned_duration: 20,
      percent_complete: 25,
      status: 'in_progress',
      activity_type: 'summary',
      is_critical: false,
      is_milestone: false,
      bar_color: '#f59e0b',
    },
    {
      activity_id: '3.1',
      name: 'Electrical Rough-In',
      wbs_code: '3.1',
      wbs_level: 2,
      planned_start: addDays(startDate, 25),
      planned_finish: addDays(startDate, 35),
      planned_duration: 10,
      percent_complete: 50,
      status: 'in_progress',
      activity_type: 'task',
      is_critical: false,
      is_milestone: false,
    },
    {
      activity_id: '3.2',
      name: 'Plumbing Rough-In',
      wbs_code: '3.2',
      wbs_level: 2,
      planned_start: addDays(startDate, 30),
      planned_finish: addDays(startDate, 40),
      planned_duration: 10,
      percent_complete: 0,
      status: 'not_started',
      activity_type: 'task',
      is_critical: false,
      is_milestone: false,
    },
    {
      activity_id: '3.3',
      name: 'HVAC Rough-In',
      wbs_code: '3.3',
      wbs_level: 2,
      planned_start: addDays(startDate, 35),
      planned_finish: addDays(startDate, 45),
      planned_duration: 10,
      percent_complete: 0,
      status: 'not_started',
      activity_type: 'task',
      is_critical: false,
      is_milestone: false,
    },

    // Phase 4: Finishes (WBS 4.0)
    {
      activity_id: '4.0',
      name: 'Finishes Phase',
      wbs_code: '4.0',
      wbs_level: 1,
      planned_start: addDays(startDate, 40),
      planned_finish: addDays(startDate, 60),
      planned_duration: 20,
      percent_complete: 0,
      status: 'not_started',
      activity_type: 'summary',
      is_critical: true,
      is_milestone: false,
      bar_color: '#ec4899',
    },
    {
      activity_id: '4.1',
      name: 'Drywall Installation',
      wbs_code: '4.1',
      wbs_level: 2,
      planned_start: addDays(startDate, 40),
      planned_finish: addDays(startDate, 50),
      planned_duration: 10,
      percent_complete: 0,
      status: 'not_started',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },
    {
      activity_id: '4.2',
      name: 'Paint & Finishes',
      wbs_code: '4.2',
      wbs_level: 2,
      planned_start: addDays(startDate, 51),
      planned_finish: addDays(startDate, 58),
      planned_duration: 7,
      percent_complete: 0,
      status: 'not_started',
      activity_type: 'task',
      is_critical: true,
      is_milestone: false,
    },
    {
      activity_id: '4.3',
      name: 'Project Complete',
      wbs_code: '4.3',
      wbs_level: 2,
      planned_start: addDays(startDate, 60),
      planned_finish: addDays(startDate, 60),
      planned_duration: 0,
      percent_complete: 0,
      status: 'not_started',
      activity_type: 'milestone',
      is_critical: true,
      is_milestone: true,
      bar_color: '#8b5cf6',
    },

    // An overdue task for testing
    {
      activity_id: '5.1',
      name: 'Permit Approval (OVERDUE)',
      wbs_code: '5.1',
      wbs_level: 1,
      planned_start: addDays(today, -15),
      planned_finish: addDays(today, -5),
      planned_duration: 10,
      percent_complete: 80,
      status: 'in_progress',
      activity_type: 'task',
      is_critical: false,
      is_milestone: false,
      bar_color: '#ef4444',
    },
  ];

  // Add project_id and company_id to all activities
  const activitiesWithIds = activities.map(a => ({
    ...a,
    project_id: project.id,
    company_id: project.company_id,
  }));

  console.log(`📝 Inserting ${activitiesWithIds.length} schedule activities...`);

  const { data: insertedActivities, error: insertError } = await supabase
    .from('schedule_activities')
    .insert(activitiesWithIds)
    .select();

  if (insertError) {
    console.error('Error inserting activities:', insertError);
    process.exit(1);
  }

  console.log(`   ✅ Inserted ${insertedActivities.length} activities\n`);

  // Create a map of activity_id to database id
  const activityIdMap = {};
  insertedActivities.forEach(a => {
    activityIdMap[a.activity_id] = a.id;
  });

  // Create dependencies (critical path)
  const dependencies = [
    // Foundation sequence (critical path)
    { predecessor_id: '1.1', successor_id: '1.2', dependency_type: 'FS', lag_days: 0 },
    { predecessor_id: '1.2', successor_id: '1.3', dependency_type: 'FS', lag_days: 0 },
    { predecessor_id: '1.3', successor_id: '1.4', dependency_type: 'FS', lag_days: 5 },

    // Framing sequence (critical path continues)
    { predecessor_id: '1.4', successor_id: '2.1', dependency_type: 'FS', lag_days: 0 },
    { predecessor_id: '2.1', successor_id: '2.2', dependency_type: 'FS', lag_days: 0 },
    { predecessor_id: '2.2', successor_id: '2.3', dependency_type: 'FS', lag_days: 0 },

    // MEP starts after some framing (not critical)
    { predecessor_id: '2.1', successor_id: '3.1', dependency_type: 'FS', lag_days: 3 },
    { predecessor_id: '3.1', successor_id: '3.2', dependency_type: 'SS', lag_days: 5 },
    { predecessor_id: '3.2', successor_id: '3.3', dependency_type: 'SS', lag_days: 5 },

    // Finishes sequence (critical path continues)
    { predecessor_id: '2.3', successor_id: '4.1', dependency_type: 'FS', lag_days: 2 },
    { predecessor_id: '4.1', successor_id: '4.2', dependency_type: 'FS', lag_days: 0 },
    { predecessor_id: '4.2', successor_id: '4.3', dependency_type: 'FS', lag_days: 2 },

    // MEP must complete before final milestone
    { predecessor_id: '3.3', successor_id: '4.3', dependency_type: 'FS', lag_days: 0 },
  ];

  // Map activity IDs to database IDs
  const dependenciesWithIds = dependencies.map(d => ({
    project_id: project.id,
    predecessor_id: activityIdMap[d.predecessor_id],
    successor_id: activityIdMap[d.successor_id],
    dependency_type: d.dependency_type,
    lag_days: d.lag_days,
  }));

  console.log(`🔗 Inserting ${dependenciesWithIds.length} dependencies...`);

  const { data: insertedDeps, error: depError } = await supabase
    .from('schedule_dependencies')
    .insert(dependenciesWithIds)
    .select();

  if (depError) {
    console.error('Error inserting dependencies:', depError);
    process.exit(1);
  }

  console.log(`   ✅ Inserted ${insertedDeps.length} dependencies\n`);

  // Summary
  console.log('🎉 Schedule test data seeded successfully!\n');
  console.log('Summary:');
  console.log(`   📁 Project: ${project.name}`);
  console.log(`   📝 Activities: ${insertedActivities.length}`);
  console.log(`   🔗 Dependencies: ${insertedDeps.length}`);
  console.log(`   ⚠️  Critical path tasks: ${insertedActivities.filter(a => a.is_critical).length}`);
  console.log(`   🏁 Milestones: ${insertedActivities.filter(a => a.is_milestone).length}`);
  console.log(`   ✅ Completed tasks: ${insertedActivities.filter(a => a.status === 'completed').length}`);
  console.log(`   🔄 In progress tasks: ${insertedActivities.filter(a => a.status === 'in_progress').length}`);
  console.log(`   ⏳ Not started tasks: ${insertedActivities.filter(a => a.status === 'not_started').length}`);
  console.log(`\nYou can now run the schedule E2E tests!`);
}

seedScheduleData().catch(console.error);
