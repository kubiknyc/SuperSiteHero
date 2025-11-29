-- Migration: Fix Missing Columns for TypeScript Errors
-- Created: 2025-01-29
-- Purpose: Add missing database columns that are causing TypeScript build errors

-- ============================================================================
-- 1. Add full_name column to users table
-- ============================================================================
-- The code expects users.full_name but database has first_name and last_name
-- We'll add full_name as a GENERATED column that combines first_name and last_name

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS full_name TEXT
GENERATED ALWAYS AS (
  CASE
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL
      THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL
      THEN first_name
    WHEN last_name IS NOT NULL
      THEN last_name
    ELSE NULL
  END
) STORED;

COMMENT ON COLUMN public.users.full_name IS 'Generated column combining first_name and last_name';

-- ============================================================================
-- 2. Add document_number column to documents table
-- ============================================================================
-- The code expects documents.document_number for document identification
-- This is different from drawing_number which is for drawings specifically

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS document_number TEXT;

COMMENT ON COLUMN public.documents.document_number IS 'Unique document identifier/number for tracking';

-- Create index for document_number lookups
CREATE INDEX IF NOT EXISTS idx_documents_document_number
ON public.documents(document_number)
WHERE document_number IS NOT NULL;

-- ============================================================================
-- 3. Add location column to punch_items table
-- ============================================================================
-- The code expects punch_items.location but database has separate fields
-- We'll add location as a GENERATED column that combines building, floor, room, area

ALTER TABLE public.punch_items
ADD COLUMN IF NOT EXISTS location TEXT
GENERATED ALWAYS AS (
  CASE
    WHEN building IS NOT NULL OR floor IS NOT NULL OR room IS NOT NULL OR area IS NOT NULL
      THEN TRIM(CONCAT_WS(' > ',
        NULLIF(building, ''),
        NULLIF(floor, ''),
        NULLIF(room, ''),
        NULLIF(area, '')
      ))
    ELSE NULL
  END
) STORED;

COMMENT ON COLUMN public.punch_items.location IS 'Generated column combining building, floor, room, and area';

-- ============================================================================
-- 4. Create punch_lists table (if needed)
-- ============================================================================
-- The code references punch_lists table but it doesn't exist
-- punch_items seem to work standalone, but some code expects punch_lists
-- Creating a basic punch_lists table to group punch_items

CREATE TABLE IF NOT EXISTS public.punch_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT punch_lists_status_check CHECK (status IN ('open', 'in_progress', 'completed', 'archived'))
);

COMMENT ON TABLE public.punch_lists IS 'Punch lists to group and organize punch items';

-- Add punch_list_id to punch_items if it doesn't exist
ALTER TABLE public.punch_items
ADD COLUMN IF NOT EXISTS punch_list_id UUID REFERENCES public.punch_lists(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.punch_items.punch_list_id IS 'Reference to parent punch list (optional)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_punch_lists_project_id ON public.punch_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_lists_created_by ON public.punch_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_punch_items_punch_list_id ON public.punch_items(punch_list_id);

-- ============================================================================
-- 5. Update workflow_items to ensure title is never null
-- ============================================================================
-- RFI code expects rfi.title to be non-null but database allows null
-- Add NOT NULL constraint and provide default for existing nulls

-- First, update any existing null titles
UPDATE public.workflow_items
SET title = 'Untitled ' || UPPER(LEFT(id::TEXT, 8))
WHERE title IS NULL;

-- Now add NOT NULL constraint
ALTER TABLE public.workflow_items
ALTER COLUMN title SET NOT NULL;

-- ============================================================================
-- RLS Policies for punch_lists
-- ============================================================================

-- Enable RLS
ALTER TABLE public.punch_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view punch lists for projects they have access to
CREATE POLICY "Users can view punch lists for their projects"
ON public.punch_lists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_users pu
    WHERE pu.project_id = punch_lists.project_id
    AND pu.user_id = auth.uid()
  )
);

-- Policy: Users can create punch lists for projects they have access to
CREATE POLICY "Users can create punch lists for their projects"
ON public.punch_lists
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_users pu
    WHERE pu.project_id = punch_lists.project_id
    AND pu.user_id = auth.uid()
  )
);

-- Policy: Users can update punch lists for projects they have access to
CREATE POLICY "Users can update punch lists for their projects"
ON public.punch_lists
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_users pu
    WHERE pu.project_id = punch_lists.project_id
    AND pu.user_id = auth.uid()
  )
);

-- Policy: Users can delete (soft delete) punch lists for projects they have access to
CREATE POLICY "Users can delete punch lists for their projects"
ON public.punch_lists
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_users pu
    WHERE pu.project_id = punch_lists.project_id
    AND pu.user_id = auth.uid()
  )
);

-- ============================================================================
-- Update timestamp trigger for punch_lists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_punch_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER punch_lists_updated_at
BEFORE UPDATE ON public.punch_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_punch_lists_updated_at();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.punch_lists TO authenticated;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration adds:
-- 1. users.full_name (generated from first_name + last_name)
-- 2. documents.document_number (for document tracking)
-- 3. punch_items.location (generated from building/floor/room/area)
-- 4. punch_lists table (to group punch items)
-- 5. punch_items.punch_list_id (foreign key to punch_lists)
-- 6. workflow_items.title NOT NULL constraint
-- 7. RLS policies for punch_lists
-- 8. Indexes for performance
