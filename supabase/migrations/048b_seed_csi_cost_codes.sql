-- Migration: 048b_seed_csi_cost_codes.sql
-- Description: Seed CSI MasterFormat 2020 Division codes
-- Date: 2025-12-05
-- Note: This creates a template function - actual seeding happens per company

-- =============================================
-- FUNCTION: seed_csi_divisions_for_company
-- Creates standard CSI Division codes for a company
-- =============================================
CREATE OR REPLACE FUNCTION seed_csi_divisions_for_company(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  -- Insert CSI MasterFormat 2020 Division codes if they don't exist
  INSERT INTO cost_codes (company_id, code, name, division, level, cost_type, is_active)
  VALUES
    -- Procurement and Contracting Requirements Group
    (p_company_id, '00 00 00', 'Procurement and Contracting Requirements', '00', 1, 'indirect', true),

    -- General Requirements Group
    (p_company_id, '01 00 00', 'General Requirements', '01', 1, 'indirect', true),

    -- Facility Construction Subgroup
    (p_company_id, '02 00 00', 'Existing Conditions', '02', 1, 'direct', true),
    (p_company_id, '03 00 00', 'Concrete', '03', 1, 'direct', true),
    (p_company_id, '04 00 00', 'Masonry', '04', 1, 'direct', true),
    (p_company_id, '05 00 00', 'Metals', '05', 1, 'direct', true),
    (p_company_id, '06 00 00', 'Wood, Plastics, and Composites', '06', 1, 'direct', true),
    (p_company_id, '07 00 00', 'Thermal and Moisture Protection', '07', 1, 'direct', true),
    (p_company_id, '08 00 00', 'Openings', '08', 1, 'direct', true),
    (p_company_id, '09 00 00', 'Finishes', '09', 1, 'direct', true),
    (p_company_id, '10 00 00', 'Specialties', '10', 1, 'direct', true),
    (p_company_id, '11 00 00', 'Equipment', '11', 1, 'direct', true),
    (p_company_id, '12 00 00', 'Furnishings', '12', 1, 'direct', true),
    (p_company_id, '13 00 00', 'Special Construction', '13', 1, 'direct', true),
    (p_company_id, '14 00 00', 'Conveying Equipment', '14', 1, 'direct', true),

    -- Facility Services Subgroup
    (p_company_id, '21 00 00', 'Fire Suppression', '21', 1, 'direct', true),
    (p_company_id, '22 00 00', 'Plumbing', '22', 1, 'direct', true),
    (p_company_id, '23 00 00', 'Heating, Ventilating, and Air Conditioning (HVAC)', '23', 1, 'direct', true),
    (p_company_id, '25 00 00', 'Integrated Automation', '25', 1, 'direct', true),
    (p_company_id, '26 00 00', 'Electrical', '26', 1, 'direct', true),
    (p_company_id, '27 00 00', 'Communications', '27', 1, 'direct', true),
    (p_company_id, '28 00 00', 'Electronic Safety and Security', '28', 1, 'direct', true),

    -- Site and Infrastructure Subgroup
    (p_company_id, '31 00 00', 'Earthwork', '31', 1, 'direct', true),
    (p_company_id, '32 00 00', 'Exterior Improvements', '32', 1, 'direct', true),
    (p_company_id, '33 00 00', 'Utilities', '33', 1, 'direct', true),
    (p_company_id, '34 00 00', 'Transportation', '34', 1, 'direct', true),
    (p_company_id, '35 00 00', 'Waterway and Marine Construction', '35', 1, 'direct', true),

    -- Process Equipment Subgroup
    (p_company_id, '40 00 00', 'Process Interconnections', '40', 1, 'direct', true),
    (p_company_id, '41 00 00', 'Material Processing and Handling Equipment', '41', 1, 'direct', true),
    (p_company_id, '42 00 00', 'Process Heating, Cooling, and Drying Equipment', '42', 1, 'direct', true),
    (p_company_id, '43 00 00', 'Process Gas and Liquid Handling, Purification, and Storage Equipment', '43', 1, 'direct', true),
    (p_company_id, '44 00 00', 'Pollution and Waste Control Equipment', '44', 1, 'direct', true),
    (p_company_id, '45 00 00', 'Industry-Specific Manufacturing Equipment', '45', 1, 'direct', true),
    (p_company_id, '46 00 00', 'Water and Wastewater Equipment', '46', 1, 'direct', true),
    (p_company_id, '48 00 00', 'Electrical Power Generation', '48', 1, 'direct', true)

  ON CONFLICT (company_id, code) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: seed_detailed_cost_codes_for_company
-- Creates common detailed cost codes (Level 2 sections)
-- =============================================
CREATE OR REPLACE FUNCTION seed_detailed_cost_codes_for_company(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
  parent_id UUID;
BEGIN
  -- Division 03 - Concrete subsections
  SELECT id INTO parent_id FROM cost_codes WHERE company_id = p_company_id AND code = '03 00 00';
  IF parent_id IS NOT NULL THEN
    INSERT INTO cost_codes (company_id, code, name, division, level, parent_code_id, cost_type, is_active)
    VALUES
      (p_company_id, '03 10 00', 'Concrete Forming and Accessories', '03', 2, parent_id, 'direct', true),
      (p_company_id, '03 20 00', 'Concrete Reinforcing', '03', 2, parent_id, 'direct', true),
      (p_company_id, '03 30 00', 'Cast-in-Place Concrete', '03', 2, parent_id, 'direct', true),
      (p_company_id, '03 40 00', 'Precast Concrete', '03', 2, parent_id, 'direct', true),
      (p_company_id, '03 50 00', 'Cast Decks and Underlayment', '03', 2, parent_id, 'direct', true)
    ON CONFLICT (company_id, code) DO NOTHING;
  END IF;

  -- Division 05 - Metals subsections
  SELECT id INTO parent_id FROM cost_codes WHERE company_id = p_company_id AND code = '05 00 00';
  IF parent_id IS NOT NULL THEN
    INSERT INTO cost_codes (company_id, code, name, division, level, parent_code_id, cost_type, is_active)
    VALUES
      (p_company_id, '05 10 00', 'Structural Metal Framing', '05', 2, parent_id, 'direct', true),
      (p_company_id, '05 20 00', 'Metal Joists', '05', 2, parent_id, 'direct', true),
      (p_company_id, '05 30 00', 'Metal Decking', '05', 2, parent_id, 'direct', true),
      (p_company_id, '05 40 00', 'Cold-Formed Metal Framing', '05', 2, parent_id, 'direct', true),
      (p_company_id, '05 50 00', 'Metal Fabrications', '05', 2, parent_id, 'direct', true)
    ON CONFLICT (company_id, code) DO NOTHING;
  END IF;

  -- Division 09 - Finishes subsections
  SELECT id INTO parent_id FROM cost_codes WHERE company_id = p_company_id AND code = '09 00 00';
  IF parent_id IS NOT NULL THEN
    INSERT INTO cost_codes (company_id, code, name, division, level, parent_code_id, cost_type, is_active)
    VALUES
      (p_company_id, '09 20 00', 'Plaster and Gypsum Board', '09', 2, parent_id, 'direct', true),
      (p_company_id, '09 30 00', 'Tiling', '09', 2, parent_id, 'direct', true),
      (p_company_id, '09 50 00', 'Ceilings', '09', 2, parent_id, 'direct', true),
      (p_company_id, '09 60 00', 'Flooring', '09', 2, parent_id, 'direct', true),
      (p_company_id, '09 90 00', 'Painting and Coating', '09', 2, parent_id, 'direct', true)
    ON CONFLICT (company_id, code) DO NOTHING;
  END IF;

  -- Division 26 - Electrical subsections
  SELECT id INTO parent_id FROM cost_codes WHERE company_id = p_company_id AND code = '26 00 00';
  IF parent_id IS NOT NULL THEN
    INSERT INTO cost_codes (company_id, code, name, division, level, parent_code_id, cost_type, is_active)
    VALUES
      (p_company_id, '26 05 00', 'Common Work Results for Electrical', '26', 2, parent_id, 'direct', true),
      (p_company_id, '26 20 00', 'Low-Voltage Electrical Transmission', '26', 2, parent_id, 'direct', true),
      (p_company_id, '26 50 00', 'Lighting', '26', 2, parent_id, 'direct', true)
    ON CONFLICT (company_id, code) DO NOTHING;
  END IF;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: Auto-seed cost codes for new companies
-- =============================================
CREATE OR REPLACE FUNCTION auto_seed_cost_codes_for_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Seed CSI divisions for the new company
  PERFORM seed_csi_divisions_for_company(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_seed_cost_codes'
  ) THEN
    CREATE TRIGGER trigger_auto_seed_cost_codes
      AFTER INSERT ON companies
      FOR EACH ROW EXECUTE FUNCTION auto_seed_cost_codes_for_company();
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 048b_seed_csi_cost_codes completed successfully';
END $$;
