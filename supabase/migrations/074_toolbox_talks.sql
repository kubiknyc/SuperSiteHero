-- Migration: 074_toolbox_talks.sql
-- Description: Toolbox Talks / Safety Briefing Module
-- Created: 2025-12-07
--
-- This migration creates the toolbox talk infrastructure:
-- - toolbox_talk_topics: Predefined safety topics library
-- - toolbox_talks: Main toolbox talk records
-- - toolbox_talk_attendees: Attendance tracking with digital sign-in
-- - toolbox_talk_certifications: Track worker certifications per topic

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Topic categories for organization
CREATE TYPE toolbox_topic_category AS ENUM (
  'fall_protection',
  'ppe',
  'electrical_safety',
  'excavation',
  'scaffolding',
  'ladder_safety',
  'fire_prevention',
  'hazmat',
  'confined_space',
  'lockout_tagout',
  'hand_tools',
  'power_tools',
  'heavy_equipment',
  'crane_rigging',
  'housekeeping',
  'heat_illness',
  'cold_stress',
  'silica_dust',
  'noise_exposure',
  'ergonomics',
  'first_aid',
  'emergency_response',
  'site_specific',
  'other'
);

-- Toolbox talk status
CREATE TYPE toolbox_talk_status AS ENUM (
  'draft',        -- Being prepared
  'scheduled',    -- Scheduled for future
  'in_progress',  -- Currently being conducted
  'completed',    -- Finished with attendance recorded
  'cancelled'     -- Cancelled
);

-- Attendance status for workers
CREATE TYPE toolbox_attendance_status AS ENUM (
  'expected',     -- Worker expected to attend
  'present',      -- Worker attended and signed in
  'absent',       -- Worker was absent
  'excused'       -- Worker excused (valid reason)
);

-- ============================================================================
-- TOOLBOX TALK TOPICS (Library)
-- ============================================================================

CREATE TABLE IF NOT EXISTS toolbox_talk_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Topic details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category toolbox_topic_category NOT NULL DEFAULT 'other',

  -- Content
  talking_points JSONB DEFAULT '[]'::jsonb, -- Array of key points to cover
  discussion_questions JSONB DEFAULT '[]'::jsonb, -- Discussion prompts
  resources JSONB DEFAULT '[]'::jsonb, -- Links, documents, videos

  -- Certification requirements
  requires_certification BOOLEAN DEFAULT FALSE,
  certification_valid_days INTEGER DEFAULT 365, -- How long certification is valid

  -- Duration estimate
  estimated_duration INTEGER DEFAULT 15, -- minutes

  -- OSHA/regulation reference
  osha_standard TEXT, -- e.g., "1926.501" for fall protection
  regulation_references TEXT,

  -- Library flags
  is_system_template BOOLEAN DEFAULT FALSE, -- Built-in templates
  is_active BOOLEAN DEFAULT TRUE,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- TOOLBOX TALKS (Main Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  talk_number TEXT NOT NULL,

  -- Topic reference (can use template or custom)
  topic_id UUID REFERENCES toolbox_talk_topics(id) ON DELETE SET NULL,
  custom_topic_title VARCHAR(255), -- If not using template
  custom_topic_description TEXT,
  category toolbox_topic_category NOT NULL DEFAULT 'other',

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Location
  location TEXT, -- Where on the job site

  -- Status
  status toolbox_talk_status NOT NULL DEFAULT 'scheduled',

  -- Presenter
  presenter_id UUID REFERENCES auth.users(id),
  presenter_name VARCHAR(255),
  presenter_title VARCHAR(255),

  -- Content covered
  talking_points_covered JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  hazards_discussed TEXT,

  -- Weather/conditions (for relevant topics)
  weather_conditions TEXT,
  site_conditions TEXT,

  -- Compliance
  osha_compliant BOOLEAN DEFAULT TRUE,

  -- Related incident (if prompted by an incident)
  related_incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- ============================================================================
-- TOOLBOX TALK ATTENDEES (Digital Sign-In)
-- ============================================================================

CREATE TABLE IF NOT EXISTS toolbox_talk_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toolbox_talk_id UUID NOT NULL REFERENCES toolbox_talks(id) ON DELETE CASCADE,

  -- Worker identification
  user_id UUID REFERENCES auth.users(id), -- If in system
  worker_name VARCHAR(255) NOT NULL,
  worker_company VARCHAR(255), -- Subcontractor company
  worker_trade VARCHAR(100), -- Trade/craft
  worker_badge_number VARCHAR(50),

  -- Attendance
  attendance_status toolbox_attendance_status NOT NULL DEFAULT 'expected',

  -- Digital signature
  signed_in_at TIMESTAMPTZ,
  signature_data TEXT, -- Base64 signature image or acknowledgment hash
  signed_via VARCHAR(50) DEFAULT 'app', -- app, tablet, paper (entered later)

  -- Device info (for audit trail)
  device_info JSONB,
  ip_address INET,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TOOLBOX TALK CERTIFICATIONS (Worker Training Records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS toolbox_talk_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Worker
  user_id UUID REFERENCES auth.users(id),
  worker_name VARCHAR(255) NOT NULL,
  worker_company VARCHAR(255),

  -- Topic certified in
  topic_id UUID NOT NULL REFERENCES toolbox_talk_topics(id) ON DELETE CASCADE,

  -- Certification details
  certified_date DATE NOT NULL,
  expires_date DATE,
  toolbox_talk_id UUID REFERENCES toolbox_talks(id) ON DELETE SET NULL, -- Which talk granted this

  -- Status
  is_current BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one active certification per worker per topic
  CONSTRAINT unique_worker_topic_certification UNIQUE (company_id, worker_name, topic_id, is_current)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate toolbox talk number (TBT-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_toolbox_talk_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(NEW.scheduled_date, 'YYYY');

  -- Get the next sequence number for this year and company
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(talk_number FROM 10 FOR 4) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM toolbox_talks
  WHERE company_id = NEW.company_id
    AND talk_number LIKE 'TBT-' || year_part || '-%';

  new_number := 'TBT-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.talk_number := new_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating talk number
CREATE TRIGGER trigger_generate_toolbox_talk_number
  BEFORE INSERT ON toolbox_talks
  FOR EACH ROW
  WHEN (NEW.talk_number IS NULL OR NEW.talk_number = '')
  EXECUTE FUNCTION generate_toolbox_talk_number();

-- Update timestamp trigger for toolbox_talks
CREATE OR REPLACE FUNCTION update_toolbox_talk_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_toolbox_talk_timestamp
  BEFORE UPDATE ON toolbox_talks
  FOR EACH ROW
  EXECUTE FUNCTION update_toolbox_talk_timestamp();

CREATE TRIGGER trigger_update_toolbox_topic_timestamp
  BEFORE UPDATE ON toolbox_talk_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_toolbox_talk_timestamp();

CREATE TRIGGER trigger_update_toolbox_attendee_timestamp
  BEFORE UPDATE ON toolbox_talk_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_toolbox_talk_timestamp();

-- Function to increment topic usage count
CREATE OR REPLACE FUNCTION increment_topic_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.topic_id IS NOT NULL THEN
    UPDATE toolbox_talk_topics
    SET times_used = times_used + 1
    WHERE id = NEW.topic_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_topic_usage
  AFTER INSERT ON toolbox_talks
  FOR EACH ROW
  EXECUTE FUNCTION increment_topic_usage();

-- Function to auto-create certification when worker attends topic requiring certification
CREATE OR REPLACE FUNCTION create_certification_on_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id UUID;
  v_company_id UUID;
  v_requires_cert BOOLEAN;
  v_valid_days INTEGER;
BEGIN
  -- Only process when worker signs in
  IF NEW.attendance_status = 'present' AND NEW.signed_in_at IS NOT NULL THEN
    -- Get the topic info from the toolbox talk
    SELECT t.topic_id, t.company_id
    INTO v_topic_id, v_company_id
    FROM toolbox_talks t
    WHERE t.id = NEW.toolbox_talk_id;

    IF v_topic_id IS NOT NULL THEN
      -- Check if topic requires certification
      SELECT requires_certification, certification_valid_days
      INTO v_requires_cert, v_valid_days
      FROM toolbox_talk_topics
      WHERE id = v_topic_id;

      IF v_requires_cert THEN
        -- Mark any existing certifications as not current
        UPDATE toolbox_talk_certifications
        SET is_current = FALSE
        WHERE company_id = v_company_id
          AND worker_name = NEW.worker_name
          AND topic_id = v_topic_id
          AND is_current = TRUE;

        -- Create new certification
        INSERT INTO toolbox_talk_certifications (
          company_id,
          user_id,
          worker_name,
          worker_company,
          topic_id,
          certified_date,
          expires_date,
          toolbox_talk_id,
          is_current
        ) VALUES (
          v_company_id,
          NEW.user_id,
          NEW.worker_name,
          NEW.worker_company,
          v_topic_id,
          CURRENT_DATE,
          CURRENT_DATE + v_valid_days,
          NEW.toolbox_talk_id,
          TRUE
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_certification_on_attendance
  AFTER INSERT OR UPDATE ON toolbox_talk_attendees
  FOR EACH ROW
  EXECUTE FUNCTION create_certification_on_attendance();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Topics indexes
CREATE INDEX IF NOT EXISTS idx_toolbox_topics_company ON toolbox_talk_topics(company_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_topics_category ON toolbox_talk_topics(category);
CREATE INDEX IF NOT EXISTS idx_toolbox_topics_active ON toolbox_talk_topics(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_toolbox_topics_system ON toolbox_talk_topics(is_system_template) WHERE is_system_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_toolbox_topics_deleted ON toolbox_talk_topics(deleted_at) WHERE deleted_at IS NULL;

-- Talks indexes
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_project ON toolbox_talks(project_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_company ON toolbox_talks(company_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_date ON toolbox_talks(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_status ON toolbox_talks(status);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_topic ON toolbox_talks(topic_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_presenter ON toolbox_talks(presenter_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_category ON toolbox_talks(category);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_deleted ON toolbox_talks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_incident ON toolbox_talks(related_incident_id) WHERE related_incident_id IS NOT NULL;

-- Attendees indexes
CREATE INDEX IF NOT EXISTS idx_toolbox_attendees_talk ON toolbox_talk_attendees(toolbox_talk_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_attendees_user ON toolbox_talk_attendees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_toolbox_attendees_status ON toolbox_talk_attendees(attendance_status);
CREATE INDEX IF NOT EXISTS idx_toolbox_attendees_signed ON toolbox_talk_attendees(signed_in_at) WHERE signed_in_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_toolbox_attendees_company ON toolbox_talk_attendees(worker_company);

-- Certifications indexes
CREATE INDEX IF NOT EXISTS idx_toolbox_certs_company ON toolbox_talk_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_certs_worker ON toolbox_talk_certifications(worker_name);
CREATE INDEX IF NOT EXISTS idx_toolbox_certs_topic ON toolbox_talk_certifications(topic_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_certs_current ON toolbox_talk_certifications(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_toolbox_certs_expires ON toolbox_talk_certifications(expires_date) WHERE is_current = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE toolbox_talk_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talk_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talk_certifications ENABLE ROW LEVEL SECURITY;

-- Topics policies
CREATE POLICY "Users can view system templates and their company topics"
  ON toolbox_talk_topics FOR SELECT
  USING (
    is_system_template = TRUE
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create topics for their company"
  ON toolbox_talk_topics FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company topics"
  ON toolbox_talk_topics FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND is_system_template = FALSE
  );

CREATE POLICY "Users can delete their company topics"
  ON toolbox_talk_topics FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND is_system_template = FALSE
  );

-- Talks policies
CREATE POLICY "Users can view talks in their projects"
  ON toolbox_talks FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create talks in their projects"
  ON toolbox_talks FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update talks in their projects"
  ON toolbox_talks FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete talks in their projects"
  ON toolbox_talks FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Attendees policies
CREATE POLICY "Users can view attendees for talks they can access"
  ON toolbox_talk_attendees FOR SELECT
  USING (
    toolbox_talk_id IN (
      SELECT id FROM toolbox_talks
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage attendees for talks in their projects"
  ON toolbox_talk_attendees FOR ALL
  USING (
    toolbox_talk_id IN (
      SELECT id FROM toolbox_talks
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

-- Certifications policies
CREATE POLICY "Users can view certifications in their company"
  ON toolbox_talk_certifications FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage certifications in their company"
  ON toolbox_talk_certifications FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Toolbox talk statistics by project
CREATE OR REPLACE VIEW toolbox_talk_stats AS
SELECT
  project_id,
  COUNT(*) as total_talks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_talks,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_talks,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_talks,
  AVG(duration_minutes) FILTER (WHERE status = 'completed') as avg_duration,
  SUM(
    (SELECT COUNT(*) FROM toolbox_talk_attendees ta
     WHERE ta.toolbox_talk_id = toolbox_talks.id AND ta.attendance_status = 'present')
  ) as total_attendees,
  MAX(scheduled_date) FILTER (WHERE status = 'completed') as last_completed_date
FROM toolbox_talks
WHERE deleted_at IS NULL
GROUP BY project_id;

-- Expiring certifications view
CREATE OR REPLACE VIEW expiring_certifications AS
SELECT
  c.*,
  t.title as topic_title,
  t.category as topic_category,
  CASE
    WHEN c.expires_date < CURRENT_DATE THEN 'expired'
    WHEN c.expires_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as certification_status
FROM toolbox_talk_certifications c
JOIN toolbox_talk_topics t ON c.topic_id = t.id
WHERE c.is_current = TRUE
ORDER BY c.expires_date ASC;

-- ============================================================================
-- SEED DATA - System Templates
-- ============================================================================

INSERT INTO toolbox_talk_topics (
  id, company_id, title, description, category,
  talking_points, discussion_questions,
  requires_certification, certification_valid_days,
  estimated_duration, osha_standard, is_system_template, is_active
) VALUES
-- Fall Protection
(
  gen_random_uuid(), NULL,
  'Fall Protection Basics',
  'Essential fall protection requirements and personal fall arrest systems for construction workers.',
  'fall_protection',
  '["100% tie-off requirement above 6 feet", "Inspect harness before each use", "Check anchor points - must support 5,000 lbs", "Proper lanyard selection", "Fall clearance calculations", "Rescue procedures"]'::jsonb,
  '["When was the last time you inspected your harness?", "What is the minimum anchor point strength?", "How do you calculate fall clearance?"]'::jsonb,
  TRUE, 365, 20, '1926.501-503', TRUE, TRUE
),
-- PPE
(
  gen_random_uuid(), NULL,
  'Personal Protective Equipment (PPE)',
  'Overview of required PPE and proper use for construction sites.',
  'ppe',
  '["Hard hats required in all work areas", "Safety glasses with side shields", "High-visibility vests", "Steel-toe boots requirement", "Hearing protection in high-noise areas", "Glove selection for specific tasks"]'::jsonb,
  '["What PPE is required for your specific task today?", "When should you replace damaged PPE?", "How do you know if hearing protection is needed?"]'::jsonb,
  FALSE, 365, 15, '1926.95-106', TRUE, TRUE
),
-- Electrical Safety
(
  gen_random_uuid(), NULL,
  'Electrical Safety Awareness',
  'Recognizing and avoiding electrical hazards on construction sites.',
  'electrical_safety',
  '["Assume all wires are live", "Lockout/tagout procedures", "GFCI requirements for portable tools", "Extension cord inspection", "Overhead power line clearances", "Reporting damaged electrical equipment"]'::jsonb,
  '["How close can equipment get to overhead power lines?", "What should you do if you find a damaged extension cord?", "Why is GFCI important outdoors?"]'::jsonb,
  TRUE, 365, 20, '1926.400-449', TRUE, TRUE
),
-- Excavation Safety
(
  gen_random_uuid(), NULL,
  'Excavation and Trenching Safety',
  'Safe work practices for excavations and trenching operations.',
  'excavation',
  '["Call 811 before you dig", "Cave-in protection required at 5 feet", "Competent person requirements", "Access/egress every 25 feet", "Spoil pile placement - 2 feet back", "Daily inspections required"]'::jsonb,
  '["What types of protective systems are available?", "Who is the competent person on this job?", "What weather conditions affect trench stability?"]'::jsonb,
  TRUE, 365, 25, '1926.650-652', TRUE, TRUE
),
-- Scaffolding
(
  gen_random_uuid(), NULL,
  'Scaffold Safety',
  'Safe scaffold erection, use, and inspection procedures.',
  'scaffolding',
  '["Only trained workers erect scaffolds", "Inspect before each shift", "Guardrails required above 10 feet", "Proper access - no climbing cross braces", "Load capacity and limits", "Weather considerations"]'::jsonb,
  '["What should you check during a scaffold inspection?", "What is the maximum gap between planks?", "When must scaffolds be re-inspected?"]'::jsonb,
  TRUE, 365, 20, '1926.450-454', TRUE, TRUE
),
-- Ladder Safety
(
  gen_random_uuid(), NULL,
  'Ladder Safety',
  'Proper ladder selection, setup, and use.',
  'ladder_safety',
  '["Choose the right ladder for the job", "Inspect before use", "4-to-1 rule for setup", "3 points of contact", "Extend 3 feet above landing", "Never stand on top rungs"]'::jsonb,
  '["What is the 4-to-1 rule?", "When should a ladder be taken out of service?", "What are the top causes of ladder accidents?"]'::jsonb,
  FALSE, 365, 15, '1926.1053', TRUE, TRUE
),
-- Fire Prevention
(
  gen_random_uuid(), NULL,
  'Fire Prevention and Extinguisher Use',
  'Fire hazard awareness and proper extinguisher operation.',
  'fire_prevention',
  '["Know your fire extinguisher locations", "PASS technique: Pull, Aim, Squeeze, Sweep", "Hot work permits required", "Proper storage of flammables", "Clear evacuation routes", "Emergency contact numbers"]'::jsonb,
  '["Where is the nearest fire extinguisher?", "What class of fire can you use water on?", "What is the first thing to do if you discover a fire?"]'::jsonb,
  FALSE, 365, 15, '1926.150-152', TRUE, TRUE
),
-- Heat Illness Prevention
(
  gen_random_uuid(), NULL,
  'Heat Illness Prevention',
  'Recognizing and preventing heat-related illness on job sites.',
  'heat_illness',
  '["Drink water frequently - 1 cup every 20 minutes", "Take breaks in shade/cooling areas", "Know the signs of heat exhaustion and heat stroke", "Acclimatization period for new workers", "Buddy system in extreme heat", "Emergency procedures for heat illness"]'::jsonb,
  '["What is the difference between heat exhaustion and heat stroke?", "How much water should you drink per hour in heat?", "What should you do if a coworker shows signs of heat illness?"]'::jsonb,
  FALSE, 365, 15, NULL, TRUE, TRUE
),
-- Silica Exposure
(
  gen_random_uuid(), NULL,
  'Silica Dust Exposure Prevention',
  'Protecting workers from respirable crystalline silica.',
  'silica_dust',
  '["Silica is found in concrete, brick, stone, sand", "Use wet cutting methods when possible", "Required respirator selection", "Exposure monitoring requirements", "Housekeeping to prevent dust", "Medical surveillance program"]'::jsonb,
  '["What tasks create silica dust?", "What type of respirator is required for silica?", "How often should exposure monitoring occur?"]'::jsonb,
  TRUE, 365, 20, '1926.1153', TRUE, TRUE
),
-- Confined Space
(
  gen_random_uuid(), NULL,
  'Confined Space Entry',
  'Permit-required confined space entry procedures and hazards.',
  'confined_space',
  '["Identify all confined spaces on site", "Never enter without a permit", "Atmospheric testing required", "Attendant must be present", "Rescue procedures and equipment", "Communication methods"]'::jsonb,
  '["What makes a space a confined space?", "What atmospheric hazards should be tested?", "What is the role of the attendant?"]'::jsonb,
  TRUE, 365, 25, '1926.1200-1213', TRUE, TRUE
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE toolbox_talk_topics IS 'Library of toolbox talk topics with talking points and certification requirements';
COMMENT ON TABLE toolbox_talks IS 'Toolbox talk / safety briefing records';
COMMENT ON TABLE toolbox_talk_attendees IS 'Attendance tracking with digital sign-in for toolbox talks';
COMMENT ON TABLE toolbox_talk_certifications IS 'Worker certifications earned through toolbox talk attendance';

COMMENT ON COLUMN toolbox_talks.talk_number IS 'Auto-generated talk number (TBT-YYYY-NNNN)';
COMMENT ON COLUMN toolbox_talk_topics.talking_points IS 'JSON array of key points to cover during the talk';
COMMENT ON COLUMN toolbox_talk_topics.certification_valid_days IS 'How many days the certification is valid after attending';
COMMENT ON COLUMN toolbox_talk_attendees.signature_data IS 'Base64 encoded signature or acknowledgment hash for compliance';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON toolbox_talk_topics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON toolbox_talks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON toolbox_talk_attendees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON toolbox_talk_certifications TO authenticated;
GRANT SELECT ON toolbox_talk_stats TO authenticated;
GRANT SELECT ON expiring_certifications TO authenticated;
