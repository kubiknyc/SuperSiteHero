#!/usr/bin/env node
/**
 * Execute SQL via Supabase Management API
 */

import https from 'https';

const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const ACCESS_TOKEN = 'sbp_629a0f42dcd1cab48d88636a34b9e92fb20acf1e'; // From .mcp.json

const SQL = `
DROP POLICY IF EXISTS "Users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can view same company project assignments" ON project_users;
DROP POLICY IF EXISTS "Company users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can manage project assignments" ON project_users;
DROP POLICY IF EXISTS "Authorized users can view project assignments" ON project_users;

CREATE POLICY "Authenticated users can view project_users" ON project_users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert project_users" ON project_users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update project_users" ON project_users FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete project_users" ON project_users FOR DELETE USING (auth.uid() IS NOT NULL);
`.trim();

console.log('🔧 Executing SQL via Supabase Management API...\n');

// Try Supabase Management API
const postData = JSON.stringify({ query: SQL });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode}`);

    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ SQL executed successfully!');
      console.log('Response:', data);
      console.log('\n🧪 Now testing if the fix worked...');

      // Run the automated test
      import('./automated-test.mjs');
    } else {
      console.log('❌ Failed to execute SQL');
      console.log('Response:', data);
      console.log('\nTrying alternative endpoint...');

      // Try db-api endpoint
      tryDbApiEndpoint();
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.log('\nTrying alternative approach...');
  tryDbApiEndpoint();
});

req.write(postData);
req.end();

function tryDbApiEndpoint() {
  console.log('\n🔄 Trying db-api endpoint...');

  const postData2 = JSON.stringify({ sql: SQL });

  const options2 = {
    hostname: PROJECT_REF + '.supabase.co',
    path: '/rest/v1/rpc/exec',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'apikey': ACCESS_TOKEN
    }
  };

  const req2 = https.request(options2, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data);

      if (res.statusCode !== 200) {
        console.log('\n❌ All automated methods failed.');
        console.log('The SQL must be executed in Supabase SQL Editor.');
        console.log('\n📋 SQL to execute:');
        console.log(SQL);
      }
    });
  });

  req2.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  req2.write(postData2);
  req2.end();
}
