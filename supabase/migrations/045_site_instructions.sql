-- Migration: Site Instructions Enhancement
-- Description: Adds additional columns and tables to enhance site instructions functionality

-- ============================================================
-- ENHANCE SITE_INSTRUCTIONS TABLE (Already exists)
-- ============================================================

-- Add new columns to existing site_instructions table
ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES users(id);

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'acknowledged', 'in_progress', 'completed', 'verified', 'void'));

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS acknowledgment_notes TEXT;

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES tasks(id);

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS linked_punch_list_id UUID REFERENCES punch_lists(id);

ALTER TABLE site_instructions
ADD COLUMN IF NOT EXISTS linked_daily_report_id UUID REFERENCES daily_reports(id);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_site_instructions_status ON site_instructions(status);
CREATE INDEX IF NOT EXISTS idx_site_instructions_issued_by ON site_instructions(issued_by);
CREATE INDEX IF NOT EXISTS idx_site_instructions_due_date ON site_instructions(due_date);
CREATE INDEX IF NOT EXISTS idx_site_instructions_priority ON site_instructions(priority);

-- ============================================================
-- SITE INSTRUCTION ATTACHMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS site_instruction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_instruction_id UUID NOT NULL REFERENCES site_instructions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for attachments
CREATE INDEX IF NOT EXISTS idx_site_instruction_attachments_instruction ON site_instruction_attachments(site_instruction_id);

-- ============================================================
-- SITE INSTRUCTION COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS site_instruction_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_instruction_id UUID NOT NULL REFERENCES site_instructions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_site_instruction_comments_instruction ON site_instruction_comments(site_instruction_id);

-- ============================================================
-- SITE INSTRUCTION HISTORY TABLE (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_instruction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_instruction_id UUID NOT NULL REFERENCES site_instructions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'issued', 'acknowledged', 'completed', 'verified', 'voided'
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    changes JSONB, -- Details of what changed
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- Indexes for history
CREATE INDEX IF NOT EXISTS idx_site_instruction_history_instruction ON site_instruction_history(site_instruction_id);
CREATE INDEX IF NOT EXISTS idx_site_instruction_history_action ON site_instruction_history(action);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE site_instruction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_instruction_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_instruction_history ENABLE ROW LEVEL SECURITY;

-- Policies for attachments
CREATE POLICY "Users can view attachments for accessible instructions" ON site_instruction_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM site_instructions si
            JOIN project_users pu ON si.project_id = pu.project_id
            WHERE si.id = site_instruction_attachments.site_instruction_id
            AND pu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add attachments to accessible instructions" ON site_instruction_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM site_instructions si
            JOIN project_users pu ON si.project_id = pu.project_id
            WHERE si.id = site_instruction_attachments.site_instruction_id
            AND pu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own attachments" ON site_instruction_attachments
    FOR DELETE
    USING (uploaded_by = auth.uid());

-- Policies for comments
CREATE POLICY "Users can view comments for accessible instructions" ON site_instruction_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM site_instructions si
            JOIN project_users pu ON si.project_id = pu.project_id
            WHERE si.id = site_instruction_comments.site_instruction_id
            AND pu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add comments to accessible instructions" ON site_instruction_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM site_instructions si
            JOIN project_users pu ON si.project_id = pu.project_id
            WHERE si.id = site_instruction_comments.site_instruction_id
            AND pu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own comments" ON site_instruction_comments
    FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments" ON site_instruction_comments
    FOR DELETE
    USING (created_by = auth.uid());

-- Policies for history (read-only for project members)
CREATE POLICY "Users can view history for accessible instructions" ON site_instruction_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM site_instructions si
            JOIN project_users pu ON si.project_id = pu.project_id
            WHERE si.id = site_instruction_history.site_instruction_id
            AND pu.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert history records" ON site_instruction_history
    FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_instruction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS tr_site_instruction_timestamp ON site_instructions;
CREATE TRIGGER tr_site_instruction_timestamp
    BEFORE UPDATE ON site_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_site_instruction_timestamp();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_site_instruction_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO site_instruction_history (
            site_instruction_id,
            action,
            old_status,
            new_status,
            performed_by,
            performed_at
        ) VALUES (
            NEW.id,
            CASE
                WHEN NEW.status = 'issued' THEN 'issued'
                WHEN NEW.status = 'acknowledged' THEN 'acknowledged'
                WHEN NEW.status = 'in_progress' THEN 'started'
                WHEN NEW.status = 'completed' THEN 'completed'
                WHEN NEW.status = 'verified' THEN 'verified'
                WHEN NEW.status = 'void' THEN 'voided'
                ELSE 'updated'
            END,
            OLD.status,
            NEW.status,
            auth.uid(),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log status changes
DROP TRIGGER IF EXISTS tr_site_instruction_status_log ON site_instructions;
CREATE TRIGGER tr_site_instruction_status_log
    AFTER UPDATE ON site_instructions
    FOR EACH ROW
    EXECUTE FUNCTION log_site_instruction_status_change();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE site_instruction_attachments IS 'Files attached to site instructions';
COMMENT ON TABLE site_instruction_comments IS 'Discussion comments on site instructions';
COMMENT ON TABLE site_instruction_history IS 'Audit trail of all changes to site instructions';

COMMENT ON COLUMN site_instructions.status IS 'Workflow status: draft -> issued -> acknowledged -> in_progress -> completed -> verified';
COMMENT ON COLUMN site_instructions.priority IS 'Priority level: low, normal, high, urgent';
