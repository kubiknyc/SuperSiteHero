-- File Upload Audit Log
-- Tracks all file upload validation attempts for security monitoring

CREATE TABLE IF NOT EXISTS file_upload_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,

  -- User context
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- File information
  filename text NOT NULL,
  bucket text,
  file_size bigint,
  claimed_mime_type text,
  detected_mime_type text,

  -- Validation result
  validation_result text NOT NULL CHECK (validation_result IN ('allowed', 'rejected', 'blocked')),
  rejection_reason text,
  warnings text[],

  -- Request context
  ip_address inet,
  user_agent text
);

-- Indexes for efficient querying
CREATE INDEX idx_file_upload_audit_user_id ON file_upload_audit(user_id);
CREATE INDEX idx_file_upload_audit_created_at ON file_upload_audit(created_at DESC);
CREATE INDEX idx_file_upload_audit_result ON file_upload_audit(validation_result);
CREATE INDEX idx_file_upload_audit_bucket ON file_upload_audit(bucket);

-- RLS policies
ALTER TABLE file_upload_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (Edge Functions use service role)
CREATE POLICY "Service role can insert audit logs"
  ON file_upload_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON file_upload_audit
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON file_upload_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
  );

-- Comment for documentation
COMMENT ON TABLE file_upload_audit IS 'Audit log for file upload validation attempts - security monitoring';
COMMENT ON COLUMN file_upload_audit.validation_result IS 'allowed=passed validation, rejected=failed validation, blocked=blocked extension';
