-- Migration: DocuSign E-Signature Integration
-- Adds tables for OAuth connections, envelopes, recipients, and audit events

-- ============================================================================
-- DocuSign Connections (OAuth Integration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS docusign_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- DocuSign account info
  account_id TEXT NOT NULL,
  account_name TEXT,
  base_uri TEXT,

  -- OAuth tokens (encrypted at rest by Supabase)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Configuration
  is_demo BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Webhook configuration
  webhook_uri TEXT,
  webhook_secret TEXT,

  -- Status tracking
  last_connected_at TIMESTAMPTZ,
  connection_error TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_company_connection UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE docusign_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies - only company admins can manage connections
CREATE POLICY "Company admins can view their connections"
  ON docusign_connections FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company admins can manage their connections"
  ON docusign_connections FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- OAuth State Tokens (CSRF Protection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS docusign_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_demo BOOLEAN DEFAULT false,
  return_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE docusign_oauth_states ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their OAuth states
CREATE POLICY "Users can manage OAuth states for their companies"
  ON docusign_oauth_states FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- Auto-cleanup expired states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM docusign_oauth_states WHERE expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup on insert
CREATE TRIGGER cleanup_oauth_states_trigger
  AFTER INSERT ON docusign_oauth_states
  EXECUTE FUNCTION cleanup_expired_oauth_states();

-- ============================================================================
-- DocuSign Envelopes (Signature Requests)
-- ============================================================================

CREATE TABLE IF NOT EXISTS docusign_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES docusign_connections(id) ON DELETE CASCADE,

  -- DocuSign envelope ID
  envelope_id TEXT NOT NULL,

  -- Local document reference
  document_type TEXT NOT NULL CHECK (document_type IN (
    'payment_application', 'change_order', 'lien_waiver',
    'contract', 'subcontract', 'other'
  )),
  local_document_id UUID NOT NULL,
  local_document_number TEXT,

  -- Envelope status
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', 'sent', 'delivered', 'signed', 'completed',
    'declined', 'voided', 'deleted'
  )),

  -- Email content
  subject TEXT,
  message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  expires_at TIMESTAMPTZ,

  -- Settings
  signing_order_enabled BOOLEAN DEFAULT false,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_delay_days INTEGER,
  reminder_frequency_days INTEGER,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_docusign_envelopes_company
  ON docusign_envelopes(company_id);
CREATE INDEX IF NOT EXISTS idx_docusign_envelopes_envelope_id
  ON docusign_envelopes(envelope_id);
CREATE INDEX IF NOT EXISTS idx_docusign_envelopes_document
  ON docusign_envelopes(document_type, local_document_id);
CREATE INDEX IF NOT EXISTS idx_docusign_envelopes_status
  ON docusign_envelopes(status) WHERE status IN ('sent', 'delivered');

-- Enable RLS
ALTER TABLE docusign_envelopes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view envelopes for their companies"
  ON docusign_envelopes FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage envelopes for their companies"
  ON docusign_envelopes FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Envelope Recipients
-- ============================================================================

CREATE TABLE IF NOT EXISTS docusign_envelope_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_db_id UUID NOT NULL REFERENCES docusign_envelopes(id) ON DELETE CASCADE,

  -- DocuSign recipient info
  recipient_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN (
    'signer', 'cc', 'certifiedDelivery', 'inPersonSigner', 'notary', 'witness'
  )),

  -- Recipient details
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role_name TEXT,
  routing_order INTEGER DEFAULT 1,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', 'sent', 'delivered', 'signed', 'completed',
    'declined', 'autoresponded'
  )),
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  delivered_at TIMESTAMPTZ,

  -- Embedded signing
  client_user_id TEXT,
  user_id UUID REFERENCES auth.users(id),

  -- Authentication
  authentication_method TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_docusign_recipients_envelope
  ON docusign_envelope_recipients(envelope_db_id);
CREATE INDEX IF NOT EXISTS idx_docusign_recipients_email
  ON docusign_envelope_recipients(email);

-- Enable RLS
ALTER TABLE docusign_envelope_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies through envelope relationship
CREATE POLICY "Users can view recipients for their envelopes"
  ON docusign_envelope_recipients FOR SELECT
  USING (
    envelope_db_id IN (
      SELECT id FROM docusign_envelopes
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage recipients for their envelopes"
  ON docusign_envelope_recipients FOR ALL
  USING (
    envelope_db_id IN (
      SELECT id FROM docusign_envelopes
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Envelope Documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS docusign_envelope_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_db_id UUID NOT NULL REFERENCES docusign_envelopes(id) ON DELETE CASCADE,

  -- DocuSign document info
  document_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_extension TEXT,
  uri TEXT,
  "order" INTEGER DEFAULT 1,
  pages INTEGER,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_docusign_documents_envelope
  ON docusign_envelope_documents(envelope_db_id);

-- Enable RLS
ALTER TABLE docusign_envelope_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view documents for their envelopes"
  ON docusign_envelope_documents FOR SELECT
  USING (
    envelope_db_id IN (
      SELECT id FROM docusign_envelopes
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Signature Tab Placements
-- ============================================================================

CREATE TABLE IF NOT EXISTS docusign_signature_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_db_id UUID NOT NULL REFERENCES docusign_envelopes(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,

  -- Tab configuration
  tab_type TEXT NOT NULL CHECK (tab_type IN (
    'signHere', 'initialHere', 'dateSigned', 'text',
    'checkbox', 'company', 'title'
  )),
  tab_label TEXT,

  -- Position
  page_number INTEGER NOT NULL,
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,

  -- Settings
  required BOOLEAN DEFAULT true,
  locked BOOLEAN DEFAULT false,
  value TEXT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_docusign_tabs_envelope
  ON docusign_signature_tabs(envelope_db_id);

-- Enable RLS
ALTER TABLE docusign_signature_tabs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view tabs for their envelopes"
  ON docusign_signature_tabs FOR SELECT
  USING (
    envelope_db_id IN (
      SELECT id FROM docusign_envelopes
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Envelope Events (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS docusign_envelope_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_db_id UUID NOT NULL REFERENCES docusign_envelopes(id) ON DELETE CASCADE,

  -- Event info
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,

  -- Recipient info (if applicable)
  recipient_email TEXT,
  recipient_name TEXT,

  -- Request details
  ip_address TEXT,
  user_agent TEXT,

  -- Additional data
  details JSONB,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_docusign_events_envelope
  ON docusign_envelope_events(envelope_db_id, event_time DESC);

-- Enable RLS
ALTER TABLE docusign_envelope_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view events for their envelopes"
  ON docusign_envelope_events FOR SELECT
  USING (
    envelope_db_id IN (
      SELECT id FROM docusign_envelopes
      WHERE company_id IN (
        SELECT company_id FROM user_company_access
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Updated At Triggers
-- ============================================================================

CREATE TRIGGER update_docusign_connections_updated_at
  BEFORE UPDATE ON docusign_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_docusign_envelopes_updated_at
  BEFORE UPDATE ON docusign_envelopes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_docusign_recipients_updated_at
  BEFORE UPDATE ON docusign_envelope_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update envelope status from DocuSign webhook
CREATE OR REPLACE FUNCTION update_envelope_status_from_webhook(
  p_envelope_id TEXT,
  p_status TEXT,
  p_event_type TEXT,
  p_event_time TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
  v_envelope_db_id UUID;
BEGIN
  -- Get envelope database ID
  SELECT id INTO v_envelope_db_id
  FROM docusign_envelopes
  WHERE envelope_id = p_envelope_id;

  IF v_envelope_db_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Update envelope status
  UPDATE docusign_envelopes
  SET
    status = p_status,
    completed_at = CASE WHEN p_status = 'completed' THEN p_event_time ELSE completed_at END,
    updated_at = now()
  WHERE id = v_envelope_db_id;

  -- Log event
  INSERT INTO docusign_envelope_events (
    envelope_db_id, event_type, event_time
  ) VALUES (
    v_envelope_db_id, p_event_type, p_event_time
  );

  RETURN v_envelope_db_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update recipient status from DocuSign webhook
CREATE OR REPLACE FUNCTION update_recipient_status_from_webhook(
  p_envelope_id TEXT,
  p_recipient_email TEXT,
  p_status TEXT,
  p_event_time TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID AS $$
DECLARE
  v_envelope_db_id UUID;
BEGIN
  -- Get envelope database ID
  SELECT id INTO v_envelope_db_id
  FROM docusign_envelopes
  WHERE envelope_id = p_envelope_id;

  IF v_envelope_db_id IS NULL THEN
    RETURN;
  END IF;

  -- Update recipient status
  UPDATE docusign_envelope_recipients
  SET
    status = p_status,
    signed_at = CASE WHEN p_status = 'signed' THEN p_event_time ELSE signed_at END,
    delivered_at = CASE WHEN p_status = 'delivered' THEN p_event_time ELSE delivered_at END,
    updated_at = now()
  WHERE envelope_db_id = v_envelope_db_id
    AND email = p_recipient_email;

  -- Log event
  INSERT INTO docusign_envelope_events (
    envelope_db_id, event_type, event_time, recipient_email
  ) VALUES (
    v_envelope_db_id, 'recipient_' || p_status, p_event_time, p_recipient_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- View for Envelope Summary
-- ============================================================================

CREATE OR REPLACE VIEW docusign_envelope_summary AS
SELECT
  e.id,
  e.company_id,
  e.envelope_id,
  e.document_type,
  e.local_document_id,
  e.local_document_number,
  e.status,
  e.subject,
  e.sent_at,
  e.completed_at,
  e.created_at,
  e.created_by,
  -- Recipient counts
  COUNT(r.id) FILTER (WHERE r.recipient_type = 'signer') as signer_count,
  COUNT(r.id) FILTER (WHERE r.status = 'signed') as signed_count,
  -- Next signer info
  (
    SELECT json_build_object('name', r2.name, 'email', r2.email, 'status', r2.status)
    FROM docusign_envelope_recipients r2
    WHERE r2.envelope_db_id = e.id
      AND r2.recipient_type = 'signer'
      AND r2.status IN ('sent', 'delivered')
    ORDER BY r2.routing_order
    LIMIT 1
  ) as next_signer
FROM docusign_envelopes e
LEFT JOIN docusign_envelope_recipients r ON r.envelope_db_id = e.id
GROUP BY e.id;

-- Grant permissions
GRANT SELECT ON docusign_envelope_summary TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE docusign_connections IS 'DocuSign OAuth connections per company';
COMMENT ON TABLE docusign_oauth_states IS 'Temporary OAuth state tokens for CSRF protection';
COMMENT ON TABLE docusign_envelopes IS 'DocuSign envelope (signature request) records';
COMMENT ON TABLE docusign_envelope_recipients IS 'Recipients on DocuSign envelopes';
COMMENT ON TABLE docusign_envelope_documents IS 'Documents attached to DocuSign envelopes';
COMMENT ON TABLE docusign_signature_tabs IS 'Signature/field placement coordinates';
COMMENT ON TABLE docusign_envelope_events IS 'Audit log of envelope events';
