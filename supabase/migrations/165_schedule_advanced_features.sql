-- ============================================================================
-- Migration 165: Advanced Schedule Features
-- Adds constraint types, enhanced predecessor relationships, baseline versioning,
-- and earned value tracking support
-- ============================================================================

-- ============================================================================
-- DEPENDENCY ENHANCEMENTS
-- ============================================================================

-- Add dependency type and lag columns to schedule_dependencies if they don't exist
DO $$
BEGIN
    -- Add dependency_type column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_dependencies' AND column_name = 'dependency_type') THEN
        ALTER TABLE schedule_dependencies ADD COLUMN dependency_type VARCHAR(2) DEFAULT 'FS'
            CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF'));
    END IF;

    -- Add lag_value column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_dependencies' AND column_name = 'lag_value') THEN
        ALTER TABLE schedule_dependencies ADD COLUMN lag_value DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add lag_unit column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_dependencies' AND column_name = 'lag_unit') THEN
        ALTER TABLE schedule_dependencies ADD COLUMN lag_unit VARCHAR(10) DEFAULT 'days'
            CHECK (lag_unit IN ('days', 'hours', 'percent'));
    END IF;

    -- Add is_driving column to track driving relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_dependencies' AND column_name = 'is_driving') THEN
        ALTER TABLE schedule_dependencies ADD COLUMN is_driving BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

COMMENT ON COLUMN schedule_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';
COMMENT ON COLUMN schedule_dependencies.lag_value IS 'Lag time (positive) or lead time (negative)';
COMMENT ON COLUMN schedule_dependencies.lag_unit IS 'Unit for lag: days, hours, or percent of predecessor duration';
COMMENT ON COLUMN schedule_dependencies.is_driving IS 'Whether this is the driving dependency for the successor';

-- ============================================================================
-- CONSTRAINT TYPE ENHANCEMENTS
-- ============================================================================

-- Create constraint type enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_constraint_type') THEN
        CREATE TYPE schedule_constraint_type AS ENUM (
            'as_soon_as_possible',
            'as_late_as_possible',
            'must_start_on',
            'must_finish_on',
            'start_no_earlier_than',
            'start_no_later_than',
            'finish_no_earlier_than',
            'finish_no_later_than'
        );
    END IF;
END $$;

-- Add constraint columns to schedule_activities if they don't exist
DO $$
BEGIN
    -- Note: These may already exist from earlier migrations, so we check first
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities' AND column_name = 'constraint_type') THEN
        ALTER TABLE schedule_activities ADD COLUMN constraint_type VARCHAR(50) DEFAULT 'as_soon_as_possible';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities' AND column_name = 'constraint_date') THEN
        ALTER TABLE schedule_activities ADD COLUMN constraint_date DATE;
    END IF;

    -- Add early/late dates for CPM calculations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities' AND column_name = 'early_start') THEN
        ALTER TABLE schedule_activities ADD COLUMN early_start DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities' AND column_name = 'early_finish') THEN
        ALTER TABLE schedule_activities ADD COLUMN early_finish DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities' AND column_name = 'late_start') THEN
        ALTER TABLE schedule_activities ADD COLUMN late_start DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_activities' AND column_name = 'late_finish') THEN
        ALTER TABLE schedule_activities ADD COLUMN late_finish DATE;
    END IF;
END $$;

COMMENT ON COLUMN schedule_activities.constraint_type IS 'Schedule constraint: ASAP, ALAP, MSO, MFO, SNET, SNLT, FNET, FNLT';
COMMENT ON COLUMN schedule_activities.constraint_date IS 'Date associated with the constraint (for MSO, MFO, SNET, etc.)';
COMMENT ON COLUMN schedule_activities.early_start IS 'Earliest possible start date (CPM forward pass)';
COMMENT ON COLUMN schedule_activities.early_finish IS 'Earliest possible finish date (CPM forward pass)';
COMMENT ON COLUMN schedule_activities.late_start IS 'Latest possible start date (CPM backward pass)';
COMMENT ON COLUMN schedule_activities.late_finish IS 'Latest possible finish date (CPM backward pass)';

-- ============================================================================
-- ENHANCED BASELINES TABLE
-- ============================================================================

-- Add additional columns to schedule_baselines if they don't exist
DO $$
BEGIN
    -- Add baseline number for versioning
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'baseline_number') THEN
        ALTER TABLE schedule_baselines ADD COLUMN baseline_number INTEGER DEFAULT 1;
    END IF;

    -- Add total budget for earned value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'total_budget') THEN
        ALTER TABLE schedule_baselines ADD COLUMN total_budget DECIMAL(15,2);
    END IF;

    -- Add total labor hours
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'total_labor_hours') THEN
        ALTER TABLE schedule_baselines ADD COLUMN total_labor_hours DECIMAL(10,2);
    END IF;

    -- Add total activities count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'total_activities') THEN
        ALTER TABLE schedule_baselines ADD COLUMN total_activities INTEGER;
    END IF;

    -- Add critical path count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'critical_activities') THEN
        ALTER TABLE schedule_baselines ADD COLUMN critical_activities INTEGER;
    END IF;

    -- Add project duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'project_duration_days') THEN
        ALTER TABLE schedule_baselines ADD COLUMN project_duration_days INTEGER;
    END IF;

    -- Add planned start/finish
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'planned_start') THEN
        ALTER TABLE schedule_baselines ADD COLUMN planned_start DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'planned_finish') THEN
        ALTER TABLE schedule_baselines ADD COLUMN planned_finish DATE;
    END IF;

    -- Add notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'schedule_baselines' AND column_name = 'notes') THEN
        ALTER TABLE schedule_baselines ADD COLUMN notes TEXT;
    END IF;
END $$;

-- ============================================================================
-- EARNED VALUE TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_earned_value_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    baseline_id UUID REFERENCES schedule_baselines(id) ON DELETE SET NULL,

    -- Snapshot date
    data_date DATE NOT NULL,
    snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Budget at Completion (BAC)
    bac DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Planned Value (BCWS)
    pv DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Earned Value (BCWP)
    ev DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Actual Cost (ACWP)
    ac DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Variances (calculated but stored for historical tracking)
    sv DECIMAL(15,2) GENERATED ALWAYS AS (ev - pv) STORED,  -- Schedule Variance
    cv DECIMAL(15,2) GENERATED ALWAYS AS (ev - ac) STORED,  -- Cost Variance

    -- Performance Indices
    spi DECIMAL(6,4),  -- Schedule Performance Index (EV/PV)
    cpi DECIMAL(6,4),  -- Cost Performance Index (EV/AC)

    -- Forecasts
    eac DECIMAL(15,2),  -- Estimate at Completion
    etc DECIMAL(15,2),  -- Estimate to Complete
    vac DECIMAL(15,2),  -- Variance at Completion
    tcpi DECIMAL(6,4),  -- To-Complete Performance Index

    -- Progress metrics
    percent_complete DECIMAL(5,2) DEFAULT 0,
    percent_scheduled DECIMAL(5,2) DEFAULT 0,

    -- Activity counts
    activities_complete INTEGER DEFAULT 0,
    activities_in_progress INTEGER DEFAULT 0,
    activities_not_started INTEGER DEFAULT 0,

    -- Created by
    created_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_project_data_date UNIQUE (project_id, data_date)
);

COMMENT ON TABLE schedule_earned_value_snapshots IS 'Point-in-time earned value metrics for trend analysis';
COMMENT ON COLUMN schedule_earned_value_snapshots.bac IS 'Budget at Completion - total baseline budget';
COMMENT ON COLUMN schedule_earned_value_snapshots.pv IS 'Planned Value (BCWS) - budgeted cost of work scheduled';
COMMENT ON COLUMN schedule_earned_value_snapshots.ev IS 'Earned Value (BCWP) - budgeted cost of work performed';
COMMENT ON COLUMN schedule_earned_value_snapshots.ac IS 'Actual Cost (ACWP) - actual cost of work performed';
COMMENT ON COLUMN schedule_earned_value_snapshots.spi IS 'Schedule Performance Index (EV/PV) - <1 behind, >1 ahead';
COMMENT ON COLUMN schedule_earned_value_snapshots.cpi IS 'Cost Performance Index (EV/AC) - <1 over budget, >1 under';

-- ============================================================================
-- SCHEDULE NARRATIVE CHANGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_narrative_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Change tracking
    change_date DATE NOT NULL,
    change_type VARCHAR(50) NOT NULL,  -- 'critical_path', 'delay', 'acceleration', 'scope_change', 'logic_change'
    severity VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'

    -- Affected activities
    activity_id UUID REFERENCES schedule_activities(id) ON DELETE SET NULL,
    activity_name TEXT,

    -- Change details
    previous_value TEXT,
    new_value TEXT,
    variance_days INTEGER,

    -- Impact analysis
    impacts_critical_path BOOLEAN DEFAULT FALSE,
    impacts_milestones BOOLEAN DEFAULT FALSE,
    project_delay_days INTEGER DEFAULT 0,

    -- Description
    description TEXT NOT NULL,
    cause TEXT,
    mitigation TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE schedule_narrative_changes IS 'Tracked changes for schedule narrative generation';

-- ============================================================================
-- SCHEDULE COMPARISON TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Comparison baselines
    baseline_from_id UUID REFERENCES schedule_baselines(id) ON DELETE SET NULL,
    baseline_to_id UUID REFERENCES schedule_baselines(id) ON DELETE SET NULL,

    -- Or comparison dates (for current vs baseline)
    compare_date DATE,

    -- Summary metrics
    activities_added INTEGER DEFAULT 0,
    activities_removed INTEGER DEFAULT 0,
    activities_modified INTEGER DEFAULT 0,

    -- Date changes
    total_start_variance_days INTEGER DEFAULT 0,
    total_finish_variance_days INTEGER DEFAULT 0,
    avg_start_variance_days DECIMAL(6,2) DEFAULT 0,
    avg_finish_variance_days DECIMAL(6,2) DEFAULT 0,

    -- Critical path changes
    critical_path_changed BOOLEAN DEFAULT FALSE,
    critical_activities_added INTEGER DEFAULT 0,
    critical_activities_removed INTEGER DEFAULT 0,

    -- Duration impact
    original_duration_days INTEGER,
    new_duration_days INTEGER,
    duration_variance_days INTEGER,

    -- Generated narrative
    narrative_summary TEXT,
    narrative_details JSONB,

    -- Metadata
    comparison_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE schedule_comparisons IS 'Schedule version comparisons for narrative generation';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ev_snapshots_project ON schedule_earned_value_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_ev_snapshots_data_date ON schedule_earned_value_snapshots(data_date);
CREATE INDEX IF NOT EXISTS idx_ev_snapshots_baseline ON schedule_earned_value_snapshots(baseline_id);

CREATE INDEX IF NOT EXISTS idx_narrative_changes_project ON schedule_narrative_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_narrative_changes_date ON schedule_narrative_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_narrative_changes_type ON schedule_narrative_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_narrative_changes_activity ON schedule_narrative_changes(activity_id);

CREATE INDEX IF NOT EXISTS idx_schedule_comparisons_project ON schedule_comparisons(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_comparisons_baselines ON schedule_comparisons(baseline_from_id, baseline_to_id);

-- Add indexes for constraint queries
CREATE INDEX IF NOT EXISTS idx_activities_constraint ON schedule_activities(constraint_type)
    WHERE constraint_type != 'as_soon_as_possible';
CREATE INDEX IF NOT EXISTS idx_activities_critical ON schedule_activities(is_on_critical_path)
    WHERE is_on_critical_path = TRUE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE schedule_earned_value_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_narrative_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_comparisons ENABLE ROW LEVEL SECURITY;

-- Earned Value Snapshots policies
CREATE POLICY "Users can view EV snapshots for their projects" ON schedule_earned_value_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_earned_value_snapshots.project_id
              AND cu.user_id = auth.uid()
        )
    );

CREATE POLICY "Project managers can manage EV snapshots" ON schedule_earned_value_snapshots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_earned_value_snapshots.project_id
              AND cu.user_id = auth.uid()
              AND cu.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- Narrative Changes policies
CREATE POLICY "Users can view narrative changes for their projects" ON schedule_narrative_changes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_narrative_changes.project_id
              AND cu.user_id = auth.uid()
        )
    );

CREATE POLICY "Project managers can manage narrative changes" ON schedule_narrative_changes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_narrative_changes.project_id
              AND cu.user_id = auth.uid()
              AND cu.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- Schedule Comparisons policies
CREATE POLICY "Users can view schedule comparisons for their projects" ON schedule_comparisons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_comparisons.project_id
              AND cu.user_id = auth.uid()
        )
    );

CREATE POLICY "Project managers can manage schedule comparisons" ON schedule_comparisons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN company_users cu ON cu.company_id = p.company_id
            WHERE p.id = schedule_comparisons.project_id
              AND cu.user_id = auth.uid()
              AND cu.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate and store EV snapshot
CREATE OR REPLACE FUNCTION calculate_earned_value_snapshot(
    p_project_id UUID,
    p_data_date DATE DEFAULT CURRENT_DATE,
    p_baseline_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snapshot_id UUID;
    v_bac DECIMAL(15,2);
    v_pv DECIMAL(15,2);
    v_ev DECIMAL(15,2);
    v_ac DECIMAL(15,2);
    v_spi DECIMAL(6,4);
    v_cpi DECIMAL(6,4);
    v_eac DECIMAL(15,2);
    v_etc DECIMAL(15,2);
    v_vac DECIMAL(15,2);
    v_tcpi DECIMAL(6,4);
    v_percent_complete DECIMAL(5,2);
    v_percent_scheduled DECIMAL(5,2);
    v_activities_complete INTEGER;
    v_activities_in_progress INTEGER;
    v_activities_not_started INTEGER;
BEGIN
    -- Calculate BAC (total baseline budget)
    SELECT COALESCE(SUM(budgeted_cost), 0) INTO v_bac
    FROM schedule_activities
    WHERE project_id = p_project_id AND deleted_at IS NULL;

    -- Calculate PV (planned value based on schedule)
    SELECT COALESCE(SUM(
        CASE
            WHEN planned_finish <= p_data_date THEN budgeted_cost
            WHEN planned_start <= p_data_date THEN
                budgeted_cost * LEAST(1.0,
                    (p_data_date - planned_start::date + 1.0) /
                    GREATEST(1, planned_finish::date - planned_start::date + 1.0))
            ELSE 0
        END
    ), 0) INTO v_pv
    FROM schedule_activities
    WHERE project_id = p_project_id AND deleted_at IS NULL;

    -- Calculate EV (earned value based on actual progress)
    SELECT COALESCE(SUM(budgeted_cost * percent_complete / 100.0), 0) INTO v_ev
    FROM schedule_activities
    WHERE project_id = p_project_id AND deleted_at IS NULL;

    -- Calculate AC (actual cost)
    SELECT COALESCE(SUM(actual_cost), 0) INTO v_ac
    FROM schedule_activities
    WHERE project_id = p_project_id AND deleted_at IS NULL;

    -- Calculate indices
    v_spi := CASE WHEN v_pv > 0 THEN v_ev / v_pv ELSE 1.0 END;
    v_cpi := CASE WHEN v_ac > 0 THEN v_ev / v_ac ELSE 1.0 END;

    -- Calculate forecasts
    v_eac := CASE WHEN v_cpi > 0 THEN v_bac / v_cpi ELSE v_bac END;
    v_etc := v_eac - v_ac;
    v_vac := v_bac - v_eac;
    v_tcpi := CASE WHEN (v_bac - v_ac) > 0 THEN (v_bac - v_ev) / (v_bac - v_ac) ELSE 1.0 END;

    -- Calculate percentages
    v_percent_complete := CASE WHEN v_bac > 0 THEN (v_ev / v_bac) * 100 ELSE 0 END;
    v_percent_scheduled := CASE WHEN v_bac > 0 THEN (v_pv / v_bac) * 100 ELSE 0 END;

    -- Count activities by status
    SELECT
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'in_progress'),
        COUNT(*) FILTER (WHERE status = 'not_started')
    INTO v_activities_complete, v_activities_in_progress, v_activities_not_started
    FROM schedule_activities
    WHERE project_id = p_project_id AND deleted_at IS NULL;

    -- Insert or update snapshot
    INSERT INTO schedule_earned_value_snapshots (
        project_id, baseline_id, data_date,
        bac, pv, ev, ac,
        spi, cpi, eac, etc, vac, tcpi,
        percent_complete, percent_scheduled,
        activities_complete, activities_in_progress, activities_not_started,
        created_by
    ) VALUES (
        p_project_id, p_baseline_id, p_data_date,
        v_bac, v_pv, v_ev, v_ac,
        v_spi, v_cpi, v_eac, v_etc, v_vac, v_tcpi,
        v_percent_complete, v_percent_scheduled,
        v_activities_complete, v_activities_in_progress, v_activities_not_started,
        auth.uid()
    )
    ON CONFLICT (project_id, data_date) DO UPDATE SET
        baseline_id = EXCLUDED.baseline_id,
        bac = EXCLUDED.bac,
        pv = EXCLUDED.pv,
        ev = EXCLUDED.ev,
        ac = EXCLUDED.ac,
        spi = EXCLUDED.spi,
        cpi = EXCLUDED.cpi,
        eac = EXCLUDED.eac,
        etc = EXCLUDED.etc,
        vac = EXCLUDED.vac,
        tcpi = EXCLUDED.tcpi,
        percent_complete = EXCLUDED.percent_complete,
        percent_scheduled = EXCLUDED.percent_scheduled,
        activities_complete = EXCLUDED.activities_complete,
        activities_in_progress = EXCLUDED.activities_in_progress,
        activities_not_started = EXCLUDED.activities_not_started,
        snapshot_date = NOW()
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$;

-- Function to detect and log schedule changes
CREATE OR REPLACE FUNCTION track_schedule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_change_type VARCHAR(50);
    v_description TEXT;
    v_variance INTEGER;
BEGIN
    -- Determine change type and create narrative entry
    IF TG_OP = 'UPDATE' THEN
        -- Check for date changes
        IF OLD.planned_finish IS DISTINCT FROM NEW.planned_finish THEN
            v_variance := NEW.planned_finish::date - OLD.planned_finish::date;
            v_change_type := CASE WHEN v_variance > 0 THEN 'delay' ELSE 'acceleration' END;
            v_description := format('Activity "%s" %s by %s days (from %s to %s)',
                NEW.name,
                CASE WHEN v_variance > 0 THEN 'delayed' ELSE 'accelerated' END,
                ABS(v_variance),
                to_char(OLD.planned_finish, 'Mon DD, YYYY'),
                to_char(NEW.planned_finish, 'Mon DD, YYYY')
            );

            INSERT INTO schedule_narrative_changes (
                project_id, change_date, change_type,
                activity_id, activity_name,
                previous_value, new_value, variance_days,
                impacts_critical_path, description, created_by
            ) VALUES (
                NEW.project_id, CURRENT_DATE, v_change_type,
                NEW.id, NEW.name,
                to_char(OLD.planned_finish, 'YYYY-MM-DD'),
                to_char(NEW.planned_finish, 'YYYY-MM-DD'),
                v_variance,
                COALESCE(NEW.is_on_critical_path, FALSE),
                v_description,
                auth.uid()
            );
        END IF;

        -- Check for critical path changes
        IF OLD.is_on_critical_path IS DISTINCT FROM NEW.is_on_critical_path THEN
            v_change_type := 'critical_path';
            v_description := format('Activity "%s" %s the critical path',
                NEW.name,
                CASE WHEN NEW.is_on_critical_path THEN 'added to' ELSE 'removed from' END
            );

            INSERT INTO schedule_narrative_changes (
                project_id, change_date, change_type,
                activity_id, activity_name,
                previous_value, new_value,
                impacts_critical_path, description, created_by
            ) VALUES (
                NEW.project_id, CURRENT_DATE, v_change_type,
                NEW.id, NEW.name,
                CASE WHEN OLD.is_on_critical_path THEN 'critical' ELSE 'non-critical' END,
                CASE WHEN NEW.is_on_critical_path THEN 'critical' ELSE 'non-critical' END,
                TRUE,
                v_description,
                auth.uid()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for tracking schedule changes
DROP TRIGGER IF EXISTS trigger_track_schedule_changes ON schedule_activities;
CREATE TRIGGER trigger_track_schedule_changes
    AFTER UPDATE ON schedule_activities
    FOR EACH ROW
    WHEN (
        OLD.planned_start IS DISTINCT FROM NEW.planned_start OR
        OLD.planned_finish IS DISTINCT FROM NEW.planned_finish OR
        OLD.is_on_critical_path IS DISTINCT FROM NEW.is_on_critical_path
    )
    EXECUTE FUNCTION track_schedule_change();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for activities with full scheduling details
CREATE OR REPLACE VIEW schedule_activities_full AS
SELECT
    sa.*,
    -- Calculate total float
    CASE
        WHEN sa.late_finish IS NOT NULL AND sa.early_finish IS NOT NULL
        THEN sa.late_finish - sa.early_finish
        ELSE NULL
    END AS calculated_float,
    -- Variance from baseline
    CASE
        WHEN sa.baseline_finish IS NOT NULL
        THEN sa.planned_finish::date - sa.baseline_finish::date
        ELSE NULL
    END AS finish_variance_days,
    -- Status indicators
    CASE
        WHEN sa.status = 'completed' THEN 'completed'
        WHEN sa.planned_finish < CURRENT_DATE AND sa.status != 'completed' THEN 'overdue'
        WHEN sa.planned_start <= CURRENT_DATE AND sa.status = 'not_started' THEN 'should_have_started'
        WHEN sa.is_on_critical_path THEN 'critical'
        ELSE 'on_track'
    END AS schedule_status,
    -- Dependency info
    (SELECT COUNT(*) FROM schedule_dependencies sd WHERE sd.successor_id = sa.id) AS predecessor_count,
    (SELECT COUNT(*) FROM schedule_dependencies sd WHERE sd.predecessor_id = sa.id) AS successor_count
FROM schedule_activities sa
WHERE sa.deleted_at IS NULL;

-- Grant access to view
GRANT SELECT ON schedule_activities_full TO authenticated;

-- View for earned value trends
CREATE OR REPLACE VIEW earned_value_trends AS
SELECT
    evs.*,
    -- Period-over-period changes
    evs.spi - LAG(evs.spi) OVER (PARTITION BY evs.project_id ORDER BY evs.data_date) AS spi_change,
    evs.cpi - LAG(evs.cpi) OVER (PARTITION BY evs.project_id ORDER BY evs.data_date) AS cpi_change,
    evs.percent_complete - LAG(evs.percent_complete) OVER (PARTITION BY evs.project_id ORDER BY evs.data_date) AS progress_change,
    -- Trend direction
    CASE
        WHEN evs.spi > LAG(evs.spi) OVER (PARTITION BY evs.project_id ORDER BY evs.data_date) THEN 'improving'
        WHEN evs.spi < LAG(evs.spi) OVER (PARTITION BY evs.project_id ORDER BY evs.data_date) THEN 'declining'
        ELSE 'stable'
    END AS spi_trend,
    CASE
        WHEN evs.cpi > LAG(evs.cpi) OVER (PARTITION BY evs.project_id ORDER BY evs.data_date) THEN 'improving'
        WHEN evs.cpi < LAG(evs.cpi) OVER (PARTITION BY evs.project_id ORDER BY evs.data_date) THEN 'declining'
        ELSE 'stable'
    END AS cpi_trend
FROM schedule_earned_value_snapshots evs
ORDER BY evs.project_id, evs.data_date;

GRANT SELECT ON earned_value_trends TO authenticated;

-- ============================================================================
-- SEED DATA FOR CONSTRAINT TYPES (if needed)
-- ============================================================================

-- No seed data needed, constraint types are handled via CHECK constraints
