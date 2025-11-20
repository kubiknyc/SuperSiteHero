-- Migration: 012_rls_policies.sql
-- Description: Create Row-Level Security policies for multi-tenant isolation
-- Date: 2025-01-19

-- =============================================
-- COMPANIES - Users can only see their own company
-- =============================================
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- USERS - Users can view users in their company
-- =============================================
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert themselves"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- =============================================
-- PROJECTS - Users can view assigned projects
-- =============================================
CREATE POLICY "Users can view assigned projects"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    OR company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Authorized users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'owner', 'admin')
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Assigned users can update projects"
  ON projects FOR UPDATE
  USING (
    id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- =============================================
-- PROJECT_USERS - Assignment management
-- =============================================
CREATE POLICY "Users can view project assignments"
  ON project_users FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can manage assignments"
  ON project_users FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- GENERIC POLICY FOR PROJECT-SCOPED TABLES
-- Apply this pattern to: contacts, subcontractors, folders, documents,
-- daily_reports, tasks, checklists, punch_items, safety_incidents, etc.
-- =============================================

-- Example for DOCUMENTS
CREATE POLICY "Users can view project documents"
  ON documents FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload project documents"
  ON documents FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project documents"
  ON documents FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project documents"
  ON documents FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_delete = true
    )
  );

-- =============================================
-- CONTACTS
-- =============================================
CREATE POLICY "Users can view project contacts"
  ON contacts FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage project contacts"
  ON contacts FOR ALL
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

-- =============================================
-- SUBCONTRACTORS
-- =============================================
CREATE POLICY "Users can view project subcontractors"
  ON subcontractors FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR (
      -- Subcontractors can view their own record
      (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
      AND contact_id IN (
        SELECT id FROM contacts WHERE email = (SELECT email FROM users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Authorized users can manage subcontractors"
  ON subcontractors FOR ALL
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- =============================================
-- DAILY REPORTS
-- =============================================
CREATE POLICY "Users can view daily reports"
  ON daily_reports FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create daily reports"
  ON daily_reports FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update daily reports"
  ON daily_reports FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

-- =============================================
-- WORKFLOW ITEMS (RFIs, COs, etc.)
-- =============================================
CREATE POLICY "Users can view workflow items"
  ON workflow_items FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR auth.uid() = ANY(assignees)
  );

CREATE POLICY "Users can create workflow items"
  ON workflow_items FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update workflow items"
  ON workflow_items FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR auth.uid() = ANY(assignees)
  );

-- =============================================
-- TASKS
-- =============================================
CREATE POLICY "Users can view tasks"
  ON tasks FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR assigned_to_user_id = auth.uid()
  );

CREATE POLICY "Users can manage tasks"
  ON tasks FOR ALL
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

-- =============================================
-- PUNCH ITEMS
-- =============================================
CREATE POLICY "Users can view punch items"
  ON punch_items FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR (
      -- Subs see only their items
      (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
      AND subcontractor_id IN (
        SELECT id FROM subcontractors WHERE contact_id IN (
          SELECT id FROM contacts WHERE email = (SELECT email FROM users WHERE id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Authorized users can manage punch items"
  ON punch_items FOR ALL
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- =============================================
-- PHOTOS
-- =============================================
CREATE POLICY "Users can view project photos"
  ON photos FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can upload photos"
  ON photos FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their photos"
  ON photos FOR UPDATE
  USING (
    created_by = auth.uid()
    OR project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================
-- MESSAGES
-- =============================================
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR auth.uid() = ANY(to_user_ids)
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

-- =============================================
-- NOTE: Apply similar policies to remaining tables
-- =============================================
-- The pattern is:
-- 1. Users can view data for projects they're assigned to
-- 2. Users can create/update data for projects they have permissions on
-- 3. External users (subs, architects) see only their relevant data
-- 4. Use project_users table to check project access
-- 5. Use role checks for specific permissions

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 012_rls_policies completed successfully';
  RAISE NOTICE 'NOTE: Additional RLS policies should be created for remaining tables following the same patterns';
END $$;
