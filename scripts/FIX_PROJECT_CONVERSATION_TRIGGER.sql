-- Fix the create_project_conversation trigger to properly set created_by

-- Option 1: Fix the trigger to use auth.uid() directly
CREATE OR REPLACE FUNCTION create_project_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
  v_created_by UUID;
BEGIN
  -- Use NEW.created_by if available, otherwise use auth.uid()
  v_created_by := COALESCE(NEW.created_by, auth.uid());

  -- If still NULL, we can't create the conversation properly
  -- So skip it (will be created manually later)
  IF v_created_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create project conversation
  INSERT INTO conversations (
    type,
    name,
    project_id,
    company_id,
    created_by,
    metadata
  ) VALUES (
    'project',
    NEW.name,
    NEW.id,
    NEW.company_id,
    v_created_by,
    '{"system_channel": true, "auto_created": true}'::jsonb
  ) RETURNING id INTO v_conversation_id;

  -- Add all project team members as participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT v_conversation_id, pu.user_id
  FROM project_users pu
  WHERE pu.project_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed create_project_conversation trigger!';
  RAISE NOTICE '   - Now uses COALESCE(NEW.created_by, auth.uid())';
  RAISE NOTICE '   - If both are NULL, skips conversation creation';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a project now!';
  RAISE NOTICE '';
END $$;
