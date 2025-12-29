-- Migration: 159_role_based_approvals.sql
-- Description: Extend approval workflows to support role-based approvers
-- Date: 2025-12-29

-- =============================================
-- EXTEND APPROVAL_STEPS TABLE
-- Add support for role-based approvers
-- =============================================

-- Add new columns for role-based approvals
ALTER TABLE approval_steps
  ADD COLUMN IF NOT EXISTS approver_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS approver_custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

-- Update the approver_type constraint to include 'role' option
-- First drop the old constraint
ALTER TABLE approval_steps DROP CONSTRAINT IF EXISTS approval_steps_approver_type_check;

-- Add new constraint with role support
ALTER TABLE approval_steps
  ADD CONSTRAINT approval_steps_approver_type_check
  CHECK (approver_type IN ('user', 'role', 'custom_role', 'any'));

-- Add comment for new approver types
COMMENT ON COLUMN approval_steps.approver_type IS 'Type of approver: user (specific users), role (default role), custom_role (company custom role), any (any project member)';
COMMENT ON COLUMN approval_steps.approver_role IS 'Default role code (owner, admin, project_manager, superintendent, foreman, worker) when approver_type is role';
COMMENT ON COLUMN approval_steps.approver_custom_role_id IS 'Custom role ID when approver_type is custom_role';

-- Add index for role-based lookups
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver_role ON approval_steps(approver_role) WHERE approver_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_steps_custom_role ON approval_steps(approver_custom_role_id) WHERE approver_custom_role_id IS NOT NULL;

-- =============================================
-- FUNCTION: get_approvers_for_step
-- Resolve actual users who can approve a step
-- Returns user IDs based on step configuration
-- =============================================

CREATE OR REPLACE FUNCTION get_approvers_for_step(
  p_step_id UUID,
  p_project_id UUID
)
RETURNS TABLE (user_id UUID, user_name TEXT, user_email TEXT) AS $$
DECLARE
  v_step RECORD;
BEGIN
  -- Get step configuration
  SELECT * INTO v_step FROM approval_steps WHERE id = p_step_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return based on approver type
  CASE v_step.approver_type
    WHEN 'user' THEN
      -- Direct user IDs from approver_ids array
      RETURN QUERY
      SELECT u.id, u.full_name, u.email
      FROM users u
      WHERE u.id::text = ANY(v_step.approver_ids)
        AND u.deleted_at IS NULL;

    WHEN 'role' THEN
      -- Users with the specified default role on the project
      RETURN QUERY
      SELECT u.id, u.full_name, u.email
      FROM users u
      JOIN project_users pu ON pu.user_id = u.id
      WHERE pu.project_id = p_project_id
        AND u.role = v_step.approver_role
        AND u.deleted_at IS NULL;

    WHEN 'custom_role' THEN
      -- Users with the specified custom role (globally or on this project)
      RETURN QUERY
      SELECT DISTINCT u.id, u.full_name, u.email
      FROM users u
      JOIN user_custom_roles ucr ON ucr.user_id = u.id
      WHERE ucr.custom_role_id = v_step.approver_custom_role_id
        AND (ucr.project_id IS NULL OR ucr.project_id = p_project_id)
        AND u.deleted_at IS NULL;

    WHEN 'any' THEN
      -- Any user on the project
      RETURN QUERY
      SELECT u.id, u.full_name, u.email
      FROM users u
      JOIN project_users pu ON pu.user_id = u.id
      WHERE pu.project_id = p_project_id
        AND u.deleted_at IS NULL;

    ELSE
      -- Fallback to direct user IDs
      RETURN QUERY
      SELECT u.id, u.full_name, u.email
      FROM users u
      WHERE u.id::text = ANY(v_step.approver_ids)
        AND u.deleted_at IS NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: can_user_approve_request_v2
-- Enhanced check that supports role-based approval
-- =============================================

CREATE OR REPLACE FUNCTION can_user_approve_request_v2(
  p_request_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
  v_step RECORD;
  v_can_approve BOOLEAN := FALSE;
BEGIN
  -- Get request details
  SELECT * INTO v_request FROM approval_requests WHERE id = p_request_id;

  IF NOT FOUND OR v_request.status != 'pending' THEN
    RETURN FALSE;
  END IF;

  -- Get current step
  SELECT * INTO v_step
  FROM approval_steps
  WHERE workflow_id = v_request.workflow_id
    AND step_order = v_request.current_step;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check based on approver type
  CASE v_step.approver_type
    WHEN 'user' THEN
      -- Direct user ID check
      v_can_approve := p_user_id::text = ANY(v_step.approver_ids);

    WHEN 'role' THEN
      -- User must have the role and be on the project
      SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN project_users pu ON pu.user_id = u.id
        WHERE u.id = p_user_id
          AND pu.project_id = v_request.project_id
          AND u.role = v_step.approver_role
      ) INTO v_can_approve;

    WHEN 'custom_role' THEN
      -- User must have the custom role
      SELECT EXISTS (
        SELECT 1 FROM user_custom_roles ucr
        WHERE ucr.user_id = p_user_id
          AND ucr.custom_role_id = v_step.approver_custom_role_id
          AND (ucr.project_id IS NULL OR ucr.project_id = v_request.project_id)
      ) INTO v_can_approve;

    WHEN 'any' THEN
      -- User must be on the project
      SELECT EXISTS (
        SELECT 1 FROM project_users pu
        WHERE pu.user_id = p_user_id
          AND pu.project_id = v_request.project_id
      ) INTO v_can_approve;

    ELSE
      -- Fallback to direct user ID check
      v_can_approve := p_user_id::text = ANY(v_step.approver_ids);
  END CASE;

  RETURN v_can_approve;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: get_pending_approvals_count_v2
-- Enhanced to support role-based approvals
-- =============================================

CREATE OR REPLACE FUNCTION get_pending_approvals_count_v2(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_role VARCHAR(50);
BEGIN
  -- Get user's default role
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;

  -- Count all pending requests where user can approve
  SELECT COUNT(*) INTO v_count
  FROM approval_requests r
  JOIN approval_steps s ON s.workflow_id = r.workflow_id AND s.step_order = r.current_step
  WHERE r.status = 'pending'
    AND (
      -- User-based: user is in approver_ids
      (s.approver_type = 'user' AND p_user_id::text = ANY(s.approver_ids))
      OR
      -- Role-based: user has matching default role and is on project
      (s.approver_type = 'role' AND s.approver_role = v_user_role AND EXISTS (
        SELECT 1 FROM project_users pu WHERE pu.user_id = p_user_id AND pu.project_id = r.project_id
      ))
      OR
      -- Custom role: user has the custom role for this project or globally
      (s.approver_type = 'custom_role' AND EXISTS (
        SELECT 1 FROM user_custom_roles ucr
        WHERE ucr.user_id = p_user_id
          AND ucr.custom_role_id = s.approver_custom_role_id
          AND (ucr.project_id IS NULL OR ucr.project_id = r.project_id)
      ))
      OR
      -- Any project member
      (s.approver_type = 'any' AND EXISTS (
        SELECT 1 FROM project_users pu WHERE pu.user_id = p_user_id AND pu.project_id = r.project_id
      ))
    );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATE RLS POLICY
-- Allow role-based approvers to update requests
-- =============================================

DROP POLICY IF EXISTS "Users can update requests they can approve or initiated" ON approval_requests;
CREATE POLICY "Users can update requests they can approve or initiated"
  ON approval_requests FOR UPDATE
  TO authenticated
  USING (
    -- User initiated the request
    initiated_by = auth.uid()
    OR
    -- User is a direct approver for current step
    EXISTS (
      SELECT 1 FROM approval_steps s
      WHERE s.workflow_id = approval_requests.workflow_id
        AND s.step_order = approval_requests.current_step
        AND (
          -- Direct user assignment
          (s.approver_type = 'user' AND auth.uid()::text = ANY(s.approver_ids))
          OR
          -- Role-based assignment
          (s.approver_type = 'role' AND EXISTS (
            SELECT 1 FROM users u
            JOIN project_users pu ON pu.user_id = u.id
            WHERE u.id = auth.uid()
              AND pu.project_id = approval_requests.project_id
              AND u.role = s.approver_role
          ))
          OR
          -- Custom role assignment
          (s.approver_type = 'custom_role' AND EXISTS (
            SELECT 1 FROM user_custom_roles ucr
            WHERE ucr.user_id = auth.uid()
              AND ucr.custom_role_id = s.approver_custom_role_id
              AND (ucr.project_id IS NULL OR ucr.project_id = approval_requests.project_id)
          ))
          OR
          -- Any project member
          (s.approver_type = 'any' AND EXISTS (
            SELECT 1 FROM project_users pu
            WHERE pu.user_id = auth.uid()
              AND pu.project_id = approval_requests.project_id
          ))
        )
    )
  );

-- =============================================
-- UPDATE APPROVAL_ACTIONS RLS POLICY
-- Allow role-based approvers to create actions
-- =============================================

DROP POLICY IF EXISTS "Users can create actions for requests they can approve" ON approval_actions;
CREATE POLICY "Users can create actions for requests they can approve"
  ON approval_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM approval_requests r
      JOIN approval_steps s ON s.workflow_id = r.workflow_id AND s.step_order = r.current_step
      WHERE r.id = request_id
        AND (
          action = 'comment'  -- Anyone can comment
          OR
          (s.approver_type = 'user' AND auth.uid()::text = ANY(s.approver_ids))
          OR
          (s.approver_type = 'role' AND EXISTS (
            SELECT 1 FROM users u
            JOIN project_users pu ON pu.user_id = u.id
            WHERE u.id = auth.uid()
              AND pu.project_id = r.project_id
              AND u.role = s.approver_role
          ))
          OR
          (s.approver_type = 'custom_role' AND EXISTS (
            SELECT 1 FROM user_custom_roles ucr
            WHERE ucr.user_id = auth.uid()
              AND ucr.custom_role_id = s.approver_custom_role_id
              AND (ucr.project_id IS NULL OR ucr.project_id = r.project_id)
          ))
          OR
          (s.approver_type = 'any' AND EXISTS (
            SELECT 1 FROM project_users pu
            WHERE pu.user_id = auth.uid()
              AND pu.project_id = r.project_id
          ))
        )
    )
  );

-- =============================================
-- VIEW: approval_step_details
-- Enriched view with approver information
-- =============================================

CREATE OR REPLACE VIEW approval_step_details AS
SELECT
  s.*,
  -- Approver display info based on type
  CASE s.approver_type
    WHEN 'user' THEN 'Specific Users'
    WHEN 'role' THEN 'Role: ' || COALESCE(
      CASE s.approver_role
        WHEN 'owner' THEN 'Owner'
        WHEN 'admin' THEN 'Admin'
        WHEN 'project_manager' THEN 'Project Manager'
        WHEN 'superintendent' THEN 'Superintendent'
        WHEN 'foreman' THEN 'Foreman'
        WHEN 'worker' THEN 'Worker'
        ELSE s.approver_role
      END,
      'Unknown'
    )
    WHEN 'custom_role' THEN 'Custom Role: ' || COALESCE(cr.name, 'Unknown')
    WHEN 'any' THEN 'Any Project Member'
    ELSE 'Unknown'
  END as approver_display,
  -- Custom role details
  cr.name as custom_role_name,
  cr.code as custom_role_code,
  cr.color as custom_role_color
FROM approval_steps s
LEFT JOIN custom_roles cr ON s.approver_custom_role_id = cr.id;

-- =============================================
-- GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION get_approvers_for_step TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_approve_request_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_approvals_count_v2 TO authenticated;
GRANT SELECT ON approval_step_details TO authenticated;
