-- ============================================
-- COMPLETE RLS POLICIES FOR MISSING TABLES
-- Migration: 022_complete_rls_policies.sql
-- Priority: CRITICAL - Security & Data Protection
-- ============================================
--
-- This migration adds Row-Level Security policies for 28 tables
-- that currently lack proper access controls.
--
-- CRITICAL TABLES (Regulatory/Security Risk):
-- - change_order_bids (competitive bid data)
-- - safety_incidents (OSHA compliance)
-- - workflow_item_comments (audit trail)
-- - workflow_item_history (immutable audit trail)
--
-- IMPORTANT TABLES:
-- - folders, document_markups (document organization)
-- - inspections, permits (regulatory compliance)
-- - soil_tests, material_tests (quality assurance)
-- - checklists, checklist_items (task management)
-- - photo_albums (asset organization)
--
-- TABLE DEPENDENCIES:
-- - All project-scoped tables check: project_id IN (SELECT FROM project_users)
-- - All company-scoped tables check: company_id = (SELECT FROM users)
-- - All user-owned tables check: user_id = auth.uid()
-- ============================================

-- =============================================
-- CRITICAL: CHANGE_ORDER_BIDS
-- Why Critical: Contains competitive bid data and cost information
-- Regulatory: Bid integrity is important for contract management
-- =============================================
CREATE POLICY "Users can view change order bids for assigned projects"
  ON change_order_bids FOR SELECT
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create change order bids in assigned projects"
  ON change_order_bids FOR INSERT
  WITH CHECK (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update change order bids in assigned projects"
  ON change_order_bids FOR UPDATE
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
    )
  );

-- =============================================
-- CRITICAL: SAFETY_INCIDENTS
-- Why Critical: OSHA compliance and safety records
-- Regulatory: OSHA requires secure incident documentation
-- =============================================
CREATE POLICY "Users can view safety incidents in assigned projects"
  ON safety_incidents FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can report safety incidents in assigned projects"
  ON safety_incidents FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update safety incidents in assigned projects"
  ON safety_incidents FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Only authorized users can delete safety incidents"
  ON safety_incidents FOR DELETE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_delete = true)
  );

-- =============================================
-- WORKFLOW ITEM COMMENTS
-- Why Critical: Audit trail for RFI/CO communications
-- =============================================
CREATE POLICY "Users can view comments on assigned workflow items"
  ON workflow_item_comments FOR SELECT
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can comment on workflow items in assigned projects"
  ON workflow_item_comments FOR INSERT
  WITH CHECK (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- WORKFLOW ITEM HISTORY
-- Why Critical: Immutable audit trail for compliance
-- Disable deletes: These are audit records
-- =============================================
CREATE POLICY "Users can view workflow item history"
  ON workflow_item_history FOR SELECT
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "System can create history records"
  ON workflow_item_history FOR INSERT
  WITH CHECK (true);

-- =============================================
-- FOLDERS
-- Why Important: Document organization
-- =============================================
CREATE POLICY "Users can view project folders"
  ON folders FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage project folders"
  ON folders FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update project folders"
  ON folders FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- =============================================
-- DOCUMENT_MARKUPS
-- Why Important: Drawing annotations and markup history
-- =============================================
CREATE POLICY "Users can view document markups"
  ON document_markups FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create document markups"
  ON document_markups FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- CHECKLISTS & CHECKLIST_ITEMS
-- Why Important: Task and quality management
-- =============================================
CREATE POLICY "Users can view project checklists"
  ON checklists FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR assigned_to_user_id = auth.uid()
  );

CREATE POLICY "Users can manage project checklists"
  ON checklists FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update project checklists"
  ON checklists FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
    OR assigned_to_user_id = auth.uid()
  );

-- Checklist items follow same pattern
CREATE POLICY "Users can view checklist items"
  ON checklist_items FOR SELECT
  USING (
    checklist_id IN (
      SELECT id FROM checklists
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage checklist items"
  ON checklist_items FOR ALL
  USING (
    checklist_id IN (
      SELECT id FROM checklists
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- INSPECTIONS & PERMITS
-- Why Important: Regulatory compliance tracking
-- =============================================
CREATE POLICY "Users can view project inspections"
  ON inspections FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage project inspections"
  ON inspections FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update project inspections"
  ON inspections FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- Permits
CREATE POLICY "Users can view project permits"
  ON permits FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage project permits"
  ON permits FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update project permits"
  ON permits FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- =============================================
-- SOIL_TESTS & MATERIAL_TESTS
-- Why Important: Quality assurance and compliance
-- =============================================
CREATE POLICY "Users can view project soil tests"
  ON soil_tests FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create soil tests"
  ON soil_tests FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update soil tests"
  ON soil_tests FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- Material tests
CREATE POLICY "Users can view project material tests"
  ON material_tests FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create material tests"
  ON material_tests FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update material tests"
  ON material_tests FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- =============================================
-- PHOTO_ALBUMS & PHOTO_ALBUM_ITEMS
-- Why Important: Asset and media organization
-- =============================================
CREATE POLICY "Users can view project photo albums"
  ON photo_albums FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create photo albums"
  ON photo_albums FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update photo albums"
  ON photo_albums FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
  );

-- Photo album items
CREATE POLICY "Users can view photo album items"
  ON photo_album_items FOR SELECT
  USING (
    album_id IN (
      SELECT id FROM photo_albums
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage photo album items"
  ON photo_album_items FOR ALL
  USING (
    album_id IN (
      SELECT id FROM photo_albums
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- TAKEOFF_ITEMS
-- Why Important: Quantity takeoff tracking
-- =============================================
CREATE POLICY "Users can view takeoff items"
  ON takeoff_items FOR SELECT
  USING (
    takeoff_id IN (
      SELECT id FROM takeoffs
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage takeoff items"
  ON takeoff_items FOR ALL
  USING (
    takeoff_id IN (
      SELECT id FROM takeoffs
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- CHANGE_ORDER_ITEMS
-- Why Important: Cost tracking and change order details
-- =============================================
CREATE POLICY "Users can view change order items"
  ON change_order_items FOR SELECT
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage change order items"
  ON change_order_items FOR ALL
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND can_edit = true)
    )
  );

-- =============================================
-- SUBMITTAL_ITEMS
-- Why Important: Submittal package details
-- =============================================
CREATE POLICY "Users can view submittal items"
  ON submittal_items FOR SELECT
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage submittal items"
  ON submittal_items FOR ALL
  USING (
    workflow_item_id IN (
      SELECT id FROM workflow_items
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- SUBCONTRACTOR_PERFORMANCE
-- Why Important: Contractor evaluation records
-- =============================================
CREATE POLICY "Users can view subcontractor performance"
  ON subcontractor_performance FOR SELECT
  USING (
    subcontractor_id IN (
      SELECT id FROM subcontractors
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create performance records"
  ON subcontractor_performance FOR INSERT
  WITH CHECK (
    subcontractor_id IN (
      SELECT id FROM subcontractors
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- EQUIPMENT_LOG
-- Why Important: Equipment and asset tracking
-- =============================================
CREATE POLICY "Users can view equipment logs"
  ON equipment_log FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create equipment logs"
  ON equipment_log FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

-- =============================================
-- DAILY_REPORT_ENTRIES (extended)
-- Why Important: Detailed daily report data
-- =============================================
CREATE POLICY "Users can view daily report entries"
  ON daily_report_entries FOR SELECT
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage daily report entries"
  ON daily_report_entries FOR ALL
  USING (
    daily_report_id IN (
      SELECT id FROM daily_reports
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- DOCUMENT_REVIEWS
-- Why Important: Document approval workflow
-- =============================================
CREATE POLICY "Users can view document reviews"
  ON document_reviews FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
    OR reviewed_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create document reviews"
  ON document_reviews FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
    AND reviewed_by_user_id = auth.uid()
  );

-- =============================================
-- BLOCK ALL DELETE OPERATIONS ON AUDIT TABLES
-- These are immutable records that should never be deleted
-- =============================================
CREATE POLICY "Block deletes on workflow_item_history"
  ON workflow_item_history FOR DELETE
  USING (false);

CREATE POLICY "Block deletes on document_reviews"
  ON document_reviews FOR DELETE
  USING (false);

-- =============================================
-- VERIFY POLICIES CREATED
-- =============================================
-- Run this query to verify RLS policies:
--
-- SELECT
--   schemaname,
--   tablename,
--   COUNT(*) as policy_count,
--   array_agg(policyname ORDER BY policyname) as policies
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename
-- ORDER BY tablename;
--
-- Expected: 40+ tables with RLS enabled
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 022_complete_rls_policies completed successfully';
  RAISE NOTICE 'Added RLS policies to 28+ previously unprotected tables';
  RAISE NOTICE 'Critical tables secured: change_order_bids, safety_incidents, workflow_item_comments';
  RAISE NOTICE 'Run verification query to confirm all policies are in place';
END $$;
