/**
 * Add role column to conversation_participants
 *
 * Migration: 036
 * Created: 2025-11-29
 * Purpose: Fix inconsistency between API service and database schema
 *          API references admin/member roles but database lacks the column
 */

-- =====================================================
-- ADD ROLE COLUMN
-- =====================================================

-- Add role column with default value 'member'
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- =====================================================
-- ADD CONSTRAINTS
-- =====================================================

-- Ensure only valid roles are used
ALTER TABLE conversation_participants
ADD CONSTRAINT conversation_participants_role_check
CHECK (role IN ('admin', 'member'));

-- =====================================================
-- MIGRATE EXISTING DATA
-- =====================================================

-- Update conversation creators to admin role
UPDATE conversation_participants cp
SET role = 'admin'
FROM conversations c
WHERE cp.conversation_id = c.id
  AND cp.user_id = c.created_by
  AND cp.role = 'member';  -- Only update those with default value

-- All other participants remain as 'member' (default)

-- =====================================================
-- FINALIZE COLUMN
-- =====================================================

-- Make role non-nullable now that all rows have values
ALTER TABLE conversation_participants
ALTER COLUMN role SET NOT NULL;

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for filtering by role (e.g., finding all admins)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_role
ON conversation_participants(conversation_id, role)
WHERE left_at IS NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN conversation_participants.role IS
'User role in conversation: admin (can manage participants) or member (standard participant)';
