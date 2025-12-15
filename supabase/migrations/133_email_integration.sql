-- Migration: 133_email_integration
-- Description: Email integration for in-app email management
-- Features: Email accounts, emails, threads, and entity linking
-- Created: 2025-12-15

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE email_provider AS ENUM ('gmail', 'outlook', 'imap');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_sync_status AS ENUM ('pending', 'syncing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_folder AS ENUM ('inbox', 'sent', 'drafts', 'trash', 'archive', 'spam', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- EMAIL ACCOUNTS TABLE
-- ============================================================================
-- Stores connected email accounts with OAuth tokens

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Account info
  email_address TEXT NOT NULL,
  display_name TEXT,
  provider email_provider NOT NULL,

  -- OAuth tokens (encrypted at rest via Supabase)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- IMAP settings (for generic IMAP)
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,

  -- Sync settings
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status email_sync_status NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  sync_from_date TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),

  -- Connection status
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint per user
  UNIQUE(user_id, email_address)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_accounts_company ON email_accounts(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_accounts_sync ON email_accounts(sync_enabled, last_sync_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider);

-- ============================================================================
-- EMAIL THREADS TABLE
-- ============================================================================
-- Groups emails into conversation threads

CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

  -- Thread identification
  thread_id TEXT, -- Provider's thread ID (Gmail/Outlook)
  subject TEXT NOT NULL,

  -- Thread metadata
  message_count INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  has_attachments BOOLEAN NOT NULL DEFAULT false,

  -- Participants
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: [{"email": "...", "name": "..."}, ...]

  -- Latest message preview
  snippet TEXT,
  last_message_at TIMESTAMPTZ,

  -- Status
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  folder email_folder NOT NULL DEFAULT 'inbox',
  labels TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(account_id, thread_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_threads_account ON email_threads(account_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_account_folder ON email_threads(account_id, folder, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_thread_id ON email_threads(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_threads_unread ON email_threads(account_id, unread_count) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS idx_email_threads_starred ON email_threads(account_id, is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_email_threads_subject ON email_threads USING GIN(to_tsvector('english', subject));

-- ============================================================================
-- EMAILS TABLE
-- ============================================================================
-- Stores individual email messages

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES email_threads(id) ON DELETE CASCADE,

  -- Email identification
  message_id TEXT NOT NULL, -- RFC 2822 Message-ID header
  provider_id TEXT, -- Provider's internal ID
  in_reply_to TEXT, -- Message-ID this is replying to
  references TEXT[], -- Chain of Message-IDs

  -- Sender
  from_address TEXT NOT NULL,
  from_name TEXT,

  -- Recipients
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB DEFAULT '[]'::jsonb,
  bcc_addresses JSONB DEFAULT '[]'::jsonb,
  reply_to_address TEXT,

  -- Content
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  snippet TEXT, -- Preview text

  -- Attachments metadata
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"id": "...", "name": "...", "mime_type": "...", "size": 123, "storage_path": "..."}]
  has_attachments BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  folder email_folder NOT NULL DEFAULT 'inbox',
  labels TEXT[] DEFAULT '{}',

  -- Timestamps from email headers
  date_sent TIMESTAMPTZ NOT NULL,
  date_received TIMESTAMPTZ,

  -- System timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate emails
  UNIQUE(account_id, message_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder, date_sent DESC);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_emails_provider_id ON emails(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_unread ON emails(account_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_emails_starred ON emails(account_id, is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(account_id, date_sent DESC);
CREATE INDEX IF NOT EXISTS idx_emails_search ON emails USING GIN(to_tsvector('english', subject || ' ' || COALESCE(body_text, '')));
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_address);

-- ============================================================================
-- EMAIL ENTITY LINKS TABLE
-- ============================================================================
-- Links emails to projects, RFIs, submittals, etc.

CREATE TABLE IF NOT EXISTS email_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email reference (can link to email or thread)
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES email_threads(id) ON DELETE CASCADE,

  -- Entity reference (polymorphic)
  entity_type TEXT NOT NULL,
  -- Supported types: 'project', 'rfi', 'submittal', 'change_order', 'daily_report', 'contact', 'bid_package'
  entity_id UUID NOT NULL,

  -- Link metadata
  link_type TEXT NOT NULL DEFAULT 'manual',
  -- Types: 'manual', 'auto', 'ai_suggested'
  confidence_score NUMERIC(3,2), -- For AI-suggested links (0.00 to 1.00)

  -- Who created the link
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure email or thread is linked, not both
  CONSTRAINT email_entity_links_one_source CHECK (
    (email_id IS NOT NULL AND thread_id IS NULL) OR
    (email_id IS NULL AND thread_id IS NOT NULL)
  ),

  -- Unique links
  UNIQUE(email_id, entity_type, entity_id),
  UNIQUE(thread_id, entity_type, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_entity_links_email ON email_entity_links(email_id) WHERE email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_entity_links_thread ON email_entity_links(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_entity_links_entity ON email_entity_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_entity_links_type ON email_entity_links(link_type);

-- ============================================================================
-- EMAIL SYNC LOG TABLE
-- ============================================================================
-- Tracks sync operations for debugging

CREATE TABLE IF NOT EXISTS email_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL DEFAULT 'incremental',
  -- Types: 'full', 'incremental', 'webhook'

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Results
  status email_sync_status NOT NULL DEFAULT 'syncing',
  emails_fetched INTEGER DEFAULT 0,
  emails_created INTEGER DEFAULT 0,
  emails_updated INTEGER DEFAULT 0,
  error_message TEXT,

  -- Sync cursor for pagination
  sync_cursor TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sync_logs_account ON email_sync_logs(account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sync_logs_status ON email_sync_logs(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER trigger_email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER trigger_emails_updated_at
  BEFORE UPDATE ON emails
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

-- Update thread counts when email is inserted/updated/deleted
CREATE OR REPLACE FUNCTION update_thread_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE email_threads SET
      message_count = message_count + 1,
      unread_count = unread_count + CASE WHEN NEW.is_read = false THEN 1 ELSE 0 END,
      has_attachments = has_attachments OR NEW.has_attachments,
      last_message_at = GREATEST(last_message_at, NEW.date_sent),
      snippet = CASE WHEN NEW.date_sent > COALESCE(last_message_at, '1970-01-01') THEN NEW.snippet ELSE snippet END,
      updated_at = now()
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle read status change
    IF OLD.is_read != NEW.is_read THEN
      UPDATE email_threads SET
        unread_count = unread_count + CASE WHEN NEW.is_read THEN -1 ELSE 1 END,
        updated_at = now()
      WHERE id = NEW.thread_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE email_threads SET
      message_count = message_count - 1,
      unread_count = unread_count - CASE WHEN OLD.is_read = false THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_counts
  AFTER INSERT OR UPDATE OR DELETE ON emails
  FOR EACH ROW EXECUTE FUNCTION update_thread_counts();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get unread email count for a user
CREATE OR REPLACE FUNCTION get_unread_email_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(t.unread_count), 0)::INTEGER INTO v_count
  FROM email_threads t
  JOIN email_accounts a ON a.id = t.account_id
  WHERE a.user_id = p_user_id
    AND a.is_active = true
    AND t.folder = 'inbox'
    AND NOT t.is_archived;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search emails with full-text search
CREATE OR REPLACE FUNCTION search_emails(
  p_user_id UUID,
  p_query TEXT,
  p_folder email_folder DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  email_id UUID,
  thread_id UUID,
  subject TEXT,
  snippet TEXT,
  from_address TEXT,
  from_name TEXT,
  date_sent TIMESTAMPTZ,
  is_read BOOLEAN,
  has_attachments BOOLEAN,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as email_id,
    e.thread_id,
    e.subject,
    e.snippet,
    e.from_address,
    e.from_name,
    e.date_sent,
    e.is_read,
    e.has_attachments,
    ts_rank(to_tsvector('english', e.subject || ' ' || COALESCE(e.body_text, '')), plainto_tsquery('english', p_query)) as rank
  FROM emails e
  JOIN email_accounts a ON a.id = e.account_id
  WHERE a.user_id = p_user_id
    AND a.is_active = true
    AND (p_folder IS NULL OR e.folder = p_folder)
    AND to_tsvector('english', e.subject || ' ' || COALESCE(e.body_text, '')) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, e.date_sent DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get emails linked to an entity
CREATE OR REPLACE FUNCTION get_entity_emails(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  email_id UUID,
  thread_id UUID,
  subject TEXT,
  snippet TEXT,
  from_address TEXT,
  from_name TEXT,
  date_sent TIMESTAMPTZ,
  link_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    COALESCE(l.email_id, e.id) as email_id,
    COALESCE(l.thread_id, e.thread_id) as thread_id,
    e.subject,
    e.snippet,
    e.from_address,
    e.from_name,
    e.date_sent,
    l.link_type
  FROM email_entity_links l
  LEFT JOIN emails e ON e.id = l.email_id OR e.thread_id = l.thread_id
  WHERE l.entity_type = p_entity_type
    AND l.entity_id = p_entity_id
  ORDER BY e.date_sent DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_logs ENABLE ROW LEVEL SECURITY;

-- Email accounts: Users can only see their own accounts
CREATE POLICY email_accounts_select ON email_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY email_accounts_insert ON email_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY email_accounts_update ON email_accounts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY email_accounts_delete ON email_accounts
  FOR DELETE USING (user_id = auth.uid());

-- Email threads: Users can see threads from their accounts
CREATE POLICY email_threads_select ON email_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM email_accounts a
      WHERE a.id = email_threads.account_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY email_threads_insert ON email_threads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts a
      WHERE a.id = email_threads.account_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY email_threads_update ON email_threads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM email_accounts a
      WHERE a.id = email_threads.account_id
        AND a.user_id = auth.uid()
    )
  );

-- Emails: Users can see emails from their accounts
CREATE POLICY emails_select ON emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM email_accounts a
      WHERE a.id = emails.account_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY emails_insert ON emails
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts a
      WHERE a.id = emails.account_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY emails_update ON emails
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM email_accounts a
      WHERE a.id = emails.account_id
        AND a.user_id = auth.uid()
    )
  );

-- Entity links: Users can see links for emails they own
CREATE POLICY email_entity_links_select ON email_entity_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM emails e
      JOIN email_accounts a ON a.id = e.account_id
      WHERE (e.id = email_entity_links.email_id OR e.thread_id = email_entity_links.thread_id)
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY email_entity_links_insert ON email_entity_links
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY email_entity_links_delete ON email_entity_links
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- Sync logs: Users can see logs for their accounts
CREATE POLICY email_sync_logs_select ON email_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM email_accounts a
      WHERE a.id = email_sync_logs.account_id
        AND a.user_id = auth.uid()
    )
  );

-- Service role full access for edge functions
CREATE POLICY email_accounts_service ON email_accounts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY email_threads_service ON email_threads
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY emails_service ON emails
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY email_entity_links_service ON email_entity_links
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY email_sync_logs_service ON email_sync_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'text/plain', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload email attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their email attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their email attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON TYPE email_provider TO authenticated;
GRANT USAGE ON TYPE email_sync_status TO authenticated;
GRANT USAGE ON TYPE email_folder TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON email_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON email_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON emails TO authenticated;
GRANT SELECT, INSERT, DELETE ON email_entity_links TO authenticated;
GRANT SELECT ON email_sync_logs TO authenticated;

GRANT EXECUTE ON FUNCTION get_unread_email_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_emails(UUID, TEXT, email_folder, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_entity_emails(TEXT, UUID, INTEGER) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE email_accounts IS 'Connected email accounts with OAuth tokens for Gmail/Outlook integration';
COMMENT ON TABLE email_threads IS 'Email conversation threads grouping related messages';
COMMENT ON TABLE emails IS 'Individual email messages synced from connected accounts';
COMMENT ON TABLE email_entity_links IS 'Links between emails and project entities (RFIs, submittals, etc.)';
COMMENT ON TABLE email_sync_logs IS 'Sync operation logs for debugging email synchronization';
COMMENT ON COLUMN email_accounts.provider IS 'Email provider: gmail, outlook, or generic imap';
COMMENT ON COLUMN email_entity_links.link_type IS 'How the link was created: manual, auto (rule-based), or ai_suggested';
