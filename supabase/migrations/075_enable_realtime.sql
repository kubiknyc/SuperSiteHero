-- Migration: 075_enable_realtime.sql
-- Description: Enable Supabase Realtime on key tables for real-time collaboration
-- Created: December 2025

-- =============================================
-- Enable Realtime on tables (with existence checks)
-- =============================================

DO $$
DECLARE
  tables_to_add TEXT[] := ARRAY[
    'daily_reports',
    'workflow_items',
    'documents',
    'approval_requests',
    'approval_actions',
    'projects',
    'tasks',
    'messages',
    'rfis',
    'submittals',
    'change_orders',
    'punch_list_items',
    'punch_items',
    'safety_incidents',
    'notifications'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables_to_add
  LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Check if not already in publication
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        RAISE NOTICE 'Added table % to realtime publication', tbl;
      ELSE
        RAISE NOTICE 'Table % already in realtime publication', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;

-- =============================================
-- Note: Realtime is now enabled on available tables
-- Clients can subscribe to changes using Supabase Realtime channels.
-- =============================================
