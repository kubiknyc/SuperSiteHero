-- Check existing companies
SELECT
  id,
  name,
  created_at
FROM companies
ORDER BY created_at DESC
LIMIT 5;

-- Check existing users
SELECT
  id,
  email,
  first_name,
  last_name,
  role,
  is_active,
  approval_status,
  company_id,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Check for pending users
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.approval_status,
  c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.approval_status = 'pending'
ORDER BY u.created_at DESC;
