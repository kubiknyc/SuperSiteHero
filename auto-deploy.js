#!/usr/bin/env node
/**
 * Auto-deploy migrations to Supabase using database connection
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Client } = pg;

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL');
  process.exit(1);
}

if (!DB_PASSWORD) {
  console.error('❌ Missing SUPABASE_DB_PASSWORD');
  console.error('Set it with: export SUPABASE_DB_PASSWORD="your_password"');
  process.exit(1);
}

// Parse Supabase URL to get host
const dbHost = new URL(SUPABASE_URL).hostname;

async function runMigrations() {
  console.log('\n🚀 SUPER SITE HERO - Database Migration');
  console.log('='.repeat(60));
  console.log(`📍 Supabase Project: ${SUPABASE_URL}`);
  console.log(`🗄️  Database Host: ${dbHost}\n`);

  const client = new Client({
    host: dbHost,
    port: 5432,
    user: 'postgres',
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: 'require'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationsDir = path.join(__dirname, 'migrations');

    // Get all migration files sorted by number
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.match(/^\d{3}_.*\.sql$/) && f !== 'COMBINED_ALL_MIGRATIONS.sql')
      .sort();

    if (migrationFiles.length === 0) {
      console.error('❌ No migration files found');
      process.exit(1);
    }

    console.log(`Found ${migrationFiles.length} migration files\n`);
    console.log('Executing migrations...\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < migrationFiles.length; i++) {
      const filename = migrationFiles[i];
      const filepath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filepath, 'utf-8');

      process.stdout.write(`[${i + 1}/${migrationFiles.length}] ${filename}... `);

      try {
        await client.query(sql);
        console.log('✅');
        successCount++;
      } catch (error) {
        console.log('❌');
        console.error(`   Error: ${error.message}\n`);
        failCount++;
      }
    }

    await client.end();

    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${successCount} passed, ${failCount} failed`);
    console.log('='.repeat(60) + '\n');

    if (failCount === 0) {
      console.log('🎉 All migrations completed successfully!');
      console.log('\nNext steps:');
      console.log('1. npm run dev');
      console.log('2. Open http://localhost:5173');
      console.log('3. Sign in with your Supabase Auth\n');
    }

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Connection error:', error.code || error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

runMigrations();
