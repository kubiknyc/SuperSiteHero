-- ============================================================================
-- Migration: 137_client_approval_workflows.sql
-- Description: Client approval workflows with public link generation for
--              external client access without authentication
-- Created: 2025-12-15
-- ============================================================================

-- ============================================================================
-- PUBLIC APPROVAL LINKS TABLE
-- Stores JWT-based tokens for public/client access to approval requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public_approval_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to approval request
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,

  -- Token for URL access (JWT or secure random token)
  token TEXT NOT NULL UNIQUE,

  -- Link configuration
  link_type TEXT NOT NULL DEFAULT 'single_use' CHECK (link_type IN ('single_use', 'multi_use')),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  -- Client information
  client_email TEXT, -- Optional: email of intended recipient
  client_name TEXT,  -- Optional: name of client

  -- Security
  ip_restrictions TEXT[], -- Optional: array of allowed IP addresses/ranges
  require_email_verification BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),

  -- Audit
  access_log JSONB DEFAULT '[]'::jsonb
);

-- Comment on table
COMMENT ON TABLE public_approval_links IS 'Secure tokens for public client access to approval requests without authentication';
COMMENT ON COLUMN public_approval_links.token IS 'JWT token or secure random string for URL access';
COMMENT ON COLUMN public_approval_links.link_type IS 'single_use: invalidated after first approval action; multi_use: valid until expiration';
COMMENT ON COLUMN public_approval_links.access_log IS 'JSON array of access events with timestamp, IP, user-agent';

-- ============================================================================
-- CLIENT APPROVAL RESPONSES TABLE
-- Stores responses submitted through public links
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_approval_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to public link and approval request
  public_link_id UUID NOT NULL REFERENCES public_approval_links(id),
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id),

  -- Response
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  comments TEXT,
  conditions TEXT, -- For conditional approvals

  -- Client identity (collected during submission)
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT,
  client_title TEXT,

  -- Digital signature (optional)
  signature_data TEXT, -- Base64 encoded signature image
  signed_at TIMESTAMPTZ,

  -- Attachments
  attachment_ids UUID[], -- References to storage bucket files

  -- Request metadata
  submitted_from_ip TEXT,
  user_agent TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Verification
  email_verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verification_sent_at TIMESTAMPTZ
);

-- Comment on table
COMMENT ON TABLE client_approval_responses IS 'Responses submitted by external clients through public approval links';
COMMENT ON COLUMN client_approval_responses.decision IS 'Client decision: approved, rejected, or changes_requested';
COMMENT ON COLUMN client_approval_responses.signature_data IS 'Optional digital signature as base64 encoded image';

-- ============================================================================
-- APPROVAL REQUEST NOTIFICATIONS TABLE
-- Tracks notifications sent for approval requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_request_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  public_link_id UUID REFERENCES public_approval_links(id),

  -- Notification type
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'request_created',
    'reminder',
    'approval_received',
    'rejection_received',
    'changes_requested',
    'completed',
    'escalated',
    'expiring_soon',
    'link_generated'
  )),

  -- Recipients
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'internal' CHECK (recipient_type IN ('internal', 'client')),

  -- Email details
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,

  -- Status
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment on table
COMMENT ON TABLE approval_request_notifications IS 'Audit trail of all notifications sent for approval requests';

-- ============================================================================
-- RATE LIMITING TABLE
-- Track approval actions by IP for rate limiting
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'view', 'submit', 'verify'
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  UNIQUE(ip_address, action_type, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_window
  ON approval_rate_limits(ip_address, action_type, window_end);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Public links indexes
CREATE INDEX IF NOT EXISTS idx_public_approval_links_token ON public_approval_links(token);
CREATE INDEX IF NOT EXISTS idx_public_approval_links_request ON public_approval_links(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_public_approval_links_expires ON public_approval_links(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_public_approval_links_client_email ON public_approval_links(client_email) WHERE client_email IS NOT NULL;

-- Response indexes
CREATE INDEX IF NOT EXISTS idx_client_responses_link ON client_approval_responses(public_link_id);
CREATE INDEX IF NOT EXISTS idx_client_responses_request ON client_approval_responses(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_client_responses_email ON client_approval_responses(client_email);
CREATE INDEX IF NOT EXISTS idx_client_responses_submitted ON client_approval_responses(submitted_at);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_approval_notifications_request ON approval_request_notifications(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_link ON approval_request_notifications(public_link_id);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_email ON approval_request_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_type ON approval_request_notifications(notification_type);

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION generate_approval_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a 64-character URL-safe token
  token := encode(gen_random_bytes(48), 'base64');
  -- Make URL-safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to validate a public approval link
CREATE OR REPLACE FUNCTION validate_public_approval_link(p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  link_id UUID,
  approval_request_id UUID,
  remaining_uses INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_link public_approval_links%ROWTYPE;
BEGIN
  -- Find the link
  SELECT * INTO v_link
  FROM public_approval_links
  WHERE token = p_token;

  -- Check if link exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::UUID,
      NULL::UUID,
      NULL::INTEGER,
      'Invalid or expired approval link'::TEXT;
    RETURN;
  END IF;

  -- Check if revoked
  IF v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT
      FALSE,
      v_link.id,
      v_link.approval_request_id,
      0::INTEGER,
      'This approval link has been revoked'::TEXT;
    RETURN;
  END IF;

  -- Check expiration
  IF v_link.expires_at < NOW() THEN
    RETURN QUERY SELECT
      FALSE,
      v_link.id,
      v_link.approval_request_id,
      0::INTEGER,
      'This approval link has expired'::TEXT;
    RETURN;
  END IF;

  -- Check usage limit
  IF v_link.link_type = 'single_use' AND v_link.current_uses >= v_link.max_uses THEN
    RETURN QUERY SELECT
      FALSE,
      v_link.id,
      v_link.approval_request_id,
      0::INTEGER,
      'This approval link has already been used'::TEXT;
    RETURN;
  END IF;

  -- Link is valid
  RETURN QUERY SELECT
    TRUE,
    v_link.id,
    v_link.approval_request_id,
    (v_link.max_uses - v_link.current_uses)::INTEGER,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_approval_rate_limit(
  p_ip_address TEXT,
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 10
)
RETURNS TABLE (
  is_allowed BOOLEAN,
  current_count INTEGER,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
) AS $$
DECLARE
  v_current_count INTEGER;
  v_window_end TIMESTAMPTZ;
BEGIN
  -- Clean up old entries
  DELETE FROM approval_rate_limits
  WHERE window_end < NOW();

  -- Get or create rate limit entry
  INSERT INTO approval_rate_limits (ip_address, action_type)
  VALUES (p_ip_address, p_action_type)
  ON CONFLICT (ip_address, action_type, window_start)
  DO UPDATE SET action_count = approval_rate_limits.action_count + 1
  RETURNING action_count, window_end INTO v_current_count, v_window_end;

  -- Return result
  RETURN QUERY SELECT
    v_current_count <= p_max_requests,
    v_current_count,
    GREATEST(0, p_max_requests - v_current_count),
    v_window_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a public approval link
CREATE OR REPLACE FUNCTION create_public_approval_link(
  p_approval_request_id UUID,
  p_created_by UUID,
  p_client_email TEXT DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_link_type TEXT DEFAULT 'single_use',
  p_expires_in_days INTEGER DEFAULT 30,
  p_max_uses INTEGER DEFAULT 1
)
RETURNS public_approval_links AS $$
DECLARE
  v_link public_approval_links;
BEGIN
  INSERT INTO public_approval_links (
    approval_request_id,
    token,
    link_type,
    expires_at,
    max_uses,
    client_email,
    client_name,
    created_by
  ) VALUES (
    p_approval_request_id,
    generate_approval_token(),
    p_link_type,
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_max_uses,
    p_client_email,
    p_client_name,
    p_created_by
  )
  RETURNING * INTO v_link;

  RETURN v_link;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record link access
CREATE OR REPLACE FUNCTION record_link_access(
  p_link_id UUID,
  p_ip_address TEXT,
  p_user_agent TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public_approval_links
  SET
    last_accessed_at = NOW(),
    access_log = access_log || jsonb_build_object(
      'timestamp', NOW(),
      'ip', p_ip_address,
      'user_agent', p_user_agent
    )
  WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit client approval response
CREATE OR REPLACE FUNCTION submit_client_approval_response(
  p_public_link_id UUID,
  p_decision TEXT,
  p_client_name TEXT,
  p_client_email TEXT,
  p_comments TEXT DEFAULT NULL,
  p_conditions TEXT DEFAULT NULL,
  p_client_company TEXT DEFAULT NULL,
  p_client_title TEXT DEFAULT NULL,
  p_signature_data TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS client_approval_responses AS $$
DECLARE
  v_link public_approval_links%ROWTYPE;
  v_response client_approval_responses;
  v_request approval_requests%ROWTYPE;
BEGIN
  -- Get and validate the link
  SELECT * INTO v_link
  FROM public_approval_links
  WHERE id = p_public_link_id
    AND revoked_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired approval link';
  END IF;

  -- Check usage
  IF v_link.link_type = 'single_use' AND v_link.current_uses >= v_link.max_uses THEN
    RAISE EXCEPTION 'This approval link has already been used';
  END IF;

  -- Get the approval request
  SELECT * INTO v_request
  FROM approval_requests
  WHERE id = v_link.approval_request_id;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'This approval request is no longer pending';
  END IF;

  -- Create the response
  INSERT INTO client_approval_responses (
    public_link_id,
    approval_request_id,
    decision,
    comments,
    conditions,
    client_name,
    client_email,
    client_company,
    client_title,
    signature_data,
    signed_at,
    submitted_from_ip,
    user_agent
  ) VALUES (
    p_public_link_id,
    v_link.approval_request_id,
    p_decision,
    p_comments,
    p_conditions,
    p_client_name,
    p_client_email,
    p_client_company,
    p_client_title,
    p_signature_data,
    CASE WHEN p_signature_data IS NOT NULL THEN NOW() ELSE NULL END,
    p_ip_address,
    p_user_agent
  )
  RETURNING * INTO v_response;

  -- Update link usage
  UPDATE public_approval_links
  SET current_uses = current_uses + 1
  WHERE id = p_public_link_id;

  -- Update approval request status based on decision
  UPDATE approval_requests
  SET
    status = CASE
      WHEN p_decision = 'approved' THEN 'approved'
      WHEN p_decision = 'rejected' THEN 'rejected'
      ELSE 'pending' -- changes_requested keeps it pending
    END,
    conditions = COALESCE(p_conditions, conditions),
    completed_at = CASE
      WHEN p_decision IN ('approved', 'rejected') THEN NOW()
      ELSE NULL
    END
  WHERE id = v_link.approval_request_id;

  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public_approval_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_approval_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_request_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rate_limits ENABLE ROW LEVEL SECURITY;

-- Public links policies
CREATE POLICY "Users can view links for their project approvals"
  ON public_approval_links FOR SELECT
  TO authenticated
  USING (
    approval_request_id IN (
      SELECT id FROM approval_requests WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create links for their project approvals"
  ON public_approval_links FOR INSERT
  TO authenticated
  WITH CHECK (
    approval_request_id IN (
      SELECT id FROM approval_requests WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update links they created"
  ON public_approval_links FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Allow anonymous access for public link validation (used by public API)
CREATE POLICY "Anonymous can validate links via token"
  ON public_approval_links FOR SELECT
  TO anon
  USING (
    revoked_at IS NULL
    AND expires_at > NOW()
  );

-- Client responses policies
CREATE POLICY "Users can view responses for their projects"
  ON client_approval_responses FOR SELECT
  TO authenticated
  USING (
    approval_request_id IN (
      SELECT id FROM approval_requests WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Allow anonymous submissions through public links
CREATE POLICY "Anonymous can submit responses through valid links"
  ON client_approval_responses FOR INSERT
  TO anon
  WITH CHECK (
    public_link_id IN (
      SELECT id FROM public_approval_links
      WHERE revoked_at IS NULL
        AND expires_at > NOW()
        AND (link_type = 'multi_use' OR current_uses < max_uses)
    )
  );

-- Notifications policies
CREATE POLICY "Users can view notifications for their projects"
  ON approval_request_notifications FOR SELECT
  TO authenticated
  USING (
    approval_request_id IN (
      SELECT id FROM approval_requests WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create notifications for their projects"
  ON approval_request_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    approval_request_id IN (
      SELECT id FROM approval_requests WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Rate limits - no RLS needed as it's managed by functions

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant to authenticated users
GRANT SELECT, INSERT, UPDATE ON public_approval_links TO authenticated;
GRANT SELECT ON client_approval_responses TO authenticated;
GRANT SELECT, INSERT ON approval_request_notifications TO authenticated;

-- Grant to anonymous for public access
GRANT SELECT ON public_approval_links TO anon;
GRANT INSERT ON client_approval_responses TO anon;

-- Function grants
GRANT EXECUTE ON FUNCTION generate_approval_token TO authenticated;
GRANT EXECUTE ON FUNCTION validate_public_approval_link TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_approval_rate_limit TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_approval_link TO authenticated;
GRANT EXECUTE ON FUNCTION record_link_access TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_client_approval_response TO anon, authenticated;

-- ============================================================================
-- STORAGE BUCKET FOR CLIENT ATTACHMENTS
-- ============================================================================

-- Create storage bucket for client approval attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-approval-attachments',
  'client-approval-attachments',
  false,
  10485760, -- 10MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client attachments
CREATE POLICY "Project members can view approval attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-approval-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can upload approval attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-approval-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Allow anonymous uploads through public links (controlled by application logic)
CREATE POLICY "Anonymous can upload through public links"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'client-approval-attachments'
  );
