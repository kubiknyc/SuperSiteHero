// Execute SQL via Supabase Admin API
const https = require('https');

const SUPABASE_URL = 'https://nxlznnrocrffnbzjaaae.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.rWTnj0kLGMhLkE_PARQZBGqtKXJR3IbWM0x4MKL-l0o';

const sql = `
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
`;

console.log('Executing SQL via Supabase...');
console.log('SQL:', sql);

// Use fetch if available
if (typeof fetch !== 'undefined') {
  fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  })
  .then(res => res.json())
  .then(data => {
    console.log('Success:', data);
  })
  .catch(err => {
    console.error('Error:', err);
  });
} else {
  console.log('\n' + '='.repeat(60));
  console.log('MANUAL EXECUTION REQUIRED:');
  console.log('='.repeat(60));
  console.log('\n1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new');
  console.log('\n2. Copy and paste this SQL:\n');
  console.log(sql);
  console.log('\n3. Click RUN');
  console.log('\n' + '='.repeat(60));
}
