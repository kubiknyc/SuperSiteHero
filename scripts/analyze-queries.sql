/**
 * Database Query Performance Analysis
 *
 * Run this script to analyze query performance and identify optimization opportunities
 *
 * Usage in Supabase SQL Editor:
 *   1. Copy sections and run individually
 *   2. Analyze results
 *   3. Add indexes as needed
 *   4. Optimize RLS policies
 *
 * Note: Some queries require pg_stat_statements extension
 * Enable with: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
 */

-- =============================================================================
-- 1. SLOW QUERIES ANALYSIS
-- =============================================================================

-- Show slowest queries (requires pg_stat_statements)
-- This helps identify which queries need optimization
SELECT
  query,
  calls,
  total_exec_time / 1000 AS total_time_seconds,
  mean_exec_time / 1000 AS mean_time_seconds,
  max_exec_time / 1000 AS max_time_seconds,
  stddev_exec_time / 1000 AS stddev_time_seconds,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- =============================================================================
-- 2. TABLE STATISTICS
-- =============================================================================

-- Show table sizes and access patterns
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size,
  n_live_tup AS row_count,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes,
  seq_scan AS sequential_scans,
  idx_scan AS index_scans,
  CASE
    WHEN seq_scan + idx_scan = 0 THEN 0
    ELSE ROUND((100.0 * idx_scan / (seq_scan + idx_scan))::numeric, 2)
  END AS index_usage_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =============================================================================
-- 3. MISSING INDEXES
-- =============================================================================

-- Identify tables that might need indexes (high sequential scans)
SELECT
  schemaname,
  tablename,
  seq_scan AS sequential_scans,
  idx_scan AS index_scans,
  n_live_tup AS row_count,
  CASE
    WHEN seq_scan = 0 THEN 0
    ELSE ROUND((seq_scan::numeric / (seq_scan + COALESCE(idx_scan, 0)))::numeric * 100, 2)
  END AS seq_scan_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 100  -- Only tables with more than 100 rows
  AND seq_scan > idx_scan  -- More sequential than index scans
ORDER BY seq_scan DESC
LIMIT 20;

-- Show unused indexes (potential candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
  AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC;

-- =============================================================================
-- 4. INDEX ANALYSIS
-- =============================================================================

-- Show all indexes with usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_get_indexdef(indexrelid) AS index_definition
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =============================================================================
-- 5. SPECIFIC TABLE ANALYSIS - PROJECTS
-- =============================================================================

-- Analyze projects table queries
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM projects
WHERE company_id = 'example-uuid'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;

-- Check if index exists on (company_id, status, created_at)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'projects'
  AND indexdef LIKE '%company_id%';

-- Recommended index for projects queries
-- CREATE INDEX IF NOT EXISTS idx_projects_company_status_created
-- ON projects(company_id, status, created_at DESC);

-- =============================================================================
-- 6. DAILY REPORTS ANALYSIS
-- =============================================================================

-- Analyze daily reports queries
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT dr.*,
       p.name AS project_name,
       u.name AS author_name
FROM daily_reports dr
  LEFT JOIN projects p ON dr.project_id = p.id
  LEFT JOIN users u ON dr.author_id = u.id
WHERE dr.project_id = 'example-uuid'
  AND dr.report_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY dr.report_date DESC
LIMIT 20;

-- Check indexes on daily_reports
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'daily_reports';

-- Recommended indexes
-- CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date
-- ON daily_reports(project_id, report_date DESC);

-- =============================================================================
-- 7. DOCUMENTS ANALYSIS
-- =============================================================================

-- Analyze documents queries
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM documents
WHERE project_id = 'example-uuid'
  AND file_type = 'pdf'
ORDER BY created_at DESC
LIMIT 50;

-- Check indexes on documents
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'documents';

-- Recommended indexes
-- CREATE INDEX IF NOT EXISTS idx_documents_project_type_created
-- ON documents(project_id, file_type, created_at DESC);

-- =============================================================================
-- 8. RLS POLICY PERFORMANCE
-- =============================================================================

-- Show RLS policies that might impact performance
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Analyze RLS policy on specific table
-- Example: projects table
SET LOCAL ROLE authenticated;
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM projects WHERE id = 'example-uuid';
RESET ROLE;

-- =============================================================================
-- 9. FOREIGN KEY RELATIONSHIPS
-- =============================================================================

-- Show foreign keys and their indexes
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  EXISTS(
    SELECT 1
    FROM pg_indexes i
    WHERE i.schemaname = tc.table_schema
      AND i.tablename = tc.table_name
      AND i.indexdef LIKE '%' || kcu.column_name || '%'
  ) AS has_index
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- 10. RECOMMENDED INDEXES FOR SUPERSITEHERO
-- =============================================================================

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_company_status_created
ON projects(company_id, status, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_company_id
ON projects(company_id)
WHERE deleted_at IS NULL;

-- Daily Reports
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date
ON daily_reports(project_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_reports_author_created
ON daily_reports(author_id, created_at DESC);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_project_type_created
ON documents(project_id, file_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_project_id
ON documents(project_id)
WHERE deleted_at IS NULL;

-- RFIs
CREATE INDEX IF NOT EXISTS idx_rfis_project_status
ON rfis(project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rfis_assignee_status
ON rfis(assigned_to, status, created_at DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_due
ON tasks(project_id, status, due_date)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
ON tasks(assigned_to, status, due_date)
WHERE deleted_at IS NULL;

-- Change Orders
CREATE INDEX IF NOT EXISTS idx_change_orders_project_status
ON change_orders(project_id, status, created_at DESC);

-- Submittals
CREATE INDEX IF NOT EXISTS idx_submittals_project_status
ON submittals(project_id, status, created_at DESC);

-- Punch Items
CREATE INDEX IF NOT EXISTS idx_punch_items_project_status
ON punch_items(project_id, status, created_at DESC);

-- Users (for lookups)
CREATE INDEX IF NOT EXISTS idx_users_company_role
ON users(company_id, role);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_project_created
ON conversations(project_id, created_at DESC);

-- =============================================================================
-- 11. VACUUM AND ANALYZE
-- =============================================================================

-- Check tables that need vacuuming
SELECT
  schemaname,
  tablename,
  n_dead_tup AS dead_tuples,
  n_live_tup AS live_tuples,
  ROUND((n_dead_tup::numeric / NULLIF(n_live_tup, 0)) * 100, 2) AS dead_tuple_percent,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 0
ORDER BY dead_tuple_percent DESC;

-- Run vacuum analyze on specific tables (if needed)
-- VACUUM ANALYZE projects;
-- VACUUM ANALYZE daily_reports;
-- VACUUM ANALYZE documents;

-- =============================================================================
-- 12. CONNECTION AND RESOURCE USAGE
-- =============================================================================

-- Show active connections and their queries
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  wait_event_type,
  wait_event,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
ORDER BY query_start;

-- Show connection pool statistics (if using pgBouncer/Supabase pooler)
SELECT
  datname,
  numbackends AS connections,
  xact_commit AS transactions_committed,
  xact_rollback AS transactions_rolled_back,
  blks_read AS blocks_read,
  blks_hit AS blocks_hit,
  CASE
    WHEN blks_read + blks_hit = 0 THEN 0
    ELSE ROUND((100.0 * blks_hit / (blks_read + blks_hit))::numeric, 2)
  END AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

-- =============================================================================
-- PERFORMANCE MONITORING CHECKLIST
-- =============================================================================

/*
Daily Checks:
☐ Review slow queries (> 1s)
☐ Check cache hit ratio (should be > 95%)
☐ Monitor connection count
☐ Check table bloat

Weekly Checks:
☐ Analyze index usage
☐ Review RLS policy performance
☐ Check for missing indexes
☐ Vacuum analyze large tables

Monthly Checks:
☐ Review and remove unused indexes
☐ Analyze query patterns
☐ Update statistics
☐ Review and optimize RLS policies
☐ Check disk space and growth trends
*/
