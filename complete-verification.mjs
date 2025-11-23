#!/usr/bin/env node
/**
 * Complete end-to-end verification of the app
 */

import https from 'https';

console.log('🔍 COMPLETE APP VERIFICATION\n');
console.log('=' .repeat(70));

const tests = {
  passed: 0,
  failed: 0,
  total: 0
};

// Test 1: Check if app is accessible
console.log('1️⃣ Testing app accessibility...');
tests.total++;

const http = await import('http');
const req1 = http.request('http://localhost:5175/', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ App is accessible (HTTP 200)\n');
    tests.passed++;

    // Test 2: Check database connection
    testDatabaseConnection();
  } else {
    console.log(`❌ App returned status ${res.statusCode}\n`);
    tests.failed++;
  }
});

req1.on('error', (error) => {
  console.log('❌ App is not accessible:', error.message);
  tests.failed++;
});

req1.end();

function testDatabaseConnection() {
  console.log('2️⃣ Testing database connection...');
  tests.total++;

  const SUPABASE_URL = 'https://nxlznnrocrffnbzjaaae.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Nzg2MDUsImV4cCI6MjA3OTI1NDYwNX0.McyD3pPW6e0jhgQmCdDgJO3PhKikV-71q7rwHaNCCro';

  const options = {
    hostname: 'nxlznnrocrffnbzjaaae.supabase.co',
    path: '/rest/v1/companies?select=id,name&limit=1',
    method: 'GET',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Database connection working\n');
        tests.passed++;
        testProjectsTable();
      } else {
        console.log(`❌ Database connection failed (${res.statusCode})\n`);
        tests.failed++;
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Database connection error:', error.message);
    tests.failed++;
  });

  req.end();
}

function testProjectsTable() {
  console.log('3️⃣ Testing projects table access...');
  tests.total++;

  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Nzg2MDUsImV4cCI6MjA3OTI1NDYwNX0.McyD3pPW6e0jhgQmCdDgJO3PhKikV-71q7rwHaNCCro';

  const options = {
    hostname: 'nxlznnrocrffnbzjaaae.supabase.co',
    path: '/rest/v1/projects?select=id,name&limit=5',
    method: 'GET',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const projects = JSON.parse(data);
        console.log(`✅ Projects table accessible (found ${projects.length} projects)\n`);
        tests.passed++;
        testUserProfile();
      } else if (res.statusCode === 500) {
        console.log('❌ Projects table has RLS recursion error\n');
        tests.failed++;
        printSummary();
      } else {
        console.log(`⚠️  Projects table returned status ${res.statusCode}\n`);
        tests.failed++;
        printSummary();
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Projects table error:', error.message);
    tests.failed++;
    printSummary();
  });

  req.end();
}

function testUserProfile() {
  console.log('4️⃣ Testing user profile access...');
  tests.total++;

  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Nzg2MDUsImV4cCI6MjA3OTI1NDYwNX0.McyD3pPW6e0jhgQmCdDgJO3PhKikV-71q7rwHaNCCro';

  const options = {
    hostname: 'nxlznnrocrffnbzjaaae.supabase.co',
    path: '/rest/v1/users?select=id,email,company_id&email=eq.kubiknyc@gmail.com',
    method: 'GET',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const users = JSON.parse(data);
        if (users.length > 0 && users[0].company_id) {
          console.log(`✅ User profile accessible with company_id: ${users[0].company_id}\n`);
          tests.passed++;
        } else {
          console.log('⚠️  User profile found but missing company_id\n');
          tests.failed++;
        }
        printSummary();
      } else {
        console.log(`❌ User profile access failed (${res.statusCode})\n`);
        tests.failed++;
        printSummary();
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ User profile error:', error.message);
    tests.failed++;
    printSummary();
  });

  req.end();
}

function printSummary() {
  console.log('=' .repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=' .repeat(70));
  console.log(`Total tests: ${tests.total}`);
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`❌ Failed: ${tests.failed}`);
  console.log('=' .repeat(70));

  if (tests.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ App is running correctly');
    console.log('✅ Database is accessible');
    console.log('✅ RLS policies are working');
    console.log('✅ User profile is configured');
    console.log('\n📱 App URL: http://localhost:5175/');
    console.log('🚀 Project creation should work!');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('Please check the errors above.');
  }
  console.log('=' .repeat(70));
}
