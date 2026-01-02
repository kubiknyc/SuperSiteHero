-- Migration: Resource Assignments and Earned Value Enhancements
-- Description: Adds resource assignments table, earned value tracking fields,
--              and schedule leveling support for construction schedules.

-- ============================================================================
-- RESOURCE ASSIGNMENTS TABLE
-- ============================================================================

-- Check if table already exists (from migration 092)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'schedule_resource_assignments') THEN

        CREATE TABLE schedule_resource_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            activity_id UUID NOT NULL REFERENCES schedule_activities(id) ON DELETE CASCADE,
            resource_id UUID NOT NULL REFERENCES schedule_resources(id) ON DELETE CASCADE,

            -- Assignment details
            units DECIMAL(10,2) DEFAULT 1.0,
            planned_work_hours DECIMAL(10,2),
            actual_work_hours DECIMAL(10,2) DEFAULT 0,
            remaining_work_hours DECIMAL(10,2),

            -- Assignment dates (can differ from activity dates)
            start_date DATE,
            finish_date DATE,

            -- Cost tracking
            planned_cost DECIMAL(14,2),
            actual_cost DECIMAL(14,2) DEFAULT 0,
            remaining_cost DECIMAL(14,2),

            -- Leveling
            is_driving BOOLEAN DEFAULT false,
            delay_allowed BOOLEAN DEFAULT true,
            leveling_delay_days INTEGER DEFAULT 0,

            -- Timestamps
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id)
        );

        -- Add indexes
        CREATE INDEX idx_resource_assignments_activity ON schedule_resource_assignments(activity_id);
        CREATE INDEX idx_resource_assignments_resource ON schedule_resource_assignments(resource_id);
        CREATE INDEX idx_resource_assignments_dates ON schedule_resource_assignments(start_date, finish_date);

        -- Unique constraint: one resource assignment per activity-resource pair
        CREATE UNIQUE INDEX idx_resource_assignments_unique
            ON schedule_resource_assignments(activity_id, resource_id);

        RAISE NOTICE 'Created schedule_resource_assignments table';
    ELSE
        RAISE NOTICE 'schedule_resource_assignments table already exists';
    END IF;
END $$;

-- ============================================================================
-- ADD EARNED VALUE FIELDS TO ACTIVITIES (if not present)
-- ============================================================================

DO $$
BEGIN
    -- Earned Value fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities'
                   AND column_name = 'earned_value') THEN
        ALTER TABLE schedule_activities ADD COLUMN earned_value DECIMAL(14,2);
        RAISE NOTICE 'Added earned_value column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities'
                   AND column_name = 'budgeted_labor_hours') THEN
        ALTER TABLE schedule_activities ADD COLUMN budgeted_labor_hours DECIMAL(10,2);
        RAISE NOTICE 'Added budgeted_labor_hours column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities'
                   AND column_name = 'actual_labor_hours') THEN
        ALTER TABLE schedule_activities ADD COLUMN actual_labor_hours DECIMAL(10,2);
        RAISE NOTICE 'Added actual_labor_hours column';
    END IF;

    -- Resource leveling fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities'
                   AND column_name = 'leveling_can_split') THEN
        ALTER TABLE schedule_activities ADD COLUMN leveling_can_split BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added leveling_can_split column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities'
                   AND column_name = 'leveling_delay_days') THEN
        ALTER TABLE schedule_activities ADD COLUMN leveling_delay_days INTEGER DEFAULT 0;
        RAISE NOTICE 'Added leveling_delay_days column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities'
                   AND column_name = 'leveled_start') THEN
        ALTER TABLE schedule_activities ADD COLUMN leveled_start DATE;
        RAISE NOTICE 'Added leveled_start column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities'
                   AND column_name = 'leveled_finish') THEN
        ALTER TABLE schedule_activities ADD COLUMN leveled_finish DATE;
        RAISE NOTICE 'Added leveled_finish column';
    END IF;
END $$;

-- ============================================================================
-- SCHEDULE EARNED VALUE SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_ev_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    data_date DATE NOT NULL,

    -- Core EV metrics
    bac DECIMAL(14,2) NOT NULL, -- Budget at Completion
    pv DECIMAL(14,2) NOT NULL,  -- Planned Value
    ev DECIMAL(14,2) NOT NULL,  -- Earned Value
    ac DECIMAL(14,2) NOT NULL,  -- Actual Cost

    -- Calculated metrics (stored for historical tracking)
    sv DECIMAL(14,2),  -- Schedule Variance
    cv DECIMAL(14,2),  -- Cost Variance
    spi DECIMAL(6,3),  -- Schedule Performance Index
    cpi DECIMAL(6,3),  -- Cost Performance Index

    -- Forecasts
    eac DECIMAL(14,2), -- Estimate at Completion
    etc DECIMAL(14,2), -- Estimate to Complete
    vac DECIMAL(14,2), -- Variance at Completion
    tcpi DECIMAL(6,3), -- To-Complete Performance Index

    -- Progress
    percent_complete DECIMAL(5,2),
    activities_complete INTEGER,
    activities_in_progress INTEGER,
    activities_not_started INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ev_snapshots_project_date
    ON schedule_ev_snapshots(project_id, snapshot_date DESC);

-- ============================================================================
-- SCHEDULE NARRATIVE HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_narratives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    data_date DATE NOT NULL,
    report_period_start DATE,
    report_period_end DATE,

    -- Content
    executive_summary TEXT,
    narrative_content JSONB, -- Stores full structured narrative

    -- Status
    overall_status VARCHAR(20), -- on_track, at_risk, behind, ahead
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),

    -- Metrics snapshot
    metrics JSONB,

    -- Export history
    last_exported_at TIMESTAMPTZ,
    last_exported_format VARCHAR(10), -- pdf, docx, txt

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_narratives_project_date
    ON schedule_narratives(project_id, report_date DESC);

-- ============================================================================
-- RESOURCE LEVELING SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_leveling_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Session info
    session_name VARCHAR(100),
    session_date TIMESTAMPTZ DEFAULT NOW(),

    -- Settings used
    settings JSONB NOT NULL,

    -- Results
    conflicts_before INTEGER,
    conflicts_after INTEGER,
    activities_adjusted INTEGER,
    total_delay_days INTEGER,

    -- Changes made
    changes JSONB, -- Array of {activity_id, old_start, new_start, old_finish, new_finish}

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, applied, reverted
    applied_at TIMESTAMPTZ,
    reverted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_leveling_sessions_project
    ON schedule_leveling_sessions(project_id, session_date DESC);

-- ============================================================================
-- P6 IMPORT FIELD MAPPINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_import_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Mapping info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    source_system VARCHAR(50) NOT NULL, -- primavera_p6, ms_project

    -- Field mappings
    field_mappings JSONB NOT NULL,
    import_options JSONB NOT NULL,

    -- Usage
    is_default BOOLEAN DEFAULT false,
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Unique default per company/source
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_mappings_default
    ON schedule_import_mappings(company_id, source_system)
    WHERE is_default = true;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate EV metrics for a project
CREATE OR REPLACE FUNCTION calculate_project_ev_metrics(p_project_id UUID, p_data_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    bac DECIMAL,
    pv DECIMAL,
    ev DECIMAL,
    ac DECIMAL,
    sv DECIMAL,
    cv DECIMAL,
    spi DECIMAL,
    cpi DECIMAL,
    eac DECIMAL,
    etc DECIMAL,
    vac DECIMAL,
    tcpi DECIMAL,
    percent_complete DECIMAL
) AS $$
DECLARE
    v_bac DECIMAL := 0;
    v_pv DECIMAL := 0;
    v_ev DECIMAL := 0;
    v_ac DECIMAL := 0;
BEGIN
    -- Calculate BAC, EV, AC from activities
    SELECT
        COALESCE(SUM(budgeted_cost), 0),
        COALESCE(SUM(CASE
            WHEN planned_finish <= p_data_date THEN budgeted_cost
            WHEN planned_start <= p_data_date AND planned_finish > p_data_date THEN
                budgeted_cost * LEAST(1,
                    EXTRACT(DAY FROM (p_data_date - planned_start::date) + 1)::DECIMAL /
                    NULLIF(EXTRACT(DAY FROM (planned_finish::date - planned_start::date) + 1)::DECIMAL, 0)
                )
            ELSE 0
        END), 0),
        COALESCE(SUM(budgeted_cost * percent_complete / 100), 0),
        COALESCE(SUM(actual_cost), 0)
    INTO v_bac, v_pv, v_ev, v_ac
    FROM schedule_activities
    WHERE project_id = p_project_id
    AND deleted_at IS NULL;

    RETURN QUERY
    SELECT
        v_bac,
        v_pv,
        v_ev,
        v_ac,
        v_ev - v_pv, -- SV
        v_ev - v_ac, -- CV
        CASE WHEN v_pv > 0 THEN v_ev / v_pv ELSE 1 END, -- SPI
        CASE WHEN v_ac > 0 THEN v_ev / v_ac ELSE 1 END, -- CPI
        CASE WHEN v_ac > 0 AND v_ev > 0 THEN v_bac / (v_ev / v_ac) ELSE v_bac END, -- EAC
        CASE WHEN v_ac > 0 AND v_ev > 0 THEN (v_bac / (v_ev / v_ac)) - v_ac ELSE v_bac - v_ac END, -- ETC
        v_bac - CASE WHEN v_ac > 0 AND v_ev > 0 THEN v_bac / (v_ev / v_ac) ELSE v_bac END, -- VAC
        CASE WHEN (v_bac - v_ac) > 0 THEN (v_bac - v_ev) / (v_bac - v_ac) ELSE 1 END, -- TCPI
        CASE WHEN v_bac > 0 THEN (v_ev / v_bac) * 100 ELSE 0 END; -- percent_complete
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to detect resource conflicts
CREATE OR REPLACE FUNCTION detect_resource_conflicts(
    p_project_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    conflict_date DATE,
    resource_id UUID,
    resource_name VARCHAR,
    total_demand DECIMAL,
    capacity DECIMAL,
    affected_activities UUID[]
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS d
    ),
    daily_allocations AS (
        SELECT
            ds.d,
            sra.resource_id,
            sr.name AS resource_name,
            sr.max_units * 8 AS capacity, -- Assuming 8 hours per unit
            SUM(sra.planned_work_hours / NULLIF(
                EXTRACT(DAY FROM (sa.planned_finish::date - sa.planned_start::date) + 1), 0
            )) AS daily_hours,
            ARRAY_AGG(sa.id) AS activity_ids
        FROM date_series ds
        CROSS JOIN schedule_resources sr
        LEFT JOIN schedule_resource_assignments sra ON sr.id = sra.resource_id
        LEFT JOIN schedule_activities sa ON sra.activity_id = sa.id
        WHERE sr.project_id = p_project_id OR sr.project_id IS NULL
        AND (sa.project_id = p_project_id OR sa.id IS NULL)
        AND (ds.d BETWEEN sa.planned_start::date AND sa.planned_finish::date OR sa.id IS NULL)
        AND (sa.deleted_at IS NULL OR sa.id IS NULL)
        GROUP BY ds.d, sra.resource_id, sr.name, sr.max_units
    )
    SELECT
        da.d,
        da.resource_id,
        da.resource_name,
        da.daily_hours,
        da.capacity,
        da.activity_ids
    FROM daily_allocations da
    WHERE da.daily_hours > da.capacity;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE schedule_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_ev_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_leveling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_import_mappings ENABLE ROW LEVEL SECURITY;

-- Resource Assignments policies
CREATE POLICY "resource_assignments_select" ON schedule_resource_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM schedule_activities sa
            JOIN projects p ON sa.project_id = p.id
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE sa.id = schedule_resource_assignments.activity_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "resource_assignments_insert" ON schedule_resource_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM schedule_activities sa
            JOIN projects p ON sa.project_id = p.id
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE sa.id = schedule_resource_assignments.activity_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'project_manager')
        )
    );

CREATE POLICY "resource_assignments_update" ON schedule_resource_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM schedule_activities sa
            JOIN projects p ON sa.project_id = p.id
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE sa.id = schedule_resource_assignments.activity_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'project_manager')
        )
    );

CREATE POLICY "resource_assignments_delete" ON schedule_resource_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM schedule_activities sa
            JOIN projects p ON sa.project_id = p.id
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE sa.id = schedule_resource_assignments.activity_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- EV Snapshots policies
CREATE POLICY "ev_snapshots_select" ON schedule_ev_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_ev_snapshots.project_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "ev_snapshots_insert" ON schedule_ev_snapshots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_ev_snapshots.project_id
            AND cm.user_id = auth.uid()
        )
    );

-- Narratives policies
CREATE POLICY "narratives_select" ON schedule_narratives
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_narratives.project_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "narratives_insert" ON schedule_narratives
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_narratives.project_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "narratives_update" ON schedule_narratives
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_narratives.project_id
            AND cm.user_id = auth.uid()
        )
    );

-- Leveling Sessions policies
CREATE POLICY "leveling_sessions_select" ON schedule_leveling_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_leveling_sessions.project_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "leveling_sessions_insert" ON schedule_leveling_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_leveling_sessions.project_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'project_manager')
        )
    );

CREATE POLICY "leveling_sessions_update" ON schedule_leveling_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_members cm ON p.company_id = cm.company_id
            WHERE p.id = schedule_leveling_sessions.project_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- Import Mappings policies
CREATE POLICY "import_mappings_select" ON schedule_import_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM company_members cm
            WHERE cm.company_id = schedule_import_mappings.company_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "import_mappings_insert" ON schedule_import_mappings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_members cm
            WHERE cm.company_id = schedule_import_mappings.company_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "import_mappings_update" ON schedule_import_mappings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM company_members cm
            WHERE cm.company_id = schedule_import_mappings.company_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "import_mappings_delete" ON schedule_import_mappings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM company_members cm
            WHERE cm.company_id = schedule_import_mappings.company_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for resource assignments
CREATE OR REPLACE FUNCTION update_resource_assignment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resource_assignment_updated ON schedule_resource_assignments;
CREATE TRIGGER resource_assignment_updated
    BEFORE UPDATE ON schedule_resource_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_assignment_timestamp();

-- Update timestamp trigger for narratives
DROP TRIGGER IF EXISTS narrative_updated ON schedule_narratives;
CREATE TRIGGER narrative_updated
    BEFORE UPDATE ON schedule_narratives
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_assignment_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE schedule_resource_assignments IS 'Resource assignments linking activities to resources with work hours and costs';
COMMENT ON TABLE schedule_ev_snapshots IS 'Historical snapshots of Earned Value metrics for trend analysis';
COMMENT ON TABLE schedule_narratives IS 'Auto-generated and saved schedule narrative reports';
COMMENT ON TABLE schedule_leveling_sessions IS 'Record of resource leveling sessions and their results';
COMMENT ON TABLE schedule_import_mappings IS 'Saved field mapping configurations for P6/MSP imports';

COMMENT ON FUNCTION calculate_project_ev_metrics IS 'Calculates all Earned Value metrics for a project as of a given date';
COMMENT ON FUNCTION detect_resource_conflicts IS 'Detects resource over-allocation conflicts within a date range';
