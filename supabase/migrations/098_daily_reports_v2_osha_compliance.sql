-- Migration: 098_daily_reports_v2_osha_compliance.sql
-- Description: Add OSHA compliance fields for DART rate tracking, privacy cases, and enhanced delay documentation
-- Date: 2024-12-10

-- =============================================
-- PHASE 1: Add OSHA compliance fields to daily_report_safety_incidents
-- =============================================

-- Privacy Case - OSHA allows employee name redaction for sensitive injuries
-- (sexual assault, HIV, mental illness, tuberculosis, etc.)
ALTER TABLE daily_report_safety_incidents
ADD COLUMN IF NOT EXISTS privacy_case BOOLEAN DEFAULT false;

-- Days Away From Work - Required for OSHA DART rate calculation
-- Tracks calendar days employee was unable to work due to injury
ALTER TABLE daily_report_safety_incidents
ADD COLUMN IF NOT EXISTS days_away_from_work INTEGER DEFAULT 0;

-- Days on Restricted Duty - Required for OSHA DART rate calculation
-- Tracks days employee was on light/modified duty
ALTER TABLE daily_report_safety_incidents
ADD COLUMN IF NOT EXISTS days_on_restricted_duty INTEGER DEFAULT 0;

-- Date of Death - Required for OSHA 301 Form (fatality reporting within 8 hours)
ALTER TABLE daily_report_safety_incidents
ADD COLUMN IF NOT EXISTS date_of_death DATE;

-- Employee Status - Determines OSHA 300 log scope (who to include)
-- direct_employee, contractor, temp_worker, visitor
ALTER TABLE daily_report_safety_incidents
ADD COLUMN IF NOT EXISTS employee_status VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN daily_report_safety_incidents.privacy_case IS
  'OSHA allows name redaction for sensitive conditions (sexual assault, HIV, mental illness, TB)';
COMMENT ON COLUMN daily_report_safety_incidents.days_away_from_work IS
  'Calendar days employee was unable to work (DART rate calculation)';
COMMENT ON COLUMN daily_report_safety_incidents.days_on_restricted_duty IS
  'Days employee was on light/modified duty (DART rate calculation)';
COMMENT ON COLUMN daily_report_safety_incidents.date_of_death IS
  'Required for OSHA 301 fatality reporting (must report within 8 hours)';
COMMENT ON COLUMN daily_report_safety_incidents.employee_status IS
  'direct_employee, contractor, temp_worker, visitor - determines OSHA 300 log scope';

-- =============================================
-- PHASE 2: Add P2 fields to daily_report_delays (Claims enhancement)
-- =============================================

-- Concurrent Delays - Multiple parties causing delay simultaneously
-- Critical for claims apportionment when multiple parties share responsibility
ALTER TABLE daily_report_delays
ADD COLUMN IF NOT EXISTS concurrent_delays BOOLEAN DEFAULT false;

-- Owner Directive Reference - Reference to owner authorization (email, letter, etc.)
-- Important for documenting owner-directed delays for claims
ALTER TABLE daily_report_delays
ADD COLUMN IF NOT EXISTS owner_directive_reference TEXT;

-- Add comments for documentation
COMMENT ON COLUMN daily_report_delays.concurrent_delays IS
  'Multiple parties causing delay simultaneously (for claims apportionment)';
COMMENT ON COLUMN daily_report_delays.owner_directive_reference IS
  'Reference to owner authorization (email ref, letter, etc.) for owner-directed delays';

-- =============================================
-- PHASE 3: Add index for OSHA DART rate queries
-- =============================================

-- Index for quickly finding incidents with days away/restricted for DART calculation
CREATE INDEX IF NOT EXISTS idx_safety_incidents_dart
ON daily_report_safety_incidents(incident_type, days_away_from_work, days_on_restricted_duty)
WHERE incident_type IN ('recordable', 'lost_time', 'fatality');

-- Index for finding privacy cases
CREATE INDEX IF NOT EXISTS idx_safety_incidents_privacy
ON daily_report_safety_incidents(privacy_case)
WHERE privacy_case = true;

-- Index for concurrent delays (useful for claims analysis)
CREATE INDEX IF NOT EXISTS idx_delays_concurrent
ON daily_report_delays(concurrent_delays)
WHERE concurrent_delays = true;

-- =============================================
-- Success message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 098_daily_reports_v2_osha_compliance completed successfully';
  RAISE NOTICE 'Added OSHA compliance fields: privacy_case, days_away_from_work, days_on_restricted_duty, date_of_death, employee_status';
  RAISE NOTICE 'Added claims fields: concurrent_delays, owner_directive_reference';
END $$;
