#!/usr/bin/env node

/**
 * Final autonomous deployment using Supabase Management API
 * Executes the idempotent deployment SQL file
 */

import fs from 'fs';
import https from 'https';

const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const ACCESS_TOKEN = 'sbp_085bac04acec4712ff695469ed2b68388c10a16f';

console.log('🚀 Autonomous Deployment via Supabase Management API');
console.log('=====================================================\n');

// Read the deployment SQL
const sql = fs.readFileSync('deploy-approval-system.sql', 'utf8');
console.log(`📄 Loaded deployment SQL (${sql.length} characters)\n`);

console.log('📡 Executing SQL via Supabase Management API...\n');

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'apikey': ACCESS_TOKEN
  }
};

const requestBody = JSON.stringify({ query: sql });

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ SQL executed successfully!\n');

      try {
        const parsed = JSON.parse(data);
        console.log('Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Response:', data.substring(0, 500));
      }

      console.log('\n🎉 Migrations deployed! Next: Deploy edge functions\n');
    } else {
      console.error('❌ Deployment failed');
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
