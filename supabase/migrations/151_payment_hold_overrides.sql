-- Migration: Payment Hold Overrides
-- Adds audit table for payment hold overrides and columns for tracking overrides on payment applications

-- Create payment_hold_overrides audit table
CREATE TABLE IF NOT EXISTS payment_hold_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_application_id UUID REFERENCES payment_applications(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  override_reason TEXT NOT NULL,
  overridden_by UUID REFERENCES users(id) ON DELETE SET NULL,
  overridden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Snapshot of compliance status at time of override
  compliance_status_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pho_payment_app ON payment_hold_overrides(payment_application_id);
CREATE INDEX IF NOT EXISTS idx_pho_subcontractor ON payment_hold_overrides(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_pho_company ON payment_hold_overrides(company_id);
CREATE INDEX IF NOT EXISTS idx_pho_overridden_at ON payment_hold_overrides(overridden_at DESC);

-- Add columns to payment_applications table if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_applications' AND column_name = 'insurance_hold_overridden'
  ) THEN
    ALTER TABLE payment_applications ADD COLUMN insurance_hold_overridden BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_applications' AND column_name = 'insurance_hold_override_reason'
  ) THEN
    ALTER TABLE payment_applications ADD COLUMN insurance_hold_override_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_applications' AND column_name = 'subcontractor_id'
  ) THEN
    ALTER TABLE payment_applications ADD COLUMN subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS Policies for payment_hold_overrides
ALTER TABLE payment_hold_overrides ENABLE ROW LEVEL SECURITY;

-- Company members can view overrides for their company
CREATE POLICY "Company members can view overrides"
  ON payment_hold_overrides
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Only admins and owners can create overrides
CREATE POLICY "Admins can create overrides"
  ON payment_hold_overrides
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND company_id = payment_hold_overrides.company_id
      AND role IN ('owner', 'admin', 'project_manager')
    )
  );

-- Create a trigger to capture compliance status snapshot on override
CREATE OR REPLACE FUNCTION capture_compliance_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subcontractor_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'is_compliant', scs.is_compliant,
      'compliance_score', scs.compliance_score,
      'payment_hold', scs.payment_hold,
      'hold_reason', scs.hold_reason,
      'expired_count', scs.expired_count,
      'expiring_soon_count', scs.expiring_soon_count,
      'missing_insurance_types', scs.missing_insurance_types,
      'captured_at', NOW()
    ) INTO NEW.compliance_status_snapshot
    FROM subcontractor_compliance_status scs
    WHERE scs.subcontractor_id = NEW.subcontractor_id
    AND (scs.project_id = NEW.project_id OR (scs.project_id IS NULL AND NEW.project_id IS NULL));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER capture_compliance_snapshot_trigger
  BEFORE INSERT ON payment_hold_overrides
  FOR EACH ROW
  EXECUTE FUNCTION capture_compliance_snapshot();

-- Add comment
COMMENT ON TABLE payment_hold_overrides IS 'Audit log of payment hold overrides for compliance and accountability';
