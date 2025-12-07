-- Fix conversation_participants SELECT RLS policy
-- The original policy had infinite recursion when querying conversation_participants from within itself
-- Solution: Use a SECURITY DEFINER function to bypass RLS in the helper query

-- Create helper function that bypasses RLS to get user's conversation IDs
CREATE OR REPLACE FUNCTION public.user_conversation_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT conversation_id
  FROM conversation_participants
  WHERE user_id = p_user_id AND left_at IS NULL;
$$;

-- Drop the broken policy
DROP POLICY IF EXISTS participants_select ON conversation_participants;

-- Create fixed policy using the helper function (no recursion)
CREATE POLICY participants_select ON conversation_participants
FOR SELECT USING (
  conversation_id IN (SELECT public.user_conversation_ids(auth.uid()))
);
