-- Migration: 021_rls_policy_optimization.sql
-- Description: Performance optimizations for RLS policies with materialized views and partial indexes
-- Created: 2024-11-23

-- =============================================
-- 1. MATERIALIZED VIEW FOR USER PERMISSIONS
-- =============================================

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_project_permissions CASCADE;

-- Create materialized view for user project permissions
-- This view pre-computes user access permissions to avoid complex subqueries in RLS policies
CREATE MATERIALIZED VIEW user_project_permissions AS
SELECT
    u.id AS user_id,
    u.company_id,
    u.role,
    COALESCE(
        ARRAY_AGG(DISTINCT pa.project_id) FILTER (WHERE pa.project_id IS NOT NULL),
        ARRAY[]::uuid[]
    ) AS project_ids,
    COALESCE(
        ARRAY_AGG(DISTINCT pa.project_id) FILTER (
            WHERE pa.project_id IS NOT NULL
            AND pa.role IN ('project_manager', 'superintendent', 'owner')
        ),
        ARRAY[]::uuid[]
    ) AS editable_project_ids,
    COALESCE(
        ARRAY_AGG(DISTINCT pa.project_id) FILTER (
            WHERE pa.project_id IS NOT NULL
            AND pa.role IN ('owner')
        ),
        ARRAY[]::uuid[]
    ) AS admin_project_ids
FROM users u
LEFT JOIN project_assignments pa ON u.id = pa.user_id
GROUP BY u.id, u.company_id, u.role;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_user_project_permissions_user_id ON user_project_permissions(user_id);
CREATE INDEX idx_user_project_permissions_company_id ON user_project_permissions(company_id);
CREATE INDEX idx_user_project_permissions_project_ids ON user_project_permissions USING gin(project_ids);
CREATE INDEX idx_user_project_permissions_editable_ids ON user_project_permissions USING gin(editable_project_ids);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_project_permissions()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_project_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. PARTIAL INDEXES FOR ACTIVE RECORDS
-- =============================================

-- Workflow items - index only non-deleted items
CREATE INDEX IF NOT EXISTS idx_workflow_items_active
ON workflow_items(project_id, workflow_type_id, status, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_items_active_by_type
ON workflow_items(workflow_type_id, status)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_items_active_assignees
ON workflow_items USING gin(assignees)
WHERE deleted_at IS NULL;

-- Documents - index only non-deleted documents
CREATE INDEX IF NOT EXISTS idx_documents_active
ON documents(project_id, document_type, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_active_status
ON documents(project_id, status)
WHERE deleted_at IS NULL AND status != 'archived';

-- Punch items - index only non-deleted items
CREATE INDEX IF NOT EXISTS idx_punch_items_active
ON punch_items(project_id, status, priority)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_punch_items_active_assignee
ON punch_items(project_id, assigned_to)
WHERE deleted_at IS NULL AND status != 'completed';

-- Daily reports - index recent reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_recent
ON daily_reports(project_id, report_date DESC)
WHERE report_date >= CURRENT_DATE - INTERVAL '30 days';

-- Change order bids - index active bids
CREATE INDEX IF NOT EXISTS idx_change_order_bids_active
ON change_order_bids(workflow_item_id, bid_status)
WHERE bid_status IN ('requested', 'submitted', 'under_review');

-- =============================================
-- 3. OPTIMIZE RLS POLICIES WITH MATERIALIZED VIEW
-- =============================================

-- Drop existing policies to recreate with optimized versions
DROP POLICY IF EXISTS "Users can view workflow items for their projects" ON workflow_items;
DROP POLICY IF EXISTS "Users can create workflow items in their projects" ON workflow_items;
DROP POLICY IF EXISTS "Users can update workflow items they created or are assigned to" ON workflow_items;

-- Recreate workflow_items policies using materialized view
CREATE POLICY "Users can view workflow items for their projects"
ON workflow_items FOR SELECT
USING (
    project_id = ANY(
        SELECT project_ids
        FROM user_project_permissions
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create workflow items in their projects"
ON workflow_items FOR INSERT
WITH CHECK (
    project_id = ANY(
        SELECT editable_project_ids
        FROM user_project_permissions
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update workflow items they have edit access to"
ON workflow_items FOR UPDATE
USING (
    project_id = ANY(
        SELECT editable_project_ids
        FROM user_project_permissions
        WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
    OR auth.uid() = ANY(assignees)
);

-- Optimize documents policies
DROP POLICY IF EXISTS "Users can view documents for their projects" ON documents;
DROP POLICY IF EXISTS "Users can create documents in their projects" ON documents;

CREATE POLICY "Users can view documents for their projects"
ON documents FOR SELECT
USING (
    project_id = ANY(
        SELECT project_ids
        FROM user_project_permissions
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create documents in their projects"
ON documents FOR INSERT
WITH CHECK (
    project_id = ANY(
        SELECT project_ids
        FROM user_project_permissions
        WHERE user_id = auth.uid()
    )
);

-- Optimize punch_items policies
DROP POLICY IF EXISTS "Users can view punch items for their projects" ON punch_items;
DROP POLICY IF EXISTS "Users can create punch items in their projects" ON punch_items;

CREATE POLICY "Users can view punch items for their projects"
ON punch_items FOR SELECT
USING (
    project_id = ANY(
        SELECT project_ids
        FROM user_project_permissions
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create punch items in their projects"
ON punch_items FOR INSERT
WITH CHECK (
    project_id = ANY(
        SELECT editable_project_ids
        FROM user_project_permissions
        WHERE user_id = auth.uid()
    )
);

-- =============================================
-- 4. AUTOMATED REFRESH TRIGGERS
-- =============================================

-- Create trigger function to refresh permissions on project assignment changes
CREATE OR REPLACE FUNCTION trigger_refresh_user_permissions()
RETURNS trigger AS $$
BEGIN
    -- Refresh the materialized view asynchronously
    PERFORM pg_notify('refresh_permissions', 'project_assignments');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on project_assignments
CREATE TRIGGER refresh_permissions_on_assignment_insert
AFTER INSERT ON project_assignments
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_user_permissions();

CREATE TRIGGER refresh_permissions_on_assignment_update
AFTER UPDATE ON project_assignments
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_user_permissions();

CREATE TRIGGER refresh_permissions_on_assignment_delete
AFTER DELETE ON project_assignments
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_user_permissions();

-- Create triggers on users table for role changes
CREATE TRIGGER refresh_permissions_on_user_role_change
AFTER UPDATE OF role ON users
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_user_permissions();

-- =============================================
-- 5. PERFORMANCE MONITORING FUNCTIONS
-- =============================================

-- Function to analyze RLS policy performance
CREATE OR REPLACE FUNCTION analyze_rls_performance(
    p_table_name text,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
    policy_name text,
    operation text,
    execution_time interval,
    rows_affected bigint
) AS $$
DECLARE
    v_start_time timestamp;
    v_end_time timestamp;
    v_row_count bigint;
BEGIN
    -- This is a placeholder for monitoring
    -- In production, you would use pg_stat_statements or similar
    RETURN QUERY
    SELECT
        pol.polname::text AS policy_name,
        CASE pol.polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            ELSE 'UNKNOWN'
        END AS operation,
        INTERVAL '0 seconds' AS execution_time,
        0::bigint AS rows_affected
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname = p_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. HELPER FUNCTIONS FOR COMMON RLS PATTERNS
-- =============================================

-- Function to check if user has project access
CREATE OR REPLACE FUNCTION user_has_project_access(
    p_project_id uuid,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_project_permissions
        WHERE user_id = p_user_id
        AND p_project_id = ANY(project_ids)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can edit project
CREATE OR REPLACE FUNCTION user_can_edit_project(
    p_project_id uuid,
    p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_project_permissions
        WHERE user_id = p_user_id
        AND p_project_id = ANY(editable_project_ids)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- 7. INITIAL POPULATION OF MATERIALIZED VIEW
-- =============================================

-- Refresh the materialized view with initial data
REFRESH MATERIALIZED VIEW user_project_permissions;

-- =============================================
-- 8. SCHEDULED REFRESH (FOR PRODUCTION)
-- =============================================

-- Note: In production, set up a cron job or pg_cron to refresh periodically
-- Example with pg_cron (if extension is available):
-- SELECT cron.schedule('refresh-user-permissions', '*/15 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY user_project_permissions;');

-- =============================================
-- ROLLBACK SCRIPT
-- =============================================

COMMENT ON MATERIALIZED VIEW user_project_permissions IS '
ROLLBACK SCRIPT:
-- Drop materialized view and related objects
DROP MATERIALIZED VIEW IF EXISTS user_project_permissions CASCADE;
DROP FUNCTION IF EXISTS refresh_user_project_permissions() CASCADE;
DROP FUNCTION IF EXISTS trigger_refresh_user_permissions() CASCADE;
DROP FUNCTION IF EXISTS analyze_rls_performance(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS user_has_project_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS user_can_edit_project(uuid, uuid) CASCADE;

-- Drop partial indexes
DROP INDEX IF EXISTS idx_workflow_items_active;
DROP INDEX IF EXISTS idx_workflow_items_active_by_type;
DROP INDEX IF EXISTS idx_workflow_items_active_assignees;
DROP INDEX IF EXISTS idx_documents_active;
DROP INDEX IF EXISTS idx_documents_active_status;
DROP INDEX IF EXISTS idx_punch_items_active;
DROP INDEX IF EXISTS idx_punch_items_active_assignee;
DROP INDEX IF EXISTS idx_daily_reports_recent;
DROP INDEX IF EXISTS idx_change_order_bids_active;

-- Restore original RLS policies (would need to be recreated from migration 022)
';