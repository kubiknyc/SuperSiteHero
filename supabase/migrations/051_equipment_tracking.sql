-- Migration: 051_equipment_tracking.sql
-- Description: Equipment tracking tables for construction equipment management
-- Date: 2025-12-05

-- =============================================
-- TABLE: equipment
-- Master equipment list with specifications
-- =============================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Equipment Identification
  equipment_number VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Equipment Type
  equipment_type VARCHAR(50) NOT NULL,  -- excavator, loader, crane, forklift, truck, generator, etc.
  category VARCHAR(50),  -- earthmoving, lifting, transport, power, etc.

  -- Specifications
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  serial_number VARCHAR(100),
  vin VARCHAR(50),

  -- Ownership
  ownership_type VARCHAR(20) DEFAULT 'owned',  -- owned, rented, leased
  owner_company VARCHAR(255),  -- If rented/leased, who owns it
  rental_rate DECIMAL(10, 2),  -- Daily or hourly rate if rented
  rental_rate_type VARCHAR(20),  -- daily, hourly, weekly, monthly

  -- Capacity/Specs
  capacity VARCHAR(100),  -- e.g., "2.5 ton", "50 HP", "100 kW"
  operating_weight VARCHAR(50),
  dimensions VARCHAR(100),

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'available',  -- available, in_use, maintenance, out_of_service
  current_location VARCHAR(255),
  current_project_id UUID REFERENCES projects(id),

  -- Meter/Hours Tracking
  current_hours DECIMAL(10, 2) DEFAULT 0,
  current_miles DECIMAL(10, 2) DEFAULT 0,

  -- Costs
  purchase_price DECIMAL(12, 2),
  purchase_date DATE,
  hourly_cost DECIMAL(10, 2),  -- Internal cost rate
  fuel_type VARCHAR(20),  -- diesel, gasoline, electric, hybrid

  -- Insurance & Registration
  insurance_policy VARCHAR(100),
  insurance_expiry DATE,
  registration_number VARCHAR(50),
  registration_expiry DATE,

  -- Certifications Required
  requires_certified_operator BOOLEAN DEFAULT false,
  certification_type VARCHAR(100),

  -- Image
  image_url TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(company_id, equipment_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_company_id ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_equipment_type ON equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_current_project_id ON equipment(current_project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_deleted_at ON equipment(deleted_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view equipment for their company" ON equipment;
CREATE POLICY "Users can view equipment for their company" ON equipment
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert equipment for their company" ON equipment;
CREATE POLICY "Users can insert equipment for their company" ON equipment
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update equipment for their company" ON equipment;
CREATE POLICY "Users can update equipment for their company" ON equipment
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- TABLE: equipment_assignments
-- Equipment assigned to projects
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Assignment Period
  assigned_date DATE NOT NULL,
  expected_return_date DATE,
  actual_return_date DATE,

  -- Reason
  assignment_reason TEXT,

  -- Rates (can override equipment default)
  daily_rate DECIMAL(10, 2),
  hourly_rate DECIMAL(10, 2),

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'active',  -- active, completed, cancelled

  -- Assigned By
  assigned_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment_id ON equipment_assignments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_project_id ON equipment_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_status ON equipment_assignments(status);
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assigned_date ON equipment_assignments(assigned_date);

-- Trigger
DROP TRIGGER IF EXISTS update_equipment_assignments_updated_at ON equipment_assignments;
CREATE TRIGGER update_equipment_assignments_updated_at BEFORE UPDATE ON equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE equipment_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view equipment assignments for their company" ON equipment_assignments;
CREATE POLICY "Users can view equipment assignments for their company" ON equipment_assignments
  FOR SELECT
  USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert equipment assignments" ON equipment_assignments;
CREATE POLICY "Users can insert equipment assignments" ON equipment_assignments
  FOR INSERT
  WITH CHECK (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update equipment assignments" ON equipment_assignments;
CREATE POLICY "Users can update equipment assignments" ON equipment_assignments
  FOR UPDATE
  USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: equipment_logs
-- Daily usage logs for equipment
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),

  -- Log Date
  log_date DATE NOT NULL,

  -- Usage Metrics
  hours_used DECIMAL(5, 2) DEFAULT 0,
  miles_driven DECIMAL(8, 2) DEFAULT 0,
  fuel_used DECIMAL(8, 2) DEFAULT 0,  -- Gallons or liters
  fuel_cost DECIMAL(10, 2),

  -- Readings
  start_hours DECIMAL(10, 2),
  end_hours DECIMAL(10, 2),
  start_miles DECIMAL(10, 2),
  end_miles DECIMAL(10, 2),

  -- Operator
  operator_id UUID REFERENCES users(id),
  operator_name VARCHAR(255),

  -- Work Performed
  work_description TEXT,
  location VARCHAR(255),

  -- Condition
  condition_notes TEXT,
  reported_issues TEXT,

  -- Idle Time
  idle_hours DECIMAL(5, 2) DEFAULT 0,

  -- Daily Report Reference
  daily_report_id UUID REFERENCES daily_reports(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_logs_equipment_id ON equipment_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_project_id ON equipment_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_log_date ON equipment_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_operator_id ON equipment_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_daily_report_id ON equipment_logs(daily_report_id);

-- Trigger
DROP TRIGGER IF EXISTS update_equipment_logs_updated_at ON equipment_logs;
CREATE TRIGGER update_equipment_logs_updated_at BEFORE UPDATE ON equipment_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view equipment logs for their company" ON equipment_logs;
CREATE POLICY "Users can view equipment logs for their company" ON equipment_logs
  FOR SELECT
  USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert equipment logs" ON equipment_logs;
CREATE POLICY "Users can insert equipment logs" ON equipment_logs
  FOR INSERT
  WITH CHECK (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update equipment logs" ON equipment_logs;
CREATE POLICY "Users can update equipment logs" ON equipment_logs
  FOR UPDATE
  USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: equipment_maintenance
-- Maintenance and service records
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,

  -- Maintenance Type
  maintenance_type VARCHAR(50) NOT NULL,  -- preventive, repair, inspection, service

  -- Schedule (for preventive)
  scheduled_date DATE,
  due_hours DECIMAL(10, 2),  -- Hours at which maintenance is due
  due_miles DECIMAL(10, 2),

  -- Completion
  completed_date DATE,
  completed_hours DECIMAL(10, 2),
  completed_miles DECIMAL(10, 2),

  -- Details
  description TEXT NOT NULL,
  work_performed TEXT,

  -- Service Provider
  service_provider VARCHAR(255),
  technician_name VARCHAR(255),

  -- Cost
  labor_cost DECIMAL(10, 2),
  parts_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),

  -- Parts Used
  parts_used JSONB DEFAULT '[]'::jsonb,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled',  -- scheduled, in_progress, completed, cancelled

  -- Downtime
  downtime_hours DECIMAL(6, 2),

  -- Documents
  invoice_number VARCHAR(100),
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Next Service
  next_service_date DATE,
  next_service_hours DECIMAL(10, 2),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_maintenance_type ON equipment_maintenance(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_status ON equipment_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_scheduled_date ON equipment_maintenance(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_completed_date ON equipment_maintenance(completed_date);

-- Trigger
DROP TRIGGER IF EXISTS update_equipment_maintenance_updated_at ON equipment_maintenance;
CREATE TRIGGER update_equipment_maintenance_updated_at BEFORE UPDATE ON equipment_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view equipment maintenance for their company" ON equipment_maintenance;
CREATE POLICY "Users can view equipment maintenance for their company" ON equipment_maintenance
  FOR SELECT
  USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert equipment maintenance" ON equipment_maintenance;
CREATE POLICY "Users can insert equipment maintenance" ON equipment_maintenance
  FOR INSERT
  WITH CHECK (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update equipment maintenance" ON equipment_maintenance;
CREATE POLICY "Users can update equipment maintenance" ON equipment_maintenance
  FOR UPDATE
  USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: equipment_inspections
-- Pre-operation and periodic inspections
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),

  -- Inspection Info
  inspection_type VARCHAR(50) NOT NULL,  -- pre_operation, daily, weekly, monthly, annual
  inspection_date DATE NOT NULL,

  -- Inspector
  inspector_id UUID REFERENCES users(id),
  inspector_name VARCHAR(255),

  -- Results
  overall_status VARCHAR(30) NOT NULL,  -- pass, fail, needs_attention
  checklist_items JSONB DEFAULT '[]'::jsonb,  -- Array of {item, status, notes}

  -- Meter Readings
  hours_reading DECIMAL(10, 2),
  miles_reading DECIMAL(10, 2),

  -- Issues Found
  issues_found TEXT,
  corrective_actions TEXT,

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,

  -- Signature
  signature_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_equipment_id ON equipment_inspections(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_project_id ON equipment_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_inspection_date ON equipment_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_overall_status ON equipment_inspections(overall_status);

-- Enable RLS
ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view equipment inspections for their company" ON equipment_inspections;
CREATE POLICY "Users can view equipment inspections for their company" ON equipment_inspections
  FOR SELECT
  USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert equipment inspections" ON equipment_inspections;
CREATE POLICY "Users can insert equipment inspections" ON equipment_inspections
  FOR INSERT
  WITH CHECK (
    equipment_id IN (
      SELECT id FROM equipment WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- FUNCTION: update_equipment_hours
-- Update equipment hours from log entries
-- =============================================
CREATE OR REPLACE FUNCTION update_equipment_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the equipment's current hours and miles
  IF NEW.end_hours IS NOT NULL THEN
    UPDATE equipment
    SET current_hours = NEW.end_hours
    WHERE id = NEW.equipment_id;
  END IF;

  IF NEW.end_miles IS NOT NULL THEN
    UPDATE equipment
    SET current_miles = NEW.end_miles
    WHERE id = NEW.equipment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_equipment_hours ON equipment_logs;
CREATE TRIGGER trigger_update_equipment_hours
  AFTER INSERT OR UPDATE ON equipment_logs
  FOR EACH ROW EXECUTE FUNCTION update_equipment_hours();

-- =============================================
-- VIEW: equipment_summary
-- Equipment with utilization stats
-- =============================================
CREATE OR REPLACE VIEW equipment_summary AS
SELECT
  e.*,
  -- Total hours logged this month
  COALESCE((
    SELECT SUM(hours_used)
    FROM equipment_logs el
    WHERE el.equipment_id = e.id
      AND el.log_date >= date_trunc('month', CURRENT_DATE)
  ), 0) as hours_this_month,
  -- Total hours logged this year
  COALESCE((
    SELECT SUM(hours_used)
    FROM equipment_logs el
    WHERE el.equipment_id = e.id
      AND el.log_date >= date_trunc('year', CURRENT_DATE)
  ), 0) as hours_this_year,
  -- Days since last maintenance (date subtraction returns integer directly)
  (
    SELECT (CURRENT_DATE - MAX(completed_date)::date)::INTEGER
    FROM equipment_maintenance em
    WHERE em.equipment_id = e.id
      AND em.status = 'completed'
  ) as days_since_maintenance,
  -- Next scheduled maintenance date
  (
    SELECT MIN(scheduled_date)
    FROM equipment_maintenance em
    WHERE em.equipment_id = e.id
      AND em.status = 'scheduled'
      AND em.scheduled_date >= CURRENT_DATE
  ) as next_maintenance_date,
  -- Active assignment
  (
    SELECT project_id
    FROM equipment_assignments ea
    WHERE ea.equipment_id = e.id
      AND ea.status = 'active'
    LIMIT 1
  ) as active_assignment_project_id
FROM equipment e
WHERE e.deleted_at IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 051_equipment_tracking completed successfully';
END $$;
