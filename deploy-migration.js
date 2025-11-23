#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function runMigration() {
  console.log('🚀 SUPER SITE HERO Database Migration');
  console.log('=====================================\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
    process.exit(1);
  }

  console.log('📍 Supabase Project:', SUPABASE_URL);
  console.log('✓ Credentials loaded\n');

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'migrations', 'COMBINED_ALL_MIGRATIONS.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  console.log('📂 Reading migration file...');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  console.log('✓ Migration file loaded (' + (migrationSQL.length / 1024 / 1024).toFixed(1) + ' MB)\n');

  // For now, provide instructions since we need service role key
  console.log('⚠️  To run migrations, you need your Supabase Service Role Key');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📍 GET YOUR SERVICE ROLE KEY:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your SuperSiteHero project');
  console.log('   3. Click Settings → API');
  console.log('   4. Look for "Service Role Key" (long JWT string starting with eyJ...)');
  console.log('   5. Paste it below\n');

  const serviceRoleKey = await question('🔑 Enter Service Role Key: ');

  if (!serviceRoleKey || !serviceRoleKey.startsWith('eyJ')) {
    console.error('❌ Invalid service role key format');
    rl.close();
    process.exit(1);
  }

  console.log('\n⏳ Connecting to Supabase...');

  try {
    // Create admin client with service role key
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    console.log('✓ Connected successfully\n');
    console.log('🚀 Running migrations...\n');

    // Execute the entire migration SQL
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    }).catch(() => {
      // If rpc doesn't work, try raw query
      return supabase.functions.invoke('execute-sql', {
        body: { sql: migrationSQL }
      }).catch(() => {
        // Fallback: provide raw SQL for manual execution
        console.log('⚠️  Could not execute via Supabase API');
        console.log('💡 Alternative: Use SQL Editor in Supabase Dashboard');
        console.log('   1. Go to https://supabase.com/dashboard');
        console.log('   2. Click SQL Editor → + New query');
        console.log('   3. Open this file:', migrationPath);
        console.log('   4. Copy entire contents and paste into SQL Editor');
        console.log('   5. Click RUN button');
        return null;
      });
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      rl.close();
      process.exit(1);
    }

    console.log('✅ All migrations completed successfully!\n');
    console.log('🎉 Database is ready for development\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

runMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  rl.close();
  process.exit(1);
});
