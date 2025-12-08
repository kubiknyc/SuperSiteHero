-- Migration: 080_osha_300_log.sql
-- Description: OSHA 300 Log integration for safety incident tracking
-- Features:
--   - OSHA 300 Log fields (case number, injury type, body part, etc.)
--   - OSHA 300 Log view matching official form columns
--   - OSHA 300A Annual Summary view
--   - Recordability determination

-- =============================================
-- ADD OSHA 300 LOG FIELDS TO SAFETY INCIDENTS
-- =============================================

-- Case number (assigned by employer)
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS case_number VARCHAR(20);
COMMENT ON COLUMN safety_incidents.case_number IS 'OSHA 300 Log case number assigned by employer';

-- Employee information (separate from reporter)
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS employee_job_title TEXT;

COMMENT ON COLUMN safety_incidents.employee_name IS 'Name of injured/ill employee for OSHA 300 Log';
COMMENT ON COLUMN safety_incidents.employee_job_title IS 'Job title of injured/ill employee';

-- Injury/Illness classification
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS injury_illness_type VARCHAR(50);
COMMENT ON COLUMN safety_incidents.injury_illness_type IS 'Type of injury or illness (e.g., sprain, fracture, burn, hearing loss)';

-- Body part affected
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS body_part_affected TEXT;
COMMENT ON COLUMN safety_incidents.body_part_affected IS 'Body part affected by injury/illness';

-- Object/Substance that caused injury
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS object_substance TEXT;
COMMENT ON COLUMN safety_incidents.object_substance IS 'Object, substance, or exposure that caused injury/illness';

-- Death date (if fatality)
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS death_date DATE;
COMMENT ON COLUMN safety_incidents.death_date IS 'Date of death if incident resulted in fatality';

-- Days away from work (more specific than existing field)
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS days_away_count INTEGER DEFAULT 0;
COMMENT ON COLUMN safety_incidents.days_away_count IS 'Number of full days away from work';

-- Days on job transfer or restriction
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS days_transfer_restriction INTEGER DEFAULT 0;
COMMENT ON COLUMN safety_incidents.days_transfer_restriction IS 'Number of days on job transfer or restriction';

-- Privacy case flag
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS is_privacy_case BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN safety_incidents.is_privacy_case IS 'True if this is a privacy concern case (name withheld on 300 Log)';

-- OSHA case classification columns (check one)
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS resulted_in_death BOOLEAN DEFAULT FALSE;
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS resulted_in_days_away BOOLEAN DEFAULT FALSE;
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS resulted_in_restriction BOOLEAN DEFAULT FALSE;
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS other_recordable_case BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN safety_incidents.resulted_in_death IS 'OSHA 300 Log Column G: Death';
COMMENT ON COLUMN safety_incidents.resulted_in_days_away IS 'OSHA 300 Log Column H: Days away from work';
COMMENT ON COLUMN safety_incidents.resulted_in_restriction IS 'OSHA 300 Log Column I: Job transfer or restriction';
COMMENT ON COLUMN safety_incidents.other_recordable_case IS 'OSHA 300 Log Column J: Other recordable cases';

-- Illness classification (for Column M)
ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS illness_classification VARCHAR(20);
COMMENT ON COLUMN safety_incidents.illness_classification IS 'OSHA illness type: skin_disorder, respiratory, poisoning, hearing_loss, other';

-- =============================================
-- INDEXES FOR OSHA REPORTING
-- =============================================

CREATE INDEX IF NOT EXISTS idx_safety_incidents_osha_recordable ON safety_incidents(osha_recordable)
  WHERE osha_recordable = TRUE;

CREATE INDEX IF NOT EXISTS idx_safety_incidents_case_number ON safety_incidents(case_number)
  WHERE case_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_safety_incidents_incident_year ON safety_incidents(EXTRACT(YEAR FROM incident_date));

-- =============================================
-- FUNCTION TO AUTO-SET OSHA RECORDABILITY
-- =============================================

CREATE OR REPLACE FUNCTION determine_osha_recordability()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-determine if case is OSHA recordable
  IF NEW.osha_recordable IS NULL THEN
    NEW.osha_recordable = (
      NEW.resulted_in_death = TRUE OR
      NEW.resulted_in_days_away = TRUE OR
      NEW.resulted_in_restriction = TRUE OR
      NEW.other_recordable_case = TRUE OR
      NEW.severity IN ('medical_treatment', 'lost_time', 'fatality')
    );
  END IF;

  -- Auto-set death flag
  IF NEW.death_date IS NOT NULL THEN
    NEW.resulted_in_death = TRUE;
    NEW.osha_recordable = TRUE;
  END IF;

  -- Auto-set days away flag
  IF COALESCE(NEW.days_away_count, 0) > 0 OR COALESCE(NEW.days_away_from_work, 0) > 0 THEN
    NEW.resulted_in_days_away = TRUE;
    NEW.osha_recordable = TRUE;
  END IF;

  -- Auto-set restriction flag
  IF COALESCE(NEW.days_transfer_restriction, 0) > 0 OR COALESCE(NEW.days_restricted_duty, 0) > 0 THEN
    NEW.resulted_in_restriction = TRUE;
    NEW.osha_recordable = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_determine_osha_recordability ON safety_incidents;
CREATE TRIGGER auto_determine_osha_recordability
  BEFORE INSERT OR UPDATE ON safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION determine_osha_recordability();

-- =============================================
-- OSHA 300 LOG VIEW
-- =============================================

CREATE OR REPLACE VIEW osha_300_log AS
SELECT
  si.id,
  si.project_id,
  p.name as establishment_name,
  EXTRACT(YEAR FROM si.incident_date) as log_year,
  -- Column A: Case Number
  si.case_number,
  -- Column B: Employee Name (or 'Privacy Case' if flagged)
  CASE
    WHEN si.is_privacy_case THEN 'Privacy Case'
    ELSE si.employee_name
  END as employee_name,
  -- Column C: Job Title
  si.employee_job_title as job_title,
  -- Column D: Date of injury/illness
  si.incident_date::DATE as date_of_injury,
  -- Column E: Where event occurred
  si.location as where_occurred,
  -- Column F: Description
  si.description as injury_description,
  -- Classify columns (G, H, I, J - check one)
  -- Column G: Death
  si.resulted_in_death as col_g_death,
  -- Column H: Days away from work
  si.resulted_in_days_away as col_h_days_away,
  -- Column I: Job transfer or restriction
  si.resulted_in_restriction as col_i_restriction,
  -- Column J: Other recordable cases
  si.other_recordable_case as col_j_other,
  -- Column K: Days away from work (number)
  COALESCE(si.days_away_count, si.days_away_from_work, 0) as col_k_days_away_count,
  -- Column L: Days of job transfer or restriction (number)
  COALESCE(si.days_transfer_restriction, si.days_restricted_duty, 0) as col_l_days_restriction_count,
  -- Column M: Injury/Illness type
  CASE
    WHEN si.incident_type = 'injury' THEN
      CASE
        WHEN si.injury_illness_type IS NOT NULL THEN si.injury_illness_type
        ELSE 'Injury'
      END
    WHEN si.incident_type = 'illness' THEN
      CASE si.illness_classification
        WHEN 'skin_disorder' THEN 'Skin disorder'
        WHEN 'respiratory' THEN 'Respiratory condition'
        WHEN 'poisoning' THEN 'Poisoning'
        WHEN 'hearing_loss' THEN 'Hearing loss'
        ELSE 'Other illness'
      END
    ELSE 'Injury'
  END as col_m_injury_illness_type,
  -- Additional fields for filtering/sorting
  si.severity,
  si.osha_recordable,
  si.osha_report_number,
  si.created_at,
  si.updated_at
FROM safety_incidents si
JOIN projects p ON si.project_id = p.id
WHERE si.deleted_at IS NULL
  AND si.osha_recordable = TRUE
ORDER BY EXTRACT(YEAR FROM si.incident_date) DESC, si.case_number;

COMMENT ON VIEW osha_300_log IS 'OSHA Form 300 Log of Work-Related Injuries and Illnesses';

-- =============================================
-- OSHA 300A ANNUAL SUMMARY VIEW
-- =============================================

CREATE OR REPLACE VIEW osha_300a_summary AS
SELECT
  si.project_id,
  p.name as establishment_name,
  EXTRACT(YEAR FROM si.incident_date) as calendar_year,
  -- Total counts by classification
  COUNT(*) FILTER (WHERE si.resulted_in_death = TRUE) as total_deaths,
  COUNT(*) FILTER (WHERE si.resulted_in_days_away = TRUE) as total_days_away_cases,
  COUNT(*) FILTER (WHERE si.resulted_in_restriction = TRUE) as total_restriction_cases,
  COUNT(*) FILTER (WHERE si.other_recordable_case = TRUE) as total_other_cases,
  -- Total days
  SUM(COALESCE(si.days_away_count, si.days_away_from_work, 0)) as total_days_away,
  SUM(COALESCE(si.days_transfer_restriction, si.days_restricted_duty, 0)) as total_days_restriction,
  -- Injury vs Illness breakdown
  COUNT(*) FILTER (WHERE si.incident_type = 'injury') as total_injuries,
  COUNT(*) FILTER (WHERE si.incident_type = 'illness') as total_illnesses,
  -- Illness types (Column M breakdown)
  COUNT(*) FILTER (WHERE si.illness_classification = 'skin_disorder') as skin_disorders,
  COUNT(*) FILTER (WHERE si.illness_classification = 'respiratory') as respiratory_conditions,
  COUNT(*) FILTER (WHERE si.illness_classification = 'poisoning') as poisoning_cases,
  COUNT(*) FILTER (WHERE si.illness_classification = 'hearing_loss') as hearing_loss_cases,
  COUNT(*) FILTER (WHERE si.illness_classification = 'other' OR (si.incident_type = 'illness' AND si.illness_classification IS NULL)) as other_illnesses,
  -- Grand totals
  COUNT(*) as total_recordable_cases
FROM safety_incidents si
JOIN projects p ON si.project_id = p.id
WHERE si.deleted_at IS NULL
  AND si.osha_recordable = TRUE
GROUP BY si.project_id, p.name, EXTRACT(YEAR FROM si.incident_date)
ORDER BY calendar_year DESC, establishment_name;

COMMENT ON VIEW osha_300a_summary IS 'OSHA Form 300A Summary of Work-Related Injuries and Illnesses';

-- =============================================
-- FUNCTION TO GENERATE NEXT CASE NUMBER
-- =============================================

CREATE OR REPLACE FUNCTION get_next_osha_case_number(
  p_project_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS VARCHAR AS $$
DECLARE
  v_next_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN case_number ~ ('^' || p_year || '-\d+$') THEN
          CAST(SUBSTRING(case_number FROM '-(\d+)$') AS INTEGER)
        ELSE 0
      END
    ),
    0
  ) + 1
  INTO v_next_num
  FROM safety_incidents
  WHERE project_id = p_project_id
    AND EXTRACT(YEAR FROM incident_date) = p_year;

  RETURN p_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_osha_case_number(UUID, INTEGER) IS 'Generate next OSHA 300 Log case number for a project/year';

-- =============================================
-- INCIDENCE RATE CALCULATION VIEW
-- =============================================

CREATE OR REPLACE VIEW osha_incidence_rates AS
SELECT
  project_id,
  calendar_year,
  establishment_name,
  total_recordable_cases,
  total_days_away_cases,
  total_restriction_cases,
  -- Note: These rates require employee hours worked data
  -- Formula: (N/EH) x 200,000
  -- Where N = number of cases, EH = total hours worked by all employees
  -- 200,000 = base for 100 full-time equivalent workers (40 hrs/week x 50 weeks)
  -- Placeholder calculation - would need hours_worked column
  NULL::DECIMAL as total_recordable_incidence_rate,
  NULL::DECIMAL as dart_rate  -- Days Away, Restricted, or Transferred
FROM osha_300a_summary;

COMMENT ON VIEW osha_incidence_rates IS 'OSHA incidence rate calculations (requires hours worked data)';
