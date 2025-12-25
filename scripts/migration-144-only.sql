-- Migration 144: Add User Approval System
-- This is migration 144 only, separated for individual execution

-- Add approval status enum type
CREATE TYPE IF NOT EXISTS approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval-related columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'approved' NOT NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add comment to approval_status column
COMMENT ON COLUMN users.approval_status IS 'User approval status: pending (awaiting admin approval), approved (full access granted), rejected (access denied)';

-- Add indexes for performance (with IF NOT EXISTS via error handling)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_approval_status_pending') THEN
    CREATE INDEX idx_users_approval_status_pending ON users(company_id, created_at)
      WHERE approval_status = 'pending' AND deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_approval_status') THEN
    CREATE INDEX idx_users_approval_status ON users(approval_status)
      WHERE deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_approved_by') THEN
    CREATE INDEX idx_users_approved_by ON users(approved_by)
      WHERE approved_by IS NOT NULL AND deleted_at IS NULL;
  END IF;
END $$;

-- Update existing users to have 'approved' status (backward compatibility)
UPDATE users
SET
  approval_status = 'approved',
  approved_at = COALESCE(approved_at, created_at),
  approved_by = COALESCE(approved_by, id)
WHERE approval_status IS NULL OR approved_at IS NULL;

-- Add check constraint for data consistency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_approval_consistency') THEN
    ALTER TABLE users
      ADD CONSTRAINT check_approval_consistency
        CHECK (
          (approval_status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL) OR
          (approval_status = 'rejected' AND rejected_at IS NOT NULL AND rejected_by IS NOT NULL) OR
          (approval_status = 'pending' AND approved_at IS NULL AND rejected_at IS NULL)
        );
  END IF;
END $$;

COMMENT ON CONSTRAINT check_approval_consistency ON users IS 'Ensures approval/rejection fields are set consistently with approval_status';

-- Mark as applied in schema_migrations
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES('144', '144_add_user_approval_system.sql', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

RAISE NOTICE 'Migration 144 completed: Added approval system fields';
