#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Load .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const { Client } = pg;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
// Get password from command line argument or environment variable
const DB_PASSWORD = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;

async function deployMigrations() {
  console.log('\n🚀 SUPER SITE HERO - Database Migration');
  console.log('='.repeat(60));

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('\nError: Missing Supabase credentials in .env');
    process.exit(1);
  }

  if (!DB_PASSWORD) {
    console.error('\nError: SUPABASE_DB_PASSWORD environment variable not set');
    process.exit(1);
  }

  // Extract host from URL
  const url = new URL(SUPABASE_URL);
  const host = url.hostname;

  console.log(`\n📍 Supabase Project: ${SUPABASE_URL}`);
  console.log(`🗄️  Database Host: ${host}`);

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'migrations', 'COMBINED_ALL_MIGRATIONS.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`\nError: Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log('\n📂 Reading migration file...');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`✓ Loaded ${(migrationSQL.length / 1024 / 1024).toFixed(1)} MB of SQL`);

  // Create PostgreSQL connection
  console.log('\n⏳ Connecting to database...');

  const client = new Client({
    host: host,
    user: 'postgres',
    password: DB_PASSWORD,
    database: 'postgres',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected successfully');

    console.log('\n🚀 Executing migrations...');
    console.log('(This may take a few minutes)\n');

    // Execute migration
    await client.query(migrationSQL);

    console.log('\n✅ All migrations completed successfully!');
    console.log('\n🎉 Database is ready for development!\n');
    console.log('='.repeat(60));
    console.log('Next steps:');
    console.log('1. npm run dev');
    console.log('2. Open http://localhost:5173');
    console.log('3. Sign in with your Supabase Auth');
    console.log('='.repeat(60) + '\n');

    await client.end();
    process.exit(0);

  } catch (err) {
    console.error('\nError executing migration:');
    console.error(err.message);

    if (err.code === 'ECONNREFUSED') {
      console.error('\nCannot connect to database. Check:');
      console.error('- Host: ' + host);
      console.error('- Password is correct');
      console.error('- Database is accessible');
    }

    await client.end().catch(() => {});
    process.exit(1);
  }
}

deployMigrations();
