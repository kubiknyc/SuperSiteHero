-- Migration: Closeout Module Enhancements
-- Adds tables for O&M Manual Builder, Attic Stock Tracker, Training Records, and Warranty Claims

-- =============================================
-- O&M Manual Sections
-- =============================================

CREATE TABLE IF NOT EXISTS om_manual_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Section details
    section_type TEXT NOT NULL CHECK (section_type IN (
        'cover', 'toc', 'equipment', 'maintenance',
        'warranties', 'as_builts', 'emergency_contacts',
        'system_overview', 'operating_procedures',
        'preventive_maintenance', 'spare_parts', 'vendor_list',
        'commissioning_data', 'test_reports', 'custom'
    )),
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Content
    content TEXT, -- Rich text content for the section
    custom_template TEXT, -- Custom template for the section

    -- Documents
    document_urls TEXT[] DEFAULT '{}',

    -- Status
    is_complete BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profiles(id),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    deleted_at TIMESTAMPTZ
);

-- O&M Manual Versions (for generated manuals)
CREATE TABLE IF NOT EXISTS om_manual_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Version info
    version_number INTEGER NOT NULL DEFAULT 1,
    version_label TEXT, -- e.g., "Draft", "Final", "Owner Copy"
    recipient_type TEXT CHECK (recipient_type IN ('owner', 'facility_manager', 'contractor', 'archive')),

    -- Generated document
    document_url TEXT,
    file_name TEXT,
    file_size INTEGER, -- bytes
    page_count INTEGER,

    -- Generation details
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES profiles(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'complete', 'failed', 'archived')),
    error_message TEXT,

    -- Tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================
-- Attic Stock Tracking
-- =============================================

CREATE TABLE IF NOT EXISTS attic_stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Item details
    item_name TEXT NOT NULL,
    description TEXT,
    spec_section TEXT,
    manufacturer TEXT,
    model_number TEXT,
    color_finish TEXT,

    -- Quantity tracking
    quantity_required INTEGER NOT NULL DEFAULT 0,
    quantity_delivered INTEGER NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'each', -- each, box, carton, pallet, etc.

    -- Location
    building_location TEXT,
    floor_level TEXT,
    room_area TEXT,
    storage_notes TEXT,

    -- Subcontractor responsible
    subcontractor_id UUID REFERENCES contacts(id),

    -- Delivery info
    delivery_date DATE,
    delivery_notes TEXT,

    -- Photo documentation
    photo_urls TEXT[] DEFAULT '{}',

    -- Sign-off
    owner_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    deleted_at TIMESTAMPTZ
);

-- Attic Stock Delivery Log
CREATE TABLE IF NOT EXISTS attic_stock_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attic_stock_item_id UUID NOT NULL REFERENCES attic_stock_items(id) ON DELETE CASCADE,

    -- Delivery details
    delivery_date DATE NOT NULL,
    quantity_delivered INTEGER NOT NULL,

    -- Documentation
    delivery_ticket_number TEXT,
    delivery_ticket_url TEXT,
    photo_urls TEXT[] DEFAULT '{}',

    -- Verification
    received_by UUID REFERENCES profiles(id),
    received_by_name TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- =============================================
-- Training Records
-- =============================================

CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Session details
    title TEXT NOT NULL,
    description TEXT,
    session_type TEXT CHECK (session_type IN (
        'equipment_operation', 'maintenance_procedures',
        'safety_systems', 'hvac_controls', 'fire_alarm',
        'security_systems', 'bms_automation', 'general', 'other'
    )),

    -- Equipment/Systems covered
    equipment_systems TEXT[], -- List of equipment/systems covered
    spec_sections TEXT[], -- Related spec sections

    -- Schedule
    scheduled_date DATE,
    scheduled_start_time TIME,
    scheduled_end_time TIME,
    actual_duration_minutes INTEGER,
    location TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'
    )),

    -- Trainer info
    trainer_name TEXT,
    trainer_company TEXT,
    trainer_contact TEXT,
    trainer_email TEXT,
    trainer_credentials TEXT,

    -- Materials
    training_materials_urls TEXT[] DEFAULT '{}',
    video_recording_urls TEXT[] DEFAULT '{}',
    presentation_url TEXT,
    handout_url TEXT,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    deleted_at TIMESTAMPTZ
);

-- Training Session Attendees
CREATE TABLE IF NOT EXISTS training_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,

    -- Attendee details
    attendee_name TEXT NOT NULL,
    attendee_email TEXT,
    attendee_phone TEXT,
    attendee_company TEXT,
    attendee_title TEXT,

    -- Sign-in
    signed_in BOOLEAN DEFAULT FALSE,
    sign_in_time TIMESTAMPTZ,
    signature_url TEXT, -- URL to signature image

    -- Certificate
    certificate_generated BOOLEAN DEFAULT FALSE,
    certificate_url TEXT,
    certificate_number TEXT,
    certificate_generated_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Warranty Claims
-- =============================================

CREATE TABLE IF NOT EXISTS warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,

    -- Claim details
    claim_number TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Issue details
    issue_date DATE NOT NULL,
    issue_discovered_by TEXT,
    issue_location TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'submitted', 'in_progress',
        'pending_parts', 'scheduled', 'resolved', 'denied', 'closed'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    -- Documentation
    photo_urls TEXT[] DEFAULT '{}',
    document_urls TEXT[] DEFAULT '{}',

    -- Contractor response
    contractor_contacted_date DATE,
    contractor_response_date DATE,
    contractor_response TEXT,
    contractor_contact_name TEXT,
    contractor_contact_phone TEXT,
    contractor_contact_email TEXT,

    -- Resolution
    resolution_date DATE,
    resolution_description TEXT,
    resolution_satisfactory BOOLEAN,
    resolution_photos TEXT[] DEFAULT '{}',

    -- Timeline
    estimated_resolution_date DATE,
    actual_cost DECIMAL(12, 2), -- If any cost to owner

    -- Denial info (if denied)
    denial_reason TEXT,
    denial_date DATE,

    -- Sign-off
    owner_signed_off BOOLEAN DEFAULT FALSE,
    owner_sign_off_date TIMESTAMPTZ,
    owner_sign_off_by UUID REFERENCES profiles(id),

    -- Notes
    internal_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    deleted_at TIMESTAMPTZ
);

-- Warranty Claim Activity Log
CREATE TABLE IF NOT EXISTS warranty_claim_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_claim_id UUID NOT NULL REFERENCES warranty_claims(id) ON DELETE CASCADE,

    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'status_change', 'note_added', 'photo_added',
        'document_added', 'contractor_response', 'resolution_update',
        'scheduled', 'call_logged', 'email_sent', 'other'
    )),
    previous_status TEXT,
    new_status TEXT,
    description TEXT,

    -- User
    created_by UUID REFERENCES profiles(id),
    created_by_name TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Closeout Progress Tracking
-- =============================================

CREATE TABLE IF NOT EXISTS closeout_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Milestone details
    milestone_type TEXT NOT NULL CHECK (milestone_type IN (
        'substantial_completion', 'punch_list_complete',
        'training_complete', 'om_manuals_delivered',
        'warranties_collected', 'attic_stock_delivered',
        'final_inspection', 'certificate_of_occupancy',
        'final_payment_released', 'project_closed'
    )),
    title TEXT NOT NULL,
    description TEXT,

    -- Target and actual dates
    target_date DATE,
    actual_date DATE,

    -- Status
    is_complete BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES profiles(id),

    -- Sign-off
    requires_owner_signoff BOOLEAN DEFAULT FALSE,
    owner_signed_off BOOLEAN DEFAULT FALSE,
    owner_sign_off_date TIMESTAMPTZ,
    owner_sign_off_by UUID REFERENCES profiles(id),
    owner_sign_off_notes TEXT,

    -- Documentation
    document_urls TEXT[] DEFAULT '{}',
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    deleted_at TIMESTAMPTZ
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_om_manual_sections_project ON om_manual_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_om_manual_sections_type ON om_manual_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_om_manual_versions_project ON om_manual_versions(project_id);

CREATE INDEX IF NOT EXISTS idx_attic_stock_items_project ON attic_stock_items(project_id);
CREATE INDEX IF NOT EXISTS idx_attic_stock_items_verified ON attic_stock_items(owner_verified);
CREATE INDEX IF NOT EXISTS idx_attic_stock_deliveries_item ON attic_stock_deliveries(attic_stock_item_id);

CREATE INDEX IF NOT EXISTS idx_training_sessions_project ON training_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_training_attendees_session ON training_attendees(training_session_id);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_project ON warranty_claims(project_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_activities_claim ON warranty_claim_activities(warranty_claim_id);

CREATE INDEX IF NOT EXISTS idx_closeout_milestones_project ON closeout_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_closeout_milestones_type ON closeout_milestones(milestone_type);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE om_manual_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE om_manual_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attic_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attic_stock_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claim_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE closeout_milestones ENABLE ROW LEVEL SECURITY;

-- O&M Manual Sections RLS
CREATE POLICY "Users can view om_manual_sections in their company"
    ON om_manual_sections FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert om_manual_sections in their company"
    ON om_manual_sections FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update om_manual_sections in their company"
    ON om_manual_sections FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete om_manual_sections in their company"
    ON om_manual_sections FOR DELETE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- O&M Manual Versions RLS
CREATE POLICY "Users can view om_manual_versions in their company"
    ON om_manual_versions FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert om_manual_versions in their company"
    ON om_manual_versions FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update om_manual_versions in their company"
    ON om_manual_versions FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Attic Stock Items RLS
CREATE POLICY "Users can view attic_stock_items in their company"
    ON attic_stock_items FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert attic_stock_items in their company"
    ON attic_stock_items FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update attic_stock_items in their company"
    ON attic_stock_items FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete attic_stock_items in their company"
    ON attic_stock_items FOR DELETE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Attic Stock Deliveries RLS (inherits from parent item)
CREATE POLICY "Users can view attic_stock_deliveries for their items"
    ON attic_stock_deliveries FOR SELECT
    USING (attic_stock_item_id IN (
        SELECT id FROM attic_stock_items
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Users can insert attic_stock_deliveries for their items"
    ON attic_stock_deliveries FOR INSERT
    WITH CHECK (attic_stock_item_id IN (
        SELECT id FROM attic_stock_items
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    ));

-- Training Sessions RLS
CREATE POLICY "Users can view training_sessions in their company"
    ON training_sessions FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert training_sessions in their company"
    ON training_sessions FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update training_sessions in their company"
    ON training_sessions FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete training_sessions in their company"
    ON training_sessions FOR DELETE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Training Attendees RLS (inherits from session)
CREATE POLICY "Users can view training_attendees for their sessions"
    ON training_attendees FOR SELECT
    USING (training_session_id IN (
        SELECT id FROM training_sessions
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Users can manage training_attendees for their sessions"
    ON training_attendees FOR ALL
    USING (training_session_id IN (
        SELECT id FROM training_sessions
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    ));

-- Warranty Claims RLS
CREATE POLICY "Users can view warranty_claims in their company"
    ON warranty_claims FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert warranty_claims in their company"
    ON warranty_claims FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update warranty_claims in their company"
    ON warranty_claims FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete warranty_claims in their company"
    ON warranty_claims FOR DELETE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Warranty Claim Activities RLS (inherits from claim)
CREATE POLICY "Users can view warranty_claim_activities for their claims"
    ON warranty_claim_activities FOR SELECT
    USING (warranty_claim_id IN (
        SELECT id FROM warranty_claims
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Users can insert warranty_claim_activities for their claims"
    ON warranty_claim_activities FOR INSERT
    WITH CHECK (warranty_claim_id IN (
        SELECT id FROM warranty_claims
        WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    ));

-- Closeout Milestones RLS
CREATE POLICY "Users can view closeout_milestones in their company"
    ON closeout_milestones FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert closeout_milestones in their company"
    ON closeout_milestones FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update closeout_milestones in their company"
    ON closeout_milestones FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete closeout_milestones in their company"
    ON closeout_milestones FOR DELETE
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- =============================================
-- Updated At Triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_closeout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER om_manual_sections_updated_at
    BEFORE UPDATE ON om_manual_sections
    FOR EACH ROW EXECUTE FUNCTION update_closeout_updated_at();

CREATE TRIGGER om_manual_versions_updated_at
    BEFORE UPDATE ON om_manual_versions
    FOR EACH ROW EXECUTE FUNCTION update_closeout_updated_at();

CREATE TRIGGER attic_stock_items_updated_at
    BEFORE UPDATE ON attic_stock_items
    FOR EACH ROW EXECUTE FUNCTION update_closeout_updated_at();

CREATE TRIGGER training_sessions_updated_at
    BEFORE UPDATE ON training_sessions
    FOR EACH ROW EXECUTE FUNCTION update_closeout_updated_at();

CREATE TRIGGER training_attendees_updated_at
    BEFORE UPDATE ON training_attendees
    FOR EACH ROW EXECUTE FUNCTION update_closeout_updated_at();

CREATE TRIGGER warranty_claims_updated_at
    BEFORE UPDATE ON warranty_claims
    FOR EACH ROW EXECUTE FUNCTION update_closeout_updated_at();

CREATE TRIGGER closeout_milestones_updated_at
    BEFORE UPDATE ON closeout_milestones
    FOR EACH ROW EXECUTE FUNCTION update_closeout_updated_at();

-- =============================================
-- Auto-increment claim number function
-- =============================================

CREATE OR REPLACE FUNCTION generate_warranty_claim_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(claim_number FROM 'WC-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM warranty_claims
    WHERE company_id = NEW.company_id;

    NEW.claim_number := 'WC-' || LPAD(next_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warranty_claims_generate_number
    BEFORE INSERT ON warranty_claims
    FOR EACH ROW
    WHEN (NEW.claim_number IS NULL)
    EXECUTE FUNCTION generate_warranty_claim_number();
