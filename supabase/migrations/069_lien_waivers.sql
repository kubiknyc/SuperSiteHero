-- Migration: 069_lien_waivers.sql
-- Description: Lien Waiver Management System
-- Features:
--   - State-specific waiver templates (CA, TX, FL, NY, etc.)
--   - Conditional vs Unconditional waivers
--   - Signature tracking with timestamps
--   - Integration with payment applications
--   - Waiver collection workflow

-- =============================================
-- ENUM TYPES
-- =============================================

-- Waiver types
CREATE TYPE lien_waiver_type AS ENUM (
  'conditional_progress',      -- Conditional Waiver and Release on Progress Payment
  'unconditional_progress',    -- Unconditional Waiver and Release on Progress Payment
  'conditional_final',         -- Conditional Waiver and Release on Final Payment
  'unconditional_final'        -- Unconditional Waiver and Release on Final Payment
);

-- Waiver status
CREATE TYPE lien_waiver_status AS ENUM (
  'pending',           -- Waiver requested, not yet received
  'draft',             -- Waiver being prepared
  'sent',              -- Waiver sent to vendor/sub
  'received',          -- Waiver received, pending review
  'under_review',      -- Being reviewed
  'approved',          -- Approved and filed
  'rejected',          -- Rejected, needs correction
  'expired',           -- Waiver expired (conditional with no payment)
  'void'               -- Voided
);

-- =============================================
-- LIEN WAIVER TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS lien_waiver_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Template identification
  name TEXT NOT NULL,
  state_code CHAR(2) NOT NULL,  -- US state code (CA, TX, FL, NY, etc.)
  waiver_type lien_waiver_type NOT NULL,

  -- Template content
  template_content TEXT NOT NULL,  -- HTML or markdown template with placeholders
  legal_language TEXT,             -- Required legal language for the state
  notarization_required BOOLEAN DEFAULT false,

  -- Placeholders info (JSON array of placeholder names)
  placeholders JSONB DEFAULT '[]'::jsonb,

  -- Template metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  effective_date DATE,
  expiration_date DATE,

  -- Compliance info
  statute_reference TEXT,          -- e.g., "California Civil Code Section 8132"
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),

  -- Metadata
  deleted_at TIMESTAMPTZ
);

-- Ensure one default per state/type combo (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lien_waiver_templates_default
  ON lien_waiver_templates (company_id, state_code, waiver_type)
  WHERE is_default = true AND company_id IS NOT NULL;

-- =============================================
-- LIEN WAIVERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS lien_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Waiver identification
  waiver_number TEXT NOT NULL,
  waiver_type lien_waiver_type NOT NULL,
  status lien_waiver_status DEFAULT 'pending',

  -- Related entities
  payment_application_id UUID, -- FK to payment_applications when that table exists
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,
  vendor_name TEXT,  -- For vendors not in subcontractors table

  -- Template used
  template_id UUID REFERENCES lien_waiver_templates(id),

  -- Payment information
  through_date DATE NOT NULL,          -- Work performed through date
  payment_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  check_number TEXT,
  check_date DATE,

  -- For conditional waivers - claimant exceptions
  exceptions TEXT,                     -- Any exceptions to the waiver

  -- Waiver content (rendered from template)
  rendered_content TEXT,

  -- Signature tracking
  claimant_name TEXT,                  -- Name of person signing
  claimant_title TEXT,                 -- Their title
  claimant_company TEXT,               -- Their company name
  signature_url TEXT,                  -- Stored signature image
  signature_date DATE,
  signed_at TIMESTAMPTZ,

  -- Notarization (if required)
  notarization_required BOOLEAN DEFAULT false,
  notary_name TEXT,
  notary_commission_number TEXT,
  notary_commission_expiration DATE,
  notarized_at TIMESTAMPTZ,
  notarized_document_url TEXT,

  -- Document tracking
  document_url TEXT,                   -- Final signed/notarized document
  sent_at TIMESTAMPTZ,
  sent_to_email TEXT,
  received_at TIMESTAMPTZ,

  -- Review/Approval
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Due date tracking
  due_date DATE,
  reminder_sent_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Unique waiver number per project
  UNIQUE (project_id, waiver_number)
);

-- =============================================
-- LIEN WAIVER REQUIREMENTS TABLE
-- =============================================

-- Defines waiver requirements for payment applications
CREATE TABLE IF NOT EXISTS lien_waiver_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Requirement configuration
  name TEXT NOT NULL,
  description TEXT,

  -- When required
  required_for_progress_payments BOOLEAN DEFAULT true,
  required_for_final_payment BOOLEAN DEFAULT true,
  min_payment_threshold DECIMAL(14,2) DEFAULT 0,  -- Only require if payment > threshold

  -- Who needs to provide
  requires_contractor_waiver BOOLEAN DEFAULT true,
  requires_sub_waivers BOOLEAN DEFAULT true,
  requires_supplier_waivers BOOLEAN DEFAULT false,

  -- Timing
  days_before_payment_due INTEGER DEFAULT 5,  -- Days before payment that waiver is due

  -- Enforcement
  block_payment_without_waiver BOOLEAN DEFAULT true,
  allow_conditional_for_progress BOOLEAN DEFAULT true,
  require_unconditional_for_final BOOLEAN DEFAULT true,

  -- Active flag
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- =============================================
-- LIEN WAIVER HISTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS lien_waiver_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lien_waiver_id UUID NOT NULL REFERENCES lien_waivers(id) ON DELETE CASCADE,

  -- Change tracking
  action TEXT NOT NULL,  -- created, status_changed, signed, approved, etc.
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,

  -- Context
  notes TEXT,

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES users(id)
);

-- =============================================
-- INDEXES
-- =============================================

-- Templates indexes
CREATE INDEX idx_lien_waiver_templates_company ON lien_waiver_templates(company_id);
CREATE INDEX idx_lien_waiver_templates_state ON lien_waiver_templates(state_code);
CREATE INDEX idx_lien_waiver_templates_type ON lien_waiver_templates(waiver_type);
CREATE INDEX idx_lien_waiver_templates_active ON lien_waiver_templates(is_active) WHERE is_active = true;

-- Waivers indexes
CREATE INDEX idx_lien_waivers_company ON lien_waivers(company_id);
CREATE INDEX idx_lien_waivers_project ON lien_waivers(project_id);
CREATE INDEX idx_lien_waivers_status ON lien_waivers(status);
CREATE INDEX idx_lien_waivers_type ON lien_waivers(waiver_type);
CREATE INDEX idx_lien_waivers_payment_app ON lien_waivers(payment_application_id);
CREATE INDEX idx_lien_waivers_subcontractor ON lien_waivers(subcontractor_id);
CREATE INDEX idx_lien_waivers_due_date ON lien_waivers(due_date);
CREATE INDEX idx_lien_waivers_through_date ON lien_waivers(through_date);
CREATE INDEX idx_lien_waivers_not_deleted ON lien_waivers(deleted_at) WHERE deleted_at IS NULL;

-- Requirements indexes
CREATE INDEX idx_lien_waiver_requirements_company ON lien_waiver_requirements(company_id);
CREATE INDEX idx_lien_waiver_requirements_project ON lien_waiver_requirements(project_id);

-- History indexes
CREATE INDEX idx_lien_waiver_history_waiver ON lien_waiver_history(lien_waiver_id);
CREATE INDEX idx_lien_waiver_history_action ON lien_waiver_history(action);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger
CREATE TRIGGER update_lien_waiver_templates_updated_at
  BEFORE UPDATE ON lien_waiver_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lien_waivers_updated_at
  BEFORE UPDATE ON lien_waivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lien_waiver_requirements_updated_at
  BEFORE UPDATE ON lien_waiver_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HISTORY TRACKING FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION track_lien_waiver_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lien_waiver_history (lien_waiver_id, action, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status_changed', 'status', OLD.status::text, NEW.status::text, NEW.reviewed_by);
  END IF;

  -- Track signature
  IF OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL THEN
    INSERT INTO lien_waiver_history (lien_waiver_id, action, field_changed, new_value, changed_by)
    VALUES (NEW.id, 'signed', 'signed_at', NEW.signed_at::text, NEW.created_by);
  END IF;

  -- Track approval
  IF OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL THEN
    INSERT INTO lien_waiver_history (lien_waiver_id, action, field_changed, new_value, changed_by)
    VALUES (NEW.id, 'approved', 'approved_at', NEW.approved_at::text, NEW.approved_by);
  END IF;

  -- Track notarization
  IF OLD.notarized_at IS NULL AND NEW.notarized_at IS NOT NULL THEN
    INSERT INTO lien_waiver_history (lien_waiver_id, action, field_changed, new_value, changed_by)
    VALUES (NEW.id, 'notarized', 'notarized_at', NEW.notarized_at::text, NEW.created_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_lien_waiver_changes_trigger
  AFTER UPDATE ON lien_waivers
  FOR EACH ROW
  EXECUTE FUNCTION track_lien_waiver_changes();

-- =============================================
-- WAIVER NUMBER GENERATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_next_waiver_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(waiver_number FROM 'LW-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM lien_waivers
  WHERE project_id = p_project_id;

  RETURN 'LW-' || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MISSING WAIVERS VIEW
-- =============================================
-- NOTE: This view requires payment_applications table which is not yet implemented.
-- Uncomment and update when payment_applications is available.

-- CREATE OR REPLACE VIEW missing_lien_waivers AS
-- SELECT
--   pa.id AS payment_application_id,
--   pa.project_id,
--   pa.display_number AS application_number,
--   pa.current_payment_due AS payment_amount,
--   pa.status AS application_status,
--   s.id AS subcontractor_id,
--   s.company_name AS subcontractor_name,
--   s.contact_email,
--   CASE
--     WHEN pa.status = 'paid' THEN 'unconditional_progress'::lien_waiver_type
--     ELSE 'conditional_progress'::lien_waiver_type
--   END AS required_waiver_type,
--   lwr.days_before_payment_due,
--   (pa.period_to::date - lwr.days_before_payment_due) AS waiver_due_date
-- FROM payment_applications pa
-- JOIN projects p ON pa.project_id = p.id
-- JOIN lien_waiver_requirements lwr ON (lwr.project_id = pa.project_id OR lwr.project_id IS NULL)
--   AND lwr.company_id = p.company_id
--   AND lwr.is_active = true
-- CROSS JOIN LATERAL (
--   SELECT DISTINCT s.*
--   FROM subcontractors s
--   JOIN project_users pu ON s.id = pu.user_id  -- Assuming subcontractors link through users
--   WHERE pu.project_id = pa.project_id
-- ) s
-- WHERE pa.status IN ('submitted', 'under_review', 'approved')
--   AND pa.deleted_at IS NULL
--   AND lwr.requires_sub_waivers = true
--   AND NOT EXISTS (
--     SELECT 1 FROM lien_waivers lw
--     WHERE lw.payment_application_id = pa.id
--       AND lw.subcontractor_id = s.id
--       AND lw.status IN ('approved', 'received', 'under_review')
--       AND lw.deleted_at IS NULL
--   );

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE lien_waiver_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lien_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lien_waiver_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lien_waiver_history ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view templates in their company"
  ON lien_waiver_templates FOR SELECT
  USING (
    company_id IS NULL  -- System templates
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage templates in their company"
  ON lien_waiver_templates FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Waivers policies
CREATE POLICY "Users can view waivers in their company"
  ON lien_waivers FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage waivers in their company"
  ON lien_waivers FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Requirements policies
CREATE POLICY "Users can view requirements in their company"
  ON lien_waiver_requirements FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage requirements in their company"
  ON lien_waiver_requirements FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- History policies
CREATE POLICY "Users can view waiver history in their company"
  ON lien_waiver_history FOR SELECT
  USING (
    lien_waiver_id IN (
      SELECT id FROM lien_waivers
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- SEED DEFAULT TEMPLATES (10 STATES)
-- =============================================

-- California templates (Civil Code Section 8132-8138)
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'California Conditional Progress Payment Waiver',
  'CA',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN, STOP PAYMENT NOTICE, AND PAYMENT BOND RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS SATISFIED THAT THE CLAIMANT HAS RECEIVED PAYMENT.</p>

<p><strong>Identifying Information</strong></p>
<p>Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release</strong></p>
<p>This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job through {{through_date}}. Rights based upon labor or service provided, or equipment or material delivered, pursuant to a written change order that has been fully executed by the parties prior to the date that this document is signed by the claimant, are waived and released by this document, unless listed as an Exception below. This document is effective only on the claimant''s receipt of payment from the financial institution on which the following check is drawn:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions</strong></p>
<p>This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature</strong></p>
<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date of Signature: {{signature_date}}</p>',
  'California Civil Code Section 8132',
  'Cal. Civ. Code § 8132',
  true,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'California Unconditional Progress Payment Waiver',
  'CA',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES LIEN, STOP PAYMENT NOTICE, AND PAYMENT BOND RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. THIS DOCUMENT IS ENFORCEABLE AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT BEEN PAID, USE A CONDITIONAL WAIVER AND RELEASE FORM.</p>

<p><strong>Identifying Information</strong></p>
<p>Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release</strong></p>
<p>This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job through {{through_date}}. Rights based upon labor or service provided, or equipment or material delivered, pursuant to a written change order that has been fully executed by the parties prior to the date that this document is signed by the claimant, are waived and released by this document, unless listed as an Exception below. The claimant has received the following progress payment: ${{payment_amount}}</p>

<p><strong>Exceptions</strong></p>
<p>This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature</strong></p>
<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date of Signature: {{signature_date}}</p>',
  'California Civil Code Section 8134',
  'Cal. Civ. Code § 8134',
  true,
  '["claimant_name", "customer_name", "job_location", "owner_name", "through_date", "payment_amount", "exceptions", "claimant_title", "signature_date"]'
),
(
  'California Conditional Final Payment Waiver',
  'CA',
  'conditional_final',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES THE CLAIMANT''S LIEN, STOP PAYMENT NOTICE, AND PAYMENT BOND RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS SATISFIED THAT THE CLAIMANT HAS RECEIVED PAYMENT.</p>

<p><strong>Identifying Information</strong></p>
<p>Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Conditional Waiver and Release</strong></p>
<p>This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for all labor and service provided, and equipment and material delivered, to the customer on this job. Rights based upon labor or service provided, or equipment or material delivered, pursuant to a written change order that has been fully executed by the parties prior to the date that this document is signed by the claimant, are waived and released by this document, unless listed as an Exception below. This document is effective only on the claimant''s receipt of payment from the financial institution on which the following check is drawn:</p>

<p>Maker of Check: {{check_maker}}<br/>
Amount of Check: ${{payment_amount}}<br/>
Check Payable to: {{payee}}</p>

<p><strong>Exceptions</strong></p>
<p>This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature</strong></p>
<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date of Signature: {{signature_date}}</p>',
  'California Civil Code Section 8136',
  'Cal. Civ. Code § 8136',
  true,
  '["claimant_name", "customer_name", "job_location", "owner_name", "check_maker", "payment_amount", "payee", "exceptions", "claimant_title", "signature_date"]'
),
(
  'California Unconditional Final Payment Waiver',
  'CA',
  'unconditional_final',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT</h2>
<p><strong>NOTICE TO CLAIMANT:</strong> THIS DOCUMENT WAIVES AND RELEASES LIEN, STOP PAYMENT NOTICE, AND PAYMENT BOND RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. THIS DOCUMENT IS ENFORCEABLE AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT BEEN PAID, USE A CONDITIONAL WAIVER AND RELEASE FORM.</p>

<p><strong>Identifying Information</strong></p>
<p>Name of Claimant: {{claimant_name}}<br/>
Name of Customer: {{customer_name}}<br/>
Job Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p><strong>Unconditional Waiver and Release</strong></p>
<p>This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for all labor and service provided, and equipment and material delivered, to the customer on this job. Rights based upon labor or service provided, or equipment or material delivered, pursuant to a written change order that has been fully executed by the parties prior to the date that this document is signed by the claimant, are waived and released by this document, unless listed as an Exception below. The claimant has been paid in full.</p>

<p><strong>Exceptions</strong></p>
<p>This document does not affect any of the following:<br/>
{{exceptions}}</p>

<p><strong>Signature</strong></p>
<p>Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date of Signature: {{signature_date}}</p>',
  'California Civil Code Section 8138',
  'Cal. Civ. Code § 8138',
  true,
  '["claimant_name", "customer_name", "job_location", "owner_name", "exceptions", "claimant_title", "signature_date"]'
);

-- Texas templates (Property Code Chapter 53)
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'Texas Conditional Progress Payment Waiver',
  'TX',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Job No.:</strong> {{job_number}}<br/>
<strong>On Account Of:</strong> {{customer_name}}</p>

<p>The undersigned mechanic and/or materialman has been employed by {{customer_name}} to furnish {{work_description}} for the improvement of the property known as {{job_location}} owned by {{owner_name}}.</p>

<p>Upon receipt of the sum of ${{payment_amount}}, the undersigned waives and releases any and all lien or claim of lien the undersigned now has on the above referenced job to the following extent:</p>

<p>This waiver and release covers a progress payment for all labor, services, equipment, or materials furnished to the jobsite or to {{customer_name}} through {{through_date}} only, and does not cover any retention, pending modifications and changes, or items furnished after such date.</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS.</p>

<p><strong>Before any recipient of this document relies on it, the recipient should verify evidence of payment to the undersigned.</strong></p>

<p>Claimant: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Texas Property Code Chapter 53',
  'Tex. Prop. Code § 53',
  true,
  '["project_name", "job_number", "customer_name", "work_description", "job_location", "owner_name", "payment_amount", "through_date", "claimant_name", "claimant_title", "signature_date"]'
),
(
  'Texas Unconditional Progress Payment Waiver',
  'TX',
  'unconditional_progress',
  E'<h2>UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT</h2>
<p><strong>Project:</strong> {{project_name}}<br/>
<strong>Job No.:</strong> {{job_number}}<br/>
<strong>On Account Of:</strong> {{customer_name}}</p>

<p>The undersigned mechanic and/or materialman has been employed by {{customer_name}} to furnish {{work_description}} for the improvement of the property known as {{job_location}} owned by {{owner_name}}.</p>

<p>The undersigned has been paid and has received a progress payment in the sum of ${{payment_amount}} for all labor, services, equipment, or materials furnished to the jobsite or to {{customer_name}} through {{through_date}} and hereby releases any mechanic''s lien, any right arising from a payment bond, and any other rights the undersigned has to the above referenced job to the following extent:</p>

<p>This waiver and release covers a progress payment for all labor, services, equipment, or materials furnished to the jobsite or to {{customer_name}} through {{through_date}} only, and does not cover any retention, pending modifications and changes, or items furnished after such date.</p>

<p><strong>NOTICE:</strong> THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. IT IS NOT NECESSARY THAT YOU BE PAID BEFORE SIGNING THIS DOCUMENT, BUT YOU ARE CERTIFYING THAT YOU HAVE BEEN PAID.</p>

<p>Claimant: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Texas Property Code Chapter 53',
  'Tex. Prop. Code § 53',
  true,
  '["project_name", "job_number", "customer_name", "work_description", "job_location", "owner_name", "payment_amount", "through_date", "claimant_name", "claimant_title", "signature_date"]'
);

-- Florida templates (Chapter 713)
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'Florida Conditional Progress Payment Waiver',
  'FL',
  'conditional_progress',
  E'<h2>CONDITIONAL PARTIAL RELEASE OF LIEN</h2>
<p>The undersigned lienor, in consideration of the sum of ${{payment_amount}}, hereby waives and releases its lien and right to claim a lien for labor, services, or materials furnished through {{through_date}} to:</p>

<p><strong>Customer:</strong> {{customer_name}}<br/>
<strong>Property:</strong> {{job_location}}<br/>
<strong>Owner:</strong> {{owner_name}}</p>

<p>This waiver and release is conditioned on actual receipt by the undersigned of good and sufficient funds in the amount shown above.</p>

<p><strong>NOTICE:</strong> This release is conditioned upon the receipt of payment. This release shall become effective only upon the receipt of payment.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>The undersigned lienor warrants that it has the authority to sign this document and to release the above-referenced lien.</p>

<p>LIENOR: {{claimant_name}}<br/>
By: ____________________<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Florida Statutes Chapter 713',
  'Fla. Stat. § 713',
  true,
  '["payment_amount", "through_date", "customer_name", "job_location", "owner_name", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
);

-- New York templates
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'New York Conditional Progress Payment Waiver',
  'NY',
  'conditional_progress',
  E'<h2>PARTIAL WAIVER OF LIEN</h2>
<p><strong>STATE OF NEW YORK</strong></p>

<p>The undersigned, for and in consideration of ${{payment_amount}} and other good and valuable consideration, the receipt and sufficiency of which is hereby acknowledged, does hereby waive and release any and all lien or claim or right of lien under the Lien Law of the State of New York on the building, improvements and lot of land known as {{job_location}} and owned by {{owner_name}} for or on account of labor performed, materials furnished, equipment rented or services rendered through {{through_date}}.</p>

<p>This partial release covers only the payment described above and does not release any claims for retention, additional work, or materials furnished after the date indicated above.</p>

<p><strong>CONDITIONAL UPON:</strong> Actual receipt of payment in good funds.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>

<p>STATE OF NEW YORK )<br/>
COUNTY OF _________ ) ss.:</p>

<p>Sworn to before me this ___ day of _______, 20__</p>
<p>____________________<br/>
Notary Public</p>',
  'New York Lien Law',
  'N.Y. Lien Law',
  true,
  '["payment_amount", "job_location", "owner_name", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Arizona templates
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Arizona Conditional Progress Payment Waiver',
  'AZ',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>
<p>On receipt by the undersigned of a check from {{check_maker}} in the sum of ${{payment_amount}} payable to {{payee}} and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release any mechanic''s lien, any state or federal statutory bond right, and any private bond right the undersigned has on the job of {{owner_name}} located at {{job_location}} to the following extent:</p>

<p>This document covers a progress payment for all labor, services, equipment or materials furnished to the jobsite or to the person named above through the date of {{through_date}} only and does not cover any retention, pending modifications and changes, or items furnished after that date.</p>

<p>Before any recipient of this document relies on this document, the recipient should verify evidence of payment to the undersigned.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Claimant''s Name: {{claimant_name}}<br/>
Claimant''s Signature: ____________________<br/>
Claimant''s Title: {{claimant_title}}<br/>
Date of Signature: {{signature_date}}</p>',
  'Arizona Revised Statutes § 33-1008',
  'A.R.S. § 33-1008',
  true,
  false,
  '["check_maker", "payment_amount", "payee", "owner_name", "job_location", "through_date", "exceptions", "claimant_name", "claimant_title", "signature_date"]'
);

-- Georgia templates
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'Georgia Conditional Progress Payment Waiver',
  'GA',
  'conditional_progress',
  E'<h2>INTERIM WAIVER AND RELEASE UPON PAYMENT</h2>
<p><strong>STATE OF GEORGIA</strong></p>

<p>Upon receipt by the undersigned of a check from {{customer_name}} in the sum of ${{payment_amount}} payable to the undersigned and when the check has been properly endorsed and has been paid by the bank upon which it was drawn, this document shall become effective to release any claim of lien or right to claim of lien that the undersigned has on the real property of {{owner_name}} located at {{job_location}} to the following extent:</p>

<p>This waiver and release covers a progress payment for labor, services, equipment, or material furnished to {{job_location}} through {{through_date}} only and does not cover any retention, labor, services, equipment, or material furnished after that date.</p>

<p><strong>Exceptions:</strong> This document does not affect the following:<br/>
{{exceptions}}</p>

<p>CONTRACTOR/SUBCONTRACTOR/SUPPLIER:<br/>
{{claimant_company}}<br/>
By: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Georgia Code § 44-14-366',
  'O.C.G.A. § 44-14-366',
  true,
  '["customer_name", "payment_amount", "owner_name", "job_location", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Nevada templates
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, notarization_required, placeholders)
VALUES
(
  'Nevada Conditional Progress Payment Waiver',
  'NV',
  'conditional_progress',
  E'<h2>CONDITIONAL LIEN RELEASE (PROGRESS PAYMENT)</h2>
<p><strong>STATE OF NEVADA</strong></p>

<p>Upon receipt of the sum of ${{payment_amount}} the undersigned waives any and all right to file a mechanic''s lien against the real property commonly known as {{job_location}} and legally described as: {{legal_description}}</p>

<p>Owner(s): {{owner_name}}<br/>
Through Date: {{through_date}}</p>

<p>This release covers a progress payment for all labor, materials, services, or equipment furnished through {{through_date}} only, and does not cover any retention, extras, or items furnished after that date.</p>

<p>This release is conditioned upon the actual receipt of payment. Receipt of a check does not constitute payment until the check has cleared the bank upon which it is drawn.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Company Name: {{claimant_company}}<br/>
Authorized Signature: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>

<p>NOTARIZATION REQUIRED IN NEVADA</p>',
  'Nevada Revised Statutes Chapter 108',
  'NRS Chapter 108',
  true,
  true,
  '["payment_amount", "job_location", "legal_description", "owner_name", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Washington templates
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'Washington Conditional Progress Payment Waiver',
  'WA',
  'conditional_progress',
  E'<h2>CONDITIONAL LIEN WAIVER ON PROGRESS PAYMENT</h2>
<p><strong>STATE OF WASHINGTON</strong></p>

<p>Project: {{project_name}}<br/>
Location: {{job_location}}<br/>
Owner: {{owner_name}}</p>

<p>On receipt of payment of the sum of ${{payment_amount}}, the undersigned waives and releases any lien, claim of lien, or right to lien under RCW 60.04 for labor, professional services, materials, or equipment furnished through {{through_date}} on the above-referenced property.</p>

<p>This waiver and release covers only the payment described above and does not cover:</p>
<ul>
<li>Retainage</li>
<li>Extras or change orders</li>
<li>Labor, materials, or equipment furnished after {{through_date}}</li>
</ul>

<p><strong>NOTICE:</strong> This waiver is conditional upon receipt of payment. This release is not valid until payment is received in full.</p>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
By: ____________________<br/>
Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'RCW 60.04 Construction Liens',
  'RCW 60.04',
  true,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Colorado templates
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'Colorado Conditional Progress Payment Waiver',
  'CO',
  'conditional_progress',
  E'<h2>CONDITIONAL PARTIAL LIEN WAIVER</h2>
<p><strong>STATE OF COLORADO</strong></p>

<p>Project Name: {{project_name}}<br/>
Project Address: {{job_location}}<br/>
Property Owner: {{owner_name}}</p>

<p>The undersigned, upon receipt of the sum of ${{payment_amount}}, waives and releases any and all liens, lien rights, and claims against the above-described property for labor, services, equipment, or materials provided through {{through_date}}.</p>

<p><strong>This waiver is CONDITIONAL and shall become effective only upon receipt of actual payment in the amount stated above.</strong></p>

<p>This partial release covers only the payment described above and does not waive or release:</p>
<ul>
<li>Retention amounts</li>
<li>Change orders not included in this payment</li>
<li>Labor, services, equipment, or materials provided after {{through_date}}</li>
</ul>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>{{claimant_company}}<br/>
Authorized Representative: ____________________<br/>
Printed Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>',
  'Colorado Revised Statutes § 38-22-101',
  'C.R.S. § 38-22-101',
  true,
  '["project_name", "job_location", "owner_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Illinois templates
INSERT INTO lien_waiver_templates (name, state_code, waiver_type, template_content, legal_language, statute_reference, is_default, placeholders)
VALUES
(
  'Illinois Conditional Progress Payment Waiver',
  'IL',
  'conditional_progress',
  E'<h2>CONDITIONAL WAIVER OF MECHANIC''S LIEN - PROGRESS PAYMENT</h2>
<p><strong>STATE OF ILLINOIS</strong></p>

<p>Property Address: {{job_location}}<br/>
Owner: {{owner_name}}<br/>
General Contractor: {{customer_name}}</p>

<p>The undersigned, upon receipt of the sum of ${{payment_amount}} from {{customer_name}}, waives and releases any mechanic''s lien rights the undersigned may have against the above-described property for labor, materials, services, or equipment furnished through {{through_date}}.</p>

<p><strong>CONDITIONAL WAIVER:</strong> This waiver is conditioned upon and shall become effective only upon actual receipt of the payment described above. Until payment is received, the undersigned retains all lien rights.</p>

<p>This waiver covers work and materials through {{through_date}} only and does not cover:</p>
<ul>
<li>Retention</li>
<li>Extras or change orders not included in this payment</li>
<li>Work performed or materials furnished after {{through_date}}</li>
</ul>

<p><strong>Exceptions:</strong> {{exceptions}}</p>

<p>Sworn Under Oath:</p>
<p>Company: {{claimant_company}}<br/>
Signature: ____________________<br/>
Print Name: {{claimant_name}}<br/>
Title: {{claimant_title}}<br/>
Date: {{signature_date}}</p>

<p>Subscribed and sworn before me this ___ day of _______, 20__<br/>
____________________<br/>
Notary Public</p>',
  '770 ILCS 60/ Mechanics Lien Act',
  '770 ILCS 60/',
  true,
  '["job_location", "owner_name", "customer_name", "payment_amount", "through_date", "exceptions", "claimant_company", "claimant_name", "claimant_title", "signature_date"]'
);

-- Add comment
COMMENT ON TABLE lien_waiver_templates IS 'State-specific lien waiver templates with legal language and placeholders';
COMMENT ON TABLE lien_waivers IS 'Individual lien waivers with signature tracking and payment application integration';
COMMENT ON TABLE lien_waiver_requirements IS 'Project-level waiver requirements configuration';
COMMENT ON TABLE lien_waiver_history IS 'Audit trail for lien waiver changes';
