-- Migration: 066_add_missing_seed_columns.sql
-- Description: Add missing columns for checklist_templates and contacts tables
-- These columns are expected by the E2E test seeding scripts

-- ============================================================================
-- 1. Add is_active column to checklist_templates
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'checklist_templates' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE checklist_templates
        ADD COLUMN is_active BOOLEAN DEFAULT true;

        COMMENT ON COLUMN checklist_templates.is_active IS 'Whether the template is active and available for use';
    END IF;
END $$;

-- Add index for is_active lookups
CREATE INDEX IF NOT EXISTS idx_checklist_templates_is_active
ON checklist_templates(is_active)
WHERE is_active = true;

-- ============================================================================
-- 2. Add company_id column to contacts (for company-wide contacts)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contacts' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE contacts
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

        COMMENT ON COLUMN contacts.company_id IS 'Company this contact belongs to (for company-wide contacts). Either company_id or project_id should be set.';
    END IF;
END $$;

-- Add index for company_id lookups
CREATE INDEX IF NOT EXISTS idx_contacts_company_id
ON contacts(company_id)
WHERE company_id IS NOT NULL;

-- ============================================================================
-- 3. Update contacts table constraint to allow either project_id or company_id
-- ============================================================================

-- Make project_id nullable since contacts can now belong to company instead
DO $$
BEGIN
    -- Check if project_id is NOT NULL constrained
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contacts'
        AND column_name = 'project_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE contacts ALTER COLUMN project_id DROP NOT NULL;
    END IF;
END $$;

-- Add a check constraint to ensure at least one of company_id or project_id is set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'contacts_requires_owner'
    ) THEN
        ALTER TABLE contacts
        ADD CONSTRAINT contacts_requires_owner
        CHECK (company_id IS NOT NULL OR project_id IS NOT NULL);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Constraint already exists
END $$;

-- ============================================================================
-- 4. Update RLS policies for contacts to include company_id
-- ============================================================================

-- Drop existing select policy if it exists and recreate with company_id support
DROP POLICY IF EXISTS "contacts_select_policy" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts for their projects" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts for their company" ON contacts;

-- Create comprehensive select policy for contacts
CREATE POLICY "contacts_select_policy" ON contacts
    FOR SELECT
    USING (
        -- Can view project contacts if user has access to the project
        (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM project_users pu
            WHERE pu.project_id = contacts.project_id
            AND pu.user_id = auth.uid()
        ))
        OR
        -- Can view company contacts if user belongs to the company
        (company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = contacts.company_id
        ))
    );

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "contacts_insert_policy" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts for their projects" ON contacts;

-- Create comprehensive insert policy for contacts
CREATE POLICY "contacts_insert_policy" ON contacts
    FOR INSERT
    WITH CHECK (
        -- Can create project contacts if user has access to the project
        (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM project_users pu
            WHERE pu.project_id = contacts.project_id
            AND pu.user_id = auth.uid()
        ))
        OR
        -- Can create company contacts if user belongs to the company
        (company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = contacts.company_id
        ))
    );

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "contacts_update_policy" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts for their projects" ON contacts;

-- Create comprehensive update policy for contacts
CREATE POLICY "contacts_update_policy" ON contacts
    FOR UPDATE
    USING (
        (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM project_users pu
            WHERE pu.project_id = contacts.project_id
            AND pu.user_id = auth.uid()
        ))
        OR
        (company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = contacts.company_id
        ))
    );

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "contacts_delete_policy" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts for their projects" ON contacts;

-- Create comprehensive delete policy for contacts
CREATE POLICY "contacts_delete_policy" ON contacts
    FOR DELETE
    USING (
        (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM project_users pu
            WHERE pu.project_id = contacts.project_id
            AND pu.user_id = auth.uid()
        ))
        OR
        (company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.company_id = contacts.company_id
        ))
    );

-- ============================================================================
-- 5. Ensure RLS is enabled on contacts table
-- ============================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
