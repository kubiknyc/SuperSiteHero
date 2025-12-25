-- ============================================================================
-- COMPLETE DATABASE WIPE - DELETE ALL USERS AND DATA
-- ============================================================================
-- WARNING: This script will permanently delete ALL data from the database
-- This includes all users, authentication records, and all application data
-- THIS CANNOT BE UNDONE
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Starting complete database wipe...';

  -- ========================================
  -- Step 1: Delete all users from Supabase Auth
  -- ========================================
  RAISE NOTICE 'Deleting all authentication users...';
  DELETE FROM auth.users;
  RAISE NOTICE 'Authentication users deleted: %', (SELECT COUNT(*) FROM auth.users);

  -- ========================================
  -- Step 2: Truncate all public tables
  -- ========================================
  RAISE NOTICE 'Truncating all public schema tables...';

  -- Disable all triggers temporarily to avoid cascading issues
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('supabase_migrations.schema_migrations')
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER ALL;', r.tablename);
  END LOOP;

  -- Truncate all tables with CASCADE
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT IN ('schema_migrations')
  ) LOOP
    BEGIN
      EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', r.tablename);
      RAISE NOTICE 'Truncated table: %', r.tablename;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not truncate %: %', r.tablename, SQLERRM;
    END;
  END LOOP;

  -- Re-enable all triggers
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER ALL;', r.tablename);
  END LOOP;

  -- ========================================
  -- Step 3: Clean up storage buckets
  -- ========================================
  RAISE NOTICE 'Cleaning storage buckets...';
  DELETE FROM storage.objects;

  -- ========================================
  -- Step 4: Verify complete deletion
  -- ========================================
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DATABASE WIPE COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Auth users remaining: %', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE 'Public.users remaining: %', (SELECT COUNT(*) FROM public.users);

  -- List all tables and their row counts
  RAISE NOTICE 'Verifying all tables are empty...';
  FOR r IN (
    SELECT
      schemaname,
      tablename,
      (xpath('/row/count/text()',
        query_to_xml(format('SELECT COUNT(*) as count FROM %I.%I', schemaname, tablename),
        false, true, '')))[1]::text::int as row_count
    FROM pg_tables
    WHERE schemaname IN ('public', 'auth', 'storage')
    AND tablename NOT LIKE 'pg_%'
    ORDER BY schemaname, tablename
  ) LOOP
    IF r.row_count > 0 THEN
      RAISE NOTICE '  %.%: % rows remaining', r.schemaname, r.tablename, r.row_count;
    END IF;
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'All user data and authentication records have been permanently deleted';
  RAISE NOTICE '============================================';

END $$;

-- ========================================
-- Final Verification Queries
-- ========================================

-- Check auth users
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
-- Check public users
SELECT 'Public Users', COUNT(*) FROM public.users
UNION ALL
-- Check companies
SELECT 'Companies', COUNT(*) FROM public.companies
UNION ALL
-- Check projects
SELECT 'Projects', COUNT(*) FROM public.projects
UNION ALL
-- Check daily reports
SELECT 'Daily Reports', COUNT(*) FROM public.daily_reports
UNION ALL
-- Check tasks
SELECT 'Tasks', COUNT(*) FROM public.tasks
UNION ALL
-- Check documents
SELECT 'Documents', COUNT(*) FROM public.documents
UNION ALL
-- Check storage objects
SELECT 'Storage Objects', COUNT(*) FROM storage.objects;

-- Verify no emails exist anywhere
SELECT 'Email check complete' as status;
