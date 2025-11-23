#!/usr/bin/env node
/**
 * Check user profile directly via Management API
 */

import https from 'https';

const PROJECT_REF = 'nxlznnrocrffnbzjaaae';
const ACCESS_TOKEN = 'sbp_629a0f42dcd1cab48d88636a34b9e92fb20acf1e';

console.log('🔍 Checking User Profile via Management API...\n');

const sql = `
SELECT id, email, company_id, role, first_name, last_name
FROM public.users
WHERE email = 'kubiknyc@gmail.com';
`;

const postData = JSON.stringify({ query: sql });

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
    console.log(`Response Status: ${res.statusCode}\n`);

    if (res.statusCode === 200 || res.statusCode === 201) {
      const result = JSON.parse(data);
      console.log('User Profile Data:');
      console.log(JSON.stringify(result, null, 2));

      if (result.length > 0 && result[0].company_id) {
        console.log('\n✅ User has company_id:', result[0].company_id);
      } else {
        console.log('\n❌ User is missing company_id!');
        console.log('This needs to be fixed.');
      }
    } else {
      console.log('Error response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.write(postData);
req.end();
