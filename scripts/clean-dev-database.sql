-- =============================================
-- DEVELOPMENT DATABASE CLEANUP SCRIPT
-- =============================================
-- WARNING: This script deletes ALL user data
-- Only run this on LOCAL DEVELOPMENT database
-- =============================================

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- =============================================
-- DELETE USER-GENERATED CONTENT
-- =============================================

-- Delete all approval workflows
DELETE FROM approval_workflow_steps;
DELETE FROM approval_workflows;

-- Delete all analytics data
DELETE FROM project_predictions;
DELETE FROM project_snapshots;
DELETE FROM ai_recommendations;

-- Delete all calendar integrations
DELETE FROM calendar_events;
DELETE FROM calendar_sync_logs;
DELETE FROM google_calendar_tokens;
DELETE FROM outlook_calendar_tokens;

-- Delete all change orders
DELETE FROM change_order_comments;
DELETE FROM change_orders;

-- Delete all checklists
DELETE FROM checklist_executions;
DELETE FROM checklist_items;
DELETE FROM checklists;

-- Delete all daily reports
DELETE FROM daily_report_weather;
DELETE FROM daily_report_equipment;
DELETE FROM daily_report_materials;
DELETE FROM daily_report_work;
DELETE FROM daily_report_labor;
DELETE FROM daily_reports;

-- Delete all documents
DELETE FROM document_versions;
DELETE FROM document_shares;
DELETE FROM documents;

-- Delete all emails
DELETE FROM email_attachments;
DELETE FROM email_threads;
DELETE FROM emails;

-- Delete all equipment
DELETE FROM equipment_maintenance;
DELETE FROM equipment;

-- Delete all field reports
DELETE FROM automated_field_reports;

-- Delete all inspections
DELETE FROM inspection_items;
DELETE FROM inspections;

-- Delete all insurance
DELETE FROM insurance_certificates;

-- Delete all lien waivers
DELETE FROM lien_waivers;

-- Delete all meetings
DELETE FROM meeting_attendees;
DELETE FROM meeting_action_items;
DELETE FROM meeting_recordings;
DELETE FROM meetings;

-- Delete all messages
DELETE FROM message_attachments;
DELETE FROM message_reactions;
DELETE FROM messages;
DELETE FROM message_templates;

-- Delete all notifications
DELETE FROM notification_preferences;
DELETE FROM notifications;

-- Delete all payment applications
DELETE FROM payment_application_items;
DELETE FROM payment_applications;

-- Delete all photos
DELETE FROM photo_360_metadata;
DELETE FROM photos;

-- Delete all punch lists
DELETE FROM punch_list_comments;
DELETE FROM punch_list_photos;
DELETE FROM punch_lists;
DELETE FROM subcontractor_punch_updates;

-- Delete all QR codes
DELETE FROM qr_code_scans;
DELETE FROM site_instruction_qr_codes;

-- Delete all RFIs
DELETE FROM rfi_responses;
DELETE FROM rfis;

-- Delete all safety incidents
DELETE FROM osha_300_log;
DELETE FROM osha_certification_history;
DELETE FROM safety_incident_witnesses;
DELETE FROM safety_incidents;

-- Delete all schedules
DELETE FROM schedule_activities;
DELETE FROM schedules;

-- Delete all submittals
DELETE FROM submittal_reviewers;
DELETE FROM submittal_items;
DELETE FROM submittals;

-- Delete all visualization data
DELETE FROM vr_tours;
DELETE FROM visualization_3d_models;

-- Delete all workflow automation
DELETE FROM workflow_triggers;
DELETE FROM workflow_actions;
DELETE FROM workflow_executions;

-- Delete all custom dashboards
DELETE FROM dashboard_widgets;
DELETE FROM custom_dashboards;

-- Delete all project-related data
DELETE FROM project_members;
DELETE FROM projects;

-- Delete all company-related data
DELETE FROM company_members;
DELETE FROM companies;

-- =============================================
-- DELETE USER PROFILES
-- =============================================

-- Delete user profiles (public schema)
DELETE FROM user_profiles;

-- =============================================
-- DELETE AUTH USERS (Supabase Auth)
-- =============================================

-- Delete all users from Supabase auth
-- This must be done last as other tables may reference it
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =============================================
-- RESET SEQUENCES (Optional)
-- =============================================

-- Uncomment if you want to reset auto-increment counters
-- This ensures new data starts from ID 1 again

-- SELECT setval(pg_get_serial_sequence('projects', 'id'), 1, false);
-- SELECT setval(pg_get_serial_sequence('daily_reports', 'id'), 1, false);
-- Add more as needed...

-- =============================================
-- VERIFICATION
-- =============================================

-- Check that auth users table is empty
SELECT 'Auth users count: ' || COUNT(*)::text FROM auth.users;

-- Check that companies table is empty
SELECT 'Companies count: ' || COUNT(*)::text FROM companies;

-- Check that projects table is empty
SELECT 'Projects count: ' || COUNT(*)::text FROM projects;

-- Check that user_profiles table is empty
SELECT 'User profiles count: ' || COUNT(*)::text FROM user_profiles;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✓ Development database cleanup complete!';
  RAISE NOTICE '  All users and user-generated data have been deleted.';
  RAISE NOTICE '  Database schema and structure preserved.';
END $$;
