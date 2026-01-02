-- ============================================================================
-- Migration 091: Enhanced Schedule Resources and Assignments
-- Adds resource capacity management, assignment tracking, and leveling support
-- ============================================================================

-- ============================================================================
-- RESOURCE CAPACITY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_resource_capacity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES schedule_resources(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    available_hours DECIMAL(10,2) NOT NULL DEFAULT 8,
    max_units DECIMAL(10,2) NOT NULL DEFAULT 100, -- Percentage (100 = full time)
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_capacity_period CHECK (period_end >= period_start),
    CONSTRAINT unique_resource_period UNIQUE (resource_id, period_start, period_end)
);

COMMENT ON TABLE schedule_resource_capacity IS 'Resource availability and capacity over time periods';

-- ============================================================================
-- ENHANCED RESOURCE ASSIGNMENTS
-- ============================================================================

-- Add additional fields to resource_assignments if they don't exist
DO $$
BEGIN
    -- Add contour type for work distribution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'resource_assignments' AND column_name = 'work_contour') THEN
        ALTER TABLE resource_assignments ADD COLUMN work_contour VARCHAR(50) DEFAULT 'flat';
    END IF;

    -- Add delay field for staggered assignments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'resource_assignments' AND column_name = 'delay_days') THEN
        ALTER TABLE resource_assignments ADD COLUMN delay_days INTEGER DEFAULT 0;
    END IF;

    -- Add overallocated flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'resource_assignments' AND column_name = 'is_overallocated') THEN
        ALTER TABLE resource_assignments ADD COLUMN is_overallocated BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add peak units for histogram calculation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'resource_assignments' AND column_name = 'peak_units') THEN
        ALTER TABLE resource_assignments ADD COLUMN peak_units DECIMAL(10,2);
    END IF;
END $$;

-- ============================================================================
-- RESOURCE ALLOCATION DAILY VIEW
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_resource_daily_allocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES schedule_resources(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    allocation_date DATE NOT NULL,
    allocated_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    allocated_units DECIMAL(10,2) NOT NULL DEFAULT 0, -- Percentage
    activity_count INTEGER NOT NULL DEFAULT 0,
    is_overallocated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_resource_daily UNIQUE (resource_id, project_id, allocation_date)
);

COMMENT ON TABLE schedule_resource_daily_allocation IS 'Pre-calculated daily resource allocations for histogram display';

-- ============================================================================
-- RESOURCE LEVELING SUGGESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_leveling_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES schedule_resources(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES schedule_activities(id) ON DELETE CASCADE,

    -- Suggestion details
    suggestion_type VARCHAR(50) NOT NULL, -- 'delay', 'split', 'reduce_units', 'reassign'
    original_start DATE,
    suggested_start DATE,
    original_end DATE,
    suggested_end DATE,
    original_units DECIMAL(10,2),
    suggested_units DECIMAL(10,2),

    -- Impact analysis
    impact_score INTEGER, -- 1-100, lower is better
    affects_critical_path BOOLEAN DEFAULT FALSE,
    project_delay_days INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'applied'
    applied_at TIMESTAMPTZ,
    applied_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

COMMENT ON TABLE schedule_leveling_suggestions IS 'AI/algorithm generated suggestions for resolving resource overallocations';

-- ============================================================================
-- FUNCTION: Calculate Resource Allocation
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_resource_allocations(
    p_project_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    resource_id UUID,
    resource_name TEXT,
    allocation_date DATE,
    allocated_hours DECIMAL,
    allocated_units DECIMAL,
    max_units DECIMAL,
    is_overallocated BOOLEAN,
    activities JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_range AS (
        SELECT generate_series(
            COALESCE(p_start_date, (SELECT MIN(planned_start::date) FROM schedule_activities WHERE project_id = p_project_id)),
            COALESCE(p_end_date, (SELECT MAX(planned_finish::date) FROM schedule_activities WHERE project_id = p_project_id)),
            '1 day'::interval
        )::date AS work_date
    ),
    daily_allocations AS (
        SELECT
            ra.resource_id,
            dr.work_date AS allocation_date,
            SUM(
                CASE
                    WHEN dr.work_date >= sa.planned_start::date
                         AND dr.work_date <= sa.planned_finish::date
                    THEN COALESCE(ra.planned_work_hours, 8) / GREATEST(1, sa.planned_duration)
                    ELSE 0
                END
            ) AS hours,
            SUM(
                CASE
                    WHEN dr.work_date >= sa.planned_start::date
                         AND dr.work_date <= sa.planned_finish::date
                    THEN ra.units
                    ELSE 0
                END
            ) AS units,
            jsonb_agg(
                CASE
                    WHEN dr.work_date >= sa.planned_start::date
                         AND dr.work_date <= sa.planned_finish::date
                    THEN jsonb_build_object(
                        'activity_id', sa.id,
                        'activity_name', sa.name,
                        'units', ra.units,
                        'hours', COALESCE(ra.planned_work_hours, 8) / GREATEST(1, sa.planned_duration)
                    )
                    ELSE NULL
                END
            ) FILTER (WHERE dr.work_date >= sa.planned_start::date AND dr.work_date <= sa.planned_finish::date) AS activities
        FROM date_range dr
        CROSS JOIN resource_assignments ra
        JOIN schedule_activities sa ON sa.id = ra.activity_id
        WHERE sa.project_id = p_project_id
          AND sa.status != 'completed'
          AND sa.deleted_at IS NULL
        GROUP BY ra.resource_id, dr.work_date
    )
    SELECT
        da.resource_id,
        sr.name::text AS resource_name,
        da.allocation_date,
        da.hours AS allocated_hours,
        da.units AS allocated_units,
        sr.max_units,
        da.units > sr.max_units AS is_overallocated,
        COALESCE(da.activities, '[]'::jsonb) AS activities
    FROM daily_allocations da
    JOIN schedule_resources sr ON sr.id = da.resource_id
    WHERE da.hours > 0
    ORDER BY da.resource_id, da.allocation_date;
END;
$$;

-- ============================================================================
-- FUNCTION: Detect Resource Overallocations
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_resource_overallocations(p_project_id UUID)
RETURNS TABLE (
    resource_id UUID,
    resource_name TEXT,
    overallocation_start DATE,
    overallocation_end DATE,
    peak_overallocation DECIMAL,
    affected_activities UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH daily_alloc AS (
        SELECT * FROM calculate_resource_allocations(p_project_id)
        WHERE is_overallocated = TRUE
    ),
    overallocation_periods AS (
        SELECT
            da.resource_id,
            da.resource_name,
            da.allocation_date,
            da.allocated_units,
            da.activities
        FROM daily_alloc da
    )
    SELECT
        op.resource_id,
        op.resource_name,
        MIN(op.allocation_date) AS overallocation_start,
        MAX(op.allocation_date) AS overallocation_end,
        MAX(op.allocated_units) AS peak_overallocation,
        ARRAY_AGG(DISTINCT (elem->>'activity_id')::uuid) AS affected_activities
    FROM overallocation_periods op,
    LATERAL jsonb_array_elements(op.activities) AS elem
    GROUP BY op.resource_id, op.resource_name;
END;
$$;

-- ============================================================================
-- FUNCTION: Generate Leveling Suggestions
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_leveling_suggestions(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_suggestion_count INTEGER := 0;
    v_overallocation RECORD;
    v_activity RECORD;
BEGIN
    -- Clear existing pending suggestions
    DELETE FROM schedule_leveling_suggestions
    WHERE project_id = p_project_id AND status = 'pending';

    -- Get overallocations
    FOR v_overallocation IN
        SELECT * FROM detect_resource_overallocations(p_project_id)
    LOOP
        -- For each affected activity, generate delay suggestion
        FOR v_activity IN
            SELECT sa.*, sa.is_on_critical_path
            FROM schedule_activities sa
            WHERE sa.id = ANY(v_overallocation.affected_activities)
              AND sa.is_on_critical_path = FALSE -- Don't suggest delaying critical path activities
            ORDER BY sa.total_float DESC NULLS LAST -- Start with activities that have most float
        LOOP
            INSERT INTO schedule_leveling_suggestions (
                project_id,
                resource_id,
                activity_id,
                suggestion_type,
                original_start,
                suggested_start,
                original_end,
                suggested_end,
                impact_score,
                affects_critical_path,
                project_delay_days
            ) VALUES (
                p_project_id,
                v_overallocation.resource_id,
                v_activity.id,
                'delay',
                v_activity.planned_start::date,
                (v_activity.planned_start::date + INTERVAL '1 day')::date,
                v_activity.planned_finish::date,
                (v_activity.planned_finish::date + INTERVAL '1 day')::date,
                CASE WHEN v_activity.total_float > 5 THEN 20
                     WHEN v_activity.total_float > 0 THEN 50
                     ELSE 80 END,
                v_activity.is_on_critical_path,
                CASE WHEN v_activity.total_float <= 0 THEN 1 ELSE 0 END
            );

            v_suggestion_count := v_suggestion_count + 1;
        END LOOP;
    END LOOP;

    RETURN v_suggestion_count;
END;
$$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_resource_capacity_resource ON schedule_resource_capacity(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_period ON schedule_resource_capacity(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_resource_daily_allocation_resource ON schedule_resource_daily_allocation(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_daily_allocation_date ON schedule_resource_daily_allocation(allocation_date);
CREATE INDEX IF NOT EXISTS idx_resource_daily_allocation_project ON schedule_resource_daily_allocation(project_id);
CREATE INDEX IF NOT EXISTS idx_leveling_suggestions_project ON schedule_leveling_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_leveling_suggestions_resource ON schedule_leveling_suggestions(resource_id);
CREATE INDEX IF NOT EXISTS idx_leveling_suggestions_status ON schedule_leveling_suggestions(status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE schedule_resource_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_resource_daily_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_leveling_suggestions ENABLE ROW LEVEL SECURITY;

-- Resource Capacity policies
CREATE POLICY "Users can view resource capacity for their company resources" ON schedule_resource_capacity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM schedule_resources sr
            JOIN company_users cu ON cu.company_id = sr.company_id
            WHERE sr.id = schedule_resource_capacity.resource_id
              AND cu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage resource capacity for their company" ON schedule_resource_capacity
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schedule_resources sr
            JOIN company_users cu ON cu.company_id = sr.company_id
            WHERE sr.id = schedule_resource_capacity.resource_id
              AND cu.user_id = auth.uid()
              AND cu.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- Daily Allocation policies
CREATE POLICY "Users can view daily allocations for their projects" ON schedule_resource_daily_allocation
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_resource_daily_allocation.project_id
              AND cu.user_id = auth.uid()
        )
    );

-- Leveling Suggestions policies
CREATE POLICY "Users can view leveling suggestions for their projects" ON schedule_leveling_suggestions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_leveling_suggestions.project_id
              AND cu.user_id = auth.uid()
        )
    );

CREATE POLICY "Project managers can manage leveling suggestions" ON schedule_leveling_suggestions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_leveling_suggestions.project_id
              AND cu.user_id = auth.uid()
              AND cu.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_resource_capacity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_resource_capacity_updated
    BEFORE UPDATE ON schedule_resource_capacity
    FOR EACH ROW EXECUTE FUNCTION update_resource_capacity_timestamp();

CREATE TRIGGER trigger_daily_allocation_updated
    BEFORE UPDATE ON schedule_resource_daily_allocation
    FOR EACH ROW EXECUTE FUNCTION update_resource_capacity_timestamp();
