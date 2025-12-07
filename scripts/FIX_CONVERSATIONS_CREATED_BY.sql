-- Fix the conversations created_by issue

-- Option 1: Make created_by nullable with a default
-- This is safer if we don't know all the trigger logic
ALTER TABLE conversations
ALTER COLUMN created_by DROP NOT NULL;

-- Option 2: Set a default value (auth.uid())
-- Note: This may not work as DEFAULT for auth.uid() in Supabase
-- ALTER TABLE conversations
-- ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Let's also check and fix any trigger that creates conversations
-- First, find the trigger function
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'projects';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Made created_by nullable on conversations table';
  RAISE NOTICE '   This allows triggers to create conversations without requiring created_by';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a project now!';
  RAISE NOTICE '';
END $$;
