-- Migration: 152_fix_security_advisor_warnings.sql
-- Description: Fix security advisor warnings for exposed auth.users and security definer views
-- Date: 2025-12-26

-- =============================================
-- FIX 1: Remove anon access from auth_users_readonly view
-- The view should only be accessible to authenticated users
-- =============================================
DO $$
BEGIN
  -- Revoke anon access from auth_users_readonly
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'auth_users_readonly' AND schemaname = 'public') THEN
    REVOKE ALL ON public.auth_users_readonly FROM anon;
    RAISE NOTICE 'Revoked anon access from auth_users_readonly';
  END IF;
END $$;

-- =============================================
-- FIX 2: Remove anon access from auth_users_safe view
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'auth_users_safe' AND schemaname = 'public') THEN
    REVOKE ALL ON public.auth_users_safe FROM anon;
    RAISE NOTICE 'Revoked anon access from auth_users_safe';
  END IF;
END $$;

-- =============================================
-- FIX 3: Remove anon access from safety_observer_leaderboard view
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'safety_observer_leaderboard' AND schemaname = 'public') THEN
    REVOKE ALL ON public.safety_observer_leaderboard FROM anon;
    RAISE NOTICE 'Revoked anon access from safety_observer_leaderboard';
  END IF;
END $$;

-- =============================================
-- FIX 4: Remove anon access from template_statistics view
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'template_statistics' AND schemaname = 'public') THEN
    REVOKE ALL ON public.template_statistics FROM anon;
    RAISE NOTICE 'Revoked anon access from template_statistics';
  END IF;
END $$;

-- =============================================
-- FIX 5: Convert security definer views to security invoker
-- near_miss_root_cause_pareto
-- =============================================
DO $$
DECLARE
  view_def TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'near_miss_root_cause_pareto' AND schemaname = 'public') THEN
    -- Get the view definition
    SELECT pg_get_viewdef('public.near_miss_root_cause_pareto'::regclass, true) INTO view_def;

    -- Drop and recreate with SECURITY INVOKER
    DROP VIEW IF EXISTS public.near_miss_root_cause_pareto;

    EXECUTE 'CREATE VIEW public.near_miss_root_cause_pareto
      WITH (security_invoker = true)
      AS ' || view_def;

    -- Grant access to authenticated role
    GRANT SELECT ON public.near_miss_root_cause_pareto TO authenticated;

    RAISE NOTICE 'Recreated near_miss_root_cause_pareto with security_invoker';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not convert near_miss_root_cause_pareto: %', SQLERRM;
END $$;

-- =============================================
-- FIX 6: Convert submittal_register to security invoker
-- =============================================
DO $$
DECLARE
  view_def TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'submittal_register' AND schemaname = 'public') THEN
    SELECT pg_get_viewdef('public.submittal_register'::regclass, true) INTO view_def;

    DROP VIEW IF EXISTS public.submittal_register;

    EXECUTE 'CREATE VIEW public.submittal_register
      WITH (security_invoker = true)
      AS ' || view_def;

    GRANT SELECT ON public.submittal_register TO authenticated;

    RAISE NOTICE 'Recreated submittal_register with security_invoker';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not convert submittal_register: %', SQLERRM;
END $$;

-- =============================================
-- FIX 7: Convert rfi_register to security invoker (if exists)
-- =============================================
DO $$
DECLARE
  view_def TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'rfi_register' AND schemaname = 'public') THEN
    SELECT pg_get_viewdef('public.rfi_register'::regclass, true) INTO view_def;

    DROP VIEW IF EXISTS public.rfi_register;

    EXECUTE 'CREATE VIEW public.rfi_register
      WITH (security_invoker = true)
      AS ' || view_def;

    GRANT SELECT ON public.rfi_register TO authenticated;

    RAISE NOTICE 'Recreated rfi_register with security_invoker';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not convert rfi_register: %', SQLERRM;
END $$;

-- =============================================
-- FIX 8: Ensure insurance_compliance_dashboard uses security invoker
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'insurance_compliance_dashboard' AND schemaname = 'public') THEN
    -- Drop and recreate with security_invoker
    DROP VIEW IF EXISTS public.insurance_compliance_dashboard;

    CREATE VIEW public.insurance_compliance_dashboard
      WITH (security_invoker = true)
    AS
    SELECT
      scs.company_id,
      scs.project_id,
      p.name as project_name,
      COUNT(DISTINCT scs.subcontractor_id) as total_subcontractors,
      COUNT(DISTINCT scs.subcontractor_id) FILTER (WHERE scs.is_compliant) as compliant_count,
      COUNT(DISTINCT scs.subcontractor_id) FILTER (WHERE NOT scs.is_compliant) as non_compliant_count,
      COUNT(DISTINCT scs.subcontractor_id) FILTER (WHERE scs.payment_hold) as on_hold_count,
      AVG(scs.compliance_score) as avg_compliance_score,
      SUM(scs.expiring_soon_count) as total_expiring_soon,
      SUM(scs.expired_count) as total_expired,
      MIN(scs.next_expiration_date) as next_expiration
    FROM subcontractor_compliance_status scs
    LEFT JOIN projects p ON scs.project_id = p.id
    GROUP BY scs.company_id, scs.project_id, p.name;

    GRANT SELECT ON public.insurance_compliance_dashboard TO authenticated;

    RAISE NOTICE 'Recreated insurance_compliance_dashboard with security_invoker';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update insurance_compliance_dashboard: %', SQLERRM;
END $$;

-- =============================================
-- GRANT authenticated access where needed
-- =============================================

-- Ensure authenticated users can access views they need
GRANT SELECT ON public.auth_users_readonly TO authenticated;
GRANT SELECT ON public.auth_users_safe TO authenticated;
GRANT SELECT ON public.safety_observer_leaderboard TO authenticated;
GRANT SELECT ON public.template_statistics TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 151_fix_security_advisor_warnings completed successfully';
END $$;
