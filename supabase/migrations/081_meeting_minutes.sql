-- Migration: 081_meeting_minutes.sql
-- Description: Meeting Minutes module for construction project meetings
-- Features:
--   - Meeting types (OAC, subcontractor, safety, progress, etc.)
--   - Attendee tracking
--   - Action items with due dates and assignments
--   - Links to RFIs, submittals, change orders created from meetings

-- =============================================
-- ENUM TYPES
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
    CREATE TYPE meeting_type AS ENUM (
      'oac',               -- Owner/Architect/Contractor
      'subcontractor',     -- Subcontractor coordination
      'safety',            -- Safety meeting
      'progress',          -- Progress meeting
      'preconstruction',   -- Preconstruction meeting
      'kickoff',           -- Project kickoff
      'closeout',          -- Closeout meeting
      'weekly',            -- Weekly coordination
      'schedule',          -- Schedule review
      'budget',            -- Budget review
      'quality',           -- Quality control
      'design',            -- Design coordination
      'other'              -- Other meeting type
    );
  END IF;
END $$;

COMMENT ON TYPE meeting_type IS 'Types of construction project meetings';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status') THEN
    CREATE TYPE meeting_status AS ENUM (
      'scheduled',         -- Meeting scheduled
      'in_progress',       -- Meeting in progress
      'completed',         -- Meeting completed, minutes pending
      'minutes_draft',     -- Minutes drafted
      'minutes_distributed', -- Minutes distributed
      'cancelled'          -- Meeting cancelled
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_item_status') THEN
    CREATE TYPE action_item_status AS ENUM (
      'open',              -- Action item open
      'in_progress',       -- Being worked on
      'completed',         -- Completed
      'deferred',          -- Deferred to future meeting
      'cancelled'          -- Cancelled
    );
  END IF;
END $$;

-- =============================================
-- MEETINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Meeting identification
  meeting_number INTEGER,
  meeting_type meeting_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Date/Time
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,

  -- Location
  location TEXT,
  location_type VARCHAR(20) DEFAULT 'in_person', -- in_person, virtual, hybrid
  virtual_link TEXT,

  -- Organizer
  organizer_id UUID REFERENCES users(id),

  -- Status
  status meeting_status DEFAULT 'scheduled',

  -- Meeting content
  agenda TEXT,
  notes TEXT,
  decisions TEXT,

  -- Document reference
  minutes_document_url TEXT,
  minutes_pdf_url TEXT,
  minutes_distributed_at TIMESTAMPTZ,

  -- Related to previous meeting
  previous_meeting_id UUID REFERENCES meetings(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Unique meeting number per project
  UNIQUE (project_id, meeting_number)
);

-- Add columns to meetings if table already exists but columns are missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'company_id') THEN
    ALTER TABLE meetings ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'project_id') THEN
    ALTER TABLE meetings ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'meeting_type') THEN
    ALTER TABLE meetings ADD COLUMN meeting_type meeting_type;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'title') THEN
    ALTER TABLE meetings ADD COLUMN title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'meeting_date') THEN
    ALTER TABLE meetings ADD COLUMN meeting_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'start_time') THEN
    ALTER TABLE meetings ADD COLUMN start_time TIME;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'location') THEN
    ALTER TABLE meetings ADD COLUMN location TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'status') THEN
    ALTER TABLE meetings ADD COLUMN status meeting_status DEFAULT 'scheduled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'organizer_id') THEN
    ALTER TABLE meetings ADD COLUMN organizer_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'deleted_at') THEN
    ALTER TABLE meetings ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================
-- MEETING ATTENDEES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- Attendee info (can be user or external)
  user_id UUID REFERENCES users(id),
  attendee_name TEXT NOT NULL,
  attendee_email TEXT,
  attendee_company TEXT,
  attendee_role TEXT,

  -- Attendance status
  attendance_status VARCHAR(20) DEFAULT 'invited', -- invited, confirmed, attended, absent, excused
  rsvp_response VARCHAR(20), -- yes, no, maybe, pending
  rsvp_at TIMESTAMPTZ,

  -- Notes about attendee
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if table already exists but columns missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_attendees' AND column_name = 'attendee_email') THEN
    ALTER TABLE meeting_attendees ADD COLUMN attendee_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_attendees' AND column_name = 'user_id') THEN
    ALTER TABLE meeting_attendees ADD COLUMN user_id UUID REFERENCES users(id);
  END IF;
END $$;

-- Prevent duplicate user attendees per meeting
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_attendees_user_unique
  ON meeting_attendees(meeting_id, user_id)
  WHERE user_id IS NOT NULL;

-- Prevent duplicate external (email) attendees per meeting
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_attendees_email_unique
  ON meeting_attendees(meeting_id, attendee_email)
  WHERE user_id IS NULL AND attendee_email IS NOT NULL;

-- =============================================
-- MEETING ACTION ITEMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Action item identification
  item_number INTEGER,
  description TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal', -- low, normal, high, critical

  -- Assignment
  assigned_to_user_id UUID REFERENCES users(id),
  assigned_to_name TEXT,
  assigned_to_company TEXT,

  -- Dates
  due_date DATE,
  completed_date DATE,

  -- Status
  status action_item_status DEFAULT 'open',

  -- Related items (items created from this action)
  related_rfi_id UUID REFERENCES rfis(id),
  related_submittal_id UUID REFERENCES submittals(id),
  related_change_order_id UUID, -- References change_orders if exists

  -- Carry forward tracking
  carried_from_meeting_id UUID REFERENCES meetings(id),
  carried_to_meeting_id UUID REFERENCES meetings(id),

  -- Notes
  notes TEXT,
  completion_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Add columns to meeting_action_items if table already exists but columns are missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'company_id') THEN
    ALTER TABLE meeting_action_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'project_id') THEN
    ALTER TABLE meeting_action_items ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'meeting_id') THEN
    ALTER TABLE meeting_action_items ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'item_number') THEN
    ALTER TABLE meeting_action_items ADD COLUMN item_number INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'description') THEN
    ALTER TABLE meeting_action_items ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'priority') THEN
    ALTER TABLE meeting_action_items ADD COLUMN priority VARCHAR(10) DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'assigned_to_user_id') THEN
    ALTER TABLE meeting_action_items ADD COLUMN assigned_to_user_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'assigned_to_name') THEN
    ALTER TABLE meeting_action_items ADD COLUMN assigned_to_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'status') THEN
    ALTER TABLE meeting_action_items ADD COLUMN status action_item_status DEFAULT 'open';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'due_date') THEN
    ALTER TABLE meeting_action_items ADD COLUMN due_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'deleted_at') THEN
    ALTER TABLE meeting_action_items ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================
-- MEETING ATTACHMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS meeting_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- File info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  -- Attachment type
  attachment_type VARCHAR(30) DEFAULT 'general', -- agenda, minutes, presentation, handout, photo, general

  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEETING AGENDA ITEMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- Item details
  item_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,

  -- Presenter
  presenter_name TEXT,
  presenter_id UUID REFERENCES users(id),

  -- Sort order
  sort_order INTEGER DEFAULT 0,

  -- Discussion notes (filled during meeting)
  discussion_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_meetings_company ON meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_not_deleted ON meetings(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user ON meeting_attendees(user_id);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_project ON meeting_action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assigned ON meeting_action_items(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_status ON meeting_action_items(status);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_due ON meeting_action_items(due_date) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_meeting_attachments_meeting ON meeting_attachments(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting ON meeting_agenda_items(meeting_id);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_attendees_updated_at ON meeting_attendees;
CREATE TRIGGER update_meeting_attendees_updated_at
  BEFORE UPDATE ON meeting_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_action_items_updated_at ON meeting_action_items;
CREATE TRIGGER update_meeting_action_items_updated_at
  BEFORE UPDATE ON meeting_action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_agenda_items_updated_at ON meeting_agenda_items;
CREATE TRIGGER update_meeting_agenda_items_updated_at
  BEFORE UPDATE ON meeting_agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MEETING NUMBER GENERATION
-- =============================================

CREATE OR REPLACE FUNCTION get_next_meeting_number(
  p_project_id UUID,
  p_meeting_type meeting_type
)
RETURNS INTEGER AS $$
DECLARE
  v_next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(meeting_number), 0) + 1
  INTO v_next_num
  FROM meetings
  WHERE project_id = p_project_id
    AND meeting_type = p_meeting_type;

  RETURN v_next_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;

-- Meetings policies
CREATE POLICY "Users can view meetings in their company"
  ON meetings FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage meetings in their company"
  ON meetings FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Attendees policies
CREATE POLICY "Users can view attendees in their meetings"
  ON meeting_attendees FOR SELECT
  USING (meeting_id IN (
    SELECT id FROM meetings WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage attendees in their meetings"
  ON meeting_attendees FOR ALL
  USING (meeting_id IN (
    SELECT id FROM meetings WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

-- Action items policies
CREATE POLICY "Users can view action items in their company"
  ON meeting_action_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage action items in their company"
  ON meeting_action_items FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Attachments policies
CREATE POLICY "Users can view attachments in their meetings"
  ON meeting_attachments FOR SELECT
  USING (meeting_id IN (
    SELECT id FROM meetings WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage attachments in their meetings"
  ON meeting_attachments FOR ALL
  USING (meeting_id IN (
    SELECT id FROM meetings WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

-- Agenda items policies
CREATE POLICY "Users can view agenda in their meetings"
  ON meeting_agenda_items FOR SELECT
  USING (meeting_id IN (
    SELECT id FROM meetings WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage agenda in their meetings"
  ON meeting_agenda_items FOR ALL
  USING (meeting_id IN (
    SELECT id FROM meetings WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

-- =============================================
-- VIEWS
-- =============================================

-- Drop existing views first to avoid column mismatch issues
DROP VIEW IF EXISTS upcoming_meetings CASCADE;
DROP VIEW IF EXISTS open_action_items CASCADE;

-- Upcoming meetings view (only created if required columns exist)
DO $$
BEGIN
  -- Only create view if all required columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'title')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'meeting_date')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'meeting_type')
  THEN
    EXECUTE '
      CREATE OR REPLACE VIEW upcoming_meetings AS
      SELECT
        m.id,
        m.project_id,
        m.meeting_type,
        m.title,
        m.meeting_date,
        m.start_time,
        m.location,
        m.status,
        p.name as project_name,
        org.full_name as organizer_name,
        (SELECT COUNT(*) FROM meeting_attendees ma WHERE ma.meeting_id = m.id AND ma.attendance_status = ''confirmed'') as confirmed_count,
        (SELECT COUNT(*) FROM meeting_action_items mai WHERE mai.meeting_id = m.id AND mai.status = ''open'') as open_action_items
      FROM meetings m
      JOIN projects p ON m.project_id = p.id
      LEFT JOIN users org ON m.organizer_id = org.id
      WHERE m.deleted_at IS NULL
        AND m.meeting_date >= CURRENT_DATE
        AND m.status NOT IN (''completed'', ''minutes_distributed'', ''cancelled'')
      ORDER BY m.meeting_date, m.start_time
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'upcoming_meetings') THEN
    EXECUTE 'COMMENT ON VIEW upcoming_meetings IS ''View of upcoming scheduled meetings''';
  END IF;
END $$;

-- Open action items view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_action_items' AND column_name = 'item_number')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'title')
  THEN
    EXECUTE '
      CREATE OR REPLACE VIEW open_action_items AS
      SELECT
        mai.id,
        mai.meeting_id,
        mai.project_id,
        mai.item_number,
        mai.description,
        mai.priority,
        mai.assigned_to_name,
        mai.due_date,
        mai.status,
        m.title as meeting_title,
        m.meeting_date,
        p.name as project_name,
        CASE
          WHEN mai.due_date < CURRENT_DATE THEN ''overdue''
          WHEN mai.due_date = CURRENT_DATE THEN ''due_today''
          WHEN mai.due_date <= CURRENT_DATE + 7 THEN ''due_soon''
          ELSE ''on_track''
        END as urgency
      FROM meeting_action_items mai
      JOIN meetings m ON mai.meeting_id = m.id
      JOIN projects p ON mai.project_id = p.id
      WHERE mai.deleted_at IS NULL
        AND mai.status IN (''open'', ''in_progress'')
      ORDER BY mai.due_date, mai.priority DESC
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'open_action_items') THEN
    EXECUTE 'COMMENT ON VIEW open_action_items IS ''View of all open action items across meetings''';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE meetings IS 'Construction project meetings (OAC, subcontractor, safety, etc.)';
COMMENT ON TABLE meeting_attendees IS 'Attendees for each meeting';
COMMENT ON TABLE meeting_action_items IS 'Action items generated from meetings';
COMMENT ON TABLE meeting_attachments IS 'Documents attached to meetings';
COMMENT ON TABLE meeting_agenda_items IS 'Agenda items for meetings';
