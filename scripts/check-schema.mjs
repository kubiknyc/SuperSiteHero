#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nxlznnrocrffnbzjaaae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking current database schema...\n');

async function checkSchema() {
  try {
    // Check if approval_status enum exists
    const { data: enumData, error: enumError } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', 'approval_status');

    if (enumError) {
      console.log('❌ Error checking enum:', enumError.message);
    } else {
      console.log(`approval_status enum: ${enumData && enumData.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }

    // Check if approval_status column exists on users table
    const { data: columnData, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'approval_status');

    if (columnError) {
      console.log('❌ Error checking column:', columnError.message);
    } else {
      console.log(`approval_status column: ${columnData && columnData.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }

    // Check schema_migrations table
    const { data: migData, error: migError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .in('version', ['144', '145', '146']);

    if (migError) {
      console.log('❌ Error checking migrations:', migError.message);
    } else {
      console.log(`\nMigrations in schema_migrations:`);
      if (migData && migData.length > 0) {
        migData.forEach(m => console.log(`  ✅ ${m.version}`));
      } else {
        console.log('  ❌ None of 144-146 found');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();
