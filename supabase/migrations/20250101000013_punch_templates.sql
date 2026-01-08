-- Migration: 089_punch_templates.sql
-- Description: Create punch item templates and trade-specific deficiencies
-- Date: 2025-01-02

-- =============================================
-- TABLE: punch_item_templates
-- =============================================
-- Trade-specific punch item templates for quick creation
CREATE TABLE punch_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization (optional, null means system-wide)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trade Association
  trade VARCHAR(100) NOT NULL,
  trade_category VARCHAR(100),

  -- Template Content
  default_title VARCHAR(255) NOT NULL,
  default_description TEXT,
  default_priority VARCHAR(50) DEFAULT 'normal',

  -- CSI Division (optional)
  csi_division VARCHAR(10),
  csi_section VARCHAR(20),

  -- Template metadata
  is_system_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,

  -- Sorting/Organization
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Tags for searchability
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_punch_item_templates_organization ON punch_item_templates(organization_id);
CREATE INDEX idx_punch_item_templates_trade ON punch_item_templates(trade);
CREATE INDEX idx_punch_item_templates_trade_category ON punch_item_templates(trade_category);
CREATE INDEX idx_punch_item_templates_csi ON punch_item_templates(csi_division, csi_section);
CREATE INDEX idx_punch_item_templates_is_active ON punch_item_templates(is_active);
CREATE INDEX idx_punch_item_templates_tags ON punch_item_templates USING GIN(tags);
CREATE INDEX idx_punch_item_templates_deleted_at ON punch_item_templates(deleted_at);

-- Full text search on template name and description
CREATE INDEX idx_punch_item_templates_search ON punch_item_templates
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || default_title));

-- Trigger
CREATE TRIGGER update_punch_item_templates_updated_at
  BEFORE UPDATE ON punch_item_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE punch_item_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "punch_item_templates_read_policy" ON punch_item_templates
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_system_template = true OR
      organization_id IS NULL OR
      organization_id IN (
        SELECT organization_id FROM project_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "punch_item_templates_insert_policy" ON punch_item_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    is_system_template = false
  );

CREATE POLICY "punch_item_templates_update_policy" ON punch_item_templates
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    organization_id IN (
      SELECT pu.organization_id FROM project_users pu
      WHERE pu.user_id = auth.uid() AND pu.role IN ('admin', 'project_manager')
    )
  );

-- =============================================
-- TABLE: punch_template_categories
-- =============================================
-- Organize templates into categories by trade
CREATE TABLE punch_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Trade this category belongs to
  trade VARCHAR(100) NOT NULL,

  -- Category Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),

  -- Sorting
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_punch_template_categories_trade ON punch_template_categories(trade);
CREATE INDEX idx_punch_template_categories_deleted_at ON punch_template_categories(deleted_at);

-- Enable RLS
ALTER TABLE punch_template_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "punch_template_categories_read_policy" ON punch_template_categories
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- =============================================
-- TABLE: punch_item_inspection_links
-- =============================================
-- Links punch items to their source inspections
CREATE TABLE punch_item_inspection_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core References
  punch_item_id UUID NOT NULL REFERENCES punch_items(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  -- Link Details
  inspection_item_id UUID, -- Specific checklist item that failed
  failure_reason TEXT,
  auto_generated BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_punch_inspection_links_punch ON punch_item_inspection_links(punch_item_id);
CREATE INDEX idx_punch_inspection_links_inspection ON punch_item_inspection_links(inspection_id);

-- Unique constraint - one punch item per inspection item
CREATE UNIQUE INDEX idx_punch_inspection_unique ON punch_item_inspection_links(inspection_id, inspection_item_id)
  WHERE inspection_item_id IS NOT NULL;

-- Enable RLS
ALTER TABLE punch_item_inspection_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "punch_item_inspection_links_read_policy" ON punch_item_inspection_links
  FOR SELECT TO authenticated
  USING (
    punch_item_id IN (
      SELECT id FROM punch_items WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "punch_item_inspection_links_insert_policy" ON punch_item_inspection_links
  FOR INSERT TO authenticated
  WITH CHECK (
    punch_item_id IN (
      SELECT id FROM punch_items WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: warranty_items
-- =============================================
-- Warranty tracking for completed punch items
CREATE TABLE warranty_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Reference
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Source Punch Item (optional)
  source_punch_item_id UUID REFERENCES punch_items(id) ON DELETE SET NULL,

  -- Warranty Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  trade VARCHAR(100),

  -- Location
  building VARCHAR(100),
  floor VARCHAR(100),
  room VARCHAR(100),
  location_notes TEXT,

  -- Warranty Period
  warranty_start_date DATE NOT NULL,
  warranty_end_date DATE NOT NULL,
  warranty_type VARCHAR(100), -- 'standard', 'extended', 'manufacturer', 'workmanship'
  warranty_duration_months INTEGER,

  -- Responsible Party
  subcontractor_id UUID REFERENCES subcontractors(id),
  manufacturer VARCHAR(255),
  contact_info JSONB,

  -- Coverage Details
  coverage_description TEXT,
  exclusions TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'claimed', 'voided'
  claim_count INTEGER DEFAULT 0,

  -- Attachments
  documents JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_warranty_items_project ON warranty_items(project_id);
CREATE INDEX idx_warranty_items_source_punch ON warranty_items(source_punch_item_id);
CREATE INDEX idx_warranty_items_subcontractor ON warranty_items(subcontractor_id);
CREATE INDEX idx_warranty_items_trade ON warranty_items(trade);
CREATE INDEX idx_warranty_items_status ON warranty_items(status);
CREATE INDEX idx_warranty_items_end_date ON warranty_items(warranty_end_date);
CREATE INDEX idx_warranty_items_deleted_at ON warranty_items(deleted_at);

-- Trigger
CREATE TRIGGER update_warranty_items_updated_at
  BEFORE UPDATE ON warranty_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE warranty_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warranty_items_read_policy" ON warranty_items
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warranty_items_insert_policy" ON warranty_items
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "warranty_items_update_policy" ON warranty_items
  FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- TABLE: warranty_claims
-- =============================================
-- Track warranty claims
CREATE TABLE warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent References
  warranty_item_id UUID NOT NULL REFERENCES warranty_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Claim Details
  claim_number VARCHAR(100),
  claim_date DATE NOT NULL,
  description TEXT NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'in_review', 'approved', 'denied', 'resolved'
  resolution_notes TEXT,
  resolved_date DATE,

  -- Resolution
  resolution_type VARCHAR(100), -- 'repair', 'replace', 'refund', 'denied'
  resolution_cost DECIMAL(12, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_warranty_claims_warranty_item ON warranty_claims(warranty_item_id);
CREATE INDEX idx_warranty_claims_project ON warranty_claims(project_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);
CREATE INDEX idx_warranty_claims_deleted_at ON warranty_claims(deleted_at);

-- Trigger
CREATE TRIGGER update_warranty_claims_updated_at
  BEFORE UPDATE ON warranty_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warranty_claims_policy" ON warranty_claims
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL AND
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTION: Increment template usage count
-- =============================================
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE punch_item_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$;

-- =============================================
-- FUNCTION: Create warranty from punch item
-- =============================================
CREATE OR REPLACE FUNCTION create_warranty_from_punch_item(
  p_punch_item_id UUID,
  p_warranty_type VARCHAR DEFAULT 'standard',
  p_duration_months INTEGER DEFAULT 12
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_punch_item RECORD;
  v_warranty_id UUID;
BEGIN
  -- Get punch item details
  SELECT * INTO v_punch_item
  FROM punch_items
  WHERE id = p_punch_item_id AND status = 'verified';

  IF v_punch_item IS NULL THEN
    RAISE EXCEPTION 'Punch item not found or not verified';
  END IF;

  -- Create warranty item
  INSERT INTO warranty_items (
    project_id,
    source_punch_item_id,
    title,
    description,
    trade,
    building,
    floor,
    room,
    location_notes,
    warranty_start_date,
    warranty_end_date,
    warranty_type,
    warranty_duration_months,
    subcontractor_id,
    created_by
  ) VALUES (
    v_punch_item.project_id,
    p_punch_item_id,
    v_punch_item.title,
    v_punch_item.description,
    v_punch_item.trade,
    v_punch_item.building,
    v_punch_item.floor,
    v_punch_item.room,
    v_punch_item.location_notes,
    COALESCE(v_punch_item.verified_date, CURRENT_DATE),
    COALESCE(v_punch_item.verified_date, CURRENT_DATE) + (p_duration_months || ' months')::INTERVAL,
    p_warranty_type,
    p_duration_months,
    v_punch_item.subcontractor_id,
    auth.uid()
  )
  RETURNING id INTO v_warranty_id;

  RETURN v_warranty_id;
END;
$$;

-- =============================================
-- Insert System Templates by Trade
-- =============================================
INSERT INTO punch_item_templates (trade, trade_category, name, default_title, default_description, is_system_template, sort_order, tags)
VALUES
-- Electrical Templates
('Electrical', 'Outlets & Receptacles', 'Missing Cover Plate', 'Missing outlet cover plate', 'Outlet/receptacle cover plate is missing or damaged.', true, 1, ARRAY['outlet', 'cover', 'missing']),
('Electrical', 'Outlets & Receptacles', 'Non-working Outlet', 'Non-working receptacle', 'Electrical outlet is not providing power.', true, 2, ARRAY['outlet', 'power', 'not working']),
('Electrical', 'Outlets & Receptacles', 'Incorrect Outlet Type', 'Incorrect outlet type installed', 'Wrong type of outlet installed for intended use (e.g., should be GFCI).', true, 3, ARRAY['outlet', 'gfci', 'incorrect']),
('Electrical', 'Lighting', 'Light Fixture Not Working', 'Light fixture not operational', 'Light fixture is not functioning properly.', true, 4, ARRAY['light', 'fixture', 'not working']),
('Electrical', 'Lighting', 'Flickering Light', 'Light fixture flickering', 'Light fixture exhibits intermittent flickering.', true, 5, ARRAY['light', 'flicker', 'intermittent']),
('Electrical', 'Lighting', 'Missing Light Fixture', 'Missing light fixture', 'Light fixture not installed per plan.', true, 6, ARRAY['light', 'missing', 'fixture']),
('Electrical', 'Switches', 'Switch Not Working', 'Switch not functioning', 'Light switch does not control the intended fixture.', true, 7, ARRAY['switch', 'not working']),
('Electrical', 'Switches', 'Missing Switch Plate', 'Missing switch cover plate', 'Switch cover plate is missing.', true, 8, ARRAY['switch', 'cover', 'missing']),

-- Plumbing Templates
('Plumbing', 'Fixtures', 'Leaking Faucet', 'Faucet leak detected', 'Faucet is leaking at base or handle.', true, 1, ARRAY['faucet', 'leak', 'water']),
('Plumbing', 'Fixtures', 'Slow Drain', 'Slow drain', 'Drain is slow or partially blocked.', true, 2, ARRAY['drain', 'slow', 'blocked']),
('Plumbing', 'Fixtures', 'Running Toilet', 'Toilet running continuously', 'Toilet continues to run after flushing.', true, 3, ARRAY['toilet', 'running', 'water']),
('Plumbing', 'Fixtures', 'Low Water Pressure', 'Low water pressure', 'Water pressure is below acceptable levels.', true, 4, ARRAY['pressure', 'low', 'water']),
('Plumbing', 'Pipes', 'Pipe Leak', 'Pipe leaking', 'Water leak detected at pipe connection or joint.', true, 5, ARRAY['pipe', 'leak', 'water']),
('Plumbing', 'Pipes', 'Missing Insulation', 'Pipe insulation missing', 'Required pipe insulation is missing.', true, 6, ARRAY['pipe', 'insulation', 'missing']),

-- HVAC Templates
('HVAC', 'Ductwork', 'Air Leak', 'Duct air leak detected', 'Air leak at duct connection or joint.', true, 1, ARRAY['duct', 'air', 'leak']),
('HVAC', 'Ductwork', 'Missing Duct Insulation', 'Duct insulation missing', 'Required duct insulation is missing.', true, 2, ARRAY['duct', 'insulation', 'missing']),
('HVAC', 'Registers & Grilles', 'Register Not Installed', 'Supply/return register missing', 'Supply or return register not installed.', true, 3, ARRAY['register', 'grille', 'missing']),
('HVAC', 'Equipment', 'Equipment Noise', 'Excessive equipment noise', 'HVAC equipment is producing excessive noise.', true, 4, ARRAY['equipment', 'noise', 'hvac']),
('HVAC', 'Controls', 'Thermostat Issue', 'Thermostat not functioning', 'Thermostat is not controlling temperature properly.', true, 5, ARRAY['thermostat', 'control', 'temperature']),

-- Drywall Templates
('Drywall', 'Surface Defects', 'Nail Pop', 'Nail pop visible', 'Drywall nail or screw pop visible through finish.', true, 1, ARRAY['nail', 'pop', 'drywall']),
('Drywall', 'Surface Defects', 'Crack', 'Drywall crack', 'Crack visible in drywall surface.', true, 2, ARRAY['crack', 'drywall']),
('Drywall', 'Surface Defects', 'Dent or Damage', 'Drywall dent/damage', 'Dent or damage visible in drywall surface.', true, 3, ARRAY['dent', 'damage', 'drywall']),
('Drywall', 'Finishing', 'Poor Tape Joint', 'Visible tape joint', 'Tape joint visible through finish.', true, 4, ARRAY['tape', 'joint', 'finish']),
('Drywall', 'Finishing', 'Uneven Surface', 'Uneven drywall surface', 'Drywall surface is uneven or wavy.', true, 5, ARRAY['uneven', 'surface', 'finish']),

-- Paint Templates
('Paint', 'Coverage', 'Missed Area', 'Unpainted area', 'Area was not painted as required.', true, 1, ARRAY['paint', 'missed', 'coverage']),
('Paint', 'Coverage', 'Thin Coverage', 'Thin paint coverage', 'Paint coverage is too thin, substrate visible.', true, 2, ARRAY['paint', 'thin', 'coverage']),
('Paint', 'Application', 'Drips/Runs', 'Paint drips/runs visible', 'Visible drips or runs in paint finish.', true, 3, ARRAY['paint', 'drip', 'run']),
('Paint', 'Application', 'Brush Marks', 'Brush marks visible', 'Visible brush strokes in paint finish.', true, 4, ARRAY['paint', 'brush', 'marks']),
('Paint', 'Color', 'Color Mismatch', 'Paint color does not match', 'Paint color does not match specification.', true, 5, ARRAY['paint', 'color', 'mismatch']),

-- Flooring Templates
('Flooring', 'Tile', 'Cracked Tile', 'Cracked floor tile', 'Floor tile is cracked or chipped.', true, 1, ARRAY['tile', 'crack', 'floor']),
('Flooring', 'Tile', 'Loose Tile', 'Loose floor tile', 'Floor tile is not properly adhered.', true, 2, ARRAY['tile', 'loose', 'floor']),
('Flooring', 'Tile', 'Grout Issue', 'Grout defect', 'Missing, cracked, or discolored grout.', true, 3, ARRAY['grout', 'tile', 'floor']),
('Flooring', 'Carpet', 'Carpet Seam Visible', 'Visible carpet seam', 'Carpet seam is visible or separating.', true, 4, ARRAY['carpet', 'seam', 'visible']),
('Flooring', 'Carpet', 'Carpet Buckling', 'Carpet buckling', 'Carpet is buckling or wrinkled.', true, 5, ARRAY['carpet', 'buckle', 'wrinkle']),
('Flooring', 'Wood', 'Scratched Hardwood', 'Hardwood floor scratched', 'Scratches visible in hardwood flooring.', true, 6, ARRAY['hardwood', 'scratch', 'floor']),
('Flooring', 'Wood', 'Gap in Flooring', 'Gap between floor boards', 'Gap between hardwood/laminate floor boards.', true, 7, ARRAY['gap', 'wood', 'floor']),

-- Door Templates
('Doors', 'Operation', 'Door Does Not Latch', 'Door not latching properly', 'Door does not latch or stay closed.', true, 1, ARRAY['door', 'latch', 'close']),
('Doors', 'Operation', 'Door Sticking', 'Door sticking', 'Door sticks when opening or closing.', true, 2, ARRAY['door', 'stick', 'binding']),
('Doors', 'Hardware', 'Missing Hardware', 'Door hardware missing', 'Door handle, lock, or hinges missing.', true, 3, ARRAY['door', 'hardware', 'missing']),
('Doors', 'Hardware', 'Lockset Issue', 'Lockset not working', 'Door lock does not function properly.', true, 4, ARRAY['door', 'lock', 'hardware']),
('Doors', 'Finish', 'Door Damage', 'Door surface damaged', 'Dent, scratch, or damage to door surface.', true, 5, ARRAY['door', 'damage', 'surface']),

-- Window Templates
('Windows', 'Operation', 'Window Does Not Open', 'Window not opening', 'Window will not open as designed.', true, 1, ARRAY['window', 'open', 'operation']),
('Windows', 'Operation', 'Window Does Not Lock', 'Window lock not working', 'Window lock does not engage properly.', true, 2, ARRAY['window', 'lock', 'security']),
('Windows', 'Sealing', 'Air Infiltration', 'Air leak at window', 'Air infiltration detected around window.', true, 3, ARRAY['window', 'air', 'leak', 'draft']),
('Windows', 'Glass', 'Scratched Glass', 'Window glass scratched', 'Scratches visible in window glass.', true, 4, ARRAY['window', 'glass', 'scratch']),
('Windows', 'Glass', 'Broken Seal', 'Window seal failure', 'Fogging between panes indicates seal failure.', true, 5, ARRAY['window', 'seal', 'fog'])
ON CONFLICT DO NOTHING;

-- =============================================
-- Insert Template Categories
-- =============================================
INSERT INTO punch_template_categories (trade, name, icon, color, sort_order)
VALUES
('Electrical', 'Outlets & Receptacles', 'plug', 'yellow', 1),
('Electrical', 'Lighting', 'lightbulb', 'yellow', 2),
('Electrical', 'Switches', 'toggle-right', 'yellow', 3),
('Electrical', 'Wiring', 'cable', 'yellow', 4),
('Plumbing', 'Fixtures', 'droplet', 'blue', 1),
('Plumbing', 'Pipes', 'pipe', 'blue', 2),
('Plumbing', 'Water Heater', 'thermometer', 'blue', 3),
('HVAC', 'Ductwork', 'wind', 'cyan', 1),
('HVAC', 'Registers & Grilles', 'grid', 'cyan', 2),
('HVAC', 'Equipment', 'fan', 'cyan', 3),
('HVAC', 'Controls', 'thermometer', 'cyan', 4),
('Drywall', 'Surface Defects', 'square', 'gray', 1),
('Drywall', 'Finishing', 'paint-bucket', 'gray', 2),
('Paint', 'Coverage', 'paint-bucket', 'purple', 1),
('Paint', 'Application', 'brush', 'purple', 2),
('Paint', 'Color', 'palette', 'purple', 3),
('Flooring', 'Tile', 'grid', 'brown', 1),
('Flooring', 'Carpet', 'square', 'brown', 2),
('Flooring', 'Wood', 'tree', 'brown', 3),
('Doors', 'Operation', 'door-open', 'orange', 1),
('Doors', 'Hardware', 'key', 'orange', 2),
('Doors', 'Finish', 'paint-bucket', 'orange', 3),
('Windows', 'Operation', 'square', 'sky', 1),
('Windows', 'Sealing', 'wind', 'sky', 2),
('Windows', 'Glass', 'scan', 'sky', 3)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 089_punch_templates completed successfully';
END $$;
