-- =============================================
-- Migration: 139_message_search_index.sql
-- Description: Full-text search indexing for messages in semantic search
-- Created: 2025-12-15
--
-- Features:
--   - Verifies GIN index for full-text search on messages.content
--   - Adds helper function for message search with conversation permissions
--   - Documents integration with semantic search service
-- NOTE: This migration is defensive and will skip if messages table doesn't exist
-- =============================================

-- =============================================
-- ENSURE FULL-TEXT SEARCH INDEX EXISTS
-- =============================================

-- This index should already exist from migration 029_messaging_system.sql
-- But we ensure it exists here for completeness
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_messages_content_search
      ON messages
      USING GIN(to_tsvector('english', content))
      WHERE deleted_at IS NULL;

    RAISE NOTICE 'Created full-text search index on messages.content';
  ELSE
    RAISE NOTICE 'Messages table or content column does not exist - skipping index creation';
  END IF;
END $$;

-- =============================================
-- HELPER FUNCTION FOR MESSAGE SEARCH
-- =============================================

-- Only create the search function if messages table exists with required schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversations'
  ) THEN
    -- Create the function using dynamic SQL to avoid syntax issues
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION search_messages_semantic(
        search_terms TEXT[],
        p_user_id UUID,
        p_project_id UUID DEFAULT NULL,
        p_limit INTEGER DEFAULT 50
      )
      RETURNS TABLE (
        id UUID,
        content TEXT,
        conversation_id UUID,
        sender_id UUID,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        conversation_name TEXT,
        conversation_type conversation_type,
        project_id UUID,
        project_name TEXT,
        relevance_score REAL
      ) AS $body$
      BEGIN
        RETURN QUERY
        SELECT
          m.id,
          m.content,
          m.conversation_id,
          m.sender_id,
          m.created_at,
          m.updated_at,
          c.name as conversation_name,
          c.type as conversation_type,
          c.project_id,
          p.name as project_name,
          -- Calculate relevance score based on text matching
          GREATEST(
            ts_rank(
              to_tsvector('english', m.content),
              plainto_tsquery('english', array_to_string(search_terms, ' '))
            ),
            0.1
          ) AS relevance_score
        FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        LEFT JOIN projects p ON p.id = c.project_id
        WHERE
          -- User must be a participant in the conversation
          cp.user_id = p_user_id
          AND cp.left_at IS NULL
          -- Message not deleted
          AND m.deleted_at IS NULL
          AND c.deleted_at IS NULL
          -- Filter by project if specified
          AND (p_project_id IS NULL OR c.project_id = p_project_id)
          -- Text search: match any of the search terms
          AND (
            -- Use full-text search with OR operator
            to_tsvector('english', m.content) @@ plainto_tsquery('english', array_to_string(search_terms, ' | '))
            OR
            -- Fallback to ILIKE for partial matches
            EXISTS (
              SELECT 1 FROM unnest(search_terms) term
              WHERE m.content ILIKE '%' || term || '%'
            )
          )
        ORDER BY relevance_score DESC, m.created_at DESC
        LIMIT p_limit;
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER
    $func$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION search_messages_semantic TO authenticated;

    RAISE NOTICE 'Created search_messages_semantic function';
  ELSE
    RAISE NOTICE 'Messages or conversations table does not exist - skipping search function creation';
  END IF;
END $$;

-- =============================================
-- VERIFY RLS POLICIES
-- =============================================

-- Note: RLS policies for messages should already exist from migration 029
-- The search function uses SECURITY DEFINER and checks conversation_participants
-- to ensure users can only search messages they have access to

-- Verify that messages table has RLS enabled (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'messages'
      AND rowsecurity = true
    ) THEN
      RAISE NOTICE 'Enabling RLS on messages table';
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    END IF;
  END IF;
END $$;

-- =============================================
-- TABLE COMMENTS (if table exists)
-- =============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'COMMENT ON TABLE messages IS ' ||
      quote_literal('In-app messages with full-text search integration. ' ||
        'Integrated with semantic search service for cross-conversation search. ' ||
        'Access controlled via conversation_participants.');
  END IF;
END $$;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 139_message_search_index completed successfully';
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    RAISE NOTICE 'Message full-text search is now integrated with semantic search';
    RAISE NOTICE 'Users can search across all their conversations using natural language';
  ELSE
    RAISE NOTICE 'Messages table does not exist - migration will be fully applied when messaging system is set up';
  END IF;
END $$;
