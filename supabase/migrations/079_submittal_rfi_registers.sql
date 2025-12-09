-- Migration: 079_submittal_rfi_registers.sql
-- Description: Create database views for Submittal and RFI Log/Register reports
-- Features:
--   - Submittal register grouped by spec section
--   - RFI register with aging analysis
--   - Ball-in-court summary views
--   - Status distribution views

-- =============================================
-- DROP EXISTING VIEWS (required when changing columns)
-- =============================================
DROP VIEW IF EXISTS project_document_status CASCADE;
DROP VIEW IF EXISTS rfi_ball_in_court_summary CASCADE;
DROP VIEW IF EXISTS submittal_ball_in_court_summary CASCADE;
DROP VIEW IF EXISTS rfi_aging_summary CASCADE;
DROP VIEW IF EXISTS rfi_register CASCADE;
DROP VIEW IF EXISTS submittal_register_by_spec CASCADE;
DROP VIEW IF EXISTS submittal_register CASCADE;

-- =============================================
-- SUBMITTAL REGISTER VIEW
-- =============================================

CREATE OR REPLACE VIEW submittal_register AS
SELECT
  s.id,
  s.project_id,
  s.submittal_number,
  s.revision_number,
  s.title,
  s.description,
  s.spec_section,
  s.spec_section_title,
  s.submittal_type,
  s.review_status,
  s.approval_code,
  s.ball_in_court,
  s.ball_in_court_entity,
  s.date_required,
  s.date_submitted,
  s.date_received,
  s.date_returned,
  s.review_due_date,
  s.days_for_review,
  s.subcontractor_id,
  -- Calculated fields
  CASE
    WHEN s.date_required IS NOT NULL THEN
      s.date_required::DATE - CURRENT_DATE
    ELSE NULL
  END as days_until_required,
  CASE
    WHEN s.date_submitted IS NOT NULL AND s.date_returned IS NULL THEN
      CURRENT_DATE - s.date_submitted::DATE
    ELSE NULL
  END as days_in_review,
  CASE
    WHEN s.review_due_date IS NOT NULL AND s.date_returned IS NULL THEN
      s.review_due_date < CURRENT_DATE
    ELSE FALSE
  END as is_overdue,
  -- Traffic light status
  CASE
    WHEN s.review_status IN ('approved', 'approved_as_noted') THEN 'green'
    WHEN s.review_status IN ('rejected') THEN 'red'
    WHEN s.review_status = 'revise_resubmit' THEN 'orange'
    WHEN s.review_due_date < CURRENT_DATE AND s.date_returned IS NULL THEN 'red'
    WHEN s.date_required IS NOT NULL AND s.date_required::DATE - CURRENT_DATE <= 7 THEN 'yellow'
    ELSE 'gray'
  END as traffic_light_status,
  -- Related data
  sub.company_name as subcontractor_name,
  bic.full_name as ball_in_court_name,
  s.created_at,
  s.updated_at
FROM submittals s
LEFT JOIN subcontractors sub ON s.subcontractor_id = sub.id
LEFT JOIN users bic ON s.ball_in_court = bic.id
WHERE s.deleted_at IS NULL
ORDER BY s.spec_section, s.submittal_number;

COMMENT ON VIEW submittal_register IS 'Comprehensive submittal register view for reporting and export';

-- =============================================
-- SUBMITTAL REGISTER BY SPEC SECTION SUMMARY
-- =============================================

CREATE OR REPLACE VIEW submittal_register_by_spec AS
SELECT
  project_id,
  spec_section,
  MAX(spec_section_title) as spec_section_title,
  COUNT(*) as total_submittals,
  COUNT(*) FILTER (WHERE review_status = 'approved') as approved,
  COUNT(*) FILTER (WHERE review_status = 'approved_as_noted') as approved_as_noted,
  COUNT(*) FILTER (WHERE review_status = 'revise_resubmit') as revise_resubmit,
  COUNT(*) FILTER (WHERE review_status = 'rejected') as rejected,
  COUNT(*) FILTER (WHERE review_status IN ('submitted', 'under_gc_review', 'submitted_to_architect')) as pending_review,
  COUNT(*) FILTER (WHERE review_status = 'not_submitted') as not_submitted,
  -- Approval code breakdown
  COUNT(*) FILTER (WHERE approval_code = 'A') as code_a_count,
  COUNT(*) FILTER (WHERE approval_code = 'B') as code_b_count,
  COUNT(*) FILTER (WHERE approval_code = 'C') as code_c_count,
  COUNT(*) FILTER (WHERE approval_code = 'D') as code_d_count,
  -- Traffic light summary
  CASE
    WHEN COUNT(*) FILTER (WHERE review_status IN ('rejected') OR (review_due_date < CURRENT_DATE AND date_returned IS NULL)) > 0 THEN 'red'
    WHEN COUNT(*) FILTER (WHERE review_status = 'revise_resubmit' OR (date_required::DATE - CURRENT_DATE <= 7)) > 0 THEN 'yellow'
    WHEN COUNT(*) = COUNT(*) FILTER (WHERE review_status IN ('approved', 'approved_as_noted')) THEN 'green'
    ELSE 'gray'
  END as overall_status,
  MIN(date_required) FILTER (WHERE review_status NOT IN ('approved', 'approved_as_noted', 'rejected')) as next_required_date
FROM submittal_register
GROUP BY project_id, spec_section
ORDER BY spec_section;

COMMENT ON VIEW submittal_register_by_spec IS 'Submittal register summary grouped by spec section';

-- =============================================
-- RFI REGISTER VIEW
-- =============================================

CREATE OR REPLACE VIEW rfi_register AS
SELECT
  r.id,
  r.project_id,
  r.rfi_number,
  r.subject,
  r.question,
  r.status,
  r.priority,
  r.response_type,
  r.ball_in_court,
  r.ball_in_court_role,
  r.spec_section,
  r.drawing_reference,
  r.date_submitted,
  r.date_required,
  r.date_responded,
  r.date_closed,
  r.response_due_date,
  r.response_on_time,
  r.is_internal,
  r.cost_impact,
  r.schedule_impact_days,
  -- Calculated fields
  CASE
    WHEN r.date_submitted IS NOT NULL AND r.status NOT IN ('responded', 'closed') THEN
      CURRENT_DATE - r.date_submitted::DATE
    ELSE NULL
  END as days_open,
  CASE
    WHEN r.date_responded IS NOT NULL AND r.date_submitted IS NOT NULL THEN
      r.date_responded::DATE - r.date_submitted::DATE
    ELSE NULL
  END as response_time_days,
  CASE
    WHEN r.response_due_date IS NOT NULL AND r.status NOT IN ('responded', 'closed') THEN
      r.response_due_date < CURRENT_DATE
    ELSE FALSE
  END as is_overdue,
  CASE
    WHEN r.response_due_date IS NOT NULL AND r.status NOT IN ('responded', 'closed') THEN
      r.response_due_date - CURRENT_DATE
    ELSE NULL
  END as days_until_due,
  -- Aging bucket
  CASE
    WHEN r.status IN ('responded', 'closed') THEN 'Closed'
    WHEN r.date_submitted IS NULL THEN 'Draft'
    WHEN CURRENT_DATE - r.date_submitted::DATE <= 7 THEN '0-7 days'
    WHEN CURRENT_DATE - r.date_submitted::DATE <= 14 THEN '8-14 days'
    WHEN CURRENT_DATE - r.date_submitted::DATE <= 21 THEN '15-21 days'
    WHEN CURRENT_DATE - r.date_submitted::DATE <= 30 THEN '22-30 days'
    ELSE '30+ days'
  END as aging_bucket,
  -- Traffic light status
  CASE
    WHEN r.status IN ('responded', 'closed') THEN 'green'
    WHEN r.response_due_date < CURRENT_DATE THEN 'red'
    WHEN r.response_due_date - CURRENT_DATE <= 3 THEN 'yellow'
    ELSE 'gray'
  END as traffic_light_status,
  -- Related data
  bic.full_name as ball_in_court_name,
  r.created_at,
  r.updated_at
FROM rfis r
LEFT JOIN users bic ON r.ball_in_court = bic.id
WHERE r.deleted_at IS NULL
ORDER BY r.rfi_number DESC;

COMMENT ON VIEW rfi_register IS 'Comprehensive RFI register view for reporting and export';

-- =============================================
-- RFI AGING SUMMARY
-- =============================================

CREATE OR REPLACE VIEW rfi_aging_summary AS
SELECT
  project_id,
  aging_bucket,
  COUNT(*) as count,
  SUM(cost_impact) FILTER (WHERE cost_impact IS NOT NULL) as total_cost_impact,
  SUM(schedule_impact_days) FILTER (WHERE schedule_impact_days IS NOT NULL) as total_schedule_impact
FROM rfi_register
GROUP BY project_id, aging_bucket
ORDER BY project_id,
  CASE aging_bucket
    WHEN 'Draft' THEN 0
    WHEN '0-7 days' THEN 1
    WHEN '8-14 days' THEN 2
    WHEN '15-21 days' THEN 3
    WHEN '22-30 days' THEN 4
    WHEN '30+ days' THEN 5
    WHEN 'Closed' THEN 6
  END;

COMMENT ON VIEW rfi_aging_summary IS 'RFI aging summary by bucket';

-- =============================================
-- BALL-IN-COURT SUMMARY VIEWS
-- =============================================

-- Submittal ball-in-court summary
CREATE OR REPLACE VIEW submittal_ball_in_court_summary AS
SELECT
  project_id,
  ball_in_court_entity,
  ball_in_court_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE review_status IN ('submitted', 'under_gc_review', 'submitted_to_architect')) as pending_count,
  COUNT(*) FILTER (WHERE is_overdue = TRUE) as overdue_count,
  AVG(days_in_review) FILTER (WHERE days_in_review IS NOT NULL) as avg_days_in_review
FROM submittal_register
WHERE review_status NOT IN ('approved', 'approved_as_noted', 'rejected', 'not_submitted')
GROUP BY project_id, ball_in_court_entity, ball_in_court_name
ORDER BY pending_count DESC;

COMMENT ON VIEW submittal_ball_in_court_summary IS 'Submittal ball-in-court summary showing who has pending items';

-- RFI ball-in-court summary
CREATE OR REPLACE VIEW rfi_ball_in_court_summary AS
SELECT
  project_id,
  ball_in_court_role,
  ball_in_court_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status NOT IN ('responded', 'closed')) as open_count,
  COUNT(*) FILTER (WHERE is_overdue = TRUE) as overdue_count,
  AVG(days_open) FILTER (WHERE days_open IS NOT NULL) as avg_days_open,
  SUM(cost_impact) FILTER (WHERE cost_impact IS NOT NULL) as total_cost_impact,
  SUM(schedule_impact_days) FILTER (WHERE schedule_impact_days IS NOT NULL) as total_schedule_impact
FROM rfi_register
WHERE status NOT IN ('responded', 'closed')
GROUP BY project_id, ball_in_court_role, ball_in_court_name
ORDER BY open_count DESC;

COMMENT ON VIEW rfi_ball_in_court_summary IS 'RFI ball-in-court summary showing who has pending items';

-- =============================================
-- PROJECT DOCUMENT STATUS DASHBOARD
-- =============================================

CREATE OR REPLACE VIEW project_document_status AS
SELECT
  p.id as project_id,
  p.name as project_name,
  -- Submittals
  (SELECT COUNT(*) FROM submittals s WHERE s.project_id = p.id AND s.deleted_at IS NULL) as total_submittals,
  (SELECT COUNT(*) FROM submittals s WHERE s.project_id = p.id AND s.deleted_at IS NULL AND s.review_status IN ('approved', 'approved_as_noted')) as approved_submittals,
  (SELECT COUNT(*) FROM submittals s WHERE s.project_id = p.id AND s.deleted_at IS NULL AND s.review_status = 'revise_resubmit') as resubmit_submittals,
  (SELECT COUNT(*) FROM submittals s WHERE s.project_id = p.id AND s.deleted_at IS NULL AND s.review_due_date < CURRENT_DATE AND s.date_returned IS NULL) as overdue_submittals,
  -- RFIs
  (SELECT COUNT(*) FROM rfis r WHERE r.project_id = p.id AND r.deleted_at IS NULL) as total_rfis,
  (SELECT COUNT(*) FROM rfis r WHERE r.project_id = p.id AND r.deleted_at IS NULL AND r.status IN ('responded', 'closed')) as closed_rfis,
  (SELECT COUNT(*) FROM rfis r WHERE r.project_id = p.id AND r.deleted_at IS NULL AND r.response_due_date < CURRENT_DATE AND r.status NOT IN ('responded', 'closed')) as overdue_rfis,
  (SELECT SUM(cost_impact) FROM rfis r WHERE r.project_id = p.id AND r.deleted_at IS NULL AND r.cost_impact IS NOT NULL) as total_rfi_cost_impact,
  (SELECT SUM(schedule_impact_days) FROM rfis r WHERE r.project_id = p.id AND r.deleted_at IS NULL AND r.schedule_impact_days IS NOT NULL) as total_rfi_schedule_impact
FROM projects p
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW project_document_status IS 'Dashboard view showing document status summary for each project';
