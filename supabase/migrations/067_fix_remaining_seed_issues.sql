-- Migration: 067_fix_remaining_seed_issues.sql
-- Description: Fix remaining schema issues for E2E test seeding
-- 1. Add 'phone' column to contacts (seed script uses 'phone' not 'phone_mobile')
-- 2. Add default value for template_level in checklist_templates
-- 3. Add RLS policies for checklist_templates INSERT

-- ============================================================================
-- 1. Add 'phone' column to contacts table
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contacts' AND column_name = 'phone'
    ) THEN
        ALTER TABLE contacts
        ADD COLUMN phone VARCHAR(50);

        COMMENT ON COLUMN contacts.phone IS 'Primary phone number for the contact';
    END IF;
END $$;

-- ============================================================================
-- 2. Add 'role' column to contacts table (used by seed script)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contacts' AND column_name = 'role'
    ) THEN
        ALTER TABLE contacts
        ADD COLUMN role VARCHAR(100);

        COMMENT ON COLUMN contacts.role IS 'Job role/title of the contact';
    END IF;
END $$;

-- ============================================================================
-- 3. Make template_level nullable or add default in checklist_templates
-- ============================================================================

-- Set a default value for template_level so inserts don't fail
DO $$
BEGIN
    -- First check if column exists and has NOT NULL constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'checklist_templates'
        AND column_name = 'template_level'
        AND is_nullable = 'NO'
    ) THEN
        -- Add default value
        ALTER TABLE checklist_templates
        ALTER COLUMN template_level SET DEFAULT 'company';
    END IF;
END $$;

-- ============================================================================
-- 4. Fix RLS policies for checklist_templates to allow INSERT
-- ============================================================================

-- Drop existing policies and recreate with proper INSERT support
DROP POLICY IF EXISTS "Users can view company checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "Authorized users can manage company checklist templates" ON checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_select_policy" ON checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_insert_policy" ON checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_update_policy" ON checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_delete_policy" ON checklist_templates;

-- SELECT policy: Users can view templates from their company or system templates
CREATE POLICY "checklist_templates_select_policy"
  ON checklist_templates FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR template_level = 'system'
    OR is_system_template = true
  );

-- INSERT policy: Users with appropriate roles can create templates for their company
CREATE POLICY "checklist_templates_insert_policy"
  ON checklist_templates FOR INSERT
  WITH CHECK (
    -- Must be inserting for their own company
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    -- User must have appropriate role
    AND (SELECT role FROM users WHERE id = auth.uid()) IN (
      'superintendent', 'project_manager', 'office_admin', 'admin'
    )
  );

-- UPDATE policy: Users with appropriate roles can update their company's templates
CREATE POLICY "checklist_templates_update_policy"
  ON checklist_templates FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN (
      'superintendent', 'project_manager', 'office_admin', 'admin'
    )
  );

-- DELETE policy: Users with appropriate roles can delete their company's templates
CREATE POLICY "checklist_templates_delete_policy"
  ON checklist_templates FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN (
      'superintendent', 'project_manager', 'office_admin', 'admin'
    )
    AND is_system_template IS NOT TRUE
  );

-- Ensure RLS is enabled
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
