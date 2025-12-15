-- Verify migration 125 columns (CRITICAL)
SELECT 'Migration 125 - daily_report_templates columns:' as validation;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'daily_report_templates'
AND column_name IN ('scope', 'category', 'usage_count', 'last_used_at', 'tags', 'company_id')
ORDER BY column_name;

-- Verify notifications reconciliation (migration 129)
SELECT 'Migration 129 - notifications columns:' as validation;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name IN ('is_read', 'entity_type', 'entity_id', 'link', 'priority', 'company_id')
ORDER BY column_name;

-- Verify no duplicate equipment_maintenance_schedules
SELECT 'Equipment maintenance schedules count (should be 1):' as validation;
SELECT COUNT(*) as count FROM information_schema.tables
WHERE table_name = 'equipment_maintenance_schedules';

-- Verify functions exist for migration 130
SELECT 'Migration 128/130 - functions:' as validation;
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('update_workflow_automation_timestamp', 'calculate_next_report_run')
ORDER BY routine_name;

-- Count all new tables from migrations 125-130
SELECT 'New tables from migrations 125-130:' as validation;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'photo_entity_links',
  'photo_hashes',
  'photo_upload_batches',
  'notification_preferences',
  'escalation_rules',
  'escalation_events',
  'equipment_maintenance_schedules',
  'equipment_maintenance_alerts',
  'scheduled_field_reports',
  'generated_field_reports',
  'field_report_templates'
)
ORDER BY table_name;
