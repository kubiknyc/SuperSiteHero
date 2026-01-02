-- =============================================
-- Subcontractor Portal Features Migration
-- Adds tables for bid packages, bid responses,
-- pre-qualifications, and insurance certificates
-- =============================================

-- =============================================
-- Bid Packages Table
-- =============================================
CREATE TABLE IF NOT EXISTS bid_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Package identification
  package_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trade_code TEXT,
  division TEXT,

  -- Bid details
  estimated_value DECIMAL(15, 2),
  budget_amount DECIMAL(15, 2),

  -- Schedule
  issue_date TIMESTAMPTZ,
  site_visit_date TIMESTAMPTZ,
  site_visit_required BOOLEAN DEFAULT false,
  questions_due_date TIMESTAMPTZ,
  bid_due_date TIMESTAMPTZ,
  bid_due_time TIME DEFAULT '14:00:00',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'issued', 'closed', 'evaluating', 'awarded', 'cancelled'
  )),

  -- Scope items as JSONB
  scope_items JSONB DEFAULT '[]',
  exclusions JSONB DEFAULT '[]',
  inclusions JSONB DEFAULT '[]',
  required_documents JSONB DEFAULT '[]',
  special_conditions TEXT,

  -- Award info
  awarded_to_id UUID REFERENCES subcontractors(id),
  awarded_date TIMESTAMPTZ,
  awarded_amount DECIMAL(15, 2),
  award_notes TEXT,

  -- Documents
  document_ids UUID[] DEFAULT '{}',

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, project_id, package_number)
);

-- Bid package items (line items for leveling)
CREATE TABLE IF NOT EXISTS bid_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,

  item_number TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT,
  quantity DECIMAL(15, 4),
  estimated_unit_price DECIMAL(15, 2),
  estimated_total DECIMAL(15, 2),

  is_required BOOLEAN DEFAULT true,
  is_alternate BOOLEAN DEFAULT false,
  alternate_group TEXT,

  notes TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Bid Responses/Submissions Table
-- =============================================
CREATE TABLE IF NOT EXISTS bid_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES bid_packages(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Bid amounts
  base_bid_amount DECIMAL(15, 2) NOT NULL,
  alternates_total DECIMAL(15, 2) DEFAULT 0,
  total_bid_amount DECIMAL(15, 2) NOT NULL,

  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'draft', 'submitted', 'qualified', 'disqualified', 'under_review',
    'shortlisted', 'awarded', 'rejected', 'withdrawn'
  )),
  is_late BOOLEAN DEFAULT false,

  -- Schedule
  proposed_start_date DATE,
  proposed_duration INTEGER, -- in days
  proposed_completion_date DATE,

  -- Qualifications
  is_qualified BOOLEAN DEFAULT true,
  disqualification_reason TEXT,

  -- Scope notes
  exclusions TEXT,
  clarifications TEXT,
  assumptions TEXT,

  -- Bid validity
  bid_valid_until DATE,

  -- Documents
  bid_document_url TEXT,
  attachment_urls JSONB DEFAULT '[]',

  -- Submission info
  submitted_at TIMESTAMPTZ,
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  submitted_by_phone TEXT,

  -- Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  ranking INTEGER,
  score DECIMAL(5, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(package_id, subcontractor_id)
);

-- Bid response line items (for bid leveling)
CREATE TABLE IF NOT EXISTS bid_response_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES bid_responses(id) ON DELETE CASCADE,
  package_item_id UUID NOT NULL REFERENCES bid_package_items(id) ON DELETE CASCADE,

  unit_price DECIMAL(15, 2),
  total_price DECIMAL(15, 2),
  quantity DECIMAL(15, 4),

  is_included BOOLEAN DEFAULT true,
  is_alternate BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(response_id, package_item_id)
);

-- Bid alternates
CREATE TABLE IF NOT EXISTS bid_alternates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES bid_responses(id) ON DELETE CASCADE,

  alternate_number TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2),

  is_add BOOLEAN DEFAULT true, -- true = add, false = deduct
  is_included BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Pre-Qualification Tables
-- =============================================

-- Pre-qualification questionnaires
CREATE TABLE IF NOT EXISTS prequal_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Sections stored as JSONB for flexibility
  sections JSONB DEFAULT '[]',

  -- Expiration settings
  expires_in_days INTEGER DEFAULT 365,

  -- Scoring
  passing_score DECIMAL(5, 2) DEFAULT 70.00,
  max_score DECIMAL(5, 2) DEFAULT 100.00,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-qualification submissions
CREATE TABLE IF NOT EXISTS prequal_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES prequal_questionnaires(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'pending_review' CHECK (status IN (
    'not_submitted', 'pending_review', 'approved',
    'conditionally_approved', 'rejected', 'expired'
  )),

  -- Answers stored as JSONB
  answers JSONB DEFAULT '[]',

  -- Scoring
  score DECIMAL(5, 2),
  max_score DECIMAL(5, 2),
  tier TEXT CHECK (tier IN ('preferred', 'approved', 'conditional')),

  -- Review info
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  conditions TEXT,

  -- Validity
  approved_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Company information snapshot
  company_info JSONB,

  -- Financial information
  years_in_business INTEGER,
  annual_revenue DECIMAL(15, 2),
  bonding_capacity DECIMAL(15, 2),
  current_bonding_used DECIMAL(15, 2),
  credit_rating TEXT,
  bank_reference TEXT,
  duns_number TEXT,

  -- Safety information
  emr DECIMAL(5, 3), -- Experience Modification Rate
  osha_300_log BOOLEAN,
  osha_recordable_rate DECIMAL(5, 3),
  dart_rate DECIMAL(5, 3),
  fatalities_last_5_years INTEGER DEFAULT 0,
  serious_violations_last_3_years INTEGER DEFAULT 0,
  has_safety_program BOOLEAN,
  has_safety_training BOOLEAN,
  has_ppe_policy BOOLEAN,
  has_substance_abuse_policy BOOLEAN,

  -- Metadata
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-qualification references
CREATE TABLE IF NOT EXISTS prequal_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES prequal_submissions(id) ON DELETE CASCADE,

  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  project_name TEXT,
  project_value DECIMAL(15, 2),
  project_completed_date DATE,
  scope_description TEXT,

  -- Verification
  was_contacted BOOLEAN DEFAULT false,
  contact_date TIMESTAMPTZ,
  contacted_by UUID REFERENCES profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  reference_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-qualification documents
CREATE TABLE IF NOT EXISTS prequal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES prequal_submissions(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL, -- 'financial_statement', 'safety_manual', 'license', etc.
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,

  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT
);

-- =============================================
-- Insurance Certificates Table
-- =============================================

-- Insurance requirements (what's required per project/company)
CREATE TABLE IF NOT EXISTS insurance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- null = company default

  insurance_type TEXT NOT NULL,
  type_name TEXT NOT NULL,

  is_required BOOLEAN DEFAULT true,
  minimum_coverage DECIMAL(15, 2),

  -- Additional requirements
  additional_insured_required BOOLEAN DEFAULT true,
  waiver_of_subrogation BOOLEAN DEFAULT false,
  primary_noncontributory BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid), insurance_type)
);

-- Insurance certificates
CREATE TABLE IF NOT EXISTS insurance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,

  -- Certificate details
  certificate_type TEXT NOT NULL, -- 'general_liability', 'auto', 'workers_comp', 'umbrella', etc.
  certificate_type_name TEXT,
  policy_number TEXT,
  carrier_name TEXT,

  -- Coverage
  coverage_amount DECIMAL(15, 2),
  per_occurrence_limit DECIMAL(15, 2),
  aggregate_limit DECIMAL(15, 2),
  deductible DECIMAL(15, 2),

  -- Dates
  effective_date DATE NOT NULL,
  expiration_date DATE NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending_verification' CHECK (status IN (
    'pending_verification', 'verified', 'expired', 'rejected', 'cancelled'
  )),

  -- Additional insured info
  additional_insured BOOLEAN DEFAULT false,
  additional_insured_name TEXT,
  waiver_of_subrogation BOOLEAN DEFAULT false,
  primary_noncontributory BOOLEAN DEFAULT false,

  -- Document
  certificate_url TEXT,
  endorsement_urls JSONB DEFAULT '[]',

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Reminders
  reminder_sent_30_day BOOLEAN DEFAULT false,
  reminder_sent_60_day BOOLEAN DEFAULT false,
  reminder_sent_90_day BOOLEAN DEFAULT false,
  last_reminder_sent_at TIMESTAMPTZ,

  -- Metadata
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance reminder settings
CREATE TABLE IF NOT EXISTS insurance_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  enabled BOOLEAN DEFAULT true,

  -- Reminder days before expiry
  reminder_days JSONB DEFAULT '[90, 60, 30, 14, 7]',

  -- Email settings
  send_to_subcontractor BOOLEAN DEFAULT true,
  cc_emails TEXT[],
  email_template TEXT,

  -- Auto-actions
  auto_flag_expired BOOLEAN DEFAULT true,
  auto_suspend_after_days INTEGER DEFAULT 30, -- days after expiry

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id)
);

-- Insurance reminder log
CREATE TABLE IF NOT EXISTS insurance_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES insurance_certificates(id) ON DELETE SET NULL,
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,

  reminder_type TEXT NOT NULL, -- 'expiring', 'expired', 'missing', 'bulk'
  days_until_expiry INTEGER,

  sent_to_email TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES profiles(id),

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  error_message TEXT
);

-- =============================================
-- Scope Templates Tables
-- =============================================

CREATE TABLE IF NOT EXISTS scope_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  trade_code TEXT NOT NULL,
  division TEXT,

  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false, -- shared across company

  -- Standard items
  common_exclusions JSONB DEFAULT '[]',
  common_inclusions JSONB DEFAULT '[]',
  required_documents JSONB DEFAULT '[]',
  special_conditions TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scope template items
CREATE TABLE IF NOT EXISTS scope_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES scope_templates(id) ON DELETE CASCADE,

  item_number TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT,

  is_required BOOLEAN DEFAULT true,
  is_alternate BOOLEAN DEFAULT false,
  alternate_group TEXT,

  estimated_quantity DECIMAL(15, 4),
  estimated_unit_price DECIMAL(15, 2),

  notes TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Subcontracts Table
-- =============================================

CREATE TABLE IF NOT EXISTS subcontracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE RESTRICT,

  -- Related bid
  bid_package_id UUID REFERENCES bid_packages(id) ON DELETE SET NULL,
  bid_response_id UUID REFERENCES bid_responses(id) ON DELETE SET NULL,

  -- Contract identification
  contract_number TEXT NOT NULL,
  contract_name TEXT NOT NULL,

  -- Amounts
  original_contract_value DECIMAL(15, 2) NOT NULL,
  current_contract_value DECIMAL(15, 2) NOT NULL,
  approved_change_orders DECIMAL(15, 2) DEFAULT 0,
  pending_change_orders DECIMAL(15, 2) DEFAULT 0,

  -- Dates
  contract_date DATE,
  start_date DATE,
  completion_date DATE,
  actual_completion_date DATE,

  -- Terms
  retention_percent DECIMAL(5, 2) DEFAULT 10.00,
  payment_terms TEXT DEFAULT 'Net 30',
  warranty_period_months INTEGER DEFAULT 12,
  liquidated_damages_per_day DECIMAL(15, 2),

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'sent_for_signature', 'partially_signed',
    'executed', 'active', 'suspended', 'completed', 'terminated'
  )),

  -- Scope
  scope_of_work TEXT,
  exclusions TEXT,
  inclusions TEXT,
  special_conditions TEXT,

  -- Documents
  contract_document_url TEXT,
  exhibit_urls JSONB DEFAULT '[]',

  -- Signatures
  gc_signed_by UUID REFERENCES profiles(id),
  gc_signed_at TIMESTAMPTZ,
  sub_signed_by TEXT,
  sub_signed_at TIMESTAMPTZ,

  -- DocuSign integration
  docusign_envelope_id TEXT,
  docusign_status TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, project_id, contract_number)
);

-- Subcontract amendments (change orders to the contract itself)
CREATE TABLE IF NOT EXISTS subcontract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_id UUID NOT NULL REFERENCES subcontracts(id) ON DELETE CASCADE,

  amendment_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Changes
  change_reason TEXT,
  scope_changes TEXT,
  price_change DECIMAL(15, 2) DEFAULT 0,
  time_extension_days INTEGER,
  new_completion_date DATE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'executed'
  )),

  -- Signatures
  gc_signed_by UUID REFERENCES profiles(id),
  gc_signed_at TIMESTAMPTZ,
  sub_signed_by TEXT,
  sub_signed_at TIMESTAMPTZ,

  -- Documents
  document_url TEXT,
  docusign_envelope_id TEXT,

  effective_date DATE,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(subcontract_id, amendment_number)
);

-- Subcontract payments (linking to payment applications)
CREATE TABLE IF NOT EXISTS subcontract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_id UUID NOT NULL REFERENCES subcontracts(id) ON DELETE CASCADE,

  payment_number INTEGER NOT NULL,
  application_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,

  -- Amounts
  work_completed_this_period DECIMAL(15, 2) DEFAULT 0,
  work_completed_to_date DECIMAL(15, 2) DEFAULT 0,
  stored_materials DECIMAL(15, 2) DEFAULT 0,
  gross_amount DECIMAL(15, 2) DEFAULT 0,
  retention_amount DECIMAL(15, 2) DEFAULT 0,
  previous_payments DECIMAL(15, 2) DEFAULT 0,
  net_payment_due DECIMAL(15, 2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'approved', 'rejected',
    'processing', 'paid', 'void'
  )),

  -- Invoice info
  invoice_number TEXT,
  invoice_date DATE,
  invoice_url TEXT,

  -- Approval workflow
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Payment info
  paid_at TIMESTAMPTZ,
  paid_amount DECIMAL(15, 2),
  check_number TEXT,
  payment_method TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(subcontract_id, payment_number)
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Bid packages indexes
CREATE INDEX IF NOT EXISTS idx_bid_packages_company ON bid_packages(company_id);
CREATE INDEX IF NOT EXISTS idx_bid_packages_project ON bid_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_bid_packages_status ON bid_packages(status);
CREATE INDEX IF NOT EXISTS idx_bid_packages_trade ON bid_packages(trade_code);
CREATE INDEX IF NOT EXISTS idx_bid_packages_due_date ON bid_packages(bid_due_date);

-- Bid package items indexes
CREATE INDEX IF NOT EXISTS idx_bid_package_items_package ON bid_package_items(package_id);

-- Bid responses indexes
CREATE INDEX IF NOT EXISTS idx_bid_responses_package ON bid_responses(package_id);
CREATE INDEX IF NOT EXISTS idx_bid_responses_subcontractor ON bid_responses(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_bid_responses_status ON bid_responses(status);
CREATE INDEX IF NOT EXISTS idx_bid_responses_company ON bid_responses(company_id);

-- Bid response items indexes
CREATE INDEX IF NOT EXISTS idx_bid_response_items_response ON bid_response_items(response_id);
CREATE INDEX IF NOT EXISTS idx_bid_response_items_package_item ON bid_response_items(package_item_id);

-- Pre-qualification indexes
CREATE INDEX IF NOT EXISTS idx_prequal_submissions_questionnaire ON prequal_submissions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_prequal_submissions_subcontractor ON prequal_submissions(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_prequal_submissions_status ON prequal_submissions(status);
CREATE INDEX IF NOT EXISTS idx_prequal_submissions_company ON prequal_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_prequal_submissions_expires ON prequal_submissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_prequal_references_submission ON prequal_references(submission_id);
CREATE INDEX IF NOT EXISTS idx_prequal_documents_submission ON prequal_documents(submission_id);

-- Insurance indexes
CREATE INDEX IF NOT EXISTS idx_insurance_certificates_company ON insurance_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_certificates_subcontractor ON insurance_certificates(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_insurance_certificates_type ON insurance_certificates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_insurance_certificates_expiration ON insurance_certificates(expiration_date);
CREATE INDEX IF NOT EXISTS idx_insurance_certificates_status ON insurance_certificates(status);
CREATE INDEX IF NOT EXISTS idx_insurance_requirements_company ON insurance_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_requirements_project ON insurance_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_insurance_reminder_log_company ON insurance_reminder_log(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_reminder_log_subcontractor ON insurance_reminder_log(subcontractor_id);

-- Scope templates indexes
CREATE INDEX IF NOT EXISTS idx_scope_templates_company ON scope_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_scope_templates_trade ON scope_templates(trade_code);
CREATE INDEX IF NOT EXISTS idx_scope_template_items_template ON scope_template_items(template_id);

-- Subcontracts indexes
CREATE INDEX IF NOT EXISTS idx_subcontracts_company ON subcontracts(company_id);
CREATE INDEX IF NOT EXISTS idx_subcontracts_project ON subcontracts(project_id);
CREATE INDEX IF NOT EXISTS idx_subcontracts_subcontractor ON subcontracts(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_subcontracts_status ON subcontracts(status);
CREATE INDEX IF NOT EXISTS idx_subcontracts_bid_package ON subcontracts(bid_package_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_amendments_subcontract ON subcontract_amendments(subcontract_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_payments_subcontract ON subcontract_payments(subcontract_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_payments_status ON subcontract_payments(status);

-- =============================================
-- Row Level Security Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_alternates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prequal_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE prequal_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prequal_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE prequal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_reminder_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontract_payments ENABLE ROW LEVEL SECURITY;

-- Bid Packages policies
CREATE POLICY "Users can view bid packages in their company"
  ON bid_packages FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create bid packages in their company"
  ON bid_packages FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update bid packages in their company"
  ON bid_packages FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete bid packages in their company"
  ON bid_packages FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Bid Package Items policies (inherit from package)
CREATE POLICY "Users can view bid package items"
  ON bid_package_items FOR SELECT
  USING (package_id IN (
    SELECT id FROM bid_packages WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage bid package items"
  ON bid_package_items FOR ALL
  USING (package_id IN (
    SELECT id FROM bid_packages WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Bid Responses policies
CREATE POLICY "Users can view bid responses in their company"
  ON bid_responses FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage bid responses in their company"
  ON bid_responses FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Bid Response Items policies
CREATE POLICY "Users can view bid response items"
  ON bid_response_items FOR SELECT
  USING (response_id IN (
    SELECT id FROM bid_responses WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage bid response items"
  ON bid_response_items FOR ALL
  USING (response_id IN (
    SELECT id FROM bid_responses WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Bid Alternates policies
CREATE POLICY "Users can view bid alternates"
  ON bid_alternates FOR SELECT
  USING (response_id IN (
    SELECT id FROM bid_responses WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage bid alternates"
  ON bid_alternates FOR ALL
  USING (response_id IN (
    SELECT id FROM bid_responses WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Pre-qualification policies
CREATE POLICY "Users can view prequal questionnaires in their company"
  ON prequal_questionnaires FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage prequal questionnaires in their company"
  ON prequal_questionnaires FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view prequal submissions in their company"
  ON prequal_submissions FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage prequal submissions in their company"
  ON prequal_submissions FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view prequal references"
  ON prequal_references FOR SELECT
  USING (submission_id IN (
    SELECT id FROM prequal_submissions WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage prequal references"
  ON prequal_references FOR ALL
  USING (submission_id IN (
    SELECT id FROM prequal_submissions WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view prequal documents"
  ON prequal_documents FOR SELECT
  USING (submission_id IN (
    SELECT id FROM prequal_submissions WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage prequal documents"
  ON prequal_documents FOR ALL
  USING (submission_id IN (
    SELECT id FROM prequal_submissions WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Insurance policies
CREATE POLICY "Users can view insurance requirements in their company"
  ON insurance_requirements FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage insurance requirements in their company"
  ON insurance_requirements FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view insurance certificates in their company"
  ON insurance_certificates FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage insurance certificates in their company"
  ON insurance_certificates FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view insurance reminder settings in their company"
  ON insurance_reminder_settings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage insurance reminder settings in their company"
  ON insurance_reminder_settings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view insurance reminder log in their company"
  ON insurance_reminder_log FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage insurance reminder log in their company"
  ON insurance_reminder_log FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Scope Templates policies
CREATE POLICY "Users can view scope templates in their company"
  ON scope_templates FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage scope templates in their company"
  ON scope_templates FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view scope template items"
  ON scope_template_items FOR SELECT
  USING (template_id IN (
    SELECT id FROM scope_templates WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage scope template items"
  ON scope_template_items FOR ALL
  USING (template_id IN (
    SELECT id FROM scope_templates WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Subcontracts policies
CREATE POLICY "Users can view subcontracts in their company"
  ON subcontracts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage subcontracts in their company"
  ON subcontracts FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view subcontract amendments"
  ON subcontract_amendments FOR SELECT
  USING (subcontract_id IN (
    SELECT id FROM subcontracts WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage subcontract amendments"
  ON subcontract_amendments FOR ALL
  USING (subcontract_id IN (
    SELECT id FROM subcontracts WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view subcontract payments"
  ON subcontract_payments FOR SELECT
  USING (subcontract_id IN (
    SELECT id FROM subcontracts WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage subcontract payments"
  ON subcontract_payments FOR ALL
  USING (subcontract_id IN (
    SELECT id FROM subcontracts WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- =============================================
-- Updated at Triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'bid_packages', 'bid_package_items', 'bid_responses', 'bid_response_items',
    'prequal_questionnaires', 'prequal_submissions',
    'insurance_requirements', 'insurance_certificates', 'insurance_reminder_settings',
    'scope_templates', 'scope_template_items',
    'subcontracts', 'subcontract_amendments', 'subcontract_payments'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- =============================================
-- Helper Functions
-- =============================================

-- Function to calculate days until expiry
CREATE OR REPLACE FUNCTION days_until_expiry(expiration_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN expiration_date - CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get insurance compliance status
CREATE OR REPLACE FUNCTION get_insurance_status(exp_date DATE)
RETURNS TEXT AS $$
DECLARE
  days_left INTEGER;
BEGIN
  days_left := exp_date - CURRENT_DATE;

  IF days_left < 0 THEN
    RETURN 'expired';
  ELSIF days_left <= 30 THEN
    RETURN 'expiring_soon';
  ELSE
    RETURN 'valid';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update subcontract values after change order
CREATE OR REPLACE FUNCTION update_subcontract_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the subcontract's change order totals
  UPDATE subcontracts
  SET
    approved_change_orders = (
      SELECT COALESCE(SUM(price_change), 0)
      FROM subcontract_amendments
      WHERE subcontract_id = NEW.subcontract_id
      AND status = 'executed'
    ),
    pending_change_orders = (
      SELECT COALESCE(SUM(price_change), 0)
      FROM subcontract_amendments
      WHERE subcontract_id = NEW.subcontract_id
      AND status IN ('draft', 'pending_approval', 'approved')
    ),
    current_contract_value = original_contract_value + (
      SELECT COALESCE(SUM(price_change), 0)
      FROM subcontract_amendments
      WHERE subcontract_id = NEW.subcontract_id
      AND status = 'executed'
    )
  WHERE id = NEW.subcontract_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subcontract_on_amendment
  AFTER INSERT OR UPDATE OR DELETE ON subcontract_amendments
  FOR EACH ROW
  EXECUTE FUNCTION update_subcontract_values();

-- =============================================
-- View for Expiring Insurance Dashboard
-- =============================================

CREATE OR REPLACE VIEW insurance_expiry_dashboard AS
SELECT
  ic.id,
  ic.company_id,
  ic.subcontractor_id,
  s.company_name AS subcontractor_name,
  s.contact_name,
  s.email,
  ic.certificate_type,
  ic.certificate_type_name,
  ic.carrier_name,
  ic.expiration_date,
  days_until_expiry(ic.expiration_date) AS days_until_expiry,
  get_insurance_status(ic.expiration_date) AS status,
  ic.coverage_amount,
  ic.verified,
  ic.last_reminder_sent_at
FROM insurance_certificates ic
JOIN subcontractors s ON ic.subcontractor_id = s.id
WHERE ic.status NOT IN ('cancelled', 'rejected');

-- =============================================
-- View for Subcontract Summary
-- =============================================

CREATE OR REPLACE VIEW subcontract_summary AS
SELECT
  sc.id,
  sc.company_id,
  sc.project_id,
  sc.subcontractor_id,
  s.company_name AS subcontractor_name,
  sc.contract_number,
  sc.contract_name,
  sc.status,
  sc.original_contract_value,
  sc.current_contract_value,
  sc.approved_change_orders,
  sc.pending_change_orders,
  sc.retention_percent,
  sc.start_date,
  sc.completion_date,
  -- Calculate paid/invoiced amounts
  COALESCE(
    (SELECT SUM(gross_amount) FROM subcontract_payments WHERE subcontract_id = sc.id AND status = 'approved'),
    0
  ) AS invoiced_amount,
  COALESCE(
    (SELECT SUM(paid_amount) FROM subcontract_payments WHERE subcontract_id = sc.id AND status = 'paid'),
    0
  ) AS paid_amount,
  -- Count change orders
  (SELECT COUNT(*) FROM subcontract_amendments WHERE subcontract_id = sc.id) AS amendment_count,
  -- Insurance compliance (simplified check)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM insurance_certificates ic
      WHERE ic.subcontractor_id = sc.subcontractor_id
      AND ic.expiration_date < CURRENT_DATE
      AND ic.status = 'verified'
    ) THEN 'non_compliant'
    WHEN EXISTS (
      SELECT 1 FROM insurance_certificates ic
      WHERE ic.subcontractor_id = sc.subcontractor_id
      AND ic.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
      AND ic.status = 'verified'
    ) THEN 'warning'
    ELSE 'compliant'
  END AS compliance_status
FROM subcontracts sc
JOIN subcontractors s ON sc.subcontractor_id = s.id;

COMMENT ON TABLE bid_packages IS 'Bid packages for subcontractor bidding';
COMMENT ON TABLE bid_responses IS 'Subcontractor bid submissions/responses';
COMMENT ON TABLE prequal_questionnaires IS 'Pre-qualification questionnaire templates';
COMMENT ON TABLE prequal_submissions IS 'Subcontractor pre-qualification submissions';
COMMENT ON TABLE insurance_certificates IS 'Subcontractor insurance certificates';
COMMENT ON TABLE scope_templates IS 'Scope of work templates by trade';
COMMENT ON TABLE subcontracts IS 'Executed subcontract agreements';
