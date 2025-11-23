-- Migration: 013_critical_security_and_performance_fixes.sql
-- Description: Add critical RLS policies and performance indexes
-- Date: 2025-01-20
-- Priority: CRITICAL - Required for security and performance

-- =============================================
-- PART 1: CRITICAL PERFORMANCE INDEXES
-- =============================================

-- MOST CRITICAL: RLS policy performance
-- This index is used by virtually every RLS policy check
CREATE INDEX IF NOT EXISTS idx_project_users_user_project
ON project_users(user_id, project_id);

-- High priority composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workflow_items_project_workflow_type
ON workflow_items(project_id, workflow_type_id);

CREATE INDEX IF NOT EXISTS idx_workflow_items_project_status_open
ON workflow_items(project_id, status)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date
ON daily_reports(project_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_change_order_bids_workflow_status
ON change_order_bids(workflow_item_id, bid_status)
WHERE deleted_at IS NULL;

-- =============================================
-- PART 2: CRITICAL RLS POLICIES
-- =============================================

-- =============================================
-- CHANGE_ORDER_BIDS - CRITICAL: Competitive sensitive data
-- =============================================
CREATE POLICY "Users can view bids for assigned projects"
  ON change_order_bids FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bids for assigned projects"
  ON change_order_bids FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bids for assigned projects"
  ON change_order_bids FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

CREATE POLICY "Block hard deletes on change_order_bids"
  ON change_order_bids FOR DELETE
  USING (false);

-- =============================================
-- SAFETY_INCIDENTS - CRITICAL: OSHA compliance data
-- =============================================
CREATE POLICY "Users can view project safety incidents"
  ON safety_incidents FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create safety incidents"
  ON safety_incidents FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can update safety incidents"
  ON safety_incidents FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

CREATE POLICY "Block hard deletes on safety_incidents"
  ON safety_incidents FOR DELETE
  USING (false);

-- =============================================
-- WORKFLOW_ITEM_COMMENTS - Audit trail integrity
-- =============================================
CREATE POLICY "Users can view comments for assigned workflow items"
  ON workflow_item_comments FOR SELECT
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments for assigned workflow items"
  ON workflow_item_comments FOR INSERT
  WITH CHECK (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON workflow_item_comments FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Block hard deletes on workflow_item_comments"
  ON workflow_item_comments FOR DELETE
  USING (false);

-- =============================================
-- WORKFLOW_ITEM_HISTORY - Audit trail integrity
-- =============================================
CREATE POLICY "Users can view history for assigned workflow items"
  ON workflow_item_history FOR SELECT
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can create history entries"
  ON workflow_item_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Block updates on workflow_item_history"
  ON workflow_item_history FOR UPDATE
  USING (false);

CREATE POLICY "Block hard deletes on workflow_item_history"
  ON workflow_item_history FOR DELETE
  USING (false);

-- =============================================
-- CHECKLIST_TEMPLATES - Company intellectual property
-- =============================================
CREATE POLICY "Users can view company checklist templates"
  ON checklist_templates FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR template_level = 'system'
  );

CREATE POLICY "Authorized users can manage company checklist templates"
  ON checklist_templates FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'office_admin')
  );

-- =============================================
-- ASSEMBLIES - Company intellectual property
-- =============================================
CREATE POLICY "Users can view company assemblies"
  ON assemblies FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IS NULL  -- System assemblies
  );

CREATE POLICY "Authorized users can manage company assemblies"
  ON assemblies FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'office_admin')
  );

-- =============================================
-- WORKFLOW_TYPES - Company configuration
-- =============================================
CREATE POLICY "Users can view company workflow types"
  ON workflow_types FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage company workflow types"
  ON workflow_types FOR ALL
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'office_admin')
  );

-- =============================================
-- DAILY REPORT CHILD TABLES
-- =============================================

-- DAILY_REPORT_WORKFORCE
CREATE POLICY "Users can view workforce for assigned projects"
  ON daily_report_workforce FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage workforce for assigned projects"
  ON daily_report_workforce FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- DAILY_REPORT_EQUIPMENT
CREATE POLICY "Users can view equipment for assigned projects"
  ON daily_report_equipment FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage equipment for assigned projects"
  ON daily_report_equipment FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- DAILY_REPORT_DELIVERIES
CREATE POLICY "Users can view deliveries for assigned projects"
  ON daily_report_deliveries FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage deliveries for assigned projects"
  ON daily_report_deliveries FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- DAILY_REPORT_VISITORS
CREATE POLICY "Users can view visitors for assigned projects"
  ON daily_report_visitors FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage visitors for assigned projects"
  ON daily_report_visitors FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- DAILY_REPORT_SAFETY_INCIDENTS
CREATE POLICY "Users can view safety incident links for assigned projects"
  ON daily_report_safety_incidents FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage safety incident links for assigned projects"
  ON daily_report_safety_incidents FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- DOCUMENT MANAGEMENT
-- =============================================

-- FOLDERS
CREATE POLICY "Users can view project folders"
  ON folders FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project folders"
  ON folders FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- DOCUMENT_MARKUPS
CREATE POLICY "Users can view project document markups"
  ON document_markups FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project document markups"
  ON document_markups FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- =============================================
-- SUBMITTAL_PROCUREMENT
-- =============================================
CREATE POLICY "Users can view submittal procurement for assigned projects"
  ON submittal_procurement FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage submittal procurement for assigned projects"
  ON submittal_procurement FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- =============================================
-- REMAINING HIGH-PRIORITY TABLES
-- =============================================

-- TOOLBOX_TALKS
CREATE POLICY "Users can view project toolbox talks"
  ON toolbox_talks FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project toolbox talks"
  ON toolbox_talks FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- INSPECTIONS
CREATE POLICY "Users can view project inspections"
  ON inspections FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project inspections"
  ON inspections FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- PERMITS
CREATE POLICY "Users can view project permits"
  ON permits FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project permits"
  ON permits FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- TESTS
CREATE POLICY "Users can view project tests"
  ON tests FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project tests"
  ON tests FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- SCHEDULE_ITEMS
CREATE POLICY "Users can view project schedule items"
  ON schedule_items FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project schedule items"
  ON schedule_items FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- CHECKLISTS
CREATE POLICY "Users can view project checklists"
  ON checklists FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project checklists"
  ON checklists FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- SITE_INSTRUCTIONS
CREATE POLICY "Users can view project site instructions"
  ON site_instructions FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project site instructions"
  ON site_instructions FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- MATERIAL_RECEIVED
CREATE POLICY "Users can view project material received"
  ON material_received FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project material received"
  ON material_received FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- MEETINGS
CREATE POLICY "Users can view project meetings"
  ON meetings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project meetings"
  ON meetings FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- NOTICES
CREATE POLICY "Users can view project notices"
  ON notices FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project notices"
  ON notices FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- SITE_CONDITIONS
CREATE POLICY "Users can view project site conditions"
  ON site_conditions FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project site conditions"
  ON site_conditions FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- CLOSEOUT_ITEMS
CREATE POLICY "Users can view project closeout items"
  ON closeout_items FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project closeout items"
  ON closeout_items FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- TAKEOFF_ITEMS
CREATE POLICY "Users can view project takeoff items"
  ON takeoff_items FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project takeoff items"
  ON takeoff_items FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- =============================================
-- PART 3: FIX OVERLY PERMISSIVE NOTIFICATION POLICY
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Replace with proper validation
CREATE POLICY "Users can create notifications for themselves"
  ON notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- =============================================
-- PART 4: ANALYZE TABLES TO UPDATE STATISTICS
-- =============================================

-- Update statistics for query planner optimization
ANALYZE project_users;
ANALYZE workflow_items;
ANALYZE daily_reports;
ANALYZE change_order_bids;
ANALYZE notifications;
ANALYZE safety_incidents;
ANALYZE workflow_item_comments;
ANALYZE workflow_item_history;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 013_critical_security_and_performance_fixes completed successfully';
  RAISE NOTICE 'Added 5 critical performance indexes';
  RAISE NOTICE 'Added RLS policies for 28 previously unprotected tables';
  RAISE NOTICE 'Fixed overly permissive notification creation policy';
  RAISE NOTICE 'Multi-tenant data isolation is now properly enforced';
END $$;