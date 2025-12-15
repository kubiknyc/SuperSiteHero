-- Migration: Site Instruction QR Code Workflow
-- Description: Add QR code support and acknowledgment tracking for site instructions

-- Add QR code fields to site_instructions
ALTER TABLE site_instructions
  ADD COLUMN IF NOT EXISTS qr_code_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS qr_code_expires_at TIMESTAMPTZ;

-- Create index on qr_code_token for fast lookup
CREATE INDEX IF NOT EXISTS idx_site_instructions_qr_token
  ON site_instructions(qr_code_token)
  WHERE qr_code_token IS NOT NULL;

-- Create site_instruction_acknowledgments table
CREATE TABLE IF NOT EXISTS site_instruction_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_instruction_id UUID NOT NULL REFERENCES site_instructions(id) ON DELETE CASCADE,
  acknowledged_by UUID NOT NULL REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  signature_data TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  photo_ids UUID[],
  notes TEXT,
  is_offline_submission BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_acknowledgments_instruction
  ON site_instruction_acknowledgments(site_instruction_id);
CREATE INDEX IF NOT EXISTS idx_acknowledgments_user
  ON site_instruction_acknowledgments(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_acknowledgments_synced
  ON site_instruction_acknowledgments(is_offline_submission, synced_at)
  WHERE is_offline_submission = true;

-- Enable RLS
ALTER TABLE site_instruction_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view acknowledgments for instructions in their projects
CREATE POLICY "Users can view acknowledgments for their project instructions"
  ON site_instruction_acknowledgments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_instructions si
      JOIN project_users pu ON pu.project_id = si.project_id
      WHERE si.id = site_instruction_id
      AND pu.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create acknowledgments for assigned instructions
CREATE POLICY "Users can create acknowledgments for assigned instructions"
  ON site_instruction_acknowledgments FOR INSERT
  WITH CHECK (
    acknowledged_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM site_instructions si
      JOIN project_users pu ON pu.project_id = si.project_id
      WHERE si.id = site_instruction_id
      AND pu.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own acknowledgments
CREATE POLICY "Users can update their own acknowledgments"
  ON site_instruction_acknowledgments FOR UPDATE
  USING (acknowledged_by = auth.uid())
  WITH CHECK (acknowledged_by = auth.uid());

-- Trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_instruction_acknowledgment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER site_instruction_acknowledgment_updated_at
  BEFORE UPDATE ON site_instruction_acknowledgments
  FOR EACH ROW
  EXECUTE FUNCTION update_site_instruction_acknowledgment_updated_at();

-- Function to generate or refresh QR code token with expiration
CREATE OR REPLACE FUNCTION generate_qr_code_token(
  instruction_id UUID,
  expiration_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  new_token UUID;
BEGIN
  new_token := gen_random_uuid();

  UPDATE site_instructions
  SET
    qr_code_token = new_token,
    qr_code_expires_at = NOW() + (expiration_days || ' days')::INTERVAL,
    updated_at = NOW()
  WHERE id = instruction_id;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate QR code token (not expired)
CREATE OR REPLACE FUNCTION validate_qr_code_token(token UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM site_instructions
    WHERE qr_code_token = token
    AND (qr_code_expires_at IS NULL OR qr_code_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Add comment to describe the table
COMMENT ON TABLE site_instruction_acknowledgments IS 'Tracks acknowledgments of site instructions via QR code or manual submission';
COMMENT ON COLUMN site_instructions.qr_code_token IS 'Unique token for QR code generation and validation';
COMMENT ON COLUMN site_instructions.qr_code_expires_at IS 'Expiration date for QR code token';
