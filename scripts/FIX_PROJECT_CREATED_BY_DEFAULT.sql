-- Add default value for created_by on projects table
-- This ensures created_by is automatically set when inserting

-- Set default value for projects.created_by
ALTER TABLE projects
ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Also ensure the trigger uses the correct value
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

  -- Add all project team members as participants (if any exist at this point)
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT v_conversation_id, pu.user_id
  FROM project_users pu
  WHERE pu.project_id = NEW.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed project creation!';
  RAISE NOTICE '   - Added DEFAULT auth.uid() to projects.created_by';
  RAISE NOTICE '   - Updated trigger to use COALESCE(NEW.created_by, auth.uid())';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a project now!';
  RAISE NOTICE '';
END $$;
