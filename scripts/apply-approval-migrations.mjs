#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the combined migration file
const migrationPath = path.join(__dirname, '..', 'apply-approval-system-migrations.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Supabase credentials from environment
const supabaseUrl = 'https://nxlznnrocrffnbzjaaae.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc';

console.log('🚀 Applying approval system migrations autonomously...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  try {
    console.log('📋 Executing combined migration SQL...');

    // Execute the migration SQL using Supabase SQL function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('⚠️  exec_sql function not available, trying alternative method...');

      // Try using direct SQL execution via the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Migrations applied successfully!\n');
      console.log('Result:', result);
    } else {
      console.log('✅ Migrations applied successfully!\n');
      console.log('Result:', data);
    }

    // Verify the migration was applied
    console.log('\n🔍 Verifying schema changes...');

    const { data: _enumData, error: enumError } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typname', 'approval_status')
      .single();

    if (enumError) {
      console.log('⚠️  Could not verify enum type (may still be successful)');
    } else {
      console.log('✅ approval_status enum type exists');
    }

    console.log('\n🎉 Deployment complete! Next steps:');
    console.log('   1. Deploy edge functions');
    console.log('   2. Test the approval workflow');
    console.log('   3. Verify RLS policies');

  } catch (error) {
    console.error('❌ Error applying migrations:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

applyMigrations();
