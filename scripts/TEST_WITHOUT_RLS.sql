-- Temporarily disable RLS to test if insert works

-- Disable RLS on projects table
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Show status
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RLS TEMPORARILY DISABLED on projects table';
  RAISE NOTICE '   Try creating a project NOW in your app';
  RAISE NOTICE '   If it works, the problem is definitely in the RLS policies';
  RAISE NOTICE '   If it still fails, there is a different constraint/trigger issue';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Re-enable RLS after testing!';
  RAISE NOTICE '';
END $$;
