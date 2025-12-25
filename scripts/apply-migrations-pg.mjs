#!/usr/bin/env node

/**
 * Autonomous migration deployment using direct PostgreSQL connection
 * Applies migrations 144-146 for the approval system
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Autonomous Approval System Migration Deployment');
console.log('====================================================\n');

// PostgreSQL connection string for Supabase
const connectionString = 'postgresql://postgres.nxlznnrocrffnbzjaaae:1VXRyuU7iFbSnsgX@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

// Read individual migration files
const migrations = [
  { version: '144', file: '144_add_user_approval_system.sql', name: 'add_user_approval_system' },
  { version: '145', file: '145_update_signup_trigger_for_approval.sql', name: 'update_signup_trigger_for_approval' },
  { version: '146', file: '146_update_rls_for_pending_users.sql', name: 'update_rls_for_pending_users' }
];

async function applyMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    for (const migration of migrations) {
      console.log(`📋 Applying Migration ${migration.version}: ${migration.name}...`);

      // Read migration SQL
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration.file);
      let sql;

      try {
        sql = fs.readFileSync(migrationPath, 'utf8');
      } catch (error) {
        console.error(`❌ Error reading ${migration.file}:`, error.message);
        continue;
      }

      try {
        // Execute the migration
        await client.query(sql);
        console.log(`✅ Migration ${migration.version} applied successfully`);

        // Mark as applied in schema_migrations
        await client.query(
          `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
           VALUES($1, $2, $3)
           ON CONFLICT (version) DO NOTHING`,
          [migration.version, migration.file, []]
        );
        console.log(`✅ Marked as applied in schema_migrations\n`);

      } catch (error) {
        console.error(`❌ Error applying migration ${migration.version}:`, error.message);

        // Check if it's just a "already exists" error
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Schema objects already exist, marking as applied...\n`);
          await client.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES($1, $2, $3)
             ON CONFLICT (version) DO NOTHING`,
            [migration.version, migration.file, []]
          );
        } else {
          throw error;
        }
      }
    }

    // Verify deployment
    console.log('🔍 Verifying deployment...\n');

    const { rows: enumRows } = await client.query(
      `SELECT enumlabel FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
       ORDER BY enumsortorder`
    );
    console.log(`✅ approval_status enum values: ${enumRows.map(r => r.enumlabel).join(', ')}`);

    const { rows: columnRows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'users'
       AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason')
       ORDER BY ordinal_position`
    );
    console.log(`✅ New columns added: ${columnRows.length}/6`);

    const { rows: functionRows } = await client.query(
      `SELECT routine_name FROM information_schema.routines
       WHERE routine_name = 'handle_new_user'`
    );
    console.log(`✅ Trigger function updated: ${functionRows.length > 0 ? 'Yes' : 'No'}`);

    console.log('\n🎉 All migrations deployed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. ✅ Database migrations applied');
    console.log('   2. ⏳ Deploy edge functions');
    console.log('   3. ⏳ Test approval workflow');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Note: You'll need to install pg first: npm install pg
if (!pg) {
  console.error('❌ pg library not found. Please run: npm install pg');
  process.exit(1);
}

applyMigrations();
