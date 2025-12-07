-- Migration 053: Meeting Enhancements
-- Adds structured notes, action items, attendees, and attachments to meetings

-- =============================================================================
-- MEETING NOTES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- Note content
  section_title VARCHAR(255),
  content TEXT NOT NULL,
  note_order INTEGER DEFAULT 0,

  -- Note type
  note_type VARCHAR(50) DEFAULT 'general', -- general, decision, discussion, agenda_item

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- MEETING ACTION ITEMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- Action item details
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent

  -- Assignment
  assignee_id UUID REFERENCES auth.users(id),
  assignee_name VARCHAR(255),
  assignee_company VARCHAR(255),

  -- Due date
  due_date DATE,
  completed_date DATE,

  -- Link to task (if converted)
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Ordering
  item_order INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- MEETING ATTENDEES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- Attendee (can be user or external)
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  company VARCHAR(255),
  role VARCHAR(100), -- Project Manager, Superintendent, etc.

  -- Attendance tracking
  attendance_status VARCHAR(50) DEFAULT 'invited', -- invited, confirmed, declined, attended, absent
  response_date TIMESTAMPTZ,
  attended BOOLEAN,
  arrival_time TIME,
  departure_time TIME,

  -- Required attendee flag
  is_required BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MEETING ATTACHMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meeting_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),

  -- Attachment type
  attachment_type VARCHAR(50) DEFAULT 'document', -- agenda, minutes, document, presentation

  -- Description
  description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- MEETING TEMPLATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_type VARCHAR(100),

  -- Default values
  default_duration INTEGER DEFAULT 60, -- minutes
  default_location TEXT,

  -- Template content
  agenda_template TEXT,
  notes_template JSONB, -- Array of section templates
  default_action_items JSONB, -- Array of default action item templates

  -- Active flag
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- UPDATE MEETINGS TABLE
-- =============================================================================

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Minutes/notes text field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'minutes_text') THEN
    ALTER TABLE meetings ADD COLUMN minutes_text TEXT;
  END IF;

  -- Minutes published flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'minutes_published') THEN
    ALTER TABLE meetings ADD COLUMN minutes_published BOOLEAN DEFAULT false;
  END IF;

  -- Minutes published date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'minutes_published_at') THEN
    ALTER TABLE meetings ADD COLUMN minutes_published_at TIMESTAMPTZ;
  END IF;

  -- Minutes published by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'minutes_published_by') THEN
    ALTER TABLE meetings ADD COLUMN minutes_published_by UUID REFERENCES auth.users(id);
  END IF;

  -- Template used
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'template_id') THEN
    ALTER TABLE meetings ADD COLUMN template_id UUID REFERENCES meeting_templates(id);
  END IF;

  -- Recurring meeting info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'is_recurring') THEN
    ALTER TABLE meetings ADD COLUMN is_recurring BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'recurrence_rule') THEN
    ALTER TABLE meetings ADD COLUMN recurrence_rule VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'meetings' AND column_name = 'parent_meeting_id') THEN
    ALTER TABLE meetings ADD COLUMN parent_meeting_id UUID REFERENCES meetings(id);
  END IF;
END $$;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_id ON meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_id ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assignee_id ON meeting_action_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_status ON meeting_action_items(status);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_due_date ON meeting_action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attachments_meeting_id ON meeting_attachments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_templates_company_id ON meeting_templates(company_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;

-- Meeting Notes Policies
DROP POLICY IF EXISTS "Users can view meeting notes for meetings they can access" ON meeting_notes;
DROP POLICY IF EXISTS "Users can create meeting notes for their meetings" ON meeting_notes;
DROP POLICY IF EXISTS "Users can update meeting notes they created" ON meeting_notes;
DROP POLICY IF EXISTS "Users can delete meeting notes they created" ON meeting_notes;

CREATE POLICY "Users can view meeting notes for meetings they can access"
  ON meeting_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_notes.meeting_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM meeting_attendees ma
        WHERE ma.meeting_id = m.id AND ma.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can create meeting notes for their meetings"
  ON meeting_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_notes.meeting_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can update meeting notes they created"
  ON meeting_notes FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_notes.meeting_id AND m.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete meeting notes they created"
  ON meeting_notes FOR DELETE
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_notes.meeting_id AND m.created_by = auth.uid()
  ));

-- Meeting Action Items Policies
DROP POLICY IF EXISTS "Users can view action items for meetings they can access" ON meeting_action_items;
DROP POLICY IF EXISTS "Users can create action items for their meetings" ON meeting_action_items;
DROP POLICY IF EXISTS "Users can update action items they created or are assigned to" ON meeting_action_items;
DROP POLICY IF EXISTS "Users can delete action items they created" ON meeting_action_items;

CREATE POLICY "Users can view action items for meetings they can access"
  ON meeting_action_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_action_items.meeting_id
    AND (
      m.created_by = auth.uid()
      OR assignee_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM meeting_attendees ma
        WHERE ma.meeting_id = m.id AND ma.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can create action items for their meetings"
  ON meeting_action_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_action_items.meeting_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can update action items they created or are assigned to"
  ON meeting_action_items FOR UPDATE
  USING (
    created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM meetings m WHERE m.id = meeting_action_items.meeting_id AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete action items they created"
  ON meeting_action_items FOR DELETE
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_action_items.meeting_id AND m.created_by = auth.uid()
  ));

-- Meeting Attendees Policies
DROP POLICY IF EXISTS "Users can view attendees for meetings they can access" ON meeting_attendees;
DROP POLICY IF EXISTS "Users can manage attendees for meetings they created" ON meeting_attendees;
DROP POLICY IF EXISTS "Users can update their own attendance or meeting they created" ON meeting_attendees;
DROP POLICY IF EXISTS "Users can remove attendees from meetings they created" ON meeting_attendees;

CREATE POLICY "Users can view attendees for meetings they can access"
  ON meeting_attendees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_attendees.meeting_id
    AND (
      m.created_by = auth.uid()
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can manage attendees for meetings they created"
  ON meeting_attendees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_attendees.meeting_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can update their own attendance or meeting they created"
  ON meeting_attendees FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM meetings m WHERE m.id = meeting_attendees.meeting_id AND m.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Meeting creators can delete attendees" ON meeting_attendees;

CREATE POLICY "Meeting creators can delete attendees"
  ON meeting_attendees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_attendees.meeting_id AND m.created_by = auth.uid()
  ));

-- Meeting Attachments Policies
DROP POLICY IF EXISTS "Users can view attachments for meetings they can access" ON meeting_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to their meetings" ON meeting_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON meeting_attachments;

CREATE POLICY "Users can view attachments for meetings they can access"
  ON meeting_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_attachments.meeting_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM meeting_attendees ma
        WHERE ma.meeting_id = m.id AND ma.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can upload attachments to their meetings"
  ON meeting_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_attachments.meeting_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.project_id = m.project_id AND pu.user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can delete their own attachments"
  ON meeting_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_attachments.meeting_id AND m.created_by = auth.uid()
  ));

-- Meeting Templates Policies
DROP POLICY IF EXISTS "Users can view templates for their company" ON meeting_templates;
DROP POLICY IF EXISTS "Users can create templates for their company" ON meeting_templates;
DROP POLICY IF EXISTS "Users can update templates they created" ON meeting_templates;
DROP POLICY IF EXISTS "Users can delete templates they created" ON meeting_templates;

CREATE POLICY "Users can view templates for their company"
  ON meeting_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.company_id = meeting_templates.company_id
  ));

CREATE POLICY "Users can create templates for their company"
  ON meeting_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.company_id = meeting_templates.company_id
  ));

CREATE POLICY "Users can update templates they created"
  ON meeting_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete templates they created"
  ON meeting_templates FOR DELETE
  USING (created_by = auth.uid());

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
DROP TRIGGER IF EXISTS update_meeting_notes_updated_at ON meeting_notes;
CREATE TRIGGER update_meeting_notes_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_action_items_updated_at ON meeting_action_items;
CREATE TRIGGER update_meeting_action_items_updated_at
  BEFORE UPDATE ON meeting_action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_templates_updated_at ON meeting_templates;
CREATE TRIGGER update_meeting_templates_updated_at
  BEFORE UPDATE ON meeting_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE meeting_notes IS 'Structured meeting notes with sections';
COMMENT ON TABLE meeting_action_items IS 'Action items from meetings with assignment and tracking';
COMMENT ON TABLE meeting_attendees IS 'Meeting attendees with attendance tracking';
COMMENT ON TABLE meeting_attachments IS 'Meeting attachments (agendas, minutes, documents)';
COMMENT ON TABLE meeting_templates IS 'Reusable meeting templates with default agenda and action items';
