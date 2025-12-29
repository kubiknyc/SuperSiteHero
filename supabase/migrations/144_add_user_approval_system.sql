-- Migration 144: Add User Approval System
-- Description: Adds approval_status enum and related fields to users table for company-based approval workflow

-- Add approval status enum type (if not exists)
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add approval-related columns to users table (if not exists)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'approved' NOT NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add comment to approval_status column
COMMENT ON COLUMN users.approval_status IS 'User approval status: pending (awaiting admin approval), approved (full access granted), rejected (access denied)';

-- Add indexes for performance (if not exists)
-- Index for querying pending users (filtered for performance)
CREATE INDEX IF NOT EXISTS idx_users_approval_status_pending ON users(company_id, created_at)
  WHERE approval_status = 'pending' AND deleted_at IS NULL;

-- Index for querying all approval statuses
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status)
  WHERE deleted_at IS NULL;

-- Index for approved_by (for admin audit queries)
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by)
  WHERE approved_by IS NOT NULL AND deleted_at IS NULL;

-- Update existing users to have 'approved' status
-- This ensures backward compatibility with existing users
UPDATE users
SET
  approval_status = 'approved',
  approved_at = created_at,
  approved_by = id -- Self-approved for existing users
WHERE approval_status IS NULL OR approved_at IS NULL;

-- Add check constraint to ensure approval/rejection data consistency (if not exists)
DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT check_approval_consistency
      CHECK (
        (approval_status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL) OR
        (approval_status = 'rejected' AND rejected_at IS NOT NULL AND rejected_by IS NOT NULL) OR
        (approval_status = 'pending' AND approved_at IS NULL AND rejected_at IS NULL)
      );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add comment to explain the check constraint
COMMENT ON CONSTRAINT check_approval_consistency ON users IS 'Ensures approval/rejection fields are set consistently with approval_status';
