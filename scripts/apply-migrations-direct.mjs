#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Direct SQL execution script for approval system migrations
 * Reads the combined migration file and executes it via Supabase SQL endpoint
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc';

console.log('🚀 Autonomous Migration Deployment');
console.log('=====================================\n');

// Read migration SQL
const migrationPath = path.join(__dirname, '..', 'apply-approval-system-migrations.sql');
console.log(`📄 Reading migration file: ${migrationPath}`);

let migrationSQL;
try {
  migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log(`✅ Loaded ${migrationSQL.length} characters of SQL\n`);
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

// Execute via Supabase REST API SQL endpoint
console.log('📡 Executing SQL via Supabase REST API...');

const url = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec`;
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation'
  }
};

const requestBody = JSON.stringify({
  query: migrationSQL
});

const req = https.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\n📊 Response status: ${res.statusCode}`);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ SQL executed successfully!');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log('Response:', JSON.stringify(parsed, null, 2));
        } catch (_e) {
          console.log('Response:', data);
        }
      }

      console.log('\n🎉 Migrations deployed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. ✅ Migrations applied');
      console.log('   2. ⏳ Deploy edge functions');
      console.log('   3. ⏳ Verify and test');

    } else {
      console.error('❌ Error executing SQL');
      console.error('Status:', res.statusCode);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(requestBody);
req.end();
