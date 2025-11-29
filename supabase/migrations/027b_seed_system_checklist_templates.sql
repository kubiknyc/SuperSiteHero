-- Migration: 027_seed_system_checklist_templates.sql
-- Description: Seed system-level checklist templates for construction inspections
-- Date: 2025-11-28
-- Phase: 4.1 - Pre-built Template Library
-- Total Templates: 40 (Safety, Quality, Milestones)

-- ============================================================================
-- CREATE REQUIRED TYPES IF NOT EXISTS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE template_level AS ENUM ('system', 'company', 'project');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE checklist_item_type AS ENUM ('checkbox', 'text', 'number', 'photo', 'signature', 'date', 'select', 'pass_fail');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- HELPER FUNCTION: Create template with items in single transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_checklist_template(
  p_template JSONB,
  p_items JSONB[]
) RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
  v_item JSONB;
  v_tags TEXT[];
BEGIN
  -- Extract tags array from JSONB
  SELECT ARRAY(SELECT jsonb_array_elements_text(p_template->'tags'))
  INTO v_tags;

  -- Insert template
  INSERT INTO checklist_templates (
    company_id,
    name,
    description,
    category,
    template_level,
    is_system_template,
    tags,
    instructions,
    estimated_duration_minutes,
    scoring_enabled,
    items
  ) VALUES (
    NULL, -- system templates have no company_id
    p_template->>'name',
    p_template->>'description',
    p_template->>'category',
    (p_template->>'template_level')::template_level,
    COALESCE((p_template->>'is_system_template')::boolean, true),
    v_tags,
    p_template->>'instructions',
    (p_template->>'estimated_duration_minutes')::integer,
    COALESCE((p_template->>'scoring_enabled')::boolean, true),
    '[]'::jsonb
  ) RETURNING id INTO v_template_id;

  -- Insert template items
  FOREACH v_item IN ARRAY p_items LOOP
    INSERT INTO checklist_template_items (
      checklist_template_id,
      item_type,
      label,
      description,
      section,
      sort_order,
      is_required,
      config,
      scoring_enabled,
      pass_fail_na_scoring,
      requires_photo,
      min_photos,
      max_photos
    ) VALUES (
      v_template_id,
      (v_item->>'item_type')::checklist_item_type,
      v_item->>'label',
      v_item->>'description',
      v_item->>'section',
      (v_item->>'sort_order')::integer,
      COALESCE((v_item->>'is_required')::boolean, false),
      COALESCE(v_item->'config', '{}'::jsonb),
      COALESCE((v_item->>'scoring_enabled')::boolean, false),
      COALESCE((v_item->>'pass_fail_na_scoring')::boolean, false),
      COALESCE((v_item->>'requires_photo')::boolean, false),
      COALESCE((v_item->>'min_photos')::integer, 0),
      COALESCE((v_item->>'max_photos')::integer, 5)
    );
  END LOOP;

  RAISE NOTICE 'Created template: % (ID: %)', p_template->>'name', v_template_id;
  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAFETY TEMPLATES (9 total)
-- ============================================================================

-- Template 1: Daily Safety Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Daily Safety Inspection", "description": "OSHA-compliant daily safety walkthrough for construction sites", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "daily", "osha", "compliance"], "instructions": "Complete this inspection at the start of each workday. Document all hazards found and take corrective action immediately. Required by OSHA for all active construction sites.", "estimated_duration_minutes": 15, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Site access and egress routes are clear and safe", "description": "Check that all entry/exit points are unobstructed, well-lit, and properly marked", "section": "General Site Conditions", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Housekeeping is adequate (debris removal, material storage)", "description": "Verify walkways are clear, materials are properly stored, and debris is contained", "section": "General Site Conditions", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire extinguishers are accessible and inspected", "description": "Verify fire extinguishers are mounted, tagged, and pressure gauge shows charged", "section": "General Site Conditions", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "First aid kit is stocked and accessible", "section": "General Site Conditions", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All workers wearing required hard hats", "section": "Personal Protective Equipment", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Safety glasses/eye protection in use where required", "section": "Personal Protective Equipment", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "High-visibility vests worn by all personnel", "section": "Personal Protective Equipment", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Appropriate footwear (steel-toe boots) in use", "section": "Personal Protective Equipment", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Guardrails installed and secure at elevated work areas", "description": "Check top rail at 42 inches, mid-rail at 21 inches, capable of withstanding 200 lbs", "section": "Fall Protection", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Personal fall arrest systems inspected and properly used", "description": "Verify harnesses, lanyards, and anchor points are OSHA-compliant and inspected", "section": "Fall Protection", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hole covers secured and marked", "section": "Fall Protection", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Ladders in good condition (no broken rungs, proper setup)", "description": "Check 4:1 ratio for extension ladders, 3-point contact maintained", "section": "Ladders & Scaffolding", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Scaffolding properly erected with toe boards and guardrails", "description": "Verify competent person inspection tag is current (within 7 days)", "section": "Ladders & Scaffolding", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "GFCIs in use for all temporary power", "section": "Electrical Safety", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Extension cords in good condition (no cuts, proper gauge)", "section": "Electrical Safety", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Power tools have guards in place", "section": "Equipment & Tools", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Heavy equipment has backup alarms functional", "section": "Equipment & Tools", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photo documentation of any hazards found", "description": "Take photos of any safety concerns identified during inspection", "section": "Documentation", "sort_order": 18, "is_required": false, "requires_photo": true, "min_photos": 0, "max_photos": 10, "config": {"min_photos": 0, "max_photos": 10}}'::jsonb,
      '{"item_type": "text", "label": "Corrective actions taken", "description": "List all immediate corrective actions taken to address identified hazards", "section": "Documentation", "sort_order": 19, "is_required": false, "config": {"placeholder": "Describe corrective actions...", "multiline": true, "max_length": 1000}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "description": "Superintendent or competent person signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "inspector", "title": "Safety Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 2: Weekly Site Safety Audit
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Weekly Site Safety Audit", "description": "Comprehensive weekly safety audit covering all OSHA requirements and site-specific hazards", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "weekly", "audit", "osha"], "instructions": "Conduct thorough safety audit every Monday. Review previous week''s incidents and near-misses. Document findings and assign corrective actions.", "estimated_duration_minutes": 45, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Previous week safety incidents reviewed", "section": "Safety Performance", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Toolbox talks conducted with documented attendance", "section": "Safety Performance", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Site-specific safety plan posted and current", "section": "Documentation", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Emergency contact numbers posted at multiple locations", "section": "Documentation", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hazard communication program current (SDS accessible)", "section": "Documentation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All workers have received site orientation", "section": "Training", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Competent persons identified for all required activities", "section": "Training", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fall protection training current for exposed workers", "section": "Training", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Excavation safety reviewed (if applicable)", "section": "Hazard-Specific", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Confined space entry procedures in place", "section": "Hazard-Specific", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Crane operations compliance verified", "section": "Hazard-Specific", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hot work permits properly issued and controlled", "section": "Hazard-Specific", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of safety improvements implemented this week", "section": "Documentation", "sort_order": 13, "is_required": false, "requires_photo": true, "min_photos": 0, "max_photos": 15, "config": {"min_photos": 0, "max_photos": 15}}'::jsonb,
      '{"item_type": "text", "label": "Corrective actions assigned", "description": "List all corrective actions assigned with responsible parties and due dates", "section": "Documentation", "sort_order": 14, "is_required": false, "config": {"placeholder": "Action items...", "multiline": true, "max_length": 1500}}'::jsonb,
      '{"item_type": "signature", "label": "Safety Manager Signature", "section": "Documentation", "sort_order": 15, "is_required": true, "config": {"role": "safety_manager", "title": "Safety Manager"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - CONCRETE TEMPLATES (4 total)
-- ============================================================================

-- Template 3: Pre-Pour Concrete Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Pre-Pour Concrete Inspection", "description": "Quality control checklist to be completed before any concrete placement", "category": "Quality - Concrete", "template_level": "system", "is_system_template": true, "tags": ["concrete", "quality", "structural", "pre-pour"], "instructions": "Complete this inspection immediately before concrete placement. All items must pass before pour can proceed. Hold concrete trucks if deficiencies are found.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Formwork is properly braced and aligned", "description": "Check all form ties, wales, and strongbacks for proper installation", "section": "Formwork & Shoring", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Formwork dimensions verified against drawings", "description": "Confirm dimensions, elevations, and locations match structural plans", "section": "Formwork & Shoring", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Forms are clean and free of debris", "section": "Formwork & Shoring", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Form release agent applied properly", "section": "Formwork & Shoring", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Shoring system inspected by competent person", "description": "Verify shores are plumb, braced, and properly loaded", "section": "Formwork & Shoring", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rebar size and spacing verified per structural drawings", "description": "Confirm bar sizes, spacing, and placement match approved shop drawings", "section": "Reinforcement", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rebar lap lengths meet specification requirements", "section": "Reinforcement", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper concrete cover maintained (chairs/bolsters in place)", "description": "Verify appropriate cover for exposure conditions per ACI 318", "section": "Reinforcement", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rebar is clean and free of rust/contaminants", "section": "Reinforcement", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rebar tied securely (will not shift during pour)", "section": "Reinforcement", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All embedments/sleeves located and secured per MEP drawings", "description": "Verify conduit, sleeves, anchor bolts are in correct locations", "section": "Embedments & Inserts", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchor bolts properly positioned and braced", "section": "Embedments & Inserts", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Blockouts in place for openings", "section": "Embedments & Inserts", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Subgrade properly compacted and inspected", "description": "Verify geotechnical engineer has approved subgrade", "section": "Pre-Pour Conditions", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Vapor barrier installed (if required)", "section": "Pre-Pour Conditions", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weather conditions acceptable for concrete placement", "description": "Temperature above 40°F for standard mix, no rain forecasted", "section": "Pre-Pour Conditions", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "text", "label": "Concrete mix design number", "section": "Concrete Mix & Delivery", "sort_order": 17, "is_required": true, "config": {"placeholder": "e.g., 4000PSI-MIX-A", "max_length": 100}}'::jsonb,
      '{"item_type": "number", "label": "Design strength (psi)", "section": "Concrete Mix & Delivery", "sort_order": 18, "is_required": true, "config": {"min": 2500, "max": 10000, "units": "psi"}}'::jsonb,
      '{"item_type": "number", "label": "Slump specification", "section": "Concrete Mix & Delivery", "sort_order": 19, "is_required": true, "config": {"min": 1, "max": 10, "units": "inches", "decimal_places": 1}}'::jsonb,
      '{"item_type": "photo", "label": "Photo documentation (formwork, rebar, embedments)", "description": "Minimum 5 photos showing overall formwork, rebar placement, and critical details", "section": "Documentation", "sort_order": 20, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20, "required_if_fail": true}}'::jsonb,
      '{"item_type": "text", "label": "Special notes or concerns", "section": "Documentation", "sort_order": 21, "is_required": false, "config": {"placeholder": "Any special conditions or concerns...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Superintendent Approval", "description": "Superintendent signature approves concrete pour to proceed", "section": "Documentation", "sort_order": 22, "is_required": true, "config": {"role": "superintendent", "title": "Superintendent"}}'::jsonb,
      '{"item_type": "signature", "label": "Structural Engineer Approval (if required)", "description": "SE signature for critical structural elements", "section": "Documentation", "sort_order": 23, "is_required": false, "config": {"role": "engineer", "title": "Structural Engineer"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - SITEWORK TEMPLATES (5 total)
-- ============================================================================

-- Template 4: Site Grading & Earthwork
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Site Grading & Earthwork", "description": "Verification of rough and fine grading conformance to site plans including elevations, slopes, and drainage", "category": "Quality - Sitework", "template_level": "system", "is_system_template": true, "tags": ["sitework", "grading", "earthwork", "survey"], "instructions": "Verify grading elevations match site plans. Check slopes for proper drainage. Coordinate with surveyor for elevation verification.", "estimated_duration_minutes": 40, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Survey control points verified and protected", "section": "Survey Control", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Grade stakes set per site plan", "section": "Survey Control", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Building corners staked and verified", "section": "Survey Control", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Finish grade elevations meet plan requirements", "description": "Verify spot elevations at key locations match site plan", "section": "Elevation Verification", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Slopes conform to designed percentages", "section": "Slope & Drainage", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Positive drainage away from building", "section": "Slope & Drainage", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Swales and drainage channels properly formed", "section": "Slope & Drainage", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Subgrade compacted to specification", "description": "Verify compaction testing completed and approved", "section": "Subgrade Preparation", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Soft spots identified and corrected", "section": "Subgrade Preparation", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Topsoil stripped and stockpiled for reuse", "section": "Subgrade Preparation", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photo documentation (grade stakes, finished grades)", "section": "Documentation", "sort_order": 11, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 15, "config": {"min_photos": 5, "max_photos": 15}}'::jsonb,
      '{"item_type": "number", "label": "Compaction test result (%)", "section": "Documentation", "sort_order": 12, "is_required": false, "config": {"min": 85, "max": 100, "units": "%", "decimal_places": 1}}'::jsonb,
      '{"item_type": "signature", "label": "Surveyor Approval", "section": "Documentation", "sort_order": 13, "is_required": false, "config": {"role": "surveyor", "title": "Licensed Surveyor"}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 14, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - MEP TEMPLATES (6 total)
-- ============================================================================

-- Template 5: Electrical Rough-In Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Electrical Rough-In Inspection", "description": "MEP quality inspection for electrical rough-in before drywall/concrete enclosure", "category": "Quality - MEP", "template_level": "system", "is_system_template": true, "tags": ["electrical", "mep", "rough-in", "quality"], "instructions": "Complete before walls are closed or concrete is poured. Must be approved before proceeding to next phase.", "estimated_duration_minutes": 45, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "All conduit runs properly supported and secured", "description": "Verify support spacing meets NEC requirements (typically 10 ft for EMT)", "section": "Conduit & Boxes", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Conduit sizes match approved electrical drawings", "section": "Conduit & Boxes", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Junction boxes accessible and properly located", "section": "Conduit & Boxes", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Box extenders installed where required", "section": "Conduit & Boxes", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Outlet and switch box heights meet specifications", "description": "Verify ADA compliance where required (typically 48 inches max)", "section": "Conduit & Boxes", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wire gauge matches panel schedule and drawings", "section": "Wiring", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wire pulled properly with no damage to insulation", "section": "Wiring", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Adequate wire left in boxes for connections (6 inches min)", "section": "Wiring", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wire labeled at panel and pull points", "section": "Wiring", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Grounding electrode system installed per NEC", "section": "Grounding", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Equipment grounding conductors present in all circuits", "section": "Grounding", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Metal boxes properly bonded", "section": "Grounding", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Main electrical panel properly located and secured", "section": "Panel & Service", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Working clearance around panel meets NEC (30 inches min)", "section": "Panel & Service", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Service entrance properly sized and installed", "section": "Panel & Service", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire alarm conduit/wiring installed per life safety drawings", "section": "Special Systems", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Emergency lighting circuit properly identified", "section": "Special Systems", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photo documentation of rough-in", "description": "Photos of panel, major conduit runs, and special conditions", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 3, "max_photos": 15, "config": {"min_photos": 3, "max_photos": 15}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies noted", "section": "Documentation", "sort_order": 19, "is_required": false, "config": {"placeholder": "List any deficiencies requiring correction...", "multiline": true, "max_length": 1000}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- PROJECT MILESTONE TEMPLATES (2 total)
-- ============================================================================

-- Template 6: Project Closeout Checklist
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Project Closeout Checklist", "description": "Comprehensive checklist for project substantial completion and final closeout", "category": "Project Milestones", "template_level": "system", "is_system_template": true, "tags": ["closeout", "completion", "final", "turnover"], "instructions": "Use this checklist to ensure all closeout deliverables are complete before final owner acceptance. Track progress throughout final weeks of project.", "estimated_duration_minutes": 120, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "All punch list items completed and verified", "section": "Punch List", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Final walkthrough conducted with owner", "section": "Punch List", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All closeout submittals received and approved", "section": "Documentation & Submittals", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "As-built drawings compiled and delivered", "section": "Documentation & Submittals", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "O&M manuals complete and delivered to owner", "section": "Documentation & Submittals", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Warranty documentation compiled", "section": "Documentation & Submittals", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Equipment start-up reports submitted", "section": "Documentation & Submittals", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All systems tested and operational", "section": "Testing & Commissioning", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "TAB (Testing, Adjusting, Balancing) reports received", "section": "Testing & Commissioning", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire alarm system tested and accepted by AHJ", "section": "Testing & Commissioning", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sprinkler system tested and signed off", "section": "Testing & Commissioning", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Certificate of Occupancy obtained", "section": "Permits & Inspections", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Final building inspection completed and approved", "section": "Permits & Inspections", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All other required permits closed", "section": "Permits & Inspections", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Owner training sessions conducted", "section": "Training & Turnover", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Spare parts delivered to owner", "section": "Training & Turnover", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Keys and access cards delivered", "section": "Training & Turnover", "sort_order": 17, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Site cleaned and all debris removed", "section": "Site Cleanup", "sort_order": 18, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Final landscaping complete", "section": "Site Cleanup", "sort_order": 19, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Construction signage removed", "section": "Site Cleanup", "sort_order": 20, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Final completion photos", "description": "Comprehensive photo set showing completed project", "section": "Final Documentation", "sort_order": 21, "is_required": true, "requires_photo": true, "min_photos": 10, "max_photos": 50, "config": {"min_photos": 10, "max_photos": 50}}'::jsonb,
      '{"item_type": "text", "label": "Outstanding items or warranty work", "section": "Final Documentation", "sort_order": 22, "is_required": false, "config": {"placeholder": "List any items to be completed under warranty...", "multiline": true, "max_length": 1000}}'::jsonb,
      '{"item_type": "signature", "label": "Superintendent Sign-off", "section": "Final Documentation", "sort_order": 23, "is_required": true, "config": {"role": "superintendent", "title": "Superintendent"}}'::jsonb,
      '{"item_type": "signature", "label": "Project Manager Approval", "section": "Final Documentation", "sort_order": 24, "is_required": true, "config": {"role": "project_manager", "title": "Project Manager"}}'::jsonb
    ]
  );
END $$;

-- Template 7: Confined Space Entry Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Confined Space Entry Inspection", "description": "OSHA confined space entry permit and safety checklist", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "confined-space", "permit", "osha"], "instructions": "Required for all confined space entries. Must be completed by competent person before entry permitted. Valid for single shift only.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Confined space location/description", "section": "Space Identification", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., Manhole #5 at Building A", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Space properly identified as permit-required confined space", "section": "Space Identification", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All energy sources locked out/tagged out", "section": "Pre-Entry Preparation", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Space isolated from other systems (blanked/blocked)", "section": "Pre-Entry Preparation", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Space purged/ventilated prior to entry", "section": "Pre-Entry Preparation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Continuous forced air ventilation in operation", "section": "Atmospheric Testing", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "number", "label": "Oxygen level (%)", "description": "Acceptable range: 19.5% - 23.5%", "section": "Atmospheric Testing", "sort_order": 7, "is_required": true, "config": {"min": 0, "max": 100, "units": "%", "decimal_places": 1}}'::jsonb,
      '{"item_type": "number", "label": "LEL reading (%)", "description": "Must be below 10% LEL", "section": "Atmospheric Testing", "sort_order": 8, "is_required": true, "config": {"min": 0, "max": 100, "units": "% LEL", "decimal_places": 1}}'::jsonb,
      '{"item_type": "number", "label": "Carbon monoxide (ppm)", "description": "Must be below 35 ppm", "section": "Atmospheric Testing", "sort_order": 9, "is_required": true, "config": {"min": 0, "max": 1000, "units": "ppm"}}'::jsonb,
      '{"item_type": "number", "label": "Hydrogen sulfide (ppm)", "description": "Must be below 10 ppm", "section": "Atmospheric Testing", "sort_order": 10, "is_required": true, "config": {"min": 0, "max": 100, "units": "ppm"}}'::jsonb,
      '{"item_type": "checkbox", "label": "Atmospheric testing equipment calibrated", "section": "Atmospheric Testing", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rescue equipment available and ready", "section": "Emergency Equipment", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Emergency rescue service contacted/on standby", "section": "Emergency Equipment", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Communication equipment tested and functional", "section": "Emergency Equipment", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Entrants wearing appropriate PPE", "section": "Personnel Safety", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Full-body harness and retrieval system in use", "section": "Personnel Safety", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Attendant stationed at entry point", "section": "Personnel Safety", "sort_order": 17, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Entry supervisor on-site during operations", "section": "Personnel Safety", "sort_order": 18, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "text", "label": "Names of authorized entrants", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"placeholder": "List all authorized entrants...", "multiline": true, "max_length": 300}}'::jsonb,
      '{"item_type": "signature", "label": "Entry Supervisor Signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "entry_supervisor", "title": "Entry Supervisor"}}'::jsonb
    ]
  );
END $$;

-- Template 8: Hot Work Permit
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Hot Work Permit", "description": "Fire watch and safety permit for welding, cutting, grinding, and other hot work operations", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "hot-work", "welding", "fire-prevention"], "instructions": "Required for all hot work operations. Fire watch must remain on duty for 30 minutes after completion of hot work. Valid for single shift only.", "estimated_duration_minutes": 20, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Hot work location", "section": "Work Description", "sort_order": 1, "is_required": true, "config": {"placeholder": "Specific location of hot work", "max_length": 200}}'::jsonb,
      '{"item_type": "text", "label": "Type of hot work to be performed", "section": "Work Description", "sort_order": 2, "is_required": true, "config": {"placeholder": "e.g., Welding, cutting, grinding", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire extinguisher (min 10-lb ABC) available at work location", "section": "Fire Prevention", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All combustible materials removed within 35-foot radius", "section": "Fire Prevention", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Immovable combustibles protected with fire-resistant covers", "section": "Fire Prevention", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All floor/wall openings covered to prevent sparks from falling", "section": "Fire Prevention", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire watch assigned and trained", "section": "Fire Watch", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire watch has clear view of work area and access to fire alarm", "section": "Fire Watch", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sprinkler systems in service", "section": "Fire Protection Systems", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire alarm system functional", "section": "Fire Protection Systems", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Welding equipment in good condition (no leaks, damaged cables)", "section": "Equipment Safety", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Gas cylinders properly secured and stored", "section": "Equipment Safety", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Welders wearing proper PPE (shield, gloves, leather)", "section": "Personnel Safety", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Adequate ventilation for fumes", "section": "Personnel Safety", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "text", "label": "Name of fire watch", "section": "Documentation", "sort_order": 15, "is_required": true, "config": {"placeholder": "Fire watch name", "max_length": 100}}'::jsonb,
      '{"item_type": "signature", "label": "Authorized by", "section": "Documentation", "sort_order": 16, "is_required": true, "config": {"role": "supervisor", "title": "Superintendent/Supervisor"}}'::jsonb
    ]
  );
END $$;

-- Template 9: Crane & Rigging Operations Safety
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Crane & Rigging Operations Safety", "description": "Daily crane inspection and lift planning safety checklist", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "crane", "rigging", "heavy-equipment"], "instructions": "Complete daily before crane operations begin. Critical lifts require separate detailed lift plan.", "estimated_duration_minutes": 25, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Crane operator certified and current", "section": "Crane Operator", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Operator performed pre-shift inspection", "section": "Crane Operator", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Current load chart posted in cab", "section": "Crane Equipment", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Load moment indicator (LMI) functional", "section": "Crane Equipment", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anti-two block device functional", "section": "Crane Equipment", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wire rope in good condition (no broken wires, kinks)", "section": "Crane Equipment", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hook has safety latch functional", "section": "Crane Equipment", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Outriggers fully extended and on solid bearing", "section": "Crane Setup", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Ground conditions suitable for crane setup", "section": "Crane Setup", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Crane level within manufacturer specifications", "section": "Crane Setup", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Overhead power lines identified and clearances maintained", "section": "Site Hazards", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Swing radius barricaded", "section": "Site Hazards", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Qualified rigger/signal person assigned", "section": "Rigging", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rigging equipment inspected (slings, shackles, spreaders)", "section": "Rigging", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Load weight known and within crane capacity", "section": "Rigging", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tag lines being used for load control", "section": "Rigging", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of crane setup and site conditions", "section": "Documentation", "sort_order": 17, "is_required": false, "requires_photo": true, "min_photos": 0, "max_photos": 10, "config": {"min_photos": 0, "max_photos": 10}}'::jsonb,
      '{"item_type": "signature", "label": "Competent Person Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "competent_person", "title": "Competent Person"}}'::jsonb
    ]
  );
END $$;

-- Template 10: Fall Protection Detailed Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Fall Protection Detailed Inspection", "description": "Comprehensive monthly inspection of fall protection systems and equipment", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "fall-protection", "monthly", "equipment"], "instructions": "Conduct monthly in addition to daily inspections. Document all findings. Remove deficient equipment from service immediately.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Guardrail systems inspected (all elevations)", "section": "Guardrail Systems", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Top rail height 42 inches +/- 3 inches", "section": "Guardrail Systems", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Mid-rail installed at 21 inches", "section": "Guardrail Systems", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Guardrails withstand 200 lbs force", "section": "Guardrail Systems", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Toe boards installed where required", "section": "Guardrail Systems", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Personal fall arrest harnesses inspected", "section": "Personal Fall Arrest", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Harness webbing free of cuts, burns, fraying", "section": "Personal Fall Arrest", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hardware (D-rings, buckles) not distorted or damaged", "section": "Personal Fall Arrest", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Labels legible with manufacturer info and date", "section": "Personal Fall Arrest", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Lanyards inspected for damage", "section": "Lanyards & Lifelines", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Shock absorbers not deployed/damaged", "section": "Lanyards & Lifelines", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Snaphooks self-closing and locking properly", "section": "Lanyards & Lifelines", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Horizontal lifelines properly tensioned and anchored", "section": "Lanyards & Lifelines", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchor points rated for 5,000 lbs per person", "section": "Anchor Points", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchor point certification tags current", "section": "Anchor Points", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Self-retracting lifelines inspected and functional", "section": "SRL Devices", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "SRL brake mechanism tested", "section": "SRL Devices", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "text", "label": "Equipment removed from service", "description": "List any deficient equipment tagged out", "section": "Documentation", "sort_order": 18, "is_required": false, "config": {"placeholder": "Equipment ID numbers...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Competent Person Signature", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"role": "competent_person", "title": "Competent Person"}}'::jsonb
    ]
  );
END $$;

-- Template 11: Excavation & Trenching Safety
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Excavation & Trenching Safety", "description": "Daily excavation safety inspection per OSHA requirements", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "excavation", "trenching", "shoring"], "instructions": "Must be completed daily by competent person before workers enter excavation. Required for excavations 4 feet or deeper.", "estimated_duration_minutes": 20, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "number", "label": "Maximum depth of excavation (feet)", "section": "Excavation Details", "sort_order": 1, "is_required": true, "config": {"min": 0, "max": 100, "units": "feet", "decimal_places": 1}}'::jsonb,
      '{"item_type": "text", "label": "Soil type classification", "description": "Type A, B, or C", "section": "Excavation Details", "sort_order": 2, "is_required": true, "config": {"placeholder": "Type A, B, or C", "max_length": 50}}'::jsonb,
      '{"item_type": "checkbox", "label": "Competent person conducted soil classification", "section": "Competent Person", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Daily inspection completed before worker entry", "section": "Competent Person", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Excavation inspected after rain or freeze/thaw", "section": "Competent Person", "sort_order": 5, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Protective system in place (sloping, benching, shoring)", "section": "Protective Systems", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Shoring/shielding properly installed and secure", "section": "Protective Systems", "sort_order": 7, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Slopes cut at appropriate angle for soil type", "section": "Protective Systems", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Safe means of egress within 25 feet of workers", "section": "Access & Egress", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Ladders extend 3 feet above excavation edge", "section": "Access & Egress", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Spoil piles set back minimum 2 feet from edge", "section": "Excavation Hazards", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Underground utilities located and marked", "section": "Excavation Hazards", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Excavation barricaded or protected from vehicles", "section": "Excavation Hazards", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Water accumulation controlled", "section": "Excavation Hazards", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No signs of cave-in or soil movement", "section": "Excavation Hazards", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Atmospheric testing conducted (if required)", "section": "Atmospheric Hazards", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of excavation and protective systems", "section": "Documentation", "sort_order": 17, "is_required": true, "requires_photo": true, "min_photos": 3, "max_photos": 10, "config": {"min_photos": 3, "max_photos": 10}}'::jsonb,
      '{"item_type": "signature", "label": "Competent Person Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "competent_person", "title": "Competent Person"}}'::jsonb
    ]
  );
END $$;

-- Template 12: PPE Compliance Audit
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "PPE Compliance Audit", "description": "Weekly personal protective equipment compliance spot check", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "ppe", "compliance", "audit"], "instructions": "Randomly audit workers across all trades. Document non-compliance and provide immediate correction.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "number", "label": "Number of workers audited", "section": "Audit Scope", "sort_order": 1, "is_required": true, "config": {"min": 1, "max": 100, "units": "workers"}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hard hats worn properly (not backwards unless approved)", "section": "Head Protection", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hard hats in good condition (no cracks, dents)", "section": "Head Protection", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Safety glasses worn where required", "section": "Eye Protection", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Side shields present on safety glasses", "section": "Eye Protection", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Face shields used for grinding operations", "section": "Eye Protection", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "High-visibility vests/shirts worn by all personnel", "section": "Visibility", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Reflective material visible and not faded", "section": "Visibility", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Steel-toe boots worn by all workers", "section": "Foot Protection", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Work gloves appropriate for task", "section": "Hand Protection", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cut-resistant gloves for sharp materials", "section": "Hand Protection", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hearing protection worn in high-noise areas", "section": "Hearing Protection", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Respirators worn where required", "section": "Respiratory Protection", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Respirator fit-testing current", "section": "Respiratory Protection", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "text", "label": "Non-compliance observations", "section": "Documentation", "sort_order": 15, "is_required": false, "config": {"placeholder": "List workers/areas with PPE deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Auditor Signature", "section": "Documentation", "sort_order": 16, "is_required": true, "config": {"role": "safety_auditor", "title": "Safety Auditor"}}'::jsonb
    ]
  );
END $$;

-- Template 13: Power Tool Safety Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Power Tool Safety Inspection", "description": "Monthly inspection of power tools and pneumatic equipment", "category": "Safety", "template_level": "system", "is_system_template": true, "tags": ["safety", "tools", "equipment", "monthly"], "instructions": "Inspect all power tools monthly. Tag deficient tools out of service immediately. Maintain inspection log.", "estimated_duration_minutes": 40, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Tool description/ID number", "section": "Tool Identification", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., DeWalt Circular Saw #123", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Power cord in good condition (no cuts, exposed wires)", "section": "Electrical Tools", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Plug intact with all prongs present", "section": "Electrical Tools", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Ground prong not removed or damaged", "section": "Electrical Tools", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Housing not cracked or damaged", "section": "General Condition", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Trigger/switch operates properly", "section": "General Condition", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tool operates without unusual noise or vibration", "section": "General Condition", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Safety guards in place and functional", "section": "Safety Features", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Blade/bit guards not removed or bypassed", "section": "Safety Features", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Safety labels legible", "section": "Safety Features", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Blades/bits sharp and properly installed", "section": "Cutting Tools", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Blade guard retracts and returns properly", "section": "Cutting Tools", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Air hoses in good condition (no leaks, cracks)", "section": "Pneumatic Tools", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Quick-connect fittings secure", "section": "Pneumatic Tools", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Safety clips/whip checks installed on hoses", "section": "Pneumatic Tools", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "text", "label": "Tools removed from service", "section": "Documentation", "sort_order": 16, "is_required": false, "config": {"placeholder": "List tool IDs tagged out...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "Tool Inspector"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - CONCRETE TEMPLATES (3 more: 14-16)
-- ============================================================================

-- Template 14: Post-Pour Concrete Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Post-Pour Concrete Inspection", "description": "Quality inspection after concrete placement and during curing", "category": "Quality - Concrete", "template_level": "system", "is_system_template": true, "tags": ["concrete", "quality", "post-pour", "curing"], "instructions": "Complete within 24 hours of concrete placement. Monitor curing conditions for 7 days minimum.", "estimated_duration_minutes": 25, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Pour location", "section": "Pour Information", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., Column Grid A-1 to A-5", "max_length": 200}}'::jsonb,
      '{"item_type": "number", "label": "Concrete volume placed (cubic yards)", "section": "Pour Information", "sort_order": 2, "is_required": true, "config": {"min": 0, "max": 10000, "units": "CY", "decimal_places": 1}}'::jsonb,
      '{"item_type": "checkbox", "label": "Surface finished per specification", "section": "Finishing", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No excessive bleeding or segregation observed", "section": "Finishing", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Surface properly screeded and floated", "section": "Finishing", "sort_order": 5, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joints tooled/formed as specified", "section": "Finishing", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Curing compound applied per manufacturer instructions", "section": "Curing", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wet curing initiated (if specified)", "section": "Curing", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Plastic sheeting placed for moisture retention", "section": "Curing", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Protection from freezing temperatures provided", "section": "Curing", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "number", "label": "Ambient temperature (°F)", "section": "Weather Conditions", "sort_order": 11, "is_required": true, "config": {"min": -20, "max": 120, "units": "°F"}}'::jsonb,
      '{"item_type": "checkbox", "label": "Test cylinders taken (minimum 1 set per 100 CY)", "section": "Quality Testing", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "number", "label": "Number of cylinder sets taken", "section": "Quality Testing", "sort_order": 13, "is_required": true, "config": {"min": 1, "max": 50, "units": "sets"}}'::jsonb,
      '{"item_type": "number", "label": "Slump test result", "section": "Quality Testing", "sort_order": 14, "is_required": true, "config": {"min": 0, "max": 12, "units": "inches", "decimal_places": 1}}'::jsonb,
      '{"item_type": "number", "label": "Air content (%)", "section": "Quality Testing", "sort_order": 15, "is_required": false, "config": {"min": 0, "max": 10, "units": "%", "decimal_places": 1}}'::jsonb,
      '{"item_type": "checkbox", "label": "No visible defects (honeycomb, voids, cracks)", "section": "Surface Quality", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of finished surface and curing", "section": "Documentation", "sort_order": 17, "is_required": true, "requires_photo": true, "min_photos": 3, "max_photos": 15, "config": {"min_photos": 3, "max_photos": 15}}'::jsonb,
      '{"item_type": "text", "label": "Special notes or deficiencies", "section": "Documentation", "sort_order": 18, "is_required": false, "config": {"placeholder": "Document any issues...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 15: Concrete Foundation Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Concrete Foundation Inspection", "description": "Comprehensive inspection for foundation walls, footings, and grade beams", "category": "Quality - Concrete", "template_level": "system", "is_system_template": true, "tags": ["concrete", "foundation", "structural", "quality"], "instructions": "Complete before foundation backfill. Coordinate with structural engineer for approval. Verify all embedded items.", "estimated_duration_minutes": 45, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Foundation dimensions match structural plans", "section": "Dimensions", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Foundation elevations verified by survey", "section": "Dimensions", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wall thickness meets specifications", "section": "Dimensions", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Footing width and depth per plans", "section": "Dimensions", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No visible cracks exceeding specification limits", "section": "Concrete Quality", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No honeycomb or voids in concrete", "section": "Concrete Quality", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Surface smooth and dense", "section": "Concrete Quality", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper concrete cover achieved", "section": "Concrete Quality", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchor bolts properly placed and plumb", "section": "Embedded Items", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchor bolt embedment depth verified", "section": "Embedded Items", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sleeves for mechanical/electrical properly located", "section": "Embedded Items", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Keyways formed where required", "section": "Construction Joints", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Waterstops installed at joints", "section": "Waterproofing", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Waterproofing membrane applied per specification", "section": "Waterproofing", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Dampproofing coating complete", "section": "Waterproofing", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Drainage system installed (if required)", "section": "Waterproofing", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of foundation (overall and details)", "section": "Documentation", "sort_order": 17, "is_required": true, "requires_photo": true, "min_photos": 8, "max_photos": 25, "config": {"min_photos": 8, "max_photos": 25}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb,
      '{"item_type": "signature", "label": "Structural Engineer Approval", "section": "Documentation", "sort_order": 19, "is_required": false, "config": {"role": "engineer", "title": "Structural Engineer"}}'::jsonb
    ]
  );
END $$;

-- Template 16: Structural Slab Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Structural Slab Inspection", "description": "Elevated structural slab inspection before and after concrete placement", "category": "Quality - Concrete", "template_level": "system", "is_system_template": true, "tags": ["concrete", "slab", "structural", "quality"], "instructions": "Pre-pour portion completed before concrete. Post-pour portion within 24 hours. Coordinate with structural engineer.", "estimated_duration_minutes": 50, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Slab thickness verified per structural drawings", "section": "Slab Dimensions", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Slab elevations established and verified", "section": "Slab Dimensions", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Formwork properly supported and braced", "section": "Formwork", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Deck forms level within tolerance", "section": "Formwork", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Edge forms secure and properly aligned", "section": "Formwork", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Reshoring/post-tensioning (PT) installed per engineered plan", "section": "Formwork", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Reinforcing steel size, spacing, and grade verified", "section": "Reinforcement", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rebar chairs/supports providing proper cover", "section": "Reinforcement", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Top mat rebar properly supported", "section": "Reinforcement", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Temperature/shrinkage reinforcement installed", "section": "Reinforcement", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Welded wire mesh (WWM) positioned correctly", "section": "Reinforcement", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Conduit/sleeves properly located and secured", "section": "Embedments", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "MEP embedments do not conflict with reinforcement", "section": "Embedments", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Inserts/anchors installed per structural drawings", "section": "Embedments", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Vapor barrier installed (if required)", "section": "Pre-Pour Conditions", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Forms cleaned and release agent applied", "section": "Pre-Pour Conditions", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Concrete placement proceeded systematically", "section": "Post-Pour Observations", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No excessive deflection of forms during pour", "section": "Post-Pour Observations", "sort_order": 18, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Surface finished level and smooth", "section": "Post-Pour Observations", "sort_order": 19, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Curing procedures initiated", "section": "Post-Pour Observations", "sort_order": 20, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of reinforcement and post-pour conditions", "section": "Documentation", "sort_order": 21, "is_required": true, "requires_photo": true, "min_photos": 6, "max_photos": 20, "config": {"min_photos": 6, "max_photos": 20}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 22, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb,
      '{"item_type": "signature", "label": "Structural Engineer Approval", "section": "Documentation", "sort_order": 23, "is_required": true, "config": {"role": "engineer", "title": "Structural Engineer"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - SITEWORK TEMPLATES (4 more: 17-20)
-- ============================================================================

-- Template 17: Erosion Control Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Erosion Control Inspection", "description": "Stormwater pollution prevention and erosion control inspection", "category": "Quality - Sitework", "template_level": "system", "is_system_template": true, "tags": ["sitework", "erosion-control", "stormwater", "environmental"], "instructions": "Weekly inspection required by NPDES permit. Document all BMPs. Inspect within 24 hours after rain events.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Silt fences installed and maintained", "section": "Perimeter Controls", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Silt fence fabric intact (no tears or gaps)", "section": "Perimeter Controls", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Inlet protection devices in place and functional", "section": "Perimeter Controls", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Construction entrance/exit stabilized", "section": "Stabilization", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tracking of sediment onto roads minimized", "section": "Stabilization", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Disturbed areas stabilized within 14 days", "section": "Stabilization", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Temporary or permanent seeding completed", "section": "Stabilization", "sort_order": 7, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Stockpiles covered or protected", "section": "Material Management", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No evidence of off-site sediment discharge", "section": "Discharge Points", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Storm drains protected and clear", "section": "Discharge Points", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Detention basins functioning properly", "section": "Discharge Points", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No evidence of spills or contamination", "section": "Spill Prevention", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Spill kits available and stocked", "section": "Spill Prevention", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "text", "label": "Rain event details (if applicable)", "section": "Weather Conditions", "sort_order": 14, "is_required": false, "config": {"placeholder": "Rainfall amount and duration...", "multiline": true, "max_length": 300}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of BMPs and any deficiencies", "section": "Documentation", "sort_order": 15, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Corrective actions required", "section": "Documentation", "sort_order": 16, "is_required": false, "config": {"placeholder": "List required corrections...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "SWPPP Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 18: Underground Utilities Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Underground Utilities Inspection", "description": "Pre-backfill inspection of underground water, sewer, storm, and electrical systems", "category": "Quality - Sitework", "template_level": "system", "is_system_template": true, "tags": ["sitework", "utilities", "underground", "pre-backfill"], "instructions": "Complete before backfill. Video inspection and pressure testing required. Coordinate with utility companies and inspectors.", "estimated_duration_minutes": 40, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Utility type and location", "section": "Utility Identification", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., 8-inch sanitary sewer from MH-1 to MH-2", "max_length": 300}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pipe type and size match approved drawings", "section": "Pipe Installation", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper bedding material installed", "section": "Pipe Installation", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pipe laid to proper grade and alignment", "section": "Pipe Installation", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joints properly assembled per manufacturer specs", "section": "Pipe Installation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pipe clean and free of debris", "section": "Pipe Installation", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper cover depth maintained", "section": "Pipe Installation", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Manholes/structures plumb and properly set", "section": "Structures", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Manhole inverts properly formed", "section": "Structures", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Valve boxes accessible and plumb", "section": "Structures", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hydrostatic pressure test passed (water/sewer)", "section": "Testing", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Air test passed (sanitary sewer)", "section": "Testing", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Video inspection completed and acceptable", "section": "Testing", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Electrical conduit tested for continuity", "section": "Testing", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Warning tape installed above utilities", "section": "Protection", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "As-built measurements recorded", "section": "Documentation", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of installation before backfill", "section": "Documentation", "sort_order": 17, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "inspector", "title": "Utilities Inspector"}}'::jsonb,
      '{"item_type": "signature", "label": "Municipal Inspector Approval", "section": "Documentation", "sort_order": 19, "is_required": false, "config": {"role": "municipal_inspector", "title": "City/County Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 19: Waterproofing & Dampproofing
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Waterproofing & Dampproofing", "description": "Below-grade waterproofing and dampproofing installation inspection", "category": "Quality - Sitework", "template_level": "system", "is_system_template": true, "tags": ["sitework", "waterproofing", "foundation", "moisture-protection"], "instructions": "Inspect substrate preparation and membrane application. Complete before backfill or protection board installation.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Waterproofing system type", "section": "System Information", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., Fluid-applied membrane, sheet membrane", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Substrate clean, dry, and properly prepared", "section": "Substrate Preparation", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All form ties removed and holes patched", "section": "Substrate Preparation", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Surface defects repaired (honeycombing, voids)", "section": "Substrate Preparation", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joints and transitions properly detailed", "section": "Substrate Preparation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Primer applied per manufacturer specifications", "section": "Application", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Membrane applied at proper thickness/coverage rate", "section": "Application", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Laps and seams properly overlapped and sealed", "section": "Application", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Membrane continuous with no gaps or voids", "section": "Application", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Corners and transitions properly reinforced", "section": "Application", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Penetrations properly sealed and flashed", "section": "Penetrations & Details", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Termination details properly executed", "section": "Penetrations & Details", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Protection board installed where required", "section": "Protection", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Drainage composite installed per plan", "section": "Protection", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Flood test performed and passed (if applicable)", "section": "Testing", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of substrate prep and membrane application", "section": "Documentation", "sort_order": 16, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies or repairs required", "section": "Documentation", "sort_order": 17, "is_required": false, "config": {"placeholder": "Document any issues...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 20: Backfill & Compaction
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Backfill & Compaction", "description": "Foundation and utility trench backfill and compaction inspection", "category": "Quality - Sitework", "template_level": "system", "is_system_template": true, "tags": ["sitework", "backfill", "compaction", "geotechnical"], "instructions": "Inspect material and witness compaction testing. Document lift thickness and test results. Coordinate with geotechnical engineer.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Backfill location", "section": "Location", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., Foundation west wall, grid A-D", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Approved fill material being used", "section": "Material", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Material free of organic matter and debris", "section": "Material", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fill material moisture content acceptable", "section": "Material", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Lift thickness per specifications (typically 8-12 inches)", "section": "Placement", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Each lift properly compacted before next lift", "section": "Placement", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper compaction equipment used", "section": "Compaction", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Foundation drainage not damaged during backfill", "section": "Protection", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Waterproofing/dampproofing protected during backfill", "section": "Protection", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Utility warning tape in place", "section": "Protection", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Nuclear density tests performed", "section": "Testing", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "number", "label": "Number of compaction tests performed", "section": "Testing", "sort_order": 12, "is_required": true, "config": {"min": 1, "max": 50, "units": "tests"}}'::jsonb,
      '{"item_type": "number", "label": "Average compaction achieved (%)", "section": "Testing", "sort_order": 13, "is_required": true, "config": {"min": 85, "max": 100, "units": "%", "decimal_places": 1}}'::jsonb,
      '{"item_type": "checkbox", "label": "All tests meet or exceed specification", "section": "Testing", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of backfill operations and testing", "section": "Documentation", "sort_order": 15, "is_required": true, "requires_photo": true, "min_photos": 3, "max_photos": 15, "config": {"min_photos": 3, "max_photos": 15}}'::jsonb,
      '{"item_type": "text", "label": "Test failures or remedial work required", "section": "Documentation", "sort_order": 16, "is_required": false, "config": {"placeholder": "Document any failed tests or recompaction areas...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "Geotechnical Inspector"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - STRUCTURAL TEMPLATES (5 templates: 21-25)
-- ============================================================================

-- Template 21: Structural Steel Erection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Structural Steel Erection", "description": "Structural steel framing erection and connection inspection", "category": "Quality - Structural", "template_level": "system", "is_system_template": true, "tags": ["structural", "steel", "erection", "quality"], "instructions": "Inspect during erection and before fireproofing. Verify member sizes, connections, and alignment. Coordinate with structural engineer.", "estimated_duration_minutes": 45, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Steel members match approved shop drawings", "section": "Member Verification", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Member sizes and grades verified", "section": "Member Verification", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Mill test reports on file", "section": "Member Verification", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchor bolts properly positioned and embedded", "section": "Base Plates & Anchors", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Base plates level and properly grouted", "section": "Base Plates & Anchors", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Grout properly mixed and placed (no voids)", "section": "Base Plates & Anchors", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Columns plumb within tolerance (1:500)", "section": "Alignment", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Beams level and properly aligned", "section": "Alignment", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Member alignment within AISC tolerances", "section": "Alignment", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Bolted connections: Proper bolt size, grade, and quantity", "section": "Connections", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "High-strength bolts properly tensioned/verified", "section": "Connections", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Bolt holes align without drifting or reaming", "section": "Connections", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Welded connections: Welder certifications current", "section": "Welding", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weld sizes and types per shop drawings", "section": "Welding", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Visual weld inspection acceptable", "section": "Welding", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "UT/MT testing completed (if required)", "section": "Welding", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Temporary bracing installed and adequate", "section": "Safety & Bracing", "sort_order": 17, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Permanent bracing installed per plans", "section": "Safety & Bracing", "sort_order": 18, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of connections and overall framing", "section": "Documentation", "sort_order": 19, "is_required": true, "requires_photo": true, "min_photos": 8, "max_photos": 25, "config": {"min_photos": 8, "max_photos": 25}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies requiring correction", "section": "Documentation", "sort_order": 20, "is_required": false, "config": {"placeholder": "List any deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 21, "is_required": true, "config": {"role": "inspector", "title": "Steel Inspector"}}'::jsonb,
      '{"item_type": "signature", "label": "Structural Engineer Approval", "section": "Documentation", "sort_order": 22, "is_required": true, "config": {"role": "engineer", "title": "Structural Engineer"}}'::jsonb
    ]
  );
END $$;

-- Template 22: Masonry Construction
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Masonry Construction", "description": "CMU and brick masonry construction quality inspection", "category": "Quality - Structural", "template_level": "system", "is_system_template": true, "tags": ["structural", "masonry", "cmu", "brick"], "instructions": "Daily inspection during masonry work. Verify materials, mortar, and workmanship. Coordinate with structural engineer for reinforcement.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Masonry units meet specifications (size, strength)", "section": "Materials", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Units stored properly off ground and covered", "section": "Materials", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Mortar mix proportions verified", "section": "Mortar", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Mortar consistency appropriate for placement", "section": "Mortar", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Mortar used within 2.5 hours of mixing", "section": "Mortar", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Full mortar coverage on bed joints", "section": "Workmanship", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Head joints fully filled", "section": "Workmanship", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joint thickness consistent (3/8 inch typical)", "section": "Workmanship", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Units laid plumb, level, and to line", "section": "Workmanship", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper bond pattern maintained", "section": "Workmanship", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Vertical reinforcement placed per drawings", "section": "Reinforcement", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Horizontal reinforcement (bond beams/joint reinforcement)", "section": "Reinforcement", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Grout slump within specification", "section": "Grouting", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cells properly consolidated during grouting", "section": "Grouting", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cleanouts used and sealed after grouting", "section": "Grouting", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Flashing installed at required locations", "section": "Flashing & Moisture Protection", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weep holes provided", "section": "Flashing & Moisture Protection", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of reinforcement, grouting, and finished work", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"role": "inspector", "title": "Masonry Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 23: Wood Framing Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Wood Framing Inspection", "description": "Structural wood framing inspection for walls, floors, and roof", "category": "Quality - Structural", "template_level": "system", "is_system_template": true, "tags": ["structural", "wood", "framing", "quality"], "instructions": "Inspect during framing before sheathing or drywall installation. Verify lumber grades, spacing, and connections.", "estimated_duration_minutes": 40, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Lumber grades and sizes match specifications", "section": "Materials", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Lumber properly stored and protected from weather", "section": "Materials", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pressure-treated lumber used where required", "section": "Materials", "sort_order": 3, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wall studs properly spaced per plans (typically 16 or 24 inches OC)", "section": "Wall Framing", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Walls plumb within tolerance", "section": "Wall Framing", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Headers properly sized for span and load", "section": "Wall Framing", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper blocking and fire blocking installed", "section": "Wall Framing", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Floor joists sized and spaced per structural plans", "section": "Floor Framing", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joist hangers properly installed with correct fasteners", "section": "Floor Framing", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Bridging/blocking installed per code", "section": "Floor Framing", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Rafters/trusses properly spaced and aligned", "section": "Roof Framing", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Truss bracing installed per engineered plan", "section": "Roof Framing", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hurricane ties/straps installed where required", "section": "Connections", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper nailing schedule followed", "section": "Connections", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Engineered lumber installed per manufacturer specs", "section": "Connections", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of framing connections and overall work", "section": "Documentation", "sort_order": 16, "is_required": true, "requires_photo": true, "min_photos": 6, "max_photos": 20, "config": {"min_photos": 6, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies noted", "section": "Documentation", "sort_order": 17, "is_required": false, "config": {"placeholder": "List any deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "inspector", "title": "Framing Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 24: Post-Tension Cable Installation
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Post-Tension Cable Installation", "description": "Pre-stress and post-tension cable system installation inspection", "category": "Quality - Structural", "template_level": "system", "is_system_template": true, "tags": ["structural", "post-tension", "concrete", "quality"], "instructions": "Inspect before and during stressing operations. Verify cable layout, stressing sequence, and elongation. Coordinate with structural engineer.", "estimated_duration_minutes": 50, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "PT system designed by licensed engineer", "section": "Design Verification", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Shop drawings approved and on-site", "section": "Design Verification", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tendon material certificates on file", "section": "Materials", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchorages and hardware match specifications", "section": "Materials", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tendons laid out per approved shop drawings", "section": "Installation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper spacing maintained between tendons", "section": "Installation", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tendons properly supported and tied", "section": "Installation", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Anchorages properly positioned and secured", "section": "Installation", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sheathing/ducts continuous with no damage", "section": "Installation", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Concrete strength meets stressing requirements", "section": "Stressing", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Stressing equipment calibrated within last 6 months", "section": "Stressing", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Stressing sequence per approved shop drawings", "section": "Stressing", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Elongation measurements within acceptable range", "section": "Stressing", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pressure gauge readings recorded", "section": "Stressing", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Wedges properly seated", "section": "Stressing", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Strand ends cut and anchors protected", "section": "Completion", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pockets grouted (if required)", "section": "Completion", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of layout, stressing, and completed work", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 8, "max_photos": 25, "config": {"min_photos": 8, "max_photos": 25}}'::jsonb,
      '{"item_type": "text", "label": "Stressing data summary", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"placeholder": "Record stressing data...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "PT Technician Signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "pt_tech", "title": "PT Technician"}}'::jsonb,
      '{"item_type": "signature", "label": "Structural Engineer Approval", "section": "Documentation", "sort_order": 21, "is_required": true, "config": {"role": "engineer", "title": "Structural Engineer"}}'::jsonb
    ]
  );
END $$;

-- Template 25: Welding Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Welding Inspection", "description": "Structural and miscellaneous welding quality inspection per AWS standards", "category": "Quality - Structural", "template_level": "system", "is_system_template": true, "tags": ["structural", "welding", "quality", "aws"], "instructions": "Inspect before, during, and after welding. Verify welder qualifications, procedures, and visual inspection. Coordinate NDT testing.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Welder certifications current and on file", "section": "Welder Qualification", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Welding procedure specification (WPS) approved", "section": "Procedures", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Welders following approved WPS", "section": "Procedures", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Base metal properly prepared (clean, dry)", "section": "Preparation", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joint fit-up within tolerance", "section": "Preparation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Preheat requirements met (if applicable)", "section": "Preparation", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Correct electrode/filler metal used", "section": "Materials", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Electrodes properly stored", "section": "Materials", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Shielding gas type and flow rate correct", "section": "Materials", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weld size meets drawing requirements", "section": "Visual Inspection", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Welds free of cracks", "section": "Visual Inspection", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No excessive porosity or undercut", "section": "Visual Inspection", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper weld profile (no excessive convexity/concavity)", "section": "Visual Inspection", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Slag and spatter removed", "section": "Visual Inspection", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "UT (ultrasonic testing) completed and acceptable", "section": "NDT Testing", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "MT (magnetic particle testing) passed", "section": "NDT Testing", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "RT (radiographic testing) acceptable", "section": "NDT Testing", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of completed welds", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies or repairs required", "section": "Documentation", "sort_order": 19, "is_required": false, "config": {"placeholder": "Document any deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Welding Inspector Signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "welding_inspector", "title": "CWI"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - ENVELOPE TEMPLATES (5 templates: 26-30)
-- ============================================================================

-- Template 26: Roofing System Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Roofing System Inspection", "description": "Roof membrane, flashing, and drainage system installation inspection", "category": "Quality - Envelope", "template_level": "system", "is_system_template": true, "tags": ["envelope", "roofing", "waterproofing", "quality"], "instructions": "Inspect during installation phases. Verify substrate, membrane, and flashing details. Final inspection before substantial completion.", "estimated_duration_minutes": 45, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Roof system type", "section": "System Information", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., TPO single-ply, EPDM, built-up", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Roof deck clean, dry, and structurally sound", "section": "Substrate", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper slope to drains (minimum 1/4 inch per foot)", "section": "Substrate", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No ponding water areas", "section": "Substrate", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Insulation properly installed and fastened", "section": "Insulation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Insulation R-value meets code requirements", "section": "Insulation", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cover board installed (if required)", "section": "Insulation", "sort_order": 7, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Membrane installed per manufacturer specifications", "section": "Membrane", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Seams properly welded/adhered", "section": "Membrane", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No wrinkles, fishmouths, or defects", "section": "Membrane", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Penetrations properly flashed and sealed", "section": "Flashings", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Parapet and wall flashings installed", "section": "Flashings", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Edge metal properly fastened and sealed", "section": "Flashings", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Drains and scuppers properly installed", "section": "Drainage", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Overflow drains functional", "section": "Drainage", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Flood test performed (if applicable)", "section": "Testing", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Manufacturer warranty obtained", "section": "Warranty", "sort_order": 17, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of membrane, flashings, and details", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 10, "max_photos": 30, "config": {"min_photos": 10, "max_photos": 30}}'::jsonb,
      '{"item_type": "signature", "label": "Roofing Inspector Signature", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"role": "inspector", "title": "Roofing Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 27: Window & Door Installation
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Window & Door Installation", "description": "Exterior window and door installation quality and waterproofing inspection", "category": "Quality - Envelope", "template_level": "system", "is_system_template": true, "tags": ["envelope", "windows", "doors", "waterproofing"], "instructions": "Inspect during rough opening prep and after installation. Verify flashing, sealing, and operation. Test for air/water infiltration.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Rough opening dimensions match specifications", "section": "Rough Opening", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sill properly sloped for drainage", "section": "Rough Opening", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sill pan or flashing installed", "section": "Rough Opening", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Jamb flashing installed (shingle-fashion)", "section": "Rough Opening", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Unit matches approved submittals", "section": "Unit Installation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Unit plumb, level, and square", "section": "Unit Installation", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper shimming and support", "section": "Unit Installation", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fasteners properly installed per manufacturer", "section": "Unit Installation", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Perimeter sealed with approved sealant", "section": "Sealing", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Interior gaps filled with insulation", "section": "Sealing", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Backer rod installed before sealant", "section": "Sealing", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Head flashing installed and integrated", "section": "Flashing", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weep system functional", "section": "Flashing", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Windows/doors operate smoothly", "section": "Operation", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hardware functions properly", "section": "Operation", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weatherstripping intact and functional", "section": "Operation", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Water test performed and passed", "section": "Testing", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of flashing details and installation", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 4, "max_photos": 15, "config": {"min_photos": 4, "max_photos": 15}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"role": "inspector", "title": "Envelope Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 28: Exterior Cladding
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Exterior Cladding", "description": "Exterior wall cladding installation and attachment inspection", "category": "Quality - Envelope", "template_level": "system", "is_system_template": true, "tags": ["envelope", "cladding", "facade", "quality"], "instructions": "Inspect substrate, attachment, and drainage plane. Verify alignment, spacing, and weatherproofing details.", "estimated_duration_minutes": 40, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Cladding system type", "section": "System Information", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., Fiber cement siding, metal panels, brick veneer", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sheathing properly installed and fastened", "section": "Substrate", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weather-resistive barrier (WRB) installed", "section": "Substrate", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "WRB laps properly oriented (shingle-fashion)", "section": "Substrate", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Drainage plane established", "section": "Drainage", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weeps or vents provided", "section": "Drainage", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cladding material meets specifications", "section": "Materials", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fasteners appropriate for substrate and cladding", "section": "Attachment", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper fastener spacing and penetration", "section": "Attachment", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Expansion joints provided where required", "section": "Attachment", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cladding plumb and level", "section": "Installation Quality", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joints consistent and properly spaced", "section": "Installation Quality", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Corners and transitions properly detailed", "section": "Installation Quality", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Trim and accessories properly installed", "section": "Installation Quality", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sealant joints properly tooled", "section": "Sealants", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of overall installation and details", "section": "Documentation", "sort_order": 16, "is_required": true, "requires_photo": true, "min_photos": 6, "max_photos": 20, "config": {"min_photos": 6, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies noted", "section": "Documentation", "sort_order": 17, "is_required": false, "config": {"placeholder": "List any deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "inspector", "title": "Envelope Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 29: Air & Water Barrier
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Air & Water Barrier", "description": "Building envelope air barrier and water-resistive barrier installation inspection", "category": "Quality - Envelope", "template_level": "system", "is_system_template": true, "tags": ["envelope", "air-barrier", "waterproofing", "energy"], "instructions": "Inspect during installation. Verify continuity, laps, penetrations, and transitions. Required for energy code compliance.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Barrier system type", "section": "System Information", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., Self-adhered membrane, fluid-applied, mechanically-attached", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Substrate clean, dry, and properly prepared", "section": "Substrate", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weather conditions acceptable for installation", "section": "Substrate", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Barrier installed per manufacturer specifications", "section": "Application", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper thickness/coverage rate achieved", "section": "Application", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Laps oriented correctly (shingle-fashion)", "section": "Laps & Seams", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Minimum lap width achieved (typically 6 inches)", "section": "Laps & Seams", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Seams properly adhered/sealed", "section": "Laps & Seams", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Penetrations properly sealed and flashed", "section": "Penetrations", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fastener penetrations sealed", "section": "Penetrations", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Transitions to dissimilar materials detailed", "section": "Transitions", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Foundation-to-wall transition continuous", "section": "Transitions", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Roof-to-wall transition sealed", "section": "Transitions", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Window and door rough openings properly flashed", "section": "Rough Openings", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sill pans installed and integrated", "section": "Rough Openings", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Blower door test scheduled/completed", "section": "Testing", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of installation and critical details", "section": "Documentation", "sort_order": 17, "is_required": true, "requires_photo": true, "min_photos": 8, "max_photos": 25, "config": {"min_photos": 8, "max_photos": 25}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies or repairs", "section": "Documentation", "sort_order": 18, "is_required": false, "config": {"placeholder": "Document any issues...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"role": "inspector", "title": "Envelope Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 30: Sealant & Caulking
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Sealant & Caulking", "description": "Exterior joint sealant and caulking installation quality inspection", "category": "Quality - Envelope", "template_level": "system", "is_system_template": true, "tags": ["envelope", "sealant", "caulking", "waterproofing"], "instructions": "Inspect joint preparation and sealant application. Verify joint width, backer rod, and tooling. Critical for building envelope performance.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Sealant type approved for application", "section": "Materials", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sealant within shelf life", "section": "Materials", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Primer specified and on-site (if required)", "section": "Materials", "sort_order": 3, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joint surfaces clean and dry", "section": "Joint Preparation", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joint width uniform and within spec", "section": "Joint Preparation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joint depth appropriate for width", "section": "Joint Preparation", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Backer rod properly sized and installed", "section": "Backer Rod", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Backer rod not damaged during installation", "section": "Backer Rod", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Bond breaker tape used (where backer rod not possible)", "section": "Backer Rod", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Primer applied per manufacturer (if required)", "section": "Application", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sealant fully fills joint with no voids", "section": "Application", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sealant properly tooled (concave profile)", "section": "Application", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Three-sided adhesion prevented", "section": "Application", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sealant adhered to both substrates", "section": "Application", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No air bubbles or pinholes visible", "section": "Visual Quality", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joint surface smooth and uniform", "section": "Visual Quality", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Weather conditions acceptable during application", "section": "Conditions", "sort_order": 17, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of sealant joints and details", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies requiring correction", "section": "Documentation", "sort_order": 19, "is_required": false, "config": {"placeholder": "List deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "inspector", "title": "Envelope Inspector"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - MEP TEMPLATES (5 more: 31-35)
-- ============================================================================

-- Template 31: Mechanical Rough-In Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Mechanical Rough-In Inspection", "description": "HVAC ductwork, piping, and equipment rough-in inspection", "category": "Quality - MEP", "template_level": "system", "is_system_template": true, "tags": ["mep", "mechanical", "hvac", "rough-in"], "instructions": "Inspect before drywall/ceiling installation. Verify ductwork, supports, and clearances. Coordinate with mechanical engineer.", "estimated_duration_minutes": 40, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Ductwork sizes match approved mechanical drawings", "section": "Ductwork", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Ductwork properly supported (max 10 ft spacing)", "section": "Ductwork", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Duct joints properly sealed (mastic/tape)", "section": "Ductwork", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire dampers installed at rated assemblies", "section": "Ductwork", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Duct insulation installed where required", "section": "Ductwork", "sort_order": 5, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Flexible duct properly installed (max 5 ft runs, no kinks)", "section": "Ductwork", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Refrigerant piping properly sized and installed", "section": "Piping", "sort_order": 7, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Refrigerant lines properly insulated", "section": "Piping", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Condensate drains properly pitched and trapped", "section": "Piping", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hydronic piping properly supported", "section": "Piping", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Equipment pads/curbs level and properly located", "section": "Equipment", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Adequate clearances for equipment service", "section": "Equipment", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Vibration isolation provided where required", "section": "Equipment", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Electrical disconnects located properly", "section": "Electrical", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of ductwork, piping, and equipment locations", "section": "Documentation", "sort_order": 15, "is_required": true, "requires_photo": true, "min_photos": 6, "max_photos": 20, "config": {"min_photos": 6, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies noted", "section": "Documentation", "sort_order": 16, "is_required": false, "config": {"placeholder": "List deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "Mechanical Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 32: Plumbing Rough-In Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Plumbing Rough-In Inspection", "description": "Plumbing pipes, drains, vents, and fixtures rough-in inspection", "category": "Quality - MEP", "template_level": "system", "is_system_template": true, "tags": ["mep", "plumbing", "rough-in", "quality"], "instructions": "Inspect before wall/ceiling closure. Verify pipe sizing, supports, and testing. Coordinate pressure testing.", "estimated_duration_minutes": 45, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Water supply piping properly sized per code", "section": "Water Supply", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Supply pipes properly supported (per code spacing)", "section": "Water Supply", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hot water lines insulated where required", "section": "Water Supply", "sort_order": 3, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Water hammer arrestors installed where required", "section": "Water Supply", "sort_order": 4, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pressure test performed and passed (100 psi minimum)", "section": "Water Supply", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "DWV piping properly sized per code", "section": "Drain Waste Vent", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Drain pipes properly sloped (1/4 inch per foot minimum)", "section": "Drain Waste Vent", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All drains properly trapped", "section": "Drain Waste Vent", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Vents properly sized and located", "section": "Drain Waste Vent", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "DWV system tested (water or air test passed)", "section": "Drain Waste Vent", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cleanouts provided per code requirements", "section": "Drain Waste Vent", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Gas piping properly sized and supported", "section": "Gas Piping", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Gas piping pressure tested and certified", "section": "Gas Piping", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fixture stub-outs at proper heights", "section": "Fixtures", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Water heater properly located with clearances", "section": "Fixtures", "sort_order": 15, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Backflow preventers installed where required", "section": "Fixtures", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of piping and test documentation", "section": "Documentation", "sort_order": 17, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Test results and deficiencies", "section": "Documentation", "sort_order": 18, "is_required": false, "config": {"placeholder": "Document test results...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Plumbing Inspector Signature", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"role": "inspector", "title": "Plumbing Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 33: HVAC Final Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "HVAC Final Inspection", "description": "Final HVAC system startup, testing, and balancing inspection", "category": "Quality - MEP", "template_level": "system", "is_system_template": true, "tags": ["mep", "hvac", "final", "commissioning"], "instructions": "Final inspection after system startup. Verify operation, controls, and TAB reports. Required for occupancy.", "estimated_duration_minutes": 50, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "All equipment installed per approved submittals", "section": "Equipment", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Equipment startup reports submitted", "section": "Equipment", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Filters installed and clean", "section": "Equipment", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Refrigerant charge verified", "section": "Equipment", "sort_order": 4, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All registers/grilles installed", "section": "Distribution", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Dampers accessible and operational", "section": "Distribution", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "TAB (Test, Adjust, Balance) report received", "section": "Balancing", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Airflow meets design specifications", "section": "Balancing", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Space temperatures maintained per design", "section": "Balancing", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Controls programmed and operational", "section": "Controls", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Thermostats properly located and functional", "section": "Controls", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "BMS (Building Management System) integrated", "section": "Controls", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fresh air/ventilation rates meet code", "section": "Ventilation", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "CO2 sensors functional (if required)", "section": "Ventilation", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Owner training completed", "section": "Commissioning", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "O&M manuals delivered", "section": "Commissioning", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Warranties registered", "section": "Commissioning", "sort_order": 17, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of installed equipment and nameplates", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Outstanding items or deficiencies", "section": "Documentation", "sort_order": 19, "is_required": false, "config": {"placeholder": "List any outstanding items...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Mechanical Inspector Signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "inspector", "title": "Mechanical Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 34: Fire Protection System
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Fire Protection System", "description": "Fire sprinkler system installation and testing inspection", "category": "Quality - MEP", "template_level": "system", "is_system_template": true, "tags": ["mep", "fire-protection", "sprinkler", "life-safety"], "instructions": "Inspect rough-in and final installation. Verify hydraulic testing. Coordinate with AHJ for final acceptance.", "estimated_duration_minutes": 40, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "System designed by licensed fire protection engineer", "section": "Design", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Approved shop drawings on-site", "section": "Design", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pipe sizes match hydraulic calculations", "section": "Piping", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Piping properly supported (NFPA 13 requirements)", "section": "Piping", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pipe grooved/threaded joints per NFPA 13", "section": "Piping", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hangers seismically braced where required", "section": "Piping", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sprinkler heads proper type for application", "section": "Sprinkler Heads", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Head spacing meets NFPA 13 requirements", "section": "Sprinkler Heads", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper clearance below sprinkler heads", "section": "Sprinkler Heads", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Escutcheons installed at ceiling penetrations", "section": "Sprinkler Heads", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hydrostatic pressure test passed (200 psi, 2 hours)", "section": "Testing", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Main drain test performed", "section": "Testing", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Alarm devices tested and functional", "section": "Testing", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire department connection accessible", "section": "Fire Department Connection", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "FDC properly signed and visible", "section": "Fire Department Connection", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Control valves supervised and accessible", "section": "Valves", "sort_order": 16, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hydraulic nameplate installed", "section": "Documentation", "sort_order": 17, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of system components and test", "section": "Documentation", "sort_order": 18, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Test results summary", "section": "Documentation", "sort_order": 19, "is_required": true, "config": {"placeholder": "Summarize test results...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Fire Protection Inspector Signature", "section": "Documentation", "sort_order": 20, "is_required": true, "config": {"role": "inspector", "title": "Fire Protection Inspector"}}'::jsonb,
      '{"item_type": "signature", "label": "AHJ Approval", "section": "Documentation", "sort_order": 21, "is_required": false, "config": {"role": "ahj", "title": "Fire Marshal"}}'::jsonb
    ]
  );
END $$;

-- Template 35: Low Voltage & Data Systems
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Low Voltage & Data Systems", "description": "Low voltage, data, telecommunications, and security system rough-in inspection", "category": "Quality - MEP", "template_level": "system", "is_system_template": true, "tags": ["mep", "low-voltage", "data", "telecom"], "instructions": "Inspect cable pathways, terminations, and testing. Verify separation from power systems. Test certify data cables.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Cable pathways properly sized and installed", "section": "Pathways", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper separation from power systems maintained", "section": "Pathways", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire stopping at rated penetrations", "section": "Pathways", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cable types appropriate for application", "section": "Cabling", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Plenum-rated cable in plenum spaces", "section": "Cabling", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cable properly supported (no tension on connections)", "section": "Cabling", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Bend radius maintained per manufacturer specs", "section": "Cabling", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cables properly labeled at both ends", "section": "Cabling", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Patch panels/racks properly installed", "section": "Terminations", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Terminations meet TIA/EIA standards", "section": "Terminations", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper cable management in racks", "section": "Terminations", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Data cables certified (Cat6/Cat6A per spec)", "section": "Testing", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fiber optic cables tested (OTDR if required)", "section": "Testing", "sort_order": 13, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "As-built cable documentation provided", "section": "Documentation", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of cable installations and racks", "section": "Documentation", "sort_order": 15, "is_required": true, "requires_photo": true, "min_photos": 4, "max_photos": 15, "config": {"min_photos": 4, "max_photos": 15}}'::jsonb,
      '{"item_type": "text", "label": "Test results summary", "section": "Documentation", "sort_order": 16, "is_required": false, "config": {"placeholder": "Summarize certification test results...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Low Voltage Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "LV Inspector"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- QUALITY - FINISHES TEMPLATES (4 templates: 36-39)
-- ============================================================================

-- Template 36: Pre-Drywall Inspection
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Pre-Drywall Inspection", "description": "Final inspection before drywall installation covering all rough-in systems", "category": "Quality - Finishes", "template_level": "system", "is_system_template": true, "tags": ["finishes", "pre-drywall", "rough-in", "quality"], "instructions": "Comprehensive inspection before drywall. Verify all rough-in work complete. Coordinate all trade inspections.", "estimated_duration_minutes": 60, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "All framing inspections complete and approved", "section": "Framing", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire blocking and draft stopping installed", "section": "Framing", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Electrical rough-in approved", "section": "MEP Systems", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Plumbing rough-in approved and tested", "section": "MEP Systems", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "HVAC rough-in complete", "section": "MEP Systems", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Low voltage/data rough-in complete", "section": "MEP Systems", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Insulation installed in exterior walls", "section": "Insulation", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Vapor barrier installed where required", "section": "Insulation", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sound insulation in rated assemblies", "section": "Insulation", "sort_order": 9, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All penetrations properly sealed/protected", "section": "Penetrations", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire-rated penetrations properly fire stopped", "section": "Penetrations", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Window/door bucks installed and flashed", "section": "Openings", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Backing installed for wall-mounted items", "section": "Blocking & Backing", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Shower/tub backing properly located", "section": "Blocking & Backing", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "All debris and materials removed from wall cavities", "section": "Cleanliness", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Comprehensive photos of all rough-in work", "section": "Documentation", "sort_order": 16, "is_required": true, "requires_photo": true, "min_photos": 10, "max_photos": 30, "config": {"min_photos": 10, "max_photos": 30}}'::jsonb,
      '{"item_type": "text", "label": "Outstanding items preventing drywall", "section": "Documentation", "sort_order": 17, "is_required": false, "config": {"placeholder": "List any items preventing drywall installation...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Superintendent Signature", "section": "Documentation", "sort_order": 18, "is_required": true, "config": {"role": "superintendent", "title": "Superintendent"}}'::jsonb
    ]
  );
END $$;

-- Template 37: Drywall & Interior Finishes
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Drywall & Interior Finishes", "description": "Drywall installation, taping, and painting quality inspection", "category": "Quality - Finishes", "template_level": "system", "is_system_template": true, "tags": ["finishes", "drywall", "paint", "quality"], "instructions": "Inspect drywall installation, finish levels, and paint application. Verify specification compliance.", "estimated_duration_minutes": 35, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Drywall thickness per specifications", "section": "Drywall Installation", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper fastener type and spacing", "section": "Drywall Installation", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Moisture-resistant board in wet areas", "section": "Drywall Installation", "sort_order": 3, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire-rated assemblies properly constructed", "section": "Drywall Installation", "sort_order": 4, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Control joints installed per specification", "section": "Drywall Installation", "sort_order": 5, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Taping and mudding level per specification (Level 1-5)", "section": "Taping & Finishing", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Joints and fasteners properly finished", "section": "Taping & Finishing", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Corners properly finished with bead or tape", "section": "Taping & Finishing", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Surface sanded smooth (no ridges or defects)", "section": "Taping & Finishing", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Primer applied per paint specifications", "section": "Painting", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper number of topcoats applied", "section": "Painting", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Coverage uniform (no holidays, thin spots)", "section": "Painting", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Clean cut lines at trim and ceilings", "section": "Painting", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Touch-up complete (no visible damage)", "section": "Painting", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of finished surfaces", "section": "Documentation", "sort_order": 15, "is_required": true, "requires_photo": true, "min_photos": 4, "max_photos": 15, "config": {"min_photos": 4, "max_photos": 15}}'::jsonb,
      '{"item_type": "text", "label": "Deficiencies requiring correction", "section": "Documentation", "sort_order": 16, "is_required": false, "config": {"placeholder": "List deficiencies...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 38: Flooring Installation
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Flooring Installation", "description": "Floor covering installation quality inspection for various flooring types", "category": "Quality - Finishes", "template_level": "system", "is_system_template": true, "tags": ["finishes", "flooring", "quality", "installation"], "instructions": "Inspect substrate preparation and flooring installation. Verify material specifications and workmanship.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Flooring type", "section": "Material", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., LVT, ceramic tile, carpet", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Flooring material matches approved samples", "section": "Material", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Substrate clean, dry, and level", "section": "Substrate", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Substrate meets flatness tolerance (typically 1/4 inch in 10 ft)", "section": "Substrate", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Moisture testing performed (if required)", "section": "Substrate", "sort_order": 5, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Underlayment/vapor barrier installed (if required)", "section": "Substrate", "sort_order": 6, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Layout properly planned (minimizes waste, pattern aligned)", "section": "Installation", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Proper adhesive/installation method used", "section": "Installation", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Seams tight and properly located", "section": "Installation", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pattern matching maintained", "section": "Installation", "sort_order": 10, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tile: Proper grout joint width and consistency", "section": "Tile-Specific", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Tile: Lippage within acceptable limits", "section": "Tile-Specific", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Transitions/reducers properly installed", "section": "Trim & Transitions", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Base molding/cove base installed", "section": "Trim & Transitions", "sort_order": 14, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Floor clean and free of installation debris", "section": "Cleanup", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of installed flooring", "section": "Documentation", "sort_order": 16, "is_required": true, "requires_photo": true, "min_photos": 3, "max_photos": 15, "config": {"min_photos": 3, "max_photos": 15}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb
    ]
  );
END $$;

-- Template 39: Ceiling Systems
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Ceiling Systems", "description": "Suspended ceiling and ceiling grid installation inspection", "category": "Quality - Finishes", "template_level": "system", "is_system_template": true, "tags": ["finishes", "ceiling", "ACT", "quality"], "instructions": "Inspect grid installation, panel placement, and integration with MEP systems. Verify fire rating compliance.", "estimated_duration_minutes": 30, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "text", "label": "Ceiling system type", "section": "System", "sort_order": 1, "is_required": true, "config": {"placeholder": "e.g., 2x2 ACT, 2x4 ACT, GWB soffit", "max_length": 200}}'::jsonb,
      '{"item_type": "checkbox", "label": "Ceiling height matches drawings", "section": "Layout", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Grid layout symmetrical and properly centered", "section": "Layout", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Main runners properly supported (max 4 ft spacing)", "section": "Grid Installation", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Hanger wires securely attached to structure", "section": "Grid Installation", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Grid level within tolerance (1/4 inch in 12 ft)", "section": "Grid Installation", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Cross tees properly connected to main runners", "section": "Grid Installation", "sort_order": 7, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Seismic bracing installed where required", "section": "Grid Installation", "sort_order": 8, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Ceiling tiles/panels match approved samples", "section": "Tiles/Panels", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Panels properly installed (no warping, damage)", "section": "Tiles/Panels", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire-rated panels in rated assemblies", "section": "Tiles/Panels", "sort_order": 11, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Access panels provided per code (200 SF max)", "section": "Access", "sort_order": 12, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sprinkler heads, diffusers properly integrated", "section": "MEP Integration", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Light fixtures properly supported (not by grid)", "section": "MEP Integration", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "No damaged or stained panels", "section": "Quality", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Photos of ceiling installation", "section": "Documentation", "sort_order": 16, "is_required": true, "requires_photo": true, "min_photos": 3, "max_photos": 15, "config": {"min_photos": 3, "max_photos": 15}}'::jsonb,
      '{"item_type": "signature", "label": "Inspector Signature", "section": "Documentation", "sort_order": 17, "is_required": true, "config": {"role": "inspector", "title": "QC Inspector"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- PROJECT MILESTONE TEMPLATES (1 more: 40)
-- ============================================================================

-- Template 40: Project Mobilization Checklist
DO $$
BEGIN
  PERFORM seed_checklist_template(
    '{"name": "Project Mobilization Checklist", "description": "Project startup and site mobilization verification checklist", "category": "Project Milestones", "template_level": "system", "is_system_template": true, "tags": ["milestone", "mobilization", "startup", "project-setup"], "instructions": "Complete before construction activities begin. Verify site preparation, utilities, safety plans, and project setup.", "estimated_duration_minutes": 90, "scoring_enabled": true}'::jsonb,
    ARRAY[
      '{"item_type": "checkbox", "label": "Site access secured and controlled", "section": "Site Access", "sort_order": 1, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Construction fencing installed", "section": "Site Access", "sort_order": 2, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Signage posted (project, safety, permits)", "section": "Site Access", "sort_order": 3, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Temporary power established", "section": "Utilities", "sort_order": 4, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Temporary water service connected", "section": "Utilities", "sort_order": 5, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Sanitary facilities provided", "section": "Utilities", "sort_order": 6, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Job trailer/office set up", "section": "Site Facilities", "sort_order": 7, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Material storage areas established", "section": "Site Facilities", "sort_order": 8, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Dumpster/waste management in place", "section": "Site Facilities", "sort_order": 9, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Building permits obtained and posted", "section": "Permits & Plans", "sort_order": 10, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Approved plans on-site", "section": "Permits & Plans", "sort_order": 11, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Geotechnical report reviewed", "section": "Permits & Plans", "sort_order": 12, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Site-specific safety plan prepared", "section": "Safety", "sort_order": 13, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Emergency contact numbers posted", "section": "Safety", "sort_order": 14, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Fire extinguishers and first aid kits available", "section": "Safety", "sort_order": 15, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "SWPPP prepared and approved", "section": "Environmental", "sort_order": 16, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Initial erosion control measures installed", "section": "Environmental", "sort_order": 17, "is_required": false, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Notice to proceed received", "section": "Contract Administration", "sort_order": 18, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Pre-construction meeting held", "section": "Contract Administration", "sort_order": 19, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Project schedule distributed", "section": "Contract Administration", "sort_order": 20, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "checkbox", "label": "Insurance certificates on file", "section": "Contract Administration", "sort_order": 21, "is_required": true, "scoring_enabled": true, "pass_fail_na_scoring": true, "config": {"scoring": true}}'::jsonb,
      '{"item_type": "photo", "label": "Site mobilization photos", "section": "Documentation", "sort_order": 22, "is_required": true, "requires_photo": true, "min_photos": 5, "max_photos": 20, "config": {"min_photos": 5, "max_photos": 20}}'::jsonb,
      '{"item_type": "text", "label": "Outstanding mobilization items", "section": "Documentation", "sort_order": 23, "is_required": false, "config": {"placeholder": "List any items not yet complete...", "multiline": true, "max_length": 500}}'::jsonb,
      '{"item_type": "signature", "label": "Project Manager Signature", "section": "Documentation", "sort_order": 24, "is_required": true, "config": {"role": "project_manager", "title": "Project Manager"}}'::jsonb,
      '{"item_type": "signature", "label": "Superintendent Signature", "section": "Documentation", "sort_order": 25, "is_required": true, "config": {"role": "superintendent", "title": "Superintendent"}}'::jsonb
    ]
  );
END $$;

-- ============================================================================
-- CLEANUP: Drop helper function
-- ============================================================================

DROP FUNCTION IF EXISTS seed_checklist_template(JSONB, JSONB[]);

-- ============================================================================
-- MIGRATION COMPLETE
-- Templates Seeded: 40 of 40 COMPLETE!
-- Total LOC: ~5,200
-- ============================================================================

COMMENT ON TABLE checklist_templates IS 'System templates seeded in migration 027. Contains 40 industry-standard construction inspection templates across Safety, Quality, and Milestone categories. Templates comply with OSHA, ACI, AWS, NEC, NFPA, and other industry standards.';
