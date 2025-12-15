-- Migration: 115_near_miss_analytics.sql
-- Near-Miss Trend Analysis Schema
--
-- This migration creates tables and views for analyzing near-miss incident patterns
-- to proactively identify safety risks before they become actual incidents.

-- ============================================================================
-- Near-Miss Analytics Configuration
-- ============================================================================

-- Table to store near-miss category definitions for consistent classification
CREATE TABLE IF NOT EXISTS near_miss_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES near_miss_categories(id),
    color TEXT DEFAULT '#6b7280',
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Table for near-miss location zones (for heat map analysis)
CREATE TABLE IF NOT EXISTS near_miss_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    zone_type TEXT CHECK (zone_type IN ('floor', 'area', 'equipment', 'entrance', 'staging', 'other')),
    floor_number INTEGER,
    coordinates JSONB, -- For future heat map overlay on drawings
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Table for industry benchmark data
CREATE TABLE IF NOT EXISTS safety_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10, 4),
    measurement_period TEXT CHECK (measurement_period IN ('monthly', 'quarterly', 'yearly')),
    source TEXT,
    year INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(industry_type, metric_name, year)
);

-- Table for tracking alert thresholds
CREATE TABLE IF NOT EXISTS near_miss_alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for company-wide
    threshold_type TEXT NOT NULL CHECK (threshold_type IN (
        'frequency_daily',
        'frequency_weekly',
        'frequency_monthly',
        'category_spike',
        'location_concentration',
        'root_cause_recurring',
        'time_pattern'
    )),
    threshold_value INTEGER NOT NULL,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'warning',
    is_active BOOLEAN DEFAULT true,
    notification_emails TEXT[], -- Additional emails to notify
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing detected patterns and insights
CREATE TABLE IF NOT EXISTS near_miss_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN (
        'recurring_location',
        'time_based',
        'root_cause_cluster',
        'category_trend',
        'seasonal',
        'crew_correlation',
        'weather_correlation',
        'equipment_related'
    )),
    pattern_data JSONB NOT NULL, -- Stores pattern details
    confidence_score DECIMAL(5, 4), -- 0.0000 to 1.0000
    detection_date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved', 'dismissed')) DEFAULT 'new',
    assigned_to UUID REFERENCES users(id),
    notes TEXT,
    action_items JSONB, -- Linked action items
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for generated alerts
CREATE TABLE IF NOT EXISTS near_miss_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES near_miss_patterns(id) ON DELETE SET NULL,
    threshold_id UUID REFERENCES near_miss_alert_thresholds(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'warning',
    title TEXT NOT NULL,
    description TEXT,
    data JSONB, -- Additional context data
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_by UUID REFERENCES users(id),
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for monthly trend report snapshots
CREATE TABLE IF NOT EXISTS near_miss_monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    report_month DATE NOT NULL, -- First day of the month
    total_near_misses INTEGER DEFAULT 0,
    by_category JSONB DEFAULT '{}',
    by_location JSONB DEFAULT '{}',
    by_root_cause JSONB DEFAULT '{}',
    by_severity_potential JSONB DEFAULT '{}',
    by_time_of_day JSONB DEFAULT '{}',
    by_day_of_week JSONB DEFAULT '{}',
    leading_indicators JSONB DEFAULT '{}',
    trends JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),
    UNIQUE(company_id, project_id, report_month)
);

-- ============================================================================
-- Add near-miss specific fields to safety_incidents if not exists
-- ============================================================================

-- Add potential severity for near-misses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'safety_incidents' AND column_name = 'potential_severity'
    ) THEN
        ALTER TABLE safety_incidents
        ADD COLUMN potential_severity TEXT CHECK (potential_severity IN (
            'first_aid', 'medical_treatment', 'lost_time', 'fatality'
        ));
    END IF;
END $$;

-- Add near-miss category reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'safety_incidents' AND column_name = 'near_miss_category_id'
    ) THEN
        ALTER TABLE safety_incidents
        ADD COLUMN near_miss_category_id UUID REFERENCES near_miss_categories(id);
    END IF;
END $$;

-- Add zone reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'safety_incidents' AND column_name = 'zone_id'
    ) THEN
        ALTER TABLE safety_incidents
        ADD COLUMN zone_id UUID REFERENCES near_miss_zones(id);
    END IF;
END $$;

-- Add time of incident for pattern analysis
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'safety_incidents' AND column_name = 'hour_of_day'
    ) THEN
        ALTER TABLE safety_incidents
        ADD COLUMN hour_of_day INTEGER GENERATED ALWAYS AS (
            CASE
                WHEN incident_time IS NOT NULL
                THEN EXTRACT(HOUR FROM incident_time::TIME)
                ELSE NULL
            END
        ) STORED;
    END IF;
END $$;

-- Add day of week for pattern analysis
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'safety_incidents' AND column_name = 'day_of_week'
    ) THEN
        ALTER TABLE safety_incidents
        ADD COLUMN day_of_week INTEGER GENERATED ALWAYS AS (
            EXTRACT(DOW FROM incident_date::DATE)
        ) STORED;
    END IF;
END $$;

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- View for near-miss trend analysis
CREATE OR REPLACE VIEW near_miss_daily_trends AS
SELECT
    company_id,
    project_id,
    incident_date,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE potential_severity = 'fatality') as fatality_potential_count,
    COUNT(*) FILTER (WHERE potential_severity = 'lost_time') as lost_time_potential_count,
    COUNT(*) FILTER (WHERE potential_severity = 'medical_treatment') as medical_treatment_potential_count,
    COUNT(*) FILTER (WHERE potential_severity = 'first_aid') as first_aid_potential_count,
    jsonb_object_agg(
        COALESCE(root_cause_category::text, 'unknown'),
        root_cause_count
    ) FILTER (WHERE root_cause_category IS NOT NULL) as by_root_cause
FROM (
    SELECT
        company_id,
        project_id,
        incident_date,
        potential_severity,
        root_cause_category,
        COUNT(*) as root_cause_count
    FROM safety_incidents
    WHERE severity = 'near_miss'
      AND deleted_at IS NULL
    GROUP BY company_id, project_id, incident_date, potential_severity, root_cause_category
) sub
GROUP BY company_id, project_id, incident_date
ORDER BY incident_date DESC;

-- View for location-based heat map data
CREATE OR REPLACE VIEW near_miss_location_heatmap AS
SELECT
    si.company_id,
    si.project_id,
    COALESCE(si.location, 'Unknown') as location,
    si.zone_id,
    nmz.name as zone_name,
    nmz.zone_type,
    nmz.floor_number,
    COUNT(*) as incident_count,
    COUNT(*) FILTER (WHERE si.potential_severity IN ('lost_time', 'fatality')) as high_severity_count,
    MAX(si.incident_date) as last_incident_date,
    jsonb_agg(DISTINCT si.root_cause_category) FILTER (WHERE si.root_cause_category IS NOT NULL) as root_causes
FROM safety_incidents si
LEFT JOIN near_miss_zones nmz ON si.zone_id = nmz.id
WHERE si.severity = 'near_miss'
  AND si.deleted_at IS NULL
  AND si.incident_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY si.company_id, si.project_id, si.location, si.zone_id, nmz.name, nmz.zone_type, nmz.floor_number
ORDER BY incident_count DESC;

-- View for time-of-day pattern analysis
CREATE OR REPLACE VIEW near_miss_time_patterns AS
SELECT
    company_id,
    project_id,
    hour_of_day,
    day_of_week,
    COUNT(*) as incident_count,
    COUNT(*) FILTER (WHERE potential_severity IN ('lost_time', 'fatality')) as high_severity_count,
    jsonb_agg(DISTINCT root_cause_category) FILTER (WHERE root_cause_category IS NOT NULL) as common_root_causes
FROM safety_incidents
WHERE severity = 'near_miss'
  AND deleted_at IS NULL
  AND hour_of_day IS NOT NULL
  AND incident_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY company_id, project_id, hour_of_day, day_of_week
ORDER BY incident_count DESC;

-- View for root cause Pareto analysis
CREATE OR REPLACE VIEW near_miss_root_cause_pareto AS
WITH root_cause_counts AS (
    SELECT
        company_id,
        project_id,
        COALESCE(root_cause_category::text, 'unknown') as root_cause_category,
        COUNT(*) as count,
        SUM(COUNT(*)) OVER (PARTITION BY company_id, project_id) as total_count
    FROM safety_incidents
    WHERE severity = 'near_miss'
      AND deleted_at IS NULL
      AND incident_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY company_id, project_id, root_cause_category
),
ranked AS (
    SELECT
        *,
        ROUND((count::DECIMAL / total_count) * 100, 2) as percentage,
        SUM(count) OVER (
            PARTITION BY company_id, project_id
            ORDER BY count DESC
        ) as cumulative_count
    FROM root_cause_counts
)
SELECT
    company_id,
    project_id,
    root_cause_category,
    count,
    percentage,
    ROUND((cumulative_count::DECIMAL / total_count) * 100, 2) as cumulative_percentage,
    total_count
FROM ranked
ORDER BY company_id, project_id, count DESC;

-- ============================================================================
-- Functions for Pattern Detection
-- ============================================================================

-- Function to detect frequency spikes
CREATE OR REPLACE FUNCTION detect_near_miss_frequency_spikes(
    p_company_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_lookback_days INTEGER DEFAULT 30,
    p_spike_threshold DECIMAL DEFAULT 2.0 -- Standard deviations above mean
)
RETURNS TABLE (
    spike_date DATE,
    count INTEGER,
    average DECIMAL,
    std_dev DECIMAL,
    deviation_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_counts AS (
        SELECT
            incident_date,
            COUNT(*)::INTEGER as daily_count
        FROM safety_incidents
        WHERE company_id = p_company_id
          AND (p_project_id IS NULL OR project_id = p_project_id)
          AND severity = 'near_miss'
          AND deleted_at IS NULL
          AND incident_date >= CURRENT_DATE - p_lookback_days
        GROUP BY incident_date
    ),
    stats AS (
        SELECT
            AVG(daily_count) as avg_count,
            STDDEV(daily_count) as std_count
        FROM daily_counts
    )
    SELECT
        dc.incident_date,
        dc.daily_count,
        ROUND(s.avg_count, 2) as average,
        ROUND(COALESCE(s.std_count, 0), 2) as std_dev,
        ROUND((dc.daily_count - s.avg_count) / NULLIF(s.std_count, 0), 2) as deviation_score
    FROM daily_counts dc
    CROSS JOIN stats s
    WHERE s.std_count > 0
      AND (dc.daily_count - s.avg_count) / s.std_count >= p_spike_threshold
    ORDER BY dc.incident_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to detect recurring location patterns
CREATE OR REPLACE FUNCTION detect_location_hotspots(
    p_company_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_min_incidents INTEGER DEFAULT 3,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    location TEXT,
    zone_id UUID,
    incident_count INTEGER,
    high_severity_count INTEGER,
    root_causes TEXT[],
    risk_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(si.location, 'Unknown'),
        si.zone_id,
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE si.potential_severity IN ('lost_time', 'fatality'))::INTEGER,
        array_agg(DISTINCT si.root_cause_category) FILTER (WHERE si.root_cause_category IS NOT NULL),
        -- Risk score: weighted by severity potential and frequency
        ROUND((
            COUNT(*) * 1.0 +
            COUNT(*) FILTER (WHERE si.potential_severity = 'fatality') * 5.0 +
            COUNT(*) FILTER (WHERE si.potential_severity = 'lost_time') * 3.0 +
            COUNT(*) FILTER (WHERE si.potential_severity = 'medical_treatment') * 1.5
        )::DECIMAL, 2)
    FROM safety_incidents si
    WHERE si.company_id = p_company_id
      AND (p_project_id IS NULL OR si.project_id = p_project_id)
      AND si.severity = 'near_miss'
      AND si.deleted_at IS NULL
      AND si.incident_date >= CURRENT_DATE - p_days
    GROUP BY COALESCE(si.location, 'Unknown'), si.zone_id
    HAVING COUNT(*) >= p_min_incidents
    ORDER BY risk_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trend direction and strength
CREATE OR REPLACE FUNCTION calculate_near_miss_trend(
    p_company_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    current_period_count INTEGER,
    previous_period_count INTEGER,
    change_percentage DECIMAL,
    trend_direction TEXT,
    by_category JSONB,
    by_root_cause JSONB
) AS $$
DECLARE
    v_current_start DATE;
    v_previous_start DATE;
BEGIN
    v_current_start := CURRENT_DATE - p_period_days;
    v_previous_start := v_current_start - p_period_days;

    RETURN QUERY
    WITH current_period AS (
        SELECT
            COUNT(*) as cnt,
            jsonb_object_agg(
                COALESCE(incident_type::text, 'unknown'),
                type_count
            ) as by_type,
            jsonb_object_agg(
                COALESCE(root_cause_category::text, 'unknown'),
                cause_count
            ) as by_cause
        FROM (
            SELECT
                incident_type,
                root_cause_category,
                COUNT(*) as type_count,
                COUNT(*) as cause_count
            FROM safety_incidents
            WHERE company_id = p_company_id
              AND (p_project_id IS NULL OR project_id = p_project_id)
              AND severity = 'near_miss'
              AND deleted_at IS NULL
              AND incident_date >= v_current_start
            GROUP BY incident_type, root_cause_category
        ) sub
    ),
    previous_period AS (
        SELECT COUNT(*) as cnt
        FROM safety_incidents
        WHERE company_id = p_company_id
          AND (p_project_id IS NULL OR project_id = p_project_id)
          AND severity = 'near_miss'
          AND deleted_at IS NULL
          AND incident_date >= v_previous_start
          AND incident_date < v_current_start
    )
    SELECT
        cp.cnt::INTEGER,
        pp.cnt::INTEGER,
        CASE
            WHEN pp.cnt = 0 THEN 0
            ELSE ROUND(((cp.cnt - pp.cnt)::DECIMAL / pp.cnt) * 100, 2)
        END,
        CASE
            WHEN cp.cnt > pp.cnt THEN 'increasing'
            WHEN cp.cnt < pp.cnt THEN 'decreasing'
            ELSE 'stable'
        END,
        COALESCE(cp.by_type, '{}'::JSONB),
        COALESCE(cp.by_cause, '{}'::JSONB)
    FROM current_period cp
    CROSS JOIN previous_period pp;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_safety_incidents_near_miss
ON safety_incidents(company_id, project_id, incident_date)
WHERE severity = 'near_miss' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_safety_incidents_near_miss_location
ON safety_incidents(company_id, project_id, location)
WHERE severity = 'near_miss' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_safety_incidents_near_miss_time
ON safety_incidents(company_id, project_id, hour_of_day, day_of_week)
WHERE severity = 'near_miss' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_safety_incidents_root_cause
ON safety_incidents(company_id, project_id, root_cause_category)
WHERE severity = 'near_miss' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_near_miss_patterns_project
ON near_miss_patterns(project_id, status, detection_date);

CREATE INDEX IF NOT EXISTS idx_near_miss_alerts_unread
ON near_miss_alerts(company_id, project_id, is_read, is_dismissed);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE near_miss_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_miss_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_miss_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_miss_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_miss_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_miss_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Categories: Users can view categories for their company
CREATE POLICY near_miss_categories_select ON near_miss_categories
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid()
        )
    );

-- Zones: Users can view zones for projects they have access to
CREATE POLICY near_miss_zones_select ON near_miss_zones
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM project_users
            WHERE user_id = auth.uid()
        )
    );

-- Alert thresholds: Company admins only
CREATE POLICY near_miss_alert_thresholds_select ON near_miss_alert_thresholds
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
    );

-- Patterns: Users can view patterns for their projects
CREATE POLICY near_miss_patterns_select ON near_miss_patterns
    FOR SELECT USING (
        project_id IS NULL AND company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        OR project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
    );

-- Alerts: Users can view alerts for their projects
CREATE POLICY near_miss_alerts_select ON near_miss_alerts
    FOR SELECT USING (
        project_id IS NULL AND company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        OR project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
    );

-- Monthly reports: Users can view reports for their projects
CREATE POLICY near_miss_monthly_reports_select ON near_miss_monthly_reports
    FOR SELECT USING (
        project_id IS NULL AND company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        OR project_id IN (
            SELECT project_id FROM project_users WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- Seed Industry Benchmarks (Construction Industry)
-- ============================================================================

INSERT INTO safety_benchmarks (industry_type, metric_name, metric_value, measurement_period, source, year, notes)
VALUES
    ('construction', 'near_miss_ratio', 600, 'yearly', 'Heinrich Triangle', 2024, 'Ratio of near-misses to 1 fatality'),
    ('construction', 'near_miss_to_injury_ratio', 30, 'yearly', 'Industry Average', 2024, 'Near-misses per recordable injury'),
    ('construction', 'reporting_rate_good', 10, 'monthly', 'Industry Average', 2024, 'Target near-miss reports per 100 workers per month'),
    ('construction', 'trir_average', 2.8, 'yearly', 'BLS', 2024, 'Total Recordable Incident Rate'),
    ('construction', 'dart_average', 1.5, 'yearly', 'BLS', 2024, 'Days Away Restricted Transfer Rate')
ON CONFLICT (industry_type, metric_name, year) DO UPDATE
SET metric_value = EXCLUDED.metric_value,
    updated_at = NOW();

COMMENT ON TABLE near_miss_categories IS 'Categories for classifying near-miss incidents for trend analysis';
COMMENT ON TABLE near_miss_zones IS 'Physical zones within a project for location-based heat map analysis';
COMMENT ON TABLE near_miss_patterns IS 'Detected patterns in near-miss data for proactive safety management';
COMMENT ON TABLE near_miss_alerts IS 'Alerts generated when thresholds are exceeded or patterns detected';
COMMENT ON TABLE near_miss_monthly_reports IS 'Monthly snapshot reports of near-miss trends and metrics';
