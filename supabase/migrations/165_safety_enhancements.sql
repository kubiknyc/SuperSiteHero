-- Migration: Safety Enhancements
-- Description: Add tables for toolbox talks and safety observation trends

-- ============================================================================
-- TOOLBOX TALKS
-- ============================================================================

-- Toolbox talk topics library
CREATE TABLE IF NOT EXISTS toolbox_talk_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Topic details
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    content TEXT, -- Full talk content/script
    duration_minutes INTEGER DEFAULT 15,

    -- Resources
    resources JSONB DEFAULT '[]', -- Links, documents, videos
    key_points JSONB DEFAULT '[]', -- Bullet points to cover
    discussion_questions JSONB DEFAULT '[]',

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false, -- System templates vs custom
    tags TEXT[] DEFAULT '{}',

    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled/completed toolbox talks
CREATE TABLE IF NOT EXISTS toolbox_talks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Talk details
    talk_number TEXT NOT NULL,
    topic_id UUID REFERENCES toolbox_talk_topics(id),
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- Can override topic content

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_minutes INTEGER DEFAULT 15,
    location TEXT,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT, -- 'daily', 'weekly', 'biweekly', 'monthly'
    recurrence_day TEXT, -- Day of week for weekly
    recurrence_end_date DATE,
    parent_talk_id UUID REFERENCES toolbox_talks(id),

    -- Delivery
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
    conducted_by UUID REFERENCES profiles(id),
    conductor_name TEXT,
    actual_date DATE,
    actual_start_time TIME,
    actual_end_time TIME,

    -- Notes and outcomes
    notes TEXT,
    weather_conditions TEXT,
    safety_concerns_raised TEXT,
    action_items JSONB DEFAULT '[]',

    -- Attachments
    attachments JSONB DEFAULT '[]',
    photos JSONB DEFAULT '[]',

    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Toolbox talk attendance
CREATE TABLE IF NOT EXISTS toolbox_talk_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talk_id UUID NOT NULL REFERENCES toolbox_talks(id) ON DELETE CASCADE,

    -- Attendee info
    user_id UUID REFERENCES profiles(id),
    worker_name TEXT NOT NULL,
    worker_company TEXT,
    worker_trade TEXT,
    worker_badge_number TEXT,

    -- Sign-in
    signed_in_at TIMESTAMPTZ DEFAULT NOW(),
    signature_data TEXT, -- Base64 signature image

    -- Acknowledgment
    understood_content BOOLEAN DEFAULT true,
    has_questions BOOLEAN DEFAULT false,
    questions_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for toolbox talks
CREATE INDEX IF NOT EXISTS idx_toolbox_talk_topics_company ON toolbox_talk_topics(company_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talk_topics_category ON toolbox_talk_topics(category);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_company ON toolbox_talks(company_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_project ON toolbox_talks(project_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_scheduled ON toolbox_talks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_status ON toolbox_talks(status);
CREATE INDEX IF NOT EXISTS idx_toolbox_talk_attendees_talk ON toolbox_talk_attendees(talk_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talk_attendees_user ON toolbox_talk_attendees(user_id);

-- Generate talk number
CREATE OR REPLACE FUNCTION generate_toolbox_talk_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    next_seq INTEGER;
BEGIN
    year_prefix := EXTRACT(YEAR FROM NEW.scheduled_date)::TEXT;

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(talk_number FROM '-(\d+)$') AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM toolbox_talks
    WHERE company_id = NEW.company_id
    AND talk_number LIKE 'TBT-' || year_prefix || '-%';

    NEW.talk_number := 'TBT-' || year_prefix || '-' || LPAD(next_seq::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_toolbox_talk_number ON toolbox_talks;
CREATE TRIGGER set_toolbox_talk_number
    BEFORE INSERT ON toolbox_talks
    FOR EACH ROW
    WHEN (NEW.talk_number IS NULL OR NEW.talk_number = '')
    EXECUTE FUNCTION generate_toolbox_talk_number();

-- Update timestamp trigger
CREATE TRIGGER update_toolbox_talks_updated_at
    BEFORE UPDATE ON toolbox_talks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toolbox_talk_topics_updated_at
    BEFORE UPDATE ON toolbox_talk_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAFETY OBSERVATION TRENDS
-- ============================================================================

-- Daily safety observation aggregates for trend analysis
CREATE TABLE IF NOT EXISTS safety_observation_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,

    -- Observation counts
    total_observations INTEGER DEFAULT 0,
    safe_observations INTEGER DEFAULT 0,
    unsafe_observations INTEGER DEFAULT 0,
    near_miss_observations INTEGER DEFAULT 0,

    -- By severity
    low_severity INTEGER DEFAULT 0,
    medium_severity INTEGER DEFAULT 0,
    high_severity INTEGER DEFAULT 0,
    critical_severity INTEGER DEFAULT 0,

    -- By category (JSONB for flexibility)
    by_category JSONB DEFAULT '{}',
    by_location JSONB DEFAULT '{}',
    by_trade JSONB DEFAULT '{}',

    -- Resolution metrics
    resolved_same_day INTEGER DEFAULT 0,
    pending_resolution INTEGER DEFAULT 0,
    avg_resolution_hours NUMERIC(10,2),

    -- Participation
    unique_observers INTEGER DEFAULT 0,
    unique_workers_observed INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, project_id, stat_date)
);

-- Weekly/Monthly roll-ups
CREATE TABLE IF NOT EXISTS safety_observation_period_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Aggregated counts
    total_observations INTEGER DEFAULT 0,
    safe_observations INTEGER DEFAULT 0,
    unsafe_observations INTEGER DEFAULT 0,
    near_miss_observations INTEGER DEFAULT 0,

    -- Rates and trends
    observation_rate NUMERIC(10,4), -- per work hour or per employee
    safe_observation_rate NUMERIC(10,4),
    trend_vs_previous NUMERIC(10,4), -- % change from previous period

    -- Top categories
    top_unsafe_categories JSONB DEFAULT '[]',
    top_locations JSONB DEFAULT '[]',

    -- Participation metrics
    total_observers INTEGER DEFAULT 0,
    avg_observations_per_observer NUMERIC(10,2),

    -- Resolution metrics
    avg_resolution_time_hours NUMERIC(10,2),
    on_time_resolution_rate NUMERIC(10,4),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, project_id, period_type, period_start)
);

-- Indexes for observation trends
CREATE INDEX IF NOT EXISTS idx_safety_obs_daily_company ON safety_observation_daily_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_obs_daily_project ON safety_observation_daily_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_safety_obs_daily_date ON safety_observation_daily_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_safety_obs_period_company ON safety_observation_period_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_obs_period_type ON safety_observation_period_stats(period_type, period_start);

-- ============================================================================
-- JHA DAILY REPORT LINKS (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS jha_daily_report_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jha_id UUID NOT NULL REFERENCES job_safety_analyses(id) ON DELETE CASCADE,
    daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    linked_by UUID REFERENCES profiles(id),

    UNIQUE(jha_id, daily_report_id)
);

CREATE INDEX IF NOT EXISTS idx_jha_daily_links_jha ON jha_daily_report_links(jha_id);
CREATE INDEX IF NOT EXISTS idx_jha_daily_links_report ON jha_daily_report_links(daily_report_id);

-- ============================================================================
-- SEED DEFAULT TOOLBOX TALK TOPICS
-- ============================================================================

-- Function to seed default topics for a company
CREATE OR REPLACE FUNCTION seed_default_toolbox_topics(p_company_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO toolbox_talk_topics (company_id, title, category, description, duration_minutes, key_points, is_template)
    VALUES
        -- Fall Protection
        (p_company_id, 'Fall Protection Fundamentals', 'fall_protection',
         'Review of fall protection requirements, equipment inspection, and proper use of personal fall arrest systems.',
         15, '["100% tie-off requirement above 6 feet", "Inspect equipment before each use", "Know your anchor points", "Report damaged equipment immediately"]'::jsonb, true),

        (p_company_id, 'Ladder Safety', 'fall_protection',
         'Proper ladder selection, setup, and use to prevent falls and injuries.',
         15, '["3-point contact at all times", "Inspect before use", "Proper angle (4:1 ratio)", "Face ladder when climbing", "Never overreach"]'::jsonb, true),

        -- Electrical Safety
        (p_company_id, 'Electrical Safety Awareness', 'electrical',
         'Understanding electrical hazards and how to protect yourself on the jobsite.',
         15, '["Assume all wires are live", "LOTO procedures", "Use GFCI protection", "Keep away from overhead lines", "Report damaged cords"]'::jsonb, true),

        (p_company_id, 'Lockout/Tagout Procedures', 'electrical',
         'Proper procedures for de-energizing equipment and protecting workers from unexpected startup.',
         20, '["Know your authorized employees", "Follow the 6 steps", "Never remove someone elses lock", "Verify zero energy state", "Group lockout procedures"]'::jsonb, true),

        -- PPE
        (p_company_id, 'Personal Protective Equipment', 'ppe',
         'Selection, use, and maintenance of personal protective equipment.',
         15, '["Wear appropriate PPE for the task", "Inspect before each use", "Replace damaged equipment", "Store properly", "Know the limitations"]'::jsonb, true),

        (p_company_id, 'Respiratory Protection', 'ppe',
         'When and how to use respiratory protection equipment.',
         15, '["Know your hazards", "Fit test requirements", "Inspect seals and filters", "Medical clearance", "Clean and store properly"]'::jsonb, true),

        -- Excavation
        (p_company_id, 'Trenching and Excavation Safety', 'excavation',
         'Hazards associated with excavations and protective measures.',
         20, '["Daily inspections required", "Competent person on site", "Protective systems for 5ft+", "Know utility locations", "Keep spoils back 2 feet"]'::jsonb, true),

        -- Hazard Communication
        (p_company_id, 'Hazard Communication - GHS Labels', 'hazcom',
         'Understanding the Globally Harmonized System for chemical labeling.',
         15, '["Read labels before use", "Understand pictograms", "Know where SDSs are located", "Report unlabeled containers", "Never mix chemicals"]'::jsonb, true),

        -- Fire Safety
        (p_company_id, 'Fire Prevention and Extinguisher Use', 'fire_safety',
         'Fire prevention practices and proper use of fire extinguishers.',
         15, '["Know fire extinguisher locations", "PASS technique", "When to fight vs evacuate", "Keep exits clear", "Report fire hazards"]'::jsonb, true),

        -- Heat/Cold Stress
        (p_company_id, 'Heat Illness Prevention', 'environmental',
         'Recognizing and preventing heat-related illnesses on the jobsite.',
         15, '["Hydrate frequently", "Take rest breaks", "Know the symptoms", "Acclimatization period", "Buddy system in heat"]'::jsonb, true),

        (p_company_id, 'Cold Stress Prevention', 'environmental',
         'Protecting workers from cold-related injuries and illnesses.',
         15, '["Layer clothing properly", "Keep dry", "Take warm-up breaks", "Know frostbite signs", "Protect extremities"]'::jsonb, true),

        -- Housekeeping
        (p_company_id, 'Jobsite Housekeeping', 'general',
         'Maintaining a clean and organized worksite to prevent injuries.',
         10, '["Clean as you go", "Clear walkways", "Proper material storage", "Dispose of waste properly", "Everyone is responsible"]'::jsonb, true),

        -- Hand Tools
        (p_company_id, 'Hand and Power Tool Safety', 'tools',
         'Safe use, inspection, and maintenance of hand and power tools.',
         15, '["Inspect before use", "Use right tool for the job", "Maintain sharp cutting tools", "Secure loose clothing", "Store properly"]'::jsonb, true),

        -- Crane/Rigging
        (p_company_id, 'Rigging and Load Handling', 'rigging',
         'Safe rigging practices and load handling procedures.',
         20, '["Know load weight", "Inspect rigging gear", "Proper sling angles", "Tag line use", "Never stand under loads"]'::jsonb, true),

        -- Confined Space
        (p_company_id, 'Confined Space Awareness', 'confined_space',
         'Recognizing confined spaces and understanding entry requirements.',
         15, '["Know what is a confined space", "Never enter without permit", "Atmospheric testing required", "Rescue plan in place", "Attendant always present"]'::jsonb, true)

    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE toolbox_talk_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talk_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_observation_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_observation_period_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_daily_report_links ENABLE ROW LEVEL SECURITY;

-- Policies for toolbox_talk_topics
CREATE POLICY "Users can view topics for their company" ON toolbox_talk_topics
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage topics for their company" ON toolbox_talk_topics
    FOR ALL USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- Policies for toolbox_talks
CREATE POLICY "Users can view talks for their company" ON toolbox_talks
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage talks for their company" ON toolbox_talks
    FOR ALL USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- Policies for toolbox_talk_attendees
CREATE POLICY "Users can view attendees for their company talks" ON toolbox_talk_attendees
    FOR SELECT USING (
        talk_id IN (
            SELECT id FROM toolbox_talks
            WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage attendees for their company talks" ON toolbox_talk_attendees
    FOR ALL USING (
        talk_id IN (
            SELECT id FROM toolbox_talks
            WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Policies for observation stats
CREATE POLICY "Users can view observation stats for their company" ON safety_observation_daily_stats
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view period stats for their company" ON safety_observation_period_stats
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- Policies for JHA links
CREATE POLICY "Users can view JHA links for their company" ON jha_daily_report_links
    FOR SELECT USING (
        jha_id IN (
            SELECT id FROM job_safety_analyses
            WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage JHA links for their company" ON jha_daily_report_links
    FOR ALL USING (
        jha_id IN (
            SELECT id FROM job_safety_analyses
            WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Grant permissions
GRANT ALL ON toolbox_talk_topics TO authenticated;
GRANT ALL ON toolbox_talks TO authenticated;
GRANT ALL ON toolbox_talk_attendees TO authenticated;
GRANT ALL ON safety_observation_daily_stats TO authenticated;
GRANT ALL ON safety_observation_period_stats TO authenticated;
GRANT ALL ON jha_daily_report_links TO authenticated;
