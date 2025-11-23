-- Migration: 007_tasks_and_checklists.sql
-- Description: Create tasks, schedule, and checklists tables
-- Date: 2025-01-19

-- =============================================
-- TABLE: tasks
-- =============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Task Info
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Assignment
  assigned_to_type VARCHAR(50),
  assigned_to_user_id UUID REFERENCES users(id),
  assigned_to_subcontractor_id UUID REFERENCES subcontractors(id),

  -- Dates
  due_date DATE,
  start_date DATE,
  completed_date DATE,

  -- Status & Priority
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'normal',

  -- Parent Task
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  -- Related Items
  related_to_type VARCHAR(50),
  related_to_id UUID,

  -- Location
  location VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_assigned_to_subcontractor_id ON tasks(assigned_to_subcontractor_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);

-- Trigger
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: schedule_items
-- =============================================
CREATE TABLE schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Schedule Item Info
  task_id VARCHAR(100),
  task_name VARCHAR(255) NOT NULL,
  wbs VARCHAR(100),

  -- Dates
  start_date DATE,
  finish_date DATE,
  baseline_start_date DATE,
  baseline_finish_date DATE,

  -- Duration
  duration_days INTEGER,
  percent_complete DECIMAL(5, 2) DEFAULT 0.00,

  -- Dependencies
  predecessors VARCHAR(255),
  successors VARCHAR(255),

  -- Critical Path
  is_critical BOOLEAN DEFAULT false,

  -- Assignment
  assigned_to VARCHAR(255),

  -- Metadata
  imported_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_items_project_id ON schedule_items(project_id);
CREATE INDEX idx_schedule_items_task_id ON schedule_items(task_id);
CREATE INDEX idx_schedule_items_is_critical ON schedule_items(is_critical);

-- Enable RLS
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: checklist_templates
-- =============================================
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  -- Template Level
  template_level VARCHAR(50) NOT NULL,

  -- Template Items
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_checklist_templates_company_id ON checklist_templates(company_id);
CREATE INDEX idx_checklist_templates_category ON checklist_templates(category);
CREATE INDEX idx_checklist_templates_template_level ON checklist_templates(template_level);
CREATE INDEX idx_checklist_templates_deleted_at ON checklist_templates(deleted_at);

-- Trigger
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: checklists
-- =============================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,

  -- Checklist Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  -- Items
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Completion
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),

  -- Link to daily report
  daily_report_id UUID REFERENCES daily_reports(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_checklists_project_id ON checklists(project_id);
CREATE INDEX idx_checklists_checklist_template_id ON checklists(checklist_template_id);
CREATE INDEX idx_checklists_is_completed ON checklists(is_completed);
CREATE INDEX idx_checklists_daily_report_id ON checklists(daily_report_id);
CREATE INDEX idx_checklists_deleted_at ON checklists(deleted_at);

-- Trigger
CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 007_tasks_and_checklists completed successfully';
END $$;