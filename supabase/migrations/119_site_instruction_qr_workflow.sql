-- Migration: Site Instruction QR Code Workflow - RPC Functions
-- Description: Add stored procedures for QR code token management

-- Function to refresh QR code token (regenerate with new expiration)
CREATE OR REPLACE FUNCTION refresh_site_instruction_qr_token(
  instruction_id UUID,
  expires_in_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  qr_code_token UUID,
  qr_code_expires_at TIMESTAMPTZ
) AS $$
DECLARE
  new_token UUID;
  new_expiration TIMESTAMPTZ;
BEGIN
  -- Generate new token and expiration
  new_token := gen_random_uuid();
  new_expiration := NOW() + (expires_in_days || ' days')::INTERVAL;

  -- Update the instruction
  UPDATE site_instructions
  SET
    qr_code_token = new_token,
    qr_code_expires_at = new_expiration,
    updated_at = NOW()
  WHERE site_instructions.id = instruction_id;

  -- Return the updated instruction
  RETURN QUERY
  SELECT
    site_instructions.id,
    site_instructions.qr_code_token,
    site_instructions.qr_code_expires_at
  FROM site_instructions
  WHERE site_instructions.id = instruction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get site instruction by QR token
CREATE OR REPLACE FUNCTION get_site_instruction_by_qr_token(token UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  reference_number TEXT,
  instruction_number TEXT,
  title TEXT,
  description TEXT,
  subcontractor_id UUID,
  status TEXT,
  priority TEXT,
  due_date TIMESTAMPTZ,
  qr_code_token UUID,
  qr_code_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if token is valid and not expired
  IF NOT EXISTS (
    SELECT 1 FROM site_instructions
    WHERE qr_code_token = token
    AND (qr_code_expires_at IS NULL OR qr_code_expires_at > NOW())
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid or expired QR code';
  END IF;

  -- Return the instruction
  RETURN QUERY
  SELECT
    si.id,
    si.project_id,
    si.reference_number,
    si.instruction_number,
    si.title,
    si.description,
    si.subcontractor_id,
    si.status,
    si.priority,
    si.due_date,
    si.qr_code_token,
    si.qr_code_expires_at,
    si.created_at,
    si.updated_at
  FROM site_instructions si
  WHERE si.qr_code_token = token
  AND si.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if QR token is valid
CREATE OR REPLACE FUNCTION is_qr_token_valid(token UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM site_instructions
    WHERE qr_code_token = token
    AND (qr_code_expires_at IS NULL OR qr_code_expires_at > NOW())
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_site_instruction_qr_token(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_site_instruction_by_qr_token(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_qr_token_valid(UUID) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION refresh_site_instruction_qr_token IS 'Generates a new QR code token with expiration for a site instruction';
COMMENT ON FUNCTION get_site_instruction_by_qr_token IS 'Retrieves site instruction by QR code token (validates expiration)';
COMMENT ON FUNCTION is_qr_token_valid IS 'Checks if a QR code token is valid and not expired';
