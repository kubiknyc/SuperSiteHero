-- Migration: 158_owner_invoices.sql
-- Description: Owner/Client Invoicing System for billing project owners
-- Date: 2025-12-29

-- =============================================
-- TABLE: owner_invoices
-- Invoices sent to project owners/clients for payment
-- Links to payment applications for AIA G702/G703 documentation
-- =============================================
CREATE TABLE IF NOT EXISTS owner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Invoice Identification
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Link to Payment Application (optional - can invoice without AIA docs)
  payment_application_id UUID REFERENCES payment_applications(id) ON DELETE SET NULL,

  -- Billing Information
  bill_to_name VARCHAR(255) NOT NULL,
  bill_to_company VARCHAR(255),
  bill_to_address_line1 VARCHAR(255),
  bill_to_address_line2 VARCHAR(255),
  bill_to_city VARCHAR(100),
  bill_to_state VARCHAR(50),
  bill_to_zip VARCHAR(20),
  bill_to_email VARCHAR(255),
  bill_to_phone VARCHAR(50),

  -- From Information (auto-populated from company)
  from_name VARCHAR(255),
  from_company VARCHAR(255),
  from_address_line1 VARCHAR(255),
  from_address_line2 VARCHAR(255),
  from_city VARCHAR(100),
  from_state VARCHAR(50),
  from_zip VARCHAR(20),
  from_email VARCHAR(255),
  from_phone VARCHAR(50),

  -- Invoice Amounts
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0,  -- Tax rate as decimal (0.0825 = 8.25%)
  tax_amount DECIMAL(15, 2) GENERATED ALWAYS AS (ROUND(subtotal * COALESCE(tax_rate, 0), 2)) STORED,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (
    subtotal + ROUND(subtotal * COALESCE(tax_rate, 0), 2) - COALESCE(discount_amount, 0)
  ) STORED,

  -- Retainage (if applicable)
  retainage_percent DECIMAL(5, 2) DEFAULT 0,
  retainage_amount DECIMAL(15, 2) DEFAULT 0,
  amount_due DECIMAL(15, 2) GENERATED ALWAYS AS (
    subtotal + ROUND(subtotal * COALESCE(tax_rate, 0), 2)
    - COALESCE(discount_amount, 0) - COALESCE(retainage_amount, 0)
  ) STORED,

  -- Payment Information
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  balance_due DECIMAL(15, 2) GENERATED ALWAYS AS (
    subtotal + ROUND(subtotal * COALESCE(tax_rate, 0), 2)
    - COALESCE(discount_amount, 0) - COALESCE(retainage_amount, 0)
    - COALESCE(amount_paid, 0)
  ) STORED,

  -- Payment Terms
  payment_terms VARCHAR(50) DEFAULT 'Net 30',  -- Net 15, Net 30, Net 45, Net 60, Due on Receipt

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  -- draft, sent, viewed, partially_paid, paid, overdue, void, disputed

  -- Communication
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES users(id),
  sent_via VARCHAR(50),  -- email, mail, docusign, portal
  viewed_at TIMESTAMPTZ,

  -- Notes and Terms
  notes TEXT,  -- Internal notes
  public_notes TEXT,  -- Notes shown on invoice
  terms_and_conditions TEXT,  -- Payment terms, late fees, etc.

  -- References
  po_number VARCHAR(100),  -- Client's PO number
  contract_number VARCHAR(100),
  project_period_from DATE,  -- Billing period start
  project_period_to DATE,  -- Billing period end

  -- PDF Storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(company_id, invoice_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_owner_invoices_project_id ON owner_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_owner_invoices_company_id ON owner_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_owner_invoices_status ON owner_invoices(status);
CREATE INDEX IF NOT EXISTS idx_owner_invoices_invoice_date ON owner_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_owner_invoices_due_date ON owner_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_owner_invoices_payment_application_id ON owner_invoices(payment_application_id);
CREATE INDEX IF NOT EXISTS idx_owner_invoices_deleted_at ON owner_invoices(deleted_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_owner_invoices_updated_at ON owner_invoices;
CREATE TRIGGER update_owner_invoices_updated_at BEFORE UPDATE ON owner_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE owner_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view invoices for their company" ON owner_invoices;
CREATE POLICY "Users can view invoices for their company" ON owner_invoices
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert invoices for their company" ON owner_invoices;
CREATE POLICY "Users can insert invoices for their company" ON owner_invoices
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update invoices for their company" ON owner_invoices;
CREATE POLICY "Users can update invoices for their company" ON owner_invoices
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: owner_invoice_line_items
-- Individual line items on an invoice
-- =============================================
CREATE TABLE IF NOT EXISTS owner_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES owner_invoices(id) ON DELETE CASCADE,

  -- Line Item Details
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,

  -- Cost Code Reference (optional)
  cost_code_id UUID REFERENCES cost_codes(id),
  cost_code VARCHAR(20),

  -- SOV Item Reference (if linked to payment app)
  sov_item_id UUID REFERENCES schedule_of_values(id) ON DELETE SET NULL,

  -- Quantities and Amounts
  quantity DECIMAL(15, 4) DEFAULT 1,
  unit VARCHAR(20),  -- LS, EA, SF, LF, HR, etc.
  unit_price DECIMAL(15, 4) DEFAULT 0,
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (
    ROUND(COALESCE(quantity, 1) * COALESCE(unit_price, 0), 2)
  ) STORED,

  -- Optional breakdown
  labor_amount DECIMAL(15, 2) DEFAULT 0,
  material_amount DECIMAL(15, 2) DEFAULT 0,
  equipment_amount DECIMAL(15, 2) DEFAULT 0,
  subcontractor_amount DECIMAL(15, 2) DEFAULT 0,
  other_amount DECIMAL(15, 2) DEFAULT 0,

  -- Taxable flag
  is_taxable BOOLEAN DEFAULT true,

  -- Sort Order
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON owner_invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_cost_code_id ON owner_invoice_line_items(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_sov_item_id ON owner_invoice_line_items(sov_item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_sort_order ON owner_invoice_line_items(sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_invoice_line_items_updated_at ON owner_invoice_line_items;
CREATE TRIGGER update_invoice_line_items_updated_at BEFORE UPDATE ON owner_invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE owner_invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view invoice line items" ON owner_invoice_line_items;
CREATE POLICY "Users can view invoice line items" ON owner_invoice_line_items
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert invoice line items" ON owner_invoice_line_items;
CREATE POLICY "Users can insert invoice line items" ON owner_invoice_line_items
  FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update invoice line items" ON owner_invoice_line_items;
CREATE POLICY "Users can update invoice line items" ON owner_invoice_line_items
  FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete invoice line items" ON owner_invoice_line_items;
CREATE POLICY "Users can delete invoice line items" ON owner_invoice_line_items
  FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: owner_invoice_payments
-- Track payments received against invoices
-- =============================================
CREATE TABLE IF NOT EXISTS owner_invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES owner_invoices(id) ON DELETE CASCADE,

  -- Payment Details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15, 2) NOT NULL,

  -- Payment Method
  payment_method VARCHAR(50),  -- check, wire, ach, credit_card, cash
  reference_number VARCHAR(100),  -- Check number, wire reference, etc.

  -- Bank Details (for reconciliation)
  deposited_to_account VARCHAR(100),
  deposited_at DATE,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON owner_invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON owner_invoice_payments(payment_date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_invoice_payments_updated_at ON owner_invoice_payments;
CREATE TRIGGER update_invoice_payments_updated_at BEFORE UPDATE ON owner_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE owner_invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view invoice payments" ON owner_invoice_payments;
CREATE POLICY "Users can view invoice payments" ON owner_invoice_payments
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert invoice payments" ON owner_invoice_payments;
CREATE POLICY "Users can insert invoice payments" ON owner_invoice_payments
  FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update invoice payments" ON owner_invoice_payments;
CREATE POLICY "Users can update invoice payments" ON owner_invoice_payments
  FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: invoice_email_log
-- Track invoice delivery via email
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES owner_invoices(id) ON DELETE CASCADE,

  -- Email Details
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  cc_emails TEXT[],
  bcc_emails TEXT[],

  -- Email Content
  subject VARCHAR(500),
  body_preview TEXT,

  -- Delivery Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- pending, sent, delivered, opened, bounced, failed

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,

  -- External Reference
  email_provider VARCHAR(50),  -- sendgrid, ses, postmark, etc.
  external_message_id VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_email_log_invoice_id ON invoice_email_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_log_status ON invoice_email_log(status);
CREATE INDEX IF NOT EXISTS idx_invoice_email_log_recipient_email ON invoice_email_log(recipient_email);

-- Enable RLS
ALTER TABLE invoice_email_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view invoice email logs" ON invoice_email_log;
CREATE POLICY "Users can view invoice email logs" ON invoice_email_log
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM owner_invoices WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- FUNCTION: get_next_invoice_number
-- Get next invoice number for a company
-- Format: INV-2025-0001
-- =============================================
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_invoice_number VARCHAR;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get the max sequence for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || v_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM owner_invoices
  WHERE company_id = p_company_id
    AND invoice_number LIKE 'INV-' || v_year || '-%'
    AND deleted_at IS NULL;

  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: recalculate_invoice_totals
-- Recalculate invoice totals from line items
-- =============================================
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal DECIMAL(15, 2);
BEGIN
  -- Get the invoice ID
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate subtotal from line items
  SELECT COALESCE(SUM(
    ROUND(COALESCE(quantity, 1) * COALESCE(unit_price, 0), 2)
  ), 0)
  INTO v_subtotal
  FROM owner_invoice_line_items
  WHERE invoice_id = v_invoice_id;

  -- Update invoice subtotal
  UPDATE owner_invoices
  SET subtotal = v_subtotal
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_recalculate_invoice_totals ON owner_invoice_line_items;
CREATE TRIGGER trigger_recalculate_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON owner_invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();

-- =============================================
-- FUNCTION: update_invoice_amount_paid
-- Update invoice amount_paid from payments
-- =============================================
CREATE OR REPLACE FUNCTION update_invoice_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid DECIMAL(15, 2);
BEGIN
  -- Get the invoice ID
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate total paid from payments
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM owner_invoice_payments
  WHERE invoice_id = v_invoice_id;

  -- Update invoice amount_paid
  UPDATE owner_invoices
  SET
    amount_paid = v_total_paid,
    status = CASE
      WHEN v_total_paid >= (
        subtotal + ROUND(subtotal * COALESCE(tax_rate, 0), 2)
        - COALESCE(discount_amount, 0) - COALESCE(retainage_amount, 0)
      ) THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partially_paid'
      ELSE status
    END
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_invoice_amount_paid ON owner_invoice_payments;
CREATE TRIGGER trigger_update_invoice_amount_paid
  AFTER INSERT OR UPDATE OR DELETE ON owner_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_amount_paid();

-- =============================================
-- FUNCTION: mark_overdue_invoices
-- Mark invoices as overdue when past due date
-- Called by scheduled job or on app startup
-- =============================================
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE owner_invoices
  SET status = 'overdue'
  WHERE status IN ('sent', 'viewed', 'partially_paid')
    AND due_date < CURRENT_DATE
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEW: owner_invoice_summary
-- Invoice with computed summaries
-- =============================================
CREATE OR REPLACE VIEW owner_invoice_summary AS
SELECT
  oi.*,
  -- Days until due / overdue
  CASE
    WHEN oi.status IN ('paid', 'void') THEN NULL
    ELSE oi.due_date - CURRENT_DATE
  END as days_until_due,
  -- Line item count
  (SELECT COUNT(*) FROM owner_invoice_line_items li WHERE li.invoice_id = oi.id) as line_item_count,
  -- Payment count
  (SELECT COUNT(*) FROM owner_invoice_payments p WHERE p.invoice_id = oi.id) as payment_count,
  -- Project info
  p.name as project_name,
  p.project_number,
  -- Payment application info
  pa.application_number,
  pa.period_to as pay_app_period
FROM owner_invoices oi
LEFT JOIN projects p ON oi.project_id = p.id
LEFT JOIN payment_applications pa ON oi.payment_application_id = pa.id
WHERE oi.deleted_at IS NULL;

-- =============================================
-- VIEW: invoice_aging_report
-- Aging report for all unpaid invoices
-- =============================================
CREATE OR REPLACE VIEW invoice_aging_report AS
SELECT
  oi.id,
  oi.invoice_number,
  oi.invoice_date,
  oi.due_date,
  oi.project_id,
  p.name as project_name,
  oi.bill_to_name,
  oi.bill_to_company,
  oi.total_amount,
  oi.amount_paid,
  oi.balance_due,
  oi.status,
  -- Days overdue (negative = not yet due)
  CURRENT_DATE - oi.due_date as days_overdue,
  -- Aging bucket
  CASE
    WHEN CURRENT_DATE - oi.due_date <= 0 THEN 'current'
    WHEN CURRENT_DATE - oi.due_date BETWEEN 1 AND 30 THEN '1-30'
    WHEN CURRENT_DATE - oi.due_date BETWEEN 31 AND 60 THEN '31-60'
    WHEN CURRENT_DATE - oi.due_date BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket,
  oi.company_id
FROM owner_invoices oi
LEFT JOIN projects p ON oi.project_id = p.id
WHERE oi.deleted_at IS NULL
  AND oi.status NOT IN ('paid', 'void')
ORDER BY oi.due_date ASC;

-- Note: notification_types table doesn't exist yet
-- When it's created, add these types:
-- ('invoice_created', 'When a new invoice is created', true, 'financial')
-- ('invoice_sent', 'When an invoice is sent to client', true, 'financial')
-- ('invoice_viewed', 'When client views invoice', false, 'financial')
-- ('invoice_payment_received', 'When payment is received on invoice', true, 'financial')
-- ('invoice_overdue', 'When invoice becomes overdue', true, 'financial')
