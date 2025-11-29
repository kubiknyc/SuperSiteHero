-- ============================================================================
-- Migration: 023_approval_workflows.sql
-- Description: Multi-step approval workflows for documents, submittals, RFIs,
--              and change orders
-- Created: 2025-11-25
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Approval workflow templates
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('document', 'submittal', 'rfi', 'change_order')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment on table
COMMENT ON TABLE approval_workflows IS 'Approval workflow templates defining multi-step approval processes';
COMMENT ON COLUMN approval_workflows.workflow_type IS 'Entity type this workflow applies to: document, submittal, rfi, change_order';
COMMENT ON COLUMN approval_workflows.is_active IS 'Soft delete flag - inactive workflows are hidden but preserved for history';

-- Approval steps within a workflow
CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  -- Currently only 'user' is supported
  -- TODO: Add 'role', 'any_of_users' when roles system is implemented
  approver_type TEXT NOT NULL DEFAULT 'user' CHECK (approver_type IN ('user')),
  approver_ids TEXT[] NOT NULL,
  required_approvals INTEGER DEFAULT 1,
  allow_delegation BOOLEAN DEFAULT false,
  auto_approve_after_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, step_order)
);

COMMENT ON TABLE approval_steps IS 'Individual steps in an approval workflow';
COMMENT ON COLUMN approval_steps.approver_type IS 'Type of approver assignment. Currently only user-based.';
COMMENT ON COLUMN approval_steps.approver_ids IS 'Array of user IDs who can approve this step';
COMMENT ON COLUMN approval_steps.required_approvals IS 'Number of approvals required (for multiple approvers)';
COMMENT ON COLUMN approval_steps.auto_approve_after_days IS 'Auto-approve if no action taken within N days (optional)';

-- Active approval requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('document', 'submittal', 'rfi', 'change_order')),
  entity_id UUID NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'approved_with_conditions', 'rejected', 'cancelled')),
  conditions TEXT, -- Stores conditions text when status is 'approved_with_conditions'
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Ensure only one active request per entity
  CONSTRAINT unique_active_request UNIQUE (entity_type, entity_id)
);

COMMENT ON TABLE approval_requests IS 'Active approval requests tracking progress through workflow steps';
COMMENT ON COLUMN approval_requests.current_step IS 'Current step number in the workflow (1-indexed)';
COMMENT ON COLUMN approval_requests.conditions IS 'Conditions text when approved with conditions';
COMMENT ON COLUMN approval_requests.status IS 'pending, approved, approved_with_conditions, rejected, or cancelled';

-- Approval action audit trail
CREATE TABLE IF NOT EXISTS approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES approval_steps(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'approve_with_conditions', 'reject', 'delegate', 'comment')),
  comment TEXT,
  conditions TEXT, -- For 'approve_with_conditions' action
  delegated_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE approval_actions IS 'Audit trail of all actions taken on approval requests';
COMMENT ON COLUMN approval_actions.action IS 'Type of action: approve, approve_with_conditions, reject, delegate, comment';
COMMENT ON COLUMN approval_actions.conditions IS 'Conditions text for approve_with_conditions action';
COMMENT ON COLUMN approval_actions.delegated_to IS 'User ID when action is delegate';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_approval_workflows_company ON approval_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_type ON approval_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_active ON approval_workflows(company_id, is_active);

-- Step indexes
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow ON approval_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_order ON approval_steps(workflow_id, step_order);

-- Request indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_project ON approval_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_initiated_by ON approval_requests(initiated_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow ON approval_requests(workflow_id);

-- Action indexes
CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_user ON approval_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_created ON approval_actions(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for workflows
CREATE OR REPLACE FUNCTION update_approval_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_approval_workflow_updated ON approval_workflows;
CREATE TRIGGER trigger_approval_workflow_updated
  BEFORE UPDATE ON approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_workflow_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

-- Workflow policies - company members can view/manage
CREATE POLICY "Users can view workflows for their company"
  ON approval_workflows FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create workflows for their company"
  ON approval_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update workflows for their company"
  ON approval_workflows FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workflows for their company"
  ON approval_workflows FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Step policies - inherit from workflow
CREATE POLICY "Users can view steps for accessible workflows"
  ON approval_steps FOR SELECT
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id FROM approval_workflows WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage steps for their company workflows"
  ON approval_steps FOR ALL
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id FROM approval_workflows WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Request policies - project members can view, appropriate users can act
CREATE POLICY "Users can view requests for their projects"
  ON approval_requests FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create requests for their projects"
  ON approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update requests they can approve or initiated"
  ON approval_requests FOR UPDATE
  TO authenticated
  USING (
    -- User initiated the request
    initiated_by = auth.uid()
    OR
    -- User is an approver for current step
    EXISTS (
      SELECT 1 FROM approval_steps s
      WHERE s.workflow_id = approval_requests.workflow_id
        AND s.step_order = approval_requests.current_step
        AND auth.uid()::text = ANY(s.approver_ids)
    )
  );

-- Action policies
CREATE POLICY "Users can view actions for accessible requests"
  ON approval_actions FOR SELECT
  TO authenticated
  USING (
    request_id IN (
      SELECT id FROM approval_requests WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create actions for requests they can approve"
  ON approval_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is an approver for the step or is adding a comment
    EXISTS (
      SELECT 1 FROM approval_requests r
      JOIN approval_steps s ON s.workflow_id = r.workflow_id AND s.step_order = r.current_step
      WHERE r.id = request_id
        AND (
          auth.uid()::text = ANY(s.approver_ids)
          OR action = 'comment'
        )
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user can approve a request
CREATE OR REPLACE FUNCTION can_user_approve_request(p_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_approve BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM approval_requests r
    JOIN approval_steps s ON s.workflow_id = r.workflow_id AND s.step_order = r.current_step
    WHERE r.id = p_request_id
      AND r.status = 'pending'
      AND p_user_id::text = ANY(s.approver_ids)
  ) INTO v_can_approve;

  RETURN v_can_approve;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending approvals count for a user
CREATE OR REPLACE FUNCTION get_pending_approvals_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM approval_requests r
  JOIN approval_steps s ON s.workflow_id = r.workflow_id AND s.step_order = r.current_step
  WHERE r.status = 'pending'
    AND p_user_id::text = ANY(s.approver_ids);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON approval_workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE ON approval_requests TO authenticated;
GRANT SELECT, INSERT ON approval_actions TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_approve_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_approvals_count TO authenticated;
