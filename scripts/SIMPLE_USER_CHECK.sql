-- Simple check: Do users have company_id?

SELECT
  email,
  company_id,
  role,
  CASE
    WHEN company_id IS NULL THEN '❌ NULL COMPANY - THIS IS THE BUG!'
    ELSE '✅ HAS COMPANY'
  END as status
FROM users
ORDER BY created_at DESC;
