/**
 * Enhance Messaging System
 *
 * Migration: 039
 * Created: 2025-11-29
 * Purpose: Add missing features to existing messaging system (migration 029)
 *
 * Enhancements:
 * - Auto-create conversations (company #general + project conversations)
 * - Full-text message search
 * - Typing indicators
 * - Per-message read receipts
 * - Company-wide conversations
 * - Metadata field for system flags
 */

-- =====================================================
-- SECTION 1: ADD COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add metadata column for system flags
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add company_id for company-wide conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add 'general' type to conversation_type enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'general'
    AND enumtypid = 'conversation_type'::regtype
  ) THEN
    ALTER TYPE conversation_type ADD VALUE 'general';
  END IF;
END $$;

-- Index on company_id
CREATE INDEX IF NOT EXISTS idx_conversations_company_id
  ON conversations(company_id) WHERE deleted_at IS NULL;

-- Comment
COMMENT ON COLUMN conversations.metadata IS 'System flags like auto_created, system_channel, deletable';
COMMENT ON COLUMN conversations.company_id IS 'For company-wide conversations like #general';

-- =====================================================
-- SECTION 2: CREATE TYPING INDICATORS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  typing_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation
  ON typing_indicators(conversation_id);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_cleanup
  ON typing_indicators(typing_at);
-- Note: Cannot use NOW() in index predicate (not immutable)
-- Clean up old typing indicators periodically via cron job or application logic

-- Comment
COMMENT ON TABLE typing_indicators IS 'Real-time typing status for conversations';

-- =====================================================
-- SECTION 3: CREATE MESSAGE READ RECEIPTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message
  ON message_read_receipts(message_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user
  ON message_read_receipts(user_id);

-- Comment
COMMENT ON TABLE message_read_receipts IS 'Per-message read receipts (more granular than conversation-level)';

-- =====================================================
-- SECTION 4: FULL-TEXT SEARCH
-- =====================================================

-- Note: GIN index for full-text search already exists from migration 029
-- idx_messages_content_search ON messages USING gin(to_tsvector('english', content))

-- Search function
CREATE OR REPLACE FUNCTION search_messages(
  search_query TEXT,
  p_user_id UUID,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.created_at,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query)) AS rank
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND cp.left_at IS NULL
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    AND m.deleted_at IS NULL
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_messages IS 'Full-text search across messages user has access to';

-- =====================================================
-- SECTION 5: AUTO-CREATE FUNCTIONS
-- =====================================================

-- Function 1: Auto-create #general conversation when company is created
CREATE OR REPLACE FUNCTION create_company_general_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
  v_first_user_id UUID;
BEGIN
  -- Get first user in company (or use a system user ID)
  SELECT id INTO v_first_user_id
  FROM users
  WHERE company_id = NEW.id
  ORDER BY created_at
  LIMIT 1;

  -- If no users yet, we'll let the user trigger handle it
  IF v_first_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create #general conversation
  INSERT INTO conversations (
    type,
    name,
    company_id,
    created_by,
    metadata
  ) VALUES (
    'general',
    'general',
    NEW.id,
    v_first_user_id,
    '{"system_channel": true, "auto_created": true, "deletable": false}'::jsonb
  ) RETURNING id INTO v_conversation_id;

  -- Add all company users as participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT v_conversation_id, u.id
  FROM users u
  WHERE u.company_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for company #general creation
CREATE TRIGGER trigger_create_general_conversation
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_company_general_conversation();

-- Function 2: Auto-create project conversation when project is created
CREATE OR REPLACE FUNCTION create_project_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
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
    NEW.created_by,
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

-- Trigger for project conversation creation
CREATE TRIGGER trigger_create_project_conversation
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_conversation();

-- Function 3: Sync project users to conversation
CREATE OR REPLACE FUNCTION sync_project_user_to_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Find project's conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND type = 'project'
    AND deleted_at IS NULL;

  IF v_conversation_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Handle INSERT (user added to project)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, NEW.user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Handle DELETE (user removed from project)
  IF TG_OP = 'DELETE' THEN
    UPDATE conversation_participants
    SET left_at = NOW()
    WHERE conversation_id = v_conversation_id
      AND user_id = OLD.user_id
      AND left_at IS NULL;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for project user sync
CREATE TRIGGER trigger_sync_project_users
  AFTER INSERT OR DELETE ON project_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_user_to_conversation();

-- Function 4: Auto-add new users to #general conversation
CREATE OR REPLACE FUNCTION add_user_to_general_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Find company's #general conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE company_id = NEW.company_id
    AND type = 'general'
    AND deleted_at IS NULL
  LIMIT 1;

  -- Add user to #general if it exists
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, NEW.id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for adding users to #general
CREATE TRIGGER trigger_add_to_general_conversation
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION add_user_to_general_conversation();

-- =====================================================
-- SECTION 6: HELPER FUNCTIONS
-- =====================================================

-- Get or create DM conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_conversation(
  p_user1_id UUID,
  p_user2_id UUID,
  p_company_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if DM exists between these users (either direction)
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = p_user1_id AND cp1.left_at IS NULL
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_user2_id AND cp2.left_at IS NULL
  WHERE c.type = 'direct'
    AND c.deleted_at IS NULL
    AND (
      SELECT COUNT(*) FROM conversation_participants
      WHERE conversation_id = c.id AND left_at IS NULL
    ) = 2
  LIMIT 1;

  -- If not found, create new DM
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, company_id, created_by)
    VALUES ('direct', p_company_id, p_user1_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
      (v_conversation_id, p_user1_id),
      (v_conversation_id, p_user2_id);
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_dm_conversation IS 'Get existing or create new DM conversation between two users';

-- =====================================================
-- SECTION 7: RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Typing indicators: Users manage their own typing status
CREATE POLICY "Users can manage their typing status"
  ON typing_indicators FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Typing indicators: Users can view typing in their conversations
CREATE POLICY "Users can view typing in their conversations"
  ON typing_indicators FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

-- Read receipts: Users manage their own receipts
CREATE POLICY "Users can manage their read receipts"
  ON message_read_receipts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Read receipts: Users can view receipts in their conversations
-- Note: This assumes messages table has been created by migration 029
-- If not, this policy should be added manually later
-- CREATE POLICY "Users can view read receipts in their conversations"
--   ON message_read_receipts FOR SELECT
--   USING (
--     message_id IN (
--       SELECT m.id FROM messages m
--       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
--       WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
--     )
--   );

-- =====================================================
-- SECTION 8: SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 039_enhance_messaging_system completed successfully';
  RAISE NOTICE 'Added features:';
  RAISE NOTICE '  - Auto-create #general and project conversations';
  RAISE NOTICE '  - Full-text message search';
  RAISE NOTICE '  - Typing indicators';
  RAISE NOTICE '  - Per-message read receipts';
  RAISE NOTICE '  - Company-wide conversation support';
  RAISE NOTICE '  - DM helper function';
END $$;
