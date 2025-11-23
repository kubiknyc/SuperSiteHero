-- Migration: 014_add_total_workers_to_daily_reports.sql
-- Description: Add total_workers column to daily_reports table
-- Date: 2025-01-22

-- Add total_workers column to daily_reports table
ALTER TABLE daily_reports
ADD COLUMN total_workers INTEGER;

-- Add comment explaining the column
COMMENT ON COLUMN daily_reports.total_workers IS 'Total number of workers on site for this daily report';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 014_add_total_workers_to_daily_reports completed successfully';
END $$;
