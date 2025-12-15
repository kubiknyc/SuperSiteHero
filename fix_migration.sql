-- Remove problematic migration entry
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '111_daily_report_templates_sharing';
