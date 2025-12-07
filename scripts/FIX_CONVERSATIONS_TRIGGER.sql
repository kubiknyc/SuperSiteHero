-- Fix the conversations trigger to properly set created_by

-- First, let's see the current trigger on projects table
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'projects';

-- Check the conversations table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- Check if there's a function that creates conversations
SELECT
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname LIKE '%conversation%'
   OR proname LIKE '%project%create%'
   OR proname LIKE '%create%project%';
