# Database Migration Template

Use this template when creating new database migrations for the construction platform.

## Migration File Naming

Format: `XXX_descriptive_name.sql`

Examples:
- `014_add_equipment_tracking.sql`
- `015_add_time_tracking_fields.sql`
- `016_modify_rfi_workflow.sql`

## Standard Migration Template

```sql
-- Migration: {Migration Description}
-- Created: {YYYY-MM-DD}
-- Purpose: {Detailed explanation of what this migration does and why}

-- ============================================
-- DROP POLICIES (if modifying RLS)
-- ============================================

-- Drop existing policies that will be replaced
-- DROP POLICY IF EXISTS "policy_name" ON table_name;

-- ============================================
-- DROP TABLES/COLUMNS (if needed)
-- ============================================

-- Use DROP carefully - prefer soft deletes with deleted_at column
-- DROP TABLE IF EXISTS old_table_name CASCADE;
-- ALTER TABLE table_name DROP COLUMN IF EXISTS old_column;

-- ============================================
-- CREATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS {table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Feature-specific columns
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',

  -- Metadata (standard on all tables)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_{table_name}_company_id ON {table_name}(company_id);
CREATE INDEX IF NOT EXISTS idx_{table_name}_status ON {table_name}(status);
CREATE INDEX IF NOT EXISTS idx_{table_name}_created_at ON {table_name}(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_{table_name}_deleted_at ON {table_name}(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
-- CREATE INDEX IF NOT EXISTS idx_{table_name}_company_project ON {table_name}(company_id, project_id);

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Updated_at trigger
CREATE TRIGGER update_{table_name}_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their company
CREATE POLICY "Users can view their company's {table_name}"
  ON {table_name}
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert data for their company
CREATE POLICY "Users can create {table_name} for their company"
  ON {table_name}
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their company's data
CREATE POLICY "Users can update their company's {table_name}"
  ON {table_name}
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete (soft delete) their company's data
CREATE POLICY "Users can delete their company's {table_name}"
  ON {table_name}
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================
-- ALTER EXISTING TABLES (if modifying)
-- ============================================

-- Add columns to existing tables
-- ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
-- ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_foreign_key UUID REFERENCES other_table(id);

-- Modify columns
-- ALTER TABLE existing_table ALTER COLUMN column_name TYPE TEXT;
-- ALTER TABLE existing_table ALTER COLUMN column_name SET NOT NULL;
-- ALTER TABLE existing_table ALTER COLUMN column_name DROP NOT NULL;

-- ============================================
-- SEED DATA (if needed)
-- ============================================

-- Insert reference data
-- INSERT INTO {table_name} (id, name, company_id) VALUES
--   (gen_random_uuid(), 'Default Value', 'system')
-- ON CONFLICT DO NOTHING;

-- ============================================
-- GRANTS (optional)
-- ============================================

-- Grant permissions if needed
-- GRANT SELECT, INSERT, UPDATE ON {table_name} TO authenticated;
-- GRANT SELECT ON {table_name} TO anon;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE {table_name} IS '{Description of what this table stores}';
COMMENT ON COLUMN {table_name}.name IS '{Description of the column}';
```

## Project-Specific Migration Pattern

For features tied to projects (most construction features):

```sql
CREATE TABLE IF NOT EXISTS {table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Feature columns
  {feature_columns},

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_{table_name}_company_id ON {table_name}(company_id);
CREATE INDEX IF NOT EXISTS idx_{table_name}_project_id ON {table_name}(project_id);
CREATE INDEX IF NOT EXISTS idx_{table_name}_company_project ON {table_name}(company_id, project_id);

-- RLS with project assignment check
CREATE POLICY "Users can view {table_name} for their assigned projects"
  ON {table_name}
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND project_id IN (
      SELECT project_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
  );
```

## Junction Table Pattern

For many-to-many relationships:

```sql
CREATE TABLE IF NOT EXISTS {table1}_{table2} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  {table1}_id UUID NOT NULL REFERENCES {table1}(id) ON DELETE CASCADE,
  {table2}_id UUID NOT NULL REFERENCES {table2}(id) ON DELETE CASCADE,

  -- Optional metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Unique constraint
  UNIQUE({table1}_id, {table2}_id)
);

-- Indexes for both directions
CREATE INDEX IF NOT EXISTS idx_{table1}_{table2}_table1 ON {table1}_{table2}({table1}_id);
CREATE INDEX IF NOT EXISTS idx_{table1}_{table2}_table2 ON {table1}_{table2}({table2}_id);
```

## Rollback Pattern

Include rollback instructions in comments:

```sql
-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To rollback this migration, execute:
-- DROP TABLE IF EXISTS {table_name} CASCADE;
-- DELETE FROM schema_migrations WHERE version = 'XXX';
```

## After Creating Migration

1. **Run in Supabase SQL Editor**
   - Go to Supabase Dashboard → SQL Editor
   - Paste migration SQL
   - Execute

2. **Update TypeScript Types**
   - Run `/supabase-type-generator --all-tables`
   - Or manually update `src/types/database.ts`

3. **Create React Query Hooks**
   - Use the feature-hook template
   - Create in `src/features/{feature}/hooks/`

4. **Test Type Safety**
   - Run `npm run type-check`
   - Verify no TypeScript errors

5. **Update Documentation**
   - Update `database-schema.md` if needed
   - Document new feature in `masterplan.md`

## Common Column Types

```sql
-- Text
name VARCHAR(255)
description TEXT
notes TEXT

-- Numbers
quantity INTEGER
price DECIMAL(10, 2)
percentage DECIMAL(5, 2)

-- Dates
date DATE
start_date DATE
due_date DATE
completed_at TIMESTAMPTZ

-- Status/Enum
status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected'))

-- Boolean
is_active BOOLEAN DEFAULT true
is_approved BOOLEAN DEFAULT false

-- JSON
metadata JSONB DEFAULT '{}'::jsonb
settings JSONB

-- Arrays
tags TEXT[]
file_urls TEXT[]

-- Foreign Keys
company_id UUID REFERENCES companies(id) ON DELETE CASCADE
project_id UUID REFERENCES projects(id) ON DELETE CASCADE
created_by UUID REFERENCES users(id) ON DELETE SET NULL
```

## Replacements Needed

- `{table_name}` → Lowercase, snake_case table name
- `{Migration Description}` → Clear description of what the migration does
- `{feature_columns}` → Feature-specific columns
- `XXX` → Migration number (e.g., 014, 015)
