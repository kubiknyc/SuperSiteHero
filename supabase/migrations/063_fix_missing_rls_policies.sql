-- Migration: Fix missing RLS policies for workflow_types, punch_items, and other tables
-- These tables have RLS enabled but no policies, blocking all access

-- =============================================
-- RLS Policies for workflow_types
-- =============================================
DROP POLICY IF EXISTS "Users can view workflow types for their company" ON workflow_types;
CREATE POLICY "Users can view workflow types for their company" ON workflow_types
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage workflow types" ON workflow_types;
CREATE POLICY "Admins can manage workflow types" ON workflow_types
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'company_admin', 'super_admin')
        )
    );

-- =============================================
-- RLS Policies for punch_items
-- =============================================
DROP POLICY IF EXISTS "Users can view punch items for their projects" ON punch_items;
CREATE POLICY "Users can view punch items for their projects" ON punch_items
    FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can create punch items for their projects" ON punch_items;
CREATE POLICY "Users can create punch items for their projects" ON punch_items
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update punch items for their projects" ON punch_items;
CREATE POLICY "Users can update punch items for their projects" ON punch_items
    FOR UPDATE
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete punch items for their projects" ON punch_items;
CREATE POLICY "Users can delete punch items for their projects" ON punch_items
    FOR DELETE
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- =============================================
-- RLS Policies for workflow_items
-- =============================================
DROP POLICY IF EXISTS "Users can view workflow items for their projects" ON workflow_items;
CREATE POLICY "Users can view workflow items for their projects" ON workflow_items
    FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage workflow items for their projects" ON workflow_items;
CREATE POLICY "Users can manage workflow items for their projects" ON workflow_items
    FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- =============================================
-- Seed default workflow types for all companies
-- =============================================
INSERT INTO workflow_types (company_id, name_singular, name_plural, prefix, is_default, has_cost_impact, has_schedule_impact, requires_approval)
SELECT
    c.id,
    'RFI',
    'RFIs',
    'RFI',
    true,
    true,
    true,
    false
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_types wt
    WHERE wt.company_id = c.id AND wt.name_singular = 'RFI'
);

INSERT INTO workflow_types (company_id, name_singular, name_plural, prefix, is_default, has_cost_impact, has_schedule_impact, requires_approval)
SELECT
    c.id,
    'Submittal',
    'Submittals',
    'SUB',
    true,
    false,
    true,
    true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_types wt
    WHERE wt.company_id = c.id AND wt.name_singular = 'Submittal'
);

INSERT INTO workflow_types (company_id, name_singular, name_plural, prefix, is_default, has_cost_impact, has_schedule_impact, requires_approval)
SELECT
    c.id,
    'Change Order',
    'Change Orders',
    'CO',
    true,
    true,
    true,
    true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_types wt
    WHERE wt.company_id = c.id AND wt.name_singular = 'Change Order'
);

-- =============================================
-- RLS Policies for daily_reports (if missing)
-- =============================================
DROP POLICY IF EXISTS "Users can view daily reports for their projects" ON daily_reports;
CREATE POLICY "Users can view daily reports for their projects" ON daily_reports
    FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can create daily reports for their projects" ON daily_reports;
CREATE POLICY "Users can create daily reports for their projects" ON daily_reports
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update daily reports for their projects" ON daily_reports;
CREATE POLICY "Users can update daily reports for their projects" ON daily_reports
    FOR UPDATE
    USING (
        project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );
