#!/usr/bin/env node
/**
 * Run database migration using Supabase service role key
 * This script reads a SQL migration file and executes it on the remote database
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Read migration file
const migrationFile = process.argv[2] || 'migrations/044_enable_auto_user_creation.sql';
const migrationPath = path.join(process.cwd(), migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Error: Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Migration Details:');
console.log(`   File: ${migrationFile}`);
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   SQL Length: ${sql.length} characters\n`);

// Execute migration using Supabase REST API
async function runMigration() {
  try {
    console.log('🚀 Executing migration...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Try alternative method: using PostgREST query
      const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Accept': 'application/json',
        },
        body: sql
      });

      if (!altResponse.ok) {
        const error = await altResponse.text();
        throw new Error(`Migration failed: ${altResponse.status} ${altResponse.statusText}\n${error}`);
      }

      const result = await altResponse.json();
      console.log('✅ Migration executed successfully!\n');
      console.log('📊 Result:', result);
      return;
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!\n');
    console.log('📊 Result:', result);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Use psql directly:');
    console.error(`   psql "${SUPABASE_URL.replace('https://', 'postgresql://')}:5432/postgres" -f ${migrationFile}`);
    process.exit(1);
  }
}

runMigration();
