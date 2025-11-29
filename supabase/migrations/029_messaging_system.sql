/**
 * Messaging System - Database Schema
 *
 * Creates tables for real-time in-app messaging:
 * - conversations (direct, group, project chats)
 * - conversation_participants (who's in each conversation)
 * - messages (the actual messages)
 * - message_reactions (emoji reactions)
 */

-- =====================================================
-- ENUMS
-- =====================================================

DO $$ BEGIN CREATE TYPE conversation_type AS ENUM ('direct', 'group', 'project'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE message_type AS ENUM ('text', 'file', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL,
  name TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT conversation_name_required_for_group CHECK (
    (type = 'direct' AND name IS NULL) OR
    (type IN ('group', 'project') AND name IS NOT NULL)
  ),
  CONSTRAINT conversation_project_required CHECK (
    (type = 'project' AND project_id IS NOT NULL) OR
    (type IN ('direct', 'group'))
  )
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type) WHERE deleted_at IS NULL;

-- =====================================================
-- CONVERSATION PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN NOT NULL DEFAULT false,

  -- Prevent duplicate active participants
  UNIQUE(conversation_id, user_id)
);

-- Indexes for participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_unread ON conversation_participants(user_id, last_read_at) WHERE left_at IS NULL;

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  attachments JSONB,
  mentioned_users UUID[],
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT message_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT message_attachments_valid CHECK (
    attachments IS NULL OR
    jsonb_typeof(attachments) = 'array'
  )
);

-- Indexes for messages (conditional on column existence)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'parent_message_id') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL AND deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'mentioned_users') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_mentioned_users ON messages USING GIN(mentioned_users) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GIN(to_tsvector('english', content)) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- =====================================================
-- MESSAGE REACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate reactions
  UNIQUE(message_id, user_id, emoji),

  -- Constraints
  CONSTRAINT reaction_emoji_not_empty CHECK (length(trim(emoji)) > 0)
);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update conversation.updated_at on any change
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Update conversation.last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message_at
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION update_conversation_last_message_at();

-- Auto-set edited_at on message update (only if content column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
    CREATE OR REPLACE FUNCTION update_message_edited_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW.content != OLD.content THEN
        NEW.edited_at = now();
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_message_edited_at ON messages;
    CREATE TRIGGER trigger_message_edited_at
      BEFORE UPDATE ON messages
      FOR EACH ROW
      WHEN (OLD.content IS DISTINCT FROM NEW.content)
      EXECUTE FUNCTION update_message_edited_at();
  END IF;
END $$;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get unread message count for a user in a conversation
CREATE OR REPLACE FUNCTION get_unread_message_count(
  p_user_id UUID,
  p_conversation_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_last_read_at TIMESTAMPTZ;
  v_unread_count INTEGER;
BEGIN
  -- Get user's last read timestamp
  SELECT last_read_at INTO v_last_read_at
  FROM conversation_participants
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id
    AND left_at IS NULL;

  -- Count messages after last read
  SELECT COUNT(*) INTO v_unread_count
  FROM messages
  WHERE conversation_id = p_conversation_id
    AND deleted_at IS NULL
    AND sender_id != p_user_id
    AND (v_last_read_at IS NULL OR created_at > v_last_read_at);

  RETURN COALESCE(v_unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get total unread count across all conversations for a user
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER := 0;
  v_conv RECORD;
BEGIN
  FOR v_conv IN
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = p_user_id
      AND left_at IS NULL
  LOOP
    v_total := v_total + get_unread_message_count(p_user_id, v_conv.conversation_id);
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Find or create direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
  p_user_id_1 UUID,
  p_user_id_2 UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Find existing direct conversation
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND c.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id
        AND cp1.user_id = p_user_id_1
        AND cp1.left_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id
        AND cp2.user_id = p_user_id_2
        AND cp2.left_at IS NULL
    )
  LIMIT 1;

  -- Create new conversation if not found
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', p_user_id_1)
    RETURNING id INTO v_conversation_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
      (v_conversation_id, p_user_id_1),
      (v_conversation_id, p_user_id_2);
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see conversations they're participants in
CREATE POLICY conversations_select ON conversations
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Conversations: Users can create conversations
CREATE POLICY conversations_insert ON conversations
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Conversations: Creators can update their conversations
CREATE POLICY conversations_update ON conversations
  FOR UPDATE
  USING (created_by = auth.uid());

-- Conversations: Creators can soft-delete conversations
CREATE POLICY conversations_delete ON conversations
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (deleted_at IS NOT NULL);

-- Participants: Users can see participants in their conversations
CREATE POLICY participants_select ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Participants: Conversation creators can add participants
CREATE POLICY participants_insert ON conversation_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND c.created_by = auth.uid()
    )
  );

-- Participants: Users can update their own participant record
CREATE POLICY participants_update ON conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());

-- Messages: Skip policies if expected columns don't exist (pre-existing table has different schema)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
    DROP POLICY IF EXISTS messages_select ON messages;
    CREATE POLICY messages_select ON messages
      FOR SELECT
      USING (
        deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
    DROP POLICY IF EXISTS messages_insert ON messages;
    CREATE POLICY messages_insert ON messages
      FOR INSERT
      WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );

    DROP POLICY IF EXISTS messages_update ON messages;
    CREATE POLICY messages_update ON messages
      FOR UPDATE
      USING (sender_id = auth.uid());

    DROP POLICY IF EXISTS messages_delete ON messages;
    CREATE POLICY messages_delete ON messages
      FOR UPDATE
      USING (sender_id = auth.uid())
      WITH CHECK (deleted_at IS NOT NULL);
  END IF;
END $$;

-- Reactions: Conditional policies based on messages table schema
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
    DROP POLICY IF EXISTS reactions_select ON message_reactions;
    CREATE POLICY reactions_select ON message_reactions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM messages m
          JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
          WHERE m.id = message_reactions.message_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );

    DROP POLICY IF EXISTS reactions_insert ON message_reactions;
    CREATE POLICY reactions_insert ON message_reactions
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM messages m
          JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
          WHERE m.id = message_reactions.message_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );
  END IF;

  DROP POLICY IF EXISTS reactions_delete ON message_reactions;
  CREATE POLICY reactions_delete ON message_reactions
    FOR DELETE
    USING (user_id = auth.uid());
END $$;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant usage on custom types
GRANT USAGE ON TYPE conversation_type TO authenticated;
GRANT USAGE ON TYPE message_type TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON message_reactions TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation(UUID, UUID) TO authenticated;
